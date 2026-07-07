import { create } from "zustand";
import { encryptData, decryptData } from "./crypto";

export interface Account {
  id: string;
  name: string;
  email: string;
  websiteId: string;
  websiteDomain: string;
  websiteName: string;
  websiteIcon: string;
  color: string;
  lastUsed: number;
  isPinned: boolean;
  isFavorite: boolean;
  encryptedSession: string; // Encrypted JSON string of cookies & storage
  expiresAt?: number;        // Optional minimum cookie expiration timestamp (seconds)
}

interface ExtensionState {
  // App navigation and locked state
  isUnlocked: boolean;
  hasMasterPassword: boolean;
  activeView: "dashboard" | "settings" | "unlock" | "setup_password";
  masterPassword: string | null;

  // Data
  accounts: Account[];
  activeSessions: Record<string, string>; // websiteDomain -> accountId
  customSites: { id: string; name: string; domain: string; icon: string }[];
  swappingAccount: Account | null;

  // Tab tracking
  currentTabUrl: string | null;
  currentTabId: number | null;

  // Filters
  searchQuery: string;
  selectedCategory: "all" | "favorites" | "pinned" | "active" | string; // Category or site filter

  // Actions
  init: () => Promise<void>;
  setupPassword: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  addAccount: (account: Omit<Account, "id" | "lastUsed" | "encryptedSession">, sessionData: any) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  swapAccount: (accountId: string) => Promise<void>;
  updateAccountLabel: (id: string, newLabel: string, newEmail: string, newColor: string) => Promise<void>;
  importBackup: (backupStr: string, password: string) => Promise<boolean>;
  exportBackup: (password: string) => Promise<string>;
  addCustomSite: (name: string, domain: string) => Promise<boolean>;
  deleteCustomSite: (id: string) => Promise<void>;
}

