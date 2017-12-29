# Modbus

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
