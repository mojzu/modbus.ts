import {
  bitsToBytes,
  bytesToBits,
} from "./utilities";
import {
  EModbusFunctionCode,
  EModbusExceptionCode,
  IModbusReadBits,
  IModbusReadRegisters,
  IModbusWriteBit,
  IModbusWriteRegister,
  IModbusWriteMultiple,
} from "./modbus";
import {
  PduResponse,
  PduException,
} from "./PduMaster";

/** Modbus PDU slave response or exception. */
export type IPduSlaveResponse = PduResponse | PduException;

/** Modbus PDU slave function code handlers. */
export interface IPduSlaveHandlers {
  readCoils?(startingAddress: number, quantityOfCoils: number): boolean[];
  readDiscreteInputs?(startingAddress: number, quantityOfInputs: number): boolean[];
  readHoldingRegisters?(startingAddress: number, quantityOfRegisters: number): number[];
  readInputRegisters?(startingAddress: number, quantityOfRegisters: number): number[];
  writeSingleCoil?(outputAddress: number, outputValue: boolean): boolean;
  writeSingleRegister?(registerAddress: number, registerValue: number): number;
  writeMultipleCoils?(startingAddress: number, outputValues: boolean[]): number;
  writeMultipleRegisters?(startingAddress: number, registerValues: number[]): number;
}

/**
 * Modbus PDU slave.
 * Accepts handlers for function codes.
 */
export class PduSlave {

  public constructor(private _handlers: IPduSlaveHandlers) { }

  /**
   * Parse request buffer into PDU response or exception.
   * @param buffer Request buffer.
   */
  public requestHandler(buffer: Buffer): IPduSlaveResponse {
    const functionCode = buffer.readUInt8(0);
    const request = buffer.slice(1);

    try {
      switch (functionCode) {
        case EModbusFunctionCode.ReadCoils: {
          const handler = this.getRequestHandler(this._handlers.readCoils);
          return this.readBits(functionCode, request, handler);
        }
        case EModbusFunctionCode.ReadDiscreteInputs: {
          const handler = this.getRequestHandler(this._handlers.readDiscreteInputs);
          return this.readBits(functionCode, request, handler);
        }
        case EModbusFunctionCode.ReadHoldingRegisters: {
          const handler = this.getRequestHandler(this._handlers.readHoldingRegisters);
          return this.readRegisters(functionCode, request, handler);
        }
        case EModbusFunctionCode.ReadInputRegisters: {
          const handler = this.getRequestHandler(this._handlers.readInputRegisters);
          return this.readRegisters(functionCode, request, handler);
        }
        case EModbusFunctionCode.WriteSingleCoil: {
          const handler = this.getRequestHandler(this._handlers.writeSingleCoil);
          return this.writeSingleBit(functionCode, request, handler);
        }
        case EModbusFunctionCode.WriteSingleRegister: {
          const handler = this.getRequestHandler(this._handlers.writeSingleRegister);
          return this.writeSingleRegister(functionCode, request, handler);
        }
        case EModbusFunctionCode.WriteMultipleCoils: {
          const handler = this.getRequestHandler(this._handlers.writeMultipleCoils);
          return this.writeMultipleBits(functionCode, request, handler);
        }
        case EModbusFunctionCode.WriteMultipleRegisters: {
          const handler = this.getRequestHandler(this._handlers.writeMultipleRegisters);
          return this.writeMultipleRegisters(functionCode, request, handler);
        }
      }
    } catch (error) { }

    // Unsupported function code, return exception.
    const exceptionFunctionCode = (functionCode + 0x80) % 0xFF;
    const exceptionCode = EModbusExceptionCode.IllegalFunctionCode;
    return new PduException(functionCode, exceptionFunctionCode, exceptionCode, buffer);
  }

  // TODO: Buffer value/data validation.

  protected getRequestHandler(handler?: any): any {
    if (handler == null) {
      throw new Error("Function code handler undefined");
    }
    return handler;
  }

  protected readBits(functionCode: number, request: Buffer, handler: any): IPduSlaveResponse {
    const startingAddress = request.readUInt16BE(0);
    const quantityOfBits = request.readUInt16BE(2);
    const values: boolean[] = handler(startingAddress, quantityOfBits);
    const [bytes, byteValues] = bitsToBytes(values);

    const buffer = Buffer.allocUnsafe(2 + bytes);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt8(bytes, 1);
    byteValues.map((value, index) => {
      buffer.writeUInt8(value, 2 + index);
    });

    const data: IModbusReadBits = { bytes, values };
    return new PduResponse(functionCode, data, buffer);
  }

  protected readRegisters(functionCode: number, request: Buffer, handler: any): IPduSlaveResponse {
    const startingAddress = request.readUInt16BE(0);
    const quantityOfRegisters = request.readUInt16BE(2);
    const values: number[] = handler(startingAddress, quantityOfRegisters);
    const bytes = values.length * 2;

    const buffer = Buffer.allocUnsafe(2 + bytes);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt8(bytes, 1);
    values.map((value, index) => {
      buffer.writeUInt16BE(value, 2 + (index * 2));
    });

    const data: IModbusReadRegisters = { bytes, values };
    return new PduResponse(functionCode, data, buffer);
  }

  protected writeSingleBit(functionCode: number, request: Buffer, handler: any): IPduSlaveResponse {
    const address = request.readUInt16BE(0);
    const outputValue = request.readUInt16BE(2) === 0xFF00;
    const value = handler(address, outputValue);

    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value ? 0xFF00 : 0x0, 3);

    const data: IModbusWriteBit = { address, value };
    return new PduResponse(functionCode, data, buffer);
  }

  protected writeSingleRegister(functionCode: number, request: Buffer, handler: any): IPduSlaveResponse {
    const address = request.readUInt16BE(0);
    const outputValue = request.readUInt16BE(2);
    const value = handler(address, outputValue);

    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value, 3);

    const data: IModbusWriteRegister = { address, value };
    return new PduResponse(functionCode, data, buffer);
  }

  protected writeMultipleBits(functionCode: number, request: Buffer, handler: any): IPduSlaveResponse {
    const address = request.readUInt16BE(0);
    const quantityOfBits = request.readUInt16BE(2);
    const bitValues = bytesToBits(quantityOfBits, request.slice(5));
    const quantity = handler(address, bitValues);

    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(quantity, 3);

    const data: IModbusWriteMultiple = { address, quantity };
    return new PduResponse(functionCode, data, buffer);
  }

  protected writeMultipleRegisters(functionCode: number, request: Buffer, handler: any): IPduSlaveResponse {
    const address = request.readUInt16BE(0);
    const quantityOfRegisters = request.readUInt16BE(2);
    const registerValues: number[] = [];
    for (let i = 0; i < quantityOfRegisters; i++) {
      registerValues.push(request.readUInt16BE(5 + (i * 2)));
    }
    const quantity = handler(address, registerValues);

    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(quantity, 3);

    const data: IModbusWriteMultiple = { address, quantity };
    return new PduResponse(functionCode, data, buffer);
  }

}
