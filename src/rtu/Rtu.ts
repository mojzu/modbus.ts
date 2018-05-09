import * as pdu from "../pdu";

/** Modbus RTU request. */
export class Request extends pdu.Request {
  public constructor(public slaveAddress: number, public functionCode: number, public buffer: Buffer) {
    super(functionCode, buffer);
  }
}

/** Modbus RTU response. */
export class Response extends pdu.Response {
  public constructor(
    public slaveAddress: number,
    public functionCode: number,
    public data: any,
    public buffer: Buffer
  ) {
    super(functionCode, data, buffer);
  }
}

/** Modbus RTU exception. */
export class Exception extends pdu.Exception {
  public constructor(
    public slaveAddress: number,
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer
  ) {
    super(functionCode, exceptionFunctionCode, exceptionCode, buffer);
  }
}
