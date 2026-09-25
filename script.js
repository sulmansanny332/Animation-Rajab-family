"use strict";
const canvas = document.querySelector("#particles"),
  ctx = canvas.getContext("2d");
const stage = document.querySelector("#stage"),
  photo = document.querySelector("#photo");
const caption = document.querySelector("#caption"),
  eyebrow = document.querySelector("#eyebrow");
const phase = document.querySelector("#phase"),
  progress = document.querySelector("#progress");
const pauseButton = document.querySelector("#pause");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let w = 0,
  h = 0,
  particles = [],
  stars = [],
  elapsed = reduced ? 6500 : 0,
  last = performance.now(),
  paused = reduced,
  objectURL;
const duration = 18000;
// Cache the soft glow once instead of blurring thousands of paths every frame.
const sparkSprites = [false, true].map(blue => Array.from({length: 5}, (_, level) => {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 40;
  const paint = sprite.getContext("2d");
  paint.shadowColor = `rgba(70,195,255,${level * .35 / 4})`;
  paint.shadowBlur = level ? 9 : 0;
  paint.fillStyle = blue ? "#287cff" : "#79e8ff";
  paint.beginPath(); paint.arc(20, 20, 4, 0, Math.PI * 2); paint.fill();
  return sprite;
}));
const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
const mix = (a, b, t) => a + (b - a) * t;
function resize() {
  const nextW = stage.clientWidth, nextH = stage.clientHeight;
  if (w === nextW && h === nextH) return;
  w = nextW; h = nextH;
  const count = w <= 600 ? 1600 : 2400;
  const dpr = Math.min(devicePixelRatio || 1, w <= 600 ? 1.5 : 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const mask = document.createElement("canvas");
  mask.width = Math.ceil(w);
  mask.height = Math.ceil(h);
  const m = mask.getContext("2d");
  let size = Math.min(w * 0.145, h * 0.16, 112);
  m.font = `bold ${size}px Arial`;
  const maxWidth = w * 0.82;
  size *= Math.min(1, maxWidth / m.measureText("FAMILY").width);
  m.font = `bold ${size}px Arial`;
  m.textAlign = "center";
  m.textBaseline = "middle";
  m.fillStyle = "white";
  m.fillText("RAJAB", w / 2, h * 0.43);
  m.fillText("FAMILY", w / 2, h * 0.43 + size * 1.03);
  const pixels = m.getImageData(0, 0, mask.width, mask.height).data,
    targets = [];
  for (let y = 0; y < mask.height; y += 3)
    for (let x = 0; x < mask.width; x += 3)
      if (pixels[(y * mask.width + x) * 4 + 3] > 100) targets.push({ x, y });
  particles = Array.from({ length: count }, (_, i) => {
    const a = Math.random() * Math.PI * 2,
      r = Math.sqrt(Math.random()),
      scale = Math.min(w * 0.023, h * 0.017);
    const target = targets[Math.floor(Math.random() * targets.length)] || {
      x: w / 2,
      y: h / 2,
    };
    return {
      tx: target.x,
      ty: target.y,
      hx: w / 2 + 16 * Math.sin(a) ** 3 * scale * r,
      hy:
        h * 0.46 -
        (13 * Math.cos(a) -
          5 * Math.cos(2 * a) -
          2 * Math.cos(3 * a) -
          Math.cos(4 * a)) *
          scale *
          r,
      sx: Math.random() * w,
      sy: h * 0.86 + Math.random() * h * 0.5,
      ex: (Math.random() - 0.5) * w * 2 + w / 2,
      ey: (Math.random() - 0.5) * h * 2 + h / 2,
      r: 0.45 + Math.random() * 1.1,
      seed: Math.random() * 6.28,
      blue: i % 4 === 0,
    };
  });
  stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 0.9 + 0.2,
    speed: Math.random() * 10 + 3,
  }));
}
function draw(now) {
  const dt = Math.min(now - last, 80);
  last = now;
  if (!paused) elapsed = (elapsed + dt) % duration;
  const t = elapsed / 1000;
  ctx.clearRect(0, 0, w, h);
  for (const s of stars) {
    ctx.fillStyle = "rgba(105,190,235,.28)";
    ctx.beginPath();
    ctx.arc(s.x, (s.y - t * s.speed + h * 2) % h, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  const gather = ease(t / 2.7),
    morph = ease((t - 3.4) / 2.1),
    scatter = ease((t - 8) / 2.6),
    fade = 1 - ease((t - 9) / 2.8);
  // Keep the original particle lettering, with only a faint halo on each spark.
  const titleGlow = ease((t - 4.8) / 0.9) * (1 - ease((t - 8) / 0.65));
  const glowLevel = Math.round(titleGlow * 4);
  ctx.globalCompositeOperation = "lighter";
  if (fade > 0) for (const p of particles) {
    const jitter = Math.sin(t * 1.6 + p.seed) * 1.3;
    let x = mix(p.sx, p.hx, gather),
      y = mix(p.sy, p.hy, gather);
    x = mix(x, p.tx, morph);
    y = mix(y, p.ty, morph);
    x = mix(x, p.ex, scatter);
    y = mix(y, p.ey, scatter);
    ctx.globalAlpha = fade * (0.45 + 0.45 * Math.sin(p.seed + t * 2) ** 2);
    const diameter = p.r * 10;
    ctx.drawImage(sparkSprites[Number(p.blue)][glowLevel],
      x + jitter - diameter / 2, y + jitter - diameter / 2, diameter, diameter);
  }
  // A revolving particle pedestal, like the reference's blue light source.
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 180; i++) {
    const a = i * 2.399 + t * 0.65,
      rad = (i % 17) / 17;
    ctx.fillStyle = i % 3 ? "#008cff" : "#79f3ff";
    ctx.beginPath();
    ctx.arc(
      w / 2 + Math.cos(a) * w * 0.18 * rad,
      h * 0.865 + Math.sin(a) * h * 0.015 * rad,
      0.7 + rad,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  const reveal = ease((t - 9.1) / 3.5),
    out = ease((t - 16) / 2);
  photo.style.opacity = reveal * (1 - out);
  photo.style.filter = `blur(${(1 - reveal) * 24 + out * 12}px)`;
  photo.style.transform = `translate(calc(-50% + ${(1 - reveal) * w * 0.16}px),calc(-50% + ${(1 - reveal) * h * 0.19}px)) scale(${mix(0.07, 1, reveal) + out * 0.15}) rotate(${(1 - reveal) * -14}deg)`;
  eyebrow.style.opacity = 1 - ease((t - 8) / 1.5);
  caption.style.opacity = 1 - ease((t - 8) / 1.5);
  phase.textContent =
    t < 3.4
      ? "01 / A SPARK OF LOVE"
      : t < 9
        ? "02 / RAJAB FAMILY"
        : "03 / TOGETHER, ALWAYS";
  progress.style.width = `${(t / 18) * 100}%`;
  requestAnimationFrame(draw);
}
function replay() {
  elapsed = 0;
  paused = false;
  pauseButton.textContent = "Pause";
  last = performance.now();
}
document.querySelector("#replay").addEventListener("click", replay);
pauseButton.textContent = paused ? "Play" : "Pause";
pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? "Play" : "Pause";
});
document.querySelector("#upload").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const img = document.querySelector("#familyImage"),
    url = URL.createObjectURL(file);
  img.onload = () => {
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = url;
    img.style.display = "block";
    img.alt = "Your family photograph";
    document.querySelector("#placeholder").style.display = "none";
    document.querySelector("#hint").textContent =
      "Your photo stays on this device · Replay to watch the full reveal";
    replay();
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    document.querySelector("#hint").textContent =
      "This image could not be opened. Please choose a JPG, PNG or WebP photo.";
  };
  img.src = url;
});
document.querySelector("#fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (stage.requestFullscreen) await stage.requestFullscreen();
    else
      document.querySelector("#hint").textContent =
        "Fullscreen is not supported in this browser.";
  } catch {
    document.querySelector("#hint").textContent =
      "Fullscreen is unavailable in this browser.";
  }
});
new ResizeObserver(resize).observe(stage);
resize();
requestAnimationFrame(draw);
