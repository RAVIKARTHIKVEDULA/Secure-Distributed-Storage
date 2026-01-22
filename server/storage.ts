import { db } from "./db";
import { 
  nodes, files, fileChunks, nodeStorage, systemLogs,
  type Node, type FileRecord, type InsertFileRequest, 
  type InsertLogRequest, type UploadChunkRequest 
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // Nodes
  getNodes(): Promise<Node[]>;
  getNode(id: number): Promise<Node | undefined>;
  toggleNodeStatus(id: number): Promise<Node>;
  initializeNodes(): Promise<void>;

  // Files
  createFile(file: InsertFileRequest): Promise<FileRecord>;
  getFiles(): Promise<FileRecord[]>;
  getFile(id: string): Promise<FileRecord | undefined>;
  
  // Chunks
  storeChunk(chunk: UploadChunkRequest): Promise<{ chunkHash: string, replicas: number[] }>;
  getChunkData(hash: string, nodeId: number): Promise<string | undefined>;
  getFileChunks(fileId: string): Promise<{ index: number, hash: string, nodes: number[] }[]>;

  // Logs
  getLogs(): Promise<any[]>;
  createLog(log: InsertLogRequest): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async initializeNodes() {
    const existing = await db.select().from(nodes);
    if (existing.length === 0) {
      await db.insert(nodes).values([
        { name: "Node Alpha", region: "us-east", status: "active", latencyMs: 24 },
        { name: "Node Beta", region: "eu-west", status: "active", latencyMs: 145 },
        { name: "Node Gamma", region: "ap-south", status: "active", latencyMs: 210 },
      ]);
    }
  }

  // Nodes
  async getNodes(): Promise<Node[]> {
    return await db.select().from(nodes).orderBy(nodes.id);
  }

  async getNode(id: number): Promise<Node | undefined> {
    const [node] = await db.select().from(nodes).where(eq(nodes.id, id));
    return node;
  }

  async toggleNodeStatus(id: number): Promise<Node> {
    const node = await this.getNode(id);
    if (!node) throw new Error("Node not found");
    
    const newStatus = node.status === "active" ? "disabled" : "active";
    const [updated] = await db.update(nodes)
      .set({ status: newStatus })
      .where(eq(nodes.id, id))
      .returning();
    return updated;
  }

  // Files
  async createFile(file: InsertFileRequest): Promise<FileRecord> {
    const [newFile] = await db.insert(files).values(file).returning();
    return newFile;
  }

  async getFiles(): Promise<FileRecord[]> {
    return await db.select().from(files).orderBy(sql`${files.createdAt} DESC`);
  }

  async getFile(id: string): Promise<FileRecord | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  // Chunks & Storage logic
  async storeChunk(req: UploadChunkRequest): Promise<{ chunkHash: string, replicas: number[] }> {
    // 1. Record that this file has this chunk (ordered)
    // Check if chunk record exists for this file/index to prevent duplicates
    const [existingChunk] = await db.select()
      .from(fileChunks)
      .where(and(
        eq(fileChunks.fileId, req.fileId),
        eq(fileChunks.chunkIndex, req.chunkIndex)
      ));

    if (!existingChunk) {
      await db.insert(fileChunks).values({
        fileId: req.fileId,
        chunkIndex: req.chunkIndex,
        chunkHash: req.chunkHash,
        size: req.size,
      });
    }

    // 2. Distribute to nodes (Replication Logic)
    // Select 2 random active nodes
    const allNodes = await this.getNodes();
    const activeNodes = allNodes.filter(n => n.status === "active");
    
    // Fallback: if < 2 active, use whatever is active. If 0 active, fail? 
    // For prototype, simpler to just pick from allNodes but warn if disabled. 
    // "Nodes are logical abstractions". We assume we can write to them even if "disabled" for simulation? 
    // Or we strictly fail. Let's use activeNodes.
    
    let targetNodes = activeNodes;
    if (activeNodes.length > 2) {
      // Shuffle and pick 2
      targetNodes = activeNodes.sort(() => 0.5 - Math.random()).slice(0, 2);
    }

    const replicaIds: number[] = [];

    for (const node of targetNodes) {
      // Check if this node already has this chunk
      const [existingStorage] = await db.select()
        .from(nodeStorage)
        .where(and(
          eq(nodeStorage.nodeId, node.id),
          eq(nodeStorage.chunkHash, req.chunkHash)
        ));

      if (!existingStorage) {
        await db.insert(nodeStorage).values({
          nodeId: node.id,
          chunkHash: req.chunkHash,
          data: req.data,
        });
      }
      replicaIds.push(node.id);
    }

    return { chunkHash: req.chunkHash, replicas: replicaIds };
  }

  async getChunkData(hash: string, nodeId: number): Promise<string | undefined> {
    const [record] = await db.select()
      .from(nodeStorage)
      .where(and(
        eq(nodeStorage.chunkHash, hash),
        eq(nodeStorage.nodeId, nodeId)
      ));
    return record?.data;
  }

  async getFileChunks(fileId: string): Promise<{ index: number, hash: string, nodes: number[] }[]> {
    // Get all chunks for file
    const chunks = await db.select().from(fileChunks).where(eq(fileChunks.fileId, fileId)).orderBy(fileChunks.chunkIndex);
    
    const result = [];
    for (const chunk of chunks) {
      // Find which nodes have this chunk
      const locations = await db.select({ nodeId: nodeStorage.nodeId })
        .from(nodeStorage)
        .where(eq(nodeStorage.chunkHash, chunk.chunkHash));
      
      result.push({
        index: chunk.chunkIndex,
        hash: chunk.chunkHash,
        nodes: locations.map(l => l.nodeId)
      });
    }
    return result;
  }

  // Logs
  async getLogs(): Promise<any[]> {
    return await db.select().from(systemLogs).orderBy(sql`${systemLogs.timestamp} DESC`).limit(100);
  }

  async createLog(log: InsertLogRequest): Promise<void> {
    await db.insert(systemLogs).values(log);
  }
}

export const storage = new DatabaseStorage();
