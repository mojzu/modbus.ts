/* tslint:disable:no-bitwise */
/// <reference types="node" />
import * as pdu from "./pdu";

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
  public readCoils(startingAddress: number, quantityOfCoils: number): pdu.ModbusPduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfBits(quantityOfCoils);
    pdu.validAddress(startingAddress + quantityOfCoils);

    const functionCode = pdu.ModbusFunctionCode.ReadCoils;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfCoils, 3);

    return new pdu.ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of discrete inputs in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfInputs Quantity of inputs.
   */
  public readDiscreteInputs(startingAddress: number, quantityOfInputs: number): pdu.ModbusPduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfBits(quantityOfInputs);
    pdu.validAddress(startingAddress + quantityOfInputs);

    const functionCode = pdu.ModbusFunctionCode.ReadDiscreteInputs;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfInputs, 3);

    return new pdu.ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read  the contents of a contiguous block
   * of holding registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): pdu.ModbusPduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfRegisters(quantityOfRegisters);
    pdu.validAddress(startingAddress + quantityOfRegisters);

    const functionCode = pdu.ModbusFunctionCode.ReadHoldingRegisters;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return new pdu.ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read from 1 to 125 contiguous input
   * registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public readInputRegisters(startingAddress: number, quantityOfRegisters: number): pdu.ModbusPduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfRegisters(quantityOfRegisters);
    pdu.validAddress(startingAddress + quantityOfRegisters);

    const functionCode = pdu.ModbusFunctionCode.ReadInputRegisters;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return new pdu.ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a single output to either ON
   * or OFF in a remote device.
   * @param outputAddress Output address.
   * @param outputValue  Output value.
   */
  public writeSingleCoil(outputAddress: number, outputValue: boolean): pdu.ModbusPduRequest {
    pdu.validAddress(outputAddress);

    const functionCode = pdu.ModbusFunctionCode.WriteSingleCoil;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(outputAddress, 1);
    buffer.writeUInt16BE((!!outputValue ? 0xFF00 : 0x0000), 3);

    return new pdu.ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a single holding register
   * in a remote device.
   * @param registerAddress Register address.
   * @param registerValue Register value.
   */
  public writeSingleRegister(registerAddress: number, registerValue: number): pdu.ModbusPduRequest {
    pdu.validAddress(registerAddress);
    pdu.validRegister(registerValue);

    const functionCode = pdu.ModbusFunctionCode.WriteSingleRegister;
    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(registerAddress, 1);
    buffer.writeUInt16BE(registerValue, 3);

    return new pdu.ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to force each coil in a sequence of coils to
   * either ON or OFF in a remote device.
   * @param startingAddress Starting address.
   * @param outputValues Output values.
   */
  public writeMultipleCoils(startingAddress: number, outputValues: boolean[]): pdu.ModbusPduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfBits(outputValues.length, 0x7B0);
    pdu.validAddress(startingAddress + outputValues.length);

    let byteCount = Math.floor(outputValues.length / 8);
    if ((outputValues.length % 8) !== 0) {
      byteCount += 1;
    }

    // Convert array of booleans to byte flag array.
    const byteValues: number[] = [];
    outputValues.map((value, index) => {
      const byteIndex = Math.floor(index / 8);
      const bitIndex = Math.floor(index % 8);

      let byteValue = byteValues[byteIndex] || 0;
      if (!!value) {
        byteValue |= (0x1 << bitIndex);
      } else {
        byteValue &= ~(0x1 << bitIndex);
      }
      byteValues[byteIndex] = byteValue;
    });

    const functionCode = pdu.ModbusFunctionCode.WriteMultipleCoils;
    const buffer = Buffer.alloc(6 + byteCount, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(outputValues.length, 3);
    buffer.writeUInt8(byteCount, 5);
    byteValues.map((value, index) => {
      buffer.writeUInt8(value, 6 + index);
    });

    return new pdu.ModbusPduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a block of contiguous registers
   * (1 to 123 registers) in a remote device.
   * @param startingAddress Starting address.
   * @param registerValues Register values.
   */
  public writeMultipleRegisters(startingAddress: number, registerValues: number[]): pdu.ModbusPduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfRegisters(registerValues.length, 0x7B);
    pdu.validAddress(startingAddress + registerValues.length);
    registerValues.map((value) => {
      pdu.validRegister(value);
    });

    const byteCount = registerValues.length * 2;
    const functionCode = pdu.ModbusFunctionCode.WriteMultipleRegisters;
    const buffer = Buffer.alloc(6 + byteCount, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(registerValues.length, 3);
    buffer.writeUInt8(byteCount, 5);
    registerValues.map((value, index) => {
      buffer.writeUInt16BE(value, 6 + (index * 2));
    });

    return new pdu.ModbusPduRequest(functionCode, buffer);
  }

  /**
   * Parse response buffer into PDU response or exception.
   * @param buffer Response buffer.
   */
  public parseResponse(buffer: Buffer): pdu.ModbusPduResponse | pdu.ModbusPduException {
    const functionCode = buffer.readUInt8(0);

    if (functionCode >= 0x80) {
      // Buffer contains an exception response.
      const exceptionCode = buffer.readUInt8(1);
      return new pdu.ModbusPduException((functionCode - 0x80), functionCode, exceptionCode);
    }

    const response = buffer.slice(1);
    switch (functionCode) {
      case pdu.ModbusFunctionCode.ReadCoils:
      case pdu.ModbusFunctionCode.ReadDiscreteInputs: {
        const data = this._parseReadBits(response);
        return new pdu.ModbusPduResponse(functionCode, data);
      }
      case pdu.ModbusFunctionCode.ReadHoldingRegisters:
      case pdu.ModbusFunctionCode.ReadInputRegisters: {
        const data = this._parseReadRegisters(response);
        return new pdu.ModbusPduResponse(functionCode, data);
      }
      case pdu.ModbusFunctionCode.WriteSingleCoil: {
        const data = this._parseWriteBit(response);
        return new pdu.ModbusPduResponse(functionCode, data);
      }
      case pdu.ModbusFunctionCode.WriteSingleRegister: {
        const data = this._parseWriteRegister(response);
        return new pdu.ModbusPduResponse(functionCode, data);
      }
      case pdu.ModbusFunctionCode.WriteMultipleCoils:
      case pdu.ModbusFunctionCode.WriteMultipleRegisters: {
        const data = this._parseWriteMultiple(response);
        return new pdu.ModbusPduResponse(functionCode, data);
      }
      default: {
        // Unsupported function code, convert to exception.
        const exceptionFunctionCode = (functionCode + 0x80);
        const exceptionCode = pdu.ModbusExceptionCode.IllegalFunctionCode;
        return new pdu.ModbusPduException(functionCode, exceptionFunctionCode, exceptionCode);
      }
    }
  }

  private _parseReadBits(buffer: Buffer): pdu.IModbusReadBits {
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

  private _parseReadRegisters(buffer: Buffer): pdu.IModbusReadRegisters {
    const bytes = buffer.readUInt8(0);
    const values: number[] = [];

    for (let i = 0; i < (bytes / 2); i++) {
      values[i] = buffer.readUInt16BE(1 + (i * 2));
    }

    return { bytes, values };
  }

  private _parseWriteBit(buffer: Buffer): pdu.IModbusWriteBit {
    const address = buffer.readUInt16BE(0);
    const value = (buffer.readUInt16BE(2) === 0xFF00) ? true : false;

    return { address, value };
  }

  private _parseWriteRegister(buffer: Buffer): pdu.IModbusWriteRegister {
    const address = buffer.readUInt16BE(0);
    const value = buffer.readUInt16BE(2);

    return { address, value };
  }

  private _parseWriteMultiple(buffer: Buffer): pdu.IModbusWriteMultiple {
    const address = buffer.readUInt16BE(0);
    const quantity = buffer.readUInt16BE(2);

    return { address, quantity };
  }

}
