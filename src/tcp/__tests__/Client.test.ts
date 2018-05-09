import { ValidateError } from "container.ts/lib/validate";
import * as Debug from "debug";
import { forkJoin } from "rxjs";
import { delay, map, switchMap } from "rxjs/operators";
import * as adu from "../../adu";
import * as pdu from "../../pdu";
import { Client, IClientOptions, Log } from "../Client";
import { MockDropServer, MockServer, MockSlowServer } from "../Mock";
import { Server } from "../Server";

const debug = Debug("modbus.ts:test");

class TestLog extends Log {
  public bytesTransmitted(value: number): void {
    debug(`bytesTransmitted: ${value}`);
  }
  public bytesReceived(value: number): void {
    debug(`bytesReceived: ${value}`);
  }
  public packetsTransmitted(value: number): void {
    debug(`packetsTransmitted: ${value}`);
  }
  public packetsReceived(value: number): void {
    debug(`packetsReceived: ${value}`);
  }
}

let nextPort = 5020;

function create(serverClass: any, options: IClientOptions = {}): [Server, Client] {
  const port = nextPort++;
  const server = new serverClass({ port });
  const clientOptions: IClientOptions = Object.assign({ port, log: new TestLog() }, options);
  const client = new Client(clientOptions);
  return [server, client];
}

