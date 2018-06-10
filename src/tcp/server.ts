import { isPort } from "container.ts/lib/validate";
import * as net from "net";
import { bindCallback, fromEvent, Observable, Subject } from "rxjs";
import { map, take, takeUntil } from "rxjs/operators";
import * as pdu from "../pdu";
import { Client } from "./client";
import * as tcp from "./tcp";

/** Modbus TCP observable response or exception. */
export type IServerResponse = tcp.Response | tcp.Exception | null;

export interface IServerOptions {
  port?: number;
}

export abstract class Server extends pdu.Slave {
  /** Port the server will listen on. */
  public readonly port: number;

  protected server: net.Server | null = null;

  public constructor(options: IServerOptions) {
    super();
    this.port = isPort(String(options.port || Client.DEFAULT.PORT));
  }

  public open(): Observable<void> {
    // (Re)create server instance.
    this.server = net.createServer((socket) => {
      const transmit = new Subject<tcp.Response | tcp.Exception>();

      // Map socket close event to observable.
      // Close event will complete other socket observables.
      const socketClose = fromEvent<void>(socket as any, "close").pipe(take(1));
      socketClose.subscribe(() => {
        transmit.complete();
      });

      // Receive data into buffer and process.
      let buffer = Buffer.allocUnsafe(0);
      const socketData = fromEvent<Buffer>(socket as any, "data").pipe(takeUntil(socketClose));
      socketData.subscribe((data) => {
        buffer = this.onData(buffer, data, transmit);
      });

      // Transmit responses by writing to socket.
      transmit.pipe(takeUntil(socketClose)).subscribe((response) => {
        const packet = this.aduHeader(response);
        this.writeSocket(socket, packet);
      });
    });

    // Server listen to port.
    const serverListen = bindCallback(this.server.listen.bind(this.server, this.port));
    return serverListen().pipe(map(() => undefined));
  }

  public close(): void {
    if (this.server != null) {
      this.server.close();
      this.server = null;
    }
  }

  protected onData(buffer: Buffer, data: Buffer, transmit: Subject<tcp.Response | tcp.Exception>): Buffer {
    buffer = Buffer.concat([buffer, data]);

    // Check if buffer may container MBAP header.
    if (buffer.length >= 7) {
      const header = buffer.slice(0, 7);
      const headerLength = header.readUInt16BE(4);
      const requestLength = 6 + headerLength;

      // If buffer contains complete request, extract it now.
      if (buffer.length >= requestLength) {
        const aduBuffer = buffer.slice(0, requestLength);
        const transactionId = aduBuffer.readUInt16BE(0);
        const unitId = aduBuffer.readUInt8(6);
        const pduBuffer = aduBuffer.slice(7);

        // Parse PDU slice of buffer.
        // Inheritors may overwrite this function to implement their own handling.
        const response = this.onParseResponse(transactionId, unitId, pduBuffer);
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

  protected onParseResponse(transactionId: number, unitId: number, pduBuffer: Buffer): IServerResponse {
    const pduResponse = this.onRequest(pduBuffer);
    let response: IServerResponse = null;

    if (pduResponse instanceof pdu.Response) {
      response = new tcp.Response(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.data,
        pduResponse.buffer
      );
    } else if (pduResponse instanceof pdu.Exception) {
      response = new tcp.Exception(
        transactionId,
        unitId,
        pduResponse.functionCode,
        pduResponse.exceptionFunctionCode,
        pduResponse.exceptionCode,
        pduResponse.buffer
      );
    }

    return response;
  }

  protected aduHeader(response: tcp.Response | tcp.Exception): Buffer {
    const buffer = Buffer.concat([Buffer.allocUnsafe(7), response.buffer]);
    buffer.writeUInt16BE(response.transactionId, 0);
    buffer.writeUInt16BE(0, 2);
    buffer.writeUInt16BE(response.buffer.length + 1, 4);
    buffer.writeUInt8(response.unitId, 6);
    return buffer;
  }

  protected writeSocket(socket: net.Socket, packet: Buffer): void {
    socket.write(packet);
  }
}
