import { Socket, createConnection } from "net";
import { Validate } from "container.ts/lib/validate";
import {
  Observable,
  BehaviorSubject,
} from "./rxjs";
import {
  EModbusFunctionCode,
} from "./modbus";
import {
  PduRequest,
  PduResponse,
  PduException,
  PduMaster,
} from "./PduMaster";
import {
  IAduMasterRequestOptions,
  AduMaster,
} from "./AduMaster";

/** Modbus TCP request. */
export class TcpRequest extends PduRequest {
  public constructor(
    public transactionId: number,
    public unitId: number,
    public functionCode: number,
    public buffer: Buffer,
  ) {
    super(functionCode, buffer);
  }
}

/** Modbus TCP response. */
export class TcpResponse extends PduResponse {
  public constructor(
    public transactionId: number,
    public unitId: number,
    public functionCode: number,
    public data: any,
    public buffer: Buffer,
  ) {
    super(functionCode, data, buffer);
  }
}

/** Modbus TCP exception. */
export class TcpException extends PduException {
  public constructor(
    public transactionId: number,
    public unitId: number,
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) {
    super(functionCode, exceptionFunctionCode, exceptionCode, buffer);
  }
}

/** Modbus TCP client options. */
export interface ITcpClientOptions extends IAduMasterRequestOptions {
  host: string;
  port?: number;
  unitId?: number;
}

/** Modbus TCP client. */
export class TcpClient extends AduMaster<TcpRequest, TcpResponse, TcpException> {

  public static DEFAULT_PORT = 502;
  public static DEFAULT_UNIT_ID = 1;

  /** Error codes. */
  public static ERROR = {
    CONNECTION: "ConnectionError",
    TIMEOUT: "TimeoutError",
  };

  private _host: string;
  private _port: number;
  private _unitId: number;
  private _transactionId = 0;

  private _socket: Socket | null;
  private _connected = new BehaviorSubject<boolean>(false);

  private _packetsReceived = 0;
  private _packetsTransmitted = 0;

  /** Host the client will connect to. */
  public get host(): string { return this._host; }

  /** Port the client will connect to. */
  public get port(): number { return this._port; }

  /** Host:port the client will connect to. */
  public get address(): string { return `${this.host}:${this.port}`; }

  /** Identifier of a remote slave. */
  public get unitId(): number { return this._unitId; }

  /** Socket connected state stream. */
  public get connected(): Observable<boolean> { return this._connected; }

  /** Returns true if client is connected. */
  public get isConnected(): boolean { return this._connected.value; }

  /** Number of packets recevied by client. */
  public get packetsReceived(): number { return this._packetsReceived; }

  /** Number of packets transmitted by client. */
  public get packetsTransmitted(): number { return this._packetsTransmitted; }

  /** Node socket connection options. */
  protected get connectionOptions() { return { host: this._host, port: this._port }; }

  /** Get next transaction identifier. */
  protected get nextTransactionId(): number {
    this._transactionId = (this._transactionId + 1) % 0xFFFF;
    return this._transactionId;
  }

  /**
   * Create TCP client instance.
   * @param options Client and default request options.
   * @param namespace Optional debugging namespace.
   */
  public constructor(options: ITcpClientOptions, namespace?: string) {
    super(options, namespace);

    // TCP client option validation.
    const port = String(options.port || TcpClient.DEFAULT_PORT);
    const unitId = String(options.unitId || TcpClient.DEFAULT_UNIT_ID);
    this._host = Validate.isString(options.host);
    this._port = Validate.isPort(port);
    this._unitId = Validate.isInteger(unitId, { min: 0x1, max: 0xFF });
  }

  /**
   * Connect the client to configured host:port.
   * Observable will emit next after connected, throw an error if
   * connection fails and complete when 'disconnect' is called.
   * Completes if no data transmitted or received after timeout.
   * @param options Request options.
   */
  public connect(options: IAduMasterRequestOptions = {}): Observable<boolean> {
    // Validate timeout argument and ensure client disconnected.
    const timeout = this.validTimeout(options.timeout);
    this.disconnect();
    this.create();

    this.debug(`connect: ${this.address}`);
    // (Re)create socket, reset receive buffer.
    // Error listener required to prevent process exit.
    this._socket = createConnection(this.connectionOptions);
    this._socket.on("error", (error) => { this._error.next(error); });

    // Will emit next(false) and complete with call to 'disconnect' method.
    // Will emit next(false) and error if socket closes or times out due to inactivity.
    const disconnected = this.connected.skip(1).filter((b) => !b);

    // Race socket close/connect events to determine client state.
    // Connect event will emit next(true).
    // Close event will emit next(false) and throw an error.
    const socketClose = Observable.fromEvent(this._socket, "close")
      .takeUntil(disconnected)
      .map((hadError) => ({ name: "close", hadError }));

    const socketConnect = Observable.fromEvent(this._socket, "connect")
      .takeUntil(disconnected)
      .map(() => ({ name: "connect", hadError: false }));

    Observable.race(socketClose, socketConnect)
      .subscribe((value) => {
        if (value.name === "connect") {
          this.setSocketState(true);
        } else if (value.name === "close") {
          this.disconnect(TcpClient.ERROR.CONNECTION);
        }
      });

    // Socket data event receives data into internal buffer and processes responses.
    Observable.fromEvent(this._socket, "data")
      .takeUntil(disconnected)
      .subscribe((buffer: Buffer) => this.receiveData(buffer));

    // Requests transmitted via socket.
    this._transmit
      .takeUntil(disconnected)
      .subscribe((request) => this.writeSocket(request));

    // If no activity occurs on socket for timeout duration, client is disconnected.
    Observable.race(this._transmit, this._receive)
      .takeUntil(disconnected)
      .timeout(timeout)
      .subscribe({
        error: () => this.disconnect(TcpClient.ERROR.TIMEOUT),
      });

    // Emits next if socket connected, completes if 'disconnect' method called,
    // throws an error if socket closes.
    return this.connected.skip(1).filter((v) => v).debug(this.debug, "CONNECT");
  }

