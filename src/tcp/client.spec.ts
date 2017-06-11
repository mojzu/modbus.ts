/// <reference types="jasmine" />
import { Observable } from "../rx";
import * as pdu from "../pdu/pdu";
import { CONNECTION_ERROR, TIMEOUT_ERROR, ITcpClientOptions, TcpClient } from "./client";
import { TcpServer } from "./server";
import { TcpMockServer, TcpSlowMockServer, TcpDropMockServer } from "./server-mock";

let nextPort = 5020;
let nextNamespace = 0;

function create(serverClass: any): [TcpServer, TcpClient] {
  const port = nextPort++;
  const namespace = nextNamespace++;
  const server = new serverClass(port, `server:${namespace}`);
  const options: ITcpClientOptions = { host: "localhost", port };
  const client = new TcpClient(options, `client:${namespace}`);
  return [server, client];
}

describe("Modbus TCP Client", () => {

  // TODO: Test TcpClient method requests/exceptions.
  // TODO: Test bytes/packets transmitted/received counters.
  // TODO: Test TcpClient argument validation.

  it("Fails to connect to closed server port after retries", (done) => {
    const [, client] = create(TcpMockServer);

    client.connect(5, 3)
      .subscribe({
        next: () => fail(),
        error: (error) => {
          expect(client.isConnected).toEqual(false);
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
    const [server, client] = create(TcpMockServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            expect(client.isConnected).toEqual(true);
            return Observable.forkJoin(
              client.disconnect(),
              server.close(),
            );
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
            },
            error: (error) => {
              fail(error);
              done();
            },
            complete: () => {
              expect(nextCounter).toEqual(1);
              done();
            },
          });
      });
  });

  it("Reads coils from server", (done) => {
    const [server, client] = create(TcpMockServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readCoils(0x1000, 4);
          })
          .switchMap((response) => {
            const data: pdu.IReadCoils = response.data;
            expect(response.functionCode).toEqual(pdu.FunctionCode.ReadCoils);
            expect(data.bytes).toEqual(1);
            expect(data.values).toEqual([true, false, true, false, false, false, false, false]);
            return Observable.forkJoin(
              client.disconnect(),
              server.close(),
            );
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
            },
            error: (error) => {
              fail(error);
              done();
            },
            complete: () => {
              expect(nextCounter).toEqual(1);
              done();
            },
          });
      });
  });

  it("Read coils from slow server causes timeout error", (done) => {
    const [server, client] = create(TcpSlowMockServer);
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readCoils(0x0001, 1, 1);
          })
          .switchMap((response) => {
            return Observable.forkJoin(
              client.disconnect(),
              server.close(),
            );
          })
          .subscribe({
            next: () => fail(),
            error: (error) => {
              expect(error).toEqual(TIMEOUT_ERROR);
              done();
            },
            complete: () => done(),
          });
      });
  });

  it("Read coils from drop server succeeds with retries", (done) => {
    const [server, client] = create(TcpDropMockServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readCoils(0x0001, 1, 2, 3);
          })
          .switchMap((response) => {
            const data: pdu.IReadCoils = response.data;
            expect(response.functionCode).toEqual(pdu.FunctionCode.ReadCoils);
            expect(data.bytes).toEqual(1);
            expect(data.values).toEqual([true, false, false, false, false, false, false, false]);
            expect(client.retries).toEqual(2);
            return Observable.forkJoin(
              client.disconnect(),
              server.close(),
            );
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
            },
            error: (error) => {
              fail(error);
              done();
            },
            complete: () => {
              expect(nextCounter).toEqual(1);
              done();
            },
          });
      });
  });

  it("Reads discrete inputs from server", (done) => {
    const [server, client] = create(TcpMockServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readDiscreteInputs(0x0010, 1);
          })
          .switchMap((response) => {
            const data: pdu.IReadDiscreteInputs = response.data;
            expect(response.functionCode).toEqual(pdu.FunctionCode.ReadDiscreteInputs);
            expect(data.bytes).toEqual(1);
            expect(data.values).toEqual([true, false, false, false, false, false, false, false]);
            return Observable.forkJoin(
              client.disconnect(),
              server.close(),
            );
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
            },
            error: (error) => {
              fail(error);
              done();
            },
            complete: () => {
              expect(nextCounter).toEqual(1);
              done();
            },
          });
      });
  });

});
