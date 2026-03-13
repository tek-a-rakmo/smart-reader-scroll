// Set default speed on first install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("speed", (result) => {
    if (result.speed === undefined) {
      chrome.storage.local.set({ speed: 2 });
    }
  });
});

// Relay keyboard shortcut commands (registered in manifest.json) to the active tab
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;

    const messageMap = {
      "start-scroll": { type: "START_SCROLL" },
      "stop-scroll": { type: "STOP_SCROLL" },
      "speed-up": { type: "SET_SPEED", delta: 1 },
      "speed-down": { type: "SET_SPEED", delta: -1 },
    };

    const msg = messageMap[command];
    if (!msg) return;

    if (msg.delta !== undefined) {
      // For speed-up/down we need the current speed first, then adjust it
      chrome.tabs.sendMessage(tabs[0].id, { type: "GET_STATE" }, (response) => {
        if (chrome.runtime.lastError || !response) return;
        const newSpeed = Math.max(0.2, Math.min(response.speed + msg.delta, 50));
        chrome.tabs.sendMessage(tabs[0].id, {
          type: "SET_SPEED",
          speed: newSpeed,
        });
      });
    } else {
      chrome.tabs.sendMessage(tabs[0].id, msg);
    }
  });
});
