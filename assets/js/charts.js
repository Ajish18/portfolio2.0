/* ═══════════════════════════════════════════════════════════
   charts.js — hand-rolled SVG chart + the shared tooltip layer
   Colours come from CSS custom properties, so the theme toggle
   repaints every mark for free.
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
    if (parent) parent.appendChild(node);
    return node;
  };

  /* ── shared tooltip, also used by github.js ─────────────── */
  const tip = document.getElementById('tip');
  const showTip = (html, x, y) => {
    if (!tip) return;
    tip.innerHTML = html;
    tip.hidden = false;
    tip.style.left = `${Math.min(Math.max(x, 90), innerWidth - 90)}px`;
    tip.style.top = `${y}px`;
    tip.style.opacity = '1';
  };
  const hideTip = () => { if (tip) { tip.style.opacity = '0'; tip.hidden = true; } };
  const swatch = c => `<i style="background:${c}"></i>`;
  addEventListener('scroll', hideTip, { passive: true });

  const bindHit = (node, html) => {
    const move = e => {
      const p = e.touches ? e.touches[0] : e;
      showTip(html(), p.clientX, p.clientY - 6);
    };
    node.addEventListener('pointerenter', move);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', hideTip);
    node.addEventListener('touchstart', move, { passive: true });
    node.addEventListener('touchend', hideTip);
  };
  window.__bindTip = bindHit;

  /* ═══════════════ Impact bars (horizontal, 1 series) ═════ */
  const IMPACT = [
    { label: 'Manual paper workflows',  value: 100, note: 'Quickfix · fully digitalised' },
    { label: 'Invoice processing time', value: 96,  note: 'hours → minutes' },
    { label: 'Reimbursement cycle',     value: 50,  note: 'ETEMS · 3-tier approval' },
    { label: 'Job-card data entry',     value: 40,  note: '10+ purpose-built DocTypes' }
  ];

  function drawImpact(host) {
    const W = Math.max(520, host.clientWidth || 760);
    const rowH = 58, padT = 8, padB = 26;
    const labelW = W < 620 ? 150 : 210;
    const H = padT + IMPACT.length * rowH + padB;
    const plotW = W - labelW - 66;

    host.textContent = '';
    const s = el('svg', {
      viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet',
      style: 'width:100%;height:auto'
    }, host);
    const x = v => (v / 100) * plotW;

    for (let v = 0; v <= 100; v += 25) {
      el('line', { x1: labelW + x(v), x2: labelW + x(v), y1: padT,
                   y2: padT + IMPACT.length * rowH, class: 'gridline' }, s);
      el('text', { x: labelW + x(v), y: H - 8, class: 'ax-val', 'text-anchor': 'middle' }, s)
        .textContent = `${v}%`;
    }

    IMPACT.forEach((d, i) => {
      const y = padT + i * rowH + 13, bh = 22;

      el('text', { x: labelW - 14, y: y + bh / 2 + 4, class: 'dl-name', 'text-anchor': 'end' }, s)
        .textContent = d.label;
      el('rect', { x: labelW, y, width: plotW, height: bh, rx: 6, fill: 'var(--line-soft)' }, s);

      const bar = el('rect', {
        x: labelW, y, width: reduced ? x(d.value) : 0, height: bh, rx: 6, fill: 'var(--series-1)'
      }, s);
      if (!reduced) {
        bar.style.transition = `width 1s cubic-bezier(.32,.72,0,1) ${i * 100}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => bar.setAttribute('width', x(d.value))));
      }

      /* the relief rule: every bar carries its own number */
      const lab = el('text', { x: labelW + x(d.value) + 10, y: y + bh / 2 + 4.5, class: 'dl-val' }, s);
      lab.textContent = `${d.value}%`;
      if (!reduced) {
        lab.style.opacity = '0';
        lab.style.transition = `opacity .5s ease ${580 + i * 100}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => { lab.style.opacity = '1'; }));
      }

      const hit = el('rect', { x: labelW, y: y - 8, width: plotW, height: bh + 16, class: 'hit' }, s);
      bindHit(hit, () => `<span class="tt-title">${d.label}</span>
        <div class="tt-row">${swatch('var(--series-1)')}<b>${d.value}%</b>&nbsp;reduction</div>
        <div class="muted" style="margin-top:3px">${d.note}</div>`);
    });
  }

  /* ═══════════════ boot ══════════════════════════════════ */
  const registry = [['impactBars', drawImpact]];
  const drawn = new Set();

  const drawOne = (id, fn) => {
    const host = document.getElementById(id);
    if (!host) return;
    fn(host);
    drawn.add(id);
  };

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.dataset.viz;
      const hit = registry.find(([rid]) => rid === id);
      if (hit) { drawOne(hit[0], hit[1]); obs.unobserve(e.target); }
    });
  }, { rootMargin: '120px 0px 0px 0px', threshold: 0 });

  const init = () => {
    registry.forEach(([id]) => {
      const host = document.getElementById(id);
      if (!host) return;
      const target = host.closest('figure, .card') || host;
      target.dataset.viz = id;
      io.observe(target);
    });
  };

  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      hideTip();
      registry.forEach(([id, fn]) => { if (drawn.has(id)) drawOne(id, fn); });
    }, 220);
  });

  window.__redrawCharts = () => registry.forEach(([id, fn]) => { if (drawn.has(id)) drawOne(id, fn); });

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
