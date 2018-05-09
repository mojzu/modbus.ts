import * as process from "process";
import { switchMap } from "rxjs/operators";
import * as modbus from "../src";

// Test using Diagslave, run following commands in different terminals:
// $ ./diagslave -m tcp -a 1 -p 5002
// $ yarn run example tcp

// Create client instance.
const client = new modbus.tcp.Client({ host: "localhost", port: 5002 });

// Open client.
client
  .connect()
  .pipe(
    switchMap(() => {
      // Make request(s) to server.
      return client.readHoldingRegisters(1, 4);
    })
  )
  .subscribe((response) => {
    // Handle server response(s).
    process.stdout.write(`${JSON.stringify(response.data, null, 2)}\n`);

    // Disconnect client.
    client.disconnect();
  });
