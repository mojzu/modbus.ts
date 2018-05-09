import { Socket } from "net";
import { Server } from "./Server";

/** Modbus TCP server mock for testing. */
export class MockServer extends Server {
  public readCoils(startingAddress: number, quantityOfCoils: number): boolean[] {
    return this.readBits(startingAddress, quantityOfCoils);
  }
  public readDiscreteInputs(startingAddress: number, quantityOfInputs: number): boolean[] {
    return this.readBits(startingAddress, quantityOfInputs);
  }
  public readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): number[] {
    return this.readRegisters(startingAddress, quantityOfRegisters);
  }
  public readInputRegisters(startingAddress: number, quantityOfRegisters: number): number[] {
    return this.readRegisters(startingAddress, quantityOfRegisters);
  }
  public writeSingleCoil(outputAddress: number, outputValue: boolean): boolean {
    return outputValue;
  }
  public writeSingleRegister(registerAddress: number, registerValue: number): number {
    return registerValue;
  }
  public writeMultipleCoils(startingAddress: number, outputValues: boolean[]): number {
    return outputValues.length;
  }
  public writeMultipleRegisters(startingAddress: number, registerValues: number[]): number {
    return registerValues.length;
  }
  public readBits(startingAddress: number, quantityOfBits: number): boolean[] {
    const values: boolean[] = [];
    for (let i = 0; i < quantityOfBits; i++) {
      values.push(i % 2 === 0);
    }
    return values;
  }
  public readRegisters(startingAddress: number, quantityOfRegisters: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < quantityOfRegisters; i++) {
      values.push(0xafaf);
    }
    return values;
  }
}

/** Emulate a Modbus TCP server with slow response time. */
export class MockSlowServer extends MockServer {
  protected writeSocket(socket: Socket, packet: Buffer): void {
    setTimeout(() => {
      socket.write(packet);
    }, 3000);
  }
}

/** Emulate a Modbus TCP server which drops 2/3 of packets. */
export class MockDropServer extends MockServer {
  protected dropCounter = 0;

  protected writeSocket(socket: Socket, packet: Buffer): void {
    this.dropCounter += 1;
    if (this.dropCounter % 3 === 0) {
      socket.write(packet);
    }
  }
}
