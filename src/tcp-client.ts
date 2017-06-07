import { Observable, Subject, BehaviorSubject } from "./rx";
import { Buffer, Socket, createConnection, debug } from "./node";
import { ModbusPduResponse, ModbusPduException } from "./pdu";
import { ModbusPduClient } from "./pdu-client";
import { ModbusTcpRequest, ModbusTcpResponse, ModbusTcpException, ModbusTcpClientError } from "./tcp";

/**
 * Modbus TCP client options.
 */
export interface IModbusTcpClientOptions {
  host: string;
  port?: number;
  unitId?: number;
}

/**
 * Modbus TCP client connect result.
 */
export interface IModbusTcpClientConnect {
  connected: boolean;
  retries: number;
  error?: string;
}

/**
 * Modbus TCP client.
 */
export class ModbusTcpClient {

  private _pdu = new ModbusPduClient();
  private _debug: any;

  private _host: string;
  private _port: number;
  private _unitId: number;
  private _transactionId = 0;
  private _protocolId = 0;

  private _socket: Socket | null;
  private _close: Observable<boolean>;
  private _connect: Observable<any>;
  private _data: Observable<Buffer>;

  private _connected = new BehaviorSubject<boolean>(false);
  private _disconnect = new Subject<boolean>();
  private _retries = 0;
  private _error: any;

  // Response buffer/emitter.
  private _buffer = Buffer.alloc(0);
  private _receive = new Subject<ModbusTcpResponse | ModbusTcpException>();

  // Client received/transmitted metrics.
  private _bytesReceived = 0;
  private _bytesTransmitted = 0;
  private _packetsReceived = 0;
  private _packetsTransmitted = 0;

  /** Client debug interface. */
  public get debug(): any { return this._debug; }

  /** Host the client will connect to. */
  public get host(): string { return this._host; }

  /** Port the client will connect to. */
  public get port(): number { return this._port; }

  /** Identifier of a remote slave. */
  public get unitId(): number { return this._unitId; }

  /** Returns true if client is connected to host:port. */
  public get isConnected(): boolean { return this._connected.value; }

  /** Returns most recent error code returned by client socket. */
  public get errorCode(): string | null { return (this._error != null) ? (this._error.code || null) : null; }

  /** Number of bytes received by client. */
  public get bytesReceived(): number { return this._bytesReceived; }

  /** Number of bytes transmitted by client. */
  public get bytesTransmitted(): number { return this._bytesTransmitted; }

  /** Number of packets recevied by client. */
  public get packetsReceived(): number { return this._packetsReceived; }

  /** Number of packets transmitted by client. */
  public get packetsTransmitted(): number { return this._packetsTransmitted; }

  public constructor(options: IModbusTcpClientOptions, namespace = "mbtcpc") {
    // TODO: Options argument validation.
    this._host = options.host;
    this._port = options.port || 502;
    this._unitId = options.unitId || 1;
    this._debug = debug(namespace);
  }

  /**
   * Connect the client to configured host:port.
   * Emits incremental results based on number of retries.
   * TODO: Add timeout argument.
   * @param retry Number of reconnection attempts (1 - 10).
   */
  public connect(retry = 1): Observable<IModbusTcpClientConnect> {
    retry = Math.min(10, Math.max(1, Number(retry)));
    this.debug(`connect ${this._host}:${this._port}`);

    return this.disconnect()
      .switchMap(() => {
        // (Re)create socket.
        // Error listener required to prevent process exiting.
        this._socket = createConnection(this._connectionOptions);
        this._socket.on("error", (error) => { this._error = error; });

        // Reset retry counter, receive buffer.
        this._retries = 0;
        this._buffer = Buffer.alloc(0);

        // Map socket events to observables.
        // Observables are completed with a disconnect event.
        this._close = Observable.fromEvent(this._socket, "close").take(retry).takeUntil(this._disconnect);
        this._connect = Observable.fromEvent(this._socket, "connect").takeUntil(this._disconnect);
        this._data = Observable.fromEvent(this._socket, "data").takeUntil(this._disconnect);

        this._close
          // Socket only attempts reconnection until a connection is made.
          .takeWhile(() => !this.isConnected)
          .subscribe(() => {
            // Increment retry counter.
            this._retries += 1;

            // Retry socket connection on close event up to limit.
            setTimeout(() => {
              if (this._socket != null) {
                this._socket.connect(this._port, this._host);
                this._buffer = Buffer.alloc(0);
              }
            }, 500);
          });

        this._data
          .subscribe((data) => {
            // Receive data into internal buffer and process.
            this._buffer = this._receiveData(this._buffer, data);
          });

        // Wait for close/connect events up to maximum number of retries.
        // Observable continues emiting until connected.
        return Observable.race(this._close, this._connect)
          .take(retry)
          .takeWhile(() => !this.isConnected)
          .switchMap((hadError) => {
            // Undefined argument if connect finished first.
            this._connected.next(hadError == null);

            const result: IModbusTcpClientConnect = {
              connected: this.isConnected,
              retries: this._retries,
            };

            // Error code only applicable if not connected.
            const errorCode = this.errorCode;
            if (!this.isConnected && (errorCode != null)) {
              result.error = errorCode;
            }

            this.debug(`connect '${result.connected}' '${result.retries}/${retry}' '${result.error}'`);
            return Observable.of(result);
          });
      });
  }

