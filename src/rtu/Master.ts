/* tslint:disable:no-bitwise prefer-for-of */
import { isInteger } from "container.ts/lib/validate";
import { fromEvent, merge, Observable, Subscriber } from "rxjs";
import { take, takeUntil, timeout } from "rxjs/operators";
import * as adu from "../adu";
import * as pdu from "../pdu";
import * as rtu from "./Rtu";

export type IMasterRequestOptions = adu.IMasterRequestOptions<rtu.Request, rtu.Response, rtu.Exception>;

export interface ISerialPort {
  readonly isOpen: boolean;
  open(success?: () => void): void;
  close(): void;
  write(buffer: Buffer): void;
  on(event: string, listener: (error: any) => void): void;
}

/** Modbus RTU master options */
export interface IMasterOptions extends IMasterRequestOptions {
  slaveAddress?: number;
  inactivityTimeout?: number;
}

/** Modbus RTU master. */
export class Master extends adu.Master<rtu.Request, rtu.Response, rtu.Exception> {
  /** Default values. */
  public static DEFAULT = Object.assign(
    {
      SLAVE_ADDRESS: 1
    },
    adu.Master.DEFAULT
  );

  public readonly slaveAddress: number;
  public readonly inactivityTimeout: number;

  protected port: ISerialPort;

  public constructor(port: ISerialPort, options: IMasterOptions) {
    super(options);

    this.slaveAddress = isInteger(String(options.slaveAddress || Master.DEFAULT.SLAVE_ADDRESS), {
      min: 0,
      max: 0xff
    });
    this.inactivityTimeout = this.isTimeout(options.inactivityTimeout);

    this.port = port;
  }

  public open(options: IMasterRequestOptions = {}): Observable<void> {
    // TODO(M): Timeout/retry support.
    return new Observable((subscriber: Subscriber<void>) => {
      // Ensure master closed and in known state.
      this.close();
      this.onOpen();

      if (!this.port.isOpen) {
        this.port.open();
      }

      // Add error listener.
      this.port.on("error", (error: any) => {
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
        .subscribe((buffer) => this.onData(buffer));

      // Requests transmitted via port.
      this.transmit.pipe(takeUntil(portClose)).subscribe((request) => this.writePort(request));

      // If no activity occurs on port for timeout duration, master is closed.
      merge(this.transmit, this.receive)
        .pipe(takeUntil(portClose), timeout(this.inactivityTimeout))
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
      this.onClose();
      this.port.close();
    }
  }

  /** Write request to master port. */
  protected writePort(request: rtu.Request): void {
    if (this.port != null) {
      this.port.write(request.buffer);
    }
  }

  /** Construct and prepend RTU header, append CRC to PDU request buffer. */
  protected setupRequest(functionCode: pdu.EFunctionCode, request: Buffer): rtu.Request {
    const buffer = Buffer.concat([Buffer.allocUnsafe(1), request, Buffer.allocUnsafe(2)]);

    buffer.writeUInt8(this.slaveAddress, 0);
    const crc = this.generateCrc(buffer.slice(0, -2));
    buffer.writeUInt16LE(crc, request.length + 1);

    return new rtu.Request(this.slaveAddress, functionCode, buffer);
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

  /** Incoming responses matched using expected size. */
  protected matchResponse(request: rtu.Request, response: rtu.Response | rtu.Exception): boolean {
    return true;
  }

  protected parseResponse(data: Buffer): number {
    // TODO(M): Improve parsing based on expected response.
    const slaveAddress = data.readUInt8(0);
    const pduBuffer = data.slice(1);

    const response = this.onParseResponse(slaveAddress, pduBuffer, data);
    if (response != null) {
      this.onResponse(response);
    }

    // Return length of parsed data.
    return data.length;
  }

  protected onParseResponse(
    slaveAddress: number,
    pduBuffer: Buffer,
    aduBuffer: Buffer
  ): rtu.Response | rtu.Exception | null {
    const pduResponse = pdu.Master.onResponse(pduBuffer);
    let response: rtu.Response | rtu.Exception | null = null;

    if (pduResponse instanceof pdu.Response) {
      response = new rtu.Response(slaveAddress, pduResponse.functionCode, pduResponse.data, aduBuffer);
    } else if (pduResponse instanceof pdu.Exception) {
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
}
