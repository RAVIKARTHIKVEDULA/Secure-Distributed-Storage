import { motion } from "framer-motion";
import { Lock, File as FileIcon, Scissors, ArrowRight, Server, Database } from "lucide-react";

export default function Architecture() {
  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold tracking-tight">System Architecture</h2>
        <p className="text-xl text-muted-foreground">How VaultDist secures your data from browser to disk.</p>
      </div>

      <div className="relative">
        {/* Connection Lines (simplified visual representation) */}
        <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-gradient-to-b from-primary/50 to-transparent md:hidden" />
        
        <div className="space-y-12 relative">
          <Step 
            number="1"
            title="Client-Side Encryption"
            description="Before data leaves your browser, it is encrypted using AES-256-GCM. The encryption key is generated locally and wrapped using your session's RSA public key."
            icon={Lock}
            color="text-primary"
            bg="bg-primary/10"
          />
          
          <Step 
            number="2"
            title="Chunking & Hashing"
            description="The encrypted binary is split into fixed-size chunks (256KB). Each chunk is hashed (SHA-256) to ensure integrity and enable content-addressable logic."
            icon={Scissors}
            color="text-blue-400"
            bg="bg-blue-500/10"
          />

          <Step 
            number="3"
            title="Distribution Manifest"
            description="A file record is created containing metadata (IV, wrapped key, chunk order). No plaintext content is ever sent to the server."
            icon={FileIcon}
            color="text-purple-400"
            bg="bg-purple-500/10"
          />

          <Step 
            number="4"
            title="Node Replication"
            description="Chunks are distributed to available storage nodes based on a simple replication strategy. Nodes store opaque binary blobs without knowing the contents."
            icon={Server}
            color="text-orange-400"
            bg="bg-orange-500/10"
          />
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-white/5 border border-white/5 mt-12">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
           <Database className="w-5 h-5 text-primary" /> Data Model
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm font-mono">
           <div className="space-y-2">
             <p className="text-primary font-bold">files Table</p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li>id (UUID)</li>
               <li>owner_session_id (Link to key)</li>
               <li>encryption_metadata (JSONB)</li>
               <li>total_chunks (Int)</li>
             </ul>
           </div>
           <div className="space-y-2">
             <p className="text-blue-400 font-bold">node_storage Table</p>
             <ul className="list-disc list-inside text-muted-foreground space-y-1">
               <li>node_id (FK)</li>
               <li>chunk_hash (SHA-256)</li>
               <li>data (Encrypted Blob)</li>
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, description, icon: Icon, color, bg }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex gap-6 md:gap-10 items-start group"
    >
      <div className={`relative z-10 flex-shrink-0 w-16 h-16 rounded-2xl ${bg} ${color} flex items-center justify-center text-2xl font-bold border border-white/5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-8 h-8" />
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-background border border-white/10 flex items-center justify-center text-sm font-mono text-muted-foreground shadow-sm">
          {number}
        </div>
      </div>
      <div className="pt-2">
        <h3 className={`text-2xl font-bold mb-2 ${color}`}>{title}</h3>
        <p className="text-muted-foreground text-lg leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
