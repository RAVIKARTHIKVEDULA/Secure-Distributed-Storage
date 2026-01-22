import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Home from "@/pages/Home";
import Upload from "@/pages/Upload";
import Files from "@/pages/Files";
import Storage from "@/pages/Storage";
import Logs from "@/pages/Logs";
import Architecture from "@/pages/Architecture";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/upload" component={Upload} />
        <Route path="/files" component={Files} />
        <Route path="/storage" component={Storage} />
        <Route path="/logs" component={Logs} />
        <Route path="/architecture" component={Architecture} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