describe("Client", () => {
  // TODO(L): Test Client method requests/exceptions.
  // TODO(L): Test Client argument validation.

  it("Throws error for invalid retry argument", (done) => {
    try {
      create(MockServer, { retry: -1000 });
      done.fail();
    } catch (error) {
      expect(error instanceof ValidateError).toEqual(true);
      done();
    }
  });

  it("Throws error for invalid timeout argument", (done) => {
    try {
      create(MockServer, { timeout: 1 });
      done.fail();
    } catch (error) {
      expect(error instanceof ValidateError).toEqual(true);
      done();
    }
  });

  it("Fails to connect to closed server port", (done) => {
    const [, client] = create(MockServer);
    client.connect().subscribe({
      next: () => done.fail(),
      error: (error) => {
        expect(error instanceof adu.MasterError).toEqual(true);
        done();
      },
      complete: () => {
        done.fail();
      }
    });
  });

  it("Connects to open server port", (done) => {
    const [server, client] = create(MockServer);
    let nextCounter = 0;
    server.open().subscribe(() => {
      client.connect().subscribe({
        next: () => {
          nextCounter += 1;
          client.disconnect();
          server.close();
        },
        error: (error) => {
          done.fail(error);
        },
        complete: () => {
          expect(nextCounter).toEqual(1);
          done();
        }
      });
    });
  });

  it("Disconnects from server after inactivity timeout", (done) => {
    const [server, client] = create(MockServer, { inactivityTimeout: 1000 });
    server.open().subscribe(() => {
      client
        .connect()
        .pipe(delay(2000))
        .subscribe({
          next: () => done.fail(),
          error: (error) => {
            expect(error instanceof adu.MasterError).toEqual(true);
            done();
          },
          complete: () => done()
        });
    });
  });

  it("Reads coils from server", (done) => {
    const [server, client] = create(MockServer);
    let nextCounter = 0;
    server.open().subscribe(() => {
      client
        .connect()
        .pipe(
          switchMap(() => {
            return client.readCoils(0x1000, 4);
          }),
          map((response) => {
            const data: pdu.IReadCoils = response.data;
            expect(response.functionCode).toEqual(pdu.EFunctionCode.ReadCoils);
            expect(data.bytes).toEqual(1);
            expect(data.values).toEqual([true, false, true, false, false, false, false, false]);
          })
        )
        .subscribe({
          next: () => {
            nextCounter += 1;
            client.disconnect();
            server.close();
          },
          error: (error) => {
            done.fail(error);
          },
          complete: () => {
            expect(nextCounter).toEqual(1);
            done();
          }
        });
    });
  });

  it("Buffers writes to socket", (done) => {
    const [server, client] = create(MockServer);
    server.open().subscribe(() => {
      client
        .connect()
        .pipe(
          switchMap(() => {
            return forkJoin(
              client.writeSingleRegister(0x0101, 0xafaf),
              client.writeSingleRegister(0x0101, 0xafaf),
              client.writeMultipleCoils(0x1010, [false, true]),
              client.writeMultipleCoils(0x1010, [false, true])
            );
          })
        )
        .subscribe({
          next: () => {
            client.disconnect();
            server.close();
          },
          error: (error) => {
            done.fail(error);
          },
          complete: () => done()
        });
    });
  });

  it("Read coils from slow server causes timeout error", (done) => {
    const [server, client] = create(MockSlowServer);
    server.open().subscribe(() => {
      client
        .connect()
        .pipe(
          switchMap(() => {
            return client.readCoils(0x0001, 1, { timeout: 1000 });
          })
        )
        .subscribe({
          next: () => done.fail(),
          error: (error) => {
            expect(error instanceof adu.MasterError).toEqual(true);
            done();
          },
          complete: () => done()
        });
    });
  });

  it("Read coils from drop server succeeds with retries", (done) => {
    const [server, client] = create(MockDropServer);
    let nextCounter = 0;
    server.open().subscribe(() => {
      client
        .connect()
        .pipe(
          switchMap(() => {
            return client.readCoils(0x0001, 1, { retry: 3, timeout: 1000 });
          }),
          map((response) => {
            const data: pdu.IReadCoils = response.data;
            expect(response.functionCode).toEqual(pdu.EFunctionCode.ReadCoils);
            expect(data.bytes).toEqual(1);
            expect(data.values).toEqual([true, false, false, false, false, false, false, false]);
          })
        )
        .subscribe({
          next: () => {
            nextCounter += 1;
            client.disconnect();
            server.close();
          },
          error: (error) => {
            done.fail(error);
          },
          complete: () => {
            expect(nextCounter).toEqual(1);
            done();
          }
        });
    });
  });

  it("Reads discrete inputs from server", (done) => {
    const [server, client] = create(MockServer);
    let nextCounter = 0;
    server.open().subscribe(() => {
      client
        .connect()
        .pipe(
          switchMap(() => {
            return client.readDiscreteInputs(0x0010, 1);
          }),
          map((response) => {
            const data: pdu.IReadDiscreteInputs = response.data;
            expect(response.functionCode).toEqual(pdu.EFunctionCode.ReadDiscreteInputs);
            expect(data.bytes).toEqual(1);
            expect(data.values).toEqual([true, false, false, false, false, false, false, false]);
          })
        )
        .subscribe({
          next: () => {
            nextCounter += 1;
            client.disconnect();
            server.close();
          },
          error: (error) => {
            done.fail(error);
          },
          complete: () => {
            expect(nextCounter).toEqual(1);
            done();
          }
        });
    });
  });

  it("Reads holding registers from server", (done) => {
    const [server, client] = create(MockServer);
    let nextCounter = 0;
    server.open().subscribe(() => {
      client
        .connect()
        .pipe(
          switchMap(() => {
            return client.readHoldingRegisters(0x0010, 2);
          }),
          map((response) => {
            const data: pdu.IReadHoldingRegisters = response.data;
            expect(response.functionCode).toEqual(pdu.EFunctionCode.ReadHoldingRegisters);
            expect(data.bytes).toEqual(4);
            expect(data.values).toEqual([0xafaf, 0xafaf]);
          })
        )
        .subscribe({
          next: () => {
            nextCounter += 1;
            client.disconnect();
            server.close();
          },
          error: (error) => {
            done.fail(error);
          },
          complete: () => {
            expect(nextCounter).toEqual(1);
            done();
          }
        });
    });
  });
});
