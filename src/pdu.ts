/// <reference types="node" />
import * as assert from "assert";

// TODO: ModbusPduServer implementation.

function validAddress(value: number): void {
  assert((0x0 <= value) && (value <= 0xFFFF), `Invalid address: ${value}`);
}

function validRegister(value: number): void {
  assert((0x0 <= value) && (value <= 0xFFFF), `Invalid register value: ${value}`);
}

function validQuantityOfBits(value: number, maximum = 0x7D0): void {
  assert((0x1 <= value) && (value <= maximum), `Invalid quantity of bits: ${value}`);
}

function validQuantityOfRegisters(value: number, maximum = 0x7D): void {
  assert((0x1 <= value) && (value <= maximum), `Invalid quantity of registers: ${value}`);
}

/**
 * Modbus function codes.
 */
export const enum ModbusFunctionCode {
    ReadCoils = 0x1,
    ReadDiscreteInputs,
    ReadHoldingRegisters,
    ReadInputRegisters,
    WriteSingleCoil,
    WriteSingleRegister,
    WriteMultipleCoils = 0xF,
    WriteMultipleRegisters,
}

/**
 * Modbus exception codes.
 */
export const enum ModbusExceptionCode {
    IllegalFunctionCode = 0x1,
    IllegalDataAddress,
    IllegalDataValue,
    ServerFailure,
    Acknowledge,
    ServerBusy,
}

/**
 * Modbus PDU client.
 * Request factory for supported function codes.
 */
export class ModbusPduClient {

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of coils in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfCoils Quantity of coils.
   */
  public readCoils(startingAddress: number, quantityOfCoils: number): Buffer {
    validAddress(startingAddress);
    validQuantityOfBits(quantityOfCoils);
    validAddress(startingAddress + quantityOfCoils);

    const buffer = Buffer.alloc(5, 0);
    buffer[0] = ModbusFunctionCode.ReadCoils;
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfCoils, 3);

    return buffer;
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of discrete inputs in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfInputs Quantity of inputs.
   */
  public readDiscreteInputs(startingAddress: number, quantityOfInputs: number): Buffer {
    validAddress(startingAddress);
    validQuantityOfBits(quantityOfInputs);
    validAddress(startingAddress + quantityOfInputs);

    const buffer = Buffer.alloc(5, 0);
    buffer[0] = ModbusFunctionCode.ReadDiscreteInputs;
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfInputs, 3);

    return buffer;
  }

  /**
   * This function code is used to read  the contents of a contiguous block
   * of holding registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): Buffer {
    validAddress(startingAddress);
    validQuantityOfRegisters(quantityOfRegisters);
    validAddress(startingAddress + quantityOfRegisters);

    const buffer = Buffer.alloc(5, 0);
    buffer[0] = ModbusFunctionCode.ReadHoldingRegisters;
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return buffer;
  }

  /**
   * This function code is used to read from 1 to 125 contiguous input
   * registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public readInputRegisters(startingAddress: number, quantityOfRegisters: number): Buffer {
    validAddress(startingAddress);
    validQuantityOfRegisters(quantityOfRegisters);
    validAddress(startingAddress + quantityOfRegisters);

    const buffer = Buffer.alloc(5, 0);
    buffer[0] = ModbusFunctionCode.ReadInputRegisters;
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return buffer;
  }

  /**
   * This function code is used to write a single output to either ON
   * or OFF in a remote device.
   * @param outputAddress Output address.
   * @param outputValue  Output value.
   */
  public writeSingleCoil(outputAddress: number, outputValue: boolean): Buffer {
    validAddress(outputAddress);

    const buffer = Buffer.alloc(5, 0);
    buffer[0] = ModbusFunctionCode.WriteSingleCoil;
    buffer.writeUInt16BE(outputAddress, 1);
    buffer.writeUInt16BE((!!outputValue ? 0xFF00 : 0x0000), 3);

    return buffer;
  }

  /**
   * This function code is used to write a single holding register
   * in a remote device.
   * @param registerAddress Register address.
   * @param registerValue Register value.
   */
  public writeSingleRegister(registerAddress: number, registerValue: number): Buffer {
    validAddress(registerAddress);
    validRegister(registerValue);

    const buffer = Buffer.alloc(5, 0);
    buffer[0] = ModbusFunctionCode.WriteSingleRegister;
    buffer.writeUInt16BE(registerAddress, 1);
    buffer.writeUInt16BE(registerValue, 3);

    return buffer;
  }

  // TODO: Implement this.
  // /**
  //  * This function code is used to force each coil in a sequence of coils to
  //  * either ON or OFF in a remote device.
  //  * @param startingAddress Starting address.
  //  * @param outputValues Output values.
  //  */
  // public writeMultipleCoils(startingAddress: number, outputValues: boolean[]): Buffer { }

  /**
   * This function code is used to write a block of contiguous registers
   * (1 to 123 registers) in a remote device.
   * @param startingAddress Starting address.
   * @param registerValues Register values.
   */
  public writeMultipleRegisters(startingAddress: number, registerValues: number[]): Buffer {
    validAddress(startingAddress);
    validQuantityOfRegisters(registerValues.length, 0x7B);
    validAddress(startingAddress + registerValues.length);
    registerValues.map((value) => {
      validRegister(value);
    });

    const byteCount = registerValues.length * 2;
    const buffer = Buffer.alloc(6 + byteCount, 0);
    buffer[0] = ModbusFunctionCode.WriteMultipleRegisters;
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(registerValues.length, 3);
    buffer[5] = byteCount;
    registerValues.map((value, index) => {
      buffer.writeUInt16BE(value, 6 + (index * 2));
    });

    return buffer;
  }

  // TODO: Implement response/exception parsing.

}
