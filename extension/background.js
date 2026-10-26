/**
 * Zenith Bypass - Background Service Worker (Manifest V3)
 * Handles dynamic PAC script generation, proxy settings, and proxy authentication.
 */

const DEFAULT_DOMAINS = [
  "*.reddit.com",
  "*.redd.it",
  "*.redditmedia.com",
  "*.vimeo.com",
  "*.duckduckgo.com",
  "*.medium.com",
  "*.mangadex.org",
  "*.nyaa.si",
  "*.archive.org",
  "*.v2ex.com"
];

const DEFAULT_CONFIG = {
  enabled: false,
  mode: "selective", // "selective" (PAC routing) or "global" (all traffic)
  proxyProtocol: "HTTPS", // "HTTPS", "SOCKS5", or "HTTP"
  proxyHost: "proxy-sample.koyeb.app",
  proxyPort: 443,
  proxyUsername: "",
  proxyPassword: "",
  domains: DEFAULT_DOMAINS
};

// Initialize configuration on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(null);
  const newConfig = { ...DEFAULT_CONFIG, ...data };
  await chrome.storage.local.set(newConfig);
  await applyProxySettings(newConfig);
  console.log("[Zenith Bypass] Installed and initialized.");
});

// Re-apply proxy settings on browser startup
chrome.runtime.onStartup.addListener(async () => {
  const config = await getConfig();
  await applyProxySettings(config);
});

async function getConfig() {
  const data = await chrome.storage.local.get(null);
  return { ...DEFAULT_CONFIG, ...data };
}

/**
 * Generate a PAC (Proxy Auto-Config) script based on active configuration
 */
function buildPacScript(config) {
  let proto = (config.proxyProtocol || "HTTPS").toUpperCase();
  if (proto === "HTTP") proto = "PROXY";
  const host = (config.proxyHost || "").trim();
  const port = parseInt(config.proxyPort, 10) || 443;
  const proxyDirective = `${proto} ${host}:${port}`;

  if (config.mode === "global") {
    return `function FindProxyForURL(url, host) {
      if (isPlainHostName(host) || host === "127.0.0.1" || host === "localhost") {
        return "DIRECT";
      }
      return "${proxyDirective}; DIRECT";
    }`;
  }

  // Selective Mode: Route only specified domains through the proxy
  const domainList = Array.isArray(config.domains) ? config.domains : DEFAULT_DOMAINS;
  const serializedDomains = JSON.stringify(domainList);

  return `function FindProxyForURL(url, host) {
    if (isPlainHostName(host) || host === "127.0.0.1" || host === "localhost") {
      return "DIRECT";
    }
    var domains = ${serializedDomains};
    for (var i = 0; i < domains.length; i++) {
      if (shExpMatch(host, domains[i])) {
        return "${proxyDirective}; DIRECT";
      }
    }
    return "DIRECT";
  }`;
}

/**
 * Apply proxy rules to the browser
 */
async function applyProxySettings(config) {
  if (!config.enabled || !config.proxyHost) {
    await new Promise((resolve) => {
      chrome.proxy.settings.clear({ scope: "regular" }, resolve);
    });
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: "Zenith Bypass: Disabled" });
    console.log("[Zenith Bypass] Proxy cleared (Direct mode)");
    return;
  }

  const pacData = buildPacScript(config);

  const proxyConfig = {
    mode: "pac_script",
    pacScript: {
      data: pacData
    }
  };

  await new Promise((resolve) => {
    chrome.proxy.settings.set({ value: proxyConfig, scope: "regular" }, resolve);
  });

  const badgeText = config.mode === "global" ? "ALL" : "ON";
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
  chrome.action.setTitle({
    title: `Zenith Bypass: Active (${config.mode === "global" ? "Global Mode" : "Smart Selective"})`
  });

  console.log(`[Zenith Bypass] Proxy active [${config.mode}] -> ${config.proxyProtocol}://${config.proxyHost}:${config.proxyPort}`);
}

/**
 * Handle proxy authentication automatically without popup dialogs
 */
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (!details.isProxy) {
      callback({});
      return;
    }

    chrome.storage.local.get(["proxyUsername", "proxyPassword"], (data) => {
      if (data.proxyUsername && data.proxyPassword) {
        callback({
          authCredentials: {
            username: data.proxyUsername,
            password: data.proxyPassword
          }
        });
      } else {
        callback({});
      }
    });
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

/**
 * Handle runtime messages from popup UI
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === "GET_STATE") {
        const config = await getConfig();
        sendResponse({ success: true, config });
      } else if (message.action === "TOGGLE_ENABLED") {
        const config = await getConfig();
        config.enabled = !config.enabled;
        await chrome.storage.local.set({ enabled: config.enabled });
        await applyProxySettings(config);
        sendResponse({ success: true, enabled: config.enabled });
      } else if (message.action === "UPDATE_CONFIG") {
        const current = await getConfig();
        const updated = { ...current, ...message.config };
        await chrome.storage.local.set(updated);
        await applyProxySettings(updated);
        sendResponse({ success: true, config: updated });
      } else if (message.action === "TEST_PROXY") {
        const config = await getConfig();
        const start = Date.now();
        const testUrl = `${(config.proxyProtocol || "http").toLowerCase()}://${config.proxyHost}:${config.proxyPort}/health`;
        try {
          const res = await fetch(testUrl, { method: "GET", signal: AbortSignal.timeout(5000) });
          const latency = Date.now() - start;
          sendResponse({ success: res.ok, latency, status: res.status });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // Keep channel open for async response
});
