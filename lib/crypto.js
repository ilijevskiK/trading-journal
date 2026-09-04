// AES-256-GCM for the two API-key columns in user_settings — Node's
// built-in crypto, no new dependency. GCM is authenticated encryption: a
// tampered/corrupted value fails to decrypt rather than silently returning
// garbage.
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const PREFIX = "enc:v1:";

// Reads process.env fresh on every call (not cached at module-load time)
// so tests can set it before calling either function.
function getKey() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new Error("SETTINGS_ENCRYPTION_KEY is not set.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("SETTINGS_ENCRYPTION_KEY must decode to 32 bytes.");
  return key;
}

export function encrypt(value) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

// Lenient: a value with no "enc:v1:" prefix is legacy plaintext from
// before this encryption existed, and is returned as-is rather than
// rejected — see ROADMAP.md Phase 3.6 for why there's no separate
// migration script. A prefixed value that fails to decrypt (wrong key,
// corruption) is logged and treated as empty rather than crashing the
// settings load.
export function decrypt(value) {
  if (!value) return null;
  if (!value.startsWith(PREFIX)) return value;
  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(":");
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch (e) {
    console.error("Failed to decrypt stored value", e);
    return null;
  }
}
