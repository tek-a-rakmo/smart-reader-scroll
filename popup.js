(() => {
  "use strict";

  const PRESET_SPEEDS = { 1: "slow", 2: "normal", 5: "fast" };

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const speedSlider = document.getElementById("speedSlider");
  const speedInput = document.getElementById("speedInput");
  const speedDisplay = document.getElementById("speedDisplay");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const presetCustom = document.getElementById("presetCustom");
  const presetButtons = document.querySelectorAll(".preset");

  // --- Helpers ---

  function sendToActiveTab(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(tabs[0].id, message, callback || (() => {}));
    });
  }

  function updateUI(speed, scrolling) {
    speedSlider.value = Math.min(speed, 50);
    speedInput.value = speed;
    speedDisplay.textContent = speed;

    if (scrolling) {
      statusDot.classList.add("active");
      statusText.textContent = "Scrolling";
    } else {
      statusDot.classList.remove("active");
      statusText.textContent = "Paused";
    }

    highlightPreset(speed);
  }

  function highlightPreset(speed) {
    presetButtons.forEach((btn) => btn.classList.remove("active"));

    const matchingPreset = document.querySelector(
      `.preset[data-speed="${speed}"]`
    );
    if (matchingPreset && matchingPreset.dataset.speed !== "custom") {
      matchingPreset.classList.add("active");
    } else {
      presetCustom.classList.add("active");
    }
  }

  function setSpeed(newSpeed) {
    const clamped = Math.max(1, Math.min(Math.round(newSpeed), 50));
    updateUI(clamped, statusDot.classList.contains("active"));
    chrome.storage.local.set({ speed: clamped });
    sendToActiveTab({ type: "SET_SPEED", speed: clamped });
  }

  // --- Initialize: restore speed from storage & query content script state ---
  chrome.storage.local.get("speed", (result) => {
    const savedSpeed = result.speed || 2;
    updateUI(savedSpeed, false);

    sendToActiveTab({ type: "GET_STATE" }, (response) => {
      if (chrome.runtime.lastError || !response) return;
      updateUI(response.speed, response.scrolling);
    });
  });

  // --- Start / Pause ---
  startBtn.addEventListener("click", () => {
    sendToActiveTab({ type: "START_SCROLL" }, (response) => {
      if (response) updateUI(response.speed, response.scrolling);
    });
  });

  pauseBtn.addEventListener("click", () => {
    sendToActiveTab({ type: "STOP_SCROLL" }, (response) => {
      if (response) updateUI(response.speed, response.scrolling);
    });
  });

  // --- Slider ---
  speedSlider.addEventListener("input", () => {
    setSpeed(Number(speedSlider.value));
  });

  // --- Numeric Input ---
  speedInput.addEventListener("change", () => {
    setSpeed(Number(speedInput.value));
  });

  speedInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      setSpeed(Number(speedInput.value));
    }
  });

  // --- Presets ---
  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.speed;

      if (value === "custom") {
        speedInput.focus();
        speedInput.select();
        highlightPreset(-1); // force custom highlight
        return;
      }

      setSpeed(Number(value));
    });
  });
})();
