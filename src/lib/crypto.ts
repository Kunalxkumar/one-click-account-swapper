// Web Crypto API AES-GCM & PBKDF2 encryption utilities

// Helper to convert ArrayBuffer to Hex string
export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper to convert Hex string to ArrayBuffer
export function hexToBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

// Derive a Cryptographic Key from a password using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  // Import raw password as a key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive an AES-GCM key
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

interface EncryptedPayload {
  salt: string;
  iv: string;
  ciphertext: string;
}

// Encrypt data with a password
export async function encryptData(data: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);

  // Generate 16-byte salt and 12-byte initialization vector (IV)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive the key
  const key = await deriveKey(password, salt);

  // Encrypt the plain text
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    dataBytes
  );

  const payload: EncryptedPayload = {
    salt: bufferToHex(salt.buffer),
    iv: bufferToHex(iv.buffer),
    ciphertext: bufferToHex(ciphertextBuffer),
  };

  return JSON.stringify(payload);
}

// Decrypt data with a password
export async function decryptData(encryptedStr: string, password: string): Promise<string> {
  try {
    const payload: EncryptedPayload = JSON.parse(encryptedStr);
    
    const salt = new Uint8Array(hexToBuffer(payload.salt));
    const iv = new Uint8Array(hexToBuffer(payload.iv));
    const ciphertext = hexToBuffer(payload.ciphertext);

    // Derive the key
    const key = await deriveKey(password, salt);

    // Decrypt the ciphertext
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed:", err);
    throw new Error("Decryption failed. Please check your master password.");
  }
}
