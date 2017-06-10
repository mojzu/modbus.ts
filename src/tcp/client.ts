import { Socket, createConnection, debug } from "../node";
import { Observable, Subject, BehaviorSubject, TimeoutError } from "../rx";
import * as pdu from "../pdu/pdu";
import { PduClient } from "../pdu/client";
import * as tcp from "./tcp";

/** Client timed out error. */
export const TIMEOUT_ERROR = "TimeoutError";

/** Client connection to host failed error. */
export const CONNECTION_ERROR = "ConnectionError";

/** Client is not connected to host error. */
export const NOT_CONNECTED_ERROR = "NotConnectedError";

/**
 * Modbus TCP client options.
 */
export interface ITcpClientOptions {
  host: string;
  port?: number;
  unitId?: number;
}

/**
 * Modbus TCP client.
 */
export class TcpClient {

  private _pdu = new PduClient();
  private _debug: any;

  private _host: string;
  private _port: number;
  private _unitId: number;
  private _transactionId = 0;
  private _protocolId = 0;

  private _socket: Socket | null;
  private _connected = new BehaviorSubject<boolean>(false);
  private _disconnect = new Subject<void>();
  private _error = new BehaviorSubject<any>(null);

  private _buffer = Buffer.alloc(0);
  private _receive = new Subject<tcp.TcpResponse | tcp.TcpException>();

  private _packetsReceived = 0;
  private _packetsTransmitted = 0;
  // TODO: Subscribable for transmitted/received monitoring.

  /** Host the client will connect to. */
  public get host(): string { return this._host; }

  /** Port the client will connect to. */
  public get port(): number { return this._port; }

  /** Host:port the client will connect to. */
  public get address(): string { return `${this.host}:${this.port}`; }

  /** Identifier of a remote slave. */
  public get unitId(): number { return this._unitId; }

  /** Subscribable client connection state. */
  public get connected(): Observable<boolean> { return this._connected; }

  /** Returns true if client is connected. */
  public get isConnected(): boolean { return this._connected.value; }

  /** Last error code returned by client socket. */
  public get errorCode(): string | null { return (this._error.value != null) ? (this._error.value.code || null) : null; }

  /** Number of bytes received by client. */
  public get bytesReceived(): number { return (this._socket != null) ? this._socket.bytesRead : 0; }

  /** Number of bytes transmitted by client. */
  public get bytesTransmitted(): number { return (this._socket != null) ? this._socket.bytesWritten : 0; }

  /** Number of packets recevied by client. */
  public get packetsReceived(): number { return this._packetsReceived; }

  /** Number of packets transmitted by client. */
  public get packetsTransmitted(): number { return this._packetsTransmitted; }

  public constructor(options: ITcpClientOptions, namespace = "mbtcp") {
    // TODO: Options argument validation.
    this._host = options.host;
    this._port = options.port || 502;
    this._unitId = options.unitId || 1;
    this._debug = debug(namespace);
  }

  /**
   * Connect the client to configured host:port.
   * Observable will call next if connection successful, and complete when
   * disconnected by socket closing or by a call to 'disconnect' method.
   * An error code string will be thrown if connection failed.
   * @param timeout Number of seconds to wait for connection (1 - 30).
   * @param retry Number of connection retries (0 - 5).
   */
  public connect(timeout = 5, retry = 0): Observable<void> {
    timeout = this.validTimeout(timeout);
    retry = this.validRetry(retry);

    return this.disconnect()
      .switchMap(() => {
        this.debug(`connect: ${this.address}`);

        // (Re)create socket, reset receive buffer.
        // Error listener required to prevent process exit.
        this._socket = createConnection(this.connectionOptions);
        this._socket.on("error", (error) => { this._error.next(error); });
        this._buffer = Buffer.alloc(0);

        // Map socket events to observables.
        // Observables are completed with a disconnect event.
        // TODO: Listen to: drain, end, error, lookup, timeout?
        const socketClose = Observable.fromEvent(this._socket, "close")
          .takeUntil(this._disconnect)
          .mergeMap((hadError) => Observable.of({ name: "close", hadError }));

        const socketConnect = Observable.fromEvent(this._socket, "connect")
          .takeUntil(this._disconnect)
          .mergeMap(() => Observable.of({ name: "connect" }));

        const socketData: Observable<Buffer> = Observable.fromEvent(this._socket, "data")
          .takeUntil(this._disconnect);

        socketData
          .subscribe((buffer) => {
            // Receive data into internal buffer and process.
            this._buffer = this.receiveData(this._buffer, buffer);
          });

        // Wait for a close or connect event.
        return Observable.race(socketClose, socketConnect)
          .takeUntil(this._disconnect)
          .timeout(timeout)
          .catch((error) => this.handleTimeoutError(error))
          .switchMap((event: { name: string }) => {
            // Return or throw based on event type.
            if (event.name === "connect") {
              this._connected.next(true);
              this.debug(`connected`);
              return Observable.of(undefined);
            }
            this.debug(`error: ${CONNECTION_ERROR}`);
            return Observable.throw(CONNECTION_ERROR);
          })
          // Delay to prevent case where rapid disconnection
          // causes observables not to call next.
          .delay(50);
      })
      // Retry up to limit with delay between attempts.
      .retryWhen((errors) => {
        return errors
          .scan((errorCount, error) => {
            if (errorCount >= retry) {
              throw error;
            }
            return errorCount + 1;
          }, 1)
          .switchMap(() => this.disconnect())
          .delay(500);
      });
  }

