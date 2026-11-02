/* =========================================================
   Koi Pond: procedural koi swimming behind the page.
   - Each koi is a chain of spine points that follow the head.
   - Click/tap empty water to drop food; koi will chase it.
   - Respects prefers-reduced-motion (draws a still pond).
   ========================================================= */
(() => {
  const canvas = document.getElementById("pond");
  const ctx = canvas.getContext("2d");
  const TAU = Math.PI * 2;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  // Traditional koi varieties: base body color + spot colors
  const VARIETIES = [
    { name: "kohaku",   base: "#f6efe4", spots: ["#e2401f"],            fin: "rgba(246,239,228,0.55)" },
    { name: "sanke",    base: "#f6efe4", spots: ["#e2401f", "#14161a"], fin: "rgba(246,239,228,0.55)" },
    { name: "showa",    base: "#17181c", spots: ["#e2401f", "#f6efe4"], fin: "rgba(40,40,46,0.6)" },
    { name: "tancho",   base: "#f6efe4", spots: [],                     fin: "rgba(246,239,228,0.55)", tancho: true },
    { name: "yamabuki", base: "#f2b33d", spots: ["#f7cf6a"],            fin: "rgba(242,179,61,0.5)" },
    { name: "chagoi",   base: "#f07a2c", spots: ["#f6a35a"],            fin: "rgba(240,122,44,0.5)" },
    { name: "kohaku",   base: "#f6efe4", spots: ["#e2401f"],            fin: "rgba(246,239,228,0.55)" },
  ];

  let W = 0, H = 0;
  let koi = [];
  let pads = [];
  const ripples = [];
  const food = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  class Koi {
    constructor() {
      this.len = rand(70, 125);
      this.n = 16;
      this.gap = this.len / this.n;
      this.width = this.len * 0.14;
      this.angle = rand(0, TAU);
      this.turn = 0;
      this.speed = rand(0.55, 1.05);
      this.t = rand(0, 100);
      this.v = pick(VARIETIES);

      const x = rand(0, W), y = rand(0, H);
      this.pts = [];
      for (let i = 0; i < this.n; i++) {
        this.pts.push({
          x: x - Math.cos(this.angle) * this.gap * i,
          y: y - Math.sin(this.angle) * this.gap * i,
        });
      }

      // Spots are placed along the spine (index) with a sideways offset
      this.spotList = [];
      const count = this.v.spots.length ? Math.floor(rand(3, 6)) : 0;
      for (let i = 0; i < count; i++) {
        this.spotList.push({
          idx: rand(1, this.n * 0.75),
          side: rand(-0.7, 0.7),
          r: rand(0.6, 1.2),
          color: pick(this.v.spots),
        });
      }
    }

    // Body half-width at a given spine index
    widthAt(i) {
      const t = i / (this.n - 1);
      const k = t < 0.22 ? 0.65 + 0.35 * (t / 0.22) : Math.pow(1 - (t - 0.22) / 0.78, 1.3);
      return Math.max(this.width * k, 1.2);
    }

    update(dt) {
      this.t += dt * 0.06;
      const head = this.pts[0];

      // Gentle wander
      this.turn += (Math.random() - 0.5) * 0.012 * dt;
      this.turn *= 0.95;

      // Chase the nearest food pellet
      let target = null, best = 260 * 260;
      for (const f of food) {
        const d = (f.x - head.x) ** 2 + (f.y - head.y) ** 2;
        if (d < best) { best = d; target = f; }
      }

      let desired = null;
      if (target) {
        desired = Math.atan2(target.y - head.y, target.x - head.x);
        if (best < 120) target.eaten = true;
      }

      // Steer back toward the center when near the edges
      const m = 70;
      if (head.x < m || head.x > W - m || head.y < m || head.y > H - m) {
        desired = Math.atan2(H / 2 - head.y + rand(-80, 80), W / 2 - head.x + rand(-80, 80));
      }

      if (desired !== null) {
        this.turn += angleDiff(desired, this.angle) * 0.006 * dt;
      }
      this.turn = Math.max(-0.06, Math.min(0.06, this.turn));
      this.angle += this.turn * dt + Math.sin(this.t) * 0.006 * dt;

      const sp = this.speed * (target ? 1.8 : 1) * dt;
      head.x += Math.cos(this.angle) * sp;
      head.y += Math.sin(this.angle) * sp;

      // Spine follows the head
      for (let i = 1; i < this.n; i++) {
        const prev = this.pts[i - 1], p = this.pts[i];
        const dx = p.x - prev.x, dy = p.y - prev.y;
        const d = Math.hypot(dx, dy) || 1;
        p.x = prev.x + (dx / d) * this.gap;
        p.y = prev.y + (dy / d) * this.gap;
      }
    }

    // Left/right outline of the body
    outline() {
      const left = [], right = [];
      for (let i = 0; i < this.n; i++) {
        const p = this.pts[i];
        const q = this.pts[Math.min(i + 1, this.n - 1)];
        const r = this.pts[Math.max(i - 1, 0)];
        const a = Math.atan2(r.y - q.y, r.x - q.x);
        const w = this.widthAt(i);
        left.push({ x: p.x + Math.cos(a + Math.PI / 2) * w, y: p.y + Math.sin(a + Math.PI / 2) * w });
        right.push({ x: p.x + Math.cos(a - Math.PI / 2) * w, y: p.y + Math.sin(a - Math.PI / 2) * w });
      }
      return { left, right };
    }

    bodyPath(ox = 0, oy = 0) {
      const { left, right } = this.outline();
      const head = this.pts[0];
      const a = Math.atan2(head.y - this.pts[1].y, head.x - this.pts[1].x);
      ctx.beginPath();
      // rounded nose
      ctx.moveTo(right[0].x + ox, right[0].y + oy);
      ctx.quadraticCurveTo(
        head.x + Math.cos(a) * this.width * 1.1 + ox,
        head.y + Math.sin(a) * this.width * 1.1 + oy,
        left[0].x + ox, left[0].y + oy
      );
      for (let i = 1; i < left.length; i++) {
        const mx = (left[i - 1].x + left[i].x) / 2, my = (left[i - 1].y + left[i].y) / 2;
        ctx.quadraticCurveTo(left[i - 1].x + ox, left[i - 1].y + oy, mx + ox, my + oy);
      }
      ctx.lineTo(left[left.length - 1].x + ox, left[left.length - 1].y + oy);
      for (let i = right.length - 1; i > 0; i--) {
        const mx = (right[i].x + right[i - 1].x) / 2, my = (right[i].y + right[i - 1].y) / 2;
        ctx.quadraticCurveTo(right[i].x + ox, right[i].y + oy, mx + ox, my + oy);
      }
      ctx.closePath();
    }

    segAngle(i) {
      const a = this.pts[Math.max(i - 1, 0)], b = this.pts[Math.min(i + 1, this.n - 1)];
      return Math.atan2(a.y - b.y, a.x - b.x);
    }

    drawFin(x, y, angle, len, wid, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(len / 2, 0, len / 2, wid / 2, 0, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    draw() {
      const v = this.v;
      const flap = Math.sin(this.t * 3) * 0.25;

      // Shadow on the pond floor
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      this.bodyPath(7, 10);
      ctx.fill();
      ctx.restore();

      // Pectoral fins
      const pf = this.pts[3], pa = this.segAngle(3);
      this.drawFin(pf.x, pf.y, pa + Math.PI * 0.68 + flap, this.len * 0.22, this.len * 0.1, v.fin);
      this.drawFin(pf.x, pf.y, pa - Math.PI * 0.68 - flap, this.len * 0.22, this.len * 0.1, v.fin);
      // Pelvic fins
      const vf = this.pts[8], va = this.segAngle(8);
      this.drawFin(vf.x, vf.y, va + Math.PI * 0.78 - flap, this.len * 0.12, this.len * 0.05, v.fin);
      this.drawFin(vf.x, vf.y, va - Math.PI * 0.78 + flap, this.len * 0.12, this.len * 0.05, v.fin);

      // Tail: a flowing, translucent fan
      const tail = this.pts[this.n - 1], ta = this.segAngle(this.n - 1) + Math.PI;
      const sway = Math.sin(this.t * 2.2) * 0.35;
      const tl = this.len * 0.3;
      ctx.save();
      ctx.translate(tail.x, tail.y);
      ctx.rotate(ta + sway * 0.4);
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.quadraticCurveTo(tl * 0.5, -tl * 0.15 + sway * 8, tl, -tl * 0.45 + sway * 6);
      ctx.quadraticCurveTo(tl * 0.7, 0 + sway * 4, tl, tl * 0.45 + sway * 6);
      ctx.quadraticCurveTo(tl * 0.5, tl * 0.15 + sway * 8, -2, 0);
      ctx.fillStyle = v.fin;
      ctx.fill();
      ctx.restore();

      // Body
      this.bodyPath();
      ctx.fillStyle = v.base;
      ctx.fill();

      // Spots (clipped to the body)
      ctx.save();
      this.bodyPath();
      ctx.clip();
      for (const s of this.spotList) {
        const i = Math.floor(s.idx);
        const p = this.pts[i], a = this.segAngle(i) + Math.PI / 2;
        const off = s.side * this.widthAt(i);
        ctx.beginPath();
        ctx.ellipse(
          p.x + Math.cos(a) * off, p.y + Math.sin(a) * off,
          this.width * s.r * 1.3, this.width * s.r,
          this.segAngle(i), 0, TAU
        );
        ctx.fillStyle = s.color;
        ctx.fill();
      }
      if (v.tancho) {
        const p = this.pts[1];
        ctx.beginPath();
        ctx.arc(p.x, p.y, this.width * 0.6, 0, TAU);
        ctx.fillStyle = "#e2401f";
        ctx.fill();
      }
      // Soft highlight down the back
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = this.width * 0.35;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(this.pts[1].x, this.pts[1].y);
      for (let i = 2; i < this.n * 0.7; i++) ctx.lineTo(this.pts[i].x, this.pts[i].y);
      ctx.stroke();
      ctx.restore();

      // Eyes
      const h = this.pts[1], ha = this.segAngle(1);
      for (const side of [1, -1]) {
        const ex = h.x + Math.cos(ha + side * Math.PI / 2) * this.width * 0.6;
        const ey = h.y + Math.sin(ha + side * Math.PI / 2) * this.width * 0.6;
        ctx.beginPath();
        ctx.arc(ex, ey, Math.max(1.3, this.width * 0.12), 0, TAU);
        ctx.fillStyle = "#0b0b0d";
        ctx.fill();
      }
    }
  }

  // ---------- Lily pads (koi swim beneath them) ----------
  function makePads() {
    pads = [];
    const count = Math.max(3, Math.round((W * H) / 260000));
    for (let i = 0; i < count; i++) {
      // keep pads toward the edges so they don't crowd the content
      const edgeX = Math.random() < 0.5 ? rand(0, W * 0.18) : rand(W * 0.82, W);
      pads.push({
        x: edgeX,
        y: rand(0, H),
        r: rand(26, 52),
        rot: rand(0, TAU),
        notch: rand(0.25, 0.4),
        flower: Math.random() < 0.35,
        bob: rand(0, TAU),
      });
    }
  }

  function drawPad(p, time) {
    const rot = p.rot + Math.sin(time * 0.0004 + p.bob) * 0.05;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rot);
    // shadow
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.arc(6, 8, p.r, p.notch, TAU - p.notch * 0.2);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();
    // pad
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, p.r, p.notch, TAU - p.notch * 0.2);
    ctx.closePath();
    const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.3, 2, 0, 0, p.r);
    g.addColorStop(0, "#4fa67f");
    g.addColorStop(1, "#24614c");
    ctx.fillStyle = g;
    ctx.fill();
    // veins
    ctx.strokeStyle = "rgba(20, 60, 45, 0.5)";
    ctx.lineWidth = 1;
    for (let a = p.notch + 0.4; a < TAU - 0.3; a += 0.55) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * p.r * 0.9, Math.sin(a) * p.r * 0.9);
      ctx.stroke();
    }
    // lotus blossom
    if (p.flower) {
      ctx.translate(-p.r * 0.25, -p.r * 0.2);
      for (let i = 0; i < 8; i++) {
        ctx.rotate(TAU / 8);
        ctx.beginPath();
        ctx.ellipse(p.r * 0.18, 0, p.r * 0.2, p.r * 0.08, 0, 0, TAU);
        ctx.fillStyle = i % 2 ? "#f6c6cf" : "#f2a6b6";
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.07, 0, TAU);
      ctx.fillStyle = "#f2c94c";
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Ripples & food ----------
  function addRipple(x, y) {
    ripples.push({ x, y, r: 2, life: 1 });
    setTimeout(() => ripples.push({ x, y, r: 2, life: 1 }), 180);
  }

  function dropFood(x, y) {
    addRipple(x, y);
    for (let i = 0; i < 4; i++) {
      food.push({ x: x + rand(-14, 14), y: y + rand(-14, 14), life: 1, eaten: false });
    }
  }

  window.addEventListener("pointerdown", (e) => {
    // Don't feed when clicking links, buttons, or cards
    if (e.target.closest("a, button, .card, .terminal, .nav")) return;
    dropFood(e.clientX, e.clientY);
  });

  // ---------- Main loop ----------
  function init() {
    resize();
    const count = Math.max(5, Math.min(12, Math.round((W * H) / 130000)));
    koi = Array.from({ length: count }, () => new Koi());
    makePads();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 16.67, 3); // normalize to ~60fps
    last = now;

    ctx.clearRect(0, 0, W, H);

    // Food pellets
    for (let i = food.length - 1; i >= 0; i--) {
      const f = food[i];
      f.life -= 0.0015 * dt;
      if (f.eaten || f.life <= 0) { food.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(f.x, f.y, 2.4, 0, TAU);
      ctx.fillStyle = `rgba(214, 170, 100, ${Math.min(1, f.life * 2)})`;
      ctx.fill();
    }

    for (const k of koi) { k.update(dt); k.draw(); }

    // Ripples on the surface
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 1.1 * dt;
      r.life -= 0.012 * dt;
      if (r.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.strokeStyle = `rgba(200, 235, 230, ${r.life * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    for (const p of pads) drawPad(p, now);

    requestAnimationFrame(frame);
  }

  init();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      makePads();
      // keep koi inside the new bounds
      for (const k of koi) for (const p of k.pts) {
        p.x = Math.min(Math.max(p.x, 0), W);
        p.y = Math.min(Math.max(p.y, 0), H);
      }
      if (reduceMotion) drawStill();
    }, 150);
  });

  function drawStill() {
    ctx.clearRect(0, 0, W, H);
    for (const k of koi) { for (let i = 0; i < 40; i++) k.update(1); k.draw(); }
    for (const p of pads) drawPad(p, 0);
  }

  if (reduceMotion) {
    drawStill();
  } else {
    requestAnimationFrame(frame);
  }

  // footer year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
