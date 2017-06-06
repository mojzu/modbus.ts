/// <reference types="jasmine" />
import { IModbusTcpClientOptions, ModbusTcpClient } from "./tcp-client";
import { ModbusTcpServer } from "./tcp-server";

describe("Modbus TCP Client", () => {

  it("Fails to connect to closed server port after retries", (done) => {
    const options: IModbusTcpClientOptions = { host: "localhost", port: 1122 };
    const client = new ModbusTcpClient(options, "mbtcpc:1");
    let retries = 0;

    client.connect(3)
      .subscribe((result) => {
        retries += 1;
        expect(result.connected).toEqual(false);
        expect(result.retries).toEqual(retries);
        expect(result.error).toEqual("ECONNREFUSED");
      }, (error) => {
        fail(error);
        done();
      }, () => {
        client.disconnect();
        expect(retries).toEqual(3);
        done();
      });
  });

  it("Connects to open server port", (done) => {
    const server = new ModbusTcpServer("mbtcps:2");
    server.open(5022)
      .subscribe(() => {
        const options: IModbusTcpClientOptions = { host: "localhost", port: 5022 };
        const client = new ModbusTcpClient(options, "mbtcpc:2");

        client.connect(3)
          .subscribe((result) => {
            expect(result.connected).toEqual(true);
            expect(result.retries).toEqual(0);
            expect(result.error).toBeUndefined();
          }, (error) => {
            fail(error);
            done();
          }, () => {
            client.disconnect();
            server.close();
            done();
          });
      });
  });

});
