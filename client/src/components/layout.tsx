import { Link, useLocation } from "wouter";
import { ShieldCheck, HardDrive, UploadCloud, FileText, Activity, Server, Menu, X } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { useCrypto } from "@/hooks/use-crypto";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { sessionId } = useCrypto();

  const navItems = [
    { href: "/upload", label: "Secure Upload", icon: UploadCloud },
    { href: "/files", label: "My Files", icon: FileText },
    { href: "/storage", label: "Node Status", icon: Server },
    { href: "/logs", label: "System Logs", icon: Activity },
    { href: "/architecture", label: "Architecture", icon: HardDrive },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card/95 border-r border-white/5 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static backdrop-blur-xl",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-white/5">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">Vault<span className="text-primary">Dist</span></h1>
                <p className="text-xs text-muted-foreground">Secure Distributed FS</p>
              </div>
            </Link>
          </div>

          <div className="p-4">
            {sessionId ? (
              <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary/10 mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Session Active</p>
                <p className="font-mono text-xs text-primary truncate" title={sessionId}>ID: {sessionId}</p>
              </div>
            ) : (
              <div className="px-4 py-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 mb-6 animate-pulse">
                <p className="text-xs text-yellow-500 font-semibold">Initializing Crypto...</p>
              </div>
            )}
            
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 group",
                      isActive 
                        ? "bg-primary/10 text-primary shadow-sm shadow-primary/5 border border-primary/20" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    <item.icon className={clsx("w-4 h-4 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-white/5">
            <div className="text-xs text-muted-foreground/60 text-center">
              &copy; 2025 SecureVault Inc.
              <br />
              Client-Side Encryption Active
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-white/5 sticky top-0 z-40">
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-6 h-6 text-primary" />
           <span className="font-bold">VaultDist</span>
        </div>
        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 text-muted-foreground hover:text-foreground">
          {isMobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-0">
        {/* Decorative background elements */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-[-10%] left-[20%] w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl opacity-20" />
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
      
      {/* Overlay for mobile drawer */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </div>
  );
}
