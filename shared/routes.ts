import { z } from 'zod';
import { insertFileSchema, insertSystemLogSchema, nodes, files, systemLogs } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  nodeUnavailable: z.object({
    message: z.string(),
    nodeId: z.number(),
  })
};

export const api = {
  // === Nodes Management ===
  nodes: {
    list: {
      method: 'GET' as const,
      path: '/api/nodes',
      responses: {
        200: z.array(z.custom<typeof nodes.$inferSelect>()),
      },
    },
    toggle: {
      method: 'POST' as const,
      path: '/api/nodes/:id/toggle',
      responses: {
        200: z.custom<typeof nodes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },

  // === Files Management ===
  files: {
    list: {
      method: 'GET' as const,
      path: '/api/files',
      responses: {
        200: z.array(z.custom<typeof files.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/files',
      input: insertFileSchema,
      responses: {
        201: z.custom<typeof files.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/files/:id',
      responses: {
        200: z.any(), // Returns FileResponse complex type
        404: errorSchemas.notFound,
      },
    }
  },

  // === Chunks & Data ===
  chunks: {
    upload: {
      method: 'POST' as const,
      path: '/api/chunks',
      input: z.object({
        fileId: z.string(),
        chunkIndex: z.number(),
        chunkHash: z.string(),
        data: z.string(), // Base64
        size: z.number(),
      }),
      responses: {
        201: z.object({
          chunkHash: z.string(),
          replicas: z.array(z.number()) // IDs of nodes where it was stored
        }),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/chunks/:hash', // Query param ?nodeId=X required to simulate fetching from specific node
      responses: {
        200: z.object({
          data: z.string(), // Base64
          nodeId: z.number()
        }),
        404: errorSchemas.notFound,
        503: errorSchemas.nodeUnavailable, // If requested node is disabled
      },
    }
  },

  // === Logs ===
  logs: {
    list: {
      method: 'GET' as const,
      path: '/api/logs',
      responses: {
        200: z.array(z.custom<typeof systemLogs.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/logs',
      input: insertSystemLogSchema,
      responses: {
        201: z.custom<typeof systemLogs.$inferSelect>(),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
