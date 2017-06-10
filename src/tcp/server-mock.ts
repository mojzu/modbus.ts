import { TcpServer } from "./server";

export class TcpMockServer extends TcpServer {

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

  protected readBits(startingAddress: number, quantityOfBits: number): boolean[] {
    const values: boolean[] = [];
    for (let i = 0; i < quantityOfBits; i++) {
      values.push((i % 2) === 0);
    }
    return values;
  }

  protected readRegisters(startingAddress: number, quantityOfRegisters: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < quantityOfRegisters; i++) {
      values.push(0xAFAF);
    }
    return values;
  }

}
