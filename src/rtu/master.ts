// tslint:disable:no-bitwise prefer-for-of
import { isInteger } from "container.ts/lib/validate";
import { fromEvent, merge, Observable, Subscriber } from "rxjs";
import { take, takeUntil, timeout } from "rxjs/operators";
import * as adu from "../adu";
import * as pdu from "../pdu";
import * as rtu from "./rtu";

/** RTU master request options. */
export type IMasterRequestOptions = adu.IMasterRequestOptions<rtu.Request, rtu.Response, rtu.Exception>;

/** Generic serial port interface. */
export interface IMasterSerialPort {
  readonly isOpen: boolean;
  open(success?: () => void): void;
  close(): void;
  write(buffer: Buffer): void;
  on(event: "error", callback?: (error?: any) => void): this;
  on(event: "open" | "close", callback?: () => void): this;
  on(event: "data", callback?: (buffer: Buffer) => void): this;
}

/** Modbus RTU master options */
export interface IMasterOptions extends IMasterRequestOptions {
  slaveAddress?: number;
  inactivityTimeout?: number;
}

/** Modbus RTU master. */
export class Master extends adu.Master<rtu.Request, rtu.Response, rtu.Exception> {
  public readonly slaveAddress: number;
  public readonly inactivityTimeout: number;

  public constructor(protected readonly port: IMasterSerialPort, options: IMasterOptions) {
    super(options);
    this.slaveAddress = options.slaveAddress != null ? isInteger(`${options.slaveAddress}`, { min: 0, max: 0xff }) : 1;
    this.inactivityTimeout = this.isTimeout(options.inactivityTimeout);
  }

  public open(options: IMasterRequestOptions = {}): Observable<void> {
    // TODO(M): Timeout/retry support.
    return new Observable((subscriber: Subscriber<void>) => {
      // Ensure master in known state.
      this.masterReset();

      // (Re)open serial port
      if (!this.port.isOpen) {
        this.port.open();
      }

      // Add error listener.
      this.port.on("error", (error) => {
        subscriber.error(new adu.MasterError(error.code, error));
      });

      // If port closes, call close and complete observable.
      const portClose = fromEvent<void>(this.port as any, "close").pipe(take(1));
      portClose.subscribe(() => {
        this.close();
        subscriber.complete();
      });

      // If port opens, call next.
      fromEvent<void>(this.port as any, "open")
        .pipe(take(1))
        .subscribe(() => {
          subscriber.next();
        });

      // Port data event receives data into internal buffer and processes responses.
      fromEvent<Buffer>(this.port as any, "data")
        .pipe(takeUntil(portClose))
        .subscribe((buffer) => this.masterOnData(buffer));

      // Requests transmitted via port.
      this.transmit.pipe(takeUntil(portClose)).subscribe((request) => this.writePort(request));

      // If no activity occurs on port for timeout duration, master is closed.
      merge(this.transmit, this.receive)
        .pipe(
          takeUntil(portClose),
          timeout(this.inactivityTimeout)
        )
        .subscribe({
          error: (error) => {
            this.close();
            subscriber.error(new adu.MasterError(error.code, error));
          }
        });
    });
  }

  public close(): void {
    if (this.port.isOpen) {
      this.port.close();
    }
    this.masterReset();
  }

  public destroy(): void {
    if (this.port.isOpen) {
      this.port.close();
    }
    this.masterDestroy();
  }

  /** Write request to master port. */
  protected writePort(request: rtu.Request): void {
    if (this.port != null) {
      this.port.write(request.buffer);
    }
  }

  /** Generate CRC for request buffer. */
  protected generateCrc(request: Buffer): number {
    let crc = 0xffff;
    for (let i = 0; i < request.length; i++) {
      crc = crc ^ request[i];

      for (let j = 0; j < 8; j++) {
        const odd = crc & 0x0001;
        crc = crc >> 1;
        if (!!odd) {
          crc = crc ^ 0xa001;
        }
      }
    }
    return crc;
  }

  protected onParseResponse(
    slaveAddress: number,
    pduBuffer: Buffer,
    aduBuffer: Buffer
  ): rtu.Response | rtu.Exception | null {
    const pduResponse = pdu.Master.onResponse(pduBuffer);
    let response: rtu.Response | rtu.Exception | null = null;

    if (pdu.isResponse(pduResponse)) {
      response = new rtu.Response(slaveAddress, pduResponse.functionCode, pduResponse.data, aduBuffer);
    } else if (pdu.isException(pduResponse)) {
      response = new rtu.Exception(
        slaveAddress,
        pduResponse.functionCode,
        pduResponse.exceptionFunctionCode,
        pduResponse.exceptionCode,
        aduBuffer
      );
    }

    return response;
  }

  /** Construct and prepend RTU header, append CRC to PDU request buffer. */
  protected masterSetupRequest(functionCode: pdu.EFunctionCode, request: Buffer): rtu.Request {
    const buffer = Buffer.concat([Buffer.allocUnsafe(1), request, Buffer.allocUnsafe(2)]);

    buffer.writeUInt8(this.slaveAddress, 0);
    const crc = this.generateCrc(buffer.slice(0, -2));
    buffer.writeUInt16LE(crc, request.length + 1);

    return new rtu.Request(this.slaveAddress, functionCode, buffer);
  }

  /** Incoming responses matched using expected size. */
  protected masterMatchResponse(request: rtu.Request, response: rtu.Response | rtu.Exception): boolean {
    return true;
  }

  protected masterParseResponse(data: Buffer): number {
    // TODO(M): Improve parsing based on expected response.
    const slaveAddress = data.readUInt8(0);
    const pduBuffer = data.slice(1);

    const response = this.onParseResponse(slaveAddress, pduBuffer, data);
    if (response != null) {
      this.masterOnResponse(response);
    }

    // Return length of parsed data.
    return data.length;
  }
}
