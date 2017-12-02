import { Master } from "./Master";
import * as pdu from "./Pdu";

/** Modbus PDU slave response or exception. */
export type ISlaveResponse = pdu.Response | pdu.Exception;

/** Modbus abstract PDU slave. */
export abstract class Slave {

  public abstract readCoils(startingAddress: number, quantityOfCoils: number): boolean[];
  public abstract readDiscreteInputs(startingAddress: number, quantityOfInputs: number): boolean[];
  public abstract readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): number[];
  public abstract readInputRegisters(startingAddress: number, quantityOfRegisters: number): number[];
  public abstract writeSingleCoil(outputAddress: number, outputValue: boolean): boolean;
  public abstract writeSingleRegister(registerAddress: number, registerValue: number): number;
  public abstract writeMultipleCoils(startingAddress: number, outputValues: boolean[]): number;
  public abstract writeMultipleRegisters(startingAddress: number, registerValues: number[]): number;

  /**
   * Parse request buffer into PDU response or exception.
   * @param buffer Request buffer.
   */
  public onRequest(buffer: Buffer): ISlaveResponse {
    const functionCode = buffer.readUInt8(0);
    const request = buffer.slice(1);

    switch (functionCode) {
      case pdu.EFunctionCode.ReadCoils: {
        return this.onReadBitsRequest(functionCode, request, true);
      }
      case pdu.EFunctionCode.ReadDiscreteInputs: {
        return this.onReadBitsRequest(functionCode, request, false);
      }
      case pdu.EFunctionCode.ReadHoldingRegisters: {
        return this.onReadRegistersRequest(functionCode, request, true);
      }
      case pdu.EFunctionCode.ReadInputRegisters: {
        return this.onReadRegistersRequest(functionCode, request, false);
      }
      case pdu.EFunctionCode.WriteSingleCoil: {
        return this.onWriteSingleBitRequest(functionCode, request);
      }
      case pdu.EFunctionCode.WriteSingleRegister: {
        return this.onWriteSingleRegisterRequest(functionCode, request);
      }
      case pdu.EFunctionCode.WriteMultipleCoils: {
        return this.onWriteMultipleBitsRequest(functionCode, request);
      }
      case pdu.EFunctionCode.WriteMultipleRegisters: {
        return this.onWriteMultipleRegistersRequest(functionCode, request);
      }
      default: {
        // Unsupported function code, convert to exception.
        return Master.createException(functionCode, pdu.EExceptionCode.IllegalFunctionCode);
      }
    }
  }

  // (MEDIUM): Buffer value/data validation.

  protected onReadBitsRequest(functionCode: number, request: Buffer, isCoils: boolean): ISlaveResponse {
    const startingAddress = request.readUInt16BE(0);
    const quantityOfBits = request.readUInt16BE(2);

    const values = isCoils ?
      this.readCoils(startingAddress, quantityOfBits) :
      this.readDiscreteInputs(startingAddress, quantityOfBits);
    const [bytes, byteValues] = pdu.bitsToBytes(values);

    const buffer = Buffer.allocUnsafe(2 + bytes);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt8(bytes, 1);
    byteValues.map((value, index) => {
      buffer.writeUInt8(value, 2 + index);
    });

    const data: pdu.IReadBits = { bytes, values };
    return new pdu.Response(functionCode, data, buffer);
  }

  protected onReadRegistersRequest(functionCode: number, request: Buffer, isHolding: boolean): ISlaveResponse {
    const startingAddress = request.readUInt16BE(0);
    const quantityOfRegisters = request.readUInt16BE(2);

    const values = isHolding ?
      this.readHoldingRegisters(startingAddress, quantityOfRegisters) :
      this.readInputRegisters(startingAddress, quantityOfRegisters);
    const bytes = values.length * 2;

    const buffer = Buffer.allocUnsafe(2 + bytes);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt8(bytes, 1);
    values.map((value, index) => {
      buffer.writeUInt16BE(value, 2 + (index * 2));
    });

    const data: pdu.IReadRegisters = { bytes, values };
    return new pdu.Response(functionCode, data, buffer);
  }

  protected onWriteSingleBitRequest(functionCode: number, request: Buffer): ISlaveResponse {
    const address = request.readUInt16BE(0);
    const outputValue = request.readUInt16BE(2) === 0xFF00;
    const value = this.writeSingleCoil(address, outputValue);

    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value ? 0xFF00 : 0x0, 3);

    const data: pdu.IWriteBit = { address, value };
    return new pdu.Response(functionCode, data, buffer);
  }

  protected onWriteSingleRegisterRequest(functionCode: number, request: Buffer): ISlaveResponse {
    const address = request.readUInt16BE(0);
    const outputValue = request.readUInt16BE(2);
    const value = this.writeSingleRegister(address, outputValue);

    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(value, 3);

    const data: pdu.IWriteRegister = { address, value };
    return new pdu.Response(functionCode, data, buffer);
  }

  protected onWriteMultipleBitsRequest(functionCode: number, request: Buffer): ISlaveResponse {
    const address = request.readUInt16BE(0);
    const quantityOfBits = request.readUInt16BE(2);
    const bitValues = pdu.bytesToBits(quantityOfBits, request.slice(5));
    const quantity = this.writeMultipleCoils(address, bitValues[1]);

    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(quantity, 3);

    const data: pdu.IWriteMultiple = { address, quantity };
    return new pdu.Response(functionCode, data, buffer);
  }

  protected onWriteMultipleRegistersRequest(functionCode: number, request: Buffer): ISlaveResponse {
    const address = request.readUInt16BE(0);
    const quantityOfRegisters = request.readUInt16BE(2);
    const registerValues: number[] = [];
    for (let i = 0; i < quantityOfRegisters; i++) {
      registerValues.push(request.readUInt16BE(5 + (i * 2)));
    }
    const quantity = this.writeMultipleRegisters(address, registerValues);

    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(address, 1);
    buffer.writeUInt16BE(quantity, 3);

    const data: pdu.IWriteMultiple = { address, quantity };
    return new pdu.Response(functionCode, data, buffer);
  }

}
