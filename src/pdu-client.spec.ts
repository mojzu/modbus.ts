/// <reference types="jasmine" />
import * as pdu from "./pdu";
import { PduClient } from "./pdu-client";
import { PduMockServer } from "./pdu-server-mock";

describe("Modbus PDU Client", () => {

  // TODO: Test method argument validation.
  // TODO: Test Modbus exception handling.
  const client = new PduClient();
  const server = new PduMockServer();

  const readCoilsRequest = client.readCoils(0x0020, 5);
  const readCoilsServerResponse = server.parseRequest(readCoilsRequest.buffer);
  const readCoilsClientResponse = client.parseResponse(readCoilsServerResponse.buffer);

  const readDiscreteInputsRequest = client.readDiscreteInputs(0x0040, 4);
  const readDiscreteInputsServerResponse = server.parseRequest(readDiscreteInputsRequest.buffer);
  const readDiscreteInputsClientResponse = client.parseResponse(readDiscreteInputsServerResponse.buffer);

  const readHoldingRegistersRequest = client.readHoldingRegisters(0xFF00, 2);
  const readHoldingRegistersServerResponse = server.parseRequest(readHoldingRegistersRequest.buffer);
  const readHoldingRegistersClientResponse = client.parseResponse(readHoldingRegistersServerResponse.buffer);

  const readInputRegistersRequest = client.readInputRegisters(0xAFAF, 1);
  const readInputRegistersServerResponse = server.parseRequest(readInputRegistersRequest.buffer);
  const readInputRegistersClientResponse = client.parseResponse(readInputRegistersServerResponse.buffer);

  const writeSingleCoilRequest = client.writeSingleCoil(0x00FF, true);
  const writeSingleCoilServerResponse = server.parseRequest(writeSingleCoilRequest.buffer);
  const writeSingleCoilClientResponse = client.parseResponse(writeSingleCoilServerResponse.buffer);

  const writeSingleRegisterRequest = client.writeSingleRegister(0x4000, 0xABCD);
  const writeSingleRegisterServerResponse = server.parseRequest(writeSingleRegisterRequest.buffer);
  const writeSingleRegisterClientResponse = client.parseResponse(writeSingleRegisterServerResponse.buffer);

  const writeMultipleCoilsRequest = client.writeMultipleCoils(0x2000, [true, false, true, false]);
  const writeMultipleCoilsServerResponse = server.parseRequest(writeMultipleCoilsRequest.buffer);
  const writeMultipleCoilsClientResponse = client.parseResponse(writeMultipleCoilsServerResponse.buffer);

  const writeMultipleRegistersRequest = client.writeMultipleRegisters(0x2000, [0x0001, 0x0002, 0x0003]);
  const writeMultipleRegistersServerResponse = server.parseRequest(writeMultipleRegistersRequest.buffer);
  const writeMultipleRegistersClientResponse = client.parseResponse(writeMultipleRegistersServerResponse.buffer);

  it("Read coils request", () => {
    const buffer = readCoilsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.FunctionCode.ReadCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x0020);
    expect(buffer.readUInt16BE(3)).toEqual(5);
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

});
