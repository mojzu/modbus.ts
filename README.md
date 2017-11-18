![logo](docs/logo.png)

# Modbus.ts

[![npm](https://img.shields.io/npm/v/modbus.ts.svg?style=flat-square)](https://www.npmjs.com/package/modbus.ts)
[![npm](https://img.shields.io/npm/l/modbus.ts.svg?style=flat-square)](https://github.com/mojzu/modbus.ts/blob/master/LICENCE)
[![Travis CI](https://img.shields.io/travis/mojzu/modbus.ts.svg?style=flat-square)](https://travis-ci.org/mojzu/modbus.ts)
[![Code Climate](https://img.shields.io/codeclimate/coverage/github/mojzu/modbus.ts.svg?style=flat-square)](https://codeclimate.com/github/mojzu/modbus.ts)

[Modbus](http://www.modbus.org/) application protocol written in [TypeScript](https://www.typescriptlang.org/) for [Node.js](https://nodejs.org/en/).

## Quickstart

Modbus TCP client communicating with mock server example.

```TypeScript
import * as modbus from "modbus.ts";

// Create mock server and client instances.
const server = new modbus.tcp.MockServer({ port: 5022 });
const client = new modbus.tcp.Client({ host: "localhost", port: 5022, timeout: 10000 });

// Open server for connections.
server.open()
  .subscribe(() => {

    // Connect client to server.
    client.connect()
      .switchMap(() => {
        // Make request(s) to server.
        return client.readHoldingRegisters(0x1000, 1);
      })
      .subscribe((response) => {
        // Handle server response(s).
        process.stdout.write(`${JSON.stringify(response.data, null, 2)}\n`);

        // Disconnect client, close server.
        client.disconnect();
        server.close();
      });

  });
```

More examples can be found in the `examples` directory.

## Dependencies

-  [container.ts](https://www.npmjs.com/package/container.ts)
-  [debug](https://www.npmjs.com/package/debug)
-  [rxjs](https://www.npmjs.com/package/rxjs)
-  [serialport](https://www.npmjs.com/package/serialport)
