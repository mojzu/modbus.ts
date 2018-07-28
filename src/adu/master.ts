import { ErrorChain } from "container.ts/lib/error";
import { isInteger } from "container.ts/lib/validate";
import * as debug from "debug";
import { Observable, of, Subject, throwError, TimeoutError } from "rxjs";
import {
  catchError,
  concatMap,
  filter,
  map,
  mergeMap,
  retryWhen as rxjsRetryWhen,
  scan,
  take,
  timeout as rxjsTimeout
} from "rxjs/operators";
import * as pdu from "../pdu";

/** Master error codes. */
export enum EMasterError {
  Timeout = "ModbusMasterTimeoutError"
}

/** Modbus ADU error class. */
export class MasterError extends ErrorChain {
  public constructor(value?: string, cause?: Error) {
    super({ name: "ModbusMasterError", value }, cause);
  }
}

/** Master log names. */
export enum EMasterLog {
  Request = "ModbusMasterRequest",
  Response = "ModbusMasterResponse",
  Exception = "ModbusMasterException",
  Error = "MasterMasterError"
}

/** Master log interface. */
export class MasterLog<Req extends pdu.Request, Res extends pdu.Response, Exc extends pdu.Exception> {
  protected readonly debug = debug("modbus.ts");
  public request(request: Req, errorCount: number): void {
    this.debug(EMasterLog.Request, request, errorCount);
  }
  public response(response: Res): void {
    this.debug(EMasterLog.Response, response);
  }
  public exception(exception: Exc): void {
    this.debug(EMasterLog.Exception, exception);
  }
  public error(error: any): void {
    this.debug(EMasterLog.Error, error);
  }
  public bytesTransmitted(value: number): void {}
  public bytesReceived(value: number): void {}
}

/** Conditional retry callback type. */
export type IMasterRetryWhen<Req extends pdu.Request, Res extends pdu.Response, Exc extends pdu.Exception> = (
  master: Master<Req, Res, Exc>,
  retry: number,
  errorCount: number,
  error: any,
  request?: Req
) => void;

/** Modbus ADU master request options. */
export interface IMasterRequestOptions<
  Req extends pdu.Request,
  Res extends pdu.Response,
  Exc extends pdu.Exception,
  L extends MasterLog<Req, Res, Exc> = MasterLog<Req, Res, Exc>
> {
  retry?: number;
  timeout?: number;
  retryWhen?: IMasterRetryWhen<Req, Res, Exc>;
  log?: L;
}

/** Internal queue in type. */
export interface IMasterQueueIn<
  Req extends pdu.Request,
  Res extends pdu.Response,
  Exc extends pdu.Exception,
  L extends MasterLog<Req, Res, Exc> = MasterLog<Req, Res, Exc>
> {
  id: number;
  request: Req;
  options: IMasterRequestOptions<Req, Res, Exc, L>;
}

/** Internal queue out type. */
export interface IMasterQueueOut<Res extends pdu.Response> {
  id: number;
  response?: Res;
  error?: any;
}

/** Modbus abstract ADU master. */
export abstract class Master<
  Req extends pdu.Request,
  Res extends pdu.Response,
  Exc extends pdu.Exception,
  L extends MasterLog<Req, Res, Exc> = MasterLog<Req, Res, Exc>
