"use client";

import React, { useState } from "react";
import { 
  Pin, 
  Star1, 
  Trash, 
  Refresh, 
  Edit2, 
  Clock, 
  Code,
  ArrowSwapHorizontal,
  ShieldSecurity 
} from "@/components/iconsax";
import { Check, ExternalLink, Save } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Account, useStore } from "@/lib/store";

interface ProfileCardProps {
  account: Account;
  isActiveTabMatching: boolean;
  onInspect?: () => void;
}

// Security profile tone mapping (deliberate, non-AI-purple palette)
const colorMap: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  amber: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-300", dot: "bg-amber-400" },
  emerald: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-300", dot: "bg-emerald-400" },
  cyan: { border: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-300", dot: "bg-cyan-400" },
  steel: { border: "border-slate-500/30", bg: "bg-slate-500/10", text: "text-slate-300", dot: "bg-slate-400" },
  rose: { border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-300", dot: "bg-rose-400" },
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ account, isActiveTabMatching, onInspect }) => {
  const { 
    swapAccount, 
    deleteAccount, 
    togglePin, 
    toggleFavorite,
    updateAccountLabel,
    activeSessions,
    currentTabId
  } = useStore();

  const [isSwapping, setIsSwapping] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(account.name);
  const [editEmail, setEditEmail] = useState(account.email);
  const [editColor, setEditColor] = useState(account.color || "amber");

  const colors = Object.keys(colorMap);
  // Default to amber if old purple/indigo was saved
  const safeColor = colorMap[account.color] ? account.color : "amber";
  const cTheme = colorMap[safeColor];
  const isCurrentlyActiveSession = activeSessions[account.websiteDomain] === account.id;

  // Expiry calculations
  const isExpired = account.expiresAt !== undefined && account.expiresAt < Date.now() / 1000;
  const isExpiringSoon = account.expiresAt !== undefined && !isExpired && account.expiresAt < (Date.now() / 1000) + 86400;

  const handleSwap = async () => {
    setIsSwapping(true);
    try {
      if (isActiveTabMatching) {
        await swapAccount(account.id);
      } else {
        const password = useStore.getState().masterPassword;
        if (!password) throw new Error("Vault locked");
        
        const { decryptData } = await import("@/lib/crypto");
        const { getAdapterForUrl } = await import("@/adapters");
        
        const decSessionStr = await decryptData(account.encryptedSession, password);
        const sessionData = JSON.parse(decSessionStr);
        
        const adapter = getAdapterForUrl(`https://${account.websiteDomain}`);
        if (adapter) {
          await adapter.restore(currentTabId || 0, sessionData);
          if (currentTabId) {
            chrome.tabs.update(currentTabId, { url: `https://${account.websiteDomain}` });
          }
        }
      }

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

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getInitials = () => {
    if (account.email) {
      return account.email.substring(0, 2).toUpperCase();
    }
    return account.name.substring(0, 2).toUpperCase();
  };

  return (
    <motion.div
      layout
      className={cn(
        "relative rounded-lg p-3.5 transition-colors border flex flex-col justify-between",
        "bg-[#10131c]",
        isCurrentlyActiveSession 
          ? "border-amber-500/40 bg-[#121620]" 
          : "border-[#202534] hover:border-[#2e3549]"
      )}
    >
      {/* Top Status Indicators */}
      <div className="flex items-center justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-slate-300">
            {account.websiteName}
          </span>
          <span className="text-[9px] font-mono text-slate-500">
            {account.websiteDomain}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isCurrentlyActiveSession && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              ACTIVE
            </span>
          )}
          {isExpired && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1">
              <ShieldSecurity size={11} />
              EXPIRED
            </span>
          )}
          {isExpiringSoon && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              EXPIRING SOON
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div>
        {isEditing ? (
          <div className="space-y-2 py-1">
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Session Label"
              className="w-full px-2.5 py-1.5 bg-[#090b10] border border-[#232838] rounded text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="Identifier / Email"
              className="w-full px-2.5 py-1.5 bg-[#090b10] border border-[#232838] rounded text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
            <div className="flex gap-1.5 pt-1">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  className={cn(
                    "w-4 h-4 rounded border transition-all",
                    colorMap[c]?.dot,
                    editColor === c ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            {/* Monospace Initial Glyph */}
            <div className={cn(
              "w-9 h-9 rounded-md flex items-center justify-center font-mono font-bold text-xs select-none border shrink-0",
              cTheme.bg,
              cTheme.text,
              cTheme.border
            )}>
              {getInitials()}
            </div>
            
            {/* Identity details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs text-slate-100 truncate">
                {account.name}
              </h3>
              <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                {account.email}
              </p>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 mt-1">
                <Clock className="w-2.5 h-2.5" />
                <span>Last active: {getRelativeTime(account.lastUsed)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-[#1c2230] pt-2.5 mt-3">
        {/* State controls */}
        <div className="flex items-center gap-0.5">
          {isEditing ? (
            <button
              onClick={handleSaveEdit}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
              title="Save Profile"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => togglePin(account.id)}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  account.isPinned ? "text-amber-400 bg-amber-500/10" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
                )}
                title={account.isPinned ? "Unpin from Quick-Access" : "Pin to Quick-Access"}
              >
                <Pin size={14} />
              </button>

              <button
                onClick={() => toggleFavorite(account.id)}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  account.isFavorite ? "text-amber-400 bg-amber-500/10" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
                )}
                title={account.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Star1 size={14} />
              </button>

              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 rounded text-slate-500 hover:bg-white/5 hover:text-slate-200 transition-colors"
                title="Edit Identity Metadata"
              >
                <Edit2 size={14} />
              </button>

              <button
                onClick={onInspect}
                className="p-1.5 rounded text-slate-500 hover:bg-white/5 hover:text-slate-200 transition-colors cursor-pointer"
                title="Inspect Encrypted Session Payload"
                aria-label="Inspect session"
                data-testid="inspect-btn"
              >
                <Code size={14} />
              </button>

              <button
                onClick={() => deleteAccount(account.id)}
                className="p-1.5 rounded text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                title="Purge Identity from Vault"
              >
                <Trash size={14} />
              </button>
            </>
          )}
        </div>

        {/* Action Swap Button */}
        {!isEditing && (
          <button
            onClick={handleSwap}
            disabled={isSwapping || isCurrentlyActiveSession}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all select-none cursor-pointer",
              isCurrentlyActiveSession
                ? "bg-white/[0.04] text-slate-500 border border-white/[0.06] cursor-default font-mono"
                : showSuccess
                ? "bg-emerald-600 text-white font-bold"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold active:scale-[0.98] shadow-sm"
            )}
          >
            {isSwapping ? (
              <Refresh size={13} className="animate-spin" />
            ) : showSuccess ? (
              <Check className="w-3 h-3" />
            ) : isActiveTabMatching ? (
              <ArrowSwapHorizontal size={13} />
            ) : (
              <ExternalLink className="w-3 h-3" />
            )}
            
            <span>
              {isCurrentlyActiveSession
                ? "Active"
                : showSuccess
                ? "Swapped"
                : isActiveTabMatching
                ? "Switch"
                : "Switch & Open"}
            </span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
