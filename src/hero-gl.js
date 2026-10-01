// Hero scene: a nilavilakku flame is lit in the dark, its light reveals a framed
// photograph, and the photographs breathe (4 s in, 6 s out) and pass into one
// another through an ember-edged dissolve. Raw WebGL: one full-screen triangle,
// one fragment shader, one draw call per frame.

const vertex = /* glsl */ `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uRes;
  uniform vec4 uFrame;          // x, y, w, h in buffer px, origin bottom-left
  uniform sampler2D uTexA;
  uniform sampler2D uTexB;
  uniform vec2 uSizeA;
  uniform vec2 uSizeB;
  uniform float uMix;           // 0..1 dissolve A -> B
  uniform float uSeed;
  uniform float uTime;
  uniform float uBreath;        // 0 exhaled .. 1 inhaled
  uniform float uReveal;        // lamp light reveals the frame
  uniform float uFlame;         // flame visibility
  uniform vec2 uFlamePos;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uOpen;          // 0 framed .. 1 full bleed

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  vec2 cover(vec2 uv, vec2 box, vec2 img) {
    float rb = box.x / box.y, ri = img.x / img.y;
    vec2 s = rb > ri ? vec2(1.0, ri / rb) : vec2(rb / ri, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  const vec3 TEAK = vec3(0.063, 0.045, 0.031);
  const vec3 LAMP = vec3(1.0, 0.56, 0.2);

  void main() {
    vec2 px = vUv * uRes;
    float unit = min(uRes.x, uRes.y);
    vec3 col = TEAK;

    // Ambient lamplight pooling around the flame.
    float dF = length((px - uFlamePos) / unit);
    col += LAMP * 0.16 * exp(-dF * 3.0) * (0.25 + 0.75 * max(uFlame, uReveal)) * (1.0 - uOpen);

    // The framed photograph.
    vec2 fuv = (px - uFrame.xy) / uFrame.zw;
    if (fuv.x >= 0.0 && fuv.x <= 1.0 && fuv.y >= 0.0 && fuv.y <= 1.0) {
      float zoom = 1.0 - 0.05 * uBreath;
      vec2 buv = (fuv - 0.5) * zoom + 0.5;

      // A soft lens under the pointer.
      vec2 m = (uMouse - uFrame.xy) / uFrame.zw;
      vec2 dm = (buv - m) * vec2(uFrame.z / uFrame.w, 1.0);
      buv -= (buv - m) * 0.07 * uHover * smoothstep(0.45, 0.0, length(dm));

      // Heat shimmer, as air moves above a lamp.
      buv += (vec2(noise(buv * 5.0 + uTime * 0.21), noise(buv * 5.0 - uTime * 0.17)) - 0.5) * 0.005;

      vec3 img;
      if (uMix > 0.0) {
        float n = fbm(fuv * vec2(3.0, 3.0 * uFrame.w / uFrame.z) + uSeed);
        float g = n * 0.55 + (1.0 - fuv.y) * 0.45;           // burns upward from the lamp
        float edge = uMix * 1.3 - 0.15;
        float k = 1.0 - smoothstep(edge - 0.035, edge + 0.035, g);
        float wob = (n - 0.5) * 0.06 * sin(3.14159 * uMix);
        vec3 ca = texture2D(uTexA, cover(buv + vec2(0.0, wob) * (1.0 - k), uFrame.zw, uSizeA)).rgb;
        vec3 cb = texture2D(uTexB, cover(buv - vec2(0.0, wob) * k, uFrame.zw, uSizeB)).rgb;
        img = mix(ca, cb, k);
        float ember = smoothstep(0.05, 0.0, abs(g - edge));
        img += mix(LAMP, vec3(1.0, 0.85, 0.5), ember) * ember * 1.25 * step(uMix, 0.999);
      } else {
        img = texture2D(uTexA, cover(buv, uFrame.zw, uSizeA)).rgb;
      }

      // Opened to full bleed, the photograph falls into shallow focus behind the motto.
      if (uOpen > 0.01) {
        vec2 r = vec2(1.0 / uFrame.z, 1.0 / uFrame.w) * uOpen * 9.0 * (uRes.y / 900.0);
        vec3 soft = img * 0.2;
        soft += texture2D(uTexA, cover(buv + vec2( r.x, 0.0), uFrame.zw, uSizeA)).rgb * 0.1;
        soft += texture2D(uTexA, cover(buv + vec2(-r.x, 0.0), uFrame.zw, uSizeA)).rgb * 0.1;
        soft += texture2D(uTexA, cover(buv + vec2(0.0,  r.y), uFrame.zw, uSizeA)).rgb * 0.1;
        soft += texture2D(uTexA, cover(buv + vec2(0.0, -r.y), uFrame.zw, uSizeA)).rgb * 0.1;
        soft += texture2D(uTexA, cover(buv + r * 0.7, uFrame.zw, uSizeA)).rgb * 0.1;
        soft += texture2D(uTexA, cover(buv - r * 0.7, uFrame.zw, uSizeA)).rgb * 0.1;
        soft += texture2D(uTexA, cover(buv + vec2(r.x, -r.y) * 0.7, uFrame.zw, uSizeA)).rgb * 0.1;
        soft += texture2D(uTexA, cover(buv + vec2(-r.x, r.y) * 0.7, uFrame.zw, uSizeA)).rgb * 0.1;
        img = mix(img, soft, smoothstep(0.0, 0.6, uOpen));
      }

      // Warm grade and a quiet vignette inside the frame.
      img = mix(img, img * vec3(1.07, 0.98, 0.86), 0.4);
      vec2 vv = fuv - 0.5;
      img *= 1.0 - dot(vv, vv) * mix(0.85, 0.45, uOpen);

      // The flame's light opening the image.
      if (uReveal < 1.0) {
        float d = length((px - uFlamePos) / unit);
        float rn = fbm(px / unit * 4.0 + uTime * 0.35) * 0.14;
        float R = uReveal * 1.7;
        float lit = smoothstep(R, R - 0.12, d + rn);
        float rim = smoothstep(0.07, 0.0, abs(d + rn - R)) * step(0.001, uReveal);
        img = mix(TEAK * 0.7, img, lit) + LAMP * rim * 1.4;
      }
      col = img;
    }

    // The flame itself.
    if (uFlame > 0.001) {
      float h = 0.085 * unit * uFlame * (0.94 + 0.12 * noise(vec2(uTime * 7.0, 1.7)));
      vec2 p = (px - uFlamePos) / h;
      p.x += (fbm(vec2(p.y * 1.6 - uTime * 3.2, uTime * 0.9)) - 0.5) * 0.45 * max(p.y, 0.0);
      p.x *= 2.4 + max(p.y, 0.0) * 2.6;
      float d = length(vec2(p.x, (p.y - 0.3) * (p.y > 0.3 ? 0.6 : 1.5)));
      float body = smoothstep(0.62, 0.08, d);
      float core = smoothstep(0.32, 0.0, length(vec2(p.x * 1.2, (p.y - 0.18) * 1.6)));
      vec3 flame = mix(vec3(0.95, 0.32, 0.06), vec3(1.0, 0.72, 0.28), smoothstep(0.0, 0.6, body));
      flame = mix(flame, vec3(1.0, 0.96, 0.84), core);
      float base = smoothstep(0.22, 0.0, length(vec2(p.x * 0.9, p.y + 0.02))) * 0.5;
      flame = mix(flame, vec3(0.3, 0.42, 0.95), base * (1.0 - core));
      col = mix(col, flame, clamp(body * 1.15, 0.0, 1.0) * uFlame);
      col += LAMP * exp(-length((px - uFlamePos) / h) * 1.35) * 0.32 * uFlame;
    }

    // Film grain.
    col += (hash(px + fract(uTime) * 91.7) - 0.5) * 0.035;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function compile(gl, type, source) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, source);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(() => resolve(img));
    img.onerror = reject;
    img.src = src;
  });
}

export function createHeroGL({ canvas, frame, slides, onSlide }) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!gl) return null;

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (err) {
    console.warn('Hero shader unavailable:', err);
    return null;
  }
  gl.useProgram(program);

  // One triangle that covers the whole viewport.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  ['uRes', 'uFrame', 'uTexA', 'uTexB', 'uSizeA', 'uSizeB', 'uMix', 'uSeed', 'uTime', 'uBreath',
    'uReveal', 'uFlame', 'uFlamePos', 'uMouse', 'uHover', 'uOpen'].forEach((n) => { u[n] = gl.getUniformLocation(program, n); });
  gl.uniform1i(u.uTexA, 0);
  gl.uniform1i(u.uTexB, 1);
  gl.uniform1f(u.uSeed, 3.1);

  // Render scale: starts at the device pixel ratio (capped) and steps down on slow devices.
  let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const MIN_DPR = 0.5;
  let frameCost = 1 / 60;
  let frameCount = 0;

  // Public, tweenable state.
  const state = { reveal: 0, flame: 0, open: 0, flameLift: 0 };

  /* textures (a 1x1 teak placeholder keeps both units valid until photographs arrive) */
  const placeholder = gl.createTexture();
  [gl.TEXTURE0, gl.TEXTURE1].forEach((unit) => {
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, placeholder);
  });
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([16, 11, 8]));
  const textures = [];
  const sizes = [];
  const loads = slides.map((s, i) => loadImage(s.src).then((img) => {
    // Upload on a scratch unit so the textures on display (units 0 and 1) are never disturbed.
    gl.activeTexture(gl.TEXTURE2);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures[i] = tex;
    sizes[i] = [img.naturalWidth, img.naturalHeight];
  }, () => {}));
  // The intro waits only for the first photograph; the others arrive behind it.
  const ready = loads[0].then(() => {
    if (!textures[0]) throw new Error('First hero photograph failed to load');
    setA(0);
  });

  let index = 0;
  let mix = 0;
  function bind(unit, i) {
    gl.activeTexture(unit === 0 ? gl.TEXTURE0 : gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[i]);
    gl.uniform2f(unit === 0 ? u.uSizeA : u.uSizeB, sizes[i][0], sizes[i][1]);
  }
  function setA(i) { index = i; bind(0, i); }

  /* layout: sizes come from layout boxes, so a CSS scale on an ancestor never skews them */
  let W = 1, H = 1;
  let frameRect = { x: 0, y: 0, w: 1, h: 1 };
  let scale = 1;
  function measure() {
    W = Math.max(1, canvas.clientWidth);
    H = Math.max(1, canvas.clientHeight);
    const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    gl.viewport(0, 0, bw, bh);
    gl.uniform2f(u.uRes, bw, bh);
    const c = canvas.getBoundingClientRect();
    scale = c.width / W || 1;
    const f = frame.getBoundingClientRect();
    frameRect = {
      x: ((f.left - c.left) / scale) * dpr,
      y: ((c.bottom - f.bottom) / scale) * dpr,
      w: (f.width / scale) * dpr,
      h: (f.height / scale) * dpr,
    };
  }

  /* pointer (fine pointers only; purely additive) */
  let hover = 0, hoverTarget = 0;
  const mouse = [-9999, -9999];
  const onMove = (e) => {
    const c = canvas.getBoundingClientRect();
    mouse[0] = ((e.clientX - c.left) / scale) * dpr;
    mouse[1] = ((c.bottom - e.clientY) / scale) * dpr;
    hoverTarget = 1;
  };
  const onLeave = () => { hoverTarget = 0; };
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) {
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
  }

  /* breath + slides */
  const INHALE = 4, EXHALE = 6, CYCLE = INHALE + EXHALE, FADE = 2.4;
  let breathClock = 0;
  let playing = true;
  let transition = null;
  const breathListeners = new Set();

  function startTransition() {
    if (slides.length < 2) return;
    let to = (index + 1) % slides.length;
    for (let k = 0; k < slides.length && !textures[to]; k++) to = (to + 1) % slides.length;
    if (!textures[to] || to === index) return;
    bind(1, to);
    gl.uniform1f(u.uSeed, Math.random() * 40);
    transition = { to, t: 0 };
    onSlide?.(to);
  }

  /* loop */
  let running = false;
  let visible = true;
  let revealDone = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  function tick(now) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (playing || !revealDone) time += dt; // paused: the scene holds perfectly still

    // Adaptive resolution: if frames run long, render fewer pixels.
    frameCost += (dt - frameCost) * 0.08;
    if (++frameCount > 40 && frameCost > 1 / 30 && dpr > MIN_DPR) {
      dpr = Math.max(MIN_DPR, dpr * 0.75);
      frameCount = 0;
      frameCost = 1 / 60;
      measure();
    }

    if (playing && revealDone) {
      breathClock += dt;
      if (breathClock >= CYCLE) { breathClock -= CYCLE; startTransition(); }
    }
    const b = breathClock < INHALE ? ease(breathClock / INHALE) : 1 - ease((breathClock - INHALE) / EXHALE);
    breathListeners.forEach((fn) => fn(b, breathClock < INHALE ? 'in' : 'out'));

    if (transition && playing) {
      transition.t += dt / FADE;
      mix = Math.min(1, transition.t);
      if (transition.t >= 1) { setA(transition.to); mix = 0; transition = null; }
    }
    hover += (hoverTarget * (1 - state.open) - hover) * 0.06;

    const e = ease(state.open);
    const bw = canvas.width, bh = canvas.height;
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uBreath, b);
    gl.uniform1f(u.uMix, mix);
    gl.uniform1f(u.uReveal, state.reveal);
    gl.uniform1f(u.uFlame, state.flame);
    gl.uniform1f(u.uOpen, state.open);
    gl.uniform1f(u.uHover, hover);
    gl.uniform2f(u.uMouse, mouse[0], mouse[1]);
    gl.uniform4f(u.uFrame,
      frameRect.x * (1 - e), frameRect.y * (1 - e),
      frameRect.w + (bw - frameRect.w) * e, frameRect.h + (bh - frameRect.h) * e);
    gl.uniform2f(u.uFlamePos, frameRect.x + frameRect.w / 2, frameRect.y + frameRect.h * (0.42 + 0.1 * state.flameLift));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function start() {
    if (running || !visible || document.hidden || lost) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(tick);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);

  let lost = false;
  const onLost = (e) => {
    e.preventDefault();
    lost = true;
    stop();
    canvas.dispatchEvent(new CustomEvent('gl-failed', { bubbles: true }));
  };
  canvas.addEventListener('webglcontextlost', onLost);

  measure();

  return {
    state,
    ready,
    measure,
    onBreath: (fn) => breathListeners.add(fn),
    revealed() { revealDone = true; breathClock = 0; },
    setVisible(v) { visible = v; v ? start() : stop(); },
    setPlaying(p) { playing = p; },
    start,
    stop,
    destroy() {
      stop();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      [placeholder, ...textures].forEach((t) => t && gl.deleteTexture(t));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      breathListeners.clear();
    },
  };
}
