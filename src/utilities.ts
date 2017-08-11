/* tslint:disable:no-bitwise */
import { Validate } from "container.ts/lib/validate";

export function validAddress(value: number): void {
  Validate.isInteger(String(value), { min: 0x0, max: 0xFFFF });
}

export function validRegister(value: number): void {
  Validate.isInteger(String(value), { min: 0x0, max: 0xFFFF });
}

export function validQuantityOfBits(value: number, maximum = 0x7D0): void {
  Validate.isInteger(String(value), { min: 0x1, max: maximum });
}

export function validQuantityOfRegisters(value: number, maximum = 0x7D): void {
  Validate.isInteger(String(value), { min: 0x1, max: maximum });
}

export function bitsToBytes(values: boolean[]): [number, number[]] {
  let byteCount = Math.floor(values.length / 8);
  if ((values.length % 8) !== 0) {
    byteCount += 1;
  }

  // Convert array of booleans to byte flag array.
  const byteValues: number[] = [];
  values.map((value, index) => {
    const byteIndex = Math.floor(index / 8);
    const bitIndex = Math.floor(index % 8);

    let byteValue = byteValues[byteIndex] || 0;
    if (!!value) {
      byteValue |= (0x1 << bitIndex);
    } else {
      byteValue &= ~(0x1 << bitIndex);
    }
    byteValues[byteIndex] = byteValue;
  });

  return [byteCount, byteValues];
}

export function bytesToBits(quantity: number, buffer: Buffer): boolean[] {
  let byteCount = Math.floor(quantity / 8);
  if ((quantity % 8) !== 0) {
    byteCount += 1;
  }

  // Convert byte flag array to array of booleans.
  const bitValues: boolean[] = [];
  for (let i = 0; i < quantity; i++) {
    const byteIndex = Math.floor(i / 8);
    const bitIndex = Math.floor(i % 8);

    const byteValue = buffer.readUInt8(byteIndex);
    bitValues.push(!!(byteValue & (0x1 << bitIndex)));
  }

  return bitValues;
}
