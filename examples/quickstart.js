// var modbus = require("../modbus.ts");
var modbus = require("../dist");

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
