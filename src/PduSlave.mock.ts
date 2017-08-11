import { PduSlave } from "./PduSlave";

/**
 * Modbus PDU server mock for testing.
 */
export class MockPduSlave extends PduSlave {

  public static readCoils(startingAddress: number, quantityOfCoils: number): boolean[] {
    return this.readBits(startingAddress, quantityOfCoils);
  }

  public static readDiscreteInputs(startingAddress: number, quantityOfInputs: number): boolean[] {
    return this.readBits(startingAddress, quantityOfInputs);
  }

  public static readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): number[] {
    return this.readRegisters(startingAddress, quantityOfRegisters);
  }

  public static readInputRegisters(startingAddress: number, quantityOfRegisters: number): number[] {
    return this.readRegisters(startingAddress, quantityOfRegisters);
  }

  public static writeSingleCoil(outputAddress: number, outputValue: boolean): boolean {
    return outputValue;
  }

  public static writeSingleRegister(registerAddress: number, registerValue: number): number {
    return registerValue;
  }

  public static writeMultipleCoils(startingAddress: number, outputValues: boolean[]): number {
    return outputValues.length;
  }

  public static writeMultipleRegisters(startingAddress: number, registerValues: number[]): number {
    return registerValues.length;
  }

  public static readBits(startingAddress: number, quantityOfBits: number): boolean[] {
    const values: boolean[] = [];
    for (let i = 0; i < quantityOfBits; i++) {
      values.push((i % 2) === 0);
    }
    return values;
  }

  public static readRegisters(startingAddress: number, quantityOfRegisters: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < quantityOfRegisters; i++) {
      values.push(0xAFAF);
    }
    return values;
  }

  public constructor() {
    super({
      readCoils: MockPduSlave.readCoils.bind(MockPduSlave),
      readDiscreteInputs: MockPduSlave.readDiscreteInputs.bind(MockPduSlave),
      readHoldingRegisters: MockPduSlave.readHoldingRegisters.bind(MockPduSlave),
      readInputRegisters: MockPduSlave.readInputRegisters.bind(MockPduSlave),
      writeSingleCoil: MockPduSlave.writeSingleCoil.bind(MockPduSlave),
      writeSingleRegister: MockPduSlave.writeSingleRegister.bind(MockPduSlave),
      writeMultipleCoils: MockPduSlave.writeMultipleCoils.bind(MockPduSlave),
      writeMultipleRegisters: MockPduSlave.writeMultipleRegisters.bind(MockPduSlave),
    });
  }

}
