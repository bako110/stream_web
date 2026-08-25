/**
 * Stockage local persistant des clés et sessions E2EE — jamais transmis au
 * serveur, jamais lisible par un autre onglet/origine (IndexedDB partitionné
 * par origine, même politique que localStorage).
 *
 * Équivalent web de stream_mobile/src/crypto/keyStore.ts — même surface
 * d'API (async, mêmes noms de fonctions) pour que sessionManager.ts soit
 * quasi identique entre les deux plateformes. Pas d'équivalent Keychain/
 * Keystore matériel disponible dans un navigateur : les clés privées sont
 * stockées telles quelles dans IndexedDB, protégées uniquement par
 * l'isolation d'origine du navigateur (comme le sont déjà les tokens
 * d'authentification de l'app côté web).
 */
import {
  randomBytes, randomId, toBase64, fromBase64, generateX25519KeyPair, type KeyPair,
} from './primitives';
import { generateEd25519KeyPair, sign as ed25519Sign } from './primitives';
import { signPrekey } from './x3dh';
import { serializeSession, deserializeSession, type SessionState, type SerializedSessionState } from './doubleRatchet';

const DB_NAME = 'gofolyx-e2ee';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Identité de l'appareil ───────────────────────────────────────────────────

export interface DeviceIdentity {
  deviceId: string;
  identityKeyPair: KeyPair;       // X25519 — pour les DH
  identitySigningKeyPair: KeyPair; // Ed25519 — pour signer le signed_prekey
}

interface SerializedIdentity {
  deviceId: string;
  identityPublicKey: string; identityPrivateKey: string;
  identitySigningPublicKey: string; identitySigningPrivateKey: string;
}

const IDENTITY_KEY = 'identity';

function generateDeviceId(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Charge l'identité existante ou en génère une nouvelle (première visite
 * sur ce navigateur, ou après effacement des données du site — dans ce cas
 * tout l'historique chiffré précédent devient définitivement indéchiffrable
 * depuis ce navigateur, par design : aucune sauvegarde côté serveur). */
export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const raw = await idbGet(IDENTITY_KEY);
  if (raw) {
    const s: SerializedIdentity = JSON.parse(raw);
    return {
      deviceId: s.deviceId,
      identityKeyPair: { publicKey: fromBase64(s.identityPublicKey), privateKey: fromBase64(s.identityPrivateKey) },
      identitySigningKeyPair: { publicKey: fromBase64(s.identitySigningPublicKey), privateKey: fromBase64(s.identitySigningPrivateKey) },
    };
  }

  const identity: DeviceIdentity = {
    deviceId: generateDeviceId(),
    identityKeyPair: generateX25519KeyPair(),
    identitySigningKeyPair: generateEd25519KeyPair(),
  };
  const serialized: SerializedIdentity = {
    deviceId: identity.deviceId,
    identityPublicKey: toBase64(identity.identityKeyPair.publicKey),
    identityPrivateKey: toBase64(identity.identityKeyPair.privateKey),
    identitySigningPublicKey: toBase64(identity.identitySigningKeyPair.publicKey),
    identitySigningPrivateKey: toBase64(identity.identitySigningKeyPair.privateKey),
  };
  await idbSet(IDENTITY_KEY, JSON.stringify(serialized));
  return identity;
}

// ── Signed prekey + one-time prekeys (parties privées) ───────────────────────

const SIGNED_PREKEY_KEY = 'signed_prekey';
const OTPK_PREFIX = 'otpk:';

export async function loadOrCreateSignedPrekey(identity: DeviceIdentity): Promise<{ id: number; publicKey: string; signature: string }> {
  const raw = await idbGet(SIGNED_PREKEY_KEY);
  if (raw) {
    const s = JSON.parse(raw);
    return { id: s.id, publicKey: s.publicKey, signature: s.signature };
  }
  const keyPair = generateX25519KeyPair();
  const id = Math.floor(Date.now() / 1000);
  const signature = toBase64(signPrekey(identity.identitySigningKeyPair, keyPair.publicKey));
  const publicKey = toBase64(keyPair.publicKey);
  await idbSet(SIGNED_PREKEY_KEY, JSON.stringify({
    id, signature, publicKey, privateKey: toBase64(keyPair.privateKey),
  }));
  return { id, publicKey, signature };
}

export async function getSignedPrekeyPrivate(): Promise<KeyPair | null> {
  const raw = await idbGet(SIGNED_PREKEY_KEY);
  if (!raw) return null;
  const s = JSON.parse(raw);
  return { publicKey: fromBase64(s.publicKey), privateKey: fromBase64(s.privateKey) };
}

/** Génère un lot de nouvelles OTPK (à envoyer au serveur via POST
 * /devices/keys ou /devices/keys/one-time-prekeys), stocke les parties
 * privées localement pour pouvoir répondre à un X3DH entrant plus tard. */
export async function generateOneTimePrekeys(count: number): Promise<{ prekey_id: number; public_key: string }[]> {
  const out: { prekey_id: number; public_key: string }[] = [];
  // randomId() reste dans la plage int32 (colonne Postgres `prekey_id`,
  // Date.now() la dépasse largement — bug corrigé ici) ; Set pour garantir
  // l'unicité au sein du lot malgré le tirage aléatoire.
  const usedIds = new Set<number>();
  for (let i = 0; i < count; i++) {
    const keyPair = generateX25519KeyPair();
    let id = randomId();
    while (usedIds.has(id)) id = randomId();
    usedIds.add(id);
    await idbSet(`${OTPK_PREFIX}${id}`, JSON.stringify({
      id, publicKey: toBase64(keyPair.publicKey), privateKey: toBase64(keyPair.privateKey),
    }));
    out.push({ prekey_id: id, public_key: toBase64(keyPair.publicKey) });
  }
  return out;
}

/** Retrouve la clé privée d'une OTPK par son id (fournie par le serveur dans
 * le payload x3dh_initial reçu) — et la supprime immédiatement après lecture
 * (usage unique, jamais réutilisable, cf. forward secrecy du 1er message). */
export async function consumeOneTimePrekeyPrivate(prekeyId: number): Promise<KeyPair | null> {
  const key = `${OTPK_PREFIX}${prekeyId}`;
  const raw = await idbGet(key);
  if (!raw) return null;
  await idbDelete(key);
  const s = JSON.parse(raw);
  return { publicKey: fromBase64(s.publicKey), privateKey: fromBase64(s.privateKey) };
}

// ── Sessions Double Ratchet (une par appareil distant) ───────────────────────

function sessionKey(peerUserId: string, peerDeviceId: string): string {
  return `session:${peerUserId}:${peerDeviceId}`;
}

export async function loadSession(peerUserId: string, peerDeviceId: string): Promise<SessionState | null> {
  const raw = await idbGet(sessionKey(peerUserId, peerDeviceId));
  if (!raw) return null;
  try {
    return deserializeSession(JSON.parse(raw) as SerializedSessionState);
  } catch { return null; }
}

export async function saveSession(peerUserId: string, peerDeviceId: string, state: SessionState): Promise<void> {
  await idbSet(sessionKey(peerUserId, peerDeviceId), JSON.stringify(serializeSession(state)));
}

export async function deleteSession(peerUserId: string, peerDeviceId: string): Promise<void> {
  await idbDelete(sessionKey(peerUserId, peerDeviceId));
}

export { ed25519Sign };
