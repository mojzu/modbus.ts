/// <reference types="node" />
/* tslint:disable:no-bitwise prefer-for-of */
import * as debug from "debug";
import * as serialPort from "serialport";
import { Validate } from "container.ts/lib/validate";
import { Observable, Subject, BehaviorSubject } from "../tcp/rx";
import { PduClient, PduResponse, PduException } from "../pdu";
import * as rtu from "./rtu";

export type RtuClientResponse = rtu.RtuResponse | rtu.RtuException | null;

export interface IRtuClientOptions {
  path: string;
  baudRate?: number;
  slaveAddress?: number;
}

export class RtuClient {

  public static DEFAULT_BAUDRATE = 19200;
  public static DEFAULT_SLAVE_ADDRESS = 1;

  /** Error codes. */
  public static ERROR = {
    CONNECTION: "RtuClientConnectionError",
  };

  private _debug: debug.IDebugger;

  private _path: string;
  private _baudRate: number;
  private _slaveAddress: number;

  // TODO: SerialPort type fix.
  private _port: any;
  private _open = new BehaviorSubject<boolean>(false);
  private _error = new BehaviorSubject<any>(null);

  private _receive = new Subject<rtu.RtuResponse | rtu.RtuException>();
  private _transmit = new Subject<rtu.RtuRequest>();

  // TODO: Byte/packet counters.
  // TODO: Refactor common code with TcpClient.

  public get path(): string { return this._path; }

  public get baudRate(): number { return this._baudRate; }

  public get slaveAddress(): number { return this._slaveAddress; }

  public get isOpen(): boolean { return this._open.value; }

  /** Socket errors stream. */
  public get error(): Observable<any> { return this._error; }

  /** Last error code returned by client socket. */
  public get errorCode(): string | null {
    if (this._error.value != null) {
      if (this._error.value.code != null) {
        return this._error.value.code;
      }
      return this._error.value;
    }
    return null;
  }

  /** Client internal debugging interface. */
  protected get debug(): debug.IDebugger {
    if (this._debug != null) {
      return this._debug;
    }
    return (() => { }) as any;
  }

  public constructor(options: IRtuClientOptions, namespace?: string) {
    this._path = Validate.isString(options.path);
    this._baudRate = Validate.isInteger(String(options.baudRate || RtuClient.DEFAULT_BAUDRATE));
    this._slaveAddress = Validate.isInteger(String(options.slaveAddress || RtuClient.DEFAULT_SLAVE_ADDRESS));

    if (namespace != null) {
      this._debug = debug(namespace);
    }
  }

  public open(): Observable<boolean> {
    // TODO: Timeout/retry arguments.
    this.close();

    this.debug(`open: ${this.path}`);
    this._port = new serialPort(this.path, {
      baudRate: this.baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "even",
    });
    this._port.on("error", (error: Error) => { this._error.next(error); });

    const closed = this._open.skip(1).filter((b) => !b);

    const portClose = Observable.fromEvent(this._port, "close")
      .takeUntil(closed)
      .mergeMap((hadError) => Observable.of({ name: "close", hadError }));

    const portOpen = Observable.fromEvent(this._port, "open")
      .takeUntil(closed)
      .mergeMap(() => Observable.of({ name: "open", hadError: false }));

    Observable.race(portClose, portOpen)
      .subscribe((value) => {
        if (value.name === "open") {
          this.setPortState(true);
        } else if (value.name === "close") {
          this.close(RtuClient.ERROR.CONNECTION);
        }
      });

    Observable.fromEvent(this._port, "data")
      .takeUntil(portClose)
      .subscribe((buffer: Buffer) => this.receiveData(buffer));

    this._transmit
      .takeUntil(portClose)
      .subscribe((request) => this.writePort(request));

    return this._open.skip(1).filter((v) => v);
  }

  public close(_error?: string): void {
    this.setPortState(false, !_error, _error);
    this.destroyPort();
  }

