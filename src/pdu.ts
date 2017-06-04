/* tslint:disable:no-bitwise no-empty-interface */
import { assert } from "./node";

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
export enum ModbusFunctionCode {
  ReadCoils = 0x1,
  ReadDiscreteInputs,
  ReadHoldingRegisters,
  ReadInputRegisters,
  WriteSingleCoil,
  WriteSingleRegister,
  WriteMultipleCoils = 0xF,
  WriteMultipleRegisters,
}

/**
 * Modbus exception codes.
 */
export enum ModbusExceptionCode {
  IllegalFunctionCode = 0x1,
  IllegalDataAddress,
  IllegalDataValue,
  ServerFailure,
  Acknowledge,
  ServerBusy,
}

export interface IModbusReadBits {
  bytes: number;
  values: boolean[];
}
export interface IModbusReadCoils extends IModbusReadBits { }
export interface IModbusReadDiscreteInputs extends IModbusReadBits { }

export interface IModbusReadRegisters {
  bytes: number;
  values: number[];
}
export interface IModbusReadHoldingRegisters extends IModbusReadRegisters { }
export interface IModbusReadInputRegisters extends IModbusReadRegisters { }

export interface IModbusWriteBit {
  address: number;
  value: boolean;
}
export interface IModbusWriteSingleCoil extends IModbusWriteBit { }

export interface IModbusWriteRegister {
  address: number;
  value: number;
}
export interface IModbusWriteSingleRegister extends IModbusWriteRegister { }

export interface IModbusWriteMultiple {
  address: number;
  quantity: number;
}
export interface IModbusWriteMultipleCoils extends IModbusWriteMultiple { }
export interface IModbusWriteMultipleRegisters extends IModbusWriteMultiple { }

/**
 * Modbus response properties for supported function codes.
 */
export type ModbusData = IModbusReadCoils
  | IModbusReadDiscreteInputs
  | IModbusReadHoldingRegisters
  | IModbusReadInputRegisters
  | IModbusWriteSingleCoil
  | IModbusWriteSingleRegister
  | IModbusWriteMultipleCoils
  | IModbusWriteMultipleRegisters;

/**
 * Modbus PDU request.
 */
export class ModbusPduRequest {
  public constructor(
    public functionCode: number,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus PDU response.
 */
export class ModbusPduResponse {
  public constructor(
    public functionCode: number,
    public data: ModbusData,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus PDU exception.
 */
export class ModbusPduException {
  public constructor(
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) { }
}
