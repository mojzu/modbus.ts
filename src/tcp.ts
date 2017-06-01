/// <reference types="node" />
import { ModbusPduClient } from "./pdu";

/**
 * Modbus TCP client options.
 */
export interface IModbusTcpClientOptions {
  host: string;
  port?: number;
  unitId?: number;
}

/**
 * Modbus TCP client.
 */
export class ModbusTcpClient extends ModbusPduClient {

  private _host: string;
  private _port: number;
  private _unitId: number;

  private _transactionId = 1;
  private _protocolId = 0;

  /**
   * Host the client will connect to.
   */
  public get host(): string { return this._host; }

  /**
   * Port the client will connect to.
   */
  public get port(): number { return this._port; }

  /**
   * Identifier of a remote slave.
   */
  public get unitId(): number { return this._unitId; }

  public constructor(options: IModbusTcpClientOptions) {
    super();

    // TODO: Options argument validation.
    this._host = options.host;
    this._port = options.port || 502;
    this._unitId = options.unitId || 1;
  }

  // TODO: Implement request/response handling.

  public readCoils(startingAddress: number, quantityOfCoils: number): Buffer {
    const buffer = this._aduHeader(super.readCoils(startingAddress, quantityOfCoils));
    return buffer;
  }

  public readDiscreteInputs(startingAddress: number, quantityOfInputs: number): Buffer {
    const buffer = this._aduHeader(super.readDiscreteInputs(startingAddress, quantityOfInputs));
    return buffer;
  }

  public readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): Buffer {
    const buffer = this._aduHeader(super.readHoldingRegisters(startingAddress, quantityOfRegisters));
    return buffer;
  }

  public readInputRegisters(startingAddress: number, quantityOfRegisters: number): Buffer {
    const buffer = this._aduHeader(super.readInputRegisters(startingAddress, quantityOfRegisters));
    return buffer;
  }

  public writeSingleCoil(outputAddress: number, outputValue: boolean): Buffer {
    const buffer = this._aduHeader(super.writeSingleCoil(outputAddress, outputValue));
    return buffer;
  }

  public writeSingleRegister(registerAddress: number, registerValue: number): Buffer {
    const buffer = this._aduHeader(super.writeSingleRegister(registerAddress, registerValue));
    return buffer;
  }

  public writeMultipleRegisters(startingAddress: number, registerValues: number[]): Buffer {
    const buffer = this._aduHeader(super.writeMultipleRegisters(startingAddress, registerValues));
    return buffer;
  }

  public _aduHeader(buffer: Buffer): Buffer {
    const request = Buffer.concat([Buffer.alloc(7, 0), buffer]);

    request.writeUInt16BE(this._transactionId++, 0);
    request.writeUInt16BE(this._protocolId, 2);
    request.writeUInt16BE((buffer.length + 1), 4);
    request[6] = this._unitId;

    return request;
  }

}
