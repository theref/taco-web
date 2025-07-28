import {
  AggregatedTranscript,
  Capsule,
  CapsuleFrag,
  DecryptionShareSimple,
  Dkg,
  FerveoVariant,
  Keypair,
  MessageKit,
  SecretKey,
  SessionStaticKey,
  SessionStaticSecret,
  ThresholdMessageKit,
  Validator,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import {
  ChecksumAddress,
  DkgCoordinatorAgent,
  GetUrsulasResult,
  PorterClient,
  RetrieveCFragsResult,
} from '@nucypher/shared';
import axios from 'axios';
import { ethers } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bytesEqual,
  fakeDkgFlow,
  fakePorterUri,
  fakeProvider,
  fakeSigner,
  fakeTDecFlow,
  fakeUrsulas,
  fromBytes,
  mockDetectEthereumProvider,
  mockGetRitualIdFromPublicKey,
  mockGetUrsulas,
  mockRetrieveCFragsRequest,
  mockRetrieveAndDecrypt,
  mockTacoDecrypt,
} from '../src/utils';

vi.mock('axios');
vi.mock('@nucypher/shared', async () => {
  const actual = await vi.importActual('@nucypher/shared');
  return {
    ...actual,
    DkgCoordinatorAgent: {
      getRitualIdFromPublicKey: vi.fn(),
    },
  };
});

const mockedAxios = vi.mocked(axios);
const mockedDkgCoordinatorAgent = vi.mocked(DkgCoordinatorAgent);

