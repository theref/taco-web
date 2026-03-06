import { Conditions as CoreConditions } from '@nucypher/nucypher-core';
import { objectEquals } from '@nucypher/shared';
import { z } from 'zod';

import { fromJSON, toJSON } from '../utils';

import { conditionSchema, ConditionProps, VERSION } from './schema';

export { conditionSchema, ConditionProps, VERSION } from './schema';

export const ERR_INVALID_CONDITION = (error: z.ZodError) =>
  `Invalid condition: ${JSON.stringify(error.issues)}`;

export class Condition {
  public readonly value: ConditionProps;

  constructor(props: Omit<ConditionProps, 'version'>) {
    const result = conditionSchema.safeParse({ version: VERSION, ...props });
    if (!result.success) {
      throw new Error(ERR_INVALID_CONDITION(result.error));
    }
    this.value = result.data;
  }

  public get version(): string {
    return this.value.version;
  }

  public get inputs(): string[] {
    return this.value.inputs ?? [];
  }

  public toObj(): ConditionProps {
    return { ...this.value };
  }

  public toJson(): string {
    return toJSON(this.toObj());
  }

  public toCoreCondition(): CoreConditions {
    return new CoreConditions(this.toJson());
  }

  public static fromObj(obj: Record<string, unknown>): Condition {
    const result = conditionSchema.safeParse(obj);
    if (!result.success) {
      throw new Error(ERR_INVALID_CONDITION(result.error));
    }
    const { version: _, ...rest } = result.data;
    return new Condition(rest);
  }

  public static fromJSON(json: string): Condition {
    return Condition.fromObj(fromJSON(json));
  }

  public static fromCoreConditions(conditions: CoreConditions): Condition {
    return Condition.fromJSON(conditions.toString());
  }

  public equals(other: Condition): boolean {
    return objectEquals(this.toObj(), other.toObj());
  }
}
