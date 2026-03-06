import { z } from 'zod';

export const VERSION = '2.0.0';

const base64Schema = z
  .string()
  .min(1, 'WASM bytecode must not be empty')
  .refine((str) => /^[A-Za-z0-9+/]*={0,2}$/.test(str), {
    message: 'Invalid base64 encoding',
  });

const contextParamSchema = z
  .string()
  .regex(
    /^:[a-zA-Z_][a-zA-Z0-9_]*$/,
    'Input must be a context parameter (start with :)',
  );

export const conditionSchema = z.object({
  version: z.literal(VERSION).default(VERSION),
  wasm: base64Schema.describe('Base64-encoded WASM bytecode'),
  name: z.string().optional().describe('Human-readable condition name'),
  inputs: z
    .array(contextParamSchema)
    .optional()
    .describe('Context parameters the WASM expects'),
});

export type ConditionProps = z.infer<typeof conditionSchema>;
