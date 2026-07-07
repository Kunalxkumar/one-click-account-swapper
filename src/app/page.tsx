"use client";

import React, { useEffect, useState } from "react";
import { 
  Lock, 
  Unlock, 
  Search, 
  Plus, 
  Settings as SettingsIcon,
  Grid,
  Pin,
  FolderHeart,
  Key,
  Database,
  ArrowRight,
  Sparkles,
  Menu,
  X,
  Compass,
  FileJson,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, Account } from "@/lib/store";
import { Sidebar } from "@/components/sidebar";
import { ProfileCard } from "@/components/profile-card";
import { adapters, getAdapterForUrl } from "@/adapters";
import { cn } from "@/lib/utils";

export default function Page() {
  const [mounted, setMounted] = useState(false);

  // Hydration guard
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return <DashboardContainer />;
}

function DashboardContainer() {
  const {
    isUnlocked,
    hasMasterPassword,
    activeView,
    init,
    setupPassword,
    unlock,
    accounts,
    currentTabUrl,
    selectedCategory,
    searchQuery
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);

  // Initialize store and active tab on mount
  useEffect(() => {
    init().then(() => {
      setIsLoading(false);
    });
  }, [init]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Securing Session Store...</p>
        </div>
      </div>
    );
  }

  // Views routers
  if (!hasMasterPassword) {
    return <SetupPasswordView onSetup={setupPassword} />;
  }

  if (!isUnlocked) {
    return <UnlockView onUnlock={unlock} />;
  }

  return <MainView />;
}

/* ============================================================================
   VIEW 1: Setup Master Password
   ============================================================================ */
