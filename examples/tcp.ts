// tslint:disable:no-console
import { switchMap } from "rxjs/operators";
import * as modbus from "../src";

// Test using Diagslave, run following commands in different terminals:
// $ ./diagslave -m tcp -a 1 -p 5002
// $ yarn run ts-node ./examples/tcp.ts

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
  .subscribe({
    next: (response) => {
      // Handle server response(s).
      console.log("tcp", JSON.stringify(response, null, 2));

      // Disconnect client.
      client.disconnect();
    },
    error: (error) => {
      // Handle error(s).
      console.error("tcp", error);
    }
  });
