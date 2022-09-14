import { ethers, utils as ethersUtils } from 'ethers';
import Joi, { ValidationError } from 'joi';

import {
  Eip712TypedData,
  Eip712TypedDataWithDomain,
  Web3Provider,
} from '../web3';

export class Operator {
  static readonly LOGICAL_OPERATORS: ReadonlyArray<string> = ['and', 'or'];

  constructor(public readonly operator: string) {
    if (!Operator.LOGICAL_OPERATORS.includes(operator)) {
      throw `"${operator}" is not a valid operator`;
    }
    this.operator = operator;
  }

  toObj() {
    return { operator: this.operator };
  }

  static fromObj(obj: Record<string, string>) {
    return new Operator(obj.operator);
  }

  public static AND() {
    return new Operator('and');
  }

  public static OR() {
    return new Operator('or');
  }
}

export class ConditionSet {
  constructor(
    public readonly conditions: ReadonlyArray<Condition | Operator>
  ) {}

  public validate() {
    if (this.conditions.length % 2 === 0) {
      throw new Error(
        'conditions must be odd length, ever other element being an operator'
      );
    }
    this.conditions.forEach((cnd: Condition | Operator, index) => {
      if (index % 2 && cnd.constructor.name !== 'Operator')
        throw new Error(
          `${index} element must be an Operator; Got ${cnd.constructor.name}.`
        );
      if (!(index % 2) && cnd.constructor.name === 'Operator')
        throw new Error(
          `${index} element must be a Condition; Got ${cnd.constructor.name}.`
        );
    });
    return true;
  }

  public toList() {
    return this.conditions.map((cnd) => {
      return cnd.toObj();
    });
  }

  public static fromList(list: ReadonlyArray<Record<string, string>>) {
    return new ConditionSet(
      list.map((ele: Record<string, string>) => {
        if ('operator' in ele) return Operator.fromObj(ele);
        return Condition.fromObj(ele);
      })
    );
  }

  public toJson() {
    // TODO: Remove this workaround and make sure the condition itself is setting the correct type
    const numberToStringReplacer = (key: unknown, value: unknown) =>
      typeof value === 'number' ? value.toString() : value;
    return JSON.stringify(this.toList(), numberToStringReplacer);
  }

  public toBase64() {
    return this.toBuffer().toString('base64');
  }

  public toBuffer() {
    return Buffer.from(this.toJson());
  }

  public static fromBytes(bytes: Uint8Array) {
    const decoded = Buffer.from(Buffer.from(bytes).toString('ascii'), 'base64');
    const list = JSON.parse(String.fromCharCode(...decoded));
    return ConditionSet.fromList(list);
  }

  public static fromJSON(json: string) {
    return ConditionSet.fromList(JSON.parse(json));
  }

  public buildContext(
    provider: ethers.providers.Web3Provider
  ): ConditionContext {
    const web3Provider = Web3Provider.fromEthersWeb3Provider(provider);
    return new ConditionContext(this, web3Provider);
  }
}

export class Condition {
  // TODO: Shared types, move them somewhere?
  public static readonly COMPARATOR_OPERATORS = ['==', '>', '<', '>=', '<=']; // TODO: Is "!=" supported?
  public static readonly SUPPORTED_CHAINS = [
    'ethereum',
    // 'polygon', 'mumbai'
  ];

  readonly schema = Joi.object({});
  public readonly defaults = {};
  public state = {};
  public error: ValidationError | undefined;
  public value: Record<string, unknown> = {};

  constructor(data: Record<string, unknown> = {}) {
    this.validate(data);
  }

  protected makeReturnValueTest() {
    return Joi.object({
      comparator: Joi.string()
        .valid(...Condition.COMPARATOR_OPERATORS)
        .required(),
      value: Joi.string().required(),
    });
  }

  public toObj(): Record<string, unknown> {
    return this.validate().value;
  }

  public static fromObj(obj: Record<string, string>) {
    return new EvmCondition(obj);
  }

  public validate(data: Record<string, unknown> = {}) {
    this.state = Object.assign(this.defaults, this.state, data);
    const { error, value } = this.schema.validate(this.state);
    // TODO: Always throws on error
    // if (error) {
    //   throw new Error(error.message);
    // }
    this.error = error;
    this.value = value;
    return { error, value };
  }

