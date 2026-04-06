import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Fingerprint,
  Boxes,
  BrainCircuit,
  Shield,
  Menu,
  X,
  Settings,
  LogOut,
} from "lucide-react";
import { getDashboardRouteForRole, type UserRole, useAuth } from "@/contexts/AuthContext";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "analyst", "viewer"] as UserRole[], activePrefix: "/dashboard" },
  { path: "/transactions", label: "Transactions", icon: ArrowLeftRight, roles: ["admin", "analyst", "viewer"] as UserRole[] },
  { path: "/fraud-intelligence", label: "Fraud Intel", icon: Fingerprint, roles: ["admin", "analyst"] as UserRole[] },
  { path: "/blockchain", label: "Blockchain", icon: Boxes, roles: ["admin", "analyst", "viewer"] as UserRole[] },
  { path: "/federated-learning", label: "Fed. Learning", icon: BrainCircuit, roles: ["admin", "analyst"] as UserRole[] },
  { path: "/admin", label: "Admin", icon: Shield, roles: ["admin"] as UserRole[] },
  { path: "/settings", label: "Settings", icon: Settings, roles: ["admin", "analyst"] as UserRole[] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  const visibleNavItems = navItems.filter((item) => !user || item.roles.includes(user.role));

  const navTarget = (path: string) => {
    if (path === "/dashboard" && user) return getDashboardRouteForRole(user.role);
    return path;
  };

  const isNavActive = (path: string, activePrefix?: string) => {
    if (activePrefix) return location.pathname.startsWith(activePrefix);
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border glass-strong">
        <Link to="/" className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <img
            src="/trustx-logo.png"
            alt="TrustXAi"
            className="w-8 h-8 object-contain"
            loading="eager"
            decoding="async"
          />
          <div>
            <span className="font-bold text-sm tracking-tight">TrustChain AI</span>
            <span className="text-[10px] text-muted-foreground block -mt-0.5">2.0</span>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = isNavActive(item.path, item.activePrefix);
            return (
              <Link
                key={item.path}
                to={navTarget(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground">
              {demoMode ? "Demo Mode" : "Live Mode"}
            </span>
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                demoMode ? "bg-primary/30" : "bg-success/30"
              }`}
            >
              <motion.div
                layout
                className={`absolute top-0.5 w-4 h-4 rounded-full ${
                  demoMode ? "left-0.5 bg-primary" : "left-[22px] bg-success"
                }`}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 bg-card border-r border-border lg:hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <img
                    src="/trustx-logo.png"
                    alt="TrustXAi"
                    className="w-8 h-8 object-contain"
                    loading="eager"
                    decoding="async"
                  />
                  <span className="font-bold text-sm">TrustChain AI</span>
                </div>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <nav className="px-3 py-4 space-y-1">
                {visibleNavItems.map((item) => {
                  const isActive = isNavActive(item.path, item.activePrefix);
                  return (
                    <Link
                      key={item.path}
                      to={navTarget(item.path)}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-border glass-strong">
          <button
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-secondary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">
              System Active • {demoMode ? "DEMO" : "LIVE"} • 312 nodes online
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium">{user?.institution || "Unknown"}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user?.role || "User"} Access</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {user?.avatar || "??"}
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