interface SetupPasswordViewProps {
  onSetup: (pass: string) => Promise<void>;
}
function SetupPasswordView({ onSetup }: SetupPasswordViewProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      await onSetup(password);
    } catch (err) {
      setError("Failed to create master key.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-animate flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm glass rounded-2xl p-6 shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Key className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Create Master Password</h2>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            This password encrypts all saved cookie & storage session tokens. It is stored only in RAM and never saved to disk or network.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 relative">
            <label className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 bg-slate-950/60 border border-white/5 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Confirm Password
            </label>
            <input
              type={showPass ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-3 py-2 bg-slate-950/60 border border-white/5 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] flex items-center gap-1.5 animate-shake">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white py-2 rounded-lg text-xs font-semibold select-none cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-500/20"
          >
            {pending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Secure Wallet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

/* ============================================================================
   VIEW 2: Unlock Gate
   ============================================================================ */
interface UnlockViewProps {
  onUnlock: (pass: string) => Promise<boolean>;
}
function UnlockView({ onUnlock }: UnlockViewProps) {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPending(true);

    const success = await onUnlock(password);
    if (!success) {
      setError("Incorrect password. Please try again.");
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-animate flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm glass rounded-2xl p-6 shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Lock className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Swapper Locked</h2>
          <p className="text-[11px] text-slate-400">
            Enter your master password to decrypt saved sessions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 relative">
            <label className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter master password"
                className="w-full px-3 py-2 bg-slate-950/60 border border-white/5 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] flex items-center gap-1.5 animate-shake">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white py-2 rounded-lg text-xs font-semibold select-none cursor-pointer transition-all hover:shadow-lg hover:shadow-indigo-500/20"
          >
            {pending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Unlock Wallet</span>
                <Unlock className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

/* ============================================================================
   VIEW 3: Main Dashboard layout
   ============================================================================ */
function MainView() {
  const {
    activeView,
    selectedCategory,
    searchQuery,
    accounts,
    currentTabUrl,
    currentTabId,
    addAccount
  } = useStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPopupView, setIsPopupView] = useState(true);

  // Manage popup dimensions & responsive detection
  useEffect(() => {
    const handleResize = () => {
      // Chrome extension popup has narrow viewport (e.g. < 450px)
      setIsPopupView(window.innerWidth < 500);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    // 1. Search Query Fuzzy matching
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      acc.name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.websiteName.toLowerCase().includes(q) ||
      acc.websiteDomain.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // 2. Category matching
    if (selectedCategory === "all") return true;
    if (selectedCategory === "pinned") return acc.isPinned;
    if (selectedCategory === "favorites") return acc.isFavorite;
    
    // Website filter
    return acc.websiteId === selectedCategory;
  });

  // Check if active tab is a matching website
  const matchingAdapter = currentTabUrl ? getAdapterForUrl(currentTabUrl) : null;

  return (
    <div className={cn(
      "flex bg-slate-950 text-slate-100 overflow-hidden",
      isPopupView ? "w-[380px] h-[600px]" : "w-screen h-screen"
    )}>
      {/* Sidebar navigation */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isResponsive={isPopupView} 
      />

      {/* Main Body content */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-950 relative">
        {/* Top Header */}
        <header className="flex items-center justify-between p-3 border-b border-white/5 bg-slate-900/10 backdrop-blur-sm select-none">
          <div className="flex items-center gap-2">
            {isPopupView && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              {activeView === "settings" ? "Settings" : "Accounts Dashboard"}
            </h2>
          </div>

          <div className="text-[10px] text-slate-500 font-medium">
            Active Profiles: {accounts.length}
          </div>
        </header>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeView === "settings" ? (
            <SettingsView />
          ) : (
            <>
              {/* Active Site Helper / Quick capture */}
              {matchingAdapter ? (
                <CapturePanel adapter={matchingAdapter} />
              ) : (
                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/20 backdrop-blur-md flex items-start gap-2.5">
                  <Compass className="w-4 h-4 text-slate-500 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] font-semibold text-slate-400">
                      No active website detected
                    </h4>
                    <p className="text-[9px] text-slate-500 leading-relaxed">
                      Visit Claude, ChatGPT, Gemini, Gmail, or Github in your browser to capture its authenticated session.
                    </p>
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => useStore.setState({ searchQuery: e.target.value })}
                  placeholder="Search profiles, emails, websites..."
                  className="w-full pl-8 pr-4 py-1.5 bg-slate-900/40 border border-white/5 rounded-lg text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Profile grid */}
              <div className="grid grid-cols-1 gap-3 pb-6">
                <AnimatePresence mode="popLayout">
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map((acc) => (
                      <ProfileCard
                        key={acc.id}
                        account={acc}
                        isActiveTabMatching={currentTabUrl ? (
                          currentTabUrl.includes(acc.websiteDomain) || acc.websiteDomain.includes(new URL(currentTabUrl).hostname)
                        ) : false}
                      />
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 space-y-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center mx-auto">
                        <Grid className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-slate-400">
                          {accounts.length === 0 ? "No accounts added" : "No results found"}
                        </h4>
                        <p className="text-[10px] text-slate-600 max-w-[240px] mx-auto">
                          {accounts.length === 0
                            ? "Log into your accounts on supported sites, then capture them in the Swapper popup."
                            : "Try adjusting your search filters or check your categories."}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   VIEW 3B: Session Capture Panel
   ============================================================================ */
function CapturePanel({ adapter }: { adapter: any }) {
  const { currentTabId, addAccount } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("indigo");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const colors = ["indigo", "violet", "emerald", "amber", "rose", "cyan", "fuchsia"];

  // Pre-fill email dynamically if possible
  useEffect(() => {
    if (!isOpen) return;
    // Attempt login detection / check if user exists. We query basic profile elements
    // For now, prompt the user to input the email and label.
    setLabel("");
    setEmail("");
    setStatus("idle");
  }, [isOpen]);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTabId) return;

    setLoading(true);
    try {
      // 1. Run capture through matching adapter
      const sessionData = await adapter.capture(currentTabId);
      
      // Validate that session actually contains cookies
      if (!sessionData.cookies || sessionData.cookies.length === 0) {
        throw new Error("No active cookies captured. Are you signed in?");
      }

      // 2. Encrypt & Save to Store
      await addAccount({
        name: label || `${adapter.name} User`,
        email: email || "unknown@session",
        websiteId: adapter.id,
        websiteDomain: adapter.domain,
        websiteName: adapter.name,
        websiteIcon: adapter.icon,
        color,
        isPinned: false,
        isFavorite: false,
      }, sessionData);

      setStatus("success");
      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-950/15 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <div className="space-y-0.5">
            <h4 className="text-[11px] font-bold text-indigo-300">
              Active: {adapter.name}
            </h4>
            <p className="text-[9px] text-slate-400">
              You are on a supported website page.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors select-none active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Capture Profile</span>
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-indigo-500/25 bg-slate-900/40 backdrop-blur-md space-y-3 relative overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h4 className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          Save {adapter.name} Session
        </h4>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-md hover:bg-white/5 text-slate-500 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {status === "success" ? (
        <div className="py-6 text-center space-y-2">
          <CheckCircle className="w-8 h-8 text-emerald-400 animate-bounce mx-auto" />
          <h4 className="text-xs font-semibold text-white">Session Captured!</h4>
          <p className="text-[10px] text-slate-400">Profile encrypted and saved securely.</p>
        </div>
      ) : (
        <form onSubmit={handleCapture} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">
              Profile Label
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Work, Personal, Shared"
              className="w-full px-2 py-1.5 bg-slate-950 border border-white/10 rounded-md text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">
              Email / Identifier
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@workmail.com"
              className="w-full px-2 py-1.5 bg-slate-950 border border-white/10 rounded-md text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider block">
              Color Theme
            </label>
            <div className="flex gap-1.5 pt-0.5">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-4 h-4 rounded-full border border-white/10 transition-transform",
                    c === "indigo" && "bg-indigo-500",
                    c === "violet" && "bg-violet-500",
                    c === "emerald" && "bg-emerald-500",
                    c === "amber" && "bg-amber-500",
                    c === "rose" && "bg-rose-500",
                    c === "cyan" && "bg-cyan-500",
                    c === "fuchsia" && "bg-fuchsia-500",
                    color === c && "scale-125 ring-2 ring-white"
                  )}
                />
              ))}
            </div>
          </div>

          {status === "error" && (
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Failed to capture active session. Make sure you are logged in.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white text-xs py-2 rounded-lg font-semibold transition-colors shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Encrypt & Save Session</span>
              </>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}

/* ============================================================================
   VIEW 4: Settings (Backups, Encryption management)
   ============================================================================ */
function SettingsView() {
  const { exportBackup, importBackup, lock } = useStore();
  const [backupPassword, setBackupPassword] = useState("");
  const [backupStr, setBackupStr] = useState("");
  const [exportedResult, setExportedResult] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setStatus("idle");

    if (backupPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    try {
      const result = await exportBackup(backupPassword);
      setExportedResult(result);
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Export failed.");
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setStatus("idle");

    if (!backupStr.trim()) {
      setErrorMsg("Please paste the backup string.");
      return;
    }

    try {
      const success = await importBackup(backupStr, backupPassword);
      if (success) {
        setStatus("success");
        setBackupStr("");
        setBackupPassword("");
      } else {
        setStatus("error");
        setErrorMsg("Import failed. Check password or backup string integrity.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Decryption failed. Incorrect backup password.");
    }
  };

  return (
    <div className="space-y-4 pb-8 select-none text-slate-300">
      {/* Encryption Details */}
      <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/10 space-y-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Key className="w-4 h-4 text-indigo-400" />
          Security Architecture
        </h3>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Your credentials and cookies are encrypted with <strong className="text-indigo-400">AES-GCM-256</strong>. 
          The cryptographic key is derived at runtime using <strong className="text-indigo-400">PBKDF2</strong> with 100,000 iterations.
        </p>
      </div>

      {/* Backup Section */}
      <div className="p-4 rounded-xl border border-white/5 bg-slate-900/10 space-y-4">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <FileJson className="w-4 h-4 text-indigo-400" />
          Encrypted Backups
        </h3>
        
        <div className="space-y-3">
          {/* Password fields */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">
              Backup Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder="Enter password for export/import"
                className="w-full px-3 py-1.5 bg-slate-950/60 border border-white/5 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {status === "success" && (
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Operation succeeded!</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold py-2 rounded-lg cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate Backup</span>
            </button>
          </div>
        </div>

        {/* Export Results */}
        {exportedResult && (
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">
              Backup Payload (Copy and save safely)
            </label>
            <textarea
              readOnly
              value={exportedResult}
              onClick={(e) => (e.target as any).select()}
              className="w-full h-16 px-2 py-1 bg-slate-950 border border-white/5 rounded-md text-[9px] font-mono text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none select-all"
            />
          </div>
        )}

        {/* Import Area */}
        <form onSubmit={handleImport} className="space-y-2 border-t border-white/5 pt-3">
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider block">
              Restore from Backup
            </label>
            <textarea
              required
              value={backupStr}
              onChange={(e) => setBackupStr(e.target.value)}
              placeholder="Paste encrypted backup string here..."
              className="w-full h-16 px-2 py-1 bg-slate-950 border border-white/5 rounded-md text-[9px] font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded-lg cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import & Decrypt Backup</span>
          </button>
        </form>
      </div>

      {/* Lock panel button */}
      <button
        onClick={lock}
        className="w-full py-2 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
      >
        Lock Session Database
      </button>
    </div>
  );
}
