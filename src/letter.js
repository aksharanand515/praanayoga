// The booking letter. The visitor fills in the blanks of a short letter to
// Nithin and WhatsApp sends it. The native <select> and <input type="date">
// stay in the markup (the form still reads without JavaScript); here they are
// upgraded into a listbox and a calendar drawn to match the paper.

const WHATSAPP = '918089948747';

const svg = (paths, cls = '') =>
  `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">${paths}</g></svg>`;
// Solar icon set via Iconify, CC BY 4.0, 480 Design.
const ICON = {
  chev: svg('<path d="M19 9L12 15L5 9"/>', 'slot__chev'),
  cal: svg('<path d="M2 12C2 8.229 2 6.343 3.172 5.172C4.343 4 6.229 4 10 4H14C17.771 4 19.657 4 20.828 5.172C22 6.343 22 8.229 22 12V14C22 17.771 22 19.657 20.828 20.828C19.657 22 17.771 22 14 22H10C6.229 22 4.343 22 3.172 20.828C2 19.657 2 17.771 2 14V12Z"/><path d="M7 4V2.5M17 4V2.5M2.5 9H21.5"/><path d="M17 13H17.0001M12 13H12.0001M7 13H7.0001M17 17H17.0001M12 17H12.0001M7 17H7.0001"/>', 'slot__cal'),
  prev: svg('<path d="M20 12H4M10 18L4 12L10 6"/>'),
  next: svg('<path d="M4 12H20M14 18L20 12L14 6"/>'),
};

const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const same = (a, b) => a && b && a.getTime() === b.getTime();
const fmt = (d, opts) => d.toLocaleDateString('en-GB', opts);

// "Thursday 1 October", "1 – 5 October", "30 October – 2 November"
function describeRange(start, end) {
  if (!start) return '';
  if (!end) return fmt(start, { weekday: 'long', day: 'numeric', month: 'long' });
  if (start.getMonth() === end.getMonth()) return `${start.getDate()} – ${fmt(end, { day: 'numeric', month: 'long' })}`;
  return `${fmt(start, { day: 'numeric', month: 'long' })} – ${fmt(end, { day: 'numeric', month: 'long' })}`;
}

