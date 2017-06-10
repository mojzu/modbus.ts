/* tslint:disable:no-bitwise no-empty-interface */
import { assert } from "../node";

export function validAddress(value: number): void {
  assert((0x0 <= value) && (value <= 0xFFFF), `Invalid address: ${value}`);
}

export function validRegister(value: number): void {
  assert((0x0 <= value) && (value <= 0xFFFF), `Invalid register value: ${value}`);
}

export function validQuantityOfBits(value: number, maximum = 0x7D0): void {
  assert((0x1 <= value) && (value <= maximum), `Invalid quantity of bits: ${value}`);
}

export function validQuantityOfRegisters(value: number, maximum = 0x7D): void {
  assert((0x1 <= value) && (value <= maximum), `Invalid quantity of registers: ${value}`);
}

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

export function bytesToBits(quantity: number, buffer: Buffer): boolean[] {
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

  return bitValues;
}

/**
 * Modbus function codes.
 */
export enum FunctionCode {
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

/**
 * Modbus exception codes.
 */
export enum ExceptionCode {
  IllegalFunctionCode = 0x1,
  IllegalDataAddress,
  IllegalDataValue,
  ServerFailure,
  Acknowledge,
  ServerBusy,
}

export interface IReadBits {
  bytes: number;
  values: boolean[];
}
export interface IReadCoils extends IReadBits { }
export interface IReadDiscreteInputs extends IReadBits { }

export interface IReadRegisters {
  bytes: number;
  values: number[];
}
export interface IReadHoldingRegisters extends IReadRegisters { }
export interface IReadInputRegisters extends IReadRegisters { }

export interface IWriteBit {
  address: number;
  value: boolean;
}
export interface IWriteSingleCoil extends IWriteBit { }

export interface IWriteRegister {
  address: number;
  value: number;
}
export interface IWriteSingleRegister extends IWriteRegister { }

export interface IWriteMultiple {
  address: number;
  quantity: number;
}
export interface IWriteMultipleCoils extends IWriteMultiple { }
export interface IWriteMultipleRegisters extends IWriteMultiple { }

/**
 * Modbus PDU request.
 */
export class PduRequest {
  public constructor(
    public functionCode: number,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus PDU response.
 */
export class PduResponse {
  public constructor(
    public functionCode: number,
    public data: any,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus PDU exception.
 */
export class PduException {
  public constructor(
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) { }
}
