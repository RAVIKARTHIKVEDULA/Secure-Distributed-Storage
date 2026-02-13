console.log("### EXPERIMENT BACKEND FILE LOADED ###");

// ================= IMPORTS =================
const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

// ================= APP SETUP =================
const app = express();
const PORT = 3000;
app.use(cors());

// ================= FRIEND STORAGE NODES =================
const REMOTE_NODES = [
  { host: "10.117.185.237", port: 4000 },
  { host: "10.117.185.75", port: 4001 }
];

// ================= DIRECTORIES =================
const BASE_DIR = __dirname;
const UPLOAD_DIR = path.join(BASE_DIR, "uploads");
const DHT_FILE = path.join(BASE_DIR, "dht.json");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// ================= LOAD / SAVE DHT =================
function loadDHT() {
  try {
    if (fs.existsSync(DHT_FILE)) {
      const data = fs.readFileSync(DHT_FILE, "utf-8").trim();
      if (!data) return {};
      return JSON.parse(data);
    }
  } catch {
    return {};
  }
  return {};
}

function saveDHT(dht) {
  fs.writeFileSync(DHT_FILE, JSON.stringify(dht, null, 2));
}

const DHT = loadDHT();

// ================= HASH HELPER =================
function computeSHA256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ================= REMOTE UPLOAD HELPER =================
function sendChunkToRemoteNode(filePath, filename, node) {
  return new Promise((resolve, reject) => {
    const boundary = "----NodeBoundary";
    const fileData = fs.readFileSync(filePath);

    const options = {
      hostname: node.host,
      port: node.port,
      path: "/store",
      method: "POST",
      timeout: 5000,
      headers: {
        "Content-Type": "multipart/form-data; boundary=" + boundary,
        "Content-Length":
          Buffer.byteLength(fileData) +
          Buffer.byteLength(boundary) * 2 +
          200
      }
    };

    const req = http.request(options, res => {
      let body = "";

      res.on("data", chunk => (body += chunk));

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(
            new Error(`Remote node error ${res.statusCode}: ${body}`)
          );
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Remote node timeout"));
    });

    req.on("error", reject);

    req.write(`--${boundary}\r\n`);
    req.write(
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`
    );
    req.write("Content-Type: application/octet-stream\r\n\r\n");
    req.write(fileData);
    req.write(`\r\n--${boundary}--\r\n`);
    req.end();
  });
}

// ================= MULTER STORAGE =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage });

// ================= UPLOAD ROUTE =================
app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("UPLOAD ROUTE HIT:", req.file?.filename);

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const filename = req.file.filename;
  const fileId = filename.split("_chunk_")[0];
  const chunkIndex = parseInt(filename.split("_chunk_")[1]);

  const remoteNode = REMOTE_NODES[chunkIndex % REMOTE_NODES.length];

  if (!DHT[fileId]) {
    DHT[fileId] = [];
  }

  const chunkHash = computeSHA256(req.file.path);

  try {
    await sendChunkToRemoteNode(req.file.path, filename, remoteNode);

    DHT[fileId].push({
      filename,
      node: remoteNode,
      sha256: chunkHash
    });

    saveDHT(DHT);

    res.json({
      message: "Chunk stored on remote node",
      filename,
      sha256: chunkHash
    });
  } catch (err) {
    console.error("Remote upload failed:", err.message);
    res.status(500).json({ message: "Remote node unavailable" });
  }
});

// ================= DOWNLOAD ROUTE =================
app.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const fileId = filename.split("_chunk_")[0];

  if (!DHT[fileId]) {
    return res.status(404).send("File not found in DHT");
  }

  const entry = DHT[fileId].find(e => e.filename === filename);
  if (!entry) {
    return res.status(404).send("Chunk entry missing");
  }

  const node = entry.node;

  const options = {
    hostname: node.host,
    port: node.port,
    path: `/fetch/${filename}`,
    method: "GET"
  };

  const hash = crypto.createHash("sha256");

  const remoteReq = http.request(options, remoteRes => {
    res.writeHead(remoteRes.statusCode, remoteRes.headers);

    remoteRes.on("data", chunk => {
      hash.update(chunk);
      res.write(chunk);
    });

    remoteRes.on("end", () => {
      const downloadedHash = hash.digest("hex");

      if (downloadedHash !== entry.sha256) {
        console.error("Integrity check failed:", filename);
        res.destroy(new Error("Integrity check failed"));
        return;
      }

      res.end();
    });
  });

  remoteReq.on("error", err => {
    console.error("Remote download failed:", err.message);
    res.status(500).send("Remote download failed");
  });

  remoteReq.end();
});

// ================= SERVER START =================
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
