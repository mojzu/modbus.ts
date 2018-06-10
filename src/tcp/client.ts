import { isInteger, isPort, isString } from "container.ts/lib/validate";
import * as debug from "debug";
import { createConnection, Socket } from "net";
import { fromEvent, merge, Observable, Subscriber } from "rxjs";
import { delay, retryWhen as rxjsRetryWhen, scan, take, takeUntil, timeout } from "rxjs/operators";
import * as adu from "../adu";
import * as pdu from "../pdu";
import * as tcp from "../tcp";

// Internal debug output.
const debugLog = debug("modbus.ts");

/** Modbus TCP client log names. */
export enum EMasterLog {
  Connecting = "ModbusTcpClientConnecting",
  Connected = "ModbusTcpClientConnected",
  Disconnected = "ModbusTcpClientDisconnected",
  Error = "ModbusTcpClientError"
}

export class Log extends adu.Log<tcp.Request, tcp.Response, tcp.Exception> {
  public connecting(host: string, port: number, unitId: number): void {
    debugLog(EMasterLog.Connecting, host, port, unitId);
  }
  public connected(host: string, port: number, unitId: number): void {
    debugLog(EMasterLog.Connected, host, port, unitId);
  }
  public disconnected(host: string, port: number, unitId: number): void {
    debugLog(EMasterLog.Disconnected, host, port, unitId);
  }
  public error(error: adu.MasterError): void {
    debugLog(EMasterLog.Error, error);
  }
  public packetsTransmitted(value: number): void {}
  public packetsReceived(value: number): void {}
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

/** Modbus TCP client error codes. */
export enum EClientError {
  Write = "ModbusTcpClientWriteError"
}

/** Modbus TCP client. */
export class Client extends adu.Master<tcp.Request, tcp.Response, tcp.Exception, Log> {
  /** Host the client will connect to. */
  public readonly host: string;

  /** Port the client will connect to. */
  public readonly port: number;

  /** Identifier of a remote slave. */
  public readonly unitId: number;

  /** Inactivity client timeout. */
  public readonly inactivityTimeout: number;

  /** Is client connected. */
  public get connected(): boolean {
    return this.isConnected;
  }

  protected socket: Socket | null = null;
  protected isConnected = false;
  protected transactionId = 0;

  /** Node socket connection options. */
  protected get connectionOptions() {
    return { host: this.host, port: this.port };
  }

  /** Get next transaction identifier. */
  protected get nextTransactionId(): number {
    this.transactionId = (this.transactionId + 1) % 0xffff;
    return this.transactionId;
  }

  /**
   * Create TCP client instance.
   * @param options Client and default request options.
   */
  public constructor(options: IClientOptions, logConstructor: any = Log) {
    super(options, logConstructor);

    this.host = options.host != null ? isString(options.host) : "localhost";
    this.port = options.port != null ? isPort(String(options.port)) : 502;
    this.unitId = options.unitId != null ? isInteger(String(options.unitId), { min: 0x1, max: 0xff }) : 1;
    this.inactivityTimeout = this.isTimeout(options.inactivityTimeout);
  }

  /**
   * Connect the client to configured host:port.
   * Observable will emit next after connected, throw an error if
   * connection fails and complete when 'disconnect' is called.
   * Completes if no data transmitted or received after timeout.
   * @param options Request options.
   */
  public connect(options: IClientRequestOptions = {}): Observable<any> {
    const retry = this.isRetry(options.retry);
    const retryWhen = this.isRetryWhen(options.retryWhen);
    let retrying = false;

    return new Observable((subscriber: Subscriber<any>) => {
      // Disconnect and (re)open for clean state.
      this.disconnect();
      this.onOpen();
      this.log.connecting(this.host, this.port, this.unitId);

      // (Re)create socket, add error listener.
      this.socket = createConnection(this.connectionOptions);
      this.socket.on("error", (error: any) => {
        subscriber.error(new adu.MasterError(error.code, error));
      });

      // If socket closes, call disconnect and complete observable.
      const socketClose = fromEvent<boolean>(this.socket as any, "close").pipe(take(1));
      socketClose.subscribe((hadError) => {
        this.disconnect();
        if (!retrying) {
          subscriber.complete();
        }
      });

      // If socket connects, call next.
      fromEvent<void>(this.socket as any, "connect")
        .pipe(take(1))
        .subscribe(() => {
          this.log.connected(this.host, this.port, this.unitId);
          this.isConnected = true;
          subscriber.next();
        });

      // Socket data event receives data into internal buffer and processes responses.
      fromEvent<Buffer>(this.socket as any, "data")
        .pipe(takeUntil(socketClose))
        .subscribe((buffer) => this.onData(buffer));

      // Requests transmitted via socket.
      this.transmit.pipe(takeUntil(socketClose)).subscribe((request) => this.writeSocket(request));

      // If no activity occurs on socket for timeout duration, client is disconnected.
      merge(this.transmit, this.receive)
        .pipe(
          takeUntil(socketClose),
          timeout(this.inactivityTimeout)
        )
        .subscribe({
          error: (error) => {
            this.disconnect();
            subscriber.error(error);
          }
        });
    }).pipe(
      rxjsRetryWhen((errors) => {
        return errors.pipe(
          scan((errorCount, error) => {
            errorCount += 1;
            retrying = false;
            // Throws error if retry not required.
            retryWhen(this, retry, errorCount, error);
            retrying = true;
            return errorCount;
          }, 0),
          delay(100)
        );
      })
    );
  }

  /** If connected, disconnect the client from the configured host:port. */
  public disconnect(): void {
    if (this.socket != null) {
      this.onClose();
      this.log.disconnected(this.host, this.port, this.unitId);
      this.isConnected = false;
      this.socket.end();
      this.socket.destroy();
      this.socket = null;
    }
  }

  protected writeSocket(request: tcp.Request): void {
    if (this.socket != null && this.isConnected) {
      this.socket.write(request.buffer);
      this.log.packetsTransmitted(1);
    } else {
      this.log.error(new adu.MasterError(EClientError.Write));
    }
  }

  /** Construct and prepend MBAP header to PDU request buffer. */
  protected setupRequest(functionCode: pdu.EFunctionCode, request: Buffer): tcp.Request {
    const buffer = Buffer.concat([Buffer.allocUnsafe(7), request]);
    const transactionId = this.nextTransactionId;

    buffer.writeUInt16BE(transactionId, 0);
    buffer.writeUInt16BE(0, 2); // Protocol ID.
    buffer.writeUInt16BE(request.length + 1, 4);
    buffer.writeUInt8(this.unitId, 6);

    return new tcp.Request(transactionId, this.unitId, functionCode, buffer);
  }

  /** Match transaction and unit identifiers of incoming responses. */
  protected matchResponse(request: tcp.Request, response: tcp.Response | tcp.Exception): boolean {
    const transactionIdMatch = response.transactionId === request.transactionId;
    const unitIdMatch = response.unitId === request.unitId;
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
    aduBuffer: Buffer
  ): tcp.Response | tcp.Exception | null {
    const pduResponse = pdu.Master.onResponse(pduBuffer);
    let response: tcp.Response | tcp.Exception | null = null;

    if (pduResponse instanceof pdu.Response) {
      response = new tcp.Response(transactionId, unitId, pduResponse.functionCode, pduResponse.data, aduBuffer);
    } else if (pduResponse instanceof pdu.Exception) {
      response = new tcp.Exception(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.exceptionFunctionCode,
        pduResponse.exceptionCode,
        aduBuffer
      );
    }

    return response;
  }
}
