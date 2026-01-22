import { useState } from "react";
import { format } from "date-fns";
import { Download, File as FileIcon, Loader2, HardDrive, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFiles, useFile, fetchChunk, useCreateLog } from "@/hooks/use-distributed-storage";
import { useCrypto } from "@/hooks/use-crypto";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export default function Files() {
  const { data: files, isLoading } = useFiles();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Files</h2>
          <p className="text-muted-foreground">Manage your encrypted files stored across the distributed network.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {files?.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground bg-card/50 rounded-2xl border border-dashed border-white/10">
            <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No files uploaded yet</p>
            <p className="text-sm">Upload a file to start secure storage</p>
          </div>
        )}

        {files?.map((file) => (
          <div key={file.id} className="group relative bg-card hover:bg-card/80 border border-white/5 hover:border-primary/20 transition-all duration-300 rounded-xl p-6 shadow-lg hover:shadow-primary/5">
            <div className="absolute top-4 right-4 p-2 rounded-full bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
               <ShieldCheck className="w-4 h-4" />
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform duration-300">
                <FileIcon className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-lg truncate pr-6" title={file.fileName}>{file.fileName}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {(Number(file.fileSize) / 1024 / 1024).toFixed(2)} MB • {file.totalChunks} Chunks
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
              <span className="text-xs text-muted-foreground">
                {file.createdAt ? format(new Date(file.createdAt), 'MMM d, yyyy') : 'Unknown date'}
              </span>
              <Button 
                variant="secondary" 
                size="sm" 
                className="hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setSelectedFileId(file.id)}
              >
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </div>
          </div>
        ))}
      </div>

      <DownloadModal 
        fileId={selectedFileId} 
        open={!!selectedFileId} 
        onOpenChange={(open) => !open && setSelectedFileId(null)} 
      />
    </div>
  );
}

function DownloadModal({ fileId, open, onOpenChange }: { fileId: string | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: file } = useFile(fileId || "");
  const { decryptFile } = useCrypto();
  const createLog = useCreateLog();
  const { toast } = useToast();
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

  const handleDownload = async () => {
    if (!file) return;

    try {
      setIsDownloading(true);
      setStatus("Fetching chunks manifest...");
      setProgress(5);

      const chunksData: Uint8Array[] = new Array(file.chunks.length);
      let downloadedChunks = 0;

      // Parallel/Sequence fetching (sequence for simplicity here)
      for (const chunk of file.chunks) {
        setStatus(`Downloading chunk ${chunk.index + 1}/${file.totalChunks}...`);
        
        // Find an active node to fetch from
        let response = null;
        let lastError = null;

        for (const nodeId of chunk.nodes) {
          try {
            setStatus(`Downloading chunk ${chunk.index + 1}/${file.totalChunks} (from node ${nodeId})...`);
            response = await fetchChunk(chunk.hash, nodeId);
            break; // Found an active node
          } catch (e: any) {
            console.warn(`Node ${nodeId} failed for chunk ${chunk.index}:`, e);
            lastError = e;
            continue; // Try next replica
          }
        }

        if (!response) {
          throw new Error(`Failed to retrieve chunk ${chunk.index} from any replica. ${lastError?.message || ""}`);
        }
        
        // Decode Base64 to ArrayBuffer
        const binaryString = atob(response.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        chunksData[chunk.index] = bytes;
        downloadedChunks++;
        setProgress(5 + Math.floor((downloadedChunks / file.totalChunks) * 65));
      }

      setStatus("Reassembling and decrypting...");
      setProgress(75);

      // Combine chunks
      const totalLength = chunksData.reduce((acc, curr) => acc + curr.length, 0);
      const encryptedFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunksData) {
        encryptedFile.set(chunk, offset);
        offset += chunk.length;
      }

      // Decrypt
      const decryptedBuffer = await decryptFile(encryptedFile.buffer, file.encryptionMetadata as any);
      
      createLog.mutate({
        level: 'success',
        component: 'client',
        action: 'DECRYPT_FILE',
        details: `Decrypted ${file.fileName} successfully`
      });

      setStatus("Saving file...");
      setProgress(100);

      // Trigger download
      const blob = new Blob([decryptedBuffer], { type: file.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "File downloaded and decrypted." });
      onOpenChange(false);

    } catch (err: any) {
      console.error(err);
      toast({ title: "Download Failed", description: err.message, variant: "destructive" });
      setStatus("Error occurred.");
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !isDownloading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle>Secure Download</DialogTitle>
          <DialogDescription>
            Retrieving chunks from distributed nodes and decrypting in browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="p-2 rounded bg-primary/10 text-primary">
              <FileIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium">{file.fileName}</p>
              <p className="text-xs text-muted-foreground">{file.totalChunks} chunks • Encrypted</p>
            </div>
          </div>

          {isDownloading ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3 items-start">
              <ShieldCheck className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-yellow-500">Decryption Required</p>
                <p className="text-xs text-muted-foreground">This file will be reassembled and decrypted using your local session keys.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isDownloading}>Cancel</Button>
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            {isDownloading ? "Processing..." : "Decrypt & Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
