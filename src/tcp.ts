
/**
 * Modbus TCP request.
 */
export class TcpRequest {
  public constructor(
    public transactionId: number,
    public unitId: number,
    public functionCode: number,
    public buffer: Buffer,
  ) { }
  public toString(): string {
    return `TcpRequest(${this.transactionId}, ${this.unitId}, ${this.functionCode})`;
  }
}

/**
 * Modbus TCP response.
 */
export class TcpResponse {
  public constructor(
    public transactionId: number,
    public unitId: number,
    public functionCode: number,
    public data: any,
    public buffer: Buffer,
  ) { }
  public toString(): string {
    return `TcpResponse(${this.transactionId}, ${this.unitId}, ${this.functionCode})`;
  }
}

/**
 * Modbus PDU exception.
 */
export class TcpException {
  public constructor(
    public transactionId: number,
    public unitId: number,
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) { }
  public toString(): string {
    return `TcpException(${this.transactionId}, ${this.unitId}, ${this.functionCode})`;
  }
}
