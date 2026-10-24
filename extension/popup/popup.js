/**
 * Zenith Bypass - Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const mainToggle = document.getElementById("mainToggle");
  const heroCard = document.querySelector(".hero-card");
  const heroStatusText = document.getElementById("heroStatusText");
  const heroModeText = document.getElementById("heroModeText");
  const statusBadge = document.getElementById("statusBadge");

  const modeSelectiveBtn = document.getElementById("modeSelectiveBtn");
  const modeGlobalBtn = document.getElementById("modeGlobalBtn");
  const activeNodeLabel = document.getElementById("activeNodeLabel");
  const latencyLabel = document.getElementById("latencyLabel");
  const testProxyBtn = document.getElementById("testProxyBtn");
  const testRedditBtn = document.getElementById("testRedditBtn");

  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  const domainCount = document.getElementById("domainCount");
  const domainList = document.getElementById("domainList");
  const newDomainInput = document.getElementById("newDomainInput");
  const addDomainBtn = document.getElementById("addDomainBtn");
  const resetDomainsBtn = document.getElementById("resetDomainsBtn");

  const settingsForm = document.getElementById("settingsForm");
  const proxyProtocol = document.getElementById("proxyProtocol");
  const proxyHost = document.getElementById("proxyHost");
  const proxyPort = document.getElementById("proxyPort");
  const proxyUsername = document.getElementById("proxyUsername");
  const proxyPassword = document.getElementById("proxyPassword");

  let currentConfig = null;

  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(tabId)?.classList.add("active");
    });
  });

  // Fetch initial state
  async function loadState() {
    try {
      const response = await chrome.runtime.sendMessage({ action: "GET_STATE" });
      if (response && response.success) {
        currentConfig = response.config;
        renderUI(currentConfig);
      }
    } catch (err) {
      console.error("Failed to load extension state:", err);
    }
  }

  function renderUI(config) {
    if (!config) return;

    // Toggle & Hero
    mainToggle.checked = !!config.enabled;
    if (config.enabled) {
      heroCard.classList.add("active");
      statusBadge.className = "status-badge badge-on";
      statusBadge.querySelector(".badge-label").textContent = "ACTIVE";
      heroStatusText.textContent = "Bypass Protected";
      heroModeText.textContent = config.mode === "global" ? "Routing all traffic" : "Smart routing active";
    } else {
      heroCard.classList.remove("active");
      statusBadge.className = "status-badge badge-off";
      statusBadge.querySelector(".badge-label").textContent = "OFFLINE";
      heroStatusText.textContent = "Protection Inactive";
      heroModeText.textContent = "Click to enable smart routing";
    }

    // Modes
    if (config.mode === "global") {
      modeGlobalBtn.classList.add("active");
      modeSelectiveBtn.classList.remove("active");
    } else {
      modeSelectiveBtn.classList.add("active");
      modeGlobalBtn.classList.remove("active");
    }

    // Active Node
    if (config.proxyHost) {
      activeNodeLabel.textContent = `${config.proxyProtocol}://${config.proxyHost}:${config.proxyPort}`;
    } else {
      activeNodeLabel.textContent = "Not configured";
    }

    // Form fields
    proxyProtocol.value = config.proxyProtocol || "HTTPS";
    proxyHost.value = config.proxyHost || "";
    proxyPort.value = config.proxyPort || 443;
    proxyUsername.value = config.proxyUsername || "";
    proxyPassword.value = config.proxyPassword || "";

    // Domains
    renderDomains(config.domains || []);
  }

  function renderDomains(domains) {
    domainCount.textContent = domains.length;
    domainList.innerHTML = "";

    if (domains.length === 0) {
      domainList.innerHTML = '<li class="domain-item" style="justify-content:center;color:#64748b;">No domains configured</li>';
      return;
    }

    domains.forEach((domain, index) => {
      const li = document.createElement("li");
      li.className = "domain-item";
      li.innerHTML = `
        <span>${escapeHtml(domain)}</span>
        <button class="domain-del-btn" data-index="${index}" title="Remove domain">&times;</button>
      `;
      domainList.appendChild(li);
    });

    // Delete buttons
    domainList.querySelectorAll(".domain-del-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (!isNaN(idx) && currentConfig && currentConfig.domains) {
          const updatedDomains = [...currentConfig.domains];
          updatedDomains.splice(idx, 1);
          await updateConfig({ domains: updatedDomains });
        }
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function updateConfig(partial) {
    const res = await chrome.runtime.sendMessage({
      action: "UPDATE_CONFIG",
      config: partial
    });
    if (res && res.success) {
      currentConfig = res.config;
      renderUI(currentConfig);
    }
  }

  // Toggle main protection
  mainToggle.addEventListener("change", async () => {
    const res = await chrome.runtime.sendMessage({ action: "TOGGLE_ENABLED" });
    if (res && res.success) {
      if (currentConfig) currentConfig.enabled = res.enabled;
      renderUI(currentConfig);
    }
  });

  // Switch modes
  modeSelectiveBtn.addEventListener("click", async () => {
    if (currentConfig && currentConfig.mode !== "selective") {
      await updateConfig({ mode: "selective" });
    }
  });

  modeGlobalBtn.addEventListener("click", async () => {
    if (currentConfig && currentConfig.mode !== "global") {
      await updateConfig({ mode: "global" });
    }
  });

  // Add Domain
  function handleAddDomain() {
    let domain = newDomainInput.value.trim().toLowerCase();
    if (!domain) return;

    if (!domain.startsWith("*.") && !domain.startsWith(".")) {
      // Auto-prefix wildcard if naked domain
      domain = `*.${domain}`;
    }

    const domains = currentConfig.domains || [];
    if (!domains.includes(domain)) {
      const updatedDomains = [...domains, domain];
      updateConfig({ domains: updatedDomains });
    }
    newDomainInput.value = "";
  }

  addDomainBtn.addEventListener("click", handleAddDomain);
  newDomainInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDomain();
    }
  });

  // Reset Domains
  resetDomainsBtn.addEventListener("click", async () => {
    if (confirm("Reset domain list to default blocked sites?")) {
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
      await updateConfig({ domains: DEFAULT_DOMAINS });
    }
  });

  // Settings Form submit
  settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const configUpdate = {
      proxyProtocol: proxyProtocol.value,
      proxyHost: proxyHost.value.trim(),
      proxyPort: parseInt(proxyPort.value, 10) || 443,
      proxyUsername: proxyUsername.value.trim(),
      proxyPassword: proxyPassword.value.trim()
    };

    await updateConfig(configUpdate);
    alert("Server configuration saved!");
  });

  // Test Proxy latency
  testProxyBtn.addEventListener("click", async () => {
    latencyLabel.textContent = "Pinging...";
    latencyLabel.style.color = "#94a3b8";

    const res = await chrome.runtime.sendMessage({ action: "TEST_PROXY" });
    if (res && res.success) {
      latencyLabel.textContent = `${res.latency} ms (Online)`;
      latencyLabel.style.color = "#10b981";
    } else {
      latencyLabel.textContent = "Failed / Unreachable";
      latencyLabel.style.color = "#ef4444";
    }
  });

  // Test Reddit
  testRedditBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://www.reddit.com" });
  });

  // Init
  loadState();
});
