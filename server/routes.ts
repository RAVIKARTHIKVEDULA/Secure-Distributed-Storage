import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Initialize nodes if empty
  await storage.initializeNodes();

  // Nodes
  app.get(api.nodes.list.path, async (req, res) => {
    const nodes = await storage.getNodes();
    res.json(nodes);
  });

  app.post(api.nodes.toggle.path, async (req, res) => {
    try {
      const node = await storage.toggleNodeStatus(Number(req.params.id));
      await storage.createLog({
        level: "warn",
        component: "backend",
        action: "NODE_STATUS_CHANGE",
        details: `Node ${node.name} status changed to ${node.status}`
      });
      res.json(node);
    } catch (e) {
      res.status(404).json({ message: "Node not found" });
    }
  });

  // Files
  app.get(api.files.list.path, async (req, res) => {
    const files = await storage.getFiles();
    res.json(files);
  });

  app.post(api.files.create.path, async (req, res) => {
    try {
      const input = api.files.create.input.parse(req.body);
      const file = await storage.createFile(input);
      
      await storage.createLog({
        level: "info",
        component: "client",
        action: "FILE_METADATA_CREATED",
        details: `File ${file.fileName} initialized. Expecting ${file.totalChunks} chunks.`
      });
      
      res.status(201).json(file);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.files.get.path, async (req, res) => {
    const file = await storage.getFile(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });
    
    const chunks = await storage.getFileChunks(file.id);
    res.json({ ...file, chunks });
  });

  // Chunks
  // Increase payload limit for chunks
  app.use(api.chunks.upload.path, (req, res, next) => {
    // Middleware to ensure we can accept large JSON bodies for base64 chunks
    // Express default is usually small. server/index.ts usually sets this globally, 
    // but just in case we verify here or rely on global settings.
    next();
  });

  app.post(api.chunks.upload.path, async (req, res) => {
    try {
      const input = api.chunks.upload.input.parse(req.body);
      
      // Store logic distributes to nodes
      const result = await storage.storeChunk(input);
      
      await storage.createLog({
        level: "success",
        component: "backend",
        action: "CHUNK_DISTRIBUTED",
        details: `Chunk ${input.chunkIndex} of file ${input.fileId.substring(0,8)}... replicated to nodes [${result.replicas.join(", ")}]`
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Chunk upload error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.chunks.get.path, async (req, res) => {
    const hash = req.params.hash;
    const nodeId = Number(req.query.nodeId);

    if (isNaN(nodeId)) {
      return res.status(400).json({ message: "nodeId query param required" });
    }

    // Check node status first
    const node = await storage.getNode(nodeId);
    if (!node) return res.status(404).json({ message: "Node not found" });
    if (node.status !== "active") {
      return res.status(503).json({ message: "Node unavailable", nodeId });
    }

    const data = await storage.getChunkData(hash, nodeId);
    
    if (!data) {
      return res.status(404).json({ message: "Chunk not found on this node" });
    }

    // Log the read
    // (Optional: don't log every read to avoid spam, or log only info)
    
    res.json({ data, nodeId });
  });

  // Logs
  app.get(api.logs.list.path, async (req, res) => {
    const logs = await storage.getLogs();
    res.json(logs);
  });

  app.post(api.logs.create.path, async (req, res) => {
    try {
      const input = api.logs.create.input.parse(req.body);
      await storage.createLog(input);
      res.status(201).json({});
    } catch (e) {
      res.status(400).json({});
    }
  });

  return httpServer;
}
