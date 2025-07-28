import { describe, expect, it } from 'vitest';

import {
  fromBase64,
  fromBytes,
  fromHexString,
  fromJSON,
  hexToU8Receiver,
  objectEquals,
  omit,
  toBase64,
  toBytes,
  toEpoch,
  toHexString,
  toJSON,
  zip,
} from '../src/utils';

describe('utils', () => {
  describe('string and byte conversion', () => {
    it('converts string to bytes', () => {
      const str = 'hello world';
      const bytes = toBytes(str);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(fromBytes(bytes)).toBe(str);
    });

    it('converts bytes to string', () => {
      const bytes = new Uint8Array([104, 101, 108, 108, 111]);
      const str = fromBytes(bytes);
      expect(str).toBe('hello');
    });

    it('handles empty string', () => {
      const emptyStr = '';
      const bytes = toBytes(emptyStr);
      expect(bytes.length).toBe(0);
      expect(fromBytes(bytes)).toBe('');
    });

    it('handles unicode characters', () => {
      const unicodeStr = 'Hello 🌍';
      const bytes = toBytes(unicodeStr);
      expect(fromBytes(bytes)).toBe(unicodeStr);
    });
  });

  describe('hex conversion', () => {
    it('converts hex string to bytes', () => {
      const hex = '48656c6c6f';
      const bytes = fromHexString(hex);
      expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('converts hex string with 0x prefix to bytes', () => {
      const hex = '0x48656c6c6f';
      const bytes = fromHexString(hex);
      expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('converts bytes to hex string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const hex = toHexString(bytes);
      expect(hex).toBe('48656c6c6f');
    });

    it('handles empty hex string', () => {
      const hex = '';
      const bytes = fromHexString(hex);
      expect(bytes.length).toBe(0);
    });

    it('handles single byte', () => {
      const hex = '0x0a';
      const bytes = fromHexString(hex);
      expect(bytes).toEqual(new Uint8Array([10]));
      expect(toHexString(bytes)).toBe('0a');
    });

    it('pads single digit hex values', () => {
      const bytes = new Uint8Array([5, 15]);
      const hex = toHexString(bytes);
      expect(hex).toBe('050f');
    });
  });

  describe('base64 conversion', () => {
    it('converts bytes to base64', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const base64 = toBase64(bytes);
      expect(base64).toBe('SGVsbG8=');
    });

    it('converts base64 to bytes', () => {
      const base64 = 'SGVsbG8=';
      const bytes = fromBase64(base64);
      expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('handles empty bytes', () => {
      const bytes = new Uint8Array([]);
      const base64 = toBase64(bytes);
      expect(base64).toBe('');
      expect(fromBase64(base64)).toEqual(new Uint8Array([]));
    });

    it('round trip conversion', () => {
      const originalBytes = new Uint8Array([1, 2, 3, 255, 128, 0]);
      const base64 = toBase64(originalBytes);
      const convertedBytes = fromBase64(base64);
      expect(convertedBytes).toEqual(originalBytes);
    });
  });

  describe('JSON serialization with custom replacers', () => {
    it('serializes and deserializes object with Uint8Array', () => {
      const obj = {
        name: 'test',
        data: new Uint8Array([1, 2, 3]),
        nested: {
          value: 42,
          bytes: new Uint8Array([255, 0]),
        },
      };

      const json = toJSON(obj);
      const parsed = fromJSON(json);

      expect(parsed.name).toBe('test');
      expect(parsed.data).toEqual(new Uint8Array([1, 2, 3]));
      expect(parsed.nested.value).toBe(42);
      expect(parsed.nested.bytes).toEqual(new Uint8Array([255, 0]));
    });

    it('sorts object keys in JSON output', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const json = toJSON(obj);
      const expected = JSON.stringify({ a: 2, m: 3, z: 1 });
      expect(json).toBe(expected);
    });

    it('converts Uint8Array to hex strings with 0x prefix', () => {
      const obj = { data: new Uint8Array([255, 0, 16]) };
      const json = toJSON(obj);
      expect(json).toContain('0xff0010');
    });
  });

  describe('hexToU8Receiver', () => {
    it('converts hex strings with 0x prefix to Uint8Array', () => {
      const result = hexToU8Receiver('key', '0x48656c6c6f');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('leaves non-hex strings unchanged', () => {
      const result = hexToU8Receiver('key', 'regular string');
      expect(result).toBe('regular string');
    });

    it('leaves non-string values unchanged', () => {
      const result = hexToU8Receiver('key', 42);
      expect(result).toBe(42);
    });

    it('leaves hex strings without 0x prefix unchanged', () => {
      const result = hexToU8Receiver('key', '48656c6c6f');
      expect(result).toBe('48656c6c6f');
    });
  });

  describe('zip utility', () => {
    it('zips two arrays of equal length', () => {
      const a = [1, 2, 3];
      const b = ['a', 'b', 'c'];
      const result = zip(a, b);
      expect(result).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
    });

    it('handles empty arrays', () => {
      const result = zip([], []);
      expect(result).toEqual([]);
    });

    it('truncates to shorter array length', () => {
      const a = [1, 2, 3, 4];
      const b = ['a', 'b'];
      const result = zip(a, b);
      expect(result).toEqual([[1, 'a'], [2, 'b'], [3, undefined], [4, undefined]]);
    });
  });

  describe('toEpoch', () => {
    it('converts Date to Unix timestamp', () => {
      const date = new Date('2023-01-01T00:00:00.000Z');
      const epoch = toEpoch(date);
      expect(epoch).toBe(1672531200);
    });

    it('truncates fractional seconds', () => {
      const date = new Date('2023-01-01T00:00:00.999Z');
      const epoch = toEpoch(date);
      expect(epoch).toBe(1672531200);
    });

    it('handles current date', () => {
      const now = new Date();
      const epoch = toEpoch(now);
      const expectedEpoch = Math.floor(now.getTime() / 1000);
      expect(epoch).toBe(expectedEpoch);
    });
  });

  describe('objectEquals', () => {
    it('compares simple objects for equality', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      const obj3 = { a: 1, b: 3 };
      
      expect(objectEquals(obj1, obj2)).toBe(true);
      expect(objectEquals(obj1, obj3)).toBe(false);
    });

    it('compares nested objects', () => {
      const obj1 = { a: { b: { c: 1 } } };
      const obj2 = { a: { b: { c: 1 } } };
      const obj3 = { a: { b: { c: 2 } } };
      
      expect(objectEquals(obj1, obj2)).toBe(true);
      expect(objectEquals(obj1, obj3)).toBe(false);
    });

    it('compares arrays', () => {
      const arr1 = [1, 2, [3, 4]];
      const arr2 = [1, 2, [3, 4]];
      const arr3 = [1, 2, [3, 5]];
      
      expect(objectEquals(arr1, arr2)).toBe(true);
      expect(objectEquals(arr1, arr3)).toBe(false);
    });

    it('handles Uint8Array comparison', () => {
      const obj1 = { data: new Uint8Array([1, 2, 3]) };
      const obj2 = { data: new Uint8Array([1, 2, 3]) };
      const obj3 = { data: new Uint8Array([1, 2, 4]) };
      
      expect(objectEquals(obj1, obj2)).toBe(true);
      expect(objectEquals(obj1, obj3)).toBe(false);
    });

    it('respects strict mode parameter', () => {
      expect(objectEquals('1', 1, true)).toBe(false);
      expect(objectEquals('1', 1, false)).toBe(true);
    });
  });

  describe('omit utility', () => {
    it('omits specified keys from object', () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = omit(obj, ['b', 'd']);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('handles non-existent keys', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ['c', 'd']);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('does not modify original object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);
      expect(obj).toEqual({ a: 1, b: 2, c: 3 });
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it('handles empty keys array', () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, []);
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });
});