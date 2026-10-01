import './fonts.css';
import 'lenis/dist/lenis.css';
import './styles.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initLetter } from './letter.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const REDUCED = '(prefers-reduced-motion: reduce)';
const MOTION = '(prefers-reduced-motion: no-preference)';
const reduced = () => window.matchMedia(REDUCED).matches;

/* -------------------------------------------------------------------------
   Word splitting for headings. The visual words are hidden from assistive
   tech and an unsplit copy is kept for screen readers. Inline markup such as
   <em> is preserved. Never used on elements that contain links.
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
  if (lenis) lenis.scrollTo(target, { duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
  else target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  // Move focus for keyboard and screen reader users without a second jump.
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  const target = id.length > 1 ? $(id) : null;
  if (!target) return;
  e.preventDefault();
  if (menu.isOpen()) menu.close(false);
  scrollToTarget(target);
  history.replaceState(null, '', id === '#top' ? location.pathname : id);
});

/* ---------------------------------------------------------------- nav */
const nav = $('[data-nav]');
const hero = $('.hero');
const navLinks = $$('.nav__side a:not(.btn)');

// Transparent over the hero; a solid bar afterwards, olive over olive sections.
function initNavState() {
  ScrollTrigger.create({
    trigger: hero,
    start: () => `bottom ${nav.offsetHeight}px`,
    onEnter: () => nav.classList.add('is-solid'),
    onLeaveBack: () => nav.classList.remove('is-solid'),
  });
  $$('[data-nav-dark]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: () => `top ${nav.offsetHeight / 2}px`,
      end: () => `bottom ${nav.offsetHeight / 2}px`,
      onToggle: (self) => nav.classList.toggle('on-dark', self.isActive),
    });
  });
  // Mark the nav link for the section in view.
  navLinks.forEach((a) => {
    const section = $(a.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => (self.isActive ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')),
    });
  });
}

let lastY = window.scrollY;
function onScrollNav() {
  const y = window.scrollY;
  if (!menu.isOpen()) {
    if (y > lastY + 4 && y > window.innerHeight) nav.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 80) nav.classList.remove('is-hidden');
  }
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
    root.classList.add('is-menu-open');
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
    root.classList.remove('is-menu-open');
    lenis?.start();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    closeTimer = setTimeout(() => { el.hidden = true; }, reduced() ? 0 : 700);
    if (restoreFocus) btn.focus();
  }
  btn.addEventListener('click', () => (open ? close() : show()));
  window.matchMedia('(min-width: 1000px)').addEventListener('change', (e) => e.matches && close(false));
  return { isOpen: () => open, close };
})();

/* ---------------------------------------------------------------- hero */
function initHero() {
  const media = $('[data-hero-media]', hero);
  const content = $('[data-hero-content]', hero);
  const title = $('[data-hero-title]', hero);
  const fades = $$('[data-hero-fade]', hero);
  const words = splitWords(title);

  gsap.set(words, { yPercent: 110 });
  gsap.set(fades, { autoAlpha: 0, y: 16 });
  gsap.set(title, { opacity: 1 });
  gsap.set(media, { scale: 1.12 });
  root.classList.remove('intro');

  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } })
    .to(media, { scale: 1, duration: 2.6, ease: 'power3.out' }, 0)
    .to(words, { yPercent: 0, duration: 1.5, stagger: 0.09 }, 0.25)
    .to(fades, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.55);

  // As the page moves on, the photograph drifts slower than the words.
  const drift = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  })
    .to(media, { yPercent: 18 }, 0)
    .to(content, { yPercent: -18, autoAlpha: 0 }, 0);

  // The photograph leans gently away from the pointer and the words answer it.
  const shift = $('[data-hero-drift]', hero);
  let onMove = null;
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const px = gsap.quickTo(shift, 'xPercent', { duration: 1.8, ease: 'power3' });
    const py = gsap.quickTo(shift, 'yPercent', { duration: 1.8, ease: 'power3' });
    const tx = gsap.quickTo(content, 'x', { duration: 1.8, ease: 'power3' });
    onMove = (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      px(nx * -2.4);
      py(ny * -2.4);
      tx(nx * 12);
    };
    hero.addEventListener('pointermove', onMove);
  }

  return () => {
    intro.kill();
    drift.kill();
    if (onMove) hero.removeEventListener('pointermove', onMove);
    gsap.set([media, shift, content, title, ...fades, ...words], { clearProps: 'all' });
  };
}