  /**
   * Disconnect the client from the configured host:port, if connected.
   * Completes subscribers to 'connect' method or throws an error.
   */
  public disconnect(_error?: string): void {
    this.setSocketState(false, !_error, _error);
    this.destroySocket();
    this.destroy();
  }

  /** Set client socket state. */
  protected setSocketState(connected: boolean, disconnect = false, error?: string): void {
    this._connected.next(connected);

    // Reset connected subject in case of disconnect.
    if (disconnect) {
      this._connected.complete();
    }
    if (error != null) {
      this._error.next(error);
      this._connected.error(error);
    }
    if (disconnect || (error != null)) {
      this._connected = new BehaviorSubject<boolean>(false);
    }
  }

  /** Destroy client socket. */
  protected destroySocket(): void {
    if (this._socket != null) {
      let message = `disconnect: ${this.address}`;
      if (this.errorCode != null) {
        message += ` (${this.errorCode})`;
      }
      this.debug(message);
      this._socket.end();
      this._socket.destroy();
      this._socket = null;
    }
  }

  /** Write request to client socket. */
  protected writeSocket(request: TcpRequest): Observable<void> {
    if (this._socket != null) {
      this._socket.write(request.buffer);
      this._packetsTransmitted += 1;
    }
    return Observable.of(undefined);
  }

  /** Construct and prepend MBAP header to PDU request buffer. */
  protected wrapRequest(functionCode: EModbusFunctionCode, request: Buffer): TcpRequest {
    const buffer = Buffer.concat([Buffer.allocUnsafe(7), request]);
    const transactionId = this.nextTransactionId;

    buffer.writeUInt16BE(transactionId, 0);
    buffer.writeUInt16BE(0, 2); // Protocol ID.
    buffer.writeUInt16BE((request.length + 1), 4);
    buffer.writeUInt8(this._unitId, 6);

    return new TcpRequest(transactionId, this._unitId, functionCode, buffer);
  }

  /** Match transaction and unit identifiers of incoming responses. */
  protected matchResponse(request: TcpRequest, response: TcpResponse | TcpException): boolean {
    const transactionIdMatch = (response.transactionId === request.transactionId);
    const unitIdMatch = (response.unitId === request.unitId);
    return transactionIdMatch && unitIdMatch;
  }

  protected parseResponse(data: Buffer): number {
    // Check if buffer may contain MBAP header.
    // TODO: Failure to parse packet after n events causes buffer reset?
    if (data.length >= 7) {
      const header = data.slice(0, 7);
      const headerLength = header.readUInt16BE(4);
      const responseLength = 6 + headerLength;

      // If buffer contains complete response, extract it now.
      if (data.length >= responseLength) {
        this._packetsReceived += 1;

        const aduBuffer = data.slice(0, responseLength);
        const transactionId = aduBuffer.readUInt16BE(0);
        const unitId = aduBuffer.readUInt8(6);
        const pduBuffer = aduBuffer.slice(7);

        const response = this.responseHandler(transactionId, unitId, pduBuffer, aduBuffer);
        if (response != null) {
          this._receive.next(response);
        }

        // Return length of parsed data.
        return responseLength;
      }
    }

    return 0;
  }

  /**
   * Parse buffer into response.
   * Inheritors may overwrite this function to implement their own response handler.
   */
  protected responseHandler(
    transactionId: number,
    unitId: number,
    pduBuffer: Buffer,
    aduBuffer: Buffer,
  ): TcpResponse | TcpException | null {
    const pduResponse = PduMaster.responseHandler(pduBuffer);
    let response: TcpResponse | TcpException | null = null;

    if (pduResponse instanceof PduResponse) {
      response = new TcpResponse(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.data,
        aduBuffer,
      );
    } else if (pduResponse instanceof PduException) {
      response = new TcpException(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.exceptionFunctionCode,
        pduResponse.exceptionCode,
        aduBuffer,
      );
    }

    return response;
  }

}
