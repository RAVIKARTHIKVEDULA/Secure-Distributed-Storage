import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Logical Storage Nodes
export const nodes = pgTable("nodes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'disabled'
  region: text("region").default("us-east"),
  latencyMs: integer("latency_ms").default(20),
  lastHeartbeat: timestamp("last_heartbeat").defaultNow(),
});

// Files Metadata (No plaintext content)
export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  mimeType: text("mime_type").notNull(),
  ownerSessionId: text("owner_session_id").notNull(), // To link to local browser session
  encryptionMetadata: jsonb("encryption_metadata").notNull(), // Stores IV, salt, public key thumbprint, etc.
  totalChunks: integer("total_chunks").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chunks Manifest (Orders the chunks for a file)
export const fileChunks = pgTable("file_chunks", {
  id: serial("id").primaryKey(),
  fileId: uuid("file_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  chunkHash: text("chunk_hash").notNull(), // SHA-256 hash of the *encrypted* chunk
  size: integer("size").notNull(),
});

// Actual Chunk Storage on Nodes (Replicated)
// "Encrypted chunks stored in backend-managed storage"
export const nodeStorage = pgTable("node_storage", {
  id: serial("id").primaryKey(),
  nodeId: integer("node_id").notNull(),
  chunkHash: text("chunk_hash").notNull(),
  data: text("data").notNull(), // Base64 encoded encrypted data (using text for compatibility, bytea could be used but text is easier for JSON transport in prototype)
  createdAt: timestamp("created_at").defaultNow(),
});

// System Logs
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull(), // 'info', 'warn', 'error', 'success'
  component: text("component").notNull(), // 'client', 'backend', 'node-1', etc.
  action: text("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === RELATIONS ===
export const fileChunksRelations = relations(fileChunks, ({ one }) => ({
  file: one(files, {
    fields: [fileChunks.fileId],
    references: [files.id],
  }),
}));

export const nodeStorageRelations = relations(nodeStorage, ({ one }) => ({
  node: one(nodes, {
    fields: [nodeStorage.nodeId],
    references: [nodes.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertNodeSchema = createInsertSchema(nodes).omit({ id: true, lastHeartbeat: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true });
export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({ id: true, timestamp: true });

// === EXPLICIT TYPES ===
export type Node = typeof nodes.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type FileChunk = typeof fileChunks.$inferSelect;
export type NodeStorage = typeof nodeStorage.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;

export type InsertFileRequest = z.infer<typeof insertFileSchema>;
export type InsertLogRequest = z.infer<typeof insertSystemLogSchema>;

// Complex Types for API
export interface UploadChunkRequest {
  fileId: string;
  chunkIndex: number;
  chunkHash: string;
  data: string; // Base64
  size: number;
}

export interface ChunkLocationResponse {
  chunkHash: string;
  nodeIds: number[];
}

export interface FileResponse extends FileRecord {
  chunks: {
    index: number;
    hash: string;
    nodes: number[];
  }[];
}
