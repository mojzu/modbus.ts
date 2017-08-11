/* tslint:disable:no-bitwise */
import {
  validAddress,
  validRegister,
  validQuantityOfBits,
  validQuantityOfRegisters,
  bitsToBytes,
} from "./utilities";
import {
  EModbusFunctionCode,
  EModbusExceptionCode,
  IModbusReadBits,
  IModbusReadRegisters,
  IModbusWriteBit,
  IModbusWriteRegister,
  IModbusWriteMultiple,
} from "./modbus";

/** Modbus PDU request. */
export class PduRequest {
  public constructor(
    public functionCode: number,
    public buffer: Buffer,
  ) { }
}

/** Modbus PDU response. */
export class PduResponse {
  public constructor(
    public functionCode: number,
    public data: any,
    public buffer: Buffer,
  ) { }
}

/** Modbus PDU exception. */
export class PduException {
  public constructor(
    public functionCode: number,
    public exceptionFunctionCode: number,
    public exceptionCode: number,
    public buffer: Buffer,
  ) { }
}

/**
 * Modbus PDU master.
 * Request factory for supported function codes.
 * TODO: Implement more Modbus function codes.
 */
export class PduMaster {

  /**
   * Create a new PDU exception.
   * @param functionCode Function code.
   * @param exceptionCode Exception code.
   */
  public static createException(
    functionCode: EModbusFunctionCode,
    exceptionCode: EModbusExceptionCode,
  ): PduException {
    const exceptionFunctionCode = (functionCode + 0x80) % 0xFF;
    const buffer = Buffer.allocUnsafe(2);
    buffer.writeUInt8(exceptionFunctionCode, 0);
    buffer.writeUInt8(exceptionCode, 1);

    return new PduException(
      functionCode,
      functionCode + 0x80,
      exceptionCode,
      buffer,
    );
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of coils in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfCoils Quantity of coils.
   */
  public static readCoils(startingAddress: number, quantityOfCoils: number): PduRequest {
    validAddress(startingAddress);
    validQuantityOfBits(quantityOfCoils);
    validAddress(startingAddress + quantityOfCoils);

    const functionCode = EModbusFunctionCode.ReadCoils;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfCoils, 3);

    return new PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read from 1 to 2000 contiguous status
   * of discrete inputs in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfInputs Quantity of inputs.
   */
  public static readDiscreteInputs(startingAddress: number, quantityOfInputs: number): PduRequest {
    validAddress(startingAddress);
    validQuantityOfBits(quantityOfInputs);
    validAddress(startingAddress + quantityOfInputs);

    const functionCode = EModbusFunctionCode.ReadDiscreteInputs;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfInputs, 3);

    return new PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read  the contents of a contiguous block
   * of holding registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public static readHoldingRegisters(startingAddress: number, quantityOfRegisters: number): PduRequest {
    validAddress(startingAddress);
    validQuantityOfRegisters(quantityOfRegisters);
    validAddress(startingAddress + quantityOfRegisters);

    const functionCode = EModbusFunctionCode.ReadHoldingRegisters;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return new PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to read from 1 to 125 contiguous input
   * registers in a remote device.
   * @param startingAddress Starting address.
   * @param quantityOfRegisters Quantity of registers.
   */
  public static readInputRegisters(startingAddress: number, quantityOfRegisters: number): PduRequest {
    validAddress(startingAddress);
    validQuantityOfRegisters(quantityOfRegisters);
    validAddress(startingAddress + quantityOfRegisters);

    const functionCode = EModbusFunctionCode.ReadInputRegisters;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(quantityOfRegisters, 3);

    return new PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a single output to either ON
   * or OFF in a remote device.
   * @param outputAddress Output address.
   * @param outputValue  Output value.
   */
  public static writeSingleCoil(outputAddress: number, outputValue: boolean): PduRequest {
    validAddress(outputAddress);

    const functionCode = EModbusFunctionCode.WriteSingleCoil;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(outputAddress, 1);
    buffer.writeUInt16BE((!!outputValue ? 0xFF00 : 0x0000), 3);

    return new PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a single holding register
   * in a remote device.
   * @param registerAddress Register address.
   * @param registerValue Register value.
   */
  public static writeSingleRegister(registerAddress: number, registerValue: number): PduRequest {
    validAddress(registerAddress);
    validRegister(registerValue);

    const functionCode = EModbusFunctionCode.WriteSingleRegister;
    const buffer = Buffer.allocUnsafe(5);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(registerAddress, 1);
    buffer.writeUInt16BE(registerValue, 3);

    return new PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to force each coil in a sequence of coils to
   * either ON or OFF in a remote device.
   * @param startingAddress Starting address.
   * @param outputValues Output values.
   */
  public static writeMultipleCoils(startingAddress: number, outputValues: boolean[]): PduRequest {
    validAddress(startingAddress);
    validQuantityOfBits(outputValues.length, 0x7B0);
    validAddress(startingAddress + outputValues.length);

    const functionCode = EModbusFunctionCode.WriteMultipleCoils;
    const [byteCount, byteValues] = bitsToBytes(outputValues);
    const buffer = Buffer.allocUnsafe(6 + byteCount);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(outputValues.length, 3);
    buffer.writeUInt8(byteCount, 5);
    byteValues.map((value, index) => {
      buffer.writeUInt8(value, 6 + index);
    });

    return new PduRequest(functionCode, buffer);
  }

  /**
   * This function code is used to write a block of contiguous registers
   * (1 to 123 registers) in a remote device.
   * @param startingAddress Starting address.
   * @param registerValues Register values.
   */
  public static writeMultipleRegisters(startingAddress: number, registerValues: number[]): PduRequest {
    validAddress(startingAddress);
    validQuantityOfRegisters(registerValues.length, 0x7B);
    validAddress(startingAddress + registerValues.length);
    registerValues.map((value) => {
      validRegister(value);
    });

    const functionCode = EModbusFunctionCode.WriteMultipleRegisters;
    const byteCount = registerValues.length * 2;
    const buffer = Buffer.allocUnsafe(6 + byteCount);
    buffer.writeUInt8(functionCode, 0);
    buffer.writeUInt16BE(startingAddress, 1);
    buffer.writeUInt16BE(registerValues.length, 3);
    buffer.writeUInt8(byteCount, 5);
    registerValues.map((value, index) => {
      buffer.writeUInt16BE(value, 6 + (index * 2));
    });

    return new PduRequest(functionCode, buffer);
  }

  /**
   * Parse response buffer into PDU response or exception.
   * @param buffer Response buffer.
   */
  public static responseHandler(buffer: Buffer): PduResponse | PduException {
    const functionCode = buffer.readUInt8(0);
    const response = buffer.slice(1);

    if (functionCode >= 0x80) {
      // Buffer contains an exception response.
      const exceptionCode = buffer.readUInt8(1);
      return PduMaster.createException((functionCode - 0x80), exceptionCode);
    }

    switch (functionCode) {
      case EModbusFunctionCode.ReadCoils:
      case EModbusFunctionCode.ReadDiscreteInputs: {
        const data = PduMaster.readBitsResponseHandler(response);
        return new PduResponse(functionCode, data, buffer);
      }
      case EModbusFunctionCode.ReadHoldingRegisters:
      case EModbusFunctionCode.ReadInputRegisters: {
        const data = PduMaster.readRegistersResponseHandler(response);
        return new PduResponse(functionCode, data, buffer);
      }
      case EModbusFunctionCode.WriteSingleCoil: {
        const data = PduMaster.writeBitResponseHandler(response);
        return new PduResponse(functionCode, data, buffer);
      }
      case EModbusFunctionCode.WriteSingleRegister: {
        const data = PduMaster.writeRegisterResponseHandler(response);
        return new PduResponse(functionCode, data, buffer);
      }
      case EModbusFunctionCode.WriteMultipleCoils:
      case EModbusFunctionCode.WriteMultipleRegisters: {
        const data = PduMaster.writeMultipleResponseHandler(response);
        return new PduResponse(functionCode, data, buffer);
      }
      default: {
        // Unsupported function code, convert to exception.
        return PduMaster.createException(functionCode, EModbusExceptionCode.IllegalFunctionCode);
      }
    }
  }

  public static readBitsResponseHandler(buffer: Buffer): IModbusReadBits {
    const bytes = buffer.readUInt8(0);
    const values: boolean[] = [];
    for (let i = 0; i < bytes; i++) {
      const byte = buffer.readUInt8(1 + i);
      for (let j = 0; j < 8; j++) {
        values.push(!!(byte & (0x1 << j)));
      }
    }
    return { bytes, values };
  }

  public static readRegistersResponseHandler(buffer: Buffer): IModbusReadRegisters {
    const bytes = buffer.readUInt8(0);
    const values: number[] = [];
    for (let i = 0; i < (bytes / 2); i++) {
      values[i] = buffer.readUInt16BE(1 + (i * 2));
    }
    return { bytes, values };
  }

  public static writeBitResponseHandler(buffer: Buffer): IModbusWriteBit {
    const address = buffer.readUInt16BE(0);
    const value = (buffer.readUInt16BE(2) === 0xFF00) ? true : false;
    return { address, value };
  }

  public static writeRegisterResponseHandler(buffer: Buffer): IModbusWriteRegister {
    const address = buffer.readUInt16BE(0);
    const value = buffer.readUInt16BE(2);
    return { address, value };
  }

  public static writeMultipleResponseHandler(buffer: Buffer): IModbusWriteMultiple {
    const address = buffer.readUInt16BE(0);
    const quantity = buffer.readUInt16BE(2);
    return { address, quantity };
  }

}
