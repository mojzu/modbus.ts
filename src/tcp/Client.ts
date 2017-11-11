import { Validate } from "container.ts/lib/validate";
import * as Debug from "debug";
import { createConnection, Socket } from "net";
import * as adu from "../adu";
import { Observable, Subscriber } from "../adu/RxJS";
import * as pdu from "../pdu";
import * as tcp from "../tcp";

// Internal debug output.
const debug = Debug("modbus.ts");

export class Log extends adu.Log<tcp.Request, tcp.Response, tcp.Exception> {
  public connect(host: string, port: number, unitId: number): void {
    debug(Client.LOG.CONNECT, host, port, unitId);
  }
  public disconnect(host: string, port: number, unitId: number): void {
    debug(Client.LOG.DISCONNECT, host, port, unitId);
  }
  public error(error: adu.MasterError): void {
    debug(Client.LOG.ERROR, error);
  }
  public packetsTransmitted(value: number): void { }
  public packetsReceived(value: number): void { }
}

export type IClientRequestOptions = adu.IMasterRequestOptions<tcp.Request, tcp.Response, tcp.Exception, Log>;

/** Modbus TCP client options. */
export interface IClientOptions extends IClientRequestOptions {
  host?: string;
  port?: number;
  unitId?: number;
  inactivityTimeout?: number;
  log?: Log;
}

/** Modbus TCP client. */
export class Client extends adu.Master<tcp.Request, tcp.Response, tcp.Exception, Log> {

  /** Default values. */
  public static DEFAULT = Object.assign({
    HOST: "localhost",
    PORT: 502,
    UNIT_ID: 1,
  }, adu.Master.DEFAULT);

  /** Log names. */
  public static LOG = Object.assign({
    CONNECT: "ModbusTcpClientConnect",
    DISCONNECT: "ModbusTcpClientDisconnect",
    ERROR: "ModbusTcpClientError",
  }, adu.Master.LOG);

  /** Host the client will connect to. */
  public readonly host: string;

  /** Port the client will connect to. */
  public readonly port: number;

  /** Identifier of a remote slave. */
  public readonly unitId: number;

  /** Inactivity client timeout. */
  public readonly inactivityTimeout: number;

  protected socket: Socket | null;
  protected transactionId = 0;

  /** Node socket connection options. */
  protected get connectionOptions() { return { host: this.host, port: this.port }; }

  /** Get next transaction identifier. */
  protected get nextTransactionId(): number {
    this.transactionId = (this.transactionId + 1) % 0xFFFF;
    return this.transactionId;
  }

  /**
   * Create TCP client instance.
   * @param options Client and default request options.
   */
  public constructor(options: IClientOptions, logConstructor: any = Log) {
    super(options, logConstructor);

    this.host = Validate.isString(options.host || Client.DEFAULT.HOST);
    this.port = Validate.isPort(String(options.port || Client.DEFAULT.PORT));
    this.unitId = Validate.isInteger(String(options.unitId || Client.DEFAULT.UNIT_ID), { min: 0x1, max: 0xFF });
    this.inactivityTimeout = this.isTimeout(options.inactivityTimeout);
  }

