import { Socket } from "net";
import { MockPduSlave } from "./PduSlave.mock";
import {
  ITcpServerOptions,
  TcpServer,
} from "./TcpServer";

/**
 * Modbus TCP server mock for testing.
 */
export class MockTcpServer extends TcpServer {

  public constructor(options: ITcpServerOptions, namespace?: string) {
    super(Object.assign({
      readCoils: MockPduSlave.readCoils.bind(MockPduSlave),
      readDiscreteInputs: MockPduSlave.readDiscreteInputs.bind(MockPduSlave),
      readHoldingRegisters: MockPduSlave.readHoldingRegisters.bind(MockPduSlave),
      readInputRegisters: MockPduSlave.readInputRegisters.bind(MockPduSlave),
      writeSingleCoil: MockPduSlave.writeSingleCoil.bind(MockPduSlave),
      writeSingleRegister: MockPduSlave.writeSingleRegister.bind(MockPduSlave),
      writeMultipleCoils: MockPduSlave.writeMultipleCoils.bind(MockPduSlave),
      writeMultipleRegisters: MockPduSlave.writeMultipleRegisters.bind(MockPduSlave),
    }, options), namespace);
  }

}

/**
 * Emulate a Modbus TCP server with slow response time.
 */
export class SlowMockTcpServer extends MockTcpServer {

  protected writeResponse(socket: Socket, packet: Buffer): void {
    setTimeout(() => {
      socket.write(packet);
    }, 3000);
  }

}

/**
 * Emulate a Modbus TCP server which drops 2/3 of packets.
 */
export class DropMockTcpServer extends MockTcpServer {

  private _dropCounter = 0;

  protected writeResponse(socket: Socket, packet: Buffer): void {
    this._dropCounter += 1;
    if ((this._dropCounter % 3) === 0) {
      socket.write(packet);
    }
  }

}
