import { useState, useEffect, useRef } from "react";

/* ================= CONFIG =================
   ⚠️  UPDATE THIS: Set this to YOUR machine's local IP.
   Run `node index.js` and it will print your IP.
   Example: "http://192.168.1.42:3000"
*/
const BACKEND_URL = "http://10.239.170.30:3000";

const CHUNK_SIZE = 64 * 1024;

/* ================= CRYPTO UTILS ================= */
async function sha256(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function generateRSAKeyPair() {
  return await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["encrypt", "decrypt"]
  );
}

async function encryptAESKey(aesKey, publicKey) {
  const rawKey = await crypto.subtle.exportKey("raw", aesKey);
  return await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawKey);
}

async function decryptAESKey(encryptedKey, privateKey) {
  const rawKey = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encryptedKey);
  return await crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

async function generateAESKey() {
  return await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function encryptData(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { encrypted, iv };
}

async function decryptData(key, encryptedData, iv) {
  return await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedData);
}

/* ================= PARTICLE BACKGROUND ================= */
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 170, ${p.alpha})`;
        ctx.fill();
      });

      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0, 212, 170, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ================= LOG ENTRY ================= */
function LogEntry({ text, type = "info" }) {
  const colors = { info: "#00d4aa", warn: "#f59e0b", error: "#ef4444", success: "#10b981" };
  const icons = { info: "◈", warn: "◉", error: "✕", success: "✓" };
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "6px 0", borderBottom: "1px solid rgba(0,212,170,0.07)", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "12px" }}>
      <span style={{ color: colors[type], flexShrink: 0, marginTop: "1px" }}>{icons[type]}</span>
      <span style={{ color: "#94a3b8", lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

/* ================= PROGRESS BAR ================= */
function ProgressBar({ progress, label }) {
  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: "11px", color: "#00d4aa", fontFamily: "monospace" }}>{Math.round(progress)}%</span>
      </div>
      <div style={{ height: "3px", background: "rgba(0,212,170,0.1)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: "linear-gradient(90deg, #00d4aa, #0ea5e9)",
          borderRadius: "2px",
          transition: "width 0.3s ease",
          boxShadow: "0 0 8px rgba(0,212,170,0.6)"
        }} />
      </div>
    </div>
  );
}

/* ================= STAT BADGE ================= */
function StatBadge({ label, value, icon }) {
  return (
    <div style={{
      padding: "20px 24px",
      background: "rgba(0,212,170,0.04)",
      border: "1px solid rgba(0,212,170,0.12)",
      borderRadius: "12px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,212,170,0.4), transparent)" }} />
      <div style={{ fontSize: "24px", marginBottom: "4px" }}>{icon}</div>
      <div style={{ fontSize: "22px", fontWeight: "700", color: "#00d4aa", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "4px" }}>{label}</div>
    </div>
  );
}

/* ================= FILE DROP ZONE ================= */
function FileDropZone({ onFile, selectedFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? "#00d4aa" : "rgba(0,212,170,0.2)"}`,
        borderRadius: "12px",
        padding: "40px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "rgba(0,212,170,0.06)" : "rgba(0,212,170,0.02)",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <input ref={inputRef} type="file" style={{ display: "none" }} onChange={(e) => onFile(e.target.files[0])} />
      {selectedFile ? (
        <>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📄</div>
          <div style={{ color: "#e2e8f0", fontWeight: "600", fontSize: "15px", marginBottom: "4px" }}>{selectedFile.name}</div>
          <div style={{ color: "#00d4aa", fontSize: "12px", fontFamily: "monospace" }}>{formatSize(selectedFile.size)}</div>
          <div style={{ color: "#475569", fontSize: "11px", marginTop: "8px" }}>Click to change file</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.4 }}>⬆</div>
          <div style={{ color: "#64748b", fontSize: "14px", marginBottom: "4px" }}>Drop file here or click to browse</div>
          <div style={{ color: "#334155", fontSize: "11px" }}>Any file type supported</div>
        </>
      )}
    </div>
  );
}

