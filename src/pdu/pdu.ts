// tslint:disable:no-bitwise
import { isInteger } from "container.ts/lib/validate";

/** Modbus function codes. */
export enum EFunctionCode {
  ReadCoils = 0x1,
  ReadDiscreteInputs,
  ReadHoldingRegisters,
  ReadInputRegisters,
  WriteSingleCoil,
  WriteSingleRegister,
  WriteMultipleCoils = 0xf,
  WriteMultipleRegisters,
  Mei = 0x2b
}

/** Modbus exception codes. */
export enum EExceptionCode {
  IllegalFunctionCode = 0x1,
  IllegalDataAddress,
  IllegalDataValue,
  ServerFailure,
  Acknowledge,
  ServerBusy
}

/** Modbus read coils/discrete inputs common interface. */
export interface IReadBits {
  readonly bytes: number;
  readonly values: boolean[];
}
export interface IReadCoils extends IReadBits {}
export interface IReadDiscreteInputs extends IReadBits {}

/** Modbus read holding/input registers common interface. */
export interface IReadRegisters {
  readonly bytes: number;
  readonly values: number[];
}
export interface IReadHoldingRegisters extends IReadRegisters {}
export interface IReadInputRegisters extends IReadRegisters {}

/** Modbus write coil common interface. */
export interface IWriteBit {
  readonly address: number;
  readonly value: boolean;
}
export interface IWriteSingleCoil extends IWriteBit {}

/** Modbus write register common interface. */
export interface IWriteRegister {
  readonly address: number;
  readonly value: number;
}
export interface IWriteSingleRegister extends IWriteRegister {}

/** Modbus write multiple coils/registers common interface. */
export interface IWriteMultiple {
  readonly address: number;
  readonly quantity: number;
}
export interface IWriteMultipleCoils extends IWriteMultiple {}
export interface IWriteMultipleRegisters extends IWriteMultiple {}

/** Modbus PDU request. */
export class Request {
  public constructor(public readonly functionCode: number, public readonly buffer: Buffer) {}
}

/** Modbus PDU response. */
export class Response {
  public constructor(public readonly functionCode: number, public readonly data: any, public readonly buffer: Buffer) {}
}

/** Modbus PDU exception. */
export class Exception {
  public constructor(
    public readonly functionCode: number,
    public readonly exceptionFunctionCode: number,
    public readonly exceptionCode: number,
    public readonly buffer: Buffer
  ) {}
}

/** Throw an error if value is not a valid address. */
export function isAddress(value: number): void {
  isInteger(String(value), { min: 0x0, max: 0xffff });
}

/** Throw an error if value is not a valid register. */
export function isRegister(value: number): void {
  isInteger(String(value), { min: 0x0, max: 0xffff });
}

/** Throw an error if value is not a valid quantity of bits. */
export function isQuantityOfBits(value: number, maximum = 0x7d0): void {
  isInteger(String(value), { min: 0x1, max: maximum });
}

/** Throw an error if value is not a valid quantity of bits. */
export function isQuantityOfRegisters(value: number, maximum = 0x7d): void {
  isInteger(String(value), { min: 0x1, max: maximum });
}

/** Convert an array of boolean bits to an array of byte values. */
export function bitsToBytes(values: boolean[]): [number, number[]] {
  let byteCount = Math.floor(values.length / 8);
  if (values.length % 8 !== 0) {
    byteCount += 1;
  }

  // Convert array of booleans to byte flag array.
  const byteValues: number[] = [];
  values.map((value, index) => {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = Math.floor(index % 8);

    let byteValue = byteValues[byteIndex] || 0;
    if (!!value) {
      byteValue |= 0x1 << bitIndex;
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
  if (quantity % 8 !== 0) {
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
