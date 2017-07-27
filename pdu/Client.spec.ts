/// <reference types="jasmine" />
import * as pdu from "./pdu";
import { PduClient } from "./Client";
import { PduMockServer } from "./MockServer";

describe("Modbus PDU Client", () => {

  // TODO: Test coil/input bit off handling.
  // TODO: Test coil/input bit multiple byte handling.
  const server = new PduMockServer();

  const readCoilsRequest = PduClient.readCoils(0x0020, 5);
  const readCoilsServerResponse = server.pduRequestHandler(readCoilsRequest.buffer);
  const readCoilsClientResponse = PduClient.responseHandler(readCoilsServerResponse.buffer);

  const readDiscreteInputsRequest = PduClient.readDiscreteInputs(0x0040, 4);
  const readDiscreteInputsServerResponse = server.pduRequestHandler(readDiscreteInputsRequest.buffer);
  const readDiscreteInputsClientResponse = PduClient.responseHandler(readDiscreteInputsServerResponse.buffer);

  const readHoldingRegistersRequest = PduClient.readHoldingRegisters(0xFF00, 2);
  const readHoldingRegistersServerResponse = server.pduRequestHandler(readHoldingRegistersRequest.buffer);
  const readHoldingRegistersClientResponse = PduClient.responseHandler(readHoldingRegistersServerResponse.buffer);

  const readInputRegistersRequest = PduClient.readInputRegisters(0xAFAF, 1);
  const readInputRegistersServerResponse = server.pduRequestHandler(readInputRegistersRequest.buffer);
  const readInputRegistersClientResponse = PduClient.responseHandler(readInputRegistersServerResponse.buffer);

  const writeSingleCoilRequest = PduClient.writeSingleCoil(0x00FF, true);
  const writeSingleCoilServerResponse = server.pduRequestHandler(writeSingleCoilRequest.buffer);
  const writeSingleCoilClientResponse = PduClient.responseHandler(writeSingleCoilServerResponse.buffer);

  const writeSingleRegisterRequest = PduClient.writeSingleRegister(0x4000, 0xABCD);
  const writeSingleRegisterServerResponse = server.pduRequestHandler(writeSingleRegisterRequest.buffer);
  const writeSingleRegisterClientResponse = PduClient.responseHandler(writeSingleRegisterServerResponse.buffer);

  const writeMultipleCoilsRequest = PduClient.writeMultipleCoils(0x2000, [true, false, true, false]);
  const writeMultipleCoilsServerResponse = server.pduRequestHandler(writeMultipleCoilsRequest.buffer);
  const writeMultipleCoilsClientResponse = PduClient.responseHandler(writeMultipleCoilsServerResponse.buffer);

  const writeMultipleRegistersRequest = PduClient.writeMultipleRegisters(0x2000, [0x0001, 0x0002, 0x0003]);
  const writeMultipleRegistersServerResponse = server.pduRequestHandler(writeMultipleRegistersRequest.buffer);
  const writeMultipleRegistersClientResponse = PduClient.responseHandler(writeMultipleRegistersServerResponse.buffer);

  it("Read coils request", () => {
    const buffer = readCoilsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.ReadCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x0020);
    expect(buffer.readUInt16BE(3)).toEqual(5);
  });

  it("Read coils starting address argument validation", () => {
    try {
      PduClient.readCoils(0xFF0000, 1);
      fail();
    } catch (error) {
      expect(error instanceof Error).toEqual(true);
    }
  });

  it("Read coils quantity of coils argument validation", () => {
    try {
      PduClient.readCoils(0x0000, -1);
      fail();
    } catch (error) {
      expect(error instanceof Error).toEqual(true);
    }
  });

  it("Read coils server response", () => {
    const buffer = readCoilsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.ReadCoils);
    expect(buffer.readUInt8(1)).toEqual(1);
    expect(buffer.readUInt8(2)).toEqual(0x15);
  });

  it("Read coils client response", () => {
    if (readCoilsClientResponse instanceof pdu.PduResponse) {
      const data: pdu.IReadCoils = readCoilsClientResponse.data;
      expect(data.bytes).toEqual(1);
      expect(data.values).toEqual([true, false, true, false, true, false, false, false]);
    } else {
      fail(readCoilsClientResponse);
    }
  });

  it("Read coils exception parsed by client", () => {
    const exception = PduClient.createException(pdu.FunctionCode.ReadCoils, pdu.ExceptionCode.IllegalDataAddress);
    const clientResponse = PduClient.responseHandler(exception.buffer);
    expect(clientResponse instanceof pdu.PduException).toEqual(true);
    expect(clientResponse.functionCode).toEqual(pdu.FunctionCode.ReadCoils);
  });

  it("Read discrete inputs request", () => {
    const buffer = readDiscreteInputsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.ReadDiscreteInputs);
    expect(buffer.readUInt16BE(1)).toEqual(0x0040);
    expect(buffer.readUInt16BE(3)).toEqual(4);
  });

  it("Read discrete inputs server response", () => {
    const buffer = readDiscreteInputsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.ReadDiscreteInputs);
    expect(buffer.readUInt8(1)).toEqual(1);
    expect(buffer.readUInt8(2)).toEqual(0x5);
  });

  it("Read discrete inputs client response", () => {
    if (readDiscreteInputsClientResponse instanceof pdu.PduResponse) {
      const data: pdu.IReadDiscreteInputs = readDiscreteInputsClientResponse.data;
      expect(data.bytes).toEqual(1);
      expect(data.values).toEqual([true, false, true, false, false, false, false, false]);
    } else {
      fail(readDiscreteInputsClientResponse);
    }
  });

  it("Read holding registers request", () => {
    const buffer = readHoldingRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.ReadHoldingRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0xFF00);
    expect(buffer.readUInt16BE(3)).toEqual(2);
  });

  it("Read holding registers server response", () => {
    const buffer = readHoldingRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.ReadHoldingRegisters);
    expect(buffer.readUInt8(1)).toEqual(4);
    expect(buffer.readUInt16BE(2)).toEqual(0xAFAF);
    expect(buffer.readUInt16BE(4)).toEqual(0xAFAF);
  });

  it("Read holding registers client response", () => {
    if (readHoldingRegistersClientResponse instanceof pdu.PduResponse) {
      const data: pdu.IReadHoldingRegisters = readHoldingRegistersClientResponse.data;
      expect(data.bytes).toEqual(4);
      expect(data.values).toEqual([0xAFAF, 0xAFAF]);
    } else {
      fail(readHoldingRegistersClientResponse);
    }
  });

  it("Read input registers request", () => {
    const buffer = readInputRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.ReadInputRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0xAFAF);
    expect(buffer.readUInt16BE(3)).toEqual(1);
  });

  it("Read input registers server response", () => {
    const buffer = readInputRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.ReadInputRegisters);
    expect(buffer.readUInt8(1)).toEqual(2);
    expect(buffer.readUInt16BE(2)).toEqual(0xAFAF);
  });

  it("Read holding registers client response", () => {
    if (readInputRegistersClientResponse instanceof pdu.PduResponse) {
      const data: pdu.IReadInputRegisters = readInputRegistersClientResponse.data;
      expect(data.bytes).toEqual(2);
      expect(data.values).toEqual([0xAFAF]);
    } else {
      fail(readInputRegistersClientResponse);
    }
  });

  it("Write single coil request", () => {
    const buffer = writeSingleCoilRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.WriteSingleCoil);
    expect(buffer.readUInt16BE(1)).toEqual(0x00FF);
    expect(buffer.readUInt16BE(3)).toEqual(0xFF00);
  });

  it("Write single coil server response", () => {
    const buffer = writeSingleCoilServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.WriteSingleCoil);
    expect(buffer.readUInt16BE(1)).toEqual(0x00FF);
    expect(buffer.readUInt16BE(3)).toEqual(0xFF00);
  });

  it("Write single coil client response", () => {
    if (writeSingleCoilClientResponse instanceof pdu.PduResponse) {
      const data: pdu.IWriteSingleCoil = writeSingleCoilClientResponse.data;
      expect(data.address).toEqual(0x00FF);
      expect(data.value).toEqual(true);
    } else {
      fail(writeSingleCoilClientResponse);
    }
  });

  it("Write single register request", () => {
    const buffer = writeSingleRegisterRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.WriteSingleRegister);
    expect(buffer.readUInt16BE(1)).toEqual(0x4000);
    expect(buffer.readUInt16BE(3)).toEqual(0xABCD);
  });

  it("Write single register server response", () => {
    const buffer = writeSingleRegisterServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.WriteSingleRegister);
    expect(buffer.readUInt16BE(1)).toEqual(0x4000);
    expect(buffer.readUInt16BE(3)).toEqual(0xABCD);
  });

  it("Write single register client response", () => {
    if (writeSingleRegisterClientResponse instanceof pdu.PduResponse) {
      const data: pdu.IWriteSingleRegister = writeSingleRegisterClientResponse.data;
      expect(data.address).toEqual(0x4000);
      expect(data.value).toEqual(0xABCD);
    } else {
      fail(writeSingleRegisterClientResponse);
    }
  });

  it("Write multiple coils request", () => {
    const buffer = writeMultipleCoilsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.WriteMultipleCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(4);
    expect(buffer.readUInt8(5)).toEqual(1);
    expect(buffer.readUInt8(6)).toEqual(0x05);
  });

  it("Write multiple coils server response", () => {
    const buffer = writeMultipleCoilsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.WriteMultipleCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(4);
  });

  it("Write multiple coils client response", () => {
    if (writeMultipleCoilsClientResponse instanceof pdu.PduResponse) {
      const data: pdu.IWriteMultipleCoils = writeMultipleCoilsClientResponse.data;
      expect(data.address).toEqual(0x2000);
      expect(data.quantity).toEqual(4);
    } else {
      fail(writeMultipleCoilsClientResponse);
    }
  });

  it("Write multiple registers request", () => {
    const buffer = writeMultipleRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.WriteMultipleRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(3);
    expect(buffer.readUInt8(5)).toEqual(6);
    expect(buffer.readUInt16BE(6)).toEqual(0x0001);
    expect(buffer.readUInt16BE(8)).toEqual(0x0002);
    expect(buffer.readUInt16BE(10)).toEqual(0x0003);
  });

  it("Write multiple registers request", () => {
    const buffer = writeMultipleRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.WriteMultipleRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(3);
  });

  it("Write multiple registers client response", () => {
    if (writeMultipleRegistersClientResponse instanceof pdu.PduResponse) {
      const data: pdu.IWriteMultipleRegisters = writeMultipleRegistersClientResponse.data;
      expect(data.address).toEqual(0x2000);
      expect(data.quantity).toEqual(3);
    } else {
      fail(writeMultipleRegistersClientResponse);
    }
  });

  it("Exception for unsupported function code", () => {
    const buffer = Buffer.from([pdu.FunctionCode.Mei]);
    const clientResponse = PduClient.responseHandler(buffer);
    if (clientResponse instanceof pdu.PduException) {
      expect(clientResponse.functionCode).toEqual(pdu.FunctionCode.Mei);
      expect(clientResponse.exceptionFunctionCode).toEqual(pdu.FunctionCode.Mei + 0x80);
      expect(clientResponse.exceptionCode).toEqual(pdu.ExceptionCode.IllegalFunctionCode);
    } else {
      fail(clientResponse);
    }
  });

});
