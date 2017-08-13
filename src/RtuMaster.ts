/* tslint:disable:no-bitwise prefer-for-of */
import * as SerialPort from "serialport";
import { Validate } from "container.ts/lib/validate";
import {
  Observable,
  BehaviorSubject,
} from "./rxjs";
import { EModbusFunctionCode } from "./modbus";
import {
  PduRequest,
  PduResponse,
  PduException,
  PduMaster,
} from "./PduMaster";
import {
  IAduMasterRequestOptions,
  AduMaster,
} from "./AduMaster";

/** Modbus RTU request. */
export class RtuRequest extends PduRequest {
  public constructor(
    public slaveAddress: number,
    public functionCode: number,
    public buffer: Buffer,
  ) {
    super(functionCode, buffer);
  }
}

/** Modbus RTU response. */
export class RtuResponse extends PduResponse {
  public constructor(
    public slaveAddress: number,
    public functionCode: number,
    public data: any,
    public buffer: Buffer,
  ) {
    super(functionCode, data, buffer);
  }
}

/** Modbus RTU exception. */
export class RtuException extends PduException {
  public constructor(
    public slaveAddress: number,
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) {
    super(functionCode, exceptionFunctionCode, exceptionCode, buffer);
  }
}

/** Modbus RTU master data bits options. */
export type IRtuMasterDataBits = 8 | 7 | 6 | 5;

/** Modbus RTU master stop bits options. */
export type IRtuMasterStopBits = 1 | 2;

/** Modbus RTU master parity options. */
export enum ERtuMasterParity {
  None,
  Even,
  Odd,
}
export type IRtuMasterParity = "none" | "even" | "odd";
export const RTU_MASTER_PARITY = ["none", "even", "odd"];

/** Modbus RTU master options */
export interface IRtuMasterOptions extends IAduMasterRequestOptions {
  path: string;
  baudRate?: number;
  dataBits?: IRtuMasterDataBits;
  stopBits?: IRtuMasterStopBits;
  parity?: ERtuMasterParity;
  rtscts?: boolean;
  slaveAddress?: number;
}

/** Modbus RTU master. */
export class RtuMaster extends AduMaster<RtuRequest, RtuResponse, RtuException> {

  public static DEFAULT_BAUDRATE = 19200;
  public static DEFAULT_DATA_BITS: IRtuMasterDataBits = 8;
  public static DEFAULT_STOP_BITS: IRtuMasterStopBits = 1;
  public static DEFAULT_PARITY = ERtuMasterParity.Even;
  public static DEFAULT_RTSCTS = true;
  public static DEFAULT_SLAVE_ADDRESS = 1;

  /** Error codes. */
  public static ERROR = {
    OPEN: "OpenError",
    TIMEOUT: "TimeoutError",
  };

  private _path: string;
  private _baudRate: number;
  private _dataBits: IRtuMasterDataBits;
  private _stopBits: IRtuMasterStopBits;
  private _parity: ERtuMasterParity;
  private _rtscts: boolean;
  private _slaveAddress: number;

  // TODO: SerialPort type fix.
  private _port: any;
  private _opened = new BehaviorSubject<boolean>(false);

  public get path(): string { return this._path; }

  public get baudRate(): number { return this._baudRate; }

  public get dataBits(): IRtuMasterDataBits { return this._dataBits; }

  public get stopBits(): IRtuMasterStopBits { return this._stopBits; }

  public get parity(): ERtuMasterParity { return this._parity; }

  public get rtscts(): boolean { return this._rtscts; }

  public get slaveAddress(): number { return this._slaveAddress; }

  public get opened(): Observable<boolean> { return this._opened; }

  public get isOpened(): boolean { return this._opened.value; }

  protected get openOptions(): SerialPort.options {
    const parity: IRtuMasterParity = RTU_MASTER_PARITY[this.parity] as any;
    return {
      baudRate: this.baudRate,
      dataBits: this.dataBits,
      stopBits: this.stopBits,
      parity,
      rtscts: this.rtscts,
    };
  }

  public constructor(options: IRtuMasterOptions, namespace?: string) {
    super(options, namespace);

    // RTU master option validation.
    const baudRate = String(options.baudRate || RtuMaster.DEFAULT_BAUDRATE);
    const dataBits = String(options.dataBits || RtuMaster.DEFAULT_DATA_BITS);
    const stopBits = String(options.stopBits || RtuMaster.DEFAULT_STOP_BITS);
    const rtscts = String(options.rtscts || RtuMaster.DEFAULT_RTSCTS);
    const slaveAddress = String(options.slaveAddress || RtuMaster.DEFAULT_SLAVE_ADDRESS);

    this._path = Validate.isString(options.path);
    this._baudRate = Validate.isInteger(baudRate);
    this._dataBits = Validate.isInteger(dataBits) as any;
    this._stopBits = Validate.isInteger(stopBits, { min: 1, max: 2 }) as any;
    this._parity = options.parity || RtuMaster.DEFAULT_PARITY;
    this._rtscts = Validate.isBoolean(rtscts);
    this._slaveAddress = Validate.isInteger(slaveAddress, { min: 0, max: 0xFF });
  }

