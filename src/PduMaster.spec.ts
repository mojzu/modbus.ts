/// <reference types="jasmine" />
import {
  EModbusFunctionCode,
  EModbusExceptionCode,
  IModbusReadCoils,
  IModbusReadDiscreteInputs,
  IModbusReadHoldingRegisters,
  IModbusReadInputRegisters,
  IModbusWriteSingleCoil,
  IModbusWriteSingleRegister,
  IModbusWriteMultipleCoils,
  IModbusWriteMultipleRegisters,
} from "./modbus";
import {
  PduResponse,
  PduException,
  PduMaster,
} from "./PduMaster";
import { MockPduSlave } from "./PduSlave.mock";

describe("PduMaster", () => {

  // TODO: Test coil/input bit off handling.
  // TODO: Test coil/input bit multiple byte handling.
  const slave = new MockPduSlave();

  const readCoilsRequest = PduMaster.readCoils(0x0020, 5);
  const readCoilsServerResponse = slave.requestHandler(readCoilsRequest.buffer);
  const readCoilsClientResponse = PduMaster.responseHandler(readCoilsServerResponse.buffer);

  const readDiscreteInputsRequest = PduMaster.readDiscreteInputs(0x0040, 4);
  const readDiscreteInputsServerResponse = slave.requestHandler(readDiscreteInputsRequest.buffer);
  const readDiscreteInputsClientResponse = PduMaster.responseHandler(readDiscreteInputsServerResponse.buffer);

  const readHoldingRegistersRequest = PduMaster.readHoldingRegisters(0xFF00, 2);
  const readHoldingRegistersServerResponse = slave.requestHandler(readHoldingRegistersRequest.buffer);
  const readHoldingRegistersClientResponse = PduMaster.responseHandler(readHoldingRegistersServerResponse.buffer);

  const readInputRegistersRequest = PduMaster.readInputRegisters(0xAFAF, 1);
  const readInputRegistersServerResponse = slave.requestHandler(readInputRegistersRequest.buffer);
  const readInputRegistersClientResponse = PduMaster.responseHandler(readInputRegistersServerResponse.buffer);

  const writeSingleCoilRequest = PduMaster.writeSingleCoil(0x00FF, true);
  const writeSingleCoilServerResponse = slave.requestHandler(writeSingleCoilRequest.buffer);
  const writeSingleCoilClientResponse = PduMaster.responseHandler(writeSingleCoilServerResponse.buffer);

  const writeSingleRegisterRequest = PduMaster.writeSingleRegister(0x4000, 0xABCD);
  const writeSingleRegisterServerResponse = slave.requestHandler(writeSingleRegisterRequest.buffer);
  const writeSingleRegisterClientResponse = PduMaster.responseHandler(writeSingleRegisterServerResponse.buffer);

  const writeMultipleCoilsRequest = PduMaster.writeMultipleCoils(0x2000, [true, false, true, false]);
  const writeMultipleCoilsServerResponse = slave.requestHandler(writeMultipleCoilsRequest.buffer);
  const writeMultipleCoilsClientResponse = PduMaster.responseHandler(writeMultipleCoilsServerResponse.buffer);

  const writeMultipleRegistersRequest = PduMaster.writeMultipleRegisters(0x2000, [0x0001, 0x0002, 0x0003]);
  const writeMultipleRegistersServerResponse = slave.requestHandler(writeMultipleRegistersRequest.buffer);
  const writeMultipleRegistersClientResponse = PduMaster.responseHandler(writeMultipleRegistersServerResponse.buffer);

  it("Read coils request", () => {
    const buffer = readCoilsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.ReadCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x0020);
    expect(buffer.readUInt16BE(3)).toEqual(5);
  });

  it("Read coils starting address argument validation", () => {
    try {
      PduMaster.readCoils(0xFF0000, 1);
      fail();
    } catch (error) {
      expect(error instanceof Error).toEqual(true);
    }
  });

  it("Read coils quantity of coils argument validation", () => {
    try {
      PduMaster.readCoils(0x0000, -1);
      fail();
    } catch (error) {
      expect(error instanceof Error).toEqual(true);
    }
  });

  it("Read coils server response", () => {
    const buffer = readCoilsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.ReadCoils);
    expect(buffer.readUInt8(1)).toEqual(1);
    expect(buffer.readUInt8(2)).toEqual(0x15);
  });

  it("Read coils client response", () => {
    if (readCoilsClientResponse instanceof PduResponse) {
      const data: IModbusReadCoils = readCoilsClientResponse.data;
      expect(data.bytes).toEqual(1);
      expect(data.values).toEqual([true, false, true, false, true, false, false, false]);
    } else {
      fail(readCoilsClientResponse);
    }
  });

  it("Read coils exception parsed by client", () => {
    const exception = PduMaster.createException(EModbusFunctionCode.ReadCoils, EModbusExceptionCode.IllegalDataAddress);
    const clientResponse = PduMaster.responseHandler(exception.buffer);
    expect(clientResponse instanceof PduException).toEqual(true);
    expect(clientResponse.functionCode).toEqual(EModbusFunctionCode.ReadCoils);
  });

  it("Read discrete inputs request", () => {
    const buffer = readDiscreteInputsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.ReadDiscreteInputs);
    expect(buffer.readUInt16BE(1)).toEqual(0x0040);
    expect(buffer.readUInt16BE(3)).toEqual(4);
  });

  it("Read discrete inputs server response", () => {
    const buffer = readDiscreteInputsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.ReadDiscreteInputs);
    expect(buffer.readUInt8(1)).toEqual(1);
    expect(buffer.readUInt8(2)).toEqual(0x5);
  });

  it("Read discrete inputs client response", () => {
    if (readDiscreteInputsClientResponse instanceof PduResponse) {
      const data: IModbusReadDiscreteInputs = readDiscreteInputsClientResponse.data;
      expect(data.bytes).toEqual(1);
      expect(data.values).toEqual([true, false, true, false, false, false, false, false]);
    } else {
      fail(readDiscreteInputsClientResponse);
    }
  });

  it("Read holding registers request", () => {
    const buffer = readHoldingRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.ReadHoldingRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0xFF00);
    expect(buffer.readUInt16BE(3)).toEqual(2);
  });

  it("Read holding registers server response", () => {
    const buffer = readHoldingRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.ReadHoldingRegisters);
    expect(buffer.readUInt8(1)).toEqual(4);
    expect(buffer.readUInt16BE(2)).toEqual(0xAFAF);
    expect(buffer.readUInt16BE(4)).toEqual(0xAFAF);
  });

  it("Read holding registers client response", () => {
    if (readHoldingRegistersClientResponse instanceof PduResponse) {
      const data: IModbusReadHoldingRegisters = readHoldingRegistersClientResponse.data;
      expect(data.bytes).toEqual(4);
      expect(data.values).toEqual([0xAFAF, 0xAFAF]);
    } else {
      fail(readHoldingRegistersClientResponse);
    }
  });

  it("Read input registers request", () => {
    const buffer = readInputRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.ReadInputRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0xAFAF);
    expect(buffer.readUInt16BE(3)).toEqual(1);
  });

  it("Read input registers server response", () => {
    const buffer = readInputRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.ReadInputRegisters);
    expect(buffer.readUInt8(1)).toEqual(2);
    expect(buffer.readUInt16BE(2)).toEqual(0xAFAF);
  });

  it("Read holding registers client response", () => {
    if (readInputRegistersClientResponse instanceof PduResponse) {
      const data: IModbusReadInputRegisters = readInputRegistersClientResponse.data;
      expect(data.bytes).toEqual(2);
      expect(data.values).toEqual([0xAFAF]);
    } else {
      fail(readInputRegistersClientResponse);
    }
  });

  it("Write single coil request", () => {
    const buffer = writeSingleCoilRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.WriteSingleCoil);
    expect(buffer.readUInt16BE(1)).toEqual(0x00FF);
    expect(buffer.readUInt16BE(3)).toEqual(0xFF00);
  });

  it("Write single coil server response", () => {
    const buffer = writeSingleCoilServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.WriteSingleCoil);
    expect(buffer.readUInt16BE(1)).toEqual(0x00FF);
    expect(buffer.readUInt16BE(3)).toEqual(0xFF00);
  });

  it("Write single coil client response", () => {
    if (writeSingleCoilClientResponse instanceof PduResponse) {
      const data: IModbusWriteSingleCoil = writeSingleCoilClientResponse.data;
      expect(data.address).toEqual(0x00FF);
      expect(data.value).toEqual(true);
    } else {
      fail(writeSingleCoilClientResponse);
    }
  });

  it("Write single register request", () => {
    const buffer = writeSingleRegisterRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.WriteSingleRegister);
    expect(buffer.readUInt16BE(1)).toEqual(0x4000);
    expect(buffer.readUInt16BE(3)).toEqual(0xABCD);
  });

  it("Write single register server response", () => {
    const buffer = writeSingleRegisterServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.WriteSingleRegister);
    expect(buffer.readUInt16BE(1)).toEqual(0x4000);
    expect(buffer.readUInt16BE(3)).toEqual(0xABCD);
  });

  it("Write single register client response", () => {
    if (writeSingleRegisterClientResponse instanceof PduResponse) {
      const data: IModbusWriteSingleRegister = writeSingleRegisterClientResponse.data;
      expect(data.address).toEqual(0x4000);
      expect(data.value).toEqual(0xABCD);
    } else {
      fail(writeSingleRegisterClientResponse);
    }
  });

  it("Write multiple coils request", () => {
    const buffer = writeMultipleCoilsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.WriteMultipleCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(4);
    expect(buffer.readUInt8(5)).toEqual(1);
    expect(buffer.readUInt8(6)).toEqual(0x05);
  });

  it("Write multiple coils server response", () => {
    const buffer = writeMultipleCoilsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.WriteMultipleCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(4);
  });

  it("Write multiple coils client response", () => {
    if (writeMultipleCoilsClientResponse instanceof PduResponse) {
      const data: IModbusWriteMultipleCoils = writeMultipleCoilsClientResponse.data;
      expect(data.address).toEqual(0x2000);
      expect(data.quantity).toEqual(4);
    } else {
      fail(writeMultipleCoilsClientResponse);
    }
  });

  it("Write multiple registers request", () => {
    const buffer = writeMultipleRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.WriteMultipleRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(3);
    expect(buffer.readUInt8(5)).toEqual(6);
    expect(buffer.readUInt16BE(6)).toEqual(0x0001);
    expect(buffer.readUInt16BE(8)).toEqual(0x0002);
    expect(buffer.readUInt16BE(10)).toEqual(0x0003);
  });

  it("Write multiple registers request", () => {
    const buffer = writeMultipleRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(EModbusFunctionCode.WriteMultipleRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(3);
  });

  it("Write multiple registers client response", () => {
    if (writeMultipleRegistersClientResponse instanceof PduResponse) {
      const data: IModbusWriteMultipleRegisters = writeMultipleRegistersClientResponse.data;
      expect(data.address).toEqual(0x2000);
      expect(data.quantity).toEqual(3);
    } else {
      fail(writeMultipleRegistersClientResponse);
    }
  });

  it("Exception for unsupported function code", () => {
    const buffer = Buffer.from([EModbusFunctionCode.Mei]);
    const clientResponse = PduMaster.responseHandler(buffer);
    if (clientResponse instanceof PduException) {
      expect(clientResponse.functionCode).toEqual(EModbusFunctionCode.Mei);
      expect(clientResponse.exceptionFunctionCode).toEqual(EModbusFunctionCode.Mei + 0x80);
      expect(clientResponse.exceptionCode).toEqual(EModbusExceptionCode.IllegalFunctionCode);
    } else {
      fail(clientResponse);
    }
  });

});
