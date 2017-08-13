import * as process from "process";
import * as modbus from "../";

// Test using Diagslave, run following commands in different terminals:
// $ socat -d -d PTY PTY
// socat[13872] N PTY is /dev/pts/7
// socat[13872] N PTY is /dev/pts/19
// $ ./diagslave -m rtu -a 1 /dev/pts/7
// $ yarn run example -- -f rtu -p /dev/pts/19

// Create master instance.
const master = new modbus.RtuMaster({ path: process.argv[2] }, "rtu");

// Open master.
master.open()
  .switchMap(() => {
    // Make request(s) to slave.
    return master.readHoldingRegisters(1, 4);
  })
  .subscribe((response) => {
    // Handle slave response(s).
    process.stdout.write(`${JSON.stringify(response.data, null, 2)}\n`);

    // Close master.
    master.close();
  });
