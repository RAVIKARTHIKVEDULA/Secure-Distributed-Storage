import { useState, useCallback, useEffect } from 'react';

// Simplified crypto hook for session management and file encryption
// In a real app, this would be more robust with error handling

export function useCrypto() {
  const [sessionKeys, setSessionKeys] = useState<CryptoKeyPair | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      // Check if we have keys in memory (simulated per page load for security)
      // For this demo, we'll generate new keys on refresh to ensure security
      try {
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
          },
          true,
          ["encrypt", "decrypt"]
        );
        
        setSessionKeys(keyPair);
        
        // Create a short ID from the public key fingerprint
        const exported = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const hash = await window.crypto.subtle.digest("SHA-256", exported);
        const hashArray = Array.from(new Uint8Array(hash));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setSessionId(hashHex.substring(0, 8)); // Short ID
      } catch (e) {
        console.error("Failed to initialize crypto session", e);
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, []);

  // Encrypt file data
  const encryptFile = useCallback(async (file: File) => {
    if (!sessionKeys) throw new Error("No session keys");

    // 1. Generate symmetric key for this file
    const fileKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // 2. Read file
    const buffer = await file.arrayBuffer();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 3. Encrypt content
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      fileKey,
      buffer
    );

    // 4. Encrypt the file key with our session public key (so we can retrieve it)
    const rawFileKey = await window.crypto.subtle.exportKey("raw", fileKey);
    const encryptedKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      sessionKeys.publicKey,
      rawFileKey
    );

    return {
      encryptedContent,
      metadata: {
        iv: Array.from(iv),
        encryptedKey: Array.from(new Uint8Array(encryptedKey))
      }
    };
  }, [sessionKeys]);

  // Decrypt file data
  const decryptFile = useCallback(async (
    encryptedContent: ArrayBuffer, 
    metadata: { iv: number[], encryptedKey: number[] }
  ) => {
    if (!sessionKeys) throw new Error("No session keys");

    // 1. Decrypt the file key using our private key
    const rawFileKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      sessionKeys.privateKey,
      new Uint8Array(metadata.encryptedKey)
    );

    // 2. Import the file key
    const fileKey = await window.crypto.subtle.importKey(
      "raw",
      rawFileKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // 3. Decrypt the content
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(metadata.iv) },
      fileKey,
      encryptedContent
    );

    return decryptedContent;
  }, [sessionKeys]);

  const hashChunk = useCallback(async (chunk: ArrayBuffer): Promise<string> => {
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", chunk);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  return {
    sessionId,
    isInitializing,
    encryptFile,
    decryptFile,
    hashChunk
  };
}
