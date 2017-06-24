# Modbus.ts

[![npm](https://img.shields.io/npm/v/modbus.ts.svg?style=flat-square)](https://www.npmjs.com/package/modbus.ts)
[![npm](https://img.shields.io/npm/l/modbus.ts.svg?style=flat-square)](https://github.com/mojzu/modbus.ts/blob/master/LICENCE)

[Modbus](http://www.modbus.org/) application protocol written in [TypeScript](https://www.typescriptlang.org/) for [Node.js](https://nodejs.org/en/).

## Quickstart

Modbus TCP client communicating with mock server example.

```JavaScript
var modbus = require("modbus.ts");

// Create mock server and client instances.
var server = new modbus.TcpMockServer(5022, "server");
var client = new modbus.TcpClient({ host: "localhost", port: 5022 }, "client");

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
        console.log(response.data);

        // Disconnect client, close server.
        client.disconnect();
        server.close();
      });

  });
```

## Dependencies

-  [debug](https://www.npmjs.com/package/debug)
-  [RxJS](http://reactivex.io/rxjs/)

## Developer

```Shell
# Install dependencies.
$ yarn install

# Clean distribution directory.
$ yarn run clean

# Clean Node modules directory.
$ yarn run distclean

# Run tests with coverage.
$ yarn run test

# Run linter.
$ yarn run lint

# Package library.
$ yarn run pack

# Run examples.
$ node examples/quickstart.js

# Release library.
$ yarn run pack && npm publish --access=public
$ git push origin master --tags
```
