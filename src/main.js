import './fonts.css';
import 'lenis/dist/lenis.css';
import './styles.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createHeroGL } from './hero-gl.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const REDUCED = '(prefers-reduced-motion: reduce)';
const MOTION = '(prefers-reduced-motion: no-preference)';
const reduced = () => window.matchMedia(REDUCED).matches;

/* -------------------------------------------------------------------------
   Word splitting. The visual copy is split into masked words and hidden from
   assistive tech; an unsplit copy is kept for screen readers. Inline markup
   such as <em> is preserved. Never used on elements that contain links.
   ------------------------------------------------------------------------- */
function splitWords(el) {
  if (el.dataset.splitDone) return $$('.w__i', el);
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  while (el.firstChild) visual.appendChild(el.firstChild);

  const wrap = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((token) => {
          if (!token) return;
          if (/^\s+$/.test(token)) return frag.append(document.createTextNode(' '));
          const w = document.createElement('span');
          w.className = 'w';
          const i = document.createElement('span');
          i.className = 'w__i';
          i.textContent = token;
          w.append(i);
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        wrap(child);
      }
    });
  };
  wrap(visual);

  const sr = document.createElement('span');
  sr.className = 'sr-only';
  sr.textContent = text;
  el.append(sr, visual);
  el.dataset.splitDone = '1';
  return $$('.w__i', visual);
}

/* ------------------------------------------------------------ smooth scroll */
let lenis = null;
const lenisRaf = (time) => lenis?.raf(time * 1000);

function startLenis() {
  if (lenis || reduced()) return;
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);
}
function stopLenis() {
  if (!lenis) return;
  gsap.ticker.remove(lenisRaf);
  lenis.destroy();
  lenis = null;
}

function scrollToTarget(target) {
  if (!target) return;
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
  } else {
    target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }
  // Move focus for keyboard and screen reader users without a second jump.
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = id === '#top' ? $('#top') : id.length > 1 ? $(id) : null;
  if (!target) return;
  e.preventDefault();
  if (menu.isOpen()) menu.close(false);
  scrollToTarget(target);
  history.replaceState(null, '', id === '#top' ? location.pathname : id);
});

/* ---------------------------------------------------------------- nav */
const nav = $('[data-nav]');
const navIndex = $('[data-now-index]');
const navLabel = $('[data-now-label]');
const navLinks = $$('.nav__links a');
let heroOnImage = false;
let activeSection = null;

