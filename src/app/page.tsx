"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Shield,
  ShieldCheck,
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
  HelpCircle,
  Globe,
  Trash2,
  Cpu
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
      <div className="min-h-screen bg-[#090b10] flex items-center justify-center font-mono">
        <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
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
      <div className="min-h-screen bg-[#090b10] flex items-center justify-center font-mono p-4">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
          </div>
          <p className="text-[11px] text-slate-400 uppercase tracking-widest">
            Securing Session Store...
          </p>
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

  // Password strength calculation
  const strength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s += 1;
    if (password.length >= 12) s += 1;
    if (/[0-9]/.test(password)) s += 1;
    if (/[^A-Za-z0-9]/.test(password)) s += 1;
    return s;
  }, [password]);

  const strengthLabels = ["WEAK", "FAIR", "GOOD", "STRONG"];
  const strengthColor = strength <= 1 ? "bg-rose-500" : strength === 2 ? "bg-amber-500" : "bg-emerald-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Master password requires at least 8 characters.");
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
      setError("Failed to initialize cryptographic master key.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090b10] flex items-center justify-center p-4 font-sans antialiased text-slate-100">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0d1017] p-6 shadow-2xl space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Create Master Key</h2>
              <span className="text-[10px] font-mono text-amber-500/90 font-medium">AES-256-GCM / PBKDF2-100K</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Encrypts all cookie jars and local storage sessions. Kept in memory only and never written to disk or sent over network.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 bg-[#090b10] border border-white/10 rounded-lg text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
              />
              <button
                type="button"
                aria-label={showPass ? "Hide password" : "Show password"}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength micro-meter */}
            {password.length > 0 && (
              <div className="pt-1.5 space-y-1">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={cn(
                        "flex-1 rounded-sm transition-colors duration-200",
                        step <= strength ? strengthColor : "bg-white/10"
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>STRENGTH:</span>
                  <span className="font-semibold text-slate-300">{strengthLabels[Math.max(0, strength - 1)]}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Confirm Master Password
            </label>
            <input
              type={showPass ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-3 py-2 bg-[#090b10] border border-white/10 rounded-lg text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer shadow-sm shadow-amber-500/20"
          >
            {pending ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <>
                <span>Initialize Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
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
      setError("Authentication failed. Incorrect master password.");
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090b10] flex items-center justify-center p-4 font-sans antialiased text-slate-100">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0d1017] p-6 shadow-2xl space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Vault Locked</h2>
              <span className="text-[10px] font-mono text-slate-500">ENCRYPTED AT REST</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Enter your master password to decrypt credentials into isolated runtime memory.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 bg-[#090b10] border border-white/10 rounded-lg text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
              />
              <button
                type="button"
                aria-label={showPass ? "Hide password" : "Show password"}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer shadow-sm shadow-amber-500/20"
          >
            {pending ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <>
                <span>Unlock Vault</span>
                <Unlock className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
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
    addAccount,
    swappingAccount
  } = useStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPopupView, setIsPopupView] = useState(true);

  // Inspector Dialog states
  const [inspectedAccount, setInspectedAccount] = useState<Account | null>(null);
  const [inspectedSession, setInspectedSession] = useState<any>(null);
  const [showMaskedValues, setShowMaskedValues] = useState(false);
  const [inspectError, setInspectError] = useState("");
  const [activeInspectorTab, setActiveInspectorTab] = useState<"cookies" | "storage">("cookies");

  const handleInspect = async (account: Account) => {
    setInspectedAccount(account);
    setInspectedSession(null);
    setInspectError("");
    setShowMaskedValues(false);
    setActiveInspectorTab("cookies");
    
    const password = useStore.getState().masterPassword;
    if (!password) {
      setInspectError("Database locked.");
      return;
    }
    
    try {
      const { decryptData } = await import("@/lib/crypto");
      const decrypted = await decryptData(account.encryptedSession, password);
      const session = JSON.parse(decrypted);
      setInspectedSession(session);
    } catch (err) {
      setInspectError("Failed to decrypt session details.");
    }
  };

  // Manage popup dimensions & responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsPopupView(window.innerWidth < 500);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      acc.name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.websiteName.toLowerCase().includes(q) ||
      acc.websiteDomain.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedCategory === "all") return true;
    if (selectedCategory === "pinned") return acc.isPinned;
    if (selectedCategory === "favorites") return acc.isFavorite;
    
    return acc.websiteId === selectedCategory;
  });

  // Check if active tab is a matching website
  const matchingAdapter = currentTabUrl ? getAdapterForUrl(currentTabUrl) : null;

  return (
    <div className={cn(
      "flex bg-[#090b10] text-slate-100 overflow-hidden font-sans antialiased",
      isPopupView ? "w-[380px] h-[600px]" : "w-screen h-screen"
    )}>
      {/* Sidebar navigation */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isResponsive={isPopupView} 
      />

      {/* Main Body content */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-[#090b10] relative">
        {/* Top Header */}
        <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-[#0d1017]/80 backdrop-blur-md select-none">
          <div className="flex items-center gap-2">
            {isPopupView && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Open sidebar menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-mono font-bold text-xs uppercase tracking-wider text-slate-300">
              {activeView === "settings" ? "Settings" : "Vault Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{accounts.length} PROFILES</span>
          </div>
        </header>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {activeView === "settings" ? (
            <SettingsView />
          ) : (
            <>
              {/* Active Site Helper / Quick capture */}
              {matchingAdapter ? (
                <CapturePanel adapter={matchingAdapter} />
              ) : (
                <div className="p-3 rounded-lg border border-white/5 bg-[#0d1017] flex items-start gap-2.5">
                  <Compass className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] font-semibold text-slate-300">
                      No active website detected
                    </h4>
                    <p className="text-[9px] text-slate-500 leading-relaxed font-mono">
                      Navigate to GitHub, Claude, ChatGPT, Gemini, or Gmail in your browser to capture sessions.
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
                  placeholder="Filter profiles, emails, domains..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0d1017] border border-white/10 rounded-md text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
                />
              </div>

              {/* Profile grid */}
              <div className="grid grid-cols-1 gap-2.5 pb-6">
                <AnimatePresence mode="popLayout">
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map((acc) => (
                      <ProfileCard
                        key={acc.id}
                        account={acc}
                        isActiveTabMatching={currentTabUrl ? (
                          currentTabUrl.includes(acc.websiteDomain) || acc.websiteDomain.includes(new URL(currentTabUrl).hostname)
                        ) : false}
                        onInspect={() => handleInspect(acc)}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 space-y-2 border border-dashed border-white/10 rounded-lg bg-[#0d1017]/40">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                        <Grid className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-slate-300">
                          {accounts.length === 0 ? "No profiles in vault" : "No matching profiles"}
                        </h4>
                        <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto font-mono">
                          {accounts.length === 0
                            ? "Log into a supported site, open this popup, and capture the active session."
                            : "Adjust search keywords or select 'All Profiles'."}
                        </p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Swapping Overlay animation */}
      <AnimatePresence>
        {swappingAccount && (
          <div className="fixed inset-0 z-50 bg-[#090b10]/95 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 select-none">
            <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center">
              <Cpu className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-white">
                Swapping Session
              </h3>
              <p className="text-[10px] font-mono text-slate-400">
                Injecting cookie jar for {swappingAccount.name}...
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Session Inspector Modal */}
      <AnimatePresence>
        {inspectedAccount && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none">
            <div className="w-full max-w-sm max-h-[82vh] bg-[#0d1017] border border-white/10 rounded-lg flex flex-col overflow-hidden shadow-2xl text-slate-300">
              {/* Header */}
              <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-[#11141c]">
                <div>
                  <h3 className="font-mono font-bold text-xs text-white uppercase tracking-wider">Session Inspector</h3>
                  <p className="text-[9px] font-mono text-slate-400">
                    {inspectedAccount.name} • {inspectedAccount.websiteName}
                  </p>
                </div>
                <button
                  onClick={() => setInspectedAccount(null)}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10 px-2 bg-[#090b10]">
                <button
                  onClick={() => setActiveInspectorTab("cookies")}
                  className={cn(
                    "px-3 py-2 text-[10px] font-mono uppercase font-bold tracking-wider border-b-2 transition-colors cursor-pointer",
                    activeInspectorTab === "cookies"
                      ? "border-amber-500 text-amber-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  )}
                >
                  Cookies ({inspectedSession?.cookies?.length || 0})
                </button>
                <button
                  onClick={() => setActiveInspectorTab("storage")}
                  className={cn(
                    "px-3 py-2 text-[10px] font-mono uppercase font-bold tracking-wider border-b-2 transition-colors cursor-pointer",
                    activeInspectorTab === "storage"
                      ? "border-amber-500 text-amber-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  )}
                >
                  Storage ({Object.keys(inspectedSession?.localStorage || {}).length + Object.keys(inspectedSession?.sessionStorage || {}).length})
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-3 bg-[#090b10]">
                {inspectError ? (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-center gap-2 text-rose-300 font-mono text-[10px]">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{inspectError}</span>
                  </div>
                ) : !inspectedSession ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                    <p className="text-[10px] font-mono text-slate-500">Decrypting session payload...</p>
                  </div>
                ) : activeInspectorTab === "cookies" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                        Cookies List
                      </p>
                      <button
                        onClick={() => setShowMaskedValues(!showMaskedValues)}
                        className="text-[9px] font-mono text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                      >
                        {showMaskedValues ? "Hide values" : "Show values"}
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[35vh] overflow-y-auto pr-1">
                      {inspectedSession.cookies.map((cookie: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-[#0d1017] border border-white/5 space-y-1 font-mono text-[9px]">
                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-200">
                            <span className="truncate max-w-[160px] text-amber-300">{cookie.name}</span>
                            <span className="text-[7px] px-1 py-0.2 rounded bg-white/5 text-slate-400">
                              {cookie.expirationDate ? "Exp" : "Session"}
                            </span>
                          </div>
                          <div className="text-slate-400 truncate">
                            Value: <span className="text-slate-300">{showMaskedValues ? cookie.value : "••••••••••••••••"}</span>
                          </div>
                          <div className="text-[8px] text-slate-500 flex justify-between">
                            <span>Domain: {cookie.domain}</span>
                            <span>Secure: {cookie.secure ? "Y" : "N"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                        Key Value Storage
                      </p>
                      <button
                        onClick={() => setShowMaskedValues(!showMaskedValues)}
                        className="text-[9px] font-mono text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                      >
                        {showMaskedValues ? "Hide values" : "Show values"}
                      </button>
                    </div>

                    {Object.keys(inspectedSession.localStorage).length === 0 &&
                     Object.keys(inspectedSession.sessionStorage).length === 0 ? (
                      <p className="text-center font-mono text-[9px] text-slate-500 py-6">
                        No storage variables captured.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-[35vh] overflow-y-auto pr-1">
                        {Object.entries(inspectedSession.localStorage).map(([k, v]: any) => (
                          <div key={k} className="p-2 rounded bg-[#0d1017] border border-white/5 space-y-1 font-mono text-[9px]">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-200">
                              <span className="truncate max-w-[160px] text-emerald-400">{k}</span>
                              <span className="text-[7px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400">local</span>
                            </div>
                            <div className="text-slate-400 break-all max-h-12 overflow-y-auto">
                              {showMaskedValues ? v : "••••••••••••••••"}
                            </div>
                          </div>
                        ))}

                        {Object.entries(inspectedSession.sessionStorage).map(([k, v]: any) => (
                          <div key={k} className="p-2 rounded bg-[#0d1017] border border-white/5 space-y-1 font-mono text-[9px]">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-200">
                              <span className="truncate max-w-[160px] text-cyan-400">{k}</span>
                              <span className="text-[7px] px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-400">session</span>
                            </div>
                            <div className="text-slate-400 break-all max-h-12 overflow-y-auto">
                              {showMaskedValues ? v : "••••••••••••••••"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Close Footer */}
              <div className="p-2.5 border-t border-white/10 bg-[#11141c] flex justify-end">
                <button
                  onClick={() => setInspectedAccount(null)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white rounded text-xs font-mono font-medium cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
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
  const [color, setColor] = useState("amber");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const colors = ["amber", "emerald", "cyan", "blue", "rose", "slate"];

  useEffect(() => {
    if (!isOpen) return;
    setLabel("");
    setEmail("");
    setStatus("idle");
  }, [isOpen]);

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTabId) return;

    setLoading(true);
    try {
      const sessionData = await adapter.capture(currentTabId);
      
      const hasCookies = sessionData.cookies && sessionData.cookies.length > 0;
      const hasStorage =
        (sessionData.localStorage && Object.keys(sessionData.localStorage).length > 0) ||
        (sessionData.sessionStorage && Object.keys(sessionData.sessionStorage).length > 0);

      if (!hasCookies && !hasStorage) {
        throw new Error("No active cookies or storage captured. Are you signed in?");
      }

      await addAccount({
        name: label || `${adapter.name} Profile`,
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
      }, 1200);
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="p-3 rounded-lg border border-amber-500/25 bg-[#121622] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="space-y-0.5">
            <h4 className="text-[11px] font-bold font-mono text-white">
              Target: {adapter.name}
            </h4>
            <p className="text-[9px] font-mono text-slate-400">
              Active session available for capture
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1.5 rounded transition-colors select-none cursor-pointer shadow-sm shadow-amber-500/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Capture</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-lg border border-amber-500/30 bg-[#0f131c] space-y-3">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h4 className="text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          Save {adapter.name} Session
        </h4>
        <button 
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Cancel session capture"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {status === "success" ? (
        <div className="py-4 text-center space-y-1.5 font-mono">
          <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Session Encrypted</h4>
          <p className="text-[10px] text-slate-400">Profile saved to encrypted vault.</p>
        </div>
      ) : (
        <form onSubmit={handleCapture} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
              Profile Label
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Primary, Dev Team, Client"
              className="w-full px-2.5 py-1.5 bg-[#090b10] border border-white/10 rounded-md text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
              Account Identifier
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dev@company.org"
              className="w-full px-2.5 py-1.5 bg-[#090b10] border border-white/10 rounded-md text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-semibold text-slate-400 tracking-wider block">
              Color Tag
            </label>
            <div className="flex gap-1.5 pt-0.5">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-4 h-4 rounded-full border border-white/20 transition-transform cursor-pointer",
                    c === "amber" && "bg-amber-500",
                    c === "emerald" && "bg-emerald-500",
                    c === "cyan" && "bg-cyan-500",
                    c === "blue" && "bg-blue-500",
                    c === "rose" && "bg-rose-500",
                    c === "slate" && "bg-slate-500",
                    color === c && "scale-125 ring-2 ring-white"
                  )}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {status === "error" && (
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[9px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
              <span>Failed to capture session. Ensure you are signed in on {adapter.name}.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-mono font-bold uppercase tracking-wider py-2 rounded transition-colors cursor-pointer shadow-sm shadow-amber-500/20"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Encrypt & Save</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

/* ============================================================================
   VIEW 4: Settings (Backups, Security, Custom Websites)
   ============================================================================ */
function SettingsView() {
  const { exportBackup, importBackup, lock, customSites, addCustomSite, deleteCustomSite } = useStore();
  const [backupPassword, setBackupPassword] = useState("");
  const [backupStr, setBackupStr] = useState("");
  const [exportedResult, setExportedResult] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Custom site form states
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [sitePending, setSitePending] = useState(false);
  const [siteError, setSiteError] = useState("");
  const [siteSuccess, setSiteSuccess] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setStatus("idle");

    if (backupPassword.length < 8) {
      setErrorMsg("Backup password requires at least 8 characters.");
      return;
    }

    try {
      const result = await exportBackup(backupPassword);
      setExportedResult(result);
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Backup export failed.");
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setStatus("idle");

    if (!backupStr.trim()) {
      setErrorMsg("Please paste the encrypted backup string.");
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
        setErrorMsg("Import failed. Verify password or backup payload.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Decryption failed. Incorrect backup password.");
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteError("");
    setSiteSuccess(false);

    if (!siteName.trim() || !siteDomain.trim()) {
      setSiteError("Both site name and domain are required.");
      return;
    }

    let domain = siteDomain.trim().toLowerCase();
    try {
      if (domain.includes("://")) {
        domain = new URL(domain).hostname;
      }
    } catch {
      // ignore
    }

    setSitePending(true);
    const success = await addCustomSite(siteName.trim(), domain);
    setSitePending(false);

    if (success) {
      setSiteSuccess(true);
      setSiteName("");
      setSiteDomain("");
      setTimeout(() => setSiteSuccess(false), 2000);
    } else {
      setSiteError("Host permission rejected or invalid domain.");
    }
  };

  return (
    <div className="space-y-3 pb-8 select-none text-slate-300 font-sans">
      {/* Custom Sites Management */}
      <div className="p-3.5 rounded-lg border border-white/10 bg-[#0d1017] space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          Custom Websites
        </h3>
        
        <form onSubmit={handleAddSite} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
                Site Name
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. My Workspace"
                className="w-full px-2.5 py-1.5 bg-[#090b10] border border-white/10 rounded-md text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
                Domain
              </label>
              <input
                type="text"
                required
                value={siteDomain}
                onChange={(e) => setSiteDomain(e.target.value)}
                placeholder="e.g. workspace.internal"
                className="w-full px-2.5 py-1.5 bg-[#090b10] border border-white/10 rounded-md text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
              />
            </div>
          </div>

          {siteError && (
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[9px] flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{siteError}</span>
            </div>
          )}

          {siteSuccess && (
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[9px] flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Custom domain registered.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sitePending}
            className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-md text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors"
          >
            {sitePending ? "Requesting permission..." : "Register Site Domain"}
          </button>
        </form>

        {customSites.length > 0 && (
          <div className="space-y-1.5 border-t border-white/10 pt-2.5">
            <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Registered Custom Sites
            </p>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {customSites.map((site) => (
                <div key={site.id} className="flex items-center justify-between p-2 rounded bg-[#090b10] border border-white/5 font-mono text-[10px]">
                  <div>
                    <span className="font-semibold text-white">{site.name}</span>
                    <span className="text-[8px] text-slate-500 ml-1.5">({site.domain})</span>
                  </div>
                  <button
                    onClick={() => deleteCustomSite(site.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    aria-label={`Delete custom site ${site.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Security Architecture */}
      <div className="p-3.5 rounded-lg border border-white/10 bg-[#0d1017] space-y-2">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-amber-400" />
          Security Architecture
        </h3>
        <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
          Sessions encrypted using <strong className="text-amber-400">AES-GCM-256</strong> with key derivation via <strong className="text-amber-400">PBKDF2</strong> (100,000 iterations). Master key stays in memory during active browser session.
        </p>
      </div>

      {/* Encrypted Backups */}
      <div className="p-3.5 rounded-lg border border-white/10 bg-[#0d1017] space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
          <FileJson className="w-3.5 h-3.5 text-amber-400" />
          Encrypted Backups
        </h3>
        
        <div className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
              Backup Passphrase
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder="Passphrase for export/import"
                className="w-full px-2.5 py-1.5 bg-[#090b10] border border-white/10 rounded-md text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-colors"
              />
              <button
                type="button"
                aria-label={showPass ? "Hide passphrase" : "Show passphrase"}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-[9px] flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {status === "success" && (
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[9px] flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
              <span>Backup operation completed.</span>
            </div>
          )}

          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-medium py-1.5 rounded-md cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate Encrypted Backup</span>
          </button>
        </div>

        {exportedResult && (
          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
              Backup Payload (Encrypted)
            </label>
            <textarea
              readOnly
              value={exportedResult}
              onClick={(e) => (e.target as any).select()}
              className="w-full h-16 px-2 py-1 bg-[#090b10] border border-white/10 rounded-md text-[9px] font-mono text-slate-300 focus:outline-none focus:border-amber-500/50 resize-none select-all"
            />
          </div>
        )}

        {/* Import Area */}
        <form onSubmit={handleImport} className="space-y-2 border-t border-white/10 pt-2.5">
          <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase font-semibold text-slate-400 tracking-wider block">
              Restore from Backup
            </label>
            <textarea
              required
              value={backupStr}
              onChange={(e) => setBackupStr(e.target.value)}
              placeholder="Paste encrypted payload here..."
              className="w-full h-16 px-2 py-1 bg-[#090b10] border border-white/10 rounded-md text-[9px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold uppercase tracking-wider py-1.5 rounded-md cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
          </button>
        </form>
      </div>

      {/* Lock panel button */}
      <button
        onClick={lock}
        className="w-full py-2 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-mono font-bold text-xs uppercase tracking-wider rounded-md transition-colors cursor-pointer"
      >
        Lock Session Database
      </button>
    </div>
  );
}
