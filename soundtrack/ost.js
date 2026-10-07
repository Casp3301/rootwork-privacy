/* The soundtrack band: a sleeve that leans toward the pointer and drifts
   with it, a record that slides out and turns while it plays, and a field
   of fireflies that brightens with the music. Nothing loads until the
   cover is pressed. */
(function () {
  "use strict";
  var band = document.getElementById("soundtrack");
  if (!band) return;
  var deck = band.querySelector(".ost-deck");
  var tilt = band.querySelector(".ost-tilt");
  var glow = band.querySelector(".ost-glow");
  var cover = band.querySelector(".ost-cover");
  var sheen = band.querySelector(".ost-sheen");
  var audio = band.querySelector(".ost-audio");
  var bar = band.querySelector(".ost-bar i");
  var seek = band.querySelector(".ost-bar input");
  var nowEl = band.querySelector(".ost-now");
  var lenEl = band.querySelector(".ost-len");
  var eq = band.querySelectorAll(".ost-eq b");
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // the browser can't always tell how long a streamed Opus file is, so the page says
  var length = function () { return isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Number(audio.dataset.length) || 0; };
  var clock = function (s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

  // the music, and something to listen to it with
  var analyser = null, bins = null, level = 0, peak = 0.12;
  function listen() {
    if (analyser || !window.AudioContext) return;
    try {
      var ctx = new AudioContext();
      var src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      bins = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser).connect(ctx.destination);
      audio._ctx = ctx;
    } catch (e) { analyser = null; }
  }
  function toggle() {
    if (audio.paused) {
      listen();
      if (audio._ctx && audio._ctx.state === "suspended") audio._ctx.resume();
      audio.play();
    } else audio.pause();
  }
  cover.addEventListener("click", toggle);
  audio.addEventListener("play", function () {
    deck.classList.add("playing", "started");
    cover.setAttribute("aria-pressed", "true");
    cover.setAttribute("aria-label", "Pause the Sanctuary soundtrack");
  });
  audio.addEventListener("pause", function () {
    deck.classList.remove("playing");
    cover.setAttribute("aria-pressed", "false");
    cover.setAttribute("aria-label", "Play the Sanctuary soundtrack");
  });
  audio.addEventListener("ended", function () { audio.currentTime = 0; });
  audio.addEventListener("loadedmetadata", function () { lenEl.textContent = clock(length()); });
  audio.addEventListener("timeupdate", function () {
    var f = length() ? Math.min(1, audio.currentTime / length()) : 0;
    bar.style.width = (f * 100) + "%";
    seek.value = Math.round(f * 1000);
    nowEl.textContent = clock(audio.currentTime);
  });
  seek.addEventListener("input", function () {
    if (!length()) return;
    audio.currentTime = (seek.value / 1000) * length();
  });

  // the sleeve follows the pointer: it leans toward it and slides a little with it
  var want = { x: 0, y: 0 }, have = { x: 0, y: 0 }, inside = false;
  band.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var r = deck.getBoundingClientRect();
    want.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.9)));
    want.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.9)));
    inside = true;
  });
  band.addEventListener("pointerleave", function () { want.x = 0; want.y = 0; inside = false; });

  // fireflies, drawn once per frame and only while the band is on screen
  var canvas = band.querySelector(".ost-flies");
  var g = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var flies = [];
  function size() {
    canvas.width = band.clientWidth * dpr; canvas.height = band.clientHeight * dpr;
    flies = [];
    var n = Math.round(band.clientWidth * band.clientHeight / 26000);
    for (var i = 0; i < n; i++) flies.push({ x: Math.random(), y: 0.35 + Math.random() * 0.65, s: 0.6 + Math.random() * 1.6, p: Math.random() * 6.28, v: 0.4 + Math.random() });
  }
  size();
  addEventListener("resize", size);

  var visible = false;
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(frame); }).observe(band);

  var t0 = performance.now();
  function frame(now) {
    if (!visible) return;
    var t = (now - t0) / 1000;

    if (analyser && !audio.paused) {
      analyser.getByteFrequencyData(bins);
      var sum = 0; for (var i = 2; i < 40; i++) sum += bins[i];
      // measured against the music's own recent loudest, so quiet passages still breathe
      var raw = sum / (38 * 255);
      peak = Math.max(peak * 0.997, raw, 0.08);
      level += (Math.min(1, raw / peak) - level) * 0.22;
      for (var k = 0; k < eq.length; k++) eq[k].style.transform = "scaleY(" + (0.2 + Math.min(1, bins[4 + k * 9] / 220)) + ")";
    } else {
      level += (0 - level) * 0.05;
      for (var k2 = 0; k2 < eq.length; k2++) eq[k2].style.transform = "scaleY(.25)";
    }

    if (!still) {
      // drift toward the pointer; with no pointer, a slow float
      var idle = inside ? 0 : 1;
      have.x += (want.x + idle * Math.sin(t * 0.5) * 0.18 - have.x) * 0.08;
      have.y += (want.y + idle * Math.cos(t * 0.37) * 0.14 - have.y) * 0.08;
      tilt.style.transform = "translate3d(" + (have.x * 22).toFixed(2) + "px," + (have.y * 16 - Math.sin(t * 1.1) * 4).toFixed(2) + "px,0) rotateY(" + (have.x * 16).toFixed(2) + "deg) rotateX(" + (-have.y * 12).toFixed(2) + "deg)";
      sheen.style.setProperty("--sx", (50 + have.x * 40).toFixed(1) + "%");
      sheen.style.setProperty("--sy", (40 + have.y * 40).toFixed(1) + "%");
      cover.style.boxShadow = (-have.x * 26).toFixed(1) + "px " + (30 - have.y * 18).toFixed(1) + "px 60px -18px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.08)";
    }
    glow.style.setProperty("--pulse", (1 + level * 0.28).toFixed(3));
    glow.style.opacity = audio.paused ? "" : (0.55 + level * 0.45).toFixed(3);

    g.clearRect(0, 0, canvas.width, canvas.height);
    for (var f = 0; f < flies.length; f++) {
      var fl = flies[f];
      var lift = still ? 0 : (t * 0.006 * fl.v * (1 + level * 4)) % 1;
      var x = (fl.x + (still ? 0 : Math.sin(t * 0.3 * fl.v + fl.p) * 0.02)) * canvas.width;
      var y = (((fl.y - lift) % 1 + 1) % 1) * canvas.height;
      var a = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.7 * fl.v + fl.p))) * (0.7 + level * 1.6);
      var r = fl.s * dpr * (1 + level * 0.9);
      var grad = g.createRadialGradient(x, y, 0, x, y, r * 6);
      grad.addColorStop(0, "rgba(255,236,170," + Math.min(1, a).toFixed(3) + ")");
      grad.addColorStop(1, "rgba(255,220,140,0)");
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r * 6, 0, 6.283); g.fill();
    }
    requestAnimationFrame(frame);
  }
})();
