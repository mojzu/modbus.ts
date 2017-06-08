import { Buffer } from "./node";
import * as pdu from "./pdu";

/**
 * Modbus PDU request or exception.
 */
export type PduServerResponse = pdu.PduResponse | pdu.PduException;

/**
 * Modbus PDU server.
 * Abstract handler for supported function code requests.
 */
export abstract class PduServer {

  /**
   * Parse request buffer into PDU response or exception.
   * @param buffer Request buffer.
   */
  public parseRequest(buffer: Buffer): PduServerResponse {
    const functionCode = buffer.readUInt8(0);
    const request = buffer.slice(1);

    switch (functionCode) {
      case pdu.FunctionCode.ReadCoils: {
        return this.requestReadBits(functionCode, request, this.readCoils.bind(this));
      }
      case pdu.FunctionCode.ReadDiscreteInputs: {
        return this.requestReadBits(functionCode, request, this.readDiscreteInputs.bind(this));
      }
      case pdu.FunctionCode.ReadHoldingRegisters: {
        return this.requestReadRegisters(functionCode, request, this.readHoldingRegisters.bind(this));
      }
      case pdu.FunctionCode.ReadInputRegisters: {
        return this.requestReadRegisters(functionCode, request, this.readInputRegisters.bind(this));
      }
      case pdu.FunctionCode.WriteSingleCoil: {
        return this.requestWriteSingleBit(functionCode, request);
      }
      case pdu.FunctionCode.WriteSingleRegister: {
        return this.requestWriteSingleRegister(functionCode, request);
      }
      case pdu.FunctionCode.WriteMultipleCoils: {
        return this.requestWriteMultipleBits(functionCode, request);
      }
      case pdu.FunctionCode.WriteMultipleRegisters: {
        return this.requestWriteMultipleRegisters(functionCode, request);
      }
      default: {
        // Unsupported function code, return exception.
        const exceptionFunctionCode = (functionCode + 0x80) % 0xFF;
        const exceptionCode = pdu.ExceptionCode.IllegalFunctionCode;
        return new pdu.PduException(functionCode, exceptionFunctionCode, exceptionCode, buffer);
      }
    }
  }

  public abstract readCoils(startingAddress: number, quantityOfCoils: number): boolean[];

  public abstract readDiscreteInputs(startingAddress: number, quantityOfInputs: number): boolean[];

  public abstract readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): number[];

  public abstract readInputRegisters(startingAddress: number, quantityOfRegisters: number): number[];

  public abstract writeSingleCoil(outputAddress: number, outputValue: boolean): boolean;

  public abstract writeSingleRegister(registerAddress: number, registerValue: number): number;

  public abstract writeMultipleCoils(startingAddress: number, outputValues: boolean[]): number;

  public abstract writeMultipleRegisters(startingAddress: number, registerValues: number[]): number;

  // TODO: Buffer value/data validation.

  protected requestReadBits(functionCode: number, request: Buffer, getValues: any): PduServerResponse {
    const startingAddress = request.readUInt16BE(0);
    const quantityOfBits = request.readUInt16BE(2);
    const values: boolean[] = getValues(startingAddress, quantityOfBits);
    const [bytes, byteValues] = pdu.bitsToBytes(values);

    const buffer = Buffer.alloc(2 + bytes, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt8(bytes, 1);
    byteValues.map((value, index) => {
      buffer.writeUInt8(value, 2 + index);
    });

    const data: pdu.IReadBits = { bytes, values };
    return new pdu.PduResponse(functionCode, data, buffer);
  }

  protected requestReadRegisters(functionCode: number, request: Buffer, getValues: any): PduServerResponse {
    const startingAddress = request.readUInt16BE(0);
    const quantityOfRegisters = request.readUInt16BE(2);
    const values: number[] = getValues(startingAddress, quantityOfRegisters);
    const bytes = values.length * 2;

    const buffer = Buffer.alloc(2 + bytes, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt8(bytes, 1);
    values.map((value, index) => {
      buffer.writeUInt16BE(value, 2 + (index * 2));
    });

    const data: pdu.IReadRegisters = { bytes, values };
    return new pdu.PduResponse(functionCode, data, buffer);
  }

  protected requestWriteSingleBit(functionCode: number, request: Buffer): PduServerResponse {
    const address = request.readUInt16BE(0);
    const outputValue = request.readUInt16BE(2) === 0xFF00;
    const value = this.writeSingleCoil(address, outputValue);

    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value ? 0xFF00 : 0x0, 3);

    const data: pdu.IWriteBit = { address, value };
    return new pdu.PduResponse(functionCode, data, buffer);
  }

  protected requestWriteSingleRegister(functionCode: number, request: Buffer): PduServerResponse {
    const address = request.readUInt16BE(0);
    const outputValue = request.readUInt16BE(2);
    const value = this.writeSingleRegister(address, outputValue);

    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value, 3);

    const data: pdu.IWriteRegister = { address, value };
    return new pdu.PduResponse(functionCode, data, buffer);
  }

  protected requestWriteMultipleBits(functionCode: number, request: Buffer): PduServerResponse {
    const address = request.readUInt16BE(0);
    const quantityOfBits = request.readUInt16BE(2);
    const bitValues = pdu.bytesToBits(quantityOfBits, request.slice(5));
    const quantity = this.writeMultipleCoils(address, bitValues);

    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(quantity, 3);

    const data: pdu.IWriteMultiple = { address, quantity };
    return new pdu.PduResponse(functionCode, data, buffer);
  }

  protected requestWriteMultipleRegisters(functionCode: number, request: Buffer): PduServerResponse {
    const address = request.readUInt16BE(0);
    const quantityOfRegisters = request.readUInt16BE(2);
    const registerValues: number[] = [];
    for (let i = 0; i < quantityOfRegisters; i++) {
      registerValues.push(request.readUInt16BE(5 + (i * 2)));
    }
    const quantity = this.writeMultipleRegisters(address, registerValues);

    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(quantity, 3);

    const data: pdu.IWriteMultiple = { address, quantity };
    return new pdu.PduResponse(functionCode, data, buffer);
  }

}
