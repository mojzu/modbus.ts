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
import * as SerialPort from "serialport";

const path = argv.p;
const serialOptions: SerialPort.OpenOptions = {
  autoOpen: false,
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  rtscts: false
};
const port = new SerialPort(path, serialOptions);

// Create master instance.
const opts = {
  slaveAddress: 10
};
const master = new modbus.rtu.Master(port, opts);

// Open master.
master
  .open()
  .pipe(
    switchMap(() => {
      // Make request(s) to slave.
      // return master.readHoldingRegisters(1, 4);
      return forkJoin(
        master.readInputRegisters(0, 1)
      );
    })
  )
  .subscribe((response) => {
    // // Handle slave response(s).
    console.log(JSON.stringify(response[0].data));

    // Close master.
    master.close();
  });