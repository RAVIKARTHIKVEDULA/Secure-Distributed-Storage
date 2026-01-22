import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertFileRequest, type InsertLogRequest } from "@shared/schema";

// === NODES ===
export function useNodes() {
  return useQuery({
    queryKey: [api.nodes.list.path],
    queryFn: async () => {
      const res = await fetch(api.nodes.list.path);
      if (!res.ok) throw new Error("Failed to fetch nodes");
      return api.nodes.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll for status updates
  });
}

export function useToggleNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.nodes.toggle.path, { id });
      const res = await fetch(url, { method: api.nodes.toggle.method });
      if (!res.ok) throw new Error("Failed to toggle node");
      return api.nodes.toggle.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.nodes.list.path] });
    },
  });
}

// === FILES ===
export function useFiles() {
  return useQuery({
    queryKey: [api.files.list.path],
    queryFn: async () => {
      const res = await fetch(api.files.list.path);
      if (!res.ok) throw new Error("Failed to fetch files");
      return api.files.list.responses[200].parse(await res.json());
    },
  });
}

export function useFile(id: string) {
  return useQuery({
    queryKey: [api.files.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.files.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) throw new Error("File not found");
      if (!res.ok) throw new Error("Failed to fetch file details");
      return await res.json(); // Complex return type, relying on inference here or manual cast
    },
    enabled: !!id,
  });
}

export function useCreateFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertFileRequest) => {
      const res = await fetch(api.files.create.path, {
        method: api.files.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create file record");
      return api.files.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.files.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
    },
  });
}

// === CHUNKS ===
export function useUploadChunk() {
  return useMutation({
    mutationFn: async (data: {
      fileId: string;
      chunkIndex: number;
      chunkHash: string;
      data: string;
      size: number;
    }) => {
      const res = await fetch(api.chunks.upload.path, {
        method: api.chunks.upload.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to upload chunk");
      return await res.json();
    },
  });
}

// Helper to fetch a single chunk from a specific node
export async function fetchChunk(hash: string, nodeId: number) {
  const url = `${buildUrl(api.chunks.get.path, { hash })}?nodeId=${nodeId}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 503) throw new Error("Node unavailable");
    throw new Error("Failed to fetch chunk");
  }
  return await res.json();
}

// === LOGS ===
export function useLogs() {
  return useQuery({
    queryKey: [api.logs.list.path],
    queryFn: async () => {
      const res = await fetch(api.logs.list.path);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.logs.list.responses[200].parse(await res.json());
    },
    refetchInterval: 3000,
  });
}

export function useCreateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertLogRequest) => {
      const res = await fetch(api.logs.create.path, {
        method: api.logs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create log");
      return api.logs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
    },
  });
}
