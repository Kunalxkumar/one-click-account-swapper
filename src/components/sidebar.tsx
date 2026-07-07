"use client";

import React from "react";
import { 
  FolderHeart, 
  Settings, 
  Grid, 
  Pin, 
  LogOut, 
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Database
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
    lock,
    activeSessions
  } = useStore();

  // Categories list
  const navItems = [
    { id: "all", label: "All Accounts", icon: Grid },
    { id: "pinned", label: "Pinned", icon: Pin },
    { id: "favorites", label: "Favorites", icon: FolderHeart },
  ];

  // Get list of websites that actually have accounts saved
  const activeWebsites = Array.from(new Set(accounts.map((acc) => acc.websiteId)))
    .map(id => adapters[id])
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
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md border-r border-white/5 select-none text-slate-300">
      {/* App Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Database className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-sm bg-gradient-to-r from-indigo-200 to-violet-200 bg-clip-text text-transparent">
              Swapper
            </h1>
            <p className="text-[10px] text-slate-500">v1.0.0 (Secure)</p>
          </div>
        </div>
        {isResponsive && (
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md hover:bg-white/10 text-slate-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {/* Navigation Categories */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Categories
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === "dashboard" && selectedCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, "dashboard")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 group text-left",
                  isActive
                    ? "bg-indigo-600/20 text-indigo-200 border-l-2 border-indigo-500 font-medium"
                    : "hover:bg-white/5 hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-white")} />
                  <span>{item.label}</span>
                </div>
                {/* Count badge */}
                {item.id === "all" && accounts.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {accounts.length}
                  </span>
                )}
                {item.id === "pinned" && accounts.filter(a => a.isPinned).length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {accounts.filter(a => a.isPinned).length}
                  </span>
                )}
                {item.id === "favorites" && accounts.filter(a => a.isFavorite).length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {accounts.filter(a => a.isFavorite).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Websites List */}
        {activeWebsites.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Websites
            </p>
            {activeWebsites.map((web) => {
              const isActive = activeView === "dashboard" && selectedCategory === web.id;
              const webAccounts = accounts.filter(a => a.websiteId === web.id);
              return (
                <button
                  key={web.id}
                  onClick={() => handleNavClick(web.id, "dashboard")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all duration-200 text-left",
                    isActive
                      ? "bg-indigo-600/20 text-indigo-200 border-l-2 border-indigo-500 font-medium"
                      : "hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span className="truncate">{web.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {webAccounts.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer / Settings */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <button
          onClick={() => handleNavClick("settings", "settings")}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left",
            activeView === "settings"
              ? "bg-white/10 text-white font-medium"
              : "hover:bg-white/5 hover:text-white"
          )}
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </button>

        <button
          onClick={lock}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-all text-left"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Lock Swapper</span>
        </button>
      </div>
    </div>
  );

  if (isResponsive) {
    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
        )}
        {/* Side Drawer */}
        <div 
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {SidebarContent}
        </div>
      </>
    );
  }

  return (
    <div className="w-64 h-full flex-shrink-0">
      {SidebarContent}
    </div>
  );
};
