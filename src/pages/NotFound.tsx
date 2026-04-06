import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Compass, Route, ArrowLeft } from "lucide-react";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

const NotFound = () => {
  const location = useLocation();

  const routeDepth = useMemo(
    () => location.pathname.split("/").filter(Boolean).length,
    [location.pathname],
  );

  const routeConfidence = useMemo(
    () => Math.max(25, 100 - routeDepth * 18),
    [routeDepth],
  );

  const pathFingerprint = useMemo(() => {
    if (location.pathname.length <= 26) {
      return location.pathname || "/";
    }
    return `${location.pathname.slice(0, 23)}...`;
  }, [location.pathname]);

  const routeTrend = useMemo(
    () => [
      { label: "R1", value: 92 },
      { label: "R2", value: 86 },
      { label: "R3", value: 81 },
      { label: "R4", value: 76 },
      { label: "R5", value: routeConfidence },
    ],
    [routeConfidence],
  );

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-6 py-16">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-1/2 left-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mx-auto flex min-h-[80vh] max-w-5xl items-center">
        <div className="w-full space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="glass-strong rounded-2xl border border-primary/15 p-8"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              Route Not Found
            </div>
            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              404 <span className="text-gradient-primary">Navigation Drift</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              The requested route is outside the active TrustXAi graph. Use the monitored recovery links
              below to return to secured investigation surfaces.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <VisualMetricStrip
              title="Route Recovery Telemetry"
              subtitle="Live diagnostics for unresolved navigation paths"
              variant="recovery"
              chartPlacement="left"
              metrics={[
                {
                  label: "Path Depth",
                  value: `${routeDepth}`,
                  hint: "segments in invalid route",
                  icon: Route,
                  tone: "warning",
                },
                {
                  label: "Confidence",
                  value: `${routeConfidence}%`,
                  hint: "automatic route certainty",
                  icon: Compass,
                  tone: routeConfidence < 60 ? "destructive" : "primary",
                },
                {
                  label: "Recovery Nodes",
                  value: "3",
                  hint: "safe return destinations",
                  icon: AlertTriangle,
                  tone: "accent",
                },
                {
                  label: "Path Fingerprint",
                  value: pathFingerprint,
                  hint: "captured request signature",
                  icon: Route,
                  tone: "primary",
                },
              ]}
              chartData={routeTrend}
              chartLabel="Route Confidence"
              chartColor="hsl(48, 96%, 53%)"
              badges={[
                "Status: ORPHAN ROUTE",
                "Monitor: ACTIVE",
                "Action: REDIRECT RECOMMENDED",
              ]}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:brightness-110"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Landing
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-secondary"
            >
              Go to Secure Login
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