> {
  /** Returns true if error is RxJS Timeout. */
  public static isTimeoutError(error: any): error is TimeoutError {
    const isInstance = error instanceof TimeoutError;
    const hasName = error.name === "TimeoutError";
    return isInstance || hasName;
  }

  /** Returns true if error is MasterError. */
  public static isMasterError(error: any): error is MasterError {
    const isInstance = error instanceof MasterError;
    const hasName = error.name === "ModbusMasterError";
    return isInstance || hasName;
  }

  /** Default number of retries performed during requests. */
  public readonly retry: number;

  /** Default timeout of requests. */
  public readonly timeout: number;

  /** Default retryWhen callback of requests. */
  public readonly retryWhen: IMasterRetryWhen<Req, Res, Exc>;

  /** Responses/exceptions stream. */
  public receive = new Subject<Res | Exc>();

  /** Requests stream. */
  public transmit = new Subject<Req>();

  /** Internal log interface. */
  protected readonly log: L;

  /** Internal transmit input queue. */
  protected queueIn = new Subject<IMasterQueueIn<Req, Res, Exc, L>>();

  /** Internal transmit output queue. */
  protected queueOut = new Subject<IMasterQueueOut<Res>>();

  /** Queue ID counter. */
  protected queueCounter = 0;

  /** Internal buffer. */
  protected buffer = Buffer.allocUnsafe(0);

  public constructor(options: IMasterRequestOptions<Req, Res, Exc, L>, logConstructor: any = MasterLog) {
    this.retry = options.retry != null ? this.isRetry(options.retry) : 0;
    this.timeout = options.timeout != null ? this.isTimeout(options.timeout) : 5000;
    this.retryWhen = this.isRetryWhen(options.retryWhen || this.masterDefaultRetryWhen.bind(this));
    this.log = options.log || new logConstructor();
    this.masterReset();
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
    options: IMasterRequestOptions<Req, Res, Exc, L> = {}
  ): Observable<Res> {
    const pduRequest = pdu.Master.readCoils(startingAddress, quantityOfCoils);
    const request = this.masterSetupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.masterOnQueue(request, options);
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
    options: IMasterRequestOptions<Req, Res, Exc, L> = {}
  ): Observable<Res> {
    const pduRequest = pdu.Master.readDiscreteInputs(startingAddress, quantityOfInputs);
    const request = this.masterSetupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.masterOnQueue(request, options);
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
    options: IMasterRequestOptions<Req, Res, Exc, L> = {}
  ): Observable<Res> {
    const pduRequest = pdu.Master.readHoldingRegisters(startingAddress, quantityOfRegisters);
    const request = this.masterSetupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.masterOnQueue(request, options);
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
    options: IMasterRequestOptions<Req, Res, Exc, L> = {}
  ): Observable<Res> {
    const pduRequest = pdu.Master.readInputRegisters(startingAddress, quantityOfRegisters);
    const request = this.masterSetupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.masterOnQueue(request, options);
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
    options: IMasterRequestOptions<Req, Res, Exc, L> = {}
  ): Observable<Res> {
    const pduRequest = pdu.Master.writeSingleCoil(outputAddress, outputValue);
    const request = this.masterSetupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.masterOnQueue(request, options);
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
    options: IMasterRequestOptions<Req, Res, Exc, L> = {}
  ): Observable<Res> {
    const pduRequest = pdu.Master.writeSingleRegister(registerAddress, registerValue);
    const request = this.masterSetupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.masterOnQueue(request, options);
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
    options: IMasterRequestOptions<Req, Res, Exc, L> = {}
  ): Observable<Res> {
    const pduRequest = pdu.Master.writeMultipleCoils(startingAddress, outputValues);
    const request = this.masterSetupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.masterOnQueue(request, options);
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
    options: IMasterRequestOptions<Req, Res, Exc, L> = {}
  ): Observable<Res> {
    const pduRequest = pdu.Master.writeMultipleRegisters(startingAddress, registerValues);
    const request = this.masterSetupRequest(pduRequest.functionCode, pduRequest.buffer);
    return this.masterOnQueue(request, options);
  }

  /**
   * Default retryWhen callback for conditional retries.
   * This will allow retries in cases of timeout and throw all other errors.
   */
  public masterDefaultRetryWhen(
    master: Master<Req, Res, Exc>,
    retry: number,
    errorCount: number,
    error: any,
    request?: Req
  ): void {
    if (Master.isTimeoutError(error)) {
      // If error is a timeout, retry up to limit.
      if (errorCount >= retry) {
        throw new MasterError(EMasterError.Timeout, error);
      }
    } else if (Master.isMasterError(error)) {
      // If error is a master error, rethrow now.
      throw error;
    } else {
      // Wrap and rethrow unknown errors.
      throw new MasterError(error.code, error);
    }
  }

  // -----------------------------
  // Start implementation methods.
  // To implement a subclass, it must provide the following abstract methods.
  // When receiving data it must call the methods below to implement response handling.
  // It must subscribe to the `transmit` subject of this class and send the data contained within.

  /** Implemented by subclass to prepend/append data to request. */
  protected abstract masterSetupRequest(functionCode: pdu.EFunctionCode, request: Buffer): Req;

  /** Implemented by subclass to filter responses based on request. */
  protected abstract masterMatchResponse(request: Req, response: Res | Exc): boolean;

  /** Implemented by subclass to parse received data, returns length of parsed data. */
  protected abstract masterParseResponse(data: Buffer): number;

  /** Reset master internal state, must be called by subclass when (re)creating a connection. */
  protected masterReset(): void {
    this.masterDestroy();
    this.receive = new Subject<Res | Exc>();
    this.transmit = new Subject<Req>();
    this.queueIn = new Subject<IMasterQueueIn<Req, Res, Exc, L>>();
    this.queueOut = new Subject<IMasterQueueOut<Res>>();

    // Subscribe to queue input, make requests in sequence.
    this.queueIn
      .pipe(
        concatMap((item) => {
          return this.masterOnRequest(item.id, item.request, item.options);
        }),
        map((response) => this.queueOut.next(response)),
        // Throwing here would end subscription, catch and log.
        catchError((error) => {
          this.log.error(error);
          return of(undefined);
        })
      )
      .subscribe();
  }

  /** Complete internal observable state, must be called by subclass on destruction. */
  protected masterDestroy(): void {
    this.buffer = Buffer.allocUnsafe(0);
    this.receive.complete();
    this.transmit.complete();
    this.queueIn.complete();
    this.queueOut.complete();
  }

  /**
   * Receive data into internal buffer and try to parse responses.
   * Must be called by subclass after receiving data via connection for internal buffer management.
   * If a response is succesfully parsed then `masterOnResponse` shall be called with the result.
   */
  protected masterOnData(data: Buffer): void {
    this.log.bytesReceived(data.length);
    this.buffer = Buffer.concat([this.buffer, data]);
    const parsedLength = this.masterParseResponse(this.buffer);
    this.buffer = this.buffer.slice(parsedLength);
  }

  /**
   * Response or exception parsed from incoming data by subclass.
   * Must be called by subclass after a response is successfully parsed from data.
   */
  protected masterOnResponse(response: Res | Exc): void {
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
    value = value != null ? value : this.retry;
    return isInteger(String(value), { min: 0 });
  }

  /** Validate timeout in milliseconds (50+). */
  protected isTimeout(value?: number): number {
    value = value != null ? value : this.timeout;
    return isInteger(String(value), { min: 50 });
  }

  /** Get retryWhen callback. */
  protected isRetryWhen(callback?: IMasterRetryWhen<Req, Res, Exc>): IMasterRetryWhen<Req, Res, Exc> {
    return callback || this.retryWhen;
  }

  /** Master queue handler for requests. */
  protected masterOnQueue(request: Req, options: IMasterRequestOptions<Req, Res, Exc, L>): Observable<Res> {
    // Generate ID using counter and emit on input queue.
    const id = ++this.queueCounter;
    this.queueIn.next({ id, request, options });

    // Filter queue output to get response/error for this request.
    return this.queueOut.pipe(
      filter((out) => out.id === id),
      take(1),
      mergeMap((out) => {
        if (out.response != null) {
          return of(out.response);
        }
        return throwError(out.error);
      })
    );
  }

  /** Master handler for requests, sends request, waits for and matches responses. */
  protected masterOnRequest(
    id: number,
    request: Req,
    options: IMasterRequestOptions<Req, Res, Exc, L>
  ): Observable<IMasterQueueOut<Res>> {
    const retry = this.isRetry(options.retry);
    const timeout = this.isTimeout(options.timeout);
    const retryWhen = this.isRetryWhen(options.retryWhen);

    // Transmit request via subject.
    this.log.request(request, 0);
    this.log.bytesTransmitted(request.buffer.length);
    this.transmit.next(request);

    // Wait for responses on receive subject.
    return this.receive.pipe(
      // Match responses to requests using subclass method.
      filter((response) => this.masterMatchResponse(request, response)),
      // Timeout based on options.
      rxjsTimeout(timeout),
      // Handle retries using retryWhen callback.
      rxjsRetryWhen((errors) => {
        return errors.pipe(
          scan((errorCount, error) => {
            // Throws error if retry not required.
            errorCount += 1;
            retryWhen(this as any, retry, errorCount, error, request);

            // Retransmit request and increment error counter.
            this.log.request(request, errorCount);
            this.log.bytesTransmitted(request.buffer.length);
            this.transmit.next(request);
            return errorCount;
          }, 0)
        );
      }),
      take(1),
      map((response) => {
        // Return response or error if exception.
        if (response instanceof pdu.Response) {
          return { id, response };
        }
        return { id, error: response };
      }),
      catchError((error) => {
        return of({ id, error });
      })
    );
  }
}
