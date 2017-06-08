
/**
 * Modbus TCP request.
 */
export class TcpRequest {
  public constructor(
    public transactionId: number,
    public functionCode: number,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus TCP response.
 */
export class TcpResponse {
  public constructor(
    public transactionId: number,
    public functionCode: number,
    public data: any,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus PDU exception.
 */
export class TcpException {
  public constructor(
    public transactionId: number,
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) { }
}
