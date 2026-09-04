import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import AdminWorkspace from "@/pages/AdminWorkspace";
import StudentDashboard from "@/pages/StudentDashboard";
import StudentProfile from "@/pages/StudentProfile";
import PeerProfile from "@/pages/PeerProfile";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function ProtectedShell({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/app">{() => <ProtectedShell><StudentDashboard /></ProtectedShell>}</Route>
    <Route path="/admin">{() => <ProtectedShell><AdminWorkspace /></ProtectedShell>}</Route>
    <Route path="/profile">{() => <ProtectedShell><StudentProfile /></ProtectedShell>}</Route>
    <Route path="/profile/:studentId">{() => <ProtectedShell><PeerProfile /></ProtectedShell>}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ThemeProvider>
  </ErrorBoundary>;
}

export default App;
