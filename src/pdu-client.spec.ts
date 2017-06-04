/// <reference types="node" />
/// <reference types="jasmine" />
import * as pdu from "./pdu";
import * as pduClient from "./pdu-client";

describe("Modbus PDU", () => {

  // TODO: Test method argument validation.
  // TODO: Test parsed responses.
  const client = new pduClient.ModbusPduClient();

  it("Read coils request", () => {
    const request = client.readCoils(0x0020, 5);
    expect(request.buffer.readUInt8(0)).toEqual(pdu.ModbusFunctionCode.ReadCoils);
    expect(request.buffer.readUInt16BE(1)).toEqual(0x0020);
    expect(request.buffer.readUInt16BE(3)).toEqual(5);
  });

  it("Read discrete inputs request", () => {
    const request = client.readDiscreteInputs(0x0040, 10);
    expect(request.buffer.readUInt8(0)).toEqual(pdu.ModbusFunctionCode.ReadDiscreteInputs);
    expect(request.buffer.readUInt16BE(1)).toEqual(0x0040);
    expect(request.buffer.readUInt16BE(3)).toEqual(10);
  });

  it("Read holding registers request", () => {
    const request = client.readHoldingRegisters(0xFF00, 10);
    expect(request.buffer.readUInt8(0)).toEqual(pdu.ModbusFunctionCode.ReadHoldingRegisters);
    expect(request.buffer.readUInt16BE(1)).toEqual(0xFF00);
    expect(request.buffer.readUInt16BE(3)).toEqual(10);
  });

  it("Read input registers request", () => {
    const request = client.readInputRegisters(0xAFAF, 1);
    expect(request.buffer.readUInt8(0)).toEqual(pdu.ModbusFunctionCode.ReadInputRegisters);
    expect(request.buffer.readUInt16BE(1)).toEqual(0xAFAF);
    expect(request.buffer.readUInt16BE(3)).toEqual(1);
  });

  it("Write single coil request", () => {
    const request = client.writeSingleCoil(0x00FF, true);
    expect(request.buffer.readUInt8(0)).toEqual(pdu.ModbusFunctionCode.WriteSingleCoil);
    expect(request.buffer.readUInt16BE(1)).toEqual(0x00FF);
    expect(request.buffer.readUInt16BE(3)).toEqual(0xFF00);
  });

  it("Write single register request", () => {
    const request = client.writeSingleRegister(0x4000, 0xABCD);
    expect(request.buffer.readUInt8(0)).toEqual(pdu.ModbusFunctionCode.WriteSingleRegister);
    expect(request.buffer.readUInt16BE(1)).toEqual(0x4000);
    expect(request.buffer.readUInt16BE(3)).toEqual(0xABCD);
  });

  it("Write multiple coils request", () => {
    const request = client.writeMultipleCoils(0x2000, [true, false, true, false]);
    expect(request.buffer.readUInt8(0)).toEqual(pdu.ModbusFunctionCode.WriteMultipleCoils);
    expect(request.buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(request.buffer.readUInt16BE(3)).toEqual(1);
    expect(request.buffer.readUInt8(5)).toEqual(1);
    expect(request.buffer.readUInt8(6)).toEqual(0xA0);
  });

  it("Write multiple registers request", () => {
    const request = client.writeMultipleRegisters(0x2000, [0x0001, 0x0002, 0x0003]);
    expect(request.buffer.readUInt8(0)).toEqual(pdu.ModbusFunctionCode.WriteMultipleRegisters);
    expect(request.buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(request.buffer.readUInt16BE(3)).toEqual(3);
    expect(request.buffer.readUInt8(5)).toEqual(6);
    expect(request.buffer.readUInt16BE(6)).toEqual(0x0001);
    expect(request.buffer.readUInt16BE(8)).toEqual(0x0002);
    expect(request.buffer.readUInt16BE(10)).toEqual(0x0003);
  });

});
