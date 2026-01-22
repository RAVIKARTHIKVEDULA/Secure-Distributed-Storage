import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, File as FileIcon, Lock, CheckCircle2, Server, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCrypto } from "@/hooks/use-crypto";
import { useCreateFile, useUploadChunk, useCreateLog, useNodes } from "@/hooks/use-distributed-storage";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Constants
const CHUNK_SIZE = 256 * 1024; // 256KB chunks for demo

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'encrypting' | 'uploading' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { encryptFile, hashChunk, isInitializing } = useCrypto();
  const createFile = useCreateFile();
  const uploadChunk = useUploadChunk();
  const createLog = useCreateLog();
  const { data: nodes } = useNodes();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('idle');
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: 1 });

  const handleUpload = async () => {
    if (!file) return;
    if (isInitializing) {
      toast({ title: "Please wait", description: "Encryption keys initializing...", variant: "destructive" });
      return;
    }

    try {
      setStatus('encrypting');
      setCurrentAction("Initializing encryption engine...");
      setProgress(5);

      // 1. Encrypt the file client-side
      setCurrentAction(`Encrypting ${file.name} (AES-256-GCM)...`);
      const startTime = Date.now();
      const { encryptedContent, metadata } = await encryptFile(file);
      const encryptTime = Date.now() - startTime;
      
      createLog.mutate({
        level: 'info',
        component: 'client',
        action: 'ENCRYPT_FILE',
        details: `Encrypted ${file.name} in ${encryptTime}ms`
      });

      setProgress(30);
      setCurrentAction("Preparing distribution manifest...");
      
      // 2. Create chunks
      const chunks = [];
      const totalChunks = Math.ceil(encryptedContent.byteLength / CHUNK_SIZE);
      const uint8Content = new Uint8Array(encryptedContent);

      setStatus('uploading');
      
      // 3. Create File Record first
      const fileRecord = await createFile.mutateAsync({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        ownerSessionId: 'local-session', // In real app, from context
        encryptionMetadata: metadata,
        totalChunks
      });

      // 4. Upload Chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, encryptedContent.byteLength);
        const chunkData = uint8Content.slice(start, end);
        
        // Convert to Base64 for transport (inefficient but simple for JSON API prototype)
        // In prod, use multipart/form-data or binary streams
        const chunkBase64 = btoa(
            new Uint8Array(chunkData).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        const chunkHash = await hashChunk(chunkData);

        setCurrentAction(`Distributing chunk ${i + 1}/${totalChunks} to nodes...`);
        
        await uploadChunk.mutateAsync({
          fileId: fileRecord.id,
          chunkIndex: i,
          chunkHash,
          data: chunkBase64,
          size: chunkData.byteLength
        });

        const percentComplete = 30 + Math.floor(((i + 1) / totalChunks) * 70);
        setProgress(percentComplete);
      }

      setStatus('complete');
      setCurrentAction("Upload complete!");
      toast({ title: "Success", description: "File encrypted and distributed successfully." });
      
      setTimeout(() => setLocation('/files'), 1500);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setCurrentAction("Error: " + err.message);
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Secure Upload</h2>
        <p className="text-muted-foreground">Files are encrypted in your browser before being chunked and distributed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Upload Area */}
        <div className="md:col-span-2 space-y-6">
          <div 
            {...getRootProps()} 
            className={`
              border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
              flex flex-col items-center justify-center min-h-[300px]
              ${isDragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-white/10 hover:border-white/20 hover:bg-white/5"}
              ${status !== 'idle' && status !== 'error' ? "pointer-events-none opacity-50" : ""}
            `}
          >
            <input {...getInputProps()} />
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <UploadCloud className={`w-10 h-10 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            {isDragActive ? (
              <p className="text-xl font-medium text-primary">Drop to encrypt & upload</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xl font-medium">Drag & drop your file here</p>
                <p className="text-sm text-muted-foreground">or click to browse from your device</p>
              </div>
            )}
          </div>

          <AnimatePresence>
            {file && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-card border border-white/5 rounded-xl p-6 shadow-lg"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <FileIcon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{file.name}</h4>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {status === 'complete' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : status === 'error' ? (
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  ) : status !== 'idle' ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <Button onClick={handleUpload} disabled={isInitializing}>
                      Encrypt & Upload
                    </Button>
                  )}
                </div>

                {status !== 'idle' && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground">
                      <span>{currentAction}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
                      <StatusStep active={status === 'encrypting' || status === 'uploading' || status === 'complete'} label="Encryption" icon={Lock} />
                      <StatusStep active={status === 'uploading' || status === 'complete'} label="Chunking" icon={FileIcon} />
                      <StatusStep active={status === 'complete'} label="Distribution" icon={Server} />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Network Status */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Network Status</h3>
          <div className="space-y-3">
            {nodes?.map(node => (
              <div key={node.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-white/5">
                <div className={`w-2 h-2 rounded-full ${node.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{node.name}</p>
                  <p className="text-xs text-muted-foreground">{node.region}</p>
                </div>
                <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">{node.latencyMs}ms</span>
              </div>
            ))}
            {!nodes && [1,2,3].map(i => (
              <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
          
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 mt-6">
            <h4 className="text-primary text-sm font-bold flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4" /> Security Note
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Files are encrypted using AES-256-GCM. The key is wrapped with your session's RSA key. 
              The server never sees the plain file or the unwrapped key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusStep({ active, label, icon: Icon }: { active: boolean, label: string, icon: any }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center transition-opacity duration-300 ${active ? 'opacity-100 text-primary' : 'opacity-30'}`}>
      <div className={`p-2 rounded-full ${active ? 'bg-primary/20' : 'bg-white/5'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}
