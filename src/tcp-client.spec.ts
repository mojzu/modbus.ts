/// <reference types="jasmine" />
import { Observable } from "./rx";
import "rxjs/add/observable/forkJoin";
import { ITcpClientOptions, TcpClient } from "./tcp-client";
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
    let retries = 0;

    client.connect(3)
      .switchMap((result) => {
        retries += 1;
        expect(result.connected).toEqual(false);
        expect(result.retries).toEqual(retries);
        expect(result.error).toEqual("ECONNREFUSED");
        return (retries === 3) ? client.disconnect() : Observable.of(undefined);
      })
      .subscribe({
        error: (error) => {
          fail(error);
          done();
        },
        complete: () => {
          expect(retries).toEqual(3);
          done();
        },
      });
  });

  it("Connects to open server port", (done) => {
    const [server, client] = create(5022, 2);
    server.open(5022)
      .subscribe(() => {
        client.connect(3)
          .switchMap((result) => {
            expect(result.connected).toEqual(true);
            expect(result.retries).toEqual(0);
            expect(result.error).toBeUndefined();
            return Observable.forkJoin(
              client.disconnect(),
              server.close(),
            );
          })
          .subscribe({
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
