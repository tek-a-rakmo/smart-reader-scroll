(() => {
  "use strict";

  let scrolling = false;
  let speed = 2;
  let wasScrolling = false; // tracks state before visibility-hidden for auto-resume
  let rafId = null;

  // --- Scroll Engine ---
  // Uses requestAnimationFrame so scrolling is synced to the display refresh rate
  // (typically 60fps). Each frame advances the page by `speed` pixels.
  function scrollLoop() {
    if (!scrolling) return;
    window.scrollBy(0, speed);
    rafId = requestAnimationFrame(scrollLoop);
  }

  function startScrolling() {
    if (scrolling) return;
    scrolling = true;
    rafId = requestAnimationFrame(scrollLoop);
  }

  function stopScrolling() {
    scrolling = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function setSpeed(newSpeed) {
    // Allow very slow speeds for comfortable webnovel reading
    speed = Math.max(0.2, Math.min(newSpeed, 100));
    chrome.storage.local.set({ speed });
  }

  // --- Restore saved speed on load ---
  chrome.storage.local.get("speed", (result) => {
    if (result.speed !== undefined) {
      speed = result.speed;
    }
  });

  // --- Message Listener (from popup & background) ---
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case "START_SCROLL":
        startScrolling();
        sendResponse({ scrolling: true, speed });
        break;

      case "STOP_SCROLL":
        stopScrolling();
        wasScrolling = false; // explicit pause clears the auto-resume flag
        sendResponse({ scrolling: false, speed });
        break;

      case "SET_SPEED":
        setSpeed(message.speed);
        sendResponse({ scrolling, speed });
        break;

      case "GET_STATE":
        sendResponse({ scrolling, speed });
        break;

      default:
        sendResponse({ error: "Unknown message type" });
    }
    return true; // keep the message channel open for async sendResponse
  });

  // --- Reading Flow Mode (Page Visibility API) ---
  // Automatically pause when the tab becomes hidden and resume when it
  // becomes visible again, but only if scrolling was active before hiding.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (scrolling) {
        wasScrolling = true;
        stopScrolling();
      }
    } else if (document.visibilityState === "visible") {
      if (wasScrolling) {
        wasScrolling = false;
        startScrolling();
      }
    }
  });

  // --- Keyboard Shortcuts (bare keys, active on page) ---
  // Only fire when the user is not typing in an input/textarea/contenteditable.
  document.addEventListener("keydown", (e) => {
    const tag = e.target.tagName.toLowerCase();
    const isEditable =
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      e.target.isContentEditable;
    if (isEditable) return;

    switch (e.key.toLowerCase()) {
      case "s":
        e.preventDefault();
        startScrolling();
        break;
      case "p":
        e.preventDefault();
        stopScrolling();
        wasScrolling = false;
        break;
      case "arrowup":
        e.preventDefault();
        setSpeed(speed + 1);
        break;
      case "arrowdown":
        e.preventDefault();
        setSpeed(speed - 1);
        break;
    }
  });
})();
