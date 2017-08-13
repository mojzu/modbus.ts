import * as process from "process";
import * as modbus from "../";

// Test using Diagslave, run following commands in different terminals:
// $ ./diagslave -m tcp -a 1 -p 5002
// $ yarn run example -- -f tcp

// Create client instance.
const client = new modbus.TcpClient({ host: "localhost", port: 5002 }, "tcp");

// Open client.
client.connect()
  .switchMap(() => {
    // Make request(s) to server.
    return client.readHoldingRegisters(1, 4);
  })
  .subscribe((response) => {
    // Handle server response(s).
    process.stdout.write(`${JSON.stringify(response.data, null, 2)}\n`);

    // Disconnect client.
    client.disconnect();
  });
