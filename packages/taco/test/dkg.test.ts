import { DkgPublicKey } from '@nucypher/nucypher-core';
import {
  ChecksumAddress,
  DkgCoordinatorAgent,
  DkgRitualState,
  Domain,
} from '@nucypher/shared';
import { ethers } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DkgClient, DkgRitual, DkgRitualJSON } from '../src/dkg';

vi.mock('@nucypher/shared', async () => {
  const actual = await vi.importActual('@nucypher/shared');
  return {
    ...actual,
    DkgCoordinatorAgent: {
      initializeRitual: vi.fn(),
      getRitualState: vi.fn(),
      getRitual: vi.fn(),
      onRitualEndEvent: vi.fn(),
    },
  };
});

const mockedDkgCoordinatorAgent = vi.mocked(DkgCoordinatorAgent);

describe('dkg', () => {
  describe('DkgRitual', () => {
    let mockDkgPublicKey: DkgPublicKey;
    let ritualData: {
      id: number;
      dkgPublicKey: DkgPublicKey;
      sharesNum: number;
      threshold: number;
      state: DkgRitualState;
    };

    beforeEach(() => {
      mockDkgPublicKey = {
        toBytes: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4])),
        equals: vi.fn(),
      } as unknown as DkgPublicKey;

      ritualData = {
        id: 123,
        dkgPublicKey: mockDkgPublicKey,
        sharesNum: 5,
        threshold: 3,
        state: DkgRitualState.ACTIVE,
      };

      vi.clearAllMocks();
    });

    describe('constructor', () => {
      it('creates ritual with correct properties', () => {
        const ritual = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          ritualData.state
        );

        expect(ritual.id).toBe(123);
        expect(ritual.dkgPublicKey).toBe(mockDkgPublicKey);
        expect(ritual.sharesNum).toBe(5);
        expect(ritual.threshold).toBe(3);
        expect(ritual.state).toBe(DkgRitualState.ACTIVE);
      });
    });

    describe('toObj', () => {
      it('converts ritual to JSON object', () => {
        const ritual = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          ritualData.state
        );

        const obj = ritual.toObj();

        expect(obj).toEqual({
          id: 123,
          dkgPublicKey: new Uint8Array([1, 2, 3, 4]),
          sharesNum: 5,
          threshold: 3,
          state: DkgRitualState.ACTIVE,
        });

        expect(mockDkgPublicKey.toBytes).toHaveBeenCalled();
      });
    });

    describe('fromObj', () => {
      it('creates ritual from JSON object', () => {
        const jsonObj: DkgRitualJSON = {
          id: 456,
          dkgPublicKey: new Uint8Array([5, 6, 7, 8]),
          sharesNum: 7,
          threshold: 4,
          state: DkgRitualState.INVALID,
        };

        const mockDkgPublicKeyFromBytes = {} as DkgPublicKey;
        vi.spyOn(DkgPublicKey, 'fromBytes').mockReturnValue(mockDkgPublicKeyFromBytes);

        const ritual = DkgRitual.fromObj(jsonObj);

        expect(ritual.id).toBe(456);
        expect(ritual.dkgPublicKey).toBe(mockDkgPublicKeyFromBytes);
        expect(ritual.sharesNum).toBe(7);
        expect(ritual.threshold).toBe(4);
        expect(ritual.state).toBe(DkgRitualState.INVALID);

        expect(DkgPublicKey.fromBytes).toHaveBeenCalledWith(new Uint8Array([5, 6, 7, 8]));
      });
    });

    describe('equals', () => {
      it('returns true for identical rituals', () => {
        const ritual1 = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          ritualData.state
        );

        const ritual2 = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          ritualData.state
        );

        mockDkgPublicKey.equals = vi.fn().mockReturnValue(true);

        expect(ritual1.equals(ritual2)).toBe(true);
        expect(mockDkgPublicKey.equals).toHaveBeenCalledWith(ritualData.dkgPublicKey);
      });

      it('returns false for rituals with different IDs', () => {
        const ritual1 = new DkgRitual(
          123,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          ritualData.state
        );

        const ritual2 = new DkgRitual(
          456,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          ritualData.state
        );

        expect(ritual1.equals(ritual2)).toBe(false);
      });

      it('returns false for rituals with different public keys', () => {
        const otherMockDkgPublicKey = {} as DkgPublicKey;
        const ritual1 = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          ritualData.state
        );

        const ritual2 = new DkgRitual(
          ritualData.id,
          otherMockDkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          ritualData.state
        );

        mockDkgPublicKey.equals = vi.fn().mockReturnValue(false);

        expect(ritual1.equals(ritual2)).toBe(false);
      });

      it('returns false for rituals with different shares numbers', () => {
        const ritual1 = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          5,
          ritualData.threshold,
          ritualData.state
        );

        const ritual2 = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          7,
          ritualData.threshold,
          ritualData.state
        );

        mockDkgPublicKey.equals = vi.fn().mockReturnValue(true);

        expect(ritual1.equals(ritual2)).toBe(false);
      });

      it('returns false for rituals with different thresholds', () => {
        const ritual1 = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          3,
          ritualData.state
        );

        const ritual2 = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          5,
          ritualData.state
        );

        mockDkgPublicKey.equals = vi.fn().mockReturnValue(true);

        expect(ritual1.equals(ritual2)).toBe(false);
      });

      it('returns false for rituals with different states', () => {
        const ritual1 = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          DkgRitualState.ACTIVE
        );

        const ritual2 = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          DkgRitualState.INVALID
        );

        mockDkgPublicKey.equals = vi.fn().mockReturnValue(true);

        expect(ritual1.equals(ritual2)).toBe(false);
      });
    });

    describe('serialization round trip', () => {
      it('maintains equality after serialization and deserialization', () => {
        const originalRitual = new DkgRitual(
          ritualData.id,
          ritualData.dkgPublicKey,
          ritualData.sharesNum,
          ritualData.threshold,
          ritualData.state
        );

        const obj = originalRitual.toObj();
        
        vi.spyOn(DkgPublicKey, 'fromBytes').mockReturnValue(mockDkgPublicKey);
        mockDkgPublicKey.equals = vi.fn().mockReturnValue(true);

        const deserializedRitual = DkgRitual.fromObj(obj);

        expect(originalRitual.equals(deserializedRitual)).toBe(true);
      });
    });
  });

  describe('DkgClient', () => {
    let mockProvider: ethers.providers.Provider;
    let mockSigner: ethers.Signer;
    const domain: Domain = 'lynx';
    const ursulas: ChecksumAddress[] = [
      '0x1234567890123456789012345678901234567890',
      '0x0987654321098765432109876543210987654321',
    ];

    beforeEach(() => {
      mockProvider = {} as ethers.providers.Provider;
      mockSigner = {} as ethers.Signer;
      vi.clearAllMocks();
    });

    describe('initializeRitual', () => {
      const authority = '0xauthority...';
      const duration = 86400; // 1 day
      const accessController = '0xaccesscontroller...';

      it('initializes ritual without waiting for end', async () => {
        const expectedRitualId = 42;
        mockedDkgCoordinatorAgent.initializeRitual.mockResolvedValue(expectedRitualId);

        const ritualId = await DkgClient.initializeRitual(
          mockProvider,
          mockSigner,
          domain,
          ursulas,
          authority,
          duration,
          accessController,
          false
        );

        expect(mockedDkgCoordinatorAgent.initializeRitual).toHaveBeenCalledWith(
          mockProvider,
          mockSigner,
          domain,
          ursulas.sort(),
          authority,
          duration,
          accessController
        );

        expect(ritualId).toBe(expectedRitualId);
      });

      it('sorts ursulas before contract call', async () => {
        const unsortedUrsulas = [
          '0x9999999999999999999999999999999999999999',
          '0x1111111111111111111111111111111111111111',
          '0x5555555555555555555555555555555555555555',
        ];

        mockedDkgCoordinatorAgent.initializeRitual.mockResolvedValue(1);

        await DkgClient.initializeRitual(
          mockProvider,
          mockSigner,
          domain,
          unsortedUrsulas,
          authority,
          duration,
          accessController,
        );

        expect(mockedDkgCoordinatorAgent.initializeRitual).toHaveBeenCalledWith(
          mockProvider,
          mockSigner,
          domain,
          [
            '0x1111111111111111111111111111111111111111',
            '0x5555555555555555555555555555555555555555',
            '0x9999999999999999999999999999999999999999',
          ],
          authority,
          duration,
          accessController
        );
      });

      it('waits for ritual end when requested and succeeds', async () => {
        const expectedRitualId = 42;
        mockedDkgCoordinatorAgent.initializeRitual.mockResolvedValue(expectedRitualId);
        mockedDkgCoordinatorAgent.onRitualEndEvent.mockImplementation(
          (_provider, _domain, _ritualId, callback) => {
            // Simulate successful ritual end
            setTimeout(() => callback(true), 0);
          }
        );

        const ritualId = await DkgClient.initializeRitual(
          mockProvider,
          mockSigner,
          domain,
          ursulas,
          authority,
          duration,
          accessController,
          true
        );

        expect(ritualId).toBe(expectedRitualId);
        expect(mockedDkgCoordinatorAgent.onRitualEndEvent).toHaveBeenCalledWith(
          mockProvider,
          domain,
          expectedRitualId,
          expect.any(Function)
        );
      });

      it('throws error when ritual initialization fails', async () => {
        const expectedRitualId = 42;
        mockedDkgCoordinatorAgent.initializeRitual.mockResolvedValue(expectedRitualId);
        mockedDkgCoordinatorAgent.onRitualEndEvent.mockImplementation(
          (_provider, _domain, _ritualId, callback) => {
            // Simulate failed ritual end
            setTimeout(() => callback(false), 0);
          }
        );
        mockedDkgCoordinatorAgent.getRitualState.mockResolvedValue(DkgRitualState.INVALID);

        await expect(
          DkgClient.initializeRitual(
            mockProvider,
            mockSigner,
            domain,
            ursulas,
            authority,
            duration,
            accessController,
            true
          )
        ).rejects.toThrow(
          `Ritual initialization failed. Ritual id ${expectedRitualId} is in state ${DkgRitualState.INVALID}`
        );
      });
    });

    describe('getRitual', () => {
      it('retrieves ritual information', async () => {
        const ritualId = 123;
        const mockRitualData = {
          publicKey: {
            word0: '0x1234567890abcdef',
            word1: '0xfedcba0987654321',
          },
          dkgSize: 5,
          threshold: 3,
        };

        mockedDkgCoordinatorAgent.getRitualState.mockResolvedValue(DkgRitualState.ACTIVE);
        mockedDkgCoordinatorAgent.getRitual.mockResolvedValue(mockRitualData);

        const mockDkgPublicKey = {} as DkgPublicKey;
        vi.spyOn(DkgPublicKey, 'fromBytes').mockReturnValue(mockDkgPublicKey);

        const ritual = await DkgClient.getRitual(mockProvider, domain, ritualId);

        expect(ritual.id).toBe(ritualId);
        expect(ritual.dkgPublicKey).toBe(mockDkgPublicKey);
        expect(ritual.sharesNum).toBe(5);
        expect(ritual.threshold).toBe(3);
        expect(ritual.state).toBe(DkgRitualState.ACTIVE);

        expect(mockedDkgCoordinatorAgent.getRitualState).toHaveBeenCalledWith(
          mockProvider,
          domain,
          ritualId
        );
        expect(mockedDkgCoordinatorAgent.getRitual).toHaveBeenCalledWith(
          mockProvider,
          domain,
          ritualId
        );
      });

      it('combines public key bytes from word0 and word1', async () => {
        const ritualId = 123;
        const mockRitualData = {
          publicKey: {
            word0: '0x1234',
            word1: '0x5678',
          },
          dkgSize: 5,
          threshold: 3,
        };

        mockedDkgCoordinatorAgent.getRitualState.mockResolvedValue(DkgRitualState.ACTIVE);
        mockedDkgCoordinatorAgent.getRitual.mockResolvedValue(mockRitualData);

        const mockDkgPublicKey = {} as DkgPublicKey;
        vi.spyOn(DkgPublicKey, 'fromBytes').mockReturnValue(mockDkgPublicKey);

        await DkgClient.getRitual(mockProvider, domain, ritualId);

        // Verify that fromBytes was called with combined bytes from word0 and word1
        expect(DkgPublicKey.fromBytes).toHaveBeenCalledWith(
          new Uint8Array([0x12, 0x34, 0x56, 0x78])
        );
      });
    });

    describe('getActiveRitual', () => {
      it('returns ritual when state is ACTIVE', async () => {
        const ritualId = 123;
        const mockRitualData = {
          publicKey: {
            word0: '0x1234567890abcdef',
            word1: '0xfedcba0987654321',
          },
          dkgSize: 5,
          threshold: 3,
        };

        mockedDkgCoordinatorAgent.getRitualState.mockResolvedValue(DkgRitualState.ACTIVE);
        mockedDkgCoordinatorAgent.getRitual.mockResolvedValue(mockRitualData);

        const mockDkgPublicKey = {} as DkgPublicKey;
        vi.spyOn(DkgPublicKey, 'fromBytes').mockReturnValue(mockDkgPublicKey);

        const ritual = await DkgClient.getActiveRitual(mockProvider, domain, ritualId);

        expect(ritual.state).toBe(DkgRitualState.ACTIVE);
        expect(ritual.id).toBe(ritualId);
      });

      it('throws error when ritual is not ACTIVE', async () => {
        const ritualId = 123;
        const mockRitualData = {
          publicKey: {
            word0: '0x1234567890abcdef',
            word1: '0xfedcba0987654321',
          },
          dkgSize: 5,
          threshold: 3,
        };

        mockedDkgCoordinatorAgent.getRitualState.mockResolvedValue(DkgRitualState.INVALID);
        mockedDkgCoordinatorAgent.getRitual.mockResolvedValue(mockRitualData);

        const mockDkgPublicKey = {} as DkgPublicKey;
        vi.spyOn(DkgPublicKey, 'fromBytes').mockReturnValue(mockDkgPublicKey);

        await expect(
          DkgClient.getActiveRitual(mockProvider, domain, ritualId)
        ).rejects.toThrow(
          `Ritual ${ritualId} is not finalized. State: ${DkgRitualState.INVALID}`
        );
      });

      it('throws error for DKG_AWAITING_TRANSCRIPTS state', async () => {
        const ritualId = 456;
        const mockRitualData = {
          publicKey: {
            word0: '0x1234567890abcdef',
            word1: '0xfedcba0987654321',
          },
          dkgSize: 7,
          threshold: 4,
        };

        mockedDkgCoordinatorAgent.getRitualState.mockResolvedValue(
          DkgRitualState.DKG_AWAITING_TRANSCRIPTS
        );
        mockedDkgCoordinatorAgent.getRitual.mockResolvedValue(mockRitualData);

        const mockDkgPublicKey = {} as DkgPublicKey;
        vi.spyOn(DkgPublicKey, 'fromBytes').mockReturnValue(mockDkgPublicKey);

        await expect(
          DkgClient.getActiveRitual(mockProvider, domain, ritualId)
        ).rejects.toThrow(
          `Ritual ${ritualId} is not finalized. State: ${DkgRitualState.DKG_AWAITING_TRANSCRIPTS}`
        );
      });
    });

    describe('error handling', () => {
      it('propagates errors from DkgCoordinatorAgent', async () => {
        const ritualId = 123;
        const expectedError = new Error('Contract call failed');

        mockedDkgCoordinatorAgent.getRitualState.mockRejectedValue(expectedError);

        await expect(
          DkgClient.getRitual(mockProvider, domain, ritualId)
        ).rejects.toThrow('Contract call failed');
      });

      it('handles initialization errors', async () => {
        const expectedError = new Error('Initialization failed');
        mockedDkgCoordinatorAgent.initializeRitual.mockRejectedValue(expectedError);

        await expect(
          DkgClient.initializeRitual(
            mockProvider,
            mockSigner,
            domain,
            ursulas,
            '0xauthority...',
            86400,
            '0xaccesscontroller...'
          )
        ).rejects.toThrow('Initialization failed');
      });
    });
  });
});