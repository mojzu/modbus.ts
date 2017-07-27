/// <reference types="node" />
/* tslint:disable:no-bitwise */
import * as pdu from "./pdu";

/**
 * Modbus PDU client.
 * Request factory for supported function codes.
 * TODO: Implement more Modbus function codes.
 */
export class PduClient {

  /**
   * Create a new PDU exception.
   * @param functionCode Function code.
   * @param exceptionCode Exception code.
   */
  public static createException(functionCode: pdu.FunctionCode, exceptionCode: pdu.ExceptionCode): pdu.PduException {
    const exceptionFunctionCode = (functionCode + 0x80) % 0xFF;
    const buffer = Buffer.allocUnsafe(2);
    buffer.writeUInt8(exceptionFunctionCode, 0);
    buffer.writeUInt8(exceptionCode, 1);

    return new pdu.PduException(
      functionCode,
      functionCode + 0x80,
      exceptionCode,
      buffer,
    );
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of coils in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfCoils Quantity of coils.
   */
  public static readCoils(startingAddress: number, quantityOfCoils: number): pdu.PduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfBits(quantityOfCoils);
    pdu.validAddress(startingAddress + quantityOfCoils);

    const functionCode = pdu.FunctionCode.ReadCoils;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfCoils, 3);

    return new pdu.PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of discrete inputs in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfInputs Quantity of inputs.
   */
  public static readDiscreteInputs(startingAddress: number, quantityOfInputs: number): pdu.PduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfBits(quantityOfInputs);
    pdu.validAddress(startingAddress + quantityOfInputs);

