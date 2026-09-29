/* In-browser receptionist call. No analytics. The voice SDK loads only after a click. */
import { ASSISTANT_ID, VAPI_PUBLIC_KEY } from "../assets/vapi-config.js";

var PLACEHOLDER = "VAPI_PUBLIC_KEY_PLACEHOLDER";
var PHONE_DISPLAY = "(781) 705-7179";
var MIC_MSG = "We need the microphone to talk in the browser. Allow microphone access, or call " + PHONE_DISPLAY + ".";
var NET_MSG = "We couldn't connect. Check your internet and try again, or call " + PHONE_DISPLAY + ".";
var GENERIC_MSG = "We couldn't start the call. Please try again, or call " + PHONE_DISPLAY + ".";

var hooks = (window.ReceptwiseBrowserCall = window.ReceptwiseBrowserCall || {});

var panel = document.getElementById("browser-call-panel");
var statusEl = document.getElementById("browser-call-status");
var muteBtn = document.getElementById("browser-call-mute");
var endBtn = document.getElementById("browser-call-end");
var fallbackEl = document.getElementById("browser-call-fallback");
var levelBars = panel ? panel.querySelectorAll(".call-level span") : [];

var phase = "idle";
var speaking = false;
var muted = false;
var client = null;
var trigger = null;
var failureShown = false;
var lastError = null;
var VapiClass = null;

function keyReady(key) {
  if (typeof key !== "string") return false;
  var trimmed = key.trim();
  if (!trimmed || trimmed === PLACEHOLDER || trimmed.indexOf("PLACEHOLDER") !== -1) return false;
  return true;
}

function revealControls() {
  document.querySelectorAll("[data-browser-call]").forEach(function (el) {
    el.hidden = false;
  });
  document.body.classList.add("has-browser-call");
}

function paintLevel(volume) {
  var level = Number(volume);
  if (!isFinite(level) || level < 0) level = 0;
  if (level > 1) level = 1;
  var weights = [0.55, 1, 0.72, 0.4];
  for (var i = 0; i < levelBars.length; i++) {
    var scale = 0.18 + level * weights[i] * 0.82;
    if (scale > 1) scale = 1;
    levelBars[i].style.transform = "scaleY(" + scale.toFixed(3) + ")";
  }
}

function setButtonsBusy(busy) {
  document.querySelectorAll("button.browser-call-btn").forEach(function (btn) {
    btn.disabled = busy;
    if (busy) btn.setAttribute("aria-busy", "true");
    else btn.removeAttribute("aria-busy");
  });
}

function resetControls() {
  if (!panel) return;
  panel.classList.remove("is-speaking", "is-error");
  speaking = false;
  muted = false;
  muteBtn.hidden = false;
  muteBtn.disabled = true;
  muteBtn.setAttribute("aria-pressed", "false");
  muteBtn.textContent = "Mute";
  muteBtn.setAttribute("aria-label", "Mute microphone");
  endBtn.textContent = "End call";
  fallbackEl.hidden = true;
  paintLevel(0);
}

function showPanel() {
  panel.hidden = false;
  document.body.classList.add("browser-call-open");
}

function stopQuiet(instance) {
  if (!instance || typeof instance.stop !== "function") return;
  try {
    var pending = instance.stop();
    if (pending && typeof pending.catch === "function") pending.catch(function () {});
  } catch (err) {
    /* already torn down */
  }
}

function closePanel() {
  phase = "idle";
  speaking = false;
  if (panel) {
    panel.hidden = true;
    panel.classList.remove("is-speaking", "is-error");
  }
  document.body.classList.remove("browser-call-open");
  setButtonsBusy(false);
  paintLevel(0);
  var current = client;
  client = null;
  stopQuiet(current);
  if (trigger && document.contains(trigger)) trigger.focus();
}

function errorBlob(err) {
  var parts = [];
  function absorb(value, depth) {
    if (value == null || depth > 4) return;
    if (typeof value === "string" || typeof value === "number") {
      parts.push(String(value));
      return;
    }
    if (typeof value !== "object") return;
    ["name", "message", "type", "stage", "reason", "errorMsg", "code"].forEach(function (key) {
      if (value[key] != null && typeof value[key] !== "object") parts.push(String(value[key]));
    });
    if (value.error && value.error !== value) absorb(value.error, depth + 1);
    if (value.cause && value.cause !== value) absorb(value.cause, depth + 1);
  }
  absorb(err, 0);
  return parts.join(" ").toLowerCase();
}

function messageFor(err) {
  var blob = errorBlob(err);
  if (/notallowed|permission denied|permissiondenied|not allowed|securityerror|notfounderror|devicesnotfound|overconstrained|no microphone|microphone not/.test(blob)) {
    return MIC_MSG;
  }
  if ((typeof navigator !== "undefined" && navigator.onLine === false) || /failed to fetch|networkerror|network error|timeout|timed out|websocket|offline|load failed|net::|enotfound|failed to load|import/.test(blob)) {
    return NET_MSG;
  }
  return GENERIC_MSG;
}

function isIgnorable(err) {
  var blob = errorBlob(err);
  return /audio-processing|audio-observer|audio-processor|noise-cancellation|krisp/.test(blob);
}

