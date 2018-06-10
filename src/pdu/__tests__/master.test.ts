import { ValidateError } from "container.ts/lib/validate";
import { Master } from "../master";
import { MockSlave } from "../mock";
import * as pdu from "../pdu";

describe("Master", () => {
  // TODO(L): Test coil/input bit off handling.
  // TODO(L): Test coil/input bit multiple byte handling.
  const slave = new MockSlave();

  const readCoilsRequest = Master.readCoils(0x0020, 5);
  const readCoilsServerResponse = slave.onRequest(readCoilsRequest.buffer);
  const readCoilsClientResponse = Master.onResponse(readCoilsServerResponse.buffer);

  const readDiscreteInputsRequest = Master.readDiscreteInputs(0x0040, 4);
  const readDiscreteInputsServerResponse = slave.onRequest(readDiscreteInputsRequest.buffer);
  const readDiscreteInputsClientResponse = Master.onResponse(readDiscreteInputsServerResponse.buffer);

  const readHoldingRegistersRequest = Master.readHoldingRegisters(0xff00, 2);
  const readHoldingRegistersServerResponse = slave.onRequest(readHoldingRegistersRequest.buffer);
  const readHoldingRegistersClientResponse = Master.onResponse(readHoldingRegistersServerResponse.buffer);

  const readInputRegistersRequest = Master.readInputRegisters(0xafaf, 1);
  const readInputRegistersServerResponse = slave.onRequest(readInputRegistersRequest.buffer);
  const readInputRegistersClientResponse = Master.onResponse(readInputRegistersServerResponse.buffer);

  const writeSingleCoilRequest = Master.writeSingleCoil(0x00ff, true);
  const writeSingleCoilServerResponse = slave.onRequest(writeSingleCoilRequest.buffer);
  const writeSingleCoilClientResponse = Master.onResponse(writeSingleCoilServerResponse.buffer);

  const writeSingleRegisterRequest = Master.writeSingleRegister(0x4000, 0xabcd);
  const writeSingleRegisterServerResponse = slave.onRequest(writeSingleRegisterRequest.buffer);
  const writeSingleRegisterClientResponse = Master.onResponse(writeSingleRegisterServerResponse.buffer);

  const writeMultipleCoilsRequest = Master.writeMultipleCoils(0x2000, [true, false, true, false]);
  const writeMultipleCoilsServerResponse = slave.onRequest(writeMultipleCoilsRequest.buffer);
  const writeMultipleCoilsClientResponse = Master.onResponse(writeMultipleCoilsServerResponse.buffer);

  const writeMultipleRegistersRequest = Master.writeMultipleRegisters(0x2000, [0x0001, 0x0002, 0x0003]);
  const writeMultipleRegistersServerResponse = slave.onRequest(writeMultipleRegistersRequest.buffer);
  const writeMultipleRegistersClientResponse = Master.onResponse(writeMultipleRegistersServerResponse.buffer);

  it("read coils request", () => {
    const buffer = readCoilsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x0020);
    expect(buffer.readUInt16BE(3)).toEqual(5);
  });

  it("read coils starting address argument validation", (done) => {
    try {
      Master.readCoils(0xff0000, 1);
      done.fail();
    } catch (error) {
      expect(error instanceof ValidateError).toEqual(true);
      done();
    }
  });

  it("read coils quantity of coils argument validation", (done) => {
    try {
      Master.readCoils(0x0000, -1);
      done.fail();
    } catch (error) {
      expect(error instanceof ValidateError).toEqual(true);
      done();
    }
  });

  it("read coils server response", () => {
    const buffer = readCoilsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadCoils);
    expect(buffer.readUInt8(1)).toEqual(1);
    expect(buffer.readUInt8(2)).toEqual(0x15);
  });

  it("read coils client response", (done) => {
    if (readCoilsClientResponse instanceof pdu.Response) {
      const data: pdu.IReadCoils = readCoilsClientResponse.data;
      expect(data.bytes).toEqual(1);
      expect(data.values).toEqual([true, false, true, false, true, false, false, false]);
      done();
    } else {
      done.fail(String(readCoilsClientResponse));
    }
  });

  it("read coils exception parsed by client", () => {
    const exception = Master.createException(pdu.EFunctionCode.ReadCoils, pdu.EExceptionCode.IllegalDataAddress);
    const clientResponse = Master.onResponse(exception.buffer);
    expect(clientResponse instanceof pdu.Exception).toEqual(true);
    expect(clientResponse.functionCode).toEqual(pdu.EFunctionCode.ReadCoils);
  });

  it("read discrete inputs request", () => {
    const buffer = readDiscreteInputsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadDiscreteInputs);
    expect(buffer.readUInt16BE(1)).toEqual(0x0040);
    expect(buffer.readUInt16BE(3)).toEqual(4);
  });

  it("read discrete inputs server response", () => {
    const buffer = readDiscreteInputsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadDiscreteInputs);
    expect(buffer.readUInt8(1)).toEqual(1);
    expect(buffer.readUInt8(2)).toEqual(0x5);
  });

  it("read discrete inputs client response", (done) => {
    if (readDiscreteInputsClientResponse instanceof pdu.Response) {
      const data: pdu.IReadDiscreteInputs = readDiscreteInputsClientResponse.data;
      expect(data.bytes).toEqual(1);
      expect(data.values).toEqual([true, false, true, false, false, false, false, false]);
      done();
    } else {
      done.fail(String(readDiscreteInputsClientResponse));
    }
  });

  it("read holding registers request", () => {
    const buffer = readHoldingRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadHoldingRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0xff00);
    expect(buffer.readUInt16BE(3)).toEqual(2);
  });

  it("read holding registers server response", () => {
    const buffer = readHoldingRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadHoldingRegisters);
    expect(buffer.readUInt8(1)).toEqual(4);
    expect(buffer.readUInt16BE(2)).toEqual(0xafaf);
    expect(buffer.readUInt16BE(4)).toEqual(0xafaf);
  });

  it("read holding registers client response", (done) => {
    if (readHoldingRegistersClientResponse instanceof pdu.Response) {
      const data: pdu.IReadHoldingRegisters = readHoldingRegistersClientResponse.data;
      expect(data.bytes).toEqual(4);
      expect(data.values).toEqual([0xafaf, 0xafaf]);
      done();
    } else {
      done.fail(String(readHoldingRegistersClientResponse));
    }
  });

  it("read input registers request", () => {
    const buffer = readInputRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadInputRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0xafaf);
    expect(buffer.readUInt16BE(3)).toEqual(1);
  });

  it("read input registers server response", () => {
    const buffer = readInputRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.ReadInputRegisters);
    expect(buffer.readUInt8(1)).toEqual(2);
    expect(buffer.readUInt16BE(2)).toEqual(0xafaf);
  });

  it("read holding registers client response", (done) => {
    if (readInputRegistersClientResponse instanceof pdu.Response) {
      const data: pdu.IReadInputRegisters = readInputRegistersClientResponse.data;
      expect(data.bytes).toEqual(2);
      expect(data.values).toEqual([0xafaf]);
      done();
    } else {
      done.fail(String(readInputRegistersClientResponse));
    }
  });

  it("write single coil request", () => {
    const buffer = writeSingleCoilRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteSingleCoil);
    expect(buffer.readUInt16BE(1)).toEqual(0x00ff);
    expect(buffer.readUInt16BE(3)).toEqual(0xff00);
  });

  it("write single coil server response", () => {
    const buffer = writeSingleCoilServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteSingleCoil);
    expect(buffer.readUInt16BE(1)).toEqual(0x00ff);
    expect(buffer.readUInt16BE(3)).toEqual(0xff00);
  });

  it("write single coil client response", (done) => {
    if (writeSingleCoilClientResponse instanceof pdu.Response) {
      const data: pdu.IWriteSingleCoil = writeSingleCoilClientResponse.data;
      expect(data.address).toEqual(0x00ff);
      expect(data.value).toEqual(true);
      done();
    } else {
      done.fail(String(writeSingleCoilClientResponse));
    }
  });

  it("write single register request", () => {
    const buffer = writeSingleRegisterRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteSingleRegister);
    expect(buffer.readUInt16BE(1)).toEqual(0x4000);
    expect(buffer.readUInt16BE(3)).toEqual(0xabcd);
  });

  it("write single register server response", () => {
    const buffer = writeSingleRegisterServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteSingleRegister);
    expect(buffer.readUInt16BE(1)).toEqual(0x4000);
    expect(buffer.readUInt16BE(3)).toEqual(0xabcd);
  });

  it("write single register client response", (done) => {
    if (writeSingleRegisterClientResponse instanceof pdu.Response) {
      const data: pdu.IWriteSingleRegister = writeSingleRegisterClientResponse.data;
      expect(data.address).toEqual(0x4000);
      expect(data.value).toEqual(0xabcd);
      done();
    } else {
      done.fail(String(writeSingleRegisterClientResponse));
    }
  });

  it("write multiple coils request", () => {
    const buffer = writeMultipleCoilsRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteMultipleCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(4);
    expect(buffer.readUInt8(5)).toEqual(1);
    expect(buffer.readUInt8(6)).toEqual(0x05);
  });

  it("write multiple coils server response", () => {
    const buffer = writeMultipleCoilsServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteMultipleCoils);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(4);
  });

  it("write multiple coils client response", (done) => {
    if (writeMultipleCoilsClientResponse instanceof pdu.Response) {
      const data: pdu.IWriteMultipleCoils = writeMultipleCoilsClientResponse.data;
      expect(data.address).toEqual(0x2000);
      expect(data.quantity).toEqual(4);
      done();
    } else {
      done.fail(String(writeMultipleCoilsClientResponse));
    }
  });

  it("write multiple registers request", () => {
    const buffer = writeMultipleRegistersRequest.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteMultipleRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(3);
    expect(buffer.readUInt8(5)).toEqual(6);
    expect(buffer.readUInt16BE(6)).toEqual(0x0001);
    expect(buffer.readUInt16BE(8)).toEqual(0x0002);
    expect(buffer.readUInt16BE(10)).toEqual(0x0003);
  });

  it("write multiple registers request", () => {
    const buffer = writeMultipleRegistersServerResponse.buffer;
    expect(buffer.readUInt8(0)).toEqual(pdu.EFunctionCode.WriteMultipleRegisters);
    expect(buffer.readUInt16BE(1)).toEqual(0x2000);
    expect(buffer.readUInt16BE(3)).toEqual(3);
  });

  it("write multiple registers client response", (done) => {
    if (writeMultipleRegistersClientResponse instanceof pdu.Response) {
      const data: pdu.IWriteMultipleRegisters = writeMultipleRegistersClientResponse.data;
      expect(data.address).toEqual(0x2000);
      expect(data.quantity).toEqual(3);
      done();
    } else {
      done.fail(String(writeMultipleRegistersClientResponse));
    }
  });

  it("exception for unsupported function code", (done) => {
    const buffer = Buffer.from([pdu.EFunctionCode.Mei]);
    const clientResponse = Master.onResponse(buffer);
    if (clientResponse instanceof pdu.Exception) {
      expect(clientResponse.functionCode).toEqual(pdu.EFunctionCode.Mei);
      expect(clientResponse.exceptionFunctionCode).toEqual(pdu.EFunctionCode.Mei + 0x80);
      expect(clientResponse.exceptionCode).toEqual(pdu.EExceptionCode.IllegalFunctionCode);
      done();
    } else {
      done.fail(String(clientResponse));
    }
  });
});
