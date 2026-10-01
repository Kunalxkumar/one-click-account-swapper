// Background service worker for One-Click Account Swapper
import { decryptData } from "../lib/crypto";

chrome.runtime.onInstalled.addListener(() => {
  console.log("One-Click Account Swapper Extension installed.");
  updateBadge(null);
});

// Update the badge when the active tab changes or updates
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    updateBadgeForTab(tab);
  } catch (err) {
    console.error("Error updating badge on tab activated:", err);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    updateBadgeForTab(tab);
  }
});

// Helper to extract domain from URL
function getDomain(urlStr?: string): string | null {
  if (!urlStr) return null;
  try {
    const url = new URL(urlStr);
    return url.hostname;
  } catch {
    return null;
  }
}

// Update badge text based on active page
async function updateBadgeForTab(tab: chrome.tabs.Tab) {
  const domain = getDomain(tab.url);
  if (!domain) {
    updateBadge(null);
    return;
  }

  chrome.storage.local.get(["accounts"], (result) => {
    const accounts = (result.accounts || []) as any[];
    const siteAccounts = accounts.filter((acc: any) => {
      return domain.includes(acc.websiteDomain) || acc.websiteDomain.includes(domain);
    });

    if (siteAccounts.length > 0) {
      updateBadge(siteAccounts.length.toString());
    } else {
      updateBadge(null);
    }
  });
}

function updateBadge(text: string | null) {
  chrome.action.setBadgeText({ text: text || "" });
  chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" }); // Signal amber badge
}

// Listen for keyboard commands (e.g. Alt+Shift+Right)
chrome.commands.onCommand.addListener(async (command) => {
  console.log(`Keyboard command received: ${command}`);
  if (command === "swap_next_account") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url) return;

    const domain = getDomain(tab.url);
    if (!domain) return;

    // Check session password in RAM storage
    chrome.storage.session.get(["sessionMasterPassword"], async (sessionRes) => {
      const password = (sessionRes?.sessionMasterPassword || "") as string;
      if (!password) {
        // Indicate locked state on badge
        chrome.action.setBadgeText({ text: "LOCK" });
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
        setTimeout(() => updateBadgeForTab(tab), 2500);
        return;
      }

      chrome.storage.local.get(["accounts", "activeSessions"], async (localRes) => {
        const accounts = (localRes.accounts || []) as any[];
        const activeSessions = (localRes.activeSessions || {}) as Record<string, string>;

        const siteAccounts = accounts.filter((acc: any) =>
          domain.includes(acc.websiteDomain) || acc.websiteDomain.includes(domain)
        );

        if (siteAccounts.length <= 1) return;

        // Find the current active account ID for this site
        const currentActiveId = activeSessions[domain];
        let nextIndex = 0;

        if (currentActiveId) {
          const currentIndex = siteAccounts.findIndex((acc: any) => acc.id === currentActiveId);
          if (currentIndex !== -1) {
            nextIndex = (currentIndex + 1) % siteAccounts.length;
          }
        }

        const nextAccount = siteAccounts[nextIndex];
        try {
          // Decrypt session
          const decryptedSessionStr = await decryptData(nextAccount.encryptedSession, password);
          const sessionData = JSON.parse(decryptedSessionStr);

          // Restore cookies
          if (Array.isArray(sessionData.cookies)) {
            // Clear current cookies for domain
            const currentCookies = await chrome.cookies.getAll({ domain: nextAccount.websiteDomain });
            for (const cookie of currentCookies) {
              const protocol = cookie.secure ? "https://" : "http://";
              const domainForUrl = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
              const url = `${protocol}${domainForUrl}${cookie.path}`;
              try {
                await chrome.cookies.remove({ url, name: cookie.name });
              } catch {}
            }

            // Set new cookies
            for (const cookie of sessionData.cookies) {
              const protocol = cookie.secure ? "https://" : "http://";
              const domainForUrl = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
              const url = `${protocol}${domainForUrl}${cookie.path}`;
              const details: chrome.cookies.SetDetails = {
                url,
                name: cookie.name,
                value: cookie.value,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
              };

              if (!cookie.hostOnly && !cookie.name.startsWith("__Host-")) {
                details.domain = cookie.domain;
              }
              if (details.sameSite === "no_restriction" && !details.secure) {
                details.secure = true;
              }
              if (cookie.expirationDate !== undefined) {
                details.expirationDate = cookie.expirationDate;
              }

              try {
                await chrome.cookies.set(details);
              } catch {}
            }
          }

          // Restore localStorage/sessionStorage via scripting if matching tab
          if (
            tab.id &&
            tab.url &&
            (Object.keys(sessionData.localStorage || {}).length > 0 ||
              Object.keys(sessionData.sessionStorage || {}).length > 0)
          ) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (ls, ss) => {
                  try {
                    localStorage.clear();
                    for (const [k, v] of Object.entries(ls)) {
                      localStorage.setItem(k, v as string);
                    }
                  } catch {}
                  try {
                    sessionStorage.clear();
                    for (const [k, v] of Object.entries(ss)) {
                      sessionStorage.setItem(k, v as string);
                    }
                  } catch {}
                },
                args: [sessionData.localStorage, sessionData.sessionStorage],
              });
            } catch (err) {
              console.warn("Storage injection failed in background:", err);
            }
          }

          // Update active sessions & reload tab
          activeSessions[domain] = nextAccount.id;
          await chrome.storage.local.set({ activeSessions });

          if (tab.id) {
            chrome.tabs.reload(tab.id);
          }

          // Show temporary checkmark badge
          chrome.action.setBadgeText({ text: "OK" });
          chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
          setTimeout(() => updateBadgeForTab(tab), 2000);
        } catch (err) {
          console.error("Background quick-swap failed:", err);
        }
      });
    });
  }
});
