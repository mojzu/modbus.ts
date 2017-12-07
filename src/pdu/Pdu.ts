// tslint:disable:no-bitwise
import { Validate } from "container.ts/lib/validate";

/** Modbus function codes. */
export enum EFunctionCode {
  ReadCoils = 0x1,
  ReadDiscreteInputs,
  ReadHoldingRegisters,
  ReadInputRegisters,
  WriteSingleCoil,
  WriteSingleRegister,
  WriteMultipleCoils = 0xF,
  WriteMultipleRegisters,
  Mei = 0x2B,
}

/** Modbus exception codes. */
export enum EExceptionCode {
  IllegalFunctionCode = 0x1,
  IllegalDataAddress,
  IllegalDataValue,
  ServerFailure,
  Acknowledge,
  ServerBusy,
}

/** Modbus read coils/discrete inputs common interface. */
export interface IReadBits {
  bytes: number;
  values: boolean[];
}
export interface IReadCoils extends IReadBits { }
export interface IReadDiscreteInputs extends IReadBits { }

/** Modbus read holding/input registers common interface. */
export interface IReadRegisters {
  bytes: number;
  values: number[];
}
export interface IReadHoldingRegisters extends IReadRegisters { }
export interface IReadInputRegisters extends IReadRegisters { }

/** Modbus write coil common interface. */
export interface IWriteBit {
  address: number;
  value: boolean;
}
export interface IWriteSingleCoil extends IWriteBit { }

/** Modbus write register common interface. */
export interface IWriteRegister {
  address: number;
  value: number;
}
export interface IWriteSingleRegister extends IWriteRegister { }

/** Modbus write multiple coils/registers common interface. */
export interface IWriteMultiple {
  address: number;
  quantity: number;
}
export interface IWriteMultipleCoils extends IWriteMultiple { }
export interface IWriteMultipleRegisters extends IWriteMultiple { }

/** Modbus PDU request. */
export class Request {
  public constructor(
    public functionCode: number,
    public buffer: Buffer,
  ) { }
}

/** Modbus PDU response. */
export class Response {
  public constructor(
    public functionCode: number,
    public data: any,
    public buffer: Buffer,
  ) { }
}

/** Modbus PDU exception. */
export class Exception {
  public constructor(
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) { }
}

/** Throw an error if value is not a valid address. */
export function isAddress(value: number): void {
  Validate.isInteger(String(value), { min: 0x0, max: 0xFFFF });
}

/** Throw an error if value is not a valid register. */
export function isRegister(value: number): void {
  Validate.isInteger(String(value), { min: 0x0, max: 0xFFFF });
}

/** Throw an error if value is not a valid quantity of bits. */
export function isQuantityOfBits(value: number, maximum = 0x7D0): void {
  Validate.isInteger(String(value), { min: 0x1, max: maximum });
}

/** Throw an error if value is not a valid quantity of bits. */
export function isQuantityOfRegisters(value: number, maximum = 0x7D): void {
  Validate.isInteger(String(value), { min: 0x1, max: maximum });
}

/** Convert an array of boolean bits to an array of byte values. */
export function bitsToBytes(values: boolean[]): [number, number[]] {
  let byteCount = Math.floor(values.length / 8);
  if ((values.length % 8) !== 0) {
    byteCount += 1;
  }

  // Convert array of booleans to byte flag array.
  const byteValues: number[] = [];
  values.map((value, index) => {
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

  return [byteCount, byteValues];
}

/** Convert an array of byte values to an array of boolean bits. */
export function bytesToBits(quantity: number, buffer: Buffer): [number, boolean[]] {
  let byteCount = Math.floor(quantity / 8);
  if ((quantity % 8) !== 0) {
    byteCount += 1;
  }

  // Convert byte flag array to array of booleans.
  const bitValues: boolean[] = [];
  for (let i = 0; i < quantity; i++) {
    const byteIndex = Math.floor(i / 8);
    const bitIndex = Math.floor(i % 8);

    const byteValue = buffer.readUInt8(byteIndex);
    bitValues.push(!!(byteValue & (0x1 << bitIndex)));
  }

  return [byteCount, bitValues];
}