    const functionCode = pdu.FunctionCode.ReadDiscreteInputs;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfInputs, 3);

    return new pdu.PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read  the contents of a contiguous block
   * of holding registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public static readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): pdu.PduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfRegisters(quantityOfRegisters);
    pdu.validAddress(startingAddress + quantityOfRegisters);

    const functionCode = pdu.FunctionCode.ReadHoldingRegisters;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return new pdu.PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read from 1 to 125 contiguous input
   * registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public static readInputRegisters(startingAddress: number, quantityOfRegisters: number): pdu.PduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfRegisters(quantityOfRegisters);
    pdu.validAddress(startingAddress + quantityOfRegisters);

    const functionCode = pdu.FunctionCode.ReadInputRegisters;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return new pdu.PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a single output to either ON
   * or OFF in a remote device.
   * @param outputAddress Output address.
   * @param outputValue  Output value.
   */
  public static writeSingleCoil(outputAddress: number, outputValue: boolean): pdu.PduRequest {
    pdu.validAddress(outputAddress);

    const functionCode = pdu.FunctionCode.WriteSingleCoil;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(outputAddress, 1);
    buffer.writeUInt16BE((!!outputValue ? 0xFF00 : 0x0000), 3);

    return new pdu.PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a single holding register
   * in a remote device.
   * @param registerAddress Register address.
   * @param registerValue Register value.
   */
  public static writeSingleRegister(registerAddress: number, registerValue: number): pdu.PduRequest {
    pdu.validAddress(registerAddress);
    pdu.validRegister(registerValue);

    const functionCode = pdu.FunctionCode.WriteSingleRegister;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(registerAddress, 1);
    buffer.writeUInt16BE(registerValue, 3);

    return new pdu.PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to force each coil in a sequence of coils to
   * either ON or OFF in a remote device.
   * @param startingAddress Starting address.
   * @param outputValues Output values.
   */
  public static writeMultipleCoils(startingAddress: number, outputValues: boolean[]): pdu.PduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfBits(outputValues.length, 0x7B0);
    pdu.validAddress(startingAddress + outputValues.length);

    const functionCode = pdu.FunctionCode.WriteMultipleCoils;
    const [byteCount, byteValues] = pdu.bitsToBytes(outputValues);
    const buffer = Buffer.allocUnsafe(6 + byteCount);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(outputValues.length, 3);
    buffer.writeUInt8(byteCount, 5);
    byteValues.map((value, index) => {
      buffer.writeUInt8(value, 6 + index);
    });

    return new pdu.PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a block of contiguous registers
   * (1 to 123 registers) in a remote device.
   * @param startingAddress Starting address.
   * @param registerValues Register values.
   */
  public static writeMultipleRegisters(startingAddress: number, registerValues: number[]): pdu.PduRequest {
    pdu.validAddress(startingAddress);
    pdu.validQuantityOfRegisters(registerValues.length, 0x7B);
    pdu.validAddress(startingAddress + registerValues.length);
    registerValues.map((value) => {
      pdu.validRegister(value);
    });

    const functionCode = pdu.FunctionCode.WriteMultipleRegisters;
    const byteCount = registerValues.length * 2;
    const buffer = Buffer.allocUnsafe(6 + byteCount);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(registerValues.length, 3);
    buffer.writeUInt8(byteCount, 5);
    registerValues.map((value, index) => {
      buffer.writeUInt16BE(value, 6 + (index * 2));
    });

    return new pdu.PduRequest(functionCode, buffer);
  }

  /**
   * Parse response buffer into PDU response or exception.
   * @param buffer Response buffer.
   */
  public static responseHandler(buffer: Buffer): pdu.PduResponse | pdu.PduException {
    const functionCode = buffer.readUInt8(0);
    const response = buffer.slice(1);

    if (functionCode >= 0x80) {
      // Buffer contains an exception response.
      const exceptionCode = buffer.readUInt8(1);
      return PduClient.createException((functionCode - 0x80), exceptionCode);
    }

    switch (functionCode) {
      case pdu.FunctionCode.ReadCoils:
      case pdu.FunctionCode.ReadDiscreteInputs: {
        const data = PduClient.readBitsResponseHandler(response);
        return new pdu.PduResponse(functionCode, data, buffer);
      }
      case pdu.FunctionCode.ReadHoldingRegisters:
      case pdu.FunctionCode.ReadInputRegisters: {
        const data = PduClient.readRegistersResponseHandler(response);
        return new pdu.PduResponse(functionCode, data, buffer);
      }
      case pdu.FunctionCode.WriteSingleCoil: {
        const data = PduClient.writeBitResponseHandler(response);
        return new pdu.PduResponse(functionCode, data, buffer);
      }
      case pdu.FunctionCode.WriteSingleRegister: {
        const data = PduClient.writeRegisterResponseHandler(response);
        return new pdu.PduResponse(functionCode, data, buffer);
      }
      case pdu.FunctionCode.WriteMultipleCoils:
      case pdu.FunctionCode.WriteMultipleRegisters: {
        const data = PduClient.writeMultipleResponseHandler(response);
        return new pdu.PduResponse(functionCode, data, buffer);
      }
      default: {
        // Unsupported function code, convert to exception.
        return PduClient.createException(functionCode, pdu.ExceptionCode.IllegalFunctionCode);
      }
    }
  }

  public static readBitsResponseHandler(buffer: Buffer): pdu.IReadBits {
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

  public static readRegistersResponseHandler(buffer: Buffer): pdu.IReadRegisters {
    const bytes = buffer.readUInt8(0);
    const values: number[] = [];
    for (let i = 0; i < (bytes / 2); i++) {
      values[i] = buffer.readUInt16BE(1 + (i * 2));
    }
    return { bytes, values };
  }

  public static writeBitResponseHandler(buffer: Buffer): pdu.IWriteBit {
    const address = buffer.readUInt16BE(0);
    const value = (buffer.readUInt16BE(2) === 0xFF00) ? true : false;
    return { address, value };
  }

  public static writeRegisterResponseHandler(buffer: Buffer): pdu.IWriteRegister {
    const address = buffer.readUInt16BE(0);
    const value = buffer.readUInt16BE(2);
    return { address, value };
  }

  public static writeMultipleResponseHandler(buffer: Buffer): pdu.IWriteMultiple {
    const address = buffer.readUInt16BE(0);
    const quantity = buffer.readUInt16BE(2);
    return { address, quantity };
  }

}
