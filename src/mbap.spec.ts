/// <reference types="jasmine" />

/// <reference types="node" />
import * as net from "net";
import * as rx from "rxjs";

describe("Modbus", () => {

  let server: net.Server;
  let client: net.Socket;

  beforeAll((done) => {
    server = net.createServer((socket) => {

      const closeEvent = rx.Observable.fromEvent(socket, "close").take(1);
      closeEvent
        .subscribe(() => {
          console.log("server socket close event");
        }, undefined, () => {
          console.log("server socket close complete");
        });

      rx.Observable.fromEvent(socket, "data")
        .takeUntil(closeEvent)
        .subscribe((buffer: Buffer) => {
          console.log("server socket data");
          console.log(buffer);

          console.log("server write");
          socket.write(buffer);
        }, undefined, () => {
          console.log("server socket data complete");
        });

    });

    server.listen(5020, () => {
      console.log("server listen");

      const options = { port: 5020, host: "localhost" };
      client = net.createConnection(options, () => {
        console.log("client connect");

        const closeEvent = rx.Observable.fromEvent(client, "close").take(1);
        closeEvent
          .subscribe(() => {
            console.log("client socket close event");
          }, undefined, () => {
            console.log("client socket close complete");
          });

        rx.Observable.fromEvent(client, "data")
          .takeUntil(closeEvent)
          .subscribe((buffer: Buffer) => {
            console.log("client socket data");
            console.log(buffer);
          }, undefined, () => {
            console.log("client socket data complete");
          });

        done();
      });

    });
  });

  afterAll(() => {
    client.end();
    server.close();
  });

  it("...", () => {

    console.log("client write");
    const buf = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
    client.write(buf);

  });

});
