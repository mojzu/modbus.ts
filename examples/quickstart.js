// var modbus = require("modbus.ts");
var modbus = require("../dist");

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
