import { Server, Activity, Wifi, WifiOff } from "lucide-react";
import { useNodes, useToggleNode } from "@/hooks/use-distributed-storage";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { clsx } from "clsx";

export default function Storage() {
  const { data: nodes, isLoading } = useNodes();
  const toggleNode = useToggleNode();

  if (isLoading) return <div className="p-8">Loading nodes...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Storage Nodes</h2>
        <p className="text-muted-foreground">Manage the physical storage nodes in the distributed network.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {nodes?.map((node) => (
          <div 
            key={node.id}
            className={clsx(
              "relative overflow-hidden rounded-2xl border p-6 transition-all duration-300",
              node.status === 'active' 
                ? "bg-card border-primary/20 shadow-lg shadow-primary/5" 
                : "bg-card/50 border-white/5 opacity-80"
            )}
          >
            {/* Background Glow */}
            <div className={clsx(
              "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none",
              node.status === 'active' ? "bg-primary" : "bg-red-500"
            )} />

            <div className="flex items-start justify-between mb-6 relative">
              <div className={clsx(
                "p-3 rounded-xl border",
                node.status === 'active' 
                  ? "bg-primary/10 border-primary/20 text-primary" 
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              )}>
                <Server className="w-8 h-8" />
              </div>
              <div className={clsx(
                "px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5",
                node.status === 'active' 
                  ? "bg-primary/5 border-primary/20 text-primary" 
                  : "bg-red-500/5 border-red-500/20 text-red-500"
              )}>
                <span className={clsx("w-1.5 h-1.5 rounded-full", node.status === 'active' ? "bg-primary animate-pulse" : "bg-red-500")} />
                {node.status.toUpperCase()}
              </div>
            </div>

            <div className="space-y-4 relative">
              <div>
                <h3 className="text-xl font-bold tracking-tight">{node.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Activity className="w-3 h-3" /> {node.region}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-t border-white/5 border-b">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Latency</p>
                  <p className="text-lg font-mono font-medium">{node.latencyMs}ms</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Heartbeat</p>
                  <p className="text-sm font-mono text-muted-foreground mt-0.5">
                    {node.lastHeartbeat ? format(new Date(node.lastHeartbeat), 'HH:mm:ss') : '-'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full" 
                  variant={node.status === 'active' ? "destructive" : "default"}
                  onClick={() => toggleNode.mutate(node.id)}
                  disabled={toggleNode.isPending}
                >
                  {node.status === 'active' ? (
                    <><WifiOff className="w-4 h-4 mr-2" /> Disable Node</>
                  ) : (
                    <><Wifi className="w-4 h-4 mr-2" /> Activate Node</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
