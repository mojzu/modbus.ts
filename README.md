# Modbus.ts

[Modbus](http://www.modbus.org/) application protocol written in [TypeScript](https://www.typescriptlang.org/) for [Node.js](https://nodejs.org/en/).

## Example

Add `modbus.ts` as a dependency to `package.json` file.

```Shell
$ yarn add modbus.ts
```

Modbus TCP client/server example.

```JavaScript
var modbus = require("modbus.ts");

// Create mock server and client instances.
var server = new modbus.TcpMockServer(5022);
var client = new modbus.TcpClient({ host: "localhost", port: 5022 });

// Open server for connections.
server.open()
  .subscribe(() => {

    // Connect client to server.
    client.connect()
      .switchMap(() => {
        // Make requests to server.
        return client.readHoldingRegisters(0x1000, 1);
      })
      .switchMap((response) => {
        // Handle server response.
        console.log(response.data);

        // Disconnect client.
        return client.disconnect();
      })
      .subscribe(() => {
        // Close server.
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

# Run tests.
$ yarn run test

# Run tests with coverage.
$ yarn run coverage

# Run linter.
$ yarn run lint

# Package library.
$ yarn run pack

# Release library.
$ yarn run pack && npm publish --access=public
$ git push origin master --tags
```
