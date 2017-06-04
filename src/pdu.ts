/* tslint:disable:no-empty-interface */
/// <reference types="node" />
import * as assert from "assert";

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

/**
 * Modbus function codes.
 */
export const enum ModbusFunctionCode {
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
export const enum ModbusExceptionCode {
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
export type ModbusResponseDataTypes = IModbusReadCoils
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
    public data: ModbusResponseDataTypes,
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
  ) { }
}
