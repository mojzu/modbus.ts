/// <reference types="jasmine" />
import { IModbusTcpClientOptions, ModbusTcpClient } from "./tcp-client";

describe("Modbus TCP Client", () => {

  // TODO: Implement server for testing.

  it("Fails to connect to closed port after retries", (done) => {
    const options: IModbusTcpClientOptions = { host: "localhost", port: 1122 };
    const client = new ModbusTcpClient(options);
    let retries = 0;

    client.connect(3)
      .subscribe((result) => {
        retries += 1;
        expect(result.connected).toEqual(false);
        expect(result.retries).toEqual(retries);
        expect(result.error).toEqual("ECONNREFUSED");
      }, (error) => {
        fail(error);
      }, () => {
        expect(retries).toEqual(3);
        done();
      });
  });

});
