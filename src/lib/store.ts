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
}

export const useStore = create<ExtensionState>((set, get) => ({
  isUnlocked: false,
  hasMasterPassword: false,
  activeView: "unlock",
  masterPassword: null,
  accounts: [],
  activeSessions: {},
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
          ["accounts", "hasMasterPassword", "activeSessions", "passwordVerifyPayload"],
          (result) => {
            const hasMasterPassword = !!result.hasMasterPassword;
            const accounts = (result.accounts || []) as Account[];
            const activeSessions = (result.activeSessions || {}) as Record<string, string>;

            set({
              hasMasterPassword,
              accounts,
              activeSessions,
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

    const newAccount: Account = {
      ...accountData,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      lastUsed: Date.now(),
      encryptedSession,
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

    // 1. Decrypt session
    const decryptedSessionStr = await decryptData(account.encryptedSession, password);
    const sessionData = JSON.parse(decryptedSessionStr);

    // 2. Fetch adapter
    const { getAdapterForUrl } = await import("../adapters");
    const adapter = getAdapterForUrl(get().currentTabUrl || "");
    if (!adapter) {
      console.error("No adapter matches current URL");
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

    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          accounts: updatedAccounts,
          activeSessions,
        },
        () => {
          set({
            accounts: updatedAccounts,
            activeSessions,
          });

          // 5. Reload active tab to apply session changes
          chrome.tabs.reload(tabId, {}, () => {
            resolve();
          });
        }
      );
    });
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
}));
