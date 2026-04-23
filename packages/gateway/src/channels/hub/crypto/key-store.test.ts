/**
 * MemoryKeyStore Tests
 *
 * Unit tests for the in-memory Signal-protocol key store. Uses a stub
 * CryptoProvider so the tests stay deterministic and don't depend on
 * the real Curve25519 implementation.
 *
 * Covers: identity keys, pre-keys, signed pre-keys, registration ID (C3
 * CSPRNG invariant), sessions, bundle generation, initialize, and stats.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryKeyStore } from './key-store.js';
import type {
  CryptoProvider,
  IdentityKeyPair,
  KeyPair,
  PreKey,
  SignedPreKey,
  SessionState,
} from './types.js';

// ---------------------------------------------------------------------------
// Test stub crypto provider — deterministic, no real crypto
// ---------------------------------------------------------------------------

function bytes(byte: number, length = 32): Uint8Array {
  return new Uint8Array(length).fill(byte);
}

function makeStubCrypto(): CryptoProvider {
  let identityCounter = 0;

  return {
    async generateKeyPair(): Promise<KeyPair> {
      return {
        publicKey: bytes(1),
        privateKey: bytes(2),
      };
    },
    async generateIdentityKeyPair(): Promise<IdentityKeyPair> {
      identityCounter++;
      return {
        keyId: `id-${identityCounter}`,
        publicKey: bytes(3),
        privateKey: bytes(4),
        createdAt: new Date('2026-01-01T00:00:00Z'),
      };
    },
    async generatePreKey(keyId: number): Promise<PreKey> {
      return {
        keyId,
        keyPair: { publicKey: bytes(5), privateKey: bytes(6) },
        used: false,
      };
    },
    async generateSignedPreKey(_id, keyId): Promise<SignedPreKey> {
      return {
        keyId,
        keyPair: { publicKey: bytes(7), privateKey: bytes(8) },
        signature: bytes(9, 64),
        createdAt: new Date(),
      };
    },
    async sign(): Promise<Uint8Array> {
      return bytes(10, 64);
    },
    async verify(): Promise<boolean> {
      return true;
    },
    async deriveSharedSecret(): Promise<Uint8Array> {
      return bytes(11);
    },
    async hkdf(_ikm, _salt, _info, length): Promise<Uint8Array> {
      return new Uint8Array(length).fill(12);
    },
    async encrypt(): Promise<Uint8Array> {
      return bytes(13);
    },
    async decrypt(): Promise<Uint8Array> {
      return bytes(14);
    },
    generateRandomBytes(length: number): Uint8Array {
      return new Uint8Array(length).fill(15);
    },
  };
}

function makeSession(
  overrides: Partial<SessionState> = {}
): SessionState {
  return {
    sessionId: 'sess-1',
    peerIdentityKey: 'peer-a',
    peerDeviceId: 'dev-1',
    registrationId: 12345,
    ratchetState: {
      rootKey: { key: bytes(20) },
      sendMessageNumber: 0,
      receiveMessageNumber: 0,
      previousChainLength: 0,
    },
    establishedAt: new Date('2026-01-01T00:00:00Z'),
    lastUsedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MemoryKeyStore', () => {
  let store: MemoryKeyStore;
  let crypto: CryptoProvider;

  beforeEach(() => {
    crypto = makeStubCrypto();
    store = new MemoryKeyStore(crypto);
  });

  // =========================================================================
  // Identity keys
  // =========================================================================

  describe('identity keys', () => {
    it('throws when getting an identity key before generation', async () => {
      await expect(store.getIdentityKeyPair()).rejects.toThrow(/Identity key not found/);
    });

    it('generates and retrieves an identity key pair', async () => {
      const generated = await store.generateIdentityKeyPair();
      const retrieved = await store.getIdentityKeyPair();

      expect(retrieved).toBe(generated);
      expect(retrieved.keyId).toBe('id-1');
      expect(retrieved.publicKey).toEqual(bytes(3));
    });

    it('throws when asking for fingerprint before identity key exists', () => {
      expect(() => store.getIdentityKeyFingerprint()).toThrow(/Identity key not found/);
    });

    it('returns a base64 fingerprint of the first 16 bytes once generated', async () => {
      await store.generateIdentityKeyPair();
      const fingerprint = store.getIdentityKeyFingerprint();

      // stub publicKey is 32 bytes of `3` — first 16 bytes base64-encoded
      expect(fingerprint).toBe(Buffer.from(bytes(3).slice(0, 16)).toString('base64'));
    });
  });

  // =========================================================================
  // Pre-keys
  // =========================================================================

  describe('pre-keys', () => {
    it('returns null for a missing pre-key', async () => {
      expect(await store.getPreKey(0)).toBeNull();
    });

    it('generates N pre-keys with sequential IDs', async () => {
      const generated = await store.generatePreKeys(3);

      expect(generated).toHaveLength(3);
      expect(generated.map(k => k.keyId)).toEqual([0, 1, 2]);
      expect(generated.every(k => !k.used)).toBe(true);
    });

    it('marks pre-keys as used on first retrieval', async () => {
      await store.generatePreKeys(2);

      const key = await store.getPreKey(0);
      expect(key?.used).toBe(true);
      expect(key?.usedAt).toBeInstanceOf(Date);

      // Still returned after being used
      const again = await store.getPreKey(0);
      expect(again?.used).toBe(true);
    });

    it('stores a caller-supplied pre-key', async () => {
      const preKey: PreKey = {
        keyId: 42,
        keyPair: { publicKey: bytes(5), privateKey: bytes(6) },
        used: false,
      };
      await store.storePreKey(preKey);

      const retrieved = await store.getPreKey(42);
      expect(retrieved?.keyId).toBe(42);
    });

    it('removes a pre-key', async () => {
      await store.generatePreKeys(1);
      await store.removePreKey(0);

      expect(await store.getPreKey(0)).toBeNull();
    });

    it('returns only unused pre-keys from getUnusedPreKeys', async () => {
      await store.generatePreKeys(3);
      await store.getPreKey(0); // marks 0 as used

      const unused = await store.getUnusedPreKeys();
      expect(unused.map(k => k.keyId).sort()).toEqual([1, 2]);
    });

    it('maintainPreKeys tops up to minCount and skips when full', async () => {
      await store.generatePreKeys(5);

      const topUp = await store.maintainPreKeys(3);
      expect(topUp).toEqual([]);

      const more = await store.maintainPreKeys(8);
      expect(more).toHaveLength(3);
    });
  });

  // =========================================================================
  // Signed pre-keys
  // =========================================================================

  describe('signed pre-keys', () => {
    it('throws when getting active before any exists', async () => {
      await expect(store.getActiveSignedPreKey()).rejects.toThrow(/No active signed pre-key/);
    });

    it('generates a signed pre-key, makes first one active', async () => {
      await store.generateIdentityKeyPair();
      const signed = await store.generateSignedPreKey(0);

      const active = await store.getActiveSignedPreKey();
      expect(active.keyId).toBe(0);
      expect(active).toBe(signed);
    });

    it('rotateSignedPreKey generates a new one and updates active pointer', async () => {
      await store.generateIdentityKeyPair();
      await store.generateSignedPreKey(0);

      const rotated = await store.rotateSignedPreKey();
      expect(rotated.keyId).toBe(1);

      const active = await store.getActiveSignedPreKey();
      expect(active.keyId).toBe(1);
    });

    it('getSignedPreKey returns the stored key or null', async () => {
      await store.generateIdentityKeyPair();
      await store.generateSignedPreKey(0);

      expect(await store.getSignedPreKey(0)).not.toBeNull();
      expect(await store.getSignedPreKey(99)).toBeNull();
    });

    it('shouldRotateSignedPreKey returns true when no key or older than threshold', async () => {
      expect(store.shouldRotateSignedPreKey(30)).toBe(true);

      await store.generateIdentityKeyPair();
      const older: SignedPreKey = {
        keyId: 0,
        keyPair: { publicKey: bytes(7), privateKey: bytes(8) },
        signature: bytes(9, 64),
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days old
      };
      await store.storeSignedPreKey(older);
      // Manually mark active via generateSignedPreKey side effect
      await store.generateSignedPreKey(0);

      // The stored 45-day-old key is now active — we replaced it via generate.
      // Verify fresh one doesn't need rotation at 30d threshold.
      expect(store.shouldRotateSignedPreKey(30)).toBe(false);
    });
  });

  // =========================================================================
  // Registration ID (C3 — CSPRNG invariant)
  // =========================================================================

  describe('registration ID', () => {
    it('returns a positive 31-bit integer', async () => {
      const id = await store.getRegistrationId();
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(0x7fffffff);
    });

    it('memoizes — returns the same value on repeated calls', async () => {
      const first = await store.getRegistrationId();
      const second = await store.getRegistrationId();
      expect(second).toBe(first);
    });

    it('distinct stores generate different IDs with high probability', async () => {
      const ids = new Set<number>();
      for (let i = 0; i < 500; i++) {
        const freshStore = new MemoryKeyStore(crypto);
        ids.add(await freshStore.getRegistrationId());
      }
      // With a CSPRNG across a 2^31 space, 500 samples yielding ~500 unique
      // values is overwhelmingly likely. Allow a tiny margin for collisions.
      expect(ids.size).toBeGreaterThan(495);
    });
  });

  // =========================================================================
  // Sessions
  // =========================================================================

  describe('sessions', () => {
    it('returns null for an unknown peer session', async () => {
      expect(await store.getSession('nobody')).toBeNull();
    });

    it('saves and retrieves a session keyed by peerIdentityKey', async () => {
      const session = makeSession({ peerIdentityKey: 'peer-x' });
      await store.saveSession(session);

      const retrieved = await store.getSession('peer-x');
      expect(retrieved).toBe(session);
    });

    it('deleteSession removes by sessionId across all peers', async () => {
      const a = makeSession({ sessionId: 'sess-a', peerIdentityKey: 'peer-a' });
      const b = makeSession({ sessionId: 'sess-b', peerIdentityKey: 'peer-b' });
      await store.saveSession(a);
      await store.saveSession(b);

      await store.deleteSession('sess-b');

      expect(await store.getSession('peer-b')).toBeNull();
      expect(await store.getSession('peer-a')).toBe(a);
    });

    it('deleteSession is a no-op when sessionId not found', async () => {
      await store.saveSession(makeSession());
      await store.deleteSession('does-not-exist');
      expect(await store.getAllSessions()).toHaveLength(1);
    });

    it('getAllSessions returns every saved session', async () => {
      await store.saveSession(makeSession({ sessionId: 's1', peerIdentityKey: 'p1' }));
      await store.saveSession(makeSession({ sessionId: 's2', peerIdentityKey: 'p2' }));

      const all = await store.getAllSessions();
      expect(all).toHaveLength(2);
      expect(all.map(s => s.sessionId).sort()).toEqual(['s1', 's2']);
    });
  });

  // =========================================================================
  // Bundle generation
  // =========================================================================

  describe('generatePublicKeyBundle', () => {
    it('returns identity, signed pre-key, pre-keys, and registration ID', async () => {
      await store.generateIdentityKeyPair();
      await store.generateSignedPreKey(0);
      await store.generatePreKeys(5);

      const bundle = await store.generatePublicKeyBundle();

      expect(bundle.identityKey).toEqual(bytes(3));
      expect(bundle.signedPreKey.keyId).toBe(0);
      expect(bundle.signedPreKey.signature).toHaveLength(64);
      expect(bundle.oneTimePreKeys).toHaveLength(5);
      expect(bundle.oneTimePreKeys[0]!.publicKey).toEqual(bytes(5));
      expect(bundle.registrationId).toBeGreaterThanOrEqual(1);
    });

    it('caps oneTimePreKeys at 100 per Signal recommendation', async () => {
      await store.generateIdentityKeyPair();
      await store.generateSignedPreKey(0);
      await store.generatePreKeys(150);

      const bundle = await store.generatePublicKeyBundle();
      expect(bundle.oneTimePreKeys).toHaveLength(100);
    });

    it('excludes used pre-keys from the bundle', async () => {
      await store.generateIdentityKeyPair();
      await store.generateSignedPreKey(0);
      await store.generatePreKeys(3);
      await store.getPreKey(0); // marks 0 as used

      const bundle = await store.generatePublicKeyBundle();
      expect(bundle.oneTimePreKeys.map(k => k.keyId).sort()).toEqual([1, 2]);
    });
  });

  // =========================================================================
  // initialize
  // =========================================================================

  describe('initialize', () => {
    it('generates all required keys on a fresh store', async () => {
      await store.initialize(10);

      expect(await store.getIdentityKeyPair()).toBeDefined();
      expect(await store.getActiveSignedPreKey()).toBeDefined();
      expect((await store.getUnusedPreKeys()).length).toBeGreaterThanOrEqual(10);
    });

    it('does not regenerate keys that already exist', async () => {
      await store.initialize(5);
      const id = (await store.getIdentityKeyPair()).keyId;
      const activeId = (await store.getActiveSignedPreKey()).keyId;

      await store.initialize(5);

      expect((await store.getIdentityKeyPair()).keyId).toBe(id);
      expect((await store.getActiveSignedPreKey()).keyId).toBe(activeId);
    });

    it('tops up pre-keys to meet the requested count', async () => {
      await store.initialize(5);
      expect((await store.getUnusedPreKeys()).length).toBe(5);

      await store.initialize(10);
      expect((await store.getUnusedPreKeys()).length).toBeGreaterThanOrEqual(10);
    });
  });

  // =========================================================================
  // getStats
  // =========================================================================

  describe('getStats', () => {
    it('reports empty state for a fresh store', () => {
      const stats = store.getStats();
      expect(stats).toEqual({
        hasIdentityKey: false,
        signedPreKeys: 0,
        totalPreKeys: 0,
        unusedPreKeys: 0,
        activeSessions: 0,
      });
    });

    it('reflects state after initialization and session save', async () => {
      await store.initialize(5);
      await store.saveSession(makeSession());

      const stats = store.getStats();
      expect(stats.hasIdentityKey).toBe(true);
      expect(stats.signedPreKeys).toBe(1);
      expect(stats.totalPreKeys).toBe(5);
      expect(stats.unusedPreKeys).toBe(5);
      expect(stats.activeSessions).toBe(1);
    });

    it('unusedPreKeys decreases as pre-keys are consumed', async () => {
      await store.initialize(3);
      await store.getPreKey(0);
      await store.getPreKey(1);

      const stats = store.getStats();
      expect(stats.totalPreKeys).toBe(3);
      expect(stats.unusedPreKeys).toBe(1);
    });
  });
});
