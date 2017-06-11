import { Observable, Subject } from "../rx";
import { Socket, Server, createServer, debug } from "../node";
import * as pdu from "../pdu/pdu";
import { PduServer } from "../pdu/server";
import * as tcp from "./tcp";

/** Modbus TCP observable response or exception. */
export type TcpServerResponse = tcp.TcpResponse | tcp.TcpException | null;

/**
 * Modbus TCP server.
 */
export abstract class TcpServer extends PduServer {

  private _debug: any;
  private _protocolId = 0;

  private _server: Server | null;
  private _port: number;

  private _packetsReceived = 0;
  private _packetsTransmitted = 0;
  // TODO: Subscribable for transmitted/received monitoring.

  /** Port the server will listen on. */
  public get port(): number { return this._port; }

  public constructor(port?: number, namespace = "mbtcp") {
    super();
    this._port = port || 502;
    this._debug = debug(namespace);
  }

  public open(): Observable<void> {
    this.debug(`open: ${this.port}`);

    // (Re)create server instance.
    this._server = createServer((socket) => {
      const socketAddress = socket.address();
      const address = `${socketAddress.address}:${socketAddress.port}`;
      const transmit = new Subject<tcp.TcpResponse | tcp.TcpException>();
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
      let buffer = Buffer.alloc(0);
      const socketData: Observable<Buffer> = Observable.fromEvent(socket, "data").takeUntil(socketClose);
      socketData
        .subscribe((data) => {
          buffer = this.receiveData(buffer, data, transmit);
        });

      // Transmit responses by writing to socket.
      transmit.takeUntil(socketClose)
        .subscribe((response) => {
          this.debug(`transmit: ${response}`);
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

  /** Server internal debugging interface. */
  protected get debug(): any { return this._debug; }

  protected receiveData(buffer: Buffer, data: Buffer, transmit: Subject<tcp.TcpResponse | tcp.TcpException>): Buffer {
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
          this.debug(`receive: ${response}`);
          transmit.next(response);
        }

        // Return buffer with packet removed.
        return buffer.slice(requestLength);
      }
    }

    // Return concatenated buffers.
    return buffer;
  }

  protected tcpRequestHandler(transactionId: number, unitId: number, pduBuffer: Buffer): TcpServerResponse {
    const pduResponse = this.pduRequestHandler(pduBuffer);
    let response: TcpServerResponse = null;

    if (pduResponse instanceof pdu.PduResponse) {
      response = new tcp.TcpResponse(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.data,
        pduResponse.buffer,
      );
    } else if (pduResponse instanceof pdu.PduException) {
      response = new tcp.TcpException(
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

  protected aduHeader(response: tcp.TcpResponse | tcp.TcpException): Buffer {
    const buffer = Buffer.concat([Buffer.alloc(7, 0), response.buffer]);
    buffer.writeUInt16BE(response.transactionId, 0);
    buffer.writeUInt16BE(this._protocolId, 2);
    buffer.writeUInt16BE((response.buffer.length + 1), 4);
    buffer.writeUInt8(response.unitId, 6);
    return buffer;
  }

  protected writeResponse(socket: Socket, packet: Buffer): void {
    socket.write(packet);
  }

}
