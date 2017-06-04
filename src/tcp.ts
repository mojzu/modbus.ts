import { ModbusData } from "./pdu";

/**
 * Modbus TCP request.
 */
export class ModbusTcpRequest {
  public constructor(
    public transactionId: number,
    public functionCode: number,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus TCP response.
 */
export class ModbusTcpResponse {
  public constructor(
    public transactionId: number,
    public functionCode: number,
    public data: ModbusData,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus PDU exception.
 */
export class ModbusTcpException {
  public constructor(
    public transactionId: number,
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus TCP client error codes.
 */
export enum ModbusTcpClientError {
  NotConnected,
}
