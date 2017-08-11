import { Socket, Server, createServer } from "net";
import * as debug from "debug";
import { Validate } from "container.ts/lib/validate";
import {
  Observable,
  Subject,
} from "./rxjs";
import {
  PduResponse,
  PduException,
} from "./PduMaster";
import {
  IPduSlaveHandlers,
  PduSlave,
} from "./PduSlave";
import {
  TcpResponse,
  TcpException,
} from "./TcpClient";

/** Modbus TCP observable response or exception. */
export type ITcpServerResponse = TcpResponse | TcpException | null;

export interface ITcpServerOptions extends IPduSlaveHandlers {
  port?: number;
}

export class TcpServer extends PduSlave {

  private _debug: debug.IDebugger;

  private _server: Server | null;
  private _port: number;

  private _packetsReceived = 0;
  private _packetsTransmitted = 0;

  /** Server internal debugging interface. */
  public get debug(): debug.IDebugger {
    if (this._debug != null) {
      return this._debug;
    }
    // Dummy callback for undefined namespace.
    return (() => { }) as any;
  }

  /** Port the server will listen on. */
  public get port(): number { return this._port; }

  public constructor(options: ITcpServerOptions, namespace?: string) {
    super(options);

    this._port = Validate.isPort(String(options.port || 502));

    if (namespace != null) {
      this._debug = debug(namespace);
    }
  }

  public open(): Observable<void> {
    this.debug(`open: ${this.port}`);

    // (Re)create server instance.
    this._server = createServer((socket) => {
      const socketAddress = socket.address();
      const address = `${socketAddress.address}:${socketAddress.port}`;
      const transmit = new Subject<TcpResponse | TcpException>();
      this.debug(`connect: ${address}`);

      // Map socket close event to observable.
      // Close event will complete other socket observables.
      const socketClose = Observable.fromEvent(socket, "close").take(1);
      socketClose
        .subscribe(() => {
          this.debug(`disconnect: ${address}`);
          transmit.complete();
        });

      // Receive data into buffer and process.
      let buffer = Buffer.allocUnsafe(0);
      const socketData: Observable<any> = Observable.fromEvent(socket, "data").takeUntil(socketClose);
      socketData
        .subscribe((data: Buffer) => {
          buffer = this.receiveData(buffer, data, transmit);
        });

      // Transmit responses by writing to socket.
      transmit.takeUntil(socketClose)
        .subscribe((response) => {
          const packet = this.aduHeader(response);
          this.writeResponse(socket, packet);
          this._packetsTransmitted += 1;
        });
    });

    // Server listen to port.
    const serverListen = Observable.bindCallback(this._server.listen.bind(this._server, this._port));
    return serverListen();
  }

  public close(): Observable<void> {
    if (this._server != null) {
      this.debug(`close ${this.port}`);
      this._server.close();
      this._server = null;
    }
    return Observable.of(undefined);
  }

  protected receiveData(buffer: Buffer, data: Buffer, transmit: Subject<TcpResponse | TcpException>): Buffer {
    buffer = Buffer.concat([buffer, data]);

    // Check if buffer may container MBAP header.
    if (buffer.length >= 7) {
      const header = buffer.slice(0, 7);
      const headerLength = header.readUInt16BE(4);
      const requestLength = 6 + headerLength;

      // If buffer contains complete request, extract it now.
      if (buffer.length >= requestLength) {
        this._packetsReceived += 1;

        const aduBuffer = buffer.slice(0, requestLength);
        const transactionId = aduBuffer.readUInt16BE(0);
        const unitId = aduBuffer.readUInt8(6);
        const pduBuffer = aduBuffer.slice(7);

        // Parse PDU slice of buffer.
        // Inheritors may overwrite this function to implement their own handling.
        const response = this.tcpRequestHandler(transactionId, unitId, pduBuffer);
        if (response != null) {
          transmit.next(response);
        }

        // Return buffer with packet removed.
        return buffer.slice(requestLength);
      }
    }

    // Return concatenated buffers.
    return buffer;
  }

  protected tcpRequestHandler(transactionId: number, unitId: number, pduBuffer: Buffer): ITcpServerResponse {
    const pduResponse = this.requestHandler(pduBuffer);
    let response: ITcpServerResponse = null;

    if (pduResponse instanceof PduResponse) {
      response = new TcpResponse(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.data,
        pduResponse.buffer,
      );
    } else if (pduResponse instanceof PduException) {
      response = new TcpException(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.exceptionFunctionCode,
        pduResponse.exceptionCode,
        pduResponse.buffer,
      );
    }

    return response;
  }

  protected aduHeader(response: TcpResponse | TcpException): Buffer {
    const buffer = Buffer.concat([Buffer.allocUnsafe(7), response.buffer]);
    buffer.writeUInt16BE(response.transactionId, 0);
    buffer.writeUInt16BE(0, 2);
    buffer.writeUInt16BE((response.buffer.length + 1), 4);
    buffer.writeUInt8(response.unitId, 6);
    return buffer;
  }

  protected writeResponse(socket: Socket, packet: Buffer): void {
    socket.write(packet);
  }

}
