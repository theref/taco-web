import { ThresholdMessageKit } from '@nucypher/nucypher-core';
import { Domain, SigningCoordinatorAgent } from '@nucypher/shared';
import {
  AuthProvider,
  AuthSignature,
  EIP1271AuthProvider,
  EIP4361AuthProvider,
  SingleSignOnEIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
import { ethers } from 'ethers';

import { CoreContext } from '../../types';
import { toJSON } from '../../utils';
import { Condition } from '../condition';
import {
  CONTEXT_PARAM_PREFIX,
  USER_ADDRESS_PARAMS,
} from '../const';

export type CustomContextParam =
  | string
  | number
  | boolean
  | bigint
  | Uint8Array;
export type ContextParam = CustomContextParam | AuthSignature;

const ERR_RESERVED_PARAM = (key: string) =>
  `Cannot use reserved parameter name ${key} as custom parameter`;
const ERR_INVALID_CUSTOM_PARAM = (key: string) =>
  `Custom parameter ${key} must start with ${CONTEXT_PARAM_PREFIX}`;
const ERR_AUTH_PROVIDER_REQUIRED = (key: string) =>
  `No matching authentication provider to satisfy ${key} context variable in condition`;
const ERR_MISSING_CONTEXT_PARAMS = (params: string[]) =>
  `Missing custom context parameter(s): ${params.join(', ')}`;
const ERR_UNKNOWN_CUSTOM_CONTEXT_PARAM = (param: string) =>
  `Unknown custom context parameter: ${param}`;
const ERR_INVALID_AUTH_PROVIDER_TYPE = (param: string, expected: string) =>
  `Invalid AuthProvider type for ${param}; expected ${expected}`;
const ERR_AUTH_PROVIDER_NOT_NEEDED_FOR_CONTEXT_PARAM = (param: string) =>
  `AuthProvider not necessary for context parameter: ${param}`;

type AuthProviderType =
  | typeof EIP4361AuthProvider
  | typeof EIP1271AuthProvider
  | typeof SingleSignOnEIP4361AuthProvider;

const EXPECTED_AUTH_PROVIDER_TYPES: Record<string, AuthProviderType[]> = {
  [USER_ADDRESS_PARAM_DEFAULT]: [
    EIP4361AuthProvider,
    EIP1271AuthProvider,
    SingleSignOnEIP4361AuthProvider,
  ],
};

export const RESERVED_CONTEXT_PARAMS = [
  USER_ADDRESS_PARAM_DEFAULT,
];

export class ConditionContext {
  public readonly declaredInputs: Set<string>;
  private customContextParameters: Record<string, CustomContextParam> = {};
  private authProviders: Record<string, AuthProvider> = {};

  constructor(condition: Condition) {
    this.declaredInputs = new Set(condition.inputs);
  }

  public addCustomContextParameterValues(
    customContextParameters: Record<string, CustomContextParam>,
  ) {
    Object.keys(customContextParameters).forEach((key) => {
      this.validateCustomContextParameter(key);
      this.customContextParameters[key] = customContextParameters[key];
    });
  }

  public addAuthProvider(contextParam: string, authProvider: AuthProvider) {
    if (!(contextParam in EXPECTED_AUTH_PROVIDER_TYPES)) {
      throw new Error(
        ERR_AUTH_PROVIDER_NOT_NEEDED_FOR_CONTEXT_PARAM(contextParam),
      );
    }
    const expectedTypes = EXPECTED_AUTH_PROVIDER_TYPES[contextParam];
    if (!expectedTypes.some((type) => authProvider instanceof type)) {
      throw new Error(
        ERR_INVALID_AUTH_PROVIDER_TYPE(contextParam, typeof authProvider),
      );
    }
    this.authProviders[contextParam] = authProvider;
  }

  public async toJson(): Promise<string> {
    const parameters = await this.toContextParameters();
    return toJSON(parameters);
  }

  public async toCoreContext(): Promise<CoreContext> {
    const asJson = await this.toJson();
    return new CoreContext(asJson);
  }

  public toContextParameters = async (): Promise<
    Record<string, ContextParam>
  > => {
    this.validateAuthProviders();
    const parameters = await this.fillContextParameters();
    this.validateNoMissingContextParameters(parameters);
    return parameters;
  };

  public static fromMessageKit(
    messageKit: ThresholdMessageKit,
  ): ConditionContext {
    const condition = Condition.fromCoreConditions(
      messageKit.acp.conditions,
    );
    return new ConditionContext(condition);
  }

  public static async forSigningCohort(
    provider: ethers.providers.JsonRpcProvider,
    domain: Domain,
    cohortId: number,
    chainId: number,
  ): Promise<ConditionContext> {
    const cohortConditionHex =
      await SigningCoordinatorAgent.getSigningCohortConditions(
        provider,
        domain,
        cohortId,
        chainId,
      );
    const cohortConditionJson = ethers.utils.toUtf8String(cohortConditionHex);
    const condition = Condition.fromJSON(cohortConditionJson);
    return new ConditionContext(condition);
  }

  // --- private ---

  private validateCustomContextParameter(customParam: string): void {
    if (!customParam.startsWith(CONTEXT_PARAM_PREFIX)) {
      throw new Error(ERR_INVALID_CUSTOM_PARAM(customParam));
    }
    if (RESERVED_CONTEXT_PARAMS.includes(customParam)) {
      throw new Error(ERR_RESERVED_PARAM(customParam));
    }
    // If inputs are declared, validate against them
    if (this.declaredInputs.size > 0 && !this.declaredInputs.has(customParam)) {
      throw new Error(ERR_UNKNOWN_CUSTOM_CONTEXT_PARAM(customParam));
    }
  }

  private validateAuthProviders(): void {
    for (const param of this.declaredInputs) {
      if (!USER_ADDRESS_PARAMS.includes(param)) continue;
      if (!this.authProviders[param]) {
        throw new Error(ERR_AUTH_PROVIDER_REQUIRED(param));
      }
    }
  }

  private async fillContextParameters(): Promise<Record<string, ContextParam>> {
    const parameters = await this.fillAuthContextParameters();
    for (const key in this.customContextParameters) {
      parameters[key] = this.customContextParameters[key];
    }
    return parameters;
  }

  private async fillAuthContextParameters(): Promise<Record<string, ContextParam>> {
    const entries = await Promise.all(
      [...this.declaredInputs]
        .filter((param) => USER_ADDRESS_PARAMS.includes(param))
        .map(async (param) => {
          const maybeAuthProvider = this.authProviders[param];
          return [param, await maybeAuthProvider!.getOrCreateAuthSignature()];
        }),
    );
    return Object.fromEntries(entries);
  }

  private validateNoMissingContextParameters(
    parameters: Record<string, ContextParam>,
  ) {
    if (this.declaredInputs.size === 0) return; // no declared inputs = no validation
    const missingParameters = Array.from(this.declaredInputs).filter(
      (key) => parameters[key] === undefined,
    );
    if (missingParameters.length > 0) {
      throw new Error(ERR_MISSING_CONTEXT_PARAMS(missingParameters));
    }
  }
}
