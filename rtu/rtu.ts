/// <reference types="node" />

export class RtuRequest {
  public constructor(
    public slaveAddress: number,
    public functionCode: number,
    public buffer: Buffer,
  ) { }
  public toString(): string {
    return `RtuRequest(${this.slaveAddress}, ${this.functionCode})`;
  }
}

export class RtuResponse {
  public constructor(
    public slaveAddress: number,
    public functionCode: number,
    public data: any,
    public buffer: Buffer,
  ) { }
  public toString(): string {
    return `RtuResponse(${this.slaveAddress}, ${this.functionCode})`;
  }
}

export class RtuException {
  public constructor(
    public slaveAddress: number,
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) { }
  public toString(): string {
    return `RtuException(${this.slaveAddress}, ${this.functionCode})`;
  }
}
