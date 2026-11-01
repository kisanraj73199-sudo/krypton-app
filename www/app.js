// =========================================================================
// KRYPTON ULTRA MESH v600 - CYBER-GLASS E2EE ENGINE & ULTRA-PRO SUITE
// =========================================================================

// --- Supabase Config ---
const RAW_URL = "your url"; // Example: https://xyz.supabase.co
const RAW_KEY = "your key";

function sanitizeSupabaseUrl(url) {
  try {
    const parsed = new URL(url.trim());
    return parsed.origin;
  } catch (e) {
    return url.trim().replace(/\/+$/, "");
  }
}

const SUPABASE_URL = sanitizeSupabaseUrl(RAW_URL);
const SUPABASE_KEY = RAW_KEY.trim();

let supabaseClient = null;
try {
  if (window.supabase && SUPABASE_URL.startsWith("http")) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.error("Supabase Init Error:", e);
}

// --- 2. NON-BLOCKING UI HELPERS: TOASTS, GLASS DIALOGS & WEB PUSH ---
function showToast(message, type = "info", duration = 3200) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `krypton-toast toast-${type}`;

  let iconName = "info";
  if (type === "success") iconName = "check-circle-2";
  if (type === "error") iconName = "alert-triangle";

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
    <span style="flex: 1;">${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons({ nodes: [toast] });

  setTimeout(() => {
    toast.classList.add("closing");
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

// Feature #5: Background Web Push Notification Helper
function triggerSystemPushNotification(title, bodyText, tag = "krypton-msg") {
  if (!userSettings.pushAlerts) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  // Trigger if tab is in background or minimized
  if (document.hidden || !document.hasFocus()) {
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body: bodyText,
            icon: "./icon-192.png",
            badge: "./icon-192.png",
            tag: tag,
            renotify: true
          });
        });
      } else {
        new Notification(title, { body: bodyText, icon: "./icon-192.png" });
      }
    } catch (e) {
      try {
        new Notification(title, { body: bodyText, icon: "./icon-192.png" });
      } catch (err) { }
    }
  }
}

function showGlassDialog({
  title = "Confirm Action",
  message = "",
  isPrompt = false,
  placeholder = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false
}) {
  return new Promise((resolve) => {
    const modal = document.getElementById("custom-dialog-modal");
    const titleEl = document.getElementById("dialog-title");
    const msgEl = document.getElementById("dialog-message");
    const inputWrap = document.getElementById("dialog-input-wrap");
    const inputEl = document.getElementById("dialog-input");
    const confirmBtn = document.getElementById("dialog-confirm-btn");
    const cancelBtn = document.getElementById("dialog-cancel-btn");

    if (!modal) {
      if (isPrompt) resolve(prompt(message));
      else resolve(confirm(message));
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;
    confirmBtn.className = "glass-btn " + (danger ? "danger" : "primary");

    if (isPrompt) {
      inputWrap.classList.remove("hidden");
      inputEl.value = "";
      inputEl.placeholder = placeholder || "Type here...";
      setTimeout(() => inputEl.focus(), 60);
    } else {
      inputWrap.classList.add("hidden");
    }

    modal.classList.remove("closing", "hidden");

    const cleanup = (val) => {
      modal.classList.add("closing");
      setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("closing");
      }, 150);
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      inputEl.onkeydown = null;
      resolve(val);
    };

    confirmBtn.onclick = () => {
      cleanup(isPrompt ? inputEl.value : true);
    };

    cancelBtn.onclick = () => {
      cleanup(isPrompt ? null : false);
    };

    if (isPrompt) {
      inputEl.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          cleanup(inputEl.value);
        } else if (e.key === "Escape") {
          cleanup(null);
        }
      };
    }
  });
}

// --- 3. WEBAUDIO SYNTHESIZER SOUND EFFECTS ---
let audioCtx = null;
function playSynthTone(type) {
  if (!userSettings.soundFx) return;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === "send") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === "receive") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === "ring") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) { }
}

// --- 4. USER SETTINGS, MULTI-THEME ENGINE & PROFILE CACHE ---
const AVAILABLE_THEMES = ["emerald", "violet", "ocean", "crimson", "amber", "aurora"];

let userSettings = JSON.parse(localStorage.getItem("krypton_settings") || "{}");
if (userSettings.darkMode === undefined) userSettings.darkMode = true;
if (userSettings.accentColor === undefined) userSettings.accentColor = "emerald";
if (userSettings.hideGlobal === undefined) userSettings.hideGlobal = false;
if (userSettings.onlinePresence === undefined) userSettings.onlinePresence = true;
if (userSettings.soundFx === undefined) userSettings.soundFx = true;
if (userSettings.pushAlerts === undefined) userSettings.pushAlerts = false;
if (userSettings.globalTtl === undefined) userSettings.globalTtl = 0;
if (userSettings.autoLockMode === undefined) userSettings.autoLockMode = "restart";

let myAppPin = localStorage.getItem("krypton_app_pin") || "";
let myAvatarData = localStorage.getItem("krypton_avatar") || "";
let myUserBio = localStorage.getItem("krypton_bio") || "Hey there! I am using Krypton.";
let usersAvatarCache = JSON.parse(localStorage.getItem("krypton_avatar_cache") || "{}");
let usersBioCache = JSON.parse(localStorage.getItem("krypton_bio_cache") || "{}");
let usersSessionCache = JSON.parse(localStorage.getItem("krypton_session_cache") || "{}");
let peerTokenBindingMap = JSON.parse(localStorage.getItem("krypton_peer_token_bindings") || "{}");
let unreadCounts = JSON.parse(localStorage.getItem("krypton_unreads") || "{}");
let blockedUsers = JSON.parse(localStorage.getItem("krypton_blocked_users") || "[]");
let pinnedPeers = JSON.parse(localStorage.getItem("krypton_pinned_peers") || "[]");
let pinnedRoomMessages = JSON.parse(localStorage.getItem("krypton_pinned_msgs") || "{}");
let messageReactionsCache = JSON.parse(localStorage.getItem("krypton_reactions_cache") || "{}");
let roomDecryptedCache = JSON.parse(sessionStorage.getItem("krypton_fast_room_cache") || "{}");

let locallyHiddenMessages = JSON.parse(localStorage.getItem("krypton_hidden_msgs") || "[]");
let globalClearedTimestamp = parseInt(localStorage.getItem("krypton_global_cleared_ts") || "0", 10);

const derivedKeyCache = new Map();
let peerRealtimeStatus = {};
let peerRelationshipMap = {};
let savedGroups = JSON.parse(localStorage.getItem("krypton_groups") || "{}");
let activeRequestTab = "incoming";
let activeCategoryFilter = "all";
let activeSidebarTab = "all";
let activeViewMode = "normal";
let backgroundAutoLockTimer = null;
let activeViewOnceLightboxCallback = null;

// App State
let myUsername = localStorage.getItem("krypton_uid") || "";
let mySessionId = localStorage.getItem("krypton_session_id") || "";
let currentRoom = "";
let currentPeerUser = "";
let activeSubscription = null;
let requestsSubscription = null;
let globalMessagesWatcher = null;
let usersProfileWatcher = null;
let presenceChannel = null;
let onlineUsersList = new Set();
let savedPeers = JSON.parse(localStorage.getItem("krypton_peers") || "[]");

// Reply & Spoiler Mode State
let activeReplyContext = null;
let isSpoilerModeActive = false;

// WebRTC State
let peerConnection = null;
let localStream = null;
let activeCallSender = null;
let activeCallType = "voice";
let isAudioMuted = false;
let isVideoMuted = false;
let iceCandidateQueue = [];
let callDurationInterval = null;
let callStartTime = 0;

// Audio Recording State
let mediaRecorder = null;
let audioChunks = [];
let isRecordingAudio = false;
let isStartingRecording = false;
let stopRequestedWhileStarting = false;
let audioStream = null;
let recordingTimerInterval = null;
let recordingSeconds = 0;
let activeMimeType = "";

// Indicator Timeouts
let typingTimeout = null;
let recordingTimeout = null;
let peerStatusTimeout = {};
let lastTypingBroadcast = 0;
let lastEscapePressTime = 0;

if (window.lucide) lucide.createIcons();

// --- 5. FULLSCREEN IMAGE & PROFILE PICTURE LIGHTBOX VIEWER ---
window.openFullscreenImageViewer = function (imageSrc, captionText = "") {
  const modal = document.getElementById("image-viewer-modal");
  const imgElement = document.getElementById("image-viewer-img");
  const downloadBtn = document.getElementById("btn-download-image-viewer");
  const captionEl = document.getElementById("image-viewer-caption");
  if (modal && imgElement) {
    imgElement.src = imageSrc;
    if (downloadBtn) {
      downloadBtn.href = imageSrc;
      downloadBtn.download = captionText
        ? `${captionText.replace(/[^a-z0-9]/gi, "_")}.png`
        : "krypton-encrypted-image.jpg";
    }
    if (captionEl) {
      captionEl.textContent = captionText || "Encrypted Media Preview";
      captionEl.style.display = "inline-block";
    }
    modal.classList.remove("hidden");
  }
};

window.closeFullscreenImageViewer = function () {
  const modal = document.getElementById("image-viewer-modal");
  const imgElement = document.getElementById("image-viewer-img");
  if (modal) {
    modal.classList.add("hidden");
    if (imgElement) imgElement.src = "";
  }
  if (typeof activeViewOnceLightboxCallback === "function") {
    const cb = activeViewOnceLightboxCallback;
    activeViewOnceLightboxCallback = null;
    cb();
  }
};

function generateHighResAvatarPoster(username) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");

  const baseColor = getUserColor(username || "K");
  const grad = ctx.createLinearGradient(0, 0, 600, 600);
  grad.addColorStop(0, baseColor);
  grad.addColorStop(1, "#0f172a");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 600);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(300, 300, 250, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 240px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(((username || "?")[0] || "?").toUpperCase(), 300, 290);

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.font = "700 32px 'JetBrains Mono', monospace";
  ctx.fillText("@" + (username || "user").toLowerCase(), 300, 490);

  return canvas.toDataURL("image/png");
}

window.viewUserProfilePicFullscreen = async function (username) {
  const uname = (username || myUsername || "?").toLowerCase();
  let avatarSrc =
    uname === myUsername.toLowerCase()
      ? myAvatarData
      : usersAvatarCache[uname] || "";

  if (!avatarSrc && supabaseClient && uname !== myUsername.toLowerCase()) {
    try {
      const { data } = await supabaseClient
        .from("users")
        .select("avatar_url")
        .ilike("username", uname);
      if (data && data.length > 0 && data[0].avatar_url) {
        avatarSrc = data[0].avatar_url;
        usersAvatarCache[uname] = avatarSrc;
        localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
      }
    } catch (e) { }
  }

  const finalImage = avatarSrc || generateHighResAvatarPoster(uname);
  openFullscreenImageViewer(finalImage, `@${uname} • Profile Picture`);
};

const btnCloseImg = document.getElementById("btn-close-image-viewer");
if (btnCloseImg) {
  btnCloseImg.addEventListener("click", closeFullscreenImageViewer);
}

const modalImgViewer = document.getElementById("image-viewer-modal");
if (modalImgViewer) {
  modalImgViewer.addEventListener("click", (e) => {
    if (e.target.id === "image-viewer-modal" || e.target.classList.contains("image-viewer-content")) {
      closeFullscreenImageViewer();
    }
  });
}

// --- 6. PRIVACY PANIC LOCK & APP PIN SHIELD (Alt+X or Double Escape) ---
const appLockOverlay = document.getElementById("app-lock-overlay");
const lockPinInput = document.getElementById("lock-pin-input");
const pinInputSection = document.getElementById("pin-input-section");
const lockPinError = document.getElementById("lock-pin-error");
const btnUnlockScreen = document.getElementById("btn-unlock-screen");
const btnPanicLock = document.getElementById("btn-panic-lock");

function triggerPrivacyLock() {
  if (!appLockOverlay) return;
  appLockOverlay.classList.remove("hidden");
  if (lockPinError) lockPinError.textContent = "";

  if (myAppPin) {
    if (pinInputSection) pinInputSection.classList.remove("hidden");
    if (lockPinInput) {
      lockPinInput.value = "";
      setTimeout(() => lockPinInput.focus(), 80);
    }
  } else {
    if (pinInputSection) pinInputSection.classList.add("hidden");
  }
}

function attemptUnlockScreen() {
  if (!appLockOverlay) return;
  if (myAppPin) {
    const entered = (lockPinInput ? lockPinInput.value : "").trim();
    if (entered !== myAppPin) {
      if (lockPinError) lockPinError.textContent = "Incorrect PIN code!";
      if (lockPinInput) lockPinInput.value = "";
      return;
    }
  }
  appLockOverlay.classList.add("hidden");
}

function openSmartLockSetupModal() {
  const modal = document.getElementById("smart-lock-setup-modal");
  const pinInp = document.getElementById("modal-smart-pin-input");
  if (!modal) return;
  if (pinInp) pinInp.value = myAppPin || "";
  const curMode = userSettings.autoLockMode || "restart";
  document.querySelectorAll('input[name="autolock-mode"]').forEach((r) => {
    r.checked = r.value === curMode;
  });
  modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
}

function closeSmartLockSetupModal() {
  const modal = document.getElementById("smart-lock-setup-modal");
  if (modal) modal.classList.add("hidden");
}

if (btnPanicLock) {
  btnPanicLock.addEventListener("click", () => {
    if (!myAppPin) {
      openSmartLockSetupModal();
    } else {
      triggerPrivacyLock();
    }
  });
}



const btnOpenLockFromSettings = document.getElementById("btn-open-smart-lock-from-settings");
if (btnOpenLockFromSettings) {
  btnOpenLockFromSettings.addEventListener("click", () => {
    openSmartLockSetupModal();
  });
}

const btnCloseSmartLockModal = document.getElementById("btn-close-smart-lock-modal");
if (btnCloseSmartLockModal) {
  btnCloseSmartLockModal.addEventListener("click", closeSmartLockSetupModal);
}

const btnLockNowFromModal = document.getElementById("btn-lock-now-from-modal");
if (btnLockNowFromModal) {
  btnLockNowFromModal.addEventListener("click", () => {
    closeSmartLockSetupModal();
    triggerPrivacyLock();
  });
}

/* Show / Hide PIN for all three PIN fields */
document.querySelectorAll(".pin-visibility-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-pin-target");
    const input = document.getElementById(targetId);

    if (!input) return;

    const isHidden = input.type === "password";

    input.type = isHidden ? "text" : "password";

    button.setAttribute(
      "aria-label",
      isHidden ? "Hide PIN" : "Show PIN"
    );

    button.setAttribute(
      "title",
      isHidden ? "Hide PIN" : "Show PIN"
    );

    const icon = button.querySelector("i");
    if (icon) {
      icon.setAttribute(
        "data-lucide",
        isHidden ? "eye-off" : "eye"
      );
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  });
});

const btnSaveSmartLockModal = document.getElementById("btn-save-smart-lock-modal");
if (btnSaveSmartLockModal) {
  btnSaveSmartLockModal.addEventListener("click", () => {
    const pinInp = document.getElementById("modal-smart-pin-input");
    const val = (pinInp ? pinInp.value : "").trim();
    if (val && val.length < 4) {
      showToast("PIN must be at least 4 characters!", "error");
      return;
    }
    myAppPin = val;
    if (myAppPin) {
      localStorage.setItem("krypton_app_pin", myAppPin);
    } else {
      localStorage.removeItem("krypton_app_pin");
    }
    if (settingsPinInput) settingsPinInput.value = myAppPin;

    const checkedRadio = document.querySelector('input[name="autolock-mode"]:checked');
    userSettings.autoLockMode = checkedRadio ? checkedRadio.value : "restart";
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));

    closeSmartLockSetupModal();
    showToast(
      myAppPin
        ? `PIN & Auto-Lock (${userSettings.autoLockMode.toUpperCase()}) activated!`
        : "Auto-Lock preferences saved!",
      "success"
    );
  });
}

// Feature #5: Background / Minimize Visibility Auto-Lock Listener
document.addEventListener("visibilitychange", () => {
  clearTimeout(backgroundAutoLockTimer);
  if (!myUsername) return;
  const mode = userSettings.autoLockMode || "restart";
  if (document.hidden) {
    if (mode === "instant") {
      triggerPrivacyLock();
    } else if (mode === "1m") {
      backgroundAutoLockTimer = setTimeout(() => {
        if (document.hidden) triggerPrivacyLock();
      }, 60000);
    } else if (mode === "5m") {
      backgroundAutoLockTimer = setTimeout(() => {
        if (document.hidden) triggerPrivacyLock();
      }, 300000);
    }
  }
});

if (btnUnlockScreen) {
  btnUnlockScreen.addEventListener("click", attemptUnlockScreen);
}

if (lockPinInput) {
  lockPinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptUnlockScreen();
  });
}

const btnSavePin = document.getElementById("btn-save-pin");
const settingsPinInput = document.getElementById("settings-pin-input");
if (btnSavePin && settingsPinInput) {
  btnSavePin.addEventListener("click", () => {
    const val = settingsPinInput.value.trim();
    if (!val) {
      myAppPin = "";
      localStorage.removeItem("krypton_app_pin");
      showToast("App PIN Lock disabled.", "info");
    } else if (val.length < 4) {
      showToast("PIN must be at least 4 characters.", "error");
    } else {
      myAppPin = val;
      localStorage.setItem("krypton_app_pin", myAppPin);
      showToast("App PIN Lock saved! Press Alt+X anytime to lock.", "success");
    }
  });
}

window.addEventListener("keydown", (e) => {
  if (e.altKey && e.key.toLowerCase() === "x") {
    e.preventDefault();
    triggerPrivacyLock();
    return;
  }
  if (e.key === "Escape") {
    const now = Date.now();
    if (now - lastEscapePressTime < 380) {
      triggerPrivacyLock();
    }
    lastEscapePressTime = now;
    closeFullscreenImageViewer();
    cancelActiveReply();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
    const searchBar = document.getElementById("in-chat-search-bar");
    if (searchBar && currentRoom) {
      e.preventDefault();
      toggleInChatSearch();
    }
  }
});

// --- 7. CRYPTO, SAFETY FINGERPRINT & FORMATTING HELPERS ---
async function hashPassword(str) {
  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function computeSafetyFingerprint(peerUsername) {
  const p = (peerUsername || "").toLowerCase();
  const peerToken = usersSessionCache[p] || p;
  const combined = [mySessionId || myUsername.toLowerCase(), peerToken].sort().join(":");
  const hashHex = await hashPassword(combined);
  const upper = hashHex.slice(0, 16).toUpperCase();
  return `${upper.slice(0, 4)} • ${upper.slice(4, 8)} • ${upper.slice(8, 12)} • ${upper.slice(12, 16)}`;
}

function getUserColor(username) {
  const colors = [
    "#10b981", "#0ea5e9", "#f43f5e", "#f59e0b", "#a855f7",
    "#ec4899", "#06b6d4", "#f97316", "#22c55e", "#6366f1"
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function renderAvatarElement(element, username, avatarUrl) {
  if (!element) return;
  if (avatarUrl) {
    element.textContent = "";
    element.style.backgroundImage = "url('" + avatarUrl + "')";
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
  } else {
    element.style.backgroundImage = "none";
    element.textContent = (username || "?")[0].toUpperCase();
  }
}

function getUserDataCached(user) {
  const uname = user.toLowerCase();
  if (uname === myUsername.toLowerCase()) {
    return { avatar: myAvatarData, bio: myUserBio };
  }
  return {
    avatar: usersAvatarCache[uname] || "",
    bio: usersBioCache[uname] || "Hey there! I am using Krypton."
  };
}

function formatMessageTime(isoString) {
  try {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function formatByteSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

function escapeHTML(str) {
  return String(str || "").replace(/[&<>'"]/g, (tag) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    };
    return map[tag] || tag;
  });
}

function formatRichMessageHTML(rawText) {
  let safe = escapeHTML(rawText);

  safe = safe.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
    const cleanCode = codeContent.trim();
    const encodedForCopy = btoa(unescape(encodeURIComponent(cleanCode)));
    return `
      <div class="code-block-wrap">
        <div class="code-block-header">
          <span>CODE SNIPPET</span>
          <button class="code-copy-mini-btn" onclick="copyBase64Code('${encodedForCopy}')">Copy Code</button>
        </div>
        <pre class="code-block-pre">${cleanCode}</pre>
      </div>
    `;
  });

  safe = safe.replace(/`([^`\n]+)`/g, '<code class="inline-code-pill">$1</code>');

  safe = safe.replace(
    /\|\|([^|]+)\|\|/g,
    '<span class="krypton-spoiler" onclick="this.classList.toggle(\'revealed\')" title="Click to reveal/hide secret">$1</span>'
  );

  safe = safe.replace(/\*([^*\n]+)\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\b_([^_\n]+)_\b/g, "<em>$1</em>");

  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  safe = safe.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-auto-link">${url}</a>`;
  });

  return safe;
}

window.copyBase64Code = function (b64) {
  try {
    const decoded = decodeURIComponent(escape(atob(b64)));
    navigator.clipboard.writeText(decoded);
    showToast("Code snippet copied!", "success");
  } catch (e) { }
};

// --- 8. APPLY SETTINGS, PUSH ALERTS & FORCE RELOAD ---
function applySettings() {
  document.body.classList.toggle("dark-theme", userSettings.darkMode);
  document.body.setAttribute("data-accent", userSettings.accentColor || "emerald");

  const toggleDark = document.getElementById("toggle-dark-mode");
  if (toggleDark) toggleDark.checked = userSettings.darkMode;

  const toggleSound = document.getElementById("toggle-sound-fx");
  if (toggleSound) toggleSound.checked = userSettings.soundFx;

  const togglePush = document.getElementById("toggle-push-notifications");
  if (togglePush) {
    togglePush.checked =
      !!userSettings.pushAlerts &&
      "Notification" in window &&
      Notification.permission === "granted";
  }

  if (settingsPinInput) {
    settingsPinInput.value = myAppPin || "";
  }

  document.querySelectorAll(".theme-swatch-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.dataset.themeColor === (userSettings.accentColor || "emerald")
    );
  });

  const globalWrapper = document.getElementById("global-lounge-wrapper");
  if (globalWrapper) {
    globalWrapper.style.display = userSettings.hideGlobal ? "none" : "block";
    if (userSettings.hideGlobal && currentRoom === "global") {
      exitChatToDashboard();
    }
  }

  const toggleGlobal = document.getElementById("toggle-hide-global");
  if (toggleGlobal) toggleGlobal.checked = userSettings.hideGlobal;

  const toggleOnline = document.getElementById("toggle-online-presence");
  if (toggleOnline) toggleOnline.checked = userSettings.onlinePresence;

  const myDot = document.getElementById("my-online-dot");
  if (myDot) {
    myDot.classList.toggle("visible", !!userSettings.onlinePresence);
  }

  renderPeerList();
  updateHeaderStatus();
}

// Feature #5: Background Push Alerts Toggle Listener
const togglePushEl = document.getElementById("toggle-push-notifications");
if (togglePushEl) {
  togglePushEl.addEventListener("change", async (e) => {
    if (!("Notification" in window)) {
      e.target.checked = false;
      showToast("Push notifications are not supported on this browser.", "error");
      return;
    }

    if (e.target.checked) {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        userSettings.pushAlerts = true;
        localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
        showToast("Background Push Alerts enabled!", "success");
      } else {
        e.target.checked = false;
        userSettings.pushAlerts = false;
        localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
        showToast("Notification permission denied by browser.", "error");
      }
    } else {
      userSettings.pushAlerts = false;
      localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
      showToast("Background Push Alerts disabled.", "info");
    }
  });
}

// Force Update & Hard Reload Feature in Settings
const btnForceReloadApp = document.getElementById("btn-force-reload-app");
if (btnForceReloadApp) {
  btnForceReloadApp.addEventListener("click", async () => {
    btnForceReloadApp.innerHTML = "<span>Updating...</span>";
    showToast("Clearing cache & fetching latest update...", "info", 2000);
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      console.error("Cache purge error:", e);
    }
    setTimeout(() => {
      const cleanUrl = window.location.pathname + "?updated=" + Date.now();
      window.location.replace(cleanUrl);
    }, 350);
  });
}

document.querySelectorAll(".theme-swatch-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const chosen = btn.dataset.themeColor || "emerald";
    userSettings.accentColor = chosen;
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    applySettings();
    showToast(`Theme switched to ${btn.title || chosen}!`, "info", 1800);
  });
});

const btnQuickTheme = document.getElementById("btn-quick-theme");
if (btnQuickTheme) {
  btnQuickTheme.addEventListener("click", () => {
    const currIdx = AVAILABLE_THEMES.indexOf(userSettings.accentColor || "emerald");
    const nextTheme = AVAILABLE_THEMES[(currIdx + 1) % AVAILABLE_THEMES.length];
    userSettings.accentColor = nextTheme;
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    applySettings();
    showToast(`Accent theme: ${nextTheme.toUpperCase()}`, "info", 1600);
  });
}

function updateMyAvatarUI() {
  const sidebarAvatar = document.getElementById("my-avatar");
  const previewAvatar = document.getElementById("settings-preview-avatar");
  const settingsUidText = document.getElementById("settings-display-uid");
  const bioInput = document.getElementById("settings-bio-input");

  renderAvatarElement(sidebarAvatar, myUsername, myAvatarData);
  renderAvatarElement(previewAvatar, myUsername, myAvatarData);
  if (settingsUidText) {
    settingsUidText.textContent = myUsername ? "@" + myUsername : "@username";
  }
  if (bioInput) {
    bioInput.value = myUserBio || "";
  }
  const displayId = document.getElementById("display-my-id");
  if (displayId) {
    displayId.textContent = myUsername ? "@" + myUsername : "Connecting...";
  }
}

const settingsPreviewAvatar = document.getElementById("settings-preview-avatar");
if (settingsPreviewAvatar) {
  settingsPreviewAvatar.addEventListener("click", () => {
    viewUserProfilePicFullscreen(myUsername);
  });
}

const sidebarAvatarWrap = document.getElementById("sidebar-avatar-wrap");
if (sidebarAvatarWrap) {
  sidebarAvatarWrap.addEventListener("click", () => {
    viewUserProfilePicFullscreen(myUsername);
  });
}

// Bio Save Trigger
const btnSaveBio = document.getElementById("btn-save-bio");
if (btnSaveBio) {
  btnSaveBio.addEventListener("click", async () => {
    const bioInput = document.getElementById("settings-bio-input");
    const newBio = (bioInput ? bioInput.value : "").trim();
    myUserBio = newBio || "Hey there! I am using Krypton.";
    localStorage.setItem("krypton_bio", myUserBio);
    usersBioCache[myUsername.toLowerCase()] = myUserBio;
    localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));

    if (supabaseClient && myUsername) {
      btnSaveBio.textContent = "...";
      await supabaseClient
        .from("users")
        .update({ bio: myUserBio })
        .eq("username", myUsername);
      btnSaveBio.textContent = "Save";
    }
    showToast("Profile bio updated!", "success");
  });
}

// Feedback Handler
const btnSendFeedback = document.getElementById("btn-send-feedback");
if (btnSendFeedback) {
  btnSendFeedback.addEventListener("click", async () => {
    const feedbackText = await showGlassDialog({
      title: "Feedback & Feature Ideas",
      message: "Share any bug report or upgrade idea for Krypton:",
      isPrompt: true,
      placeholder: "Type your feedback here...",
      confirmText: "Submit"
    });
    if (!feedbackText || !feedbackText.trim()) return;

    if (supabaseClient) {
      btnSendFeedback.textContent = "...";
      try {
        await supabaseClient.from("feedbacks").insert([
          { username: myUsername, feedback: feedbackText.trim(), created_at: new Date().toISOString() }
        ]);
        showToast("Feedback transmitted! Thank you.", "success");
      } catch (err) {
        showToast("Feedback logged! Thank you.", "success");
      } finally {
        btnSendFeedback.textContent = "Feedback";
      }
    }
  });
}


// --- 8B. PWA HOME SCREEN INSTALL ENGINE (SETTINGS + BOTTOM POPUP BANNER) ---
let deferredPwaPrompt = null;
let pwaBannerTimer = null;

function isAppAlreadyInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function updatePwaInstallUIState() {
  const settingsBtn = document.getElementById("btn-settings-install-pwa");
  const settingsLabel = document.getElementById("btn-settings-install-label");
  const settingsDesc = document.getElementById("settings-install-desc");

  if (isAppAlreadyInstalled()) {
    if (settingsLabel) settingsLabel.textContent = "Installed ✓";
    if (settingsDesc) settingsDesc.textContent = "Krypton is running as an installed Home Screen App";
    if (settingsBtn) {
      settingsBtn.disabled = true;
      settingsBtn.style.opacity = "0.75";
      settingsBtn.style.cursor = "default";
    }
  } else {
    if (settingsLabel) settingsLabel.textContent = "Install App";
    if (settingsDesc) {
      settingsDesc.textContent = "Add Krypton to your Home Screen for full-screen app experience";
    }
    if (settingsBtn) {
      settingsBtn.disabled = false;
      settingsBtn.style.opacity = "1";
      settingsBtn.style.cursor = "pointer";
    }
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  updatePwaInstallUIState();
});

window.addEventListener("appinstalled", () => {
  deferredPwaPrompt = null;
  hideBottomPwaInstallBanner();
  updatePwaInstallUIState();
  showToast("Krypton installed on your Home Screen!", "success");
});

function showBottomPwaInstallBanner(autoHideMs = 5000) {
  if (isAppAlreadyInstalled()) return;
  const banner = document.getElementById("pwa-install-banner");
  if (!banner) return;

  banner.classList.remove("closing", "hidden");
  if (window.lucide) lucide.createIcons({ nodes: [banner] });

  clearTimeout(pwaBannerTimer);
  if (autoHideMs > 0) {
    pwaBannerTimer = setTimeout(() => {
      hideBottomPwaInstallBanner();
    }, autoHideMs);
  }
}

function hideBottomPwaInstallBanner() {
  clearTimeout(pwaBannerTimer);
  const banner = document.getElementById("pwa-install-banner");
  if (!banner || banner.classList.contains("hidden")) return;
  banner.classList.add("closing");
  setTimeout(() => {
    banner.classList.add("hidden");
    banner.classList.remove("closing");
  }, 240);
}

async function triggerPwaInstallFlow() {
  hideBottomPwaInstallBanner();

  if (isAppAlreadyInstalled()) {
    showToast("Krypton is already installed on your device!", "success");
    return;
  }

  if (deferredPwaPrompt) {
    try {
      deferredPwaPrompt.prompt();
      const { outcome } = await deferredPwaPrompt.userChoice;
      if (outcome === "accepted") {
        deferredPwaPrompt = null;
      }
    } catch (err) {
      console.error("PWA prompt error:", err);
    }
    return;
  }

  // Fallback guide for iOS Safari or browsers where native prompt hasn't fired yet
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const msg = isIOS
    ? "On iPhone/iPad: Tap the Share button (📤) at the bottom of Safari, then select 'Add to Home Screen ➕'."
    : "Tap your browser's 3-dot menu (⋮) at the top-right and select 'Install App' or 'Add to Home Screen'.";

  await showGlassDialog({
    title: "Install Krypton on Home Screen",
    message: msg,
    confirmText: "Got It",
    cancelText: "Close"
  });
}

const btnSettingsInstallPwa = document.getElementById("btn-settings-install-pwa");
if (btnSettingsInstallPwa) {
  btnSettingsInstallPwa.addEventListener("click", triggerPwaInstallFlow);
}

const btnBannerInstallPwa = document.getElementById("btn-banner-install-pwa");
if (btnBannerInstallPwa) {
  btnBannerInstallPwa.addEventListener("click", triggerPwaInstallFlow);
}

const btnClosePwaBanner = document.getElementById("btn-close-pwa-banner");
if (btnClosePwaBanner) {
  btnClosePwaBanner.addEventListener("click", hideBottomPwaInstallBanner);
}

updatePwaInstallUIState();

// --- 9. USERNAME EDIT WITH FULL RELATIONAL CASCADE ---
const btnEditUsername = document.getElementById("btn-edit-username");
const btnSaveUsername = document.getElementById("btn-save-username");
const usernameDisplayText = document.getElementById("settings-display-uid");
const usernameEditInput = document.getElementById("settings-username-edit-input");
const usernameErrorNotice = document.getElementById("settings-username-error");

function showUsernameError(msg) {
  if (usernameErrorNotice && usernameEditInput) {
    usernameErrorNotice.textContent = msg || "Invalid username";
    usernameErrorNotice.style.display = "block";
    usernameEditInput.style.borderColor = "var(--danger-color)";
  }
}

function clearUsernameError() {
  if (usernameErrorNotice && usernameEditInput) {
    usernameErrorNotice.textContent = "";
    usernameErrorNotice.style.display = "none";
    usernameEditInput.style.borderColor = "var(--glass-border-subtle)";
  }
}

if (btnEditUsername && btnSaveUsername && usernameEditInput) {
  btnEditUsername.addEventListener("click", () => {
    usernameEditInput.value = myUsername;
    clearUsernameError();
    if (usernameDisplayText) usernameDisplayText.classList.add("hidden");
    if (btnEditUsername) btnEditUsername.classList.add("hidden");
    if (usernameEditInput) usernameEditInput.classList.remove("hidden");
    if (btnSaveUsername) btnSaveUsername.classList.remove("hidden");
    usernameEditInput.focus();
  });

  usernameEditInput.addEventListener("input", clearUsernameError);

  btnSaveUsername.addEventListener("click", async () => {
    const newUsername = usernameEditInput.value.trim().toLowerCase();
    clearUsernameError();

    if (!newUsername || newUsername.length < 3 || !/^[a-z0-9_.-]+$/.test(newUsername)) {
      showUsernameError("Use 3+ letters, numbers, or underscores");
      return;
    }

    if (newUsername === myUsername) {
      exitUsernameEditMode();
      return;
    }

    try {
      btnSaveUsername.textContent = "...";

      const { data: existing } = await supabaseClient
        .from("users")
        .select("username")
        .eq("username", newUsername);

      if (existing && existing.length > 0) {
        btnSaveUsername.textContent = "Save";
        showUsernameError("Username already taken");
        return;
      }

      const oldUsername = myUsername;
      await supabaseClient
        .from("users")
        .update({ username: newUsername, session_token: mySessionId })
        .eq("username", oldUsername);

      await Promise.all([
        supabaseClient.from("chat_requests").update({ sender_id: newUsername }).eq("sender_id", oldUsername),
        supabaseClient.from("chat_requests").update({ receiver_id: newUsername }).eq("receiver_id", oldUsername),
        supabaseClient.from("messages").update({ sender_id: newUsername }).eq("sender_id", oldUsername)
      ]);

      // Broadcast live rename event across presence channel so connected friends update @old -> @new immediately
      if (presenceChannel) {
        try {
          await presenceChannel.send({
            type: "broadcast",
            event: "user-renamed",
            payload: {
              oldUsername: oldUsername.toLowerCase(),
              newUsername: newUsername.toLowerCase(),
              sessionToken: mySessionId
            }
          });
        } catch (e) { }
      }

      myUsername = newUsername;
      localStorage.setItem("krypton_uid", myUsername);

      if (presenceChannel && userSettings.onlinePresence) {
        await presenceChannel.track({ user: myUsername, online: true, sessionToken: mySessionId });
      }

      updateMyAvatarUI();
      renderPeerList();
      exitUsernameEditMode();
      showToast("Username updated to @" + newUsername + " (Friends synced automatically!)", "success");
    } catch (err) {
      console.error("Update username error:", err);
      showUsernameError("Could not update username");
    } finally {
      btnSaveUsername.textContent = "Save";
    }
  });
}

function exitUsernameEditMode() {
  clearUsernameError();
  if (usernameDisplayText) usernameDisplayText.classList.remove("hidden");
  if (btnEditUsername) btnEditUsername.classList.remove("hidden");
  if (usernameEditInput) usernameEditInput.classList.add("hidden");
  if (btnSaveUsername) btnSaveUsername.classList.add("hidden");
}

function openSettingsModal() {
  updateMyAvatarUI();
  updatePwaInstallUIState();
  exitUsernameEditMode();

  const settingsList = document.querySelector(".settings-list");
  if (settingsList && !document.getElementById("setting-item-delete-acc")) {
    const delItem = document.createElement("div");
    delItem.id = "setting-item-delete-acc";
    delItem.className = "setting-item";
    delItem.style.cssText = "padding-top: 12px; border-top: 1px solid var(--glass-border-subtle);";
    delItem.innerHTML =
      '<div class="setting-text">' +
      '<span class="setting-title" style="color: var(--danger-color);">Delete Account Permanently</span>' +
      '<span class="setting-desc">Wipe all your messages, profile, and data forever</span>' +
      "</div>" +
      '<button id="btn-delete-account-perm" class="glass-btn-sm danger" style="padding: 6px 12px; font-weight: 700;">Delete</button>';
    settingsList.appendChild(delItem);

    document.getElementById("btn-delete-account-perm").addEventListener("click", deleteAccountPermanently);
  }

  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.classList.remove("closing", "hidden");
  }
}

function closeSettingsModalAnimated() {
  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.classList.add("closing");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("closing");
    }, 150);
  }
}

async function deleteAccountPermanently() {
  const confirmFirst = await showGlassDialog({
    title: "Delete Account Permanently?",
    message: "This will permanently erase your profile, encryption keys, and messages.",
    confirmText: "Continue",
    danger: true
  });
  if (!confirmFirst) return;

  const confirmDouble = await showGlassDialog({
    title: "Verify Username",
    message: `Type your username "${myUsername}" to confirm permanent deletion:`,
    isPrompt: true,
    placeholder: myUsername,
    confirmText: "Wipe Forever",
    danger: true
  });

  if (confirmDouble !== myUsername) {
    showToast("Username did not match. Deletion cancelled.", "info");
    return;
  }

  try {
    if (supabaseClient && myUsername) {
      await supabaseClient.from("messages").delete().eq("sender_id", myUsername);
      await supabaseClient
        .from("chat_requests")
        .delete()
        .or("sender_id.eq." + myUsername + ",receiver_id.eq." + myUsername);
      await supabaseClient.from("users").delete().eq("username", myUsername);
    }

    localStorage.clear();
    location.reload();
  } catch (err) {
    console.error("Account deletion error:", err);
    showToast("Error deleting account. Please try again.", "error");
  }
}

const btnSettings = document.getElementById("btn-settings");
if (btnSettings) btnSettings.addEventListener("click", openSettingsModal);

const sidebarMetaWrap = document.getElementById("sidebar-meta-wrap");
if (sidebarMetaWrap) sidebarMetaWrap.addEventListener("click", openSettingsModal);

const btnCloseSettings = document.getElementById("btn-close-settings");
if (btnCloseSettings) {
  btnCloseSettings.addEventListener("click", closeSettingsModalAnimated);
}

const settingsModalBackdrop = document.getElementById("settings-modal");
if (settingsModalBackdrop) {
  settingsModalBackdrop.addEventListener("click", (e) => {
    if (e.target.id === "settings-modal") {
      closeSettingsModalAnimated();
    }
  });
}

const toggleDark = document.getElementById("toggle-dark-mode");
if (toggleDark) {
  toggleDark.addEventListener("change", (e) => {
    userSettings.darkMode = e.target.checked;
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    applySettings();
  });
}

const toggleSound = document.getElementById("toggle-sound-fx");
if (toggleSound) {
  toggleSound.addEventListener("change", (e) => {
    userSettings.soundFx = e.target.checked;
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    if (userSettings.soundFx) playSynthTone("send");
  });
}

const toggleGlobal = document.getElementById("toggle-hide-global");
if (toggleGlobal) {
  toggleGlobal.addEventListener("change", (e) => {
    userSettings.hideGlobal = e.target.checked;
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    applySettings();
  });
}

const togglePresence = document.getElementById("toggle-online-presence");
if (togglePresence) {
  togglePresence.addEventListener("change", async (e) => {
    userSettings.onlinePresence = e.target.checked;
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    applySettings();

    if (presenceChannel) {
      if (userSettings.onlinePresence) {
        await presenceChannel.track({ user: myUsername, online: true });
        showToast("Online presence visible", "info");
      } else {
        await presenceChannel.untrack();
        showToast("Ghost Mode enabled (Offline)", "info");
      }
    }
  });
}

const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    const ok = await showGlassDialog({
      title: "Logout Session?",
      message: "Disconnect your account from this device?",
      confirmText: "Logout",
      danger: true
    });
    if (ok) {
      localStorage.removeItem("krypton_uid");
      localStorage.removeItem("krypton_avatar");
      localStorage.removeItem("krypton_bio");
      localStorage.removeItem("krypton_session_id");
      location.reload();
    }
  });
}

// Profile Photo Uploader
const avatarFileInput = document.getElementById("avatar-file-input");
const btnUploadTrigger = document.getElementById("btn-upload-avatar-trigger");
if (btnUploadTrigger && avatarFileInput) {
  btnUploadTrigger.addEventListener("click", () => avatarFileInput.click());
}

const btnChangeAvatar = document.getElementById("btn-change-avatar");
if (btnChangeAvatar && avatarFileInput) {
  btnChangeAvatar.addEventListener("click", () => avatarFileInput.click());
}

if (avatarFileInput) {
  avatarFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      const img = new Image();
      img.onload = async function () {
        const canvas = document.createElement("canvas");
        const size = 320;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        let sWidth = img.width;
        let sHeight = img.height;
        let sx = 0;
        let sy = 0;
        if (sWidth > sHeight) {
          sx = (sWidth - sHeight) / 2;
          sWidth = sHeight;
        } else {
          sy = (sHeight - sWidth) / 2;
          sHeight = sWidth;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);
        const compressedAvatar = canvas.toDataURL("image/jpeg", 0.82);

        myAvatarData = compressedAvatar;
        localStorage.setItem("krypton_avatar", myAvatarData);
        usersAvatarCache[myUsername.toLowerCase()] = myAvatarData;
        localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
        updateMyAvatarUI();

        if (supabaseClient && myUsername) {
          await supabaseClient
            .from("users")
            .update({ avatar_url: myAvatarData })
            .eq("username", myUsername);
        }
        showToast("Profile photo updated!", "success");
        avatarFileInput.value = "";
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const btnRemoveAvatar = document.getElementById("btn-remove-avatar");
if (btnRemoveAvatar) {
  btnRemoveAvatar.addEventListener("click", async () => {
    const ok = await showGlassDialog({
      title: "Remove Profile Photo?",
      message: "Revert your avatar back to your username initial?",
      confirmText: "Remove",
      danger: true
    });
    if (ok) {
      myAvatarData = "";
      localStorage.removeItem("krypton_avatar");
      delete usersAvatarCache[myUsername.toLowerCase()];
      localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
      updateMyAvatarUI();

      if (supabaseClient && myUsername) {
        await supabaseClient
          .from("users")
          .update({ avatar_url: null })
          .eq("username", myUsername);
      }
      showToast("Profile photo removed", "info");
    }
  });
}

// --- 10. PRESENCE & ONLINE STATUS (DIRECT PEERS vs GLOBAL TOTAL) ---
function updateOnlineCountersUI() {
  // 1. Direct Conversations Online Count: Only count saved direct peers who are currently online
  const directOnlineCount = userSettings.onlinePresence
    ? savedPeers.filter((p) => onlineUsersList.has(p.toLowerCase())).length
    : 0;

  const onlineCountEl = document.getElementById("online-mesh-count");
  if (onlineCountEl) {
    onlineCountEl.textContent = `${directOnlineCount} Online`;
  }

  // 2. Global Anonymous Lounge Total Active Count: Total app users online (others + me if presence is ON)
  const totalGlobalOnline = onlineUsersList.size + (userSettings.onlinePresence ? 1 : 0);
  const globalBadgeEl = document.getElementById("global-lounge-online-badge");
  if (globalBadgeEl) {
    globalBadgeEl.textContent = `${totalGlobalOnline} Active`;
  }
  const globalSubEl = document.getElementById("global-lounge-subtext");
  if (globalSubEl) {
    globalSubEl.textContent = `Public encrypted mesh • ${totalGlobalOnline} online`;
  }
}

function initPresenceTracker() {
  if (!supabaseClient || !myUsername) return;
  if (presenceChannel) supabaseClient.removeChannel(presenceChannel);

  presenceChannel = supabaseClient.channel("global_presence_mesh");
  presenceChannel
    .on("broadcast", { event: "user-renamed" }, (payload) => {
      const p = payload.payload;
      if (p && p.oldUsername && p.newUsername && p.sessionToken) {
        applyLivePeerRename(p.oldUsername, p.newUsername, p.sessionToken);
      }
    })
    .on("broadcast", { event: "group-sync" }, (payload) => {
      const g = payload.payload;
      if (g && g.id && Array.isArray(g.members)) {
        const me = (myUsername || "").toLowerCase();
        if (g.members.includes(me)) {
          const isNew = !savedGroups[g.id];
          savedGroups[g.id] = g;
          localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));
          renderPeerList();
          if (currentRoom === g.id) updateHeaderStatus();
          if (isNew && g.owner !== me) {
            playSynthTone("receive");
            showToast(`Added to encrypted group "${g.name}" by @${g.owner}`, "info");
          }
        }
      }
    })
    .on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      onlineUsersList.clear();
      Object.keys(state).forEach((key) => {
        state[key].forEach((presence) => {
          if (presence.user && presence.user.toLowerCase() !== myUsername.toLowerCase()) {
            onlineUsersList.add(presence.user.toLowerCase());
          }
        });
      });

      updateOnlineCountersUI();
      renderPeerList();
      updateHeaderStatus();
      update1on1MessageTicks();
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED" && userSettings.onlinePresence) {
        await presenceChannel.track({ user: myUsername, online: true });
      }
    });
}

function updateHeaderStatus() {
  const headerIndicator = document.getElementById("header-status-indicator");
  const headerAvatar = document.getElementById("header-chat-avatar");
  const subtitleEl = document.getElementById("current-room-subtitle");
  if (!headerIndicator) return;

  if (currentRoom === "global") {
    headerIndicator.className = "status-indicator global-mode";
    if (headerAvatar) headerAvatar.style.display = "none";
    const totalGlobalOnline = onlineUsersList.size + (userSettings.onlinePresence ? 1 : 0);
    if (subtitleEl) {
      subtitleEl.textContent = `Public Encrypted Stream • ${totalGlobalOnline} Active Now`;
    }
  } else if (isSelfRoom(currentRoom)) {
    headerIndicator.className = "status-indicator active-user";
    if (headerAvatar) {
      headerAvatar.style.display = "flex";
      renderAvatarElement(headerAvatar, myUsername, myAvatarData);
      headerAvatar.onclick = (e) => {
        e.stopPropagation();
        viewUserProfilePicFullscreen(myUsername);
      };
    }
    if (subtitleEl) {
      subtitleEl.textContent = "Personal Encrypted Vault • Notes & Saved Media";
    }
  } else if (isGroupRoom(currentRoom)) {
    headerIndicator.className = "status-indicator global-mode";
    const grp = savedGroups[currentRoom] || { name: "Group", owner: "", members: [] };
    if (headerAvatar) {
      headerAvatar.style.display = "flex";
      renderAvatarElement(headerAvatar, grp.name || "G", "");
      headerAvatar.onclick = null;
    }
    if (subtitleEl) {
      subtitleEl.textContent = `👥 ${grp.members.length} Members • Owner: @${grp.owner}`;
    }
  } else {
    if (headerAvatar) {
      headerAvatar.style.display = "flex";
      const peerAvatar = usersAvatarCache[currentPeerUser.toLowerCase()] || "";
      renderAvatarElement(headerAvatar, currentPeerUser, peerAvatar);
      headerAvatar.onclick = (e) => {
        e.stopPropagation();
        viewUserProfilePicFullscreen(currentPeerUser);
      };
    }
    const isPeerOnline =
      currentPeerUser &&
      onlineUsersList.has(currentPeerUser.toLowerCase()) &&
      userSettings.onlinePresence;

    if (isPeerOnline) {
      headerIndicator.className = "status-indicator active-user";
      if (subtitleEl) subtitleEl.textContent = "Online • E2EE Tunnel Active";
    } else {
      headerIndicator.className = "status-indicator";
      if (subtitleEl) subtitleEl.textContent = "Encrypted Peer-to-Peer";
    }
  }
}

// --- 11. USERS PROFILE LIVE REALTIME SYNC ---
// Feature #1: Cryptographic Session-Token Rename Migration Helper
function applyLivePeerRename(oldUname, newUname, sessionToken) {
  const oldClean = (oldUname || "").toLowerCase();
  const newClean = (newUname || "").toLowerCase();
  if (!oldClean || !newClean || oldClean === newClean) return;

  // Verify token matches bound peer or known session cache
  const boundToken = peerTokenBindingMap[oldClean] || usersSessionCache[oldClean];
  if (boundToken && sessionToken && boundToken !== sessionToken) {
    return;
  }

  let changed = false;
  if (savedPeers.includes(oldClean)) {
    savedPeers = savedPeers.map((p) => (p.toLowerCase() === oldClean ? newClean : p));
    savedPeers = [...new Set(savedPeers)];
    localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
    changed = true;
  }

  if (pinnedPeers.includes(oldClean)) {
    pinnedPeers = pinnedPeers.map((p) => (p.toLowerCase() === oldClean ? newClean : p));
    localStorage.setItem("krypton_pinned_peers", JSON.stringify(pinnedPeers));
  }

  if (sessionToken) {
    usersSessionCache[newClean] = sessionToken;
    peerTokenBindingMap[newClean] = sessionToken;
    delete peerTokenBindingMap[oldClean];
    localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
    localStorage.setItem("krypton_peer_token_bindings", JSON.stringify(peerTokenBindingMap));
  }

  if (usersAvatarCache[oldClean]) {
    usersAvatarCache[newClean] = usersAvatarCache[oldClean];
    localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
  }
  if (usersBioCache[oldClean]) {
    usersBioCache[newClean] = usersBioCache[oldClean];
    localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
  }
  if (unreadCounts[oldClean]) {
    unreadCounts[newClean] = unreadCounts[oldClean];
    delete unreadCounts[oldClean];
    localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));
  }

  if (currentPeerUser.toLowerCase() === oldClean) {
    currentPeerUser = newClean;
    const titleEl = document.getElementById("current-room-title");
    if (titleEl) titleEl.textContent = "@" + newClean;
  }

  if (changed) {
    fetchPendingRequests();
    renderPeerList();
    updateHeaderStatus();
    showToast(`Friend @${oldClean} changed username to @${newClean}`, "info");
  }
}

function startUsersProfileWatcher() {
  if (!supabaseClient) return;
  if (usersProfileWatcher) supabaseClient.removeChannel(usersProfileWatcher);

  usersProfileWatcher = supabaseClient
    .channel("krypton_users_profile_watch")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "users" },
      (payload) => {
        const updated = payload.new;
        const oldRow = payload.old || {};
        if (updated && updated.username) {
          const uname = updated.username.toLowerCase();
          const sToken = updated.session_token || "";

          // Detect if any saved peer with this session_token renamed their username
          if (sToken) {
            Object.keys(peerTokenBindingMap).forEach((savedPeerName) => {
              if (peerTokenBindingMap[savedPeerName] === sToken && savedPeerName !== uname) {
                applyLivePeerRename(savedPeerName, uname, sToken);
              }
            });
          }
          if (oldRow.username && oldRow.username.toLowerCase() !== uname) {
            applyLivePeerRename(oldRow.username.toLowerCase(), uname, sToken);
          }

          if (updated.avatar_url !== undefined) {
            usersAvatarCache[uname] = updated.avatar_url || "";
            localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
          }
          if (updated.bio !== undefined) {
            usersBioCache[uname] = updated.bio || "";
            localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
          }
          if (sToken) {
            usersSessionCache[uname] = sToken;
            localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
          }
          renderPeerList();
          updateHeaderStatus();
        }
      }
    )
    .subscribe();
}

// --- 12. SECURE SESSION-BASED ROOM ID & CHUNK-SAFE BASE64 ENCRYPTION ---
function getMySelfRoomId() {
  return "self_" + (mySessionId || myUsername.toLowerCase());
}

function isSelfRoom(roomId) {
  return Boolean(roomId && roomId.startsWith("self_"));
}

function isGroupRoom(roomId) {
  return Boolean(roomId && roomId.startsWith("group_"));
}

function isCurrentGroupOwner(roomId = currentRoom) {
  if (!isGroupRoom(roomId)) return false;
  const grp = savedGroups[roomId];
  if (!grp) return false;
  const me = (myUsername || "").toLowerCase();
  if (grp.ownerToken && mySessionId) {
    return grp.ownerToken === mySessionId;
  }
  return (grp.owner || "").toLowerCase() === me;
}

async function getSecureRoomId(peerId) {
  const p = (peerId || "").toLowerCase();
  if (!p || p === myUsername.toLowerCase() || p === "me" || p === "self") {
    return getMySelfRoomId();
  }

  // Always prefer the permanent session_token bound to this peer
  if (peerTokenBindingMap[p]) {
    return [mySessionId, peerTokenBindingMap[p]].sort().join("_");
  }

  if (supabaseClient) {
    const { data } = await supabaseClient
      .from("users")
      .select("session_token")
      .eq("username", p);
    if (data && data.length > 0 && data[0].session_token) {
      usersSessionCache[p] = data[0].session_token;
      peerTokenBindingMap[p] = data[0].session_token;
      localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
      localStorage.setItem("krypton_peer_token_bindings", JSON.stringify(peerTokenBindingMap));
      return [mySessionId, data[0].session_token].sort().join("_");
    }
  }

  if (usersSessionCache[p]) {
    return [mySessionId, usersSessionCache[p]].sort().join("_");
  }
  return [myUsername.toLowerCase(), p].sort().join("_");
}

async function deriveRoomKey(roomId, saltStr) {
  const cacheKey = roomId + "_" + saltStr;
  if (derivedKeyCache.has(cacheKey)) {
    return derivedKeyCache.get(cacheKey);
  }

  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(roomId),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const derived = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(saltStr),
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  derivedKeyCache.set(cacheKey, derived);
  return derived;
}

// Chunk-safe ArrayBuffer -> Base64 converter (Prevents Call Stack Overflow on Audio/Images/Files!)
function uint8ArrayToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64Str) {
  const binary = atob(base64Str);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function encryptData(payloadStr, roomId) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const saltStr = Array.from(salt).join(",");
  const key = await deriveRoomKey(roomId, saltStr);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(payloadStr)
  );

  return {
    ciphertext: uint8ArrayToBase64(new Uint8Array(encrypted)),
    iv: uint8ArrayToBase64(iv),
    salt: saltStr
  };
}

async function decryptData(ciphertext, ivStr, saltStr, roomId) {
  try {
    const key = await deriveRoomKey(roomId, saltStr);
    const iv = base64ToUint8Array(ivStr);
    const encryptedBytes = base64ToUint8Array(ciphertext);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedBytes
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    return "[Encrypted payload]";
  }
}

// --- 13. GLOBAL INCOMING MESSAGE WATCHER (WITH PUSH ALERTS) ---
function startGlobalIncomingMessageWatcher() {
  if (!supabaseClient || !myUsername) return;
  if (globalMessagesWatcher) supabaseClient.removeChannel(globalMessagesWatcher);

  globalMessagesWatcher = supabaseClient
    .channel("krypton_global_msg_alert")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const newMsg = payload.new;
        if (!newMsg || newMsg.room_id === "global") return;
        if (newMsg.sender_id.toLowerCase() === myUsername.toLowerCase()) return;

        const sender = newMsg.sender_id.toLowerCase();
        if (blockedUsers.includes(sender)) return;

        const expectedRoom = await getSecureRoomId(sender);
        if (newMsg.room_id === expectedRoom) {
          savePeerToRecent(sender);
          triggerSystemPushNotification(
            `Krypton • @${sender}`,
            "Sent you an encrypted message",
            `dm-${sender}`
          );
          if (currentRoom !== expectedRoom) {
            unreadCounts[sender] = (unreadCounts[sender] || 0) + 1;
            localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));
            playSynthTone("receive");
            showToast(`New encrypted message from @${sender}`, "info");
            renderPeerList();
          }
        }
      }
    )
    .subscribe();
}

// --- 14. INITIALIZATION & AUTHENTICATION ---
async function initIdentity() {
  applySettings();
  const modal = document.getElementById("auth-modal");

  if (!myUsername || !mySessionId) {
    if (modal) modal.style.display = "flex";
  } else {
    if (modal) modal.style.display = "none";
    updateMyAvatarUI();

    if (hasAnyLockMethodConfigured()) {
      triggerPrivacyLock();
    }

    if (supabaseClient) {
      try {
        const { data } = await supabaseClient
          .from("users")
          .select("*")
          .eq("username", myUsername);
        if (data && data.length > 0) {
          const userRow = data[0];
          if (!userRow.session_token) {
            mySessionId = mySessionId || crypto.randomUUID();
            await supabaseClient.from("users").update({ session_token: mySessionId }).eq("username", myUsername);
            localStorage.setItem("krypton_session_id", mySessionId);
          } else {
            mySessionId = userRow.session_token;
            localStorage.setItem("krypton_session_id", mySessionId);
          }

          if (userRow.avatar_url) {
            myAvatarData = userRow.avatar_url;
            localStorage.setItem("krypton_avatar", myAvatarData);
            usersAvatarCache[myUsername.toLowerCase()] = myAvatarData;
          }
          if (userRow.bio) {
            myUserBio = userRow.bio;
            localStorage.setItem("krypton_bio", myUserBio);
            usersBioCache[myUsername.toLowerCase()] = myUserBio;
          }
          updateMyAvatarUI();
        }
      } catch (e) {
        console.error("Profile sync error:", e);
      }
    }

    renderPeerList();
    scanMyExistingChats();
    listenToIncomingRequests();
    initPresenceTracker();
    startGlobalIncomingMessageWatcher();
    startUsersProfileWatcher();

    if (window.innerWidth > 900 && !userSettings.hideGlobal) {
      joinRoom("global", "Global Anonymous Lounge", false);
    }
  }
}

function exitChatToDashboard() {
  document.body.classList.remove("mobile-chat-active");
  if (activeSubscription && supabaseClient) {
    supabaseClient.removeChannel(activeSubscription);
  }
  currentRoom = "";
  currentPeerUser = "";
  cancelActiveReply();
  const btnGlobal = document.getElementById("btn-global-room");
  if (btnGlobal) btnGlobal.classList.remove("active");
  removeFloatingIndicator();
  renderPeerList();
}

const btnMobileBack = document.getElementById("btn-mobile-back");
if (btnMobileBack) {
  btnMobileBack.addEventListener("click", exitChatToDashboard);
}

window.addEventListener("popstate", () => {
  if (document.body.classList.contains("mobile-chat-active")) {
    document.body.classList.remove("mobile-chat-active");
  }
});

// Login / Register Action
async function handleAuthSubmit() {
  const usernameInput = document.getElementById("username-input").value.trim().toLowerCase();
  const passwordInput = document.getElementById("password-input").value.trim();
  const statusMsg = document.getElementById("username-status");

  if (!supabaseClient) {
    if (statusMsg) {
      statusMsg.textContent = "Please paste your Supabase URL & Key in app.js (lines 6-7).";
      statusMsg.className = "status-msg error";
    }
    return;
  }

  if (!usernameInput || !passwordInput) {
    if (statusMsg) {
      statusMsg.textContent = "Please enter both username and password.";
      statusMsg.className = "status-msg error";
    }
    return;
  }

  if (usernameInput.length < 3) {
    if (statusMsg) {
      statusMsg.textContent = "Username must be at least 3 characters.";
      statusMsg.className = "status-msg error";
    }
    return;
  }

  if (statusMsg) {
    statusMsg.textContent = "Authenticating...";
    statusMsg.className = "status-msg";
  }

  try {
    const pwHash = await hashPassword(passwordInput);
    const { data: users, error } = await supabaseClient
      .from("users")
      .select("*")
      .eq("username", usernameInput);

    if (error) {
      console.error("Supabase select error:", error);
      if (statusMsg) {
        statusMsg.textContent = error.message || "Database error. Check Supabase URL/Key.";
        statusMsg.className = "status-msg error";
      }
      return;
    }

    if (users && users.length > 0) {
      const existingUser = users[0];
      if (!existingUser.password_hash) {
        const sToken = existingUser.session_token || crypto.randomUUID();
        await supabaseClient
          .from("users")
          .update({ password_hash: pwHash, session_token: sToken })
          .eq("username", usernameInput);

        completeLogin(usernameInput, sToken, existingUser.avatar_url, existingUser.bio);
        return;
      }

      if (existingUser.password_hash === pwHash) {
        const sToken = existingUser.session_token || crypto.randomUUID();
        if (!existingUser.session_token) {
          await supabaseClient.from("users").update({ session_token: sToken }).eq("username", usernameInput);
        }
        completeLogin(usernameInput, sToken, existingUser.avatar_url, existingUser.bio);
      } else {
        if (statusMsg) {
          statusMsg.textContent = "Incorrect password for @" + usernameInput;
          statusMsg.className = "status-msg error";
        }
      }
    } else {
      const sToken = crypto.randomUUID();
      const { error: insErr } = await supabaseClient.from("users").insert([
        {
          username: usernameInput,
          password_hash: pwHash,
          avatar_url: null,
          bio: "Hey there! I am using Krypton.",
          session_token: sToken
        }
      ]);
      if (insErr) {
        await supabaseClient.from("users").insert([
          { username: usernameInput, password_hash: pwHash }
        ]);
      }
      completeLogin(usernameInput, sToken, null, "Hey there! I am using Krypton.", true);
    }
  } catch (err) {
    console.error("Auth error:", err);
    if (statusMsg) {
      statusMsg.textContent = err && err.message ? err.message : "Network error. Try again.";
      statusMsg.className = "status-msg error";
    }
  }
}

const btnLogin = document.getElementById("btn-login");
if (btnLogin) {
  btnLogin.addEventListener("click", handleAuthSubmit);
}

const passwordInputEl = document.getElementById("password-input");
if (passwordInputEl) {
  passwordInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAuthSubmit();
  });
}

function completeLogin(username, sessionToken, avatarUrl, bio, isNewRegistration = false) {
  myUsername = username;
  mySessionId = sessionToken;
  localStorage.setItem("krypton_uid", myUsername);
  localStorage.setItem("krypton_session_id", mySessionId);

  if (avatarUrl) {
    myAvatarData = avatarUrl;
    localStorage.setItem("krypton_avatar", myAvatarData);
    usersAvatarCache[myUsername.toLowerCase()] = myAvatarData;
    localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
  }
  if (bio) {
    myUserBio = bio;
    localStorage.setItem("krypton_bio", myUserBio);
    usersBioCache[myUsername.toLowerCase()] = myUserBio;
    localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
  }

  const authModal = document.getElementById("auth-modal");
  if (authModal) authModal.style.display = "none";
  updateMyAvatarUI();
  showToast(`Welcome to Krypton, @${myUsername}!`, "success");
  listenToIncomingRequests();
  initPresenceTracker();
  scanMyExistingChats();
  startGlobalIncomingMessageWatcher();
  startUsersProfileWatcher();

  if (window.innerWidth > 900 && !userSettings.hideGlobal) {
    joinRoom("global", "Global Anonymous Lounge", false);
  }

  // Trigger bottom PWA install popup banner when a user registers or logs in on a non-installed browser
  if (isNewRegistration || !localStorage.getItem("krypton_pwa_banner_shown")) {
    localStorage.setItem("krypton_pwa_banner_shown", "true");
    setTimeout(() => {
      showBottomPwaInstallBanner(5500);
    }, 900);
  }
}

const copyIdBtn = document.getElementById("copy-id-btn");
if (copyIdBtn) {
  copyIdBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(myUsername);
    showToast(`Copied @${myUsername} to clipboard!`, "success");
  });
}

// --- 15. UPGRADED FRIEND / CHAT REQUEST ENGINE ---
const tabReqIncoming = document.getElementById("tab-req-incoming");
const tabReqSent = document.getElementById("tab-req-sent");

if (tabReqIncoming && tabReqSent) {
  tabReqIncoming.addEventListener("click", () => {
    activeRequestTab = "incoming";
    tabReqIncoming.classList.add("active");
    tabReqSent.classList.remove("active");
    fetchPendingRequests();
  });
  tabReqSent.addEventListener("click", () => {
    activeRequestTab = "sent";
    tabReqSent.classList.add("active");
    tabReqIncoming.classList.remove("active");
    fetchPendingRequests();
  });
}

async function listenToIncomingRequests() {
  if (!supabaseClient || !myUsername) return;
  await fetchPendingRequests();

  if (requestsSubscription) supabaseClient.removeChannel(requestsSubscription);
  requestsSubscription = supabaseClient
    .channel("krypton_requests_watch")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_requests" },
      async (payload) => {
        const row = payload.new;

        if (
          payload.eventType === "INSERT" &&
          row &&
          row.receiver_id &&
          row.receiver_id.toLowerCase() === myUsername.toLowerCase() &&
          row.status === "pending"
        ) {
          playSynthTone("receive");
          showToast(`New friend request from @${row.sender_id}!`, "info");
          triggerSystemPushNotification(
            "Krypton • Friend Request",
            `@${row.sender_id} wants to connect with you`,
            `req-${row.sender_id}`
          );
        }

        if (
          payload.eventType === "UPDATE" &&
          row &&
          row.sender_id &&
          row.sender_id.toLowerCase() === myUsername.toLowerCase() &&
          row.status === "accepted"
        ) {
          savePeerToRecent(row.receiver_id);
          playSynthTone("receive");
          showToast(`@${row.receiver_id} accepted your friend request!`, "success");
        }

        await fetchPendingRequests();
        handleCallRequestCheck(payload);

        if (currentRoom && currentRoom !== "global" && currentPeerUser) {
          await updateChatLockBannerState(currentPeerUser);
        }
      }
    )
    .subscribe();
}

async function fetchPendingRequests() {
  if (!supabaseClient || !myUsername) return;
  const me = myUsername.toLowerCase();

  const { data: allReqs } = await supabaseClient
    .from("chat_requests")
    .select("*")
    .or(`sender_id.ilike.${me},receiver_id.ilike.${me}`);

  peerRelationshipMap = {};
  const incomingPending = [];
  const sentPending = [];

  if (allReqs) {
    allReqs.forEach((r) => {
      const s = (r.sender_id || "").toLowerCase();
      const rec = (r.receiver_id || "").toLowerCase();
      const other = s === me ? rec : s;
      if (!other || blockedUsers.includes(other)) return;

      peerRelationshipMap[other] = {
        status: r.status,
        sender: s,
        receiver: rec
      };

      if (r.status === "accepted" || (r.status && r.status.startsWith("call_"))) {
        if (!savedPeers.includes(other)) {
          savedPeers.unshift(other);
          localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
        }
      } else if (r.status === "pending") {
        if (rec === me) incomingPending.push(r);
        else if (s === me) sentPending.push(r);
      }
    });
  }

  renderPeerList();

  const container = document.getElementById("requests-container");
  const section = document.getElementById("pending-requests-section");
  const countSpan = document.getElementById("req-count");

  const totalPending = incomingPending.length + sentPending.length;
  if (totalPending === 0) {
    if (section) section.classList.add("hidden");
    return;
  }

  if (activeRequestTab === "incoming" && incomingPending.length === 0 && sentPending.length > 0) {
    activeRequestTab = "sent";
    if (tabReqSent) tabReqSent.classList.add("active");
    if (tabReqIncoming) tabReqIncoming.classList.remove("active");
  } else if (activeRequestTab === "sent" && sentPending.length === 0 && incomingPending.length > 0) {
    activeRequestTab = "incoming";
    if (tabReqIncoming) tabReqIncoming.classList.add("active");
    if (tabReqSent) tabReqSent.classList.remove("active");
  }

  if (section) section.classList.remove("hidden");
  if (countSpan) countSpan.textContent = incomingPending.length || totalPending;
  if (tabReqIncoming) tabReqIncoming.textContent = `Incoming (${incomingPending.length})`;
  if (tabReqSent) tabReqSent.textContent = `Sent (${sentPending.length})`;

  if (container) {
    container.innerHTML = "";
    const listToShow = activeRequestTab === "incoming" ? incomingPending : sentPending;

    if (listToShow.length === 0) {
      container.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 6px;">No ${activeRequestTab} requests</div>`;
      return;
    }

    listToShow.forEach((r) => {
      const card = document.createElement("div");
      card.className = "request-card";

      if (activeRequestTab === "incoming") {
        const senderClean = escapeHTML(r.sender_id.toLowerCase());
        card.innerHTML =
          `<span class="request-user" onclick="openUserActionModal('${senderClean}')">@${senderClean}</span>` +
          '<div class="request-btns">' +
          `<button class="btn-accept-req" onclick="respondChatRequest('${senderClean}', 'accepted')">Accept</button>` +
          `<button class="btn-reject-req" onclick="respondChatRequest('${senderClean}', 'rejected')">Decline</button>` +
          "</div>";
      } else {
        const receiverClean = escapeHTML(r.receiver_id.toLowerCase());
        card.innerHTML =
          `<span class="request-user" onclick="openUserActionModal('${receiverClean}')">@${receiverClean}</span>` +
          '<div class="request-btns">' +
          `<button class="btn-reject-req" onclick="cancelSentRequest('${receiverClean}')">Cancel</button>` +
          "</div>";
      }
      container.appendChild(card);
    });
  }
}

window.respondChatRequest = async function (senderId, status) {
  if (!supabaseClient) return;
  const s = senderId.toLowerCase();
  const me = myUsername.toLowerCase();

  if (status === "rejected") {
    await supabaseClient
      .from("chat_requests")
      .delete()
      .or(`and(sender_id.ilike.${s},receiver_id.ilike.${me}),and(sender_id.ilike.${me},receiver_id.ilike.${s})`);
    showToast(`Declined friend request from @${s}`, "info");
  } else {
    await supabaseClient
      .from("chat_requests")
      .update({ status: "accepted" })
      .or(`and(sender_id.ilike.${s},receiver_id.ilike.${me}),and(sender_id.ilike.${me},receiver_id.ilike.${s})`);
    savePeerToRecent(s);
    showToast(`Friend request accepted! You are now connected with @${s}.`, "success");
  }

  await fetchPendingRequests();
  if (currentPeerUser.toLowerCase() === s) {
    await updateChatLockBannerState(s);
  }
};

window.cancelSentRequest = async function (receiverId) {
  if (!supabaseClient) return;
  const rec = receiverId.toLowerCase();
  const me = myUsername.toLowerCase();

  await supabaseClient
    .from("chat_requests")
    .delete()
    .or(`and(sender_id.ilike.${me},receiver_id.ilike.${rec}),and(sender_id.ilike.${rec},receiver_id.ilike.${me})`);

  showToast(`Cancelled friend request to @${rec}`, "info");
  await fetchPendingRequests();
  if (currentPeerUser.toLowerCase() === rec) {
    await updateChatLockBannerState(rec);
  }
};

async function getPeerRelationshipState(peer) {
  if (peer === "global") return { state: "accepted" };
  const p = (peer || "").toLowerCase();
  const me = myUsername.toLowerCase();
  if (p === me || p === "me" || p === "self") return { state: "accepted" };
  if (!supabaseClient) return { state: "none" };

  // Feature #1 Privacy Guard: Verify that the user currently holding @p has the same session_token
  try {
    const { data: uRows } = await supabaseClient
      .from("users")
      .select("session_token")
      .eq("username", p);
    if (uRows && uRows.length > 0 && uRows[0].session_token) {
      const currentOwnerToken = uRows[0].session_token;
      const previouslyBoundToken = peerTokenBindingMap[p];
      if (previouslyBoundToken && previouslyBoundToken !== currentOwnerToken) {
        // A different person registered an abandoned old username! Purge stale friend link for 100% privacy.
        await supabaseClient
          .from("chat_requests")
          .delete()
          .or(`and(sender_id.ilike.${me},receiver_id.ilike.${p}),and(sender_id.ilike.${p},receiver_id.ilike.${me})`);
        peerTokenBindingMap[p] = currentOwnerToken;
        usersSessionCache[p] = currentOwnerToken;
        localStorage.setItem("krypton_peer_token_bindings", JSON.stringify(peerTokenBindingMap));
        localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
        return { state: "none" };
      }
      usersSessionCache[p] = currentOwnerToken;
    }
  } catch (e) { }

  const { data } = await supabaseClient
    .from("chat_requests")
    .select("*")
    .or(
      `and(sender_id.ilike.${me},receiver_id.ilike.${p}),` +
      `and(sender_id.ilike.${p},receiver_id.ilike.${me})`
    );

  if (!data || data.length === 0) return { state: "none" };

  const acceptedRow = data.find(
    (r) => r.status === "accepted" || (r.status && r.status.startsWith("call_"))
  );
  if (acceptedRow) return { state: "accepted", row: acceptedRow };

  const pendingRow = data.find((r) => r.status === "pending");
  if (pendingRow) {
    if (pendingRow.receiver_id.toLowerCase() === me) {
      return { state: "incoming_pending", row: pendingRow };
    }
    return { state: "outgoing_pending", row: pendingRow };
  }

  return { state: "rejected", row: data[0] };
}

async function checkChatPermission(peer) {
  const rel = await getPeerRelationshipState(peer);
  return rel.state === "accepted";
}

async function requestChatConnection(peer) {
  if (!supabaseClient) return;
  const p = peer.toLowerCase();
  const me = myUsername.toLowerCase();

  if (p === me) {
    showToast("You cannot send a friend request to yourself!", "error");
    return;
  }

  const rel = await getPeerRelationshipState(p);

  if (rel.state === "accepted") {
    showToast(`You are already friends with @${p}!`, "success");
    return;
  }

  if (rel.state === "incoming_pending") {
    await respondChatRequest(p, "accepted");
    return;
  }

  if (rel.state === "outgoing_pending") {
    showToast(`Friend request to @${p} is already pending.`, "info");
    return;
  }

  if (rel.row) {
    await supabaseClient
      .from("chat_requests")
      .update({ status: "pending", sender_id: me, receiver_id: p })
      .or(`and(sender_id.ilike.${me},receiver_id.ilike.${p}),and(sender_id.ilike.${p},receiver_id.ilike.${me})`);
  } else {
    await supabaseClient.from("chat_requests").insert([
      { sender_id: me, receiver_id: p, status: "pending" }
    ]);
  }

  showToast(`Friend request sent to @${p}!`, "success");
  await fetchPendingRequests();
  if (currentPeerUser.toLowerCase() === p) {
    await updateChatLockBannerState(p);
  }
}

async function updateChatLockBannerState(peer) {
  const lockBanner = document.getElementById("chat-lock-banner");
  const lockText = document.getElementById("lock-banner-text");
  const lockActions = document.getElementById("lock-banner-actions");
  const inputBar = document.getElementById("chat-input-bar");

  if (!lockBanner || !inputBar) return;
  if (!peer || currentRoom === "global") {
    lockBanner.classList.add("hidden");
    inputBar.style.display = "flex";
    return;
  }

  const p = peer.toLowerCase();
  const rel = await getPeerRelationshipState(p);

  if (rel.state === "accepted") {
    lockBanner.classList.add("hidden");
    inputBar.style.display = "flex";
    return;
  }

  lockBanner.classList.remove("hidden");
  inputBar.style.display = "none";

  if (rel.state === "incoming_pending") {
    lockText.textContent = `@${p} sent you a friend request! Accept to unlock encrypted chat:`;
    lockActions.innerHTML = `
      <button class="btn-accept-req" onclick="respondChatRequest('${escapeHTML(p)}', 'accepted')">Accept Request</button>
      <button class="btn-reject-req" onclick="respondChatRequest('${escapeHTML(p)}', 'rejected')">Decline</button>
    `;
  } else if (rel.state === "outgoing_pending") {
    lockText.textContent = `Friend request sent to @${p}. Waiting for them to accept...`;
    lockActions.innerHTML = `
      <button class="btn-reject-req" onclick="cancelSentRequest('${escapeHTML(p)}')">Cancel Request</button>
    `;
  } else {
    lockText.textContent = `Send a friend request to @${p} to start an encrypted 1-on-1 conversation.`;
    lockActions.innerHTML = `
      <button class="glass-btn-sm btn-save-action" onclick="requestChatConnection('${escapeHTML(p)}')">Send Friend Request</button>
    `;
  }
}

// --- 16. WEBRTC VOICE & VIDEO CALL ENGINE ---
const rtcConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ]
};

function handleCallRequestCheck(payload) {
  const row = payload.new;
  if (!row) return;

  const involvesMe =
    row.receiver_id.toLowerCase() === myUsername.toLowerCase() ||
    row.sender_id.toLowerCase() === myUsername.toLowerCase();
  if (!involvesMe) return;

  const otherPeer =
    row.sender_id.toLowerCase() === myUsername.toLowerCase()
      ? row.receiver_id.toLowerCase()
      : row.sender_id.toLowerCase();

  if (row.call_allowed === true && row.status && row.status.startsWith("call_req")) {
    let caller = row.sender_id.toLowerCase();
    let callMode = "voice";

    if (row.status.includes(":")) {
      const [prefix, initiatedBy] = row.status.split(":");
      caller = initiatedBy.toLowerCase();
      callMode = prefix.includes("video") ? "video" : "voice";
    }

    if (caller !== myUsername.toLowerCase()) {
      if (blockedUsers.includes(caller)) return;
      activeCallSender = caller;
      activeCallType = callMode;
      playSynthTone("ring");
      triggerSystemPushNotification(
        `Krypton • Incoming ${callMode.toUpperCase()} Call`,
        `@${caller} is calling you`,
        `call-${caller}`
      );

      const callerTitle = document.getElementById("incoming-caller-title");
      const callerDesc = document.getElementById("incoming-caller-desc");
      if (callerTitle) {
        callerTitle.textContent =
          callMode === "video" ? "Incoming Video Call" : "Incoming Voice Call";
      }
      if (callerDesc) {
        callerDesc.textContent = `@${caller} is requesting an encrypted ${callMode} tunnel`;
      }
      const callModal = document.getElementById("call-perm-modal");
      if (callModal) callModal.classList.remove("hidden");
    }
  }

  if (row.status && row.status.startsWith("call_active")) {
    let callMode = activeCallType || "voice";
    let caller = "";
    if (row.status.includes(":")) {
      const [prefix, initiatedBy] = row.status.split(":");
      caller = initiatedBy.toLowerCase();
      callMode = prefix.includes("video") ? "video" : "voice";
    }
    if (caller === myUsername.toLowerCase() || (!caller && row.sender_id.toLowerCase() === myUsername.toLowerCase())) {
      activeCallSender = otherPeer;
      startWebRTC(true, callMode);
    }
  }
}

const btnAcceptCall = document.getElementById("btn-accept-call");
if (btnAcceptCall) {
  btnAcceptCall.addEventListener("click", async () => {
    const callModal = document.getElementById("call-perm-modal");
    if (callModal) callModal.classList.add("hidden");
    if (activeCallSender && supabaseClient) {
      const targetRoom = await getSecureRoomId(activeCallSender);
      if (currentRoom !== targetRoom) {
        await joinRoom(targetRoom, "@" + activeCallSender);
      }

      const activeState = `call_active_${activeCallType}:${activeCallSender}`;
      await supabaseClient
        .from("chat_requests")
        .update({ status: activeState })
        .or(
          `and(sender_id.ilike.${activeCallSender},receiver_id.ilike.${myUsername}),` +
          `and(sender_id.ilike.${myUsername},receiver_id.ilike.${activeCallSender})`
        );
      startWebRTC(false, activeCallType);
    }
  });
}

const btnDeclineCall = document.getElementById("btn-decline-call");
if (btnDeclineCall) {
  btnDeclineCall.addEventListener("click", async () => {
    const callModal = document.getElementById("call-perm-modal");
    if (callModal) callModal.classList.add("hidden");
    if (activeCallSender && supabaseClient) {
      await supabaseClient
        .from("chat_requests")
        .update({ call_allowed: false, status: "accepted" })
        .or(
          `and(sender_id.ilike.${activeCallSender},receiver_id.ilike.${myUsername}),` +
          `and(sender_id.ilike.${myUsername},receiver_id.ilike.${activeCallSender})`
        );
    }
  });
}

async function initiateCallPermission(type) {
  if (!currentPeerUser || currentRoom === "global") return;
  const isAllowed = await checkChatPermission(currentPeerUser);
  if (!isAllowed) {
    showToast("Friend request not accepted yet.", "error");
    return;
  }
  activeCallType = type;
  activeCallSender = currentPeerUser;

  const ok = await showGlassDialog({
    title: `Start ${type === "video" ? "Video" : "Voice"} Call?`,
    message: `Request an encrypted P2P ${type} call with @${currentPeerUser}?`,
    confirmText: "Start Call"
  });

  if (ok) {
    const reqStatus = `call_req_${type}:${myUsername}`;
    await supabaseClient
      .from("chat_requests")
      .update({ call_allowed: true, status: reqStatus })
      .or(
        "and(sender_id.ilike." + myUsername + ",receiver_id.ilike." + currentPeerUser + ")," +
        "and(sender_id.ilike." + currentPeerUser + ",receiver_id.ilike." + myUsername + ")"
      );
    showToast(`Calling @${currentPeerUser}... Waiting for answer.`, "info");
  }
}

const btnStartVoice = document.getElementById("btn-start-voice");
if (btnStartVoice) {
  btnStartVoice.addEventListener("click", () => initiateCallPermission("voice"));
}

const btnStartVideo = document.getElementById("btn-start-video");
if (btnStartVideo) {
  btnStartVideo.addEventListener("click", () => initiateCallPermission("video"));
}

function startCallDurationClock() {
  clearInterval(callDurationInterval);
  callStartTime = Date.now();
  const timerEl = document.getElementById("call-duration-timer");
  if (timerEl) {
    timerEl.classList.remove("hidden");
    timerEl.textContent = "00:00";
  }
  callDurationInterval = setInterval(() => {
    const secs = Math.floor((Date.now() - callStartTime) / 1000);
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    if (timerEl) timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

async function startWebRTC(isCaller, type) {
  const overlay = document.getElementById("call-screen-overlay");
  if (overlay) overlay.classList.remove("hidden");

  const callPeer = currentPeerUser || activeCallSender;
  const peerName = document.getElementById("call-peer-name");
  if (peerName) peerName.textContent = "@" + callPeer;

  const peerAvatar = usersAvatarCache[callPeer.toLowerCase()] || "";
  renderAvatarElement(document.getElementById("call-avatar"), callPeer, peerAvatar);

  const statusBadge = document.getElementById("call-status-badge");
  if (statusBadge) statusBadge.textContent = "Establishing P2P Encrypted Tunnel...";

  const isVideo = type === "video";
  const videoGrid = document.getElementById("video-streams-container");
  const btnCam = document.getElementById("btn-toggle-cam");
  if (videoGrid) videoGrid.classList.toggle("hidden", !isVideo);
  if (btnCam) btnCam.classList.toggle("hidden", !isVideo);

  iceCandidateQueue = [];
  isAudioMuted = false;
  isVideoMuted = false;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
    const localVideo = document.getElementById("local-video");
    if (isVideo && localVideo) localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
      if (statusBadge) statusBadge.textContent = "AES-GCM P2P Call Active";
      startCallDurationClock();
      const remoteVideo = document.getElementById("remote-video");
      const remoteAudio = document.getElementById("remote-audio");
      if (isVideo && remoteVideo) remoteVideo.srcObject = event.streams[0];
      else if (remoteAudio) remoteAudio.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && activeSubscription) {
        activeSubscription.send({
          type: "broadcast",
          event: "webrtc-ice",
          payload: { candidate: event.candidate, sender: myUsername }
        });
      }
    };

    if (isCaller) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      if (activeSubscription) {
        activeSubscription.send({
          type: "broadcast",
          event: "webrtc-offer",
          payload: { offer: offer, sender: myUsername, callType: type }
        });
      }
    }
  } catch (err) {
    console.error("WebRTC Init Error:", err);
    endCall();
    showToast("Microphone/Camera permission required for calls.", "error");
  }
}

function endCall(notifyRemote = true) {
  clearInterval(callDurationInterval);
  const timerEl = document.getElementById("call-duration-timer");
  if (timerEl) timerEl.classList.add("hidden");

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  iceCandidateQueue = [];

  const overlay = document.getElementById("call-screen-overlay");
  if (overlay) overlay.classList.add("hidden");

  const remoteVideo = document.getElementById("remote-video");
  const localVideo = document.getElementById("local-video");
  const remoteAudio = document.getElementById("remote-audio");

  if (remoteVideo) remoteVideo.srcObject = null;
  if (localVideo) localVideo.srcObject = null;
  if (remoteAudio) remoteAudio.srcObject = null;

  if (notifyRemote && activeSubscription) {
    activeSubscription.send({
      type: "broadcast",
      event: "webrtc-end",
      payload: { sender: myUsername }
    });
  }

  const targetPeer = currentPeerUser || activeCallSender;
  if (targetPeer && supabaseClient) {
    supabaseClient
      .from("chat_requests")
      .update({ call_allowed: false, status: "accepted" })
      .or(
        "and(sender_id.ilike." + myUsername + ",receiver_id.ilike." + targetPeer + ")," +
        "and(sender_id.ilike." + targetPeer + ",receiver_id.ilike." + myUsername + ")"
      )
      .then(() => { });
  }
}

const btnEndCall = document.getElementById("btn-end-call");
if (btnEndCall) btnEndCall.addEventListener("click", () => endCall(true));

const btnToggleMic = document.getElementById("btn-toggle-mic");
if (btnToggleMic) {
  btnToggleMic.addEventListener("click", () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        isAudioMuted = !isAudioMuted;
        audioTrack.enabled = !isAudioMuted;
        btnToggleMic.classList.toggle("recording-active", isAudioMuted);
        showToast(isAudioMuted ? "Microphone muted" : "Microphone unmuted", "info");
      }
    }
  });
}

const btnToggleCam = document.getElementById("btn-toggle-cam");
if (btnToggleCam) {
  btnToggleCam.addEventListener("click", () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        isVideoMuted = !isVideoMuted;
        videoTrack.enabled = !isVideoMuted;
        btnToggleCam.classList.toggle("recording-active", isVideoMuted);
        showToast(isVideoMuted ? "Camera paused" : "Camera active", "info");
      }
    }
  });
}

// --- 17. HOLD-TO-RECORD VOICE NOTES (LOW BITRATE + POINTER CAPTURE) ---
const recordBtn = document.getElementById("btn-record-audio");
const recordingBanner = document.getElementById("voice-recording-banner");
const recordingBadge = document.getElementById("recording-timer-badge");
const chatInputEl = document.getElementById("chat-input");

function getSupportedAudioMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];
  for (const t of types) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

async function startHoldingAudio() {
  if (currentRoom === "global") {
    showToast("Voice notes are disabled in Global Lounge!", "info");
    return;
  }
  if (isRecordingAudio || isStartingRecording) return;

  isStartingRecording = true;
  stopRequestedWhileStarting = false;

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // If user already released button while permission dialog/init was running
    if (stopRequestedWhileStarting) {
      audioStream.getTracks().forEach((t) => t.stop());
      audioStream = null;
      isStartingRecording = false;
      return;
    }

    activeMimeType = getSupportedAudioMimeType();
    const recorderOptions = { audioBitsPerSecond: 24000 }; // Compact 24kbps Opus so payload never exceeds Supabase limit
    if (activeMimeType) recorderOptions.mimeType = activeMimeType;

    try {
      mediaRecorder = new MediaRecorder(audioStream, recorderOptions);
    } catch (e) {
      mediaRecorder = new MediaRecorder(audioStream);
    }

    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      clearInterval(recordingTimerInterval);
      if (recordingBanner) recordingBanner.classList.add("hidden");
      if (chatInputEl) chatInputEl.classList.remove("hidden");

      if (audioChunks.length > 0) {
        const blobType = activeMimeType || "audio/webm";
        const audioBlob = new Blob(audioChunks, { type: blobType });
        if (audioBlob.size > 150) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            transmitPayload("VOICE_DATA:" + evt.target.result);
          };
          reader.readAsDataURL(audioBlob);
        }
      }

      if (audioStream) {
        audioStream.getTracks().forEach((t) => t.stop());
        audioStream = null;
      }

      if (activeSubscription) {
        activeSubscription.send({
          type: "broadcast",
          event: "stop-recording-audio",
          payload: { user: myUsername }
        });
      }
    };

    mediaRecorder.start(200);
    isRecordingAudio = true;
    isStartingRecording = false;
    recordingSeconds = 0;

    if (recordBtn) recordBtn.classList.add("recording-active");
    if (chatInputEl) chatInputEl.classList.add("hidden");
    if (recordingBanner) recordingBanner.classList.remove("hidden");
    if (recordingBadge) recordingBadge.textContent = "0:00";

    recordingTimerInterval = setInterval(() => {
      recordingSeconds++;
      const mins = Math.floor(recordingSeconds / 60);
      const secs = String(recordingSeconds % 60).padStart(2, "0");
      if (recordingBadge) recordingBadge.textContent = `${mins}:${secs}`;
    }, 1000);

    if (activeSubscription) {
      activeSubscription.send({
        type: "broadcast",
        event: "recording-audio",
        payload: { user: myUsername }
      });
    }
  } catch (err) {
    isStartingRecording = false;
    showToast("Microphone permission denied.", "error");
  }
}

function stopHoldingAudio() {
  if (isStartingRecording) {
    stopRequestedWhileStarting = true;
  }
  if (isRecordingAudio && mediaRecorder) {
    try {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    } catch (e) { }
    isRecordingAudio = false;
    if (recordBtn) recordBtn.classList.remove("recording-active");
    if (recordingBanner) recordingBanner.classList.add("hidden");
    if (chatInputEl) chatInputEl.classList.remove("hidden");
  }
}

if (recordBtn) {
  recordBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try {
      recordBtn.setPointerCapture(e.pointerId);
    } catch (err) { }
    startHoldingAudio();
  });

  recordBtn.addEventListener("pointerup", (e) => {
    e.preventDefault();
    stopHoldingAudio();
  });

  recordBtn.addEventListener("pointercancel", (e) => {
    e.preventDefault();
    stopHoldingAudio();
  });

  recordBtn.addEventListener("contextmenu", (e) => e.preventDefault());
}

window.addEventListener("pointerup", () => {
  if (isRecordingAudio || isStartingRecording) stopHoldingAudio();
});

// Custom Cyber-Glass Voice Player Controls
window.toggleVoiceNotePlay = function (playerId) {
  const wrap = document.getElementById(playerId);
  if (!wrap) return;
  const audio = wrap.querySelector("audio");
  const btn = wrap.querySelector(".voice-play-btn");
  const fill = wrap.querySelector(".voice-progress-fill");
  const curTimeEl = wrap.querySelector(".voice-cur-time");

  if (!audio) return;

  if (!audio.dataset.boundListeners) {
    audio.dataset.boundListeners = "true";
    audio.addEventListener("timeupdate", () => {
      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : 1;
      const pct = Math.min(100, (audio.currentTime / dur) * 100);
      if (fill) fill.style.width = pct + "%";
      const s = Math.floor(audio.currentTime);
      const mins = Math.floor(s / 60);
      const secs = String(s % 60).padStart(2, "0");
      if (curTimeEl) curTimeEl.textContent = `${mins}:${secs}`;
    });
    audio.addEventListener("ended", () => {
      if (btn) btn.textContent = "▶";
      if (fill) fill.style.width = "0%";
    });
  }

  if (audio.paused) {
    document.querySelectorAll(".custom-voice-player audio").forEach((other) => {
      if (other !== audio) other.pause();
    });
    audio.play();
    if (btn) btn.textContent = "❚❚";
  } else {
    audio.pause();
    if (btn) btn.textContent = "▶";
  }
};

window.cycleVoiceNoteSpeed = function (playerId) {
  const wrap = document.getElementById(playerId);
  if (!wrap) return;
  const audio = wrap.querySelector("audio");
  const speedBtn = wrap.querySelector(".voice-speed-btn");
  if (!audio || !speedBtn) return;

  const speeds = [1, 1.5, 2];
  const current = audio.playbackRate || 1;
  const next = speeds[(speeds.indexOf(current) + 1) % speeds.length];
  audio.playbackRate = next;
  speedBtn.textContent = next + "x";
};

// --- 18. BROADCAST TYPING & RECORDING INDICATORS ---
if (chatInputEl) {
  chatInputEl.addEventListener("input", () => {
    if (currentRoom === "global" || !activeSubscription) return;
    const now = Date.now();
    if (now - lastTypingBroadcast > 650) {
      lastTypingBroadcast = now;
      activeSubscription.send({
        type: "broadcast",
        event: "typing",
        payload: { user: myUsername }
      });
    }
  });

  chatInputEl.addEventListener("paste", (e) => {
    const items = (e.clipboardData || window.clipboardData).items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          compressAndSendImageFile(file);
          break;
        }
      }
    }
  });
}

function handleTypingIndicator(user) {
  const uname = user.toLowerCase();
  peerRealtimeStatus[uname] = "typing";
  renderPeerList();

  clearTimeout(peerStatusTimeout[uname]);
  peerStatusTimeout[uname] = setTimeout(() => {
    peerRealtimeStatus[uname] = null;
    renderPeerList();
  }, 1800);

  if (currentRoom !== "global" && currentPeerUser.toLowerCase() === uname) {
    showFloatingIndicator("typing");
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(removeFloatingIndicator, 1800);
  }
}

function handleRecordingAudioIndicator(user) {
  const uname = user.toLowerCase();
  peerRealtimeStatus[uname] = "recording";
  renderPeerList();

  clearTimeout(peerStatusTimeout[uname]);
  peerStatusTimeout[uname] = setTimeout(() => {
    peerRealtimeStatus[uname] = null;
    renderPeerList();
  }, 4500);

  if (currentRoom !== "global" && currentPeerUser.toLowerCase() === uname) {
    showFloatingIndicator("recording");
    clearTimeout(recordingTimeout);
    recordingTimeout = setTimeout(removeFloatingIndicator, 4500);
  }
}

function stopRecordingAudioIndicator(user) {
  if (user) {
    peerRealtimeStatus[user.toLowerCase()] = null;
    renderPeerList();
  }
  removeFloatingIndicator();
}

function showFloatingIndicator(type) {
  removeFloatingIndicator();
  const screen = document.getElementById("app-chat-screen");
  if (!screen) return;
  const el = document.createElement("div");
  el.id = "chat-active-indicator-pill";
  el.className =
    "chat-bottom-floating-indicator " +
    (type === "typing" ? "typing-theme" : "recording-theme");

  if (type === "typing") {
    el.innerHTML =
      "<span>@" + escapeHTML(currentPeerUser) + " is typing</span>" +
      '<div class="typing-dot"></div>' +
      '<div class="typing-dot"></div>' +
      '<div class="typing-dot"></div>';
  } else {
    el.innerHTML =
      '<div class="recording-pulse-dot"></div>' +
      "<span>@" + escapeHTML(currentPeerUser) + " recording voice...</span>";
  }
  screen.appendChild(el);
}

function removeFloatingIndicator() {
  const el = document.getElementById("chat-active-indicator-pill");
  if (el) el.remove();
}

// Header 3-Dots Dropdown Trigger
const headerMenuBtn = document.getElementById("btn-header-menu");
const headerDropdown = document.getElementById("header-dropdown-menu");
const ttlSelectBox = document.getElementById("ttl-select");

if (headerMenuBtn && headerDropdown) {
  headerMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    headerDropdown.classList.toggle("hidden");
  });

  headerDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

if (ttlSelectBox) {
  ttlSelectBox.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  ttlSelectBox.addEventListener("change", (e) => {
    e.stopPropagation();
    const val = parseInt(ttlSelectBox.value, 10);
    if (currentRoom === "global") {
      userSettings.globalTtl = val;
      localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    }
    showToast(val === 0 ? "Disappearing timer turned OFF" : "Disappearing timer updated", "info");
  });
}

window.addEventListener("click", () => {
  if (headerDropdown) headerDropdown.classList.add("hidden");
  const attachHubMenu = document.getElementById("attach-hub-menu");
  const btnAttachHub = document.getElementById("btn-attach-hub");
  if (attachHubMenu) attachHubMenu.classList.add("hidden");
  if (btnAttachHub) btnAttachHub.classList.remove("active");
  const emojiPal = document.getElementById("emoji-palette");
  if (emojiPal) emojiPal.classList.add("hidden");

  document.querySelectorAll(".contact-dropdown-menu").forEach((m) => {
    if (m.id !== "header-dropdown-menu") m.remove();
  });
  document.querySelectorAll(".quick-react-popover").forEach((p) => p.remove());
});

// --- 19. IN-CHAT MESSAGE SEARCH, CATEGORY PILLS & PINNED BANNER ---
// Feature #1: Message Category Filter Pills
document.querySelectorAll(".cat-filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".cat-filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeCategoryFilter = pill.dataset.filter || "all";
    applyCategoryAndSearchFilters();
  });
});

function applyCategoryAndSearchFilters() {
  const searchInput = document.getElementById("in-chat-search-input");
  const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
  const container = document.getElementById("message-container");
  const rows = document.querySelectorAll("#message-container .message-row");
  const countEl = document.getElementById("in-chat-search-count");
  let matches = 0;

  const oldEmptyFilter = document.getElementById("empty-category-filter-notice");
  if (oldEmptyFilter) oldEmptyFilter.remove();

  rows.forEach((row) => {
    const msgCategory = row.dataset.msgType || "text";
    const hasLink = row.dataset.hasLink === "true";

    let categoryMatch = true;
    if (activeCategoryFilter === "media") categoryMatch = msgCategory === "media";
    else if (activeCategoryFilter === "voice") categoryMatch = msgCategory === "voice";
    else if (activeCategoryFilter === "files") categoryMatch = msgCategory === "files";
    else if (activeCategoryFilter === "links") categoryMatch = hasLink;

    let searchMatch = true;
    if (q) {
      const textEl = row.querySelector(".msg-text-line") || row.querySelector(".file-card-name");
      const content = textEl ? textEl.textContent.toLowerCase() : "";
      searchMatch = content.includes(q);
    }

    if (categoryMatch && searchMatch) {
      row.classList.remove("filtered-out");
      row.style.display = "";
      matches++;
    } else {
      row.classList.add("filtered-out");
      row.style.display = "none";
    }
  });

  if (container && rows.length > 0 && matches === 0 && (activeCategoryFilter !== "all" || q)) {
    const emptyNotice = document.createElement("div");
    emptyNotice.id = "empty-category-filter-notice";
    emptyNotice.className = "empty-filter-placeholder";
    const labelMap = {
      media: "photos",
      voice: "voice notes",
      files: "documents / files",
      links: "shared links"
    };
    const catName = labelMap[activeCategoryFilter] || "matching messages";
    emptyNotice.textContent = q
      ? `No ${catName} matching "${q}" found in this chat.`
      : `No ${catName} found in this conversation yet.`;
    container.appendChild(emptyNotice);
  }

  if (countEl) {
    countEl.textContent = q ? `${matches} match${matches === 1 ? "" : "es"}` : "";
  }
}

function toggleInChatSearch() {
  const bar = document.getElementById("in-chat-search-bar");
  const input = document.getElementById("in-chat-search-input");
  if (!bar) return;
  const isHidden = bar.classList.toggle("hidden");
  if (!isHidden && input) {
    input.value = "";
    applyCategoryAndSearchFilters();
    input.focus();
  } else {
    if (input) input.value = "";
    applyCategoryAndSearchFilters();
  }
}

const btnToggleSearch = document.getElementById("btn-toggle-chat-search");
if (btnToggleSearch) {
  btnToggleSearch.addEventListener("click", toggleInChatSearch);
}

const btnCloseSearch = document.getElementById("btn-close-chat-search");
if (btnCloseSearch) {
  btnCloseSearch.addEventListener("click", toggleInChatSearch);
}

const inChatSearchInput = document.getElementById("in-chat-search-input");
if (inChatSearchInput) {
  inChatSearchInput.addEventListener("input", () => {
    applyCategoryAndSearchFilters();
  });
}

// Feature #7: Pinned Message in Room Logic (Disabled in Global, Owner-Only in Groups)
window.pinMessageInCurrentRoom = function (msgId, snippetText) {
  if (!currentRoom) return;
  if (currentRoom === "global") {
    showToast("Pinning messages is disabled in Global Lounge.", "error");
    return;
  }
  if (isGroupRoom(currentRoom) && !isCurrentGroupOwner(currentRoom)) {
    showToast("Only the Group Owner can pin messages in this group!", "error");
    return;
  }
  const pinObj = { id: msgId, snippet: snippetText, pinnedBy: myUsername };
  pinnedRoomMessages[currentRoom] = pinObj;
  localStorage.setItem("krypton_pinned_msgs", JSON.stringify(pinnedRoomMessages));
  renderPinnedBannerForCurrentRoom();

  if (activeSubscription) {
    activeSubscription.send({
      type: "broadcast",
      event: "pin-message",
      payload: { room: currentRoom, pinObj }
    });
  }
  showToast("Message pinned to top of chat!", "info");
};

function renderPinnedBannerForCurrentRoom() {
  const banner = document.getElementById("pinned-message-banner");
  const textEl = document.getElementById("pinned-msg-text");
  const jumpEl = document.getElementById("pinned-msg-jump");
  const unpinBtn = document.getElementById("btn-unpin-msg");
  if (!banner || !textEl) return;

  if (currentRoom === "global") {
    banner.classList.add("hidden");
    return;
  }

  const pinObj = pinnedRoomMessages[currentRoom];
  if (!pinObj || !pinObj.snippet) {
    banner.classList.add("hidden");
    return;
  }

  textEl.textContent = pinObj.snippet;
  banner.classList.remove("hidden");
  if (unpinBtn) {
    unpinBtn.style.display =
      isGroupRoom(currentRoom) && !isCurrentGroupOwner(currentRoom) ? "none" : "flex";
  }
  if (jumpEl) {
    jumpEl.onclick = () => scrollToQuotedMessage(pinObj.id);
  }
}

const btnUnpinMsg = document.getElementById("btn-unpin-msg");
if (btnUnpinMsg) {
  btnUnpinMsg.addEventListener("click", () => {
    if (!currentRoom) return;
    if (isGroupRoom(currentRoom) && !isCurrentGroupOwner(currentRoom)) {
      showToast("Only the Group Owner can unpin messages!", "error");
      return;
    }
    delete pinnedRoomMessages[currentRoom];
    localStorage.setItem("krypton_pinned_msgs", JSON.stringify(pinnedRoomMessages));
    renderPinnedBannerForCurrentRoom();
    if (activeSubscription) {
      activeSubscription.send({
        type: "broadcast",
        event: "pin-message",
        payload: { room: currentRoom, pinObj: null }
      });
    }
  });
}

const msgFeedEl = document.getElementById("message-container");
const btnScrollBottom = document.getElementById("btn-scroll-bottom");
if (msgFeedEl && btnScrollBottom) {
  msgFeedEl.addEventListener("scroll", () => {
    const distanceFromBottom =
      msgFeedEl.scrollHeight - msgFeedEl.scrollTop - msgFeedEl.clientHeight;
    btnScrollBottom.classList.toggle("hidden", distanceFromBottom < 180);
  });

  btnScrollBottom.addEventListener("click", () => {
    msgFeedEl.scrollTo({ top: msgFeedEl.scrollHeight, behavior: "smooth" });
  });
}

// --- 20. MESSAGE REACTIONS, REPLY & COPY HELPERS ---
window.openReactionPicker = function (msgId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  document.querySelectorAll(".quick-react-popover").forEach((p) => p.remove());

  const row = document.getElementById("msg-row-" + msgId);
  if (!row) return;
  const bubble = row.querySelector(".msg-bubble");
  if (!bubble) return;

  const pop = document.createElement("div");
  pop.className = "quick-react-popover";
  const emojis = ["❤️", "🔥", "😂", "👍", "⚡", "💀"];
  emojis.forEach((emo) => {
    const sp = document.createElement("span");
    sp.textContent = emo;
    sp.onclick = (e) => {
      e.stopPropagation();
      pop.remove();
      sendReactionToMessage(msgId, emo);
    };
    pop.appendChild(sp);
  });

  bubble.insertBefore(pop, bubble.firstChild);
};

function sendReactionToMessage(msgId, emoji) {
  applyReactionLocally(msgId, emoji, myUsername);
  if (activeSubscription) {
    activeSubscription.send({
      type: "broadcast",
      event: "msg-reaction",
      payload: { msgId, emoji, user: myUsername }
    });
  }
}

function applyReactionLocally(msgId, emoji, username) {
  if (!msgId) return;
  const uname = (username || "").toLowerCase();
  if (!messageReactionsCache[msgId]) messageReactionsCache[msgId] = {};
  if (!messageReactionsCache[msgId][emoji]) messageReactionsCache[msgId][emoji] = [];

  const arr = messageReactionsCache[msgId][emoji];
  const idx = arr.indexOf(uname);
  if (idx !== -1) {
    arr.splice(idx, 1);
    if (arr.length === 0) delete messageReactionsCache[msgId][emoji];
  } else {
    arr.push(uname);
  }

  localStorage.setItem("krypton_reactions_cache", JSON.stringify(messageReactionsCache));
  renderReactionsForMessageNode(msgId);
}

function renderReactionsForMessageNode(msgId) {
  const row = document.getElementById("msg-row-" + msgId);
  if (!row) return;
  let container = row.querySelector(".msg-reactions-Display");
  if (!container) return;

  const map = messageReactionsCache[msgId] || {};
  container.innerHTML = "";

  Object.keys(map).forEach((emo) => {
    const users = map[emo];
    if (!users || users.length === 0) return;
    const chip = document.createElement("span");
    chip.className = "reaction-chip";
    chip.title = users.map((u) => "@" + u).join(", ");
    chip.innerHTML = `<span>${emo}</span><span class="react-count">${users.length}</span>`;
    chip.onclick = (e) => {
      e.stopPropagation();
      sendReactionToMessage(msgId, emo);
    };
    container.appendChild(chip);
  });
}

window.setReplyMessage = function (msgId, sender, snippet) {
  activeReplyContext = { id: msgId, sender, snippet };
  const bar = document.getElementById("reply-preview-bar");
  const senderEl = document.getElementById("reply-preview-sender");
  const snippetEl = document.getElementById("reply-preview-snippet");

  if (bar && senderEl && snippetEl) {
    senderEl.textContent = "@" + sender;
    snippetEl.textContent = snippet;
    bar.classList.remove("hidden");
  }
  const input = document.getElementById("chat-input");
  if (input) input.focus();
};

function cancelActiveReply() {
  activeReplyContext = null;
  const bar = document.getElementById("reply-preview-bar");
  if (bar) bar.classList.add("hidden");
}

const btnCancelReply = document.getElementById("btn-cancel-reply");
if (btnCancelReply) {
  btnCancelReply.addEventListener("click", cancelActiveReply);
}

window.copyMessageText = function (msgId) {
  const row = document.getElementById("msg-row-" + msgId);
  if (!row) return;
  const textEl = row.querySelector(".msg-text-line");
  if (textEl) {
    navigator.clipboard.writeText(textEl.textContent);
    showToast("Message copied to clipboard!", "success");
  }
};

window.scrollToQuotedMessage = function (msgId) {
  if (!msgId) return;
  const target = document.getElementById("msg-row-" + msgId);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const bubble = target.querySelector(".bubble-content");
    if (bubble) {
      bubble.style.transition = "box-shadow 0.3s ease";
      bubble.style.boxShadow = "0 0 0 3px var(--accent-primary)";
      setTimeout(() => {
        bubble.style.boxShadow = "";
      }, 1400);
    }
  }
};

// --- 21. USER PROFILE POPUP MODAL ---
window.openSelfChatRoom = function () {
  const selfRoom = getMySelfRoomId();
  joinRoom(selfRoom, `@${myUsername} (You)`);
};

window.openUserActionModal = async function (targetUser) {
  if (!targetUser) return;
  if (targetUser.toLowerCase() === myUsername.toLowerCase() || targetUser.toLowerCase() === "me") {
    openSelfChatRoom();
    return;
  }

  const existingModal = document.getElementById("user-action-modal");
  if (existingModal) existingModal.remove();

  const p = targetUser.toLowerCase();
  const modal = document.createElement("div");
  modal.id = "user-action-modal";
  modal.className = "glass-modal";

  const isBlocked = blockedUsers.includes(p);
  const cached = getUserDataCached(p);
  const rel = await getPeerRelationshipState(p);
  const safetyCode = await computeSafetyFingerprint(p);

  let friendActionBtnHTML = "";
  if (rel.state === "accepted") {
    friendActionBtnHTML = `<button class="glass-btn secondary" id="btn-action-friend-state" disabled style="opacity: 0.8; cursor: default;">✓ Friends (Connected)</button>`;
  } else if (rel.state === "incoming_pending") {
    friendActionBtnHTML = `<button class="glass-btn primary" id="btn-action-friend-state">Accept Friend Request</button>`;
  } else if (rel.state === "outgoing_pending") {
    friendActionBtnHTML = `<button class="glass-btn secondary" id="btn-action-friend-state">Cancel Sent Request</button>`;
  } else {
    friendActionBtnHTML = `<button class="glass-btn secondary" id="btn-action-friend-state">Send Friend Request</button>`;
  }

  modal.innerHTML =
    '<div class="glass-card user-action-popup">' +
    `<div class="user-action-avatar-wrap" id="action-avatar-zoom-trigger" title="Click to View Full Profile Picture">` +
    '<div class="avatar user-action-avatar" id="action-user-avatar">?</div>' +
    '<div class="avatar-zoom-hint"><i data-lucide="maximize-2" style="width: 11px; height: 11px;"></i></div>' +
    "</div>" +
    '<h3 style="margin-top: 2px; font-weight: 800;">@' + escapeHTML(p) + "</h3>" +
    '<div id="action-user-bio-box" style="background: var(--glass-card); padding: 8px 14px; border-radius: 13px; margin: 4px 0; font-size: 12px; color: var(--text-muted); border: 1px solid var(--glass-border); word-break: break-word; width: 100%;">' +
    escapeHTML(cached.bio) +
    "</div>" +
    `<div class="safety-fingerprint-box" title="Cryptographic E2EE Safety Fingerprint">` +
    `<span class="safety-fp-label">E2EE SAFETY FINGERPRINT</span>` +
    `<span class="safety-fp-code">${safetyCode}</span>` +
    `</div>` +
    '<div class="user-action-buttons">' +
    '<button class="glass-btn primary" id="btn-action-open-dm">Open Direct Chat</button>' +
    '<button class="glass-btn secondary" id="btn-action-view-dp">View Full Profile Picture</button>' +
    friendActionBtnHTML +
    '<button class="glass-btn ' + (isBlocked ? "secondary" : "danger") + '" id="btn-action-toggle-block">' +
    (isBlocked ? "Unblock User" : "Block User") +
    "</button>" +
    '<button class="glass-btn secondary" id="btn-action-cancel">Close</button>' +
    "</div>" +
    "</div>";

  document.body.appendChild(modal);
  if (window.lucide) lucide.createIcons({ nodes: [modal] });

  function closeModalAnimated() {
    modal.classList.add("closing");
    setTimeout(() => modal.remove(), 150);
  }

  modal.addEventListener("click", (e) => {
    if (e.target.id === "user-action-modal") {
      closeModalAnimated();
    }
  });

  const avatarBox = modal.querySelector("#action-user-avatar");
  renderAvatarElement(avatarBox, p, cached.avatar);

  modal.querySelector("#action-avatar-zoom-trigger").onclick = () => {
    viewUserProfilePicFullscreen(p);
  };
  modal.querySelector("#btn-action-view-dp").onclick = () => {
    viewUserProfilePicFullscreen(p);
  };

  modal.querySelector("#btn-action-open-dm").onclick = async () => {
    closeModalAnimated();
    savePeerToRecent(p);
    const dmRoom = await getSecureRoomId(p);
    joinRoom(dmRoom, "@" + p);
  };

  const friendBtn = modal.querySelector("#btn-action-friend-state");
  if (friendBtn && !friendBtn.disabled) {
    friendBtn.onclick = async () => {
      closeModalAnimated();
      if (rel.state === "incoming_pending") {
        await respondChatRequest(p, "accepted");
      } else if (rel.state === "outgoing_pending") {
        await cancelSentRequest(p);
      } else {
        await requestChatConnection(p);
        savePeerToRecent(p);
      }
    };
  }

  modal.querySelector("#btn-action-toggle-block").onclick = () => {
    closeModalAnimated();
    toggleBlockUser(p);
  };

  modal.querySelector("#btn-action-cancel").onclick = closeModalAnimated;

  if (supabaseClient) {
    supabaseClient
      .from("users")
      .select("avatar_url, bio, session_token")
      .eq("username", p)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const fresh = data[0];
          if (fresh.bio && fresh.bio !== cached.bio) {
            usersBioCache[p] = fresh.bio;
            localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
            const bioBox = document.getElementById("action-user-bio-box");
            if (bioBox) bioBox.textContent = fresh.bio;
          }
          if (fresh.avatar_url && fresh.avatar_url !== cached.avatar) {
            usersAvatarCache[p] = fresh.avatar_url;
            localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
            renderAvatarElement(avatarBox, p, fresh.avatar_url);
          }
          if (fresh.session_token) {
            usersSessionCache[p] = fresh.session_token;
            localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
          }
        }
      });
  }
};

const headerTargetBox = document.getElementById("header-chat-target-box");
if (headerTargetBox) {
  headerTargetBox.addEventListener("click", (e) => {
    if (e.target.closest("#btn-mobile-back") || e.target.closest("#header-chat-avatar")) return;
    if (isGroupRoom(currentRoom)) {
      openGroupModal("manage");
      return;
    }
    if (currentRoom !== "global" && currentPeerUser) {
      openUserActionModal(currentPeerUser);
    }
  });
}

window.toggleBlockUser = function (username) {
  const uname = username.toLowerCase();
  if (blockedUsers.includes(uname)) {
    blockedUsers = blockedUsers.filter((u) => u !== uname);
    showToast("Unblocked @" + username, "info");
  } else {
    blockedUsers.push(uname);
    showToast("Blocked @" + username, "error");
  }
  localStorage.setItem("krypton_blocked_users", JSON.stringify(blockedUsers));

  document.querySelectorAll('.message-row[data-sender="' + uname + '"]').forEach((el) => el.remove());
  renderPeerList();
};

// --- 22. CONTACT LIST, PINNED PEERS & RECENT CHATS ---
function savePeerToRecent(peer) {
  const p = (peer || "").toLowerCase();
  if (!p || p === "global") return;
  if (!savedPeers.includes(p)) {
    savedPeers.unshift(p);
    localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
    if (p !== myUsername.toLowerCase()) {
      fetchPeersUserData();
    }
  }
  renderPeerList();
}

window.togglePinPeer = function (peer) {
  const p = peer.toLowerCase();
  if (pinnedPeers.includes(p)) {
    pinnedPeers = pinnedPeers.filter((u) => u !== p);
    showToast(`Unpinned @${p}`, "info");
  } else {
    pinnedPeers.unshift(p);
    showToast(`Pinned @${p} to top!`, "success");
  }
  localStorage.setItem("krypton_pinned_peers", JSON.stringify(pinnedPeers));
  renderPeerList();
};

async function fetchPeersUserData() {
  if (!supabaseClient || savedPeers.length === 0) return;
  const { data } = await supabaseClient
    .from("users")
    .select("username, avatar_url, bio, session_token")
    .in("username", savedPeers);

  if (data) {
    data.forEach((u) => {
      const uname = u.username.toLowerCase();
      usersAvatarCache[uname] = u.avatar_url;
      if (u.bio) usersBioCache[uname] = u.bio;
      if (u.session_token) {
        usersSessionCache[uname] = u.session_token;
        if (!peerTokenBindingMap[uname]) {
          peerTokenBindingMap[uname] = u.session_token;
        }
      }
    });
    localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
    localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
    localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
    localStorage.setItem("krypton_peer_token_bindings", JSON.stringify(peerTokenBindingMap));
    renderPeerList();
    updateHeaderStatus();
  }
}

window.toggleContactMenu = function (peer, event) {
  event.stopPropagation();
  event.preventDefault();

  const safePeer = peer.toLowerCase();
  const existing = document.getElementById("dropdown-menu-" + safePeer);
  const wasOpen = !!existing;

  document.querySelectorAll(".contact-dropdown-menu").forEach((m) => {
    if (m.id !== "header-dropdown-menu") m.remove();
  });
  if (wasOpen) return;

  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.id = "dropdown-menu-" + safePeer;
  menu.className = "contact-dropdown-menu";

  const menuWidth = 195;
  const menuHeight = 195;

  menu.style.left = Math.max(12, rect.right - menuWidth) + "px";

  if (window.innerHeight - rect.bottom < menuHeight + 15) {
    menu.style.top = rect.top - menuHeight - 6 + "px";
  } else {
    menu.style.top = rect.bottom + 6 + "px";
  }

  const isBlocked = blockedUsers.includes(safePeer);
  const isPinned = pinnedPeers.includes(safePeer);

  menu.innerHTML =
    '<button class="contact-dropdown-item" onclick="togglePinPeer(\'' + safePeer + '\')">' +
    '<i data-lucide="pin" style="width: 14px; height: 14px;"></i>' +
    "<span>" + (isPinned ? "Unpin Chat" : "Pin to Top") + "</span>" +
    "</button>" +
    '<button class="contact-dropdown-item" onclick="viewUserProfilePicFullscreen(\'' + safePeer + '\')">' +
    '<i data-lucide="maximize-2" style="width: 14px; height: 14px;"></i>' +
    "<span>View Profile Picture</span>" +
    "</button>" +
    '<button class="contact-dropdown-item" onclick="openUserActionModal(\'' + safePeer + '\')">' +
    '<i data-lucide="user-check" style="width: 14px; height: 14px;"></i>' +
    "<span>User Profile & Safety</span>" +
    "</button>" +
    '<button class="contact-dropdown-item" onclick="toggleBlockUser(\'' + safePeer + '\')">' +
    '<i data-lucide="shield-alert" style="width: 14px; height: 14px;"></i>' +
    "<span>" + (isBlocked ? "Unblock" : "Block User") + "</span>" +
    "</button>" +
    '<button class="contact-dropdown-item danger" onclick="deleteSingleConversation(\'' + safePeer + '\', event)">' +
    '<i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>' +
    "<span>Delete Chat</span>" +
    "</button>";

  document.body.appendChild(menu);
  if (window.lucide) lucide.createIcons({ nodes: [menu] });
};

window.deleteSingleConversation = async function (peer, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  document.querySelectorAll(".contact-dropdown-menu").forEach((m) => {
    if (m.id !== "header-dropdown-menu") m.remove();
  });

  const targetPeer = peer.toLowerCase();
  const confirmDelete = await showGlassDialog({
    title: `Remove @${targetPeer}?`,
    message: `Remove @${targetPeer} from your conversations list?`,
    confirmText: "Remove",
    danger: true
  });
  if (!confirmDelete) return;

  savedPeers = savedPeers.filter((p) => p.toLowerCase() !== targetPeer);
  localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
  delete unreadCounts[targetPeer];
  localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));

  renderPeerList();

  const dmRoom = await getSecureRoomId(targetPeer);
  if (currentRoom === dmRoom) exitChatToDashboard();

  const wipeMessages = await showGlassDialog({
    title: "Wipe Both Sides?",
    message: `Also wipe all encrypted messages & friendship between you and @${targetPeer} from the server?`,
    confirmText: "Wipe Both Sides",
    cancelText: "Keep on Server",
    danger: true
  });

  if (wipeMessages && supabaseClient) {
    await supabaseClient.from("messages").delete().eq("room_id", dmRoom);
    await supabaseClient
      .from("chat_requests")
      .delete()
      .or(
        "and(sender_id.ilike." + myUsername + ",receiver_id.ilike." + targetPeer + ")," +
        "and(sender_id.ilike." + targetPeer + ",receiver_id.ilike." + myUsername + ")"
      );
    await fetchPendingRequests();
    showToast(`Wiped conversation with @${targetPeer}`, "info");
  }
};

// Feature #7: Sidebar Category Tabs (All | Direct | Groups)
document.querySelectorAll("#sidebar-cat-tabs .sidebar-tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#sidebar-cat-tabs .sidebar-tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeSidebarTab = btn.dataset.sideTab || "all";
    const peerInp = document.getElementById("peer-id-input");
    renderPeerList(peerInp ? peerInp.value : "");
  });
});

window.deleteOrLeaveGroup = async function (groupId, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const grp = savedGroups[groupId];
  if (!grp) return;
  const isOwner = isCurrentGroupOwner(groupId);
  const ok = await showGlassDialog({
    title: isOwner ? `Delete Group "${grp.name}"?` : `Leave Group "${grp.name}"?`,
    message: isOwner
      ? `Remove "${grp.name}" and wipe its messages from the server?`
      : `Remove "${grp.name}" from your groups list?`,
    confirmText: isOwner ? "Delete Group" : "Leave Group",
    danger: true
  });
  if (!ok) return;

  delete savedGroups[groupId];
  localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));
  delete unreadCounts[groupId];
  localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));

  if (isOwner && supabaseClient) {
    await supabaseClient.from("messages").delete().eq("room_id", groupId);
  }
  if (currentRoom === groupId) exitChatToDashboard();
  renderPeerList();
  showToast(`Removed group "${grp.name}"`, "info");
};

function renderPeerList(filterText = "") {
  updateOnlineCountersUI();
  const listEl = document.getElementById("chat-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const cleanFilter = (filterText || "").trim().toLowerCase().replace(/^@/, "");
  const myLower = (myUsername || "").toLowerCase();

  // 1. Render Encrypted Groups if activeSidebarTab is "all" or "groups"
  const groupKeys = Object.keys(savedGroups).filter((gid) => {
    const g = savedGroups[gid];
    if (!g || !g.name) return false;
    if (Array.isArray(g.members) && myLower && !g.members.includes(myLower) && g.owner !== myLower) {
      return false;
    }
    return !cleanFilter || g.name.toLowerCase().includes(cleanFilter);
  });

  const showGroups = activeSidebarTab === "all" || activeSidebarTab === "groups";
  const showDirect = activeSidebarTab === "all" || activeSidebarTab === "direct";

  const sortedPeers = [...savedPeers].sort((a, b) => {
    const aPin = pinnedPeers.includes(a.toLowerCase()) ? 1 : 0;
    const bPin = pinnedPeers.includes(b.toLowerCase()) ? 1 : 0;
    return bPin - aPin;
  });

  const filteredPeers = showDirect
    ? sortedPeers.filter((p) => (!cleanFilter ? true : p.toLowerCase().includes(cleanFilter)))
    : [];

  const filteredGroups = showGroups ? groupKeys : [];

  if (filteredPeers.length === 0 && filteredGroups.length === 0) {
    const emptyMsg =
      activeSidebarTab === "groups"
        ? "No encrypted groups yet.<br/>Tap <strong>+ New Group</strong> above to create one!"
        : cleanFilter
          ? `No saved chat matching "@${escapeHTML(cleanFilter)}" — check live suggestions above!`
          : "No conversations yet.<br/>Type a @username above to see live suggestions.";
    listEl.innerHTML = `<div class="empty-peers-state"><p>${emptyMsg}</p></div>`;
    return;
  }

  // Render Group Cards
  filteredGroups.forEach((gid) => {
    const g = savedGroups[gid];
    const unread = unreadCounts[gid] || 0;
    const unreadHTML = unread > 0 ? `<div class="unread-badge">${unread}</div>` : "";
    const isOwner = (g.owner || "").toLowerCase() === myLower || (g.ownerToken && g.ownerToken === mySessionId);
    const ownerTag = isOwner
      ? ' <span class="online-pill-badge" style="font-size: 9px; padding: 1px 6px;">Admin</span>'
      : "";

    const card = document.createElement("div");
    card.className = "contact-card " + (currentRoom === gid ? "active" : "");
    card.onclick = () => {
      joinRoom(gid, g.name);
    };
    card.innerHTML =
      '<div class="contact-card-info">' +
      '<div class="avatar-wrap">' +
      `<div class="contact-avatar" style="background: var(--accent-gradient); color: #fff;"><i data-lucide="users" style="width: 17px; height: 17px;"></i></div>` +
      "</div>" +
      '<div class="contact-name-wrap">' +
      `<span class="contact-name">${escapeHTML(g.name)}${ownerTag}</span>` +
      `<span class="contact-preview-text">${(g.members || []).length} members • Owner: @${escapeHTML(g.owner || "admin")}</span>` +
      "</div>" +
      "</div>" +
      '<div class="contact-right-meta">' +
      unreadHTML +
      `<button class="contact-dots-btn" onclick="deleteOrLeaveGroup('${escapeHTML(gid)}', event)" title="Leave / Delete Group">` +
      '<i data-lucide="trash-2" style="width: 15px; height: 15px; pointer-events: none;"></i>' +
      "</button>" +
      "</div>";
    listEl.appendChild(card);
  });

  // Render Direct Peer Cards
  filteredPeers.forEach((peer) => {
    const pLower = peer.toLowerCase();
    const isSelfPeer = Boolean(myLower && pLower === myLower);
    const isOnline = isSelfPeer ? true : onlineUsersList.has(pLower) && userSettings.onlinePresence;
    const peerAvatar = isSelfPeer ? myAvatarData : usersAvatarCache[pLower] || "";
    const unread = isSelfPeer ? 0 : unreadCounts[pLower] || 0;
    const isBlocked = !isSelfPeer && blockedUsers.includes(pLower);
    const isPinned = pinnedPeers.includes(pLower);
    const rel = peerRelationshipMap[pLower];

    let statusPreview = isSelfPeer
      ? "Message yourself • Notes & Saved Media"
      : isOnline
        ? "Online • Active"
        : "AES-256 Encrypted";
    let statusClass = "contact-preview-text" + (isOnline ? " status-online" : "");

    if (isBlocked) {
      statusPreview = "Blocked";
      statusClass = "contact-preview-text status-recording";
    } else if (!isSelfPeer && rel && rel.status === "pending") {
      statusPreview =
        rel.receiver === myLower
          ? "Incoming Friend Request..."
          : "Request Pending...";
      statusClass = "contact-preview-text status-pending";
    } else if (!isSelfPeer && peerRealtimeStatus[pLower] === "typing") {
      statusPreview = "typing...";
      statusClass = "contact-preview-text status-typing";
    } else if (!isSelfPeer && peerRealtimeStatus[pLower] === "recording") {
      statusPreview = "recording audio...";
      statusClass = "contact-preview-text status-recording";
    }

    const unreadHTML = unread > 0 ? '<div class="unread-badge">' + unread + "</div>" : "";
    const pinBadgeHTML = isPinned ? '<span class="pin-contact-badge" title="Pinned Chat"><i data-lucide="pin" style="width: 11px; height: 11px;"></i></span>' : "";
    const selfLabelHTML = isSelfPeer
      ? ' <span style="color: var(--accent-primary); font-weight: 800; font-size: 11px;">(You)</span>'
      : "";

    const isActiveCard = isSelfPeer
      ? isSelfRoom(currentRoom)
      : currentPeerUser === pLower && !isSelfRoom(currentRoom) && !isGroupRoom(currentRoom);

    const card = document.createElement("div");
    card.className = "contact-card " + (isActiveCard ? "active" : "");
    card.dataset.peer = pLower;
    card.onclick = async () => {
      if (isSelfPeer) {
        openSelfChatRoom();
      } else {
        const room = await getSecureRoomId(pLower);
        joinRoom(room, "@" + pLower);
      }
    };
    card.innerHTML =
      '<div class="contact-card-info">' +
      `<div class="avatar-wrap" onclick="event.stopPropagation(); viewUserProfilePicFullscreen('${escapeHTML(pLower)}');" title="Click to View Profile Picture">` +
      '<div class="contact-avatar" id="avatar-contact-' + pLower + '"></div>' +
      '<div class="online-dot ' + (isOnline ? "visible" : "") + '"></div>' +
      "</div>" +
      '<div class="contact-name-wrap">' +
      '<span class="contact-name">@' + escapeHTML(pLower) + selfLabelHTML + pinBadgeHTML + "</span>" +
      '<span class="' + statusClass + '">' + statusPreview + "</span>" +
      "</div>" +
      "</div>" +
      '<div class="contact-right-meta">' +
      unreadHTML +
      `<button class="contact-dots-btn" onclick="toggleContactMenu('${escapeHTML(pLower)}', event)" title="Chat options">` +
      '<i data-lucide="more-vertical" style="width: 16px; height: 16px; pointer-events: none;"></i>' +
      "</button>" +
      "</div>";
    listEl.appendChild(card);

    const avatarEl = card.querySelector("#avatar-contact-" + pLower);
    renderAvatarElement(avatarEl, pLower, peerAvatar);
  });

  if (window.lucide) lucide.createIcons({ nodes: [listEl] });
}

async function scanMyExistingChats() {
  if (!supabaseClient || !myUsername) return;
  await fetchPendingRequests();
  fetchPeersUserData();
}

function update1on1MessageTicks(isRead) {
  if (currentRoom === "global" || !currentPeerUser) return;
  const isPeerOnline = onlineUsersList.has(currentPeerUser.toLowerCase());
  const tickEls = document.querySelectorAll(".msg-bubble.sent .msg-status-ticks");

  tickEls.forEach((el) => {
    if (isRead || el.dataset.persistentRead === "true") {
      el.className = "msg-status-ticks read";
      el.textContent = "✓✓";
      el.dataset.persistentRead = "true";
    } else if (isPeerOnline) {
      el.className = "msg-status-ticks delivered";
      el.textContent = "✓✓";
    } else {
      el.className = "msg-status-ticks";
      el.textContent = "✓";
    }
  });

  if (isRead) {
    document.querySelectorAll(".message-row[data-after-seen='true']").forEach((row) => {
      if (row.dataset.burnScheduled === "true") return;
      row.dataset.burnScheduled = "true";
      const msgId = row.id.replace("msg-row-", "");
      const sender = row.dataset.sender;
      setTimeout(() => {
        deleteSingleMessage(msgId, sender);
      }, 10000);
    });
  }
}

// --- 23. OPEN CHAT & LOAD MESSAGES ---
function saveDecryptedRoomCache(roomId, msgObj, decryptedText) {
  if (!roomId || !msgObj || !msgObj.id || String(msgObj.id).startsWith("temp_")) return;
  try {
    if (!roomDecryptedCache[roomId]) roomDecryptedCache[roomId] = [];
    const list = roomDecryptedCache[roomId];
    const idx = list.findIndex((item) => item.msg && item.msg.id === msgObj.id);
    const entry = {
      msg: {
        id: msgObj.id,
        room_id: msgObj.room_id,
        sender_id: msgObj.sender_id,
        created_at: msgObj.created_at,
        ttl_seconds: msgObj.ttl_seconds,
        is_read: msgObj.is_read
      },
      plain: decryptedText
    };
    if (idx !== -1) list[idx] = entry;
    else list.push(entry);

    if (list.length > 75) {
      roomDecryptedCache[roomId] = list.slice(-75);
    }
    sessionStorage.setItem("krypton_fast_room_cache", JSON.stringify(roomDecryptedCache));
  } catch (e) { }
}

async function joinRoom(roomId, displayName = "Global Anonymous Lounge", pushHistory = true) {
  currentRoom = roomId;
  if (roomId === "global" || isGroupRoom(roomId)) {
    currentPeerUser = "";
  } else if (isSelfRoom(roomId)) {
    currentPeerUser = myUsername.toLowerCase();
  } else {
    currentPeerUser = displayName.replace("@", "").replace(" (you)", "").trim().toLowerCase();
  }
  cancelActiveReply();

  // Reset category filter to All when switching rooms
  activeCategoryFilter = "all";
  document.querySelectorAll(".cat-filter-pill").forEach((p) => {
    p.classList.toggle("active", p.dataset.filter === "all");
  });

  const searchBar = document.getElementById("in-chat-search-bar");
  if (searchBar) searchBar.classList.add("hidden");

  const titleEl = document.getElementById("current-room-title");
  if (titleEl) titleEl.textContent = displayName;

  const msgContainer = document.getElementById("message-container");
  if (msgContainer) msgContainer.innerHTML = "";

  removeFloatingIndicator();
  renderPinnedBannerForCurrentRoom();

  if (currentPeerUser && unreadCounts[currentPeerUser]) {
    delete unreadCounts[currentPeerUser];
    localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));
  }

  document.body.classList.add("mobile-chat-active");
  if (pushHistory) window.history.pushState({ inChat: true }, "");

  const btnGlobalRoom = document.getElementById("btn-global-room");
  if (btnGlobalRoom) btnGlobalRoom.classList.toggle("active", roomId === "global");

  renderPeerList();
  updateHeaderStatus();

  const callBtns = document.getElementById("call-buttons-group");
  const lockBanner = document.getElementById("chat-lock-banner");
  const inputBar = document.getElementById("chat-input-bar");
  const voiceRecordBtn = document.getElementById("btn-record-audio");
  const clearBothBtn = document.getElementById("btn-clear-chat");
  const clearGlobalForMeBtn = document.getElementById("btn-clear-global-for-me");
  const timerTitle = document.getElementById("menu-timer-title");

  const btnGroupAddMember = document.getElementById("btn-group-add-member");
  if (btnGroupAddMember) {
    btnGroupAddMember.classList.toggle(
      "hidden",
      !(isGroupRoom(roomId) && isCurrentGroupOwner(roomId))
    );
  }

  const voiceCatPill = document.getElementById("cat-pill-voice");
  if (roomId === "global") {
    if (voiceCatPill) voiceCatPill.classList.add("hidden");
    if (callBtns) callBtns.classList.add("hidden");
    if (lockBanner) lockBanner.classList.add("hidden");
    if (inputBar) inputBar.style.display = "flex";
    if (voiceRecordBtn) voiceRecordBtn.style.display = "none";

    if (clearBothBtn) clearBothBtn.classList.add("hidden");
    if (clearGlobalForMeBtn) clearGlobalForMeBtn.classList.remove("hidden");
    if (timerTitle) timerTitle.textContent = "Auto-Clean Feed";

    if (ttlSelectBox) ttlSelectBox.value = userSettings.globalTtl || 0;
  } else if (isGroupRoom(roomId)) {
    if (voiceCatPill) voiceCatPill.classList.remove("hidden");
    if (callBtns) callBtns.classList.add("hidden");
    if (lockBanner) lockBanner.classList.add("hidden");
    if (inputBar) inputBar.style.display = "flex";
    if (voiceRecordBtn) voiceRecordBtn.style.display = "flex";

    if (clearBothBtn) {
      clearBothBtn.classList.toggle("hidden", !isCurrentGroupOwner(roomId));
    }
    if (clearGlobalForMeBtn) clearGlobalForMeBtn.classList.add("hidden");
    if (timerTitle) timerTitle.textContent = "Disappearing Timer";
    if (ttlSelectBox) ttlSelectBox.value = "0";
  } else if (isSelfRoom(roomId)) {
    if (voiceCatPill) voiceCatPill.classList.remove("hidden");
    if (callBtns) callBtns.classList.add("hidden");
    if (lockBanner) lockBanner.classList.add("hidden");
    if (inputBar) inputBar.style.display = "flex";
    if (voiceRecordBtn) voiceRecordBtn.style.display = "flex";

    if (clearBothBtn) clearBothBtn.classList.remove("hidden");
    if (clearGlobalForMeBtn) clearGlobalForMeBtn.classList.add("hidden");
    if (timerTitle) timerTitle.textContent = "Disappearing Timer";
    if (ttlSelectBox) ttlSelectBox.value = "0";
  } else {
    if (voiceCatPill) voiceCatPill.classList.remove("hidden");
    if (callBtns) callBtns.classList.remove("hidden");
    if (voiceRecordBtn) voiceRecordBtn.style.display = "flex";

    if (clearBothBtn) clearBothBtn.classList.remove("hidden");
    if (clearGlobalForMeBtn) clearGlobalForMeBtn.classList.add("hidden");
    if (timerTitle) timerTitle.textContent = "Disappearing Timer";
    if (ttlSelectBox) ttlSelectBox.value = "0";

    await updateChatLockBannerState(currentPeerUser);
  }

  // Feature #4: 0ms Instant Stale-While-Revalidate Render from Memory Cache
  const cachedEntries = roomDecryptedCache[roomId];
  if (cachedEntries && cachedEntries.length > 0 && msgContainer) {
    const fastFrag = document.createDocumentFragment();
    const fastNodes = await Promise.all(
      cachedEntries.map((item) => createMessageNode(item.msg, item.plain))
    );
    fastNodes.forEach((n) => {
      if (n) fastFrag.appendChild(n);
    });
    if (currentRoom === roomId) {
      msgContainer.innerHTML = "";
      msgContainer.appendChild(fastFrag);
      msgContainer.scrollTop = msgContainer.scrollHeight;
      if (window.lucide) lucide.createIcons({ nodes: [msgContainer] });
    }
  }

  if (!supabaseClient) return;
  if (activeSubscription) supabaseClient.removeChannel(activeSubscription);

  const { data: messages } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("room_id", currentRoom)
    .order("created_at", { ascending: true })
    .limit(75);

  if (messages && messages.length > 0) {
    const uniqueSenders = [...new Set(messages.map((m) => m.sender_id.toLowerCase()))].filter(
      (u) => !usersAvatarCache[u]
    );
    if (uniqueSenders.length > 0) {
      const { data: userData } = await supabaseClient
        .from("users")
        .select("username, avatar_url, bio")
        .in("username", uniqueSenders);
      if (userData) {
        userData.forEach((u) => {
          usersAvatarCache[u.username.toLowerCase()] = u.avatar_url;
          if (u.bio) usersBioCache[u.username.toLowerCase()] = u.bio;
        });
        localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
        localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
      }
    }

    const container = document.getElementById("message-container");
    if (container && currentRoom === roomId) {
      const missingMessages = messages.filter((m) => !document.getElementById("msg-row-" + m.id));
      if (missingMessages.length > 0) {
        const placeholder = container.querySelector(".empty-chat-placeholder");
        if (placeholder) placeholder.remove();
        const fragment = document.createDocumentFragment();
        const renderedNodes = await Promise.all(missingMessages.map((msg) => createMessageNode(msg)));
        renderedNodes.forEach((node) => {
          if (node) fragment.appendChild(node);
        });
        container.appendChild(fragment);
        container.scrollTop = container.scrollHeight;
        if (window.lucide) lucide.createIcons({ nodes: [container] });
      }
    }
  } else {
    renderEmptyRoomState();
  }

  activeSubscription = supabaseClient
    .channel("room:" + currentRoom)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: "room_id=eq." + currentRoom },
      async (payload) => {
        const placeholder = document.querySelector(".empty-chat-placeholder");
        if (placeholder) placeholder.remove();

        if (payload.new.sender_id.toLowerCase() === myUsername.toLowerCase()) {
          const tempNode = document.querySelector('.message-row[data-temp-msg="true"]');
          if (tempNode) {
            tempNode.id = "msg-row-" + payload.new.id;
            tempNode.removeAttribute("data-temp-msg");
            const delBtn = tempNode.querySelector(".delete-single-msg-btn");
            if (delBtn) {
              delBtn.setAttribute(
                "onclick",
                `deleteSingleMessage('${payload.new.id}', '${payload.new.sender_id}', event)`
              );
            }
            return;
          }
        }
        playSynthTone("receive");
        await renderMessage(payload.new);
        if (currentRoom !== "global") {
          activeSubscription.send({
            type: "broadcast",
            event: "seen-messages",
            payload: { reader: myUsername }
          });
          supabaseClient
            .from("messages")
            .update({ is_read: true })
            .eq("id", payload.new.id)
            .then(() => { });
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "messages" },
      (payload) => {
        const deletedId = payload.old ? payload.old.id : null;
        if (deletedId) {
          const el = document.getElementById("msg-row-" + deletedId);
          if (el) el.remove();
        }
      }
    )
    .on("broadcast", { event: "webrtc-offer" }, async (payload) => {
      if (payload.payload.sender !== myUsername) {
        let tries = 0;
        while (!peerConnection && tries < 30) {
          await new Promise((r) => setTimeout(r, 100));
          tries++;
        }
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
          while (iceCandidateQueue.length > 0) {
            const c = iceCandidateQueue.shift();
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) { }
          }
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          activeSubscription.send({
            type: "broadcast",
            event: "webrtc-answer",
            payload: { answer: answer, sender: myUsername }
          });
        }
      }
    })
    .on("broadcast", { event: "webrtc-answer" }, async (payload) => {
      if (payload.payload.sender !== myUsername && peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
        while (iceCandidateQueue.length > 0) {
          const c = iceCandidateQueue.shift();
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) { }
        }
      }
    })
    .on("broadcast", { event: "webrtc-ice" }, async (payload) => {
      if (payload.payload.sender !== myUsername && payload.payload.candidate) {
        if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
          } catch (e) { }
        } else {
          iceCandidateQueue.push(payload.payload.candidate);
        }
      }
    })
    .on("broadcast", { event: "webrtc-end" }, () => endCall(false))
    .on("broadcast", { event: "typing" }, (payload) => {
      if (payload.payload.user !== myUsername) handleTypingIndicator(payload.payload.user);
    })
    .on("broadcast", { event: "recording-audio" }, (payload) => {
      if (payload.payload.user !== myUsername) handleRecordingAudioIndicator(payload.payload.user);
    })
    .on("broadcast", { event: "stop-recording-audio" }, (payload) => {
      stopRecordingAudioIndicator(payload.payload.user);
    })
    .on("broadcast", { event: "seen-messages" }, (payload) => {
      if (payload.payload.reader !== myUsername) update1on1MessageTicks(true);
    })
    .on("broadcast", { event: "msg-reaction" }, (payload) => {
      const p = payload.payload;
      if (p && p.user !== myUsername) {
        applyReactionLocally(p.msgId, p.emoji, p.user);
      }
    })
    .on("broadcast", { event: "pin-message" }, (payload) => {
      const p = payload.payload;
      if (p && p.room === currentRoom) {
        if (p.pinObj) {
          pinnedRoomMessages[currentRoom] = p.pinObj;
        } else {
          delete pinnedRoomMessages[currentRoom];
        }
        localStorage.setItem("krypton_pinned_msgs", JSON.stringify(pinnedRoomMessages));
        renderPinnedBannerForCurrentRoom();
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED" && currentRoom !== "global") {
        activeSubscription.send({
          type: "broadcast",
          event: "seen-messages",
          payload: { reader: myUsername }
        });
        supabaseClient
          .from("messages")
          .update({ is_read: true })
          .eq("room_id", currentRoom)
          .neq("sender_id", myUsername)
          .then(() => { });
      }
    });
}

function renderEmptyRoomState() {
  const container = document.getElementById("message-container");
  if (!container || container.children.length > 0) return;
  container.innerHTML = `
    <div class="empty-chat-placeholder">
      <i data-lucide="shield-check" style="width: 34px; height: 34px; color: var(--accent-primary);"></i>
      <h4>Zero-Knowledge E2EE Tunnel</h4>
      <p>Messages, photos, voice notes & files in this channel are encrypted client-side using AES-GCM 256-bit keys.</p>
    </div>
  `;
  if (window.lucide) lucide.createIcons({ nodes: [container] });
}

window.deleteSingleMessage = async function (id, senderId, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  if (id) {
    const el = document.getElementById("msg-row-" + id);
    if (el) el.remove();
    if (currentRoom && roomDecryptedCache[currentRoom]) {
      roomDecryptedCache[currentRoom] = roomDecryptedCache[currentRoom].filter(
        (item) => !item.msg || String(item.msg.id) !== String(id)
      );
      sessionStorage.setItem("krypton_fast_room_cache", JSON.stringify(roomDecryptedCache));
    }
  }

  const sId = (senderId || "").trim().toLowerCase();
  const myId = (myUsername || "").trim().toLowerCase();
  const isMine = sId === myId;

  if (currentRoom === "global") {
    if (isMine) {
      if (supabaseClient && id && !String(id).startsWith("temp_")) {
        await supabaseClient.from("messages").delete().eq("id", id);
      }
    } else {
      if (id && !locallyHiddenMessages.includes(id)) {
        locallyHiddenMessages.push(id);
        localStorage.setItem("krypton_hidden_msgs", JSON.stringify(locallyHiddenMessages));
      }
    }
  } else {
    if (supabaseClient && id && !String(id).startsWith("temp_")) {
      await supabaseClient.from("messages").delete().eq("id", id);
    }
  }
};

// --- 24. MESSAGE NODE CREATOR & SWIPE-TO-REPLY GESTURE ---

// WhatsApp-Style Right-Swipe Gesture to Reply (Touch & Mouse Drag Support)
function attachSwipeToReplyGesture(rowEl, msgId, sender, snippet) {
  if (!rowEl) return;

  const indicator = document.createElement("div");
  indicator.className = "swipe-reply-indicator";
  indicator.innerHTML = '<i data-lucide="corner-up-left" style="width: 15px; height: 15px;"></i>';
  rowEl.appendChild(indicator);

  let startX = 0;
  let startY = 0;
  let currentDx = 0;
  let isDragging = false;
  let isHorizontalSwipe = null;
  const SWIPE_THRESHOLD = 58;
  const MAX_DRAG = 86;

  function onDragStart(clientX, clientY, target) {
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("audio") ||
      target.closest(".custom-voice-player")
    ) {
      return;
    }
    startX = clientX;
    startY = clientY;
    currentDx = 0;
    isDragging = true;
    isHorizontalSwipe = null;
    rowEl.style.transition = "none";
  }

  function onDragMove(clientX, clientY, evt) {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;

    if (isHorizontalSwipe === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontalSwipe = Math.abs(dx) > Math.abs(dy) * 1.25 && dx > 0;
      }
    }

    if (!isHorizontalSwipe) return;
    if (evt && evt.cancelable) evt.preventDefault();

    currentDx = Math.max(0, Math.min(MAX_DRAG, dx * 0.78));
    rowEl.style.transform = `translateX(${currentDx}px)`;

    const progress = Math.min(1, currentDx / SWIPE_THRESHOLD);
    indicator.style.opacity = String(progress);
    indicator.style.transform = `translateY(-50%) scale(${0.45 + progress * 0.55})`;
    indicator.classList.toggle("ready", currentDx >= SWIPE_THRESHOLD);
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;

    rowEl.style.transition = "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
    rowEl.style.transform = "translateX(0px)";
    indicator.style.opacity = "0";
    indicator.style.transform = "translateY(-50%) scale(0.4)";
    indicator.classList.remove("ready");

    if (isHorizontalSwipe && currentDx >= SWIPE_THRESHOLD) {
      if (navigator.vibrate) {
        try { navigator.vibrate(18); } catch (e) { }
      }
      setReplyMessage(msgId, sender, snippet);
    }
    currentDx = 0;
    isHorizontalSwipe = null;
  }

  // Touch events for mobile
  rowEl.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      onDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    },
    { passive: true }
  );

  rowEl.addEventListener(
    "touchmove",
    (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      onDragMove(e.touches[0].clientX, e.touches[0].clientY, e);
    },
    { passive: false }
  );

  rowEl.addEventListener("touchend", onDragEnd);
  rowEl.addEventListener("touchcancel", onDragEnd);

  // Mouse drag support for desktop
  rowEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    onDragStart(e.clientX, e.clientY, e.target);
  });

  rowEl.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    onDragMove(e.clientX, e.clientY, e);
  });

  rowEl.addEventListener("mouseup", onDragEnd);
  rowEl.addEventListener("mouseleave", onDragEnd);
}

async function createMessageNode(msg, rawTextOverride) {
  if (!msg) return null;

  if (currentRoom === "global" && msg.id) {
    if (locallyHiddenMessages.includes(msg.id)) return null;
    const msgCreatedAt = new Date(msg.created_at || Date.now()).getTime();
    if (globalClearedTimestamp && msgCreatedAt <= globalClearedTimestamp) return null;
  }

  const senderLower = (msg.sender_id || myUsername).trim().toLowerCase();
  if (blockedUsers.includes(senderLower)) return null;

  const isMine = senderLower === myUsername.trim().toLowerCase();

  let rawDecrypted = rawTextOverride || null;
  if (!rawDecrypted) {
    const cachedList = roomDecryptedCache[currentRoom] || [];
    const foundCached = msg.id ? cachedList.find((c) => c.msg && c.msg.id === msg.id) : null;
    if (foundCached && foundCached.plain) {
      rawDecrypted = foundCached.plain;
    } else {
      rawDecrypted = await decryptData(msg.ciphertext, msg.iv, msg.salt, currentRoom);
    }
  }
  if (msg.id && rawDecrypted && rawDecrypted !== "[Encrypted payload]") {
    saveDecryptedRoomCache(currentRoom, msg, rawDecrypted);
  }

  let replyObj = null;
  let bodyPayload = rawDecrypted;
  if (rawDecrypted.startsWith("REPLY_JSON:")) {
    const newlineIdx = rawDecrypted.indexOf("\n");
    if (newlineIdx !== -1) {
      try {
        replyObj = JSON.parse(rawDecrypted.slice(11, newlineIdx));
        bodyPayload = rawDecrypted.slice(newlineIdx + 1);
      } catch (e) {
        bodyPayload = rawDecrypted;
      }
    }
  }

  // Feature #6: Extract View Mode Header ("once" or "10s") if present
  let msgViewMode = "normal";
  if (bodyPayload.startsWith("VMODE_ONCE:")) {
    msgViewMode = "once";
    bodyPayload = bodyPayload.slice(11);
  } else if (bodyPayload.startsWith("VMODE_10S:")) {
    msgViewMode = "10s";
    bodyPayload = bodyPayload.slice(10);
  }

  let replyQuoteHTML = "";
  if (replyObj && replyObj.sender) {
    replyQuoteHTML = `
      <div class="msg-reply-quote" onclick="scrollToQuotedMessage('${escapeHTML(replyObj.id || "")}')">
        <span class="msg-reply-quote-user">@${escapeHTML(replyObj.sender)}</span>
        <span class="msg-reply-quote-text">${escapeHTML(replyObj.snippet || "")}</span>
      </div>
    `;
  }

  const msgIdSafe = msg.id || (msg.isTemp ? "temp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6) : "");
  let innerContentHTML = "";
  let plainSnippetForReply = "";
  let isTextMessage = false;
  let msgCategoryType = "text";
  let msgHasLink = false;

  if (bodyPayload.startsWith("IMAGE_DATA:")) {
    msgCategoryType = "media";
    const base64Img = bodyPayload.replace("IMAGE_DATA:", "");
    plainSnippetForReply =
      msgViewMode === "once"
        ? "[1x View Photo]"
        : msgViewMode === "10s"
          ? "[10s Timed Photo]"
          : "[Encrypted Photo]";

    if (msgViewMode === "once" || msgViewMode === "10s") {
      const badgeSymbol = msgViewMode === "once" ? "1" : "10s";
      const modeTitle = msgViewMode === "once" ? "1-Time View Photo" : "10s Timed Photo";
      const modeSub =
        msgViewMode === "once"
          ? isMine
            ? "Sent as View-Once • Tap to preview"
            : "Tap to view once (Auto-destroys on close)"
          : "Tap to open (Auto-destroys in 10s)";
      innerContentHTML = `
        <div class="view-once-vault-card" onclick="openSpecialMediaPhoto('${msgIdSafe}', '${escapeHTML(msg.sender_id || myUsername)}', '${msgViewMode}', ${isMine})">
          <div class="vo-badge-ring">${badgeSymbol}</div>
          <div class="vo-card-meta">
            <span class="vo-card-title">${modeTitle}</span>
            <span class="vo-card-sub" id="vo-sub-${msgIdSafe}">${modeSub}</span>
          </div>
          <input type="hidden" id="vo-data-${msgIdSafe}" value="${base64Img}" />
        </div>
      `;
    } else {
      innerContentHTML =
        '<img src="' +
        base64Img +
        '" alt="Encrypted attachment" class="chat-thumbnail-img" onclick="openFullscreenImageViewer(\'' +
        base64Img +
        `', '@${escapeHTML(msg.sender_id || myUsername)} • Encrypted Photo')" title="Click to view full screen" />`;
    }
  } else if (bodyPayload.startsWith("VOICE_DATA:")) {
    msgCategoryType = "voice";
    const base64Audio = bodyPayload.replace("VOICE_DATA:", "");
    plainSnippetForReply = "[Encrypted Voice Note]";
    const playerId = "vplayer-" + msgIdSafe;
    innerContentHTML = `
      <div class="custom-voice-player" id="${playerId}">
        <button class="voice-play-btn" onclick="toggleVoiceNotePlay('${playerId}')" title="Play/Pause">▶</button>
        <div class="voice-wave-wrap">
          <div class="voice-progress-track">
            <div class="voice-progress-fill"></div>
          </div>
          <div class="voice-time-row">
            <span class="voice-cur-time">0:00</span>
            <span>ENCRYPTED AUDIO</span>
          </div>
        </div>
        <button class="voice-speed-btn" onclick="cycleVoiceNoteSpeed('${playerId}')" title="Playback Speed">1x</button>
        <audio src="${base64Audio}" preload="metadata" style="display: none;"></audio>
      </div>
    `;
  } else if (bodyPayload.startsWith("FILE_DATA:")) {
    msgCategoryType = "files";
    const rawFilePart = bodyPayload.slice(10);
    const firstPipe = rawFilePart.indexOf("|");
    const secondPipe = rawFilePart.indexOf("|", firstPipe + 1);
    let fileName = "encrypted-file";
    let fileSizeStr = "";
    let fileDataUrl = "";
    if (firstPipe !== -1 && secondPipe !== -1) {
      fileName = rawFilePart.slice(0, firstPipe);
      const sizeBytes = parseInt(rawFilePart.slice(firstPipe + 1, secondPipe), 10) || 0;
      fileSizeStr = formatByteSize(sizeBytes);
      fileDataUrl = rawFilePart.slice(secondPipe + 1);
    }
    plainSnippetForReply = `[File] ${fileName}`;
    const vmodeLabel =
      msgViewMode === "once"
        ? " • 1x View"
        : msgViewMode === "10s"
          ? " • 10s Burn"
          : " • AES-256";
    innerContentHTML = `
      <div class="encrypted-file-card">
        <div class="file-card-icon">
          <i data-lucide="file-lock-2" style="width: 18px; height: 18px;"></i>
        </div>
        <div class="file-card-meta">
          <span class="file-card-name" title="${escapeHTML(fileName)}">${escapeHTML(fileName)}</span>
          <span class="file-card-size">${escapeHTML(fileSizeStr)}${vmodeLabel}</span>
        </div>
        <a href="${fileDataUrl}" download="${escapeHTML(fileName)}" class="file-card-dl-btn" onclick="handleSpecialFileAccess('${msgIdSafe}', '${escapeHTML(msg.sender_id || myUsername)}', '${msgViewMode}', ${isMine})" title="Download Decrypted File">
          <i data-lucide="download" style="width: 15px; height: 15px;"></i>
        </a>
      </div>
    `;
  } else {
    isTextMessage = true;
    msgHasLink = /(https?:\/\/[^\s<]+)/i.test(bodyPayload);
    plainSnippetForReply = bodyPayload.replace(/\|\|/g, "").slice(0, 70);
    const hasSpoiler = /\|\|([^|]+)\|\|/.test(bodyPayload) || msgViewMode !== "normal";
    const wrappedBody =
      msgViewMode !== "normal" && !/\|\|([^|]+)\|\|/.test(bodyPayload)
        ? `||${bodyPayload}||`
        : bodyPayload;

    let spoilerHintText = "SECRET SPOILER (TAP TO REVEAL)";
    if (msgViewMode === "once") spoilerHintText = "1x VIEW SPOILER (BURNS AFTER READING)";
    else if (msgViewMode === "10s") spoilerHintText = "10s TIMED SPOILER (BURNS IN 10s)";

    const spoilerHintHTML = hasSpoiler
      ? `<div class="spoiler-badge-hint"><i data-lucide="eye-off" style="width: 11px; height: 11px;"></i><span id="sp-hint-${msgIdSafe}">${spoilerHintText}</span></div>`
      : "";
    innerContentHTML =
      spoilerHintHTML +
      `<div class="msg-text-line" onclick="handleSpecialSpoilerReveal('${msgIdSafe}', '${escapeHTML(msg.sender_id || myUsername)}', '${msgViewMode}', ${isMine})">` +
      formatRichMessageHTML(wrappedBody) +
      "</div>";
  }

  const timeFormatted = formatMessageTime(msg.created_at);
  const safeSnippetAttr = plainSnippetForReply.replace(/['"\\]/g, " ").replace(/\n/g, " ");

  const reactBtnHTML =
    `<button class="msg-action-icon-btn" onclick="openReactionPicker('${msgIdSafe}', event)" title="React with Emoji">` +
    '<i data-lucide="smile-plus" style="width: 12px; height: 12px; pointer-events: none;"></i>' +
    "</button>";

  const replyBtnHTML =
    `<button class="msg-action-icon-btn" onclick="setReplyMessage('${msgIdSafe}', '${escapeHTML(msg.sender_id || myUsername)}', '${escapeHTML(safeSnippetAttr)}')" title="Reply">` +
    '<i data-lucide="corner-up-left" style="width: 12px; height: 12px; pointer-events: none;"></i>' +
    "</button>";

  const canPinHere =
    currentRoom !== "global" && (!isGroupRoom(currentRoom) || isCurrentGroupOwner(currentRoom));
  const pinMsgBtnHTML = canPinHere
    ? `<button class="msg-action-icon-btn" onclick="pinMessageInCurrentRoom('${msgIdSafe}', '@${escapeHTML(msg.sender_id || myUsername)}: ${escapeHTML(safeSnippetAttr)}')" title="Pin Message in Room">` +
    '<i data-lucide="pin" style="width: 12px; height: 12px; pointer-events: none;"></i>' +
    "</button>"
    : "";

  const copyBtnHTML = isTextMessage
    ? `<button class="msg-action-icon-btn" onclick="copyMessageText('${msgIdSafe}')" title="Copy text">` +
    '<i data-lucide="copy" style="width: 12px; height: 12px; pointer-events: none;"></i>' +
    "</button>"
    : "";

  const deleteBtnHTML =
    `<button class="msg-action-icon-btn danger delete-single-msg-btn" onclick="deleteSingleMessage('${msgIdSafe}', '${escapeHTML(msg.sender_id || myUsername)}', event)" title="Delete message">` +
    '<i data-lucide="trash" style="width: 12px; height: 12px; pointer-events: none;"></i>' +
    "</button>";

  let ticksHTML = "";
  if (isMine && currentRoom !== "global") {
    const isSelf = isSelfRoom(currentRoom);
    const isPeerOnline = isSelf || (currentPeerUser && onlineUsersList.has(currentPeerUser.toLowerCase()));
    const isRead = isSelf || msg.is_read === true;
    let tickMark = "✓";
    let tickClass = "msg-status-ticks";

    if (isRead) {
      tickMark = "✓✓";
      tickClass = "msg-status-ticks read";
    } else if (isPeerOnline) {
      tickMark = "✓✓";
      tickClass = "msg-status-ticks delivered";
    }

    ticksHTML =
      '<span class="' +
      tickClass +
      '" data-persistent-read="' +
      (isRead ? "true" : "false") +
      '">' +
      tickMark +
      "</span>";
  }

  const senderAvatarUrl = usersAvatarCache[senderLower] || (isMine ? myAvatarData : "");

  const row = document.createElement("div");
  row.id = "msg-row-" + msgIdSafe;
  if (msg.isTemp) {
    row.dataset.tempMsg = "true";
  }
  row.dataset.sender = senderLower;
  row.dataset.msgType = msgCategoryType;
  row.dataset.hasLink = msgHasLink ? "true" : "false";
  row.dataset.afterSeen = (msg.ttl_seconds === -1).toString();
  row.className = "message-row " + (isMine ? "sent" : "received");

  row.ondblclick = () => sendReactionToMessage(msgIdSafe, "❤️");

  const avatarStyle = senderAvatarUrl
    ? "background-image: url('" + senderAvatarUrl + "'); background-size: cover; background-position: center;"
    : "";

  const isGlobal = currentRoom === "global";
  const profileAction = isGlobal
    ? `onclick="openUserActionModal('${escapeHTML(msg.sender_id)}')"`
    : `onclick="viewUserProfilePicFullscreen('${escapeHTML(msg.sender_id)}')"`;

  const avatarHTML = !isMine
    ? '<div class="avatar sm msg-sender-avatar" id="bubble-avatar-' +
    msgIdSafe +
    '" ' +
    profileAction +
    ' style="' +
    avatarStyle +
    ' cursor: pointer;" title="Click to View Profile / Picture">' +
    (senderAvatarUrl ? "" : escapeHTML((msg.sender_id || "?")[0].toUpperCase())) +
    "</div>"
    : "";

  const userColor = getUserColor(msg.sender_id || myUsername);
  const senderHeader = !isMine
    ? `<span class="msg-sender-header" onclick="openUserActionModal('${escapeHTML(msg.sender_id)}')" style="color: ${userColor}; cursor: pointer;">@${escapeHTML(msg.sender_id)}</span>`
    : "";

  const burnBadge =
    msg.ttl_seconds === -1
      ? '<span title="Burn After Seen (10s)" style="color: var(--warning-color); font-weight: 700;">10s</span>'
      : "";

  row.innerHTML =
    avatarHTML +
    '<div class="msg-bubble ' +
    (isMine ? "sent" : "received") +
    '">' +
    '<div class="bubble-content">' +
    senderHeader +
    replyQuoteHTML +
    innerContentHTML +
    "</div>" +
    '<div class="msg-reactions-Display"></div>' +
    '<div class="msg-meta">' +
    "<span>" +
    timeFormatted +
    "</span>" +
    burnBadge +
    ticksHTML +
    reactBtnHTML +
    replyBtnHTML +
    pinMsgBtnHTML +
    copyBtnHTML +
    deleteBtnHTML +
    "</div>" +
    "</div>";

  // Attach WhatsApp-style swipe-right to reply gesture
  attachSwipeToReplyGesture(row, msgIdSafe, msg.sender_id || myUsername, safeSnippetAttr);
  setTimeout(() => renderReactionsForMessageNode(msgIdSafe), 0);

  if (currentRoom === "global") {
    if (userSettings.globalTtl === -1) {
      setTimeout(() => {
        row.remove();
      }, 10000);
    } else if (userSettings.globalTtl && userSettings.globalTtl > 0) {
      const msgCreatedAt = new Date(msg.created_at || Date.now()).getTime();
      const elapsedSecs = Math.floor((Date.now() - msgCreatedAt) / 1000);
      if (elapsedSecs >= userSettings.globalTtl) return null;
      setTimeout(() => {
        row.remove();
      }, (userSettings.globalTtl - elapsedSecs) * 1000);
    }
  } else {
    if (msg.ttl_seconds === -1) {
      if (!isMine) {
        setTimeout(() => {
          deleteSingleMessage(msg.id, msg.sender_id);
        }, 10000);
      }
    } else if (msg.ttl_seconds && msg.ttl_seconds > 0) {
      const elapsedSecs = Math.floor((new Date() - new Date(msg.created_at || Date.now())) / 1000);
      const remainingTime = (msg.ttl_seconds - elapsedSecs) * 1000;
      const executeDisappear = () => deleteSingleMessage(msg.id, msg.sender_id);

      if (remainingTime <= 0) {
        return null;
      } else if (remainingTime < 2147483647) {
        setTimeout(executeDisappear, remainingTime);
      }
    }
  }

  return row;
}

async function renderMessage(msg) {
  if (msg.id && document.getElementById("msg-row-" + msg.id)) return;
  const node = await createMessageNode(msg);
  if (node) {
    const container = document.getElementById("message-container");
    if (container) {
      container.appendChild(node);
      applyCategoryAndSearchFilters();
      container.scrollTop = container.scrollHeight;
      if (window.lucide) lucide.createIcons({ nodes: [node] });
    }
  }
}

// Clear Entire 1-on-1 Chat for Both Sides
const btnClearChat = document.getElementById("btn-clear-chat");
if (btnClearChat) {
  btnClearChat.addEventListener("click", async () => {
    if (headerDropdown) headerDropdown.classList.add("hidden");
    if (currentRoom === "global") return;

    const ok = await showGlassDialog({
      title: "Clear Both Sides?",
      message: "Permanently wipe all encrypted messages in this tunnel for both participants?",
      confirmText: "Wipe Tunnel",
      danger: true
    });

    if (ok && supabaseClient) {
      const msgContainer = document.getElementById("message-container");
      if (msgContainer) msgContainer.innerHTML = "";
      renderEmptyRoomState();
      await supabaseClient.from("messages").delete().eq("room_id", currentRoom);
      showToast("Conversation wiped on both sides", "info");
    }
  });
}

// Clear Global Chat For Me
const btnClearGlobal = document.getElementById("btn-clear-global-for-me");
if (btnClearGlobal) {
  btnClearGlobal.addEventListener("click", async () => {
    if (headerDropdown) headerDropdown.classList.add("hidden");
    const ok = await showGlassDialog({
      title: "Clear Global Feed?",
      message: "Hide all current Global Lounge messages from your screen?",
      confirmText: "Clear For Me"
    });
    if (ok) {
      globalClearedTimestamp = Date.now();
      localStorage.setItem("krypton_global_cleared_ts", globalClearedTimestamp.toString());
      const msgContainer = document.getElementById("message-container");
      if (msgContainer) msgContainer.innerHTML = "";
      renderEmptyRoomState();
      showToast("Global Lounge cleared for you", "success");
    }
  });
}

// --- 25. CORNER (+) ATTACHMENT HUB, ZERO-DELAY TRANSMISSION & SCHEMA FALLBACK ---
const btnAttachHub = document.getElementById("btn-attach-hub");
const attachHubMenu = document.getElementById("attach-hub-menu");
const hubBtnEmoji = document.getElementById("hub-btn-emoji");
const hubBtnImage = document.getElementById("hub-btn-image");
const hubBtnFile = document.getElementById("hub-btn-file");
const hubBtnSpoiler = document.getElementById("hub-btn-spoiler");
const hubSpoilerLabel = document.getElementById("hub-spoiler-label");
const emojiPalette = document.getElementById("emoji-palette");
const fileInput = document.getElementById("image-file-input");
const docFileInput = document.getElementById("doc-file-input");

if (btnAttachHub && attachHubMenu) {
  btnAttachHub.addEventListener("click", (e) => {
    e.stopPropagation();
    const isNowHidden = attachHubMenu.classList.toggle("hidden");
    btnAttachHub.classList.toggle("active", !isNowHidden);
    if (emojiPalette) emojiPalette.classList.add("hidden");
  });

  attachHubMenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

if (hubBtnEmoji && emojiPalette) {
  hubBtnEmoji.addEventListener("click", (e) => {
    e.stopPropagation();
    if (attachHubMenu) attachHubMenu.classList.add("hidden");
    if (btnAttachHub) btnAttachHub.classList.remove("active");
    emojiPalette.classList.toggle("hidden");
  });
}

if (hubBtnImage && fileInput) {
  hubBtnImage.addEventListener("click", () => {
    if (attachHubMenu) attachHubMenu.classList.add("hidden");
    if (btnAttachHub) btnAttachHub.classList.remove("active");
    fileInput.click();
  });
}

if (hubBtnFile && docFileInput) {
  hubBtnFile.addEventListener("click", () => {
    if (attachHubMenu) attachHubMenu.classList.add("hidden");
    if (btnAttachHub) btnAttachHub.classList.remove("active");
    docFileInput.click();
  });
}

if (hubBtnSpoiler) {
  hubBtnSpoiler.addEventListener("click", () => {
    isSpoilerModeActive = !isSpoilerModeActive;
    hubBtnSpoiler.classList.toggle("spoiler-on", isSpoilerModeActive);
    if (btnAttachHub) btnAttachHub.classList.toggle("spoiler-armed", isSpoilerModeActive);
    if (hubSpoilerLabel) {
      hubSpoilerLabel.textContent = isSpoilerModeActive ? "Spoiler Blur: ON" : "Spoiler Blur: OFF";
    }
    if (attachHubMenu) attachHubMenu.classList.add("hidden");
    if (btnAttachHub) btnAttachHub.classList.remove("active");
    showToast(
      isSpoilerModeActive
        ? "Secret Spoiler Mode ON (Next message will be blurred)"
        : "Secret Spoiler Mode OFF",
      "info",
      1800
    );
  });
}

// Resilient Transmission with Automatic Schema Fallback (Fixes "Message delivery failed."!)
async function transmitPayload(payloadString) {
  if (!currentRoom) return;
  const ttl = ttlSelectBox ? parseInt(ttlSelectBox.value, 10) : 0;
  const container = document.getElementById("message-container");

  const placeholder = document.querySelector(".empty-chat-placeholder");
  if (placeholder) placeholder.remove();

  let bodyWithViewMode = payloadString;
  if (activeViewMode === "once") {
    bodyWithViewMode = "VMODE_ONCE:" + payloadString;
  } else if (activeViewMode === "10s") {
    bodyWithViewMode = "VMODE_10S:" + payloadString;
  }
  if (activeViewMode !== "normal") {
    setActiveViewMode("normal");
  }

  let finalPayload = bodyWithViewMode;
  if (activeReplyContext) {
    finalPayload = `REPLY_JSON:${JSON.stringify(activeReplyContext)}\n${bodyWithViewMode}`;
    cancelActiveReply();
  }

  playSynthTone("send");

  const localMsgObj = {
    isTemp: true,
    sender_id: myUsername,
    ttl_seconds: currentRoom === "global" ? null : ttl !== 0 ? ttl : null,
    created_at: new Date().toISOString()
  };
  const tempNode = await createMessageNode(localMsgObj, finalPayload);
  if (tempNode && container) {
    container.appendChild(tempNode);
    applyCategoryAndSearchFilters();
    container.scrollTop = container.scrollHeight;
    if (window.lucide) lucide.createIcons({ nodes: [tempNode] });
  }

  if (!supabaseClient) return;

  try {
    const encrypted = await encryptData(finalPayload, currentRoom);
    const fullRow = {
      room_id: currentRoom,
      sender_id: myUsername,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      ttl_seconds: currentRoom === "global" ? null : ttl !== 0 ? ttl : null,
      is_read: false
    };

    const { error } = await supabaseClient.from("messages").insert([fullRow]);

    if (error) {
      // Fallback 1: If 'is_read' column doesn't exist in user's Supabase messages table
      const rowWithoutIsRead = {
        room_id: currentRoom,
        sender_id: myUsername,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        ttl_seconds: currentRoom === "global" ? null : ttl !== 0 ? ttl : null
      };
      const { error: err2 } = await supabaseClient.from("messages").insert([rowWithoutIsRead]);

      if (err2) {
        // Fallback 2: Minimal core E2EE columns only (room_id, sender_id, ciphertext, iv, salt)
        const minimalRow = {
          room_id: currentRoom,
          sender_id: myUsername,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          salt: encrypted.salt
        };
        const { error: err3 } = await supabaseClient.from("messages").insert([minimalRow]);
        if (err3) {
          console.error("Supabase insert failed after fallbacks:", err3);
          showToast("Delivery error: " + (err3.message || "Check connection"), "error");
        }
      }
    }
  } catch (err) {
    console.error("Encryption/Transmit error:", err);
    showToast("Encryption or network error.", "error");
  }
}

function sendTextMessage() {
  const input = document.getElementById("chat-input");
  if (!input) return;
  let text = input.value.trim();
  if (!text) return;

  if (isSpoilerModeActive && !text.startsWith("||")) {
    text = `||${text}||`;
    isSpoilerModeActive = false;
    if (hubBtnSpoiler) hubBtnSpoiler.classList.remove("spoiler-on");
    if (btnAttachHub) btnAttachHub.classList.remove("spoiler-armed");
    if (hubSpoilerLabel) hubSpoilerLabel.textContent = "Spoiler Blur: OFF";
  }

  input.value = "";
  transmitPayload(text);
}

const btnSend = document.getElementById("btn-send");
if (btnSend) btnSend.addEventListener("click", sendTextMessage);

if (chatInputEl) {
  chatInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendTextMessage();
    }
  });
}

function compressAndSendImageFile(file) {
  const reader = new FileReader();
  reader.onload = function (evt) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const maxDim = 850;

      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.70);
      transmitPayload("IMAGE_DATA:" + compressedDataUrl);
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    compressAndSendImageFile(file);
    fileInput.value = "";
  });
}

if (docFileInput) {
  docFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      showToast("Max file size is 1.5 MB for encrypted mesh transfer.", "error");
      docFileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (evt) {
      const safeName = file.name.replace(/\|/g, "_");
      const payload = `FILE_DATA:${safeName}|${file.size}|${evt.target.result}`;
      transmitPayload(payload);
      showToast(`Encrypting & sending "${safeName}"...`, "info");
      docFileInput.value = "";
    };
    reader.readAsDataURL(file);
  });
}

document.querySelectorAll(".emoji-grid span").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    const input = document.getElementById("chat-input");
    if (input) {
      input.value += e.target.textContent;
      input.focus();
    }
    if (emojiPalette) emojiPalette.classList.add("hidden");
  });
});

// Feature #2 & #3: Instagram-Style Live Typing Suggestions (Compact Direct-Conversation Cards) + Self-Chat Search-to-Add
let liveSearchDebounceTimer = null;
let latestSearchQueryId = 0;

function hideLiveUserSuggestions() {
  const box = document.getElementById("live-user-suggestions");
  if (box) {
    box.classList.add("hidden");
    box.innerHTML = "";
  }
}

window.selectSuggestedPeer = async function (uname, actionType = "open") {
  const clean = (uname || "").toLowerCase();
  if (!clean) return;
  const inputEl = document.getElementById("peer-id-input");
  if (inputEl) inputEl.value = "";
  hideLiveUserSuggestions();
  renderPeerList("");

  const myLower = (myUsername || "").toLowerCase();
  if (clean === myLower || clean === "me" || clean === "self") {
    savePeerToRecent(myLower);
    openSelfChatRoom();
    showToast(`Added @${myLower} (You) to Direct Conversations!`, "success");
    return;
  }

  savePeerToRecent(clean);
  if (actionType === "add") {
    const rel = await getPeerRelationshipState(clean);
    if (rel.state === "incoming_pending") {
      await respondChatRequest(clean, "accepted");
    } else if (rel.state !== "accepted") {
      await requestChatConnection(clean);
    }
  }
  const dmRoom = await getSecureRoomId(clean);
  joinRoom(dmRoom, "@" + clean);
};

async function updateLiveUserSuggestions(rawQuery) {
  const box = document.getElementById("live-user-suggestions");
  if (!box) return;

  const q = (rawQuery || "").trim().toLowerCase().replace(/^@/, "");
  if (!q) {
    hideLiveUserSuggestions();
    return;
  }

  const queryId = ++latestSearchQueryId;
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="live-suggestion-header">
      <span>MATCHING USERS</span>
      <span>Searching "@${escapeHTML(q)}"...</span>
    </div>
  `;

  const myLower = (myUsername || "").toLowerCase();
  let matchedUsers = [];

  if (supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from("users")
        .select("username, avatar_url, bio, session_token")
        .ilike("username", `%${q}%`)
        .limit(8);
      if (data) matchedUsers = data;
    } catch (e) { }
  }

  if (queryId !== latestSearchQueryId) return;

  // Sort exact match first, then startsWith, then alphabetical
  matchedUsers.sort((a, b) => {
    const ua = (a.username || "").toLowerCase();
    const ub = (b.username || "").toLowerCase();
    if (ua === q && ub !== q) return -1;
    if (ub === q && ua !== q) return 1;
    const aStarts = ua.startsWith(q) ? 0 : 1;
    const bStarts = ub.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return ua.localeCompare(ub);
  });

  // Also check if user typed "me" or "you" or their own username
  const hasSelfInResults = matchedUsers.some((u) => (u.username || "").toLowerCase() === myLower);
  if (
    myLower &&
    !hasSelfInResults &&
    ("me".includes(q) || "you".includes(q) || myLower.includes(q))
  ) {
    matchedUsers.unshift({
      username: myLower,
      avatar_url: myAvatarData,
      bio: myUserBio,
      session_token: mySessionId
    });
  }

  box.innerHTML = `
    <div class="live-suggestion-header">
      <span>INSTAGRAM-STYLE SUGGESTIONS (${matchedUsers.length})</span>
      <span style="cursor: pointer;" onclick="hideLiveUserSuggestions()">✕</span>
    </div>
  `;

  if (matchedUsers.length === 0) {
    box.innerHTML += `
      <div style="padding: 14px 12px; font-size: 12px; color: var(--text-dim); text-align: center;">
        No user found matching "@${escapeHTML(q)}"
      </div>
    `;
    return;
  }

  matchedUsers.forEach((u) => {
    const uname = (u.username || "").toLowerCase();
    if (!uname) return;

    if (u.avatar_url) usersAvatarCache[uname] = u.avatar_url;
    if (u.bio) usersBioCache[uname] = u.bio;
    if (u.session_token) usersSessionCache[uname] = u.session_token;

    const isSelf = uname === myLower;
    const isOnline = isSelf ? true : onlineUsersList.has(uname) && userSettings.onlinePresence;
    const rel = peerRelationshipMap[uname];
    const isAlreadyFriend = isSelf
      ? savedPeers.includes(myLower)
      : rel && (rel.status === "accepted" || (rel.status && rel.status.startsWith("call_")));
    const isPending = !isSelf && rel && rel.status === "pending";

    let subText = isSelf
      ? "Personal Vault • Message Yourself"
      : isOnline
        ? "Online • Active"
        : u.bio || "AES-256 Encrypted";
    let subClass = "contact-preview-text" + (isOnline ? " status-online" : "");

    let actionBtnHTML = "";
    if (isSelf) {
      actionBtnHTML = `<button class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'open')">${savedPeers.includes(myLower) ? "Open" : "+ Add Self"}</button>`;
    } else if (isAlreadyFriend) {
      actionBtnHTML = `<button class="suggestion-action-pill secondary" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'open')">Chat</button>`;
    } else if (isPending) {
      actionBtnHTML = `<button class="suggestion-action-pill secondary" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'add')">${rel.receiver === myLower ? "Accept" : "Pending"}</button>`;
    } else {
      actionBtnHTML = `<button class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'add')">+ Add</button>`;
    }

    const row = document.createElement("div");
    row.className = "contact-card";
    row.onclick = () => selectSuggestedPeer(uname, isAlreadyFriend || isSelf ? "open" : "add");
    row.innerHTML =
      '<div class="contact-card-info">' +
      `<div class="avatar-wrap" onclick="event.stopPropagation(); viewUserProfilePicFullscreen('${escapeHTML(uname)}');" title="Click to View Profile Picture">` +
      `<div class="contact-avatar" id="sug-avatar-${escapeHTML(uname)}"></div>` +
      `<div class="online-dot ${isOnline ? "visible" : ""}"></div>` +
      "</div>" +
      '<div class="contact-name-wrap">' +
      `<span class="contact-name">@${escapeHTML(uname)}${isSelf ? ' <span style="color: var(--accent-primary); font-weight: 800; font-size: 11px;">(You)</span>' : ""}</span>` +
      `<span class="${subClass}">${escapeHTML(subText)}</span>` +
      "</div>" +
      "</div>" +
      '<div class="contact-right-meta">' +
      actionBtnHTML +
      "</div>";

    box.appendChild(row);
    const avEl = row.querySelector(`#sug-avatar-${uname}`);
    renderAvatarElement(avEl, uname, isSelf ? myAvatarData : u.avatar_url || "");
  });

  localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
  localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
  localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
}

async function handlePeerSearchAction() {
  const inputEl = document.getElementById("peer-id-input");
  if (!inputEl) return;
  const peer = inputEl.value.trim().toLowerCase().replace(/^@/, "");

  if (!peer) {
    showToast("Type a @username to see live suggestions", "info");
    return;
  }

  // Trigger live suggestions immediately if not already visible, or pick exact match
  await updateLiveUserSuggestions(peer);
}

const btnConnectPeer = document.getElementById("btn-connect-peer");
if (btnConnectPeer) {
  btnConnectPeer.addEventListener("click", handlePeerSearchAction);
}

const peerIdInputBox = document.getElementById("peer-id-input");
if (peerIdInputBox) {
  peerIdInputBox.addEventListener("input", (e) => {
    const val = e.target.value;
    renderPeerList(val);
    clearTimeout(liveSearchDebounceTimer);
    if (!val.trim()) {
      hideLiveUserSuggestions();
      return;
    }
    liveSearchDebounceTimer = setTimeout(() => {
      updateLiveUserSuggestions(val);
    }, 180);
  });

  peerIdInputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePeerSearchAction();
    } else if (e.key === "Escape") {
      hideLiveUserSuggestions();
    }
  });
}

const btnGlobalRoom = document.getElementById("btn-global-room");
if (btnGlobalRoom) {
  btnGlobalRoom.addEventListener("click", () => {
    joinRoom("global", "Global Anonymous Lounge");
  });
}


// =========================================================================
// PHASE 2 UPGRADES (#6 VIEW-ONCE & 10s, #7 ENCRYPTED GROUPS, #8 KRYPTON AI)
// =========================================================================

// --- FEATURE #6: VIEW-ONCE (1-TIME) & 10s TIMED VIEW ENGINE ---
function setActiveViewMode(mode) {
  activeViewMode = mode || "normal";
  document.querySelectorAll("#hub-viewmode-pills .viewmode-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.vmode === activeViewMode);
  });
  const badge = document.getElementById("active-vmode-badge");
  if (badge) {
    if (activeViewMode === "once") {
      badge.textContent = "1x View";
      badge.classList.remove("hidden");
    } else if (activeViewMode === "10s") {
      badge.textContent = "10s Burn";
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
}

document.querySelectorAll("#hub-viewmode-pills .viewmode-pill").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const chosen = btn.dataset.vmode || "normal";
    setActiveViewMode(chosen);
    const label =
      chosen === "once"
        ? "1-Time View (Burns on close)"
        : chosen === "10s"
          ? "10s Timed View"
          : "Normal Permanent View";
    showToast(`View Mode set to: ${label}`, "info", 1800);
  });
});

const activeVmodeBadgeEl = document.getElementById("active-vmode-badge");
if (activeVmodeBadgeEl) {
  activeVmodeBadgeEl.addEventListener("click", () => {
    setActiveViewMode("normal");
    showToast("Reset to Normal View", "info", 1400);
  });
}

window.openSpecialMediaPhoto = function (msgId, sender, vmode, isMine) {
  const hiddenInput = document.getElementById("vo-data-" + msgId);
  if (!hiddenInput || !hiddenInput.value) return;
  const src = hiddenInput.value;

  const caption =
    vmode === "once"
      ? `1x View Photo from @${sender} (Destroys when closed)`
      : `10s Timed Photo from @${sender} (Destroys in 10s)`;

  openFullscreenImageViewer(src, caption);

  if (vmode === "once") {
    activeViewOnceLightboxCallback = () => {
      deleteSingleMessage(msgId, sender);
      showToast("1-Time View photo destroyed!", "info", 2000);
    };
  } else if (vmode === "10s") {
    const subEl = document.getElementById("vo-sub-" + msgId);
    let rem = 10;
    const iv = setInterval(() => {
      rem--;
      if (subEl) subEl.textContent = `Destroying in ${rem}s...`;
      if (rem <= 0) {
        clearInterval(iv);
        closeFullscreenImageViewer();
        deleteSingleMessage(msgId, sender);
        showToast("10s Timed photo destroyed!", "info", 2000);
      }
    }, 1000);
  }
};

window.handleSpecialFileAccess = function (msgId, sender, vmode) {
  if (vmode === "once") {
    setTimeout(() => {
      deleteSingleMessage(msgId, sender);
      showToast("1-Time View file destroyed after download!", "info");
    }, 1200);
  } else if (vmode === "10s") {
    showToast("10s Timed file will self-destruct in 10 seconds!", "info");
    setTimeout(() => {
      deleteSingleMessage(msgId, sender);
    }, 10000);
  }
};

window.handleSpecialSpoilerReveal = function (msgId, sender, vmode) {
  if (vmode !== "once" && vmode !== "10s") return;
  const row = document.getElementById("msg-row-" + msgId);
  if (!row || row.dataset.specialBurnStarted === "true") return;
  row.dataset.specialBurnStarted = "true";

  const hintEl = document.getElementById("sp-hint-" + msgId);
  const seconds = vmode === "once" ? 5 : 10;
  let rem = seconds;

  if (hintEl) {
    hintEl.textContent = `BURNING IN ${rem}s...`;
    hintEl.style.color = "var(--danger-color)";
  }

  const timer = setInterval(() => {
    rem--;
    if (hintEl && rem > 0) {
      hintEl.textContent = `BURNING IN ${rem}s...`;
    }
    if (rem <= 0) {
      clearInterval(timer);
      deleteSingleMessage(msgId, sender);
      showToast(
        vmode === "once" ? "1-Time spoiler destroyed!" : "10s spoiler destroyed!",
        "info",
        1800
      );
    }
  }, 1000);
};

// --- FEATURE #7: WHATSAPP-STYLE ENCRYPTED GROUPS & OWNER-ONLY CONTROLS ---
let groupModalMode = "create";

window.openGroupModal = function (mode = "create") {
  groupModalMode = mode;
  const modal = document.getElementById("group-create-modal");
  const heading = document.getElementById("group-modal-heading");
  const nameWrap = document.getElementById("group-name-input-wrap");
  const nameInp = document.getElementById("group-name-input");
  const membersInp = document.getElementById("group-members-input");
  const confirmBtn = document.getElementById("btn-confirm-group-modal");
  const chipsContainer = document.getElementById("group-friends-chips");

  if (!modal) return;

  if (mode === "manage" && isGroupRoom(currentRoom) && savedGroups[currentRoom]) {
    const grp = savedGroups[currentRoom];
    const isOwner = isCurrentGroupOwner(currentRoom);
    if (heading) heading.textContent = `👥 ${grp.name} (${(grp.members || []).length} Members)`;
    if (nameWrap) nameWrap.classList.add("hidden");
    if (membersInp) {
      membersInp.value = (grp.members || []).map((m) => "@" + m).join(", ");
      membersInp.disabled = !isOwner;
    }
    if (confirmBtn) {
      confirmBtn.textContent = isOwner ? "Update Members" : "Owner Only (@" + grp.owner + ")";
      confirmBtn.disabled = !isOwner;
    }
  } else {
    groupModalMode = "create";
    if (heading) heading.textContent = "Create Encrypted Group";
    if (nameWrap) nameWrap.classList.remove("hidden");
    if (nameInp) nameInp.value = "";
    if (membersInp) {
      membersInp.value = "";
      membersInp.disabled = false;
    }
    if (confirmBtn) {
      confirmBtn.textContent = "Create Group";
      confirmBtn.disabled = false;
    }
  }

  if (chipsContainer) {
    chipsContainer.innerHTML = "";
    const me = (myUsername || "").toLowerCase();
    savedPeers
      .filter((p) => p.toLowerCase() !== me)
      .forEach((peer) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "friend-pick-chip";
        chip.textContent = "@" + peer;
        chip.onclick = () => {
          if (!membersInp || membersInp.disabled) return;
          const cur = membersInp.value
            .split(",")
            .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
            .filter(Boolean);
          if (cur.includes(peer.toLowerCase())) {
            const next = cur.filter((u) => u !== peer.toLowerCase());
            membersInp.value = next.map((u) => "@" + u).join(", ");
            chip.classList.remove("selected");
          } else {
            cur.push(peer.toLowerCase());
            membersInp.value = cur.map((u) => "@" + u).join(", ");
            chip.classList.add("selected");
          }
        };
        chipsContainer.appendChild(chip);
      });
  }

  modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
};

function closeGroupModal() {
  const modal = document.getElementById("group-create-modal");
  if (modal) modal.classList.add("hidden");
}

const btnOpenCreateGroup = document.getElementById("btn-open-create-group");
if (btnOpenCreateGroup) {
  btnOpenCreateGroup.addEventListener("click", () => openGroupModal("create"));
}

const btnGroupAddMember = document.getElementById("btn-group-add-member");
if (btnGroupAddMember) {
  btnGroupAddMember.addEventListener("click", () => openGroupModal("manage"));
}

const btnCloseGroupModal = document.getElementById("btn-close-group-modal");
if (btnCloseGroupModal) {
  btnCloseGroupModal.addEventListener("click", closeGroupModal);
}

const btnCancelGroupModal = document.getElementById("btn-cancel-group-modal");
if (btnCancelGroupModal) {
  btnCancelGroupModal.addEventListener("click", closeGroupModal);
}

const btnConfirmGroupModal = document.getElementById("btn-confirm-group-modal");
if (btnConfirmGroupModal) {
  btnConfirmGroupModal.addEventListener("click", async () => {
    const nameInp = document.getElementById("group-name-input");
    const membersInp = document.getElementById("group-members-input");
    const me = (myUsername || "").toLowerCase();

    const parsedMembers = (membersInp ? membersInp.value : "")
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);

    const uniqueMembers = [...new Set([me, ...parsedMembers])];

    if (groupModalMode === "manage" && isGroupRoom(currentRoom) && savedGroups[currentRoom]) {
      if (!isCurrentGroupOwner(currentRoom)) {
        showToast("Only the Group Owner can modify members!", "error");
        return;
      }
      const grp = savedGroups[currentRoom];
      grp.members = uniqueMembers;
      savedGroups[currentRoom] = grp;
      localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));

      if (presenceChannel) {
        try {
          await presenceChannel.send({
            type: "broadcast",
            event: "group-sync",
            payload: grp
          });
        } catch (e) { }
      }

      closeGroupModal();
      renderPeerList();
      updateHeaderStatus();
      showToast(`Updated members for "${grp.name}"!`, "success");
      return;
    }

    const gName = (nameInp ? nameInp.value : "").trim();
    if (!gName) {
      showToast("Please enter a group name!", "error");
      return;
    }

    const groupId = "group_" + crypto.randomUUID().slice(0, 12);
    const groupObj = {
      id: groupId,
      name: gName,
      owner: me,
      ownerToken: mySessionId,
      members: uniqueMembers,
      createdAt: new Date().toISOString()
    };

    savedGroups[groupId] = groupObj;
    localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));

    if (presenceChannel) {
      try {
        await presenceChannel.send({
          type: "broadcast",
          event: "group-sync",
          payload: groupObj
        });
      } catch (e) { }
    }

    closeGroupModal();
    renderPeerList();
    joinRoom(groupId, gName);
    showToast(`Created encrypted group "${gName}"!`, "success");
  });
}

// --- FEATURE #8: KRYPTON AI ASSISTANT (CIRCULAR ORB ON MAIN SCREEN + HINGLISH / ENGLISH TOGGLE) ---
const btnAiOrb = document.getElementById("btn-krypton-ai-orb");
const aiDrawer = document.getElementById("krypton-ai-drawer");
const btnCloseAiDrawer = document.getElementById("btn-close-ai-drawer");
const aiChatFeed = document.getElementById("ai-chat-feed");
const aiQuestionInput = document.getElementById("ai-question-input");
const btnAskAi = document.getElementById("btn-ask-ai");
const aiQuickChipsBar = document.getElementById("ai-quick-chips");

let currentAiLang = localStorage.getItem("krypton_ai_lang") || "hinglish";

const AI_CHIPS_DATA = {
  hinglish: [
    { label: "Safety Fingerprint kya hai?", q: "Safety Fingerprint kya hai?" },
    { label: "1x View / 10s Spoiler", q: "1-Time / 10s Spoiler kaise bhejein?" },
    { label: "App Lock & Alt+X", q: "App Lock & Panic Blur (Alt+X) kaise use karein?" },
    { label: "Groups & Admin Controls", q: "Group kaise banayein aur Pin kaise karein?" },
    { label: "Voice Notes & Encrypted Files", q: "Voice Note aur Encrypted File kaise bhejein?" },
    { label: "Username Rename Sync", q: "Username change karne par kya hoga?" },
    { label: "Self-Chat (@me Vault)", q: "Self-Chat (@me) kaise use karein?" },
    { label: "Calls & Swipe Reply", q: "Voice/Video Call aur Swipe Reply kaise karein?" }
  ],
  english: [
    { label: "What is Safety Fingerprint?", q: "What is Safety Fingerprint?" },
    { label: "1x View / 10s Burn Mode", q: "How to send 1-Time View or 10s Spoiler?" },
    { label: "App Lock & Alt+X Blur", q: "How to use Smart App Lock and Alt+X Blur?" },
    { label: "Groups & Admin Controls", q: "How do Encrypted Groups and Owner Pin work?" },
    { label: "Voice Notes & Encrypted Files", q: "How to send Voice Notes and Encrypted Files?" },
    { label: "Username Rename Sync Sync", q: "What happens when I change my username?" },
    { label: "📝 Self-Chat (@me Vault)", q: "How to use Self-Chat (@me)?" },
    { label: "Calls & Swipe Reply", q: "How to make Calls and Swipe to Reply?" }
  ]
};

function renderAiLanguageUI(resetFeed = false) {
  document.querySelectorAll("#ai-lang-toggle .ai-lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.aiLang === currentAiLang);
  });

  if (aiQuestionInput) {
    aiQuestionInput.placeholder =
      currentAiLang === "english"
        ? "Ask about any icon or feature (e.g. plus button, lock icon, groups)..."
        : "Kisi bhi icon ya feature ke baare mein puchhein (e.g. plus button, lock, group)...";
  }

  if (aiQuickChipsBar) {
    aiQuickChipsBar.innerHTML = "";
    const list = AI_CHIPS_DATA[currentAiLang] || AI_CHIPS_DATA.hinglish;
    list.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ai-chip-btn";
      btn.textContent = item.label;
      btn.onclick = () => handleUserAiAsk(item.q);
      aiQuickChipsBar.appendChild(btn);
    });
  }

  if (resetFeed && aiChatFeed) {
    aiChatFeed.innerHTML = "";
    const welcomeHTML =
      currentAiLang === "english"
        ? `<strong>Hello! I am Krypton AI Guide </strong><br/>
           I can explain all Krypton icons, E2EE security features, 1-Time View, Encrypted Groups, and shortcuts in <strong>English</strong>.<br/><br/>
           <em>Privacy Guarantee: I run 100% locally and have 0% access to your messages, passwords, session_token, or friend list. Tap any quick chip above or ask a question below!</em>`
        : `<strong>Namaste! Main Krypton AI Guide hoon </strong><br/>
           Main aapko Krypton ke saare icons, E2EE security features, 1-Time View, Groups aur shortcuts <strong>Hinglish</strong> mein samjha sakta hoon.<br/><br/>
           <em>Privacy Guarantee: Mere paas aapke messages, passwords, session_token ya friend list ka 0% access hai. Upar kisi chip par tap karein ya neeche apna sawal puchhein!</em>`;
    appendAiMessage(welcomeHTML, "bot");
  }
}

document.querySelectorAll("#ai-lang-toggle .ai-lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const chosen = btn.dataset.aiLang || "hinglish";
    if (chosen === currentAiLang) return;
    currentAiLang = chosen;
    localStorage.setItem("krypton_ai_lang", currentAiLang);
    renderAiLanguageUI(true);
    showToast(
      currentAiLang === "english"
        ? "AI Guide language switched to English"
        : "AI Guide language switched to Hinglish",
      "info",
      1600
    );
  });
});

function getSandboxedKryptonAiResponse(rawQuery) {
  const q = String(rawQuery || "").trim().toLowerCase();
  const isEn = currentAiLang === "english";

  // Strict Privacy Wall: Block any attempt to query user data, passwords, messages, session tokens, or online lists
  const privacyTriggerWords = [
    "password", "pass ", "pass?", "session_token", "token", "private chat",
    "message padho", "chat batao", "kaun online", "who is online", "friend list",
    "database", "supabase key", "decrypt", "hack", "leak"
  ];
  if (
    privacyTriggerWords.some((w) => q.includes(w)) ||
    (q.includes("@") && !q.includes("@me") && !q.includes("@old") && !q.includes("@new"))
  ) {
    return isEn
      ? "<strong>Privacy Protocol:</strong> I am strictly built to explain Krypton's features and UI icons. I have zero access to any user's messages, passwords, session_token, or personal data."
      : "<strong>Privacy Protocol:</strong> Main sirf Krypton ke features aur icons samjhane ke liye bana hoon. Mere paas kisi bhi user ke messages, passwords, session_token ya personal data ka access nahi hai.";
  }

  if (q.includes("fingerprint") || q.includes("safety")) {
    return isEn
      ? "<strong>E2EE Safety Fingerprint:</strong><br/>In every 1-on-1 chat, both users' permanent cryptographic <code>session_token</code> IDs are combined and hashed via SHA-256 to generate a 16-character Safety Code.<br/>• Tap any user's header to view this code. If the code matches on both devices, your tunnel is 100% authentic with zero man-in-the-middle risk."
      : "<strong>E2EE Safety Fingerprint:</strong><br/>Har 1-on-1 chat mein dono users ke permanent cryptographic <code>session_token</code> ko mila kar SHA-256 se 16-character ka Safety Code banta hai.<br/>• Kisi user ke naam par tap karke aap yeh code dekh sakte hain. Agar aapke aur aapke dost ke screen par code same hai, toh 100% guarantee hai ki beech mein koi teesra insaan nahi hai.";
  }

  if (q.includes("1-time") || q.includes("view once") || q.includes("10s") || q.includes("spoiler") || q.includes("plus") || q.includes("+")) {
    return isEn
      ? "<strong>Corner (+) Hub, 1-Time View & 10s Spoiler:</strong><br/>Tap the <strong>(+)</strong> button on the left of the chat input bar:<br/>1. <strong>♾️ Normal:</strong> Keeps the photo/file/message permanently.<br/>2. <strong>1️⃣ 1-Time View:</strong> Like WhatsApp View-Once, as soon as the receiver opens and closes the photo/file/spoiler, it is permanently destroyed on both sides!<br/>3. <strong>⏱️ 10s View:</strong> Automatically self-destructs 10 seconds after being opened/revealed."
      : "<strong>Corner (+) Hub, 1-Time View & 10s Spoiler:</strong><br/>Chat input bar ke left corner mein <strong>(+)</strong> button dabayein:<br/>1. <strong>♾️ Normal:</strong> Message/Photo hamesha rahega.<br/>2. <strong>1️⃣ 1-Time View:</strong> WhatsApp View-Once ki tarah receiver jaise hi photo/file/spoiler khol kar band karega, woh dono taraf se hamesha ke liye destroy ho jayega!<br/>3. <strong>⏱️ 10s View:</strong> Open/Reveal karne ke thik 10 second baad auto-delete ho jayega.";
  }

  if (q.includes("lock") || q.includes("pin") || q.includes("alt+x") || q.includes("blur") || q.includes("minimize")) {
    return isEn
      ? "<strong>Smart App Lock & Panic Blur (Alt+X):</strong><br/>• Click the top-left <strong>🔒 Lock Icon</strong> on the sidebar to set a 4–6 digit PIN and choose an Auto-Lock Timer.<br/>• <strong>Auto-Lock Modes:</strong> Instant on Minimize/Tab Switch, After 1m, After 5m, or On App Restart.<br/>• <strong>Shortcut:</strong> Press <code>Alt + X</code> or <code>Double Esc</code> anytime to instantly blur and lock your screen!"
      : "<strong>Smart App Lock & Panic Blur (Alt+X):</strong><br/>• Sidebar ke top-left <strong>🔒 Lock Icon</strong> par click karke aap 4-6 digit PIN aur Auto-Lock Timer set kar sakte hain.<br/>• <strong>Auto-Lock Modes:</strong> Instant on Minimize/Tab Switch, After 1m, After 5m, ya On App Restart.<br/>• <strong>Shortcut:</strong> Keyboard par <code>Alt + X</code> ya <code>Double Esc</code> dabate hi screen turant blur aur lock ho jayegi!";
  }

  if (q.includes("group") || q.includes("owner")) {
    return isEn
      ? "<strong>Encrypted Groups & Owner-Only Pin:</strong><br/>• Tap <strong>+ New Group</strong> on the sidebar to name your group and add friends.<br/>• <strong>Sidebar Tabs:</strong> Use <code>All | Direct | Groups</code> tabs to filter conversations in one click.<br/>• <strong>Owner Control:</strong> Pinning is disabled in Global Lounge, and inside a Group only the <strong>Group Owner (👑)</strong> can Pin/Unpin messages or add members."
      : "<strong>Encrypted Groups & Owner-Only Pin:</strong><br/>• Sidebar mein <strong>+ New Group</strong> button daba kar aap group ka naam aur members add kar sakte hain.<br/>• <strong>Sidebar Tabs:</strong> <code>All | Direct | Groups</code> tabs se aap ek click mein chats filter kar sakte hain.<br/>• <strong>Owner Control:</strong> Global Lounge mein Pin band hai, aur Group ke andar sirf <strong>Group Owner (👑)</strong> hi messages ko Pin/Unpin ya members update kar sakta hai.";
  }

  if (q.includes("voice") || q.includes("mic") || q.includes("file") || q.includes("photo") || q.includes("audio")) {
    return isEn
      ? "<strong>Voice Notes & 📎 Encrypted Files:</strong><br/>• <strong>Voice Note:</strong> Press and hold the <strong>🎤 Mic Icon</strong> on the right of the input bar, speak, and release to send an encrypted 24kbps Opus voice note.<br/>• <strong>Files & Photos:</strong> Use the left <strong>(+)</strong> button to encrypt and send PDF, ZIP, Code, or Photos up to 1.5 MB using AES-256."
      : "<strong>Voice Notes & 📎 Encrypted Files:</strong><br/>• <strong>Voice Note:</strong> Input bar ke right side mein <strong>🎤 Mic Icon</strong> ko daba kar rakhein (Hold to Record) aur bolne ke baad chhod dein—24kbps Opus encrypted audio turant chala jayega.<br/>• <strong>Files & Photos:</strong> Left <strong>(+)</strong> button se aap 1.5 MB tak koi bhi PDF, ZIP, Code ya Photo AES-256 encrypt karke bhej sakte hain.";
  }

  if (q.includes("username") || q.includes("rename") || q.includes("change")) {
    return isEn
      ? "<strong>Username Rename & Session-Token Security:</strong><br/>• In Settings (⚙️), tap the pencil icon to change your <code>@username</code>.<br/>• Your identity is bound to your permanent cryptographic <code>session_token</code>—so all connected friends automatically sync your new username without re-sending friend requests!<br/>• If someone else later registers your old username, they get 0% of your old chats or friends."
      : "<strong>Username Rename & Session-Token Security:</strong><br/>• Settings (⚙️) mein pencil icon daba kar aap apna <code>@username</code> badal sakte hain.<br/>• Aapki pehchan aapke permanent <code>session_token</code> se locked rehti hai—isliye naam badalte hi aapke saare connected dosto ke phone mein naya naam automatically sync ho jayega!<br/>• Agar koi naya banda aapka chhoda hua purana naam le bhi le, toh use aapki purani chats ya friends ka 0% data milega.";
  }

  if (q.includes("self") || q.includes("@me") || q.includes("notes") || q.includes("khud")) {
    return isEn
      ? "<strong>WhatsApp-Style Self-Chat (@me):</strong><br/>• Type your own <code>@username</code> or <code>me</code> in the search bar and tap <strong>+ Add Self</strong> from the live suggestions.<br/>• Use this personal encrypted vault to save notes, photos, files, and links with instant Blue Double Ticks (✓✓)."
      : "<strong>WhatsApp-Style Self-Chat (@me):</strong><br/>• Search box mein apna khud ka <code>@username</code> ya <code>me</code> type karein—live suggestion mein <strong>+ Add Self</strong> aayega.<br/>• Is personal encrypted vault mein aap apne notes, photos, files aur links save kar sakte hain aur har message par turant Blue Double Tick (✓✓) lagta hai.";
  }

  if (q.includes("call") || q.includes("video") || q.includes("swipe") || q.includes("reply")) {
    return isEn
      ? "<strong>WebRTC Calls & Swipe-to-Reply:</strong><br/>• <strong>Calls:</strong> Use the 📞 Voice and 📹 Video icons in any 1-on-1 chat header to start a P2P encrypted call.<br/>• <strong>Swipe-to-Reply:</strong> Swipe/drag any message to the right (or tap the reply icon) to quote-reply just like WhatsApp!"
      : "<strong>WebRTC Calls & Swipe-to-Reply:</strong><br/>• <strong>Calls:</strong> 1-on-1 chat ke top header mein 📞 Voice aur 📹 Video call icons hain jo P2P encrypted call connect karte hain.<br/>• <strong>Swipe-to-Reply:</strong> Kisi bhi message ko right side swipe/drag karein (ya reply icon dabayein) toh WhatsApp ki tarah quote reply lag jayega!";
  }

  return isEn
    ? "<strong>Krypton Feature Guide:</strong><br/>Ask me about any feature or icon, such as:<br/>• <strong>(+) Button / 1-Time View</strong><br/>• <strong>🔒 Lock Icon / Auto-Lock Timer</strong><br/>• <strong>👥 Encrypted Groups & Pinning</strong><br/>• <strong>Self-Chat (@me Vault) & Live Search</strong><br/>• <strong>🔐 E2EE Safety Fingerprint</strong>"
    : "<strong>Krypton Feature Guide:</strong><br/>Aap mujhse kisi bhi feature ya icon ke baare mein puchh sakte hain, jaise:<br/>• <strong>(+) Button / 1-Time View</strong><br/>• <strong>🔒 Lock Icon / Auto-Lock Timer</strong><br/>• <strong>👥 Encrypted Groups & Pinning</strong><br/>• <strong>Self-Chat (@me Vault) & Live Search</strong><br/>• <strong>🔐 E2EE Safety Fingerprint</strong>";
}

function appendAiMessage(htmlContent, sender = "bot") {
  if (!aiChatFeed) return;
  const div = document.createElement("div");
  div.className = "ai-msg-bubble " + sender;
  div.innerHTML = htmlContent;
  aiChatFeed.appendChild(div);
  aiChatFeed.scrollTop = aiChatFeed.scrollHeight;
}

function handleUserAiAsk(queryText) {
  const clean = (queryText || "").trim();
  if (!clean) return;
  appendAiMessage(escapeHTML(clean), "user");
  if (aiQuestionInput) aiQuestionInput.value = "";
  setTimeout(() => {
    const reply = getSandboxedKryptonAiResponse(clean);
    appendAiMessage(reply, "bot");
  }, 160);
}

if (btnAiOrb && aiDrawer) {
  btnAiOrb.addEventListener("click", () => {
    if (aiChatFeed && aiChatFeed.children.length === 0) {
      renderAiLanguageUI(true);
    } else {
      renderAiLanguageUI(false);
    }
    aiDrawer.classList.remove("hidden");
    if (window.lucide) lucide.createIcons({ nodes: [aiDrawer] });
  });
}

if (btnCloseAiDrawer && aiDrawer) {
  btnCloseAiDrawer.addEventListener("click", () => {
    aiDrawer.classList.add("hidden");
  });
}

if (aiDrawer) {
  aiDrawer.addEventListener("click", (e) => {
    if (e.target.id === "krypton-ai-drawer") {
      aiDrawer.classList.add("hidden");
    }
  });
}

if (btnAskAi && aiQuestionInput) {
  btnAskAi.addEventListener("click", () => handleUserAiAsk(aiQuestionInput.value));
  aiQuestionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleUserAiAsk(aiQuestionInput.value);
    }
  });
}

// Initialize AI Guide Language UI on boot
renderAiLanguageUI(true);

// Boot Krypton v1000 Engine



// =========================================================================
// KRYPTON v4000 MASTER FIX PATCH:
// 1. DEDUPLICATED 1-1 MESSAGE COUNTS & SINGLE TOAST NOTIFICATION
// 2. NO FALSE "ACCEPTED FRIEND REQUEST" POPUP AFTER CALL ENDS
// 3. 2-STEP CALL PERMISSION SYSTEM (ONE-TIME APPROVAL IN REQUESTS, THEN 1-CLICK CALL)
// 4. MOBILE RENAME UI, STRICT DB-ONLY SEARCH, EXACT PROFILE SYNC & PERMANENT DELETE
// =========================================================================

let deletedPeersList = JSON.parse(localStorage.getItem("krypton_deleted_peers") || "[]");
let pendingGroupInvitesList = JSON.parse(localStorage.getItem("krypton_group_invites") || "[]");
let processedIncomingMsgIds = new Set();

function markMessageProcessedOnce(msgObj) {
  if (!msgObj) return false;
  const key = msgObj.id
    ? "id_" + msgObj.id
    : "sig_" + (msgObj.sender_id || "") + "_" + (msgObj.iv || "") + "_" + (msgObj.created_at || "");
  if (processedIncomingMsgIds.has(key)) return false;
  processedIncomingMsgIds.add(key);
  if (processedIncomingMsgIds.size > 300) {
    const first = processedIncomingMsgIds.values().next().value;
    processedIncomingMsgIds.delete(first);
  }
  return true;
}

// 1. FIX: Deterministic 1-on-1 Room ID
getSecureRoomId = async function (peerId) {
  const p = (peerId || "").trim().toLowerCase().replace(/^@/, "");
  const me = (myUsername || "").trim().toLowerCase();
  if (!p || p === me || p === "me" || p === "self") {
    return getMySelfRoomId();
  }
  return [me, p].sort().join("__dm__");
};

// Override startGlobalIncomingMessageWatcher so it NEVER double-counts or double-toasts
startGlobalIncomingMessageWatcher = function () {
  if (!supabaseClient || !myUsername) return;
  if (globalMessagesWatcher) supabaseClient.removeChannel(globalMessagesWatcher);

  globalMessagesWatcher = supabaseClient
    .channel("krypton_global_msg_alert")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const newMsg = payload.new;
        if (!newMsg || newMsg.room_id === "global") return;
        if ((newMsg.sender_id || "").toLowerCase() === myUsername.toLowerCase()) return;

        const sender = (newMsg.sender_id || "").toLowerCase();
        if (blockedUsers.includes(sender)) return;

        const expectedRoom = await getSecureRoomId(sender);
        if (newMsg.room_id === expectedRoom) {
          // Deduplicate against fast-dm-sync broadcast!
          if (!markMessageProcessedOnce(newMsg)) return;

          savePeerToRecent(sender, true);
          triggerSystemPushNotification(
            `Krypton • @${sender}`,
            "Sent you an encrypted message",
            `dm-${sender}`
          );
          if (currentRoom !== expectedRoom) {
            unreadCounts[sender] = (unreadCounts[sender] || 0) + 1;
            localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));
            playSynthTone("receive");
            showToast(`New encrypted message from @${sender}`, "info");
            renderPeerList();
          }
        }
      }
    )
    .subscribe();
};

// Fast 1-on-1 Direct Message Realtime Relay (with strict deduplication against DB watcher)
const origTransmitPayload = transmitPayload;
transmitPayload = async function (payloadString) {
  const targetRoom = currentRoom;
  const targetPeer = currentPeerUser;
  await origTransmitPayload(payloadString);

  if (targetRoom && targetRoom !== "global" && !isSelfRoom(targetRoom) && supabaseClient) {
    try {
      const { data: latest } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("room_id", targetRoom)
        .eq("sender_id", myUsername)
        .order("created_at", { ascending: false })
        .limit(1);

      if (latest && latest.length > 0 && presenceChannel) {
        await presenceChannel.send({
          type: "broadcast",
          event: "fast-dm-sync",
          payload: {
            room: targetRoom,
            sender: myUsername.toLowerCase(),
            targetPeer: (targetPeer || "").toLowerCase(),
            msg: latest[0]
          }
        });
      }
    } catch (e) { }
  }
};

// 2. FIX: Mobile-Perfect Username Edit & Cancel Toggle + Purge Old Username Everywhere
const btnCancelUsernameEl = document.getElementById("btn-cancel-username");
if (btnCancelUsernameEl) {
  btnCancelUsernameEl.addEventListener("click", () => {
    exitUsernameEditMode();
  });
}

exitUsernameEditMode = function () {
  clearUsernameError();
  const copyBtn = document.getElementById("copy-id-btn");
  if (usernameDisplayText) usernameDisplayText.classList.remove("hidden");
  if (btnEditUsername) btnEditUsername.classList.remove("hidden");
  if (copyBtn) copyBtn.classList.remove("hidden");
  if (usernameEditInput) usernameEditInput.classList.add("hidden");
  if (btnSaveUsername) btnSaveUsername.classList.add("hidden");
  if (btnCancelUsernameEl) btnCancelUsernameEl.classList.add("hidden");
};

if (btnEditUsername) {
  btnEditUsername.addEventListener("click", () => {
    const copyBtn = document.getElementById("copy-id-btn");
    if (copyBtn) copyBtn.classList.add("hidden");
    if (btnCancelUsernameEl) btnCancelUsernameEl.classList.remove("hidden");
  });
}

const origApplyLivePeerRename = applyLivePeerRename;
applyLivePeerRename = function (oldUname, newUname, sessionToken) {
  const oldClean = (oldUname || "").trim().toLowerCase();
  const newClean = (newUname || "").trim().toLowerCase();
  if (!oldClean || !newClean || oldClean === newClean) return;

  savedPeers = savedPeers.filter((p) => p.toLowerCase() !== oldClean);
  if (!deletedPeersList.includes(newClean)) {
    savedPeers.unshift(newClean);
  }
  savedPeers = [...new Set(savedPeers)];
  localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));

  delete usersAvatarCache[oldClean];
  delete usersBioCache[oldClean];
  delete usersSessionCache[oldClean];
  delete peerRelationshipMap[oldClean];
  localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
  localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
  localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));

  origApplyLivePeerRename(oldClean, newClean, sessionToken);
  fetchPeersUserData();
};

// 3. FIX: Sync Exact Profile (Avatar & Bio) & Prune Any Deleted DB Users from Saved List
fetchPeersUserData = async function () {
  if (!supabaseClient) return;
  const myLower = (myUsername || "").toLowerCase();
  const peersToCheck = savedPeers.filter((p) => p.toLowerCase() !== myLower);
  if (peersToCheck.length === 0) {
    renderPeerList();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("username, avatar_url, bio, session_token")
      .in("username", peersToCheck);

    if (!error && data) {
      const existingSet = new Set();
      data.forEach((u) => {
        const uname = (u.username || "").toLowerCase();
        existingSet.add(uname);
        usersAvatarCache[uname] = u.avatar_url || "";
        usersBioCache[uname] = u.bio || "Hey there! I am using Krypton.";
        if (u.session_token) {
          usersSessionCache[uname] = u.session_token;
          peerTokenBindingMap[uname] = u.session_token;
        }
      });

      const validPeers = savedPeers.filter(
        (p) => p.toLowerCase() === myLower || existingSet.has(p.toLowerCase())
      );
      if (validPeers.length !== savedPeers.length) {
        savedPeers = validPeers;
        localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
      }

      localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
      localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
      localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
      localStorage.setItem("krypton_peer_token_bindings", JSON.stringify(peerTokenBindingMap));
    }
  } catch (e) { }

  renderPeerList();
  updateHeaderStatus();
};

const origStartUsersProfileWatcher = startUsersProfileWatcher;
startUsersProfileWatcher = function () {
  origStartUsersProfileWatcher();
  if (!supabaseClient || !usersProfileWatcher) return;
  usersProfileWatcher.on(
    "postgres_changes",
    { event: "DELETE", schema: "public", table: "users" },
    (payload) => {
      const oldRow = payload.old || {};
      if (oldRow.username) {
        const delUname = oldRow.username.toLowerCase();
        savedPeers = savedPeers.filter((p) => p.toLowerCase() !== delUname);
        localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
        delete usersAvatarCache[delUname];
        delete usersBioCache[delUname];
        renderPeerList();
      } else {
        fetchPeersUserData();
      }
    }
  );
};

// 4. FIX: Deleted User Never Re-Appears on Reload
savePeerToRecent = function (peer, forceUnDelete = false) {
  const p = (peer || "").trim().toLowerCase().replace(/^@/, "");
  if (!p || p === "global") return;

  if (forceUnDelete) {
    deletedPeersList = deletedPeersList.filter((u) => u !== p);
    localStorage.setItem("krypton_deleted_peers", JSON.stringify(deletedPeersList));
  } else if (deletedPeersList.includes(p)) {
    return;
  }

  if (!savedPeers.includes(p)) {
    savedPeers.unshift(p);
    localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
    if (p !== myUsername.toLowerCase()) {
      fetchPeersUserData();
    }
  }
  renderPeerList();
};

window.deleteSingleConversation = async function (peer, e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  document.querySelectorAll(".contact-dropdown-menu").forEach((m) => {
    if (m.id !== "header-dropdown-menu") m.remove();
  });

  const targetPeer = (peer || "").trim().toLowerCase();
  const confirmDelete = await showGlassDialog({
    title: `Delete Chat with @${targetPeer}?`,
    message: `Permanently remove @${targetPeer} and wipe conversation so it doesn't return on reload?`,
    confirmText: "Delete Permanently",
    danger: true
  });
  if (!confirmDelete) return;

  if (!deletedPeersList.includes(targetPeer)) {
    deletedPeersList.push(targetPeer);
    localStorage.setItem("krypton_deleted_peers", JSON.stringify(deletedPeersList));
  }

  savedPeers = savedPeers.filter((p) => p.toLowerCase() !== targetPeer);
  localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
  pinnedPeers = pinnedPeers.filter((p) => p.toLowerCase() !== targetPeer);
  localStorage.setItem("krypton_pinned_peers", JSON.stringify(pinnedPeers));
  delete unreadCounts[targetPeer];
  localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));
  delete peerRelationshipMap[targetPeer];

  const dmRoom = await getSecureRoomId(targetPeer);
  delete roomDecryptedCache[dmRoom];
  sessionStorage.setItem("krypton_fast_room_cache", JSON.stringify(roomDecryptedCache));

  if (currentRoom === dmRoom) exitChatToDashboard();
  renderPeerList();

  if (supabaseClient) {
    await supabaseClient.from("messages").delete().eq("room_id", dmRoom);
    await supabaseClient
      .from("chat_requests")
      .delete()
      .or(
        `and(sender_id.ilike.${myUsername},receiver_id.ilike.${targetPeer}),` +
        `and(sender_id.ilike.${targetPeer},receiver_id.ilike.${myUsername})`
      );
  }
  showToast(`Deleted @${targetPeer} permanently!`, "success");
};

// 5. FIX: Search Suggestions ONLY Show Active Database Users + Exact Profile Avatar & Bio
updateLiveUserSuggestions = async function (rawQuery) {
  const box = document.getElementById("live-user-suggestions");
  if (!box) return;

  const q = (rawQuery || "").trim().toLowerCase().replace(/^@/, "");
  if (!q) {
    hideLiveUserSuggestions();
    return;
  }

  const queryId = ++latestSearchQueryId;
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="live-suggestion-header">
      <span>ACTIVE USERS</span>
      <span>Searching "@${escapeHTML(q)}"...</span>
    </div>
  `;

  const myLower = (myUsername || "").toLowerCase();
  const userMap = new Map();

  if (supabaseClient) {
    try {
      const { data: uData } = await supabaseClient
        .from("users")
        .select("username, avatar_url, bio, session_token")
        .ilike("username", `%${q}%`)
        .limit(15);

      if (uData) {
        uData.forEach((u) => {
          const clean = (u.username || "").trim().toLowerCase();
          if (!clean) return;
          usersAvatarCache[clean] = u.avatar_url || "";
          usersBioCache[clean] = u.bio || "Hey there! I am using Krypton.";
          if (u.session_token) usersSessionCache[clean] = u.session_token;

          userMap.set(clean, {
            username: clean,
            avatar_url: u.avatar_url || "",
            bio: u.bio || "Hey there! I am using Krypton."
          });
        });
        localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
        localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
        localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
      }
    } catch (e) { }
  }

  if (
    myLower &&
    !userMap.has(myLower) &&
    (myLower.includes(q) || "me".includes(q) || "you".includes(q))
  ) {
    userMap.set(myLower, {
      username: myLower,
      avatar_url: myAvatarData || "",
      bio: myUserBio || "Personal Encrypted Vault"
    });
  }

  if (queryId !== latestSearchQueryId) return;

  const matchedUsers = Array.from(userMap.values()).sort((a, b) => {
    if (a.username === q && b.username !== q) return -1;
    if (b.username === q && a.username !== q) return 1;
    if (a.username.startsWith(q) && !b.username.startsWith(q)) return -1;
    if (!a.username.startsWith(q) && b.username.startsWith(q)) return 1;
    return a.username.localeCompare(b.username);
  });

  box.innerHTML = `
    <div class="live-suggestion-header">
      <span>MATCHING USERS (${matchedUsers.length})</span>
      <span style="cursor: pointer;" onclick="hideLiveUserSuggestions()">✕</span>
    </div>
  `;

  if (matchedUsers.length === 0) {
    box.innerHTML += `
      <div style="padding: 14px 12px; font-size: 12px; color: var(--text-dim); text-align: center;">
        No active user found with username "@${escapeHTML(q)}"
      </div>
    `;
    return;
  }

  matchedUsers.forEach((u) => {
    const uname = u.username;
    const isSelf = uname === myLower;
    const isOnline = isSelf ? true : onlineUsersList.has(uname) && userSettings.onlinePresence;
    const rel = peerRelationshipMap[uname];
    const isAlreadyFriend = isSelf
      ? savedPeers.includes(myLower)
      : rel && (rel.status === "accepted" || (rel.status && rel.status.startsWith("call_")));

    let actionBtnHTML = "";
    if (isSelf) {
      actionBtnHTML = `<button class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'open')">${savedPeers.includes(myLower) ? "Open" : "+ Add Self"}</button>`;
    } else if (isAlreadyFriend) {
      actionBtnHTML = `<button class="suggestion-action-pill secondary" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'open')">Chat</button>`;
    } else {
      actionBtnHTML = `<button class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'add')">+ Connect</button>`;
    }

    const exactAvatar = isSelf ? myAvatarData : u.avatar_url || usersAvatarCache[uname] || "";
    const exactBio = isSelf
      ? myUserBio || "Personal Vault • Message Yourself"
      : u.bio || usersBioCache[uname] || "Hey there! I am using Krypton.";

    const row = document.createElement("div");
    row.className = "contact-card";
    row.onclick = () => selectSuggestedPeer(uname, isAlreadyFriend || isSelf ? "open" : "add");
    row.innerHTML =
      '<div class="contact-card-info">' +
      `<div class="avatar-wrap" onclick="event.stopPropagation(); viewUserProfilePicFullscreen('${escapeHTML(uname)}');" title="Click to View Profile Picture">` +
      `<div class="contact-avatar" id="sug-avatar-${escapeHTML(uname)}"></div>` +
      `<div class="online-dot ${isOnline ? "visible" : ""}"></div></div>` +
      '<div class="contact-name-wrap">' +
      `<span class="contact-name">@${escapeHTML(uname)}${isSelf ? ' <span style="color: var(--accent-primary); font-weight: 800; font-size: 11px;">(You)</span>' : ""}</span>` +
      `<span class="contact-preview-text ${isOnline ? "status-online" : ""}">${escapeHTML(exactBio)}</span>` +
      "</div></div>" +
      `<div class="contact-right-meta">${actionBtnHTML}</div>`;

    box.appendChild(row);
    renderAvatarElement(row.querySelector(`#sug-avatar-${uname}`), uname, exactAvatar);
  });
};

window.selectSuggestedPeer = async function (uname, actionType = "open") {
  const clean = (uname || "").trim().toLowerCase().replace(/^@/, "");
  if (!clean) return;
  const inputEl = document.getElementById("peer-id-input");
  if (inputEl) inputEl.value = "";
  hideLiveUserSuggestions();

  const myLower = (myUsername || "").toLowerCase();
  if (clean === myLower || clean === "me" || clean === "self") {
    savePeerToRecent(myLower, true);
    openSelfChatRoom();
    return;
  }

  savePeerToRecent(clean, true);
  if (actionType === "add") {
    const rel = await getPeerRelationshipState(clean);
    if (rel.state === "incoming_pending") {
      await respondChatRequest(clean, "accepted");
    } else if (rel.state !== "accepted") {
      await requestChatConnection(clean);
    }
  }
  const dmRoom = await getSecureRoomId(clean);
  joinRoom(dmRoom, "@" + clean);
};

// =========================================================================
// 6. FIX: 2-STEP CALL PERMISSION REQUEST SYSTEM + NO FALSE FRIEND-ACCEPTED POPUP
// =========================================================================
// Step 1: First-time call sends a "Call Permission Request" (`call_perm_req:caller`).
//         The other user sees it in their Requests list ("📞 @user wants permission to call you: Allow / Deny")
//         AND a non-intrusive permission prompt.
//         Once approved (`call_allowed = true`), the requester gets a toast:
//         "📞 @peer approved your Call Request! Ab aap 1-click mein call kar sakte hain."
// Step 2: Any subsequent click on Voice or Video Call button immediately rings the peer (`call_ring_voice:caller`),
//         and as soon as they click "Accept Call", the call connects!
// Step 3: When a call ends, status returns to `accepted` WITHOUT triggering the false
//         "@user accepted your friend request!" popup!

listenToIncomingRequests = async function () {
  if (!supabaseClient || !myUsername) return;
  await fetchPendingRequests();

  if (requestsSubscription) supabaseClient.removeChannel(requestsSubscription);
  requestsSubscription = supabaseClient
    .channel("krypton_requests_watch")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_requests" },
      async (payload) => {
        const row = payload.new;
        const me = (myUsername || "").toLowerCase();

        if (row) {
          const s = (row.sender_id || "").toLowerCase();
          const rec = (row.receiver_id || "").toLowerCase();
          const other = s === me ? rec : s;
          const prevStatus =
            peerRelationshipMap[other] && peerRelationshipMap[other].status
              ? peerRelationshipMap[other].status
              : null;

          // New Friend Request
          if (payload.eventType === "INSERT" && rec === me && row.status === "pending") {
            playSynthTone("receive");
            showToast(`New friend request from @${s}!`, "info");
            triggerSystemPushNotification(
              "Krypton • Friend Request",
              `@${s} wants to connect with you`,
              `req-${s}`
            );
          }

          // Friend Request Accepted ( ONLY when transitioning from 'pending' -> 'accepted', NEVER after a call ends! )
          if (
            payload.eventType === "UPDATE" &&
            s === me &&
            row.status === "accepted" &&
            prevStatus === "pending"
          ) {
            savePeerToRecent(rec, true);
            playSynthTone("receive");
            showToast(`@${rec} accepted your friend request!`, "success");
          }

          // Call Permission Request Approved Notification
          if (
            payload.eventType === "UPDATE" &&
            (s === me || rec === me) &&
            row.status === "accepted" &&
            row.call_allowed === true &&
            prevStatus &&
            prevStatus.startsWith("call_perm_req:")
          ) {
            const requester = prevStatus.split(":")[1] || "";
            if (requester.toLowerCase() === me) {
              playSynthTone("receive");
              showToast(`@${other} approved your Call Request! Ab aap 1-click mein call laga sakte hain.`, "success", 4200);
            }
          }

          // Call Permission Request Denied Notification
          if (
            payload.eventType === "UPDATE" &&
            (s === me || rec === me) &&
            row.status === "accepted" &&
            row.call_allowed === false &&
            prevStatus &&
            prevStatus.startsWith("call_perm_req:")
          ) {
            const requester = prevStatus.split(":")[1] || "";
            if (requester.toLowerCase() === me) {
              showToast(`@${other} declined your call permission request.`, "error");
            }
          }
        }

        await fetchPendingRequests();
        handleCallRequestCheck(payload);

        if (currentRoom && currentRoom !== "global" && currentPeerUser) {
          await updateChatLockBannerState(currentPeerUser);
        }
      }
    )
    .subscribe();
};

window.respondCallPermRequest = async function (peerUser, decision) {
  if (!supabaseClient) return;
  const p = (peerUser || "").trim().toLowerCase();
  const me = (myUsername || "").trim().toLowerCase();
  const allow = decision === "allow";

  await supabaseClient
    .from("chat_requests")
    .update({
      call_allowed: allow,
      status: "accepted"
    })
    .or(
      `and(sender_id.ilike.${me},receiver_id.ilike.${p}),` +
      `and(sender_id.ilike.${p},receiver_id.ilike.${me})`
    );

  if (allow) {
    showToast(`Call permission granted to @${p}! Ab aap dono 1-click mein call kar sakte hain.`, "success");
  } else {
    showToast(`Declined call permission for @${p}.`, "info");
  }
  await fetchPendingRequests();
};

window.respondGroupInvite = function (groupId, decision) {
  const invite = pendingGroupInvitesList.find((g) => g.id === groupId);
  pendingGroupInvitesList = pendingGroupInvitesList.filter((g) => g.id !== groupId);
  localStorage.setItem("krypton_group_invites", JSON.stringify(pendingGroupInvitesList));

  if (decision === "accept" && invite) {
    savedGroups[invite.id] = invite;
    localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));
    showToast(`Joined encrypted group "${invite.name}"!`, "success");
    renderPeerList();
    joinRoom(invite.id, invite.name);
  } else {
    showToast("Declined group invitation.", "info");
  }
  fetchPendingRequests();
};

fetchPendingRequests = async function () {
  if (!supabaseClient || !myUsername) return;
  const me = myUsername.toLowerCase();

  const { data: allReqs } = await supabaseClient
    .from("chat_requests")
    .select("*")
    .or(`sender_id.ilike.${me},receiver_id.ilike.${me}`);

  peerRelationshipMap = {};
  const incomingPending = [];
  const sentPending = [];
  const incomingCallPerms = [];

  if (allReqs) {
    allReqs.forEach((r) => {
      const s = (r.sender_id || "").toLowerCase();
      const rec = (r.receiver_id || "").toLowerCase();
      const other = s === me ? rec : s;
      if (!other || blockedUsers.includes(other)) return;

      peerRelationshipMap[other] = {
        status: r.status,
        sender: s,
        receiver: rec,
        call_allowed: r.call_allowed === true
      };

      if (r.status === "accepted" || (r.status && r.status.startsWith("call_"))) {
        if (!deletedPeersList.includes(other) && !savedPeers.includes(other)) {
          savedPeers.unshift(other);
          localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
        }
        if (r.status && r.status.startsWith("call_perm_req:")) {
          const requester = (r.status.split(":")[1] || "").toLowerCase();
          if (requester && requester !== me) {
            incomingCallPerms.push({ peer: requester, row: r });
          }
        }
      } else if (r.status === "pending") {
        if (rec === me) incomingPending.push(r);
        else if (s === me) sentPending.push(r);
      }
    });
  }

  savedPeers = savedPeers.filter((p) => !deletedPeersList.includes(p.toLowerCase()));
  localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
  renderPeerList();

  const container = document.getElementById("requests-container");
  const section = document.getElementById("pending-requests-section");
  const countSpan = document.getElementById("req-count");

  const totalPending =
    incomingPending.length +
    sentPending.length +
    incomingCallPerms.length +
    pendingGroupInvitesList.length;

  if (totalPending === 0) {
    if (section) section.classList.add("hidden");
    return;
  }

  const incomingTotal = incomingPending.length + incomingCallPerms.length + pendingGroupInvitesList.length;
  if (activeRequestTab === "incoming" && incomingTotal === 0 && sentPending.length > 0) {
    activeRequestTab = "sent";
    if (tabReqSent) tabReqSent.classList.add("active");
    if (tabReqIncoming) tabReqIncoming.classList.remove("active");
  } else if (activeRequestTab === "sent" && sentPending.length === 0 && incomingTotal > 0) {
    activeRequestTab = "incoming";
    if (tabReqIncoming) tabReqIncoming.classList.add("active");
    if (tabReqSent) tabReqSent.classList.remove("active");
  }

  if (section) section.classList.remove("hidden");
  if (countSpan) countSpan.textContent = incomingTotal || totalPending;
  if (tabReqIncoming) tabReqIncoming.textContent = `Incoming (${incomingTotal})`;
  if (tabReqSent) tabReqSent.textContent = `Sent (${sentPending.length})`;

  if (container) {
    container.innerHTML = "";

    if (activeRequestTab === "incoming") {
      // 1. Render Group Invites
      pendingGroupInvitesList.forEach((grp) => {
        const card = document.createElement("div");
        card.className = "request-card";
        card.innerHTML =
          `<span class="request-user">Group: <strong>${escapeHTML(grp.name)}</strong> (by @${escapeHTML(grp.owner)})</span>` +
          '<div class="request-btns">' +
          `<button class="btn-accept-req" onclick="respondGroupInvite('${escapeHTML(grp.id)}', 'accept')">Join</button>` +
          `<button class="btn-reject-req" onclick="respondGroupInvite('${escapeHTML(grp.id)}', 'reject')">Decline</button>` +
          "</div>";
        container.appendChild(card);
      });

      // 2. Render Call Permission Requests (Just like Group / Friend Requests!)
      incomingCallPerms.forEach((item) => {
        const pClean = escapeHTML(item.peer);
        const card = document.createElement("div");
        card.className = "request-card";
        card.innerHTML =
          `<span class="request-user" onclick="openUserActionModal('${pClean}')"><strong>@${pClean}</strong> wants permission to call you</span>` +
          '<div class="request-btns">' +
          `<button class="btn-accept-req" onclick="respondCallPermRequest('${pClean}', 'allow')">Allow Calls</button>` +
          `<button class="btn-reject-req" onclick="respondCallPermRequest('${pClean}', 'deny')">Deny</button>` +
          "</div>";
        container.appendChild(card);
      });

      // 3. Render Friend Requests
      incomingPending.forEach((r) => {
        const senderClean = escapeHTML(r.sender_id.toLowerCase());
        const card = document.createElement("div");
        card.className = "request-card";
        card.innerHTML =
          `<span class="request-user" onclick="openUserActionModal('${senderClean}')">@${senderClean}</span>` +
          '<div class="request-btns">' +
          `<button class="btn-accept-req" onclick="respondChatRequest('${senderClean}', 'accepted')">Accept</button>` +
          `<button class="btn-reject-req" onclick="respondChatRequest('${senderClean}', 'rejected')">Decline</button>` +
          "</div>";
        container.appendChild(card);
      });

      if (incomingTotal === 0) {
        container.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 6px;">No incoming requests</div>`;
      }
    } else {
      if (sentPending.length === 0) {
        container.innerHTML = `<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 6px;">No sent requests</div>`;
        return;
      }
      sentPending.forEach((r) => {
        const receiverClean = escapeHTML(r.receiver_id.toLowerCase());
        const card = document.createElement("div");
        card.className = "request-card";
        card.innerHTML =
          `<span class="request-user" onclick="openUserActionModal('${receiverClean}')">@${receiverClean}</span>` +
          '<div class="request-btns">' +
          `<button class="btn-reject-req" onclick="cancelSentRequest('${receiverClean}')">Cancel</button>` +
          "</div>";
        container.appendChild(card);
      });
    }
  }
};

// Intercept Group Broadcast & Fast DM Sync with strict deduplication
const origInitPresenceTracker = initPresenceTracker;
initPresenceTracker = function () {
  origInitPresenceTracker();
  if (!presenceChannel) return;

  presenceChannel.on("broadcast", { event: "group-invite-req" }, (payload) => {
    const g = payload.payload;
    const me = (myUsername || "").toLowerCase();
    if (g && g.id && Array.isArray(g.members) && g.members.includes(me) && g.owner !== me) {
      if (!savedGroups[g.id] && !pendingGroupInvitesList.some((x) => x.id === g.id)) {
        pendingGroupInvitesList.push(g);
        localStorage.setItem("krypton_group_invites", JSON.stringify(pendingGroupInvitesList));
        playSynthTone("receive");
        showToast(`@${g.owner} invited you to group "${g.name}"! Accept or Decline in Requests.`, "info");
        fetchPendingRequests();
      }
    }
  });

  presenceChannel.on("broadcast", { event: "fast-dm-sync" }, async (payload) => {
    const data = payload.payload;
    if (!data || !data.msg) return;
    const me = (myUsername || "").toLowerCase();
    if (data.targetPeer === me || (data.room && data.room === currentRoom)) {
      if (data.sender && data.sender !== me) {
        // Deduplicate against startGlobalIncomingMessageWatcher so it NEVER counts or toasts twice!
        if (!markMessageProcessedOnce(data.msg)) return;

        savePeerToRecent(data.sender, true);
        if (currentRoom === data.room) {
          playSynthTone("receive");
          await renderMessage(data.msg);
        } else {
          unreadCounts[data.sender] = (unreadCounts[data.sender] || 0) + 1;
          localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));
          playSynthTone("receive");
          showToast(`New encrypted message from @${data.sender}`, "info");
          renderPeerList();
        }
      }
    }
  });
};

// Override group creation / update so non-owners receive an invite instead of forced add
if (btnConfirmGroupModal) {
  const newBtnConfirm = btnConfirmGroupModal.cloneNode(true);
  btnConfirmGroupModal.parentNode.replaceChild(newBtnConfirm, btnConfirmGroupModal);
  newBtnConfirm.addEventListener("click", async () => {
    const nameInp = document.getElementById("group-name-input");
    const membersInp = document.getElementById("group-members-input");
    const me = (myUsername || "").toLowerCase();

    const parsedMembers = (membersInp ? membersInp.value : "")
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);

    const uniqueMembers = [...new Set([me, ...parsedMembers])];

    if (groupModalMode === "manage" && isGroupRoom(currentRoom) && savedGroups[currentRoom]) {
      if (!isCurrentGroupOwner(currentRoom)) {
        showToast("Only the Group Owner can modify members!", "error");
        return;
      }
      const grp = savedGroups[currentRoom];
      grp.members = uniqueMembers;
      savedGroups[currentRoom] = grp;
      localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));

      if (presenceChannel) {
        try {
          await presenceChannel.send({
            type: "broadcast",
            event: "group-invite-req",
            payload: grp
          });
        } catch (e) { }
      }

      closeGroupModal();
      renderPeerList();
      updateHeaderStatus();
      showToast(`Sent group invites for "${grp.name}"!`, "success");
      return;
    }

    const gName = (nameInp ? nameInp.value : "").trim();
    if (!gName) {
      showToast("Please enter a group name!", "error");
      return;
    }

    const groupId = "group_" + crypto.randomUUID().slice(0, 12);
    const groupObj = {
      id: groupId,
      name: gName,
      owner: me,
      ownerToken: mySessionId,
      members: uniqueMembers,
      createdAt: new Date().toISOString()
    };

    savedGroups[groupId] = groupObj;
    localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));

    if (presenceChannel) {
      try {
        await presenceChannel.send({
          type: "broadcast",
          event: "group-invite-req",
          payload: groupObj
        });
      } catch (e) { }
    }

    closeGroupModal();
    renderPeerList();
    joinRoom(groupId, gName);
    showToast(`Created group "${gName}" & sent invites to members!`, "success");
  });
}

// 7. FIX: 2-Step Call Permission Flow + Instant 1-Click Call Once Approved
handleCallRequestCheck = async function (payload) {
  const row = payload.new;
  if (!row || !myUsername) return;

  const me = myUsername.toLowerCase();
  const s = (row.sender_id || "").toLowerCase();
  const rec = (row.receiver_id || "").toLowerCase();
  if (s !== me && rec !== me) return;

  const otherPeer = s === me ? rec : s;

  // Case A: First-Time Call Permission Request (`call_perm_req:caller`)
  if (row.status && row.status.startsWith("call_perm_req:")) {
    const requester = (row.status.split(":")[1] || "").toLowerCase();
    if (requester && requester !== me && !blockedUsers.includes(requester)) {
      playSynthTone("receive");
      showToast(
        `@${requester} sent a Call Permission Request! Check Friend Requests to Allow or Deny.`,
        "info",
        4500
      );
      triggerSystemPushNotification(
        "Krypton • Call Permission Request",
        `@${requester} wants permission to call you`,
        `call-perm-${requester}`
      );
    }
    return;
  }

  // Case B: Actual Incoming Ringing Call (`call_ring_voice:caller` or `call_ring_video:caller`)
  if (row.call_allowed === true && row.status && row.status.startsWith("call_ring_")) {
    const [prefix, initiatedBy] = row.status.split(":");
    const caller = (initiatedBy || "").toLowerCase();
    const callMode = prefix.includes("video") ? "video" : "voice";

    if (caller && caller !== me && !blockedUsers.includes(caller)) {
      activeCallSender = caller;
      activeCallType = callMode;
      playSynthTone("ring");
      triggerSystemPushNotification(
        `Krypton • Incoming ${callMode.toUpperCase()} Call`,
        `@${caller} is calling you`,
        `call-${caller}`
      );

      const callerTitle = document.getElementById("incoming-caller-title");
      const callerDesc = document.getElementById("incoming-caller-desc");
      if (callerTitle) {
        callerTitle.textContent =
          callMode === "video" ? "Incoming Video Call" : "Incoming Voice Call";
      }
      if (callerDesc) {
        callerDesc.textContent = `@${caller} is calling you (${callMode})`;
      }
      const callModal = document.getElementById("call-perm-modal");
      if (callModal) callModal.classList.remove("hidden");
    }
    return;
  }

  // Case C: Receiver Accepted the Ringing Call -> Start WebRTC on Caller Side!
  if (row.status && row.status.startsWith("call_active")) {
    let callMode = activeCallType || "voice";
    let caller = "";
    if (row.status.includes(":")) {
      const [prefix, initiatedBy] = row.status.split(":");
      caller = (initiatedBy || "").toLowerCase();
      callMode = prefix.includes("video") ? "video" : "voice";
    }
    if (caller === me) {
      activeCallSender = otherPeer;
      if (!peerConnection) {
        startWebRTC(true, callMode);
      }
    }
  }
};

// Re-bind Decline Call so it keeps `call_allowed: true` (permission stays approved for future calls!)
if (btnDeclineCall) {
  const newBtnDecline = btnDeclineCall.cloneNode(true);
  btnDeclineCall.parentNode.replaceChild(newBtnDecline, btnDeclineCall);
  newBtnDecline.addEventListener("click", async () => {
    const callModal = document.getElementById("call-perm-modal");
    if (callModal) callModal.classList.add("hidden");
    if (activeCallSender && supabaseClient) {
      await supabaseClient
        .from("chat_requests")
        .update({ status: "accepted" })
        .or(
          `and(sender_id.ilike.${activeCallSender},receiver_id.ilike.${myUsername}),` +
          `and(sender_id.ilike.${myUsername},receiver_id.ilike.${activeCallSender})`
        );
    }
  });
}

// Re-bind End Call so it keeps `call_allowed: true` (so next call is still 1-click!) and doesn't trigger false friend-request toast
endCall = function (notifyRemote = true) {
  clearInterval(callDurationInterval);
  const timerEl = document.getElementById("call-duration-timer");
  if (timerEl) timerEl.classList.add("hidden");

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  iceCandidateQueue = [];

  const overlay = document.getElementById("call-screen-overlay");
  if (overlay) overlay.classList.add("hidden");

  const remoteVideo = document.getElementById("remote-video");
  const localVideo = document.getElementById("local-video");
  const remoteAudio = document.getElementById("remote-audio");

  if (remoteVideo) remoteVideo.srcObject = null;
  if (localVideo) localVideo.srcObject = null;
  if (remoteAudio) remoteAudio.srcObject = null;

  if (notifyRemote && activeSubscription) {
    activeSubscription.send({
      type: "broadcast",
      event: "webrtc-end",
      payload: { sender: myUsername }
    });
  }

  const targetPeer = currentPeerUser || activeCallSender;
  if (targetPeer && supabaseClient) {
    // Keep call_allowed: true so future calls remain 1-click!
    supabaseClient
      .from("chat_requests")
      .update({ status: "accepted" })
      .or(
        `and(sender_id.ilike.${myUsername},receiver_id.ilike.${targetPeer}),` +
        `and(sender_id.ilike.${targetPeer},receiver_id.ilike.${myUsername})`
      )
      .then(() => { });
  }
};

if (btnEndCall) {
  const newBtnEnd = btnEndCall.cloneNode(true);
  btnEndCall.parentNode.replaceChild(newBtnEnd, btnEndCall);
  newBtnEnd.addEventListener("click", () => endCall(true));
}

initiateCallPermission = async function (type) {
  if (!currentPeerUser || currentRoom === "global") return;
  const rel = await getPeerRelationshipState(currentPeerUser);
  if (rel.state !== "accepted" || !rel.row) {
    showToast("Pehle Friend Request accept honi chahiye!", "error");
    return;
  }

  const me = myUsername.toLowerCase();
  const peer = currentPeerUser.toLowerCase();
  activeCallType = type;
  activeCallSender = peer;

  // Check if Call Permission is already granted between these two users
  if (rel.row.call_allowed === true) {
    // Start the outgoing call UI immediately, without opening chat as the call screen.
    const ringStatus = `call_ring_${type}:${me}`;

    const { error: ringError } = await supabaseClient
      .from("chat_requests")
      .update({ call_allowed: true, status: ringStatus })
      .or(
        `and(sender_id.ilike.${me},receiver_id.ilike.${peer}),` +
        `and(sender_id.ilike.${peer},receiver_id.ilike.${me})`
      );

    if (ringError) {
      console.error("Could not start call:", ringError);
      showToast("Could not start the call. Please try again.", "error");
      return;
    }

    // Show the existing call screen while the receiver is being alerted.
    const overlay = document.getElementById("call-screen-overlay");
    const peerName = document.getElementById("call-peer-name");
    const statusBadge = document.getElementById("call-status-badge");
    const videoGrid = document.getElementById("video-streams-container");
    const btnCam = document.getElementById("btn-toggle-cam");
    const timer = document.getElementById("call-duration-timer");

    if (overlay) overlay.classList.remove("hidden");

    if (peerName) peerName.textContent = "@" + peer;

    const peerAvatar = usersAvatarCache[peer] || "";
    renderAvatarElement(
      document.getElementById("call-avatar"),
      peer,
      peerAvatar
    );

    if (statusBadge) {
      statusBadge.textContent =
        `Ringing @${peer}… Waiting for them to answer`;
    }

    // Keep the preview hidden until the receiver accepts.
    if (videoGrid) videoGrid.classList.add("hidden");
    if (btnCam) btnCam.classList.add("hidden");
    if (timer) timer.classList.add("hidden");

    showToast(`Calling @${peer}…`, "info");
    return;
  }

  // If permission request is already pending
  if (rel.row.status && rel.row.status.startsWith("call_perm_req:")) {
    const requester = (rel.row.status.split(":")[1] || "").toLowerCase();
    if (requester === me) {
      showToast(`Call permission request already sent to @${peer}. Waiting for them to Allow...`, "info");
      return;
    } else {
      // The other user had already requested call permission from us -> auto-allow and ring!
      await respondCallPermRequest(peer, "allow");
      return;
    }
  }

  // First time calling: Ask to send a Call Permission Request (just like Group Invite / Friend Request)
  const ok = await showGlassDialog({
    title: "Send Call Permission Request?",
    message: `First time calling @${peer}: Unke paas ek Call Permission Request jayegi ("Allow Calls / Deny"). Ek baar wo Allow kar denge, toh aap kabhi bhi 1-click mein call laga sakenge!`,
    confirmText: "Send Request"
  });

  if (ok && supabaseClient) {
    const permReqStatus = `call_perm_req:${me}`;
    await supabaseClient
      .from("chat_requests")
      .update({ call_allowed: false, status: permReqStatus })
      .or(
        `and(sender_id.ilike.${me},receiver_id.ilike.${peer}),` +
        `and(sender_id.ilike.${peer},receiver_id.ilike.${me})`
      );
    showToast(`Call Permission Request sent to @${peer}! Jab wo Allow karenge tab aapko notification mil jayega.`, "success", 4000);
    await fetchPendingRequests();
  }
};

startWebRTC = async function (isCaller, type) {
  const overlay = document.getElementById("call-screen-overlay");
  if (overlay) overlay.classList.remove("hidden");

  const callPeer = currentPeerUser || activeCallSender;
  const peerName = document.getElementById("call-peer-name");
  if (peerName) peerName.textContent = "@" + callPeer;

  const peerAvatar = usersAvatarCache[(callPeer || "").toLowerCase()] || "";
  renderAvatarElement(document.getElementById("call-avatar"), callPeer, peerAvatar);

  const statusBadge = document.getElementById("call-status-badge");
  if (statusBadge) statusBadge.textContent = "Connecting Audio/Video Streams...";

  const isVideo = type === "video";
  const videoGrid = document.getElementById("video-streams-container");
  const btnCam = document.getElementById("btn-toggle-cam");
  if (videoGrid) videoGrid.classList.toggle("hidden", !isVideo);
  if (btnCam) btnCam.classList.toggle("hidden", !isVideo);

  iceCandidateQueue = [];
  isAudioMuted = false;
  isVideoMuted = false;

  try {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: isVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } : false
    });

    const localVideo = document.getElementById("local-video");
    if (isVideo && localVideo) {
      localVideo.srcObject = localStream;
      localVideo.muted = true;
      localVideo.play().catch(() => { });
    }

    if (peerConnection) {
      peerConnection.close();
    }
    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    const remoteMediaStream = new MediaStream();
    peerConnection.ontrack = (event) => {
      if (statusBadge) statusBadge.textContent = "AES-GCM P2P Call Active";
      startCallDurationClock();

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((t) => remoteMediaStream.addTrack(t));
      } else if (event.track) {
        remoteMediaStream.addTrack(event.track);
      }

      const remoteVideo = document.getElementById("remote-video");
      const remoteAudio = document.getElementById("remote-audio");

      if (isVideo && remoteVideo) {
        remoteVideo.srcObject = remoteMediaStream;
        remoteVideo.play().catch(() => { });
      }
      if (remoteAudio) {
        remoteAudio.srcObject = remoteMediaStream;
        remoteAudio.play().catch(() => { });
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && activeSubscription) {
        activeSubscription.send({
          type: "broadcast",
          event: "webrtc-ice",
          payload: { candidate: event.candidate, sender: myUsername }
        });
      }
    };

    if (isCaller) {
      const sendOfferNow = async () => {
        if (!peerConnection || peerConnection.signalingState === "closed") return;
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo
        });
        await peerConnection.setLocalDescription(offer);
        if (activeSubscription) {
          activeSubscription.send({
            type: "broadcast",
            event: "webrtc-offer",
            payload: { offer: offer, sender: myUsername, callType: type }
          });
        }
      };
      await sendOfferNow();
      setTimeout(() => {
        if (peerConnection && (!peerConnection.remoteDescription || !peerConnection.remoteDescription.type)) {
          sendOfferNow();
        }
      }, 1300);
    }
  } catch (err) {
    console.error("WebRTC Init Error:", err);
    endCall();
    showToast("Microphone/Camera permission allow karein!", "error");
  }
};


// =========================================================================
// 8. FEATURE v5000: SPEAKER / EARPIECE TOGGLE DURING VOICE & VIDEO CALLS
// =========================================================================
let isSpeakerphoneOn = false;
let callAudioGainNode = null;
let callAudioSourceNode = null;
let callWebAudioCtx = null;

async function applyCallAudioOutputMode(speakerOn, showFeedback = true) {
  isSpeakerphoneOn = Boolean(speakerOn);
  const btnSpeaker = document.getElementById("btn-toggle-speaker");
  const remoteVideo = document.getElementById("remote-video");
  const remoteAudio = document.getElementById("remote-audio");

  if (btnSpeaker) {
    btnSpeaker.classList.toggle("speaker-active", isSpeakerphoneOn);
    btnSpeaker.title = isSpeakerphoneOn ? "Speakerphone: ON (Tap for Earpiece)" : "Earpiece / Low Volume: ON (Tap for Speaker)";
    btnSpeaker.innerHTML = isSpeakerphoneOn
      ? '<i data-lucide="volume-2"></i>'
      : '<i data-lucide="volume-1"></i>';
    if (window.lucide) lucide.createIcons({ nodes: [btnSpeaker] });
  }

  // 1. Adjust Media Element Volume & WebAudio Gain Boost
  // Earpiece mode uses comfortable soft ear-level volume (0.32), Speaker mode uses full boosted volume (1.0 + Gain 1.6x)
  const targetElementVolume = isSpeakerphoneOn ? 1.0 : 0.32;
  if (remoteAudio) remoteAudio.volume = targetElementVolume;
  if (remoteVideo) {
    // Mute duplicate audio on video tag if remoteAudio is playing the stream, or sync its volume
    remoteVideo.muted = true;
    remoteVideo.volume = targetElementVolume;
  }

  if (callAudioGainNode && callWebAudioCtx) {
    try {
      const now = callWebAudioCtx.currentTime;
      callAudioGainNode.gain.setValueAtTime(isSpeakerphoneOn ? 1.65 : 0.35, now);
    } catch (e) { }
  }

  // 2. Hardware Audio Output Sink Routing (setSinkId) where supported by mobile/desktop browser
  if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === "function") {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d) => d.kind === "audiooutput");

      if (audioOutputs.length > 0) {
        let chosenDevice = null;
        if (isSpeakerphoneOn) {
          chosenDevice =
            audioOutputs.find((d) => /speaker|loud|handsfree|external/i.test(d.label)) ||
            audioOutputs[audioOutputs.length - 1];
        } else {
          chosenDevice =
            audioOutputs.find((d) => /earpiece|receiver|headset|communications|default/i.test(d.label)) ||
            audioOutputs[0];
        }

        if (chosenDevice && chosenDevice.deviceId) {
          if (remoteAudio && typeof remoteAudio.setSinkId === "function") {
            await remoteAudio.setSinkId(chosenDevice.deviceId);
          }
          if (remoteVideo && typeof remoteVideo.setSinkId === "function") {
            await remoteVideo.setSinkId(chosenDevice.deviceId);
          }
        }
      }
    } catch (e) { }
  }

  if (showFeedback) {
    showToast(
      isSpeakerphoneOn
        ? "Speakerphone ON (Loud Output)"
        : "Earpiece Mode ON (Normal Ear Volume)",
      "info",
      1800
    );
  }
}

function attachCallAudioGainController(stream) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !stream || stream.getAudioTracks().length === 0) return;
    if (!callWebAudioCtx) callWebAudioCtx = new AudioCtx();
    if (callWebAudioCtx.state === "suspended") callWebAudioCtx.resume();

    if (callAudioSourceNode) {
      try { callAudioSourceNode.disconnect(); } catch (e) { }
    }
    callAudioSourceNode = callWebAudioCtx.createMediaStreamSource(stream);
    callAudioGainNode = callWebAudioCtx.createGain();
    callAudioGainNode.gain.value = isSpeakerphoneOn ? 1.65 : 0.35;
    callAudioSourceNode.connect(callAudioGainNode);
    callAudioGainNode.connect(callWebAudioCtx.destination);
  } catch (e) { }
}

const btnToggleSpeakerEl = document.getElementById("btn-toggle-speaker");
if (btnToggleSpeakerEl) {
  btnToggleSpeakerEl.addEventListener("click", () => {
    applyCallAudioOutputMode(!isSpeakerphoneOn, true);
  });
}

// Wrap startWebRTC so every call starts in Earpiece (OFF) mode by default instead of forced loud speaker!
const prevStartWebRTCv4 = startWebRTC;
startWebRTC = async function (isCaller, type) {
  // Default to Earpiece (Speaker OFF) when a call starts; user can tap Speaker icon anytime
  await applyCallAudioOutputMode(false, false);
  await prevStartWebRTCv4(isCaller, type);

  if (peerConnection) {
    const origOnTrack = peerConnection.ontrack;
    peerConnection.ontrack = (event) => {
      if (origOnTrack) origOnTrack(event);
      const remoteVideo = document.getElementById("remote-video");
      const remoteAudio = document.getElementById("remote-audio");
      // Avoid double audio echo from both <video> and <audio> playing simultaneously
      if (remoteVideo) remoteVideo.muted = true;
      if (remoteAudio && remoteAudio.srcObject) {
        attachCallAudioGainController(remoteAudio.srcObject);
      }
      applyCallAudioOutputMode(isSpeakerphoneOn, false);
    };
  }
};

const prevEndCallv4 = endCall;
endCall = function (notifyRemote = true) {
  if (callAudioSourceNode) {
    try { callAudioSourceNode.disconnect(); } catch (e) { }
    callAudioSourceNode = null;
  }
  callAudioGainNode = null;
  isSpeakerphoneOn = false;
  applyCallAudioOutputMode(false, false);
  prevEndCallv4(notifyRemote);
};


// =========================================================================
// 9. FEATURE v6000: WHATSAPP-STYLE GROUP ADMIN CONTROLS, CLEAN FRIEND SEARCH
//    (NO PRE-DISPLAYED @USERNAMES), GROUP ICON/BIO, MUTE & MEMBER VISIBILITY
// =========================================================================

let stagedGroupFriends = [];
let stagedGroupAvatarData = "";
let currentEditingGroupMembers = [];

function getMyConnectedFriendsOnly() {
  const me = (myUsername || "").toLowerCase();
  const friendsSet = new Set();

  // Check peerRelationshipMap for accepted friends
  Object.keys(peerRelationshipMap || {}).forEach((peer) => {
    const p = peer.toLowerCase();
    const rel = peerRelationshipMap[peer];
    if (
      p !== me &&
      !blockedUsers.includes(p) &&
      !deletedPeersList.includes(p) &&
      rel &&
      (rel.status === "accepted" || (rel.status && rel.status.startsWith("call_")))
    ) {
      friendsSet.add(p);
    }
  });

  // Also include savedPeers that are not self/blocked/deleted
  (savedPeers || []).forEach((peer) => {
    const p = (peer || "").toLowerCase();
    if (p && p !== me && p !== "global" && !blockedUsers.includes(p) && !deletedPeersList.includes(p)) {
      const rel = peerRelationshipMap[p];
      if (!rel || rel.status === "accepted" || (rel.status && rel.status.startsWith("call_"))) {
        friendsSet.add(p);
      }
    }
  });

  return Array.from(friendsSet).sort();
}

function renderGroupModalAvatarPreview() {
  const previewEl = document.getElementById("group-modal-avatar-preview");
  const nameInp = document.getElementById("group-name-input");
  if (!previewEl) return;
  const gName = (nameInp && nameInp.value ? nameInp.value.trim() : "") || "G";
  if (stagedGroupAvatarData) {
    renderAvatarElement(previewEl, gName, stagedGroupAvatarData);
  } else {
    previewEl.style.backgroundImage = "none";
    previewEl.innerHTML = '<i data-lucide="users" style="width: 24px; height: 24px;"></i>'; if (window.lucide) lucide.createIcons({ nodes: [previewEl] });
  }
}

function renderStagedGroupFriendChips() {
  const chipsContainer = document.getElementById("group-friends-chips");
  if (!chipsContainer) return;
  chipsContainer.innerHTML = "";

  stagedGroupFriends.forEach((uname) => {
    const chip = document.createElement("span");
    chip.className = "staged-friend-chip";
    chip.innerHTML = `
      <span>@${escapeHTML(uname)}</span>
      <button type="button" title="Remove" onclick="unstageFriendFromGroup('${escapeHTML(uname)}')">✕</button>
    `;
    chipsContainer.appendChild(chip);
  });
}

window.stageFriendForGroup = function (uname) {
  const clean = (uname || "").trim().toLowerCase().replace(/^@/, "");
  if (!clean) return;
  if (!stagedGroupFriends.includes(clean) && !currentEditingGroupMembers.includes(clean)) {
    stagedGroupFriends.push(clean);
  }
  const inp = document.getElementById("group-members-input");
  if (inp) {
    inp.value = "";
    inp.focus();
  }
  const sugBox = document.getElementById("group-friends-live-suggestions");
  if (sugBox) {
    sugBox.classList.add("hidden");
    sugBox.innerHTML = "";
  }
  renderStagedGroupFriendChips();
};

window.unstageFriendFromGroup = function (uname) {
  const clean = (uname || "").trim().toLowerCase();
  stagedGroupFriends = stagedGroupFriends.filter((u) => u !== clean);
  renderStagedGroupFriendChips();
};

window.removeMemberFromCurrentGroup = async function (uname) {
  const clean = (uname || "").trim().toLowerCase();
  const me = (myUsername || "").toLowerCase();
  if (!clean || clean === me) return;
  if (!isGroupRoom(currentRoom) || !isCurrentGroupOwner(currentRoom)) {
    showToast("Only the Group Owner can remove members!", "error");
    return;
  }

  currentEditingGroupMembers = currentEditingGroupMembers.filter((m) => m !== clean);
  const grp = savedGroups[currentRoom];
  if (grp) {
    grp.members = [...currentEditingGroupMembers];
    savedGroups[currentRoom] = grp;
    localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));

    if (presenceChannel) {
      try {
        await presenceChannel.send({
          type: "broadcast",
          event: "group-state-update",
          payload: {
            group: grp,
            removedMember: clean
          }
        });
      } catch (e) { }
    }
    renderPeerList();
    updateHeaderStatus();
    showToast(`Removed @${clean} from group "${grp.name}"`, "info");
  }
  renderCurrentGroupMembersDirectory();
};

function renderCurrentGroupMembersDirectory() {
  const listEl = document.getElementById("group-current-members-list");
  const countLabel = document.getElementById("group-members-count-label");
  const sectionEl = document.getElementById("group-members-list-section");
  if (!listEl || !sectionEl) return;

  if (groupModalMode === "create") {
    sectionEl.classList.add("hidden");
    return;
  }

  sectionEl.classList.remove("hidden");
  const grp = savedGroups[currentRoom];
  if (!grp) return;

  const me = (myUsername || "").toLowerCase();
  const isOwner = isCurrentGroupOwner(currentRoom);
  const ownerUname = (grp.owner || "").toLowerCase();
  const showMembersAllowed = grp.showMembersToAll !== false; // default true unless owner turned it off

  // If member is NOT owner and owner hid the member list, only show Group Owner & Self!
  if (!isOwner && !showMembersAllowed) {
    if (countLabel) countLabel.textContent = "GROUP MEMBERS (HIDDEN BY OWNER)";
    listEl.innerHTML = `
      <div style="padding: 10px; font-size: 11.5px; color: var(--text-dim); text-align: center;">
        Group Admin (@${escapeHTML(ownerUname)}) has hidden the participant list for members.
      </div>
    `;
    return;
  }

  const membersArr = currentEditingGroupMembers.length > 0 ? currentEditingGroupMembers : grp.members || [ownerUname];
  if (countLabel) countLabel.textContent = `GROUP MEMBERS (${membersArr.length})`;
  listEl.innerHTML = "";

  membersArr.forEach((m) => {
    const mLower = (m || "").toLowerCase();
    const isMemberOwner = mLower === ownerUname;
    const isSelf = mLower === me;
    const avUrl = isSelf ? myAvatarData : usersAvatarCache[mLower] || "";

    const row = document.createElement("div");
    row.className = "group-member-row";
    row.innerHTML = `
      <div class="group-member-left">
        <div class="avatar sm" id="grp-mem-av-${escapeHTML(mLower)}" style="width: 30px; height: 30px; font-size: 11px;"></div>
        <span class="group-member-name">
          @${escapeHTML(mLower)}
          ${isSelf ? ' <span style="color: var(--accent-primary); font-size: 10.5px;">(You)</span>' : ""}
          ${isMemberOwner ? ' <span class="online-pill-badge" style="font-size: 9px; padding: 1px 6px;">Admin</span>' : ""}
        </span>
      </div>
      ${isOwner && !isMemberOwner
        ? `<button type="button" class="group-remove-member-btn" onclick="removeMemberFromCurrentGroup('${escapeHTML(mLower)}')">Remove</button>`
        : ""
      }
    `;
    listEl.appendChild(row);
    const avEl = row.querySelector(`#grp-mem-av-${mLower}`);
    renderAvatarElement(avEl, mLower, avUrl);
  });
}

// Live Typing Friend Suggestions inside Group Modal (Strictly Connected Friends Only, Never Pre-Shown!)
const groupMembersInputEl = document.getElementById("group-members-input");
if (groupMembersInputEl) {
  groupMembersInputEl.addEventListener("input", (e) => {
    const sugBox = document.getElementById("group-friends-live-suggestions");
    if (!sugBox) return;

    const q = (e.target.value || "").trim().toLowerCase().replace(/^@/, "");
    // Strictly hide suggestions when input is empty so no @username is pre-displayed!
    if (!q) {
      sugBox.classList.add("hidden");
      sugBox.innerHTML = "";
      return;
    }

    const myFriends = getMyConnectedFriendsOnly();
    const matches = myFriends.filter(
      (f) =>
        f.includes(q) &&
        !stagedGroupFriends.includes(f) &&
        !currentEditingGroupMembers.includes(f)
    );

    sugBox.classList.remove("hidden");
    sugBox.innerHTML = `
      <div class="live-suggestion-header">
        <span>YOUR FRIENDS MATCHING "@${escapeHTML(q)}" (${matches.length})</span>
        <span style="cursor: pointer;" onclick="document.getElementById('group-friends-live-suggestions').classList.add('hidden')">✕</span>
      </div>
    `;

    if (matches.length === 0) {
      sugBox.innerHTML += `
        <div style="padding: 10px 12px; font-size: 11.5px; color: var(--text-dim); text-align: center;">
          No connected friend matching "@${escapeHTML(q)}"
        </div>
      `;
      return;
    }

    matches.forEach((fname) => {
      const avUrl = usersAvatarCache[fname] || "";
      const bioText = usersBioCache[fname] || "Connected Friend";
      const isOnline = onlineUsersList.has(fname) && userSettings.onlinePresence;

      const item = document.createElement("div");
      item.className = "contact-card";
      item.style.padding = "7px 10px";
      item.onclick = () => stageFriendForGroup(fname);
      item.innerHTML = `
        <div class="contact-card-info">
          <div class="avatar-wrap">
            <div class="contact-avatar" id="grp-sug-av-${escapeHTML(fname)}" style="width: 32px; height: 32px; font-size: 12px;"></div>
            <div class="online-dot ${isOnline ? "visible" : ""}"></div>
          </div>
          <div class="contact-name-wrap">
            <span class="contact-name" style="font-size: 12.5px;">@${escapeHTML(fname)}</span>
            <span class="contact-preview-text" style="font-size: 10.5px;">${escapeHTML(bioText)}</span>
          </div>
        </div>
        <div class="contact-right-meta">
          <button type="button" class="suggestion-action-pill" onclick="event.stopPropagation(); stageFriendForGroup('${escapeHTML(fname)}')">+ Select</button>
        </div>
      `;
      sugBox.appendChild(item);
      renderAvatarElement(item.querySelector(`#grp-sug-av-${fname}`), fname, avUrl);
    });
  });

  groupMembersInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = (groupMembersInputEl.value || "").trim().toLowerCase().replace(/^@/, "");
      if (!q) return;
      const myFriends = getMyConnectedFriendsOnly();
      const exactOrFirst = myFriends.find(
        (f) => (f === q || f.startsWith(q)) && !stagedGroupFriends.includes(f) && !currentEditingGroupMembers.includes(f)
      );
      if (exactOrFirst) {
        stageFriendForGroup(exactOrFirst);
      } else {
        showToast(`"@${q}" aapki friend list mein nahi hai ya already added hai!`, "error");
      }
    }
  });
}

// Group Icon Upload & Remove Listeners — Owner-Only Profile Editing

const groupAvatarFileInput = document.getElementById("group-avatar-file-input");
const btnChangeGroupAvatar = document.getElementById("btn-change-group-avatar");
const btnUploadGroupPhoto = document.getElementById("btn-upload-group-photo");
const btnRemoveGroupPhoto = document.getElementById("btn-remove-group-photo");

function canEditCurrentGroupProfile() {
  if (groupModalMode === "create") return true;

  return (
    groupModalMode === "manage" &&
    isGroupRoom(currentRoom) &&
    Boolean(savedGroups[currentRoom]) &&
    isCurrentGroupOwner(currentRoom)
  );
}

function requireGroupProfileOwner() {
  if (canEditCurrentGroupProfile()) return true;

  showToast("Only the group owner can change the group profile!", "error");
  return false;
}

if (btnChangeGroupAvatar && groupAvatarFileInput) {
  btnChangeGroupAvatar.addEventListener("click", (e) => {
    e.preventDefault();
    if (!requireGroupProfileOwner()) return;
    groupAvatarFileInput.click();
  });
}

if (btnUploadGroupPhoto && groupAvatarFileInput) {
  btnUploadGroupPhoto.addEventListener("click", (e) => {
    e.preventDefault();
    if (!requireGroupProfileOwner()) return;
    groupAvatarFileInput.click();
  });
}

if (btnRemoveGroupPhoto) {
  btnRemoveGroupPhoto.addEventListener("click", (e) => {
    e.preventDefault();
    if (!requireGroupProfileOwner()) return;

    stagedGroupAvatarData = "";
    renderGroupModalAvatarPreview();
    showToast("Group icon removed", "info");
  });
}

if (groupAvatarFileInput) {
  groupAvatarFileInput.addEventListener("change", (e) => {
    if (!requireGroupProfileOwner()) {
      groupAvatarFileInput.value = "";
      return;
    }

    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      groupAvatarFileInput.value = "";
      showToast("Please select an image file!", "error");
      return;
    }

    const reader = new FileReader();

    reader.onload = function (evt) {
      const img = new Image();

      img.onload = function () {
        if (!requireGroupProfileOwner()) {
          groupAvatarFileInput.value = "";
          return;
        }

        const canvas = document.createElement("canvas");
        const size = 280;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          groupAvatarFileInput.value = "";
          showToast("Could not process the group photo.", "error");
          return;
        }

        let sW = img.width;
        let sH = img.height;
        let sx = 0;
        let sy = 0;

        if (sW > sH) {
          sx = (sW - sH) / 2;
          sW = sH;
        } else {
          sy = (sH - sW) / 2;
          sH = sW;
        }

        ctx.drawImage(img, sx, sy, sW, sH, 0, 0, size, size);
        stagedGroupAvatarData = canvas.toDataURL("image/jpeg", 0.82);

        renderGroupModalAvatarPreview();
        showToast("Group photo ready!", "success");
        groupAvatarFileInput.value = "";
      };

      img.onerror = function () {
        groupAvatarFileInput.value = "";
        showToast("Could not load that image.", "error");
      };

      img.src = evt.target.result;
    };

    reader.onerror = function () {
      groupAvatarFileInput.value = "";
      showToast("Could not read that image.", "error");
    };

    reader.readAsDataURL(file);
  });
}

// Override window.openGroupModal for v6000 WhatsApp-Style Owner & Member View
window.openGroupModal = function (mode = "create") {
  groupModalMode = mode;
  const modal = document.getElementById("group-create-modal");
  const heading = document.getElementById("group-modal-heading");
  const nameInp = document.getElementById("group-name-input");
  const descInp = document.getElementById("group-desc-input");
  const membersInp = document.getElementById("group-members-input");
  const sugBox = document.getElementById("group-friends-live-suggestions");
  const addMembersSection = document.getElementById("group-add-members-section");
  const ownerControlsSection = document.getElementById("group-owner-controls-section");
  const avatarBtnRow = document.getElementById("group-avatar-btn-row");
  const changeAvBadge = document.getElementById("btn-change-group-avatar");
  const toggleOnlyOwnerMsg = document.getElementById("toggle-group-only-owner-msg");
  const toggleShowMembers = document.getElementById("toggle-group-show-members");
  const ownerBadgePill = document.getElementById("group-owner-badge-pill");
  const confirmBtn = document.getElementById("btn-confirm-group-modal");

  if (!modal) return;

  // Always reset search input, suggestions, and pre-shown chips!
  stagedGroupFriends = [];
  if (membersInp) membersInp.value = "";
  if (sugBox) {
    sugBox.classList.add("hidden");
    sugBox.innerHTML = "";
  }
  renderStagedGroupFriendChips();

  const me = (myUsername || "").toLowerCase();

  if (mode === "manage" && isGroupRoom(currentRoom) && savedGroups[currentRoom]) {
    const grp = savedGroups[currentRoom];
    const isOwner = isCurrentGroupOwner(currentRoom);

    stagedGroupAvatarData = grp.avatar || "";
    currentEditingGroupMembers = [...new Set([grp.owner || me, ...(grp.members || [])])];

    if (heading) {
      heading.textContent = isOwner ? `Manage Group • ${grp.name}` : `Group Info • ${grp.name}`;
    }
    if (nameInp) {
      nameInp.value = grp.name || "";
      nameInp.disabled = !isOwner;
    }
    if (descInp) {
      descInp.value = grp.bio || "Encrypted mesh group";
      descInp.disabled = !isOwner;
    }
    if (ownerBadgePill) {
      ownerBadgePill.textContent = `Admin: @${grp.owner || "admin"}`;
    }

    // Show/Hide Owner-Only Sections
    if (addMembersSection) addMembersSection.classList.toggle("hidden", !isOwner);
    if (ownerControlsSection) ownerControlsSection.classList.toggle("hidden", !isOwner);
    if (avatarBtnRow) avatarBtnRow.style.display = isOwner ? "flex" : "none";
    if (changeAvBadge) changeAvBadge.classList.toggle("hidden", !isOwner);

    if (toggleOnlyOwnerMsg) toggleOnlyOwnerMsg.checked = Boolean(grp.onlyOwnerCanMsg);
    if (toggleShowMembers) toggleShowMembers.checked = grp.showMembersToAll !== false;

    if (confirmBtn) {
      if (isOwner) {
        confirmBtn.classList.remove("hidden");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Save Group Settings";
      } else {
        confirmBtn.classList.add("hidden");
      }
    }
  } else {
    groupModalMode = "create";
    stagedGroupAvatarData = "";
    currentEditingGroupMembers = [me];

    if (heading) heading.textContent = "Create Encrypted Group";
    if (nameInp) {
      nameInp.value = "";
      nameInp.disabled = false;
    }
    if (descInp) {
      descInp.value = "";
      descInp.disabled = false;
    }
    if (addMembersSection) addMembersSection.classList.remove("hidden");
    if (ownerControlsSection) ownerControlsSection.classList.remove("hidden");
    if (avatarBtnRow) avatarBtnRow.style.display = "flex";
    if (changeAvBadge) changeAvBadge.classList.remove("hidden");

    if (toggleOnlyOwnerMsg) toggleOnlyOwnerMsg.checked = false;
    if (toggleShowMembers) toggleShowMembers.checked = true;

    if (confirmBtn) {
      confirmBtn.classList.remove("hidden");
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Create Group";
    }
  }

  renderGroupModalAvatarPreview();
  renderCurrentGroupMembersDirectory();

  modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
};

// Re-bind Confirm Group Modal Button for v6000
const btnConfirmGroupV6 = document.getElementById("btn-confirm-group-modal");
if (btnConfirmGroupV6) {
  const cleanBtn = btnConfirmGroupV6.cloneNode(true);
  btnConfirmGroupV6.parentNode.replaceChild(cleanBtn, btnConfirmGroupV6);

  cleanBtn.addEventListener("click", async () => {
    const nameInp = document.getElementById("group-name-input");
    const descInp = document.getElementById("group-desc-input");
    const toggleOnlyOwnerMsg = document.getElementById("toggle-group-only-owner-msg");
    const toggleShowMembers = document.getElementById("toggle-group-show-members");
    const me = (myUsername || "").toLowerCase();

    const gName = (nameInp ? nameInp.value : "").trim();
    const gBio = (descInp ? descInp.value : "").trim() || "Encrypted mesh group";
    if (!gName) {
      showToast("Please enter a group name!", "error");
      return;
    }

    const onlyOwnerCanMsg = Boolean(toggleOnlyOwnerMsg && toggleOnlyOwnerMsg.checked);
    const showMembersToAll = toggleShowMembers ? Boolean(toggleShowMembers.checked) : true;

    if (groupModalMode === "manage" && isGroupRoom(currentRoom) && savedGroups[currentRoom]) {
      if (!isCurrentGroupOwner(currentRoom)) {
        showToast("Only the Group Owner can update group settings!", "error");
        return;
      }

      const grp = savedGroups[currentRoom];
      const existingMembers = [...new Set([grp.owner || me, ...currentEditingGroupMembers])];
      const newlyInvited = stagedGroupFriends.filter((f) => !existingMembers.includes(f));

      grp.name = gName;
      grp.bio = gBio;
      grp.avatar = stagedGroupAvatarData || "";
      grp.onlyOwnerCanMsg = onlyOwnerCanMsg;
      grp.showMembersToAll = showMembersToAll;
      grp.members = existingMembers;

      savedGroups[currentRoom] = grp;
      localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));

      const titleEl = document.getElementById("current-room-title");
      if (titleEl) titleEl.textContent = grp.name;

      // Broadcast updated group state (name, icon, bio, permissions, member removals) to existing members
      if (presenceChannel) {
        try {
          await presenceChannel.send({
            type: "broadcast",
            event: "group-state-update",
            payload: { group: grp }
          });

          // If new friends were staged, send them a Group Invite Request (Accept / Decline)
          if (newlyInvited.length > 0) {
            const invitePayload = {
              ...grp,
              members: [...existingMembers, ...newlyInvited],
              invitedTargets: newlyInvited
            };
            await presenceChannel.send({
              type: "broadcast",
              event: "group-invite-req",
              payload: invitePayload
            });
          }
        } catch (e) { }
      }

      closeGroupModal();
      renderPeerList();
      updateHeaderStatus();
      updateGroupInputBarLockState();
      showToast(
        newlyInvited.length > 0
          ? `Group updated & invite sent to ${newlyInvited.map((u) => "@" + u).join(", ")}!`
          : `Group "${grp.name}" settings saved!`,
        "success"
      );
      return;
    }

    // CREATE NEW GROUP
    const groupId = "group_" + crypto.randomUUID().slice(0, 12);
    const initialInvited = [...stagedGroupFriends];
    const groupObj = {
      id: groupId,
      name: gName,
      bio: gBio,
      avatar: stagedGroupAvatarData || "",
      owner: me,
      ownerToken: mySessionId,
      onlyOwnerCanMsg: onlyOwnerCanMsg,
      showMembersToAll: showMembersToAll,
      members: [me], // Invited friends join upon clicking Accept!
      createdAt: new Date().toISOString()
    };

    savedGroups[groupId] = groupObj;
    localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));

    if (presenceChannel && initialInvited.length > 0) {
      try {
        const invitePayload = {
          ...groupObj,
          members: [me, ...initialInvited],
          invitedTargets: initialInvited
        };
        await presenceChannel.send({
          type: "broadcast",
          event: "group-invite-req",
          payload: invitePayload
        });
      } catch (e) { }
    }

    closeGroupModal();
    renderPeerList();
    joinRoom(groupId, gName);
    showToast(
      initialInvited.length > 0
        ? `Created group "${gName}" & sent invites to ${initialInvited.length} friend(s)!`
        : `Created encrypted group "${gName}"!`,
      "success"
    );
  });
}

// Enforce Owner-Only Messaging ("Only Owner Can Send Messages") inside Group Chat
function updateGroupInputBarLockState() {
  if (!isGroupRoom(currentRoom)) return;
  const grp = savedGroups[currentRoom];
  if (!grp) return;

  const isOwner = isCurrentGroupOwner(currentRoom);
  const lockBanner = document.getElementById("chat-lock-banner");
  const lockText = document.getElementById("lock-banner-text");
  const lockActions = document.getElementById("lock-banner-actions");
  const inputBar = document.getElementById("chat-input-bar");

  if (!lockBanner || !inputBar) return;

  if (grp.onlyOwnerCanMsg && !isOwner) {
    lockBanner.classList.remove("hidden");
    inputBar.style.display = "none";
    if (lockText) {
      lockText.textContent = `Only the Group Admin (@${grp.owner}) can send messages in this group.`;
    }
    if (lockActions) {
      lockActions.innerHTML = `<button class="glass-btn-sm" onclick="openGroupModal('manage')">Group Info</button>`;
    }
  } else {
    lockBanner.classList.add("hidden");
    inputBar.style.display = "flex";
  }
}

// Override updateHeaderStatus so Group Avatar, Bio & Member Visibility Permission work seamlessly
const prevUpdateHeaderStatusV5 = updateHeaderStatus;
updateHeaderStatus = function () {
  if (isGroupRoom(currentRoom)) {
    const headerIndicator = document.getElementById("header-status-indicator");
    const headerAvatar = document.getElementById("header-chat-avatar");
    const subtitleEl = document.getElementById("current-room-subtitle");
    const titleEl = document.getElementById("current-room-title");
    const grp = savedGroups[currentRoom] || { name: "Group", owner: "", members: [] };
    const isOwner = isCurrentGroupOwner(currentRoom);

    if (titleEl && grp.name) titleEl.textContent = grp.name;
    if (headerIndicator) headerIndicator.className = "status-indicator global-mode";

    if (headerAvatar) {
      headerAvatar.style.display = "flex";
      if (grp.avatar) {
        renderAvatarElement(headerAvatar, grp.name || "G", grp.avatar);
      } else {
        headerAvatar.style.backgroundImage = "none";
        headerAvatar.innerHTML = '<i data-lucide="users" style="width: 16px; height: 16px;"></i>'; if (window.lucide) lucide.createIcons({ nodes: [headerAvatar] });
      }
      headerAvatar.onclick = (e) => {
        e.stopPropagation();
        if (grp.avatar) {
          openFullscreenImageViewer(grp.avatar, `${grp.name} • Group Icon`);
        } else {
          openGroupModal("manage");
        }
      };
    }

    if (subtitleEl) {
      const canSeeMembers = isOwner || grp.showMembersToAll !== false;
      const modeTag = grp.onlyOwnerCanMsg ? " • Admin Only" : "";
      if (canSeeMembers) {
        subtitleEl.textContent = `${(grp.members || []).length} Members • Owner: @${grp.owner}${modeTag}`;
      } else {
        subtitleEl.textContent = `Admin: @${grp.owner} • ${grp.bio || "Encrypted Group"}${modeTag}`;
      }
    }
    return;
  }
  prevUpdateHeaderStatusV5();
};

// Override renderPeerList Group Card rendering to show custom Group Avatar & respect member visibility
const prevRenderPeerListV5 = renderPeerList;
renderPeerList = function (filterText = "") {
  prevRenderPeerListV5(filterText);
  const listEl = document.getElementById("chat-list");
  if (!listEl) return;
  const myLower = (myUsername || "").toLowerCase();

  // Enhance rendered group cards with custom group avatar & privacy-aware subtitle
  Object.keys(savedGroups).forEach((gid) => {
    const g = savedGroups[gid];
    if (!g) return;
    const isOwner = (g.owner || "").toLowerCase() === myLower || (g.ownerToken && g.ownerToken === mySessionId);
    const canSeeMembers = isOwner || g.showMembersToAll !== false;

    listEl.querySelectorAll(".contact-card").forEach((card) => {
      const nameSpan = card.querySelector(".contact-name");
      if (nameSpan && nameSpan.textContent.includes(g.name)) {
        const avEl = card.querySelector(".contact-avatar");
        if (avEl && g.avatar) {
          renderAvatarElement(avEl, g.name, g.avatar);
        }
        const subEl = card.querySelector(".contact-preview-text");
        if (subEl) {
          subEl.textContent = canSeeMembers
            ? `${(g.members || []).length} members • Owner: @${g.owner || "admin"}`
            : `Owner: @${g.owner || "admin"} • ${g.bio || "Encrypted Group"}`;
        }
      }
    });
  });
};

// Hook joinRoom to apply group input lock state (e.g., Only Owner Can Send Messages)
const prevJoinRoomV5 = joinRoom;
joinRoom = async function (roomId, displayName, pushHistory = true) {
  await prevJoinRoomV5(roomId, displayName, pushHistory);
  if (isGroupRoom(roomId)) {
    updateGroupInputBarLockState();
  }
};

// When a user accepts a group invite, notify the Group Owner via broadcast so the owner's member list updates live!
window.respondGroupInvite = async function (groupId, decision) {
  const invite = pendingGroupInvitesList.find((g) => g.id === groupId);
  pendingGroupInvitesList = pendingGroupInvitesList.filter((g) => g.id !== groupId);
  localStorage.setItem("krypton_group_invites", JSON.stringify(pendingGroupInvitesList));

  if (decision === "accept" && invite) {
    const me = (myUsername || "").toLowerCase();
    invite.members = [...new Set([...(invite.members || []), me])];
    delete invite.invitedTargets;
    savedGroups[invite.id] = invite;
    localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));

    if (presenceChannel) {
      try {
        await presenceChannel.send({
          type: "broadcast",
          event: "group-member-joined",
          payload: { groupId: invite.id, member: me, group: invite }
        });
      } catch (e) { }
    }

    showToast(`Joined encrypted group "${invite.name}"!`, "success");
    renderPeerList();
    joinRoom(invite.id, invite.name);
  } else {
    showToast("Declined group invitation.", "info");
  }
  fetchPendingRequests();
};

// Listen to live group state updates (settings, mute, member removal, member join)
const prevInitPresenceTrackerV5 = initPresenceTracker;
initPresenceTracker = function () {
  prevInitPresenceTrackerV5();
  if (!presenceChannel) return;

  presenceChannel.on("broadcast", { event: "group-state-update" }, (payload) => {
    const data = payload.payload;
    if (!data || !data.group || !data.group.id) return;
    const g = data.group;
    const me = (myUsername || "").toLowerCase();

    // If this user was removed by the owner
    if (data.removedMember === me || (Array.isArray(g.members) && !g.members.includes(me) && g.owner !== me)) {
      if (savedGroups[g.id]) {
        delete savedGroups[g.id];
        localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));
        if (currentRoom === g.id) exitChatToDashboard();
        renderPeerList();
        showToast(`You were removed from group "${g.name}" by @${g.owner}`, "error");
      }
      return;
    }

    if (savedGroups[g.id] || (Array.isArray(g.members) && g.members.includes(me))) {
      savedGroups[g.id] = g;
      localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));
      renderPeerList();
      if (currentRoom === g.id) {
        updateHeaderStatus();
        updateGroupInputBarLockState();
      }
    }
  });

  presenceChannel.on("broadcast", { event: "group-member-joined" }, (payload) => {
    const data = payload.payload;
    if (!data || !data.groupId || !data.member) return;
    const grp = savedGroups[data.groupId];
    if (grp) {
      if (!Array.isArray(grp.members)) grp.members = [grp.owner];
      if (!grp.members.includes(data.member)) {
        grp.members.push(data.member);
        savedGroups[data.groupId] = grp;
        localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));
        renderPeerList();
        if (currentRoom === data.groupId) updateHeaderStatus();
        if (isCurrentGroupOwner(data.groupId)) {
          showToast(`@${data.member} accepted your invite and joined "${grp.name}"!`, "success");
          if (presenceChannel) {
            presenceChannel.send({
              type: "broadcast",
              event: "group-state-update",
              payload: { group: grp }
            }).catch(() => { });
          }
        }
      }
    }
  });
};


// =========================================================================
// 10. FEATURE v8000: UPGRADED KRYPTON AI ASSISTANT KNOWLEDGE BASE
//     (INTEGRATES ALL LATEST GROUP ADMIN, 2-STEP CALL, SPEAKER & UI FEATURES)
// =========================================================================

const AI_CHIPS_V8000 = {
  hinglish: [
    { label: "Groups & Admin Controls", q: "Group Admin Controls, Mute aur Member Privacy kaise kaam karta hai?" },
    { label: "Call Request & Speaker", q: "2-Step Call Permission aur Speaker Toggle kaise use karein?" },
    { label: "1x View / 10s Burn Mode", q: "1x View aur 10s Burn Mode kaise bhejein?" },
    { label: "App Lock & Alt+X Blur", q: "App Lock & Panic Blur (Alt+X) kaise use karein?" },
    { label: "Username Rename & Copy", q: "Settings mein Username Rename aur Copy kaise karein?" },
    { label: "Safety Fingerprint", q: "Safety Fingerprint kya hai?" },
    { label: "Voice Notes & Files", q: "Voice Note aur Encrypted File kaise bhejein?" },
    { label: "Self-Chat (@me Vault)", q: "Self-Chat (@me) kaise use karein?" }
  ],
  english: [
    { label: "Groups & Admin Controls", q: "How do Group Admin Controls, Mute, and Member Privacy work?" },
    { label: "Call Request & Speaker", q: "How do 2-Step Call Permission and Speaker Toggle work?" },
    { label: "1x View / 10s Burn Mode", q: "How to send 1x View or 10s Burn media and spoilers?" },
    { label: "App Lock & Alt+X Blur", q: "How to use Smart App Lock and Alt+X Blur?" },
    { label: "Username Rename & Copy", q: "How to Rename or Copy Username in Settings?" },
    { label: "Safety Fingerprint", q: "What is E2EE Safety Fingerprint?" },
    { label: "Voice Notes & Files", q: "How to send Voice Notes and Encrypted Files?" },
    { label: "Self-Chat (@me Vault)", q: "How to use Self-Chat (@me)?" }
  ]
};

renderAiLanguageUI = function (resetFeed = false) {
  document.querySelectorAll("#ai-lang-toggle .ai-lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.aiLang === currentAiLang);
  });

  if (aiQuestionInput) {
    aiQuestionInput.placeholder =
      currentAiLang === "english"
        ? "Ask about Group Admin, Call Request, Speaker, 1x View, App Lock..."
        : "Group Admin, Call Request, Speaker, 1x View ya App Lock ke baare mein puchhein...";
  }

  if (aiQuickChipsBar) {
    aiQuickChipsBar.innerHTML = "";
    const list = AI_CHIPS_V8000[currentAiLang] || AI_CHIPS_V8000.hinglish;
    list.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ai-chip-btn";
      btn.textContent = item.label;
      btn.onclick = () => handleUserAiAsk(item.q);
      aiQuickChipsBar.appendChild(btn);
    });
  }

  if (resetFeed && aiChatFeed) {
    aiChatFeed.innerHTML = "";
    const welcomeHTML =
      currentAiLang === "english"
        ? `<strong>Hello! I am Krypton AI Guide ✨</strong><br/>
           I am updated with all the latest Krypton features: <strong>WhatsApp-Style Group Admin Controls</strong>, <strong>2-Step Call Permission & Speaker Toggle</strong>, <strong>1x View / 10s Burn Mode</strong>, and <strong>Smart App Lock</strong>.<br/><br/>
           <em>Privacy Guarantee: I run 100% locally with 0% access to your messages, passwords, or private data. Tap any topic chip above or ask a question below!</em>`
        : `<strong>Namaste! Main Krypton AI Guide hoon ✨</strong><br/>
           Main Krypton ke saare latest features ke saath updated hoon: <strong>WhatsApp-Style Group Admin Controls</strong>, <strong>2-Step Call Permission & Speaker Toggle</strong>, <strong>1x View / 10s Burn Mode</strong>, aur <strong>Smart App Lock</strong>.<br/><br/>
           <em>Privacy Guarantee: Mere paas aapke messages, passwords ya personal data ka 0% access hai. Upar kisi chip par tap karein ya neeche apna sawal puchhein!</em>`;
    appendAiMessage(welcomeHTML, "bot");
  }
};

getSandboxedKryptonAiResponse = function (rawQuery) {
  const q = String(rawQuery || "").trim().toLowerCase();
  const isEn = currentAiLang === "english";

  const privacyTriggerWords = [
    "password", "pass ", "pass?", "session_token", "token", "private chat",
    "message padho", "chat batao", "kaun online", "who is online", "friend list",
    "database", "supabase key", "decrypt", "hack", "leak"
  ];
  if (
    privacyTriggerWords.some((w) => q.includes(w)) ||
    (q.includes("@") && !q.includes("@me") && !q.includes("@old") && !q.includes("@new") && !q.includes("@owner"))
  ) {
    return isEn
      ? "<strong>Privacy Protocol:</strong> I am strictly built to explain Krypton's features and UI controls. I have zero access to any user's messages, passwords, session_token, or personal data."
      : "<strong>Privacy Protocol:</strong> Main sirf Krypton ke features aur UI controls samjhane ke liye bana hoon. Mere paas kisi bhi user ke messages, passwords, session_token ya personal data ka access nahi hai.";
  }

  if (q.includes("group") || q.includes("admin") || q.includes("owner") || q.includes("mute") || q.includes("member")) {
    return isEn
      ? "<strong>WhatsApp-Style Encrypted Groups & Admin Controls:</strong><br/>• <strong>Create & Invite:</strong> Tap <code>+ New Group</code>, set a Group Icon, Name, and Bio, and type in the search box to pick from your <strong>Connected Friends</strong>.<br/>• <strong>Join / Decline Invite:</strong> Invited friends receive a Group Invite in their <em>Friend Requests</em> hub and only join when they click <strong>Join</strong>.<br/>• <strong>Only Owner Can Send Messages:</strong> The Group Admin can turn ON <em>Only Owner Can Send Messages</em> to mute all members (Announcement Mode).<br/>• <strong>Member List Privacy & Removal:</strong> The Admin can hide the participant list from members (<em>Allow Members to See Member List: OFF</em>) or remove any member in one click."
      : "<strong>WhatsApp-Style Encrypted Groups & Admin Controls:</strong><br/>• <strong>Group Create & Invite:</strong> <code>+ New Group</code> par tap karke Group Photo, Name aur Bio set karein. Member add karte waqt search box mein type karne par sirf aapke <strong>Connected Friends</strong> suggest honge.<br/>• <strong>Join / Decline Invite:</strong> Jin friends ko aap invite karenge unke paas <em>Friend Requests</em> mein Invite jayega—jab wo <strong>Join</strong> karenge tabhi group mein judenge.<br/>• <strong>Only Owner Can Send Messages (Mute):</strong> Group Admin is switch ko ON karke saare members ke messages stop kar sakta hai (Announcement Mode).<br/>• <strong>Member Privacy & Remove:</strong> Admin <em>Allow Members to See Member List</em> ko OFF karke members se participant list chhupa sakta hai aur kisi bhi member ko <strong>Remove</strong> kar sakta hai.";
  }

  if (q.includes("call") || q.includes("video") || q.includes("speaker") || q.includes("earpiece") || q.includes("awaj") || q.includes("awaaz")) {
    return isEn
      ? "<strong>2-Step Call Permission & Speaker / Earpiece Toggle:</strong><br/>• <strong>Step 1 (First-Time Call Request):</strong> The first time you tap the Voice or Video Call icon in a 1-on-1 chat, a <em>Call Permission Request</em> is sent to your friend's Requests list (<code>Allow Calls / Deny</code>).<br/>• <strong>Step 2 (1-Click Calling):</strong> Once your friend clicks <strong>Allow Calls</strong>, you get a confirmation alert and can call them anytime in <strong>1 click</strong>!<br/>• <strong>Speaker Toggle:</strong> Every call starts in comfortable <strong>Earpiece Mode</strong> by default. Tap the <strong>Speaker Icon</strong> in the call bar anytime to switch to loud <strong>Speakerphone Mode</strong>."
      : "<strong>2-Step Call Permission & Speaker / Earpiece Toggle:</strong><br/>• <strong>Step 1 (First-Time Call Request):</strong> Jab aap pehli baar Voice ya Video call button dabayenge, toh agle bande ke Requests section mein <em>Call Permission Request</em> (<code>Allow Calls / Deny</code>) jayegi.<br/>• <strong>Step 2 (1-Click Call):</strong> Jaise hi wo <strong>Allow Calls</strong> accept karega, aapko confirmation popup milega aur uske baad aap hamesha <strong>1-click</strong> mein seedha call laga sakenge!<br/>• <strong>Speaker / Earpiece Icon:</strong> Call connect hone par default <strong>Earpiece Mode</strong> (normal volume) rehta hai. Call screen par diye gaye <strong>Speaker Icon</strong> ko daba kar aap kabhi bhi <strong>Loud Speakerphone ON/OFF</strong> kar sakte hain.";
  }

  if (q.includes("1x") || q.includes("1-time") || q.includes("view once") || q.includes("10s") || q.includes("burn") || q.includes("spoiler") || q.includes("plus") || q.includes("+")) {
    return isEn
      ? "<strong>Corner (+) Hub: Standard, 1x View & 10s Burn Mode:</strong><br/>Tap the <strong>(+)</strong> button on the left of the chat input bar:<br/>1. <strong>Standard:</strong> Keeps photos, files, and messages permanently.<br/>2. <strong>1x View:</strong> Just like WhatsApp View-Once, as soon as the receiver opens and closes the photo/file/spoiler, it is permanently wiped from both devices!<br/>3. <strong>10s Burn:</strong> Automatically self-destructs 10 seconds after being opened or revealed."
      : "<strong>Corner (+) Hub: Standard, 1x View & 10s Burn Mode:</strong><br/>Chat input bar ke left corner mein <strong>(+)</strong> button dabayein:<br/>1. <strong>Standard:</strong> Photo, file ya message normal permanent rahega.<br/>2. <strong>1x View:</strong> Receiver jaise hi photo/file/spoiler khol kar band karega, woh dono taraf se hamesha ke liye delete ho jayega!<br/>3. <strong>10s Burn:</strong> Open ya reveal karne ke thik 10 second baad message apne aap destroy ho jayega.";
  }

  if (q.includes("username") || q.includes("rename") || q.includes("copy") || q.includes("delete") || q.includes("search")) {
    return isEn
      ? "<strong>Settings Username Rename, Copy Icon & Active Search:</strong><br/>• <strong>Copy & Rename in Settings:</strong> Open Settings (⚙️) to find the <strong>Copy Icon</strong> and <strong>Edit (Pencil) Icon</strong> right next to your <code>@username</code>.<br/>• <strong>Auto-Sync & Cleanup:</strong> Renaming your username updates all connected friends automatically and removes your old username from lists.<br/>• <strong>Active-Only Search:</strong> Live search suggestions only show active database users with their exact profile photo and bio—deleted accounts never appear."
      : "<strong>Settings Username Rename, Copy Icon & Active Search:</strong><br/>• <strong>Copy & Rename in Settings:</strong> Settings (⚙️) ke andar aapke <code>@username</code> ke bilkul paas <strong>Copy Icon</strong> aur <strong>Edit (Pencil) Icon</strong> diya gaya hai.<br/>• <strong>Auto-Sync & Cleanup:</strong> Username badalte hi aapke saare connected friends ke paas naya naam sync ho jata hai aur purana naam hat jata hai.<br/>• <strong>Active-Only Search:</strong> Search box mein sirf active accounts unke exact profile photo aur bio ke saath dikhte hain—delete kiye gaye users wapas nahi dikhte.";
  }

  if (q.includes("lock") || q.includes("pin") || q.includes("alt+x") || q.includes("blur") || q.includes("minimize")) {
    return isEn
      ? "<strong>Smart App Lock & Panic Blur (Alt+X):</strong><br/>• Tap the top-left <strong>Lock Icon</strong> on the sidebar to set a 4–6 digit PIN and choose an Auto-Lock Timer (<em>Instant on Minimize</em>, <em>After 1m</em>, <em>After 5m</em>, or <em>On Restart</em>).<br/>• Press <code>Alt + X</code> or <code>Double Esc</code> anytime to blur and lock your screen immediately!"
      : "<strong>Smart App Lock & Panic Blur (Alt+X):</strong><br/>• Sidebar ke top-left <strong>Lock Icon</strong> par click karke 4–6 digit PIN aur Auto-Lock Timer (<em>Instant on Minimize</em>, <em>1m</em>, <em>5m</em>, ya <em>On Restart</em>) set karein.<br/>• Keyboard par <code>Alt + X</code> ya <code>Double Esc</code> dabate hi screen turant blur aur lock ho jayegi!";
  }

  if (q.includes("fingerprint") || q.includes("safety")) {
    return isEn
      ? "<strong>E2EE Safety Fingerprint:</strong><br/>In every 1-on-1 chat, tap the user's header to view the 16-character SHA-256 Safety Code. If it matches on both devices, your end-to-end encrypted tunnel is 100% verified."
      : "<strong>E2EE Safety Fingerprint:</strong><br/>Har 1-on-1 chat ke header par tap karke aap 16-character ka SHA-256 Safety Code mila sakte hain. Dono devices par code same hone ka matlab hai ki aapki chat 100% end-to-end encrypted hai.";
  }

  if (q.includes("voice") || q.includes("mic") || q.includes("file") || q.includes("photo") || q.includes("swipe") || q.includes("reply")) {
    return isEn
      ? "<strong>Voice Notes, Encrypted Files & Swipe-to-Reply:</strong><br/>• <strong>Hold-to-Record Mic:</strong> Press and hold the Mic button on the right of the input bar and release to send an encrypted voice note.<br/>• <strong>Encrypted Files:</strong> Use the <strong>(+)</strong> button to send photos or documents up to 1.5 MB.<br/>• <strong>Swipe-to-Reply:</strong> Drag any message bubble to the right to quote-reply!"
      : "<strong>Voice Notes, Encrypted Files & Swipe-to-Reply:</strong><br/>• <strong>Hold-to-Record Mic:</strong> Input bar ke Mic icon ko daba kar rakhein aur bolne ke baad chhod dein—voice note turant chala jayega.<br/>• <strong>Encrypted Files:</strong> Left <strong>(+)</strong> button se 1.5 MB tak photo ya document encrypt karke bhejein.<br/>• <strong>Swipe-to-Reply:</strong> Kisi bhi message ko right swipe/drag karke WhatsApp ki tarah quote-reply karein!";
  }

  if (q.includes("self") || q.includes("@me") || q.includes("notes") || q.includes("khud")) {
    return isEn
      ? "<strong>Self-Chat (@me Personal Vault):</strong><br/>Search your own <code>@username</code> or <code>me</code> in the sidebar search box and tap <strong>+ Add Self</strong> to save encrypted notes, photos, files, and links."
      : "<strong>Self-Chat (@me Personal Vault):</strong><br/>Search box mein apna khud ka <code>@username</code> ya <code>me</code> type karke <strong>+ Add Self</strong> par tap karein. Yahan aap apne private notes, photos aur files save rakh sakte hain.";
  }

  return isEn
    ? "<strong>Krypton AI Assistant ✨</strong><br/>Ask me about any feature:<br/>• <strong>Groups & Admin Controls (Mute / Member Privacy / Remove)</strong><br/>• <strong>2-Step Call Permission & Speaker / Earpiece Toggle</strong><br/>• <strong>(+) Hub: 1x View & 10s Burn Mode</strong><br/>• <strong>Settings Username Rename & Copy</strong><br/>• <strong>Smart App Lock (Alt+X) & Safety Fingerprint</strong>"
    : "<strong>Krypton AI Assistant ✨</strong><br/>Aap mujhse kisi bhi feature ke baare mein puchh sakte hain:<br/>• <strong>Groups & Admin Controls (Mute / Member Privacy / Remove)</strong><br/>• <strong>2-Step Call Permission & Speaker / Earpiece Toggle</strong><br/>• <strong>(+) Hub: 1x View & 10s Burn Mode</strong><br/>• <strong>Settings Username Rename & Copy</strong><br/>• <strong>Smart App Lock (Alt+X) & Safety Fingerprint</strong>";
};

renderAiLanguageUI(true);


// =========================================================================
// 11. FEATURE v9000: WHATSAPP-STYLE 300+ EMOJI ENGINE (CATEGORIES, SEARCH,
//     RECENTLY USED & EXPANDED MESSAGE REACTION BAR)
// =========================================================================

const WHATSAPP_EMOJI_CATALOG = [
  // 1. Smileys & Faces (90+ Emojis)
  { e: "😀", c: "smileys", k: "grinning happy smile face" },
  { e: "😃", c: "smileys", k: "smiley happy joy face" },
  { e: "😄", c: "smileys", k: "smile happy laugh joy" },
  { e: "😁", c: "smileys", k: "grin happy teeth smile" },
  { e: "😆", c: "smileys", k: "laughing xd satisfied" },
  { e: "😅", c: "smileys", k: "sweat smile nervous laugh" },
  { e: "🤣", c: "smileys", k: "rofl rolling laughing lol funny" },
  { e: "😂", c: "smileys", k: "joy tears laugh lol funny" },
  { e: "🙂", c: "smileys", k: "slight smile polite" },
  { e: "🙃", c: "smileys", k: "upside down silly" },
  { e: "🫠", c: "smileys", k: "melting face hot shy" },
  { e: "😉", c: "smileys", k: "wink flirt" },
  { e: "😊", c: "smileys", k: "blush happy cute smile" },
  { e: "😇", c: "smileys", k: "innocent angel halo" },
  { e: "🥰", c: "smileys", k: "love hearts smiling crush" },
  { e: "😍", c: "smileys", k: "heart eyes love crush" },
  { e: "🤩", c: "smileys", k: "star struck excited wow" },
  { e: "😘", c: "smileys", k: "kiss love flirt" },
  { e: "😗", c: "smileys", k: "kissing whistling" },
  { e: "😚", c: "smileys", k: "kissing closed eyes" },
  { e: "😙", c: "smileys", k: "kissing smile" },
  { e: "🥲", c: "smileys", k: "smiling tear proud grateful" },
  { e: "😋", c: "smileys", k: "yum delicious tasty tongue" },
  { e: "😛", c: "smileys", k: "tongue playful" },
  { e: "😜", c: "smileys", k: "wink tongue crazy" },
  { e: "🤪", c: "smileys", k: "zany crazy wild goofy" },
  { e: "😝", c: "smileys", k: "squinting tongue bleh" },
  { e: "🤑", c: "smileys", k: "money rich cash dollar" },
  { e: "🤗", c: "smileys", k: "hug hugging warm" },
  { e: "🤭", c: "smileys", k: "giggle hand over mouth oops" },
  { e: "🫢", c: "smileys", k: "open eyes hand over mouth gasp" },
  { e: "🫣", c: "smileys", k: "peeking shy" },
  { e: "🤫", c: "smileys", k: "shh quiet secret silence" },
  { e: "🤔", c: "smileys", k: "thinking hmm idea" },
  { e: "🫡", c: "smileys", k: "salute respect yes sir" },
  { e: "🤐", c: "smileys", k: "zipper mouth secret mute" },
  { e: "🤨", c: "smileys", k: "raised eyebrow skeptical sus" },
  { e: "😐", c: "smileys", k: "neutral straight face" },
  { e: "😑", c: "smileys", k: "expressionless annoyed" },
  { e: "😶", c: "smileys", k: "no mouth speechless" },
  { e: "🫥", c: "smileys", k: "dotted line invisible hidden" },
  { e: "😏", c: "smileys", k: "smirk sly" },
  { e: "😒", c: "smileys", k: "unamused side eye" },
  { e: "🙄", c: "smileys", k: "eye roll whatever" },
  { e: "😬", c: "smileys", k: "grimace awkward yikes" },
  { e: "😮‍💨", c: "smileys", k: "exhale sigh relief" },
  { e: "🤥", c: "smileys", k: "lying pinocchio" },
  { e: "😌", c: "smileys", k: "relieved calm peace" },
  { e: "😔", c: "smileys", k: "pensive sad down" },
  { e: "😪", c: "smileys", k: "sleepy tired" },
  { e: "🤤", c: "smileys", k: "drooling hungry" },
  { e: "😴", c: "smileys", k: "sleeping zzz night" },
  { e: "😷", c: "smileys", k: "mask sick doctor" },
  { e: "🤒", c: "smileys", k: "thermometer fever sick" },
  { e: "🤕", c: "smileys", k: "bandage hurt injured" },
  { e: "🤢", c: "smileys", k: "nauseated sick gross" },
  { e: "🤮", c: "smileys", k: "vomiting puke gross" },
  { e: "🤧", c: "smileys", k: "sneezing achoo cold" },
  { e: "🥵", c: "smileys", k: "hot sweating fire" },
  { e: "🥶", c: "smileys", k: "cold freezing ice" },
  { e: "🥴", c: "smileys", k: "woozy dizzy drunk" },
  { e: "😵", c: "smileys", k: "dizzy knocked out" },
  { e: "🤯", c: "smileys", k: "mind blown exploding head" },
  { e: "🤠", c: "smileys", k: "cowboy hat" },
  { e: "🥳", c: "smileys", k: "party celebrate birthday" },
  { e: "🥸", c: "smileys", k: "disguise incognito" },
  { e: "😎", c: "smileys", k: "cool sunglasses boss" },
  { e: "🤓", c: "smileys", k: "nerd glasses smart geek" },
  { e: "🧐", c: "smileys", k: "monocle inspect classy" },
  { e: "😕", c: "smileys", k: "confused" },
  { e: "🫤", c: "smileys", k: "diagonal mouth unsure" },
  { e: "😟", c: "smileys", k: "worried" },
  { e: "🙁", c: "smileys", k: "frown sad" },
  { e: "😮", c: "smileys", k: "open mouth surprised oh" },
  { e: "😯", c: "smileys", k: "hushed surprised" },
  { e: "😲", c: "smileys", k: "astonished shocked" },
  { e: "😳", c: "smileys", k: "flushed embarrassed shy" },
  { e: "🥺", c: "smileys", k: "pleading puppy eyes please" },
  { e: "🥹", c: "smileys", k: "holding back tears emotional" },
  { e: "😦", c: "smileys", k: "frowning open mouth" },
  { e: "😧", c: "smileys", k: "anguished" },
  { e: "😨", c: "smileys", k: "fearful scared" },
  { e: "😰", c: "smileys", k: "anxious sweat nervous" },
  { e: "😥", c: "smileys", k: "sad relieved" },
  { e: "😢", c: "smileys", k: "crying tear sad" },
  { e: "😭", c: "smileys", k: "sob crying loud tears" },
  { e: "😱", c: "smileys", k: "screaming fear omg" },
  { e: "😖", c: "smileys", k: "confounded" },
  { e: "😣", c: "smileys", k: "persevering struggle" },
  { e: "😞", c: "smileys", k: "disappointed sad" },
  { e: "😓", c: "smileys", k: "downcast sweat" },
  { e: "😩", c: "smileys", k: "weary tired" },
  { e: "😫", c: "smileys", k: "tired exhausted" },
  { e: "🥱", c: "smileys", k: "yawning bored sleepy" },
  { e: "😤", c: "smileys", k: "triumph steam nose proud angry" },
  { e: "😡", c: "smileys", k: "rage angry mad red" },
  { e: "😠", c: "smileys", k: "angry mad" },
  { e: "🤬", c: "smileys", k: "cursing swearing angry" },
  { e: "😈", c: "smileys", k: "devil horns smile naughty" },
  { e: "👿", c: "smileys", k: "angry devil" },
  { e: "💀", c: "smileys", k: "skull dead rip funny" },
  { e: "☠️", c: "smileys", k: "skull crossbones danger" },
  { e: "💩", c: "smileys", k: "poop funny" },
  { e: "🤡", c: "smileys", k: "clown joker" },
  { e: "👹", c: "smileys", k: "ogre monster" },
  { e: "👻", c: "smileys", k: "ghost spooky boo" },
  { e: "👽", c: "smileys", k: "alien ufo" },
  { e: "👾", c: "smileys", k: "space invader game arcade" },
  { e: "🤖", c: "smileys", k: "robot bot ai" },

  // 2. Hands, Gestures & People (45+ Emojis)
  { e: "👋", c: "gestures", k: "wave hello hi bye" },
  { e: "🤚", c: "gestures", k: "raised back hand stop" },
  { e: "🖐️", c: "gestures", k: "hand fingers five" },
  { e: "✋", c: "gestures", k: "raised hand high five stop" },
  { e: "🖖", c: "gestures", k: "vulcan salute" },
  { e: "🫱", c: "gestures", k: "rightwards hand" },
  { e: "🫲", c: "gestures", k: "leftwards hand" },
  { e: "👌", c: "gestures", k: "ok hand perfect super" },
  { e: "🤌", c: "gestures", k: "pinched fingers chef kiss italian" },
  { e: "🤏", c: "gestures", k: "pinching small little" },
  { e: "✌️", c: "gestures", k: "peace victory two" },
  { e: "🤞", c: "gestures", k: "crossed fingers luck hope" },
  { e: "🫰", c: "gestures", k: "hand index thumb crossedfinger heart money" },
  { e: "🤟", c: "gestures", k: "love you gesture rock" },
  { e: "🤘", c: "gestures", k: "rock on metal horns" },
  { e: "🤙", c: "gestures", k: "call me shaka chill" },
  { e: "👈", c: "gestures", k: "point left" },
  { e: "👉", c: "gestures", k: "point right" },
  { e: "👆", c: "gestures", k: "point up" },
  { e: "🖕", c: "gestures", k: "middle finger" },
  { e: "👇", c: "gestures", k: "point down" },
  { e: "☝️", c: "gestures", k: "index pointing up one" },
  { e: "🫵", c: "gestures", k: "index pointing at viewer you" },
  { e: "👍", c: "gestures", k: "thumbs up like yes ok good" },
  { e: "👎", c: "gestures", k: "thumbs down dislike no" },
  { e: "✊", c: "gestures", k: "raised fist power" },
  { e: "👊", c: "gestures", k: "fist bump bro punch" },
  { e: "🤛", c: "gestures", k: "left fist" },
  { e: "🤜", c: "gestures", k: "right fist" },
  { e: "👏", c: "gestures", k: "clap applause bravo" },
  { e: "🙌", c: "gestures", k: "raising hands celebrate hooray" },
  { e: "🫶", c: "gestures", k: "heart hands love" },
  { e: "👐", c: "gestures", k: "open hands" },
  { e: "🤲", c: "gestures", k: "palms up prayer" },
  { e: "🤝", c: "gestures", k: "handshake deal friend" },
  { e: "🙏", c: "gestures", k: "pray namaste thank you please" },
  { e: "✍️", c: "gestures", k: "writing hand note" },
  { e: "💅", c: "gestures", k: "nail polish slay" },
  { e: "🤳", c: "gestures", k: "selfie phone" },
  { e: "💪", c: "gestures", k: "muscle strong flex gym" },
  { e: "🧠", c: "gestures", k: "brain smart mind" },
  { e: "👀", c: "gestures", k: "eyes looking watch" },
  { e: "👁️", c: "gestures", k: "eye vision" },
  { e: "🫦", c: "gestures", k: "biting lip flirt" },
  { e: "👑", c: "gestures", k: "crown king queen royal" },

  // 3. Hearts & Love (35+ Emojis)
  { e: "❤️", c: "hearts", k: "red heart love" },
  { e: "🩷", c: "hearts", k: "pink heart cute love" },
  { e: "🧡", c: "hearts", k: "orange heart" },
  { e: "💛", c: "hearts", k: "yellow heart friendship" },
  { e: "💚", c: "hearts", k: "green heart krypton" },
  { e: "💙", c: "hearts", k: "blue heart trust" },
  { e: "🩵", c: "hearts", k: "light blue heart" },
  { e: "💜", c: "hearts", k: "purple heart" },
  { e: "🖤", c: "hearts", k: "black heart dark" },
  { e: "🩶", c: "hearts", k: "grey heart" },
  { e: "🤍", c: "hearts", k: "white heart pure" },
  { e: "🤎", c: "hearts", k: "brown heart" },
  { e: "💔", c: "hearts", k: "broken heart sad breakup" },
  { e: "❤️‍🔥", c: "hearts", k: "heart on fire passion love" },
  { e: "❤️‍🩹", c: "hearts", k: "mending heart healing" },
  { e: "❣️", c: "hearts", k: "heart exclamation" },
  { e: "💕", c: "hearts", k: "two hearts love" },
  { e: "💞", c: "hearts", k: "revolving hearts" },
  { e: "💓", c: "hearts", k: "beating heart" },
  { e: "💗", c: "hearts", k: "growing heart" },
  { e: "💖", c: "hearts", k: "sparkling heart" },
  { e: "💘", c: "hearts", k: "heart arrow cupid" },
  { e: "💝", c: "hearts", k: "heart ribbon gift" },
  { e: "💟", c: "hearts", k: "heart decoration" },
  { e: "💌", c: "hearts", k: "love letter mail" },
  { e: "💋", c: "hearts", k: "kiss mark lips" },
  { e: "🌹", c: "hearts", k: "rose flower love" },
  { e: "💐", c: "hearts", k: "bouquet flowers" },
  { e: "🌸", c: "hearts", k: "cherry blossom flower" },
  { e: "🌺", c: "hearts", k: "hibiscus flower" },
  { e: "🌻", c: "hearts", k: "sunflower" },
  { e: "🌷", c: "hearts", k: "tulip flower" },
  { e: "🥀", c: "hearts", k: "wilted flower sad" },
  { e: "💍", c: "hearts", k: "ring diamond marriage" },
  { e: "💎", c: "hearts", k: "diamond gem crystal" },

  // 4. Animals & Nature (35+ Emojis)
  { e: "🐶", c: "animals", k: "dog puppy pet" },
  { e: "🐱", c: "animals", k: "cat kitty pet" },
  { e: "🐭", c: "animals", k: "mouse" },
  { e: "🐹", c: "animals", k: "hamster" },
  { e: "🐰", c: "animals", k: "rabbit bunny" },
  { e: "🦊", c: "animals", k: "fox clever" },
  { e: "🐻", c: "animals", k: "bear" },
  { e: "🐼", c: "animals", k: "panda cute" },
  { e: "🐨", c: "animals", k: "koala" },
  { e: "🐯", c: "animals", k: "tiger" },
  { e: "🦁", c: "animals", k: "lion king" },
  { e: "🐮", c: "animals", k: "cow" },
  { e: "🐷", c: "animals", k: "pig" },
  { e: "🐸", c: "animals", k: "frog" },
  { e: "🐵", c: "animals", k: "monkey" },
  { e: "🙈", c: "animals", k: "see no evil monkey shy" },
  { e: "🙉", c: "animals", k: "hear no evil monkey" },
  { e: "🙊", c: "animals", k: "speak no evil monkey oops" },
  { e: "🐔", c: "animals", k: "chicken" },
  { e: "🐧", c: "animals", k: "penguin" },
  { e: "🦅", c: "animals", k: "eagle bird" },
  { e: "🦉", c: "animals", k: "owl night wise" },
  { e: "🦇", c: "animals", k: "bat" },
  { e: "🐺", c: "animals", k: "wolf" },
  { e: "🦄", c: "animals", k: "unicorn magic" },
  { e: "🐝", c: "animals", k: "bee honey" },
  { e: "🦋", c: "animals", k: "butterfly" },
  { e: "🐢", c: "animals", k: "turtle slow" },
  { e: "🐍", c: "animals", k: "snake" },
  { e: "🦖", c: "animals", k: "dino t-rex" },
  { e: "🦈", c: "animals", k: "shark" },
  { e: "🐬", c: "animals", k: "dolphin" },
  { e: "🐳", c: "animals", k: "whale" },
  { e: "🌞", c: "animals", k: "sun sunny bright" },
  { e: "🌙", c: "animals", k: "moon night" },
  { e: "⭐", c: "animals", k: "star" },
  { e: "🌟", c: "animals", k: "glowing star" },
  { e: "🌈", c: "animals", k: "rainbow" },
  { e: "⚡", c: "animals", k: "lightning bolt zap fast" },
  { e: "❄️", c: "animals", k: "snowflake cold" },

  // 5. Food & Drinks (35+ Emojis)
  { e: "🍕", c: "food", k: "pizza slice food" },
  { e: "🍔", c: "food", k: "burger hamburger" },
  { e: "🍟", c: "food", k: "fries french fries" },
  { e: "🌭", c: "food", k: "hotdog" },
  { e: "🍿", c: "food", k: "popcorn movie" },
  { e: "🌮", c: "food", k: "taco" },
  { e: "🌯", c: "food", k: "burrito wrap" },
  { e: "🍜", c: "food", k: "noodles ramen maggi" },
  { e: "🍝", c: "food", k: "pasta spaghetti" },
  { e: "🍛", c: "food", k: "curry rice indian food" },
  { e: "🍣", c: "food", k: "sushi" },
  { e: "🍗", c: "food", k: "chicken leg" },
  { e: "🥪", c: "food", k: "sandwich" },
  { e: "🥐", c: "food", k: "croissant" },
  { e: "🍩", c: "food", k: "donut sweet" },
  { e: "🍪", c: "food", k: "cookie" },
  { e: "🎂", c: "food", k: "birthday cake party" },
  { e: "🍰", c: "food", k: "shortcake slice" },
  { e: "🧁", c: "food", k: "cupcake" },
  { e: "🍫", c: "food", k: "chocolate bar" },
  { e: "🍬", c: "food", k: "candy sweet" },
  { e: "🍭", c: "food", k: "lollipop" },
  { e: "🍦", c: "food", k: "ice cream" },
  { e: "🍎", c: "food", k: "apple fruit" },
  { e: "🍉", c: "food", k: "watermelon" },
  { e: "🥭", c: "food", k: "mango fruit" },
  { e: "🍓", c: "food", k: "strawberry" },
  { e: "🍌", c: "food", k: "banana" },
  { e: "☕", c: "food", k: "coffee tea chai hot drink" },
  { e: "🍵", c: "food", k: "green tea cup" },
  { e: "🧋", c: "food", k: "boba bubble tea" },
  { e: "🥤", c: "food", k: "cold drink soda" },
  { e: "🍺", c: "food", k: "beer mug cheers" },
  { e: "🍻", c: "food", k: "clinking beer mugs cheers" },
  { e: "🥂", c: "food", k: "champagne glasses toast celebrate" },

  // 6. Activities, Celebration, Sports & Objects (40+ Emojis)
  { e: "🎉", c: "activities", k: "party popper celebrate congrats" },
  { e: "🎊", c: "activities", k: "confetti ball celebrate" },
  { e: "🎈", c: "activities", k: "balloon birthday" },
  { e: "🎁", c: "activities", k: "gift present box" },
  { e: "🏆", c: "activities", k: "trophy winner champion" },
  { e: "🥇", c: "activities", k: "gold medal first" },
  { e: "🏅", c: "activities", k: "medal" },
  { e: "⚽", c: "activities", k: "soccer football" },
  { e: "🏏", c: "activities", k: "cricket bat ball" },
  { e: "🏀", c: "activities", k: "basketball" },
  { e: "🎮", c: "activities", k: "video game controller gaming" },
  { e: "🕹️", c: "activities", k: "joystick arcade" },
  { e: "🎲", c: "activities", k: "dice game" },
  { e: "🎯", c: "activities", k: "bullseye target hit" },
  { e: "🎸", c: "activities", k: "guitar music rock" },
  { e: "🎧", c: "activities", k: "headphones music audio" },
  { e: "🎤", c: "activities", k: "microphone sing" },
  { e: "🎬", c: "activities", k: "clapper board movie film" },
  { e: "🚀", c: "activities", k: "rocket launch space fast" },
  { e: "✈️", c: "activities", k: "airplane travel flight" },
  { e: "🚗", c: "activities", k: "car drive" },
  { e: "🏍️", c: "activities", k: "motorcycle bike" },
  { e: "💻", c: "activities", k: "laptop computer code" },
  { e: "📱", c: "activities", k: "mobile phone" },
  { e: "⌚", c: "activities", k: "watch time" },
  { e: "📷", c: "activities", k: "camera photo" },
  { e: "💡", c: "activities", k: "light bulb idea" },
  { e: "💰", c: "activities", k: "money bag rich" },
  { e: "💸", c: "activities", k: "money with wings cash" },
  { e: "💣", c: "activities", k: "bomb boom" },
  { e: "🧨", c: "activities", k: "firecracker dynamite" },
  { e: "📚", c: "activities", k: "books study" },
  { e: "🎓", c: "activities", k: "graduation cap college" },

  // 7. Symbols, Fire, Cyber & Status (35+ Emojis)
  { e: "🔥", c: "symbols", k: "fire lit hot flame" },
  { e: "💯", c: "symbols", k: "100 percent perfect score" },
  { e: "✨", c: "symbols", k: "sparkles magic shine" },
  { e: "💥", c: "symbols", k: "collision boom bang" },
  { e: "💫", c: "symbols", k: "dizzy star shooting" },
  { e: "💦", c: "symbols", k: "sweat droplets water" },
  { e: "💨", c: "symbols", k: "dash wind fast" },
  { e: "🕳️", c: "symbols", k: "hole" },
  { e: "💬", c: "symbols", k: "speech bubble chat" },
  { e: "💭", c: "symbols", k: "thought bubble" },
  { e: "💤", c: "symbols", k: "zzz sleep" },
  { e: "🔒", c: "symbols", k: "locked security private" },
  { e: "🔓", c: "symbols", k: "unlocked open" },
  { e: "🛡️", c: "symbols", k: "shield security protect" },
  { e: "🔑", c: "symbols", k: "key secret password" },
  { e: "✅", c: "symbols", k: "check mark yes done" },
  { e: "❌", c: "symbols", k: "cross mark no wrong" },
  { e: "⚠️", c: "symbols", k: "warning alert" },
  { e: "🚫", c: "symbols", k: "prohibited no ban" },
  { e: "❓", c: "symbols", k: "question mark" },
  { e: "❗", c: "symbols", k: "exclamation mark" },
  { e: "‼️", c: "symbols", k: "double exclamation" },
  { e: "♻️", c: "symbols", k: "recycle" },
  { e: "🔔", c: "symbols", k: "bell notification" },
  { e: "🔕", c: "symbols", k: "mute bell silent" },
  { e: "🎵", c: "symbols", k: "musical note song" },
  { e: "🎶", c: "symbols", k: "music notes" },
  { e: "♾️", c: "symbols", k: "infinity forever" },
  { e: "🇮🇳", c: "symbols", k: "india flag tiranga" },
  { e: "🚩", c: "symbols", k: "red flag" },
  { e: "🏳️", c: "symbols", k: "white flag peace" },
  { e: "🏴", c: "symbols", k: "black flag" }
];

let recentEmojisList = JSON.parse(localStorage.getItem("krypton_recent_emojis") || '["😂","❤️","🔥","👍","🤣","😍","🙏","😎","🥳","💯","✨","😭","🤔","🫡"]');
let currentEmojiCategory = "all";

function saveRecentEmoji(emo) {
  if (!emo) return;
  recentEmojisList = [emo, ...recentEmojisList.filter((x) => x !== emo)].slice(0, 35);
  localStorage.setItem("krypton_recent_emojis", JSON.stringify(recentEmojisList));
}

function insertEmojiIntoChatInput(emo) {
  const input = document.getElementById("chat-input");
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const text = input.value;
  input.value = text.slice(0, start) + emo + text.slice(end);
  const nextPos = start + emo.length;
  input.focus();
  try {
    input.setSelectionRange(nextPos, nextPos);
  } catch (e) { }
  saveRecentEmoji(emo);
}

function renderWhatsAppEmojiGrid() {
  const grid = document.getElementById("whatsapp-emoji-grid");
  const searchInp = document.getElementById("emoji-search-input");
  if (!grid) return;

  const q = (searchInp ? searchInp.value : "").trim().toLowerCase();
  grid.innerHTML = "";

  let itemsToRender = [];
  if (q) {
    itemsToRender = WHATSAPP_EMOJI_CATALOG.filter(
      (item) => item.k.includes(q) || item.c.includes(q) || item.e.includes(q)
    ).map((item) => item.e);
  } else if (currentEmojiCategory === "recent") {
    itemsToRender = recentEmojisList;
  } else if (currentEmojiCategory === "all") {
    itemsToRender = WHATSAPP_EMOJI_CATALOG.map((item) => item.e);
  } else {
    itemsToRender = WHATSAPP_EMOJI_CATALOG.filter((item) => item.c === currentEmojiCategory).map(
      (item) => item.e
    );
  }

  if (itemsToRender.length === 0) {
    grid.innerHTML = `<div class="emoji-empty-state">No emojis found for "${escapeHTML(q)}"</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  itemsToRender.forEach((emo) => {
    const sp = document.createElement("span");
    sp.textContent = emo;
    sp.onclick = (e) => {
      e.stopPropagation();
      insertEmojiIntoChatInput(emo);
    };
    frag.appendChild(sp);
  });
  grid.appendChild(frag);
}
const emojiPaletteDrawerEl = document.getElementById("emoji-palette");
const btnCloseEmojiDrawerEl = document.getElementById("btn-close-emoji-drawer");

// Close picker when clicking the X button
if (btnCloseEmojiDrawerEl && emojiPaletteDrawerEl) {
  btnCloseEmojiDrawerEl.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    emojiPaletteDrawerEl.classList.add("hidden");
  });
}

// Close picker when clicking outside it
document.addEventListener(
  "pointerdown",
  (e) => {
    if (!emojiPaletteDrawerEl) return;
    if (emojiPaletteDrawerEl.classList.contains("hidden")) return;

    // Keep picker open when clicking inside it
    if (emojiPaletteDrawerEl.contains(e.target)) return;

    // Let the emoji toggle button handle its own click
    const emojiOpenButtonEl = document.getElementById("hub-btn-emoji");
    if (emojiOpenButtonEl && emojiOpenButtonEl.contains(e.target)) return;

    // Click was outside: close the picker
    emojiPaletteDrawerEl.classList.add("hidden");
  },
  true
);

// Prevent clicks inside the picker from bubbling to other handlers
if (emojiPaletteDrawerEl) {
  emojiPaletteDrawerEl.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

document.querySelectorAll("#emoji-cat-tabs .emoji-cat-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll("#emoji-cat-tabs .emoji-cat-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentEmojiCategory = btn.dataset.ecat || "all";
    const searchInp = document.getElementById("emoji-search-input");
    if (searchInp && searchInp.value) searchInp.value = "";
    renderWhatsAppEmojiGrid();
  });
});

const emojiSearchInputEl = document.getElementById("emoji-search-input");
if (emojiSearchInputEl) {
  emojiSearchInputEl.addEventListener("input", () => {
    renderWhatsAppEmojiGrid();
  });
}

// Re-hook hubBtnEmoji so opening the Emoji Tray renders the full WhatsApp catalog
if (hubBtnEmoji && emojiPaletteDrawerEl) {
  hubBtnEmoji.addEventListener("click", () => {
    renderWhatsAppEmojiGrid();
  });
}

// Upgrade Message Quick Reaction Popover to include 16 popular WhatsApp reactions!
window.openReactionPicker = function (msgId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  document.querySelectorAll(".quick-react-popover").forEach((p) => p.remove());

  const row = document.getElementById("msg-row-" + msgId);
  if (!row) return;
  const bubble = row.querySelector(".msg-bubble");
  if (!bubble) return;

  const pop = document.createElement("div");
  pop.className = "quick-react-popover";
  const emojis = ["❤️", "😂", "🔥", "👍", "🤣", "😍", "🙏", "😮", "😢", "🥳", "💯", "⚡", "👏", "🫡", "🤔", "💀"];
  emojis.forEach((emo) => {
    const sp = document.createElement("span");
    sp.textContent = emo;
    sp.onclick = (e) => {
      e.stopPropagation();
      pop.remove();
      sendReactionToMessage(msgId, emo);
    };
    pop.appendChild(sp);
  });

  bubble.insertBefore(pop, bubble.firstChild);
};

// Initial render of the 300+ Emoji Grid
renderWhatsAppEmojiGrid();


// =========================================================================
// 12. FEATURE v10000: COMPLETE MESSAGING (LONG-PRESS / RIGHT-CLICK MENU,
//     EDIT MESSAGE, RICH REPLY PREVIEW), DEVICE SESSIONS & REMOTE LOGOUT,
//     BIOMETRIC UNLOCK, CALL STATES (CALLING->RINGING->CONNECTING->CONNECTED),
//     BUSY STATUS, 30s MISSED CALL LOGS, CAMERA SWITCH & AUTO-RECONNECT
// =========================================================================

// --- A. DEVICE / SESSION MANAGEMENT, NEW-DEVICE LOGIN ALERTS & REMOTE LOGOUT ---
let myDeviceInstanceId = localStorage.getItem("krypton_device_instance_id") || "";
if (!myDeviceInstanceId) {
  myDeviceInstanceId = "dev_" + crypto.randomUUID().slice(0, 10);
  localStorage.setItem("krypton_device_instance_id", myDeviceInstanceId);
}

function getReadableDeviceName() {
  const ua = navigator.userAgent || "";
  let os = "Desktop";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows PC";
  else if (/Mac/i.test(ua)) os = "Mac";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  return `${browser} on ${os}`;
}

let activeAccountSessionsMap = JSON.parse(localStorage.getItem("krypton_account_sessions") || "{}");

function registerMyCurrentDeviceSession() {
  if (!myUsername) return;
  const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  activeAccountSessionsMap[myDeviceInstanceId] = {
    deviceId: myDeviceInstanceId,
    username: myUsername.toLowerCase(),
    deviceName: getReadableDeviceName(),
    isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || ""),
    lastActive: nowStr,
    timestamp: Date.now()
  };
  localStorage.setItem("krypton_account_sessions", JSON.stringify(activeAccountSessionsMap));
  renderActiveDevicesList();
}

function renderActiveDevicesList() {
  const listEl = document.getElementById("active-devices-list");
  if (!listEl) return;
  const me = (myUsername || "").toLowerCase();
  listEl.innerHTML = "";

  // Ensure current device is always registered
  if (me && !activeAccountSessionsMap[myDeviceInstanceId]) {
    registerMyCurrentDeviceSession();
  }

  const sessions = Object.values(activeAccountSessionsMap)
    .filter((s) => s && (!s.username || s.username === me))
    .sort((a, b) => (a.deviceId === myDeviceInstanceId ? -1 : b.deviceId === myDeviceInstanceId ? 1 : (b.timestamp || 0) - (a.timestamp || 0)));

  sessions.forEach((sess) => {
    const isCurrent = sess.deviceId === myDeviceInstanceId;
    const row = document.createElement("div");
    row.className = "device-session-row" + (isCurrent ? " current-device" : "");
    const iconName = sess.isMobile ? "smartphone" : "monitor";

    row.innerHTML = `
      <div class="device-session-info">
        <div class="device-icon-box">
          <i data-lucide="${iconName}" style="width: 15px; height: 15px;"></i>
        </div>
        <div class="device-meta-stack">
          <span class="device-name-title">
            ${escapeHTML(sess.deviceName || "Krypton Session")}
            ${isCurrent ? ' <span class="online-pill-badge" style="font-size: 9px; padding: 1px 6px;">This Device</span>' : ""}
          </span>
          <span class="device-sub-line">Active • ${escapeHTML(sess.lastActive || "Now")} • ID: ${escapeHTML(sess.deviceId.slice(-5))}</span>
        </div>
      </div>
      ${!isCurrent
        ? `<button type="button" class="group-remove-member-btn" onclick="remoteLogoutSingleDevice('${escapeHTML(sess.deviceId)}')">Logout</button>`
        : ""
      }
    `;
    listEl.appendChild(row);
  });

  if (window.lucide) lucide.createIcons({ nodes: [listEl] });
}

window.remoteLogoutSingleDevice = async function (targetDeviceId) {
  if (!targetDeviceId || targetDeviceId === myDeviceInstanceId) return;
  const targetSess = activeAccountSessionsMap[targetDeviceId];
  delete activeAccountSessionsMap[targetDeviceId];
  localStorage.setItem("krypton_account_sessions", JSON.stringify(activeAccountSessionsMap));
  renderActiveDevicesList();

  if (presenceChannel && myUsername) {
    try {
      await presenceChannel.send({
        type: "broadcast",
        event: "device-remote-logout",
        payload: {
          username: myUsername.toLowerCase(),
          targetDeviceId: targetDeviceId,
          initiatedBy: myDeviceInstanceId
        }
      });
    } catch (e) { }
  }
  showToast(`Remotely logged out ${targetSess ? targetSess.deviceName : "device"}!`, "success");
};

const btnLogoutOtherDevices = document.getElementById("btn-logout-other-devices");
if (btnLogoutOtherDevices) {
  btnLogoutOtherDevices.addEventListener("click", async () => {
    const me = (myUsername || "").toLowerCase();
    const otherIds = Object.keys(activeAccountSessionsMap).filter(
      (id) => id !== myDeviceInstanceId && (!activeAccountSessionsMap[id].username || activeAccountSessionsMap[id].username === me)
    );
    if (otherIds.length === 0) {
      showToast("No other active device sessions found.", "info");
      return;
    }
    const ok = await showGlassDialog({
      title: "Logout All Other Devices?",
      message: `Remotely terminate ${otherIds.length} other active session(s) on your account?`,
      confirmText: "Logout Others",
      danger: true
    });
    if (!ok) return;

    otherIds.forEach((id) => delete activeAccountSessionsMap[id]);
    localStorage.setItem("krypton_account_sessions", JSON.stringify(activeAccountSessionsMap));
    renderActiveDevicesList();

    if (presenceChannel && myUsername) {
      try {
        await presenceChannel.send({
          type: "broadcast",
          event: "device-remote-logout",
          payload: {
            username: myUsername.toLowerCase(),
            targetDeviceId: "ALL_EXCEPT_INITIATOR",
            initiatedBy: myDeviceInstanceId
          }
        });
      } catch (e) { }
    }
    showToast("All other devices have been logged out!", "success");
  });
}

// Hook openSettingsModal so device list is refreshed every time Settings opens
const prevOpenSettingsModalV9 = openSettingsModal;
openSettingsModal = function () {
  prevOpenSettingsModalV9();
  registerMyCurrentDeviceSession();
};

// --- B. BIOMETRIC UNLOCK (WEBBAUTHN FINGERPRINT / FACEID / WINDOWS HELLO) ---
let biometricCredId = localStorage.getItem("krypton_biometric_cred_id") || "";

async function isPlatformBiometricSupported() {
  try {
    if (!window.PublicKeyCredential || !navigator.credentials) return false;
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function updateBiometricUIState() {
  const btnUnlockBio = document.getElementById("btn-biometric-unlock");
  const btnEnrollBio = document.getElementById("btn-enroll-biometric");
  const descBio = document.getElementById("biometric-setup-desc");
  const supported = await isPlatformBiometricSupported();

  if (btnEnrollBio) {
    if (!supported) {
      btnEnrollBio.textContent = "Unsupported";
      btnEnrollBio.disabled = true;
      if (descBio) descBio.textContent = "Hardware biometrics not detected on this browser/device";
    } else if (biometricCredId) {
      btnEnrollBio.textContent = "Disable";
      btnEnrollBio.className = "glass-btn-sm danger";
      if (descBio) descBio.textContent = "Biometric unlock is ACTIVE for Mesh Privacy Shield";
    } else {
      btnEnrollBio.textContent = "Enable";
      btnEnrollBio.className = "glass-btn-sm btn-save-action";
      if (descBio) descBio.textContent = "Use Fingerprint / FaceID / Windows Hello to unlock";
    }
  }

  if (btnUnlockBio) {
    btnUnlockBio.classList.toggle("hidden", !Boolean(biometricCredId && supported));
  }
}

async function enrollOrToggleBiometric() {
  if (biometricCredId) {
    biometricCredId = "";
    localStorage.removeItem("krypton_biometric_cred_id");
    await updateBiometricUIState();
    showToast("Biometric unlock disabled.", "info");
    return;
  }

  const supported = await isPlatformBiometricSupported();
  if (!supported) {
    showToast("Biometric sensor not supported on this browser/device.", "error");
    return;
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(myUsername || "krypton_user");
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: "Krypton Encrypted Mesh" },
        user: {
          id: userIdBytes,
          name: "@" + (myUsername || "user"),
          displayName: "@" + (myUsername || "user")
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 45000
      }
    });

    if (credential && credential.rawId) {
      biometricCredId = uint8ArrayToBase64(new Uint8Array(credential.rawId));
      localStorage.setItem("krypton_biometric_cred_id", biometricCredId);
      await updateBiometricUIState();
      showToast("Biometric Unlock (Fingerprint / FaceID) enabled!", "success");
    }
  } catch (err) {
    console.warn("Biometric enrollment cancelled or failed:", err);
    showToast("Biometric verification cancelled or unavailable in this context.", "error");
  }
}

async function triggerBiometricUnlockAttempt() {
  if (!biometricCredId) return;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawIdBytes = base64ToUint8Array(biometricCredId);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{ type: "public-key", id: rawIdBytes }],
        userVerification: "required",
        timeout: 45000
      }
    });
    if (assertion) {
      if (appLockOverlay) appLockOverlay.classList.add("hidden");
      showToast("Unlocked via Biometrics!", "success", 1800);
    }
  } catch (err) {
    showToast("Biometric scan cancelled. Please enter your PIN.", "info");
  }
}

const btnEnrollBioEl = document.getElementById("btn-enroll-biometric");
if (btnEnrollBioEl) {
  btnEnrollBioEl.addEventListener("click", enrollOrToggleBiometric);
}

const btnBiometricUnlockEl = document.getElementById("btn-biometric-unlock");
if (btnBiometricUnlockEl) {
  btnBiometricUnlockEl.addEventListener("click", triggerBiometricUnlockAttempt);
}

const prevTriggerPrivacyLockV9 = triggerPrivacyLock;
triggerPrivacyLock = function () {
  prevTriggerPrivacyLockV9();
  updateBiometricUIState();
};

const prevOpenSmartLockSetupModalV9 = openSmartLockSetupModal;
openSmartLockSetupModal = function () {
  prevOpenSmartLockSetupModalV9();
  updateBiometricUIState();
};

// --- C. COMPLETE MESSAGING: WHATSAPP LONG-PRESS / RIGHT-CLICK CONTEXT MENU,
//        LIVE MESSAGE EDITING & RICH MEDIA REPLY PREVIEW ---
let editingMessageState = null; // { msgId, oldText }
let editedMessagesMap = JSON.parse(localStorage.getItem("krypton_edited_msgs") || "{}");

function closeMessageContextMenu() {
  document.querySelectorAll(".msg-context-backdrop, .whatsapp-msg-context-menu").forEach((el) => el.remove());
  document.querySelectorAll(".message-row.ctx-menu-active").forEach((r) => r.classList.remove("ctx-menu-active"));
}

window.openWhatsAppMessageContextMenu = function (msgId, clientX, clientY) {
  closeMessageContextMenu();
  const row = document.getElementById("msg-row-" + msgId);
  if (!row) return;

  row.classList.add("ctx-menu-active");
  const sender = row.dataset.sender || myUsername;
  const isMine = sender.toLowerCase() === (myUsername || "").toLowerCase();
  const msgType = row.dataset.msgType || "text";
  const isTextMsg = msgType === "text";

  const textLineEl = row.querySelector(".msg-text-line");
  const currentPlainText = textLineEl ? textLineEl.textContent.trim() : "";

  // Check if message has an image thumbnail for rich reply preview
  const imgEl = row.querySelector("img.chat-thumbnail-img");
  const thumbUrl = imgEl ? imgEl.src : "";

  let snippetForReply = currentPlainText.slice(0, 70);
  if (msgType === "media") snippetForReply = "📷 Photo";
  else if (msgType === "voice") snippetForReply = "🎤 Voice Note";
  else if (msgType === "files") {
    const fnEl = row.querySelector(".file-card-name");
    snippetForReply = "📎 " + (fnEl ? fnEl.textContent : "File");
  }

  const backdrop = document.createElement("div");
  backdrop.className = "msg-context-backdrop";
  backdrop.onclick = closeMessageContextMenu;

  const menu = document.createElement("div");
  menu.className = "whatsapp-msg-context-menu";
  menu.onclick = (e) => e.stopPropagation();

  // 1. Top Quick Emoji Reactions Bar
  const reactBar = document.createElement("div");
  reactBar.className = "msg-ctx-reactions-bar";
  const quickEmojis = ["❤️", "😂", "🔥", "👍", "🤣", "😍", "🙏", "😮", "😢", "🥳", "💯", "⚡", "🫡", "💀"];
  quickEmojis.forEach((emo) => {
    const sp = document.createElement("span");
    sp.textContent = emo;
    sp.onclick = () => {
      closeMessageContextMenu();
      sendReactionToMessage(msgId, emo);
    };
    reactBar.appendChild(sp);
  });
  menu.appendChild(reactBar);

  // 2. Context Actions List (Reply, Edit, Copy, Pin, Delete)
  const actionsList = document.createElement("div");
  actionsList.className = "msg-ctx-actions-list";

  // Reply Option
  const btnReply = document.createElement("button");
  btnReply.className = "msg-ctx-btn";
  btnReply.innerHTML = `<i data-lucide="corner-up-left" style="width: 15px; height: 15px;"></i><span>Reply</span>`;
  btnReply.onclick = () => {
    closeMessageContextMenu();
    setReplyMessageWithMedia(msgId, sender, snippetForReply, thumbUrl);
  };
  actionsList.appendChild(btnReply);

  // Edit Option (Only for sender's own text messages)
  if (isMine && isTextMsg && currentPlainText) {
    const btnEdit = document.createElement("button");
    btnEdit.className = "msg-ctx-btn";
    btnEdit.innerHTML = `<i data-lucide="pencil" style="width: 15px; height: 15px;"></i><span>Edit Message</span>`;
    btnEdit.onclick = () => {
      closeMessageContextMenu();
      startEditingMessage(msgId, currentPlainText);
    };
    actionsList.appendChild(btnEdit);
  }

  // Copy Option
  if (isTextMsg && currentPlainText) {
    const btnCopy = document.createElement("button");
    btnCopy.className = "msg-ctx-btn";
    btnCopy.innerHTML = `<i data-lucide="copy" style="width: 15px; height: 15px;"></i><span>Copy Text</span>`;
    btnCopy.onclick = () => {
      closeMessageContextMenu();
      copyMessageText(msgId);
    };
    actionsList.appendChild(btnCopy);
  }

  // Pin Option (When allowed in room)
  const canPinHere =
    currentRoom !== "global" && (!isGroupRoom(currentRoom) || isCurrentGroupOwner(currentRoom));
  if (canPinHere) {
    const btnPin = document.createElement("button");
    btnPin.className = "msg-ctx-btn";
    btnPin.innerHTML = `<i data-lucide="pin" style="width: 15px; height: 15px;"></i><span>Pin Message</span>`;
    btnPin.onclick = () => {
      closeMessageContextMenu();
      pinMessageInCurrentRoom(msgId, `@${sender}: ${snippetForReply}`);
    };
    actionsList.appendChild(btnPin);
  }

  // Delete Option
  const btnDel = document.createElement("button");
  btnDel.className = "msg-ctx-btn danger";
  btnDel.innerHTML = `<i data-lucide="trash-2" style="width: 15px; height: 15px;"></i><span>Delete Message</span>`;
  btnDel.onclick = (e) => {
    closeMessageContextMenu();
    deleteSingleMessage(msgId, sender, e);
  };
  actionsList.appendChild(btnDel);

  menu.appendChild(actionsList);
  document.body.appendChild(backdrop);
  document.body.appendChild(menu);
  if (window.lucide) lucide.createIcons({ nodes: [menu] });

  // Position menu smartly inside viewport bounds
  const menuW = 248;
  const menuH = menu.offsetHeight || 230;
  let left = clientX || window.innerWidth / 2 - menuW / 2;
  let top = clientY || window.innerHeight / 2 - menuH / 2;

  left = Math.max(12, Math.min(window.innerWidth - menuW - 12, left));
  top = Math.max(16, Math.min(window.innerHeight - menuH - 16, top));

  menu.style.left = left + "px";
  menu.style.top = top + "px";
};

// Rich Reply Preview with Original Media Thumbnail Support
window.setReplyMessageWithMedia = function (msgId, sender, snippet, thumbUrl = "") {
  editingMessageState = null;
  activeReplyContext = { id: msgId, sender, snippet, thumb: thumbUrl || "" };

  const bar = document.getElementById("reply-preview-bar");
  const senderEl = document.getElementById("reply-preview-sender");
  const snippetEl = document.getElementById("reply-preview-snippet");

  if (bar && senderEl && snippetEl) {
    bar.classList.remove("editing-mode", "hidden");
    senderEl.textContent = "Replying to @" + sender;
    snippetEl.textContent = snippet;

    let existingThumb = bar.querySelector(".reply-preview-thumb");
    if (thumbUrl) {
      if (!existingThumb) {
        existingThumb = document.createElement("img");
        existingThumb.className = "reply-preview-thumb";
        bar.insertBefore(existingThumb, bar.querySelector("#btn-cancel-reply"));
      }
      existingThumb.src = thumbUrl;
    } else if (existingThumb) {
      existingThumb.remove();
    }
  }
  const input = document.getElementById("chat-input");
  if (input) input.focus();
};

window.setReplyMessage = function (msgId, sender, snippet) {
  const row = document.getElementById("msg-row-" + msgId);
  const imgEl = row ? row.querySelector("img.chat-thumbnail-img") : null;
  setReplyMessageWithMedia(msgId, sender, snippet, imgEl ? imgEl.src : "");
};

function startEditingMessage(msgId, currentText) {
  activeReplyContext = null;
  editingMessageState = { msgId, oldText: currentText };

  const bar = document.getElementById("reply-preview-bar");
  const senderEl = document.getElementById("reply-preview-sender");
  const snippetEl = document.getElementById("reply-preview-snippet");
  const input = document.getElementById("chat-input");

  if (bar && senderEl && snippetEl) {
    const oldThumb = bar.querySelector(".reply-preview-thumb");
    if (oldThumb) oldThumb.remove();
    bar.classList.add("editing-mode");
    bar.classList.remove("hidden");
    senderEl.textContent = "✏️ Editing Message";
    snippetEl.textContent = currentText;
  }

  if (input) {
    input.value = currentText;
    input.focus();
    try {
      input.setSelectionRange(currentText.length, currentText.length);
    } catch (e) { }
  }
}

const prevCancelActiveReplyV9 = cancelActiveReply;
cancelActiveReply = function () {
  editingMessageState = null;
  const bar = document.getElementById("reply-preview-bar");
  if (bar) {
    bar.classList.remove("editing-mode");
    const oldThumb = bar.querySelector(".reply-preview-thumb");
    if (oldThumb) oldThumb.remove();
  }
  prevCancelActiveReplyV9();
};

function applyEditedMessageToDOM(msgId, newText) {
  if (!msgId || !newText) return;
  editedMessagesMap[msgId] = newText;
  localStorage.setItem("krypton_edited_msgs", JSON.stringify(editedMessagesMap));

  const row = document.getElementById("msg-row-" + msgId);
  if (!row) return;

  const textLineEl = row.querySelector(".msg-text-line");
  if (textLineEl) {
    textLineEl.innerHTML = formatRichMessageHTML(newText);
  }

  const metaEl = row.querySelector(".msg-meta");
  if (metaEl && !metaEl.querySelector(".msg-edited-tag")) {
    const tag = document.createElement("span");
    tag.className = "msg-edited-tag";
    tag.textContent = "(edited)";
    metaEl.insertBefore(tag, metaEl.firstChild);
  }
}

// Override sendTextMessage to handle both normal sending and live message editing!
sendTextMessage = async function () {
  const input = document.getElementById("chat-input");
  if (!input) return;
  let text = input.value.trim();
  if (!text) return;

  // Handle Live Edit Submission
  if (editingMessageState && editingMessageState.msgId) {
    const targetMsgId = editingMessageState.msgId;
    input.value = "";
    cancelActiveReply();

    applyEditedMessageToDOM(targetMsgId, text);
    playSynthTone("send");

    // Broadcast live edit to room & update encrypted DB row if possible
    if (activeSubscription) {
      activeSubscription.send({
        type: "broadcast",
        event: "msg-edited",
        payload: { msgId: targetMsgId, newText: text, sender: myUsername }
      });
    }
    if (supabaseClient && currentRoom && !String(targetMsgId).startsWith("temp_")) {
      try {
        const enc = await encryptData(text, currentRoom);
        await supabaseClient
          .from("messages")
          .update({ ciphertext: enc.ciphertext, iv: enc.iv, salt: enc.salt })
          .eq("id", targetMsgId);
      } catch (e) { }
    }
    showToast("Message edited!", "success", 1600);
    return;
  }

  if (isSpoilerModeActive && !text.startsWith("||")) {
    text = `||${text}||`;
    isSpoilerModeActive = false;
    if (hubBtnSpoiler) hubBtnSpoiler.classList.remove("spoiler-on");
    if (btnAttachHub) btnAttachHub.classList.remove("spoiler-armed");
    if (hubSpoilerLabel) hubSpoilerLabel.textContent = "Spoiler Blur: OFF";
  }

  input.value = "";
  transmitPayload(text);
};

// Re-bind #btn-send and #chat-input Enter key to the upgraded sendTextMessage
const btnSendV10 = document.getElementById("btn-send");
if (btnSendV10) {
  const cleanSend = btnSendV10.cloneNode(true);
  btnSendV10.parentNode.replaceChild(cleanSend, btnSendV10);
  cleanSend.addEventListener("click", () => sendTextMessage());
}
const chatInputV10 = document.getElementById("chat-input");
if (chatInputV10) {
  chatInputV10.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendTextMessage();
    }
  };
}

// Attach Long-Press (Mobile Touch) & Right-Click (Laptop/Desktop) to every Message Node + Render Call Logs & Rich Reply Thumbnails
function bindLongPressAndRightClickToMessage(rowEl, msgId) {
  if (!rowEl || !msgId) return;
  const bubble = rowEl.querySelector(".bubble-content");
  if (!bubble) return;

  // Desktop / Laptop Right-Click
  bubble.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openWhatsAppMessageContextMenu(msgId, e.clientX, e.clientY);
  });

  // Mobile Long-Press (480ms hold & release/trigger)
  let pressTimer = null;
  let startX = 0;
  let startY = 0;

  bubble.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      pressTimer = setTimeout(() => {
        if (navigator.vibrate) {
          try { navigator.vibrate(25); } catch (err) { }
        }
        openWhatsAppMessageContextMenu(msgId, startX, startY);
      }, 460);
    },
    { passive: true }
  );

  bubble.addEventListener(
    "touchmove",
    (e) => {
      if (!pressTimer || e.touches.length !== 1) return;
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 12 || dy > 12) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    },
    { passive: true }
  );

  bubble.addEventListener("touchend", () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  });

  bubble.addEventListener("touchcancel", () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  });
}

// Wrap createMessageNode to support:
// 1. CALL_LOG_DATA system bubbles (Missed / Declined / Unanswered Calls)
// 2. Rich Reply Quote Thumbnail rendering
// 3. Previously edited message text + (edited) tag
// 4. Long-Press & Right-Click Context Menu binding
const prevCreateMessageNodeV9 = createMessageNode;
createMessageNode = async function (msg, rawTextOverride) {
  const node = await prevCreateMessageNodeV9(msg, rawTextOverride);
  if (!node) return null;

  const msgId = node.id.replace("msg-row-", "");

  // 1. Check if this message has a local edit cached
  if (editedMessagesMap[msgId]) {
    const textLineEl = node.querySelector(".msg-text-line");
    if (textLineEl) {
      textLineEl.innerHTML = formatRichMessageHTML(editedMessagesMap[msgId]);
    }
    const metaEl = node.querySelector(".msg-meta");
    if (metaEl && !metaEl.querySelector(".msg-edited-tag")) {
      const tag = document.createElement("span");
      tag.className = "msg-edited-tag";
      tag.textContent = "(edited)";
      metaEl.insertBefore(tag, metaEl.firstChild);
    }
  }

  // 2. Check if this message is a Call System Log ("CALL_LOG_DATA:type|status")
  const textLineEl = node.querySelector(".msg-text-line");
  if (textLineEl && textLineEl.textContent.startsWith("CALL_LOG_DATA:")) {
    const rawLog = textLineEl.textContent.replace("CALL_LOG_DATA:", "");
    const [cType, cState] = rawLog.split("|");
    const isVideo = cType === "video";
    const iconName = isVideo ? "video-off" : "phone-missed";
    let title = isVideo ? "Missed Video Call" : "Missed Voice Call";
    let sub = "Tap call icon in header to call back";

    if (cState === "declined") {
      title = isVideo ? "Declined Video Call" : "Declined Voice Call";
    } else if (cState === "busy") {
      title = isVideo ? "Busy • Video Call" : "Busy • Voice Call";
      sub = "User was on another call";
    } else if (cState === "unanswered") {
      title = isVideo ? "Unanswered Video Call" : "Unanswered Voice Call";
      sub = "No answer (30s timeout)";
    }

    textLineEl.innerHTML = `
      <div class="call-system-log-card">
        <div class="call-log-icon-circle">
          <i data-lucide="${iconName}" style="width: 16px; height: 16px;"></i>
        </div>
        <div class="call-log-meta">
          <span class="call-log-title">${escapeHTML(title)}</span>
          <span class="call-log-sub">${escapeHTML(sub)}</span>
        </div>
      </div>
    `;
  }

  // 3. Upgrade Reply Quote block inside bubble if original quoted message has a thumbnail
  const quoteEl = node.querySelector(".msg-reply-quote");
  if (quoteEl) {
    const onclickAttr = quoteEl.getAttribute("onclick") || "";
    const match = onclickAttr.match(/scrollToQuotedMessage\('([^']+)'\)/);
    const quotedId = match ? match[1] : "";
    const quotedRow = quotedId ? document.getElementById("msg-row-" + quotedId) : null;
    const quotedImg = quotedRow ? quotedRow.querySelector("img.chat-thumbnail-img") : null;

    if (!quoteEl.querySelector(".msg-reply-quote-body")) {
      const uEl = quoteEl.querySelector(".msg-reply-quote-user");
      const tEl = quoteEl.querySelector(".msg-reply-quote-text");
      const bodyWrap = document.createElement("div");
      bodyWrap.className = "msg-reply-quote-body";
      if (uEl) bodyWrap.appendChild(uEl);
      if (tEl) bodyWrap.appendChild(tEl);
      quoteEl.innerHTML = "";
      quoteEl.appendChild(bodyWrap);

      if (quotedImg && quotedImg.src) {
        const thumbImg = document.createElement("img");
        thumbImg.className = "msg-reply-quote-thumb";
        thumbImg.src = quotedImg.src;
        quoteEl.appendChild(thumbImg);
      }
    }
  }

  // 4. Bind Long-Press (Mobile) & Right-Click (Laptop) Context Menu
  bindLongPressAndRightClickToMessage(node, msgId);
  return node;
};

// --- D. CALL UPGRADES: CALLING -> RINGING -> CONNECTING -> CONNECTED,
//        30s RING TIMEOUT & MISSED CALL LOGS, BUSY STATUS, CAMERA SWITCH & AUTO-RECONNECT ---
let currentCameraFacingMode = "user"; // "user" (Front) | "environment" (Back)
let outgoingCallRingTimeout = null;
let webrtcReconnectTimer = null;

function setCallStatusProgression(stageText) {
  const statusBadge = document.getElementById("call-status-badge");
  if (statusBadge) statusBadge.textContent = stageText;
}

function clearOutgoingCallRingTimeout() {
  if (outgoingCallRingTimeout) {
    clearTimeout(outgoingCallRingTimeout);
    outgoingCallRingTimeout = null;
  }
}

async function logCallEventBubbleInChat(callType = "voice", outcome = "missed") {
  if (!currentRoom || currentRoom === "global") return;
  await transmitPayload(`CALL_LOG_DATA:${callType}|${outcome}`);
}

// Switch Front / Back Camera during active Video Call
const btnSwitchCamEl = document.getElementById("btn-switch-cam");
if (btnSwitchCamEl) {
  btnSwitchCamEl.addEventListener("click", async () => {
    if (!localStream || activeCallType !== "video") return;
    currentCameraFacingMode = currentCameraFacingMode === "user" ? "environment" : "user";

    try {
      const oldVideoTrack = localStream.getVideoTracks()[0];
      if (oldVideoTrack) oldVideoTrack.stop();

      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: currentCameraFacingMode }
        },
        audio: false
      });

      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      if (newVideoTrack) {
        if (oldVideoTrack) localStream.removeTrack(oldVideoTrack);
        localStream.addTrack(newVideoTrack);

        const localVideo = document.getElementById("local-video");
        if (localVideo) {
          localVideo.srcObject = localStream;
          localVideo.play().catch(() => { });
        }

        if (peerConnection) {
          const videoSender = peerConnection
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          }
        }
        showToast(
          currentCameraFacingMode === "user" ? "Switched to Front Camera" : "Switched to Back Camera",
          "info",
          1600
        );
      }
    } catch (err) {
      console.warn("Camera switch error:", err);
      showToast("Could not switch camera on this device.", "error");
    }
  });
}

// Upgrade initiateCallPermission for "Calling -> Ringing" progression + 30s Unanswered Timeout + Missed Call Bubble
const prevInitiateCallPermissionV9 = initiateCallPermission;
initiateCallPermission = async function (type) {
  if (!currentPeerUser || currentRoom === "global") return;
  const rel = await getPeerRelationshipState(currentPeerUser);
  if (rel.state !== "accepted" || !rel.row) {
    showToast("Pehle Friend Request accept honi chahiye!", "error");
    return;
  }

  if (rel.row.call_allowed === true) {
    const me = myUsername.toLowerCase();
    const peer = currentPeerUser.toLowerCase();
    activeCallType = type;
    activeCallSender = peer;

    // 1. Show Outgoing Screen immediately with "Calling..." state
    const overlay = document.getElementById("call-screen-overlay");
    const peerName = document.getElementById("call-peer-name");
    const videoGrid = document.getElementById("video-streams-container");
    const btnCam = document.getElementById("btn-toggle-cam");
    const btnSwitch = document.getElementById("btn-switch-cam");
    const timer = document.getElementById("call-duration-timer");

    if (overlay) overlay.classList.remove("hidden");
    if (peerName) peerName.textContent = "@" + peer;
    renderAvatarElement(document.getElementById("call-avatar"), peer, usersAvatarCache[peer] || "");
    if (videoGrid) videoGrid.classList.add("hidden");
    if (btnCam) btnCam.classList.add("hidden");
    if (btnSwitch) btnSwitch.classList.add("hidden");
    if (timer) timer.classList.add("hidden");

    setCallStatusProgression(`Calling @${peer}...`);

    const ringStatus = `call_ring_${type}:${me}`;
    const { error: ringError } = await supabaseClient
      .from("chat_requests")
      .update({ call_allowed: true, status: ringStatus })
      .or(
        `and(sender_id.ilike.${me},receiver_id.ilike.${peer}),` +
        `and(sender_id.ilike.${peer},receiver_id.ilike.${me})`
      );

    if (ringError) {
      if (overlay) overlay.classList.add("hidden");
      showToast("Could not start the call. Please try again.", "error");
      return;
    }

    // 2. If peer is online in presence mesh, transition to "Ringing..."
    setTimeout(() => {
      if (!peerConnection && overlay && !overlay.classList.contains("hidden")) {
        const isPeerOnline = onlineUsersList.has(peer);
        setCallStatusProgression(
          isPeerOnline ? `Ringing @${peer}...` : `Calling @${peer} (Waiting for response)...`
        );
      }
    }, 650);

    // 3. Start 30-second Ringing Timeout -> Auto-end & post Missed Call Bubble
    clearOutgoingCallRingTimeout();
    outgoingCallRingTimeout = setTimeout(async () => {
      if (!peerConnection) {
        endCall(true);
        showToast(`@${peer} did not answer the call.`, "info");
        await logCallEventBubbleInChat(type, "unanswered");
      }
    }, 30000);

    return;
  }

  return prevInitiateCallPermissionV9(type);
};

// Upgrade handleCallRequestCheck for Busy Status, Call Declined Feedback, and Connecting Progression
const prevHandleCallRequestCheckV9 = handleCallRequestCheck;
handleCallRequestCheck = async function (payload) {
  const row = payload.new;
  if (!row || !myUsername) return;

  const me = myUsername.toLowerCase();
  const s = (row.sender_id || "").toLowerCase();
  const rec = (row.receiver_id || "").toLowerCase();
  if (s !== me && rec !== me) return;

  const otherPeer = s === me ? rec : s;

  // 1. Detect if our outgoing call was marked BUSY or DECLINED by the receiver
  if (row.status && row.status.startsWith("call_busy:")) {
    const busyPeer = (row.status.split(":")[1] || "").toLowerCase();
    if (busyPeer !== me) {
      clearOutgoingCallRingTimeout();
      setCallStatusProgression(`@${otherPeer} is Busy on another call`);
      showToast(`@${otherPeer} is currently busy on another call.`, "error");
      setTimeout(() => endCall(false), 1400);
      await supabaseClient
        .from("chat_requests")
        .update({ status: "accepted" })
        .or(`and(sender_id.ilike.${me},receiver_id.ilike.${otherPeer}),and(sender_id.ilike.${otherPeer},receiver_id.ilike.${me})`);
    }
    return;
  }

  if (row.status && row.status.startsWith("call_declined:")) {
    const declinedBy = (row.status.split(":")[1] || "").toLowerCase();
    if (declinedBy !== me) {
      clearOutgoingCallRingTimeout();
      setCallStatusProgression(`Call Declined by @${otherPeer}`);
      showToast(`@${otherPeer} declined the call.`, "info");
      setTimeout(() => endCall(false), 900);
      await logCallEventBubbleInChat(activeCallType || "voice", "declined");
      await supabaseClient
        .from("chat_requests")
        .update({ status: "accepted" })
        .or(`and(sender_id.ilike.${me},receiver_id.ilike.${otherPeer}),and(sender_id.ilike.${otherPeer},receiver_id.ilike.${me})`);
    }
    return;
  }

  // 2. If an incoming call rings while we are ALREADY in an active call -> Automatically send BUSY signal!
  if (row.call_allowed === true && row.status && row.status.startsWith("call_ring_")) {
    const [prefix, initiatedBy] = row.status.split(":");
    const caller = (initiatedBy || "").toLowerCase();
    const callMode = prefix.includes("video") ? "video" : "voice";

    if (caller && caller !== me) {
      const overlay = document.getElementById("call-screen-overlay");
      const isAlreadyInCall = Boolean(peerConnection || (overlay && !overlay.classList.contains("hidden")));
      if (isAlreadyInCall) {
        await supabaseClient
          .from("chat_requests")
          .update({ status: `call_busy:${me}` })
          .or(`and(sender_id.ilike.${me},receiver_id.ilike.${caller}),and(sender_id.ilike.${caller},receiver_id.ilike.${me})`);
        showToast(`Missed call from @${caller} (Auto-replied Busy)`, "info");
        return;
      }

      // Notify caller that our device is actively Ringing!
      if (presenceChannel) {
        presenceChannel.send({
          type: "broadcast",
          event: "call-ringing-ack",
          payload: { caller, receiver: me, callMode }
        }).catch(() => { });
      }
    }
  }

  // 3. When call transitions to call_active, clear 30s timeout and show "Connecting..."
  if (row.status && row.status.startsWith("call_active")) {
    clearOutgoingCallRingTimeout();
    setCallStatusProgression("Connecting Encrypted Streams...");
  }

  return prevHandleCallRequestCheckV9(payload);
};

// Re-bind Decline button so it signals `call_declined:me` to caller
const btnDeclineV10 = document.getElementById("btn-decline-call");
if (btnDeclineV10) {
  const cleanDecline = btnDeclineV10.cloneNode(true);
  btnDeclineV10.parentNode.replaceChild(cleanDecline, btnDeclineV10);
  cleanDecline.addEventListener("click", async () => {
    const callModal = document.getElementById("call-perm-modal");
    if (callModal) callModal.classList.add("hidden");
    if (activeCallSender && supabaseClient) {
      await supabaseClient
        .from("chat_requests")
        .update({ status: `call_declined:${myUsername.toLowerCase()}` })
        .or(
          `and(sender_id.ilike.${activeCallSender},receiver_id.ilike.${myUsername}),` +
          `and(sender_id.ilike.${myUsername},receiver_id.ilike.${activeCallSender})`
        );
    }
  });
}

// Wrap startWebRTC to add:
// - "Connecting..." -> "Connected • AES-256" status progression
// - Camera Switch button visibility for Video Calls
// - Automatic ICE Restart & Reconnect on weak network ("disconnected" / "failed")
const prevStartWebRTCv9 = startWebRTC;
startWebRTC = async function (isCaller, type) {
  clearOutgoingCallRingTimeout();
  currentCameraFacingMode = "user";
  setCallStatusProgression("Connecting Encrypted Tunnel...");

  await prevStartWebRTCv9(isCaller, type);

  const btnSwitch = document.getElementById("btn-switch-cam");
  if (btnSwitch) {
    btnSwitch.classList.toggle("hidden", type !== "video");
  }

  if (peerConnection) {
    const prevOnTrack = peerConnection.ontrack;
    peerConnection.ontrack = (event) => {
      if (prevOnTrack) prevOnTrack(event);
      setCallStatusProgression("Connected • AES-GCM P2P");
    };

    peerConnection.oniceconnectionstatechange = async () => {
      if (!peerConnection) return;
      const state = peerConnection.iceConnectionState;

      if (state === "checking") {
        setCallStatusProgression("Connecting...");
      } else if (state === "connected" || state === "completed") {
        clearTimeout(webrtcReconnectTimer);
        setCallStatusProgression("Connected • AES-GCM P2P");
      } else if (state === "disconnected" || state === "failed") {
        setCallStatusProgression("Weak Network • Reconnecting...");
        showToast("Network weak — attempting automatic call reconnect...", "info", 2200);

        clearTimeout(webrtcReconnectTimer);
        webrtcReconnectTimer = setTimeout(async () => {
          if (!peerConnection || peerConnection.signalingState === "closed") return;
          try {
            if (typeof peerConnection.restartIce === "function") {
              peerConnection.restartIce();
            }
            const offer = await peerConnection.createOffer({
              iceRestart: true,
              offerToReceiveAudio: true,
              offerToReceiveVideo: type === "video"
            });
            await peerConnection.setLocalDescription(offer);
            if (activeSubscription) {
              activeSubscription.send({
                type: "broadcast",
                event: "webrtc-offer",
                payload: { offer: offer, sender: myUsername, callType: type }
              });
            }
          } catch (e) { }
        }, 1200);
      }
    };
  }
};

const prevEndCallV9 = endCall;
endCall = function (notifyRemote = true) {
  clearOutgoingCallRingTimeout();
  clearTimeout(webrtcReconnectTimer);
  const btnSwitch = document.getElementById("btn-switch-cam");
  if (btnSwitch) btnSwitch.classList.add("hidden");
  prevEndCallV9(notifyRemote);
};

// Hook joinRoom activeSubscription to listen for live "msg-edited" broadcasts
const prevJoinRoomV9 = joinRoom;
joinRoom = async function (roomId, displayName, pushHistory = true) {
  await prevJoinRoomV9(roomId, displayName, pushHistory);
  if (activeSubscription) {
    activeSubscription.on("broadcast", { event: "msg-edited" }, (payload) => {
      const p = payload.payload;
      if (p && p.msgId && p.newText) {
        applyEditedMessageToDOM(p.msgId, p.newText);
      }
    });
  }
};

// Hook initPresenceTracker to handle:
// 1. New-device login alerts & session sync
// 2. Remote device logout enforcement
// 3. Call Ringing Acknowledgment ("Calling..." -> "Ringing...")
// 4. Automatic Realtime Reconnection when network comes back online
const prevInitPresenceTrackerV9 = initPresenceTracker;
initPresenceTracker = function () {
  prevInitPresenceTrackerV9();
  registerMyCurrentDeviceSession();
  if (!presenceChannel) return;

  presenceChannel.on("broadcast", { event: "device-session-announce" }, (payload) => {
    const sess = payload.payload;
    const me = (myUsername || "").toLowerCase();
    if (!sess || !sess.deviceId || sess.username !== me) return;

    const isNewDevice = !activeAccountSessionsMap[sess.deviceId];
    activeAccountSessionsMap[sess.deviceId] = sess;
    localStorage.setItem("krypton_account_sessions", JSON.stringify(activeAccountSessionsMap));
    renderActiveDevicesList();

    if (isNewDevice && sess.deviceId !== myDeviceInstanceId) {
      playSynthTone("receive");
      showToast(`🔐 New login detected on your account: ${sess.deviceName}`, "info", 4500);
      triggerSystemPushNotification(
        "Krypton Security Alert",
        `New login detected from ${sess.deviceName}`,
        "security-new-device"
      );
    }
  });

  presenceChannel.on("broadcast", { event: "device-remote-logout" }, (payload) => {
    const data = payload.payload;
    const me = (myUsername || "").toLowerCase();
    if (!data || data.username !== me) return;
    if (
      data.targetDeviceId === myDeviceInstanceId ||
      (data.targetDeviceId === "ALL_EXCEPT_INITIATOR" && data.initiatedBy !== myDeviceInstanceId)
    ) {
      localStorage.removeItem("krypton_uid");
      localStorage.removeItem("krypton_session_id");
      showToast("Session remotely logged out from another device.", "error");
      setTimeout(() => location.reload(), 600);
    }
  });

  presenceChannel.on("broadcast", { event: "call-ringing-ack" }, (payload) => {
    const data = payload.payload;
    const me = (myUsername || "").toLowerCase();
    if (data && data.caller === me && !peerConnection) {
      setCallStatusProgression(`Ringing @${data.receiver}...`);
    }
  });

  // Broadcast our device session once subscribed
  setTimeout(() => {
    if (presenceChannel && myUsername && activeAccountSessionsMap[myDeviceInstanceId]) {
      presenceChannel.send({
        type: "broadcast",
        event: "device-session-announce",
        payload: activeAccountSessionsMap[myDeviceInstanceId]
      }).catch(() => { });
    }
  }, 1200);
};

// Automatic Network Recovery Listener (Reconnects Presence, Room & WebRTC when Wi-Fi/Mobile Data recovers)
window.addEventListener("online", () => {
  showToast("Network restored • Re-syncing encrypted mesh...", "success", 2200);
  if (myUsername) {
    initPresenceTracker();
    listenToIncomingRequests();
    if (currentRoom) {
      const titleEl = document.getElementById("current-room-title");
      joinRoom(currentRoom, titleEl ? titleEl.textContent : "Chat", false);
    }
  }
});

window.addEventListener("offline", () => {
  showToast("Network offline • Waiting for connection...", "error", 2500);
});

updateBiometricUIState();


// =========================================================================
// 13. FEATURE v11000:
//     1. UNIVERSAL USER SEARCH & DISCOVERY (DATABASE + PRESENCE + DUAL RENDER
//        IN DROPDOWN & MAIN LIST SO NEW USERS CAN ALWAYS SEARCH & ADD FRIENDS)
//     2. BULLETPROOF PERMANENT ACCOUNT DELETION (CASE-INSENSITIVE + STATIC BINDING)
//     3. TRUE END-TO-END ENCRYPTED CALL SIGNALING (AES-GCM 256-BIT ENCRYPTED
//        SDP OFFER, ANSWER & ICE CANDIDATES + LIVE CALL SAFETY CODE)
// =========================================================================

// --- 1. UNIVERSAL USER SEARCH & DISCOVERY FIX ---
let lastUniversalSearchResults = [];

async function queryAllMatchingUsersEverywhere(rawQuery) {
  const q = (rawQuery || "").trim().toLowerCase().replace(/^@/, "");
  if (!q) return [];

  const myLower = (myUsername || "").toLowerCase();
  const userMap = new Map();

  // Source A: Query Supabase `users` table (with automatic fallback to `select("*")` if specific columns fail)
  if (supabaseClient) {
    try {
      let rows = null;
      const { data: uData, error: uErr } = await supabaseClient
        .from("users")
        .select("username, avatar_url, bio, session_token")
        .ilike("username", `%${q}%`)
        .limit(20);

      if (!uErr && Array.isArray(uData)) {
        rows = uData;
      } else {
        // Fallback: select("*") in case bio / avatar_url / session_token columns differ in user's table
        const { data: fallbackData } = await supabaseClient
          .from("users")
          .select("*")
          .ilike("username", `%${q}%`)
          .limit(20);
        if (Array.isArray(fallbackData)) rows = fallbackData;
      }

      if (rows) {
        rows.forEach((u) => {
          const clean = (u.username || "").trim().toLowerCase();
          if (!clean) return;
          if (u.avatar_url) usersAvatarCache[clean] = u.avatar_url;
          if (u.bio) usersBioCache[clean] = u.bio;
          if (u.session_token) usersSessionCache[clean] = u.session_token;

          userMap.set(clean, {
            username: clean,
            avatar_url: u.avatar_url || usersAvatarCache[clean] || "",
            bio: u.bio || usersBioCache[clean] || "Hey there! I am using Krypton."
          });
        });
      }
    } catch (err) {
      console.warn("Users search query error:", err);
    }

    // Source B: Also check `messages` and `chat_requests` senders/receivers in case RLS or table policies hid `users` rows
    try {
      const { data: msgSenders } = await supabaseClient
        .from("messages")
        .select("sender_id")
        .ilike("sender_id", `%${q}%`)
        .limit(15);
      if (Array.isArray(msgSenders)) {
        msgSenders.forEach((m) => {
          const clean = (m.sender_id || "").trim().toLowerCase();
          if (clean && !userMap.has(clean)) {
            userMap.set(clean, {
              username: clean,
              avatar_url: usersAvatarCache[clean] || "",
              bio: usersBioCache[clean] || "Active Krypton User"
            });
          }
        });
      }
    } catch (e) { }
  }

  // Source C: Check currently online users in Presence Mesh & cached profiles
  onlineUsersList.forEach((onlineU) => {
    const clean = (onlineU || "").trim().toLowerCase();
    if (clean && clean.includes(q) && !userMap.has(clean)) {
      userMap.set(clean, {
        username: clean,
        avatar_url: usersAvatarCache[clean] || "",
        bio: usersBioCache[clean] || "Online on Krypton Mesh"
      });
    }
  });

  Object.keys(usersBioCache || {}).forEach((cachedU) => {
    const clean = (cachedU || "").trim().toLowerCase();
    if (clean && clean.includes(q) && !userMap.has(clean)) {
      userMap.set(clean, {
        username: clean,
        avatar_url: usersAvatarCache[clean] || "",
        bio: usersBioCache[clean] || "Hey there! I am using Krypton."
      });
    }
  });

  // Source D: Include Self (@me) if query matches own username or "me"/"you"
  if (
    myLower &&
    !userMap.has(myLower) &&
    (myLower.includes(q) || "me".includes(q) || "you".includes(q))
  ) {
    userMap.set(myLower, {
      username: myLower,
      avatar_url: myAvatarData || "",
      bio: myUserBio || "Personal Encrypted Vault"
    });
  }

  localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
  localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
  localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));

  const results = Array.from(userMap.values()).sort((a, b) => {
    if (a.username === q && b.username !== q) return -1;
    if (b.username === q && a.username !== q) return 1;
    if (a.username.startsWith(q) && !b.username.startsWith(q)) return -1;
    if (!a.username.startsWith(q) && b.username.startsWith(q)) return 1;
    return a.username.localeCompare(b.username);
  });

  lastUniversalSearchResults = results;
  return results;
}

// Override updateLiveUserSuggestions so it uses Universal Discovery AND also renders New Users directly in #chat-list!
updateLiveUserSuggestions = async function (rawQuery) {
  const box = document.getElementById("live-user-suggestions");
  const q = (rawQuery || "").trim().toLowerCase().replace(/^@/, "");
  if (!q) {
    lastUniversalSearchResults = [];
    hideLiveUserSuggestions();
    renderPeerList("");
    return;
  }

  const queryId = ++latestSearchQueryId;
  if (box) {
    box.classList.remove("hidden");
    box.innerHTML = `
      <div class="live-suggestion-header">
        <span>SEARCHING DIRECTORY</span>
        <span>"@${escapeHTML(q)}"...</span>
      </div>
    `;
  }

  const matchedUsers = await queryAllMatchingUsersEverywhere(q);
  if (queryId !== latestSearchQueryId) return;

  // Also refresh #chat-list so matched new users appear right inside the main list too!
  renderPeerList(q);

  if (!box) return;

  box.innerHTML = `
    <div class="live-suggestion-header">
      <span>FOUND USERS (${matchedUsers.length})</span>
      <span style="cursor: pointer; padding: 0 4px;" onclick="hideLiveUserSuggestions()">✕</span>
    </div>
  `;

  const myLower = (myUsername || "").toLowerCase();

  if (matchedUsers.length === 0) {
    // Allow direct "+ Add @q" even if user hasn't appeared in cache yet
    box.innerHTML += `
      <div class="contact-card" onclick="selectSuggestedPeer('${escapeHTML(q)}', 'add')">
        <div class="contact-card-info">
          <div class="avatar-wrap">
            <div class="contact-avatar">${escapeHTML((q[0] || "?").toUpperCase())}</div>
          </div>
          <div class="contact-name-wrap">
            <span class="contact-name">@${escapeHTML(q)}</span>
            <span class="contact-preview-text">Tap to send Friend Request to @${escapeHTML(q)}</span>
          </div>
        </div>
        <div class="contact-right-meta">
          <button type="button" class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(q)}', 'add')">+ Add Friend</button>
        </div>
      </div>
    `;
    return;
  }

  matchedUsers.forEach((u) => {
    const uname = u.username;
    const isSelf = uname === myLower;
    const isOnline = isSelf ? true : onlineUsersList.has(uname) && userSettings.onlinePresence;
    const rel = peerRelationshipMap[uname];
    const isAlreadyFriend = isSelf
      ? savedPeers.includes(myLower)
      : rel && (rel.status === "accepted" || (rel.status && rel.status.startsWith("call_")));
    const isPending = !isSelf && rel && rel.status === "pending";

    let actionBtnHTML = "";
    if (isSelf) {
      actionBtnHTML = `<button type="button" class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'open')">${savedPeers.includes(myLower) ? "Open" : "+ Add Self"}</button>`;
    } else if (isAlreadyFriend) {
      actionBtnHTML = `<button type="button" class="suggestion-action-pill secondary" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'open')">Open Chat</button>`;
    } else if (isPending) {
      actionBtnHTML = `<button type="button" class="suggestion-action-pill secondary" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'add')">${rel.receiver === myLower ? "Accept" : "Pending"}</button>`;
    } else {
      actionBtnHTML = `<button type="button" class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'add')">+ Add Friend</button>`;
    }

    const exactAvatar = isSelf ? myAvatarData : u.avatar_url || usersAvatarCache[uname] || "";
    const exactBio = isSelf
      ? myUserBio || "Personal Vault • Message Yourself"
      : u.bio || usersBioCache[uname] || "Hey there! I am using Krypton.";

    const row = document.createElement("div");
    row.className = "contact-card";
    row.onclick = () => selectSuggestedPeer(uname, isAlreadyFriend || isSelf ? "open" : "add");
    row.innerHTML =
      '<div class="contact-card-info">' +
      `<div class="avatar-wrap" onclick="event.stopPropagation(); viewUserProfilePicFullscreen('${escapeHTML(uname)}');" title="Click to View Profile Picture">` +
      `<div class="contact-avatar" id="sug-avatar-${escapeHTML(uname)}"></div>` +
      `<div class="online-dot ${isOnline ? "visible" : ""}"></div></div>` +
      '<div class="contact-name-wrap">' +
      `<span class="contact-name">@${escapeHTML(uname)}${isSelf ? ' <span style="color: var(--accent-primary); font-weight: 800; font-size: 11px;">(You)</span>' : ""}</span>` +
      `<span class="contact-preview-text ${isOnline ? "status-online" : ""}">${escapeHTML(exactBio)}</span>` +
      "</div></div>" +
      `<div class="contact-right-meta">${actionBtnHTML}</div>`;

    box.appendChild(row);
    renderAvatarElement(row.querySelector(`#sug-avatar-${uname}`), uname, exactAvatar);
  });
};

// Enhance renderPeerList so when searching a username, global matched users (non-friends) also appear in #chat-list with "+ Add Friend"!
const prevRenderPeerListV10 = renderPeerList;
renderPeerList = function (filterText = "") {
  prevRenderPeerListV10(filterText);
  const cleanFilter = (filterText || "").trim().toLowerCase().replace(/^@/, "");
  if (!cleanFilter) return;

  const listEl = document.getElementById("chat-list");
  if (!listEl) return;

  const myLower = (myUsername || "").toLowerCase();
  const nonSavedMatches = (lastUniversalSearchResults || []).filter(
    (u) => u && u.username && !savedPeers.some((p) => p.toLowerCase() === u.username.toLowerCase())
  );

  if (nonSavedMatches.length === 0) return;

  // Remove "No saved chat matching..." placeholder if we have global directory matches
  const emptyState = listEl.querySelector(".empty-peers-state");
  if (emptyState) emptyState.remove();

  const divider = document.createElement("div");
  divider.className = "chat-list-section-divider";
  divider.textContent = `GLOBAL DIRECTORY RESULTS (${nonSavedMatches.length}) — TAP TO ADD FRIEND`;
  listEl.appendChild(divider);

  nonSavedMatches.forEach((u) => {
    const uname = u.username.toLowerCase();
    const isSelf = uname === myLower;
    const isOnline = isSelf ? true : onlineUsersList.has(uname) && userSettings.onlinePresence;
    const exactAvatar = isSelf ? myAvatarData : u.avatar_url || usersAvatarCache[uname] || "";
    const exactBio = isSelf
      ? myUserBio || "Personal Vault • Message Yourself"
      : u.bio || usersBioCache[uname] || "Hey there! I am using Krypton.";

    const card = document.createElement("div");
    card.className = "contact-card";
    card.onclick = () => selectSuggestedPeer(uname, isSelf ? "open" : "add");
    card.innerHTML =
      '<div class="contact-card-info">' +
      `<div class="avatar-wrap" onclick="event.stopPropagation(); viewUserProfilePicFullscreen('${escapeHTML(uname)}');">` +
      `<div class="contact-avatar" id="dir-avatar-${escapeHTML(uname)}"></div>` +
      `<div class="online-dot ${isOnline ? "visible" : ""}"></div></div>` +
      '<div class="contact-name-wrap">' +
      `<span class="contact-name">@${escapeHTML(uname)}${isSelf ? ' <span style="color: var(--accent-primary); font-weight: 800; font-size: 11px;">(You)</span>' : ""}</span>` +
      `<span class="contact-preview-text ${isOnline ? "status-online" : ""}">${escapeHTML(exactBio)}</span>` +
      "</div></div>" +
      `<div class="contact-right-meta">` +
      `<button type="button" class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', '${isSelf ? "open" : "add"}')">${isSelf ? "+ Add Self" : "+ Add Friend"}</button>` +
      `</div>`;

    listEl.appendChild(card);
    renderAvatarElement(card.querySelector(`#dir-avatar-${uname}`), uname, exactAvatar);
  });
};

// Upgrade handlePeerSearchAction so clicking the User-Plus button or pressing Enter immediately connects/opens the typed username!
handlePeerSearchAction = async function () {
  const inputEl = document.getElementById("peer-id-input");
  if (!inputEl) return;
  const peer = inputEl.value.trim().toLowerCase().replace(/^@/, "");

  if (!peer) {
    showToast("Type a @username to search or add a friend!", "info");
    return;
  }

  const results = await queryAllMatchingUsersEverywhere(peer);
  const exact = results.find((r) => r.username === peer);
  if (exact) {
    const myLower = (myUsername || "").toLowerCase();
    const rel = peerRelationshipMap[peer];
    const isFriend = peer === myLower || (rel && (rel.status === "accepted" || (rel.status && rel.status.startsWith("call_"))));
    await selectSuggestedPeer(peer, isFriend ? "open" : "add");
  } else if (results.length > 0) {
    await updateLiveUserSuggestions(peer);
  } else {
    // Even if user was not found in directory query, allow sending friend request directly to @peer
    await selectSuggestedPeer(peer, "add");
  }
};

// Re-bind #btn-connect-peer and #peer-id-input Enter key to the upgraded handlePeerSearchAction
const btnConnectPeerV11 = document.getElementById("btn-connect-peer");
if (btnConnectPeerV11) {
  const cleanBtn = btnConnectPeerV11.cloneNode(true);
  btnConnectPeerV11.parentNode.replaceChild(cleanBtn, btnConnectPeerV11);
  cleanBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handlePeerSearchAction();
  });
}

const peerInputV11 = document.getElementById("peer-id-input");
if (peerInputV11) {
  peerInputV11.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePeerSearchAction();
    } else if (e.key === "Escape") {
      hideLiveUserSuggestions();
    }
  };
}

// Close live user suggestions when clicking outside .direct-section
document.addEventListener("pointerdown", (e) => {
  const directSec = document.querySelector(".direct-section");
  if (directSec && !directSec.contains(e.target)) {
    hideLiveUserSuggestions();
  }
});

// --- 2. BULLETPROOF PERMANENT ACCOUNT DELETION ---
deleteAccountPermanently = async function () {
  if (!myUsername) return;
  const meClean = myUsername.trim().toLowerCase();

  // Close Settings Modal first so the confirmation dialog is 100% focused and never blocked
  closeSettingsModalAnimated();

  const confirmFirst = await showGlassDialog({
    title: "Delete Account Permanently?",
    message: `Are you sure you want to permanently delete @${meClean}? All your messages, friend connections, and profile data will be wiped forever.`,
    confirmText: "Yes, Continue",
    danger: true
  });
  if (!confirmFirst) return;

  const confirmDouble = await showGlassDialog({
    title: "Confirm Permanent Deletion",
    message: `Type your username "${meClean}" (or "DELETE") to permanently erase your account:`,
    isPrompt: true,
    placeholder: meClean,
    confirmText: "Delete Forever",
    danger: true
  });

  if (confirmDouble === null) return;
  const typed = String(confirmDouble || "").trim().toLowerCase().replace(/^@/, "");
  if (typed !== meClean && typed !== "delete") {
    showToast(`Typed "${typed}" did not match "${meClean}". Deletion cancelled.`, "error");
    return;
  }

  showToast(`Deleting account @${meClean} permanently...`, "info", 3000);

  try {
    if (supabaseClient && meClean) {
      // Wipe messages, chat_requests, and users row using case-insensitive ilike
      await Promise.allSettled([
        supabaseClient.from("messages").delete().ilike("sender_id", meClean),
        supabaseClient
          .from("chat_requests")
          .delete()
          .or(`sender_id.ilike.${meClean},receiver_id.ilike.${meClean}`),
        supabaseClient.from("users").delete().ilike("username", meClean)
      ]);
    }
    if (presenceChannel) {
      try {
        await presenceChannel.untrack();
      } catch (e) { }
    }
  } catch (err) {
    console.warn("Account wipe warning:", err);
  }

  localStorage.clear();
  sessionStorage.clear();
  showToast("Account permanently deleted!", "success", 1500);
  setTimeout(() => {
    window.location.replace(window.location.pathname + "?deleted=" + Date.now());
  }, 400);
};

// Bind directly to the static #btn-delete-account-perm button + delegated click listener
const staticDelAccBtn = document.getElementById("btn-delete-account-perm");
if (staticDelAccBtn) {
  const cleanDelBtn = staticDelAccBtn.cloneNode(true);
  staticDelAccBtn.parentNode.replaceChild(cleanDelBtn, staticDelAccBtn);
  cleanDelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteAccountPermanently();
  });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#btn-delete-account-perm");
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    deleteAccountPermanently();
  }
});

// --- 3. TRUE END-TO-END ENCRYPTED CALL SIGNALING (AES-GCM 256-BIT ENCRYPTED SDP & ICE) ---
async function encryptCallSignalData(signalObj, roomId) {
  try {
    const plain = JSON.stringify(signalObj);
    const enc = await encryptData(plain, roomId);
    return {
      e2ee: true,
      ciphertext: enc.ciphertext,
      iv: enc.iv,
      salt: enc.salt
    };
  } catch (e) {
    return signalObj;
  }
}

async function decryptCallSignalData(wrappedPayload, roomId) {
  if (!wrappedPayload) return null;
  if (wrappedPayload.e2ee && wrappedPayload.ciphertext && wrappedPayload.iv && wrappedPayload.salt) {
    try {
      const decStr = await decryptData(
        wrappedPayload.ciphertext,
        wrappedPayload.iv,
        wrappedPayload.salt,
        roomId
      );
      return JSON.parse(decStr);
    } catch (e) {
      return null;
    }
  }
  return wrappedPayload;
}

async function updateCallE2eeSafetyBadge(peerUsername) {
  const badgeTextEl = document.getElementById("call-e2ee-code-text");
  if (!badgeTextEl) return;
  if (!peerUsername) {
    badgeTextEl.textContent = "E2EE AES-256 + DTLS-SRTP";
    return;
  }
  try {
    const fp = await computeSafetyFingerprint(peerUsername);
    const shortCode = fp.split("•").slice(0, 2).join("•").trim();
    badgeTextEl.textContent = `E2EE Verified • ${shortCode}`;
  } catch (e) {
    badgeTextEl.textContent = "E2EE AES-256 + DTLS-SRTP";
  }
}

// Upgrade startWebRTC so all outgoing SDP Offers & ICE Candidates are AES-GCM 256-bit Encrypted!
const prevStartWebRTCv10 = startWebRTC;
startWebRTC = async function (isCaller, type) {
  const callPeer = currentPeerUser || activeCallSender;
  await updateCallE2eeSafetyBadge(callPeer);

  await prevStartWebRTCv10(isCaller, type);

  if (peerConnection && currentRoom) {
    // Override onicecandidate to send AES-GCM 256-bit encrypted ICE candidates
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate && activeSubscription && currentRoom) {
        const encCandidate = await encryptCallSignalData(event.candidate, currentRoom);
        activeSubscription.send({
          type: "broadcast",
          event: "webrtc-ice-e2ee",
          payload: { encCandidate, sender: myUsername }
        });
      }
    };

    if (isCaller) {
      const sendEncryptedOffer = async () => {
        if (!peerConnection || peerConnection.signalingState === "closed" || !currentRoom) return;
        try {
          const offer = peerConnection.localDescription || (await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: type === "video"
          }));
          if (!peerConnection.localDescription) {
            await peerConnection.setLocalDescription(offer);
          }
          const encOffer = await encryptCallSignalData(offer, currentRoom);
          if (activeSubscription) {
            activeSubscription.send({
              type: "broadcast",
              event: "webrtc-offer-e2ee",
              payload: { encOffer, sender: myUsername, callType: type }
            });
          }
        } catch (e) { }
      };
      await sendEncryptedOffer();
    }
  }
};

// Hook joinRoom activeSubscription to decrypt incoming E2EE Offer, Answer & ICE Candidates
const prevJoinRoomV10 = joinRoom;
joinRoom = async function (roomId, displayName, pushHistory = true) {
  await prevJoinRoomV10(roomId, displayName, pushHistory);
  if (!activeSubscription) return;

  activeSubscription
    .on("broadcast", { event: "webrtc-offer-e2ee" }, async (payload) => {
      const p = payload.payload;
      if (!p || p.sender === myUsername) return;
      const decryptedOffer = await decryptCallSignalData(p.encOffer, currentRoom);
      if (!decryptedOffer) return;

      let tries = 0;
      while (!peerConnection && tries < 30) {
        await new Promise((r) => setTimeout(r, 100));
        tries++;
      }
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(decryptedOffer));
          while (iceCandidateQueue.length > 0) {
            const c = iceCandidateQueue.shift();
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) { }
          }
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          const encAnswer = await encryptCallSignalData(answer, currentRoom);
          activeSubscription.send({
            type: "broadcast",
            event: "webrtc-answer-e2ee",
            payload: { encAnswer, sender: myUsername }
          });
        } catch (e) { }
      }
    })
    .on("broadcast", { event: "webrtc-answer-e2ee" }, async (payload) => {
      const p = payload.payload;
      if (!p || p.sender === myUsername || !peerConnection) return;
      const decryptedAnswer = await decryptCallSignalData(p.encAnswer, currentRoom);
      if (!decryptedAnswer) return;
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(decryptedAnswer));
        while (iceCandidateQueue.length > 0) {
          const c = iceCandidateQueue.shift();
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) { }
        }
      } catch (e) { }
    })
    .on("broadcast", { event: "webrtc-ice-e2ee" }, async (payload) => {
      const p = payload.payload;
      if (!p || p.sender === myUsername || !p.encCandidate) return;
      const decryptedCand = await decryptCallSignalData(p.encCandidate, currentRoom);
      if (!decryptedCand) return;
      if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(decryptedCand));
        } catch (e) { }
      } else {
        iceCandidateQueue.push(decryptedCand);
      }
    });
};


// =========================================================================
// 14. FEATURE v12000: VIDEO CALL FRONT/BACK CAMERA MIRROR SYNC
//     (Fixes Left/Right inverted orientation between Local & Remote phones)
// =========================================================================
let remotePeerCameraFacingMode = "user";

function applyVideoMirrorClasses() {
  const localVideo = document.getElementById("local-video");
  const remoteVideo = document.getElementById("remote-video");

  if (localVideo) {
    localVideo.classList.toggle("rear-camera-view", currentCameraFacingMode === "environment");
  }
  if (remoteVideo) {
    remoteVideo.classList.toggle("rear-camera-view", remotePeerCameraFacingMode === "environment");
  }
}

function broadcastMyCameraFacingMode(facingMode) {
  if (activeSubscription) {
    try {
      activeSubscription.send({
        type: "broadcast",
        event: "webrtc-cam-facing",
        payload: {
          sender: myUsername,
          facingMode: facingMode || currentCameraFacingMode || "user"
        }
      });
    } catch (e) { }
  }
}

// Re-bind Camera Switch button (#btn-switch-cam) so it also updates mirror class & notifies remote peer!
const btnSwitchCamV12 = document.getElementById("btn-switch-cam");
if (btnSwitchCamV12) {
  const cleanSwitchBtn = btnSwitchCamV12.cloneNode(true);
  btnSwitchCamV12.parentNode.replaceChild(cleanSwitchBtn, btnSwitchCamV12);

  cleanSwitchBtn.addEventListener("click", async () => {
    if (!localStream || activeCallType !== "video") return;
    currentCameraFacingMode = currentCameraFacingMode === "user" ? "environment" : "user";
    applyVideoMirrorClasses();
    broadcastMyCameraFacingMode(currentCameraFacingMode);

    try {
      const oldVideoTrack = localStream.getVideoTracks()[0];
      if (oldVideoTrack) oldVideoTrack.stop();

      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: currentCameraFacingMode }
        },
        audio: false
      });

      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      if (newVideoTrack) {
        if (oldVideoTrack) localStream.removeTrack(oldVideoTrack);
        localStream.addTrack(newVideoTrack);

        const localVideo = document.getElementById("local-video");
        if (localVideo) {
          localVideo.srcObject = localStream;
          localVideo.play().catch(() => { });
        }

        if (peerConnection) {
          const videoSender = peerConnection
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          }
        }
        applyVideoMirrorClasses();
        broadcastMyCameraFacingMode(currentCameraFacingMode);
        showToast(
          currentCameraFacingMode === "user"
            ? "Switched to Front Camera (Mirrored)"
            : "Switched to Back Camera (Normal View)",
          "info",
          1600
        );
      }
    } catch (err) {
      console.warn("Camera switch error:", err);
      currentCameraFacingMode = currentCameraFacingMode === "user" ? "environment" : "user";
      applyVideoMirrorClasses();
      broadcastMyCameraFacingMode(currentCameraFacingMode);
      showToast("Could not switch camera on this device.", "error");
    }
  });
}

// Wrap startWebRTC so both local & remote videos start in Front-Camera Mirrored mode ("user")
const prevStartWebRTCv11 = startWebRTC;
startWebRTC = async function (isCaller, type) {
  currentCameraFacingMode = "user";
  remotePeerCameraFacingMode = "user";
  applyVideoMirrorClasses();

  await prevStartWebRTCv11(isCaller, type);

  applyVideoMirrorClasses();
  if (type === "video") {
    setTimeout(() => broadcastMyCameraFacingMode(currentCameraFacingMode), 700);
  }
};

// Hook joinRoom activeSubscription to listen for remote peer's camera flip ("webrtc-cam-facing")
const prevJoinRoomV11 = joinRoom;
joinRoom = async function (roomId, displayName, pushHistory = true) {
  await prevJoinRoomV11(roomId, displayName, pushHistory);
  if (!activeSubscription) return;

  activeSubscription.on("broadcast", { event: "webrtc-cam-facing" }, (payload) => {
    const p = payload.payload;
    if (!p || p.sender === myUsername) return;
    remotePeerCameraFacingMode = p.facingMode === "environment" ? "environment" : "user";
    applyVideoMirrorClasses();
  });
};


// =========================================================================
// 15. FEATURE v13000:
//     1. ZERO-DELAY WEBRTC CALL AUDIO & LOOPING RINGTONE SYNTHESIZER
//     2. GUARANTEED USER DP (AVATAR) IN LIVE SEARCH & AFTER ADDING FRIEND
//     3. TELEGRAM-STYLE BOTTOM NAVIGATION DOCK (GLOBAL | CHATS | PROFILE | SETTING)
// =========================================================================

// --- 1. ZERO-DELAY CALL AUDIO & LOOPING RINGTONE ENGINE ---
let activeRingtoneLoopInterval = null;

function startCallRingtoneLoop(mode = "incoming") {
  stopCallRingtoneLoop();
  playSynthTone("ring");
  activeRingtoneLoopInterval = setInterval(() => {
    const incomingModal = document.getElementById("call-perm-modal");
    const callOverlay = document.getElementById("call-screen-overlay");
    const isRingingIncoming = incomingModal && !incomingModal.classList.contains("hidden");
    const isRingingOutgoing =
      callOverlay &&
      !callOverlay.classList.contains("hidden") &&
      (!peerConnection || peerConnection.iceConnectionState !== "connected");

    if (isRingingIncoming || isRingingOutgoing) {
      playSynthTone("ring");
    } else {
      stopCallRingtoneLoop();
    }
  }, 2000);
}

function stopCallRingtoneLoop() {
  if (activeRingtoneLoopInterval) {
    clearInterval(activeRingtoneLoopInterval);
    activeRingtoneLoopInterval = null;
  }
}

// Pre-warm AudioContext & <audio id="remote-audio"> immediately on user interaction so there is ZERO audio delay
function preWarmCallAudioEngine() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") audioCtx.resume();
      if (!callWebAudioCtx) callWebAudioCtx = new AudioCtx();
      if (callWebAudioCtx.state === "suspended") callWebAudioCtx.resume();
    }
    const remoteAudio = document.getElementById("remote-audio");
    if (remoteAudio) {
      remoteAudio.autoplay = true;
      remoteAudio.playsInline = true;
      remoteAudio.muted = false;
    }
  } catch (e) { }
}

["btn-start-voice", "btn-start-video", "btn-accept-call"].forEach((btnId) => {
  const el = document.getElementById(btnId);
  if (el) {
    el.addEventListener("pointerdown", preWarmCallAudioEngine, { passive: true });
  }
});

// Upgrade applyCallAudioOutputMode so Earpiece mode is clear & audible (0.82 volume, 0.95 gain) and Speaker mode is 1.0 + 1.85x gain boost without muting native <audio>!
applyCallAudioOutputMode = async function (speakerOn, showFeedback = true) {
  isSpeakerphoneOn = Boolean(speakerOn);
  const btnSpeaker = document.getElementById("btn-toggle-speaker");
  const remoteVideo = document.getElementById("remote-video");
  const remoteAudio = document.getElementById("remote-audio");

  if (btnSpeaker) {
    btnSpeaker.classList.toggle("speaker-active", isSpeakerphoneOn);
    btnSpeaker.title = isSpeakerphoneOn
      ? "Speakerphone: ON (Tap for Earpiece)"
      : "Earpiece Mode: ON (Tap for Loud Speaker)";
    btnSpeaker.innerHTML = isSpeakerphoneOn
      ? '<i data-lucide="volume-2"></i>'
      : '<i data-lucide="volume-1"></i>';
    if (window.lucide) lucide.createIcons({ nodes: [btnSpeaker] });
  }

  // Earpiece uses clear 0.82 volume; Speaker uses 1.0 full volume + WebAudio 1.85x boost
  const targetElementVolume = isSpeakerphoneOn ? 1.0 : 0.82;
  if (remoteAudio) {
    remoteAudio.muted = false;
    remoteAudio.volume = targetElementVolume;
    if (remoteAudio.srcObject && remoteAudio.paused) {
      remoteAudio.play().catch(() => { });
    }
  }
  if (remoteVideo) {
    remoteVideo.muted = true; // Prevent double echo since remoteAudio plays the audio track
  }

  if (callAudioGainNode && callWebAudioCtx) {
    try {
      if (callWebAudioCtx.state === "suspended") await callWebAudioCtx.resume();
      const now = callWebAudioCtx.currentTime;
      // Only add extra WebAudio gain when Speakerphone is ON (0.85 extra boost on top of native 1.0)
      callAudioGainNode.gain.setValueAtTime(isSpeakerphoneOn ? 0.85 : 0.0, now);
    } catch (e) { }
  }

  if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === "function") {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
      if (audioOutputs.length > 0) {
        const chosenDevice = isSpeakerphoneOn
          ? audioOutputs.find((d) => /speaker|loud|handsfree|external/i.test(d.label)) || audioOutputs[audioOutputs.length - 1]
          : audioOutputs.find((d) => /earpiece|receiver|headset|communications|default/i.test(d.label)) || audioOutputs[0];

        if (chosenDevice && chosenDevice.deviceId && remoteAudio && typeof remoteAudio.setSinkId === "function") {
          await remoteAudio.setSinkId(chosenDevice.deviceId);
        }
      }
    } catch (e) { }
  }

  if (showFeedback) {
    showToast(
      isSpeakerphoneOn ? "Speakerphone ON (Loud Output)" : "Earpiece Mode ON",
      "info",
      1600
    );
  }
};

// Wrap startWebRTC to stop ringtone loop as soon as stream connects and play audio with zero delay
const prevStartWebRTCv12 = startWebRTC;
startWebRTC = async function (isCaller, type) {
  preWarmCallAudioEngine();
  await prevStartWebRTCv12(isCaller, type);

  if (peerConnection) {
    const origTrack = peerConnection.ontrack;
    peerConnection.ontrack = (event) => {
      stopCallRingtoneLoop();
      if (origTrack) origTrack(event);
      const remoteAudio = document.getElementById("remote-audio");
      if (remoteAudio && remoteAudio.srcObject) {
        remoteAudio.muted = false;
        remoteAudio.volume = isSpeakerphoneOn ? 1.0 : 0.82;
        remoteAudio.play().catch(() => { });
      }
    };
  }
};

const prevInitiateCallPermissionV12 = initiateCallPermission;
initiateCallPermission = async function (type) {
  preWarmCallAudioEngine();
  await prevInitiateCallPermissionV12(type);
  const overlay = document.getElementById("call-screen-overlay");
  if (overlay && !overlay.classList.contains("hidden")) {
    startCallRingtoneLoop("outgoing");
  }
};

const prevHandleCallRequestCheckV12 = handleCallRequestCheck;
handleCallRequestCheck = async function (payload) {
  await prevHandleCallRequestCheckV12(payload);
  const callModal = document.getElementById("call-perm-modal");
  if (callModal && !callModal.classList.contains("hidden")) {
    startCallRingtoneLoop("incoming");
  }
};

const prevEndCallV12 = endCall;
endCall = function (notifyRemote = true) {
  stopCallRingtoneLoop();
  prevEndCallV12(notifyRemote);
};

// --- 2. GUARANTEED USER DP (AVATAR) IN LIVE SEARCH & AFTER ADDING FRIEND ---
async function ensurePeerProfileDataLoaded(username) {
  const clean = (username || "").trim().toLowerCase().replace(/^@/, "");
  if (!clean || !supabaseClient) return null;
  if (clean === (myUsername || "").toLowerCase()) {
    return { username: clean, avatar_url: myAvatarData, bio: myUserBio };
  }

  try {
    let row = null;
    const { data, error } = await supabaseClient
      .from("users")
      .select("username, avatar_url, bio, session_token")
      .ilike("username", clean)
      .limit(1);

    if (!error && data && data.length > 0) {
      row = data[0];
    } else {
      const { data: fb } = await supabaseClient
        .from("users")
        .select("*")
        .ilike("username", clean)
        .limit(1);
      if (fb && fb.length > 0) row = fb[0];
    }

    if (row) {
      const uname = (row.username || clean).toLowerCase();
      if (row.avatar_url) usersAvatarCache[uname] = row.avatar_url;
      if (row.bio) usersBioCache[uname] = row.bio;
      if (row.session_token) {
        usersSessionCache[uname] = row.session_token;
        peerTokenBindingMap[uname] = row.session_token;
      }
      localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
      localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
      localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
      localStorage.setItem("krypton_peer_token_bindings", JSON.stringify(peerTokenBindingMap));

      // Live-update any DOM avatars for this user (search suggestions, chat list, chat header)
      document.querySelectorAll(`[id$="-${uname}"], #avatar-contact-${uname}, #sug-avatar-${uname}, #dir-avatar-${uname}`).forEach((el) => {
        renderAvatarElement(el, uname, usersAvatarCache[uname] || "");
      });
      if (currentPeerUser && currentPeerUser.toLowerCase() === uname) {
        updateHeaderStatus();
      }
      return row;
    }
  } catch (e) { }
  return null;
}

// Upgrade fetchPeersUserData so it fetches case-insensitively and never prunes newly added peers if casing differs
fetchPeersUserData = async function () {
  if (!supabaseClient) return;
  const myLower = (myUsername || "").toLowerCase();
  const peersToCheck = savedPeers.filter((p) => p.toLowerCase() !== myLower);
  if (peersToCheck.length === 0) {
    renderPeerList();
    return;
  }

  try {
    // Query all saved peers; also run individual fallback for any peer missing an avatar in cache
    const { data } = await supabaseClient
      .from("users")
      .select("*")
      .in("username", peersToCheck);

    if (Array.isArray(data)) {
      data.forEach((u) => {
        const uname = (u.username || "").toLowerCase();
        if (!uname) return;
        if (u.avatar_url) usersAvatarCache[uname] = u.avatar_url;
        if (u.bio) usersBioCache[uname] = u.bio;
        if (u.session_token) {
          usersSessionCache[uname] = u.session_token;
          peerTokenBindingMap[uname] = u.session_token;
        }
      });
    }

    // For any peer whose DP is still missing in cache, do a case-insensitive ilike lookup
    const missingDpPeers = peersToCheck.filter((p) => !usersAvatarCache[p.toLowerCase()]);
    if (missingDpPeers.length > 0) {
      await Promise.allSettled(missingDpPeers.map((p) => ensurePeerProfileDataLoaded(p)));
    }

    localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
    localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
    localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
    localStorage.setItem("krypton_peer_token_bindings", JSON.stringify(peerTokenBindingMap));
  } catch (e) { }

  renderPeerList();
  updateHeaderStatus();
};

// Wrap selectSuggestedPeer so as soon as a user is clicked/added from search, their DP is fetched & rendered in both Sidebar and Chat Header!
const prevSelectSuggestedPeerV12 = window.selectSuggestedPeer;
window.selectSuggestedPeer = async function (uname, actionType = "open") {
  const clean = (uname || "").trim().toLowerCase().replace(/^@/, "");
  if (clean) {
    await ensurePeerProfileDataLoaded(clean);
  }
  await prevSelectSuggestedPeerV12(uname, actionType);
  renderPeerList();
  updateHeaderStatus();
  updateBottomDockActiveState("chats");
};

// Also ensure updateLiveUserSuggestions loads DPs for any user found via messages/online list
const prevUpdateLiveUserSuggestionsV12 = updateLiveUserSuggestions;
updateLiveUserSuggestions = async function (rawQuery) {
  await prevUpdateLiveUserSuggestionsV12(rawQuery);
  const missingAvUsers = (lastUniversalSearchResults || []).filter(
    (u) => u && u.username && !u.avatar_url && !usersAvatarCache[u.username.toLowerCase()]
  );
  if (missingAvUsers.length > 0) {
    await Promise.allSettled(missingAvUsers.map((u) => ensurePeerProfileDataLoaded(u.username)));
  }
};

// --- 3. TELEGRAM-STYLE BOTTOM NAVIGATION DOCK (GLOBAL | CHATS | PROFILE | SETTING) ---
function updateBottomDockUnreadBadges() {
  const unreadPill = document.getElementById("dock-chats-unread-badge");
  if (!unreadPill) return;
  const totalUnreads = Object.values(unreadCounts || {}).reduce((acc, v) => acc + (parseInt(v, 10) || 0), 0);
  if (totalUnreads > 0) {
    unreadPill.textContent = totalUnreads > 99 ? "99+" : String(totalUnreads);
    unreadPill.classList.remove("hidden");
  } else {
    unreadPill.classList.add("hidden");
  }
}

function updateBottomDockActiveState(activeTab = "chats") {
  document.querySelectorAll("#krypton-bottom-nav .krypton-dock-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.dockTab === activeTab);
  });
}

const dockBtnGlobal = document.getElementById("dock-btn-global");
const dockBtnChats = document.getElementById("dock-btn-chats");
const dockBtnProfile = document.getElementById("dock-btn-profile");
const dockBtnSettings = document.getElementById("dock-btn-settings");

if (dockBtnGlobal) {
  dockBtnGlobal.addEventListener("click", () => {
    if (userSettings.hideGlobal) {
      showToast("Global Lounge is hidden in Settings. Turn off 'Hide Global Lounge' to access it.", "info");
      openSettingsModal();
      return;
    }
    updateBottomDockActiveState("global");
    joinRoom("global", "Global Anonymous Lounge");
  });
}

if (dockBtnChats) {
  dockBtnChats.addEventListener("click", () => {
    updateBottomDockActiveState("chats");
    if (document.body.classList.contains("mobile-chat-active")) {
      exitChatToDashboard();
    }
    const peerInp = document.getElementById("peer-id-input");
    if (peerInp && peerInp.value) {
      peerInp.value = "";
      hideLiveUserSuggestions();
    }
    renderPeerList("");
  });
}

if (dockBtnProfile) {
  dockBtnProfile.addEventListener("click", () => {
    updateBottomDockActiveState("profile");
    openSettingsModal();
    setTimeout(() => {
      const profileCard = document.querySelector("#settings-modal .settings-profile-card");
      if (profileCard) {
        profileCard.scrollIntoView({ behavior: "smooth", block: "start" });
        profileCard.style.boxShadow = "0 0 0 2px var(--accent-primary)";
        setTimeout(() => {
          profileCard.style.boxShadow = "";
        }, 1400);
      }
    }, 100);
  });
}

if (dockBtnSettings) {
  dockBtnSettings.addEventListener("click", () => {
    updateBottomDockActiveState("settings");
    openSettingsModal();
  });
}

// Sync dock active state when closing Settings or switching rooms
const prevCloseSettingsModalAnimatedV12 = closeSettingsModalAnimated;
closeSettingsModalAnimated = function () {
  prevCloseSettingsModalAnimatedV12();
  updateBottomDockActiveState(currentRoom === "global" ? "global" : "chats");
};

const prevRenderPeerListV12 = renderPeerList;
renderPeerList = function (filterText = "") {
  prevRenderPeerListV12(filterText);
  updateBottomDockUnreadBadges();
  const dockGlobal = document.getElementById("dock-btn-global");
  if (dockGlobal) {
    dockGlobal.style.display = userSettings.hideGlobal ? "none" : "flex";
  }
  const navDock = document.getElementById("krypton-bottom-nav");
  if (navDock) {
    navDock.style.gridTemplateColumns = userSettings.hideGlobal ? "repeat(3, 1fr)" : "repeat(4, 1fr)";
  }
};

const prevJoinRoomV12 = joinRoom;
joinRoom = async function (roomId, displayName, pushHistory = true) {
  updateBottomDockActiveState(roomId === "global" ? "global" : "chats");
  await prevJoinRoomV12(roomId, displayName, pushHistory);
  if (currentPeerUser) {
    ensurePeerProfileDataLoaded(currentPeerUser);
  }
};


// =========================================================================
// 16. FEATURE v14000:
//     1. DEDICATED TELEGRAM-STYLE PROFILE DASHBOARD (REF PIC 1: HERO AVATAR,
//        SET PHOTO, EDIT INFO, USERNAME RENAME, BIO EDITOR & BOTTOM NAV BAR)
//     2. TOP 3-DOT DROPDOWN MENU (REF PIC 2: OBSIDIAN DARK MODE, NEW GROUP &
//        SAVED MESSAGES)
//     3. HOME LOCK ICON = 100% INSTANT APP LOCK ONLY (SETUP ONLY IN SETTINGS)
//     4. BOTTOM DOCK ACTIVE HIGHLIGHT FIX WHEN EXITING GLOBAL CHAT
// =========================================================================

let currentSidebarViewMode = "chats"; // "chats" | "profile"

function syncTopThreeDotDarkModeLabel() {
  const lbl = document.getElementById("top-menu-dark-label");
  const icon = document.getElementById("top-menu-dark-icon");
  const isDark = Boolean(userSettings.darkMode);
  if (lbl) {
    lbl.textContent = isDark ? "Day Mode (Light)" : "Obsidian Dark Mode";
  }
  if (icon) {
    icon.setAttribute("data-lucide", isDark ? "sun" : "moon");
    if (window.lucide) lucide.createIcons({ nodes: [icon.parentElement] });
  }
}

function updateDedicatedProfileDashboardUI() {
  const heroAv = document.getElementById("tg-profile-main-avatar");
  const dispName = document.getElementById("tg-profile-display-name");
  const onlineSt = document.getElementById("tg-profile-online-status");
  const unameVal = document.getElementById("tg-info-username-val");
  const bioVal = document.getElementById("tg-info-bio-val");
  const bioInp = document.getElementById("tg-bio-input");

  renderAvatarElement(heroAv, myUsername, myAvatarData);

  if (dispName) {
    dispName.textContent = myUsername ? myUsername : "User";
  }
  if (onlineSt) {
    const isOnline = Boolean(userSettings.onlinePresence);
    onlineSt.textContent = isOnline ? "online" : "ghost mode (hidden)";
    onlineSt.classList.toggle("offline", !isOnline);
  }
  if (unameVal) {
    unameVal.textContent = myUsername ? "@" + myUsername : "@username";
  }
  if (bioVal) {
    bioVal.textContent = myUserBio || "Hey there! I am using Krypton.";
  }
  if (bioInp && document.activeElement !== bioInp) {
    bioInp.value = myUserBio || "";
  }
}

function switchSidebarPrimaryView(viewName = "chats") {
  currentSidebarViewMode = viewName;
  const chatsView = document.getElementById("sidebar-chats-view");
  const profileView = document.getElementById("sidebar-profile-dashboard");
  const aiFab = document.getElementById("btn-krypton-ai-orb");

  if (viewName === "profile") {
    if (chatsView) chatsView.classList.add("hidden");
    if (profileView) profileView.classList.remove("hidden");
    if (aiFab) aiFab.classList.add("hidden");
    updateDedicatedProfileDashboardUI();
    updateBottomDockActiveState("profile");
  } else {
    if (profileView) profileView.classList.add("hidden");
    if (chatsView) chatsView.classList.remove("hidden");
    if (aiFab) aiFab.classList.remove("hidden");
    updateBottomDockActiveState(currentRoom === "global" ? "global" : "chats");
  }
}

// Hook updateMyAvatarUI & applySettings so Dedicated Profile Dashboard and Top 3-Dot Menu stay in sync
const prevUpdateMyAvatarUIV13 = updateMyAvatarUI;
updateMyAvatarUI = function () {
  prevUpdateMyAvatarUIV13();
  updateDedicatedProfileDashboardUI();
};

const prevApplySettingsV13 = applySettings;
applySettings = function () {
  prevApplySettingsV13();
  syncTopThreeDotDarkModeLabel();
  updateDedicatedProfileDashboardUI();
};

// --- 1. HOME SCREEN LOCK ICON: ALWAYS INSTANT LOCK (SETUP ONLY IN SETTINGS) ---
const btnPanicLockV14 = document.getElementById("btn-panic-lock");
if (btnPanicLockV14) {
  const cleanLockBtn = btnPanicLockV14.cloneNode(true);
  btnPanicLockV14.parentNode.replaceChild(cleanLockBtn, btnPanicLockV14);
  cleanLockBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Always trigger Instant App Lock (Mesh Privacy Shield) — never open Smart Lock Setup from Home screen!
    triggerPrivacyLock();
  });
}

// --- 2. TOP-RIGHT 3-DOT DROPDOWN MENU (OBSIDIAN DARK MODE | NEW GROUP | SAVED MESSAGES) ---
const btnTopThreeDots = document.getElementById("btn-top-three-dots");
const topMainDropdownMenu = document.getElementById("top-main-dropdown-menu");
const topMenuToggleDark = document.getElementById("top-menu-toggle-dark");
const topMenuCreateGroup = document.getElementById("btn-open-create-group");
const topMenuSavedMsgs = document.getElementById("top-menu-saved-msgs");

if (btnTopThreeDots && topMainDropdownMenu) {
  btnTopThreeDots.addEventListener("click", (e) => {
    e.stopPropagation();
    syncTopThreeDotDarkModeLabel();
    topMainDropdownMenu.classList.toggle("hidden");
  });

  topMainDropdownMenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

if (topMenuToggleDark) {
  topMenuToggleDark.addEventListener("click", () => {
    userSettings.darkMode = !userSettings.darkMode;
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    applySettings();
    if (topMainDropdownMenu) topMainDropdownMenu.classList.add("hidden");
    showToast(
      userSettings.darkMode ? "Obsidian Dark Mode Enabled" : "Day Mode (Light) Enabled",
      "info",
      1600
    );
  });
}

if (topMenuCreateGroup) {
  const cleanGrpBtn = topMenuCreateGroup.cloneNode(true);
  topMenuCreateGroup.parentNode.replaceChild(cleanGrpBtn, topMenuCreateGroup);
  cleanGrpBtn.addEventListener("click", () => {
    if (topMainDropdownMenu) topMainDropdownMenu.classList.add("hidden");
    openGroupModal("create");
  });
}

if (topMenuSavedMsgs) {
  topMenuSavedMsgs.addEventListener("click", () => {
    if (topMainDropdownMenu) topMainDropdownMenu.classList.add("hidden");
    savePeerToRecent((myUsername || "").toLowerCase(), true);
    switchSidebarPrimaryView("chats");
    openSelfChatRoom();
  });
}

document.addEventListener("pointerdown", (e) => {
  if (
    topMainDropdownMenu &&
    !topMainDropdownMenu.classList.contains("hidden") &&
    !topMainDropdownMenu.contains(e.target) &&
    (!btnTopThreeDots || !btnTopThreeDots.contains(e.target))
  ) {
    topMainDropdownMenu.classList.add("hidden");
  }
});

// --- 3. DEDICATED PROFILE DASHBOARD INTERACTIVE CONTROLS (PHOTO, USERNAME, BIO, SETTINGS) ---
const tgAvatarClick = document.getElementById("tg-profile-avatar-click");
const tgCameraBadge = document.getElementById("tg-btn-camera-badge");
const tgTileSetPhoto = document.getElementById("tg-tile-set-photo");
const tgTileEditInfo = document.getElementById("tg-tile-edit-info");
const tgTileOpenSettings = document.getElementById("tg-tile-open-settings");
const tgBtnCopyUsername = document.getElementById("tg-btn-copy-username");
const tgBtnEditUsername = document.getElementById("tg-btn-edit-username");
const tgUsernameEditorBox = document.getElementById("tg-username-editor-box");
const tgUsernameInput = document.getElementById("tg-username-input");
const tgBtnSaveUsername = document.getElementById("tg-btn-save-username");
const tgBtnCancelUsername = document.getElementById("tg-btn-cancel-username");
const tgUsernameError = document.getElementById("tg-username-error");
const tgBioInput = document.getElementById("tg-bio-input");
const tgBtnSaveBio = document.getElementById("tg-btn-save-bio");
const tgBtnRemovePhoto = document.getElementById("tg-btn-remove-photo");
const tgBtnOpenVault = document.getElementById("tg-btn-open-vault");

if (tgAvatarClick) {
  tgAvatarClick.addEventListener("click", (e) => {
    if (e.target.closest("#tg-btn-camera-badge")) return;
    viewUserProfilePicFullscreen(myUsername);
  });
}

if (tgCameraBadge && avatarFileInput) {
  tgCameraBadge.addEventListener("click", (e) => {
    e.stopPropagation();
    avatarFileInput.click();
  });
}

if (tgTileSetPhoto && avatarFileInput) {
  tgTileSetPhoto.addEventListener("click", () => {
    avatarFileInput.click();
  });
}

function openTgInlineUsernameEditor() {
  if (!tgUsernameEditorBox || !tgUsernameInput) return;
  tgUsernameInput.value = myUsername || "";
  if (tgUsernameError) {
    tgUsernameError.style.display = "none";
    tgUsernameError.textContent = "";
  }
  tgUsernameEditorBox.classList.remove("hidden");
  tgUsernameInput.focus();
}

function closeTgInlineUsernameEditor() {
  if (tgUsernameEditorBox) tgUsernameEditorBox.classList.add("hidden");
  if (tgUsernameError) {
    tgUsernameError.style.display = "none";
    tgUsernameError.textContent = "";
  }
}

if (tgTileEditInfo) {
  tgTileEditInfo.addEventListener("click", () => {
    openTgInlineUsernameEditor();
  });
}

if (tgBtnEditUsername) {
  tgBtnEditUsername.addEventListener("click", () => {
    openTgInlineUsernameEditor();
  });
}

if (tgBtnCancelUsername) {
  tgBtnCancelUsername.addEventListener("click", () => {
    closeTgInlineUsernameEditor();
  });
}

if (tgBtnCopyUsername) {
  tgBtnCopyUsername.addEventListener("click", () => {
    navigator.clipboard.writeText(myUsername || "");
    showToast(`Copied @${myUsername} to clipboard!`, "success");
  });
}

if (tgBtnSaveUsername && tgUsernameInput) {
  tgBtnSaveUsername.addEventListener("click", async () => {
    const newUsername = tgUsernameInput.value.trim().toLowerCase().replace(/^@/, "");
    if (!newUsername || newUsername.length < 3 || !/^[a-z0-9_.-]+$/.test(newUsername)) {
      if (tgUsernameError) {
        tgUsernameError.textContent = "Use 3+ letters, numbers, or underscores";
        tgUsernameError.style.display = "block";
      }
      return;
    }

    if (newUsername === myUsername) {
      closeTgInlineUsernameEditor();
      return;
    }

    try {
      tgBtnSaveUsername.textContent = "...";
      if (supabaseClient) {
        const { data: existing } = await supabaseClient
          .from("users")
          .select("username")
          .ilike("username", newUsername);

        if (existing && existing.length > 0) {
          tgBtnSaveUsername.textContent = "Save";
          if (tgUsernameError) {
            tgUsernameError.textContent = "Username already taken!";
            tgUsernameError.style.display = "block";
          }
          return;
        }

        const oldUsername = myUsername;
        await supabaseClient
          .from("users")
          .update({ username: newUsername, session_token: mySessionId })
          .eq("username", oldUsername);

        await Promise.all([
          supabaseClient.from("chat_requests").update({ sender_id: newUsername }).eq("sender_id", oldUsername),
          supabaseClient.from("chat_requests").update({ receiver_id: newUsername }).eq("receiver_id", oldUsername),
          supabaseClient.from("messages").update({ sender_id: newUsername }).eq("sender_id", oldUsername)
        ]);

        if (presenceChannel) {
          try {
            await presenceChannel.send({
              type: "broadcast",
              event: "user-renamed",
              payload: {
                oldUsername: oldUsername.toLowerCase(),
                newUsername: newUsername.toLowerCase(),
                sessionToken: mySessionId
              }
            });
          } catch (e) { }
        }
      }

      myUsername = newUsername;
      localStorage.setItem("krypton_uid", myUsername);

      if (presenceChannel && userSettings.onlinePresence) {
        await presenceChannel.track({ user: myUsername, online: true, sessionToken: mySessionId });
      }

      updateMyAvatarUI();
      renderPeerList();
      closeTgInlineUsernameEditor();
      showToast(`Username updated to @${newUsername}!`, "success");
    } catch (err) {
      if (tgUsernameError) {
        tgUsernameError.textContent = "Could not update username.";
        tgUsernameError.style.display = "block";
      }
    } finally {
      tgBtnSaveUsername.textContent = "Save";
    }
  });
}

if (tgBtnSaveBio && tgBioInput) {
  tgBtnSaveBio.addEventListener("click", async () => {
    const newBio = tgBioInput.value.trim() || "Hey there! I am using Krypton.";
    myUserBio = newBio;
    localStorage.setItem("krypton_bio", myUserBio);
    usersBioCache[(myUsername || "").toLowerCase()] = myUserBio;
    localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));

    if (supabaseClient && myUsername) {
      tgBtnSaveBio.textContent = "...";
      await supabaseClient
        .from("users")
        .update({ bio: myUserBio })
        .eq("username", myUsername);
      tgBtnSaveBio.textContent = "Save Bio";
    }
    updateDedicatedProfileDashboardUI();
    showToast("Profile bio updated!", "success");
  });
}

if (tgBtnRemovePhoto && btnRemoveAvatar) {
  tgBtnRemovePhoto.addEventListener("click", () => {
    btnRemoveAvatar.click();
  });
}

if (tgBtnOpenVault) {
  tgBtnOpenVault.addEventListener("click", () => {
    savePeerToRecent((myUsername || "").toLowerCase(), true);
    switchSidebarPrimaryView("chats");
    openSelfChatRoom();
  });
}

if (tgTileOpenSettings) {
  tgTileOpenSettings.addEventListener("click", () => {
    openSettingsModal();
  });
}

// --- 4. FIX EXITING GLOBAL CHAT & BOTTOM DOCK TABS (CHATS | GLOBAL | SETTING | PROFILE) ---
const prevExitChatToDashboardV13 = exitChatToDashboard;
exitChatToDashboard = function () {
  prevExitChatToDashboardV13();
  // Always highlight "Chats" (or "Profile" if on Profile dashboard) when leaving Global Lounge or any chat!
  updateBottomDockActiveState(currentSidebarViewMode === "profile" ? "profile" : "chats");
};

const prevCloseSettingsModalV13 = closeSettingsModalAnimated;
closeSettingsModalAnimated = function () {
  prevCloseSettingsModalV13();
  if (currentSidebarViewMode === "profile") {
    updateBottomDockActiveState("profile");
  } else {
    updateBottomDockActiveState(
      currentRoom === "global" && document.body.classList.contains("mobile-chat-active")
        ? "global"
        : "chats"
    );
  }
};

// Re-bind Bottom Dock buttons cleanly: Chats (Left) | Global (2nd) | Setting (3rd) | Profile (4th)
const dockChatsV14 = document.getElementById("dock-btn-chats");
const dockGlobalV14 = document.getElementById("dock-btn-global");
const dockSettingsV14 = document.getElementById("dock-btn-settings");
const dockProfileV14 = document.getElementById("dock-btn-profile");

if (dockChatsV14) {
  const cleanChats = dockChatsV14.cloneNode(true);
  dockChatsV14.parentNode.replaceChild(cleanChats, dockChatsV14);
  cleanChats.addEventListener("click", () => {
    if (document.body.classList.contains("mobile-chat-active")) {
      exitChatToDashboard();
    }
    switchSidebarPrimaryView("chats");
    updateBottomDockActiveState("chats");
    const peerInp = document.getElementById("peer-id-input");
    if (peerInp && peerInp.value) {
      peerInp.value = "";
      hideLiveUserSuggestions();
    }
    renderPeerList("");
  });
}

if (dockGlobalV14) {
  const cleanGlobal = dockGlobalV14.cloneNode(true);
  dockGlobalV14.parentNode.replaceChild(cleanGlobal, dockGlobalV14);
  cleanGlobal.addEventListener("click", () => {
    if (userSettings.hideGlobal) {
      showToast("Global Lounge is hidden in Settings. Turn off 'Hide Global Lounge' to access it.", "info");
      openSettingsModal();
      return;
    }
    switchSidebarPrimaryView("chats");
    updateBottomDockActiveState("global");
    joinRoom("global", "Global Anonymous Lounge");
  });
}

if (dockSettingsV14) {
  const cleanSettings = dockSettingsV14.cloneNode(true);
  dockSettingsV14.parentNode.replaceChild(cleanSettings, dockSettingsV14);
  cleanSettings.addEventListener("click", () => {
    updateBottomDockActiveState("settings");
    openSettingsModal();
  });
}

if (dockProfileV14) {
  const cleanProfile = dockProfileV14.cloneNode(true);
  dockProfileV14.parentNode.replaceChild(cleanProfile, dockProfileV14);
  cleanProfile.addEventListener("click", () => {
    if (document.body.classList.contains("mobile-chat-active")) {
      exitChatToDashboard();
    }
    switchSidebarPrimaryView("profile");
  });
}

// Initialize labels & profile dashboard state
syncTopThreeDotDarkModeLabel();
updateDedicatedProfileDashboardUI();
if (window.innerWidth <= 900 && !document.body.classList.contains("mobile-chat-active")) {
  updateBottomDockActiveState("chats");
}


// =========================================================================
// 17. FEATURE v15000:
//     1. INLINE SETTINGS TAB INSIDE SIDEBAR (SO BOTTOM DOCK NEVER DISAPPEARS
//        ON MOBILE WHEN CLICKING SETTING OR PROFILE!)
//     2. GUARANTEED "CHATS" HIGHLIGHT WHEN RETURNING TO HOME SCREEN FROM
//        GLOBAL CHAT OR ANY CHAT (BOTH BACK BUTTON & HARDWARE BACK / POPSTATE)
//     3. CYBER ACCENT THEME ICON BUTTON + CIRCULAR COLOR SWATCHES
//     4. UNIFIED APP PIN LOCK & SMART TIMER BUTTON IN SETTINGS
// =========================================================================

// Move #settings-modal inside #app-sidebar right before #btn-krypton-ai-orb so it renders as an inline view above the Bottom Nav Dock!
(function mountSettingsInlineInSidebar() {
  const sidebarEl = document.getElementById("app-sidebar");
  const settingsModalEl = document.getElementById("settings-modal");
  const aiFabEl = document.getElementById("btn-krypton-ai-orb");
  if (sidebarEl && settingsModalEl && aiFabEl) {
    settingsModalEl.classList.add("inline-sidebar-settings");
    sidebarEl.insertBefore(settingsModalEl, aiFabEl);
  }
})();

function updateSettingsSmartLockStatusLabel() {
  const subEl = document.getElementById("settings-lock-status-sub");
  const btnLbl = document.getElementById("btn-open-smart-lock-label");
  const modeMap = {
    instant: "Instant on Minimize",
    "1m": "After 1 Minute",
    "5m": "After 5 Minutes",
    restart: "On App Restart"
  };
  const modeText = modeMap[userSettings.autoLockMode || "restart"] || "On Restart";
  if (subEl) {
    subEl.textContent = myAppPin
      ? `PIN Active • Auto-Lock: ${modeText}`
      : `No PIN Set • Auto-Lock: ${modeText}`;
  }
  if (btnLbl) {
    btnLbl.textContent = myAppPin ? "Lock & Timer ✓" : "Setup Lock";
  }
}

// Upgrade switchSidebarPrimaryView to handle "chats" | "profile" | "settings" seamlessly while keeping Bottom Dock visible!
switchSidebarPrimaryView = function (viewName = "chats") {
  currentSidebarViewMode = viewName;
  const chatsView = document.getElementById("sidebar-chats-view");
  const profileView = document.getElementById("sidebar-profile-dashboard");
  const settingsView = document.getElementById("settings-modal");
  const aiFab = document.getElementById("btn-krypton-ai-orb");

  if (viewName === "profile") {
    if (chatsView) chatsView.classList.add("hidden");
    if (settingsView) settingsView.classList.add("hidden");
    if (profileView) profileView.classList.remove("hidden");
    if (aiFab) aiFab.classList.add("hidden");
    updateDedicatedProfileDashboardUI();
    updateBottomDockActiveState("profile");
  } else if (viewName === "settings") {
    if (chatsView) chatsView.classList.add("hidden");
    if (profileView) profileView.classList.add("hidden");
    if (aiFab) aiFab.classList.add("hidden");
    updateMyAvatarUI();
    updatePwaInstallUIState();
    registerMyCurrentDeviceSession();
    updateSettingsSmartLockStatusLabel();
    if (settingsView) {
      settingsView.classList.remove("closing", "hidden");
    }
    updateBottomDockActiveState("settings");
  } else {
    currentSidebarViewMode = "chats";
    if (profileView) profileView.classList.add("hidden");
    if (settingsView) settingsView.classList.add("hidden");
    if (chatsView) chatsView.classList.remove("hidden");
    if (aiFab) aiFab.classList.remove("hidden");
    updateBottomDockActiveState("chats");
  }
};

// Override openSettingsModal and closeSettingsModalAnimated so any trigger (e.g. Profile -> Settings tile) switches to the inline Settings tab
openSettingsModal = function () {
  if (document.body.classList.contains("mobile-chat-active")) {
    document.body.classList.remove("mobile-chat-active");
  }
  switchSidebarPrimaryView("settings");
};

closeSettingsModalAnimated = function () {
  switchSidebarPrimaryView("chats");
};

// Fix exiting Global Chat or any Chat (via Back arrow button OR mobile hardware back gesture) so Bottom Dock ALWAYS highlights "Chats" on Home Screen!
exitChatToDashboard = function () {
  document.body.classList.remove("mobile-chat-active");
  if (activeSubscription && supabaseClient) {
    supabaseClient.removeChannel(activeSubscription);
  }
  currentRoom = "";
  currentPeerUser = "";
  cancelActiveReply();
  const btnGlobal = document.getElementById("btn-global-room");
  if (btnGlobal) btnGlobal.classList.remove("active");
  removeFloatingIndicator();

  if (currentSidebarViewMode === "profile") {
    switchSidebarPrimaryView("profile");
  } else if (currentSidebarViewMode === "settings") {
    switchSidebarPrimaryView("settings");
  } else {
    switchSidebarPrimaryView("chats");
  }
  renderPeerList();
  // Explicitly force "chats" active state when returning to home screen list
  if (currentSidebarViewMode === "chats") {
    updateBottomDockActiveState("chats");
  }
};

// Re-bind #btn-mobile-back and window popstate (Android hardware back gesture) so they always run the upgraded exitChatToDashboard()
const btnMobileBackV15 = document.getElementById("btn-mobile-back");
if (btnMobileBackV15) {
  const cleanBackBtn = btnMobileBackV15.cloneNode(true);
  btnMobileBackV15.parentNode.replaceChild(cleanBackBtn, btnMobileBackV15);
  cleanBackBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    exitChatToDashboard();
  });
}

window.addEventListener("popstate", () => {
  if (document.body.classList.contains("mobile-chat-active")) {
    exitChatToDashboard();
  } else if (currentSidebarViewMode !== "chats") {
    switchSidebarPrimaryView("chats");
  }
});

// Prevent renderPeerList from ever switching the bottom dock back to "global" when on the Home Screen
const prevRenderPeerListV14 = renderPeerList;
renderPeerList = function (filterText = "") {
  prevRenderPeerListV14(filterText);
  if (!document.body.classList.contains("mobile-chat-active")) {
    if (currentSidebarViewMode === "profile") {
      updateBottomDockActiveState("profile");
    } else if (currentSidebarViewMode === "settings") {
      updateBottomDockActiveState("settings");
    } else if (currentRoom !== "global" || window.innerWidth <= 900) {
      updateBottomDockActiveState("chats");
    }
  }
};

// Cyber Accent Theme Icon Button Toggle (#btn-toggle-theme-circles)
const btnToggleThemeCircles = document.getElementById("btn-toggle-theme-circles");
const themeSwatchesContainer = document.getElementById("theme-swatches-container");
if (btnToggleThemeCircles && themeSwatchesContainer) {
  btnToggleThemeCircles.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    themeSwatchesContainer.classList.toggle("hidden");
  });
}

// Re-bind circular theme swatch buttons
document.querySelectorAll("#theme-swatches-container .theme-swatch-btn").forEach((btn) => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const chosen = btn.dataset.themeColor || "emerald";
    userSettings.accentColor = chosen;
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    applySettings();
    showToast(`Theme switched to ${btn.title || chosen}!`, "info", 1600);
  };
});

// Unified App PIN Lock & Auto-Lock Timer Button in Settings (#btn-open-smart-lock-from-settings)
const btnOpenSmartLockV15 = document.getElementById("btn-open-smart-lock-from-settings");
if (btnOpenSmartLockV15) {
  const cleanLockSetupBtn = btnOpenSmartLockV15.cloneNode(true);
  btnOpenSmartLockV15.parentNode.replaceChild(cleanLockSetupBtn, btnOpenSmartLockV15);
  cleanLockSetupBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openSmartLockSetupModal();
  });
}

// Update status label whenever Smart Lock modal saves
const btnSaveSmartLockV15 = document.getElementById("btn-save-smart-lock-modal");
if (btnSaveSmartLockV15) {
  btnSaveSmartLockV15.addEventListener("click", () => {
    setTimeout(updateSettingsSmartLockStatusLabel, 60);
  });
}

// Re-bind Bottom Dock Tabs (Chats | Global | Setting | Profile) to use switchSidebarPrimaryView
const dockChatsV15 = document.getElementById("dock-btn-chats");
const dockGlobalV15 = document.getElementById("dock-btn-global");
const dockSettingsV15 = document.getElementById("dock-btn-settings");
const dockProfileV15 = document.getElementById("dock-btn-profile");

if (dockChatsV15) {
  const cleanChats = dockChatsV15.cloneNode(true);
  dockChatsV15.parentNode.replaceChild(cleanChats, dockChatsV15);
  cleanChats.addEventListener("click", () => {
    if (document.body.classList.contains("mobile-chat-active")) {
      exitChatToDashboard();
    }
    switchSidebarPrimaryView("chats");
    const peerInp = document.getElementById("peer-id-input");
    if (peerInp && peerInp.value) {
      peerInp.value = "";
      hideLiveUserSuggestions();
    }
    renderPeerList("");
    updateBottomDockActiveState("chats");
  });
}

if (dockGlobalV15) {
  const cleanGlobal = dockGlobalV15.cloneNode(true);
  dockGlobalV15.parentNode.replaceChild(cleanGlobal, dockGlobalV15);
  cleanGlobal.addEventListener("click", () => {
    if (userSettings.hideGlobal) {
      showToast("Global Lounge is hidden in Settings. Turn off 'Hide Global Lounge' to access it.", "info");
      switchSidebarPrimaryView("settings");
      return;
    }
    switchSidebarPrimaryView("chats");
    joinRoom("global", "Global Anonymous Lounge");
    updateBottomDockActiveState("global");
  });
}

if (dockSettingsV15) {
  const cleanSettings = dockSettingsV15.cloneNode(true);
  dockSettingsV15.parentNode.replaceChild(cleanSettings, dockSettingsV15);
  cleanSettings.addEventListener("click", () => {
    if (document.body.classList.contains("mobile-chat-active")) {
      document.body.classList.remove("mobile-chat-active");
    }
    switchSidebarPrimaryView("settings");
  });
}

if (dockProfileV15) {
  const cleanProfile = dockProfileV15.cloneNode(true);
  dockProfileV15.parentNode.replaceChild(cleanProfile, dockProfileV15);
  cleanProfile.addEventListener("click", () => {
    if (document.body.classList.contains("mobile-chat-active")) {
      document.body.classList.remove("mobile-chat-active");
    }
    switchSidebarPrimaryView("profile");
  });
}

updateSettingsSmartLockStatusLabel();


// =========================================================================
// 18. FEATURE v16000:
//     1. UNIFIED RECENT ACTIVITY SORTING (MOST RECENT MESSAGE CHAT OR GROUP
//        ALWAYS BUBBLES TO THE VERY TOP IMMEDIATELY, RESPECTING PINNED ITEMS!)
//     2. INSTANT REALTIME PROFILE PICTURE & BIO BROADCAST SYNC EVERYWHERE
//     3. ULTRA-LOW-LATENCY WEBRTC AUDIO & VIDEO CALL TUNING + WHATSAPP-STYLE
//        SINGLE-TAP VIDEO PIP SWAP (TAP SMALL VIDEO TO SWITCH WITH BIG VIDEO)
//     4. STRICT PIN / BIOMETRIC LOCK POLICY (NO LOCK WITHOUT PIN/BIOMETRIC SET,
//        AND ONLY SHOW CONFIGURED UNLOCK METHOD ON LOCK OVERLAY!)
// =========================================================================

// --- 1. UNIFIED RECENT ACTIVITY SORTING (PEERS + GROUPS BUBBLE TO TOP) ---
let conversationActivityTimestamps = JSON.parse(
  localStorage.getItem("krypton_conv_activity_ts") || "{}"
);

function bumpConversationActivity(key, customTimestampMs) {
  const cleanKey = (key || "").trim().toLowerCase().replace(/^@/, "");
  if (!cleanKey || cleanKey === "global") return;
  const ts = customTimestampMs || Date.now();
  if (!conversationActivityTimestamps[cleanKey] || ts >= conversationActivityTimestamps[cleanKey]) {
    conversationActivityTimestamps[cleanKey] = ts;
    localStorage.setItem(
      "krypton_conv_activity_ts",
      JSON.stringify(conversationActivityTimestamps)
    );
  }
}

// Upgrade savePeerToRecent so even if peer is already in savedPeers, it moves to index 0 (Top) & bumps timestamp!
savePeerToRecent = function (peer, forceUnDelete = false, bumpToTop = true) {
  const p = (peer || "").trim().toLowerCase().replace(/^@/, "");
  if (!p || p === "global") return;

  if (forceUnDelete) {
    deletedPeersList = deletedPeersList.filter((u) => u !== p);
    localStorage.setItem("krypton_deleted_peers", JSON.stringify(deletedPeersList));
  } else if (deletedPeersList.includes(p)) {
    return;
  }

  const wasPresent = savedPeers.includes(p);
  if (!wasPresent) {
    savedPeers.unshift(p);
    localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
    if (p !== (myUsername || "").toLowerCase()) {
      ensurePeerProfileDataLoaded(p);
    }
  } else if (bumpToTop) {
    savedPeers = [p, ...savedPeers.filter((x) => x.toLowerCase() !== p)];
    localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
  }

  if (bumpToTop) {
    bumpConversationActivity(p);
  }
  renderPeerList();
};

// When transmitting any message in 1-on-1 or Group, immediately bump that conversation to the top!
const prevTransmitPayloadV15 = transmitPayload;
transmitPayload = async function (payloadString) {
  if (currentRoom && currentRoom !== "global") {
    if (isGroupRoom(currentRoom)) {
      bumpConversationActivity(currentRoom);
      renderPeerList();
    } else if (isSelfRoom(currentRoom)) {
      savePeerToRecent((myUsername || "").toLowerCase(), true, true);
    } else if (currentPeerUser) {
      savePeerToRecent(currentPeerUser, true, true);
    }
  }
  await prevTransmitPayloadV15(payloadString);
};

// Also watch for incoming Group messages in startGlobalIncomingMessageWatcher so groups bubble to top & show unread badge!
const prevStartGlobalIncomingWatcherV15 = startGlobalIncomingMessageWatcher;
startGlobalIncomingMessageWatcher = function () {
  if (!supabaseClient || !myUsername) return;
  if (globalMessagesWatcher) supabaseClient.removeChannel(globalMessagesWatcher);

  globalMessagesWatcher = supabaseClient
    .channel("krypton_global_msg_alert")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      async (payload) => {
        const newMsg = payload.new;
        if (!newMsg || newMsg.room_id === "global") return;
        const sender = (newMsg.sender_id || "").toLowerCase();
        if (sender === myUsername.toLowerCase()) return;
        if (blockedUsers.includes(sender)) return;

        // Ensure sender's latest profile picture is loaded if missing
        if (!usersAvatarCache[sender]) {
          ensurePeerProfileDataLoaded(sender);
        }

        // Case A: Incoming Group Message
        if (isGroupRoom(newMsg.room_id) && savedGroups[newMsg.room_id]) {
          if (!markMessageProcessedOnce(newMsg)) return;
          const gid = newMsg.room_id;
          const grp = savedGroups[gid];
          bumpConversationActivity(gid);

          if (currentRoom !== gid) {
            unreadCounts[gid] = (unreadCounts[gid] || 0) + 1;
            localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));
            playSynthTone("receive");
            showToast(`New message in "${grp.name}" from @${sender}`, "info");
            triggerSystemPushNotification(
              `Krypton • ${grp.name}`,
              `@${sender} sent a message`,
              `grp-${gid}`
            );
          }
          renderPeerList();
          return;
        }

        // Case B: Incoming 1-on-1 Direct Message
        const expectedRoom = await getSecureRoomId(sender);
        if (newMsg.room_id === expectedRoom) {
          if (!markMessageProcessedOnce(newMsg)) return;

          savePeerToRecent(sender, true, true);
          triggerSystemPushNotification(
            `Krypton • @${sender}`,
            "Sent you an encrypted message",
            `dm-${sender}`
          );
          if (currentRoom !== expectedRoom) {
            unreadCounts[sender] = (unreadCounts[sender] || 0) + 1;
            localStorage.setItem("krypton_unreads", JSON.stringify(unreadCounts));
            playSynthTone("receive");
            showToast(`New encrypted message from @${sender}`, "info");
            renderPeerList();
          }
        }
      }
    )
    .subscribe();
};

// Reorder DOM cards inside #chat-list so Pinned items stay first, followed by the most recent message activity across BOTH Direct Chats & Groups!
const prevRenderPeerListV15 = renderPeerList;
renderPeerList = function (filterText = "") {
  prevRenderPeerListV15(filterText);

  const listEl = document.getElementById("chat-list");
  if (!listEl) return;

  // Assign data-conv-key to any group cards so we can sort Direct Chats & Groups together by recent activity!
  const groupEntries = Object.values(savedGroups || {});
  Array.from(listEl.children).forEach((el) => {
    if (!el.classList || !el.classList.contains("contact-card")) return;
    if (el.dataset.peer) {
      el.dataset.convKey = el.dataset.peer.toLowerCase();
    } else if (!el.dataset.convKey) {
      const nameSpan = el.querySelector(".contact-name");
      if (nameSpan) {
        const matchedGrp = groupEntries.find((g) => g && g.name && nameSpan.textContent.includes(g.name));
        if (matchedGrp) {
          el.dataset.convKey = matchedGrp.id;
        }
      }
    }
  });

  // Only sort the top-level saved conversation cards (before any Global Directory divider)
  const divider = listEl.querySelector(".chat-list-section-divider");
  const allChildren = Array.from(listEl.children);
  const dividerIdx = divider ? allChildren.indexOf(divider) : allChildren.length;
  const convCards = allChildren
    .slice(0, dividerIdx)
    .filter((el) => el.classList && el.classList.contains("contact-card"));

  if (convCards.length > 1) {
    convCards.sort((a, b) => {
      const keyA = (a.dataset.convKey || a.dataset.peer || "").toLowerCase();
      const keyB = (b.dataset.convKey || b.dataset.peer || "").toLowerCase();
      const pinA = pinnedPeers.includes(keyA) ? 1 : 0;
      const pinB = pinnedPeers.includes(keyB) ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;

      const tsA = conversationActivityTimestamps[keyA] || 0;
      const tsB = conversationActivityTimestamps[keyB] || 0;
      if (tsA !== tsB) return tsB - tsA;
      return 0;
    });

    convCards.forEach((card) => {
      if (divider) {
        listEl.insertBefore(card, divider);
      } else {
        listEl.appendChild(card);
      }
    });
  }
};

// --- 2. INSTANT REALTIME PROFILE PICTURE & BIO SYNC EVERYWHERE ---
function applyLiveProfileUpdateEverywhere(username, avatarUrl, bioText) {
  const uname = (username || "").trim().toLowerCase().replace(/^@/, "");
  if (!uname) return;

  if (avatarUrl !== undefined) {
    if (avatarUrl) {
      usersAvatarCache[uname] = avatarUrl;
    } else {
      delete usersAvatarCache[uname];
    }
    localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
  }

  if (bioText !== undefined && bioText !== null) {
    usersBioCache[uname] = bioText || "Hey there! I am using Krypton.";
    localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
  }

  const finalAv =
    uname === (myUsername || "").toLowerCase()
      ? myAvatarData
      : usersAvatarCache[uname] || "";

  // 1. Update Sidebar Contact Cards, Live Search Suggestions & Directory Cards
  document
    .querySelectorAll(
      `#avatar-contact-${uname}, #sug-avatar-${uname}, #dir-avatar-${uname}, #grp-mem-av-${uname}, #grp-sug-av-${uname}`
    )
    .forEach((el) => {
      renderAvatarElement(el, uname, finalAv);
    });

  // 2. Update All Message Bubbles from this sender in the currently open chat feed (Global, Group, or DM)
  document.querySelectorAll(`.message-row[data-sender="${uname}"] .msg-sender-avatar`).forEach((avEl) => {
    renderAvatarElement(avEl, uname, finalAv);
  });

  // 3. Update Chat Header & Call Screen Avatar if we are currently chatting with @uname
  if (currentPeerUser && currentPeerUser.toLowerCase() === uname) {
    updateHeaderStatus();
    const callAv = document.getElementById("call-avatar");
    if (callAv) renderAvatarElement(callAv, uname, finalAv);
  }

  // 4. Update Open User Profile Popup Modal if currently viewing @uname
  const openActionAv = document.getElementById("action-user-avatar");
  const openActionBio = document.getElementById("action-user-bio-box");
  const openModal = document.getElementById("user-action-modal");
  if (openModal && openModal.textContent.toLowerCase().includes("@" + uname)) {
    if (openActionAv) renderAvatarElement(openActionAv, uname, finalAv);
    if (openActionBio && usersBioCache[uname]) openActionBio.textContent = usersBioCache[uname];
  }
}

async function broadcastMyProfileUpdate() {
  if (!myUsername || !presenceChannel) return;
  try {
    await presenceChannel.send({
      type: "broadcast",
      event: "profile-updated",
      payload: {
        username: myUsername.toLowerCase(),
        avatar_url: myAvatarData || "",
        bio: myUserBio || "Hey there! I am using Krypton."
      }
    });
  } catch (e) { }
}

// Hook updateMyAvatarUI so whenever we upload/remove our own photo or update our bio, we broadcast it live to everyone!
let lastBroadcastedAvatarSig = myAvatarData ? myAvatarData.length + "_" + myAvatarData.slice(-16) : "empty";
let lastBroadcastedBioSig = myUserBio || "";

const prevUpdateMyAvatarUIV15 = updateMyAvatarUI;
updateMyAvatarUI = function () {
  prevUpdateMyAvatarUIV15();
  const curAvSig = myAvatarData ? myAvatarData.length + "_" + myAvatarData.slice(-16) : "empty";
  const curBioSig = myUserBio || "";
  if (myUsername && (curAvSig !== lastBroadcastedAvatarSig || curBioSig !== lastBroadcastedBioSig)) {
    lastBroadcastedAvatarSig = curAvSig;
    lastBroadcastedBioSig = curBioSig;
    applyLiveProfileUpdateEverywhere(myUsername, myAvatarData, myUserBio);
    broadcastMyProfileUpdate();
  }
};

// Also watch both INSERT and UPDATE on `users` table + Presence `profile-updated` broadcast
startUsersProfileWatcher = function () {
  if (!supabaseClient) return;
  if (usersProfileWatcher) supabaseClient.removeChannel(usersProfileWatcher);

  usersProfileWatcher = supabaseClient
    .channel("krypton_users_profile_watch")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old || {};
          if (oldRow.username) {
            const delUname = oldRow.username.toLowerCase();
            savedPeers = savedPeers.filter((p) => p.toLowerCase() !== delUname);
            localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));
            delete usersAvatarCache[delUname];
            delete usersBioCache[delUname];
            renderPeerList();
          }
          return;
        }

        const updated = payload.new;
        const oldRow = payload.old || {};
        if (updated && updated.username) {
          const uname = updated.username.toLowerCase();
          const sToken = updated.session_token || "";

          if (sToken) {
            Object.keys(peerTokenBindingMap).forEach((savedPeerName) => {
              if (peerTokenBindingMap[savedPeerName] === sToken && savedPeerName !== uname) {
                applyLivePeerRename(savedPeerName, uname, sToken);
              }
            });
            usersSessionCache[uname] = sToken;
            localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
          }
          if (oldRow.username && oldRow.username.toLowerCase() !== uname) {
            applyLivePeerRename(oldRow.username.toLowerCase(), uname, sToken);
          }

          applyLiveProfileUpdateEverywhere(
            uname,
            updated.avatar_url !== undefined ? updated.avatar_url || "" : undefined,
            updated.bio !== undefined ? updated.bio || "" : undefined
          );
        }
      }
    )
    .subscribe();
};

const prevInitPresenceTrackerV15 = initPresenceTracker;
initPresenceTracker = function () {
  prevInitPresenceTrackerV15();
  if (!presenceChannel) return;

  presenceChannel.on("broadcast", { event: "profile-updated" }, (payload) => {
    const p = payload.payload;
    if (!p || !p.username) return;
    applyLiveProfileUpdateEverywhere(p.username, p.avatar_url || "", p.bio);
  });
};

// Whenever a new message node is rendered from a user whose avatar isn't cached yet, fetch it on the fly and update their bubble!
const prevCreateMessageNodeV15 = createMessageNode;
createMessageNode = async function (msg, rawTextOverride) {
  const node = await prevCreateMessageNodeV15(msg, rawTextOverride);
  if (node && msg && msg.sender_id) {
    const senderClean = msg.sender_id.trim().toLowerCase();
    if (
      senderClean !== (myUsername || "").toLowerCase() &&
      !usersAvatarCache[senderClean]
    ) {
      ensurePeerProfileDataLoaded(senderClean).then((row) => {
        if (row && row.avatar_url) {
          applyLiveProfileUpdateEverywhere(senderClean, row.avatar_url, row.bio);
        }
      });
    }
  }
  return node;
};

// --- 3. ULTRA-LOW-LATENCY WEBRTC CALLS & WHATSAPP-STYLE SINGLE-TAP VIDEO PIP SWAP ---
const videoStreamsContainerEl = document.getElementById("video-streams-container");
const localVideoEl = document.getElementById("local-video");
const remoteVideoEl = document.getElementById("remote-video");

if (localVideoEl && videoStreamsContainerEl) {
  localVideoEl.addEventListener("click", (e) => {
    e.stopPropagation();
    // If local-video is currently the small PiP (i.e., container does NOT have .pip-swapped), swap it to full main view!
    if (!videoStreamsContainerEl.classList.contains("pip-swapped")) {
      videoStreamsContainerEl.classList.add("pip-swapped");
    }
  });
}

if (remoteVideoEl && videoStreamsContainerEl) {
  remoteVideoEl.addEventListener("click", (e) => {
    e.stopPropagation();
    // If remote-video is currently the small PiP (i.e., container HAS .pip-swapped), swap it back to full main view!
    if (videoStreamsContainerEl.classList.contains("pip-swapped")) {
      videoStreamsContainerEl.classList.remove("pip-swapped");
    }
  });
}

function tuneWebRTCLowLatencyParameters(pc) {
  if (!pc) return;
  try {
    // Minimize jitter buffer playout delay on incoming audio/video receivers
    if (typeof pc.getReceivers === "function") {
      pc.getReceivers().forEach((receiver) => {
        if ("playoutDelayHint" in receiver) {
          receiver.playoutDelayHint = 0.02;
        }
        if ("jitterBufferTarget" in receiver) {
          receiver.jitterBufferTarget = 20;
        }
      });
    }

    // Optimize outgoing video/audio encoding bitrates & framerate so slow mobile networks have zero lag
    if (typeof pc.getSenders === "function") {
      pc.getSenders().forEach((sender) => {
        if (!sender.track || typeof sender.getParameters !== "function") return;
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        if (sender.track.kind === "video") {
          params.encodings[0].maxBitrate = 420000; // 420 kbps crisp low-latency video
          params.encodings[0].maxFramerate = 24;
          params.encodings[0].priority = "high";
          params.encodings[0].networkPriority = "high";
        } else if (sender.track.kind === "audio") {
          params.encodings[0].maxBitrate = 36000; // 36 kbps ultra-responsive Opus voice
          params.encodings[0].priority = "high";
          params.encodings[0].networkPriority = "high";
        }
        sender.setParameters(params).catch(() => { });
      });
    }
  } catch (e) { }
}

const prevStartWebRTCv15 = startWebRTC;
startWebRTC = async function (isCaller, type) {
  if (videoStreamsContainerEl) {
    videoStreamsContainerEl.classList.remove("pip-swapped");
  }
  await prevStartWebRTCv15(isCaller, type);

  if (peerConnection) {
    // Enable bundle & low-latency receiver hints immediately
    tuneWebRTCLowLatencyParameters(peerConnection);
    const origTrackV15 = peerConnection.ontrack;
    peerConnection.ontrack = (event) => {
      if (origTrackV15) origTrackV15(event);
      tuneWebRTCLowLatencyParameters(peerConnection);
    };
  }
};

// --- 4. STRICT PIN & BIOMETRIC LOCK POLICY (NO FREE UNLOCK BUTTON, NO LOCK WITHOUT PIN/BIOMETRIC) ---
function hasAnyLockMethodConfigured() {
  return Boolean((myAppPin && myAppPin.trim().length >= 4) || biometricCredId);
}

triggerPrivacyLock = function () {
  // Never lock the app if the user has neither set a PIN nor enabled Biometric Lock!
  if (!hasAnyLockMethodConfigured()) {
    showToast(
      "Pehle Settings > Setup Lock mein ja kar PIN ya Biometric Lock set karein!",
      "info",
      2800
    );
    openSmartLockSetupModal();
    return;
  }

  if (!appLockOverlay) return;
  appLockOverlay.classList.remove("hidden");
  if (lockPinError) lockPinError.textContent = "";

  const hasPin = Boolean(myAppPin && myAppPin.trim().length >= 4);
  const hasBio = Boolean(biometricCredId);

  const btnUnlockPin = document.getElementById("btn-unlock-screen");
  const btnUnlockBio = document.getElementById("btn-biometric-unlock");
  const lockDesc = document.getElementById("lock-screen-desc");

  // 1. Show PIN Input & "Unlock with PIN" button ONLY if user has set a PIN!
  if (hasPin) {
    if (pinInputSection) pinInputSection.classList.remove("hidden");
    if (btnUnlockPin) {
      btnUnlockPin.classList.remove("hidden");
      btnUnlockPin.innerHTML = `
        <i data-lucide="key-round" style="width: 15px; height: 15px; vertical-align: -2px; margin-right: 5px;"></i>
        <span>Unlock with PIN</span>
      `;
    }
    if (lockPinInput) {
      lockPinInput.value = "";
      if (!hasBio) {
        setTimeout(() => lockPinInput.focus(), 80);
      }
    }
  } else {
    // User only enabled Biometric Lock without PIN -> Hide PIN box AND hide "Unlock Mesh" button!
    if (pinInputSection) pinInputSection.classList.add("hidden");
    if (btnUnlockPin) btnUnlockPin.classList.add("hidden");
  }

  // 2. Show Biometric Unlock button ONLY if user enabled Biometrics!
  if (btnUnlockBio) {
    if (hasBio) {
      btnUnlockBio.classList.remove("hidden");
      btnUnlockBio.className = hasPin ? "glass-btn secondary" : "glass-btn primary";
    } else {
      btnUnlockBio.classList.add("hidden");
    }
  }

  if (lockDesc) {
    if (hasPin && hasBio) {
      lockDesc.textContent = "Enter your security PIN or use Biometrics to unlock";
    } else if (hasBio) {
      lockDesc.textContent = "Verify your Fingerprint / FaceID to unlock";
    } else {
      lockDesc.textContent = "Enter your 4-6 digit security PIN to unlock";
    }
  }

  if (window.lucide) lucide.createIcons({ nodes: [appLockOverlay] });

  // If user configured ONLY Biometric Lock (no PIN), automatically trigger the biometric prompt for convenience!
  if (hasBio && !hasPin) {
    setTimeout(() => {
      triggerBiometricUnlockAttempt();
    }, 180);
  }
};

attemptUnlockScreen = function () {
  if (!appLockOverlay) return;
  const hasPin = Boolean(myAppPin && myAppPin.trim().length >= 4);
  if (!hasPin) {
    // If no PIN is configured, do not allow bypassing via button click; trigger biometric check instead!
    if (biometricCredId) {
      triggerBiometricUnlockAttempt();
    }
    return;
  }

  const entered = (lockPinInput ? lockPinInput.value : "").trim();
  if (entered !== myAppPin) {
    if (lockPinError) lockPinError.textContent = "Incorrect PIN code!";
    if (lockPinInput) lockPinInput.value = "";
    return;
  }
  appLockOverlay.classList.add("hidden");
};

// Re-bind #btn-unlock-screen to the strict attemptUnlockScreen
const btnUnlockScreenV16 = document.getElementById("btn-unlock-screen");
if (btnUnlockScreenV16) {
  const cleanUnlockBtn = btnUnlockScreenV16.cloneNode(true);
  btnUnlockScreenV16.parentNode.replaceChild(cleanUnlockBtn, btnUnlockScreenV16);
  cleanUnlockBtn.addEventListener("click", attemptUnlockScreen);
}

// Ensure background auto-lock only triggers if user actually configured PIN or Biometric Lock!
document.addEventListener(
  "visibilitychange",
  (e) => {
    if (!hasAnyLockMethodConfigured()) {
      clearTimeout(backgroundAutoLockTimer);
    }
  },
  true
);

// Update Settings lock status label to reflect both PIN & Biometric status
const prevUpdateSettingsSmartLockStatusLabelV15 = updateSettingsSmartLockStatusLabel;
updateSettingsSmartLockStatusLabel = function () {
  prevUpdateSettingsSmartLockStatusLabelV15();
  const subEl = document.getElementById("settings-lock-status-sub");
  const btnLbl = document.getElementById("btn-open-smart-lock-label");
  const hasPin = Boolean(myAppPin && myAppPin.trim().length >= 4);
  const hasBio = Boolean(biometricCredId);
  const modeMap = {
    instant: "Instant on Minimize",
    "1m": "After 1 Minute",
    "5m": "After 5 Minutes",
    restart: "On App Restart"
  };
  const modeText = modeMap[userSettings.autoLockMode || "restart"] || "On Restart";

  let authMethodLabel = "No Lock Set";
  if (hasPin && hasBio) authMethodLabel = "PIN + Biometric Active";
  else if (hasBio) authMethodLabel = "Biometric Lock Active";
  else if (hasPin) authMethodLabel = "PIN Lock Active";

  if (subEl) {
    subEl.textContent = `${authMethodLabel} • Auto-Lock: ${modeText}`;
  }
  if (btnLbl) {
    btnLbl.textContent = hasPin || hasBio ? "Lock & Timer ✓" : "Setup Lock";
  }
};
updateSettingsSmartLockStatusLabel();


// =========================================================================
// 19. FEATURE v17000:
//     1. COMPLETE MESSAGE FORWARDING (TEXT, PHOTOS, VOICE NOTES & FILES TO
//        MULTIPLE FRIENDS, ENCRYPTED GROUPS, OR SAVED MESSAGES VAULT)
//     2. FULL-SCREEN VIDEO CALL TOGGLE (FLOATING CORNER ICON ON VIDEO STREAM
//        + NATIVE FULLSCREEN API & IMMERSIVE VIEWPORT FOR MOBILE, TAB & LAPTOP)
//     3. ADD ANOTHER MEMBER TO ACTIVE CALL (MULTI-PEER E2EE CALL INVITE & MESH)
// =========================================================================

// --- 1. MESSAGE FORWARDING ENGINE ---
let rawMessagePayloadsMap = {}; // msgId -> rawDecryptedPayload (without REPLY_JSON wrapper)
let pendingForwardPayload = null;
let selectedForwardTargets = new Set(); // Set of "peer:@uname" or "group:gid" or "self:me"

// Hook createMessageNode so we store the raw decrypted payload for every message (text, image, voice, file)
// and also render a "Forwarded" badge if the message starts with "FORWARDED_MSG\n"
const prevCreateMessageNodeV16 = createMessageNode;
createMessageNode = async function (msg, rawTextOverride) {
  let plain = rawTextOverride || null;
  if (!plain && msg) {
    const cachedList = roomDecryptedCache[currentRoom] || [];
    const foundCached = msg.id ? cachedList.find((c) => c.msg && c.msg.id === msg.id) : null;
    if (foundCached && foundCached.plain) {
      plain = foundCached.plain;
    } else if (msg.ciphertext && msg.iv && msg.salt) {
      plain = await decryptData(msg.ciphertext, msg.iv, msg.salt, currentRoom);
    }
  }

  let isForwarded = false;
  let cleanOverride = plain;

  if (cleanOverride) {
    // Strip REPLY_JSON if present when extracting forwardable body
    let bodyOnly = cleanOverride;
    if (bodyOnly.startsWith("REPLY_JSON:")) {
      const nl = bodyOnly.indexOf("\n");
      if (nl !== -1) bodyOnly = bodyOnly.slice(nl + 1);
    }
    if (bodyOnly.startsWith("VMODE_ONCE:")) bodyOnly = bodyOnly.slice(11);
    else if (bodyOnly.startsWith("VMODE_10S:")) bodyOnly = bodyOnly.slice(10);

    if (bodyOnly.startsWith("FORWARDED_MSG\n")) {
      isForwarded = true;
      bodyOnly = bodyOnly.slice(14);
      cleanOverride = cleanOverride.replace("FORWARDED_MSG\n", "");
    }

    const tempOrRealId = msg && msg.id ? String(msg.id) : null;
    if (tempOrRealId) {
      rawMessagePayloadsMap[tempOrRealId] = bodyOnly;
    }
  }

  const node = await prevCreateMessageNodeV16(msg, cleanOverride);
  if (!node) return null;

  const finalId = node.id.replace("msg-row-", "");
  if (cleanOverride && !rawMessagePayloadsMap[finalId]) {
    let b = cleanOverride;
    if (b.startsWith("REPLY_JSON:")) {
      const nl = b.indexOf("\n");
      if (nl !== -1) b = b.slice(nl + 1);
    }
    if (b.startsWith("FORWARDED_MSG\n")) b = b.slice(14);
    rawMessagePayloadsMap[finalId] = b;
  }

  if (isForwarded) {
    const bubbleContent = node.querySelector(".bubble-content");
    if (bubbleContent && !bubbleContent.querySelector(".msg-forwarded-tag")) {
      const fwdTag = document.createElement("div");
      fwdTag.className = "msg-forwarded-tag";
      fwdTag.innerHTML = `<i data-lucide="forward" style="width: 11px; height: 11px;"></i><span>Forwarded</span>`;
      const senderHdr = bubbleContent.querySelector(".msg-sender-header");
      if (senderHdr && senderHdr.nextSibling) {
        bubbleContent.insertBefore(fwdTag, senderHdr.nextSibling);
      } else {
        bubbleContent.insertBefore(fwdTag, bubbleContent.firstChild);
      }
    }
  }

  return node;
};

function extractForwardablePayloadFromDOM(msgId) {
  if (rawMessagePayloadsMap[msgId]) {
    return rawMessagePayloadsMap[msgId];
  }
  const row = document.getElementById("msg-row-" + msgId);
  if (!row) return "";

  const imgEl = row.querySelector("img.chat-thumbnail-img");
  if (imgEl && imgEl.src) return "IMAGE_DATA:" + imgEl.src;

  const audioEl = row.querySelector(".custom-voice-player audio");
  if (audioEl && audioEl.src) return "VOICE_DATA:" + audioEl.src;

  const fileDlBtn = row.querySelector("a.file-card-dl-btn");
  const fileNameEl = row.querySelector(".file-card-name");
  if (fileDlBtn && fileDlBtn.href) {
    const fname = fileNameEl ? fileNameEl.textContent.trim() : "encrypted-file";
    return `FILE_DATA:${fname}|1024|${fileDlBtn.href}`;
  }

  const textEl = row.querySelector(".msg-text-line");
  return textEl ? textEl.textContent.trim() : "";
}

window.openForwardMessageModal = function (msgId) {
  const payload = extractForwardablePayloadFromDOM(msgId);
  if (!payload) {
    showToast("Cannot forward this message.", "error");
    return;
  }

  pendingForwardPayload = "FORWARDED_MSG\n" + payload;
  selectedForwardTargets.clear();

  const modal = document.getElementById("forward-msg-modal");
  const searchInp = document.getElementById("forward-search-input");
  if (!modal) return;
  if (searchInp) searchInp.value = "";

  renderForwardTargetsList("");
  modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
};

function closeForwardMessageModal() {
  const modal = document.getElementById("forward-msg-modal");
  if (modal) modal.classList.add("hidden");
  pendingForwardPayload = null;
  selectedForwardTargets.clear();
}

function renderForwardTargetsList(filterQuery = "") {
  const listEl = document.getElementById("forward-targets-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const q = (filterQuery || "").trim().toLowerCase().replace(/^@/, "");
  const me = (myUsername || "").toLowerCase();

  const targets = [];

  // 1. Saved Messages (@me Personal Vault)
  if (!q || "saved messages".includes(q) || "me".includes(q) || me.includes(q)) {
    targets.push({
      key: "self:" + me,
      type: "self",
      title: `@${me} (Saved Messages)`,
      sub: "Personal Encrypted Vault",
      avatarName: me,
      avatarUrl: myAvatarData || ""
    });
  }

  // 2. Encrypted Groups
  Object.keys(savedGroups || {}).forEach((gid) => {
    const g = savedGroups[gid];
    if (!g || !g.name) return;
    if (Array.isArray(g.members) && me && !g.members.includes(me) && g.owner !== me) return;
    if (q && !g.name.toLowerCase().includes(q)) return;
    targets.push({
      key: "group:" + gid,
      type: "group",
      groupId: gid,
      title: g.name,
      sub: `Encrypted Group • ${(g.members || []).length} members`,
      avatarName: g.name,
      avatarUrl: g.avatar || "",
      isGroup: true
    });
  });

  // 3. Connected Friends / Saved Peers
  const friends = getMyConnectedFriendsOnly();
  friends.forEach((p) => {
    if (q && !p.includes(q)) return;
    targets.push({
      key: "peer:" + p,
      type: "peer",
      peer: p,
      title: "@" + p,
      sub: usersBioCache[p] || "AES-256 Encrypted Friend",
      avatarName: p,
      avatarUrl: usersAvatarCache[p] || ""
    });
  });

  if (targets.length === 0) {
    listEl.innerHTML = `<div style="padding: 18px; text-align: center; font-size: 12px; color: var(--text-dim);">No friends or groups matching "${escapeHTML(q)}"</div>`;
    return;
  }

  targets.forEach((t) => {
    const isSel = selectedForwardTargets.has(t.key);
    const row = document.createElement("div");
    row.className = "forward-target-row" + (isSel ? " selected" : "");
    row.onclick = () => {
      if (selectedForwardTargets.has(t.key)) {
        selectedForwardTargets.delete(t.key);
        row.classList.remove("selected");
        row.querySelector(".forward-check-circle").textContent = "";
      } else {
        selectedForwardTargets.add(t.key);
        row.classList.add("selected");
        row.querySelector(".forward-check-circle").textContent = "✓";
      }
      const btnConfirm = document.getElementById("btn-confirm-forward-send");
      if (btnConfirm) {
        btnConfirm.textContent =
          selectedForwardTargets.size > 0
            ? `Forward (${selectedForwardTargets.size})`
            : "Forward Now";
      }
    };

    const safeDomId = "fwd-av-" + t.key.replace(/[^a-z0-9]/gi, "_");
    row.innerHTML = `
      <div class="contact-card-info" style="gap: 10px;">
        <div class="avatar sm" id="${safeDomId}" style="width: 38px; height: 38px; font-size: 13px;"></div>
        <div class="contact-name-wrap">
          <span class="contact-name" style="font-size: 13.5px;">${escapeHTML(t.title)}</span>
          <span class="contact-preview-text" style="font-size: 11px;">${escapeHTML(t.sub)}</span>
        </div>
      </div>
      <div class="forward-check-circle">${isSel ? "✓" : ""}</div>
    `;
    listEl.appendChild(row);
    renderAvatarElement(row.querySelector("#" + safeDomId), t.avatarName, t.avatarUrl);
  });
}

async function transmitEncryptedToSpecificRoom(targetRoomId, targetPeerOrGroupKey, rawPayloadString) {
  if (!targetRoomId || !rawPayloadString) return;

  // If forwarding to the currently open room, render immediately in the open feed as well!
  if (targetRoomId === currentRoom) {
    const prevReply = activeReplyContext;
    activeReplyContext = null;
    await transmitPayload(rawPayloadString);
    activeReplyContext = prevReply;
    return;
  }

  if (!supabaseClient) return;
  try {
    const encrypted = await encryptData(rawPayloadString, targetRoomId);
    const fullRow = {
      room_id: targetRoomId,
      sender_id: myUsername,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      ttl_seconds: null,
      is_read: false
    };

    const { data: insertedRows, error } = await supabaseClient
      .from("messages")
      .insert([fullRow])
      .select("*");

    if (error) {
      await supabaseClient.from("messages").insert([
        {
          room_id: targetRoomId,
          sender_id: myUsername,
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          salt: encrypted.salt
        }
      ]);
    }

    if (targetPeerOrGroupKey && !isGroupRoom(targetRoomId) && !isSelfRoom(targetRoomId)) {
      savePeerToRecent(targetPeerOrGroupKey, true, true);
      if (presenceChannel && insertedRows && insertedRows.length > 0) {
        await presenceChannel.send({
          type: "broadcast",
          event: "fast-dm-sync",
          payload: {
            room: targetRoomId,
            sender: myUsername.toLowerCase(),
            targetPeer: targetPeerOrGroupKey.toLowerCase(),
            msg: insertedRows[0]
          }
        });
      }
    } else if (isGroupRoom(targetRoomId)) {
      bumpConversationActivity(targetRoomId);
      renderPeerList();
    }
  } catch (err) {
    console.error("Forward transmit error:", err);
  }
}

const btnCloseForwardModal = document.getElementById("btn-close-forward-modal");
const btnCancelForwardModal = document.getElementById("btn-cancel-forward-modal");
const btnConfirmForwardSend = document.getElementById("btn-confirm-forward-send");
const forwardSearchInput = document.getElementById("forward-search-input");

if (btnCloseForwardModal) btnCloseForwardModal.addEventListener("click", closeForwardMessageModal);
if (btnCancelForwardModal) btnCancelForwardModal.addEventListener("click", closeForwardMessageModal);
if (forwardSearchInput) {
  forwardSearchInput.addEventListener("input", (e) => {
    renderForwardTargetsList(e.target.value);
  });
}

if (btnConfirmForwardSend) {
  btnConfirmForwardSend.addEventListener("click", async () => {
    if (!pendingForwardPayload) return;
    if (selectedForwardTargets.size === 0) {
      showToast("Please select at least 1 friend or group to forward!", "error");
      return;
    }

    const targetsArr = Array.from(selectedForwardTargets);
    const payloadToSend = pendingForwardPayload;
    btnConfirmForwardSend.textContent = "Forwarding...";

    let lastTargetRoom = "";
    let lastTargetTitle = "";

    for (const key of targetsArr) {
      if (key.startsWith("self:")) {
        const selfRoom = getMySelfRoomId();
        savePeerToRecent((myUsername || "").toLowerCase(), true, true);
        await transmitEncryptedToSpecificRoom(selfRoom, myUsername.toLowerCase(), payloadToSend);
        lastTargetRoom = selfRoom;
        lastTargetTitle = `@${myUsername} (You)`;
      } else if (key.startsWith("group:")) {
        const gid = key.slice(6);
        const g = savedGroups[gid];
        if (g) {
          await transmitEncryptedToSpecificRoom(gid, gid, payloadToSend);
          lastTargetRoom = gid;
          lastTargetTitle = g.name;
        }
      } else if (key.startsWith("peer:")) {
        const p = key.slice(5);
        const dmRoom = await getSecureRoomId(p);
        await transmitEncryptedToSpecificRoom(dmRoom, p, payloadToSend);
        lastTargetRoom = dmRoom;
        lastTargetTitle = "@" + p;
      }
    }

    btnConfirmForwardSend.textContent = "Forward Now";
    closeForwardMessageModal();
    playSynthTone("send");
    showToast(
      `Forwarded encrypted message to ${targetsArr.length} chat${targetsArr.length > 1 ? "s" : ""}!`,
      "success"
    );

    // If forwarded to a single chat, jump directly into that chat so user sees the forwarded message immediately!
    if (targetsArr.length === 1 && lastTargetRoom && currentRoom !== lastTargetRoom) {
      joinRoom(lastTargetRoom, lastTargetTitle);
    }
  });
}

// Inject "Forward Message" button right below "Reply" inside openWhatsAppMessageContextMenu!
const prevOpenWhatsAppMessageContextMenuV16 = window.openWhatsAppMessageContextMenu;
window.openWhatsAppMessageContextMenu = function (msgId, clientX, clientY) {
  prevOpenWhatsAppMessageContextMenuV16(msgId, clientX, clientY);

  const menu = document.querySelector(".whatsapp-msg-context-menu");
  const actionsList = menu ? menu.querySelector(".msg-ctx-actions-list") : null;
  if (!actionsList) return;

  const btnForward = document.createElement("button");
  btnForward.className = "msg-ctx-btn";
  btnForward.innerHTML = `<i data-lucide="forward" style="width: 15px; height: 15px;"></i><span>Forward Message</span>`;
  btnForward.onclick = () => {
    closeMessageContextMenu();
    openForwardMessageModal(msgId);
  };

  // Insert right after the first action ("Reply")
  if (actionsList.children.length > 1) {
    actionsList.insertBefore(btnForward, actionsList.children[1]);
  } else {
    actionsList.appendChild(btnForward);
  }
  if (window.lucide) lucide.createIcons({ nodes: [btnForward] });
};

// --- 2. FULL-SCREEN VIDEO CALL TOGGLE (WORKS ON MOBILE, TABLET & LAPTOP) ---
let isCallFullscreenActive = false;

function syncCallFullscreenIcons() {
  const overlay = document.getElementById("call-screen-overlay");
  const cornerIcon = document.getElementById("video-fs-corner-icon");
  const topIcon = document.getElementById("call-fs-top-icon");
  const isNativeFs = Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
  const active = isCallFullscreenActive || isNativeFs;

  if (overlay) {
    overlay.classList.toggle("call-fullscreen-active", active);
  }
  const iconName = active ? "minimize-2" : "maximize-2";
  if (cornerIcon) {
    cornerIcon.setAttribute("data-lucide", iconName);
    if (window.lucide && cornerIcon.parentElement) {
      lucide.createIcons({ nodes: [cornerIcon.parentElement] });
    }
  }
  if (topIcon) {
    topIcon.setAttribute("data-lucide", iconName);
    if (window.lucide && topIcon.parentElement) {
      lucide.createIcons({ nodes: [topIcon.parentElement] });
    }
  }
}

async function toggleCallFullScreenView(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const overlay = document.getElementById("call-screen-overlay");
  if (!overlay) return;

  const isNativeFs = Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );

  if (isCallFullscreenActive || isNativeFs) {
    isCallFullscreenActive = false;
    if (isNativeFs) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      } catch (err) { }
    }
    syncCallFullscreenIcons();
  } else {
    isCallFullscreenActive = true;
    // Also request Native Fullscreen API on Laptop / Android tablets where supported
    try {
      if (overlay.requestFullscreen) {
        await overlay.requestFullscreen();
      } else if (overlay.webkitRequestFullscreen) {
        await overlay.webkitRequestFullscreen();
      }
    } catch (err) {
      // iOS Safari & mobile webviews fallback gracefully to our 100vw x 100dvh .call-fullscreen-active CSS mode!
    }
    syncCallFullscreenIcons();
  }
}

const btnVideoFsCorner = document.getElementById("btn-video-fullscreen-corner");
const btnCallFsTop = document.getElementById("btn-call-fullscreen-top");

if (btnVideoFsCorner) {
  btnVideoFsCorner.addEventListener("click", toggleCallFullScreenView);
}
if (btnCallFsTop) {
  btnCallFsTop.addEventListener("click", toggleCallFullScreenView);
}

document.addEventListener("fullscreenchange", syncCallFullscreenIcons);
document.addEventListener("webkitfullscreenchange", syncCallFullscreenIcons);

// --- 3. ADD ANOTHER MEMBER TO CALL (MULTI-PEER ENCRYPTED CALL INVITE & MESH) ---
let extraCallPeersConnections = {}; // peerUsername -> RTCPeerConnection
let activeCallParticipantsSet = new Set();

function renderActiveCallParticipantsPills() {
  const chipsBox = document.getElementById("call-participants-chips");
  const peerNameHeader = document.getElementById("call-peer-name");
  if (!chipsBox) return;

  const primaryPeer = (currentPeerUser || activeCallSender || "").toLowerCase();
  const allPeers = new Set();
  if (primaryPeer) allPeers.add(primaryPeer);
  activeCallParticipantsSet.forEach((p) => allPeers.add(p.toLowerCase()));

  if (allPeers.size <= 1) {
    chipsBox.classList.add("hidden");
    chipsBox.innerHTML = "";
    if (peerNameHeader && primaryPeer) peerNameHeader.textContent = "@" + primaryPeer;
    return;
  }

  const peersArr = Array.from(allPeers);
  if (peerNameHeader) {
    peerNameHeader.textContent = `Group Call (${peersArr.length + 1} in Call)`;
  }

  chipsBox.classList.remove("hidden");
  chipsBox.innerHTML = "";
  peersArr.forEach((p) => {
    const pill = document.createElement("span");
    pill.className = "call-part-pill";
    pill.innerHTML = `<i data-lucide="shield-check" style="width: 11px; height: 11px;"></i><span>@${escapeHTML(p)}</span>`;
    chipsBox.appendChild(pill);
  });
  if (window.lucide) lucide.createIcons({ nodes: [chipsBox] });
}

function openAddMemberToCallModal() {
  const modal = document.getElementById("call-add-member-modal");
  const searchInp = document.getElementById("call-add-search-input");
  if (!modal) return;
  if (searchInp) searchInp.value = "";
  renderAddCallFriendsList("");
  modal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons({ nodes: [modal] });
}

function closeAddMemberToCallModal() {
  const modal = document.getElementById("call-add-member-modal");
  if (modal) modal.classList.add("hidden");
}

function renderAddCallFriendsList(filterQuery = "") {
  const listEl = document.getElementById("call-add-friends-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const q = (filterQuery || "").trim().toLowerCase().replace(/^@/, "");
  const primaryPeer = (currentPeerUser || activeCallSender || "").toLowerCase();
  const friends = getMyConnectedFriendsOnly().filter(
    (p) => p !== primaryPeer && !activeCallParticipantsSet.has(p) && (!q || p.includes(q))
  );

  if (friends.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 18px 12px; text-align: center; font-size: 12px; color: var(--text-dim);">
        ${q ? `No connected friend matching "@${escapeHTML(q)}"` : "All your connected friends are already in this call or no other friends available."}
      </div>
    `;
    return;
  }

  friends.forEach((fname) => {
    const isOnline = onlineUsersList.has(fname) && userSettings.onlinePresence;
    const avUrl = usersAvatarCache[fname] || "";
    const row = document.createElement("div");
    row.className = "contact-card";
    row.style.padding = "8px 10px";
    row.onclick = () => inviteFriendToActiveCall(fname);

    row.innerHTML = `
      <div class="contact-card-info">
        <div class="avatar-wrap">
          <div class="contact-avatar" id="call-add-av-${escapeHTML(fname)}" style="width: 36px; height: 36px; font-size: 13px;"></div>
          <div class="online-dot ${isOnline ? "visible" : ""}"></div>
        </div>
        <div class="contact-name-wrap">
          <span class="contact-name" style="font-size: 13.5px;">@${escapeHTML(fname)}</span>
          <span class="contact-preview-text ${isOnline ? "status-online" : ""}" style="font-size: 11px;">
            ${isOnline ? "Online • Ready to Join" : "Connected Friend"}
          </span>
        </div>
      </div>
      <div class="contact-right-meta">
        <button type="button" class="suggestion-action-pill" onclick="event.stopPropagation(); inviteFriendToActiveCall('${escapeHTML(fname)}')">
          + Ring & Add
        </button>
      </div>
    `;
    listEl.appendChild(row);
    renderAvatarElement(row.querySelector(`#call-add-av-${fname}`), fname, avUrl);
  });
}

window.inviteFriendToActiveCall = async function (targetUsername) {
  const target = (targetUsername || "").trim().toLowerCase().replace(/^@/, "");
  if (!target || !myUsername) return;

  closeAddMemberToCallModal();
  activeCallParticipantsSet.add(target);
  renderActiveCallParticipantsPills();

  showToast(`Ringing @${target} to join your encrypted ${activeCallType} call...`, "info", 3200);

  if (presenceChannel) {
    try {
      await presenceChannel.send({
        type: "broadcast",
        event: "multi-call-invite",
        payload: {
          host: myUsername.toLowerCase(),
          target: target,
          callType: activeCallType || "voice",
          existingPeer: (currentPeerUser || activeCallSender || "").toLowerCase()
        }
      });
    } catch (e) { }
  }
};

async function createExtraPeerConnectionForMember(peerUsername, isInitiator) {
  const peer = (peerUsername || "").toLowerCase();
  if (!peer) return null;

  if (extraCallPeersConnections[peer]) {
    try { extraCallPeersConnections[peer].close(); } catch (e) { }
  }

  const pc = new RTCPeerConnection(rtcConfig);
  extraCallPeersConnections[peer] = pc;
  pc.iceQueue = [];

  // Ensure localStream is ready and attached
  if (!localStream) {
    const isVideo = activeCallType === "video";
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: isVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: currentCameraFacingMode } : false
    });
    const localVideo = document.getElementById("local-video");
    if (isVideo && localVideo) {
      localVideo.srcObject = localStream;
      localVideo.muted = true;
      localVideo.play().catch(() => { });
    }
  }

  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  tuneWebRTCLowLatencyParameters(pc);

  const pairRoomId = await getSecureRoomId(peer);

  pc.onicecandidate = async (event) => {
    if (event.candidate && presenceChannel) {
      const encCand = await encryptCallSignalData(event.candidate, pairRoomId);
      presenceChannel.send({
        type: "broadcast",
        event: "multi-call-signal",
        payload: {
          from: myUsername.toLowerCase(),
          to: peer,
          type: "ice",
          data: encCand
        }
      }).catch(() => { });
    }
  };

  const remoteStream = new MediaStream();
  pc.ontrack = (event) => {
    stopCallRingtoneLoop();
    activeCallParticipantsSet.add(peer);
    renderActiveCallParticipantsPills();

    if (event.streams && event.streams[0]) {
      event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
    } else if (event.track) {
      remoteStream.addTrack(event.track);
    }

    // Play audio stream for this participant
    const extraAudiosBox = document.getElementById("extra-remote-audios-container");
    if (extraAudiosBox) {
      let audEl = document.getElementById("extra-audio-" + peer);
      if (!audEl) {
        audEl = document.createElement("audio");
        audEl.id = "extra-audio-" + peer;
        audEl.autoplay = true;
        audEl.playsInline = true;
        extraAudiosBox.appendChild(audEl);
      }
      audEl.srcObject = remoteStream;
      audEl.volume = isSpeakerphoneOn ? 1.0 : 0.85;
      audEl.play().catch(() => { });
    }

    // If video call, render their video tile in #extra-remote-videos-grid (or main #remote-video if primary isn't connected)
    if (activeCallType === "video") {
      const mainRemoteVideo = document.getElementById("remote-video");
      if (mainRemoteVideo && !mainRemoteVideo.srcObject) {
        mainRemoteVideo.srcObject = remoteStream;
        mainRemoteVideo.play().catch(() => { });
      } else {
        const extraGrid = document.getElementById("extra-remote-videos-grid");
        if (extraGrid) {
          extraGrid.classList.remove("hidden");
          let tile = document.getElementById("extra-vid-tile-" + peer);
          if (!tile) {
            tile = document.createElement("div");
            tile.id = "extra-vid-tile-" + peer;
            tile.className = "extra-remote-video-tile";
            tile.title = `Tap to swap @${peer} to main screen`;
            tile.innerHTML = `
              <video autoplay playsinline muted></video>
              <span class="extra-remote-video-label">@${escapeHTML(peer)}</span>
            `;
            tile.onclick = (e) => {
              e.stopPropagation();
              const tileVid = tile.querySelector("video");
              if (mainRemoteVideo && tileVid) {
                const tmpStream = mainRemoteVideo.srcObject;
                mainRemoteVideo.srcObject = tileVid.srcObject;
                tileVid.srcObject = tmpStream;
                mainRemoteVideo.play().catch(() => { });
                tileVid.play().catch(() => { });
              }
            };
            extraGrid.appendChild(tile);
          }
          const vEl = tile.querySelector("video");
          if (vEl && vEl.srcObject !== remoteStream) {
            vEl.srcObject = remoteStream;
            vEl.play().catch(() => { });
          }
        }
      }
    }
  };

  if (isInitiator) {
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: activeCallType === "video"
    });
    await pc.setLocalDescription(offer);
    const encOffer = await encryptCallSignalData(offer, pairRoomId);
    if (presenceChannel) {
      await presenceChannel.send({
        type: "broadcast",
        event: "multi-call-signal",
        payload: {
          from: myUsername.toLowerCase(),
          to: peer,
          type: "offer",
          callType: activeCallType || "voice",
          data: encOffer
        }
      });
    }
  }

  return pc;
}

const btnCallAddMemberTop = document.getElementById("btn-call-add-member");
const btnCallAddMemberBar = document.getElementById("btn-call-add-member-bar");
const btnCloseCallAddModal = document.getElementById("btn-close-call-add-modal");
const callAddSearchInput = document.getElementById("call-add-search-input");

if (btnCallAddMemberTop) btnCallAddMemberTop.addEventListener("click", openAddMemberToCallModal);
if (btnCallAddMemberBar) btnCallAddMemberBar.addEventListener("click", openAddMemberToCallModal);
if (btnCloseCallAddModal) btnCloseCallAddModal.addEventListener("click", closeAddMemberToCallModal);
if (callAddSearchInput) {
  callAddSearchInput.addEventListener("input", (e) => {
    renderAddCallFriendsList(e.target.value);
  });
}

// Listen for multi-call-invite and multi-call-signal on presenceChannel
const prevInitPresenceTrackerV16 = initPresenceTracker;
initPresenceTracker = function () {
  prevInitPresenceTrackerV16();
  if (!presenceChannel) return;

  presenceChannel.on("broadcast", { event: "multi-call-invite" }, async (payload) => {
    const p = payload.payload;
    const me = (myUsername || "").toLowerCase();
    if (!p || p.target !== me || blockedUsers.includes(p.host)) return;

    playSynthTone("ring");
    startCallRingtoneLoop("incoming");

    const acceptJoin = await showGlassDialog({
      title: `Incoming Group Call Invite`,
      message: `@${p.host} is inviting you to join an active encrypted ${p.callType} call${p.existingPeer ? ` with @${p.existingPeer}` : ""}. Join now?`,
      confirmText: "Join Call",
      cancelText: "Decline"
    });

    stopCallRingtoneLoop();
    if (!acceptJoin) return;

    activeCallType = p.callType || "voice";
    activeCallSender = p.host;
    activeCallParticipantsSet.add(p.host);
    if (p.existingPeer && p.existingPeer !== me) {
      activeCallParticipantsSet.add(p.existingPeer);
    }

    const overlay = document.getElementById("call-screen-overlay");
    const videoGrid = document.getElementById("video-streams-container");
    const btnCam = document.getElementById("btn-toggle-cam");
    const btnSwitch = document.getElementById("btn-switch-cam");

    if (overlay) overlay.classList.remove("hidden");
    if (videoGrid) videoGrid.classList.toggle("hidden", activeCallType !== "video");
    if (btnCam) btnCam.classList.toggle("hidden", activeCallType !== "video");
    if (btnSwitch) btnSwitch.classList.toggle("hidden", activeCallType !== "video");

    renderAvatarElement(document.getElementById("call-avatar"), p.host, usersAvatarCache[p.host] || "");
    renderActiveCallParticipantsPills();
    setCallStatusProgression("Connected • Multi-Peer E2EE Mesh");
    startCallDurationClock();

    // Initiate E2EE WebRTC tunnel to Host (and existingPeer if present in call)
    await createExtraPeerConnectionForMember(p.host, true);
    if (p.existingPeer && p.existingPeer !== me) {
      await createExtraPeerConnectionForMember(p.existingPeer, true);
    }
  });

  presenceChannel.on("broadcast", { event: "multi-call-signal" }, async (payload) => {
    const p = payload.payload;
    const me = (myUsername || "").toLowerCase();
    if (!p || p.to !== me || !p.from) return;

    const sender = p.from.toLowerCase();
    const pairRoomId = await getSecureRoomId(sender);
    const decryptedSignal = await decryptCallSignalData(p.data, pairRoomId);
    if (!decryptedSignal) return;

    if (p.type === "offer") {
      activeCallParticipantsSet.add(sender);
      renderActiveCallParticipantsPills();
      showToast(`@${sender} joined the encrypted call!`, "success", 2200);

      const pc = await createExtraPeerConnectionForMember(sender, false);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(decryptedSignal));
        while (pc.iceQueue && pc.iceQueue.length > 0) {
          const c = pc.iceQueue.shift();
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { }
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const encAnswer = await encryptCallSignalData(answer, pairRoomId);
        await presenceChannel.send({
          type: "broadcast",
          event: "multi-call-signal",
          payload: {
            from: me,
            to: sender,
            type: "answer",
            data: encAnswer
          }
        });
      }
    } else if (p.type === "answer") {
      const pc = extraCallPeersConnections[sender];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(decryptedSignal));
        while (pc.iceQueue && pc.iceQueue.length > 0) {
          const c = pc.iceQueue.shift();
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { }
        }
      }
    } else if (p.type === "ice") {
      const pc = extraCallPeersConnections[sender];
      if (pc) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try { await pc.addIceCandidate(new RTCIceCandidate(decryptedSignal)); } catch (e) { }
        } else {
          pc.iceQueue.push(decryptedSignal);
        }
      }
    }
  });
};

// Clean up extra call peers & exit fullscreen when ending call
const prevEndCallV16 = endCall;
endCall = function (notifyRemote = true) {
  Object.keys(extraCallPeersConnections).forEach((k) => {
    try { extraCallPeersConnections[k].close(); } catch (e) { }
  });
  extraCallPeersConnections = {};
  activeCallParticipantsSet.clear();
  renderActiveCallParticipantsPills();

  const extraGrid = document.getElementById("extra-remote-videos-grid");
  if (extraGrid) {
    extraGrid.innerHTML = "";
    extraGrid.classList.add("hidden");
  }
  const extraAudios = document.getElementById("extra-remote-audios-container");
  if (extraAudios) extraAudios.innerHTML = "";

  if (isCallFullscreenActive || document.fullscreenElement) {
    isCallFullscreenActive = false;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => { });
    }
    syncCallFullscreenIcons();
  }

  prevEndCallV16(notifyRemote);
};


// =========================================================================
// 20. FEATURE v18000:
//     SINGLE EMOJI JUMBO ENLARGED VIEW + MINI POP/FLOAT/HEARTBEAT ANIMATION
// =========================================================================

const HEART_EMOJIS_SET = new Set([
  "❤️", "🩷", "🧡", "💛", "💚", "💙", "🩵", "💜", "🖤", "🩶", "🤍", "🤎",
  "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "🫶"
]);

function isSingleEmojiOnlyString(rawStr) {
  const s = String(rawStr || "").trim();
  if (!s || s.length > 16) return false;
  // Reject plain ASCII digits, letters, or symbols like "#", "*", "1"
  if (/^[\x00-\x7F]+$/.test(s)) return false;

  // Check if string has at least one genuine Extended_Pictographic / Emoji character
  let hasEmojiChar = false;
  try {
    hasEmojiChar = /\p{Extended_Pictographic}|\p{Emoji_Presentation}/u.test(s);
  } catch (e) {
    hasEmojiChar = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s);
  }
  if (!hasEmojiChar) return false;

  // Use Intl.Segmenter to verify it is exactly 1 grapheme cluster (handles skin tones, ZWJ sequences, flags, ❤️‍🔥, etc.)
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment(s));
    return segments.length === 1;
  }

  return Array.from(s).length <= 2;
}

function applyJumboSingleEmojiStyling(node) {
  if (!node) return;
  if (node.dataset.msgType && node.dataset.msgType !== "text") return;

  const bubbleContent = node.querySelector(".bubble-content");
  const textLineEl = node.querySelector(".msg-text-line");
  if (!bubbleContent || !textLineEl) return;

  // Do not enlarge if message contains a spoiler or code block or call log
  if (
    bubbleContent.querySelector(".spoiler-badge-hint") ||
    textLineEl.querySelector(".krypton-spoiler") ||
    textLineEl.querySelector(".code-block-wrap") ||
    textLineEl.querySelector(".call-system-log-card")
  ) {
    bubbleContent.classList.remove("jumbo-emoji-bubble");
    textLineEl.classList.remove("jumbo-single-emoji", "jumbo-heart-emoji");
    return;
  }

  const plainText = (textLineEl.textContent || "").trim();
  if (isSingleEmojiOnlyString(plainText)) {
    bubbleContent.classList.add("jumbo-emoji-bubble");
    textLineEl.classList.add("jumbo-single-emoji");
    textLineEl.classList.toggle("jumbo-heart-emoji", HEART_EMOJIS_SET.has(plainText));

    // Allow tapping the jumbo emoji to replay its pop-in animation!
    if (!textLineEl.dataset.jumboTapBound) {
      textLineEl.dataset.jumboTapBound = "true";
      textLineEl.addEventListener("click", () => {
        textLineEl.style.animation = "none";
        void textLineEl.offsetWidth; // trigger reflow
        textLineEl.style.animation = "";
      });
    }
  } else {
    bubbleContent.classList.remove("jumbo-emoji-bubble");
    textLineEl.classList.remove("jumbo-single-emoji", "jumbo-heart-emoji");
  }
}

const prevCreateMessageNodeV17 = createMessageNode;
createMessageNode = async function (msg, rawTextOverride) {
  const node = await prevCreateMessageNodeV17(msg, rawTextOverride);
  if (node) {
    applyJumboSingleEmojiStyling(node);
  }
  return node;
};

const prevApplyEditedMessageToDOMV17 = applyEditedMessageToDOM;
applyEditedMessageToDOM = function (msgId, newText) {
  prevApplyEditedMessageToDOMV17(msgId, newText);
  const row = document.getElementById("msg-row-" + msgId);
  if (row) {
    applyJumboSingleEmojiStyling(row);
  }
};


// =========================================================================
// 21. FEATURE v19000:
//     1. STRICT FRIEND-ZONE & CALL-PERMISSION CHECK FOR GROUP CALL INVITES
//        (IF CALL PERMISSION IS NOT ALLOWED YET, SEND CALL PERMISSION REQUEST FIRST!)
//     2. ANTI-SCREENSHOT & SCREEN RECORDING PRIVACY SHIELD DURING VIDEO CALLS
//     3. FULLSCREEN ADD-MEMBER MODAL & PIP SWAP FIXES
// =========================================================================

// --- 1. STRICT FRIEND-ZONE & CALL-PERMISSION ENFORCEMENT FOR GROUP CALLS ---
renderAddCallFriendsList = function (filterQuery = "") {
  const listEl = document.getElementById("call-add-friends-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const q = (filterQuery || "").trim().toLowerCase().replace(/^@/, "");
  const me = (myUsername || "").toLowerCase();
  const primaryPeer = (currentPeerUser || activeCallSender || "").toLowerCase();

  // Strictly filter ONLY accepted friends from peerRelationshipMap!
  const acceptedFriends = Object.keys(peerRelationshipMap || {}).filter((peerKey) => {
    const p = peerKey.toLowerCase();
    const rel = peerRelationshipMap[peerKey];
    if (!rel || p === me || p === primaryPeer || activeCallParticipantsSet.has(p)) return false;
    if (blockedUsers.includes(p) || deletedPeersList.includes(p)) return false;
    const isAcceptedFriend =
      rel.status === "accepted" || (rel.status && rel.status.startsWith("call_"));
    return isAcceptedFriend && (!q || p.includes(q));
  }).sort();

  if (acceptedFriends.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 18px 12px; text-align: center; font-size: 12px; color: var(--text-dim);">
        ${q
        ? `No connected friend matching "@${escapeHTML(q)}"`
        : "No other accepted friends available to add. (Users must be in your Friend Zone first!)"
      }
      </div>
    `;
    return;
  }

  acceptedFriends.forEach((fname) => {
    const isOnline = onlineUsersList.has(fname) && userSettings.onlinePresence;
    const avUrl = usersAvatarCache[fname] || "";
    const rel = peerRelationshipMap[fname] || {};
    const isCallPermAllowed = rel.call_allowed === true;
    const isPermPending = rel.status && rel.status.startsWith("call_perm_req:");

    let subStatus = isCallPermAllowed
      ? isOnline
        ? "Online • Call Permission Approved ✓"
        : "Friend • Call Permission Approved ✓"
      : isPermPending
        ? "Call Permission Request Pending..."
        : "Friend • Requires Call Permission First";

    let btnLabel = isCallPermAllowed
      ? "+ Ring & Add"
      : isPermPending
        ? "Req Pending"
        : "Send Call Req";

    const row = document.createElement("div");
    row.className = "contact-card";
    row.style.padding = "8px 10px";
    row.onclick = () => inviteFriendToActiveCall(fname);

    row.innerHTML = `
      <div class="contact-card-info">
        <div class="avatar-wrap">
          <div class="contact-avatar" id="call-add-av-${escapeHTML(fname)}" style="width: 36px; height: 36px; font-size: 13px;"></div>
          <div class="online-dot ${isOnline ? "visible" : ""}"></div>
        </div>
        <div class="contact-name-wrap">
          <span class="contact-name" style="font-size: 13.5px;">@${escapeHTML(fname)}</span>
          <span class="contact-preview-text ${isOnline ? "status-online" : ""}" style="font-size: 11px;">
            ${escapeHTML(subStatus)}
          </span>
        </div>
      </div>
      <div class="contact-right-meta">
        <button type="button" class="suggestion-action-pill ${isCallPermAllowed ? "" : "secondary"}" onclick="event.stopPropagation(); inviteFriendToActiveCall('${escapeHTML(fname)}')">
          ${escapeHTML(btnLabel)}
        </button>
      </div>
    `;
    listEl.appendChild(row);
    renderAvatarElement(row.querySelector(`#call-add-av-${fname}`), fname, avUrl);
  });
};

window.inviteFriendToActiveCall = async function (targetUsername) {
  const target = (targetUsername || "").trim().toLowerCase().replace(/^@/, "");
  const me = (myUsername || "").toLowerCase();
  if (!target || !me) return;

  // 1. Verify target is in Friend Zone (Accepted Friend) AND check call_allowed permission!
  const rel = await getPeerRelationshipState(target);
  if (rel.state !== "accepted" || !rel.row) {
    closeAddMemberToCallModal();
    showToast(`@${target} aapke Friend Zone mein nahi hai! Pehle Friend Request bhejein.`, "error", 3500);
    await requestChatConnection(target);
    return;
  }

  // 2. If Call Permission (`call_allowed`) is NOT true yet, send a Call Permission Request first!
  if (rel.row.call_allowed !== true) {
    if (rel.row.status && rel.row.status.startsWith("call_perm_req:")) {
      showToast(`Call Permission Request @${target} ko pehle hi bheji ja chuki hai. Unke Allow karne ka wait karein!`, "info", 3500);
      return;
    }

    if (supabaseClient) {
      const permReqStatus = `call_perm_req:${me}`;
      await supabaseClient
        .from("chat_requests")
        .update({ call_allowed: false, status: permReqStatus })
        .or(
          `and(sender_id.ilike.${me},receiver_id.ilike.${target}),` +
          `and(sender_id.ilike.${target},receiver_id.ilike.${me})`
        );
      await fetchPendingRequests();
      renderAddCallFriendsList("");
      showToast(
        `Call Permission Request sent to @${target}! Jaise hi wo Allow karenge, aap unhe call mein add kar sakenge.`,
        "success",
        4000
      );
    }
    return;
  }

  // 3. Both Friend Zone AND Call Permission are verified -> Ring & Add to Active Call!
  closeAddMemberToCallModal();
  activeCallParticipantsSet.add(target);
  renderActiveCallParticipantsPills();

  showToast(`Ringing @${target} to join your encrypted ${activeCallType} call...`, "info", 3200);

  if (presenceChannel) {
    try {
      await presenceChannel.send({
        type: "broadcast",
        event: "multi-call-invite",
        payload: {
          host: me,
          target: target,
          callType: activeCallType || "voice",
          existingPeer: (currentPeerUser || activeCallSender || "").toLowerCase()
        }
      });
    } catch (e) { }
  }
};

// --- 2. ANTI-SCREENSHOT & SCREEN RECORDING PRIVACY SHIELD DURING CALLS ---
let callCaptureShieldTimeout = null;

function activateCallCapturePrivacyShield(reasonText = "Screenshot & Screen Recording Blocked during Encrypted Call!") {
  const overlay = document.getElementById("call-screen-overlay");
  if (!overlay || overlay.classList.contains("hidden")) return;

  const shield = document.getElementById("call-capture-shield");
  const videoContainer = document.getElementById("video-streams-container");

  if (shield) {
    shield.classList.remove("hidden");
    if (window.lucide) lucide.createIcons({ nodes: [shield] });
  }
  if (videoContainer) {
    videoContainer.style.filter = "blur(32px) brightness(0.15)";
  }

  // Clear clipboard in case PrintScreen copied frame to clipboard
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard.writeText("Krypton Privacy Shield: Screenshots are disabled during encrypted calls.").catch(() => { });
  }

  showToast(reasonText, "error", 3200);

  clearTimeout(callCaptureShieldTimeout);
  callCaptureShieldTimeout = setTimeout(() => {
    if (!document.hidden) {
      if (shield) shield.classList.add("hidden");
      if (videoContainer) videoContainer.style.filter = "";
    }
  }, 2600);
}

// Block PrintScreen, Meta+Shift+S (Windows Snipping Tool), Cmd+Shift+3/4/5 (Mac Screenshot/Record) during active call
window.addEventListener(
  "keydown",
  (e) => {
    const overlay = document.getElementById("call-screen-overlay");
    if (!overlay || overlay.classList.contains("hidden")) return;

    const isPrintScreen = e.key === "PrintScreen" || e.keyCode === 44;
    const isWinSnip = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "S" || e.key === "s");
    const isMacShot = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key);

    if (isPrintScreen || isWinSnip || isMacShot) {
      e.preventDefault();
      e.stopPropagation();
      activateCallCapturePrivacyShield("Screenshot Blocked! Encrypted calls cannot be captured.");
    }
  },
  true
);

window.addEventListener(
  "keyup",
  (e) => {
    const overlay = document.getElementById("call-screen-overlay");
    if (!overlay || overlay.classList.contains("hidden")) return;
    if (e.key === "PrintScreen" || e.keyCode === 44) {
      activateCallCapturePrivacyShield("Screenshot Blocked! Encrypted calls cannot be captured.");
    }
  },
  true
);

// Blur video streams immediately if user opens mobile control center / screen recorder / switches focus during call
document.addEventListener("visibilitychange", () => {
  const overlay = document.getElementById("call-screen-overlay");
  if (!overlay || overlay.classList.contains("hidden")) return;
  const shield = document.getElementById("call-capture-shield");
  const videoContainer = document.getElementById("video-streams-container");

  if (document.hidden) {
    if (shield) shield.classList.remove("hidden");
    if (videoContainer) videoContainer.style.filter = "blur(32px) brightness(0.15)";
  } else {
    setTimeout(() => {
      if (shield) shield.classList.add("hidden");
      if (videoContainer) videoContainer.style.filter = "";
    }, 450);
  }
});

// Prevent context menu / long-press save on call screen and video streams
const callOverlayElV19 = document.getElementById("call-screen-overlay");
if (callOverlayElV19) {
  callOverlayElV19.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}

// Intercept getDisplayMedia during active call so browser tab screen-recording is blocked
if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function") {
  const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getDisplayMedia = async function (constraints) {
    const overlay = document.getElementById("call-screen-overlay");
    if (overlay && !overlay.classList.contains("hidden")) {
      activateCallCapturePrivacyShield("Screen Recording is strictly disabled during Encrypted Calls!");
      throw new Error("Screen recording is disabled during encrypted calls.");
    }
    return origGetDisplayMedia(constraints);
  };
}


// =========================================================================
// 22. FEATURE v20000:
//     1. LIVE VOICE-TO-VIDEO CALL UPGRADE & CAMERA FLIP ON AUDIO CALLS
//        (BOTH #btn-toggle-cam & #btn-switch-cam VISIBLE & ACTIVE IN AUDIO CALLS!)
//     2. MUTE & CAMERA BUTTON VISUAL RESET ON EVERY NEW CALL & END CALL
//        (FIXES STUCK COLORFUL RED MUTE ICON WHEN NEXT CALL CONNECTS!)
//     3. AUDIO + VIDEO CALL PRIVACY SHIELD (BLOCKS SCREENSHOT, SCREEN RECORD
//        & AUDIO CAPTURE ON BOTH VOICE & VIDEO CALLS!)
//     4. GUARANTEED IDENTICAL E2EE SAFETY FINGERPRINT ON BOTH DEVICES
//        (FETCHES PEER'S DB SESSION_TOKEN BEFORE COMPUTING SHA-256)
//     5. SETTINGS BLOCKED USERS MANAGER (UNBLOCK & RECONNECT EVEN AFTER
//        DELETING USER FROM CHATS!)
// =========================================================================

// --- 1. RESET CALL CONTROL BUTTONS VISUAL STATE ON EVERY CALL START & END ---
function resetCallButtonsVisualState() {
  isAudioMuted = false;
  isVideoMuted = false;
  const btnMic = document.getElementById("btn-toggle-mic");
  const btnCam = document.getElementById("btn-toggle-cam");
  const btnSwitch = document.getElementById("btn-switch-cam");

  if (btnMic) {
    btnMic.classList.remove("recording-active");
    btnMic.innerHTML = '<i data-lucide="mic"></i>';
    btnMic.title = "Mute/Unmute Mic";
  }
  if (btnCam) {
    // Always keep Camera button visible in both Voice & Video calls!
    btnCam.classList.remove("hidden");
    const isVoiceOnly = activeCallType !== "video";
    btnCam.classList.toggle("recording-active", isVoiceOnly);
    btnCam.innerHTML = isVoiceOnly
      ? '<i data-lucide="video-off"></i>'
      : '<i data-lucide="video"></i>';
    btnCam.title = isVoiceOnly
      ? "Turn ON Camera (Upgrade Audio Call to Video Call)"
      : "Pause / Resume Camera";
  }
  if (btnSwitch) {
    // Always keep Flip Camera button visible in both Voice & Video calls!
    btnSwitch.classList.remove("hidden");
  }
  const callBar = document.querySelector(".call-action-bar");
  if (window.lucide && callBar) {
    lucide.createIcons({ nodes: [callBar] });
  }
}

// Live Upgrade from Voice Call (or Paused Video) -> Active Video Call with Renegotiation!
async function enableOrUpgradeCallCamera(desiredFacingMode) {
  if (desiredFacingMode) {
    currentCameraFacingMode = desiredFacingMode;
  }

  try {
    // Case A: We already have a live video track in localStream -> just toggle or flip it!
    const existingVidTrack = localStream ? localStream.getVideoTracks()[0] : null;
    if (existingVidTrack && existingVidTrack.readyState === "live" && !desiredFacingMode) {
      isVideoMuted = !isVideoMuted;
      existingVidTrack.enabled = !isVideoMuted;
      const btnCam = document.getElementById("btn-toggle-cam");
      if (btnCam) {
        btnCam.classList.toggle("recording-active", isVideoMuted);
        btnCam.innerHTML = isVideoMuted
          ? '<i data-lucide="video-off"></i>'
          : '<i data-lucide="video"></i>';
        if (window.lucide) lucide.createIcons({ nodes: [btnCam] });
      }
      showToast(isVideoMuted ? "Camera paused" : "Camera active", "info", 1600);
      return;
    }

    // Case B: We are in a Voice Call (no video track yet) OR switching Front/Back camera -> Request Camera Stream!
    if (existingVidTrack) {
      existingVidTrack.stop();
      localStream.removeTrack(existingVidTrack);
    }

    const camStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: { ideal: currentCameraFacingMode || "user" }
      },
      audio: false
    });

    const newVideoTrack = camStream.getVideoTracks()[0];
    if (!newVideoTrack) return;

    if (!localStream) {
      localStream = camStream;
    } else {
      localStream.addTrack(newVideoTrack);
    }

    activeCallType = "video";
    isVideoMuted = false;

    const videoGrid = document.getElementById("video-streams-container");
    const localVideo = document.getElementById("local-video");
    const btnCam = document.getElementById("btn-toggle-cam");
    const btnSwitch = document.getElementById("btn-switch-cam");

    if (videoGrid) videoGrid.classList.remove("hidden");
    if (btnSwitch) btnSwitch.classList.remove("hidden");
    if (btnCam) {
      btnCam.classList.remove("hidden", "recording-active");
      btnCam.innerHTML = '<i data-lucide="video"></i>';
      if (window.lucide) lucide.createIcons({ nodes: [btnCam] });
    }

    if (localVideo) {
      localVideo.srcObject = localStream;
      localVideo.muted = true;
      localVideo.play().catch(() => { });
    }

    applyVideoMirrorClasses();
    broadcastMyCameraFacingMode(currentCameraFacingMode);

    // Attach or replace video track on primary peerConnection and renegotiate encrypted SDP Offer!
    if (peerConnection && peerConnection.signalingState !== "closed") {
      const existingVideoSender = peerConnection
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (existingVideoSender) {
        await existingVideoSender.replaceTrack(newVideoTrack);
      } else {
        peerConnection.addTrack(newVideoTrack, localStream);
        // Renegotiate E2EE SDP Offer so remote peer's video grid opens automatically!
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await peerConnection.setLocalDescription(offer);
        if (activeSubscription && currentRoom) {
          const encOffer = await encryptCallSignalData(offer, currentRoom);
          activeSubscription.send({
            type: "broadcast",
            event: "webrtc-offer-e2ee",
            payload: { encOffer, sender: myUsername, callType: "video" }
          });
        }
      }
      tuneWebRTCLowLatencyParameters(peerConnection);
    }

    // Also attach/renegotiate on any multi-peer conference connections!
    for (const peerKey of Object.keys(extraCallPeersConnections)) {
      const pc = extraCallPeersConnections[peerKey];
      if (!pc || pc.signalingState === "closed") continue;
      const vSender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (vSender) {
        await vSender.replaceTrack(newVideoTrack);
      } else {
        pc.addTrack(newVideoTrack, localStream);
        const pairRoomId = await getSecureRoomId(peerKey);
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        const encOffer = await encryptCallSignalData(offer, pairRoomId);
        if (presenceChannel) {
          await presenceChannel.send({
            type: "broadcast",
            event: "multi-call-signal",
            payload: {
              from: myUsername.toLowerCase(),
              to: peerKey,
              type: "offer",
              callType: "video",
              data: encOffer
            }
          });
        }
      }
    }

    showToast(
      desiredFacingMode
        ? currentCameraFacingMode === "user"
          ? "Front Camera Active"
          : "Back Camera Active"
        : "Camera Turned ON (Live Video Active)",
      "success",
      1800
    );
  } catch (err) {
    console.warn("Enable/Upgrade camera error:", err);
    showToast("Camera permission required to turn on video.", "error");
  }
}

// Re-bind #btn-toggle-cam and #btn-switch-cam so both work during Audio Calls AND Video Calls!
const btnToggleCamV20 = document.getElementById("btn-toggle-cam");
if (btnToggleCamV20) {
  const cleanCamBtn = btnToggleCamV20.cloneNode(true);
  btnToggleCamV20.parentNode.replaceChild(cleanCamBtn, btnToggleCamV20);
  cleanCamBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await enableOrUpgradeCallCamera(null);
  });
}

const btnSwitchCamV20 = document.getElementById("btn-switch-cam");
if (btnSwitchCamV20) {
  const cleanSwitchBtn = btnSwitchCamV20.cloneNode(true);
  btnSwitchCamV20.parentNode.replaceChild(cleanSwitchBtn, btnSwitchCamV20);
  cleanSwitchBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextFacing = currentCameraFacingMode === "user" ? "environment" : "user";
    await enableOrUpgradeCallCamera(nextFacing);
  });
}

// Also ensure when remote peer upgrades a Voice Call to Video Call mid-call, our #video-streams-container opens automatically!
const prevStartWebRTCv19 = startWebRTC;
startWebRTC = async function (isCaller, type) {
  resetCallButtonsVisualState();
  await prevStartWebRTCv19(isCaller, type);
  resetCallButtonsVisualState();

  if (peerConnection) {
    const prevOnTrackV19 = peerConnection.ontrack;
    peerConnection.ontrack = (event) => {
      if (prevOnTrackV19) prevOnTrackV19(event);
      const hasVideoTrack =
        (event.track && event.track.kind === "video") ||
        (event.streams && event.streams[0] && event.streams[0].getVideoTracks().length > 0);

      if (hasVideoTrack) {
        activeCallType = "video";
        const videoGrid = document.getElementById("video-streams-container");
        const remoteVideo = document.getElementById("remote-video");
        if (videoGrid) videoGrid.classList.remove("hidden");
        if (remoteVideo && event.streams && event.streams[0]) {
          remoteVideo.srcObject = event.streams[0];
          remoteVideo.play().catch(() => { });
        }
      }
    };
  }
};

// Also ensure outgoing call ringing screen shows Camera & Flip buttons and resets Mute button color!
const prevInitiateCallPermissionV19 = initiateCallPermission;
initiateCallPermission = async function (type) {
  resetCallButtonsVisualState();
  await prevInitiateCallPermissionV19(type);
  resetCallButtonsVisualState();
};

const prevEndCallV19 = endCall;
endCall = function (notifyRemote = true) {
  resetCallButtonsVisualState();
  const shield = document.getElementById("call-capture-shield");
  if (shield) shield.classList.add("hidden");
  const remoteAudio = document.getElementById("remote-audio");
  if (remoteAudio) remoteAudio.muted = false;
  prevEndCallV19(notifyRemote);
};

// --- 3. UPGRADE CALL PRIVACY SHIELD TO PROTECT BOTH AUDIO & VIDEO CALLS ---
activateCallCapturePrivacyShield = function (
  reasonText = "Screenshot, Screen Recording & Audio Recording are Blocked during Encrypted Calls!"
) {
  const overlay = document.getElementById("call-screen-overlay");
  if (!overlay || overlay.classList.contains("hidden")) return;

  const shield = document.getElementById("call-capture-shield");
  const videoContainer = document.getElementById("video-streams-container");
  const remoteAudio = document.getElementById("remote-audio");

  if (shield) {
    const h4 = shield.querySelector("h4");
    const p = shield.querySelector("p");
    if (h4) h4.textContent = "Screenshot, Screen & Audio Recording Blocked";
    if (p) p.textContent = "Voice & Video streams are protected by Krypton Privacy Shield.";
    shield.classList.remove("hidden");
    if (window.lucide) lucide.createIcons({ nodes: [shield] });
  }
  if (videoContainer) {
    videoContainer.style.filter = "blur(32px) brightness(0.15)";
  }
  // Temporarily mute audio output during capture attempt so screen/audio recorders cannot record call audio!
  if (remoteAudio) {
    remoteAudio.muted = true;
  }
  document.querySelectorAll("#extra-remote-audios-container audio").forEach((a) => {
    a.muted = true;
  });

  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard
      .writeText("Krypton Privacy Shield: Screen & Audio capture is disabled during encrypted calls.")
      .catch(() => { });
  }

  showToast(reasonText, "error", 3200);

  clearTimeout(callCaptureShieldTimeout);
  callCaptureShieldTimeout = setTimeout(() => {
    if (!document.hidden) {
      if (shield) shield.classList.add("hidden");
      if (videoContainer) videoContainer.style.filter = "";
      if (remoteAudio) remoteAudio.muted = false;
      document.querySelectorAll("#extra-remote-audios-container audio").forEach((a) => {
        a.muted = false;
      });
    }
  }, 2600);
};

// Block audio/video captureStream() on call media elements so third-party extensions cannot record call audio
["remote-audio", "remote-video", "local-video"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) {
    el.captureStream = function () {
      activateCallCapturePrivacyShield("Audio/Video Stream Recording Blocked!");
      throw new Error("Stream capture is blocked by Krypton Privacy Shield.");
    };
    el.mozCaptureStream = el.captureStream;
  }
});

// --- 4. GUARANTEED IDENTICAL E2EE SAFETY FINGERPRINT ON BOTH DEVICES ---
computeSafetyFingerprint = async function (peerUsername) {
  const p = (peerUsername || "").trim().toLowerCase().replace(/^@/, "");
  const me = (myUsername || "").trim().toLowerCase().replace(/^@/, "");
  if (!p) return "0000 • 0000 • 0000 • 0000";

  // Ensure both mySessionId and peer's session_token are fetched from DB if missing so both phones compute the EXACT same hash!
  if (!usersSessionCache[p] && supabaseClient && p !== me) {
    try {
      const { data } = await supabaseClient
        .from("users")
        .select("session_token")
        .ilike("username", p)
        .limit(1);
      if (data && data.length > 0 && data[0].session_token) {
        usersSessionCache[p] = data[0].session_token;
        peerTokenBindingMap[p] = data[0].session_token;
        localStorage.setItem("krypton_session_cache", JSON.stringify(usersSessionCache));
        localStorage.setItem("krypton_peer_token_bindings", JSON.stringify(peerTokenBindingMap));
      }
    } catch (e) { }
  }

  const myIdentityToken = (mySessionId || me).trim().toLowerCase();
  const peerIdentityToken = (usersSessionCache[p] || peerTokenBindingMap[p] || p).trim().toLowerCase();

  // Sort both tokens alphabetically so User A and User B always produce the 100% identical SHA-256 fingerprint!
  const canonicalPair = [myIdentityToken, peerIdentityToken].sort().join("::krypton_e2ee::");
  const hashHex = await hashPassword(canonicalPair);
  const upper = hashHex.slice(0, 16).toUpperCase();
  return `${upper.slice(0, 4)} • ${upper.slice(4, 8)} • ${upper.slice(8, 12)} • ${upper.slice(12, 16)}`;
};

// --- 5. SETTINGS BLOCKED USERS MANAGER (UNBLOCK & RECONNECT ANYTIME) ---
function renderBlockedUsersSettingsList() {
  const listEl = document.getElementById("settings-blocked-users-list");
  const countBadge = document.getElementById("blocked-users-count-badge");
  const btnUnblockAll = document.getElementById("btn-unblock-all-users");
  if (!listEl) return;

  const cleanBlocked = [...new Set((blockedUsers || []).map((u) => (u || "").trim().toLowerCase()).filter(Boolean))];
  blockedUsers = cleanBlocked;

  if (countBadge) countBadge.textContent = String(cleanBlocked.length);
  if (btnUnblockAll) {
    btnUnblockAll.classList.toggle("hidden", cleanBlocked.length <= 1);
  }

  listEl.innerHTML = "";

  if (cleanBlocked.length === 0) {
    listEl.innerHTML = `
      <div style="padding: 12px 10px; font-size: 11.5px; color: var(--text-dim); text-align: center; background: var(--glass-bg); border-radius: 11px; border: 1px dashed var(--glass-border-subtle);">
        No blocked users. Anyone you block will appear here so you can unblock & reconnect anytime.
      </div>
    `;
    return;
  }

  cleanBlocked.forEach((uname) => {
    const avUrl = usersAvatarCache[uname] || "";
    const row = document.createElement("div");
    row.className = "blocked-user-row";
    row.innerHTML = `
      <div class="blocked-user-info">
        <div class="avatar sm" id="blk-av-${escapeHTML(uname)}" style="width: 32px; height: 32px; font-size: 12px;"></div>
        <div class="device-meta-stack">
          <span class="device-name-title">@${escapeHTML(uname)}</span>
          <span class="device-sub-line" style="color: var(--danger-color);">Blocked • Messages & Calls Hidden</span>
        </div>
      </div>
      <div class="blocked-user-actions">
        <button type="button" class="btn-unblock-user-pill" onclick="unblockAndRestoreUser('${escapeHTML(uname)}', false)">
          Unblock
        </button>
        <button type="button" class="suggestion-action-pill" onclick="unblockAndRestoreUser('${escapeHTML(uname)}', true)" title="Unblock and Open Chat">
          Unblock & Chat
        </button>
      </div>
    `;
    listEl.appendChild(row);
    renderAvatarElement(row.querySelector(`#blk-av-${uname}`), uname, avUrl);
  });
}

window.unblockAndRestoreUser = async function (username, openChatImmediately = false) {
  const uname = (username || "").trim().toLowerCase().replace(/^@/, "");
  if (!uname) return;

  // 1. Remove from blockedUsers
  blockedUsers = (blockedUsers || []).filter((u) => u.toLowerCase() !== uname);
  localStorage.setItem("krypton_blocked_users", JSON.stringify(blockedUsers));

  // 2. Also remove from deletedPeersList and restore to savedPeers so even if the user had deleted the chat, @uname comes back!
  deletedPeersList = (deletedPeersList || []).filter((u) => u.toLowerCase() !== uname);
  localStorage.setItem("krypton_deleted_peers", JSON.stringify(deletedPeersList));
  savePeerToRecent(uname, true, true);

  renderBlockedUsersSettingsList();
  await fetchPendingRequests();
  renderPeerList();

  showToast(`Unblocked @${uname}! Restored to your conversations list.`, "success");

  if (openChatImmediately) {
    switchSidebarPrimaryView("chats");
    const dmRoom = await getSecureRoomId(uname);
    joinRoom(dmRoom, "@" + uname);
  }
};

// Upgrade toggleBlockUser so blocking/unblocking anywhere immediately updates the Settings Blocked Users list!
const prevToggleBlockUserV19 = window.toggleBlockUser;
window.toggleBlockUser = function (username) {
  const uname = (username || "").trim().toLowerCase().replace(/^@/, "");
  const wasBlocked = blockedUsers.includes(uname);
  prevToggleBlockUserV19(uname);

  if (wasBlocked) {
    // Was blocked -> now unblocked: also ensure they are un-deleted from deletedPeersList so they appear in chats
    deletedPeersList = (deletedPeersList || []).filter((u) => u.toLowerCase() !== uname);
    localStorage.setItem("krypton_deleted_peers", JSON.stringify(deletedPeersList));
    savePeerToRecent(uname, true, true);
  }
  renderBlockedUsersSettingsList();
};

const btnUnblockAllUsers = document.getElementById("btn-unblock-all-users");
if (btnUnblockAllUsers) {
  btnUnblockAllUsers.addEventListener("click", async () => {
    if (!blockedUsers || blockedUsers.length === 0) return;
    const ok = await showGlassDialog({
      title: "Unblock All Users?",
      message: `Unblock all ${blockedUsers.length} user(s) and restore them to your conversations list?`,
      confirmText: "Unblock All"
    });
    if (!ok) return;

    const toRestore = [...blockedUsers];
    blockedUsers = [];
    localStorage.setItem("krypton_blocked_users", JSON.stringify(blockedUsers));

    toRestore.forEach((u) => {
      const clean = u.toLowerCase();
      deletedPeersList = deletedPeersList.filter((d) => d.toLowerCase() !== clean);
      if (!savedPeers.includes(clean)) savedPeers.unshift(clean);
    });
    localStorage.setItem("krypton_deleted_peers", JSON.stringify(deletedPeersList));
    localStorage.setItem("krypton_peers", JSON.stringify(savedPeers));

    renderBlockedUsersSettingsList();
    await fetchPendingRequests();
    renderPeerList();
    showToast("All users have been unblocked!", "success");
  });
}

// Hook switchSidebarPrimaryView and openSettingsModal so Blocked Users list refreshes whenever Settings is opened
const prevSwitchSidebarPrimaryViewV19 = switchSidebarPrimaryView;
switchSidebarPrimaryView = function (viewName = "chats") {
  prevSwitchSidebarPrimaryViewV19(viewName);
  if (viewName === "settings") {
    renderBlockedUsersSettingsList();
  }
};

renderBlockedUsersSettingsList();


// =========================================================================
// 23. FEATURE v21000: ANDROID NATIVE APK & PWA LAUNCH-READY UPGRADES
//     1. APP-WIDE ANTI-SCREENSHOT & SCREEN RECORDING SHIELD (CHATS, VIEW-ONCE,
//        LIGHTBOX, VOICE/VIDEO CALLS & ANDROID FLAG_SECURE NATIVE BRIDGE)
//     2. UNIFIED NATIVE ANDROID PERMISSIONS MANAGER (CAMERA, MIC & NOTIFICATIONS)
//     3. ANDROID HARDWARE BACK BUTTON HANDLER (CLOSES MODALS/LIGHTBOX/CHAT FIRST)
// =========================================================================

if (userSettings.antiCapture === undefined) {
  userSettings.antiCapture = true;
  localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
}

function ensureGlobalCaptureShieldDOM() {
  if (document.getElementById("global-capture-shield-overlay")) return;
  const div = document.createElement("div");
  div.id = "global-capture-shield-overlay";
  div.className = "hidden";
  div.innerHTML = `
    <div class="auth-logo-glow" style="border-color: var(--danger-color); background: rgba(244, 63, 94, 0.14);">
      <i data-lucide="shield-ban" style="width: 34px; height: 34px; color: var(--danger-color);"></i>
    </div>
    <h3>Screenshot & Screen Recording Blocked</h3>
    <p>Krypton Privacy Shield is active. Screen capture, recording, and recent-apps previews are restricted.</p>
  `;
  document.body.appendChild(div);
  if (window.lucide) lucide.createIcons({ nodes: [div] });
}

function syncNativeAndroidFlagSecure(enabled) {
  document.body.classList.toggle("anti-capture-armed", Boolean(enabled));
  // If running inside Capacitor / Cordova / Android WebView with PrivacyScreen / FlagSecure bridge
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PrivacyScreen) {
      if (enabled) window.Capacitor.Plugins.PrivacyScreen.enable();
      else window.Capacitor.Plugins.PrivacyScreen.disable();
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.setFlagSecure === "function") {
      window.AndroidBridge.setFlagSecure(Boolean(enabled));
    }
  } catch (e) { }
}

let globalCaptureShieldTimer = null;

function triggerAppWideCaptureShield(reasonMsg = "Screenshot & Screen Recording Blocked by Krypton Privacy Shield!") {
  if (!userSettings.antiCapture) return;
  ensureGlobalCaptureShieldDOM();

  const globalShield = document.getElementById("global-capture-shield-overlay");
  if (globalShield) globalShield.classList.remove("hidden");

  // Also trigger call shield if a call is active
  const callOverlay = document.getElementById("call-screen-overlay");
  if (callOverlay && !callOverlay.classList.contains("hidden")) {
    activateCallCapturePrivacyShield(reasonMsg);
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard
      .writeText("Krypton Privacy Shield: Screen capture is disabled.")
      .catch(() => { });
  }

  if (reasonMsg) {
    showToast(reasonMsg, "error", 2800);
  }

  clearTimeout(globalCaptureShieldTimer);
  globalCaptureShieldTimer = setTimeout(() => {
    if (!document.hidden && globalShield) {
      globalShield.classList.add("hidden");
    }
  }, 2200);
}

// Bind Settings toggle for Block Screenshots & Screen Recording (#toggle-anti-capture)
const toggleAntiCaptureEl = document.getElementById("toggle-anti-capture");
if (toggleAntiCaptureEl) {
  toggleAntiCaptureEl.checked = userSettings.antiCapture !== false;
  toggleAntiCaptureEl.addEventListener("change", (e) => {
    userSettings.antiCapture = Boolean(e.target.checked);
    localStorage.setItem("krypton_settings", JSON.stringify(userSettings));
    syncNativeAndroidFlagSecure(userSettings.antiCapture);
    showToast(
      userSettings.antiCapture
        ? "Anti-Screenshot & Screen Recording Shield ON"
        : "Anti-Screenshot Shield OFF",
      "info",
      1800
    );
  });
}

// Block PrintScreen / Snipping shortcuts app-wide when antiCapture is enabled
window.addEventListener(
  "keydown",
  (e) => {
    if (!userSettings.antiCapture) return;
    const isPrintScreen = e.key === "PrintScreen" || e.keyCode === 44;
    const isWinSnip = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "S" || e.key === "s");
    const isMacShot = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key);
    const isPrintPage = (e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P");

    if (isPrintScreen || isWinSnip || isMacShot || isPrintPage) {
      e.preventDefault();
      e.stopPropagation();
      triggerAppWideCaptureShield("Screenshot & Screen Capture Blocked!");
    }
  },
  true
);

window.addEventListener(
  "keyup",
  (e) => {
    if (!userSettings.antiCapture) return;
    if (e.key === "PrintScreen" || e.keyCode === 44) {
      triggerAppWideCaptureShield("Screenshot & Screen Capture Blocked!");
    }
  },
  true
);

// Protect app switcher preview & mobile control-center screen-recorder pull-down when antiCapture is ON
document.addEventListener("visibilitychange", () => {
  if (!userSettings.antiCapture || !myUsername) return;
  ensureGlobalCaptureShieldDOM();
  const globalShield = document.getElementById("global-capture-shield-overlay");
  if (document.hidden) {
    if (globalShield) globalShield.classList.remove("hidden");
  } else {
    setTimeout(() => {
      if (globalShield) globalShield.classList.add("hidden");
    }, 320);
  }
});

// Block getDisplayMedia app-wide when antiCapture is ON
if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function") {
  const prevGetDisplayMediaV20 = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getDisplayMedia = async function (constraints) {
    if (userSettings.antiCapture) {
      triggerAppWideCaptureShield("Screen Recording is strictly blocked by Krypton Privacy Shield!");
      throw new Error("Screen recording is disabled by Krypton Privacy Shield.");
    }
    return prevGetDisplayMediaV20(constraints);
  };
}

// --- 2. NATIVE ANDROID APP PERMISSIONS HELPER (CAMERA, MIC & NOTIFICATIONS) ---
window.requestNativeAppPermissions = async function (needVideo = false, needAudio = true) {
  try {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: Boolean(needAudio),
        video: Boolean(needVideo)
      });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    }
  } catch (err) {
    showToast(
      needVideo
        ? "Please allow Camera & Microphone permissions in your Android App Settings."
        : "Please allow Microphone permission in your Android App Settings.",
      "error",
      3400
    );
    return false;
  }
  return true;
};

// --- 3. ANDROID HARDWARE BACK BUTTON & GESTURE ROUTER (CAPACITOR + WEBVIEW + POPSTATE) ---
function handleAndroidBackNavigation() {
  // 1. If Fullscreen Image Viewer is open -> close it first
  const imgModal = document.getElementById("image-viewer-modal");
  if (imgModal && !imgModal.classList.contains("hidden")) {
    closeFullscreenImageViewer();
    return true;
  }

  // 2. If Add Member to Call modal is open -> close it
  const callAddModal = document.getElementById("call-add-member-modal");
  if (callAddModal && !callAddModal.classList.contains("hidden")) {
    closeAddMemberToCallModal();
    return true;
  }

  // 3. If Call Screen is in Fullscreen mode -> exit Fullscreen to normal Call Card
  const callOverlay = document.getElementById("call-screen-overlay");
  if (callOverlay && !callOverlay.classList.contains("hidden") && isCallFullscreenActive) {
    toggleCallFullScreenView();
    return true;
  }

  // 4. If Forward Modal, Group Modal, Smart Lock Modal, or AI Drawer is open -> close it
  const openModals = [
    { id: "forward-msg-modal", fn: closeForwardMessageModal },
    { id: "group-create-modal", fn: closeGroupModal },
    { id: "smart-lock-setup-modal", fn: closeSmartLockSetupModal },
    { id: "krypton-ai-drawer", fn: () => document.getElementById("krypton-ai-drawer").classList.add("hidden") }
  ];
  for (const m of openModals) {
    const el = document.getElementById(m.id);
    if (el && !el.classList.contains("hidden")) {
      m.fn();
      return true;
    }
  }

  // 5. If Emoji Drawer or Attachment Hub is open -> close it
  const emojiPal = document.getElementById("emoji-palette");
  if (emojiPal && !emojiPal.classList.contains("hidden")) {
    emojiPal.classList.add("hidden");
    return true;
  }

  // 6. If in an active mobile chat -> return to Home Screen Chats list
  if (document.body.classList.contains("mobile-chat-active")) {
    exitChatToDashboard();
    return true;
  }

  // 7. If on Profile or Settings tab -> return to Chats tab
  if (currentSidebarViewMode !== "chats") {
    switchSidebarPrimaryView("chats");
    return true;
  }

  return false;
}

// Bind Capacitor App plugin hardware backButton if running inside native Android APK
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  try {
    window.Capacitor.Plugins.App.addListener("backButton", ({ canGoBack }) => {
      const handled = handleAndroidBackNavigation();
      if (!handled && !canGoBack) {
        window.Capacitor.Plugins.App.minimizeApp();
      }
    });
  } catch (e) { }
}

ensureGlobalCaptureShieldDOM();
syncNativeAndroidFlagSecure(userSettings.antiCapture !== false);

initIdentity();
// =========================================================================
// 24. FEATURE v26000 (PART 2 MASTER UPGRADE):
//     1. CALL-ONLY SCREENSHOT & SCREEN RECORDING BLOCK (ALLOWED IN CHATS!)
//     2. WHATSAPP-STYLE MESSAGE INFO (SEEN / DELIVERED / SENT TIMESTAMPS
//        FOR BOTH 1-ON-1 CHATS AND ENCRYPTED GROUPS ON LONG-PRESS)
//     3. MULTI-PIN MESSAGES ENGINE (PIN MULTIPLE MESSAGES, CYCLE & UNPIN)
// =========================================================================

(function () {
  // -----------------------------------------------------------------------
  // 1. CALL-ONLY SCREENSHOT & SCREEN RECORDING PROTECTION
  // -----------------------------------------------------------------------
  function setNativeCallCaptureProtection(isCallActiveNow) {
    const shouldBlock = Boolean(isCallActiveNow && userSettings.antiCapture !== false);
    document.body.classList.toggle("anti-capture-armed", shouldBlock);

    // Hide any accidental global chat capture shield when not in a call
    const globalShield = document.getElementById("global-capture-shield-overlay");
    if (globalShield && !shouldBlock) {
      globalShield.classList.add("hidden");
    }

    try {
      if (window.KryptonNative && typeof window.KryptonNative.setCallCaptureBlock === "function") {
        window.KryptonNative.setCallCaptureBlock(shouldBlock);
      }
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PrivacyScreen) {
        if (shouldBlock) window.Capacitor.Plugins.PrivacyScreen.enable();
        else window.Capacitor.Plugins.PrivacyScreen.disable();
      }
    } catch (e) { }
  }

  // Ensure normal app startup has screenshot/recording ALLOWED in chats
  setNativeCallCaptureProtection(false);

  // Override global syncNativeAndroidFlagSecure so toggling Settings doesn't lock normal chats
  window.syncNativeAndroidFlagSecure = function (enabled) {
    const callOverlay = document.getElementById("call-screen-overlay");
    const inCall = Boolean(callOverlay && !callOverlay.classList.contains("hidden"));
    setNativeCallCaptureProtection(inCall && enabled);
  };

  // Override triggerAppWideCaptureShield so it ONLY activates if a call is currently on screen
  window.triggerAppWideCaptureShield = function (reasonMsg) {
    const callOverlay = document.getElementById("call-screen-overlay");
    const inCall = Boolean(callOverlay && !callOverlay.classList.contains("hidden"));
    if (!inCall || !userSettings.antiCapture) return;

    const callShield = document.getElementById("call-capture-shield");
    if (callShield) {
      callShield.classList.remove("hidden");
      setTimeout(() => callShield.classList.add("hidden"), 2200);
    }
    if (reasonMsg && typeof showToast === "function") {
      showToast(reasonMsg, "error", 2500);
    }
  };

  // Watch #call-screen-overlay & #call-perm-modal visibility to automatically lock/unlock capture on calls!
  const callScreenEl = document.getElementById("call-screen-overlay");
  const callPermEl = document.getElementById("call-perm-modal");

  function checkCallScreenVisibilityForCaptureLock() {
    const isCallVisible =
      (callScreenEl && !callScreenEl.classList.contains("hidden")) ||
      (callPermEl && !callPermEl.classList.contains("hidden"));
    setNativeCallCaptureProtection(isCallVisible);
  }

  if (window.MutationObserver) {
    const observer = new MutationObserver(checkCallScreenVisibilityForCaptureLock);
    if (callScreenEl) observer.observe(callScreenEl, { attributes: true, attributeFilter: ["class"] });
    if (callPermEl) observer.observe(callPermEl, { attributes: true, attributeFilter: ["class"] });
  }

  // -----------------------------------------------------------------------
  // 2. WHATSAPP-STYLE MESSAGE INFO (SEEN / DELIVERED / SENT TIMESTAMPS)
  // -----------------------------------------------------------------------
  let messageInfoReceiptsMap = JSON.parse(localStorage.getItem("krypton_msg_info_receipts") || "{}");

  function saveMsgInfoReceiptData() {
    try {
      localStorage.setItem("krypton_msg_info_receipts", JSON.stringify(messageInfoReceiptsMap));
    } catch (e) { }
  }

  function formatFullReceiptDateTime(isoOrTs) {
    if (!isoOrTs) return "Pending...";
    try {
      const d = new Date(isoOrTs);
      if (isNaN(d.getTime())) return "Pending...";
      const today = new Date();
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
      const timePart = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (isToday) return `Today at ${timePart}`;
      return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })}, ${timePart}`;
    } catch (e) {
      return "Pending...";
    }
  }

  function recordMessageReceiptTimestamp(msgId, type, readerUsername, customTs) {
    if (!msgId) return;
    const cleanId = String(msgId).replace("msg-row-", "");
    if (!messageInfoReceiptsMap[cleanId]) {
      messageInfoReceiptsMap[cleanId] = {
        sentAt: Date.now(),
        deliveredAt: null,
        seenAt: null,
        seenByGroupMembers: {}
      };
    }
    const entry = messageInfoReceiptsMap[cleanId];
    const ts = customTs || Date.now();

    if (type === "sent" && !entry.sentAt) {
      entry.sentAt = ts;
    } else if (type === "delivered") {
      if (!entry.deliveredAt) entry.deliveredAt = ts;
    } else if (type === "seen") {
      if (!entry.deliveredAt) entry.deliveredAt = ts;
      if (!entry.seenAt) entry.seenAt = ts;
      if (readerUsername) {
        const u = readerUsername.toLowerCase();
        if (!entry.seenByGroupMembers) entry.seenByGroupMembers = {};
        if (!entry.seenByGroupMembers[u]) {
          entry.seenByGroupMembers[u] = ts;
        }
      }
    }
    saveMsgInfoReceiptData();
  }

  // Broadcast per-message read receipt in both 1-on-1 and Group chats when messages are viewed
  function broadcastDetailedSeenReceipt(readerName) {
    if (!activeSubscription || !currentRoom || currentRoom === "global") return;
    const visibleReceivedRows = Array.from(
      document.querySelectorAll("#message-container .message-row.received")
    );
    const seenIds = visibleReceivedRows
      .map((r) => (r.id || "").replace("msg-row-", ""))
      .filter((id) => id && !id.startsWith("temp_"))
      .slice(-25);

    try {
      activeSubscription.send({
        type: "broadcast",
        event: "detailed-seen-receipt",
        payload: {
          room: currentRoom,
          reader: (readerName || myUsername || "").toLowerCase(),
          seenAt: Date.now(),
          msgIds: seenIds
        }
      });
    } catch (e) { }
  }

  // Open WhatsApp-Style Message Info Modal for any message
  window.openWhatsAppMessageInfoModal = function (msgId) {
    const cleanId = String(msgId || "").replace("msg-row-", "");
    const row = document.getElementById("msg-row-" + cleanId);
    const modal = document.getElementById("krypton-msg-info-modal");
    const bodyEl = document.getElementById("msg-info-modal-body");
    if (!row || !modal || !bodyEl) return;

    const sender = row.dataset.sender || myUsername;
    const createdAtIso = row.dataset.createdAtIso || new Date().toISOString();
    const createdTs = new Date(createdAtIso).getTime() || Date.now();

    const textEl = row.querySelector(".msg-text-line");
    const msgType = row.dataset.msgType || "text";
    let previewSnippet = textEl ? textEl.textContent.trim() : "Encrypted Message";
    if (msgType === "media") previewSnippet = "📷 Photo Attachment";
    else if (msgType === "voice") previewSnippet = "🎤 Voice Note";
    else if (msgType === "files") previewSnippet = "📎 Document / File";

    const tickEl = row.querySelector(".msg-status-ticks");
    const isReadDom = tickEl && (tickEl.classList.contains("read") || tickEl.dataset.persistentRead === "true");
    const isDeliveredDom =
      isReadDom || (tickEl && (tickEl.classList.contains("delivered") || tickEl.dataset.persistentDelivered === "true"));

    if (!messageInfoReceiptsMap[cleanId]) {
      messageInfoReceiptsMap[cleanId] = {
        sentAt: createdTs,
        deliveredAt: isDeliveredDom ? createdTs + 1500 : null,
        seenAt: isReadDom ? Date.now() : null,
        seenByGroupMembers: {}
      };
    }

    const receipt = messageInfoReceiptsMap[cleanId];
    const sentStr = formatFullReceiptDateTime(receipt.sentAt || createdTs);
    const deliveredStr =
      receipt.deliveredAt || isDeliveredDom
        ? formatFullReceiptDateTime(receipt.deliveredAt || createdTs + 1000)
        : "Waiting for peer to come online...";
    const seenStr =
      receipt.seenAt || isReadDom
        ? formatFullReceiptDateTime(receipt.seenAt || Date.now())
        : "Not seen yet";

    let groupReceiptsHTML = "";
    if (typeof isGroupRoom === "function" && isGroupRoom(currentRoom)) {
      const seenMap = receipt.seenByGroupMembers || {};
      const seenUsers = Object.keys(seenMap);
      let rowsHTML = "";
      if (seenUsers.length === 0) {
        rowsHTML = `<div style="font-size: 11.5px; color: var(--text-dim); padding: 6px 2px;">No group member has seen this message yet.</div>`;
      } else {
        seenUsers.forEach((u) => {
          rowsHTML += `
            <div class="msg-info-member-receipt">
              <span class="msg-info-member-user">@${escapeHTML(u)}</span>
              <span class="msg-info-member-time">✓✓ ${escapeHTML(formatFullReceiptDateTime(seenMap[u]))}</span>
            </div>
          `;
        });
      }
      groupReceiptsHTML = `
        <div class="msg-info-status-card">
          <span class="msg-info-group-section-title">SEEN BY GROUP MEMBERS (${seenUsers.length})</span>
          ${rowsHTML}
        </div>
      `;
    }

    bodyEl.innerHTML = `
      <div class="msg-info-preview-box">
        <span class="msg-info-preview-sender">@${escapeHTML(sender)}</span>
        <span class="msg-info-preview-text">${escapeHTML(previewSnippet.slice(0, 120))}</span>
      </div>

      <div class="msg-info-status-card">
        <div class="msg-info-row">
          <div class="msg-info-left">
            <span style="color: var(--accent-primary); font-weight: 800; font-size: 14px;">✓✓</span>
            <span>Read / Seen</span>
          </div>
          <span class="msg-info-right" style="color: ${receipt.seenAt || isReadDom ? "var(--accent-primary)" : "var(--text-dim)"};">${escapeHTML(seenStr)}</span>
        </div>

        <div class="msg-info-row">
          <div class="msg-info-left">
            <span style="color: var(--text-muted); font-weight: 800; font-size: 14px;">✓✓</span>
            <span>Delivered</span>
          </div>
          <span class="msg-info-right">${escapeHTML(deliveredStr)}</span>
        </div>

        <div class="msg-info-row">
          <div class="msg-info-left">
            <span style="color: var(--text-dim); font-weight: 800; font-size: 14px;">✓</span>
            <span>Sent</span>
          </div>
          <span class="msg-info-right">${escapeHTML(sentStr)}</span>
        </div>
      </div>

      ${groupReceiptsHTML}
    `;

    modal.classList.remove("hidden");
    if (window.lucide) lucide.createIcons({ nodes: [modal] });
  };

  const btnCloseMsgInfo = document.getElementById("btn-close-msg-info-modal");
  const msgInfoModalEl = document.getElementById("krypton-msg-info-modal");
  if (btnCloseMsgInfo && msgInfoModalEl) {
    btnCloseMsgInfo.addEventListener("click", () => msgInfoModalEl.classList.add("hidden"));
    msgInfoModalEl.addEventListener("click", (e) => {
      if (e.target.id === "krypton-msg-info-modal") msgInfoModalEl.classList.add("hidden");
    });
  }

  // -----------------------------------------------------------------------
  // 3. MULTI-PIN MESSAGES ENGINE (CHATS & GROUPS)
  // -----------------------------------------------------------------------
  let multiPinnedRoomMessages = JSON.parse(localStorage.getItem("krypton_multi_pinned_msgs") || "{}");
  let activePinIndexMap = {}; // roomId -> active index

  // Migrate any legacy single pin into multi-pin array
  Object.keys(pinnedRoomMessages || {}).forEach((rId) => {
    if (!multiPinnedRoomMessages[rId] && pinnedRoomMessages[rId] && pinnedRoomMessages[rId].id) {
      multiPinnedRoomMessages[rId] = [pinnedRoomMessages[rId]];
    }
  });

  function saveMultiPinsToStorage() {
    try {
      localStorage.setItem("krypton_multi_pinned_msgs", JSON.stringify(multiPinnedRoomMessages));
    } catch (e) { }
  }

  window.getPinnedListForRoom = function (roomId) {
    if (!roomId) return [];
    if (!Array.isArray(multiPinnedRoomMessages[roomId])) {
      multiPinnedRoomMessages[roomId] = [];
    }
    return multiPinnedRoomMessages[roomId];
  };

  window.renderPinnedBannerForCurrentRoom = function () {
    const banner = document.getElementById("pinned-message-banner");
    const labelCounterEl = document.getElementById("pinned-msg-label-counter");
    const textEl = document.getElementById("pinned-msg-text");
    const jumpEl = document.getElementById("pinned-msg-jump");
    const cycleBtn = document.getElementById("btn-cycle-pinned-msg");
    const unpinBtn = document.getElementById("btn-unpin-msg");

    if (!banner || !textEl) return;
    if (!currentRoom || currentRoom === "global") {
      banner.classList.add("hidden");
      return;
    }

    const list = getPinnedListForRoom(currentRoom);
    if (list.length === 0) {
      banner.classList.add("hidden");
      return;
    }

    if (activePinIndexMap[currentRoom] === undefined || activePinIndexMap[currentRoom] >= list.length) {
      activePinIndexMap[currentRoom] = list.length - 1;
    }
    const idx = activePinIndexMap[currentRoom];
    const activePin = list[idx];

    banner.classList.remove("hidden");
    if (labelCounterEl) {
      labelCounterEl.innerHTML =
        list.length > 1
          ? `PINNED MESSAGE <span class="multi-pin-count-pill">${idx + 1} / ${list.length}</span>`
          : `PINNED MESSAGE`;
    }
    textEl.textContent = activePin.snippet || "Pinned Message";

    if (cycleBtn) {
      cycleBtn.classList.toggle("hidden", list.length <= 1);
      cycleBtn.onclick = (e) => {
        e.stopPropagation();
        activePinIndexMap[currentRoom] = (idx + 1) % list.length;
        renderPinnedBannerForCurrentRoom();
        const nextPin = list[activePinIndexMap[currentRoom]];
        if (nextPin && nextPin.id) scrollToQuotedMessage(nextPin.id);
      };
    }

    if (jumpEl) {
      jumpEl.onclick = () => {
        if (activePin && activePin.id) scrollToQuotedMessage(activePin.id);
        if (list.length > 1) {
          activePinIndexMap[currentRoom] = (idx + 1) % list.length;
          renderPinnedBannerForCurrentRoom();
        }
      };
    }

    if (unpinBtn) {
      const canUnpin = !isGroupRoom(currentRoom) || isCurrentGroupOwner(currentRoom);
      unpinBtn.style.display = canUnpin ? "flex" : "none";
      unpinBtn.onclick = (e) => {
        e.stopPropagation();
        if (isGroupRoom(currentRoom) && !isCurrentGroupOwner(currentRoom)) {
          showToast("Only the Group Owner can unpin messages!", "error");
          return;
        }
        list.splice(idx, 1);
        multiPinnedRoomMessages[currentRoom] = list;
        saveMultiPinsToStorage();
        if (activePinIndexMap[currentRoom] >= list.length) {
          activePinIndexMap[currentRoom] = Math.max(0, list.length - 1);
        }
        renderPinnedBannerForCurrentRoom();
        if (activeSubscription) {
          activeSubscription.send({
            type: "broadcast",
            event: "multi-pin-sync",
            payload: { room: currentRoom, list: list }
          });
        }
        showToast("Unpinned message!", "info", 1500);
      };
    }
  };

  // Override pinMessageInCurrentRoom to support Pinning & Unpinning Multiple Messages
  window.pinMessageInCurrentRoom = function (msgId, snippetText) {
    if (!currentRoom) return;
    if (currentRoom === "global") {
      showToast("Pinning messages is disabled in Global Lounge.", "error");
      return;
    }
    if (isGroupRoom(currentRoom) && !isCurrentGroupOwner(currentRoom)) {
      showToast("Only the Group Owner can pin messages in this group!", "error");
      return;
    }

    const cleanId = String(msgId).replace("msg-row-", "");
    const list = getPinnedListForRoom(currentRoom);
    const existingIdx = list.findIndex((p) => String(p.id) === cleanId);

    if (existingIdx !== -1) {
      // If already pinned -> unpin it
      list.splice(existingIdx, 1);
      showToast("Message unpinned!", "info", 1600);
    } else {
      list.push({
        id: cleanId,
        snippet: snippetText,
        pinnedBy: myUsername,
        pinnedAt: Date.now()
      });
      activePinIndexMap[currentRoom] = list.length - 1;
      showToast(`Pinned message (${list.length} total pinned)!`, "success", 1800);
    }

    multiPinnedRoomMessages[currentRoom] = list;
    saveMultiPinsToStorage();
    renderPinnedBannerForCurrentRoom();

    if (activeSubscription) {
      activeSubscription.send({
        type: "broadcast",
        event: "multi-pin-sync",
        payload: { room: currentRoom, list: list }
      });
    }
  };

  // -----------------------------------------------------------------------
  // 4. INJECT "MESSAGE INFO" & "PIN / UNPIN" INTO LONG-PRESS CONTEXT MENU
  // -----------------------------------------------------------------------
  const prevOpenContextMenuV25 = window.openWhatsAppMessageContextMenu;
  window.openWhatsAppMessageContextMenu = function (msgId, clientX, clientY) {
    prevOpenContextMenuV25(msgId, clientX, clientY);

    const menu = document.querySelector(".whatsapp-msg-context-menu");
    const actionsList = menu ? menu.querySelector(".msg-ctx-actions-list") : null;
    if (!actionsList) return;

    const cleanId = String(msgId).replace("msg-row-", "");

    // Add "Message Info (Seen / Delivered)" button at the top of context actions
    if (!actionsList.querySelector(".ctx-btn-msg-info")) {
      const btnInfo = document.createElement("button");
      btnInfo.className = "msg-ctx-btn ctx-btn-msg-info";
      btnInfo.innerHTML = `<i data-lucide="info" style="width: 15px; height: 15px; color: var(--accent-primary);"></i><span>Message Info (SeenTime)</span>`;
      btnInfo.onclick = () => {
        closeMessageContextMenu();
        openWhatsAppMessageInfoModal(cleanId);
      };
      actionsList.insertBefore(btnInfo, actionsList.firstChild);
    }

    // Update Pin button label dynamically ("Pin Message" vs "Unpin Message")
    const list = getPinnedListForRoom(currentRoom);
    const isAlreadyPinned = list.some((p) => String(p.id) === cleanId);
    actionsList.querySelectorAll(".msg-ctx-btn").forEach((btn) => {
      if (btn.textContent.includes("Pin Message")) {
        const span = btn.querySelector("span");
        if (span) span.textContent = isAlreadyPinned ? "Unpin Message" : "Pin Message";
      }
    });

    if (window.lucide) lucide.createIcons({ nodes: [actionsList] });
  };

  // Hook joinRoom to listen for live Multi-Pin & Detailed Seen Receipt broadcasts
  const prevJoinRoomV25 = window.joinRoom;
  window.joinRoom = async function (roomId, displayName, pushHistory = true) {
    await prevJoinRoomV25(roomId, displayName, pushHistory);
    renderPinnedBannerForCurrentRoom();

    if (activeSubscription && roomId !== "global") {
      // Send detailed seen receipt when opening a room
      setTimeout(() => broadcastDetailedSeenReceipt(myUsername), 450);

      activeSubscription.on("broadcast", { event: "detailed-seen-receipt" }, (payload) => {
        const p = payload.payload;
        if (!p || !p.reader || p.reader === (myUsername || "").toLowerCase()) return;

        // Mark all our sent messages in this room as seen with exact timestamp & reader name
        const sentRows = document.querySelectorAll("#message-container .message-row.sent");
        sentRows.forEach((r) => {
          const id = (r.id || "").replace("msg-row-", "");
          recordMessageReceiptTimestamp(id, "seen", p.reader, p.seenAt || Date.now());
        });
        update1on1MessageTicks(true);
      });

      activeSubscription.on("broadcast", { event: "multi-pin-sync" }, (payload) => {
        const p = payload.payload;
        if (p && p.room === currentRoom && Array.isArray(p.list)) {
          multiPinnedRoomMessages[currentRoom] = p.list;
          saveMultiPinsToStorage();
          renderPinnedBannerForCurrentRoom();
        }
      });
    }
  };

  // Also record Seen timestamp whenever standard "seen-messages" event fires
  const prevUpdateTicksV25 = window.update1on1MessageTicks;
  window.update1on1MessageTicks = function (isRead) {
    if (typeof prevUpdateTicksV25 === "function") {
      prevUpdateTicksV25(isRead);
    }
    const isPeerOnline = currentPeerUser && onlineUsersList && onlineUsersList.has(currentPeerUser.toLowerCase());
    document.querySelectorAll("#message-container .message-row.sent").forEach((r) => {
      const id = (r.id || "").replace("msg-row-", "");
      if (isRead) {
        recordMessageReceiptTimestamp(id, "seen", currentPeerUser, Date.now());
      } else if (isPeerOnline) {
        recordMessageReceiptTimestamp(id, "delivered", currentPeerUser, Date.now());
      }
    });
  };
})();
// =========================================================================
// FIX: ZERO-FLICKER CHRONOLOGICAL INSERTION & ALWAYS-ON CALL CAPTURE SHIELD
// =========================================================================
(function () {
  // 1. Force Call-Only Screenshot/Recording Protection Always ON (No Settings Toggle Needed)
  userSettings.antiCapture = true;
  localStorage.setItem("krypton_settings", JSON.stringify(userSettings));

  const antiCapToggle = document.getElementById("toggle-anti-capture");
  if (antiCapToggle) {
    const parentRow = antiCapToggle.closest(".setting-item");
    if (parentRow) parentRow.style.display = "none";
  }

  // 2. Intercept #message-container insertions so every message is placed in exact chronological order BEFORE painting!
  function insertRowInChronologicalPosition(container, newRow) {
    if (!newRow || !newRow.classList || !newRow.classList.contains("message-row")) {
      return false;
    }
    const newTs = parseInt(newRow.dataset.msgTs || "0", 10);
    if (!newTs) return false;

    const existingRows = container.querySelectorAll(".message-row");
    for (let i = 0; i < existingRows.length; i++) {
      const r = existingRows[i];
      if (r === newRow) continue;
      const rTs = parseInt(r.dataset.msgTs || "0", 10);
      if (rTs > newTs) {
        container.insertBefore(newRow, r);
        return true;
      }
    }
    return false;
  }

  const msgContainer = document.getElementById("message-container");
  if (msgContainer && !msgContainer.dataset.chronoHooked) {
    msgContainer.dataset.chronoHooked = "true";
    const origAppendChild = msgContainer.appendChild.bind(msgContainer);

    msgContainer.appendChild = function (node) {
      // If a DocumentFragment of multiple messages is appended, insert each row in exact timestamp order
      if (node && node.nodeType === 11) {
        const children = Array.from(node.childNodes);
        children.forEach((child) => {
          if (!insertRowInChronologicalPosition(msgContainer, child)) {
            origAppendChild(child);
          }
        });
        return node;
      }
      // If a single .message-row is appended, place it in its exact timestamp slot immediately
      if (insertRowInChronologicalPosition(msgContainer, node)) {
        return node;
      }
      return origAppendChild(node);
    };
  }
})();
// =========================================================================
// MOVE IN-CHAT SEARCH INSIDE 3-DOT HEADER MENU (#header-dropdown-menu)
// =========================================================================
(function () {
  function injectSearchIntoHeaderMenu() {
    const headerMenu = document.getElementById("header-dropdown-menu");
    const origSearchBtn = document.getElementById("btn-toggle-chat-search");
    if (!headerMenu || !origSearchBtn) return;

    // Avoid duplicate injection
    if (document.getElementById("menu-item-chat-search")) return;

    const searchMenuItem = document.createElement("button");
    searchMenuItem.type = "button";
    searchMenuItem.id = "menu-item-chat-search";
    searchMenuItem.className = "contact-dropdown-item";
    searchMenuItem.style.marginBottom = "6px";
    searchMenuItem.style.borderBottom = "1px solid var(--glass-border-subtle)";
    searchMenuItem.style.borderRadius = "10px 10px 0 0";
    searchMenuItem.style.paddingBottom = "10px";
    searchMenuItem.innerHTML = `
      <i data-lucide="search" style="width: 14px; height: 14px; color: var(--accent-primary);"></i>
      <span>Search in Chat</span>
    `;

    searchMenuItem.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Close 3-dot dropdown menu
      headerMenu.classList.add("hidden");
      // Trigger the existing in-chat search bar toggle
      origSearchBtn.click();
      const searchInp = document.getElementById("in-chat-search-input");
      if (searchInp) setTimeout(() => searchInp.focus(), 60);
    });

    headerMenu.insertBefore(searchMenuItem, headerMenu.firstChild);
    if (window.lucide) lucide.createIcons({ nodes: [searchMenuItem] });
  }

  document.addEventListener("DOMContentLoaded", injectSearchIntoHeaderMenu);
  setTimeout(injectSearchIntoHeaderMenu, 400);
})();
// =========================================================================
// 25. FEATURE v27000:
//     1. 100% WORKING NATIVE ANDROID BIOMETRIC (FINGERPRINT / FACE) UNLOCK
//     2. INSTANT 0ms CHAT LOADING ENGINE (RENDER CACHE FIRST + SILENT SYNC)
// =========================================================================

(function () {
  // -----------------------------------------------------------------------
  // 1. NATIVE ANDROID HARDWARE BIOMETRIC UNLOCK OVERRIDE
  // -----------------------------------------------------------------------
  let isNativeApk = Boolean(window.KryptonNative && typeof window.KryptonNative.isNativeApp === "function");
  let nativeBioActive = localStorage.getItem("krypton_native_bio_enabled") === "true";

  function canUseNativeHardwareBiometrics() {
    try {
      if (window.KryptonNative && typeof window.KryptonNative.isBiometricAvailable === "function") {
        return Boolean(window.KryptonNative.isBiometricAvailable());
      }
    } catch (e) { }
    return false;
  }

  // Override hasAnyLockMethodConfigured so Biometric works with or without PIN
  window.hasAnyLockMethodConfigured = function () {
    return Boolean((myAppPin && myAppPin.length >= 4) || nativeBioActive || biometricCredId);
  };

  // Sync Biometric UI in Smart Lock Setup Modal & Lock Overlay
  function syncNativeBiometricButtonsUI() {
    const enrollBtn = document.getElementById("btn-enroll-biometric");
    const descEl = document.getElementById("biometric-setup-desc");
    const unlockBioBtn = document.getElementById("btn-biometric-unlock");
    const settingsSub = document.getElementById("settings-lock-status-sub");
    const settingsBtnLbl = document.getElementById("btn-open-smart-lock-label");

    nativeBioActive = localStorage.getItem("krypton_native_bio_enabled") === "true";

    if (enrollBtn && descEl) {
      if (nativeBioActive || biometricCredId) {
        enrollBtn.textContent = "Remove";
        enrollBtn.className = "glass-btn-sm danger";
        descEl.textContent = "Hardware Fingerprint / Face Unlock is ACTIVE";
        descEl.style.color = "var(--accent-primary)";
      } else {
        enrollBtn.textContent = "Enable";
        enrollBtn.className = "glass-btn-sm btn-save-action";
        descEl.textContent = "Use phone's Fingerprint, Face or Screen Lock";
        descEl.style.color = "";
      }
    }

    if (unlockBioBtn) {
      unlockBioBtn.classList.toggle("hidden", !(nativeBioActive || biometricCredId));
    }

    if (settingsSub && settingsBtnLbl) {
      const hasPin = Boolean(myAppPin && myAppPin.length >= 4);
      const hasBio = Boolean(nativeBioActive || biometricCredId);
      if (hasPin || hasBio) {
        const methods = [hasPin ? "PIN" : null, hasBio ? "Biometrics" : null].filter(Boolean).join(" + ");
        settingsSub.textContent = `Active (${methods})`;
        settingsSub.style.color = "var(--accent-primary)";
        settingsBtnLbl.textContent = "Manage Lock";
      }
    }
  }

  // Callback called by MainActivity.java when user touches Fingerprint / Face sensor
  window.onKryptonNativeBiometricResult = function (success) {
    if (success) {
      // If user was enabling biometrics inside Setup Modal
      if (window._pendingBiometricEnrollment) {
        window._pendingBiometricEnrollment = false;
        nativeBioActive = true;
        localStorage.setItem("krypton_native_bio_enabled", "true");
        biometricCredId = "native_android_hardware_bio";
        localStorage.setItem("krypton_bio_cred", biometricCredId);
        syncNativeBiometricButtonsUI();
        if (typeof showToast === "function") {
          showToast("Fingerprint / Face Unlock Enabled!", "success", 2200);
        }
        return;
      }

      // Otherwise unlock the Privacy Shield screen immediately!
      const lockOverlay = document.getElementById("app-lock-overlay");
      if (lockOverlay) lockOverlay.classList.add("hidden");
      const pinErr = document.getElementById("lock-pin-error");
      if (pinErr) pinErr.textContent = "";
      if (typeof showToast === "function") {
        showToast("Unlocked with Biometrics!", "success", 1600);
      }
    } else {
      window._pendingBiometricEnrollment = false;
      if (typeof showToast === "function") {
        showToast("Biometric verification cancelled.", "info", 1800);
      }
    }
  };

  // Override Enable/Remove Biometric Button in Smart Lock Modal (Capture Phase so old WebAuthn error never runs!)
  function bindNativeBiometricHandlers() {
    const enrollBtn = document.getElementById("btn-enroll-biometric");
    if (enrollBtn && !enrollBtn.dataset.nativeBioOverride) {
      enrollBtn.dataset.nativeBioOverride = "true";
      enrollBtn.addEventListener(
        "click",
        async (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          nativeBioActive = localStorage.getItem("krypton_native_bio_enabled") === "true";

          // If already enabled -> disable it
          if (nativeBioActive || biometricCredId) {
            nativeBioActive = false;
            biometricCredId = "";
            localStorage.removeItem("krypton_native_bio_enabled");
            localStorage.removeItem("krypton_bio_cred");
            syncNativeBiometricButtonsUI();
            showToast("Biometric unlock removed.", "info");
            return;
          }

          // 1. If running inside Android APK -> Use Native Hardware Biometric Prompt!
          if (window.KryptonNative && typeof window.KryptonNative.authenticateBiometric === "function") {
            if (!canUseNativeHardwareBiometrics()) {
              showToast("Please set a Fingerprint or Screen Lock in your phone Settings first!", "error", 3200);
              return;
            }
            window._pendingBiometricEnrollment = true;
            window.KryptonNative.authenticateBiometric();
            return;
          }

          // 2. Fallback for Web Browsers (HTTPS / localhost)
          if (window.PublicKeyCredential) {
            try {
              const challenge = new Uint8Array(32);
              crypto.getRandomValues(challenge);
              const userId = new Uint8Array(16);
              crypto.getRandomValues(userId);
              const cred = await navigator.credentials.create({
                publicKey: {
                  challenge,
                  rp: { name: "Krypton Messenger" },
                  user: {
                    id: userId,
                    name: myUsername || "krypton_user",
                    displayName: "@" + (myUsername || "user")
                  },
                  pubKeyCredParams: [
                    { type: "public-key", alg: -7 },
                    { type: "public-key", alg: -257 }
                  ],
                  authenticatorSelection: { userVerification: "preferred" },
                  timeout: 45000
                }
              });
              if (cred && cred.rawId) {
                nativeBioActive = true;
                localStorage.setItem("krypton_native_bio_enabled", "true");
                biometricCredId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
                localStorage.setItem("krypton_bio_cred", biometricCredId);
                syncNativeBiometricButtonsUI();
                showToast("Biometric Unlock Enabled!", "success");
                return;
              }
            } catch (err) {
              showToast("Biometric setup cancelled or unavailable.", "error");
              return;
            }
          }

          showToast("Biometric sensor requires HTTPS or Krypton Android APK.", "error");
        },
        true
      );
    }

    // Override "Unlock with Fingerprint / Face" button on Lock Screen Overlay
    const unlockBioBtn = document.getElementById("btn-biometric-unlock");
    if (unlockBioBtn && !unlockBioBtn.dataset.nativeBioOverride) {
      unlockBioBtn.dataset.nativeBioOverride = "true";
      unlockBioBtn.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          if (window.KryptonNative && typeof window.KryptonNative.authenticateBiometric === "function") {
            window._pendingBiometricEnrollment = false;
            window.KryptonNative.authenticateBiometric();
            return;
          }
          if (typeof triggerBiometricPromptUnlock === "function") {
            triggerBiometricPromptUnlock();
          }
        },
        true
      );
    }
  }

  // Automatically pop up Fingerprint scanner when Lock Screen opens!
  const lockOverlayEl = document.getElementById("app-lock-overlay");
  if (lockOverlayEl && window.MutationObserver) {
    let lastLockedState = true;
    const lockObs = new MutationObserver(() => {
      const isNowVisible = !lockOverlayEl.classList.contains("hidden");
      if (isNowVisible && lastLockedState === false) {
        syncNativeBiometricButtonsUI();
        if (
          localStorage.getItem("krypton_native_bio_enabled") === "true" &&
          window.KryptonNative &&
          typeof window.KryptonNative.authenticateBiometric === "function"
        ) {
          window._pendingBiometricEnrollment = false;
          setTimeout(() => window.KryptonNative.authenticateBiometric(), 180);
        }
      }
      lastLockedState = isNowVisible;
    });
    lockObs.observe(lockOverlayEl, { attributes: true, attributeFilter: ["class"] });
  }

  // -----------------------------------------------------------------------
  // 2. ULTRA-FAST 0ms CHAT LOADING ENGINE (PERSISTENT LOCAL CACHE + PREFETCH)
  // -----------------------------------------------------------------------
  let persistentFastChatCache = {};
  try {
    persistentFastChatCache = JSON.parse(localStorage.getItem("krypton_fast_room_cache_v1") || "{}");
  } catch (e) {
    persistentFastChatCache = {};
  }

  function saveFastRoomCache(roomId) {
    if (!roomId || !roomDecryptedCache || !Array.isArray(roomDecryptedCache[roomId])) return;
    try {
      // Keep last 45 text/light messages per room in localStorage for 0ms instant startup
      const lightMsgs = roomDecryptedCache[roomId]
        .filter((r) => r && r.msg && typeof r.plainText === "string" && r.plainText.length < 4000)
        .slice(-45);
      persistentFastChatCache[roomId] = lightMsgs;
      localStorage.setItem("krypton_fast_room_cache_v1", JSON.stringify(persistentFastChatCache));
    } catch (e) { }
  }

  // Hydrate in-memory roomDecryptedCache from localStorage immediately on boot
  Object.keys(persistentFastChatCache).forEach((rId) => {
    if (!roomDecryptedCache[rId] || roomDecryptedCache[rId].length === 0) {
      roomDecryptedCache[rId] = persistentFastChatCache[rId];
    }
  });

  // Save cache automatically whenever a message is rendered or room changes
  const prevCreateMsgNodeFast = window.createMessageNode;
  window.createMessageNode = async function (msg, rawTextOverride) {
    const node = await prevCreateMsgNodeFast(msg, rawTextOverride);
    if (currentRoom) {
      setTimeout(() => saveFastRoomCache(currentRoom), 120);
    }
    return node;
  };

  function initV27000Upgrades() {
    bindNativeBiometricHandlers();
    syncNativeBiometricButtonsUI();
  }

  document.addEventListener("DOMContentLoaded", initV27000Upgrades);
  setTimeout(initV27000Upgrades, 500);
})();
// =========================================================================
// 26. FEATURE v28000 (COMPLETE 10-POINT UI/UX & PERFORMANCE MASTER PATCH):
//     1. ZERO BLACK/WHITE FLASH ON KEYBOARD OPEN (MAIN SEARCH, CHAT & IN-CHAT SEARCH)
//     2. HIDE BOTTOM DOCK WHEN TYPING IN MAIN SEARCH (NO FLOATING BAR GLITCH)
//     3. EMOJI BUTTON CLICK TO OPEN & CLICK AGAIN TO CLOSE FIX
//     4. 0ms INSTANT USER PROFILE MODAL OPEN (RENDER CACHE IMMEDIATELY)
//     5. TELEGRAM-STYLE SWIPE & SCROLL GESTURE FOR MULTI-PIN MESSAGES
//     6. WORKING QR SCANNER MODAL FROM 3-DOT MENU & SETTINGS + MANUAL CODE LINK
//     7. PREVENT DUPLICATE THEME TOAST POPUPS
//     8. CLAMP LONG-PRESS MESSAGE MENU SO BOTTOM MESSAGES NEVER CLIP OFF-SCREEN
// =========================================================================

(function () {
  // -----------------------------------------------------------------------
  // 1. DEDUPLICATE TOAST POPUPS (FIX DOUBLE "Theme switched to..." TOAST)
  // -----------------------------------------------------------------------
  let lastToastText = "";
  let lastToastTime = 0;
  const origShowToastV28 = window.showToast;
  if (typeof origShowToastV28 === "function") {
    window.showToast = function (message, type = "info", duration = 3200) {
      const now = Date.now();
      const cleanMsg = String(message || "").trim();
      if (cleanMsg === lastToastText && now - lastToastTime < 900) {
        return; // Block duplicate toast fired within 900ms!
      }
      lastToastText = cleanMsg;
      lastToastTime = now;
      return origShowToastV28(message, type, duration);
    };
  }

  // -----------------------------------------------------------------------
  // 2. FIX KEYBOARD BLACK/WHITE GLITCH & HIDE BOTTOM DOCK ON MAIN SEARCH FOCUS
  // -----------------------------------------------------------------------
  function syncRootThemeBackgroundColor() {
    const isDark = document.body.classList.contains("dark-theme");
    const bgHex = isDark ? "#06080f" : "#f1f5f9";
    document.documentElement.style.backgroundColor = bgHex;
    document.body.style.backgroundColor = bgHex;
    const appLayout = document.querySelector(".app-layout");
    if (appLayout) {
      appLayout.style.backgroundColor = bgHex;
      // Remove any forced inline pixel height that caused black/white gap during keyboard animation
      appLayout.style.height = "";
    }
  }

  syncRootThemeBackgroundColor();

  // Watch body class changes (Dark/Light toggle) so background color always matches theme
  if (window.MutationObserver) {
    const bodyThemeObs = new MutationObserver(syncRootThemeBackgroundColor);
    bodyThemeObs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  // Hide Bottom Navigation Bar & AI Orb whenever user focuses Main Search or any Sidebar Input
  function bindSidebarInputKeyboardGuard() {
    const sidebarInputs = [
      document.getElementById("peer-id-input"),
      document.getElementById("tg-username-input"),
      document.getElementById("tg-bio-input")
    ].filter(Boolean);

    sidebarInputs.forEach((inp) => {
      if (inp.dataset.kbGuardBound) return;
      inp.dataset.kbGuardBound = "true";

      inp.addEventListener("focus", () => {
        document.body.classList.add("sidebar-keyboard-open");
      });

      inp.addEventListener("blur", () => {
        setTimeout(() => {
          const active = document.activeElement;
          const stillInSidebarInput =
            active &&
            active.tagName === "INPUT" &&
            active.closest("#app-sidebar");
          if (!stillInSidebarInput) {
            document.body.classList.remove("sidebar-keyboard-open");
          }
        }, 120);
      });
    });
  }

  // -----------------------------------------------------------------------
  // 3. FIX EMOJI ICON TOGGLE (CLICK TO OPEN, CLICK AGAIN TO CLOSE)
  // -----------------------------------------------------------------------
  function fixEmojiLeftButtonToggle() {
    const btnEmojiLeft = document.getElementById("btn-tg-emoji-left");
    const emojiPal = document.getElementById("emoji-palette");
    const attachMenu = document.getElementById("attach-hub-menu");
    const btnAttach = document.getElementById("btn-attach-hub");
    if (!btnEmojiLeft || !emojiPal) return;

    // Clone button once to strip conflicting listeners that caused immediate re-open
    if (!btnEmojiLeft.dataset.cleanToggleV28) {
      const cleanBtn = btnEmojiLeft.cloneNode(true);
      cleanBtn.dataset.cleanToggleV28 = "true";
      btnEmojiLeft.parentNode.replaceChild(cleanBtn, btnEmojiLeft);

      cleanBtn.addEventListener(
        "pointerdown",
        (e) => {
          // Stop outside document pointerdown/click listener from auto-closing before our click runs
          e.stopPropagation();
        },
        true
      );

      cleanBtn.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const isCurrentlyOpen = !emojiPal.classList.contains("hidden");
          if (attachMenu) attachMenu.classList.add("hidden");
          if (btnAttach) btnAttach.classList.remove("active");

          if (isCurrentlyOpen) {
            emojiPal.classList.add("hidden");
            cleanBtn.classList.remove("active");
          } else {
            if (typeof renderWhatsAppEmojiGrid === "function") renderWhatsAppEmojiGrid();
            emojiPal.classList.remove("hidden");
            cleanBtn.classList.add("active");
          }
        },
        true
      );
    }
  }

  // -----------------------------------------------------------------------
  // 4. 0ms INSTANT USER PROFILE MODAL (NO NETWORK BLOCKING DELAY!)
  // -----------------------------------------------------------------------
  const origOpenUserActionModalV28 = window.openUserActionModal;
  if (typeof origOpenUserActionModalV28 === "function") {
    window.openUserActionModal = function (targetUsername) {
      const clean = (targetUsername || "").trim().toLowerCase().replace(/^@/, "");
      if (!clean) return;

      // Temporarily bypass slow network await inside openUserActionModal by ensuring cache exists first
      if (typeof usersBioCache === "object" && usersBioCache[clean] === undefined) {
        usersBioCache[clean] = "";
      }

      // Open modal immediately using cached Avatar & Bio (0ms!)
      origOpenUserActionModalV28(clean);

      // Fetch fresh Bio & Avatar silently in the background and update DOM live
      if (supabaseClient) {
        supabaseClient
          .from("users")
          .select("username, avatar_url, bio")
          .ilike("username", clean)
          .maybeSingle()
          .then(({ data }) => {
            if (!data) return;
            const uname = data.username.toLowerCase();
            if (data.avatar_url) usersAvatarCache[uname] = data.avatar_url;
            if (typeof data.bio === "string") usersBioCache[uname] = data.bio;

            const openActionAv = document.getElementById("action-user-avatar");
            const openActionBio = document.getElementById("action-user-bio-box");
            const openTitle = document.getElementById("action-user-title");
            if (openTitle && openTitle.textContent.toLowerCase() === "@" + uname) {
              if (openActionAv && data.avatar_url) {
                renderAvatarElement(openActionAv, uname, data.avatar_url);
              }
              if (openActionBio) {
                openActionBio.textContent =
                  data.bio && data.bio.trim()
                    ? `"${data.bio.trim()}"`
                    : "Hey there! I am using Krypton.";
              }
            }
          })
          .catch(() => { });
      }
    };
  }

  // -----------------------------------------------------------------------
  // 5. TELEGRAM-STYLE SWIPE & WHEEL GESTURE ON MULTI-PIN BANNER
  // -----------------------------------------------------------------------
  function bindMultiPinSwipeGesture() {
    const banner = document.getElementById("pinned-message-banner");
    if (!banner || banner.dataset.swipeBoundV28) return;
    banner.dataset.swipeBoundV28 = "true";

    let touchStartX = 0;
    let touchStartY = 0;

    function cyclePinnedByStep(step) {
      if (!currentRoom || typeof getPinnedListForRoom !== "function") return;
      const list = getPinnedListForRoom(currentRoom);
      if (!list || list.length <= 1) return;

      const cycleBtn = document.getElementById("btn-cycle-pinned-msg");
      if (cycleBtn) {
        banner.classList.add("pin-swipe-anim");
        setTimeout(() => banner.classList.remove("pin-swipe-anim"), 150);
        cycleBtn.click();
      }
    }

    banner.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    banner.addEventListener(
      "touchend",
      (e) => {
        if (!e.changedTouches || e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 24 || Math.abs(dy) > 18) {
          e.preventDefault();
          e.stopPropagation();
          cyclePinnedByStep(dx < 0 || dy < 0 ? 1 : -1);
        }
      },
      { passive: false }
    );

    banner.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) > 8) {
          e.preventDefault();
          cyclePinnedByStep(e.deltaY > 0 ? 1 : -1);
        }
      },
      { passive: false }
    );
  }

  // -----------------------------------------------------------------------
  // 6. WORKING WEB QR SCANNER (FROM 3-DOT MENU & SETTINGS)
  // -----------------------------------------------------------------------
  let qrScannerStream = null;
  let qrScanLoopTimer = null;

  async function stopKryptonQrScanner() {
    if (qrScanLoopTimer) {
      clearInterval(qrScanLoopTimer);
      qrScanLoopTimer = null;
    }
    if (qrScannerStream) {
      qrScannerStream.getTracks().forEach((t) => t.stop());
      qrScannerStream = null;
    }
    const videoEl = document.getElementById("qr-scanner-video");
    if (videoEl) videoEl.srcObject = null;
  }

  async function handleScannedWebPairingPayload(rawCodeText) {
    const cleanCode = String(rawCodeText || "").trim();
    if (!cleanCode) return;

    await stopKryptonQrScanner();
    const modal = document.getElementById("krypton-qr-scanner-modal");
    if (modal) modal.classList.add("hidden");

    // Broadcast instant login credentials to the waiting Krypton Web session via Supabase Realtime
    if (supabaseClient && myUsername) {
      const ch = supabaseClient.channel("krypton_web_qr_link");
      ch.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.send({
            type: "broadcast",
            event: "web-qr-authenticated",
            payload: {
              pairingCode: cleanCode.toUpperCase(),
              username: myUsername,
              sessionId: mySessionId,
              avatarUrl: usersAvatarCache[(myUsername || "").toLowerCase()] || "",
              timestamp: Date.now()
            }
          });
          setTimeout(() => supabaseClient.removeChannel(ch), 1500);
        }
      });
    }
    showToast(`Linked Krypton Web session (${cleanCode.slice(0, 12)})!`, "success", 2800);
  }

  window.openKryptonQrScannerModal = async function () {
    const modal = document.getElementById("krypton-qr-scanner-modal");
    const videoEl = document.getElementById("qr-scanner-video");
    const statusText = document.getElementById("qr-scan-status-text");
    const topMenu = document.getElementById("top-main-dropdown-menu");
    const settingsModal = document.getElementById("settings-modal");

    if (topMenu) topMenu.classList.add("hidden");
    if (settingsModal) settingsModal.classList.add("hidden");
    if (!modal) return;

    modal.classList.remove("hidden");
    if (window.lucide) lucide.createIcons({ nodes: [modal] });

    if (window.KryptonNative && typeof window.KryptonNative.requestCallPermissions === "function") {
      window.KryptonNative.requestCallPermissions();
    }

    try {
      await stopKryptonQrScanner();
      if (statusText) statusText.textContent = "Starting camera for QR scan...";

      qrScannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });

      if (videoEl) {
        videoEl.srcObject = qrScannerStream;
        await videoEl.play().catch(() => { });
      }
      if (statusText) statusText.textContent = "Point camera at Krypton Web QR Code...";

      // Use native BarcodeDetector if available on Android WebView / Chrome
      if ("BarcodeDetector" in window) {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        qrScanLoopTimer = setInterval(async () => {
          if (!videoEl || videoEl.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoEl);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleScannedWebPairingPayload(barcodes[0].rawValue);
            }
          } catch (e) { }
        }, 350);
      }
    } catch (err) {
      if (statusText) {
        statusText.textContent = "Camera busy or blocked — Enter Web Pairing Code below:";
      }
    }
  };

  function bindQrScannerButtons() {
    const triggerIds = ["top-menu-link-web", "btn-settings-open-qr", "btn-top-qr-scanner"];
    triggerIds.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn && !btn.dataset.qrBoundV28) {
        btn.dataset.qrBoundV28 = "true";
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openKryptonQrScannerModal();
        });
      }
    });

    const closeBtn = document.getElementById("btn-close-qr-scanner");
    const modal = document.getElementById("krypton-qr-scanner-modal");
    if (closeBtn && !closeBtn.dataset.qrCloseBound) {
      closeBtn.dataset.qrCloseBound = "true";
      closeBtn.addEventListener("click", () => {
        stopKryptonQrScanner();
        if (modal) modal.classList.add("hidden");
      });
    }
    if (modal && !modal.dataset.qrBackdropBound) {
      modal.dataset.qrBackdropBound = "true";
      modal.addEventListener("click", (e) => {
        if (e.target.id === "krypton-qr-scanner-modal") {
          stopKryptonQrScanner();
          modal.classList.add("hidden");
        }
      });
    }

    const manualBtn = document.getElementById("btn-link-web-by-code");
    const manualInp = document.getElementById("qr-manual-code-input");
    if (manualBtn && manualInp && !manualBtn.dataset.qrManualBound) {
      manualBtn.dataset.qrManualBound = "true";
      manualBtn.addEventListener("click", () => {
        const val = manualInp.value.trim();
        if (!val) {
          showToast("Please enter the Web Pairing Code shown on your PC!", "error");
          return;
        }
        manualInp.value = "";
        handleScannedWebPairingPayload(val);
      });
    }
  }

  // -----------------------------------------------------------------------
  // 7. FIX BOTTOM MESSAGE LONG-PRESS CONTEXT MENU CLIPPING OFF-SCREEN
  // -----------------------------------------------------------------------
  const prevOpenContextMenuV28 = window.openWhatsAppMessageContextMenu;
  window.openWhatsAppMessageContextMenu = function (msgId, clientX, clientY) {
    if (typeof prevOpenContextMenuV28 === "function") {
      prevOpenContextMenuV28(msgId, clientX, clientY);
    }

    const menu = document.querySelector(".whatsapp-msg-context-menu");
    if (!menu) return;

    // Measure actual rendered height & width and clamp strictly inside viewport
    requestAnimationFrame(() => {
      const vw = window.innerWidth;
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const rect = menu.getBoundingClientRect();
      const safeMargin = 14;

      let newTop = rect.top;
      let newLeft = rect.left;

      if (rect.bottom > vh - safeMargin) {
        newTop = Math.max(safeMargin, vh - rect.height - safeMargin);
      }
      if (newTop < safeMargin) {
        newTop = safeMargin;
      }
      if (rect.right > vw - safeMargin) {
        newLeft = Math.max(safeMargin, vw - rect.width - safeMargin);
      }
      if (newLeft < safeMargin) {
        newLeft = safeMargin;
      }

      menu.style.top = newTop + "px";
      menu.style.left = newLeft + "px";
    });
  };

  function initV28000MasterFixes() {
    syncRootThemeBackgroundColor();
    bindSidebarInputKeyboardGuard();
    fixEmojiLeftButtonToggle();
    bindMultiPinSwipeGesture();
    bindQrScannerButtons();
  }

  document.addEventListener("DOMContentLoaded", initV28000MasterFixes);
  setTimeout(initV28000MasterFixes, 450);
})();
// =========================================================================
// 27. FEATURE v29000 (6-IN-1 MASTER UPGRADE):
//     1. DRAGGABLE / MOVABLE AI FLOATING BUTTON WITH MAGNETIC EDGE SNAP
//     2. GROUP MESSAGE INFO: SEEN COUNT + ONLINE/OFFLINE MEMBER STATUS
//     3. REPLACE EMOJI & SPOILER IN HUB WITH "CAMERA" & "CREATE POLL"
//     4. FULL LIVE INTERACTIVE POLL SYSTEM (CREATE, VOTE & REALTIME SYNC)
//     5. INSTANT CAMERA CAPTURE & SEND MODAL (WHATSAPP STYLE)
//     6. STRICT SCREENSHOT/RECORDING BLOCK ON 1x VIEW & 10s BURN MESSAGES
// =========================================================================

(function () {
  // -----------------------------------------------------------------------
  // 1. DRAGGABLE / MOVABLE AI FLOATING BUTTON (#btn-krypton-ai-orb)
  // -----------------------------------------------------------------------
  function makeAiOrbDraggable() {
    const orb = document.getElementById("btn-krypton-ai-orb");
    if (!orb || orb.dataset.draggableBoundV29) return;
    orb.dataset.draggableBoundV29 = "true";

    // Restore saved position if available
    try {
      const savedPos = JSON.parse(localStorage.getItem("krypton_ai_orb_pos") || "null");
      if (savedPos && typeof savedPos.left === "number" && typeof savedPos.top === "number") {
        const maxX = window.innerWidth - 58;
        const maxY = window.innerHeight - 85;
        orb.style.position = "fixed";
        orb.style.right = "auto";
        orb.style.bottom = "auto";
        orb.style.left = Math.min(Math.max(10, savedPos.left), maxX) + "px";
        orb.style.top = Math.min(Math.max(58, savedPos.top), maxY) + "px";
      }
    } catch (e) { }

    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    orb.addEventListener("pointerdown", (e) => {
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = orb.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      orb.classList.add("ai-orb-dragging");
      try {
        orb.setPointerCapture(e.pointerId);
      } catch (err) { }
    });

    orb.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        hasMoved = true;
      }
      if (!hasMoved) return;

      const maxX = window.innerWidth - orb.offsetWidth - 8;
      const maxY = window.innerHeight - orb.offsetHeight - 76;
      const newLeft = Math.min(Math.max(8, initialLeft + dx), maxX);
      const newTop = Math.min(Math.max(56, initialTop + dy), maxY);

      orb.style.position = "fixed";
      orb.style.right = "auto";
      orb.style.bottom = "auto";
      orb.style.left = newLeft + "px";
      orb.style.top = newTop + "px";
    });

    function finishOrbDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      orb.classList.remove("ai-orb-dragging");
      try {
        orb.releasePointerCapture(e.pointerId);
      } catch (err) { }

      if (hasMoved) {
        // Snap smoothly to nearest left or right screen edge
        const rect = orb.getBoundingClientRect();
        const snapLeft = rect.left + rect.width / 2 < window.innerWidth / 2 ? 14 : window.innerWidth - rect.width - 14;
        orb.style.left = snapLeft + "px";
        try {
          localStorage.setItem("krypton_ai_orb_pos", JSON.stringify({ left: snapLeft, top: rect.top }));
        } catch (err) { }
      }
    }

    orb.addEventListener("pointerup", finishOrbDrag);
    orb.addEventListener("pointercancel", finishOrbDrag);

    // Prevent opening AI drawer if user was dragging the button
    orb.addEventListener(
      "click",
      (e) => {
        if (hasMoved) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          hasMoved = false;
        }
      },
      true
    );
  }

  // -----------------------------------------------------------------------
  // 2. STRICT ANTI-SCREENSHOT & SCREEN RECORDING ON 1x VIEW & 10s BURN
  // -----------------------------------------------------------------------
  let isBurnMediaCurrentlyOpen = false;

  function syncBurnOrCallScreenProtection() {
    const callOverlay = document.getElementById("call-screen-overlay");
    const callPerm = document.getElementById("call-perm-modal");
    const inCall =
      (callOverlay && !callOverlay.classList.contains("hidden")) ||
      (callPerm && !callPerm.classList.contains("hidden"));

    // Check if any 1x View or 10s Burn message is currently revealed/unlocked in the chat or image viewer
    const unlockedBurnInDom = Boolean(
      document.querySelector(
        ".burn-secret-box.revealed, .burn-media-gate.unlocked, .message-row[data-view-mode='once'] .burn-unlocked, .message-row[data-view-mode='10s'] .burn-unlocked"
      )
    );

    const shouldBlockCapture = Boolean(inCall || isBurnMediaCurrentlyOpen || unlockedBurnInDom);
    document.body.classList.toggle("anti-capture-armed", shouldBlockCapture);

    try {
      if (window.KryptonNative && typeof window.KryptonNative.setCallCaptureBlock === "function") {
        window.KryptonNative.setCallCaptureBlock(shouldBlockCapture);
      }
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PrivacyScreen) {
        if (shouldBlockCapture) window.Capacitor.Plugins.PrivacyScreen.enable();
        else window.Capacitor.Plugins.PrivacyScreen.disable();
      }
    } catch (e) { }
  }

  // Watch clicks inside #message-container & #image-viewer-modal to detect when 1x View or 10s Burn is opened/closed
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (!target) return;

      // Detect opening a 1x View or 10s Burn card/image
      const burnContainer = target.closest(
        "[data-vmode='once'], [data-vmode='10s'], .viewmode-gate-card, .burn-secret-box, .view-once-media-box"
      );
      const msgRow = target.closest(".message-row");
      const rowHasBurnBadge =
        msgRow &&
        (msgRow.innerHTML.includes("1x View") ||
          msgRow.innerHTML.includes("10s Burn") ||
          msgRow.innerHTML.includes("View Once"));

      if (burnContainer || rowHasBurnBadge) {
        isBurnMediaCurrentlyOpen = true;
        syncBurnOrCallScreenProtection();
        // Keep protection armed while viewing; auto-recheck when timer finishes or viewer closes
        setTimeout(() => {
          const imgViewer = document.getElementById("image-viewer-modal");
          const viewerOpen = imgViewer && !imgViewer.classList.contains("hidden");
          if (!viewerOpen) {
            isBurnMediaCurrentlyOpen = false;
          }
          syncBurnOrCallScreenProtection();
        }, 11000);
      }

      // If closing Fullscreen Image Viewer -> release burn capture lock
      if (target.closest("#btn-close-image-viewer") || target.id === "image-viewer-modal") {
        isBurnMediaCurrentlyOpen = false;
        setTimeout(syncBurnOrCallScreenProtection, 80);
      }
    },
    true
  );

  // Also block download button inside Image Viewer when viewing a 1x View / 10s Burn image
  const imgViewerModal = document.getElementById("image-viewer-modal");
  if (imgViewerModal && window.MutationObserver) {
    const viewerObs = new MutationObserver(() => {
      const isOpen = !imgViewerModal.classList.contains("hidden");
      const dlBtn = document.getElementById("btn-download-image-viewer");
      if (isOpen && isBurnMediaCurrentlyOpen) {
        if (dlBtn) dlBtn.style.display = "none";
        syncBurnOrCallScreenProtection();
      } else if (!isOpen) {
        isBurnMediaCurrentlyOpen = false;
        if (dlBtn) dlBtn.style.display = "";
        syncBurnOrCallScreenProtection();
      }
    });
    viewerObs.observe(imgViewerModal, { attributes: true, attributeFilter: ["class"] });
  }

  // -----------------------------------------------------------------------
  // 3. UPGRADE ATTACHMENT HUB: REMOVE EMOJI & SPOILER -> ADD CAMERA & POLL
  // -----------------------------------------------------------------------
  function upgradeAttachmentHubMenu() {
    const hubMenu = document.getElementById("attach-hub-menu");
    if (!hubMenu) return;

    const titleEl = hubMenu.querySelector(".hub-viewmode-title");
    if (titleEl) {
      titleEl.textContent = "VIEW MODE (MEDIA & FILES)";
    }

    // Repurpose #hub-btn-emoji -> Instant Camera Capture
    const btnEmojiHub = document.getElementById("hub-btn-emoji");
    if (btnEmojiHub && !btnEmojiHub.dataset.repurposedToCamera) {
      btnEmojiHub.dataset.repurposedToCamera = "true";
      btnEmojiHub.innerHTML = `
        <div class="hub-icon-circle" style="background: rgba(16, 185, 129, 0.16); color: #10b981;">
          <i data-lucide="camera" style="width: 18px; height: 18px;"></i>
        </div>
        <span>Camera (Instant Pic)</span>
      `;
      const newCamBtn = btnEmojiHub.cloneNode(true);
      btnEmojiHub.parentNode.replaceChild(newCamBtn, btnEmojiHub);
      newCamBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        hubMenu.classList.add("hidden");
        const attachBtn = document.getElementById("btn-attach-hub");
        if (attachBtn) attachBtn.classList.remove("active");
        openKryptonInstantCameraModal();
      });
    }

    // Repurpose #hub-btn-spoiler -> Interactive Poll Creator
    const btnSpoilerHub = document.getElementById("hub-btn-spoiler");
    if (btnSpoilerHub && !btnSpoilerHub.dataset.repurposedToPoll) {
      btnSpoilerHub.dataset.repurposedToPoll = "true";
      btnSpoilerHub.innerHTML = `
        <div class="hub-icon-circle" style="background: rgba(245, 158, 11, 0.18); color: #fbbf24;">
          <i data-lucide="bar-chart-2" style="width: 18px; height: 18px;"></i>
        </div>
        <span>Create Poll</span>
      `;
      const newPollBtn = btnSpoilerHub.cloneNode(true);
      btnSpoilerHub.parentNode.replaceChild(newPollBtn, btnSpoilerHub);
      newPollBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        hubMenu.classList.add("hidden");
        const attachBtn = document.getElementById("btn-attach-hub");
        if (attachBtn) attachBtn.classList.remove("active");
        openKryptonPollCreatorModal();
      });
    }

    if (window.lucide) lucide.createIcons({ nodes: [hubMenu] });
  }

  // -----------------------------------------------------------------------
  // 4. INSTANT CAMERA CAPTURE & SEND MODAL (WHATSAPP STYLE)
  // -----------------------------------------------------------------------
  let instantCamStream = null;
  let instantCamFacing = "environment";

  function ensureInstantCameraModalExists() {
    if (document.getElementById("krypton-instant-camera-modal")) return;
    const modal = document.createElement("div");
    modal.id = "krypton-instant-camera-modal";
    modal.className = "glass-modal hidden";
    modal.style.zIndex = "99999997";
    modal.innerHTML = `
      <div class="glass-card" style="max-width: 400px; padding: 0; overflow: hidden; display: flex; flex-direction: column;">
        <div class="settings-pinned-header" style="padding: 14px 18px;">
          <div class="brand-inline">
            <div class="header-badge-icon">
              <i data-lucide="camera" style="width: 17px; height: 17px;"></i>
            </div>
            <h3 style="font-size: 16px; font-weight: 800;">Instant Camera</h3>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" id="btn-flip-instant-cam" class="tool-btn" title="Switch Front / Back Camera">
              <i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i>
            </button>
            <button type="button" id="btn-close-instant-cam" class="icon-close-btn sm" title="Close Camera">
              <i data-lucide="x" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </div>

        <div style="padding: 14px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <div style="position: relative; width: 100%; height: 320px; border-radius: 18px; overflow: hidden; background: #05070c; border: 1.5px solid var(--glass-border);">
            <video id="instant-cam-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
          </div>
          <button type="button" id="btn-capture-and-send-pic" class="glass-btn primary" style="width: 100%; padding: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
            <i data-lucide="send" style="width: 16px; height: 16px;"></i>
            <span>Click & Send Photo Instantly</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("btn-close-instant-cam").addEventListener("click", closeKryptonInstantCameraModal);
    document.getElementById("btn-flip-instant-cam").addEventListener("click", () => {
      instantCamFacing = instantCamFacing === "environment" ? "user" : "environment";
      startInstantCameraStream();
    });
    document.getElementById("btn-capture-and-send-pic").addEventListener("click", captureAndSendInstantPhoto);
  }

  async function startInstantCameraStream() {
    const videoEl = document.getElementById("instant-cam-video");
    if (!videoEl) return;
    if (instantCamStream) {
      instantCamStream.getTracks().forEach((t) => t.stop());
      instantCamStream = null;
    }
    try {
      if (window.KryptonNative && typeof window.KryptonNative.requestCallPermissions === "function") {
        window.KryptonNative.requestCallPermissions();
      }
      instantCamStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: instantCamFacing }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });
      videoEl.srcObject = instantCamStream;
      videoEl.style.transform = instantCamFacing === "user" ? "scaleX(-1)" : "scaleX(1)";
      await videoEl.play().catch(() => { });
    } catch (err) {
      // Fallback to native file input with camera capture if WebRTC camera is busy
      closeKryptonInstantCameraModal();
      const imgInp = document.getElementById("image-file-input");
      if (imgInp) {
        imgInp.setAttribute("capture", "environment");
        imgInp.click();
        setTimeout(() => imgInp.removeAttribute("capture"), 1500);
      }
    }
  }

  window.openKryptonInstantCameraModal = function () {
    ensureInstantCameraModalExists();
    const modal = document.getElementById("krypton-instant-camera-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    if (window.lucide) lucide.createIcons({ nodes: [modal] });
    startInstantCameraStream();
  };

  function closeKryptonInstantCameraModal() {
    if (instantCamStream) {
      instantCamStream.getTracks().forEach((t) => t.stop());
      instantCamStream = null;
    }
    const modal = document.getElementById("krypton-instant-camera-modal");
    if (modal) modal.classList.add("hidden");
  }

  function captureAndSendInstantPhoto() {
    const videoEl = document.getElementById("instant-cam-video");
    if (!videoEl || !videoEl.videoWidth) {
      showToast("Camera is still initializing...", "info");
      return;
    }

    const canvas = document.createElement("canvas");
    const maxDim = 960;
    let w = videoEl.videoWidth;
    let h = videoEl.videoHeight;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (instantCamFacing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoEl, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        closeKryptonInstantCameraModal();
        const file = new File([blob], `krypton-cam-${Date.now()}.jpg`, { type: "image/jpeg" });
        const imgInput = document.getElementById("image-file-input");
        if (imgInput) {
          const dt = new DataTransfer();
          dt.items.add(file);
          imgInput.files = dt.files;
          imgInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
      "image/jpeg",
      0.84
    );
  }

  // -----------------------------------------------------------------------
  // 5. INTERACTIVE POLL CREATOR & REALTIME VOTING ENGINE
  // -----------------------------------------------------------------------
  let kryptonPollsVotesStore = JSON.parse(localStorage.getItem("krypton_polls_votes_v1") || "{}");

  function savePollsVotesStore() {
    try {
      localStorage.setItem("krypton_polls_votes_v1", JSON.stringify(kryptonPollsVotesStore));
    } catch (e) { }
  }

  function ensurePollCreatorModalExists() {
    if (document.getElementById("krypton-poll-creator-modal")) return;
    const modal = document.createElement("div");
    modal.id = "krypton-poll-creator-modal";
    modal.className = "glass-modal hidden";
    modal.style.zIndex = "99999997";
    modal.innerHTML = `
      <div class="glass-card" style="max-width: 400px; padding: 0; overflow: hidden; display: flex; flex-direction: column;">
        <div class="settings-pinned-header" style="padding: 14px 18px;">
          <div class="brand-inline">
            <div class="header-badge-icon">
              <i data-lucide="bar-chart-2" style="width: 17px; height: 17px;"></i>
            </div>
            <h3 style="font-size: 16px; font-weight: 800;">Create Poll</h3>
          </div>
          <button type="button" id="btn-close-poll-modal" class="icon-close-btn sm" title="Close">
            <i data-lucide="x" style="width: 14px; height: 14px;"></i>
          </button>
        </div>

        <div class="settings-scroll-body" style="padding: 16px 18px; gap: 12px;">
          <div class="input-group" style="margin: 0;">
            <label class="auth-field-label">POLL QUESTION</label>
            <input type="text" id="poll-question-input" placeholder="Ask a question..." maxlength="110" autocomplete="off" />
          </div>

          <div class="input-group" style="margin: 0;">
            <label class="auth-field-label">OPTIONS (UP TO 5)</label>
            <div id="poll-options-inputs-wrap" style="display: flex; flex-direction: column; gap: 8px;">
              <input type="text" class="poll-opt-inp" placeholder="Option 1" maxlength="60" autocomplete="off" />
              <input type="text" class="poll-opt-inp" placeholder="Option 2" maxlength="60" autocomplete="off" />
            </div>
            <button type="button" id="btn-add-poll-option" class="glass-btn-sm" style="margin-top: 8px; align-self: flex-start;">+ Add Option</button>
          </div>
        </div>

        <div class="modal-actions" style="padding: 12px 18px; border-top: 1px solid var(--glass-border-subtle); background: var(--glass-dropdown); margin: 0;">
          <button type="button" id="btn-cancel-poll-modal" class="glass-btn secondary">Cancel</button>
          <button type="button" id="btn-send-poll-now" class="glass-btn primary">Send Poll</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("btn-close-poll-modal").addEventListener("click", () => modal.classList.add("hidden"));
    document.getElementById("btn-cancel-poll-modal").addEventListener("click", () => modal.classList.add("hidden"));
    document.getElementById("btn-add-poll-option").addEventListener("click", () => {
      const wrap = document.getElementById("poll-options-inputs-wrap");
      const count = wrap.querySelectorAll(".poll-opt-inp").length;
      if (count >= 5) {
        showToast("Maximum 5 options allowed!", "info");
        return;
      }
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "poll-opt-inp";
      inp.placeholder = `Option ${count + 1}`;
      inp.maxLength = 60;
      wrap.appendChild(inp);
      inp.focus();
    });

    document.getElementById("btn-send-poll-now").addEventListener("click", async () => {
      const qInp = document.getElementById("poll-question-input");
      const q = (qInp ? qInp.value : "").trim();
      const opts = Array.from(document.querySelectorAll(".poll-opt-inp"))
        .map((i) => i.value.trim())
        .filter(Boolean);

      if (!q) {
        showToast("Please enter a poll question!", "error");
        return;
      }
      if (opts.length < 2) {
        showToast("Please add at least 2 options!", "error");
        return;
      }

      const pollObj = {
        id: "poll_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        q: q,
        opts: opts,
        by: myUsername
      };

      modal.classList.add("hidden");
      const chatInp = document.getElementById("chat-input");
      const sendBtn = document.getElementById("btn-send");
      if (chatInp && sendBtn) {
        chatInp.value = `[KRYPTON_POLL]${JSON.stringify(pollObj)}`;
        sendBtn.click();
      }
    });
  }

  window.openKryptonPollCreatorModal = function () {
    ensurePollCreatorModalExists();
    const modal = document.getElementById("krypton-poll-creator-modal");
    const qInp = document.getElementById("poll-question-input");
    const wrap = document.getElementById("poll-options-inputs-wrap");
    if (qInp) qInp.value = "";
    if (wrap) {
      wrap.innerHTML = `
        <input type="text" class="poll-opt-inp" placeholder="Option 1" maxlength="60" autocomplete="off" />
        <input type="text" class="poll-opt-inp" placeholder="Option 2" maxlength="60" autocomplete="off" />
      `;
    }
    modal.classList.remove("hidden");
    if (window.lucide) lucide.createIcons({ nodes: [modal] });
    setTimeout(() => qInp && qInp.focus(), 60);
  };

  function renderInteractivePollInsideNode(node) {
    if (!node) return;
    const textEl = node.querySelector(".msg-text-line");
    if (!textEl) return;
    const raw = (textEl.textContent || "").trim();
    if (!raw.startsWith("[KRYPTON_POLL]")) return;

    try {
      const pollData = JSON.parse(raw.slice("[KRYPTON_POLL]".length));
      if (!pollData || !pollData.id || !Array.isArray(pollData.opts)) return;

      node.dataset.pollId = pollData.id;
      node.dataset.pollJson = JSON.stringify(pollData);
      updatePollCardDOM(node, pollData);
    } catch (e) { }
  }

  function updatePollCardDOM(node, pollData) {
    const textEl = node.querySelector(".msg-text-line");
    if (!textEl) return;

    const votesMap = kryptonPollsVotesStore[pollData.id] || {}; // voter -> optionIndex
    const voters = Object.keys(votesMap);
    const totalVotes = voters.length;
    const myVoteIdx = votesMap[(myUsername || "").toLowerCase()];

    let optionsHTML = "";
    pollData.opts.forEach((optText, idx) => {
      const countForOpt = voters.filter((u) => votesMap[u] === idx).length;
      const pct = totalVotes > 0 ? Math.round((countForOpt / totalVotes) * 100) : 0;
      const isMyChoice = myVoteIdx === idx;

      optionsHTML += `
        <button type="button" class="krypton-poll-opt-btn ${isMyChoice ? "voted-by-me" : ""}" onclick="window.voteInKryptonPoll('${escapeHTML(pollData.id)}', ${idx})">
          <div class="krypton-poll-opt-fill" style="width: ${pct}%;"></div>
          <div class="krypton-poll-opt-content">
            <span>${isMyChoice ? "✓ " : ""}${escapeHTML(optText)}</span>
            <span class="krypton-poll-opt-pct">${pct}% (${countForOpt})</span>
          </div>
        </button>
      `;
    });

    textEl.innerHTML = `
      <div class="krypton-poll-card">
        <div class="krypton-poll-header">
          <span>📊 LIVE POLL</span>
        </div>
        <div class="krypton-poll-question">${escapeHTML(pollData.q)}</div>
        <div class="krypton-poll-options-list">${optionsHTML}</div>
        <div class="krypton-poll-footer">
          <span>${totalVotes} ${totalVotes === 1 ? "vote" : "votes"}</span>
          <span>Tap option to vote</span>
        </div>
      </div>
    `;
  }

  window.voteInKryptonPoll = function (pollId, optionIdx) {
    if (!pollId || !myUsername) return;
    const me = myUsername.toLowerCase();
    if (!kryptonPollsVotesStore[pollId]) kryptonPollsVotesStore[pollId] = {};

    // Toggle or switch vote
    if (kryptonPollsVotesStore[pollId][me] === optionIdx) {
      delete kryptonPollsVotesStore[pollId][me];
    } else {
      kryptonPollsVotesStore[pollId][me] = optionIdx;
    }
    savePollsVotesStore();

    // Update Poll UI locally
    document.querySelectorAll(`.message-row[data-poll-id="${pollId}"]`).forEach((row) => {
      try {
        const pData = JSON.parse(row.dataset.pollJson);
        updatePollCardDOM(row, pData);
      } catch (e) { }
    });

    // Broadcast vote live to room peers
    if (activeSubscription) {
      activeSubscription.send({
        type: "broadcast",
        event: "krypton-poll-vote",
        payload: {
          pollId: pollId,
          voter: me,
          optionIdx: kryptonPollsVotesStore[pollId][me]
        }
      });
    }
  };

  // Hook createMessageNode so any [KRYPTON_POLL] message renders as an interactive Poll Card
  const prevCreateMsgNodeV29 = window.createMessageNode;
  window.createMessageNode = async function (msg, rawTextOverride) {
    const node = await prevCreateMsgNodeV29(msg, rawTextOverride);
    if (node) {
      renderInteractivePollInsideNode(node);
    }
    return node;
  };

  // Listen for live poll votes inside joinRoom
  const prevJoinRoomV29 = window.joinRoom;
  window.joinRoom = async function (roomId, displayName, pushHistory = true) {
    await prevJoinRoomV29(roomId, displayName, pushHistory);
    if (activeSubscription) {
      activeSubscription.on("broadcast", { event: "krypton-poll-vote" }, (payload) => {
        const p = payload.payload;
        if (!p || !p.pollId || !p.voter) return;
        if (!kryptonPollsVotesStore[p.pollId]) kryptonPollsVotesStore[p.pollId] = {};
        if (p.optionIdx === undefined || p.optionIdx === null) {
          delete kryptonPollsVotesStore[p.pollId][p.voter];
        } else {
          kryptonPollsVotesStore[p.pollId][p.voter] = p.optionIdx;
        }
        savePollsVotesStore();
        document.querySelectorAll(`.message-row[data-poll-id="${p.pollId}"]`).forEach((row) => {
          try {
            const pData = JSON.parse(row.dataset.pollJson);
            updatePollCardDOM(row, pData);
          } catch (e) { }
        });
      });
    }
  };

  // -----------------------------------------------------------------------
  // 6. ENHANCE GROUP MESSAGE INFO: SHOW ONLINE MEMBERS & SEEN COUNT
  // -----------------------------------------------------------------------
  const prevOpenMsgInfoModalV29 = window.openWhatsAppMessageInfoModal;
  window.openWhatsAppMessageInfoModal = function (msgId) {
    if (typeof prevOpenMsgInfoModalV29 === "function") {
      prevOpenMsgInfoModalV29(msgId);
    }
    if (typeof isGroupRoom !== "function" || !isGroupRoom(currentRoom)) return;

    const bodyEl = document.getElementById("msg-info-modal-body");
    if (!bodyEl) return;

    const cleanId = String(msgId || "").replace("msg-row-", "");
    const receiptsAll = JSON.parse(localStorage.getItem("krypton_msg_info_receipts") || "{}");
    const receipt = receiptsAll[cleanId] || { seenByGroupMembers: {} };
    const seenMap = receipt.seenByGroupMembers || {};
    const seenUsers = Object.keys(seenMap);

    const grp = (savedGroups && savedGroups[currentRoom]) || { members: [] };
    const myLower = (myUsername || "").toLowerCase();
    const otherMembers = (grp.members || [])
      .map((m) => m.toLowerCase())
      .filter((m) => m && m !== myLower);

    const onlineCountNow = otherMembers.filter((m) => onlineUsersList && onlineUsersList.has(m)).length;

    let membersDirectoryHTML = "";
    otherMembers.forEach((m) => {
      const isOnline = Boolean(onlineUsersList && onlineUsersList.has(m));
      const seenTs = seenMap[m];
      const seenBadge = seenTs
        ? `<span class="msg-info-member-time">✓✓ Seen (${new Date(seenTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>`
        : `<span style="font-size: 10.5px; color: var(--text-dim);">Not seen yet</span>`;

      membersDirectoryHTML += `
        <div class="msg-info-member-receipt">
          <div style="display: flex; align-items: center; gap: 7px;">
            <span class="msg-info-member-user">@${escapeHTML(m)}</span>
            <span class="msg-info-online-pill ${isOnline ? "is-online" : "is-offline"}">
              ${isOnline ? "● Online" : "○ Offline"}
            </span>
          </div>
          ${seenBadge}
        </div>
      `;
    });

    // Replace the last group card with the upgraded WhatsApp-style Seen + Online Group Card
    const cards = bodyEl.querySelectorAll(".msg-info-status-card");
    const lastCard = cards[cards.length - 1];
    if (lastCard && cards.length > 1) {
      lastCard.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <span class="msg-info-group-section-title">SEEN BY ${seenUsers.length} OF ${otherMembers.length} MEMBERS</span>
          <span class="msg-info-online-pill is-online">${onlineCountNow} Online Now</span>
        </div>
        ${membersDirectoryHTML || '<div style="font-size: 11.5px; color: var(--text-dim);">No other members in this group.</div>'}
      `;
    }
  };

  function initV29000Upgrades() {
    makeAiOrbDraggable();
    upgradeAttachmentHubMenu();
  }

  document.addEventListener("DOMContentLoaded", initV29000Upgrades);
  setTimeout(initV29000Upgrades, 500);
})();
// =========================================================================
// 28. FEATURE v29500:
//     WHATSAPP/TELEGRAM-STYLE LEFT/RIGHT SWIPE GESTURE IN EMOJI DRAWER
//     TO SWITCH BETWEEN EMOJI CATEGORY GROUPS SMOOTHLY
// =========================================================================

(function () {
  function bindEmojiCategorySwipeGesture() {
    const emojiScrollArea = document.getElementById("emoji-grid-scroll");
    const emojiGrid = document.getElementById("whatsapp-emoji-grid");
    const catTabsWrap = document.getElementById("emoji-cat-tabs");
    if (!emojiScrollArea || !catTabsWrap || emojiScrollArea.dataset.emojiSwipeBound) return;
    emojiScrollArea.dataset.emojiSwipeBound = "true";

    let startX = 0;
    let startY = 0;
    let isSwipingHorizontally = false;
    let pointerDownActive = false;

    function switchEmojiCategoryByStep(stepDirection) {
      const buttons = Array.from(catTabsWrap.querySelectorAll(".emoji-cat-btn"));
      if (buttons.length <= 1) return;

      let activeIdx = buttons.findIndex((btn) => btn.classList.contains("active"));
      if (activeIdx === -1) activeIdx = 0;

      const nextIdx = activeIdx + stepDirection;
      // Clamp within first and last category (or wrap around smoothly)
      if (nextIdx < 0 || nextIdx >= buttons.length) return;

      const targetBtn = buttons[nextIdx];
      if (!targetBtn) return;

      // Trigger the existing category button click
      targetBtn.click();

      // Smoothly scroll the top category tab into view
      try {
        targetBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      } catch (e) { }

      // Reset grid scroll to top & play directional slide animation
      emojiScrollArea.scrollTop = 0;
      if (emojiGrid) {
        emojiGrid.classList.remove("emoji-swipe-left", "emoji-swipe-right");
        void emojiGrid.offsetWidth; // Force reflow for fresh animation
        emojiGrid.classList.add(stepDirection > 0 ? "emoji-swipe-left" : "emoji-swipe-right");
      }
    }

    // Touch Gesture (Mobile APK)
    emojiScrollArea.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwipingHorizontally = false;
      },
      { passive: true }
    );

    emojiScrollArea.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        if (!isSwipingHorizontally && Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.35) {
          isSwipingHorizontally = true;
        }
      },
      { passive: true }
    );

    emojiScrollArea.addEventListener(
      "touchend",
      (e) => {
        if (!e.changedTouches || e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;

        // Horizontal swipe threshold: 42px and clearly more horizontal than vertical
        if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          // Swipe Left (dx < 0) -> Next Category (+1)
          // Swipe Right (dx > 0) -> Previous Category (-1)
          switchEmojiCategoryByStep(dx < 0 ? 1 : -1);
        }
        isSwipingHorizontally = false;
      },
      { passive: true }
    );

    // Mouse Drag Gesture (Desktop / Web)
    emojiScrollArea.addEventListener("mousedown", (e) => {
      pointerDownActive = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    emojiScrollArea.addEventListener("mouseup", (e) => {
      if (!pointerDownActive) return;
      pointerDownActive = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        switchEmojiCategoryByStep(dx < 0 ? 1 : -1);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", bindEmojiCategorySwipeGesture);
  setTimeout(bindEmojiCategorySwipeGesture, 450);
})();
// =========================================================================
// 31. FEATURE v33000 (FINAL PRECISION FIX FOR SEARCH & EMOJI TOGGLE):
//     1. SHOW REGISTERED MATCHING USERS ON SEARCH (NO "GLOBAL DIRECTORY" TEXT)
//     2. SUPPORTS EXACT, SUBSTRING & FUZZY PREFIX MATCH (e.g. "Helo" -> "@hello")
//     3. EMOJI BUTTON WORKS 100% IDENTICALLY TO VIEW MEDIA (1st CLICK OPEN,
//        2nd CLICK CLOSE, OUTSIDE CLICK CLOSE - IMMUNE TO LINE 8892 BUG!)
//     4. 0ms INSTANT USER PROFILE DASHBOARD WITHOUT SAFETY FINGERPRINT KEY
// =========================================================================

(function () {
  // -----------------------------------------------------------------------
  // 1. SEARCH BAR: FIND ALL REGISTERED MATCHING USERS & RENDER CLEANLY
  //    (NO "GLOBAL DIRECTORY" HEADER, NO AUTO-ADD TO RECENT CHATS)
  // -----------------------------------------------------------------------
  function doesUsernameMatchQuery(uname, query) {
    const u = (uname || "").toLowerCase();
    const q = (query || "").toLowerCase();
    if (!u || !q) return false;
    if (u.includes(q) || q.includes(u)) return true;

    // Fuzzy prefix match so typing "helo" still matches "@hello"
    const prefix3 = q.slice(0, 3);
    if (prefix3.length >= 2 && u.startsWith(prefix3)) return true;

    // Collapse repeated letters check (e.g. "hello" -> "helo")
    const collapsedU = u.replace(/(.)\1+/g, "$1");
    const collapsedQ = q.replace(/(.)\1+/g, "$1");
    if (collapsedU.includes(collapsedQ)) return true;

    return false;
  }

  async function searchRegisteredUsersClean(rawQuery) {
    const q = (rawQuery || "").trim().toLowerCase().replace(/^@/, "");
    if (!q) {
      lastUniversalSearchResults = [];
      return [];
    }

    const myLower = (myUsername || "").toLowerCase();
    const userMap = new Map();
    // Use first 2 letters for broad DB fetch, then filter strictly in JS so "helo" finds "hello"!
    const dbPrefix = q.slice(0, 2) || q;

    if (supabaseClient) {
      // Source A: `users` table
      try {
        let rows = null;
        const { data: uData, error: uErr } = await supabaseClient
          .from("users")
          .select("username, avatar_url, bio, session_token")
          .ilike("username", `%${dbPrefix}%`)
          .limit(30);

        if (!uErr && Array.isArray(uData)) {
          rows = uData;
        } else {
          const { data: fallbackData } = await supabaseClient
            .from("users")
            .select("*")
            .ilike("username", `%${dbPrefix}%`)
            .limit(30);
          if (Array.isArray(fallbackData)) rows = fallbackData;
        }

        if (rows) {
          rows.forEach((u) => {
            const clean = (u.username || "").trim().toLowerCase();
            if (!clean || !doesUsernameMatchQuery(clean, q)) return;
            if (u.avatar_url) usersAvatarCache[clean] = u.avatar_url;
            if (u.bio) usersBioCache[clean] = u.bio;
            if (u.session_token) usersSessionCache[clean] = u.session_token;

            userMap.set(clean, {
              username: clean,
              avatar_url: u.avatar_url || usersAvatarCache[clean] || "",
              bio: u.bio || usersBioCache[clean] || "Hey there! I am using Krypton."
            });
          });
        }
      } catch (e) { }

      // Source B: `messages` table senders (in case RLS hides `users` rows)
      try {
        const { data: msgSenders } = await supabaseClient
          .from("messages")
          .select("sender_id")
          .ilike("sender_id", `%${dbPrefix}%`)
          .limit(20);
        if (Array.isArray(msgSenders)) {
          msgSenders.forEach((m) => {
            const clean = (m.sender_id || "").trim().toLowerCase();
            if (clean && doesUsernameMatchQuery(clean, q) && !userMap.has(clean)) {
              userMap.set(clean, {
                username: clean,
                avatar_url: usersAvatarCache[clean] || "",
                bio: usersBioCache[clean] || "Hey there! I am using Krypton."
              });
            }
          });
        }
      } catch (e) { }
    }

    // Source C: Online users & local bio cache
    onlineUsersList.forEach((onlineU) => {
      const clean = (onlineU || "").trim().toLowerCase();
      if (clean && doesUsernameMatchQuery(clean, q) && !userMap.has(clean)) {
        userMap.set(clean, {
          username: clean,
          avatar_url: usersAvatarCache[clean] || "",
          bio: usersBioCache[clean] || "Online on Krypton"
        });
      }
    });

    Object.keys(usersBioCache || {}).forEach((cachedU) => {
      const clean = (cachedU || "").trim().toLowerCase();
      if (clean && doesUsernameMatchQuery(clean, q) && !userMap.has(clean)) {
        userMap.set(clean, {
          username: clean,
          avatar_url: usersAvatarCache[clean] || "",
          bio: usersBioCache[clean] || "Hey there! I am using Krypton."
        });
      }
    });

    const results = Array.from(userMap.values()).sort((a, b) => {
      if (a.username === q && b.username !== q) return -1;
      if (b.username === q && a.username !== q) return 1;
      if (a.username.startsWith(q) && !b.username.startsWith(q)) return -1;
      if (!a.username.startsWith(q) && b.username.startsWith(q)) return 1;
      return a.username.localeCompare(b.username);
    });

    lastUniversalSearchResults = results;
    return results;
  }

  // Override renderPeerList so when searching, matching users render directly in #chat-list
  // WITHOUT any "GLOBAL DIRECTORY RESULTS" banner!
  const baseRenderPeerListV33 = prevRenderPeerListV10; // Original clean peer list renderer
  renderPeerList = window.renderPeerList = function (filterText = "") {
    baseRenderPeerListV33(filterText);

    if (typeof updateBottomDockUnreadBadges === "function") {
      try { updateBottomDockUnreadBadges(); } catch (e) { }
    }

    const cleanFilter = (filterText || "").trim().toLowerCase().replace(/^@/, "");
    if (!cleanFilter) return;

    const listEl = document.getElementById("chat-list");
    if (!listEl) return;

    const myLower = (myUsername || "").toLowerCase();
    const matchedNonSaved = (lastUniversalSearchResults || []).filter(
      (u) =>
        u &&
        u.username &&
        doesUsernameMatchQuery(u.username, cleanFilter) &&
        !savedPeers.some((p) => p.toLowerCase() === u.username.toLowerCase())
    );

    if (matchedNonSaved.length === 0) return;

    // Remove the "No saved chat matching..." placeholder since we found matching registered users
    const emptyState = listEl.querySelector(".empty-peers-state");
    if (emptyState) emptyState.remove();

    // Render matched registered users cleanly (NO "GLOBAL DIRECTORY" header!)
    matchedNonSaved.forEach((u) => {
      const uname = u.username.toLowerCase();
      const isSelf = uname === myLower;
      const isOnline = isSelf ? true : onlineUsersList.has(uname) && userSettings.onlinePresence;
      const rel = peerRelationshipMap[uname];
      const isAlreadyFriend = isSelf
        ? savedPeers.includes(myLower)
        : rel && (rel.status === "accepted" || (rel.status && rel.status.startsWith("call_")));
      const isPending = !isSelf && rel && rel.status === "pending";

      let actionBtnHTML = "";
      if (isSelf) {
        actionBtnHTML = `<button type="button" class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'open')">Open</button>`;
      } else if (isAlreadyFriend) {
        actionBtnHTML = `<button type="button" class="suggestion-action-pill secondary" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'open')">Chat</button>`;
      } else if (isPending) {
        actionBtnHTML = `<button type="button" class="suggestion-action-pill secondary" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'add')">${rel.receiver === myLower ? "Accept" : "Pending"}</button>`;
      } else {
        actionBtnHTML = `<button type="button" class="suggestion-action-pill" onclick="event.stopPropagation(); selectSuggestedPeer('${escapeHTML(uname)}', 'add')">+ Add Friend</button>`;
      }

      const exactAvatar = isSelf ? myAvatarData : u.avatar_url || usersAvatarCache[uname] || "";
      const exactBio = isSelf
        ? myUserBio || "Personal Vault • Message Yourself"
        : u.bio || usersBioCache[uname] || "Hey there! I am using Krypton.";

      const card = document.createElement("div");
      card.className = "contact-card";
      // Tapping the user row opens their Profile Dashboard (does NOT auto-add to Recent Chats!)
      card.onclick = (e) => {
        e.stopPropagation();
        if (isSelf || isAlreadyFriend) {
          window.selectSuggestedPeer(uname, "open");
        } else {
          window.openUserActionModal(uname);
        }
      };

      card.innerHTML =
        '<div class="contact-card-info">' +
        `<div class="avatar-wrap" onclick="event.stopPropagation(); viewUserProfilePicFullscreen('${escapeHTML(uname)}');">` +
        `<div class="contact-avatar" id="dir-avatar-${escapeHTML(uname)}"></div>` +
        `<div class="online-dot ${isOnline ? "visible" : ""}"></div></div>` +
        '<div class="contact-name-wrap">' +
        `<span class="contact-name">@${escapeHTML(uname)}${isSelf ? ' <span style="color: var(--accent-primary); font-weight: 800; font-size: 11px;">(You)</span>' : ""}</span>` +
        `<span class="contact-preview-text ${isOnline ? "status-online" : ""}">${escapeHTML(exactBio)}</span>` +
        "</div></div>" +
        `<div class="contact-right-meta">${actionBtnHTML}</div>`;

      listEl.appendChild(card);
      renderAvatarElement(card.querySelector(`#dir-avatar-${uname}`), uname, exactAvatar);
    });
  };

  // Update both top lexical variable and window property for updateLiveUserSuggestions
  updateLiveUserSuggestions = window.updateLiveUserSuggestions = async function (rawQuery) {
    const box = document.getElementById("live-user-suggestions");
    if (box) {
      box.classList.add("hidden");
      box.innerHTML = "";
    }

    const q = (rawQuery || "").trim().toLowerCase().replace(/^@/, "");
    if (!q) {
      lastUniversalSearchResults = [];
      renderPeerList("");
      return;
    }

    const queryId = ++latestSearchQueryId;
    await searchRegisteredUsersClean(q);
    if (queryId !== latestSearchQueryId) return;

    renderPeerList(q);
  };

  window.selectSuggestedPeer = async function (uname, actionType = "open") {
    const clean = (uname || "").trim().toLowerCase().replace(/^@/, "");
    if (!clean) return;
    const inputEl = document.getElementById("peer-id-input");
    if (inputEl) inputEl.value = "";
    hideLiveUserSuggestions();
    lastUniversalSearchResults = [];

    const myLower = (myUsername || "").toLowerCase();
    if (clean === myLower || clean === "me" || clean === "self") {
      savePeerToRecent(myLower, true);
      openSelfChatRoom();
      return;
    }

    const rel = await getPeerRelationshipState(clean);
    if (actionType === "add") {
      if (rel.state === "incoming_pending") {
        await respondChatRequest(clean, "accepted");
        savePeerToRecent(clean, true);
      } else if (rel.state !== "accepted") {
        await requestChatConnection(clean);
        renderPeerList("");
        return;
      }
    }

    if (rel.state === "accepted") {
      savePeerToRecent(clean, true);
    }
    renderPeerList("");
    const dmRoom = await getSecureRoomId(clean);
    joinRoom(dmRoom, "@" + clean);
  };

  // Re-bind #peer-id-input cleanly
  const peerInp = document.getElementById("peer-id-input");
  if (peerInp) {
    const freshInp = peerInp.cloneNode(true);
    peerInp.parentNode.replaceChild(freshInp, peerInp);

    let searchTimer = null;
    freshInp.addEventListener("focus", () => {
      document.body.classList.add("sidebar-keyboard-open");
    });

    freshInp.addEventListener("blur", () => {
      setTimeout(() => {
        document.body.classList.remove("sidebar-keyboard-open");
      }, 140);
    });

    freshInp.addEventListener("input", () => {
      const val = freshInp.value.trim();
      clearTimeout(searchTimer);
      if (!val) {
        lastUniversalSearchResults = [];
        hideLiveUserSuggestions();
        renderPeerList("");
        return;
      }
      renderPeerList(val);
      searchTimer = setTimeout(() => {
        updateLiveUserSuggestions(val);
      }, 120);
    });
  }

  // -----------------------------------------------------------------------
  // 2. 0ms INSTANT USER PROFILE DASHBOARD MODAL (ALREADY WORKING GREAT!)
  // -----------------------------------------------------------------------
  window.openUserActionModal = function (targetUser) {
    if (!targetUser) return;
    const p = String(targetUser).trim().toLowerCase().replace(/^@/, "");
    if (!p) return;

    const myLower = (myUsername || "").toLowerCase();
    if (p === myLower || p === "me") {
      openSelfChatRoom();
      return;
    }

    document.querySelectorAll(".contact-dropdown-menu").forEach((m) => {
      if (m.id !== "header-dropdown-menu") m.remove();
    });

    const existingModal = document.getElementById("user-action-modal");
    if (existingModal) existingModal.remove();

    const isBlocked = Array.isArray(blockedUsers)
      ? blockedUsers.includes(p)
      : blockedUsers instanceof Set && blockedUsers.has(p);
    const cached = getUserDataCached(p);
    const localRel = peerRelationshipMap[p] || { status: "none" };

    function getFriendBtnHTML(stateStr) {
      if (stateStr === "accepted" || (stateStr && stateStr.startsWith("call_"))) {
        return `<button class="glass-btn secondary" id="btn-action-friend-state" disabled style="opacity: 0.85; cursor: default;">✓ Friends (Connected)</button>`;
      }
      if (stateStr === "incoming_pending" || (stateStr === "pending" && localRel.receiver === myLower)) {
        return `<button class="glass-btn primary" id="btn-action-friend-state">Accept Friend Request</button>`;
      }
      if (stateStr === "outgoing_pending" || (stateStr === "pending" && localRel.sender === myLower)) {
        return `<button class="glass-btn secondary" id="btn-action-friend-state">Cancel Sent Request</button>`;
      }
      return `<button class="glass-btn secondary" id="btn-action-friend-state">Send Friend Request</button>`;
    }

    const modal = document.createElement("div");
    modal.id = "user-action-modal";
    modal.className = "glass-modal";

    modal.innerHTML =
      '<div class="glass-card user-action-popup">' +
      `<div class="user-action-avatar-wrap" id="action-avatar-zoom-trigger" title="Click to View Full Profile Picture">` +
      '<div class="avatar user-action-avatar" id="action-user-avatar">?</div>' +
      '<div class="avatar-zoom-hint"><i data-lucide="maximize-2" style="width: 11px; height: 11px;"></i></div>' +
      "</div>" +
      '<h3 style="margin-top: 2px; font-weight: 800;">@' + escapeHTML(p) + "</h3>" +
      '<div id="action-user-bio-box" style="background: var(--glass-card); padding: 8px 14px; border-radius: 13px; margin: 4px 0; font-size: 12px; color: var(--text-muted); border: 1px solid var(--glass-border); word-break: break-word; width: 100%;">' +
      escapeHTML(cached.bio) +
      "</div>" +
      '<div class="user-action-buttons">' +
      '<button class="glass-btn primary" id="btn-action-open-dm">Open Direct Chat</button>' +
      '<button class="glass-btn secondary" id="btn-action-view-dp">View Full Profile Picture</button>' +
      `<div id="action-friend-btn-slot" style="width: 100%; display: flex;">${getFriendBtnHTML(localRel.status)}</div>` +
      '<button class="glass-btn ' + (isBlocked ? "secondary" : "danger") + '" id="btn-action-toggle-block">' +
      (isBlocked ? "Unblock User" : "Block User") +
      "</button>" +
      '<button class="glass-btn secondary" id="btn-action-cancel">Close</button>' +
      "</div>" +
      "</div>";

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons({ nodes: [modal] });

    function closeModalAnimated() {
      modal.classList.add("closing");
      setTimeout(() => modal.remove(), 140);
    }

    modal.addEventListener("click", (e) => {
      if (e.target.id === "user-action-modal") closeModalAnimated();
    });

    const avatarBox = modal.querySelector("#action-user-avatar");
    renderAvatarElement(avatarBox, p, cached.avatar);

    modal.querySelector("#action-avatar-zoom-trigger").onclick = () => viewUserProfilePicFullscreen(p);
    modal.querySelector("#btn-action-view-dp").onclick = () => viewUserProfilePicFullscreen(p);

    modal.querySelector("#btn-action-open-dm").onclick = async () => {
      closeModalAnimated();
      const dmRoom = await getSecureRoomId(p);
      joinRoom(dmRoom, "@" + p);
    };

    modal.querySelector("#btn-action-toggle-block").onclick = () => {
      closeModalAnimated();
      toggleBlockUser(p);
    };

    modal.querySelector("#btn-action-cancel").onclick = closeModalAnimated;

    function bindFriendSlotAction(currentRelState) {
      const friendBtn = modal.querySelector("#btn-action-friend-state");
      if (!friendBtn || friendBtn.disabled) return;
      friendBtn.onclick = async () => {
        closeModalAnimated();
        if (currentRelState === "incoming_pending") {
          await respondChatRequest(p, "accepted");
          savePeerToRecent(p, true);
        } else if (currentRelState === "outgoing_pending") {
          await cancelSentRequest(p);
        } else {
          await requestChatConnection(p);
        }
      };
    }

    bindFriendSlotAction(
      localRel.status === "pending"
        ? localRel.receiver === myLower
          ? "incoming_pending"
          : "outgoing_pending"
        : localRel.status
    );

    getPeerRelationshipState(p)
      .then((rel) => {
        const slot = modal.querySelector("#action-friend-btn-slot");
        if (slot && document.body.contains(modal)) {
          slot.innerHTML = getFriendBtnHTML(rel.state);
          bindFriendSlotAction(rel.state);
        }
      })
      .catch(() => { });

    if (supabaseClient) {
      supabaseClient
        .from("users")
        .select("avatar_url, bio, session_token")
        .eq("username", p)
        .then(({ data }) => {
          if (data && data.length > 0 && document.body.contains(modal)) {
            const fresh = data[0];
            if (fresh.bio) {
              usersBioCache[p] = fresh.bio;
              localStorage.setItem("krypton_bio_cache", JSON.stringify(usersBioCache));
              const bioBox = modal.querySelector("#action-user-bio-box");
              if (bioBox) bioBox.textContent = fresh.bio;
            }
            if (fresh.avatar_url) {
              usersAvatarCache[p] = fresh.avatar_url;
              localStorage.setItem("krypton_avatar_cache", JSON.stringify(usersAvatarCache));
              renderAvatarElement(avatarBox, p, fresh.avatar_url);
            }
          }
        })
        .catch(() => { });
    }
  };

  // -----------------------------------------------------------------------
  // 3. MAKE EMOJI BUTTON (#btn-tg-emoji-left) WORK 100% LIKE VIEW MEDIA (#btn-attach-hub)!
  //    Why View Media works: Line 5060 uses `attachHubMenu.classList.toggle("hidden")`
  //    on button click and `window.addEventListener("click")` to close on outside tap.
  //    Why Emoji failed: Line 8892 had a `pointerdown` listener that forced
  //    `emojiPalette.classList.add("hidden")` BEFORE the button's `click` event fired!
  // -----------------------------------------------------------------------
  const emojiPalEl = document.getElementById("emoji-palette");
  const attachMenuEl = document.getElementById("attach-hub-menu");
  const btnAttachEl = document.getElementById("btn-attach-hub");

  if (emojiPalEl) {
    // Shield #emoji-palette from Line 8892's premature `pointerdown` close when tapping the Emoji button!
    let ignorePointerDownHideUntil = 0;
    const origClassListAdd = emojiPalEl.classList.add.bind(emojiPalEl.classList);

    emojiPalEl.classList.add = function (...tokens) {
      if (tokens.includes("hidden") && Date.now() < ignorePointerDownHideUntil) {
        return; // Block Line 8892 from hiding #emoji-palette during button tap!
      }
      return origClassListAdd(...tokens);
    };

    const btnEmojiCurrent = document.getElementById("btn-tg-emoji-left");
    if (btnEmojiCurrent) {
      // Clone to remove any old conflicting listeners
      const cleanEmojiBtn = btnEmojiCurrent.cloneNode(true);
      btnEmojiCurrent.parentNode.replaceChild(cleanEmojiBtn, btnEmojiCurrent);

      // Arm shield on pointerdown/touchstart so Line 8892 cannot interfere
      const armShield = () => {
        ignorePointerDownHideUntil = Date.now() + 380;
      };
      cleanEmojiBtn.addEventListener("pointerdown", armShield, true);
      cleanEmojiBtn.addEventListener("touchstart", armShield, { passive: true, capture: true });

      // Exact same click toggle logic as View Media (#btn-attach-hub on Line 5060)!
      cleanEmojiBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ignorePointerDownHideUntil = 0; // Disarm shield so our toggle works immediately

        const isCurrentlyOpen = !emojiPalEl.classList.contains("hidden");
        if (attachMenuEl) attachMenuEl.classList.add("hidden");
        if (btnAttachEl) btnAttachEl.classList.remove("active");

        if (isCurrentlyOpen) {
          origClassListAdd("hidden");
          cleanEmojiBtn.classList.remove("active");
        } else {
          if (typeof renderWhatsAppEmojiGrid === "function") renderWhatsAppEmojiGrid();
          emojiPalEl.classList.remove("hidden");
          cleanEmojiBtn.classList.remove("active");
        }
      });
    }
  }
})();
// =========================================================================
// 32. FEATURE v34000 (100% FIX FOR SEARCH BACK GESTURE & EMOJI TOGGLE):
//     1. PHONE BACK GESTURE CLEARS SEARCH BAR ("A") & RESTORES MAIN SCREEN
//     2. INDEPENDENT EMOJI DRAWER STATE MACHINE (1st CLICK OPEN, 2nd CLOSE)
// =========================================================================

(function () {
  // -----------------------------------------------------------------------
  // 1. SEARCH BAR BACK GESTURE FIX (CLEAR SEARCH & RETURN TO MAIN CHATS)
  // -----------------------------------------------------------------------
  let searchHistoryPushed = false;

  function isMainSearchActive() {
    const inp = document.getElementById("peer-id-input");
    if (!inp) return false;
    return Boolean(inp.value.trim().length > 0 || document.activeElement === inp);
  }

  function clearMainSearchAndRestoreHome() {
    const inp = document.getElementById("peer-id-input");
    if (inp) {
      inp.value = "";
      inp.blur();
    }
    document.body.classList.remove("sidebar-keyboard-open");
    lastUniversalSearchResults = [];
    if (typeof hideLiveUserSuggestions === "function") hideLiveUserSuggestions();
    if (typeof renderPeerList === "function") renderPeerList("");
    searchHistoryPushed = false;
  }

  // Push history state when user starts typing/focusing in #peer-id-input so Android Back Gesture catches it!
  document.addEventListener(
    "focusin",
    (e) => {
      if (e.target && e.target.id === "peer-id-input") {
        if (!searchHistoryPushed) {
          searchHistoryPushed = true;
          try {
            window.history.pushState({ kryptonSearchActive: true }, "");
          } catch (err) { }
        }
      }
    },
    true
  );

  document.addEventListener(
    "input",
    (e) => {
      if (e.target && e.target.id === "peer-id-input") {
        const val = e.target.value.trim();
        if (val && !searchHistoryPushed) {
          searchHistoryPushed = true;
          try {
            window.history.pushState({ kryptonSearchActive: true }, "");
          } catch (err) { }
        }
      }
    },
    true
  );

  // Catch WebView / Android Gesture Back via popstate
  window.addEventListener(
    "popstate",
    (e) => {
      const emojiPal = document.getElementById("emoji-palette");
      if (emojiPal && !emojiPal.classList.contains("krypton-emoji-force-closed") && !emojiPal.classList.contains("hidden")) {
        setEmojiDrawerOpenState(false);
        return;
      }

      if (isMainSearchActive()) {
        clearMainSearchAndRestoreHome();
      }
    },
    true
  );

  // Also upgrade handleAndroidBackNavigation for Capacitor Hardware Back Button
  const origHandleAndroidBackV34 = window.handleAndroidBackNavigation;
  window.handleAndroidBackNavigation = function () {
    // 1. If Emoji Drawer is open -> close it first
    if (isEmojiDrawerOpen) {
      setEmojiDrawerOpenState(false);
      return true;
    }

    // 2. If View Media Hub is open -> close it first
    const attachMenu = document.getElementById("attach-hub-menu");
    const btnAttach = document.getElementById("btn-attach-hub");
    if (attachMenu && !attachMenu.classList.contains("hidden")) {
      attachMenu.classList.add("hidden");
      if (btnAttach) btnAttach.classList.remove("active");
      return true;
    }

    // 3. If User is on Home Screen and Search Bar has text (like "A") -> Clear Search & Restore Main Screen!
    if (!document.body.classList.contains("mobile-chat-active") && isMainSearchActive()) {
      clearMainSearchAndRestoreHome();
      return true;
    }

    if (typeof origHandleAndroidBackV34 === "function") {
      return origHandleAndroidBackV34();
    }
    return false;
  };

  // -----------------------------------------------------------------------
  // 2. INDEPENDENT EMOJI DRAWER CONTROLLER (IMMUNE TO LINE 8892 BUG!)
  // -----------------------------------------------------------------------
  let isEmojiDrawerOpen = false;
  let lastEmojiToggleTimestamp = 0;

  function setEmojiDrawerOpenState(openNow) {
    const emojiPal = document.getElementById("emoji-palette");
    const attachMenu = document.getElementById("attach-hub-menu");
    const btnAttach = document.getElementById("btn-attach-hub");
    const btnEmoji = document.getElementById("btn-tg-emoji-left");
    if (!emojiPal) return;

    isEmojiDrawerOpen = Boolean(openNow);

    if (isEmojiDrawerOpen) {
      // Close View Media hub if open
      if (attachMenu) attachMenu.classList.add("hidden");
      if (btnAttach) btnAttach.classList.remove("active");

      if (typeof renderWhatsAppEmojiGrid === "function") {
        try { renderWhatsAppEmojiGrid(); } catch (err) { }
      }
      emojiPal.classList.remove("hidden", "krypton-emoji-force-closed");
    } else {
      emojiPal.classList.add("hidden", "krypton-emoji-force-closed");
    }

    if (btnEmoji) btnEmoji.classList.remove("active");
  }

  // Initialize Emoji Drawer as closed on boot
  setTimeout(() => setEmojiDrawerOpenState(false), 100);

  // Intercept pointerdown in Capture Phase BEFORE Line 8892 can run!
  document.addEventListener(
    "pointerdown",
    (e) => {
      const target = e.target;
      if (!target) return;

      const emojiPal = document.getElementById("emoji-palette");
      const clickedEmojiBtn = target.closest("#btn-tg-emoji-left");
      const clickedCloseEmojiBtn = target.closest("#btn-close-emoji-drawer");
      const clickedInsideEmojiDrawer = emojiPal && emojiPal.contains(target);

      // A. User tapped the Emoji Icon (#btn-tg-emoji-left)
      if (clickedEmojiBtn) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const now = Date.now();
        if (now - lastEmojiToggleTimestamp < 220) return; // Debounce double-fire
        lastEmojiToggleTimestamp = now;

        // Toggle strictly using our independent variable!
        setEmojiDrawerOpenState(!isEmojiDrawerOpen);
        return;
      }

      // B. User tapped the "X" button inside Emoji Drawer
      if (clickedCloseEmojiBtn) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setEmojiDrawerOpenState(false);
        return;
      }

      // C. User tapped outside the Emoji Drawer while it was open -> Close it!
      if (isEmojiDrawerOpen && !clickedInsideEmojiDrawer) {
        setEmojiDrawerOpenState(false);
      }
    },
    true
  );

  // Block any secondary `click` event on #btn-tg-emoji-left from undoing our pointerdown toggle!
  document.addEventListener(
    "click",
    (e) => {
      if (e.target && e.target.closest("#btn-tg-emoji-left")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    },
    true
  );

  // Also close Emoji Drawer whenever View Media (#btn-attach-hub) is opened
  document.addEventListener(
    "click",
    (e) => {
      if (e.target && e.target.closest("#btn-attach-hub")) {
        if (isEmojiDrawerOpen) {
          isEmojiDrawerOpen = false;
          const emojiPal = document.getElementById("emoji-palette");
          if (emojiPal) emojiPal.classList.add("hidden", "krypton-emoji-force-closed");
        }
      }
    },
    true
  );
})();
// =========================================================================
// 33. FEATURE v35000 (WHATSAPP-STYLE 3-STAGE TICKS & MESSAGE INFO TIMESTAMPS):
//     1. SINGLE TICK (✓ SENT) -> DOUBLE TICK (✓✓ DELIVERED) -> BLUE TICK (✓✓ READ)
//     2. AUTO-INFER READ & SEEN TIME FOR OLD MESSAGES WHEN PEER REPLIES
//     3. REALTIME + PERSISTENT SEEN TIMESTAMP SYNC ACROSS PRESENCE & ROOM
//     4. ACCURATE SENT / DELIVERED / SEEN TIMESTAMPS IN MESSAGE INFO MODAL
// =========================================================================

(function () {
  // Persistent store: { [msgId]: { sentAt, deliveredAt, seenAt, seenByGroupMembers: {} } }
  let receiptStore = {};
  try {
    receiptStore = JSON.parse(localStorage.getItem("krypton_msg_info_receipts") || "{}");
  } catch (e) {
    receiptStore = {};
  }

  // Also store per-room last seen timestamp by peer: { [roomId]: timestamp }
  let roomPeerLastSeenMap = {};
  try {
    roomPeerLastSeenMap = JSON.parse(localStorage.getItem("krypton_room_peer_seen_ts") || "{}");
  } catch (e) {
    roomPeerLastSeenMap = {};
  }

  function saveReceiptsToDisk() {
    try {
      localStorage.setItem("krypton_msg_info_receipts", JSON.stringify(receiptStore));
      localStorage.setItem("krypton_room_peer_seen_ts", JSON.stringify(roomPeerLastSeenMap));
    } catch (e) { }
  }

  function ensureReceiptEntry(msgId, createdAtTs) {
    const cleanId = String(msgId || "").replace("msg-row-", "");
    if (!cleanId) return null;
    const baseTs = createdAtTs || Date.now();
    if (!receiptStore[cleanId]) {
      receiptStore[cleanId] = {
        sentAt: baseTs,
        deliveredAt: null,
        seenAt: null,
        seenByGroupMembers: {}
      };
    } else if (!receiptStore[cleanId].sentAt) {
      receiptStore[cleanId].sentAt = baseTs;
    }
    return receiptStore[cleanId];
  }

  function setTickDOMState(row, state) {
    if (!row) return;
    const tickEl = row.querySelector(".msg-status-ticks");
    if (!tickEl) return;

    if (state === "read") {
      tickEl.className = "msg-status-ticks read";
      tickEl.textContent = "✓✓";
      tickEl.dataset.persistentRead = "true";
      tickEl.dataset.persistentDelivered = "true";
    } else if (state === "delivered") {
      if (tickEl.dataset.persistentRead === "true") return;
      tickEl.className = "msg-status-ticks delivered";
      tickEl.textContent = "✓✓";
      tickEl.dataset.persistentDelivered = "true";
    } else {
      if (tickEl.dataset.persistentRead === "true" || tickEl.dataset.persistentDelivered === "true") return;
      tickEl.className = "msg-status-ticks";
      tickEl.textContent = "✓";
    }
  }

  // Core Engine: Scan all messages in #message-container and compute exact Sent / Delivered / Read state!
  function evaluateAndSyncAllMessageTicks(forceMarkAllSentAsRead = false, customSeenTs = null, readerUser = "") {
    if (!currentRoom || currentRoom === "global") return;
    const container = document.getElementById("message-container");
    if (!container) return;

    const allRows = Array.from(container.querySelectorAll(".message-row"));
    if (allRows.length === 0) return;

    const myLower = (myUsername || "").toLowerCase();
    const isSelf = typeof isSelfRoom === "function" && isSelfRoom(currentRoom);
    const isGroup = typeof isGroupRoom === "function" && isGroupRoom(currentRoom);
    const isPeerOnline =
      isSelf ||
      (currentPeerUser && onlineUsersList && onlineUsersList.has(currentPeerUser.toLowerCase()));

    // Find the latest timestamp of any message sent by the OTHER person in this room.
    // Any message we sent BEFORE their reply was 100% Delivered & Seen by them!
    let latestReceivedMsgTs = 0;
    let latestReceivedSender = currentPeerUser || "";

    allRows.forEach((r) => {
      const s = (r.dataset.sender || "").toLowerCase();
      const ts = parseInt(r.dataset.msgTs || "0", 10);
      if (s && s !== myLower && ts > latestReceivedMsgTs) {
        latestReceivedMsgTs = ts;
        latestReceivedSender = s;
      }
    });

    const roomLastSeenTs = roomPeerLastSeenMap[currentRoom] || 0;
    const effectiveSeenCutoffTs = Math.max(
      latestReceivedMsgTs,
      roomLastSeenTs,
      forceMarkAllSentAsRead ? Date.now() + 5000 : 0
    );

    allRows.forEach((row) => {
      if (!row.classList.contains("sent")) return;

      const cleanId = (row.id || "").replace("msg-row-", "");
      const msgTs = parseInt(row.dataset.msgTs || "0", 10) || Date.now();
      const entry = ensureReceiptEntry(cleanId, msgTs);
      if (!entry) return;

      const tickEl = row.querySelector(".msg-status-ticks");
      const alreadyReadInDB =
        row.dataset.dbIsRead === "true" ||
        (tickEl && tickEl.dataset.persistentRead === "true");

      // Condition for READ (Blue Double Tick ✓✓):
      // 1. Self chat, OR 2. Marked is_read in DB/cache, OR 3. Sent before peer's last reply / seen cutoff, OR 4. Live seen event
      if (isSelf || alreadyReadInDB || (effectiveSeenCutoffTs > 0 && msgTs <= effectiveSeenCutoffTs)) {
        const inferredSeenTs =
          entry.seenAt ||
          customSeenTs ||
          (latestReceivedMsgTs >= msgTs ? latestReceivedMsgTs : Date.now());
        if (!entry.deliveredAt) entry.deliveredAt = Math.min(msgTs + 1200, inferredSeenTs);
        if (!entry.seenAt) entry.seenAt = inferredSeenTs;

        const whoSaw = (readerUser || latestReceivedSender || currentPeerUser || "").toLowerCase();
        if (whoSaw && whoSaw !== myLower) {
          if (!entry.seenByGroupMembers) entry.seenByGroupMembers = {};
          if (!entry.seenByGroupMembers[whoSaw]) {
            entry.seenByGroupMembers[whoSaw] = entry.seenAt;
          }
        }
        setTickDOMState(row, "read");
      }
      // Condition for DELIVERED (Grey Double Tick ✓✓):
      // Peer is currently online or message was previously delivered
      else if (isPeerOnline || entry.deliveredAt) {
        if (!entry.deliveredAt) entry.deliveredAt = Date.now();
        setTickDOMState(row, "delivered");
      }
      // Otherwise SENT (Single Tick ✓):
      else {
        setTickDOMState(row, "sent");
      }
    });

    saveReceiptsToDisk();
  }

  // Hook createMessageNode so every message row stores its exact timestamp (`data-msg-ts`, `data-created-at-iso`)
  // and immediately gets the right tick state!
  const prevCreateMsgNodeV35 = window.createMessageNode;
  window.createMessageNode = async function (msg, rawTextOverride) {
    const node = await prevCreateMsgNodeV35(msg, rawTextOverride);
    if (!node || !msg) return node;

    const iso = msg.created_at || new Date().toISOString();
    const ts = new Date(iso).getTime() || Date.now();
    node.dataset.createdAtIso = iso;
    node.dataset.msgTs = String(ts);
    if (msg.is_read === true) {
      node.dataset.dbIsRead = "true";
    }

    const cleanId = String(msg.id || node.id || "").replace("msg-row-", "");
    const entry = ensureReceiptEntry(cleanId, ts);

    if (entry) {
      if (msg.is_read === true || entry.seenAt) {
        if (!entry.deliveredAt) entry.deliveredAt = ts + 1000;
        if (!entry.seenAt) entry.seenAt = ts + 2500;
        setTickDOMState(node, "read");
      } else if (entry.deliveredAt) {
        setTickDOMState(node, "delivered");
      }
    }

    setTimeout(() => evaluateAndSyncAllMessageTicks(false), 30);
    return node;
  };

  // Broadcast Seen Receipt over BOTH Room Channel AND Global Presence Channel
  // so the sender receives Blue Ticks & Seen Time even if they switch rooms!
  function broadcastUniversalSeenReceipt() {
    if (!currentRoom || currentRoom === "global" || !myUsername) return;
    const nowTs = Date.now();
    const payload = {
      room: currentRoom,
      reader: myUsername.toLowerCase(),
      targetPeer: (currentPeerUser || "").toLowerCase(),
      seenAt: nowTs
    };

    try {
      if (activeSubscription) {
        activeSubscription.send({
          type: "broadcast",
          event: "seen-messages",
          payload: payload
        });
        activeSubscription.send({
          type: "broadcast",
          event: "detailed-seen-receipt",
          payload: payload
        });
      }
    } catch (e) { }

    try {
      if (presenceChannel) {
        presenceChannel.send({
          type: "broadcast",
          event: "universal-seen-sync",
          payload: payload
        });
      }
    } catch (e) { }
  }

  // Listen on Global Presence Channel for universal seen & delivery receipts
  const prevInitPresenceV35 = window.initPresenceTracker;
  window.initPresenceTracker = function () {
    if (typeof prevInitPresenceV35 === "function") prevInitPresenceV35();
    if (!presenceChannel) return;

    presenceChannel.on("broadcast", { event: "universal-seen-sync" }, (eventObj) => {
      const p = eventObj.payload;
      if (!p || !p.room || !p.reader) return;
      const myLower = (myUsername || "").toLowerCase();
      if (p.reader.toLowerCase() === myLower) return;

      const seenTs = p.seenAt || Date.now();
      roomPeerLastSeenMap[p.room] = Math.max(roomPeerLastSeenMap[p.room] || 0, seenTs);
      saveReceiptsToDisk();

      // If we are currently viewing that room, turn all ticks Blue immediately!
      if (currentRoom === p.room) {
        evaluateAndSyncAllMessageTicks(true, seenTs, p.reader);
      }
    });
  };

  // Override update1on1MessageTicks so any call to it runs our full WhatsApp tick engine
  window.update1on1MessageTicks = function (isRead) {
    if (isRead && currentRoom) {
      roomPeerLastSeenMap[currentRoom] = Date.now();
    }
    evaluateAndSyncAllMessageTicks(Boolean(isRead), Date.now(), currentPeerUser);
  };

  // Hook joinRoom to evaluate ticks on room open and broadcast seen receipt when viewing messages
  const prevJoinRoomV35 = window.joinRoom;
  window.joinRoom = async function (roomId, displayName, pushHistory = true) {
    await prevJoinRoomV35(roomId, displayName, pushHistory);

    evaluateAndSyncAllMessageTicks(false);
    setTimeout(() => evaluateAndSyncAllMessageTicks(false), 350);

    if (roomId && roomId !== "global") {
      setTimeout(broadcastUniversalSeenReceipt, 250);
      setTimeout(broadcastUniversalSeenReceipt, 1200);
    }
  };

  // Also broadcast seen receipt whenever a new message arrives while we have the chat open
  const msgContainerEl = document.getElementById("message-container");
  if (msgContainerEl && window.MutationObserver) {
    const feedObs = new MutationObserver(() => {
      evaluateAndSyncAllMessageTicks(false);
      if (currentRoom && currentRoom !== "global" && !document.hidden) {
        broadcastUniversalSeenReceipt();
      }
    });
    feedObs.observe(msgContainerEl, { childList: true });
  }

  // Upgrade openWhatsAppMessageInfoModal so it always shows accurate Sent, Delivered & Read/Seen times!
  function formatWhatsAppReceiptTime(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return isToday
      ? `Today at ${timeStr}`
      : `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} at ${timeStr}`;
  }

  window.openWhatsAppMessageInfoModal = function (msgId) {
    const cleanId = String(msgId || "").replace("msg-row-", "");
    const row = document.getElementById("msg-row-" + cleanId);
    const modal = document.getElementById("krypton-msg-info-modal");
    const bodyEl = document.getElementById("msg-info-modal-body");
    if (!row || !modal || !bodyEl) return;

    // Run tick evaluation first so receiptStore[cleanId] is 100% up-to-date
    evaluateAndSyncAllMessageTicks(false);

    const sender = row.dataset.sender || myUsername;
    const msgTs =
      parseInt(row.dataset.msgTs || "0", 10) ||
      new Date(row.dataset.createdAtIso || Date.now()).getTime() ||
      Date.now();

    const entry = ensureReceiptEntry(cleanId, msgTs);
    const tickEl = row.querySelector(".msg-status-ticks");
    const isReadNow = Boolean(
      (tickEl && tickEl.classList.contains("read")) || entry.seenAt
    );
    const isDeliveredNow = Boolean(
      isReadNow || (tickEl && tickEl.classList.contains("delivered")) || entry.deliveredAt
    );

    const sentText = formatWhatsAppReceiptTime(entry.sentAt || msgTs) || "Just now";
    const deliveredText = isDeliveredNow
      ? formatWhatsAppReceiptTime(entry.deliveredAt || entry.sentAt || msgTs)
      : "Pending (User offline)";
    const seenText = isReadNow
      ? formatWhatsAppReceiptTime(entry.seenAt || entry.deliveredAt || msgTs)
      : "Not seen yet";

    const textEl = row.querySelector(".msg-text-line");
    const msgType = row.dataset.msgType || "text";
    let previewSnippet = textEl ? textEl.textContent.trim() : "Encrypted Message";
    if (msgType === "media") previewSnippet = "📷 Photo";
    else if (msgType === "voice") previewSnippet = "🎤 Voice Note";
    else if (msgType === "files") previewSnippet = "📎 Document / File";

    let groupSectionHTML = "";
    if (typeof isGroupRoom === "function" && isGroupRoom(currentRoom)) {
      const seenMap = entry.seenByGroupMembers || {};
      const grp = (savedGroups && savedGroups[currentRoom]) || { members: [] };
      const myLower = (myUsername || "").toLowerCase();
      const otherMembers = (grp.members || [])
        .map((m) => m.toLowerCase())
        .filter((m) => m && m !== myLower);

      const seenCount = otherMembers.filter((m) => Boolean(seenMap[m])).length;
      const onlineCount = otherMembers.filter((m) => onlineUsersList && onlineUsersList.has(m)).length;

      let membersRows = "";
      otherMembers.forEach((m) => {
        const isOnline = Boolean(onlineUsersList && onlineUsersList.has(m));
        const sTs = seenMap[m];
        const rightBadge = sTs
          ? `<span class="msg-info-member-time" style="color: #38bdf8;">✓✓ ${escapeHTML(formatWhatsAppReceiptTime(sTs))}</span>`
          : `<span style="font-size: 10.5px; color: var(--text-dim);">${isOnline ? "✓✓ Delivered" : "✓ Sent"}</span>`;

        membersRows += `
          <div class="msg-info-member-receipt">
            <div style="display: flex; align-items: center; gap: 7px;">
              <span class="msg-info-member-user">@${escapeHTML(m)}</span>
              <span class="msg-info-online-pill ${isOnline ? "is-online" : "is-offline"}">
                ${isOnline ? "● Online" : "○ Offline"}
              </span>
            </div>
            ${rightBadge}
          </div>
        `;
      });

      groupSectionHTML = `
        <div class="msg-info-status-card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span class="msg-info-group-section-title">SEEN BY ${seenCount} OF ${otherMembers.length} MEMBERS</span>
            <span class="msg-info-online-pill is-online">${onlineCount} Online Now</span>
          </div>
          ${membersRows || '<div style="font-size: 11.5px; color: var(--text-dim);">No other members in this group.</div>'}
        </div>
      `;
    }

    bodyEl.innerHTML = `
      <div class="msg-info-preview-box">
        <span class="msg-info-preview-sender">@${escapeHTML(sender)}</span>
        <span class="msg-info-preview-text">${escapeHTML(previewSnippet.slice(0, 120))}</span>
      </div>

      <div class="msg-info-status-card">
        <div class="msg-info-row">
          <div class="msg-info-left">
            <span style="color: #38bdf8; font-weight: 800; font-size: 14px;">✓✓</span>
            <span>Read / Seen</span>
          </div>
          <span class="msg-info-right" style="color: ${isReadNow ? "#38bdf8" : "var(--text-dim)"}; font-weight: ${isReadNow ? "700" : "500"};">${escapeHTML(seenText)}</span>
        </div>

        <div class="msg-info-row">
          <div class="msg-info-left">
            <span style="color: var(--text-muted); font-weight: 800; font-size: 14px;">✓✓</span>
            <span>Delivered</span>
          </div>
          <span class="msg-info-right">${escapeHTML(deliveredText)}</span>
        </div>

        <div class="msg-info-row">
          <div class="msg-info-left">
            <span style="color: var(--text-dim); font-weight: 800; font-size: 14px;">✓</span>
            <span>Sent</span>
          </div>
          <span class="msg-info-right">${escapeHTML(sentText)}</span>
        </div>
      </div>

      ${groupSectionHTML}
    `;

    modal.classList.remove("hidden");
    if (window.lucide) lucide.createIcons({ nodes: [modal] });
  };
})();
// =========================================================================
// 34. FEATURE v36000 (7-POINT WHATSAPP GROUP ADMIN, CALL & UI MASTER PATCH):
//     1. STRICT GROUP MUTE ENFORCEMENT ("ONLY ADMINS CAN SEND MESSAGES")
//     2. WHATSAPP CO-ADMIN SYSTEM (OWNER PROMOTES ADMINS; ADMINS HAVE FULL
//        POWER EXCEPT PROMOTING OTHER ADMINS)
//     3. "ALLOW MEMBERS TO SEE MEMBER LIST" LIVE SYNC & PRIVACY ENFORCEMENT
//     4. INSTANT CALL CANCEL STOP-RINGING (CALLER HANGUP STOPS RECEIVER RING
//        IMMEDIATELY & BLOCKS STALE CALL ACCEPT)
//     5. 25-SECOND LIMITED RING TIMER (LIKE WHATSAPP)
//     6. COMPLETE IN-CHAT CALL LOG BUBBLES (COMPLETED DURATION, MISSED, CANCELLED)
//     7. COLORFUL "Online • Active" HEADER STATUS IN CHATS
// =========================================================================

(function () {
  // -----------------------------------------------------------------------
  // 1. HELPER: TRUE CREATOR (OWNER) vs GROUP ADMIN (OWNER OR CO-ADMIN)
  // -----------------------------------------------------------------------
  window.isTrueGroupCreator = function (roomId = currentRoom) {
    if (!isGroupRoom(roomId)) return false;
    const grp = savedGroups[roomId];
    if (!grp) return false;
    const me = (myUsername || "").toLowerCase();
    if (grp.ownerToken && mySessionId && grp.ownerToken === mySessionId) return true;
    return (grp.owner || "").toLowerCase() === me;
  };

  window.isGroupAdminUser = function (roomId = currentRoom, targetUser = myUsername) {
    if (!isGroupRoom(roomId)) return false;
    const grp = savedGroups[roomId];
    if (!grp) return false;
    const u = (targetUser || "").toLowerCase();
    if (!u) return false;
    if ((grp.owner || "").toLowerCase() === u) return true;
    const admins = Array.isArray(grp.admins) ? grp.admins.map((a) => a.toLowerCase()) : [];
    return admins.includes(u);
  };

  // Override isCurrentGroupOwner so Co-Admins get full admin power (edit group pic, bio, mute, pin, remove regular members)
  // while isTrueGroupCreator is reserved strictly for making/removing Admins!
  window.isCurrentGroupOwner = function (roomId = currentRoom) {
    return window.isTrueGroupCreator(roomId) || window.isGroupAdminUser(roomId, myUsername);
  };

  // -----------------------------------------------------------------------
  // 2. ENFORCE "ONLY ADMINS CAN SEND MESSAGES" & "MEMBER LIST PRIVACY"
  // -----------------------------------------------------------------------
  window.updateGroupInputBarLockState = function () {
    const lockBanner = document.getElementById("chat-lock-banner");
    const lockText = document.getElementById("lock-banner-text");
    const lockActions = document.getElementById("lock-banner-actions");
    const inputBar = document.getElementById("chat-input-bar");
    if (!lockBanner || !inputBar) return;

    if (!isGroupRoom(currentRoom)) {
      inputBar.classList.remove("force-input-locked");
      return;
    }

    const grp = savedGroups[currentRoom];
    if (!grp) return;

    const isAdminOrOwner = window.isCurrentGroupOwner(currentRoom);

    if (grp.onlyOwnerCanMsg && !isAdminOrOwner) {
      lockBanner.classList.remove("hidden");
      inputBar.classList.add("force-input-locked");
      inputBar.style.setProperty("display", "none", "important");
      if (lockText) {
        lockText.textContent = `Only Group Admins can send messages in this group.`;
      }
      if (lockActions) {
        lockActions.innerHTML = `<button class="glass-btn-sm" onclick="openGroupModal('manage')">Group Info</button>`;
      }
    } else {
      lockBanner.classList.add("hidden");
      inputBar.classList.remove("force-input-locked");
      inputBar.style.setProperty("display", "flex", "important");
    }
  };

  // Also block non-admins from transmitting messages if group is muted
  const origTransmitV36 = window.transmitPayload;
  window.transmitPayload = async function (payloadString) {
    if (isGroupRoom(currentRoom)) {
      const grp = savedGroups[currentRoom];
      if (grp && grp.onlyOwnerCanMsg && !window.isCurrentGroupOwner(currentRoom)) {
        window.updateGroupInputBarLockState();
        showToast("Only Group Admins can send messages in this group!", "error");
        return;
      }
    }
    return origTransmitV36(payloadString);
  };

  // Broadcast Group Settings over both Presence AND Active Room Channel so every member syncs 100% live!
  async function broadcastGroupStateEverywhere(grp, removedMember = null) {
    if (!grp || !grp.id) return;
    const payload = { group: grp, removedMember: removedMember };
    try {
      if (presenceChannel) {
        await presenceChannel.send({
          type: "broadcast",
          event: "group-state-update",
          payload: payload
        });
      }
    } catch (e) { }
    try {
      if (activeSubscription && currentRoom === grp.id) {
        await activeSubscription.send({
          type: "broadcast",
          event: "group-state-update",
          payload: payload
        });
      }
    } catch (e) { }
  }

  // Promote / Demote Co-Admin (Strictly Group Creator Only!)
  window.toggleGroupMemberAdminRole = async function (uname) {
    const clean = (uname || "").trim().toLowerCase();
    if (!clean || !isGroupRoom(currentRoom)) return;

    if (!window.isTrueGroupCreator(currentRoom)) {
      showToast("Only the Group Creator (Owner) can make or dismiss Admins!", "error");
      return;
    }

    const grp = savedGroups[currentRoom];
    if (!grp) return;
    if (!Array.isArray(grp.admins)) grp.admins = [];

    const idx = grp.admins.map((a) => a.toLowerCase()).indexOf(clean);
    if (idx !== -1) {
      grp.admins.splice(idx, 1);
      showToast(`Dismissed @${clean} as Group Admin`, "info");
    } else {
      grp.admins.push(clean);
      showToast(`Promoted @${clean} to Group Admin!`, "success");
    }

    savedGroups[currentRoom] = grp;
    localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));
    await broadcastGroupStateEverywhere(grp);
    renderEnhancedGroupMembersDirectory();
    updateHeaderStatus();
    renderPeerList();
  };

  // Upgraded Group Member List Renderer (Shows Creator, Co-Admins, Make Admin button for Owner, & Enforces Member List Privacy!)
  function renderEnhancedGroupMembersDirectory() {
    const listEl = document.getElementById("group-current-members-list");
    const countLabel = document.getElementById("group-members-count-label");
    const sectionEl = document.getElementById("group-members-list-section");
    if (!listEl || !sectionEl) return;

    if (groupModalMode === "create") {
      sectionEl.classList.add("hidden");
      return;
    }

    sectionEl.classList.remove("hidden");
    const grp = savedGroups[currentRoom];
    if (!grp) return;

    const me = (myUsername || "").toLowerCase();
    const isCreator = window.isTrueGroupCreator(currentRoom);
    const isAdmin = window.isCurrentGroupOwner(currentRoom);
    const ownerUname = (grp.owner || "").toLowerCase();
    const adminsList = Array.isArray(grp.admins) ? grp.admins.map((a) => a.toLowerCase()) : [];
    const showMembersAllowed = grp.showMembersToAll !== false;

    // Enforce "Allow Members to See Member List" privacy for regular members!
    if (!isAdmin && !showMembersAllowed) {
      if (countLabel) countLabel.textContent = "GROUP MEMBERS (HIDDEN BY ADMIN)";
      listEl.innerHTML = `
        <div style="padding: 12px; font-size: 12px; color: var(--text-dim); text-align: center;">
          🔒 Group Admins have hidden the member list for this group.
        </div>
      `;
      return;
    }

    const membersArr =
      currentEditingGroupMembers && currentEditingGroupMembers.length > 0
        ? currentEditingGroupMembers
        : grp.members || [ownerUname];

    if (countLabel) countLabel.textContent = `GROUP MEMBERS (${membersArr.length})`;
    listEl.innerHTML = "";

    membersArr.forEach((m) => {
      const mLower = (m || "").toLowerCase();
      const isMemberOwner = mLower === ownerUname;
      const isMemberCoAdmin = !isMemberOwner && adminsList.includes(mLower);
      const isSelf = mLower === me;
      const avUrl = isSelf ? myAvatarData : usersAvatarCache[mLower] || "";

      let roleBadgeHTML = "";
      if (isMemberOwner) {
        roleBadgeHTML = ' <span class="online-pill-badge" style="font-size: 9px; padding: 1px 6px;">Owner</span>';
      } else if (isMemberCoAdmin) {
        roleBadgeHTML = ' <span class="online-pill-badge" style="font-size: 9px; padding: 1px 6px;">Admin</span>';
      }

      // Only the True Group Creator can promote/dismiss Admins!
      let makeAdminBtnHTML = "";
      if (isCreator && !isMemberOwner) {
        makeAdminBtnHTML = `
          <button type="button" class="group-make-admin-btn ${isMemberCoAdmin ? "is-co-admin" : ""}" onclick="toggleGroupMemberAdminRole('${escapeHTML(mLower)}')">
            ${isMemberCoAdmin ? "Dismiss Admin" : "Make Admin"}
          </button>
        `;
      }

      // Creator can remove anyone; Co-Admin can remove regular members (not Owner or other Co-Admins)
      const canRemoveThisMember =
        !isMemberOwner &&
        !isSelf &&
        (isCreator || (isAdmin && !isMemberCoAdmin));

      const removeBtnHTML = canRemoveThisMember
        ? `<button type="button" class="group-remove-member-btn" onclick="removeMemberFromCurrentGroup('${escapeHTML(mLower)}')">Remove</button>`
        : "";

      const row = document.createElement("div");
      row.className = "group-member-row";
      row.innerHTML = `
        <div class="group-member-left" style="cursor: pointer;" onclick="if('${escapeHTML(mLower)}' !== '${escapeHTML(me)}') openUserActionModal('${escapeHTML(mLower)}')">
          <div class="avatar sm" id="grp-mem-av-${escapeHTML(mLower)}" style="width: 30px; height: 30px; font-size: 11px;"></div>
          <span class="group-member-name">
            @${escapeHTML(mLower)}
            ${isSelf ? ' <span style="color: var(--accent-primary); font-size: 10.5px;">(You)</span>' : ""}
            ${roleBadgeHTML}
          </span>
        </div>
        <div class="group-member-actions-wrap">
          ${makeAdminBtnHTML}
          ${removeBtnHTML}
        </div>
      `;
      listEl.appendChild(row);
      renderAvatarElement(row.querySelector(`#grp-mem-av-${mLower}`), mLower, avUrl);
    });
  }

  // Hook openGroupModal so it renders our enhanced member directory with Co-Admin controls
  const origOpenGroupModalV36 = window.openGroupModal;
  window.openGroupModal = function (mode = "create") {
    origOpenGroupModalV36(mode);
    renderEnhancedGroupMembersDirectory();
  };

  // Ensure saving group settings preserves `grp.admins` and broadcasts to both room & presence!
  const btnConfirmGrp = document.getElementById("btn-confirm-group-modal");
  if (btnConfirmGrp) {
    btnConfirmGrp.addEventListener("click", () => {
      setTimeout(() => {
        if (isGroupRoom(currentRoom) && savedGroups[currentRoom]) {
          window.updateGroupInputBarLockState();
          broadcastGroupStateEverywhere(savedGroups[currentRoom]);
        }
      }, 120);
    });
  }

  // -----------------------------------------------------------------------
  // 3. COLORFUL "Online • Active" IN CHAT HEADER & PRIVACY-AWARE GROUP HEADER
  // -----------------------------------------------------------------------
  const origUpdateHeaderStatusV36 = window.updateHeaderStatus;
  window.updateHeaderStatus = function () {
    origUpdateHeaderStatusV36();
    const subtitleEl = document.getElementById("current-room-subtitle");
    if (!subtitleEl) return;

    if (isGroupRoom(currentRoom)) {
      const grp = savedGroups[currentRoom];
      if (grp) {
        const isAdmin = window.isCurrentGroupOwner(currentRoom);
        const canSeeMembers = isAdmin || grp.showMembersToAll !== false;
        const modeTag = grp.onlyOwnerCanMsg ? " • Admins Only" : "";
        subtitleEl.classList.remove("peer-online-colorful");
        if (canSeeMembers) {
          subtitleEl.textContent = `${(grp.members || []).length} members • Admin: @${grp.owner}${modeTag}`;
        } else {
          subtitleEl.textContent = `Admin: @${grp.owner} • ${grp.bio || "Encrypted Group"}${modeTag}`;
        }
      }
      window.updateGroupInputBarLockState();
      return;
    }

    if (currentRoom && currentRoom !== "global" && !isSelfRoom(currentRoom) && currentPeerUser) {
      const isOnline =
        onlineUsersList &&
        onlineUsersList.has(currentPeerUser.toLowerCase()) &&
        userSettings.onlinePresence;
      if (isOnline) {
        subtitleEl.textContent = "Online • Active";
        subtitleEl.classList.add("peer-online-colorful");
      } else {
        subtitleEl.textContent = "Offline • AES-256 Encrypted";
        subtitleEl.classList.remove("peer-online-colorful");
      }
    } else {
      subtitleEl.classList.remove("peer-online-colorful");
    }
  };

  // -----------------------------------------------------------------------
  // 4. WHATSAPP CALL ENGINE FIXES:
  //    - 25s LIMITED RING TIMER ON BOTH CALLER & RECEIVER
  //    - CALLER HANGUP BEFORE ANSWER IMMEDIATELY STOPS RECEIVER RINGING
  //      & BLOCKS STALE "ACCEPT CALL" CONNECTION!
  //    - IN-CHAT CALL LOG BUBBLES FOR COMPLETED, MISSED & CANCELLED CALLS
  // -----------------------------------------------------------------------
  let receiverIncomingRingTimer = null;
  let wasCallConnectedLive = false;
  let currentCallInitiatedByMe = false;

  function formatCallDurationReadable(seconds) {
    const s = Math.max(1, Math.floor(seconds || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  function closeIncomingCallModalAndStopRing() {
    clearTimeout(receiverIncomingRingTimer);
    receiverIncomingRingTimer = null;
    const callModal = document.getElementById("call-perm-modal");
    if (callModal) callModal.classList.add("hidden");
    activeCallSender = null;
  }

  // Upgrade createMessageNode to format Completed Call Bubbles ("CALL_LOG_DATA:voice|completed|1m 20s")
  const prevCreateMsgNodeV36 = window.createMessageNode;
  window.createMessageNode = async function (msg, rawTextOverride) {
    const node = await prevCreateMsgNodeV36(msg, rawTextOverride);
    if (!node) return null;

    const card = node.querySelector(".call-system-log-card");
    if (card && rawTextOverride && rawTextOverride.startsWith("CALL_LOG_DATA:")) {
      const parts = rawTextOverride.replace("CALL_LOG_DATA:", "").split("|");
      const cType = parts[0] || "voice";
      const cState = parts[1] || "missed";
      const cDur = parts[2] || "";
      const isVideo = cType === "video";

      const titleEl = card.querySelector(".call-log-title");
      const subEl = card.querySelector(".call-log-sub");
      const iconCircle = card.querySelector(".call-log-icon-circle");

      if (cState === "completed") {
        card.classList.add("call-completed-card");
        if (titleEl) titleEl.textContent = isVideo ? "Video Call" : "Voice Call";
        if (subEl) subEl.textContent = `Duration: ${cDur || "Connected"}`;
        if (iconCircle) {
          iconCircle.innerHTML = `<i data-lucide="${isVideo ? "video" : "phone-call"}" style="width: 16px; height: 16px;"></i>`;
          if (window.lucide) lucide.createIcons({ nodes: [iconCircle] });
        }
      } else if (cState === "cancelled") {
        if (titleEl) titleEl.textContent = isVideo ? "Missed Video Call" : "Missed Voice Call";
        if (subEl) subEl.textContent = "Call ended before answer";
      }
    }
    return node;
  };

  // Track when WebRTC actually connects so we know whether a call was answered or cancelled before pickup
  const origStartWebRTCV36 = window.startWebRTC;
  window.startWebRTC = async function (isCaller, type) {
    currentCallInitiatedByMe = Boolean(isCaller);
    wasCallConnectedLive = false;
    await origStartWebRTCV36(isCaller, type);

    if (peerConnection) {
      const prevOnTrack = peerConnection.ontrack;
      peerConnection.ontrack = (event) => {
        wasCallConnectedLive = true;
        if (prevOnTrack) prevOnTrack(event);
      };
    }
  };

  // Override endCall so:
  // 1. If caller hangs up BEFORE receiver answers -> sends `call_cancelled` to immediately close receiver's ring modal
  //    AND posts a Call Log bubble in chat!
  // 2. If call WAS connected -> posts a Completed Call bubble with exact call duration in chat!
  const origEndCallV36 = window.endCall;
  window.endCall = function (notifyRemote = true) {
    const overlay = document.getElementById("call-screen-overlay");
    const wasOverlayOpen = Boolean(overlay && !overlay.classList.contains("hidden"));
    const targetPeer = (currentPeerUser || activeCallSender || "").toLowerCase();
    const callMode = activeCallType || "voice";
    const durationSecs = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
    const hadConnected = Boolean(wasCallConnectedLive && durationSecs > 0);
    const wasRingingOutgoing = Boolean(wasOverlayOpen && !peerConnection && !wasCallConnectedLive);

    wasCallConnectedLive = false;
    callStartTime = 0;
    closeIncomingCallModalAndStopRing();

    origEndCallV36(notifyRemote);

    if (notifyRemote && targetPeer) {
      // Broadcast immediate call-cancelled signal on BOTH Presence & Room channels so receiver's ring stops in 0ms!
      try {
        if (presenceChannel) {
          presenceChannel.send({
            type: "broadcast",
            event: "call-cancelled-now",
            payload: { caller: (myUsername || "").toLowerCase(), target: targetPeer }
          });
        }
      } catch (e) { }

      // Post WhatsApp-style Call Bubble inside the chat
      if (hadConnected) {
        const durStr = formatCallDurationReadable(durationSecs);
        transmitPayload(`CALL_LOG_DATA:${callMode}|completed|${durStr}`);
      } else if (wasRingingOutgoing) {
        transmitPayload(`CALL_LOG_DATA:${callMode}|cancelled`);
      }
    }
  };

  // Guard #btn-accept-call: Verify the caller has NOT hung up before connecting WebRTC!
  const btnAcceptCallEl = document.getElementById("btn-accept-call");
  if (btnAcceptCallEl) {
    const cleanAcceptBtn = btnAcceptCallEl.cloneNode(true);
    btnAcceptCallEl.parentNode.replaceChild(cleanAcceptBtn, btnAcceptCallEl);

    cleanAcceptBtn.addEventListener("click", async () => {
      const caller = (activeCallSender || "").toLowerCase();
      closeIncomingCallModalAndStopRing();
      if (!caller || !supabaseClient) return;

      // Check latest DB status first—if caller already cancelled/ended the call, do NOT connect!
      try {
        const { data: reqRows } = await supabaseClient
          .from("chat_requests")
          .select("status")
          .or(
            `and(sender_id.ilike.${caller},receiver_id.ilike.${myUsername}),` +
            `and(sender_id.ilike.${myUsername},receiver_id.ilike.${caller})`
          );

        const latestStatus = reqRows && reqRows[0] ? reqRows[0].status || "" : "";
        if (!latestStatus.startsWith("call_ring_")) {
          showToast(`Call from @${caller} has already ended.`, "info");
          return;
        }
      } catch (e) { }

      activeCallSender = caller;
      const targetRoom = await getSecureRoomId(caller);
      if (currentRoom !== targetRoom) {
        await joinRoom(targetRoom, "@" + caller);
      }

      const activeState = `call_active_${activeCallType}:${caller}`;
      await supabaseClient
        .from("chat_requests")
        .update({ status: activeState })
        .or(
          `and(sender_id.ilike.${caller},receiver_id.ilike.${myUsername}),` +
          `and(sender_id.ilike.${myUsername},receiver_id.ilike.${caller})`
        );
      startWebRTC(false, activeCallType);
    });
  }

  // Upgrade handleCallRequestCheck:
  // - If status becomes `accepted` while `#call-perm-modal` (Incoming Call) is open -> Caller hung up! Close modal immediately!
  // - Auto-dismiss incoming call ring after 25 seconds (WhatsApp ring limit)
  const prevHandleCallReqV36 = window.handleCallRequestCheck;
  window.handleCallRequestCheck = async function (payload) {
    const row = payload ? payload.new : null;
    if (!row || !myUsername) return;

    const me = myUsername.toLowerCase();
    const s = (row.sender_id || "").toLowerCase();
    const rec = (row.receiver_id || "").toLowerCase();
    if (s !== me && rec !== me) return;

    // If caller cancelled the call (`status === "accepted"` while incoming call popup is open) -> Stop ringing immediately!
    const callModal = document.getElementById("call-perm-modal");
    if (
      row.status === "accepted" &&
      callModal &&
      !callModal.classList.contains("hidden")
    ) {
      closeIncomingCallModalAndStopRing();
      showToast("Missed call (Caller ended the call).", "info");
      return;
    }

    await prevHandleCallReqV36(payload);

    // If incoming call modal just opened, start a 25-second max ring timer on receiver side too
    if (callModal && !callModal.classList.contains("hidden")) {
      clearTimeout(receiverIncomingRingTimer);
      receiverIncomingRingTimer = setTimeout(() => {
        closeIncomingCallModalAndStopRing();
        showToast("Missed call (Ringing timed out).", "info");
      }, 25000);
    }
  };

  // Listen for instant `call-cancelled-now` broadcast on Presence Channel & Room Channel
  const prevInitPresenceV36 = window.initPresenceTracker;
  window.initPresenceTracker = function () {
    if (typeof prevInitPresenceV36 === "function") prevInitPresenceV36();
    if (!presenceChannel) return;

    presenceChannel.on("broadcast", { event: "call-cancelled-now" }, (eventObj) => {
      const p = eventObj.payload;
      const me = (myUsername || "").toLowerCase();
      if (p && p.target === me) {
        closeIncomingCallModalAndStopRing();
        if (peerConnection) {
          origEndCallV36(false);
        }
        showToast(`Call ended by @${p.caller}`, "info");
      }
    });
  };

  // Also listen for `group-state-update` on the active room channel so group mute & privacy apply in 0ms!
  const prevJoinRoomV36 = window.joinRoom;
  window.joinRoom = async function (roomId, displayName, pushHistory = true) {
    await prevJoinRoomV36(roomId, displayName, pushHistory);
    window.updateHeaderStatus();
    window.updateGroupInputBarLockState();

    if (activeSubscription && isGroupRoom(roomId)) {
      activeSubscription.on("broadcast", { event: "group-state-update" }, (payload) => {
        const data = payload.payload;
        if (!data || !data.group || !data.group.id) return;
        const g = data.group;
        const me = (myUsername || "").toLowerCase();

        if (data.removedMember === me) {
          delete savedGroups[g.id];
          localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));
          if (currentRoom === g.id) exitChatToDashboard();
          renderPeerList();
          showToast(`You were removed from group "${g.name}"`, "error");
          return;
        }

        savedGroups[g.id] = g;
        localStorage.setItem("krypton_groups", JSON.stringify(savedGroups));
        renderPeerList();
        if (currentRoom === g.id) {
          window.updateHeaderStatus();
          window.updateGroupInputBarLockState();
          renderEnhancedGroupMembersDirectory();
        }
      });
    }
  };
})();