/* ------------------------------------------------------ magnetic buttons */
function initMagnetic() {
  const els = $$('[data-magnetic]');
  const move = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.18, y: (e.clientY - (r.top + r.height / 2)) * 0.3, duration: 0.6, ease: 'power3.out' });
  };
  const leave = (e) => gsap.to(e.currentTarget, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.45)' });
  els.forEach((el) => { el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave); });
  return () => els.forEach((el) => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    gsap.set(el, { clearProps: 'transform' });
  });
}

/* ------------------------------------------------------- scroll reveals */
function initReveals() {
  // Headings rise word by word.
  $$('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.set(words, { yPercent: 110 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.2, stagger: 0.07, ease: 'expo.out' }),
    });
  });

  // Supporting copy follows.
  const blocks = $$('[data-reveal]');
  gsap.set(blocks, { autoAlpha: 0, y: 24 });
  ScrollTrigger.batch(blocks, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out',
      clearProps: 'opacity,visibility,transform',
    }),
  });

  // Cards and grids arrive one after another.
  $$('[data-stagger]').forEach((list) => {
    const items = [...list.children];
    gsap.set(items, { autoAlpha: 0, y: 40 });
    ScrollTrigger.create({
      trigger: list,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(items, {
        autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12, ease: 'expo.out',
        clearProps: 'opacity,visibility,transform',
      }),
    });
  });

  // Photographs open like a curtain lifting.
  $$('[data-reveal-img]').forEach((el) => {
    const img = $('img', el);
    gsap.set(el, { clipPath: 'inset(12% 8% 12% 8%)', autoAlpha: 0 });
    gsap.set(img, { scale: 1.18 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(el, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 1, duration: 1.6, ease: 'expo.out' });
        gsap.to(img, { scale: 1, duration: 2, ease: 'expo.out' });
      },
    });
  });

  // Gentle parallax inside framed photographs.
  $$('[data-parallax]').forEach((el) => {
    const amount = parseFloat(el.dataset.parallax) || 10;
    gsap.fromTo($('picture', el), { yPercent: -amount / 2 }, {
      yPercent: amount / 2, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

// The floating WhatsApp button appears once the hero has been passed.
function initWhatsAppFloat() {
  const btn = $('[data-wa-float]');
  ScrollTrigger.create({
    trigger: hero,
    start: 'bottom 80%',
    onEnter: () => btn.classList.add('is-visible'),
    onLeaveBack: () => btn.classList.remove('is-visible'),
  });
  ScrollTrigger.create({
    trigger: '.footer',
    start: 'top 85%',
    onToggle: (self) => btn.classList.toggle('is-tucked', self.isActive),
  });
}

/* ---------------------------------------------------------------- boot */
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
initLetter($('[data-letter]'));

const mm = gsap.matchMedia();
mm.add(MOTION, () => {
  root.classList.add('motion');
  startLenis();
  const cleanHero = initHero();
  initReveals();
  return () => {
    cleanHero();
    stopLenis();
    root.classList.remove('motion', 'intro');
  };
});
mm.add(`${MOTION} and (hover: hover) and (pointer: fine)`, () => initMagnetic());
mm.add(REDUCED, () => {
  // Everything is already in its final, readable state; nothing to animate.
  root.classList.remove('motion', 'intro');
});

initNavState();
initWhatsAppFloat();
onScrollNav();

const refresh = () => ScrollTrigger.refresh();
document.fonts?.ready.then(refresh);
window.addEventListener('load', refresh, { once: true });
