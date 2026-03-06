import { initialize } from '@nucypher/nucypher-core';
import { beforeAll, describe, expect, it } from 'vitest';

import { Condition, VERSION } from '../../src/conditions/condition';

const validBase64 = 'AGFzbQEAAAA=';

describe('Condition', () => {
  beforeAll(async () => {
    await initialize();
  });

  describe('construction', () => {
    it('creates with wasm only', () => {
      const c = new Condition({ wasm: validBase64 });
      expect(c.value.version).toEqual(VERSION);
      expect(c.value.wasm).toEqual(validBase64);
      expect(c.value.name).toBeUndefined();
      expect(c.value.inputs).toBeUndefined();
    });

    it('creates with all fields', () => {
      const c = new Condition({
        wasm: validBase64,
        name: 'test',
        inputs: [':userAddress', ':chainId'],
      });
      expect(c.value.name).toEqual('test');
      expect(c.inputs).toEqual([':userAddress', ':chainId']);
    });

    it('rejects empty bytecode', () => {
      expect(() => new Condition({ wasm: '' })).toThrow();
    });

    it('rejects invalid base64', () => {
      expect(() => new Condition({ wasm: '!!!invalid!!!' })).toThrow();
    });

    it('rejects invalid input names', () => {
      expect(
        () => new Condition({ wasm: validBase64, inputs: ['noColon'] }),
      ).toThrow();
    });
  });

  describe('serialization', () => {
    it('round-trips through toObj/fromObj', () => {
      const c = new Condition({
        wasm: validBase64,
        name: 'test',
        inputs: [':foo'],
      });
      const restored = Condition.fromObj(c.toObj());
      expect(c.equals(restored)).toBe(true);
    });

    it('round-trips through JSON', () => {
      const c = new Condition({ wasm: validBase64 });
      const restored = Condition.fromJSON(c.toJson());
      expect(c.equals(restored)).toBe(true);
    });

    it('round-trips through CoreConditions', () => {
      const c = new Condition({ wasm: validBase64, name: 'roundtrip' });
      const core = c.toCoreCondition();
      const restored = Condition.fromCoreConditions(core);
      expect(c.equals(restored)).toBe(true);
    });

    it('wire format is flat (no condition wrapper)', () => {
      const c = new Condition({ wasm: validBase64, name: 'flat' });
      const obj = c.toObj();
      expect(obj).toHaveProperty('version', VERSION);
      expect(obj).toHaveProperty('wasm', validBase64);
      expect(obj).toHaveProperty('name', 'flat');
      expect(obj).not.toHaveProperty('condition');
      expect(obj).not.toHaveProperty('conditionType');
    });
  });
});
