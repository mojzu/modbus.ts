// tslint:disable:no-console
import { forkJoin } from "rxjs";
import { switchMap } from "rxjs/operators";
import * as SerialPort from "serialport";
import { argv } from "yargs";
import * as modbus from "../src";

// Test using Diagslave, run following commands in different terminals:
// $ socat -d -d PTY PTY
// socat[13872] N PTY is /dev/pts/7
// socat[13872] N PTY is /dev/pts/19
// $ ./diagslave -m rtu -a 1 /dev/pts/7
// $ yarn run ts-node ./examples/rtu.ts -p /dev/pts/19

const path = argv.p;
const port = new SerialPort(path, {
  autoOpen: false,
  baudRate: 19200,
  dataBits: 8,
  stopBits: 1,
  parity: "even",
  rtscts: false
});

// Create master instance.
const master = new modbus.rtu.Master(port, {
  slaveAddress: 1
});

// Open master.
master
  .open()
  .pipe(
    switchMap(() => {
      // Make request to slave.
      // return master.readInputRegisters(0, 1);

      // Make multiple requests in order to slave.
      return forkJoin(
        master.readHoldingRegisters(1, 4),
        master.readDiscreteInputs(1, 4),
        master.readHoldingRegisters(1, 4),
        master.readInputRegisters(1, 4)
      );
    })
  )
  .subscribe({
    next: (response) => {
      // Handle slave response(s).
      console.log("rtu", JSON.stringify(response, null, 2));

      // Destroy master.
      master.destroy();
    },
    error: (error) => {
      // Handle error(s).
      console.error("rtu", error);

      // Destroy master.
      master.destroy();
    }
  });
