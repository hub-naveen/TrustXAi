import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Building2, ShieldCheck, Loader2, Radar, Activity } from "lucide-react";
import { getDashboardRouteForRole, useAuth } from "@/contexts/AuthContext";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const DEMO_ACCOUNTS = [
  { email: "admin@rbi.gov.in", role: "Admin", institution: "RBI CFMC" },
  { email: "analyst@sbi.co.in", role: "Analyst", institution: "State Bank of India" },
  { email: "viewer@hdfc.com", role: "Viewer", institution: "HDFC Bank" },
];

const authPulseTrend = [
  { label: "T1", value: 84 },
  { label: "T2", value: 87 },
  { label: "T3", value: 89 },
  { label: "T4", value: 92 },
  { label: "T5", value: 94 },
  { label: "T6", value: 96 },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success && result.user) navigate(getDashboardRouteForRole(result.user.role));
    else if (result.success) navigate("/dashboard");
    else setError(result.error || "Login failed");
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("demo1234");
    setError("");
    setLoading(true);
    const result = await login(demoEmail, "demo1234");
    setLoading(false);
    if (result.success && result.user) navigate(getDashboardRouteForRole(result.user.role));
    else if (result.success) navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />

        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/trustx-logo.png"
              alt="TrustXAi"
              className="w-10 h-10 object-contain"
              loading="eager"
              decoding="async"
            />
            <div>
              <span className="font-bold text-lg tracking-tight">TrustChain AI</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">2.0</span>
            </div>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <h1 className="text-4xl font-black tracking-tight leading-tight">
            Financial Immunity
            <br />
            <span className="text-gradient-primary">Starts Here</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-md leading-relaxed">
            Access the most advanced AI-powered fraud detection network.
            Privacy-preserving intelligence across 312 institutional nodes.
          </p>

          <div className="mt-10 flex gap-6">
            {[
              { value: "99.7%", label: "Accuracy" },
              { value: "312", label: "Nodes" },
              { value: "<200ms", label: "Response" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-black font-mono">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-2xl">
            <VisualMetricStrip
              title="Identity Access Telemetry"
              subtitle="Real-time authentication assurance across connected institutions"
              variant="auth"
              chartPlacement="right"
              metrics={[
                {
                  label: "MFA Coverage",
                  value: "98.6%",
                  hint: "institution accounts with MFA",
                  icon: ShieldCheck,
                  tone: "success",
                },
                {
                  label: "Auth Latency",
                  value: "148ms",
                  hint: "median sign-in validation",
                  icon: Activity,
                  tone: "primary",
                },
                {
                  label: "Node Reach",
                  value: "312",
                  hint: "live institution endpoints",
                  icon: Building2,
                  tone: "accent",
                },
                {
                  label: "Threat Blocks",
                  value: "27/day",
                  hint: "credential abuse prevented",
                  icon: Radar,
                  tone: "warning",
                },
              ]}
              chartData={authPulseTrend}
              chartLabel="Access Confidence"
              chartColor="hsl(48, 96%, 53%)"
              badges={[
                "State: SECURE SIGN-IN",
                "Policy: RBI COMPLIANT",
                "Demo: SANDBOX ACCOUNTS",
              ]}
            />
          </div>
        </motion.div>

        <div className="relative text-xs text-muted-foreground">
          Kaasu Kaval AI Chain • Enterprise Fintech Intelligence
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 lg:max-w-xl flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img
              src="/trustx-logo.png"
              alt="TrustXAi"
              className="w-9 h-9 object-contain"
              loading="eager"
              decoding="async"
            />
            <span className="font-bold tracking-tight">TrustChain AI</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1">Access your institutional node</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Institutional Email
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.com"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-10 rounded-lg bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 glow-primary"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Demo Accounts</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => quickLogin(acc.email)}
                  disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/50 border border-border hover:border-primary/20 hover:bg-secondary transition-all text-left group disabled:opacity-50"
                >
                  <div>
                    <p className="text-xs font-medium">{acc.institution}</p>
                    <p className="text-[10px] text-muted-foreground">{acc.email}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
