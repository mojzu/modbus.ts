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
  // TODO: Test TcpClient argument validation.

  it("Fails to connect to closed server port", (done) => {
    const [, client] = create(TcpMockServer);
    client.connect()
      .subscribe({
        next: () => fail(),
        error: (error) => {
          expect(client.isConnected).toEqual(false);
          expect(error).toEqual(CONNECTION_ERROR);
          expect(client.errorCode).toEqual("ECONNREFUSED");
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
            return Observable.of(undefined);
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
              client.disconnect();
              server.close();
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

  it("Disconnects from server after inactivity timeout", (done) => {
    const [server, client] = create(TcpMockServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect(1)
          .switchMap(() => {
            expect(client.isConnected).toEqual(true);
            return Observable.of(undefined).delay(2000);
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
              client.disconnect();
              server.close();
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
            return Observable.of(undefined);
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
              client.disconnect();
              server.close();
            },
            error: (error) => {
              fail(error);
              done();
            },
            complete: () => {
              expect(nextCounter).toEqual(1);
              expect(client.bytesReceived).toBeGreaterThan(0);
              expect(client.bytesTransmitted).toBeGreaterThan(0);
              expect(client.packetsReceived).toEqual(1);
              expect(client.packetsTransmitted).toEqual(1);
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
            return Observable.of(undefined);
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
            return Observable.of(undefined);
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
              client.disconnect();
              server.close();
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
            return Observable.of(undefined);
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
              client.disconnect();
              server.close();
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

  it("Reads holding registers from server", (done) => {
    const [server, client] = create(TcpMockServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readHoldingRegisters(0x0010, 2);
          })
          .switchMap((response) => {
            const data: pdu.IReadHoldingRegisters = response.data;
            expect(response.functionCode).toEqual(pdu.FunctionCode.ReadHoldingRegisters);
            expect(data.bytes).toEqual(4);
            expect(data.values).toEqual([0xAFAF, 0xAFAF]);
            return Observable.of(undefined);
          })
          .subscribe({
            next: () => {
              nextCounter += 1;
              client.disconnect();
              server.close();
            },
            error: (error) => {
              fail(error);
              done();
            },
            complete: () => {
              expect(nextCounter).toEqual(1);
              expect(client.bytesReceived).toBeGreaterThan(0);
              expect(client.bytesTransmitted).toBeGreaterThan(0);
              expect(client.packetsReceived).toEqual(1);
              expect(client.packetsTransmitted).toEqual(1);
              done();
            },
          });
      });
  });

});
