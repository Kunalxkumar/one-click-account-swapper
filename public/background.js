// src/lib/crypto.ts
function hexToBuffer(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
async function decryptData(encryptedStr, password) {
  try {
    const payload = JSON.parse(encryptedStr);
    const salt = new Uint8Array(hexToBuffer(payload.salt));
    const iv = new Uint8Array(hexToBuffer(payload.iv));
    const ciphertext = hexToBuffer(payload.ciphertext);
    const key = await deriveKey(password, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      ciphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error("Decryption failed:", err);
    throw new Error("Decryption failed. Please check your master password.");
  }
}

// src/background/index.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log("One-Click Account Swapper Extension installed.");
  updateBadge(null);
});
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
function getDomain(urlStr) {
  if (!urlStr) return null;
  try {
    const url = new URL(urlStr);
    return url.hostname;
  } catch {
    return null;
  }
}
async function updateBadgeForTab(tab) {
  const domain = getDomain(tab.url);
  if (!domain) {
    updateBadge(null);
    return;
  }
  chrome.storage.local.get(["accounts"], (result) => {
    const accounts = result.accounts || [];
    const siteAccounts = accounts.filter((acc) => {
      return domain.includes(acc.websiteDomain) || acc.websiteDomain.includes(domain);
    });
    if (siteAccounts.length > 0) {
      updateBadge(siteAccounts.length.toString());
    } else {
      updateBadge(null);
    }
  });
}
function updateBadge(text) {
  chrome.action.setBadgeText({ text: text || "" });
  chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
}
chrome.commands.onCommand.addListener(async (command) => {
  console.log(`Keyboard command received: ${command}`);
  if (command === "swap_next_account") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url) return;
    const domain = getDomain(tab.url);
    if (!domain) return;
    chrome.storage.session.get(["sessionMasterPassword"], async (sessionRes) => {
      const password = sessionRes?.sessionMasterPassword || "";
      if (!password) {
        chrome.action.setBadgeText({ text: "LOCK" });
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
        setTimeout(() => updateBadgeForTab(tab), 2500);
        return;
      }
      chrome.storage.local.get(["accounts", "activeSessions"], async (localRes) => {
        const accounts = localRes.accounts || [];
        const activeSessions = localRes.activeSessions || {};
        const siteAccounts = accounts.filter(
          (acc) => domain.includes(acc.websiteDomain) || acc.websiteDomain.includes(domain)
        );
        if (siteAccounts.length <= 1) return;
        const currentActiveId = activeSessions[domain];
        let nextIndex = 0;
        if (currentActiveId) {
          const currentIndex = siteAccounts.findIndex((acc) => acc.id === currentActiveId);
          if (currentIndex !== -1) {
            nextIndex = (currentIndex + 1) % siteAccounts.length;
          }
        }
        const nextAccount = siteAccounts[nextIndex];
        try {
          const decryptedSessionStr = await decryptData(nextAccount.encryptedSession, password);
          const sessionData = JSON.parse(decryptedSessionStr);
          if (Array.isArray(sessionData.cookies)) {
            const currentCookies = await chrome.cookies.getAll({ domain: nextAccount.websiteDomain });
            for (const cookie of currentCookies) {
              const protocol = cookie.secure ? "https://" : "http://";
              const domainForUrl = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
              const url = `${protocol}${domainForUrl}${cookie.path}`;
              try {
                await chrome.cookies.remove({ url, name: cookie.name });
              } catch {
              }
            }
            for (const cookie of sessionData.cookies) {
              const protocol = cookie.secure ? "https://" : "http://";
              const domainForUrl = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
              const url = `${protocol}${domainForUrl}${cookie.path}`;
              const details = {
                url,
                name: cookie.name,
                value: cookie.value,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite
              };
              if (!cookie.hostOnly && !cookie.name.startsWith("__Host-")) {
                details.domain = cookie.domain;
              }
              if (details.sameSite === "no_restriction" && !details.secure) {
                details.secure = true;
              }
              if (cookie.expirationDate !== void 0) {
                details.expirationDate = cookie.expirationDate;
              }
              try {
                await chrome.cookies.set(details);
              } catch {
              }
            }
          }
          if (tab.id && tab.url && (Object.keys(sessionData.localStorage || {}).length > 0 || Object.keys(sessionData.sessionStorage || {}).length > 0)) {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (ls, ss) => {
                  try {
                    localStorage.clear();
                    for (const [k, v] of Object.entries(ls)) {
                      localStorage.setItem(k, v);
                    }
                  } catch {
                  }
                  try {
                    sessionStorage.clear();
                    for (const [k, v] of Object.entries(ss)) {
                      sessionStorage.setItem(k, v);
                    }
                  } catch {
                  }
                },
                args: [sessionData.localStorage, sessionData.sessionStorage]
              });
            } catch (err) {
              console.warn("Storage injection failed in background:", err);
            }
          }
          activeSessions[domain] = nextAccount.id;
          await chrome.storage.local.set({ activeSessions });
          if (tab.id) {
            chrome.tabs.reload(tab.id);
          }
          chrome.action.setBadgeText({ text: "OK" });
          chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
          setTimeout(() => updateBadgeForTab(tab), 2e3);
        } catch (err) {
          console.error("Background quick-swap failed:", err);
        }
      });
    });
  }
});
