import { initialize } from '@nucypher/nucypher-core';
import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';
import { beforeAll, describe, expect, it } from 'vitest';

import { Condition } from '../../src/conditions/condition';
import {
  ConditionContext,
  CustomContextParam,
} from '../../src/conditions/context';
import { RESERVED_CONTEXT_PARAMS } from '../../src/conditions/context/context';

// Minimal valid WASM module (empty module) as base64
const MINIMAL_WASM = 'AGFzbQEAAAA=';

describe('ConditionContext', () => {
  beforeAll(async () => {
    await initialize();
  });

  describe('declaredInputs', () => {
    it('is populated from condition.inputs', () => {
      const condition = new Condition({
        wasm: MINIMAL_WASM,
        inputs: [':myParam', ':otherParam'],
      });
      const ctx = new ConditionContext(condition);
      expect(ctx.declaredInputs).toEqual(new Set([':myParam', ':otherParam']));
    });

    it('is empty when no inputs declared', () => {
      const condition = new Condition({
        wasm: MINIMAL_WASM,
      });
      const ctx = new ConditionContext(condition);
      expect(ctx.declaredInputs.size).toBe(0);
    });
  });

  describe('addCustomContextParameterValues', () => {
    it('accepts declared inputs', () => {
      const condition = new Condition({
        wasm: MINIMAL_WASM,
        inputs: [':myParam'],
      });
      const ctx = new ConditionContext(condition);
      expect(() => {
        ctx.addCustomContextParameterValues({ ':myParam': 42 });
      }).not.toThrow();
    });

    it('rejects params not starting with :', () => {
      const condition = new Condition({
        wasm: MINIMAL_WASM,
        inputs: [':myParam'],
      });
      const ctx = new ConditionContext(condition);
      expect(() => {
        ctx.addCustomContextParameterValues({
          myParam: 'value',
        } as Record<string, CustomContextParam>);
      }).toThrow('must start with :');
    });

    it('rejects reserved params (:userAddress)', () => {
      const condition = new Condition({
        wasm: MINIMAL_WASM,
        inputs: [USER_ADDRESS_PARAM_DEFAULT],
      });
      const ctx = new ConditionContext(condition);
      expect(() => {
        ctx.addCustomContextParameterValues({
          [USER_ADDRESS_PARAM_DEFAULT]: 'value',
        });
      }).toThrow('Cannot use reserved parameter name');
    });

    it('rejects unknown params when inputs are declared', () => {
      const condition = new Condition({
        wasm: MINIMAL_WASM,
        inputs: [':myParam'],
      });
      const ctx = new ConditionContext(condition);
      expect(() => {
        ctx.addCustomContextParameterValues({ ':unknownParam': 'value' });
      }).toThrow('Unknown custom context parameter: :unknownParam');
    });

    it('allows any params when inputs are NOT declared', () => {
      const condition = new Condition({
        wasm: MINIMAL_WASM,
      });
      const ctx = new ConditionContext(condition);
      expect(() => {
        ctx.addCustomContextParameterValues({
          ':anyParam': 'value',
          ':anotherParam': 123,
        });
      }).not.toThrow();
    });
  });

  describe('RESERVED_CONTEXT_PARAMS', () => {
    it('includes :userAddress', () => {
      expect(RESERVED_CONTEXT_PARAMS).toContain(USER_ADDRESS_PARAM_DEFAULT);
    });
  });
});
