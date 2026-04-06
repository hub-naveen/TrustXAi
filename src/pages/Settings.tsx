import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell, Key, Palette, Copy, Eye, EyeOff, Plus, Trash2, Check, RefreshCw,
} from "lucide-react";
import SectionReveal from "@/components/shared/SectionReveal";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import VisualMetricStrip from "@/components/shared/VisualMetricStrip";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
}

const initialKeys: ApiKey[] = [
  { id: "1", name: "Production API", key: "tc_live_9f2a4b7c3d8e1f0a", created: "2024-02-10", lastUsed: "2024-03-15" },
  { id: "2", name: "Staging API", key: "tc_test_3e1d7c2f8a9b4e5d", created: "2024-01-22", lastUsed: "2024-03-14" },
];

const accentOptions = [
  { name: "Gold", value: "48 96% 53%", class: "bg-primary" },
  { name: "Cyan", value: "210 100% 60%", class: "bg-accent" },
  { name: "Emerald", value: "142 72% 45%", class: "bg-success" },
  { name: "Rose", value: "0 72% 51%", class: "bg-destructive" },
];

export default function Settings() {
  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    highAlerts: true,
    mediumAlerts: false,
    modelUpdates: true,
    weeklyReport: true,
    emailDigest: false,
    slackIntegration: true,
    smsAlerts: false,
  });

  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialKeys);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedAccent, setSelectedAccent] = useState(0);

  const enabledNotifications = Object.values(notifications).filter(Boolean).length;
  const securityCoverage = Math.round((enabledNotifications / Object.keys(notifications).length) * 100);
  const visibleKeyCount = revealedKeys.size;
  const activeKeyCount = apiKeys.length;
  const recentlyUsedKeyCount = apiKeys.filter((key) => key.lastUsed !== "Never").length;

  const settingsPulse = [
    { label: "N1", value: enabledNotifications },
    { label: "N2", value: activeKeyCount + 2 },
    { label: "N3", value: securityCoverage / 10 },
    { label: "N4", value: recentlyUsedKeyCount + 1 },
    { label: "N5", value: enabledNotifications - 1 },
    { label: "N6", value: activeKeyCount + 3 },
    { label: "N7", value: securityCoverage / 10 + 1 },
    { label: "N8", value: enabledNotifications },
  ];

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success("Notification preference updated");
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const generateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `tc_live_${Math.random().toString(36).slice(2, 18)}`,
      created: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
    };
    setApiKeys((prev) => [...prev, newKey]);
    setNewKeyName("");
    toast.success("New API key generated");
  };

  const revokeKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success("API key revoked");
  };

  const notifItems: { key: keyof typeof notifications; label: string; desc: string }[] = [
    { key: "criticalAlerts", label: "Critical Alerts", desc: "Immediate notification for critical severity fraud" },
    { key: "highAlerts", label: "High Severity Alerts", desc: "Alerts for high risk score transactions" },
    { key: "mediumAlerts", label: "Medium Alerts", desc: "Notifications for medium risk activities" },
    { key: "modelUpdates", label: "Model Updates", desc: "Federated learning model merge notifications" },
    { key: "weeklyReport", label: "Weekly Report", desc: "Automated weekly fraud intelligence summary" },
    { key: "emailDigest", label: "Email Digest", desc: "Daily email summary of all activity" },
    { key: "slackIntegration", label: "Slack Integration", desc: "Push alerts to connected Slack channel" },
    { key: "smsAlerts", label: "SMS Alerts", desc: "Critical alerts via SMS (carrier charges apply)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage notifications, API keys, and appearance</p>
      </div>

      <SectionReveal>
        <VisualMetricStrip
          title="Configuration Health"
          subtitle="Operational settings posture across alerting, API controls, and interface security"
          variant="settings"
          chartPlacement="left"
          metrics={[
            {
              label: "Alerts Enabled",
              value: `${enabledNotifications}/${Object.keys(notifications).length}`,
              hint: "notification channels active",
              icon: Bell,
              tone: "primary",
            },
            {
              label: "Security Coverage",
              value: `${securityCoverage}%`,
              hint: "based on enabled controls",
              icon: Check,
              tone: securityCoverage >= 75 ? "success" : "warning",
            },
            {
              label: "API Keys Active",
              value: `${activeKeyCount}`,
              hint: "current API credentials",
              icon: Key,
              tone: activeKeyCount > 3 ? "warning" : "accent",
            },
            {
              label: "Exposed In UI",
              value: `${visibleKeyCount}`,
              hint: "currently revealed keys",
              icon: Eye,
              tone: visibleKeyCount > 0 ? "destructive" : "success",
            },
            {
              label: "Recent Usage",
              value: `${recentlyUsedKeyCount}`,
              hint: "keys used recently",
              icon: RefreshCw,
              tone: "primary",
            },
          ]}
          chartData={settingsPulse}
          chartLabel="Config Activity"
          chartColor="hsl(142, 72%, 45%)"
          badges={[
            `Accent: ${accentOptions[selectedAccent]?.name ?? "Gold"}`,
            "Auth Guard: ENABLED",
            "Session Controls: ACTIVE",
          ]}
        />
      </SectionReveal>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <SectionReveal>
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Notification Preferences</h3>
            </div>
            <div className="space-y-3">
              {notifItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={() => toggleNotification(item.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>

        {/* API Keys */}
        <SectionReveal delay={0.1}>
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">API Key Management</h3>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Key name (e.g. Production)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="text-xs h-9 bg-secondary/50 border-border"
              />
              <Button size="sm" onClick={generateKey} className="shrink-0 gap-1.5 h-9">
                <Plus className="w-3.5 h-3.5" /> Generate
              </Button>
            </div>

            <div className="space-y-2">
              {apiKeys.map((apiKey) => (
                <motion.div
                  key={apiKey.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3 rounded-lg bg-secondary/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{apiKey.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleReveal(apiKey.id)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                        {revealedKeys.has(apiKey.id) ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                      <button onClick={() => copyKey(apiKey.key)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => revokeKey(apiKey.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {revealedKeys.has(apiKey.id) ? apiKey.key : "••••••••••••••••••"}
                  </p>
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span>Created: {apiKey.created}</span>
                    <span>Last used: {apiKey.lastUsed}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-3 rounded-lg border border-dashed border-border text-center">
              <p className="text-[10px] text-muted-foreground">
                API keys grant full access to the TrustChain AI API. Keep them secure.
              </p>
            </div>
          </div>
        </SectionReveal>

        {/* Theme */}
        <SectionReveal delay={0.15}>
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Theme Customization</h3>
            </div>

            <div>
              <p className="text-xs font-medium mb-3">Accent Color</p>
              <div className="flex gap-3">
                {accentOptions.map((opt, i) => (
                  <button
                    key={opt.name}
                    onClick={() => {
                      setSelectedAccent(i);
                      toast.success(`Accent set to ${opt.name}`);
                    }}
                    className={`relative w-10 h-10 rounded-lg ${opt.class} transition-all ${
                      selectedAccent === i ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110" : "hover:scale-105"
                    }`}
                  >
                    {selectedAccent === i && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-background" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-xs font-medium">Glassmorphism Effects</p>
                  <p className="text-[10px] text-muted-foreground">Translucent glass-style cards</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-xs font-medium">Animations</p>
                  <p className="text-[10px] text-muted-foreground">Enable motion and transitions</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-xs font-medium">Compact Mode</p>
                  <p className="text-[10px] text-muted-foreground">Reduce spacing for more data density</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-xs font-medium">High Contrast</p>
                  <p className="text-[10px] text-muted-foreground">Increase text and border contrast</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </SectionReveal>

        {/* System Info */}
        <SectionReveal delay={0.2}>
          <div className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">System Information</h3>
            </div>
            <div className="space-y-2">
              {[
                ["Platform Version", "2.0.4-beta"],
                ["AI Engine", "TrustChain Neural v3.2.1"],
                ["Blockchain Network", "Ethereum L2 (Optimism)"],
                ["Federated Model", "FedAvg v3.2.1 (97.8% accuracy)"],
                ["API Version", "v2.1.0"],
                ["Last System Update", "2024-03-15 14:00 UTC"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50">
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                  <span className="text-[11px] font-mono font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>
      </div>
    </div>
  );
}
