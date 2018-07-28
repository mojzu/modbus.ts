// tslint:disable:no-console
// import * as modbus from "modbus.ts";
import { switchMap } from "rxjs/operators";
import * as modbus from "../src";

// $ yarn run ts-node ./examples/quickstart.ts

// Create mock server and client instances.
const server = new modbus.tcp.MockServer({ port: 5022 });
const client = new modbus.tcp.Client({ host: "localhost", port: 5022, timeout: 10000 });

// Open server for connections.
server.open().subscribe(() => {
  // Connect client to server.
  client
    .connect()
    .pipe(
      switchMap(() => {
        // Make request(s) to server.
        return client.readHoldingRegisters(0x1000, 1);
      })
    )
    .subscribe((response) => {
      // Handle server response(s).
      console.log("quickstart", JSON.stringify(response, null, 2));

      // Destroy client, close server.
      client.destroy();
      server.close();
    });
});
