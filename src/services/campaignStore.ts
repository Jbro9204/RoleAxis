import type { CampaignDraft } from "../types";

const DATABASE_NAME = "roleaxis-private-workspace";
const DATABASE_VERSION = 1;
const STORE_NAME = "encrypted-drafts";
const KEY_RECORD = "workspace-key";
const DRAFT_RECORD = "campaign-draft";

type StoredKey = { id: typeof KEY_RECORD; key: CryptoKey };
type StoredDraft = {
  id: typeof DRAFT_RECORD;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
  updatedAt: string;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(new Error("The private workspace could not be opened."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function getRecord<T>(database: IDBDatabase, id: string) {
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onerror = () => reject(new Error("The private workspace could not be read."));
    request.onsuccess = () => resolve(request.result as T | undefined);
  });
}

function putRecord(database: IDBDatabase, record: StoredKey | StoredDraft) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.onerror = () => reject(new Error("The private workspace could not be saved."));
    transaction.oncomplete = () => resolve();
    transaction.objectStore(STORE_NAME).put(record);
  });
}

async function getWorkspaceKey(database: IDBDatabase) {
  const stored = await getRecord<StoredKey>(database, KEY_RECORD);
  if (stored?.key) return stored.key;

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await putRecord(database, { id: KEY_RECORD, key });
  return key;
}

function generateId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyCampaign(): CampaignDraft {
  const now = new Date().toISOString();
  return {
    schemaVersion: "1.0.0",
    campaignId: generateId(),
    status: "not_started",
    resume: null,
    answers: {},
    activeSectionKey: "identity_contact",
    automationMode: "approval_required",
    createdAt: now,
    updatedAt: now
  };
}

export async function loadCampaignDraft() {
  const database = await openDatabase();
  try {
    const stored = await getRecord<StoredDraft>(database, DRAFT_RECORD);
    if (!stored) return null;
    const key = await getWorkspaceKey(database);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(stored.iv) }, key, stored.ciphertext);
    return JSON.parse(new TextDecoder().decode(plaintext)) as CampaignDraft;
  } catch {
    throw new Error("The encrypted campaign draft could not be recovered. Your source resume was not retained.");
  } finally {
    database.close();
  }
}

export async function saveCampaignDraft(draft: CampaignDraft) {
  const database = await openDatabase();
  try {
    const key = await getWorkspaceKey(database);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(draft));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
    await putRecord(database, { id: DRAFT_RECORD, iv: iv.buffer as ArrayBuffer, ciphertext, updatedAt: draft.updatedAt });
  } finally {
    database.close();
  }
}

export async function clearCampaignDraft() {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.onerror = () => reject(new Error("The campaign draft could not be cleared."));
      transaction.oncomplete = () => resolve();
      transaction.objectStore(STORE_NAME).delete(DRAFT_RECORD);
    });
  } finally {
    database.close();
  }
}
