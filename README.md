# Smart Reader Scroll

A Chrome Extension (Manifest V3) for smooth automatic scrolling while reading long-form content such as manga, manhwa, and webnovels.

---
## Motivation

I built this extension because I spend a lot of time reading manga, manhwa, and webnovels online. During long reading sessions, constantly scrolling the page breaks the reading flow and becomes distracting. I wanted a simple tool that would let the page scroll automatically at a comfortable pace so I could focus entirely on the story. This project started as a small personal solution to improve my own reading experience, but I decided to make it open source so others who enjoy long-form online reading can use it, modify it, and improve it as well.

## Features

- **Smooth auto-scrolling** powered by `requestAnimationFrame` for buttery 60fps performance
- **Adjustable speed** via slider (~0.2–50 px/frame), numeric input, or preset buttons (multiple slow levels / Normal / Fast / Custom)
- **Reading Flow Mode** -- automatically pauses scrolling when you switch tabs and resumes when you come back
- **Keyboard shortcuts** -- bare keys on the page (S, P, Arrow Up/Down) and global Chrome shortcuts (Ctrl+Shift+S/P/Up/Down)
- **Persistent preferences** -- your last speed setting is saved and restored automatically

---

## Project Structure

```
smart-reader-scroll/
  manifest.json     Manifest V3 configuration
  background.js     Service worker (defaults & shortcut relay)
  content.js        Scrolling engine injected into every page
  popup.html        Extension popup UI
  popup.js          Popup control logic
  popup.css         Dark-themed popup styling
  README.md         This file
```

---

## How It Works

### Scroll Engine (`content.js`)

The core scrolling loop uses `requestAnimationFrame` to advance the page by a configurable number of pixels each frame:

```js
function scrollLoop() {
  if (!scrolling) return;
  window.scrollBy(0, speed);
  requestAnimationFrame(scrollLoop);
}
```

- `speed` controls how many pixels to scroll per frame. At 60fps, a speed of 2 means ~120 pixels/second.
- Changing speed takes effect on the very next frame with no restart required.
- `startScrolling()` flips the `scrolling` flag and kicks off the rAF loop.
- `stopScrolling()` flips the flag and cancels the pending animation frame.

### Reading Flow Mode (`content.js`)

Uses the Page Visibility API to detect when the user switches away from the tab:

```js
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && scrolling) {
    wasScrolling = true;
    stopScrolling();
  } else if (document.visibilityState === "visible" && wasScrolling) {
    wasScrolling = false;
    startScrolling();
  }
});
```

- When the tab becomes **hidden**, scrolling pauses and `wasScrolling` is set to `true`.
- When the tab becomes **visible** again, scrolling resumes only if it was active before the tab was hidden.
- An explicit pause from the user clears `wasScrolling`, so the extension won't auto-resume after a manual pause.

### Messaging (`popup.js` <-> `content.js`)

The popup communicates with the content script via `chrome.tabs.sendMessage`:

| Message Type    | Direction         | Purpose                         |
|-----------------|-------------------|---------------------------------|
| `START_SCROLL`  | popup -> content  | Begin scrolling                 |
| `STOP_SCROLL`   | popup -> content  | Pause scrolling                 |
| `SET_SPEED`     | popup -> content  | Update scroll speed             |
| `GET_STATE`     | popup -> content  | Query current scrolling/speed   |

Every response includes `{ scrolling, speed }` so the popup can update its UI.

### Background Service Worker (`background.js`)

- Sets the default speed (2) on first install via `chrome.runtime.onInstalled`.
- Relays keyboard shortcut commands registered in `manifest.json` to the active tab's content script.
- For speed-up/speed-down shortcuts, it first queries the current speed, adjusts it, then sends the new value.

### Popup UI (`popup.html` / `popup.css` / `popup.js`)

- Dark-themed, 320px wide popup designed for quick adjustments during reading sessions.
- Start/Pause buttons with inline SVG icons.
- Range slider and numeric input are kept in sync -- changing one updates the other.
- Multiple slow presets for webnovels: Ultra Slow (0.2), Very Slow (0.4), Slow (0.6), Medium Slow (1), Normal (2), Fast (5), plus Custom.
- Status indicator (green dot = scrolling, gray = paused).
- Speed is persisted to `chrome.storage.local` and restored when the popup opens.

### Keyboard Shortcuts

**On the page** (bare keys, only when not focused on an input):

| Key        | Action              |
|------------|---------------------|
| `S`        | Start scrolling     |
| `P`        | Pause scrolling     |
| `Arrow Up` | Increase speed by 1 |
| `Arrow Down` | Decrease speed by 1 |

**Global Chrome shortcuts** (work even when focused on inputs):

| Shortcut            | Action              |
|---------------------|---------------------|
| `Ctrl+Shift+S`      | Start scrolling     |
| `Ctrl+Shift+P`      | Pause scrolling     |
| `Ctrl+Shift+Up`     | Increase speed      |
| `Ctrl+Shift+Down`   | Decrease speed      |

You can customize these in Chrome at `chrome://extensions/shortcuts`.

---

## Installation (Developer / Unpacked)

1. **Clone or download** this repository to a folder on your computer.

2. Open **Google Chrome** and navigate to:
   ```
   chrome://extensions
   ```

3. Enable **Developer mode** using the toggle in the top-right corner.

4. Click **"Load unpacked"**.

5. Select the folder containing these files (`manifest.json`, `content.js`, etc.).

6. The extension will appear in your toolbar. Click the puzzle-piece icon and **pin** "Smart Reader Scroll" for quick access.

7. Navigate to any webpage, click the extension icon, and start scrolling.

---

## Usage

1. Open any long-form content page (manga reader, webnovel site, etc.).
2. Click the **Smart Reader Scroll** extension icon in the toolbar.
3. Press **Start** to begin auto-scrolling.
4. Adjust speed using the slider, numeric input, or preset buttons.
5. Press **Pause** to stop, or just switch tabs -- scrolling pauses automatically and resumes when you return.

---

## Permissions

| Permission   | Why                                                        |
|--------------|------------------------------------------------------------|
| `activeTab`  | Send messages to the content script on the current tab     |
| `storage`    | Save and restore the user's speed preference               |

The extension does **not** collect any data or make any network requests. All data stays local.

---

## Compatibility

- Chrome 88+ (Manifest V3 support)
- Works on any webpage that allows content script injection
- Some sites with strict Content Security Policies may block the content script

---

## License

This project is provided as-is for personal use. Feel free to modify and distribute.
