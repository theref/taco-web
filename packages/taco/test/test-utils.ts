// Disabling some of the eslint rules for convenience.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  AggregatedTranscript,
  DecryptionShareSimple,
  Dkg,
  FerveoVariant,
  Keypair,
  SessionSecretFactory,
  SessionStaticSecret,
  ThresholdMessageKit,
  Transcript,
  Validator,
  ValidatorMessage,
} from '@nucypher/nucypher-core';
import {
  CoordinatorRitual,
  DkgCoordinatorAgent,
  DkgParticipant,
  DkgRitualState,
  toBytes,
  toHexString,
  zip,
} from '@nucypher/shared';
import {
  fakeDkgFlow,
  fakeProvider,
  fakeTDecFlow,
} from '@nucypher/test-utils';
import { MockInstance, vi } from 'vitest';

import { Condition } from '../src/conditions/condition';
import { DkgClient, DkgRitual } from '../src/dkg';
import { encryptMessage } from '../src/tdec';

// A minimal valid WASM module (magic + version header) base64-encoded
const VALID_WASM_BASE64 = 'AGFzbQEAAAA=';

export const fakeCondition = () =>
  new Condition({ wasm: VALID_WASM_BASE64, name: 'test-condition' });

export const fakeDkgTDecFlowE2E: (
  ritualId?: number,
  variant?: FerveoVariant,
  condition?: Condition,
  message?: Uint8Array,
  sharesNum?: number,
  threshold?: number,
) => Promise<{
  dkg: Dkg;
  serverAggregate: AggregatedTranscript;
  sharesNum: number;
  transcripts: Transcript[];
  validatorKeypairs: Keypair[];
  validators: Validator[];
  ritualId: number;
  threshold: number;
  receivedMessages: ValidatorMessage[];
  message: Uint8Array;
  thresholdMessageKit: ThresholdMessageKit;
  decryptionShares: DecryptionShareSimple[];
}> = async (
  ritualId = 0,
  variant: FerveoVariant = FerveoVariant.precomputed,
  condition: Condition = fakeCondition(),
  message = toBytes('fake-message'),
  sharesNum = 4,
  threshold = 4,
) => {
  const ritual = fakeDkgFlow(variant, ritualId, sharesNum, threshold);
  const dkgPublicKey = ritual.serverAggregate.publicKey;
  const provider = fakeProvider();
  const thresholdMessageKit = await encryptMessage(
    message,
    dkgPublicKey,
    condition,
    provider.getSigner(),
  );

  const { decryptionShares } = fakeTDecFlow({
    ...ritual,
    message,
    dkgPublicKey,
    thresholdMessageKit,
  });

  return {
    ...ritual,
    message,
    decryptionShares,
    thresholdMessageKit,
  };
};

export const fakeCoordinatorRitual = async (): Promise<CoordinatorRitual> => {
  const ritual = await fakeDkgTDecFlowE2E();
  const dkgPkBytes = ritual.serverAggregate.publicKey.toBytes();
  return {
    initiator: ritual.validators[0].address.toString(),
    dkgSize: ritual.sharesNum,
    initTimestamp: 0,
    totalTranscripts: ritual.receivedMessages.length,
    totalAggregations: ritual.sharesNum,
    aggregationMismatch: false,
    aggregatedTranscript: toHexString(ritual.serverAggregate.toBytes()),
    publicKey: {
      word0: toHexString(dkgPkBytes.slice(0, 32)),
      word1: toHexString(dkgPkBytes.slice(32, 48)),
    } as [string, string] & {
      word0: string;
      word1: string;
    },
    endTimestamp: 0,
    authority: '0x0',
    threshold: ritual.threshold,
    accessController: '0x0',
  };
};

export const mockDkgParticipants = async (
  ritualId: number,
): Promise<{
  participants: DkgParticipant[];
  participantSecrets: Record<string, SessionStaticSecret>;
}> => {
  const ritual = await fakeDkgTDecFlowE2E(ritualId);
  const label = toBytes(`${ritualId}`);

  const participantSecrets: Record<string, SessionStaticSecret> =
    Object.fromEntries(
      ritual.validators.map(({ address }) => {
        const participantSecret = SessionSecretFactory.random().makeKey(label);
        return [address.toString(), participantSecret];
      }),
    );

  const participants: DkgParticipant[] = zip(
    Object.entries(participantSecrets),
    ritual.transcripts,
  ).map(([[address, secret], transcript]) => {
    return {
      provider: address,
      aggregated: true,
      transcript,
      decryptionRequestStaticKey: secret.publicKey(),
    } as DkgParticipant;
  });
  return { participantSecrets, participants };
};

export const fakeRitualId = 0;

export const fakeDkgRitual = (ritual: {
  dkg: Dkg;
  sharesNum: number;
  threshold: number;
  serverAggregate: AggregatedTranscript;
}) => {
  return new DkgRitual(
    fakeRitualId,
    ritual.serverAggregate.publicKey,
    ritual.sharesNum,
    ritual.threshold,
    DkgRitualState.ACTIVE,
  );
};

export const mockGetRitual = (): MockInstance => {
  return vi.spyOn(DkgCoordinatorAgent, 'getRitual').mockImplementation(() => {
    return Promise.resolve(fakeCoordinatorRitual());
  });
};

export const mockGetActiveRitual = (dkgRitual: DkgRitual): MockInstance => {
  return vi.spyOn(DkgClient, 'getActiveRitual').mockImplementation(() => {
    return Promise.resolve(dkgRitual);
  });
};

export const mockMakeSessionKey = (secret: SessionStaticSecret) => {
  return vi
    .spyOn(SessionStaticSecret, 'random')
    .mockImplementation(() => secret);
};

export const mockGetParticipants = (
  participants: DkgParticipant[],
): MockInstance => {
  return vi
    .spyOn(DkgCoordinatorAgent, 'getParticipants')
    .mockImplementation(() => {
      return Promise.resolve(participants);
    });
};
