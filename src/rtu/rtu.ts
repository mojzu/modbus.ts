import * as pdu from "../pdu";

/** Modbus RTU request. */
export class Request extends pdu.Request {
  public constructor(
    public readonly slaveAddress: number,
    public readonly functionCode: number,
    public readonly buffer: Buffer
  ) {
    super(functionCode, buffer);
  }
}

/** Modbus RTU response. */
export class Response extends pdu.Response {
  public constructor(
    public readonly slaveAddress: number,
    public readonly functionCode: number,
    public readonly data: any,
    public readonly buffer: Buffer
  ) {
    super(functionCode, data, buffer);
  }
}

/** Modbus RTU exception. */
export class Exception extends pdu.Exception {
  public constructor(
    public readonly slaveAddress: number,
    public readonly functionCode: number,
    public readonly exceptionFunctionCode: number,
    public readonly exceptionCode: number,
    public readonly buffer: Buffer
  ) {
    super(functionCode, exceptionFunctionCode, exceptionCode, buffer);
  }
}