export const useStore = create<ExtensionState>((set, get) => ({
  isUnlocked: false,
  hasMasterPassword: false,
  activeView: "unlock",
  masterPassword: null,
  accounts: [],
  activeSessions: {},
  customSites: [],
  swappingAccount: null,
  currentTabUrl: null,
  currentTabId: null,
  searchQuery: "",
  selectedCategory: "all",

  init: async () => {
    return new Promise((resolve) => {
      // 1. Fetch current active tab URL and ID
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab) {
          set({
            currentTabUrl: activeTab.url || null,
            currentTabId: activeTab.id || null,
          });
        }

        // 2. Fetch local storage state
        chrome.storage.local.get(
          ["accounts", "hasMasterPassword", "activeSessions", "passwordVerifyPayload", "customSites"],
          async (result) => {
            const hasMasterPassword = !!result.hasMasterPassword;
            const accounts = (result.accounts || []) as Account[];
            const activeSessions = (result.activeSessions || {}) as Record<string, string>;
            const customSites = (result.customSites || []) as { id: string; name: string; domain: string; icon: string }[];

            // Dynamically register custom sites into the adapters list
            try {
              const { adapters, BaseAdapter } = await import("../adapters");
              for (const site of customSites) {
                if (!adapters[site.id]) {
                  adapters[site.id] = new BaseAdapter(site.id, site.name, site.domain, site.icon || "Globe");
                }
              }
            } catch (err) {
              console.error("Failed to load custom adapters on init:", err);
            }

            set({
              hasMasterPassword,
              accounts,
              activeSessions,
              customSites,
              activeView: hasMasterPassword ? "unlock" : "setup_password",
            });
            resolve();
          }
        );
      });
    });
  },

  setupPassword: async (password: string) => {
    // 1. Create a validation payload to verify future unlocks
    const verifyPayload = "VERIFY_KEY_SWAPPER";
    const encryptedVerify = await encryptData(verifyPayload, password);

    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          hasMasterPassword: true,
          passwordVerifyPayload: encryptedVerify,
          accounts: [],
          activeSessions: {},
        },
        () => {
          set({
            hasMasterPassword: true,
            isUnlocked: true,
            masterPassword: password,
            activeView: "dashboard",
            accounts: [],
            activeSessions: {},
          });
          resolve();
        }
      );
    });
  },

  unlock: async (password: string): Promise<boolean> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(["passwordVerifyPayload"], async (result) => {
        const payload = result.passwordVerifyPayload as string;
        if (!payload) {
          resolve(false);
          return;
        }

        try {
          const decrypted = await decryptData(payload, password);
          if (decrypted === "VERIFY_KEY_SWAPPER") {
            set({
              isUnlocked: true,
              masterPassword: password,
              activeView: "dashboard",
            });
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (err) {
          resolve(false);
        }
      });
    });
  },

  lock: () => {
    set({
      isUnlocked: false,
      masterPassword: null,
      activeView: "unlock",
    });
  },

  addAccount: async (accountData, sessionData) => {
    const password = get().masterPassword;
    if (!password) throw new Error("Wallet is locked");

    const sessionStr = JSON.stringify(sessionData);
    const encryptedSession = await encryptData(sessionStr, password);

    // Calculate minimum cookie expiration timestamp (if any expire)
    let expiresAt: number | undefined;
    if (sessionData && Array.isArray(sessionData.cookies)) {
      const expirations = sessionData.cookies
        .map((c: any) => c.expirationDate)
        .filter((exp: any) => typeof exp === "number");
      if (expirations.length > 0) {
        expiresAt = Math.min(...expirations);
      }
    }

    const newAccount: Account = {
      ...accountData,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      lastUsed: Date.now(),
      encryptedSession,
      expiresAt,
    };

    return new Promise((resolve) => {
      const updatedAccounts = [...get().accounts, newAccount];
      chrome.storage.local.set({ accounts: updatedAccounts }, () => {
        set({ accounts: updatedAccounts });
        resolve();
      });
    });
  },

  deleteAccount: async (id: string) => {
    return new Promise((resolve) => {
      const updatedAccounts = get().accounts.filter((acc) => acc.id !== id);
      
      // Clean active sessions if deleting current active
      const activeSessions = { ...get().activeSessions };
      for (const [domain, activeId] of Object.entries(activeSessions)) {
        if (activeId === id) {
          delete activeSessions[domain];
        }
      }

      chrome.storage.local.set({ accounts: updatedAccounts, activeSessions }, () => {
        set({ accounts: updatedAccounts, activeSessions });
        resolve();
      });
    });
  },

  togglePin: async (id: string) => {
    return new Promise((resolve) => {
      const updatedAccounts = get().accounts.map((acc) =>
        acc.id === id ? { ...acc, isPinned: !acc.isPinned } : acc
      );
      chrome.storage.local.set({ accounts: updatedAccounts }, () => {
        set({ accounts: updatedAccounts });
        resolve();
      });
    });
  },

  toggleFavorite: async (id: string) => {
    return new Promise((resolve) => {
      const updatedAccounts = get().accounts.map((acc) =>
        acc.id === id ? { ...acc, isFavorite: !acc.isFavorite } : acc
      );
      chrome.storage.local.set({ accounts: updatedAccounts }, () => {
        set({ accounts: updatedAccounts });
        resolve();
      });
    });
  },

  updateAccountLabel: async (id: string, newLabel: string, newEmail: string, newColor: string) => {
    return new Promise((resolve) => {
      const updatedAccounts = get().accounts.map((acc) =>
        acc.id === id ? { ...acc, name: newLabel, email: newEmail, color: newColor } : acc
      );
      chrome.storage.local.set({ accounts: updatedAccounts }, () => {
        set({ accounts: updatedAccounts });
        resolve();
      });
    });
  },

  swapAccount: async (accountId: string) => {
    const account = get().accounts.find((acc) => acc.id === accountId);
    const password = get().masterPassword;
    const tabId = get().currentTabId;

    if (!account || !password || !tabId) {
      console.error("Missing swap criteria", { account, password, tabId });
      return;
    }

    set({ swappingAccount: account });

    try {
      // 1. Decrypt session
      const decryptedSessionStr = await decryptData(account.encryptedSession, password);
      const sessionData = JSON.parse(decryptedSessionStr);

      // 2. Fetch adapter
      const { getAdapterForUrl } = await import("../adapters");
      const adapter = getAdapterForUrl(get().currentTabUrl || "");
      if (!adapter) {
        console.error("No adapter matches current URL");
        set({ swappingAccount: null });
        return;
      }

      // 3. Perform Swap: restore session variables
      await adapter.restore(tabId, sessionData);

      // 4. Update state and local storage
      const updatedAccounts = get().accounts.map((acc) =>
        acc.id === accountId ? { ...acc, lastUsed: Date.now() } : acc
      );

      const activeSessions = {
        ...get().activeSessions,
        [account.websiteDomain]: accountId,
      };

      return new Promise<void>((resolve) => {
        chrome.storage.local.set(
          {
            accounts: updatedAccounts,
            activeSessions,
          },
          () => {
            set({
              accounts: updatedAccounts,
              activeSessions,
              swappingAccount: null,
            });

            // 5. Reload active tab to apply session changes
            chrome.tabs.reload(tabId, {}, () => {
              resolve();
            });
          }
        );
      });
    } catch (err) {
      console.error("Error during swap:", err);
      set({ swappingAccount: null });
    }
  },

  exportBackup: async (password: string): Promise<string> => {
    const localPassword = get().masterPassword;
    if (!localPassword) throw new Error("Wallet is locked");

    // Create backup file payload (accounts list)
    // Decrypt all accounts with current localPassword, and re-encrypt with backup password (if different, or just use masterPassword)
    const decryptedAccounts = [];
    for (const acc of get().accounts) {
      const decSession = await decryptData(acc.encryptedSession, localPassword);
      decryptedAccounts.push({
        ...acc,
        sessionRaw: JSON.parse(decSession),
      });
    }

    const backupPayload = {
      version: 1,
      timestamp: Date.now(),
      accounts: decryptedAccounts,
    };

    // Encrypt the entire backup with backup password
    const backupJson = JSON.stringify(backupPayload);
    return await encryptData(backupJson, password);
  },

  importBackup: async (backupStr: string, password: string): Promise<boolean> => {
    try {
      // 1. Decrypt backup string
      const decryptedBackupJson = await decryptData(backupStr, password);
      const backupPayload = JSON.parse(decryptedBackupJson);

      if (backupPayload.version !== 1 || !Array.isArray(backupPayload.accounts)) {
        return false;
      }

      // 2. Fetch local password
      const localPassword = get().masterPassword;
      if (!localPassword) return false;

      // 3. Encrypt and map imported accounts
      const importedAccounts: Account[] = [];
      for (const acc of backupPayload.accounts) {
        const encryptedSession = await encryptData(
          JSON.stringify(acc.sessionRaw),
          localPassword
        );

        importedAccounts.push({
          id: acc.id || crypto.randomUUID(),
          name: acc.name,
          email: acc.email,
          websiteId: acc.websiteId,
          websiteDomain: acc.websiteDomain,
          websiteName: acc.websiteName,
          websiteIcon: acc.websiteIcon,
          color: acc.color || "indigo",
          lastUsed: acc.lastUsed || Date.now(),
          isPinned: !!acc.isPinned,
          isFavorite: !!acc.isFavorite,
          encryptedSession,
        });
      }

      // Merge imported accounts with existing
      const existing = get().accounts;
      // Filter out duplicate ids
      const filteredExisting = existing.filter((e) => !importedAccounts.some((i) => i.id === e.id));
      const mergedAccounts = [...filteredExisting, ...importedAccounts];

      return new Promise((resolve) => {
        chrome.storage.local.set({ accounts: mergedAccounts }, () => {
          set({ accounts: mergedAccounts });
          resolve(true);
        });
      });
    } catch (err) {
      console.error("Failed to import backup:", err);
      return false;
    }
  },

  addCustomSite: async (name: string, domain: string): Promise<boolean> => {
    const id = domain.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const newSite = {
      id,
      name,
      domain,
      icon: "Globe",
    };

    const hostPattern = `*://*.${domain}/*`;
    
    // Request permission from Chrome dynamically
    const granted = await new Promise<boolean>((resolve) => {
      if (typeof chrome !== "undefined" && chrome.permissions) {
        chrome.permissions.request({ origins: [hostPattern] }, (res) => {
          resolve(!!res);
        });
      } else {
        // Mock permission in local development browser environment
        resolve(true);
      }
    });

    if (!granted) {
      return false;
    }

    // Register dynamically in adapters
    try {
      const { adapters, BaseAdapter } = await import("../adapters");
      if (!adapters[id]) {
        adapters[id] = new BaseAdapter(id, name, domain, "Globe");
      }
    } catch (err) {
      console.error("Failed to register custom adapter:", err);
    }

    const customSites = [...get().customSites, newSite];
    return new Promise((resolve) => {
      chrome.storage.local.set({ customSites }, () => {
        set({ customSites });
        resolve(true);
      });
    });
  },

  deleteCustomSite: async (id: string) => {
    const customSites = get().customSites.filter((site) => site.id !== id);
    
    // Remove from active adapters
    try {
      const { adapters } = await import("../adapters");
      delete adapters[id];
    } catch (err) {
      console.error("Failed to delete custom adapter:", err);
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ customSites }, () => {
        set({ customSites });
        resolve();
      });
    });
  },
}));
