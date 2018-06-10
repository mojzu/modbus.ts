import * as pdu from "../pdu";

/** Modbus TCP request. */
export class Request extends pdu.Request {
  public constructor(
    public readonly transactionId: number,
    public readonly unitId: number,
    public readonly functionCode: number,
    public readonly buffer: Buffer
  ) {
    super(functionCode, buffer);
  }
}

/** Modbus TCP response. */
export class Response extends pdu.Response {
  public constructor(
    public readonly transactionId: number,
    public readonly unitId: number,
    public readonly functionCode: number,
    public readonly data: any,
    public readonly buffer: Buffer
  ) {
    super(functionCode, data, buffer);
  }
}

/** Modbus TCP exception. */
export class Exception extends pdu.Exception {
  public constructor(
    public readonly transactionId: number,
    public readonly unitId: number,
    public readonly functionCode: number,
    public readonly exceptionFunctionCode: number,
    public readonly exceptionCode: number,
    public readonly buffer: Buffer
  ) {
    super(functionCode, exceptionFunctionCode, exceptionCode, buffer);
  }
}
