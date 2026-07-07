// Background service worker for One-Click Account Swapper

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
      // Compare domain loosely (e.g. claude.ai matches claude.ai or subdomains)
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
  chrome.action.setBadgeBackgroundColor({ color: "#6366f1" }); // Indigo badge
}

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  console.log(`Keyboard command received: ${command}`);
  if (command === "swap_next_account") {
    // Implement quick swapping of accounts
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    const domain = getDomain(tab.url);
    if (!domain) return;

    chrome.storage.local.get(["accounts", "activeSessions"], (result) => {
      const accounts = (result.accounts || []) as any[];
      const activeSessions = (result.activeSessions || {}) as Record<string, string>;
      
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
      
      // Notify popup/UI to perform swap, or send a message
      chrome.runtime.sendMessage({
        action: "trigger_swap",
        accountId: nextAccount.id,
        tabId: tab.id
      });
    });
  }
});
