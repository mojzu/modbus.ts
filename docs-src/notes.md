
# PDU

Modbus Protocol Data Unit layer.

EFunctionCode

Function codes defined in Modbus protocol.

EExceptionCode

Exception codes defined in Modbus protocol.

IModbus...

Modbus function return types.

- Request
- Response
- Exception

Modbus types.

Validation/helper functions.

## PDU.Master

Master
- readCoils
- readDiscreteInputs
- readHoldingRegisters
- readInputRegisters
- writeSingleCoil
- writeSingleRegister
- writeMultipleCoils
- writeMultipleRegisters

- responseHandler

## PDU.Slave

Slave
- readCoils
- readDiscreteInputs
- readHoldingRegisters
- readInputRegisters
- writeSingleCoil
- writeSingleRegister
- writeMultipleCoils
- writeMultipleRegisters

- requestHandler

# ADU

Modbus Application Data Unit generics.

## ADU.Master

Master

