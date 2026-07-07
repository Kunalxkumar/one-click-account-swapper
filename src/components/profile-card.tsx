"use client";

import React, { useState } from "react";
import { 
  Pin, 
  Star, 
  Trash2, 
  RefreshCw, 
  Check, 
  ExternalLink,
  Edit2,
  Clock,
  Sparkles,
  Save,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Account, useStore } from "@/lib/store";

interface ProfileCardProps {
  account: Account;
  isActiveTabMatching: boolean;
  onInspect?: () => void;
}

const colorMap: Record<string, { border: string; bg: string; text: string; accent: string; glow: string }> = {
  emerald: { border: "border-emerald-500/20 hover:border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-400", accent: "bg-emerald-500", glow: "shadow-emerald-500/5" },
  indigo: { border: "border-indigo-500/20 hover:border-indigo-500/40", bg: "bg-indigo-500/10", text: "text-indigo-400", accent: "bg-indigo-500", glow: "shadow-indigo-500/5" },
  violet: { border: "border-violet-500/20 hover:border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-400", accent: "bg-violet-500", glow: "shadow-violet-500/5" },
  amber: { border: "border-amber-500/20 hover:border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-400", accent: "bg-amber-500", glow: "shadow-amber-500/5" },
  rose: { border: "border-rose-500/20 hover:border-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-400", accent: "bg-rose-500", glow: "shadow-rose-500/5" },
  cyan: { border: "border-cyan-500/20 hover:border-cyan-500/40", bg: "bg-cyan-500/10", text: "text-cyan-400", accent: "bg-cyan-500", glow: "shadow-cyan-500/5" },
  fuchsia: { border: "border-fuchsia-500/20 hover:border-fuchsia-500/40", bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", accent: "bg-fuchsia-500", glow: "shadow-fuchsia-500/5" },
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ account, isActiveTabMatching, onInspect }) => {
  const { 
    swapAccount, 
    deleteAccount, 
    togglePin, 
    toggleFavorite,
    updateAccountLabel,
    activeSessions,
    currentTabId,
    currentTabUrl
  } = useStore();

  const [isSwapping, setIsSwapping] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(account.name);
  const [editEmail, setEditEmail] = useState(account.email);
  const [editColor, setEditColor] = useState(account.color);

  const colors = Object.keys(colorMap);
  const cTheme = colorMap[account.color] || colorMap.indigo;
  const isCurrentlyActiveSession = activeSessions[account.websiteDomain] === account.id;

  // Expiry calculations
  const isExpired = account.expiresAt !== undefined && account.expiresAt < Date.now() / 1000;
  const isExpiringSoon = account.expiresAt !== undefined && !isExpired && account.expiresAt < (Date.now() / 1000) + 86400;

  const handleSwap = async () => {
    setIsSwapping(true);
    try {
      if (isActiveTabMatching) {
        // Simple direct swap & reload
        await swapAccount(account.id);
      } else {
        // Decrypt & restore session first (so website loads logged in)
        const password = useStore.getState().masterPassword;
        if (!password) throw new Error("Wallet locked");
        
        const { decryptData } = await import("@/lib/crypto");
        const { getAdapterForUrl } = await import("@/adapters");
        
        const decSessionStr = await decryptData(account.encryptedSession, password);
        const sessionData = JSON.parse(decSessionStr);
        
        const adapter = getAdapterForUrl(`https://${account.websiteDomain}`);
        if (adapter) {
          // Restore cookies for the domain
          await adapter.restore(currentTabId || 0, sessionData);
          
          // Redirect the current active tab to the website
          if (currentTabId) {
            chrome.tabs.update(currentTabId, { url: `https://${account.websiteDomain}` });
          }
        }
      }

      // Show success micro-animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSaveEdit = async () => {
    await updateAccountLabel(account.id, editLabel, editEmail, editColor);
    setIsEditing(false);
  };

  // Format relative time helper
  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Get initial letters for avatar
  const getInitials = () => {
    if (account.email) {
      return account.email.substring(0, 2).toUpperCase();
    }
    return account.name.substring(0, 2).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
      className={cn(
        "relative rounded-xl p-4 transition-all duration-300 border flex flex-col justify-between shadow-md",
        "bg-slate-900/35 backdrop-blur-md",
        cTheme.border,
        cTheme.glow,
        isCurrentlyActiveSession && "ring-1 ring-indigo-500/40"
      )}
    >
      {/* Top Banner indicating Active and/or Expiry status */}
      <div className="absolute -top-2 right-4 flex items-center gap-1.5 select-none">
        {isCurrentlyActiveSession && (
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider bg-indigo-500 text-white flex items-center gap-1 shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-2.5 h-2.5" />
            ACTIVE
          </span>
        )}
        {isExpired && (
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider bg-rose-500 text-white flex items-center gap-1 shadow-sm shadow-rose-500/20">
            EXPIRED
          </span>
        )}
        {isExpiringSoon && (
          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm shadow-amber-500/20">
            EXPIRING
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="space-y-3">
        {isEditing ? (
          /* Editing view */
          <div className="space-y-2">
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Account Name"
              className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-2 py-1 bg-slate-950 border border-white/10 rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {/* Color select */}
            <div className="flex gap-1.5 pt-1">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  className={cn(
                    "w-4 h-4 rounded-full border border-white/10",
                    colorMap[c]?.accent,
                    editColor === c && "ring-2 ring-white"
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Static Display View */
          <div className="flex items-start gap-3">
            {/* Avatar block */}
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm tracking-wider select-none", cTheme.bg, cTheme.text)}>
              {getInitials()}
            </div>
            
            {/* Label and Email info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-xs text-white truncate max-w-[120px]">
                  {account.name}
                </h3>
                <span className="text-[10px] text-slate-500 truncate">
                  ({account.websiteName})
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {account.email}
              </p>
              <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1">
                <Clock className="w-3 h-3 text-slate-600" />
                <span>Last swap: {getRelativeTime(account.lastUsed)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-4">
        {/* Toggle States (Pin, Favorite, Delete, Edit) */}
        <div className="flex items-center gap-1">
          {isEditing ? (
            <button
              onClick={handleSaveEdit}
              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="Save"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => togglePin(account.id)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  account.isPinned ? "text-amber-400 hover:bg-amber-500/10" : "text-slate-500 hover:bg-white/5 hover:text-white"
                )}
                title={account.isPinned ? "Unpin" : "Pin"}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => toggleFavorite(account.id)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  account.isFavorite ? "text-rose-400 hover:bg-rose-500/10" : "text-slate-500 hover:bg-white/5 hover:text-white"
                )}
                title={account.isFavorite ? "Remove favorite" : "Favorite"}
              >
                <Star className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
                title="Edit details"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onInspect}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
                title="Inspect session details"
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => deleteAccount(account.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                title="Delete profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Action Swap Button */}
        {!isEditing && (
          <button
            onClick={handleSwap}
            disabled={isSwapping}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all duration-300",
              isCurrentlyActiveSession
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : showSuccess
                ? "bg-emerald-600 text-white animate-pulse"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95"
            )}
          >
            {isSwapping ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : showSuccess ? (
              <Check className="w-3 h-3" />
            ) : isActiveTabMatching ? (
              <RefreshCw className="w-3 h-3" />
            ) : (
              <ExternalLink className="w-3 h-3" />
            )}
            
            <span>
              {isCurrentlyActiveSession
                ? "Active"
                : showSuccess
                ? "Swapped!"
                : isActiveTabMatching
                ? "Swap"
                : "Switch & Go"}
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
