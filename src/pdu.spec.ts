/// <reference types="node" />
/// <reference types="jasmine" />
import { ModbusFunctionCode, ModbusPduClient } from "./pdu";

describe("Modbus PDU", () => {

  // TODO: Test method argument validation.
  const client = new ModbusPduClient();

  it("Read Coils", () => {
    const request = client.readCoils(0x0020, 5);
    expect(request[0]).toEqual(ModbusFunctionCode.ReadCoils);
    expect(request.readUInt16BE(1)).toEqual(0x0020);
    expect(request.readUInt16BE(3)).toEqual(5);
  });

  it("Read Discrete Inputs", () => {
    const request = client.readDiscreteInputs(0x0040, 10);
    expect(request[0]).toEqual(ModbusFunctionCode.ReadDiscreteInputs);
    expect(request.readUInt16BE(1)).toEqual(0x0040);
    expect(request.readUInt16BE(3)).toEqual(10);
  });

  it("Read Holding Registers", () => {
    const request = client.readHoldingRegisters(0xFF00, 10);
    expect(request[0]).toEqual(ModbusFunctionCode.ReadHoldingRegisters);
    expect(request.readUInt16BE(1)).toEqual(0xFF00);
    expect(request.readUInt16BE(3)).toEqual(10);
  });

  it("Read Input Registers", () => {
    const request = client.readInputRegisters(0xAFAF, 1);
    expect(request[0]).toEqual(ModbusFunctionCode.ReadInputRegisters);
    expect(request.readUInt16BE(1)).toEqual(0xAFAF);
    expect(request.readUInt16BE(3)).toEqual(1);
  });

  it("Write Single Coil", () => {
    const request = client.writeSingleCoil(0x00FF, true);
    expect(request[0]).toEqual(ModbusFunctionCode.WriteSingleCoil);
    expect(request.readUInt16BE(1)).toEqual(0x00FF);
    expect(request.readUInt16BE(3)).toEqual(0xFF00);
  });

  it("Write Single Register", () => {
    const request = client.writeSingleRegister(0x4000, 0xABCD);
    expect(request[0]).toEqual(ModbusFunctionCode.WriteSingleRegister);
    expect(request.readUInt16BE(1)).toEqual(0x4000);
    expect(request.readUInt16BE(3)).toEqual(0xABCD);
  });

  it("Write Multiple Registers", () => {
    const request = client.writeMultipleRegisters(0x2000, [0x0001, 0x0002, 0x0003]);
    expect(request[0]).toEqual(ModbusFunctionCode.WriteMultipleRegisters);
    expect(request.readUInt16BE(1)).toEqual(0x2000);
    expect(request.readUInt16BE(3)).toEqual(3);
    expect(request[5]).toEqual(6);
    expect(request.readUInt16BE(6)).toEqual(0x0001);
    expect(request.readUInt16BE(8)).toEqual(0x0002);
    expect(request.readUInt16BE(10)).toEqual(0x0003);
  });

});
