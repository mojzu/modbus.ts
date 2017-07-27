// import * as modbus from "modbus.ts";
import * as modbus from "../";

// Create mock server and client instances.
const server = new modbus.TcpMockServer(5022, "server");
const client = new modbus.TcpClient({ host: "localhost", port: 5022 }, "client");

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