  /** Disconnect the client from the configured host:port, if connected. */
  public disconnect(): Observable<void> {
    if (this._socket != null) {
      this.debug(`disconnect: ${this.address}`);
      // Complete event handlers.
      this._disconnect.next();
      this._connected.next(false);
      this._socket.end();
      // TODO: Timer for socket destruction?
      this._socket.destroy();
      this._socket = null;
    }
    return Observable.of(undefined);
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of coils in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfCoils Quantity of coils.
   * @param timeout Milliseconds to wait for response.
   */
  public readCoils(startingAddress: number, quantityOfCoils: number, timeout = 5): Observable<tcp.TcpResponse> {
    const pdu = this._pdu.readCoils(startingAddress, quantityOfCoils);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this.writeRequest(request, timeout);
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of discrete inputs in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfInputs Quantity of inputs.
   * @param timeout Milliseconds to wait for response.
   */
  public readDiscreteInputs(startingAddress: number, quantityOfInputs: number, timeout = 5): Observable<tcp.TcpResponse> {
    const pdu = this._pdu.readDiscreteInputs(startingAddress, quantityOfInputs);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this.writeRequest(request, timeout);
  }

  /**
   * This function code is used to read  the contents of a contiguous block
   * of holding registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   * @param timeout Milliseconds to wait for response.
   */
  public readHoldingRegisters(startingAddress: number, quantityOfRegisters: number, timeout = 5): Observable<tcp.TcpResponse> {
    const pdu = this._pdu.readHoldingRegisters(startingAddress, quantityOfRegisters);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this.writeRequest(request, timeout);
  }

  /**
   * This function code is used to read from 1 to 125 contiguous input
   * registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   * @param timeout Milliseconds to wait for response.
   */
  public readInputRegisters(startingAddress: number, quantityOfRegisters: number, timeout = 5): Observable<tcp.TcpResponse> {
    const pdu = this._pdu.readInputRegisters(startingAddress, quantityOfRegisters);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this.writeRequest(request, timeout);
  }

  /**
   * This function code is used to write a single output to either ON
   * or OFF in a remote device.
   * @param outputAddress Output address.
   * @param outputValue  Output value.
   * @param timeout Milliseconds to wait for response.
   */
  public writeSingleCoil(outputAddress: number, outputValue: boolean, timeout = 5): Observable<tcp.TcpResponse> {
    const pdu = this._pdu.writeSingleCoil(outputAddress, outputValue);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this.writeRequest(request, timeout);
  }

  /**
   * This function code is used to write a single holding register
   * in a remote device.
   * @param registerAddress Register address.
   * @param registerValue Register value.
   * @param timeout Milliseconds to wait for response.
   */
  public writeSingleRegister(registerAddress: number, registerValue: number, timeout = 5): Observable<tcp.TcpResponse> {
    const pdu = this._pdu.writeSingleRegister(registerAddress, registerValue);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this.writeRequest(request, timeout);
  }

  /**
   * This function code is used to force each coil in a sequence of coils to
   * either ON or OFF in a remote device.
   * @param startingAddress Starting address.
   * @param outputValues Output values.
   * @param timeout Milliseconds to wait for response.
   */
  public writeMultipleCoils(startingAddress: number, outputValues: boolean[], timeout = 5): Observable<tcp.TcpResponse> {
    const pdu = this._pdu.writeMultipleCoils(startingAddress, outputValues);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this.writeRequest(request, timeout);
  }

  /**
   * This function code is used to write a block of contiguous registers
   * (1 to 123 registers) in a remote device.
   * @param startingAddress Starting address.
   * @param registerValues Register values.
   * @param timeout Milliseconds to wait for response.
   */
  public writeMultipleRegisters(startingAddress: number, registerValues: number[], timeout = 5): Observable<tcp.TcpResponse> {
    const pdu = this._pdu.writeMultipleRegisters(startingAddress, registerValues);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this.writeRequest(request, timeout);
  }

  /** Client internal debugging interface. */
  protected get debug(): any { return this._debug; }

  /** Node socket connection options. */
  protected get connectionOptions() { return { host: this._host, port: this._port }; }

  protected get nextTransactionId(): number {
    this._transactionId = (this._transactionId + 1) % 0xFFFF;
    return this._transactionId;
  }

  /**
   * Convert timeout in seconds to milliseconds.
   * @param value Timeout value in seconds (1 - 30).
   */
  protected validTimeout(value: number): number {
    return Math.min(30, Math.max(1, Number(value))) * 1000;
  }

  protected validRetry(value: number): number {
    return Math.min(5, Math.max(0, Number(value)));
  }

  /** Convert observable timeout error objects to strings. */
  protected handleTimeoutError(error: any): Observable<void> {
    if (error instanceof TimeoutError) {
      this.debug(`error: ${TIMEOUT_ERROR}`);
      return Observable.throw(TIMEOUT_ERROR);
    }
    return Observable.throw(error);
  }

  protected aduHeader(functionCode: number, request: Buffer): tcp.TcpRequest {
    const buffer = Buffer.concat([Buffer.alloc(7, 0), request]);
    const transactionId = this.nextTransactionId;

    buffer.writeUInt16BE(transactionId, 0);
    buffer.writeUInt16BE(this._protocolId, 2);
    buffer.writeUInt16BE((request.length + 1), 4);
    buffer.writeUInt8(this._unitId, 6);

    return new tcp.TcpRequest(transactionId, this._unitId, functionCode, buffer);
  }

  protected writeRequest(request: tcp.TcpRequest, timeout = 5): Observable<tcp.TcpResponse> {
    timeout = this.validTimeout(timeout);

    // Throw error if socket is not created and connected.
    if ((this._socket == null) || (!this.isConnected)) {
      this.debug(`error: ${NOT_CONNECTED_ERROR}`);
      return Observable.throw(NOT_CONNECTED_ERROR);
    }

    this.debug(`transmit: ${request}`);
    this._socket.write(request.buffer);
    this._packetsTransmitted += 1;

    // Wait for response received with same transaction identifier.
    // TODO: Use other data segments to identify packets.
    // TODO: Add retry operator logic?
    return this._receive
      .filter((response) => (response.transactionId === request.transactionId))
      .take(1)
      .timeout(timeout)
      .catch(this.handleTimeoutError.bind(this))
      .switchMap((response) => {
        if (response instanceof tcp.TcpResponse) {
          return Observable.of(response);
        } else {
          return Observable.throw(response);
        }
      });
  }

  protected parsePacket(
    transactionId: number,
    unitId: number,
    pduBuffer: Buffer,
    aduBuffer: Buffer,
  ): tcp.TcpResponse | tcp.TcpException | null {
    const pduResponse = this._pdu.parseResponse(pduBuffer);
    let response: tcp.TcpResponse | tcp.TcpException | null = null;

    if (pduResponse instanceof pdu.PduResponse) {
      response = new tcp.TcpResponse(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.data,
        aduBuffer,
      );
    } else if (pduResponse instanceof pdu.PduException) {
      response = new tcp.TcpException(
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

  protected receiveData(buffer: Buffer, data: Buffer): Buffer {
    buffer = Buffer.concat([buffer, data]);

    // Check if buffer may contain MBAP header.
    if (buffer.length >= 7) {
      const header = buffer.slice(0, 7);
      const headerLength = header.readUInt16BE(4);
      const responseLength = 6 + headerLength;

      // If buffer contains complete response, extract it now.
      if (buffer.length >= responseLength) {
        this._packetsReceived += 1;

        const aduBuffer = buffer.slice(0, responseLength);
        const transactionId = aduBuffer.readUInt16BE(0);
        const unitId = aduBuffer.readUInt8(6);
        const pduBuffer = aduBuffer.slice(7);

        // Parse PDU slice of buffer.
        // Inheritors may overwrite this function to implement their own handlers.
        const response = this.parsePacket(transactionId, unitId, pduBuffer, aduBuffer);
        if (response != null) {
          this.debug(`receive: ${response}`);
          this._receive.next(response);
        }

        // Return buffer with packet removed.
        return buffer.slice(responseLength);
      }
    }

    // Return concatenated buffers.
    return buffer;
  }

}
