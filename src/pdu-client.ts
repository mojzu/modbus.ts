/* tslint:disable:no-bitwise */
import { Buffer } from "./node";
import {
  validAddress,
  validRegister,
  validQuantityOfBits,
  validQuantityOfRegisters,
  bitsToBytes,
  ModbusFunctionCode,
  ModbusExceptionCode,
  IModbusReadBits,
  IModbusReadRegisters,
  IModbusWriteBit,
  IModbusWriteRegister,
  IModbusWriteMultiple,
  ModbusPduRequest,
  ModbusPduResponse,
  ModbusPduException,
} from "./pdu";

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
  public readCoils(startingAddress: number, quantityOfCoils: number): ModbusPduRequest {
    validAddress(startingAddress);
    validQuantityOfBits(quantityOfCoils);
    validAddress(startingAddress + quantityOfCoils);

    const functionCode = ModbusFunctionCode.ReadCoils;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfCoils, 3);

    return new ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of discrete inputs in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfInputs Quantity of inputs.
   */
  public readDiscreteInputs(startingAddress: number, quantityOfInputs: number): ModbusPduRequest {
    validAddress(startingAddress);
    validQuantityOfBits(quantityOfInputs);
    validAddress(startingAddress + quantityOfInputs);

    const functionCode = ModbusFunctionCode.ReadDiscreteInputs;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfInputs, 3);

    return new ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read  the contents of a contiguous block
   * of holding registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): ModbusPduRequest {
    validAddress(startingAddress);
    validQuantityOfRegisters(quantityOfRegisters);
    validAddress(startingAddress + quantityOfRegisters);

    const functionCode = ModbusFunctionCode.ReadHoldingRegisters;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return new ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read from 1 to 125 contiguous input
   * registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public readInputRegisters(startingAddress: number, quantityOfRegisters: number): ModbusPduRequest {
    validAddress(startingAddress);
    validQuantityOfRegisters(quantityOfRegisters);
    validAddress(startingAddress + quantityOfRegisters);

    const functionCode = ModbusFunctionCode.ReadInputRegisters;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return new ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a single output to either ON
   * or OFF in a remote device.
   * @param outputAddress Output address.
   * @param outputValue  Output value.
   */
  public writeSingleCoil(outputAddress: number, outputValue: boolean): ModbusPduRequest {
    validAddress(outputAddress);

    const functionCode = ModbusFunctionCode.WriteSingleCoil;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(outputAddress, 1);
    buffer.writeUInt16BE((!!outputValue ? 0xFF00 : 0x0000), 3);

    return new ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a single holding register
   * in a remote device.
   * @param registerAddress Register address.
   * @param registerValue Register value.
   */
  public writeSingleRegister(registerAddress: number, registerValue: number): ModbusPduRequest {
    validAddress(registerAddress);
    validRegister(registerValue);

    const functionCode = ModbusFunctionCode.WriteSingleRegister;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(registerAddress, 1);
    buffer.writeUInt16BE(registerValue, 3);

    return new ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to force each coil in a sequence of coils to
   * either ON or OFF in a remote device.
   * @param startingAddress Starting address.
   * @param outputValues Output values.
   */
  public writeMultipleCoils(startingAddress: number, outputValues: boolean[]): ModbusPduRequest {
    validAddress(startingAddress);
    validQuantityOfBits(outputValues.length, 0x7B0);
    validAddress(startingAddress + outputValues.length);

    const functionCode = ModbusFunctionCode.WriteMultipleCoils;
    const [byteCount, byteValues] = bitsToBytes(outputValues);
    const buffer = Buffer.alloc(6 + byteCount, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(outputValues.length, 3);
    buffer.writeUInt8(byteCount, 5);
    byteValues.map((value, index) => {
      buffer.writeUInt8(value, 6 + index);
    });

    return new ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a block of contiguous registers
   * (1 to 123 registers) in a remote device.
   * @param startingAddress Starting address.
   * @param registerValues Register values.
   */
  public writeMultipleRegisters(startingAddress: number, registerValues: number[]): ModbusPduRequest {
    validAddress(startingAddress);
    validQuantityOfRegisters(registerValues.length, 0x7B);
    validAddress(startingAddress + registerValues.length);
    registerValues.map((value) => {
      validRegister(value);
    });

    const functionCode = ModbusFunctionCode.WriteMultipleRegisters;
    const byteCount = registerValues.length * 2;
    const buffer = Buffer.alloc(6 + byteCount, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(registerValues.length, 3);
    buffer.writeUInt8(byteCount, 5);
    registerValues.map((value, index) => {
      buffer.writeUInt16BE(value, 6 + (index * 2));
    });

    return new ModbusPduRequest(functionCode, buffer);
  }

  /**
   * Parse response buffer into PDU response or exception.
   * @param buffer Response buffer.
   */
  public parseResponse(buffer: Buffer): ModbusPduResponse | ModbusPduException {
    const functionCode = buffer.readUInt8(0);
    const response = buffer.slice(1);

    if (functionCode >= 0x80) {
      // Buffer contains an exception response.
      const exceptionCode = buffer.readUInt8(1);
      return new ModbusPduException((functionCode - 0x80), functionCode, exceptionCode, buffer);
    }

    switch (functionCode) {
      case ModbusFunctionCode.ReadCoils:
      case ModbusFunctionCode.ReadDiscreteInputs: {
        const data = this._parseReadBits(response);
        return new ModbusPduResponse(functionCode, data, buffer);
      }
      case ModbusFunctionCode.ReadHoldingRegisters:
      case ModbusFunctionCode.ReadInputRegisters: {
        const data = this._parseReadRegisters(response);
        return new ModbusPduResponse(functionCode, data, buffer);
      }
      case ModbusFunctionCode.WriteSingleCoil: {
        const data = this._parseWriteBit(response);
        return new ModbusPduResponse(functionCode, data, buffer);
      }
      case ModbusFunctionCode.WriteSingleRegister: {
        const data = this._parseWriteRegister(response);
        return new ModbusPduResponse(functionCode, data, buffer);
      }
      case ModbusFunctionCode.WriteMultipleCoils:
      case ModbusFunctionCode.WriteMultipleRegisters: {
        const data = this._parseWriteMultiple(response);
        return new ModbusPduResponse(functionCode, data, buffer);
      }
      default: {
        // Unsupported function code, convert to exception.
        const exceptionFunctionCode = (functionCode + 0x80) % 0xFF;
        const exceptionCode = ModbusExceptionCode.IllegalFunctionCode;
        return new ModbusPduException(functionCode, exceptionFunctionCode, exceptionCode, buffer);
      }
    }
  }

  private _parseReadBits(buffer: Buffer): IModbusReadBits {
    const bytes = buffer.readUInt8(0);
    const values: boolean[] = [];

    for (let i = 0; i < bytes; i++) {
      const byte = buffer.readUInt8(1 + i);

      for (let j = 0; j < 8; j++) {
        values.push(!!(byte & (0x1 << j)));
      }
    }

    return { bytes, values };
  }

  private _parseReadRegisters(buffer: Buffer): IModbusReadRegisters {
    const bytes = buffer.readUInt8(0);
    const values: number[] = [];

    for (let i = 0; i < (bytes / 2); i++) {
      values[i] = buffer.readUInt16BE(1 + (i * 2));
    }

    return { bytes, values };
  }

  private _parseWriteBit(buffer: Buffer): IModbusWriteBit {
    const address = buffer.readUInt16BE(0);
    const value = (buffer.readUInt16BE(2) === 0xFF00) ? true : false;

    return { address, value };
  }

  private _parseWriteRegister(buffer: Buffer): IModbusWriteRegister {
    const address = buffer.readUInt16BE(0);
    const value = buffer.readUInt16BE(2);

    return { address, value };
  }

  private _parseWriteMultiple(buffer: Buffer): IModbusWriteMultiple {
    const address = buffer.readUInt16BE(0);
    const quantity = buffer.readUInt16BE(2);

    return { address, quantity };
  }

}
