import {
  Domain,
  fromHexString,
  getPorterUris,
  SigningCoordinatorAgent,
  UserOperationToSign,
} from '@nucypher/shared';
import { ethers } from 'ethers';
import { beforeAll, describe, expect, test } from 'vitest';

import { initialize } from '../src';
import { context } from '../src/conditions';
import { Condition } from '../src/conditions/condition';
import { signUserOp } from '../src/sign';

const RPC_PROVIDER_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const DUMMY_ADDRESS = '0x742D35Cc6634C0532925A3b8D33c9c0E7B66C8E8';
const DOMAIN = 'lynx';
const COHORT_ID = 1;
const CHAIN_ID = 11155111;

// skip integration test if RUNNING_IN_CI is not set (it is set in CI environments)
describe.skipIf(!process.env.RUNNING_IN_CI)(
  'TACo Sign Integration Test',
  () => {
    let provider: ethers.providers.JsonRpcProvider;

    beforeAll(async () => {
      provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDER_URL);
      await initialize();
    });

    test('should sign a user operation with a signing cohort', async () => {
      const signer = new ethers.Wallet(
        ethers.Wallet.createRandom().privateKey,
        provider,
      );

      const userOp: UserOperationToSign = {
        sender: DUMMY_ADDRESS,
        nonce: '0x1',
        initCode: '0x',
        callData: '0x',
        callGasLimit: '0x5208',
        verificationGasLimit: '0x186a0',
        preVerificationGas: '0x5208',
        maxFeePerGas: '0x3b9aca00',
        maxPriorityFeePerGas: '0x3b9aca00',
        paymasterAndData: '0x',
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
      };

      const porterUris = await getPorterUris(DOMAIN as Domain);

      const signResult = await signUserOp(
        provider,
        DOMAIN as Domain,
        COHORT_ID,
        CHAIN_ID,
        userOp,
        '0.8.0',
        undefined,
        porterUris,
      );

      expect(signResult).toBeDefined();
      expect(signResult.messageHash).toBeDefined();

      const threshold = await SigningCoordinatorAgent.getThreshold(
        provider,
        DOMAIN as Domain,
        COHORT_ID,
      );

      expect(signResult.aggregatedSignature).toBeDefined();
      expect(fromHexString(signResult.aggregatedSignature!).length).toEqual(
        threshold * 65,
      );
      expect(signResult.signingResults).toBeDefined();
      expect(Object.keys(signResult.signingResults).length).toBeGreaterThan(0);
    }, 15000);

    test('should validate condition serialization round-trip with existing cohort conditions', async () => {
      const retrievedConditionHex =
        await SigningCoordinatorAgent.getSigningCohortConditions(
          provider,
          DOMAIN as Domain,
          COHORT_ID,
          CHAIN_ID,
        );

      expect(retrievedConditionHex).toBeDefined();
      expect(retrievedConditionHex).not.toBe('0x');
      expect(retrievedConditionHex.length).toBeGreaterThan(2);

      const chainConditionJson = ethers.utils.toUtf8String(
        retrievedConditionHex,
      );

      const retrievedCondition = Condition.fromJSON(chainConditionJson);

      await expect(
        context.ConditionContext.forSigningCohort(
          provider,
          DOMAIN as Domain,
          COHORT_ID,
          CHAIN_ID,
        ),
      ).resolves.not.toThrow();

      const roundTripJson = retrievedCondition.toJson();
      expect(JSON.parse(roundTripJson)).toEqual(JSON.parse(chainConditionJson));
    }, 6000);
  },
);