function setNavTheme(theme) {
  if (nav.dataset.theme !== theme) nav.dataset.theme = theme;
}
function themeFor(section) {
  if (!section) return 'paper';
  if (section.id === 'top') return heroOnImage ? 'image' : 'ink';
  if (section.classList.contains('section--laterite')) return 'laterite';
  if (section.classList.contains('section--green')) return 'green';
  if (section.classList.contains('section--ink') || section.classList.contains('philosophy')) return 'ink';
  return 'paper';
}
function setActiveSection(section) {
  activeSection = section;
  setNavTheme(themeFor(section));
  if (section.dataset.index) {
    navIndex.textContent = section.dataset.index;
    navLabel.textContent = section.dataset.label;
  }
  navLinks.forEach((a) => a.getAttribute('href') === `#${section.id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
}

function initSectionTracking() {
  const probe = () => nav.offsetHeight * 0.5;
  const sections = $$('main > section, body > footer');
  const triggers = []; // declared first: a trigger can toggle while it is being created
  const pick = () => {
    // Sections overlap (the story slides over the hero); the last active one is on top.
    const i = triggers.findLastIndex((t) => t.isActive);
    if (i >= 0 && sections[i] !== activeSection) setActiveSection(sections[i]);
  };
  sections.forEach((section) => {
    triggers.push(ScrollTrigger.create({
      trigger: section,
      start: () => `top ${probe()}px`,
      end: () => `bottom ${probe()}px`,
      onToggle: pick,
    }));
  });
  setActiveSection($('#top'));
  pick();
}

let lastY = window.scrollY;
function onScrollNav() {
  const y = window.scrollY;
  const goingDown = y > lastY + 2;
  const goingUp = y < lastY - 2;
  if (!menu.isOpen()) {
    if (goingDown && y > window.innerHeight * 0.6) nav.classList.add('is-hidden');
    else if (goingUp || y < 80) nav.classList.remove('is-hidden');
  }
  nav.classList.toggle('is-solid', y > 40);
  lastY = y;
}
window.addEventListener('scroll', onScrollNav, { passive: true });

/* ---------------------------------------------------------------- menu */
const menu = (() => {
  const el = $('#menu');
  const btn = $('.nav__toggle');
  const label = $('.nav__toggle-label');
  let open = false;
  let closeTimer;

  const focusables = () => [btn, ...$$('a', el)];
  const onKey = (e) => {
    if (e.key === 'Escape') return close();
    if (e.key !== 'Tab') return;
    const f = focusables();
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  };

  function show() {
    clearTimeout(closeTimer);
    open = true;
    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open')));
    btn.setAttribute('aria-expanded', 'true');
    label.textContent = 'Close';
    nav.classList.add('is-menu');
    nav.classList.remove('is-hidden');
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    $('a', el).focus({ preventScroll: true });
  }
  function close(restoreFocus = true) {
    if (!open) return;
    open = false;
    el.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    label.textContent = 'Menu';
    nav.classList.remove('is-menu');
    lenis?.start();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    closeTimer = setTimeout(() => { el.hidden = true; }, reduced() ? 0 : 800);
    if (restoreFocus) btn.focus();
  }
  btn.addEventListener('click', () => (open ? close() : show()));
  window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => e.matches && close(false));
  return { isOpen: () => open, close };
})();

/* ---------------------------------------------------------------- hero */
// Photographs that pass through the frame, one per breath.
const SLIDES = [
  { src: '/img/prasarita-1000.webp', caption: 'Morning light, the rooftop' },
  { src: '/img/kathakali-510.webp', caption: 'Kathakali, Kerala' },
  { src: '/img/savasana-1200.webp', caption: 'Savasana on the red floor' },
  { src: '/img/kochi-golden-640.webp', caption: 'Golden hour near Kochi' },
  { src: '/img/sea-sunset-640.webp', caption: 'Sunset over the Arabian Sea' },
];

function initHero() {
  const hero = $('.hero');
  const sticky = $('.hero__sticky', hero);
  const canvas = $('[data-hero-gl]', hero);
  const frame = $('[data-hero-frame]', hero);
  const halves = $$('.hero__half', hero);
  const chars = $$('.hero__half .ch > span', hero);
  const fades = $$('[data-hero-fade]', hero);
  const fadeKids = fades.flatMap((f) => [...f.children]);
  const kasavu = $('.kasavu--hero', hero);
  const scrim = $('[data-hero-scrim]', hero);
  const mottoWords = splitWords($('.hero__motto-sa', hero));
  const mottoEn = $('.hero__motto-en', hero);
  const loader = $('[data-loader]');
  const count = $('[data-loader-count]');
  const slideIndex = $('[data-slide-index]', hero);
  const slideCaption = $('[data-slide-caption]', hero);
  const breathWord = $('[data-breath-word]', hero);
  const breathLine = $('[data-breath-line]', hero);
  const toggle = $('[data-breath-toggle]', hero);
  const tweens = [];

  // The first slide reuses whatever the poster <picture> already chose and preloaded.
  const poster = $('.hero__poster img', hero);
  const slides = SLIDES.map((s, i) => (i === 0 && poster?.currentSrc ? { ...s, src: poster.currentSrc } : s));

  const gl = createHeroGL({
    canvas, frame, slides,
    onSlide: (i) => {
      tweens.push(gsap.timeline()
        .to([slideIndex, slideCaption], { autoAlpha: 0, y: -8, duration: 0.45, ease: 'power2.in' })
        .add(() => {
          slideIndex.textContent = String(i + 1).padStart(2, '0');
          slideCaption.textContent = SLIDES[i].caption;
        })
        .fromTo([slideIndex, slideCaption], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 }));
    },
  });

  gsap.set(chars, { y: 0, yPercent: 140 }); // y: 0 discards the CSS first-frame offset GSAP would read as px
  gsap.set(fadeKids, { autoAlpha: 0, y: 12 });
  gsap.set(kasavu, { scaleX: 0 });
  gsap.set(scrim, { autoAlpha: 0 });
  gsap.set(mottoWords, { yPercent: 115 });
  gsap.set(mottoEn, { autoAlpha: 0, y: 12 });

  const showContent = (tl, at) => tl
    .add(() => root.classList.remove('intro'), at)
    .to(chars, { yPercent: 0, duration: 1.7, stagger: 0.07, ease: 'expo.out' }, at + 0.2)
    .to(kasavu, { scaleX: 1, duration: 1.9, ease: 'expo.inOut' }, at + 0.1)
    .to(fadeKids, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.05, ease: 'expo.out' }, at + 0.5);

  // Without WebGL the framed poster stands in, and the type simply arrives.
  if (!gl) {
    const tl = gsap.timeline();
    showContent(tl, 0);
    return () => tl.kill();
  }

  hero.classList.add('gl-on');
  lenis?.stop();
  gl.start();

  // The lamp is lit; the counter holds short of 100 until the first photograph is in.
  let firstIn = false;
  gl.ready.then(() => { firstIn = true; }, () => { firstIn = true; });
  const counter = { v: 0 };
  const ignite = gsap.timeline()
    .to(gl.state, { flame: 1, duration: 1.3, ease: 'power2.out' }, 0.15)
    .to(counter, {
      v: 100, duration: 1.5, ease: 'power1.inOut',
      onUpdate: () => { count.textContent = String(Math.round(Math.min(counter.v, firstIn ? 100 : 92))).padStart(2, '0'); },
    }, 0);

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fonts = document.fonts?.ready ?? Promise.resolve();
  // Phase one: the page opens on time, whatever the network or device is doing.
  let opened = false;
  const open = (at) => {
    if (opened) return;
    opened = true;
    const tl = gsap.timeline()
      .to(loader, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, 0)
      .add(() => lenis?.start(), at);
    showContent(tl, at);
    tweens.push(tl);
  };
  // Phase two: the lamp's light reveals the photograph, only once it is truly ready.
  // Until then the flame keeps burning in the frame, so it is never revealed empty.
  let lit = false;
  const light = () => {
    if (lit) return;
    lit = true;
    count.textContent = '100';
    tweens.push(gsap.timeline()
      .to(gl.state, { flameLift: 1, duration: 1.6, ease: 'power2.inOut' }, 0)
      .to(gl.state, { reveal: 1, duration: 2.4, ease: 'power3.inOut' }, 0.1)
      .to(gl.state, { flame: 0, duration: 1.3, ease: 'power2.in' }, 0.8)
      .add(() => gl.revealed(), 2.2));
  };
  // If the first photograph never arrives, the framed poster stands in.
  const fail = () => { hero.classList.remove('gl-on'); gl.state.flame = 0; open(0.3); };
  Promise.all([gl.ready, fonts, wait(1500)]).then(() => { open(0.9); light(); }, fail);
  wait(3500).then(() => open(0.3)); // never hold the page longer than this

  const onFail = () => hero.classList.remove('gl-on');
  canvas.addEventListener('gl-failed', onFail);

  // Breath: the gold line fills on the inhale and empties on the exhale.
  let phase = 'in';
  gl.onBreath((b, p) => {
    breathLine.style.setProperty('--b', b.toFixed(3));
    if (p !== phase) {
      phase = p;
      gsap.timeline()
        .to(breathWord, { autoAlpha: 0, y: -5, duration: 0.35, ease: 'power2.in' })
        .add(() => { breathWord.textContent = p === 'in' ? 'Inhale' : 'Exhale'; })
        .fromTo(breathWord, { autoAlpha: 0, y: 5 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    }
  });
  let playing = true;
  const onToggle = () => {
    playing = !playing;
    gl.setPlaying(playing);
    toggle.setAttribute('aria-pressed', String(!playing));
    toggle.textContent = playing ? 'Pause' : 'Play';
  };
  toggle.addEventListener('click', onToggle);

  // Scroll: the frame opens to full bleed, the name parts, the motto rises.
  const scrollTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: () => `+=${window.innerHeight * 0.9}`,
      scrub: true,
      onRefresh: () => gl.measure(),
      onUpdate: (self) => {
        const onImage = self.progress > 0.42;
        if (onImage !== heroOnImage) {
          heroOnImage = onImage;
          if (activeSection?.id === 'top') setNavTheme(themeFor(hero));
        }
      },
    },
  })
    .to(gl.state, { open: 1, duration: 0.6 }, 0)
    .to(halves[0], { xPercent: -70, autoAlpha: 0, duration: 0.45 }, 0)
    .to(halves[1], { xPercent: 70, autoAlpha: 0, duration: 0.45 }, 0)
    .to(fades, { autoAlpha: 0, duration: 0.2 }, 0)
    .to(frame, { autoAlpha: 0, duration: 0.15 }, 0.05)
    .to(kasavu, { autoAlpha: 0, duration: 0.2 }, 0.1)
    .to(scrim, { autoAlpha: 1, duration: 0.25 }, 0.45)
    .to(mottoWords, { yPercent: 0, duration: 0.25, stagger: 0.04, ease: 'power3.out' }, 0.55)
    .to(mottoEn, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.7)
    .to({}, { duration: 0.1 });

  // The story slides over the held hero, which settles back into the dark.
  const cover = gsap.fromTo(sticky, { scale: 1, filter: 'brightness(1)' }, {
    scale: 0.93, filter: 'brightness(0.45)', ease: 'none',
    scrollTrigger: {
      trigger: '#studio', start: 'top bottom', end: 'top top', scrub: true,
      onLeave: () => gl.setVisible(false),
      onEnterBack: () => gl.setVisible(true),
    },
  });

  const onResize = () => gl.measure();
  window.addEventListener('resize', onResize);
  return () => {
    window.removeEventListener('resize', onResize);
    toggle.removeEventListener('click', onToggle);
    canvas.removeEventListener('gl-failed', onFail);
    [ignite, scrollTl, cover, ...tweens].forEach((t) => t.kill());
    gl.destroy();
    hero.classList.remove('gl-on');
    gsap.set([sticky, frame, kasavu, scrim, ...halves, ...fades, ...fadeKids, ...chars], { clearProps: 'all' });
    heroOnImage = false;
  };
}

/* ----------------------------------------------------------- mantra band */
function initMantra() {
  const band = $('[data-mantra]');
  const track = $('[data-mantra-track]', band);
  const original = track.innerHTML;
  track.innerHTML = original + original; // two copies for a seamless loop
  let x = 0;
  let boost = 0;
  let active = false;
  const tick = (_, dt) => {
    if (!active) return;
    x -= (38 + boost) * (dt / 1000);
    boost *= 0.94;
    const half = track.scrollWidth / 2;
    if (-x >= half) x += half;
    track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
  };
  gsap.ticker.add(tick);
  const st = ScrollTrigger.create({
    trigger: band, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => { active = self.isActive; },
    onUpdate: (self) => { boost = Math.min(700, boost + Math.abs(self.getVelocity()) * 0.02); },
  });
  return () => { gsap.ticker.remove(tick); st.kill(); track.innerHTML = original; track.style.transform = ''; };
}

/* ------------------------------------------------------ magnetic buttons */
function initMagnetic() {
  const els = $$('[data-magnetic]');
  const move = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.22, y: (e.clientY - (r.top + r.height / 2)) * 0.32, duration: 0.6, ease: 'power3.out' });
  };
  const leave = (e) => gsap.to(e.currentTarget, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.45)' });
  els.forEach((el) => { el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave); });
  return () => els.forEach((el) => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    gsap.set(el, { clearProps: 'transform' });
  });
}

/* ------------------------------------------------------- generic reveals */
function initReveals() {
  // Headlines: masked word-by-word rise.
  $$('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.set(words, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 86%',
      once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.25, stagger: 0.06, ease: 'expo.out' }),
    });
  });

  // Statement: words brighten as they are read.
  $$('[data-scrub-words]').forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 52%', scrub: true },
    });
  });

  // Supporting copy and blocks.
  const blocks = $$('[data-reveal]');
  gsap.set(blocks, { autoAlpha: 0, y: 28 });
  ScrollTrigger.batch(blocks, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09, ease: 'expo.out',
      clearProps: 'opacity,visibility,transform',
    }),
  });

  // Photographs: curtain lift with a slow settle.
  $$('[data-reveal-img]').forEach((el) => {
    const img = $('img', el);
    gsap.set(el, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(img, { scale: 1.25 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
        gsap.to(img, { scale: 1, duration: 2, ease: 'expo.out', delay: 0.15 });
      },
    });
  });

  // Parallax inside the frame.
  $$('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || 10;
    gsap.fromTo($('picture', el), { yPercent: -amount / 2 }, {
      yPercent: amount / 2, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  $$('[data-parallax-y]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallaxY) || 6;
    gsap.fromTo(el, { yPercent: amount }, {
      yPercent: -amount, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Kasavu borders draw outward from the centre as each section arrives.
  $$('[data-kasavu]:not(.kasavu--hero)').forEach((el) => {
    gsap.fromTo(el, { scaleX: 0 }, {
      scaleX: 1, duration: 1.8, ease: 'expo.inOut',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    });
  });

  // Teacher's name drifts together as the portrait arrives.
  $$('[data-teacher-line]').forEach((el) => {
    const dir = el.dataset.teacherLine === '1' ? -1 : 1;
    gsap.fromTo(el, { xPercent: 9 * dir }, {
      xPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.teacher__stage', start: 'top bottom', end: 'center 45%', scrub: true },
    });
  });
}

/* ------------------------------------------------------- philosophy */
function initTenets() {
  const section = $('.philosophy');
  const tenets = $$('.tenet', section);
  const bars = $$('.tenets__progress span', section);
  gsap.set(tenets.slice(1), { autoAlpha: 0 });
  gsap.set($$('.tenet__ml', section).slice(1), { yPercent: 18 });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (self) => {
        const p = self.progress * tenets.length;
        bars.forEach((b, i) => b.style.setProperty('--p', gsap.utils.clamp(0, 1, p - i)));
      },
    },
  });
  tl.fromTo($('.tenet__ml', tenets[0]), { scale: 1.06 }, { scale: 1, duration: 1 });
  tenets.forEach((t, i) => {
    const next = tenets[i + 1];
    if (!next) return;
    const at = i * 1.4 + 0.8;
    tl.to(t, { autoAlpha: 0, y: -40, duration: 0.45 }, at)
      .fromTo(next, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.35)
      .to($('.tenet__ml', next), { yPercent: 0, duration: 0.7 }, at + 0.35);
  });
  tl.to({}, { duration: 0.6 });
  return () => tl.kill();
}

/* ------------------------------------------------ horizontal journeys */
function initJourneys() {
  const pin = $('[data-hscroll]');
  const track = $('[data-hscroll-track]');
  root.classList.add('is-h');
  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      refreshPriority: 1,
    },
  });
  $$('[data-panel-media]', track).forEach((m) => {
    gsap.fromTo($('picture', m), { xPercent: -5 }, {
      xPercent: 5, ease: 'none',
      scrollTrigger: { trigger: m, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
    });
  });
  return () => {
    root.classList.remove('is-h');
    gsap.set(track, { clearProps: 'transform' });
  };
}

/* --------------------------------------------- class list hover preview */
function initPreview() {
  const list = $('[data-offer]');
  const box = $('[data-preview-el]');
  const inner = $('.preview__inner', box);
  const imgs = {};
  $$('[data-preview]', list).forEach((row) => {
    const key = row.dataset.preview;
    if (imgs[key]) return;
    const img = new Image();
    img.src = row.dataset.previewSrc;
    img.alt = '';
    img.decoding = 'async';
    inner.append(img);
    imgs[key] = img;
  });

  const w = () => box.offsetWidth;
  const h = () => box.offsetHeight;
  const xTo = gsap.quickTo(box, 'x', { duration: 0.7, ease: 'power3' });
  const yTo = gsap.quickTo(box, 'y', { duration: 0.7, ease: 'power3' });
  const rTo = gsap.quickTo(box, 'rotation', { duration: 0.9, ease: 'power3' });
  let lastX = 0;

  const move = (e) => {
    xTo(e.clientX - w() / 2);
    yTo(e.clientY - h() / 2);
    rTo(gsap.utils.clamp(-6, 6, (e.clientX - lastX) * 0.25));
    lastX = e.clientX;
  };
  const enterRow = (e) => {
    const key = e.currentTarget.dataset.preview;
    Object.entries(imgs).forEach(([k, img]) => img.classList.toggle('is-on', k === key));
  };
  const enterList = (e) => {
    gsap.set(box, { x: e.clientX - w() / 2, y: e.clientY - h() / 2, visibility: 'visible' });
    lastX = e.clientX;
    gsap.to(inner, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'expo.out', overwrite: true });
  };
  const leaveList = () => {
    gsap.to(inner, { clipPath: 'inset(50% 50% 50% 50%)', duration: 0.5, ease: 'expo.out', overwrite: true,
      onComplete: () => gsap.set(box, { visibility: 'hidden' }) });
  };
  const rows = $$('[data-preview]', list);
  list.addEventListener('pointerenter', enterList);
  list.addEventListener('pointerleave', leaveList);
  list.addEventListener('pointermove', move);
  rows.forEach((r) => r.addEventListener('pointerenter', enterRow));
  window.addEventListener('blur', leaveList);
  return () => {
    list.removeEventListener('pointerenter', enterList);
    list.removeEventListener('pointerleave', leaveList);
    list.removeEventListener('pointermove', move);
    rows.forEach((r) => r.removeEventListener('pointerenter', enterRow));
    window.removeEventListener('blur', leaveList);
    Object.values(imgs).forEach((img) => img.remove());
    gsap.set(box, { visibility: 'hidden' });
  };
}

/* ----------------------------------------------------------- the letter */
function initLetter() {
  const form = $('[data-letter]');
  const status = $('[data-letter-status]');
  const date = form.elements.date;
  const today = new Date();
  date.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  status.setAttribute('aria-live', 'polite');

  // A select is as wide as its longest option; size it to the chosen one so the sentence reads naturally.
  const select = form.elements.session;
  const ruler = document.createElement('span');
  ruler.setAttribute('aria-hidden', 'true');
  ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;pointer-events:none';
  select.after(ruler);
  const fitSelect = () => {
    const cs = getComputedStyle(select);
    ruler.style.font = cs.font;
    ruler.textContent = select.options[select.selectedIndex].text;
    select.style.width = `calc(${ruler.offsetWidth}px + 1.5em)`;
  };
  select.addEventListener('change', fitSelect);
  document.fonts?.ready.then(fitSelect);
  window.addEventListener('resize', fitSelect);
  fitSelect();
  const defaultText = status.textContent;

  const clear = (input) => {
    input.closest('.field').classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
  };
  [form.elements.name, date].forEach((input) => input.addEventListener('input', () => clear(input)));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const session = form.elements.session.value;
    const missing = [];
    if (!date.value) missing.push(date);
    if (!name) missing.push(form.elements.name);
    missing.forEach((input) => {
      input.closest('.field').classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
    });
    if (missing.length) {
      status.textContent = missing.length === 2 ? 'Please add a date and your name.' : missing[0] === date ? 'Please choose a date.' : 'Please add your name.';
      status.classList.add('is-error');
      missing[0].focus();
      return;
    }
    const when = new Date(`${date.value}T00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const subject = `Booking: ${session} on ${when}`;
    const body = `Hello Nithin,\n\nI would like to join ${session} on ${when}.\n\nMy name is ${name}.\n\nThank you,\n${name}`;
    status.classList.remove('is-error');
    status.textContent = 'Opening your email app… If nothing happens, write to edmindnithin47@gmail.com.';
    window.location.href = `mailto:edmindnithin47@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => { if (!status.classList.contains('is-error')) status.textContent = defaultText; }, 9000);
  });
}

/* ---------------------------------------------------------------- boot */
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
initLetter();

const mm = gsap.matchMedia();

mm.add(MOTION, () => {
  root.classList.add('motion');
  startLenis();
  const cleanHero = initHero();
  initReveals();
  const cleanTenets = initTenets();
  const cleanMantra = initMantra();
  return () => {
    cleanHero();
    cleanTenets();
    cleanMantra();
    stopLenis();
    root.classList.remove('motion', 'intro');
  };
});

mm.add(REDUCED, () => {
  // Everything is already in its final, readable state; nothing to animate.
  root.classList.remove('motion', 'intro');
});

mm.add(`${MOTION} and (min-width: 900px)`, () => initJourneys());
mm.add(`${MOTION} and (hover: hover) and (pointer: fine)`, () => {
  const cleanPreview = initPreview();
  const cleanMagnetic = initMagnetic();
  return () => { cleanPreview(); cleanMagnetic(); };
});

initSectionTracking();
onScrollNav();

const refresh = () => ScrollTrigger.refresh();
document.fonts?.ready.then(refresh);
window.addEventListener('load', refresh, { once: true });
