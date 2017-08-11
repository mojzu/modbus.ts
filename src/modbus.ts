
/** Modbus function codes. */
export const enum EModbusFunctionCode {
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
export const enum EModbusExceptionCode {
  IllegalFunctionCode = 0x1,
  IllegalDataAddress,
  IllegalDataValue,
  ServerFailure,
  Acknowledge,
  ServerBusy,
}

/** Modbus read coils/discrete inputs common interface. */
export interface IModbusReadBits {
  bytes: number;
  values: boolean[];
}
export interface IModbusReadCoils extends IModbusReadBits { }
export interface IModbusReadDiscreteInputs extends IModbusReadBits { }

/** Modbus read holding/input registers common interface. */
export interface IModbusReadRegisters {
  bytes: number;
  values: number[];
}
export interface IModbusReadHoldingRegisters extends IModbusReadRegisters { }
export interface IModbusReadInputRegisters extends IModbusReadRegisters { }

/** Modbus write coil common interface. */
export interface IModbusWriteBit {
  address: number;
  value: boolean;
}
export interface IModbusWriteSingleCoil extends IModbusWriteBit { }

/** Modbus write register common interface. */
export interface IModbusWriteRegister {
  address: number;
  value: number;
}
export interface IModbusWriteSingleRegister extends IModbusWriteRegister { }

/** Modbus write multiple coils/registers common interface. */
export interface IModbusWriteMultiple {
  address: number;
  quantity: number;
}
export interface IModbusWriteMultipleCoils extends IModbusWriteMultiple { }
export interface IModbusWriteMultipleRegisters extends IModbusWriteMultiple { }
