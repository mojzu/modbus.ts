/// <reference types="jasmine" />
import { ValidateError } from "container.ts/lib/validate";
import { Observable } from "./rxjs";
import {
  EModbusFunctionCode,
  IModbusReadCoils,
  IModbusReadDiscreteInputs,
  IModbusReadHoldingRegisters,
} from "./modbus";
import {
  IAduMasterRequestOptions,
} from "./AduMaster";
import {
  ITcpClientOptions,
  TcpClient,
} from "./TcpClient";
import { TcpServer } from "./TcpServer";
import {
  MockTcpServer,
  SlowMockTcpServer,
  DropMockTcpServer,
} from "./TcpServer.mock";

let nextPort = 5020;
let nextNamespace = 0;

function create(serverClass: any, options: IAduMasterRequestOptions = {}): [TcpServer, TcpClient] {
  const port = nextPort++;
  const namespace = nextNamespace++;
  const server = new serverClass({ port }, `server:${namespace}`);
  const clientOptions: ITcpClientOptions = Object.assign({ host: "localhost", port }, options);
  const client = new TcpClient(clientOptions, `client:${namespace}`);
  return [server, client];
}

describe("TcpClient", () => {

  // TODO: Test TcpClient method requests/exceptions.
  // TODO: Test TcpClient argument validation.

  it("Throws error for invalid retry argument", () => {
    try {
      create(MockTcpServer, { retry: 1000 });
      fail();
    } catch (error) {
      expect(error instanceof ValidateError).toEqual(true);
    }
  });

  it("Throws error for invalid timeout argument", () => {
    try {
      create(MockTcpServer, { timeout: 1 });
      fail();
    } catch (error) {
      expect(error instanceof ValidateError).toEqual(true);
    }
  });

  it("Fails to connect to closed server port", (done) => {
    const [, client] = create(MockTcpServer);
    client.connect()
      .subscribe({
        next: () => fail(),
        error: (error) => {
          expect(error).toEqual(TcpClient.ERROR.CONNECTION);
          expect(client.errorCode).toEqual(TcpClient.ERROR.CONNECTION);
          done();
        },
        complete: () => {
          fail();
          done();
        },
      });
  });

  it("Connects to open server port", (done) => {
    const [server, client] = create(MockTcpServer);
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
    const [server, client] = create(MockTcpServer);
    server.open()
      .subscribe(() => {
        client.connect({ timeout: 1000 })
          .switchMap(() => {
            expect(client.isConnected).toEqual(true);
            return Observable.of(undefined).delay(2000);
          })
          .subscribe({
            next: () => fail(),
            error: (error) => {
              expect(error).toEqual(TcpClient.ERROR.TIMEOUT);
              expect(client.errorCode).toEqual(TcpClient.ERROR.TIMEOUT);
              done();
            },
            complete: () => fail(),
          });
      });
  });

  it("Reads coils from server", (done) => {
    const [server, client] = create(MockTcpServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readCoils(0x1000, 4);
          })
          .switchMap((response) => {
            const data: IModbusReadCoils = response.data;
            expect(response.functionCode).toEqual(EModbusFunctionCode.ReadCoils);
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
    const [server, client] = create(SlowMockTcpServer);
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readCoils(0x0001, 1, { timeout: 1000 });
          })
          .switchMap((response) => {
            return Observable.of(undefined);
          })
          .subscribe({
            next: () => fail(),
            error: (error) => {
              expect(error).toEqual(TcpClient.ERROR.TIMEOUT);
              done();
            },
            complete: () => done(),
          });
      });
  });

  it("Read coils from drop server succeeds with retries", (done) => {
    const [server, client] = create(DropMockTcpServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readCoils(0x0001, 1, { retry: 3, timeout: 1000 });
          })
          .switchMap((response) => {
            const data: IModbusReadCoils = response.data;
            expect(response.functionCode).toEqual(EModbusFunctionCode.ReadCoils);
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

  it("Reads discrete inputs from server", (done) => {
    const [server, client] = create(MockTcpServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readDiscreteInputs(0x0010, 1);
          })
          .switchMap((response) => {
            const data: IModbusReadDiscreteInputs = response.data;
            expect(response.functionCode).toEqual(EModbusFunctionCode.ReadDiscreteInputs);
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
    const [server, client] = create(MockTcpServer);
    let nextCounter = 0;
    server.open()
      .subscribe(() => {
        client.connect()
          .switchMap(() => {
            return client.readHoldingRegisters(0x0010, 2);
          })
          .switchMap((response) => {
            const data: IModbusReadHoldingRegisters = response.data;
            expect(response.functionCode).toEqual(EModbusFunctionCode.ReadHoldingRegisters);
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
