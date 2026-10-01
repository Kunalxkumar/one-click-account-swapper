// Adapter Architecture for capturing and restoring website sessions

export interface SessionData {
  cookies: chrome.cookies.Cookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface WebsiteAdapter {
  id: string;
  name: string;
  domain: string;
  icon: string;
  hosts: string[];
  capture(tabId: number): Promise<SessionData>;
  restore(tabId: number, session: SessionData): Promise<void>;
  clear(tabId: number): Promise<void>;
}

export class BaseAdapter implements WebsiteAdapter {
  id: string;
  name: string;
  domain: string;
  icon: string;
  hosts: string[];

  constructor(id: string, name: string, domain: string, icon: string, additionalHosts: string[] = []) {
    this.id = id;
    this.name = name;
    this.domain = domain;
    this.icon = icon;
    this.hosts = [`*://*.${domain}/*`, ...additionalHosts];
  }

  // Check if permission is granted for hosts
  async hasPermission(): Promise<boolean> {
    return chrome.permissions.contains({ origins: this.hosts });
  }

  // Request permission for hosts
  async requestPermission(): Promise<boolean> {
    return chrome.permissions.request({ origins: this.hosts });
  }

  async capture(tabId: number): Promise<SessionData> {
    // 1. Capture cookies for the main domain and subdomains
    const cookies = await chrome.cookies.getAll({ domain: this.domain });

    // 2. Capture localStorage & sessionStorage from the page
    let localStorageData: Record<string, string> = {};
    let sessionStorageData: Record<string, string> = {};

    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          return {
            localStorage: { ...localStorage },
            sessionStorage: { ...sessionStorage },
          };
        },
      });
      if (result) {
        localStorageData = result.localStorage;
        sessionStorageData = result.sessionStorage;
      }
    } catch (err) {
      console.warn("Could not capture localStorage/sessionStorage from script injection:", err);
      // Fallback: Continue with cookies only
    }

    return {
      cookies,
      localStorage: localStorageData,
      sessionStorage: sessionStorageData,
    };
  }

  async restore(tabId: number, session: SessionData): Promise<void> {
    // 1. Clear current session first to prevent merge contamination
    await this.clear(tabId);

    // 2. Restore cookies
    for (const cookie of session.cookies) {
      const protocol = cookie.secure ? "https://" : "http://";
      const domainForUrl = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
      const url = `${protocol}${domainForUrl}${cookie.path}`;

      // Build cookie details
      const details: chrome.cookies.SetDetails = {
        url,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
      };

      // Only set domain if NOT a host-only cookie and not __Host- prefixed
      if (!cookie.hostOnly && !cookie.name.startsWith("__Host-")) {
        details.domain = cookie.domain;
      }

      // SameSite=None requires Secure=true
      if (details.sameSite === "no_restriction" && !details.secure) {
        details.secure = true;
      }

      if (cookie.expirationDate !== undefined) {
        details.expirationDate = cookie.expirationDate;
      }

      try {
        await chrome.cookies.set(details);
      } catch (err) {
        console.error(`Failed to restore cookie ${cookie.name}:`, err);
      }
    }

    // 3. Restore localStorage & sessionStorage
    if (
      tabId &&
      (Object.keys(session.localStorage || {}).length > 0 ||
        Object.keys(session.sessionStorage || {}).length > 0)
    ) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (
          tab?.url &&
          !tab.url.startsWith("chrome://") &&
          !tab.url.startsWith("chrome-extension://") &&
          !tab.url.startsWith("edge://") &&
          (tab.url.includes(this.domain) ||
            this.hosts.some((h) => tab.url && tab.url.includes(h.replace(/[*:/]/g, ""))))
        ) {
          await chrome.scripting.executeScript({
            target: { tabId },
            func: (ls, ss) => {
              try {
                localStorage.clear();
                for (const [k, v] of Object.entries(ls)) {
                  localStorage.setItem(k, v as string);
                }
              } catch (e) {}
              try {
                sessionStorage.clear();
                for (const [k, v] of Object.entries(ss)) {
                  sessionStorage.setItem(k, v as string);
                }
              } catch (e) {}
            },
            args: [session.localStorage, session.sessionStorage],
          });
        }
      } catch (err) {
        console.warn("Could not restore storage via script injection:", err);
      }
    }
  }

  async clear(tabId: number): Promise<void> {
    // 1. Clear cookies
    const cookies = await chrome.cookies.getAll({ domain: this.domain });
    for (const cookie of cookies) {
      const protocol = cookie.secure ? "https://" : "http://";
      const domainForUrl = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
      const url = `${protocol}${domainForUrl}${cookie.path}`;
      try {
        await chrome.cookies.remove({
          url,
          name: cookie.name,
        });
      } catch (err) {
        console.error(`Failed to remove cookie ${cookie.name}:`, err);
      }
    }

    // 2. Clear localStorage & sessionStorage
    if (tabId) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (
          tab?.url &&
          !tab.url.startsWith("chrome://") &&
          !tab.url.startsWith("chrome-extension://") &&
          !tab.url.startsWith("edge://") &&
          (tab.url.includes(this.domain) ||
            this.hosts.some((h) => tab.url && tab.url.includes(h.replace(/[*:/]/g, ""))))
        ) {
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              try {
                localStorage.clear();
                sessionStorage.clear();
              } catch (e) {}
            },
          });
        }
      } catch (err) {
        console.warn("Could not clear storage via script injection:", err);
      }
    }
  }
}

// Instantiate pre-defined website adapters
export const adapters: Record<string, WebsiteAdapter> = {
  chatgpt: new BaseAdapter("chatgpt", "ChatGPT", "chatgpt.com", "MessageSquareShare"),
  claude: new BaseAdapter("claude", "Claude", "claude.ai", "MessageSquareCode"),
  gemini: new BaseAdapter("gemini", "Gemini", "google.com", "Sparkles", ["*://*.gemini.google.com/*"]),
  github: new BaseAdapter("github", "GitHub", "github.com", "Github"),
  google: new BaseAdapter("google", "Google / Gmail", "google.com", "Mail", ["*://*.mail.google.com/*", "*://*.accounts.google.com/*"]),
  discord: new BaseAdapter("discord", "Discord", "discord.com", "MessageSquare"),
  slack: new BaseAdapter("slack", "Slack", "slack.com", "Slack"),
  notion: new BaseAdapter("notion", "Notion", "notion.so", "BookOpen"),
  figma: new BaseAdapter("figma", "Figma", "figma.com", "PenTool"),
  reddit: new BaseAdapter("reddit", "Reddit", "reddit.com", "Users"),
  x: new BaseAdapter("x", "Twitter / X", "x.com", "Twitter", ["*://*.twitter.com/*"]),
  linkedin: new BaseAdapter("linkedin", "LinkedIn", "linkedin.com", "Linkedin"),
  facebook: new BaseAdapter("facebook", "Facebook", "facebook.com", "Facebook"),
  instagram: new BaseAdapter("instagram", "Instagram", "instagram.com", "Instagram"),
};

// Retrieve matching adapter by URL
export function getAdapterForUrl(urlStr: string): WebsiteAdapter | null {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname;
    
    for (const adapter of Object.values(adapters)) {
      if (hostname === adapter.domain || hostname.endsWith("." + adapter.domain)) {
        return adapter;
      }
      // Check additional hosts matching if applicable
      for (const host of adapter.hosts) {
        if (host.includes(hostname)) {
          return adapter;
        }
      }
    }
  } catch {
    // Invalid URL
  }
  return null;
}