  /**
   * Connect the client to configured host:port.
   * Observable will emit next after connected, throw an error if
   * connection fails and complete when 'disconnect' is called.
   * Completes if no data transmitted or received after timeout.
   * @param options Request options.
   */
  public connect(options: IClientRequestOptions = {}): Observable<void> {
    // TODO: Timeout/retry support.
    return new Observable((subscriber: Subscriber<void>) => {
      // Disconnect and (re)open for clean state.
      this.disconnect();
      this.onOpen();

      // (Re)create socket, add error listener.
      this.socket = createConnection(this.connectionOptions);
      this.socket.on("error", (error: any) => {
        subscriber.error(new adu.MasterError(error.code, error));
      });

      // If socket closes, call disconnect and complete observable.
      const socketClose = Observable.fromEvent<boolean>(this.socket as any, "close").take(1);
      socketClose
        .subscribe((hadError) => {
          this.disconnect();
          subscriber.complete();
        });

      // If socket connects, call next.
      Observable.fromEvent<void>(this.socket as any, "connect")
        .take(1)
        .subscribe(() => {
          this.log.connect(this.host, this.port, this.unitId);
          subscriber.next();
        });

      // Socket data event receives data into internal buffer and processes responses.
      Observable.fromEvent<Buffer>(this.socket as any as any, "data")
        .takeUntil(socketClose)
        .subscribe((buffer) => this.onData(buffer));

      // Requests transmitted via socket.
      this.transmit
        .takeUntil(socketClose)
        .subscribe((request) => this.writeSocket(request));

      // If no activity occurs on socket for timeout duration, client is disconnected.
      Observable.merge(this.transmit, this.receive)
        .takeUntil(socketClose)
        .timeout(this.inactivityTimeout)
        .subscribe({
          error: (error) => {
            this.disconnect();
            subscriber.error(new adu.MasterError(error.code, error));
          },
        });
    });
  }

  /** If connected, disconnect the client from the configured host:port. */
  public disconnect(): void {
    if (this.socket != null) {
      this.onClose();
      this.log.disconnect(this.host, this.port, this.unitId);
      this.socket.end();
      this.socket.destroy();
      this.socket = null;
    }
  }

  protected writeSocket(request: tcp.Request): void {
    if (this.socket != null) {
      this.socket.write(request.buffer);
      this.log.packetsTransmitted(1);
    }
  }

  /** Construct and prepend MBAP header to PDU request buffer. */
  protected setupRequest(functionCode: pdu.EFunctionCode, request: Buffer): tcp.Request {
    const buffer = Buffer.concat([Buffer.allocUnsafe(7), request]);
    const transactionId = this.nextTransactionId;

    buffer.writeUInt16BE(transactionId, 0);
    buffer.writeUInt16BE(0, 2); // Protocol ID.
    buffer.writeUInt16BE((request.length + 1), 4);
    buffer.writeUInt8(this.unitId, 6);

    return new tcp.Request(transactionId, this.unitId, functionCode, buffer);
  }

  /** Match transaction and unit identifiers of incoming responses. */
  protected matchResponse(request: tcp.Request, response: tcp.Response | tcp.Exception): boolean {
    const transactionIdMatch = (response.transactionId === request.transactionId);
    const unitIdMatch = (response.unitId === request.unitId);
    return transactionIdMatch && unitIdMatch;
  }

  protected parseResponse(data: Buffer): number {
    // Check if buffer may contain MBAP header.
    if (data.length >= 7) {
      const header = data.slice(0, 7);
      const headerLength = header.readUInt16BE(4);
      const responseLength = 6 + headerLength;

      // If buffer contains complete response, extract it now.
      if (data.length >= responseLength) {
        this.log.packetsReceived(1);

        const aduBuffer = data.slice(0, responseLength);
        const transactionId = aduBuffer.readUInt16BE(0);
        const unitId = aduBuffer.readUInt8(6);
        const pduBuffer = aduBuffer.slice(7);

        const response = this.onParseResponse(transactionId, unitId, pduBuffer, aduBuffer);
        if (response != null) {
          this.onResponse(response);
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
  protected onParseResponse(
    transactionId: number,
    unitId: number,
    pduBuffer: Buffer,
    aduBuffer: Buffer,
  ): tcp.Response | tcp.Exception | null {
    const pduResponse = pdu.Master.onResponse(pduBuffer);
    let response: tcp.Response | tcp.Exception | null = null;

    if (pduResponse instanceof pdu.Response) {
      response = new tcp.Response(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.data,
        aduBuffer,
      );
    } else if (pduResponse instanceof pdu.Exception) {
      response = new tcp.Exception(
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