describe('test-utils', () => {
  describe('bytesEqual', () => {
    it('returns true for identical byte arrays', () => {
      const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
      const bytes2 = new Uint8Array([1, 2, 3, 4, 5]);
      expect(bytesEqual(bytes1, bytes2)).toBe(true);
    });

    it('returns false for different byte arrays', () => {
      const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
      const bytes2 = new Uint8Array([1, 2, 3, 4, 6]);
      expect(bytesEqual(bytes1, bytes2)).toBe(false);
    });

    it('returns false for arrays of different lengths', () => {
      const bytes1 = new Uint8Array([1, 2, 3]);
      const bytes2 = new Uint8Array([1, 2, 3, 4]);
      expect(bytesEqual(bytes1, bytes2)).toBe(false);
    });

    it('returns true for empty arrays', () => {
      const bytes1 = new Uint8Array([]);
      const bytes2 = new Uint8Array([]);
      expect(bytesEqual(bytes1, bytes2)).toBe(true);
    });

    it('handles single byte arrays', () => {
      const bytes1 = new Uint8Array([42]);
      const bytes2 = new Uint8Array([42]);
      const bytes3 = new Uint8Array([43]);
      
      expect(bytesEqual(bytes1, bytes2)).toBe(true);
      expect(bytesEqual(bytes1, bytes3)).toBe(false);
    });
  });

  describe('fromBytes', () => {
    it('converts bytes to string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = fromBytes(bytes);
      expect(result).toBe('Hello');
    });

    it('handles empty bytes', () => {
      const bytes = new Uint8Array([]);
      const result = fromBytes(bytes);
      expect(result).toBe('');
    });

    it('handles UTF-8 encoded bytes', () => {
      const str = 'Hello 🌍';
      const bytes = new TextEncoder().encode(str);
      const result = fromBytes(bytes);
      expect(result).toBe(str);
    });
  });

  describe('fakePorterUri', () => {
    it('provides a fake Porter URI', () => {
      expect(fakePorterUri).toBe('https://_this_should_crash.com/');
    });
  });

  describe('fakeUrsulas', () => {
    it('generates default number of fake ursulas', () => {
      const ursulas = fakeUrsulas();
      expect(ursulas).toHaveLength(4);
    });

    it('generates specified number of fake ursulas', () => {
      const ursulas = fakeUrsulas(7);
      expect(ursulas).toHaveLength(7);
    });

    it('generates ursulas with correct properties', () => {
      const ursulas = fakeUrsulas(2);
      
      expect(ursulas[0]).toHaveProperty('encryptingKey');
      expect(ursulas[0]).toHaveProperty('checksumAddress');
      expect(ursulas[0]).toHaveProperty('uri');
      
      expect(ursulas[0].checksumAddress).toMatch(/^0x[0-9a-f]{40}$/);
      expect(ursulas[0].uri).toMatch(/^https:\/\/example\.\d+\.com:9151$/);
    });

    it('generates unique addresses for different ursulas', () => {
      const ursulas = fakeUrsulas(3);
      const addresses = ursulas.map(u => u.checksumAddress);
      const uniqueAddresses = new Set(addresses);
      expect(uniqueAddresses.size).toBe(3);
    });

    it('handles zero ursulas', () => {
      const ursulas = fakeUrsulas(0);
      expect(ursulas).toHaveLength(0);
    });
  });

  describe('fakeSigner', () => {
    it('creates a fake signer with default parameters', () => {
      const signer = fakeSigner();
      
      expect(signer).toHaveProperty('provider');
      expect(signer).toHaveProperty('_signTypedData');
      expect(signer).toHaveProperty('signMessage');
      expect(signer).toHaveProperty('getAddress');
    });

    it('creates signer with custom parameters', () => {
      const customSecretKey = SecretKey.random().toBEBytes();
      const signer = fakeSigner(customSecretKey, 2000, 2000);
      
      expect(signer.provider.getBlockNumber()).resolves.toBe(2000);
      expect(signer.provider.getBlock()).resolves.toEqual({ timestamp: 2000 });
    });

    it('provides expected method responses', async () => {
      const signer = fakeSigner();
      
      expect(await signer._signTypedData()).toBe('fake-typed-signature');
      expect(await signer.signMessage()).toBe('fake-signature');
      expect(await signer.getAddress()).toBe('0x0000000000000000000000000000000000000000');
    });
  });

  describe('fakeProvider', () => {
    it('creates a fake provider with default parameters', () => {
      const provider = fakeProvider();
      
      expect(provider).toHaveProperty('getBlockNumber');
      expect(provider).toHaveProperty('getBlock');
      expect(provider).toHaveProperty('getSigner');
      expect(provider).toHaveProperty('getNetwork');
    });

    it('provides consistent block information', async () => {
      const provider = fakeProvider(undefined, 1500, 1500);
      
      expect(await provider.getBlockNumber()).toBe(1500);
      expect(await provider.getBlock()).toEqual({ timestamp: 1500 });
    });

    it('provides network information', async () => {
      const provider = fakeProvider();
      const network = await provider.getNetwork();
      
      expect(network.name).toBe('mockNetwork');
      expect(network.chainId).toBe(-1);
    });
  });

  describe('mockGetUrsulas', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('mocks axios.get with default ursulas', () => {
      const spy = mockGetUrsulas();
      
      expect(spy).toBeDefined();
      expect(vi.isMockFunction(axios.get)).toBe(true);
    });

    it('returns properly formatted ursula response', async () => {
      const testUrsulas = fakeUrsulas(2);
      mockGetUrsulas(testUrsulas);
      
      const response = await axios.get('test-url');
      const result = response.data as GetUrsulasResult;
      
      expect(result.result.ursulas).toHaveLength(2);
      expect(result.version).toBe('5.2.0');
      
      const ursula = result.result.ursulas[0];
      expect(ursula).toHaveProperty('encrypting_key');
      expect(ursula).toHaveProperty('uri');
      expect(ursula).toHaveProperty('checksum_address');
    });

    it('handles custom ursulas', async () => {
      const customUrsulas = fakeUrsulas(1);
      customUrsulas[0].uri = 'https://custom.example.com:9151';
      
      mockGetUrsulas(customUrsulas);
      
      const response = await axios.get('test-url');
      const result = response.data as GetUrsulasResult;
      
      expect(result.result.ursulas[0].uri).toBe('https://custom.example.com:9151');
    });
  });

  describe('mockRetrieveCFragsRequest', () => {
    let mockUrsulas: ChecksumAddress[];
    let mockVerifiedKFrags: VerifiedKeyFrag[];
    let mockCapsule: Capsule;

    beforeEach(() => {
      mockUrsulas = ['0x1234567890123456789012345678901234567890'];
      mockVerifiedKFrags = [
        {
          toBytes: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
        } as unknown as VerifiedKeyFrag,
      ];
      mockCapsule = {} as Capsule;
      
      vi.clearAllMocks();
    });

    it('mocks PorterClient.retrieveCFrags method', () => {
      const spy = mockRetrieveCFragsRequest(mockUrsulas, mockVerifiedKFrags, mockCapsule);
      
      expect(spy).toBeDefined();
      expect(vi.isMockFunction(PorterClient.prototype.retrieveCFrags)).toBe(true);
    });

    it('returns properly formatted cfrag response', async () => {
      const spy = mockRetrieveCFragsRequest(mockUrsulas, mockVerifiedKFrags, mockCapsule);
      
      const client = new PorterClient('test-uri');
      const result = await client.retrieveCFrags(
        {} as any, // treasureMap
        [], // retrievalKits
        {} as any, // aliceVerifyingKey
        {} as any, // bobEncryptingKey
        {} as any // bobVerifyingKey
      );
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('cFrags');
      expect(result[0]).toHaveProperty('errors');
      expect(result[0].errors).toEqual({});
    });
  });

  describe('mockDetectEthereumProvider', () => {
    it('returns a function that provides a mock external provider', () => {
      const detector = mockDetectEthereumProvider();
      const provider = detector();
      
      expect(typeof detector).toBe('function');
      expect(provider).toBeDefined();
    });
  });

  describe('fakeDkgFlow', () => {
    it('creates a complete DKG flow with simple variant', () => {
      const variant = FerveoVariant.simple;
      const ritualId = 123;
      const sharesNum = 5;
      const threshold = 3;
      
      const flow = fakeDkgFlow(variant, ritualId, sharesNum, threshold);
      
      expect(flow.ritualId).toBe(ritualId);
      expect(flow.sharesNum).toBe(sharesNum);
      expect(flow.threshold).toBe(threshold);
      expect(flow.validators).toHaveLength(sharesNum);
      expect(flow.validatorKeypairs).toHaveLength(sharesNum);
      expect(flow.transcripts).toHaveLength(sharesNum);
      expect(flow.receivedMessages).toHaveLength(threshold);
      expect(flow.dkg).toBeDefined();
      expect(flow.serverAggregate).toBeDefined();
    });

    it('creates a complete DKG flow with precomputed variant', () => {
      const variant = FerveoVariant.precomputed;
      const ritualId = 456;
      const sharesNum = 7;
      const threshold = 4;
      
      const flow = fakeDkgFlow(variant, ritualId, sharesNum, threshold);
      
      expect(flow.ritualId).toBe(ritualId);
      expect(flow.sharesNum).toBe(sharesNum);
      expect(flow.threshold).toBe(threshold);
      expect(flow.validators).toHaveLength(sharesNum);
    });

    it('throws error for invalid variant', () => {
      const invalidVariant = {} as FerveoVariant;
      
      expect(() => fakeDkgFlow(invalidVariant, 1, 3, 2)).toThrow('Invalid variant');
    });
  });

  describe('fakeTDecFlow', () => {
    it('processes threshold decryption flow', () => {
      // First create a DKG flow
      const dkgFlow = fakeDkgFlow(FerveoVariant.simple, 123, 5, 3);
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      
      // Create a mock threshold message kit
      const mockThresholdMessageKit = {
        ciphertextHeader: {} as any,
        acp: { aad: vi.fn().mockReturnValue(new Uint8Array([6, 7, 8])) },
        decryptWithSharedSecret: vi.fn().mockReturnValue(message),
      } as unknown as ThresholdMessageKit;
      
      const flow = {
        ...dkgFlow,
        message,
        dkgPublicKey: {} as any,
        thresholdMessageKit: mockThresholdMessageKit,
      };
      
      const result = fakeTDecFlow(flow);
      
      expect(result.decryptionShares).toBeDefined();
      expect(result.plaintext).toEqual(message);
      expect(result.sharedSecret).toBeDefined();
      expect(result.thresholdMessageKit).toBe(mockThresholdMessageKit);
    });

    it('throws error on decryption failure', () => {
      const dkgFlow = fakeDkgFlow(FerveoVariant.simple, 123, 5, 3);
      const originalMessage = new Uint8Array([1, 2, 3, 4, 5]);
      const differentMessage = new Uint8Array([5, 4, 3, 2, 1]);
      
      const mockThresholdMessageKit = {
        ciphertextHeader: {} as any,
        acp: { aad: vi.fn().mockReturnValue(new Uint8Array([6, 7, 8])) },
        decryptWithSharedSecret: vi.fn().mockReturnValue(differentMessage),
      } as unknown as ThresholdMessageKit;
      
      const flow = {
        ...dkgFlow,
        message: originalMessage,
        dkgPublicKey: {} as any,
        thresholdMessageKit: mockThresholdMessageKit,
      };
      
      expect(() => fakeTDecFlow(flow)).toThrow('Decryption failed');
    });
  });

  describe('mockTacoDecrypt', () => {
    it('mocks PorterClient.tacoDecrypt method', () => {
      const mockDecryptionShares = [
        { toBytes: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])) },
      ] as unknown as DecryptionShareSimple[];
      
      const mockParticipantSecrets = {
        '0x123': {
          deriveSharedSecret: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
        } as unknown as SessionStaticSecret,
      };
      
      const mockRequesterPk = {} as SessionStaticKey;
      
      const spy = mockTacoDecrypt(
        123,
        mockDecryptionShares,
        mockParticipantSecrets,
        mockRequesterPk
      );
      
      expect(spy).toBeDefined();
      expect(vi.isMockFunction(PorterClient.prototype.tacoDecrypt)).toBe(true);
    });

    it('handles errors in decrypt response', () => {
      const mockDecryptionShares = [] as DecryptionShareSimple[];
      const mockParticipantSecrets = {};
      const mockRequesterPk = {} as SessionStaticKey;
      const errors = { '0x456': 'Decryption failed' };
      
      const spy = mockTacoDecrypt(
        123,
        mockDecryptionShares,
        mockParticipantSecrets,
        mockRequesterPk,
        errors
      );
      
      expect(spy).toBeDefined();
    });
  });

  describe('mockGetRitualIdFromPublicKey', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('mocks DkgCoordinatorAgent.getRitualIdFromPublicKey', () => {
      const ritualId = 789;
      const spy = mockGetRitualIdFromPublicKey(ritualId);
      
      expect(spy).toBeDefined();
      expect(vi.isMockFunction(DkgCoordinatorAgent.getRitualIdFromPublicKey)).toBe(true);
    });

    it('returns specified ritual ID', async () => {
      const ritualId = 789;
      mockGetRitualIdFromPublicKey(ritualId);
      
      const result = await DkgCoordinatorAgent.getRitualIdFromPublicKey();
      expect(result).toBe(ritualId);
    });
  });

  describe('mockRetrieveAndDecrypt', () => {
    it('sets up mocks for retrieve and decrypt operation', () => {
      const mockUrsula = { checksumAddress: '0x123' as ChecksumAddress };
      const mockVerifiedKFrag = {} as VerifiedKeyFrag;
      const mockCapsule = {} as Capsule;
      
      const makeTreasureMapSpy = vi.fn();
      makeTreasureMapSpy.mock.calls = [[[mockUrsula], [mockVerifiedKFrag]]];
      
      const mockMessageKit = { capsule: mockCapsule } as MessageKit;
      
      const spy = mockRetrieveAndDecrypt(makeTreasureMapSpy, mockMessageKit);
      
      expect(spy).toBeDefined();
      expect(vi.isMockFunction(PorterClient.prototype.retrieveCFrags)).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('can chain multiple mock utilities together', () => {
      // Create fake ursulas
      const ursulas = fakeUrsulas(3);
      
      // Mock the get ursulas call
      const getUrsulasSpy = mockGetUrsulas(ursulas);
      
      // Mock ritual ID lookup
      const ritualId = 123;
      const getRitualIdSpy = mockGetRitualIdFromPublicKey(ritualId);
      
      expect(getUrsulasSpy).toBeDefined();
      expect(getRitualIdSpy).toBeDefined();
      expect(ursulas).toHaveLength(3);
    });

    it('provides consistent fake data across utilities', () => {
      const provider = fakeProvider();
      const signer = fakeSigner();
      const ursulas = fakeUrsulas(5);
      
      expect(provider).toBeDefined();
      expect(signer).toBeDefined();
      expect(ursulas).toHaveLength(5);
      
      // All utilities should provide consistent interfaces
      expect(typeof provider.getBlockNumber).toBe('function');
      expect(typeof signer.getAddress).toBe('function');
      expect(ursulas[0]).toHaveProperty('checksumAddress');
    });
  });
});