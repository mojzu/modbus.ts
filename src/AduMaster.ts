import * as debug from "debug";
import { Validate } from "container.ts/lib/validate";
import {
  Observable,
  Subject,
  TimeoutError,
} from "./rxjs";
import {
  EModbusFunctionCode,
} from "./modbus";
import {
  PduRequest,
  PduResponse,
  PduException,
  PduMaster,
} from "./PduMaster";

/** Conditional retry callback type. */
export type IAduMasterRetryWhen = (
  master: AduMaster<any, any, any>,
  request: PduRequest,
  retry: number,
  errorCount: number,
  error: any,
) => void;

/** Modbus ADU master request options. */
export interface IAduMasterRequestOptions {
  retry?: number;
  timeout?: number;
  retryWhen?: IAduMasterRetryWhen;
}

/** Modbus abstract ADU master. */
export abstract class AduMaster
  <REQUEST extends PduRequest, RESPONSE extends PduResponse, EXCEPTION extends PduException> {

  public static DEFAULT_RETRY = 0;
  public static DEFAULT_TIMEOUT = 5000;

  /** Error codes. */
  public static ERROR = {
    TIMEOUT: "TimeoutError",
  };

  private _buffer: Buffer;
  private _receive: Subject<RESPONSE | EXCEPTION>;
  private _transmit: Subject<REQUEST>;
  private _error: Subject<any>;
  private _errorCode: string | null = null;

  private _debug: debug.IDebugger;
  private _retry: number;
  private _timeout: number;
  private _retryWhen: IAduMasterRetryWhen;

  private _bytesReceived = 0;
  private _bytesTransmitted = 0;

  /** Master internal debugging interface. */
  public get debug(): debug.IDebugger {
    if (this._debug != null) {
      return this._debug;
    }
    // Dummy callback for undefined namespace.
    return (() => { }) as any;
  }

  /** Default number of retries performed during requests. */
  public get retry(): number { return this._retry; }

  /** Default timeout of requests. */
  public get timeout(): number { return this._timeout; }

  /** Default retryWhen callback of requests. */
  public get retryWhen(): IAduMasterRetryWhen { return this._retryWhen; }

  /** Responses/exceptions stream. */
  public get receive(): Observable<RESPONSE | EXCEPTION> { return this._receive; }

  /** Requests stream. */
  public get transmit(): Observable<REQUEST> { return this._transmit; }

  /** Socket errors stream. */
  public get error(): Observable<any> { return this._error; }

  /** Last error code returned by master. */
  public get errorCode(): string | null { return this._errorCode; }

  /** Number of bytes received by master. */
  public get bytesReceived(): number { return this._bytesReceived; }

  /** Number of bytes transmitted by master. */
  public get bytesTransmitted(): number { return this._bytesTransmitted; }

  public constructor(options: IAduMasterRequestOptions, namespace?: string) {
    this._retry = this.validRetry(options.retry || AduMaster.DEFAULT_RETRY);
    this._timeout = this.validTimeout(options.timeout || AduMaster.DEFAULT_TIMEOUT);
    this._retryWhen = this.retryWhenHandler(options.retryWhen || this.defaultRetryWhen.bind(this));

    if (namespace != null) {
      this._debug = debug(namespace);
    }
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of coils in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfCoils Quantity of coils.
   * @param options Request options.
   */
  public readCoils(
    startingAddress: number,
    quantityOfCoils: number,
    options: IAduMasterRequestOptions = {},
  ): Observable<RESPONSE> {
    const pduRequest = PduMaster.readCoils(startingAddress, quantityOfCoils);
    const request = this.wrapRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.requestHandler(request, options);
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of discrete inputs in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfInputs Quantity of inputs.
   * @param options Request options.
   */
  public readDiscreteInputs(
    startingAddress: number,
    quantityOfInputs: number,
    options: IAduMasterRequestOptions = {},
  ): Observable<RESPONSE> {
    const pduRequest = PduMaster.readDiscreteInputs(startingAddress, quantityOfInputs);
    const request = this.wrapRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.requestHandler(request, options);
  }

  /**
   * This function code is used to read  the contents of a contiguous block
   * of holding registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   * @param options Request options.
   */
  public readHoldingRegisters(
    startingAddress: number,
    quantityOfRegisters: number,
    options: IAduMasterRequestOptions = {},
  ): Observable<RESPONSE> {
    const pduRequest = PduMaster.readHoldingRegisters(startingAddress, quantityOfRegisters);
    const request = this.wrapRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.requestHandler(request, options);
  }

  /**
   * This function code is used to read from 1 to 125 contiguous input
   * registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   * @param options Request options.
   */
  public readInputRegisters(
    startingAddress: number,
    quantityOfRegisters: number,
    options: IAduMasterRequestOptions = {},
  ): Observable<RESPONSE> {
    const pduRequest = PduMaster.readInputRegisters(startingAddress, quantityOfRegisters);
    const request = this.wrapRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.requestHandler(request, options);
  }

  /**
   * This function code is used to write a single output to either ON
   * or OFF in a remote device.
   * @param outputAddress Output address.
   * @param outputValue  Output value.
   * @param options Request options.
   */
  public writeSingleCoil(
    outputAddress: number,
    outputValue: boolean,
    options: IAduMasterRequestOptions = {},
  ): Observable<RESPONSE> {
    const pduRequest = PduMaster.writeSingleCoil(outputAddress, outputValue);
    const request = this.wrapRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.requestHandler(request, options);
  }

  /**
   * This function code is used to write a single holding register
   * in a remote device.
   * @param registerAddress Register address.
   * @param registerValue Register value.
   * @param options Request options.
   */
  public writeSingleRegister(
    registerAddress: number,
    registerValue: number,
    options: IAduMasterRequestOptions = {},
  ): Observable<RESPONSE> {
    const pduRequest = PduMaster.writeSingleRegister(registerAddress, registerValue);
    const request = this.wrapRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.requestHandler(request, options);
  }

  /**
   * This function code is used to force each coil in a sequence of coils to
   * either ON or OFF in a remote device.
   * @param startingAddress Starting address.
   * @param outputValues Output values.
   * @param options Request options.
   */
  public writeMultipleCoils(
    startingAddress: number,
    outputValues: boolean[],
    options: IAduMasterRequestOptions = {},
  ): Observable<RESPONSE> {
    const pduRequest = PduMaster.writeMultipleCoils(startingAddress, outputValues);
    const request = this.wrapRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.requestHandler(request, options);
  }

  /**
   * This function code is used to write a block of contiguous registers
   * (1 to 123 registers) in a remote device.
   * @param startingAddress Starting address.
   * @param registerValues Register values.
   * @param options Request options.
   */
  public writeMultipleRegisters(
    startingAddress: number,
    registerValues: number[],
    options: IAduMasterRequestOptions = {},
  ): Observable<RESPONSE> {
    const pduRequest = PduMaster.writeMultipleRegisters(startingAddress, registerValues);
    const request = this.wrapRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.requestHandler(request, options);
  }

  /** (Re)create internal properties. */
  protected create(): void {
    this.destroy();

    // Create observables.
    this._receive = new Subject<RESPONSE | EXCEPTION>();
    this._transmit = new Subject<REQUEST>();
    this._error = new Subject<any>();
  }

  /** Destroy internal properties. */
  protected destroy(): void {
    this._buffer = Buffer.allocUnsafe(0);

    // Observable clean up.
    if (this._receive != null) { this._receive.complete(); }
    if (this._transmit != null) { this._transmit.complete(); }
    if (this._error != null) { this._error.complete(); }
  }

  /** Validate number of retries (0-20). */
  protected validRetry(value?: number): number {
    value = (typeof value === "number") ? value : this.retry;
    return Validate.isInteger(String(value), { min: 0, max: 20 });
  }

  /** Validate and convert timeout in seconds to milliseconds (50-120000). */
  protected validTimeout(value?: number): number {
    value = (typeof value === "number") ? value : this.timeout;
    return Validate.isInteger(String(value), { min: 50, max: 120000 });
  }

  /** Get retry when callback. */
  protected retryWhenHandler(callback?: IAduMasterRetryWhen): IAduMasterRetryWhen {
    return callback || this.retryWhen;
  }

  /** Default retryWhen callback for conditional retries. */
  protected defaultRetryWhen(
    master: AduMaster<any, any, any>,
    request: REQUEST,
    retry: number,
    errorCount: number,
    error: any,
  ): void {
    // If error is a timeout, retry up to limit.
    if (error instanceof TimeoutError) {
      if (errorCount >= retry) {
        throw AduMaster.ERROR.TIMEOUT;
      }
    } else {
      // Rethrow unknown errors.
      throw error;
    }
  }

  /** Send response/exception on observable stream. */
  protected receiveResponse(response: RESPONSE | EXCEPTION): void {
    this._receive.next(response);
  }

  /** Set error/code with unknown error. */
  protected setError(error: any): void {
    this._error.next(error);

    // Set error code if available.
    // TODO: Improve error code detection.
    if (error.code != null) {
      this._errorCode = error.code;
    } else {
      this._errorCode = error;
    }
  }

  /** Implemented by subclass to prepend/append data to request. */
  protected abstract wrapRequest(functionCode: EModbusFunctionCode, request: Buffer): REQUEST;

  /** Implemented by subclass to filter responses based on request. */
  protected abstract matchResponse(request: REQUEST, response: RESPONSE | EXCEPTION): boolean;

  /** Implemented by subclass to parse received data, returns length of parsed data */
  protected abstract parseResponse(data: Buffer): number;

  protected requestHandler(request: REQUEST, options: IAduMasterRequestOptions): Observable<RESPONSE> {
    const retry = this.validRetry(options.retry);
    const timeout = this.validTimeout(options.timeout);
    const retryWhen = this.retryWhenHandler(options.retryWhen);

    // Write via transmit subject.
    this.transmitRequest(request);

    // Wait for response to be received.
    return this._receive
      .filter((response) => this.matchResponse(request, response))
      .take(1)
      .timeout(timeout)
      .switchMap((response) => {
        if (response instanceof PduResponse) {
          return Observable.of(response);
        } else {
          return Observable.throw(response);
        }
      })
      .retryWhen((errors) => {
        return errors
          .scan((errorCount, error) => {
            // Throws error if retry not required.
            retryWhen(this, request, retry, errorCount, error);
            // Retransmit request and increment counter.
            this.transmitRequest(request);
            return (errorCount + 1);
          }, 0);
      });
  }

  /** Transmit request using transmit observable. */
  protected transmitRequest(request: REQUEST): void {
    this._transmit.next(request);
    this._bytesTransmitted += request.buffer.length;
  }

  /** Receive data into internal buffer and try to parse responses. */
  protected receiveData(data: Buffer): void {
    this._buffer = Buffer.concat([this._buffer, data]);
    this._bytesReceived += data.length;
    const parsedLength = this.parseResponse(this._buffer);
    this._buffer = this._buffer.slice(parsedLength);
  }

}
