import { Buffer } from "./node";
import {
  bitsToBytes,
  bytesToBits,
  ModbusFunctionCode,
  ModbusExceptionCode,
  IModbusReadBits,
  IModbusReadRegisters,
  IModbusWriteBit,
  IModbusWriteRegister,
  IModbusWriteMultiple,
  ModbusPduResponse,
  ModbusPduException,
} from "./pdu";

/**
 * Modbus PDU request or exception.
 */
export type ModbusPduServerResponse = ModbusPduResponse | ModbusPduException;

/**
 * Modbus PDU server.
 * Abstract handler for supported function code requests.
 */
export abstract class ModbusPduServer {

  /**
   * Parse request buffer into PDU response or exception.
   * @param buffer Request buffer.
   */
  public parseRequest(buffer: Buffer): ModbusPduServerResponse {
    const functionCode = buffer.readUInt8(0);
    const request = buffer.slice(1);

    switch (functionCode) {
      case ModbusFunctionCode.ReadCoils: {
        return this._requestReadBits(functionCode, request, this.readCoils.bind(this));
      }
      case ModbusFunctionCode.ReadDiscreteInputs: {
        return this._requestReadBits(functionCode, request, this.readDiscreteInputs.bind(this));
      }
      case ModbusFunctionCode.ReadHoldingRegisters: {
        return this._requestReadRegisters(functionCode, request, this.readHoldingRegisters.bind(this));
      }
      case ModbusFunctionCode.ReadInputRegisters: {
        return this._requestReadRegisters(functionCode, request, this.readInputRegisters.bind(this));
      }
      case ModbusFunctionCode.WriteSingleCoil: {
        return this._requestWriteSingleBit(functionCode, request);
      }
      case ModbusFunctionCode.WriteSingleRegister: {
        return this._requestWriteSingleRegister(functionCode, request);
      }
      case ModbusFunctionCode.WriteMultipleCoils: {
        return this._requestWriteMultipleBits(functionCode, request);
      }
      case ModbusFunctionCode.WriteMultipleRegisters: {
        return this._requestWriteMultipleRegisters(functionCode, request);
      }
      default: {
        // Unsupported function code, return exception.
        const exceptionFunctionCode = (functionCode + 0x80) % 0xFF;
        const exceptionCode = ModbusExceptionCode.IllegalFunctionCode;
        return new ModbusPduException(functionCode, exceptionFunctionCode, exceptionCode, buffer);
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

  private _requestReadBits(functionCode: number, request: Buffer, getValues: any): ModbusPduServerResponse {
    const startingAddress = request.readUInt16BE(0);
    const quantityOfBits = request.readUInt16BE(2);
    const values: boolean[] = getValues(startingAddress, quantityOfBits);
    const [bytes, byteValues] = bitsToBytes(values);

    const buffer = Buffer.alloc(2 + bytes, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt8(bytes, 1);
    byteValues.map((value, index) => {
      buffer.writeUInt8(value, 2 + index);
    });

    const data: IModbusReadBits = { bytes, values };
    return new ModbusPduResponse(functionCode, data, buffer);
  }

  private _requestReadRegisters(functionCode: number, request: Buffer, getValues: any): ModbusPduServerResponse {
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

    const data: IModbusReadRegisters = { bytes, values };
    return new ModbusPduResponse(functionCode, data, buffer);
  }

  private _requestWriteSingleBit(functionCode: number, request: Buffer): ModbusPduServerResponse {
    const address = request.readUInt16BE(0);
    const outputValue = request.readUInt16BE(2) === 0xFF00;
    const value = this.writeSingleCoil(address, outputValue);

    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value ? 0xFF00 : 0x0, 3);

    const data: IModbusWriteBit = { address, value };
    return new ModbusPduResponse(functionCode, data, buffer);
  }

  private _requestWriteSingleRegister(functionCode: number, request: Buffer): ModbusPduServerResponse {
    const address = request.readUInt16BE(0);
    const outputValue = request.readUInt16BE(2);
    const value = this.writeSingleRegister(address, outputValue);

    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value, 3);

    const data: IModbusWriteRegister = { address, value };
    return new ModbusPduResponse(functionCode, data, buffer);
  }

  private _requestWriteMultipleBits(functionCode: number, request: Buffer): ModbusPduServerResponse {
    const address = request.readUInt16BE(0);
    const quantityOfBits = request.readUInt16BE(2);
    const bitValues = bytesToBits(quantityOfBits, request.slice(5));
    const quantity = this.writeMultipleCoils(address, bitValues);

    const buffer = Buffer.alloc(5, 0);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(quantity, 3);

    const data: IModbusWriteMultiple = { address, quantity };
    return new ModbusPduResponse(functionCode, data, buffer);
  }

  private _requestWriteMultipleRegisters(functionCode: number, request: Buffer): ModbusPduServerResponse {
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

    const data: IModbusWriteMultiple = { address, quantity };
    return new ModbusPduResponse(functionCode, data, buffer);
  }

}