  public getContextParameters(): string[] {
    // Check all the places where context parameters may be hiding
    const asObject = this.toObj();
    let paramsToCheck: string[] = [];
    const method = asObject['method'] as string;
    if (method) {
      const contextParams = RpcCondition.CONTEXT_PARAMETERS_PER_METHOD[method];
      paramsToCheck = [...(contextParams ?? [])];
    }
    const returnValueTest = asObject['returnValueTest'] as Record<
      string,
      string
    >;
    if (returnValueTest) {
      paramsToCheck.push(returnValueTest['value']);
    }
    paramsToCheck = [
      ...paramsToCheck,
      ...((asObject['parameters'] as string[]) ?? []),
    ];
    const withoutDuplicates = new Set(
      paramsToCheck.filter((p) => paramsToCheck.includes(p))
    );
    return [...withoutDuplicates];
  }
}

// A helper method for making complex Joi types
// It says "allow these `types` when `parent` value is given"
const makeGuard = (
  schema: Joi.StringSchema | Joi.ArraySchema,
  types: Record<string, string[]>,
  parent: string
) => {
  Object.entries(types).forEach(([key, value]) => {
    schema = schema.when(parent, {
      is: key,
      then: value,
    });
  });
  return schema;
};

class TimelockCondition extends Condition {
  public static readonly CONDITION_TYPE = 'timelock';

  defaults = {
    method: 'timelock',
  };

  public readonly schema = Joi.object({
    returnValueTest: this.makeReturnValueTest(),
  });
}

class RpcCondition extends Condition {
  public static readonly CONDITION_TYPE = 'rpc';
  public static readonly RPC_METHODS = ['eth_getBalance', 'balanceOf'];
  public static readonly PARAMETERS_PER_METHOD: Record<string, string[]> = {
    eth_getBalance: ['address'],
    balanceOf: ['address'],
  };
  public static readonly CONTEXT_PARAMETERS_PER_METHOD: Record<
    string,
    string[]
  > = {
    eth_getBalance: [':userAddress'],
    ownerOf: [':userAddress'],
  };

  public readonly schema = Joi.object({
    chain: Joi.string()
      .valid(...Condition.SUPPORTED_CHAINS)
      .required(),
    method: Joi.string()
      .valid(...RpcCondition.RPC_METHODS)
      .required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  });

  public getContextParameters = (): string[] => {
    // TODO: Context parameters are actually in returnTest?
    // TODO: Sketch an API in tests before doing ant serious work
    const asObject = this.toObj();

    const method = asObject['method'] as string;
    const parameters = (asObject['parameters'] ?? []) as string[];

    const context = RpcCondition.CONTEXT_PARAMETERS_PER_METHOD[method];
    const returnValueTest = asObject['returnValueTest'] as Record<
      string,
      string
    >;

    const maybeParams = [...(context ?? []), returnValueTest['value']];
    return parameters.filter((p) => maybeParams.includes(p));
  };
}

class EvmCondition extends Condition {
  public static readonly CONDITION_TYPE = 'evm';
  public static readonly STANDARD_CONTRACT_TYPES = [
    'ERC20',
    'ERC721',
    'ERC1155',
  ];
  public static readonly METHODS_PER_CONTRACT_TYPE: Record<string, string[]> = {
    ERC20: ['balanceOf'],
    ERC721: ['balanceOf', 'ownerOf'],
    ERC1155: ['balanceOf'],
  };
  public static readonly PARAMETERS_PER_METHOD: Record<string, string[]> = {
    balanceOf: ['address'],
    ownerOf: ['address'],
  };
  public static readonly CONTEXT_PARAMETERS_PER_METHOD: Record<
    string,
    string[]
  > = {
    balanceOf: [':userAddress'],
    ownerOf: [':userAddress'],
  };

  private makeMethod = () =>
    makeGuard(
      Joi.string(),
      EvmCondition.METHODS_PER_CONTRACT_TYPE,
      'standardContractType'
    );

  public readonly schema = Joi.object({
    contractAddress: Joi.string()
      .pattern(new RegExp('^0x[a-fA-F0-9]{40}$'))
      .required(),
    chain: Joi.string()
      .valid(...Condition.SUPPORTED_CHAINS)
      .required(),
    standardContractType: Joi.string()
      .valid(...EvmCondition.STANDARD_CONTRACT_TYPES)
      .required(),
    functionAbi: Joi.string().optional(), // TODO: Should it be required? When? Where do I get it?
    method: this.makeMethod().required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  });
}

