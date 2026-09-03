(() => {
  'use strict';

  /* ---------------- State ---------------- */
  const state = {
    stripType: null,       // 1 | 2 | 3  (required photo count)
    capturedPhotos: [],    // array of dataURLs, length 5
    selectedIndexes: [],   // indexes into capturedPhotos, in pick order
    cameraStream: null,
  };

  const TOTAL_SHOTS = 5;
  const COUNTDOWN_SECONDS = 3;

  /* ---------------- Navigation ---------------- */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    if (id === 'flow-capture') startCaptureFlow();
    if (id === 'flow-picker') renderPickerScreen();
    if (id === 'flow-print') renderPrintScreen();
    if (id !== 'flow-capture') stopCamera();

    if (id === 'flow-start') {
      const startBtn = document.querySelector('.btn-start');
      if (startBtn) startBtn.disabled = false;
    }
  }

  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const dest = el.getAttribute('data-nav');
      if (el.id === 'btn-to-capture' && el.disabled) return;
      if (el.id === 'btn-to-print' && el.disabled) return;
      if (dest === 'flow-start') resetSession();

      // let the Start button's press animation finish before navigating
      if (el.classList.contains('btn-start')) {
        el.disabled = true;
        setTimeout(() => showScreen(dest), 180);
        return;
      }

      showScreen(dest);
    });
  });

  function resetSession() {
    state.stripType = null;
    state.capturedPhotos = [];
    state.selectedIndexes = [];
    document.querySelectorAll('.strip-card').forEach(c => c.setAttribute('aria-checked', 'false'));
    document.getElementById('btn-to-capture').disabled = true;
  }

  /* ---------------- FLOW 2: Select Strip ---------------- */
  document.querySelectorAll('.strip-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.strip-card').forEach(c => c.setAttribute('aria-checked', 'false'));
      card.setAttribute('aria-checked', 'true');
      state.stripType = parseInt(card.getAttribute('data-strip'), 10);
      document.getElementById('btn-to-capture').disabled = false;
    });
  });

  /* ---------------- FLOW 3: Capture ---------------- */
  const videoEl = document.getElementById('camera-preview');
  const canvasEl = document.getElementById('capture-canvas');
  const countdownEl = document.getElementById('countdown');
  const flashEl = document.getElementById('shot-flash');
  const statusEl = document.getElementById('capture-status');
  const slotEls = Array.from(document.querySelectorAll('.capture-slot'));

  async function startCamera() {
    try {
      state.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      videoEl.srcObject = state.cameraStream;
    } catch (err) {
      statusEl.textContent = 'Camera access is required to continue. Please allow camera permissions and reload.';
      console.error('Camera error:', err);
    }
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(t => t.stop());
      state.cameraStream = null;
    }
  }

  function resetCaptureUI() {
    state.capturedPhotos = [];
    slotEls.forEach(slot => {
      slot.classList.remove('filled', 'active');
      slot.innerHTML = slot.dataset.iconHtml || slot.innerHTML;
      const existingImg = slot.querySelector('img');
      if (existingImg) existingImg.remove();
    });
  }

  async function startCaptureFlow() {
    resetCaptureUI();
    await startCamera();
    runShotSequence(0);
  }

  function runShotSequence(shotIndex) {
    if (shotIndex >= TOTAL_SHOTS) {
      statusEl.textContent = 'All done!';
      countdownEl.textContent = '';
      setTimeout(() => showScreen('flow-picker'), 500);
      return;
    }

    slotEls.forEach(s => s.classList.remove('active'));
    slotEls[shotIndex].classList.add('active');
    statusEl.textContent = `Shot ${shotIndex + 1} of ${TOTAL_SHOTS} — get ready!`;

    let count = COUNTDOWN_SECONDS;
    countdownEl.textContent = count;

    const tick = setInterval(() => {
      count -= 1;
      if (count > 0) {
        countdownEl.textContent = count;
      } else {
        clearInterval(tick);
        countdownEl.textContent = '';
        takeShot(shotIndex);
      }
    }, 1000);
  }

  function takeShot(shotIndex) {
    const ctx = canvasEl.getContext('2d');
    const w = videoEl.videoWidth || 1280;
    const h = videoEl.videoHeight || 960;
    canvasEl.width = w;
    canvasEl.height = h;

    // mirror the capture to match the mirrored preview
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0, w, h);
    ctx.restore();

    const dataUrl = canvasEl.toDataURL('image/jpeg', 0.92);
    state.capturedPhotos[shotIndex] = dataUrl;

    flashEl.classList.remove('flash');
    void flashEl.offsetWidth; // restart animation
    flashEl.classList.add('flash');

    const slot = slotEls[shotIndex];
    slot.classList.add('filled');
    slot.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `Shot ${shotIndex + 1}`;
    slot.appendChild(img);

    setTimeout(() => runShotSequence(shotIndex + 1), 700);
  }

  /* ---------------- FLOW 4: Pick & Confirm ---------------- */
  const pickerGrid = document.getElementById('picker-grid');
  const pickerSub = document.getElementById('picker-sub');
  const btnToPrint = document.getElementById('btn-to-print');

  function requiredCount() {
    return state.stripType || 1;
  }

  function renderPickerScreen() {
    state.selectedIndexes = [];
    btnToPrint.disabled = true;

    const need = requiredCount();
    pickerSub.textContent = `Choose ${need} photo${need > 1 ? 's' : ''} for your strip`;

    pickerGrid.innerHTML = '';
    state.capturedPhotos.forEach((dataUrl, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'picker-thumb';
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = `
        <img src="${dataUrl}" alt="Captured photo ${idx + 1}" />
        <span class="picker-thumb__badge"></span>
      `;
      btn.addEventListener('click', () => togglePick(idx, btn));
      pickerGrid.appendChild(btn);
    });
  }

  function togglePick(idx, btn) {
    const need = requiredCount();
    const already = state.selectedIndexes.indexOf(idx);

    if (already > -1) {
      state.selectedIndexes.splice(already, 1);
      btn.setAttribute('aria-pressed', 'false');
    } else {
      if (state.selectedIndexes.length >= need) return; // limit reached
      state.selectedIndexes.push(idx);
      btn.setAttribute('aria-pressed', 'true');
    }

    // refresh order badges on all thumbs
    Array.from(pickerGrid.children).forEach((thumb, i) => {
      const badge = thumb.querySelector('.picker-thumb__badge');
      const order = state.selectedIndexes.indexOf(i);
      badge.textContent = order > -1 ? order + 1 : '';
    });

    btnToPrint.disabled = state.selectedIndexes.length !== need;
  }

  /* ---------------- FLOW 5: Print ---------------- */
  const stripOutput = document.getElementById('strip-output');
  const flipCard = document.getElementById('flip-card');
  const btnPrint = document.getElementById('btn-print');

  function renderPrintScreen() {
    stripOutput.innerHTML = '';
    flipCard.style.width = state.stripType === 1 ? '180px' : '200px';

    // always start on the cover side; the user taps to reveal the photos
    flipCard.classList.remove('is-flipped');
    flipCard.setAttribute('aria-pressed', 'false');

    state.selectedIndexes.forEach(idx => {
      const wrap = document.createElement('div');
      wrap.className = 'strip-output__photo';
      const img = document.createElement('img');
      img.src = state.capturedPhotos[idx];
      img.alt = 'Selected photo';
      wrap.appendChild(img);
      stripOutput.appendChild(wrap);
    });

    const footer = document.createElement('div');
    footer.className = 'strip-output__footer';
    footer.textContent = 'Navillera Charm Photobooth';
    stripOutput.appendChild(footer);
  }

  function toggleFlip() {
    const flipped = flipCard.classList.toggle('is-flipped');
    flipCard.setAttribute('aria-pressed', String(flipped));
  }

  flipCard.addEventListener('click', toggleFlip);
  flipCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFlip();
    }
  });

  btnPrint.addEventListener('click', () => window.print());

  /* ---------------- Init ---------------- */
  showScreen('flow-start');
})();
