import { Activity, Terminal } from "lucide-react";
import { useLogs } from "@/hooks/use-distributed-storage";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { clsx } from "clsx";

export default function Logs() {
  const { data: logs, isLoading } = useLogs();

  return (
    <div className="space-y-6 h-[85vh] flex flex-col">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Logs</h2>
        <p className="text-muted-foreground">Real-time audit trail of client and node operations.</p>
      </div>

      <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm font-mono text-sm relative">
        <div className="absolute top-0 left-0 right-0 h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <div className="ml-4 text-xs text-muted-foreground flex items-center gap-2">
            <Terminal className="w-3 h-3" /> system.log
          </div>
        </div>

        <ScrollArea className="h-full pt-10">
          <div className="p-4 space-y-1">
            {isLoading && <p className="text-muted-foreground animate-pulse">Fetching stream...</p>}
            
            {logs?.map((log) => (
              <div key={log.id} className="grid grid-cols-[140px_100px_1fr] gap-4 py-1 hover:bg-white/5 transition-colors px-2 rounded">
                <div className="text-muted-foreground/60 select-none">
                  {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss.SSS') : ''}
                </div>
                <div className={clsx(
                  "font-bold uppercase tracking-wider text-[10px] py-0.5 px-2 rounded w-fit h-fit",
                  log.level === 'info' && "bg-blue-500/10 text-blue-400",
                  log.level === 'success' && "bg-green-500/10 text-green-400",
                  log.level === 'warn' && "bg-yellow-500/10 text-yellow-400",
                  log.level === 'error' && "bg-red-500/10 text-red-400",
                )}>
                  {log.level}
                </div>
                <div className="break-all">
                  <span className="text-primary/70 mr-2">[{log.component}]:</span>
                  <span className="text-foreground/90">{log.action}</span>
                  {log.details && <span className="text-muted-foreground ml-2">- {log.details}</span>}
                </div>
              </div>
            ))}
            
            {logs?.length === 0 && (
              <div className="text-muted-foreground italic p-4 text-center">No logs recorded yet.</div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
