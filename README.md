# Navillera Charm Photobooth

A kiosk-style, single-page photobooth web app. Plain HTML/CSS/JS — no build step.

## Flows

1. **Start** (`flow-start`) — brand splash screen, matches the provided design exactly.
2. **Select Strip** (`flow-select`) — minimalist template picker: Single Shot (1 photo), Duo Strip (2 photos), Classic Strip (3 photos).
3. **Capture** (`flow-capture`) — live camera preview, 3-2-1 countdown, auto-captures 5 shots into the slot tray.
4. **Pick & Confirm** (`flow-picker`) — user taps to choose exactly as many photos as their chosen strip needs (1, 2, or 3 of the 5 shots). No retakes.
5. **Print** (`flow-print`) — assembles the chosen photos into the strip layout and opens the browser's print dialog, sized for a 2in × 6in strip.

## Running locally

Camera access requires a secure context — opening `index.html` directly (`file://`) will **not** work. Serve it over `localhost` or HTTPS:

```bash
npx http-server -p 5173 -c-1
```

Then open `http://localhost:5173` in the browser you'll use on the kiosk, and allow camera access when prompted.

## Deploying to the kiosk tablet

- Serve the folder from any static host (or a tiny local server running on the kiosk itself) over `http://localhost` or `https://`.
- Open it in the kiosk browser in full-screen/kiosk mode.
- Grant camera permission once; most browsers remember it per-origin.
- The print button calls `window.print()` — make sure the kiosk's default/only printer is set up in the OS print settings so the print dialog goes straight to it (some kiosk browser configs can auto-print without a dialog; ask if you want that wired in).

## Things still using placeholders / to confirm

- **Strip paper size**: `@page { size: 2in 6in; }` in `css/style.css` is a common photo-strip size — tell me your actual printer/paper spec if different and I'll adjust.
- **"Charm Photobooth" text** is recreated with Baloo 2 (pink fill + gold outline) to match your mockup, since only the "Navillera" wordmark was provided as an image asset. Send an exact asset if you'd like this pixel-identical too.
- Camera facing mode defaults to the front/selfie camera (`facingMode: 'user'`) with the preview mirrored — flag if the kiosk uses an external/rear camera instead.

## File structure

```
index.html
css/style.css
js/app.js
assets/
  navillera-logo.png
  star-pink.png
  star-yellow.png
```
