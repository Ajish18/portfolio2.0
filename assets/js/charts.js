/* ═══════════════════════════════════════════════════════════
   charts.js — hand-rolled SVG charts (no libraries)
   Colours come from CSS custom properties, so the theme
   toggle repaints every mark for free.
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

  const svgRoot = (host, w, h) => {
    host.textContent = '';
    const s = el('svg', {
      viewBox: `0 0 ${w} ${h}`,
      role: 'presentation',
      preserveAspectRatio: 'xMidYMid meet',
      style: 'width:100%;height:auto'
    }, host);
    return s;
  };

  /* ── shared tooltip ─────────────────────────────────────── */
  const tip = document.getElementById('tip');
  const showTip = (html, x, y) => {
    if (!tip) return;
    tip.innerHTML = html;
    tip.hidden = false;
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.style.opacity = '1';
  };
  const hideTip = () => { if (tip) { tip.style.opacity = '0'; tip.hidden = true; } };
  const swatch = c => `<i style="background:${c}"></i>`;
  document.addEventListener('scroll', hideTip, { passive: true });

  /* Attach pointer handlers to a hit area. */
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

  /* rect with the top two corners rounded — data-end rounded, baseline square */
  const roundedTop = (x, y, w, h, r) => {
    const rr = Math.max(0, Math.min(r, w / 2, h));
    return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} ` +
           `L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
  };

  const fmt = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  /* ═══════════════ 1 · Impact bars (horizontal, 1 series) ══ */
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
    const s = svgRoot(host, W, H);
    const x = v => (v / 100) * plotW;

    /* recessive gridlines at 25 % steps */
    for (let v = 0; v <= 100; v += 25) {
      el('line', {
        x1: labelW + x(v), x2: labelW + x(v), y1: padT, y2: padT + IMPACT.length * rowH,
        class: 'gridline'
      }, s);
      el('text', {
        x: labelW + x(v), y: H - 8, class: 'ax-val', 'text-anchor': 'middle'
      }, s).textContent = `${v}%`;
    }

    IMPACT.forEach((d, i) => {
      const y = padT + i * rowH + 13;
      const bh = 22;

      el('text', { x: labelW - 14, y: y + bh / 2 + 4, class: 'dl-name', 'text-anchor': 'end' }, s)
        .textContent = d.label;

      /* track */
      el('rect', {
        x: labelW, y, width: plotW, height: bh, rx: 6,
        fill: 'var(--hairline-soft)'
      }, s);

      /* value bar — 4px rounded end, anchored to the baseline */
      const bar = el('rect', {
        x: labelW, y, width: reduced ? x(d.value) : 0, height: bh, rx: 6,
        fill: 'var(--series-1)'
      }, s);
      if (!reduced) {
        bar.style.transition = `width 1.05s cubic-bezier(.22,1.2,.36,1) ${i * 110}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => bar.setAttribute('width', x(d.value))));
      }

      /* direct label — the relief rule: every bar carries its number */
      const lab = el('text', {
        x: labelW + x(d.value) + 10, y: y + bh / 2 + 4.5, class: 'dl-val'
      }, s);
      lab.textContent = `${d.value}%`;
      if (!reduced) {
        lab.style.opacity = '0';
        lab.style.transition = `opacity .5s ease ${600 + i * 110}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => { lab.style.opacity = '1'; }));
      }

      const hit = el('rect', { x: labelW, y: y - 8, width: plotW, height: bh + 16, class: 'hit' }, s);
      bindHit(hit, () => `<span class="tt-title">${d.label}</span>
        <div class="tt-row">${swatch('var(--series-1)')}<b>${d.value}%</b> reduction</div>
        <div class="muted" style="margin-top:3px">${d.note}</div>`);
    });
  }

  /* ═══════════════ 2 · Line chart (1 series) ══════════════ */
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MINUTES = [185, 168, 140, 122, 96, 74, 58, 41, 30, 19, 11, 6];

  function drawLine(host) {
    const W = Math.max(380, host.clientWidth || 520);
    const H = 250;
    const m = { t: 14, r: 14, b: 30, l: 40 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const s = svgRoot(host, W, H);

    const maxY = 200;
    const x = i => m.l + (i / (MINUTES.length - 1)) * pw;
    const y = v => m.t + ph - (v / maxY) * ph;

    [0, 50, 100, 150, 200].forEach(v => {
      el('line', { x1: m.l, x2: m.l + pw, y1: y(v), y2: y(v), class: 'gridline' }, s);
      el('text', { x: m.l - 9, y: y(v) + 4, class: 'ax-val', 'text-anchor': 'end' }, s).textContent = v;
    });
    MONTHS.forEach((mo, i) => {
      if (W < 460 && i % 2) return;
      el('text', { x: x(i), y: H - 9, class: 'ax-label', 'text-anchor': 'middle' }, s).textContent = mo;
    });

    const pts = MINUTES.map((v, i) => [x(i), y(v)]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

    const gid = 'lineFade';
    const defs = el('defs', {}, s);
    const g = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0%',   'stop-color': 'var(--series-1)', 'stop-opacity': '.28' }, g);
    el('stop', { offset: '100%', 'stop-color': 'var(--series-1)', 'stop-opacity': '0' }, g);

    const area = el('path', {
      d: `${line} L${x(MINUTES.length - 1)},${m.t + ph} L${m.l},${m.t + ph} Z`,
      fill: `url(#${gid})`
    }, s);

    const path = el('path', {
      d: line, fill: 'none', stroke: 'var(--series-1)', 'stroke-width': 2,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }, s);

    if (!reduced) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.transition = 'stroke-dashoffset 1.7s cubic-bezier(.4,0,.2,1)';
      area.style.opacity = '0';
      area.style.transition = 'opacity 1.2s ease .5s';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        path.style.strokeDashoffset = '0';
        area.style.opacity = '1';
      }));
    }

    /* endpoint marker + direct label (selective: first and last only) */
    const mark = el('circle', { cx: x(11), cy: y(MINUTES[11]), r: 5,
      fill: 'var(--series-1)', stroke: 'var(--viz-surface)', 'stroke-width': 2 }, s);
    if (!reduced) {
      mark.style.opacity = '0';
      mark.style.transition = 'opacity .4s ease 1.6s';
      requestAnimationFrame(() => requestAnimationFrame(() => { mark.style.opacity = '1'; }));
    }
    el('text', { x: x(11) - 6, y: y(MINUTES[11]) - 13, class: 'dl-val', 'text-anchor': 'end' }, s)
      .textContent = '6 min';
    el('text', { x: x(0) + 10, y: y(MINUTES[0]) + 20, class: 'dl-val' }, s).textContent = '185 min';

    /* crosshair + per-point hover */
    const cross = el('line', {
      x1: 0, x2: 0, y1: m.t, y2: m.t + ph,
      stroke: 'var(--grid)', 'stroke-width': 1.5, opacity: 0
    }, s);
    const dot = el('circle', { r: 5, fill: 'var(--series-1)',
      stroke: 'var(--viz-surface)', 'stroke-width': 2, opacity: 0 }, s);

    MINUTES.forEach((v, i) => {
      const bw = pw / (MINUTES.length - 1);
      const hit = el('rect', {
        x: x(i) - bw / 2, y: m.t, width: bw, height: ph, class: 'hit'
      }, s);
      hit.addEventListener('pointerenter', () => {
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
        cross.setAttribute('opacity', 1);
        dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(v));
        dot.setAttribute('opacity', 1);
      });
      hit.addEventListener('pointerleave', () => {
        cross.setAttribute('opacity', 0); dot.setAttribute('opacity', 0);
      });
      bindHit(hit, () => `<span class="tt-title">${MONTHS[i]}</span>
        <div class="tt-row">${swatch('var(--series-1)')}<b>${v} min</b> per invoice</div>`);
    });
  }

  /* ═══════════════ 3 · Stacked bars (3 series) ════════════ */
  const STACK = {
    weeks: ['W1','W2','W3','W4','W5','W6','W7','W8'],
    series: [
      { name: 'Completed',   color: 'var(--series-1)', data: [42, 51, 48, 63, 58, 71, 77, 84] },
      { name: 'In Progress', color: 'var(--series-2)', data: [18, 16, 21, 17, 22, 19, 16, 14] },
      { name: 'Open',        color: 'var(--series-3)', data: [12, 14, 11, 15,  9, 12, 10,  8] }
    ]
  };

  function drawStack(host) {
    const W = Math.max(380, host.clientWidth || 520);
    const H = 250;
    const m = { t: 14, r: 10, b: 30, l: 34 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const s = svgRoot(host, W, H);

    const totals = STACK.weeks.map((_, i) => STACK.series.reduce((a, sr) => a + sr.data[i], 0));
    const maxY = Math.ceil(Math.max(...totals) / 25) * 25;
    const y = v => m.t + ph - (v / maxY) * ph;
    const band = pw / STACK.weeks.length;
    const bw = Math.min(34, band * 0.58);

    for (let v = 0; v <= maxY; v += 25) {
      el('line', { x1: m.l, x2: m.l + pw, y1: y(v), y2: y(v), class: 'gridline' }, s);
      el('text', { x: m.l - 8, y: y(v) + 4, class: 'ax-val', 'text-anchor': 'end' }, s).textContent = v;
    }

    STACK.weeks.forEach((wk, i) => {
      const cx = m.l + band * i + band / 2;
      el('text', { x: cx, y: H - 9, class: 'ax-label', 'text-anchor': 'middle' }, s).textContent = wk;

      let acc = 0;
      STACK.series.forEach((sr, k) => {
        const v = sr.data[i];
        const top = y(acc + v);
        const bottom = y(acc);
        /* 2px surface gap between stacked segments */
        const gap = k === 0 ? 0 : 2;
        const h = Math.max(1, bottom - top - gap);
        const isTop = k === STACK.series.length - 1;
        const rect = el('path', { fill: sr.color }, s);
        const shape = hh => roundedTop(cx - bw / 2, top + (h - hh), bw, hh, isTop ? 4 : 0);
        rect.setAttribute('d', shape(reduced ? h : 0));
        if (!reduced) {
          rect.style.transition = `d .8s cubic-bezier(.22,1.2,.36,1) ${i * 55 + k * 40}ms`;
          let t0 = null;
          const dur = 800, delay = i * 55 + k * 40;
          const ease = p => 1 - Math.pow(1 - p, 3);
          const step = now => {
            if (t0 === null) t0 = now;
            const p = Math.min(1, Math.max(0, (now - t0 - delay) / dur));
            rect.setAttribute('d', shape(h * ease(p)));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
        acc += v;
      });

      const hit = el('rect', { x: m.l + band * i, y: m.t, width: band, height: ph, class: 'hit' }, s);
      bindHit(hit, () => `<span class="tt-title">Week ${i + 1}</span>` +
        STACK.series.map(sr =>
          `<div class="tt-row">${swatch(sr.color)}${sr.name} <b style="margin-left:auto">${sr.data[i]}</b></div>`
        ).join('') +
        `<div class="tt-row" style="margin-top:4px;border-top:1px solid var(--hairline-soft);padding-top:4px">
           Total <b style="margin-left:auto">${totals[i]}</b></div>`);
    });

    const legend = document.getElementById('stackLegend');
    if (legend) {
      legend.innerHTML = STACK.series
        .map(sr => `<span><i style="background:${sr.color}"></i>${sr.name}</span>`).join('');
    }
  }

  /* ═══════════════ 4 · Donut (3 slices) ═══════════════════ */
  const DONUT = [
    { name: 'Central Store', value: 46, amount: '₹ 18.4 L', color: 'var(--series-1)' },
    { name: 'Service Bay',   value: 33, amount: '₹ 13.2 L', color: 'var(--series-2)' },
    { name: 'In Transit',    value: 21, amount: '₹  8.4 L', color: 'var(--series-3)' }
  ];

  function drawDonut(host) {
    const W = 220, H = 220, R = 96, r = 62, cx = W / 2, cy = H / 2;
    const s = svgRoot(host, W, H);
    s.style.maxWidth = '220px';

    const arc = (a0, a1) => {
      const p = (ang, rad) => [
        cx + rad * Math.cos((ang - 90) * Math.PI / 180),
        cy + rad * Math.sin((ang - 90) * Math.PI / 180)
      ];
      const large = a1 - a0 > 180 ? 1 : 0;
      const [x1, y1] = p(a0, R), [x2, y2] = p(a1, R);
      const [x3, y3] = p(a1, r), [x4, y4] = p(a0, r);
      return `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${large} 0 ${x4},${y4} Z`;
    };

    let angle = 0;
    const gapDeg = 2.2; /* surface gap between slices */
    DONUT.forEach((d, i) => {
      const sweep = (d.value / 100) * 360;
      const a0 = angle + gapDeg / 2, a1 = angle + sweep - gapDeg / 2;
      const path = el('path', { d: arc(a0, a1), fill: d.color, style: 'transform-origin:center' }, s);
      path.style.cursor = 'pointer';
      if (!reduced) {
        path.style.opacity = '0';
        path.style.transform = 'scale(.82)';
        path.style.transition = `opacity .5s ease ${i * 130}ms, transform .8s cubic-bezier(.22,1.2,.36,1) ${i * 130}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          path.style.opacity = '1'; path.style.transform = 'scale(1)';
        }));
      }
      path.addEventListener('pointerenter', () => { path.style.transform = 'scale(1.04)'; });
      path.addEventListener('pointerleave', () => { path.style.transform = 'scale(1)'; });
      bindHit(path, () => `<span class="tt-title">${d.name}</span>
        <div class="tt-row">${swatch(d.color)}<b>${d.value}%</b> · ${d.amount}</div>`);
      angle += sweep;
    });

    el('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', class: 'dl-val',
      style: 'font-size:26px;letter-spacing:-.03em' }, s).textContent = '₹40 L';
    el('text', { x: cx, y: cy + 17, 'text-anchor': 'middle', class: 'ax-label' }, s)
      .textContent = 'total stock value';

    const legend = document.getElementById('donutLegend');
    if (legend) {
      legend.innerHTML = DONUT.map(d => `
        <div class="dl">
          <i style="background:${d.color}"></i>
          <div><b style="font-weight:550">${d.name}</b><small>${d.amount}</small></div>
          <b>${d.value}%</b>
        </div>`).join('');
    }
  }

  /* ═══════════════ boot ═══════════════════════════════════ */
  const registry = [
    ['impactBars', drawImpact],
    ['lineChart',  drawLine],
    ['stackChart', drawStack],
    ['donutChart', drawDonut]
  ];

  const drawn = new Set();
  const drawOne = (id, fn, force) => {
    const host = document.getElementById(id);
    if (!host || host.offsetParent === null && !force) return;
    fn(host);
    drawn.add(id);
  };

  /* An undrawn .viz host has zero height, so a ratio threshold would never
     fire — observe the surrounding panel and use plain isIntersecting. */
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.dataset.viz;
      const hit = registry.find(([rid]) => rid === id);
      if (hit) { drawOne(hit[0], hit[1], true); obs.unobserve(e.target); }
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
    /* belt and braces: anything still blank once the page settles gets drawn */
    setTimeout(() => registry.forEach(([id, fn]) => {
      const host = document.getElementById(id);
      if (host && !host.querySelector('svg') && host.getBoundingClientRect().top < innerHeight * 2) {
        drawOne(id, fn, true);
      }
    }), 2500);
  };

  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      hideTip();
      registry.forEach(([id, fn]) => { if (drawn.has(id)) drawOne(id, fn, true); });
    }, 220);
  });

  /* charts hidden behind a tab need a redraw when the tab opens */
  window.__redrawCharts = () => registry.forEach(([id, fn]) => { if (drawn.has(id)) drawOne(id, fn, true); });

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
