/// <reference types="jasmine" />
import { Observable } from "./rx";
import { CONNECTION_ERROR, ITcpClientOptions, TcpClient } from "./tcp-client";
import { TcpServer } from "./tcp-server";

function create(port = 502, namespace = 1): [TcpServer, TcpClient] {
  const server = new TcpServer(`mbtcps:${namespace}`);
  const options: ITcpClientOptions = { host: "localhost", port };
  const client = new TcpClient(options, `mbtcpc:${namespace}`);
  return [server, client];
}

describe("Modbus TCP Client", () => {

  it("Fails to connect to closed server port after retries", (done) => {
    const [, client] = create(1122, 1);

    client.connect()
      .subscribe({
        next: () => {
          fail();
        },
        error: (error) => {
          expect(error).toEqual(CONNECTION_ERROR);
          done();
        },
        complete: () => {
          fail();
          done();
        },
      });
  });

  it("Connects to open server port", (done) => {
    const [server, client] = create(5022, 2);
    server.open(5022)
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return Observable.forkJoin(
              client.disconnect(),
              server.close(),
            );
          })
          .subscribe({
            next: () => {
              fail();
            },
            error: (error) => {
              fail(error);
              done();
            },
            complete: () => {
              done();
            },
          });
      });
  });

});
