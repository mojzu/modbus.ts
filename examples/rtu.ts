// import * as process from "process";
import { forkJoin } from "rxjs";
import { switchMap } from "rxjs/operators";
import { argv } from "yargs";
import * as modbus from "../src";

// Test using Diagslave, run following commands in different terminals:
// $ socat -d -d PTY PTY
// socat[13872] N PTY is /dev/pts/7
// socat[13872] N PTY is /dev/pts/19
// $ ./diagslave -m rtu -a 1 /dev/pts/7
// $ yarn run example -- -f rtu -p /dev/pts/19

// Create master instance.
const master = new modbus.rtu.Master({ path: argv.p });

// Open master.
master
  .open()
  .pipe(
    switchMap(() => {
      // Make request(s) to slave.
      // return master.readHoldingRegisters(1, 4);
      return forkJoin(
        master.readHoldingRegisters(1, 4),
        master.readHoldingRegisters(1, 4),
        master.readHoldingRegisters(1, 4),
        master.readHoldingRegisters(1, 4),
        master.readHoldingRegisters(1, 4),
        master.readHoldingRegisters(1, 4),
        master.readHoldingRegisters(1, 4),
        master.readHoldingRegisters(1, 4),
        master.readHoldingRegisters(1, 4)
      );
    })
  )
  .subscribe((response) => {
    // // Handle slave response(s).
    // process.stdout.write(`${JSON.stringify(response.data, null, 2)}\n`);

    // Close master.
    master.close();
  });