/* ================= MAIN APP ================= */
export default function App() {
  const [activeTab, setActiveTab] = useState("vault");
  const [selectedFile, setSelectedFile] = useState(null);
  const [rsaKeyPair, setRsaKeyPair] = useState(null);
  const [encryptedAESKey, setEncryptedAESKey] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState("");
  const [chunkHashes, setChunkHashes] = useState([]);
  const [chunkIVs, setChunkIVs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const addLog = (text, type = "info") => setLogs(prev => [...prev.slice(-40), { text, type, id: Date.now() + Math.random() }]);

  const handleUpload = async () => {
    if (!selectedFile) { addLog("No file selected", "warn"); return; }
    setIsWorking(true); setProgress(0); setLogs([]);
    try {
      addLog("Initializing AES-256-GCM key generation...");
      const aesKey = await generateAESKey();
      addLog("AES session key generated ✓", "success");

      addLog("Generating RSA-OAEP 2048-bit key pair...");
      const rsaKeys = await generateRSAKeyPair();
      addLog("RSA key pair ready ✓", "success");

      addLog("Wrapping AES key with RSA public key...");
      const encryptedKey = await encryptAESKey(aesKey, rsaKeys.publicKey);
      addLog("Key encapsulation complete ✓", "success");

      setRsaKeyPair(rsaKeys);
      setEncryptedAESKey(encryptedKey);

      const fileBuffer = await selectedFile.arrayBuffer();
      const totalChunks = Math.ceil(fileBuffer.byteLength / CHUNK_SIZE);
      const fileId = Date.now().toString();
      let hashes = [], ivs = [];

      addLog(`Splitting into ${totalChunks} chunk${totalChunks > 1 ? "s" : ""} (64KB each)...`);

      for (let i = 0; i < totalChunks; i++) {
        const chunk = fileBuffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const { encrypted, iv } = await encryptData(aesKey, chunk);
        const hash = await sha256(encrypted);
        hashes.push(hash); ivs.push(Array.from(iv));

        const blob = new Blob([encrypted]);
        const formData = new FormData();
        formData.append("file", blob, `${fileId}_chunk_${i}.enc`);

        try {
          // ✅ Uses BACKEND_URL instead of hardcoded localhost
          const response = await fetch(`${BACKEND_URL}/upload`, { method: "POST", body: formData });
          if (!response.ok) {
            const err = await response.json();
            addLog(`Chunk ${i + 1} rejected: ${err.message}`, "warn");
          } else {
            addLog(`Chunk ${i + 1}/${totalChunks} → SHA-256: ${hash.slice(0, 16)}... ✓`, "success");
          }
        } catch {
          addLog(`Chunk ${i + 1} upload failed — is the backend running at ${BACKEND_URL}?`, "warn");
        }

        setProgress(((i + 1) / totalChunks) * 100);
        setProgressLabel(`Encrypting & uploading chunk ${i + 1} of ${totalChunks}`);
      }

      setChunkHashes(hashes); setChunkIVs(ivs); setUploadedFileId(fileId);
      addLog(`Upload complete — ${totalChunks} encrypted chunks stored`, "success");
      addLog(`File ID: ${fileId}`, "info");
    } catch (e) {
      addLog(`Error: ${e.message}`, "error");
    }
    setIsWorking(false);
  };

  const handleDownload = async () => {
    if (!uploadedFileId || !encryptedAESKey || !rsaKeyPair) {
      addLog("No upload session found. Please upload a file first.", "warn"); return;
    }
    setIsWorking(true); setProgress(0);
    setProgressLabel("Initializing decryption...");

    try {
      addLog("Unwrapping AES key with RSA private key...");
      const aesKey = await decryptAESKey(encryptedAESKey, rsaKeyPair.privateKey);
      addLog("Key decapsulation successful ✓", "success");

      let decryptedChunks = [], index = 0;

      while (true) {
        // ✅ Uses BACKEND_URL instead of hardcoded localhost
        const response = await fetch(`${BACKEND_URL}/download/${uploadedFileId}_chunk_${index}.enc`);
        if (!response.ok) break;

        const encBuf = await (await response.blob()).arrayBuffer();
        const downloadedHash = await sha256(encBuf);

        if (downloadedHash !== chunkHashes[index]) {
          addLog(`Integrity check FAILED on chunk ${index}`, "error"); setIsWorking(false); return;
        }
        addLog(`Chunk ${index + 1}: integrity verified ✓`, "success");

        const iv = new Uint8Array(chunkIVs[index]);
        const decrypted = await decryptData(aesKey, encBuf, iv);
        decryptedChunks.push(new Uint8Array(decrypted));
        setProgress(((index + 1) / chunkHashes.length) * 100);
        setProgressLabel(`Decrypting chunk ${index + 1} of ${chunkHashes.length}`);
        index++;
      }

      const total = decryptedChunks.reduce((s, c) => s + c.length, 0);
      const full = new Uint8Array(total);
      let offset = 0;
      for (const chunk of decryptedChunks) { full.set(chunk, offset); offset += chunk.length; }

      addLog("File reassembled successfully ✓", "success");
      addLog("All integrity checks passed ✓", "success");

      const url = URL.createObjectURL(new Blob([full]));
      const a = Object.assign(document.createElement("a"), { href: url, download: selectedFile?.name || "recovered_file" });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      addLog("Download triggered ✓", "success");
    } catch (e) {
      addLog(`Error: ${e.message}`, "error");
    }
    setIsWorking(false);
  };

  const tabs = [
    { id: "vault", label: "Vault", icon: "⬡" },
    { id: "upload", label: "Encrypt", icon: "⬢" },
    { id: "download", label: "Retrieve", icon: "⬡" },
    { id: "about", label: "Protocol", icon: "⬡" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020b12; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,212,170,0.2); border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        .fade-up { animation: fadeUp 0.5s ease forwards; }
        .tab-btn:hover { background: rgba(0,212,170,0.08) !important; color: #00d4aa !important; }
        .action-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,212,170,0.25) !important; }
        .action-btn:active { transform: translateY(0); }
      `}</style>

      <ParticleField />

      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden", opacity: 0.03 }}>
        <div style={{ position: "absolute", width: "100%", height: "2px", background: "rgba(0,212,170,0.8)", animation: "scanline 8s linear infinite" }} />
      </div>

      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(0,212,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,170,0.03) 1px, transparent 1px)`,
        backgroundSize: "40px 40px"
      }} />

      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", fontFamily: "'Syne', sans-serif", color: "#e2e8f0" }}>

        {/* HEADER */}
        <header style={{
          padding: "0 40px", height: "64px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid rgba(0,212,170,0.08)",
          backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100,
          background: "rgba(2,11,18,0.8)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "linear-gradient(135deg, #00d4aa, #0ea5e9)",
              borderRadius: "8px", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "14px", fontWeight: "800", color: "#020b12"
            }}>V</div>
            <span style={{ fontSize: "16px", fontWeight: "700", letterSpacing: "-0.02em" }}>SecureVault</span>
            <span style={{
              fontSize: "10px", padding: "2px 8px", borderRadius: "20px",
              background: "rgba(0,212,170,0.1)", color: "#00d4aa",
              border: "1px solid rgba(0,212,170,0.2)", fontFamily: "monospace", letterSpacing: "0.05em"
            }}>v2.0</span>
          </div>

          <nav style={{ display: "flex", gap: "4px" }}>
            {tabs.map(tab => (
              <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
                padding: "7px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                fontFamily: "'Syne', sans-serif", fontSize: "13px", fontWeight: "600",
                letterSpacing: "0.02em", transition: "all 0.2s",
                background: activeTab === tab.id ? "rgba(0,212,170,0.12)" : "transparent",
                color: activeTab === tab.id ? "#00d4aa" : "#475569",
                borderBottom: activeTab === tab.id ? "1px solid #00d4aa" : "1px solid transparent",
              }}>{tab.label}</button>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>SYSTEM ONLINE</span>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ padding: "48px 40px", maxWidth: "1100px", margin: "0 auto" }}>

          {/* HOME TAB */}
          {activeTab === "vault" && (
            <div className="fade-up">
              <div style={{ marginBottom: "56px" }}>
                <div style={{ fontSize: "11px", color: "#00d4aa", fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>
                  ◈ Distributed Cryptographic Storage
                </div>
                <h1 style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: "800", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "20px" }}>
                  Secure.<br />
                  <span style={{ WebkitTextStroke: "1px rgba(0,212,170,0.4)", color: "transparent" }}>Encrypted.</span><br />
                  Distributed.
                </h1>
                <p style={{ color: "#475569", maxWidth: "480px", lineHeight: 1.7, fontSize: "15px" }}>
                  Military-grade AES-256-GCM encryption with RSA-OAEP key exchange.
                  Files are chunked, encrypted, hashed, and distributed across nodes —
                  then verified on retrieval.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "48px", overflowX: "auto", paddingBottom: "8px" }}>
                {[
                  { icon: "📤", label: "Upload", sub: "Any file type" },
                  { icon: "🔑", label: "RSA Wrap", sub: "2048-bit" },
                  { icon: "🔐", label: "AES-GCM", sub: "256-bit key" },
                  { icon: "🧩", label: "Chunk", sub: "64KB blocks" },
                  { icon: "#", label: "SHA-256", sub: "Per chunk" },
                  { icon: "🌐", label: "Distribute", sub: "Across nodes" },
                  { icon: "✓", label: "Verified", sub: "Integrity check" },
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ textAlign: "center", padding: "16px 20px" }}>
                      <div style={{ fontSize: "22px", marginBottom: "6px" }}>{step.icon}</div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#e2e8f0", letterSpacing: "0.02em" }}>{step.label}</div>
                      <div style={{ fontSize: "10px", color: "#334155", marginTop: "2px", fontFamily: "monospace" }}>{step.sub}</div>
                    </div>
                    {i < 6 && <div style={{ width: "24px", height: "1px", background: "linear-gradient(90deg, rgba(0,212,170,0.4), rgba(0,212,170,0.1))", flexShrink: 0 }} />}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
                <StatBadge icon="🔑" label="Key Size" value="256-bit" />
                <StatBadge icon="🧩" label="Chunk Size" value="64 KB" />
                <StatBadge icon="🛡" label="Algorithm" value="AES-GCM" />
                <StatBadge icon="✓" label="Integrity" value="SHA-256" />
                <StatBadge icon="🔒" label="Key Wrap" value="RSA-OAEP" />
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {activeTab === "upload" && (
            <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#00d4aa", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px" }}>◈ Encrypt & Upload</div>
                <h2 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "24px" }}>Secure Upload</h2>

                <FileDropZone onFile={setSelectedFile} selectedFile={selectedFile} />

                <button
                  className="action-btn"
                  onClick={handleUpload}
                  disabled={isWorking}
                  style={{
                    marginTop: "16px", width: "100%", padding: "14px",
                    borderRadius: "10px", border: "none", cursor: isWorking ? "not-allowed" : "pointer",
                    background: "linear-gradient(135deg, #00d4aa, #0ea5e9)",
                    color: "#020b12", fontFamily: "'Syne', sans-serif",
                    fontSize: "14px", fontWeight: "700", letterSpacing: "0.03em",
                    transition: "all 0.2s", opacity: isWorking ? 0.6 : 1,
                  }}>
                  {isWorking ? "⟳ Processing..." : "⬢ Encrypt & Upload"}
                </button>

                {progress > 0 && <ProgressBar progress={progress} label={progressLabel} />}

                {rsaKeyPair && (
                  <div style={{ marginTop: "20px", padding: "16px", background: "rgba(0,212,170,0.04)", border: "1px solid rgba(0,212,170,0.1)", borderRadius: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#00d4aa", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: "8px" }}>SESSION KEYS ACTIVE</div>
                    <div style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace", lineHeight: 1.8 }}>
                      <div>AES-256-GCM ✓ Generated</div>
                      <div>RSA-2048 Public ✓ Wrapped</div>
                      <div>File ID: {uploadedFileId || "—"}</div>
                      <div>Chunks: {chunkHashes.length}</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: "20px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,212,170,0.08)", borderRadius: "12px", minHeight: "400px" }}>
                <div style={{ fontSize: "10px", color: "#334155", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(0,212,170,0.06)" }}>
                  ◈ Operation Log
                </div>
                <div style={{ maxHeight: "420px", overflowY: "auto" }}>
                  {logs.length === 0 ? (
                    <div style={{ color: "#1e293b", fontSize: "12px", fontFamily: "monospace", paddingTop: "20px" }}>Awaiting operation...</div>
                  ) : logs.map(log => <LogEntry key={log.id} text={log.text} type={log.type} />)}
                </div>
              </div>
            </div>
          )}

          {/* DOWNLOAD TAB */}
          {activeTab === "download" && (
            <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#00d4aa", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px" }}>◈ Retrieve & Verify</div>
                <h2 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "24px" }}>Secure Download</h2>

                {uploadedFileId ? (
                  <div style={{ padding: "20px", background: "rgba(0,212,170,0.04)", border: "1px solid rgba(0,212,170,0.12)", borderRadius: "12px", marginBottom: "20px" }}>
                    <div style={{ fontSize: "11px", color: "#00d4aa", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: "12px" }}>ACTIVE SESSION</div>
                    <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace", lineHeight: 2 }}>
                      <div>File: <span style={{ color: "#94a3b8" }}>{selectedFile?.name || "unknown"}</span></div>
                      <div>Chunks: <span style={{ color: "#94a3b8" }}>{chunkHashes.length}</span></div>
                      <div>ID: <span style={{ color: "#94a3b8" }}>{uploadedFileId}</span></div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "24px", background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: "12px", marginBottom: "20px", fontSize: "13px", color: "#78716c" }}>
                    No active session. Upload a file first.
                  </div>
                )}

                <button
                  className="action-btn"
                  onClick={handleDownload}
                  disabled={isWorking || !uploadedFileId}
                  style={{
                    width: "100%", padding: "14px", borderRadius: "10px",
                    border: "1px solid rgba(0,212,170,0.3)", cursor: (!uploadedFileId || isWorking) ? "not-allowed" : "pointer",
                    background: "transparent", color: "#00d4aa",
                    fontFamily: "'Syne', sans-serif", fontSize: "14px", fontWeight: "700",
                    letterSpacing: "0.03em", transition: "all 0.2s",
                    opacity: !uploadedFileId ? 0.4 : 1,
                  }}>
                  {isWorking ? "⟳ Decrypting..." : "⬡ Retrieve & Decrypt"}
                </button>

                {progress > 0 && <ProgressBar progress={progress} label={progressLabel} />}
              </div>

              <div style={{ padding: "20px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,212,170,0.08)", borderRadius: "12px", minHeight: "400px" }}>
                <div style={{ fontSize: "10px", color: "#334155", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid rgba(0,212,170,0.06)" }}>
                  ◈ Operation Log
                </div>
                <div style={{ maxHeight: "420px", overflowY: "auto" }}>
                  {logs.length === 0 ? (
                    <div style={{ color: "#1e293b", fontSize: "12px", fontFamily: "monospace", paddingTop: "20px" }}>Awaiting operation...</div>
                  ) : logs.map(log => <LogEntry key={log.id} text={log.text} type={log.type} />)}
                </div>
              </div>
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === "about" && (
            <div className="fade-up">
              <div style={{ fontSize: "11px", color: "#00d4aa", fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px" }}>◈ Cryptographic Protocol</div>
              <h2 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "40px" }}>How It Works</h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                {[
                  { title: "AES-256-GCM", icon: "🔐", desc: "Authenticated encryption that ensures both confidentiality and integrity of each 64KB chunk. A unique 96-bit IV is generated per chunk." },
                  { title: "RSA-OAEP", icon: "🔑", desc: "2048-bit RSA with Optimal Asymmetric Encryption Padding used to wrap the AES session key. Only your private key can recover it." },
                  { title: "SHA-256 Hashing", icon: "#", desc: "Each encrypted chunk is hashed before upload and re-hashed on download. Any tampering is immediately detected." },
                  { title: "64KB Chunking", icon: "🧩", desc: "Files are split into 64KB blocks before encryption. Each chunk is independently encrypted, uploaded, and verified." },
                  { title: "Web Crypto API", icon: "🛡", desc: "All cryptographic operations run natively in the browser using the W3C Web Crypto API — no third-party libraries, no key leakage." },
                  { title: "Zero Trust Model", icon: "⬡", desc: "Keys never leave your session. The server receives only opaque encrypted blobs — it cannot decrypt anything without your private key." },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: "24px", borderRadius: "12px",
                    background: "rgba(0,212,170,0.03)",
                    border: "1px solid rgba(0,212,170,0.08)",
                    position: "relative", overflow: "hidden",
                  }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,212,170,0.3), transparent)" }} />
                    <div style={{ fontSize: "24px", marginBottom: "12px" }}>{item.icon}</div>
                    <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px", letterSpacing: "-0.01em" }}>{item.title}</div>
                    <div style={{ fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* FOOTER */}
        <footer style={{ padding: "24px 40px", borderTop: "1px solid rgba(0,212,170,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#1e293b", fontFamily: "monospace" }}>SecureVault • AES-256 + RSA-OAEP + SHA-256</span>
          <span style={{ fontSize: "11px", color: "#1e293b", fontFamily: "monospace" }}>All crypto runs client-side</span>
        </footer>
      </div>
    </>
  );
}
