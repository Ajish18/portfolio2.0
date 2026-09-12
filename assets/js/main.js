/* ═══════════════════════════════════════════════════════════
   main.js — theme, navigation, scroll choreography
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── Theme ─────────────────────────────────────────────── */
  const root = document.documentElement;
  const stored = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);
  else root.removeAttribute('data-theme');

  $('#themeToggle')?.addEventListener('click', () => {
    const nowDark = root.getAttribute('data-theme') === 'dark' ||
      (!root.hasAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = nowDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch {}
    setTimeout(() => window.__redrawCharts?.(), 60);
  });

  /* ── Year ──────────────────────────────────────────────── */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ── Nav: shadow, progress, active link ────────────────── */
  const navWrap = $('.nav-wrap');
  const bar = $('#scrollBar');
  const sections = $$('main section[id]');
  const navLinks = $$('.nav-links a');

  let ticking = false;
  const onScroll = () => {
    const sy = scrollY;
    navWrap?.classList.toggle('scrolled', sy > 12);

    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = `${max > 0 ? (sy / max) * 100 : 0}%`;

    let current = '';
    const probe = sy + innerHeight * 0.32;
    for (const sec of sections) {
      if (sec.offsetTop <= probe) current = sec.id;
    }
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${current}`));
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ── Mobile menu ───────────────────────────────────────── */
  const menuBtn = $('#menuBtn'), menu = $('#mobileMenu');
  const closeMenu = () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn?.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', closeMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu && !menu.hidden) closeMenu(); });
  addEventListener('resize', () => { if (innerWidth > 860 && menu && !menu.hidden) closeMenu(); });

  /* ── Reveal on scroll ──────────────────────────────────── */
  const revealIO = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  $$('.reveal').forEach(n => revealIO.observe(n));

  /* mask reveals — headings rise out from behind their own line */
  const maskIO = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .2 });
  $$('.mask, .display').forEach(n => maskIO.observe(n));

  /* ── Count-up numbers ──────────────────────────────────── */
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const countUp = node => {
    const to = parseFloat(node.dataset.to || '0');
    const dec = parseInt(node.dataset.dec || '0', 10);
    const dur = parseInt(node.dataset.dur || '1200', 10);
    if (reduced) { node.textContent = to.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); return; }
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const v = to * easeOut(p);
      node.textContent = v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countIO = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => { if (e.isIntersecting) { countUp(e.target); obs.unobserve(e.target); } });
  }, { threshold: .55 });
  $$('.count').forEach(n => countIO.observe(n));

  /* ── CGPA bar ──────────────────────────────────────────── */
  const cgpa = $('.cgpa-fill');
  if (cgpa) {
    new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.width = `${e.target.dataset.w}%`;
        obs.unobserve(e.target);
      });
    }, { threshold: .5 }).observe(cgpa);
  }

  /* ── Console tabs ──────────────────────────────────────── */
  const tabs = $$('.tab');
  const ink = $('.tab-ink');
  const moveInk = t => {
    if (!ink || !t) return;
    ink.style.left = `${t.offsetLeft}px`;
    ink.style.width = `${t.offsetWidth}px`;
  };
  const activate = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    moveInk(tab);
    if (tab.id === 'tab-flow') runFlow();
    if (tab.id === 'tab-code') typeCode();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => activate(t));
    t.addEventListener('keydown', e => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus(); activate(next);
    });
  });
  addEventListener('load', () => moveInk($('.tab.is-on')));
  addEventListener('resize', () => moveInk($('.tab.is-on')));
  moveInk($('.tab.is-on'));

  /* ── Approval-flow animation ───────────────────────────── */
  const flow = $('#flow');
  let flowTimer = null;
  function runFlow() {
    if (!flow || reduced) {
      $$('.flow-node', flow).forEach(n => n.classList.add('done'));
      $$('.flow-pipe', flow).forEach(p => p.classList.add('on'));
      return;
    }
    clearInterval(flowTimer);
    const nodes = $$('.flow-node', flow);
    const pipes = $$('.flow-pipe', flow);
    let i = 0;
    const reset = () => {
      nodes.forEach(n => n.classList.remove('on', 'done'));
      pipes.forEach(p => p.classList.remove('on'));
    };
    const tick = () => {
      if (i === 0) reset();
      nodes.forEach((n, k) => {
        n.classList.toggle('on', k === i);
        n.classList.toggle('done', k < i);
      });
      if (i > 0) pipes[i - 1]?.classList.add('on');
      i = (i + 1) % (nodes.length + 1);
    };
    tick();
    flowTimer = setInterval(tick, 1250);
  }
  /* run it once when the panel first scrolls into view */
  if (flow) new IntersectionObserver((e, o) => {
    if (e[0].isIntersecting) { runFlow(); o.disconnect(); }
  }, { threshold: .4 }).observe(flow.closest('.console') || flow);

  /* ── Typed server script ───────────────────────────────── */
  /* Each line is a flat list of [class, text] pairs; '' means plain text. */
  const SNIPPET = [
    ['c', '# quickfix/quickfix/doctype/job_card/job_card.py'],
    ['c', '# Deduct spare parts the moment a Job Card is completed.'],
    [],
    ['k', 'import', '', ' frappe'],
    ['k', 'from', '', ' frappe.model.document ', 'k', 'import', '', ' Document'],
    [],
    ['k', 'class', 'f', ' JobCard', '', '(Document):'],
    ['', '    ', 'k', 'def', 'f', ' on_submit', '', '(self):'],
    ['', '        self.validate_stock()'],
    ['', '        self.make_stock_entry()'],
    ['', '        self.create_sales_invoice()'],
    [],
    ['', '    ', 'k', 'def', 'f', ' make_stock_entry', '', '(self):'],
    ['', '        se = frappe.new_doc(', 's', '"Stock Entry"', '', ')'],
    ['', '        se.stock_entry_type = ', 's', '"Material Issue"'],
    ['', '        se.company = self.company'],
    ['', '        ', 'k', 'for', '', ' part ', 'k', 'in', '', ' self.spare_parts:'],
    ['', '            se.append(', 's', '"items"', '', ', {'],
    ['', '                ', 's', '"item_code"', '', ': part.item_code,'],
    ['', '                ', 's', '"qty"', '', ': part.qty,'],
    ['', '                ', 's', '"s_warehouse"', '', ': self.warehouse,'],
    ['', '            })'],
    ['', '        se.insert().submit()'],
    ['', '        frappe.msgprint(', 's', '"Stock updated \u00b7 FEFO batch applied"', '', ')'],
  ];
  let typed = false;
  function typeCode() {
    const host = $('#codeBlock');
    if (!host || typed) return;
    typed = true;
    const lines = SNIPPET.map(parts => {
      let html = '';
      for (let i = 0; i < parts.length; i += 2) {
        const cls = parts[i], txt = parts[i + 1] ?? '';
        html += cls ? `<span class="${cls}">${esc(txt)}</span>` : esc(txt);
      }
      return html;
    });
    if (reduced) { host.innerHTML = lines.join('\n'); return; }
    let i = 0;
    const next = () => {
      if (i >= lines.length) return;
      host.innerHTML += (i ? '\n' : '') + lines[i];
      i++;
      setTimeout(next, 55);
    };
    next();
  }
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ── Smooth anchor scroll that respects the fixed nav ──── */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });

  /* ── Nav retracts going down, returns going up ─────────── */
  if (!reduced) {
    let lastY = scrollY, idle = 0;
    addEventListener('scroll', () => {
      const y = scrollY;
      const down = y > lastY;
      if (Math.abs(y - lastY) > 4) {
        navWrap?.classList.toggle('hide', down && y > 260 && (menu?.hidden !== false));
        lastY = y;
      }
      clearTimeout(idle);
      idle = setTimeout(() => navWrap?.classList.remove('hide'), 1400);
    }, { passive: true });
  }

  /* ── Scroll parallax ───────────────────────────────────── */
  const parallax = $$('[data-parallax]');
  if (parallax.length && !reduced && matchMedia('(min-width: 1025px)').matches) {
    let pTick = false;
    const onP = () => {
      parallax.forEach(n => {
        const r = n.getBoundingClientRect();
        const mid = r.top + r.height / 2 - innerHeight / 2;
        const y = (-mid * parseFloat(n.dataset.parallax)).toFixed(1);
        const sc = n.dataset.parallaxScale || 1;
        n.style.transform = `translate3d(0, ${y}px, 0) scale(${sc})`;
      });
      pTick = false;
    };
    addEventListener('scroll', () => {
      if (!pTick) { pTick = true; requestAnimationFrame(onP); }
    }, { passive: true });
    onP();
  }

  /* ── Project rail ──────────────────────────────────────── */
  const rail = $('#projRail');
  if (rail) {
    const prev = $('#railPrev'), next = $('#railNext');
    const step = () => {
      const card = rail.querySelector('.proj');
      return card ? card.getBoundingClientRect().width + 14 : rail.clientWidth * .8;
    };
    const track = rail.querySelector('.rail-track');
    /* snap-align rests the rail at the track's leading padding, not at 0 */
    const lead = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const sync = () => {
      const max = rail.scrollWidth - rail.clientWidth - 4;
      if (prev) prev.disabled = rail.scrollLeft <= lead() + 4;
      if (next) next.disabled = rail.scrollLeft >= max;
    };
    prev?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
    next?.addEventListener('click', () => rail.scrollBy({ left:  step(), behavior: reduced ? 'auto' : 'smooth' }));
    rail.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    rail.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      rail.scrollBy({ left: e.key === 'ArrowRight' ? step() : -step(), behavior: reduced ? 'auto' : 'smooth' });
    });
    sync();
  }

  /* ── Subtle parallax on the hero photo ─────────────────── */
  const stack = $('.photo-frame');
  if (stack && !reduced && matchMedia('(pointer:fine)').matches) {
    const hero = $('.hero');
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - .5;
      const dy = (e.clientY - r.top) / r.height - .5;
      stack.style.transform = `perspective(1200px) rotateY(${dx * 3.4}deg) rotateX(${-dy * 3.4}deg)`;
    });
    hero.addEventListener('pointerleave', () => { stack.style.transform = ''; });
  }
})();
