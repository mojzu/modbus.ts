import { ValidateError } from "container.ts/lib/validate";
import { Master } from "../Master";
import { MockSlave } from "../Mock";
import * as pdu from "../Pdu";

describe("Master", () => {

  // TODO: Test coil/input bit off handling.
  // TODO: Test coil/input bit multiple byte handling.
  const slave = new MockSlave();

  const readCoilsRequest = Master.readCoils(0x0020, 5);
  const readCoilsServerResponse = slave.onRequest(readCoilsRequest.buffer);
  const readCoilsClientResponse = Master.onResponse(readCoilsServerResponse.buffer);

  const readDiscreteInputsRequest = Master.readDiscreteInputs(0x0040, 4);
  const readDiscreteInputsServerResponse = slave.onRequest(readDiscreteInputsRequest.buffer);
  const readDiscreteInputsClientResponse = Master.onResponse(readDiscreteInputsServerResponse.buffer);

  const readHoldingRegistersRequest = Master.readHoldingRegisters(0xFF00, 2);
  const readHoldingRegistersServerResponse = slave.onRequest(readHoldingRegistersRequest.buffer);
  const readHoldingRegistersClientResponse = Master.onResponse(readHoldingRegistersServerResponse.buffer);

  const readInputRegistersRequest = Master.readInputRegisters(0xAFAF, 1);
  const readInputRegistersServerResponse = slave.onRequest(readInputRegistersRequest.buffer);
  const readInputRegistersClientResponse = Master.onResponse(readInputRegistersServerResponse.buffer);

  const writeSingleCoilRequest = Master.writeSingleCoil(0x00FF, true);
  const writeSingleCoilServerResponse = slave.onRequest(writeSingleCoilRequest.buffer);
  const writeSingleCoilClientResponse = Master.onResponse(writeSingleCoilServerResponse.buffer);

  const writeSingleRegisterRequest = Master.writeSingleRegister(0x4000, 0xABCD);
  const writeSingleRegisterServerResponse = slave.onRequest(writeSingleRegisterRequest.buffer);
  const writeSingleRegisterClientResponse = Master.onResponse(writeSingleRegisterServerResponse.buffer);

  const writeMultipleCoilsRequest = Master.writeMultipleCoils(0x2000, [true, false, true, false]);
  const writeMultipleCoilsServerResponse = slave.onRequest(writeMultipleCoilsRequest.buffer);
  const writeMultipleCoilsClientResponse = Master.onResponse(writeMultipleCoilsServerResponse.buffer);

  const writeMultipleRegistersRequest = Master.writeMultipleRegisters(0x2000, [0x0001, 0x0002, 0x0003]);
  const writeMultipleRegistersServerResponse = slave.onRequest(writeMultipleRegistersRequest.buffer);
  const writeMultipleRegistersClientResponse = Master.onResponse(writeMultipleRegistersServerResponse.buffer);

  it("Read coils request", () => {
    const buffer = readCoilsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x0020);
    expect(buffer.readUInt16BE(3)).toEqual(5);
  });

  it("Read coils starting address argument validation", () => {
    try {
      Master.readCoils(0xFF0000, 1);
      fail();
    } catch (error) {
      expect(error instanceof ValidateError).toEqual(true);
    }
  });

  it("Read coils quantity of coils argument validation", () => {
    try {
      Master.readCoils(0x0000, -1);
      fail();
    } catch (error) {
      expect(error instanceof ValidateError).toEqual(true);
    }
  });

  it("Read coils server response", () => {
    const buffer = readCoilsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadCoils);
    expect(buffer.readUInt8(1)).toEqual(1);
    expect(buffer.readUInt8(2)).toEqual(0x15);
  });

  it("Read coils client response", () => {
    if (readCoilsClientResponse instanceof pdu.Response) {
      const data: pdu.IReadCoils = readCoilsClientResponse.data;
      expect(data.bytes).toEqual(1);
      expect(data.values).toEqual([true, false, true, false, true, false, false, false]);
    } else {
      fail(readCoilsClientResponse);
    }
  });

  it("Read coils exception parsed by client", () => {
    const exception = Master.createException(pdu.EFunctionCode.ReadCoils, pdu.EExceptionCode.IllegalDataAddress);
    const clientResponse = Master.onResponse(exception.buffer);
    expect(clientResponse instanceof pdu.Exception).toEqual(true);
    expect(clientResponse.functionCode).toEqual(pdu.EFunctionCode.ReadCoils);
  });

  it("Read discrete inputs request", () => {
    const buffer = readDiscreteInputsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadDiscreteInputs);
    expect(buffer.readUInt16BE(1)).toEqual(0x0040);
    expect(buffer.readUInt16BE(3)).toEqual(4);
  });

  it("Read discrete inputs server response", () => {
    const buffer = readDiscreteInputsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadDiscreteInputs);
    expect(buffer.readUInt8(1)).toEqual(1);
    expect(buffer.readUInt8(2)).toEqual(0x5);
  });

  it("Read discrete inputs client response", () => {
    if (readDiscreteInputsClientResponse instanceof pdu.Response) {
      const data: pdu.IReadDiscreteInputs = readDiscreteInputsClientResponse.data;
      expect(data.bytes).toEqual(1);
      expect(data.values).toEqual([true, false, true, false, false, false, false, false]);
    } else {
      fail(readDiscreteInputsClientResponse);
    }
  });

  it("Read holding registers request", () => {
    const buffer = readHoldingRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadHoldingRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0xFF00);
    expect(buffer.readUInt16BE(3)).toEqual(2);
  });

  it("Read holding registers server response", () => {
    const buffer = readHoldingRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadHoldingRegisters);
    expect(buffer.readUInt8(1)).toEqual(4);
    expect(buffer.readUInt16BE(2)).toEqual(0xAFAF);
    expect(buffer.readUInt16BE(4)).toEqual(0xAFAF);
  });

  it("Read holding registers client response", () => {
    if (readHoldingRegistersClientResponse instanceof pdu.Response) {
      const data: pdu.IReadHoldingRegisters = readHoldingRegistersClientResponse.data;
      expect(data.bytes).toEqual(4);
      expect(data.values).toEqual([0xAFAF, 0xAFAF]);
    } else {
      fail(readHoldingRegistersClientResponse);
    }
  });

  it("Read input registers request", () => {
    const buffer = readInputRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadInputRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0xAFAF);
    expect(buffer.readUInt16BE(3)).toEqual(1);
  });

  it("Read input registers server response", () => {
    const buffer = readInputRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadInputRegisters);
    expect(buffer.readUInt8(1)).toEqual(2);
    expect(buffer.readUInt16BE(2)).toEqual(0xAFAF);
  });

  it("Read holding registers client response", () => {
    if (readInputRegistersClientResponse instanceof pdu.Response) {
      const data: pdu.IReadInputRegisters = readInputRegistersClientResponse.data;
      expect(data.bytes).toEqual(2);
      expect(data.values).toEqual([0xAFAF]);
    } else {
      fail(readInputRegistersClientResponse);
    }
  });

  it("Write single coil request", () => {
    const buffer = writeSingleCoilRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteSingleCoil);
    expect(buffer.readUInt16BE(1)).toEqual(0x00FF);
    expect(buffer.readUInt16BE(3)).toEqual(0xFF00);
  });

  it("Write single coil server response", () => {
    const buffer = writeSingleCoilServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteSingleCoil);
    expect(buffer.readUInt16BE(1)).toEqual(0x00FF);
    expect(buffer.readUInt16BE(3)).toEqual(0xFF00);
  });

  it("Write single coil client response", () => {
    if (writeSingleCoilClientResponse instanceof pdu.Response) {
      const data: pdu.IWriteSingleCoil = writeSingleCoilClientResponse.data;
      expect(data.address).toEqual(0x00FF);
      expect(data.value).toEqual(true);
    } else {
      fail(writeSingleCoilClientResponse);
    }
  });

  it("Write single register request", () => {
    const buffer = writeSingleRegisterRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteSingleRegister);
    expect(buffer.readUInt16BE(1)).toEqual(0x4000);
    expect(buffer.readUInt16BE(3)).toEqual(0xABCD);
  });

  it("Write single register server response", () => {
    const buffer = writeSingleRegisterServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteSingleRegister);
    expect(buffer.readUInt16BE(1)).toEqual(0x4000);
    expect(buffer.readUInt16BE(3)).toEqual(0xABCD);
  });

  it("Write single register client response", () => {
    if (writeSingleRegisterClientResponse instanceof pdu.Response) {
      const data: pdu.IWriteSingleRegister = writeSingleRegisterClientResponse.data;
      expect(data.address).toEqual(0x4000);
      expect(data.value).toEqual(0xABCD);
    } else {
      fail(writeSingleRegisterClientResponse);
    }
  });

  it("Write multiple coils request", () => {
    const buffer = writeMultipleCoilsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteMultipleCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(4);
    expect(buffer.readUInt8(5)).toEqual(1);
    expect(buffer.readUInt8(6)).toEqual(0x05);
  });

  it("Write multiple coils server response", () => {
    const buffer = writeMultipleCoilsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteMultipleCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(4);
  });

  it("Write multiple coils client response", () => {
    if (writeMultipleCoilsClientResponse instanceof pdu.Response) {
      const data: pdu.IWriteMultipleCoils = writeMultipleCoilsClientResponse.data;
      expect(data.address).toEqual(0x2000);
      expect(data.quantity).toEqual(4);
    } else {
      fail(writeMultipleCoilsClientResponse);
    }
  });

  it("Write multiple registers request", () => {
    const buffer = writeMultipleRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteMultipleRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(3);
    expect(buffer.readUInt8(5)).toEqual(6);
    expect(buffer.readUInt16BE(6)).toEqual(0x0001);
    expect(buffer.readUInt16BE(8)).toEqual(0x0002);
    expect(buffer.readUInt16BE(10)).toEqual(0x0003);
  });

  it("Write multiple registers request", () => {
    const buffer = writeMultipleRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteMultipleRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(3);
  });

  it("Write multiple registers client response", () => {
    if (writeMultipleRegistersClientResponse instanceof pdu.Response) {
      const data: pdu.IWriteMultipleRegisters = writeMultipleRegistersClientResponse.data;
      expect(data.address).toEqual(0x2000);
      expect(data.quantity).toEqual(3);
    } else {
      fail(writeMultipleRegistersClientResponse);
    }
  });

  it("Exception for unsupported function code", () => {
    const buffer = Buffer.from([pdu.EFunctionCode.Mei]);
    const clientResponse = Master.onResponse(buffer);
    if (clientResponse instanceof pdu.Exception) {
      expect(clientResponse.functionCode).toEqual(pdu.EFunctionCode.Mei);
      expect(clientResponse.exceptionFunctionCode).toEqual(pdu.EFunctionCode.Mei + 0x80);
      expect(clientResponse.exceptionCode).toEqual(pdu.EExceptionCode.IllegalFunctionCode);
    } else {
      fail(clientResponse);
    }
  });

});
