import { Link } from "wouter";
import { ArrowRight, Lock, Database, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-3xl space-y-8"
      >
        <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Secure Distributed File System
        </motion.div>

        <motion.h1 variants={item} className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent pb-2">
          Your Data. <br />
          <span className="text-primary">Encrypted & Distributed.</span>
        </motion.h1>

        <motion.p variants={item} className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Client-side encryption meets distributed node storage. 
          Your files never leave your device unencrypted. 
          Redundant, secure, and blazing fast.
        </motion.p>

        <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/upload">
            <Button size="lg" className="h-14 px-8 text-lg rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-105 transition-all">
              Start Secure Session <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/architecture">
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-xl hover:bg-white/5 border-white/10 hover:border-white/20">
              How it Works
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Client-Side Crypto</h3>
            <p className="text-muted-foreground text-sm">AES-256-GCM encryption runs in your browser via Web Crypto API before upload.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Distributed Chunks</h3>
            <p className="text-muted-foreground text-sm">Files are split, hashed, and distributed across multiple independent nodes.</p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-primary">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">High Availability</h3>
            <p className="text-muted-foreground text-sm">Redundant storage ensures your data survives individual node failures.</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
