import * as pdu from "../pdu";

/** Modbus TCP request. */
export class Request extends pdu.Request {
  public constructor(
    public transactionId: number,
    public unitId: number,
    public functionCode: number,
    public buffer: Buffer
  ) {
    super(functionCode, buffer);
  }
}

/** Modbus TCP response. */
export class Response extends pdu.Response {
  public constructor(
    public transactionId: number,
    public unitId: number,
    public functionCode: number,
    public data: any,
    public buffer: Buffer
  ) {
    super(functionCode, data, buffer);
  }
}

/** Modbus TCP exception. */
export class Exception extends pdu.Exception {
  public constructor(
    public transactionId: number,
    public unitId: number,
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer
  ) {
    super(functionCode, exceptionFunctionCode, exceptionCode, buffer);
  }
}
