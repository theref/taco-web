# TACo Signing SDK Documentation

## Overview

The TACo Signing SDK provides functionality for threshold signing operations using the TACo network. This document covers the recent improvements and changes made to the signing functionality, including API enhancements, condition management, and integration testing.

## Recent Changes Summary

The signing SDK has undergone significant improvements in July 2025, focusing on:

1. **API Design Optimization**: Implementation of a two-layer design for better developer experience
2. **Parameter Type Safety**: Enhanced type safety with `Uint8Array` parameters
3. **Condition Management**: Improved condition handling and serialization
4. **Testing Coverage**: Enhanced unit and integration testing

## Core Components

### 1. User Operation Signing (`signUserOp`)

The primary function for signing user operations using threshold signatures.

**Location**: `packages/taco/src/sign.ts:69`

**Function Signature**:
```typescript
export async function signUserOp(
  provider: ethers.providers.Provider,
  domain: Domain,
  cohortId: number,
  chainId: number,
  userOp: UserOperation,
  aaVersion: 'mdt' | '0.8.0' | string,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<SignResult>
```

**Key Features**:
- Supports multiple Account Abstraction versions ('mdt', '0.8.0', or custom)
- Handles threshold signature collection and aggregation
- Robust error handling for insufficient signatures and mismatched hashes
- Automatic signature aggregation when threshold is met

**Return Type**:
```typescript
export type SignResult = {
  messageHash: string;
  aggregatedSignature: string;
  signingResults: { [ursulaAddress: string]: TacoSignature };
}
```

### 2. Condition Management (`setSigningCohortConditions`)

Function for setting access conditions on signing cohorts.

**Location**: `packages/taco/src/sign.ts:179`

**Function Signature**:
```typescript
export async function setSigningCohortConditions(
  provider: ethers.providers.JsonRpcProvider,
  domain: Domain,
  conditions: Condition,
  cohortId: number,
  chainId: number,
  signer: ethers.Signer,
): Promise<ethers.ContractTransaction>
```

**Two-Layer Design**:
- **Public API Layer**: Accepts user-friendly `Condition` parameter (similar to encrypt())
- **Agent Layer**: Uses `Uint8Array` for efficient contract interaction
- **Internal Conversion**: Handles `Condition → ConditionExpression → JSON → Uint8Array`

### 3. SigningCoordinatorAgent

Low-level agent for interacting with the SigningCoordinator contract.

**Location**: `packages/shared/src/contracts/agents/signing-coordinator.ts`

**Key Methods**:

#### `getParticipants`
```typescript
public static async getParticipants(
  provider: ethers.providers.Provider,
  domain: Domain,
  cohortId: number,
): Promise<SignerInfo[]>
```

#### `getThreshold`
```typescript
public static async getThreshold(
  provider: ethers.providers.Provider,
  domain: Domain,
  cohortId: number,
): Promise<number>
```

#### `setSigningCohortConditions`
```typescript
public static async setSigningCohortConditions(
  provider: ethers.providers.Provider,
  domain: Domain,
  cohortId: number,
  chainId: number,
  conditions: Uint8Array,
  signer: ethers.Signer,
): Promise<ethers.ContractTransaction>
```

#### `getSigningCohortConditions`
```typescript
public static async getSigningCohortConditions(
  provider: ethers.providers.Provider,
  domain: Domain,
  cohortId: number,
  chainId: number,
): Promise<string>
```

## Usage Examples

### Basic User Operation Signing

```typescript
import { signUserOp } from '@nucypher/taco';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('...');
const userOp = {
  sender: '0x742D35Cc6634C0532925A3b8D33c9c0E7B66C8E8',
  nonce: 1,
  callData: '0xabc',
  // ... other UserOperation fields
};

const result = await signUserOp(
  provider,
  'lynx',      // domain
  5,           // cohortId
  11155111,    // chainId (Sepolia)
  userOp,
  '0.8.0',     // AA version
);

console.log('Message Hash:', result.messageHash);
console.log('Aggregated Signature:', result.aggregatedSignature);
```

### Setting Signing Cohort Conditions

```typescript
import { setSigningCohortConditions } from '@nucypher/taco';
import { RpcCondition } from '@nucypher/taco/conditions';
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider('...');
const signer = new ethers.Wallet('...', provider);

// Create a condition that checks ETH balance
const condition = new RpcCondition({
  chain: 11155111,
  method: 'eth_getBalance',
  parameters: [':userAddress', 'latest'],
  returnValueTest: {
    comparator: '>',
    value: BigInt(0),
  },
});

const tx = await setSigningCohortConditions(
  provider,
  'lynx',
  condition,
  1,           // cohortId
  11155111,    // chainId
  signer,
);

await tx.wait();
```

### Complex Condition Example

