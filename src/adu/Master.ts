import { ErrorChain } from "container.ts/lib/error";
import { Validate } from "container.ts/lib/validate";
import * as Debug from "debug";
import * as pdu from "../pdu";
import { BehaviorSubject, Observable, Subject, TimeoutError } from "./RxJS";

// Internal debug output.
const debug = Debug("modbus.ts");

/** Conditional retry callback type. */
export type IMasterRetryWhen<
  Req extends pdu.Request,
  Res extends pdu.Response,
  Exc extends pdu.Exception
  > = (
    master: Master<Req, Res, Exc>,
    retry: number,
    errorCount: number,
    error: any,
    request?: Req,
  ) => void;

/** Log interface. */
export class Log<
  Req extends pdu.Request,
  Res extends pdu.Response,
  Exc extends pdu.Exception
  > {
  public request(request: Req, errorCount: number): void {
    debug(Master.LOG.REQUEST, request, errorCount);
  }
  public response(response: Res): void {
    debug(Master.LOG.RESPONSE, response);
  }
  public exception(exception: Exc): void {
    debug(Master.LOG.EXCEPTION, exception);
  }
  public bytesTransmitted(value: number): void { }
  public bytesReceived(value: number): void { }
}

/** Modbus ADU master request options. */
export interface IMasterRequestOptions<
  Req extends pdu.Request,
  Res extends pdu.Response,
  Exc extends pdu.Exception,
  L extends Log<Req, Res, Exc> = Log<Req, Res, Exc>,
  > {
  retry?: number;
  timeout?: number;
  retryWhen?: IMasterRetryWhen<Req, Res, Exc>;
  log?: L;
}

/** Modbus ADU error class. */
export class MasterError extends ErrorChain {
  public constructor(value?: string, cause?: Error) {
    super({ name: "ModbusMasterError", value }, cause);
  }
}

