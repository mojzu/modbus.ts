import { Observable } from "./rx";
import { Server, createServer, debug } from "./node";

/**
 * Modbus TCP server.
 */
export class TcpServer {

  private _debug: any;
  private _server: Server | null;

  /** Client debug interface. */
  public get debug(): any { return this._debug; }

  public constructor(namespace = "mbtcps") {
    this._debug = debug(namespace);
  }

  public open(port: number): Observable<void> {
    this.debug(`open ${port}`);

    // (Re)create server instance.
    this._server = createServer((socket) => {
      const socketAddress = socket.address();
      const address = `${socketAddress.address}:${socketAddress.port}`;
      this.debug(`connect ${address}`);

      // Map socket close event to observable.
      const socketClose = Observable.fromEvent(socket, "close").take(1);
      socketClose
        .subscribe(() => {
          this.debug(`disconnect ${address}`);
        });
    });

    // Server listen to port.
    const serverListen = Observable.bindCallback(this._server.listen.bind(this._server, port));
    return serverListen();
  }

  public close(): Observable<void> {
    if (this._server != null) {
      this.debug(`close`);
      this._server.close();
      this._server = null;
    }
    return Observable.of(undefined);
  }

}
