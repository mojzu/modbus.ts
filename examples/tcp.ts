// import * as modbus from "modbus.ts";
import * as modbus from "../";

// Create client instance.
const client = new modbus.TcpClient({ host: "localhost", port: 5002 }, "tcp");

// Open client.
client.connect()
  .switchMap(() => {
    // Make request(s) to slave.
    return client.readHoldingRegisters(0x1000, 2);
  })
  .subscribe({
    next: (response) => {
      // Handle slave response(s).
      process.stdout.write(`${JSON.stringify(response.data, null, 2)}\n`);

      // Disconnect client.
      client.disconnect();
    },
    error: (error) => {
      // Handle client errors.
      process.stderr.write(`ERROR: ${error}\n`);
    },
  });