  public readHoldingRegisters(
    startingAddress: number,
    quantityOfRegisters: number,
  ): Observable<rtu.RtuResponse> {
    const pduRequest = PduClient.readHoldingRegisters(startingAddress, quantityOfRegisters);
    const request = this.rtuWrapper(pduRequest.functionCode, pduRequest.buffer);
    return this.writeRequest(request);
  }

  public writeMultipleRegisters(
    startingAddress: number,
    registerValues: number[],
  ): Observable<rtu.RtuResponse> {
    const pduRequest = PduClient.writeMultipleRegisters(startingAddress, registerValues);
    const request = this.rtuWrapper(pduRequest.functionCode, pduRequest.buffer);
    return this.writeRequest(request);
  }

  protected setPortState(connected: boolean, close = false, error?: string): void {
    this._open.next(connected);

    // Return open subject in case of close.
    if (close) {
      this._open.complete();
    }
    if (error != null) {
      this._error.next(error);
      this._open.error(error);
    }
    if (close || (error != null)) {
      this._open = new BehaviorSubject<boolean>(false);
    }
  }

  protected destroyPort(): void {
    if (this._port != null) {
      let message = `close: ${this.path}`;
      if (this.errorCode != null) {
        message += ` (${this.errorCode})`;
      }
      this.debug(message);
      this._port.close();
      this._port = null;
    }
  }

  protected writePort(request: rtu.RtuRequest): Observable<void> {
    if (this._port != null) {
      this.debug(`write: ${request}`);
      this.debug(request.buffer);
      this._port.write(request.buffer);
    }
    return Observable.empty();
  }

  protected rtuWrapper(functionCode: number, request: Buffer): rtu.RtuRequest {
    const buffer = Buffer.concat([Buffer.allocUnsafe(1), request, Buffer.allocUnsafe(2)]);

    buffer.writeUInt8(this.slaveAddress, 0);
    const crc = this.generateCrc(buffer.slice(0, -2));
    buffer.writeUInt16LE(crc, request.length + 1);

    return new rtu.RtuRequest(this.slaveAddress, functionCode, buffer);
  }

  protected generateCrc(request: Buffer): number {
    let crc = 0xFFFF;

    for (let i = 0; i < request.length; i++) {
      crc = crc ^ request[i];

      for (let j = 0; j < 8; j++) {
        const odd = crc & 0x0001;
        crc = crc >> 1;
        if (!!odd) {
          crc = crc ^ 0xA001;
        }
      }
    }

    return crc;
  }

  protected writeRequest(request: rtu.RtuRequest): Observable<rtu.RtuResponse> {
    this._transmit.next(request);
    return this._receive
      .take(1)
      .switchMap((response) => {
        if (response instanceof rtu.RtuResponse) {
          return Observable.of(response);
        } else {
          return Observable.throw(response);
        }
      });
  }

  protected receiveData(data: Buffer): void {
    this.debug(data);
    const slaveAddress = data.readUInt8(0);
    const pduBuffer = data.slice(1);

    const response = this.responseHandler(slaveAddress, pduBuffer, data);
    if (response != null) {
      this.debug(`read: ${response}`);
      this._receive.next(response);
    }
  }

  protected responseHandler(
    slaveAddress: number,
    pduBuffer: Buffer,
    aduBuffer: Buffer,
  ): RtuClientResponse {
    const pduResponse = PduClient.responseHandler(pduBuffer);
    let response: RtuClientResponse = null;

    if (pduResponse instanceof PduResponse) {
      response = new rtu.RtuResponse(
        slaveAddress,
        pduResponse.functionCode,
        pduResponse.data,
        aduBuffer,
      );
    } else if (pduResponse instanceof PduException) {
      response = new rtu.RtuException(
        slaveAddress,
        pduResponse.functionCode,
        pduResponse.exceptionFunctionCode,
        pduResponse.exceptionCode,
        aduBuffer,
      );
    }

    return response;
  }

}
