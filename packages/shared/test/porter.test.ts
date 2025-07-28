import {
  CapsuleFrag,
  EncryptedThresholdDecryptionRequest,
  EncryptedThresholdDecryptionResponse,
  PublicKey,
  RetrievalKit,
  TreasureMap,
} from '@nucypher/nucypher-core';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Domain,
  domains,
  getPorterUri,
  GetUrsulasResult,
  PorterClient,
  RetrieveCFragsResult,
  TacoDecryptResult,
  Ursula,
} from '../src/porter';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('porter', () => {
  describe('getPorterUri', () => {
    it('returns correct URI for mainnet', () => {
      const uri = getPorterUri('mainnet');
      expect(uri).toBe('https://porter.nucypher.community');
    });

    it('returns correct URI for tapir', () => {
      const uri = getPorterUri('tapir');
      expect(uri).toBe('https://porter-tapir.nucypher.community');
    });

    it('returns correct URI for oryx', () => {
      const uri = getPorterUri('oryx');
      expect(uri).toBe('https://porter-oryx.nucypher.community');
    });

    it('returns correct URI for lynx', () => {
      const uri = getPorterUri('lynx');
      expect(uri).toBe('https://porter-lynx.nucypher.community');
    });

    it('throws error for invalid domain', () => {
      expect(() => getPorterUri('invalid' as Domain)).toThrow(
        'No default Porter URI found for domain: invalid'
      );
    });
  });

  describe('domains mapping', () => {
    it('maps DEVNET to lynx', () => {
      expect(domains.DEVNET).toBe('lynx');
    });

    it('maps TESTNET to tapir', () => {
      expect(domains.TESTNET).toBe('tapir');
    });

    it('maps MAINNET to mainnet', () => {
      expect(domains.MAINNET).toBe('mainnet');
    });
  });

  describe('PorterClient', () => {
    let client: PorterClient;
    const testUri = 'https://test-porter.example.com';

    beforeEach(() => {
      client = new PorterClient(testUri);
      vi.clearAllMocks();
    });

    describe('constructor', () => {
      it('creates client with correct porter URL', () => {
        expect(client.porterUrl.toString()).toBe(testUri + '/');
      });

      it('handles URIs without trailing slash', () => {
        const clientWithSlash = new PorterClient('https://example.com/');
        expect(clientWithSlash.porterUrl.toString()).toBe('https://example.com/');
      });
    });

    describe('getUrsulas', () => {
      const mockUrsulaResponse: GetUrsulasResult = {
        result: {
          ursulas: [
            {
              checksum_address: '0x1234567890123456789012345678901234567890',
              uri: 'https://ursula1.example.com:9151',
              encrypting_key: '0x03a34b...',
            },
            {
              checksum_address: '0x0987654321098765432109876543210987654321',
              uri: 'https://ursula2.example.com:9151',
              encrypting_key: '0x02b45c...',
            },
          ],
        },
        version: '1.0.0',
      };

      it('fetches ursulas with default parameters', async () => {
        mockedAxios.get.mockResolvedValue({ data: mockUrsulaResponse });

        const result = await client.getUrsulas(5);

        expect(mockedAxios.get).toHaveBeenCalledWith(
          'https://test-porter.example.com/get_ursulas',
          {
            params: {
              quantity: 5,
              exclude_ursulas: [],
              include_ursulas: [],
            },
            paramsSerializer: expect.any(Function),
          }
        );

        expect(result).toHaveLength(2);
        expect(result[0].checksumAddress).toBe('0x1234567890123456789012345678901234567890');
        expect(result[0].uri).toBe('https://ursula1.example.com:9151');
        expect(result[0].encryptingKey).toBeInstanceOf(PublicKey);
      });

      it('fetches ursulas with exclude and include lists', async () => {
        mockedAxios.get.mockResolvedValue({ data: mockUrsulaResponse });

        const excludeUrsulas = ['0xabc123...'];
        const includeUrsulas = ['0xdef456...'];

        await client.getUrsulas(3, excludeUrsulas, includeUrsulas);

        expect(mockedAxios.get).toHaveBeenCalledWith(
          'https://test-porter.example.com/get_ursulas',
          {
            params: {
              quantity: 3,
              exclude_ursulas: excludeUrsulas,
              include_ursulas: includeUrsulas,
            },
            paramsSerializer: expect.any(Function),
          }
        );
      });

      it('handles empty ursula list', async () => {
        const emptyResponse: GetUrsulasResult = {
          result: { ursulas: [] },
          version: '1.0.0',
        };
        mockedAxios.get.mockResolvedValue({ data: emptyResponse });

        const result = await client.getUrsulas(0);
        expect(result).toEqual([]);
      });

      it('throws on network error', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network error'));

        await expect(client.getUrsulas(5)).rejects.toThrow('Network error');
      });
    });

    describe('retrieveCFrags', () => {
      let mockTreasureMap: TreasureMap;
      let mockRetrievalKits: RetrievalKit[];
      let mockKeys: {
        aliceVerifyingKey: PublicKey;
        bobEncryptingKey: PublicKey;
        bobVerifyingKey: PublicKey;
      };

      beforeEach(() => {
        // Create mock objects
        mockTreasureMap = {
          toBytes: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
        } as unknown as TreasureMap;

        mockRetrievalKits = [
          {
            toBytes: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
          } as unknown as RetrievalKit,
        ];

        mockKeys = {
          aliceVerifyingKey: {
            toCompressedBytes: vi.fn().mockReturnValue(new Uint8Array([7, 8, 9])),
          } as unknown as PublicKey,
          bobEncryptingKey: {
            toCompressedBytes: vi.fn().mockReturnValue(new Uint8Array([10, 11, 12])),
          } as unknown as PublicKey,
          bobVerifyingKey: {
            toCompressedBytes: vi.fn().mockReturnValue(new Uint8Array([13, 14, 15])),
          } as unknown as PublicKey,
        };
      });

      it('retrieves cfrags successfully', async () => {
        const mockResponse = {
          data: {
            result: {
              retrieval_results: [
                {
                  cfrags: {
                    '0x1234...': 'base64_encoded_cfrag_1',
                    '0x5678...': 'base64_encoded_cfrag_2',
                  },
                  errors: {},
                },
              ],
            },
            version: '1.0.0',
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        // Mock CapsuleFrag.fromBytes
        const mockCapsuleFrag = {} as CapsuleFrag;
        vi.spyOn(CapsuleFrag, 'fromBytes').mockReturnValue(mockCapsuleFrag);

        const result = await client.retrieveCFrags(
          mockTreasureMap,
          mockRetrievalKits,
          mockKeys.aliceVerifyingKey,
          mockKeys.bobEncryptingKey,
          mockKeys.bobVerifyingKey,
          '{"contextData": "test"}'
        );

        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://test-porter.example.com/retrieve_cfrags',
          {
            treasure_map: 'AQID', // base64 of [1,2,3]
            retrieval_kits: ['BAUG'], // base64 of [4,5,6]
            alice_verifying_key: '070809',
            bob_encrypting_key: '0a0b0c',
            bob_verifying_key: '0d0e0f',
            context: '{"contextData": "test"}',
          }
        );

        expect(result).toHaveLength(1);
        expect(result[0].cFrags).toHaveProperty('0x1234...');
        expect(result[0].cFrags).toHaveProperty('0x5678...');
        expect(result[0].errors).toEqual({});
      });

      it('handles context as undefined', async () => {
        const mockResponse = {
          data: {
            result: {
              retrieval_results: [{ cfrags: {}, errors: {} }],
            },
            version: '1.0.0',
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        await client.retrieveCFrags(
          mockTreasureMap,
          mockRetrievalKits,
          mockKeys.aliceVerifyingKey,
          mockKeys.bobEncryptingKey,
          mockKeys.bobVerifyingKey
        );

        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://test-porter.example.com/retrieve_cfrags',
          expect.objectContaining({
            context: undefined,
          })
        );
      });

      it('handles retrieval errors', async () => {
        const mockResponse = {
          data: {
            result: {
              retrieval_results: [
                {
                  cfrags: {},
                  errors: {
                    '0x1234...': 'Ursula not available',
                    '0x5678...': 'Invalid request',
                  },
                },
              ],
            },
            version: '1.0.0',
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await client.retrieveCFrags(
          mockTreasureMap,
          mockRetrievalKits,
          mockKeys.aliceVerifyingKey,
          mockKeys.bobEncryptingKey,
          mockKeys.bobVerifyingKey
        );

        expect(result[0].errors).toEqual({
          '0x1234...': 'Ursula not available',
          '0x5678...': 'Invalid request',
        });
      });
    });

    describe('tacoDecrypt', () => {
      let mockEncryptedRequests: Record<string, EncryptedThresholdDecryptionRequest>;

      beforeEach(() => {
        mockEncryptedRequests = {
          '0x1234...': {
            toBytes: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
          } as unknown as EncryptedThresholdDecryptionRequest,
          '0x5678...': {
            toBytes: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
          } as unknown as EncryptedThresholdDecryptionRequest,
        };
      });

      it('performs taco decryption successfully', async () => {
        const mockResponse = {
          data: {
            result: {
              decryption_results: {
                encrypted_decryption_responses: {
                  '0x1234...': 'base64_response_1',
                  '0x5678...': 'base64_response_2',
                },
                errors: {},
              },
            },
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        // Mock EncryptedThresholdDecryptionResponse.fromBytes
        const mockEncryptedResponse = {} as EncryptedThresholdDecryptionResponse;
        vi.spyOn(EncryptedThresholdDecryptionResponse, 'fromBytes').mockReturnValue(
          mockEncryptedResponse
        );

        const result = await client.tacoDecrypt(mockEncryptedRequests, 3);

        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://test-porter.example.com/decrypt',
          {
            encrypted_decryption_requests: {
              '0x1234...': 'AQID', // base64 of [1,2,3]
              '0x5678...': 'BAUG', // base64 of [4,5,6]
            },
            threshold: 3,
          }
        );

        expect(result.encryptedResponses).toHaveProperty('0x1234...');
        expect(result.encryptedResponses).toHaveProperty('0x5678...');
        expect(result.errors).toEqual({});
      });

      it('handles decryption errors', async () => {
        const mockResponse = {
          data: {
            result: {
              decryption_results: {
                encrypted_decryption_responses: {},
                errors: {
                  '0x1234...': 'Decryption failed',
                  '0x5678...': 'Invalid threshold',
                },
              },
            },
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await client.tacoDecrypt(mockEncryptedRequests, 5);

        expect(result.encryptedResponses).toEqual({});
        expect(result.errors).toEqual({
          '0x1234...': 'Decryption failed',
          '0x5678...': 'Invalid threshold',
        });
      });

      it('handles mixed success and error responses', async () => {
        const mockResponse = {
          data: {
            result: {
              decryption_results: {
                encrypted_decryption_responses: {
                  '0x1234...': 'base64_response_1',
                },
                errors: {
                  '0x5678...': 'Decryption failed',
                },
              },
            },
          },
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const mockEncryptedResponse = {} as EncryptedThresholdDecryptionResponse;
        vi.spyOn(EncryptedThresholdDecryptionResponse, 'fromBytes').mockReturnValue(
          mockEncryptedResponse
        );

        const result = await client.tacoDecrypt(mockEncryptedRequests, 2);

        expect(Object.keys(result.encryptedResponses)).toEqual(['0x1234...']);
        expect(result.errors).toEqual({
          '0x5678...': 'Decryption failed',
        });
      });

      it('throws on network error', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Network timeout'));

        await expect(client.tacoDecrypt(mockEncryptedRequests, 3)).rejects.toThrow(
          'Network timeout'
        );
      });
    });

    describe('URL construction', () => {
      it('constructs correct URLs for different endpoints', () => {
        const client = new PorterClient('https://porter.example.com');
        
        // We can't directly test the URL construction without making actual calls,
        // but we can verify the base URL is set correctly
        expect(client.porterUrl.origin).toBe('https://porter.example.com');
      });

      it('handles custom ports in porter URI', () => {
        const client = new PorterClient('https://porter.example.com:8080');
        expect(client.porterUrl.port).toBe('8080');
      });
    });
  });
});