  public open(options: IAduMasterRequestOptions = {}): Observable<boolean> {
    // TODO: Connection retries support.
    const timeout = this.validTimeout(options.timeout);

    // Ensure master closed and in known state.
    this.close();
    this.create();

    this.debug(`open: ${this.path}`);
    // (Re)create serial port, add error listener.
    this._port = new SerialPort(this.path, this.openOptions);
    this._port.on("error", (error: Error) => { this.setError(error); });

    // Will emit next(false) and complete with call to 'close' method.
    // Will emit next(false) and error if port closes.
    const closed = this._opened.skip(1).filter((b) => !b);

    // Merge port close/connect events to determine master state.
    // Connect event will emit next(true).
    // Close event will emit next(false) and throw an error.
    const portClose = Observable.fromEvent(this._port, "close")
      .takeUntil(closed)
      .map(() => ({ name: "close" }));

    const portOpen = Observable.fromEvent(this._port, "open")
      .takeUntil(closed)
      .map(() => ({ name: "open" }));

    Observable.merge(portClose, portOpen)
      .takeUntil(closed)
      .debug(this.debug, "port")
      .subscribe((value) => {
        if (value.name === "open") {
          this.setPortState(true);
        } else if (value.name === "close") {
          this.close(RtuMaster.ERROR.OPEN);
        }
      });

    // Port data event receives data into internal buffer and processes responses.
    Observable.fromEvent(this._port, "data")
      .takeUntil(closed)
      .debug(this.debug, "port:data")
      .subscribe((buffer: Buffer) => this.receiveData(buffer));

    // Requests transmitted via port.
    this.transmit
      .takeUntil(closed)
      .subscribe((request) => this.writePort(request));

    // If no activity occurs on port for timeout duration, master is closed.
    Observable.merge(this.transmit, this.receive)
      .takeUntil(closed)
      .timeout(timeout)
      .debug(this.debug, "activity")
      .subscribe({
        error: () => this.close(RtuMaster.ERROR.TIMEOUT),
      });

    // Emits next if port opened, completes if 'close' method called,
    // throws an error if port closes.
    return this._opened.skip(1).filter((v) => v);
  }

  public close(_error?: string): void {
    this.setPortState(false, !_error, _error);
    this.destroyPort();
    this.destroy();
  }

  /** Set master port state. */
  protected setPortState(connected: boolean, close = false, error?: string): void {
    this._opened.next(connected);

    // Return open subject in case of close.
    if (close) {
      this._opened.complete();
    }
    if (error != null) {
      this.setError(error);
      this._opened.error(error);
    }
    if (close || (error != null)) {
      this._opened = new BehaviorSubject<boolean>(false);
    }
  }

  /** Destroy master port. */
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

  /** Write request to master port. */
  protected writePort(request: RtuRequest): void {
    if (this._port != null) {
      this._port.write(request.buffer);
    }
  }

  /** Construct and prepend RTU header, append CRC to PDU request buffer. */
  protected wrapRequest(functionCode: EModbusFunctionCode, request: Buffer): RtuRequest {
    const buffer = Buffer.concat([Buffer.allocUnsafe(1), request, Buffer.allocUnsafe(2)]);

    buffer.writeUInt8(this.slaveAddress, 0);
    const crc = this.generateCrc(buffer.slice(0, -2));
    buffer.writeUInt16LE(crc, request.length + 1);

    return new RtuRequest(this.slaveAddress, functionCode, buffer);
  }

  /** Generate CRC for request buffer. */
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

  /** Incoming responses matched using expected size. */
  protected matchResponse(request: RtuRequest, response: RtuResponse | RtuException): boolean {
    return true;
  }

  protected parseResponse(data: Buffer): number {
    // TODO: Improve parsing based on expected response.
    const slaveAddress = data.readUInt8(0);
    const pduBuffer = data.slice(1);

    const response = this.responseHandler(slaveAddress, pduBuffer, data);
    if (response != null) { this.receiveResponse(response); }

    // Return length of parsed data.
    return data.length;
  }

  protected responseHandler(
    slaveAddress: number,
    pduBuffer: Buffer,
    aduBuffer: Buffer,
  ): RtuResponse | RtuException | null {
    const pduResponse = PduMaster.responseHandler(pduBuffer);
    let response: RtuResponse | RtuException | null = null;

    if (pduResponse instanceof PduResponse) {
      response = new RtuResponse(
        slaveAddress,
        pduResponse.functionCode,
        pduResponse.data,
        aduBuffer,
      );
    } else if (pduResponse instanceof PduException) {
      response = new RtuException(
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