function fail(err) {
  if (failureShown || !panel) return;
  failureShown = true;
  phase = "error";
  speaking = false;
  panel.classList.remove("is-speaking");
  panel.classList.add("is-error");
  paintLevel(0);
  statusEl.textContent = messageFor(err);
  fallbackEl.hidden = false;
  muteBtn.hidden = true;
  endBtn.disabled = false;
  endBtn.textContent = "Close";
  showPanel();
  setButtonsBusy(false);
  endBtn.focus();
  var current = client;
  client = null;
  stopQuiet(current);
}

function onCallStart() {
  if (phase !== "connecting" && phase !== "live") return;
  phase = "live";
  muteBtn.disabled = false;
  if (!speaking) statusEl.textContent = "Listening";
}

function onSpeechStart() {
  if (phase === "error" || phase === "idle") return;
  speaking = true;
  if (phase === "connecting") phase = "live";
  muteBtn.disabled = false;
  panel.classList.add("is-speaking");
  statusEl.textContent = "Nora is speaking";
}

function onSpeechEnd() {
  speaking = false;
  if (panel) panel.classList.remove("is-speaking");
  paintLevel(0);
  if (phase === "live") statusEl.textContent = "Listening";
}

function bind(instance) {
  instance.on("call-start", onCallStart);
  instance.on("call-end", function () {
    if (phase === "error" || phase === "idle") return;
    closePanel();
  });
  instance.on("speech-start", onSpeechStart);
  instance.on("speech-end", onSpeechEnd);
  instance.on("volume-level", function (volume) {
    if (phase !== "connecting" && phase !== "live") return;
    paintLevel(volume);
  });
  instance.on("error", function (err) {
    lastError = err;
    if (isIgnorable(err)) return;
    if (phase === "connecting" || phase === "live") fail(err);
  });
  instance.on("camera-error", function (err) {
    lastError = err;
    if (phase === "connecting" || phase === "live") fail(err || { name: "NotAllowedError" });
  });
}

async function requestMic() {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
    var missing = new Error("Microphone is not available in this browser.");
    missing.name = "NotFoundError";
    throw missing;
  }
  var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (stream && typeof stream.getTracks === "function") {
    stream.getTracks().forEach(function (track) {
      track.stop();
    });
  }
}

async function createClient(publicKey) {
  if (typeof hooks.createClient === "function") return hooks.createClient(publicKey);
  if (!VapiClass) {
    var mod;
    try {
      mod = await import("../assets/vendor/vapi-web.js");
    } catch (err) {
      var loadErr = new Error("Failed to fetch voice calling");
      loadErr.name = "NetworkError";
      loadErr.cause = err;
      throw loadErr;
    }
    VapiClass = mod.default;
    if (VapiClass && typeof VapiClass !== "function" && typeof VapiClass.default === "function") {
      VapiClass = VapiClass.default;
    }
  }
  if (typeof VapiClass !== "function") {
    throw new Error("Failed to load voice calling");
  }
  return new VapiClass(publicKey);
}

async function begin(triggerBtn) {
  if (!panel || !keyReady(VAPI_PUBLIC_KEY)) return;
  if (phase === "connecting" || phase === "live") {
    showPanel();
    endBtn.focus();
    return;
  }

  phase = "connecting";
  failureShown = false;
  lastError = null;
  trigger = triggerBtn || null;
  resetControls();
  showPanel();
  setButtonsBusy(true);
  statusEl.textContent = "Connecting";

  var active = null;
  try {
    await requestMic();
    if (phase !== "connecting") return;
    active = await createClient(VAPI_PUBLIC_KEY);
    if (phase !== "connecting") {
      stopQuiet(active);
      return;
    }
    client = active;
    bind(active);
    var result = await active.start(ASSISTANT_ID);
    if (phase !== "connecting" && phase !== "live") {
      stopQuiet(active);
      if (client === active) client = null;
      return;
    }
    if (phase === "error") return;
    if (result == null && phase !== "live") fail(lastError || new Error("Failed to fetch"));
  } catch (err) {
    if (phase === "connecting" || phase === "live") fail(err);
    else stopQuiet(active);
  }
}

if (panel && statusEl && muteBtn && endBtn && fallbackEl && keyReady(VAPI_PUBLIC_KEY)) {
  revealControls();

  document.addEventListener("click", function (event) {
    var btn = event.target.closest("button.browser-call-btn");
    if (!btn || btn.disabled) return;
    event.preventDefault();
    begin(btn);
  });

  muteBtn.addEventListener("click", function () {
    if (!client || muteBtn.disabled) return;
    var next = !muted;
    try {
      client.setMuted(next);
      if (typeof client.isMuted === "function") next = !!client.isMuted();
    } catch (err) {
      return;
    }
    muted = next;
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    muteBtn.textContent = muted ? "Unmute" : "Mute";
    muteBtn.setAttribute("aria-label", muted ? "Unmute microphone" : "Mute microphone");
  });

  endBtn.addEventListener("click", closePanel);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (phase !== "connecting" && phase !== "live" && phase !== "error") return;
    var modal = document.getElementById("contact-modal");
    if (modal && modal.open) return;
    event.preventDefault();
    closePanel();
  });
}