/** Modbus abstract ADU master. */
export abstract class Master<
  Req extends pdu.Request,
  Res extends pdu.Response,
  Exc extends pdu.Exception,
  L extends Log<Req, Res, Exc> = Log<Req, Res, Exc>
  > {

  /** Default values. */
  public static DEFAULT = {
    RETRY: 0,
    TIMEOUT: 5000,
  };

  /** Error codes. */
  public static ERROR = {
    TIMEOUT: "ModbusMasterTimeoutError",
  };

  /** Log names. */
  public static LOG = {
    REQUEST: "ModbusMasterRequest",
    RESPONSE: "ModbusMasterResponse",
    EXCEPTION: "ModbusMasterException",
  };

  /** Default number of retries performed during requests. */
  public readonly retry: number;

  /** Default timeout of requests. */
  public readonly timeout: number;

  /** Default retryWhen callback of requests. */
  public readonly retryWhen: IMasterRetryWhen<Req, Res, Exc>;

  /** Responses/exceptions stream. */
  public receive!: Subject<Res | Exc>;

  /** Requests stream. */
  public transmit!: Subject<Req>;

  /** Internal buffer. */
  public buffer!: Buffer;

  /** Internal log interface. */
  protected readonly log: L;

  /** Internal lock. */
  protected locked!: BehaviorSubject<boolean>;
  protected lockDelay = 0;

  protected get nextLockDelay(): number {
    return (++this.lockDelay * 20) % 200;
  }

  public constructor(options: IMasterRequestOptions<Req, Res, Exc, L>, logConstructor: any = Log) {
    this.retry = this.isRetry(options.retry || Master.DEFAULT.RETRY);
    this.timeout = this.isTimeout(options.timeout || Master.DEFAULT.TIMEOUT);
    this.retryWhen = this.isRetryWhen(options.retryWhen || this.defaultRetryWhen.bind(this));
    this.log = options.log || new logConstructor();
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status of coils in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfCoils Quantity of coils.
   * @param options Request options.
   */
  public readCoils(
    startingAddress: number,
    quantityOfCoils: number,
    options: IMasterRequestOptions<Req, Res, Exc, L> = {},
  ): Observable<Res> {
    const pduRequest = pdu.Master.readCoils(startingAddress, quantityOfCoils);
    const request = this.setupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.onRequest(request, options);
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status of discrete inputs in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfInputs Quantity of inputs.
   * @param options Request options.
   */
  public readDiscreteInputs(
    startingAddress: number,
    quantityOfInputs: number,
    options: IMasterRequestOptions<Req, Res, Exc, L> = {},
  ): Observable<Res> {
    const pduRequest = pdu.Master.readDiscreteInputs(startingAddress, quantityOfInputs);
    const request = this.setupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.onRequest(request, options);
  }

  /**
   * This function code is used to read  the contents of a contiguous block of holding registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   * @param options Request options.
   */
  public readHoldingRegisters(
    startingAddress: number,
    quantityOfRegisters: number,
    options: IMasterRequestOptions<Req, Res, Exc, L> = {},
  ): Observable<Res> {
    const pduRequest = pdu.Master.readHoldingRegisters(startingAddress, quantityOfRegisters);
    const request = this.setupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.onRequest(request, options);
  }

  /**
   * This function code is used to read from 1 to 125 contiguous input registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   * @param options Request options.
   */
  public readInputRegisters(
    startingAddress: number,
    quantityOfRegisters: number,
    options: IMasterRequestOptions<Req, Res, Exc, L> = {},
  ): Observable<Res> {
    const pduRequest = pdu.Master.readInputRegisters(startingAddress, quantityOfRegisters);
    const request = this.setupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.onRequest(request, options);
  }

  /**
   * This function code is used to write a single output to either ON or OFF in a remote device.
   * @param outputAddress Output address.
   * @param outputValue  Output value.
   * @param options Request options.
   */
  public writeSingleCoil(
    outputAddress: number,
    outputValue: boolean,
    options: IMasterRequestOptions<Req, Res, Exc, L> = {},
  ): Observable<Res> {
    const pduRequest = pdu.Master.writeSingleCoil(outputAddress, outputValue);
    const request = this.setupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.onRequest(request, options);
  }

  /**
   * This function code is used to write a single holding register in a remote device.
   * @param registerAddress Register address.
   * @param registerValue Register value.
   * @param options Request options.
   */
  public writeSingleRegister(
    registerAddress: number,
    registerValue: number,
    options: IMasterRequestOptions<Req, Res, Exc, L> = {},
  ): Observable<Res> {
    const pduRequest = pdu.Master.writeSingleRegister(registerAddress, registerValue);
    const request = this.setupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.onRequest(request, options);
  }

  /**
   * This function code is used to force each coil in a sequence of coils to either ON or OFF in a remote device.
   * @param startingAddress Starting address.
   * @param outputValues Output values.
   * @param options Request options.
   */
  public writeMultipleCoils(
    startingAddress: number,
    outputValues: boolean[],
    options: IMasterRequestOptions<Req, Res, Exc, L> = {},
  ): Observable<Res> {
    const pduRequest = pdu.Master.writeMultipleCoils(startingAddress, outputValues);
    const request = this.setupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.onRequest(request, options);
  }

  /**
   * This function code is used to write a block of contiguous registers (1 to 123 registers) in a remote device.
   * @param startingAddress Starting address.
   * @param registerValues Register values.
   * @param options Request options.
   */
  public writeMultipleRegisters(
    startingAddress: number,
    registerValues: number[],
    options: IMasterRequestOptions<Req, Res, Exc, L> = {},
  ): Observable<Res> {
    const pduRequest = pdu.Master.writeMultipleRegisters(startingAddress, registerValues);
    const request = this.setupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.onRequest(request, options);
  }

  /** Default retryWhen callback for conditional retries. */
  public defaultRetryWhen(
    master: Master<Req, Res, Exc>,
    retry: number,
    errorCount: number,
    error: any,
    request?: Req,
  ): void {
    // If error is a timeout, retry up to limit.
    if (this.isTimeoutError(error)) {
      if (errorCount >= retry) {
        throw new MasterError(Master.ERROR.TIMEOUT, error);
      }
    } else {
      // Rethrow unknown errors.
      throw new MasterError(error.code, error);
    }
  }

  // -----------------------------
  // Start implementation methods.

  /** Implemented by subclass to prepend/append data to request. */
  protected abstract setupRequest(functionCode: pdu.EFunctionCode, request: Buffer): Req;

  /** Implemented by subclass to filter responses based on request. */
  protected abstract matchResponse(request: Req, response: Res | Exc): boolean;

  /** Implemented by subclass to parse received data, returns length of parsed data */
  protected abstract parseResponse(data: Buffer): number;

  /** Setup observables. */
  protected onOpen(): void {
    this.receive = new Subject<Res | Exc>();
    this.transmit = new Subject<Req>();
    this.buffer = Buffer.allocUnsafe(0);
    this.locked = new BehaviorSubject(false);
  }

  /** Clean observables. */
  protected onClose(): void {
    this.receive.complete();
    this.transmit.complete();
    this.buffer = Buffer.allocUnsafe(0);
    this.locked.complete();
  }

  /** Receive data into internal buffer and try to parse responses. */
  protected onData(data: Buffer): void {
    this.log.bytesReceived(data.length);
    this.buffer = Buffer.concat([this.buffer, data]);
    const parsedLength = this.parseResponse(this.buffer);
    this.buffer = this.buffer.slice(parsedLength);
  }

  /** Send response/exception on observable stream. */
  protected onResponse(response: Res | Exc): void {
    if (response instanceof pdu.Response) {
      this.log.response(response);
    } else {
      this.log.exception(response);
    }
    this.receive.next(response);
  }

  // End implementation methods.
  // ---------------------------

  /** Validate number of retries (0+). */
  protected isRetry(value?: number): number {
    value = (value != null) ? value : this.retry;
    return Validate.isInteger(String(value), { min: 0 });
  }

  /** Validate timeout in milliseconds (50+). */
  protected isTimeout(value?: number): number {
    value = (value != null) ? value : this.timeout;
    return Validate.isInteger(String(value), { min: 50 });
  }

  /** Get retryWhen callback. */
  protected isRetryWhen(callback?: IMasterRetryWhen<Req, Res, Exc>): IMasterRetryWhen<Req, Res, Exc> {
    return callback || this.retryWhen;
  }

  /** Returns true if error is RxJS Timeout. */
  protected isTimeoutError(error: any): error is TimeoutError {
    const isInstance = (error instanceof TimeoutError);
    const hasName = (error.name === "TimeoutError");
    return (isInstance || hasName);
  }

  protected onRequest(request: Req, options: IMasterRequestOptions<Req, Res, Exc, L>): Observable<Res> {
    const retry = this.isRetry(options.retry);
    const timeout = this.isTimeout(options.timeout);
    const retryWhen = this.isRetryWhen(options.retryWhen);

    // Wait for master lock.
    return Observable.interval(this.nextLockDelay)
      .map(() => this.locked.value)
      .filter((locked) => !locked)
      .take(1)
      .switchMap(() => {
        // Lock and write via transmit subject.
        this.locked.next(true);
        this.transmitRequest(request);

        // Wait for response to be received.
        return this.receive
          .filter((response) => this.matchResponse(request, response))
          .timeout(timeout)
          .retryWhen((errors) => {
            return errors
              .scan((errorCount, error) => {
                errorCount += 1;
                // Throws error if retry not required.
                retryWhen(this, retry, errorCount, error, request);
                // Retransmit request and increment error counter.
                this.transmitRequest(request, errorCount);
                return errorCount;
              }, 0);
          })
          .take(1)
          .map((response) => {
            // Unlock and handle response.
            this.locked.next(false);
            if (response instanceof pdu.Response) {
              return response;
            }
            throw response;
          });
      })
      // Unlock master if error thrown.
      .catch((error) => {
        this.locked.next(false);
        return Observable.throw(error);
      });
  }

  /** Transmit request using transmit observable. */
  protected transmitRequest(request: Req, errorCount: number = 0): void {
    this.log.request(request, errorCount);
    this.log.bytesTransmitted(request.buffer.length);
    this.transmit.next(request);
  }

}
