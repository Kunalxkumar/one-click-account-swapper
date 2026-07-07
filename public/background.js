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
  chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
}
chrome.commands.onCommand.addListener(async (command) => {
  console.log(`Keyboard command received: ${command}`);
  if (command === "swap_next_account") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    const domain = getDomain(tab.url);
    if (!domain) return;
    chrome.storage.local.get(["accounts", "activeSessions"], (result) => {
      const accounts = result.accounts || [];
      const activeSessions = result.activeSessions || {};
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
      chrome.runtime.sendMessage({
        action: "trigger_swap",
        accountId: nextAccount.id,
        tabId: tab.id
      });
    });
  }
});