class ERC721Ownership extends EvmCondition {
  readonly defaults = {
    chain: 'ethereum',
    method: 'ownerOf',
    parameters: [],
    standardContractType: 'ERC721',
    returnValueTest: {
      comparator: '==',
      value: ':userAddress',
    },
    // functionAbi: '', // TODO: Add ERC721 ABI
  };
}

interface TypedSignature {
  signature: string;
  typedData: Eip712TypedData;
  address: string;
}

export class ConditionContext {
  private walletSignature?: Record<string, string>;

  constructor(
    private readonly conditionSet: ConditionSet,
    private readonly web3Provider: Web3Provider
  ) {}

  private get contextParameters() {
    const parameters = this.conditionSet.conditions
      .map((conditionOrOperator) => {
        if (conditionOrOperator instanceof Condition) {
          const condition = conditionOrOperator as Condition;
          return condition.getContextParameters();
        }
        return null;
      })
      .filter(
        (maybeResult: unknown | undefined) => !!maybeResult
      ) as string[][];
    return parameters.flat();
  }

  public async getOrCreateWalletSignature(): Promise<TypedSignature> {
    const address = await this.web3Provider.signer.getAddress();
    const storageKey = `wallet-signature-${address}`;

    // If we have a signature in localStorage, return it
    const isLocalStorage = typeof localStorage !== 'undefined';
    if (isLocalStorage) {
      const maybeSignature = localStorage.getItem(storageKey);
      if (maybeSignature) {
        return JSON.parse(maybeSignature);
      }
    }

    // If not, try returning from memory
    const maybeSignature = this.walletSignature?.[address];
    if (maybeSignature) {
      if (isLocalStorage) {
        localStorage.setItem(storageKey, maybeSignature);
      }
      return JSON.parse(maybeSignature);
    }

    // If at this point we didn't return, we need to create a new signature
    const typedSignature = await this.createWalletSignature();

    // Persist where you can
    if (isLocalStorage) {
      localStorage.setItem(storageKey, JSON.stringify(typedSignature));
    }
    if (!this.walletSignature) {
      this.walletSignature = {};
    }
    this.walletSignature[address] = JSON.stringify(typedSignature);
    return typedSignature;
  }

  private async createWalletSignature(): Promise<TypedSignature> {
    // Ensure freshness of the signature
    const { blockNumber, blockHash, chainId } = await this.getChainData();

    const address = await this.web3Provider.signer.getAddress();
    const signatureText = `I'm an owner of address ${address} as of block number ${blockNumber}`; // TODO: Update this text to a more dramatic one

    const salt = ethersUtils.randomBytes(32);

    const typedData: Eip712TypedData = {
      types: {
        Wallet: [
          { name: 'address', type: 'address' },
          { name: 'signatureText', type: 'string' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'blockHash', type: 'bytes32' },
        ],
      },
      domain: {
        name: 'tDec',
        version: '1',
        chainId,
        salt,
      },
      message: {
        address,
        signatureText,
        blockNumber,
        blockHash,
      },
    };
    const signature = await this.web3Provider.signer._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );

    const typedDataWithDomain: Eip712TypedDataWithDomain = {
      ...typedData,
      types: {
        ...typedData.types,
        EIP712Domain: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'version',
            type: 'string',
          },
          {
            name: 'chainId',
            type: 'uint256',
          },
        ],
      },
    };
    return { signature, typedData: typedDataWithDomain, address };
  }

  private async getChainData() {
    const blockNumber = await this.web3Provider.provider.getBlockNumber();
    const blockHash = (await this.web3Provider.provider.getBlock(blockNumber))
      .hash;
    const chainId = (await this.web3Provider.provider.getNetwork()).chainId;
    return { blockNumber, blockHash, chainId };
  }

  public toJson = async (): Promise<string> => {
    const userAddressParam = this.contextParameters.find(
      (p) => p === ':userAddress'
    );
    if (!userAddressParam) {
      return JSON.stringify({});
    }
    const typedSignature = await this.getOrCreateWalletSignature();
    const payload = { ':userAddress': typedSignature };
    return JSON.stringify(payload);
  };
}

export const Conditions = {
  ERC721Ownership,
  EvmCondition,
  TimelockCondition,
  RpcCondition,
  Condition,
  Operator,
};