  /** Disconnect the client from the configured host:port, if connected. */
  public disconnect(): Observable<void> {
    if (this._socket != null) {
      this.debug(`disconnect`);
      this._disconnect.next();
      this._connected.next(false);
      this._socket.end();
      this._socket.destroy();
      this._socket = null;
    }
    return Observable.of(undefined);
  }

  public readCoils(startingAddress: number, quantityOfCoils: number, timeout = 5000): Observable<ModbusTcpResponse> {
    const pdu = this._pdu.readCoils(startingAddress, quantityOfCoils);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this._writeRequest(request, timeout);
  }

  public readDiscreteInputs(startingAddress: number, quantityOfInputs: number, timeout = 5000): Observable<ModbusTcpResponse> {
    const pdu = this._pdu.readDiscreteInputs(startingAddress, quantityOfInputs);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this._writeRequest(request, timeout);
  }

  public readHoldingRegisters(startingAddress: number, quantityOfRegisters: number, timeout = 5000): Observable<ModbusTcpResponse> {
    const pdu = this._pdu.readHoldingRegisters(startingAddress, quantityOfRegisters);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this._writeRequest(request, timeout);
  }

  public readInputRegisters(startingAddress: number, quantityOfRegisters: number, timeout = 5000): Observable<ModbusTcpResponse> {
    const pdu = this._pdu.readInputRegisters(startingAddress, quantityOfRegisters);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this._writeRequest(request, timeout);
  }

  public writeSingleCoil(outputAddress: number, outputValue: boolean, timeout = 5000): Observable<ModbusTcpResponse> {
    const pdu = this._pdu.writeSingleCoil(outputAddress, outputValue);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this._writeRequest(request, timeout);
  }

  public writeSingleRegister(registerAddress: number, registerValue: number, timeout = 5000): Observable<ModbusTcpResponse> {
    const pdu = this._pdu.writeSingleRegister(registerAddress, registerValue);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this._writeRequest(request, timeout);
  }

  public writeMultipleCoils(startingAddress: number, outputValues: boolean[], timeout = 5000): Observable<ModbusTcpResponse> {
    const pdu = this._pdu.writeMultipleCoils(startingAddress, outputValues);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this._writeRequest(request, timeout);
  }

  public writeMultipleRegisters(startingAddress: number, registerValues: number[], timeout = 5000): Observable<ModbusTcpResponse> {
    const pdu = this._pdu.writeMultipleRegisters(startingAddress, registerValues);
    const request = this.aduHeader(pdu.functionCode, pdu.buffer);
    return this._writeRequest(request, timeout);
  }

  protected aduHeader(functionCode: number, request: Buffer): ModbusTcpRequest {
    const buffer = Buffer.concat([Buffer.alloc(7, 0), request]);
    const transactionId = this._nextTransactionId;

    buffer.writeUInt16BE(transactionId, 0);
    buffer.writeUInt16BE(this._protocolId, 2);
    buffer.writeUInt16BE((request.length + 1), 4);
    buffer.writeUInt8(this._unitId, 6);

    return new ModbusTcpRequest(transactionId, functionCode, buffer);
  }

  private get _connectionOptions(): { port: number, host: string } {
    return { port: this._port, host: this._host };
  }

  private get _nextTransactionId(): number {
    this._transactionId = (this._transactionId + 1) % 0xFFFF;
    return this._transactionId;
  }

  private _writeRequest(request: ModbusTcpRequest, timeout = 5000): Observable<ModbusTcpResponse> {
    if ((this._socket == null) || (!this.isConnected)) {
      return Observable.throw(ModbusTcpClientError.NotConnected);
    }

    this._socket.write(request.buffer);
    this._bytesTransmitted += request.buffer.length;
    this._packetsTransmitted += 1;

    // Wait for response received with same transaction identifier.
    // TODO: Use other data segments to identify packets.
    return this._receive
      .filter((response) => (response.transactionId === request.transactionId))
      .take(1)
      .timeout(timeout)
      .switchMap((response) => {
        if (response instanceof ModbusTcpResponse) {
          return Observable.of(response);
        } else {
          return Observable.throw(response);
        }
      });
  }

  private _receiveData(buffer: Buffer, data: Buffer): Buffer {
    this._bytesReceived += data.length;
    buffer = Buffer.concat([buffer, data]);

    // TODO: Split into pdu/tcp process.

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
        const pduBuffer = aduBuffer.slice(7);

        // Parse PDU slice of buffer.
        const pduResponse = this._pdu.parseResponse(pduBuffer);
        if (pduResponse instanceof ModbusPduResponse) {

          // Response received.
          this._receive.next(new ModbusTcpResponse(
            transactionId,
            pduResponse.functionCode,
            pduResponse.data,
            aduBuffer,
          ));

        } else if (pduResponse instanceof ModbusPduException) {

          // Exception received.
          this._receive.next(new ModbusTcpException(
            transactionId,
            pduResponse.functionCode,
            pduResponse.exceptionFunctionCode,
            pduResponse.exceptionCode,
            aduBuffer,
          ));

        }

        // Return buffer with packet removed.
        return buffer.slice(responseLength);
      }
    }

    // Return concatenated buffers.
    return buffer;
  }

}
