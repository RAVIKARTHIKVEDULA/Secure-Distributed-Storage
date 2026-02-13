import { useState } from "react";

/* ================= CONFIG ================= */

const CHUNK_SIZE = 64 * 1024; // 64 KB

/* ================= SHA-256 ================= */

async function sha256(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ================= RSA-OAEP ================= */

async function generateRSAKeyPair() {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptAESKey(aesKey, publicKey) {
  const rawKey = await crypto.subtle.exportKey("raw", aesKey);
  return await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    rawKey
  );
}

async function decryptAESKey(encryptedKey, privateKey) {
  const rawKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedKey
  );

  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

/* ================= AES-256-GCM ================= */

async function generateAESKey() {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptData(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return { encrypted, iv };
}

async function decryptData(key, encryptedData, iv) {
  return await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );
}

/* ================= APP ================= */

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rsaKeyPair, setRsaKeyPair] = useState(null);
  const [encryptedAESKey, setEncryptedAESKey] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState("");
  const [chunkHashes, setChunkHashes] = useState([]);
  const [chunkIVs, setChunkIVs] = useState([]);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  /* ========== UPLOAD (CHUNKED + ENCRYPTED) ========== */
  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Please select a file first");
      return;
    }

    const fileBuffer = await selectedFile.arrayBuffer();

    const aesKey = await generateAESKey();
    const rsaKeys = await generateRSAKeyPair();
    const encryptedKey = await encryptAESKey(aesKey, rsaKeys.publicKey);

    setRsaKeyPair(rsaKeys);
    setEncryptedAESKey(encryptedKey);

    const totalChunks = Math.ceil(fileBuffer.byteLength / CHUNK_SIZE);
    const fileId = Date.now().toString();

    let hashes = [];
    let ivs = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = start + CHUNK_SIZE;
      const chunk = fileBuffer.slice(start, end);

      const { encrypted, iv } = await encryptData(aesKey, chunk);

      const chunkHash = await sha256(encrypted);
      hashes.push(chunkHash);
      ivs.push(Array.from(iv));

      const blob = new Blob([encrypted]);
      const formData = new FormData();
      formData.append("file", blob, `${fileId}_chunk_${i}.enc`);

      await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData
      });
    }

    setChunkHashes(hashes);
    setChunkIVs(ivs);
    setUploadedFileId(fileId);
    setMessage(`Uploaded ${totalChunks} encrypted chunks`);
  };

  /* ========== DOWNLOAD (VERIFY → DECRYPT → REASSEMBLE) ========== */
  const handleDownload = async () => {
    if (!uploadedFileId || !encryptedAESKey || !rsaKeyPair) {
      setMessage("Missing encryption data");
      return;
    }

    const aesKey = await decryptAESKey(
      encryptedAESKey,
      rsaKeyPair.privateKey
    );

    let decryptedChunks = [];
    let index = 0;

    while (true) {
      const response = await fetch(
        `http://localhost:3000/download/${uploadedFileId}_chunk_${index}.enc`
      );

      if (!response.ok) break;

      const encryptedBlob = await response.blob();
      const encryptedBuffer = await encryptedBlob.arrayBuffer();

      // ✅ Integrity check on ENCRYPTED chunk
      const downloadedHash = await sha256(encryptedBuffer);
      if (downloadedHash !== chunkHashes[index]) {
        setMessage("❌ Integrity check FAILED");
        return;
      }

      const iv = new Uint8Array(chunkIVs[index]);
      const decrypted = await decryptData(aesKey, encryptedBuffer, iv);
      decryptedChunks.push(new Uint8Array(decrypted));
      index++;
    }

    const totalLength = decryptedChunks.reduce(
      (sum, c) => sum + c.length,
      0
    );

    const fullFile = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of decryptedChunks) {
      fullFile.set(chunk, offset);
      offset += chunk.length;
    }

    setMessage("✅ File reassembled & verified");

    const blob = new Blob([fullFile]);
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Secure File Vault</h1>
      <h3>AES-256-GCM + RSA-OAEP + SHA-256 + Chunking</h3>

      <input type="file" onChange={handleFileChange} />
      <br /><br />

      <button onClick={handleUpload}>Encrypt & Upload (Chunked)</button>
      <br /><br />

      <button onClick={handleDownload}>Download & Reassemble</button>

      <p>{message}</p>
    </div>
  );
}

export default App;
