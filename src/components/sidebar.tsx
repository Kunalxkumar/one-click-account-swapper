"use client";

import React from "react";
import { 
  FolderHeart, 
  Settings, 
  Layers, 
  Pin, 
  Lock, 
  ExternalLink,
  ChevronLeft,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { adapters } from "@/adapters";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isResponsive: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isResponsive }) => {
  const { 
    selectedCategory, 
    activeView, 
    accounts, 
    lock 
  } = useStore();

  const navItems = [
    { id: "all", label: "All Sessions", icon: Layers },
    { id: "pinned", label: "Pinned Quick-Access", icon: Pin },
    { id: "favorites", label: "Favorites", icon: FolderHeart },
  ];

  // Unique websites with saved profiles
  const activeWebsites = Array.from(new Set(accounts.map((acc) => acc.websiteId)))
    .map((id) => adapters[id])
    .filter(Boolean);

  const handleNavClick = (id: string, view: "dashboard" | "settings") => {
    useStore.setState({ 
      selectedCategory: id, 
      activeView: view 
    });
    if (isResponsive) {
      setIsOpen(false);
    }
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#0d1017] border-r border-[#202534] select-none text-slate-300">
      {/* App Header: Tactical Vault Brand */}
      <div className="p-3.5 border-b border-[#202534] flex items-center justify-between bg-[#0a0c12]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-xs tracking-wider text-slate-100 uppercase">
                VaultKey
              </h1>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PRO
              </span>
            </div>
            <p className="text-[9px] font-mono text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
              AES-256 GCM
            </p>
          </div>
        </div>
        {isResponsive && (
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {/* Navigation Categories */}
        <div className="space-y-0.5">
          <p className="px-2.5 py-1 text-[9px] font-mono uppercase font-semibold text-slate-500 tracking-wider">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === "dashboard" && selectedCategory === item.id;
            let count = 0;
            if (item.id === "all") count = accounts.length;
            if (item.id === "pinned") count = accounts.filter((a) => a.isPinned).length;
            if (item.id === "favorites") count = accounts.filter((a) => a.isFavorite).length;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, "dashboard")}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors duration-150 group text-left",
                  isActive
                    ? "bg-amber-500/10 text-amber-300 font-semibold border-l-2 border-amber-500"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200")} />
                  <span>{item.label}</span>
                </div>
                {count > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/[0.08] text-slate-400">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Saved Websites Filter */}
        {activeWebsites.length > 0 && (
          <div className="space-y-0.5">
            <p className="px-2.5 py-1 text-[9px] font-mono uppercase font-semibold text-slate-500 tracking-wider">
              Connected Sites
            </p>
            {activeWebsites.map((web) => {
              const isActive = activeView === "dashboard" && selectedCategory === web.id;
              const webAccounts = accounts.filter((a) => a.websiteId === web.id);
              return (
                <button
                  key={web.id}
                  onClick={() => handleNavClick(web.id, "dashboard")}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 text-left",
                    isActive
                      ? "bg-amber-500/10 text-amber-300 font-semibold border-l-2 border-amber-500"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  )}
                >
                  <span className="truncate">{web.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/[0.08] text-slate-400">
                    {webAccounts.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-[#202534] bg-[#0a0c12] space-y-1.5">
        <button
          onClick={() => handleNavClick("settings", "settings")}
          className={cn(
            "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left",
            activeView === "settings"
              ? "bg-white/[0.08] text-white font-medium border border-white/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
          )}
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span>Vault Settings</span>
        </button>

        {isResponsive && (
          <button
            onClick={() => {
              if (typeof chrome !== "undefined" && chrome.tabs?.create && chrome.runtime?.getURL) {
                chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
              }
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors text-left"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Full Dashboard</span>
          </button>
        )}

        <button
          onClick={lock}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all text-left"
        >
          <Lock className="w-3.5 h-3.5 text-rose-400" />
          <span>Lock Vault</span>
        </button>
      </div>
    </div>
  );

  if (isResponsive) {
    return (
      <>
        {isOpen && (
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs"
          />
        )}
        <div 
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {SidebarContent}
        </div>
      </>
    );
  }

  return (
    <div className="w-60 h-full flex-shrink-0">
      {SidebarContent}
    </div>
  );
};
