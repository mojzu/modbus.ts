// import * as modbus from "modbus.ts";
import * as modbus from "../";

// $ socat -d -d PTY PTY
// $ ./diagslave -a 1 /dev/pts/17

// Create client instance.
const client = new modbus.RtuClient({ path: "/dev/pts/10" }, "rtu");

// Open client.
client.open()
  .switchMap(() => {
    // Make request(s) to slave.
    return client.readHoldingRegisters(5, 2);
  })
  .subscribe({
    next: (response) => {
      // Handle slave response(s).
      process.stdout.write(`${JSON.stringify(response.data, null, 2)}\n`);

      client.close();
    },
    error: (error) => {
      // Handle client errors.
      process.stderr.write(`ERROR: ${error}\n`);
    },
  });