export function initLetter(form) {
  if (!form) return;
  const status = form.querySelector('[data-letter-status]');
  const defaultStatus = status.innerHTML;
  status.setAttribute('aria-live', 'polite');
  const name = form.elements.name;
  const note = form.elements.note;
  const signature = form.querySelector('[data-signature]');
  let uid = 0;

  /* ------------------------------------------------------------ popovers */
  let current = null;
  function place(pop, trigger) {
    const f = form.getBoundingClientRect();
    const t = trigger.getBoundingClientRect();
    const w = pop.offsetWidth;
    const left = Math.max(12, Math.min(t.left - f.left - 6, f.width - w - 12));
    pop.style.left = `${left}px`;
    pop.style.top = `${t.bottom - f.top + 10}px`;
  }
  function openPop(pop, trigger, onClose) {
    current?.close(false);
    pop.hidden = false;
    place(pop, trigger);
    requestAnimationFrame(() => pop.classList.add('is-open'));
    trigger.setAttribute('aria-expanded', 'true');
    const outside = (e) => { if (!pop.contains(e.target) && !trigger.contains(e.target)) close(false); };
    const reflow = () => place(pop, trigger);
    function close(returnFocus = true) {
      pop.classList.remove('is-open');
      pop.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', reflow);
      current = null;
      onClose?.();
      if (returnFocus) trigger.focus();
    }
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', reflow);
    current = { close };
    return close;
  }

  const makeTrigger = (labelId, popId, haspopup) => {
    const id = `letter-trigger-${++uid}`;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.className = 'slot__trigger';
    b.setAttribute('aria-haspopup', haspopup);
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', popId);
    b.setAttribute('aria-labelledby', `${labelId} ${id}`);
    return b;
  };

  /* -------------------------------------------------------------- listbox */
  form.querySelectorAll('[data-select]').forEach((slot) => {
    const select = slot.querySelector('select');
    const label = slot.querySelector('label');
    const base = `letter-list-${++uid}`;
    label.id ||= `${base}-label`;
    const trigger = makeTrigger(label.id, base, 'listbox');
    trigger.innerHTML = `<span class="slot__value"></span>${ICON.chev}`;

    const list = document.createElement('div');
    list.className = 'pop pop--list';
    list.id = base;
    list.hidden = true;
    list.tabIndex = -1;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-labelledby', label.id);
    const options = [...select.options].map((o, i) => {
      const el = document.createElement('div');
      el.className = 'pop__option';
      el.id = `${base}-${i}`;
      el.setAttribute('role', 'option');
      const title = document.createElement('span');
      title.className = 'pop__title';
      title.textContent = o.text;
      el.append(title);
      if (o.dataset.note) {
        const n = document.createElement('span');
        n.className = 'pop__note';
        n.textContent = o.dataset.note;
        el.append(n);
      }
      list.append(el);
      return el;
    });
    form.append(list);
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    slot.append(trigger);
    slot.classList.add('is-enhanced');

    let active = select.selectedIndex;
    let close = null;
    const sync = () => {
      trigger.querySelector('.slot__value').textContent = select.options[select.selectedIndex].text;
      options.forEach((el, i) => el.setAttribute('aria-selected', String(i === select.selectedIndex)));
    };
    const setActive = (i) => {
      active = (i + options.length) % options.length;
      options.forEach((el, k) => el.classList.toggle('is-active', k === active));
      list.setAttribute('aria-activedescendant', options[active].id);
      options[active].scrollIntoView({ block: 'nearest' });
    };
    const choose = (i) => {
      select.selectedIndex = i;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      close?.();
    };
    const open = () => {
      close = openPop(list, trigger, () => { close = null; });
      setActive(select.selectedIndex);
      list.focus({ preventScroll: true });
    };
    trigger.addEventListener('click', () => (close ? close() : open()));
    trigger.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key) && !close) { e.preventDefault(); open(); }
    });
    list.addEventListener('keydown', (e) => {
      const keys = {
        ArrowDown: () => setActive(active + 1), ArrowUp: () => setActive(active - 1),
        Home: () => setActive(0), End: () => setActive(options.length - 1),
        Enter: () => choose(active), ' ': () => choose(active), Escape: () => close(),
      };
      if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
      else if (e.key === 'Tab') close(false);
    });
    options.forEach((el, i) => {
      el.addEventListener('click', () => choose(i));
      el.addEventListener('pointermove', () => { if (active !== i) setActive(i); });
    });
    sync();
  });

  /* ------------------------------------------------------------- calendar */
  const dateSlot = form.querySelector('[data-date]');
  const dateInput = dateSlot.querySelector('input[type="date"]');
  const dateLabel = dateSlot.querySelector('label');
  dateLabel.id ||= 'letter-date-label';
  const endInput = document.createElement('input');
  endInput.type = 'hidden';
  endInput.name = 'date_end';
  dateSlot.append(endInput);

  const today = midnight(new Date());
  let start = null;
  let end = null;
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  let focusDay = today;

  const calTrigger = makeTrigger(dateLabel.id, 'letter-calendar', 'dialog');
  calTrigger.innerHTML = `<span class="slot__value"></span>${ICON.cal}`;
  const cal = document.createElement('div');
  cal.className = 'pop pop--cal';
  cal.id = 'letter-calendar';
  cal.hidden = true;
  cal.setAttribute('role', 'dialog');
  cal.setAttribute('aria-label', 'Choose your dates');
  cal.innerHTML = `
    <div class="cal__head">
      <button type="button" class="cal__nav" data-step="-1" aria-label="Previous month">${ICON.prev}</button>
      <p class="cal__month" aria-live="polite"></p>
      <button type="button" class="cal__nav" data-step="1" aria-label="Next month">${ICON.next}</button>
    </div>
    <div class="cal__dow" aria-hidden="true">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => `<span>${d}</span>`).join('')}</div>
    <div class="cal__grid" role="group" aria-label="Days of the month"></div>
    <div class="cal__foot">
      <p class="cal__hint">Tap the day you arrive, and a second day if you are staying a while.</p>
      <div class="cal__actions">
        <button type="button" class="cal__btn" data-clear>Clear</button>
        <button type="button" class="cal__btn cal__btn--primary" data-done>Done</button>
      </div>
    </div>`;
  form.append(cal);
  dateInput.tabIndex = -1;
  dateInput.setAttribute('aria-hidden', 'true');
  dateSlot.append(calTrigger);
  dateSlot.classList.add('is-enhanced');

  const monthLabel = cal.querySelector('.cal__month');
  const grid = cal.querySelector('.cal__grid');
  const prev = cal.querySelector('[data-step="-1"]');

  function commit() {
    dateInput.value = start ? iso(start) : '';
    endInput.value = end ? iso(end) : '';
    const text = describeRange(start, end);
    calTrigger.querySelector('.slot__value').textContent = text || 'a date of your choice';
    calTrigger.classList.toggle('is-empty', !text);
    if (start) dateSlot.classList.remove('is-invalid');
    settle();
  }

  function render(focus = false) {
    monthLabel.textContent = fmt(view, { month: 'long', year: 'numeric' });
    prev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    grid.textContent = '';
    const lead = (view.getDay() + 6) % 7; // Monday first
    for (let i = 0; i < lead; i++) grid.append(document.createElement('span'));
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= days; n++) {
      const d = new Date(view.getFullYear(), view.getMonth(), n);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal__day';
      b.textContent = n;
      b.dataset.iso = iso(d);
      const isStart = same(d, start);
      const isEnd = same(d, end);
      let label = fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (isStart) label += end ? ', arrival' : ', selected';
      if (isEnd) label += ', departure';
      b.setAttribute('aria-label', label);
      b.setAttribute('aria-pressed', String(isStart || isEnd));
      if (d < today) b.disabled = true;
      if (same(d, today)) { b.classList.add('is-today'); b.setAttribute('aria-current', 'date'); }
      if (isStart) b.classList.add('is-start');
      if (isEnd) b.classList.add('is-end');
      if (start && end && d > start && d < end) b.classList.add('in-range');
      b.tabIndex = same(d, focusDay) ? 0 : -1;
      grid.append(b);
    }
    if (focus) grid.querySelector(`[data-iso="${iso(focusDay)}"]`)?.focus();
  }

  function pick(d) {
    if (!start || end || d < start) { start = d; end = null; }
    else if (same(d, start)) { end = null; }
    else { end = d; }
    focusDay = d;
    commit();
    render(true);
  }

  function moveFocus(d) {
    if (d < today) d = today;
    focusDay = d;
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1);
    render(true);
  }

  let closeCal = null;
  const openCal = () => {
    focusDay = start || today;
    view = new Date(focusDay.getFullYear(), focusDay.getMonth(), 1);
    render();
    closeCal = openPop(cal, calTrigger, () => { closeCal = null; });
    grid.querySelector(`[data-iso="${iso(focusDay)}"]`)?.focus({ preventScroll: true });
  };
  calTrigger.addEventListener('click', () => (closeCal ? closeCal() : openCal()));
  cal.querySelectorAll('.cal__nav').forEach((b) => b.addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() + Number(b.dataset.step), 1);
    render();
  }));
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.cal__day');
    if (b && !b.disabled) pick(new Date(`${b.dataset.iso}T00:00`));
  });
  grid.addEventListener('keydown', (e) => {
    const b = e.target.closest('.cal__day');
    if (!b) return;
    const d = new Date(`${b.dataset.iso}T00:00`);
    const shift = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (shift) { e.preventDefault(); moveFocus(new Date(d.getFullYear(), d.getMonth(), d.getDate() + shift)); }
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      moveFocus(new Date(d.getFullYear(), d.getMonth() + (e.key === 'PageUp' ? -1 : 1), d.getDate()));
    }
  });
  cal.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeCal?.(); } });
  cal.addEventListener('focusout', (e) => {
    if (closeCal && !cal.contains(e.relatedTarget) && e.relatedTarget !== calTrigger && e.relatedTarget) closeCal(false);
  });
  cal.querySelector('[data-clear]').addEventListener('click', () => { start = null; end = null; focusDay = today; commit(); render(true); });
  cal.querySelector('[data-done]').addEventListener('click', () => closeCal?.());
  commit();

  /* ----------------------------------------------------- name, note, sign */
  const ruler = document.createElement('span');
  ruler.setAttribute('aria-hidden', 'true');
  ruler.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;pointer-events:none;left:-9999px;top:0';
  form.append(ruler);
  const fitName = () => {
    const cs = getComputedStyle(name);
    ruler.style.font = cs.font;
    ruler.style.letterSpacing = cs.letterSpacing;
    ruler.textContent = name.value || name.placeholder;
    name.style.width = `calc(${ruler.offsetWidth}px + 0.48em)`;
  };
  const sign = () => {
    const v = name.value.trim();
    signature.textContent = v || 'your name';
    signature.classList.toggle('is-empty', !v);
  };
  name.addEventListener('input', () => {
    fitName();
    sign();
    if (name.value.trim()) name.closest('.slot').classList.remove('is-invalid');
    settle();
  });
  document.fonts?.ready.then(fitName);
  window.addEventListener('resize', fitName);
  fitName();
  sign();

  const grow = () => { note.style.height = 'auto'; note.style.height = `${note.scrollHeight}px`; };
  note.addEventListener('input', grow);

  /* ---------------------------------------------------------------- send */
  function settle() {
    if (status.classList.contains('is-error') && start && name.value.trim()) {
      status.classList.remove('is-error');
      status.innerHTML = defaultStatus;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const who = name.value.trim();
    const missing = [];
    if (!who) { name.closest('.slot').classList.add('is-invalid'); missing.push('your name'); }
    if (!start) { dateSlot.classList.add('is-invalid'); missing.push('a date'); }
    if (missing.length) {
      status.textContent = `Please add ${missing.join(' and ')} to your letter.`;
      status.classList.add('is-error');
      (who ? calTrigger : name).focus();
      return;
    }
    const session = form.elements.session.value;
    const people = form.elements.people.value;
    const extra = note.value.trim();
    // In the message a range reads "from 3 to 6 October"; a single day "on Saturday 3 October".
    const when = end
      ? (start.getMonth() === end.getMonth()
        ? `from ${start.getDate()} to ${fmt(end, { day: 'numeric', month: 'long' })}`
        : `from ${fmt(start, { day: 'numeric', month: 'long' })} to ${fmt(end, { day: 'numeric', month: 'long' })}`)
      : `on ${describeRange(start, null)}`;
    const message = [
      'Namaste Nithin,',
      '',
      `My name is ${who}, and I would love to join ${session} ${when} for ${people}. Could you let me know the class times and anything I should bring?`,
      ...(extra ? ['', extra] : []),
      '',
      'With thanks,',
      who,
    ].join('\n');
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
    status.classList.remove('is-error');
    status.textContent = 'Opening WhatsApp with your letter…';
    // 'noopener' would make window.open return null; detach the new tab by hand instead.
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    else window.location.href = url;
    setTimeout(() => { if (!status.classList.contains('is-error')) status.innerHTML = defaultStatus; }, 8000);
  });
}
