(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const game = new PepperGame();
  let paused = false, muted = false, audio, best = 0, calloutLeft = 0;
  let heldPointer = null, heldAt = 0, holdTimer = 0, holdRepeat = 0;
  let lastTime = performance.now(), lossDelay = 0;
  try { best = Number(localStorage.getItem('pepper-pirate-best')) || 0; } catch {}
  $('best').textContent = best;

  function unlockAudio() {
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {}); } catch {}
  }
  function tone(frequency, duration = .09, type = 'triangle', end = frequency) {
    if (muted || !audio) return;
    const t = audio.currentTime, oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, t);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(.1, t + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(t); oscillator.stop(t + duration);
  }
  function announce(text, good = true) {
    $('callout').textContent = text;
    $('callout').className = 'callout show ' + (good ? 'good' : 'bad'); calloutLeft = 1;
  }
  function record() {
    best = Math.max(best, game.score); $('best').textContent = best;
    try { localStorage.setItem('pepper-pirate-best', String(best)); } catch {}
  }
  function overlay(tag, title, description, action) {
    $('overlayTag').textContent = tag; $('overlayTitle').textContent = title;
    $('overlayText').textContent = description; $('start').textContent = action;
    $('overlayNote').textContent = 'ПРОБЕЛ — ДРАЗНИТЬ · ← — УБРАТЬ · ESC — ПАУЗА';
    $('overlay').classList.remove('hidden'); $('start').focus({ preventScroll: true });
  }
  function resetHold() { heldPointer = null; holdTimer = 0; holdRepeat = 0; }
  function setPaused(value) {
    if (['ready', 'over'].includes(game.phase)) return;
    paused = value; resetHold();
    $('game').classList.toggle('paused', paused);
    $('pause').setAttribute('aria-label', paused ? 'Продолжить' : 'Пауза');
    if (paused) {
      overlay('МОЖНО ВЫДОХНУТЬ', 'ПАУЗА.', 'Перец подождёт. Собака тоже.', 'ПРОДОЛЖИТЬ →');
    } else {
      $('overlay').classList.add('hidden'); $('tease').focus({ preventScroll: true });
      lastTime = performance.now();
    }
  }
  function start() {
    unlockAudio();
    if (paused) { setPaused(false); return; }
    resetHold(); lossDelay = 0; game.start(); $('game').classList.remove('paused');
    $('overlay').classList.add('hidden'); $('callout').className = 'callout';
    $('tease').focus({ preventScroll: true }); lastTime = performance.now();
    processEvents(); render();
  }
  function tease() { if (paused) return; unlockAudio(); game.tap(); processEvents(); render(); }
  function retreat() { if (paused) return; game.retreat(); resetHold(); processEvents(); render(); }
  $('start').addEventListener('click', start);
  $('tease').addEventListener('click', tease);
  $('pull').addEventListener('click', retreat);
  $('pause').addEventListener('click', () => setPaused(!paused));
  $('sound').addEventListener('click', () => {
    unlockAudio(); muted = !muted; $('sound').textContent = muted ? '♪ ×' : '♫';
    $('sound').setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
    $('sound').setAttribute('aria-pressed', String(muted));
  });
  const zone = $('tapZone');
  zone.addEventListener('pointerdown', e => {
    if (paused || game.phase !== 'playing' || heldPointer !== null || e.button > 0) return;
    e.preventDefault(); heldPointer = e.pointerId; heldAt = performance.now();
    holdTimer = 0; holdRepeat = 0; zone.setPointerCapture(e.pointerId); tease();
  });
  zone.addEventListener('pointerup', e => {
    if (e.pointerId !== heldPointer) return;
    const isHold = performance.now() - heldAt >= 200; resetHold();
    if (isHold) retreat();
  });
  zone.addEventListener('pointercancel', () => { resetHold(); setPaused(true); });
  zone.addEventListener('lostpointercapture', () => { if (heldPointer !== null) { resetHold(); setPaused(true); } });
  zone.addEventListener('click', e => { if (e.detail === 0) tease(); });
  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); setPaused(!paused); }
    if (['Space', 'ArrowLeft', 'KeyA'].includes(e.code) && !paused && !['ready', 'over'].includes(game.phase)) {
      e.preventDefault(); if (e.code === 'Space') tease(); else retreat();
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  window.addEventListener('blur', () => setPaused(true));

  // Chroma-key the media at runtime, including partially transparent edge pixels.
  function keyGreen(ctx, width, height) {
    const frame = ctx.getImageData(0, 0, width, height), p = frame.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2], spill = g - Math.max(r, b);
      if (g > 85 && spill > 45 && g > r * 1.3 && g > b * 1.35) {
        const alpha = 1 - Math.min(1, Math.max(0, (spill - 45) / 55));
        p[i + 3] *= alpha;
        if (alpha > 0) p[i + 1] = Math.min(g, Math.max(r, b) + 18);
      }
    }
    ctx.putImageData(frame, 0, 0);
  }
  const handImage = new Image(), handFrames = [];
  handImage.onload = () => {
    for (let stage = 0; stage < 4; stage++) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 600;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(handImage, 0, 0, 600, 600); keyGreen(ctx, 600, 600);
      if (stage > 0) {
        const y = [600, 440, 367, 324][stage];
        ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= 620; x += 20) ctx.quadraticCurveTo(x + 10, y - 15, x + 20, y);
        ctx.lineTo(620, 600); ctx.lineTo(0, 600); ctx.closePath(); ctx.fill(); ctx.restore();
        if (stage < 3) {
          ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.strokeStyle = '#f7c679'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(0, y - 2);
          for (let x = 0; x <= 620; x += 20) ctx.quadraticCurveTo(x + 10, y - 17, x + 20, y - 2);
          ctx.stroke(); ctx.restore();
        }
      }
      handFrames.push(canvas);
    }
    drawHand();
  };
  handImage.src = 'assets/hand.png';
  function drawHand() {
    const ctx = $('handCanvas').getContext('2d'); ctx.clearRect(0, 0, 600, 600);
    if (handFrames[game.bites]) ctx.drawImage(handFrames[game.bites], 0, 0);
  }
  const dogCanvas = $('dogCanvas'); dogCanvas.width = dogCanvas.height = 320;
  const dogAnimation = new DogAnimator(dogCanvas, $('dog'));
  const dogPoster = new Image();
  dogPoster.onload = () => {
    if (dogAnimation.ready) return;
    const ctx = dogCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(dogPoster, 0, 0, 320, 320); keyGreen(ctx, 320, 320);
    $('dog').classList.add('video-ready');
  };
  dogPoster.src = 'assets/dog-head-reference.png';
  function animateDog(mode, duration) {
    if (mode === 'bite' || mode === 'miss') dogAnimation.setState('snap', .38, mode === 'bite' ? 'chew' : 'idle');
    else dogAnimation.setState(mode, duration);
  }
  function crumbs() {
    for (let n = 0; n < 10; n++) {
      const p = document.createElement('i'); p.className = 'crumb'; p.style.left = '42%'; p.style.top = '46%';
      p.style.setProperty('--dx', (Math.random() * 150 - 75) + 'px');
      p.style.setProperty('--dy', (40 + Math.random() * 100) + 'px');
      p.addEventListener('animationend', () => p.remove()); $('particles').append(p);
    }
  }
  function processEvents() {
    for (const event of game.events.splice(0)) {
      if (event.type === 'start') { drawHand(); animateDog('idle'); tone(340, .15, 'triangle', 640); }
      if (event.type === 'tap') tone(160 + game.heat * 3, .06);
      if (event.type === 'warning') { announce('УБИРАЙ!', false); tone(110, .25, 'sawtooth', 70); animateDog('warning', event.duration); }
      if (event.type === 'saved') {
        announce((event.perfect ? 'НА ГРАНИ! +' : 'УСПЕЛ! +') + event.points);
        tone(event.perfect ? 660 : 440, .2, 'triangle', 990); record(); animateDog(event.perfect ? 'miss' : 'idle');
      }
      if (event.type === 'early') { announce('СМЕЛЕЕ! ПОДНЕСИ БЛИЖЕ'); animateDog('idle'); }
      if (event.type === 'round') { animateDog('idle'); resetHold(); }
      if (event.type === 'bite' || event.type === 'lose') {
        resetHold(); drawHand(); crumbs(); animateDog('bite'); tone(100, .32, 'sawtooth', 35);
        $('game').classList.remove('shake'); void $('game').offsetWidth; $('game').classList.add('shake');
        announce(event.type === 'lose' ? 'ПЕРЕЦ ЗАКОНЧИЛСЯ!' : 'КУСЬ! −1', false);
        if (event.type === 'lose') {
          record(); lossDelay = .85;
        }
      }
    }
  }
  function render() {
    $('score').textContent = String(game.score).padStart(6, '0');
    $('round').textContent = String(game.round).padStart(2, '0');
    $('lives').textContent = '♥ '.repeat(3 - game.bites) + '· '.repeat(game.bites);
    $('lives').setAttribute('aria-label', (3 - game.bites) + ' укуса до проигрыша');
    $('streak').textContent = game.combo ? 'СЕРИЯ ' + game.combo + ' · ×' + (1 + Math.min(game.combo, 4) * .25).toFixed(2) : 'ПОКА ВСЕ ПАЛЬЦЫ ЦЕЛЫ';
    $('hand').style.setProperty('--reach', (game.reach * 32) + '%');
    $('hand').classList.toggle('retreat', ['cooldown', 'over'].includes(game.phase));
    const warning = game.phase === 'warning'; $('game').classList.toggle('danger', warning);
    $('meterMask').style.left = game.heat + '%'; $('marker').style.left = game.heat + '%';
    $('meter').setAttribute('aria-valuenow', Math.round(game.heat));
    $('mood').textContent = warning ? 'УБИРАЙ!' : game.heat > 65 ? 'РЫЧИТ' : game.heat > 30 ? 'ЗЛИТСЯ' : 'СПОКОЕН';
    $('tease').disabled = paused || game.phase !== 'playing';
    $('pull').disabled = paused || !['playing', 'warning'].includes(game.phase) || game.reach === 0;
    $('pause').disabled = ['ready', 'over'].includes(game.phase);
  }
  function frame(now) {
    const dt = Math.min(.06, (now - lastTime) / 1000); lastTime = now;
    if (!paused) {
      if (heldPointer !== null && game.phase === 'playing') {
        holdTimer += dt; holdRepeat += dt;
        if (holdTimer > .25 && holdRepeat > .28) { holdRepeat = 0; game.tap(); }
      }
      game.update(dt); processEvents(); render();
      if (calloutLeft > 0) { calloutLeft -= dt; if (calloutLeft <= 0) $('callout').classList.remove('show'); }
      if (game.phase === 'playing') {
        const face = game.heat > 55 ? 'growl' : 'idle';
        if (dogAnimation.state !== face) dogAnimation.setState(face);
      }
      dogAnimation.update(dt);
      if (lossDelay > 0) {
        lossDelay -= dt;
        if (lossDelay <= 0) overlay('ДОИГРАЛСЯ', 'ПЕРЕЦ КОНЧИЛСЯ.',
          'Счёт: ' + game.score + '. Лучшая серия: ' + game.bestCombo + '. Ещё один перчик?', 'ЕЩЁ ПОПЫТКА →');
      }
    }
    requestAnimationFrame(frame);
  }
  render(); requestAnimationFrame(frame);
})();
