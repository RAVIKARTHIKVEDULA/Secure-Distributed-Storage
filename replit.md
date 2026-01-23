# VaultDist - Secure Distributed File Storage

## Overview

VaultDist is a web-based secure distributed file storage prototype that implements client-side encryption with distributed chunk storage across logical nodes. The system ensures that plaintext files never leave the user's browser - all encryption happens client-side using the Web Crypto API before data is uploaded to backend storage nodes.

The application provides:
- Client-side AES-256-GCM file encryption
- RSA key pair generation per browser session
- File chunking with SHA-256 integrity verification
- Distributed storage across multiple logical nodes with replication
- Real-time node status monitoring and system logging

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for UI transitions and data flow visualizations
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with tsx for development execution
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Build Process**: esbuild for server bundling, Vite for client bundling

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Key Tables**:
  - `nodes`: Logical storage nodes with status and region info
  - `files`: File metadata including encryption parameters (no plaintext)
  - `fileChunks`: Chunk manifest linking files to their encrypted chunks
  - `nodeStorage`: Actual encrypted chunk data stored per node
  - `systemLogs`: Audit trail for all operations

### Security Model
- **Client-Side Encryption**: Web Crypto API for AES-256-GCM file encryption
- **Key Management**: RSA key pairs generated per session, stored in localStorage
- **Chunk Integrity**: SHA-256 hashing for content-addressable chunk identification
- **Zero-Knowledge Backend**: Server never receives plaintext files or private keys

### API Structure
Routes are defined in `shared/routes.ts` using a type-safe pattern:
- `/api/nodes` - Node management (list, toggle status)
- `/api/files` - File operations (list, create, get by ID)
- `/api/chunks` - Chunk upload and retrieval
- `/api/logs` - System log access

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage in PostgreSQL

### Frontend Libraries
- **@tanstack/react-query**: Async state management with 5-second polling for node status
- **framer-motion**: Animation library for data flow visualizations
- **react-dropzone**: File upload drag-and-drop functionality
- **date-fns**: Date formatting for logs and file timestamps
- **recharts**: Data visualization for node distribution stats

### UI Component System
- **shadcn/ui**: Full component library with Radix UI primitives
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Safe Tailwind class merging

### Build Tools
- **Vite**: Frontend development server and bundler
- **esbuild**: Server-side TypeScript bundling for production
- **drizzle-kit**: Database migration and schema management