```typescript
import { CompoundCondition, ContractCondition, RpcCondition } from '@nucypher/taco/conditions';

// ETH balance check
const ethBalance = new RpcCondition({
  chain: 11155111,
  method: 'eth_getBalance',
  parameters: [':userAddress', 'latest'],
  returnValueTest: {
    comparator: '>',
    value: BigInt(0),
  },
});

// ERC20 token balance check  
const tokenBalance = new ContractCondition({
  contractAddress: '0x1234567890123456789012345678901234567890',
  chain: 11155111,
  standardContractType: 'ERC20',
  method: 'balanceOf',
  parameters: [':userAddress'],
  returnValueTest: {
    comparator: '>=',
    value: BigInt(1000),
  },
});

// Combine conditions with AND logic
const compoundCondition = CompoundCondition.and([ethBalance, tokenBalance]);

const tx = await setSigningCohortConditions(
  provider,
  'lynx',
  compoundCondition,
  cohortId,
  chainId,
  signer,
);
```

## Error Handling

The signing SDK includes robust error handling for common scenarios:

### Insufficient Signatures
```typescript
try {
  const result = await signUserOp(/* ... */);
} catch (error) {
  if (error.message.includes('Threshold of signatures not met')) {
    console.error('Not enough signers responded:', error);
  }
}
```

### Mismatched Hashes
When signers return different message hashes (indicating potential malicious behavior):
```
Error: "Threshold of signatures not met; multiple mismatched hashes found: {...}"
```

## Testing

### Unit Tests
Comprehensive unit tests are available in `packages/taco/test/taco-sign.test.ts` covering:
- Successful signing scenarios
- Error handling (insufficient signatures, mismatched hashes)
- Condition setting and validation
- Edge cases (threshold of 1, mixed errors and successes)

### Integration Tests  
Real-world integration tests in `packages/taco/integration-test/sign.test.ts` that:
- Test against live testnet (Sepolia)
- Validate condition serialization round-trips
- Ensure signature aggregation works correctly

Run tests with:
```bash
# Unit tests
npm test taco-sign.test.ts

# Integration tests (requires RUNNING_IN_CI=true)
RUNNING_IN_CI=true npm test sign.test.ts
```

## Architecture Improvements

### Two-Layer Design Pattern

The recent API redesign implements a clean separation:

1. **Public API**: Developer-friendly interface accepting `Condition` objects
2. **Agent Layer**: Efficient contract interface using `Uint8Array`
3. **Conversion Layer**: Automatic serialization between layers

This design provides:
- Optimal developer experience (similar to `encrypt()` API)
- Efficient contract interaction
- Type safety throughout the stack

### Parameter Order Consistency

Agent methods now follow consistent parameter ordering:
```typescript
method(provider, domain, cohortId, chainId, ...otherParams)
```

### Enhanced Type Safety

- `Uint8Array` for contract interaction parameters
- Strong typing for all condition objects
- Proper error types and messages

## Migration Guide

### From Old API
If you were previously using internal APIs:

**Before**:
```typescript
// Using ConditionExpression directly
const conditionExpr = new ConditionExpression(myCondition);
const bytes = ethers.utils.toUtf8Bytes(conditionExpr.toJson());
await SigningCoordinatorAgent.setSigningCohortConditions(
  provider, domain, cohortId, chainId, bytes, signer
);
```

**After**:
```typescript
// Use the public API directly
await setSigningCohortConditions(
  provider, domain, myCondition, cohortId, chainId, signer
);
```

## Best Practices

1. **Always check threshold requirements** before attempting to sign
2. **Handle network timeouts** gracefully in production environments  
3. **Validate conditions** before setting them on cohorts
4. **Use compound conditions** for complex access control scenarios
5. **Monitor signature collection** for debugging failed signing attempts

## Supported Networks

- **Mainnet**: Production TACo network
- **Testnet** (Sepolia): Testing and development  
- **Devnet**: Local development environments

## Future Enhancements

Areas identified for future improvement:
- Enhanced condition validation
- Batch signature operations
- Advanced error recovery mechanisms
- Performance optimizations for large cohorts

## Troubleshooting

### Common Issues

**Issue**: "Threshold of signatures not met"
- **Cause**: Network connectivity issues or insufficient active signers
- **Solution**: Check network status and cohort configuration

**Issue**: "Multiple mismatched hashes found"
- **Cause**: Potential malicious signers or network inconsistency
- **Solution**: Review cohort participants and network conditions

**Issue**: Condition serialization errors
- **Cause**: Invalid condition parameters or unsupported condition types
- **Solution**: Validate condition parameters and ensure all required fields are provided

## Related Documentation

- [TACo SDK Main Documentation](https://docs.taco.build/)
- [Account Abstraction Integration Guide](https://docs.taco.build/taco-integration/)
- [Condition Types Reference](packages/taco/src/conditions/)

## Contributing

When contributing to the signing SDK:
1. Ensure all tests pass (`npm test`)
2. Add integration tests for new features
3. Follow the two-layer design pattern
4. Update this documentation for API changes
5. Maintain backward compatibility where possible