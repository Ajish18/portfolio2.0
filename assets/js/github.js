/* ═══════════════════════════════════════════════════════════
   github.js — live profile data, fetched fresh on every load
   Public endpoints only, no token, no build step.
   Every panel degrades to a readable fallback if a call fails.
   ═══════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const USER = 'Ajish18';
  const API  = 'https://api.github.com';
  const CAL  = `https://github-contributions-api.jogruber.de/v4/${USER}?y=last`;

  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const status = (state, text) => {
    const n = $('ghStatus');
    if (!n) return;
    n.dataset.state = state;
    n.lastElementChild.textContent = text;
  };

  const getJSON = async (url) => {
    const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  };

  /* ── relative time ──────────────────────────────────────── */
  const ago = iso => {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return 'just now';
    const m = s / 60;   if (m < 60)  return `${Math.floor(m)}m ago`;
    const h = m / 60;   if (h < 24)  return `${Math.floor(h)}h ago`;
    const d = h / 24;   if (d < 7)   return `${Math.floor(d)}d ago`;
    const w = d / 7;    if (w < 5)   return `${Math.floor(w)}w ago`;
    const mo = d / 30.4; if (mo < 12) return `${Math.floor(mo)}mo ago`;
    return `${Math.floor(d / 365)}y ago`;
  };
  const monthYear = iso => new Date(iso + 'T00:00:00')
    .toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

  const counter = (node, to, dec = 0) => {
    if (!node) return;
    const fmt = v => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduced) { node.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 900;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      node.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ═══════════════ contribution calendar ═════════════════ */
  function renderHeatmap(days) {
    const host = $('heatmap');
    if (!host || !days.length) return;

    /* pad the first week so every column is a real Sun→Sat week */
    const lead = new Date(days[0].date + 'T00:00:00').getDay();
    const cells = Array(lead).fill(null).concat(days);
    const weeks = Math.ceil(cells.length / 7);

    const CELL = 11, GAP = 3, TOP = 18, LEFT = 26, RIGHT = 22;
    const W = LEFT + weeks * (CELL + GAP) + RIGHT;
    const H = TOP + 7 * (CELL + GAP);

    const NS = 'http://www.w3.org/2000/svg';
    const el = (n, a, p) => {
      const x = document.createElementNS(NS, n);
      for (const k in a) if (a[k] != null) x.setAttribute(k, a[k]);
      if (p) p.appendChild(x);
      return x;
    };

    host.textContent = '';
    const svg = el('svg', {
      viewBox: `0 0 ${W} ${H}`, style: 'width:100%;height:auto;min-width:680px',
      preserveAspectRatio: 'xMinYMin meet'
    }, host);

    ['Mon', 'Wed', 'Fri'].forEach((lbl, i) => {
      el('text', { x: 0, y: TOP + (i * 2 + 1) * (CELL + GAP) + 9, class: 'ax-label' }, svg).textContent = lbl;
    });

    let lastMonth = -1;
    cells.forEach((d, i) => {
      const col = Math.floor(i / 7), row = i % 7;
      if (d) {
        const dt = new Date(d.date + 'T00:00:00');
        if (row === 0 && dt.getMonth() !== lastMonth) {
          lastMonth = dt.getMonth();
          el('text', { x: LEFT + col * (CELL + GAP), y: 11, class: 'ax-label' }, svg)
            .textContent = dt.toLocaleDateString('en-GB', { month: 'short' });
        }
      }
      if (!d) return;

      const rect = el('rect', {
        x: LEFT + col * (CELL + GAP), y: TOP + row * (CELL + GAP),
        width: CELL, height: CELL, rx: 2.5,
        class: `cell lv${d.level}`
      }, svg);

      if (!reduced) {
        rect.style.opacity = '0';
        rect.style.transition = `opacity .5s ease ${Math.min(700, col * 6)}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => { rect.style.opacity = '1'; }));
      }

      const label = `${d.count === 0 ? 'No' : d.count} contribution${d.count === 1 ? '' : 's'}`;
      window.__bindTip?.(rect, () => `<span class="tt-title">${label}</span>
        <div class="muted">${new Date(d.date + 'T00:00:00')
          .toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>`);
    });

    const r = $('heatRange');
    if (r) r.textContent = `${monthYear(days[0].date)} — ${monthYear(days[days.length - 1].date)}`;
  }

  const streakOf = days => {
    let n = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) n++;
      else if (i === days.length - 1) continue;  /* today may not be logged yet */
      else break;
    }
    return n;
  };

  /* ═══════════════ languages ═════════════════════════════ */
  function renderLanguages(repos) {
    const host = $('langChart');
    if (!host) return;

    const tally = {};
    repos.forEach(r => { if (r.language) tally[r.language] = (tally[r.language] || 0) + 1; });
    const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!rows.length) { host.innerHTML = '<p class="muted">No language data.</p>'; return; }

    const max = rows[0][1];
    const W = 420, rowH = 34, H = rows.length * rowH + 4;
    const labelW = 128, plotW = W - labelW - 42;

    const NS = 'http://www.w3.org/2000/svg';
    const el = (n, a, p) => {
      const x = document.createElementNS(NS, n);
      for (const k in a) if (a[k] != null) x.setAttribute(k, a[k]);
      if (p) p.appendChild(x);
      return x;
    };

    host.textContent = '';
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, style: 'width:100%;height:auto' }, host);

    rows.forEach(([lang, n], i) => {
      const y = i * rowH + 6, bh = 18;
      const w = (n / max) * plotW;

      el('text', { x: labelW - 12, y: y + bh / 2 + 4, class: 'dl-name', 'text-anchor': 'end' }, svg)
        .textContent = lang;
      el('rect', { x: labelW, y, width: plotW, height: bh, rx: 5, fill: 'var(--line-soft)' }, svg);

      const bar = el('rect', {
        x: labelW, y, width: reduced ? w : 0, height: bh, rx: 5, fill: 'var(--series-1)'
      }, svg);
      if (!reduced) {
        bar.style.transition = `width .9s cubic-bezier(.32,.72,0,1) ${i * 80}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => bar.setAttribute('width', w)));
      }

      el('text', { x: labelW + w + 9, y: y + bh / 2 + 4, class: 'dl-val' }, svg).textContent = n;

      const hit = el('rect', { x: labelW, y: y - 5, width: plotW, height: bh + 10, class: 'hit' }, svg);
      window.__bindTip?.(hit, () => `<span class="tt-title">${lang}</span>
        <div class="tt-row"><i style="background:var(--series-1)"></i><b>${n}</b>&nbsp;${n === 1 ? 'repository' : 'repositories'}</div>`);
    });
  }

  /* ═══════════════ activity feed ═════════════════════════ */
  const VERB = {
    PushEvent:            e => ['Pushed to', e.repo.name],
    CreateEvent:          e => [`Created ${e.payload.ref_type}`, e.payload.ref ? `${e.repo.name} · ${e.payload.ref}` : e.repo.name],
    IssuesEvent:          e => [`${e.payload.action[0].toUpperCase() + e.payload.action.slice(1)} issue in`, e.repo.name],
    IssueCommentEvent:    e => ['Commented in', e.repo.name],
    PullRequestEvent:     e => [`${e.payload.action[0].toUpperCase() + e.payload.action.slice(1)} pull request in`, e.repo.name],
    WatchEvent:           e => ['Starred', e.repo.name],
    ForkEvent:            e => ['Forked', e.repo.name],
    DeleteEvent:          e => [`Deleted ${e.payload.ref_type}`, e.repo.name],
    ReleaseEvent:         e => ['Released in', e.repo.name]
  };

  function renderFeed(events) {
    const host = $('ghFeed');
    if (!host) return;
    const rows = events.slice(0, 6).map(e => {
      const [verb, what] = (VERB[e.type] || (x => ['Activity in', x.repo.name]))(e);
      return `<li>
        <span class="gf-dot" aria-hidden="true"></span>
        <div class="gf-body">
          <span class="gf-verb">${verb}</span>
          <a class="gf-repo" href="https://github.com/${what.split(' · ')[0]}" target="_blank" rel="noopener">${what}</a>
        </div>
        <time datetime="${e.created_at}">${ago(e.created_at)}</time>
      </li>`;
    });
    host.innerHTML = rows.join('') || '<li class="muted">No public activity in the last 90 days.</li>';
  }

  /* ═══════════════ repo list ═════════════════════════════ */
  function renderRepos(repos) {
    const host = $('ghRepoList');
    if (!host) return;
    host.innerHTML = repos.slice(0, 4).map(r => `
      <li>
        <a href="${r.html_url}" target="_blank" rel="noopener">
          <div class="gr-top">
            <b>${r.name}</b>
            ${r.language ? `<span class="gr-lang">${r.language}</span>` : ''}
          </div>
          <p>${r.description ? r.description.replace(/[<>]/g, '') : 'No description'}</p>
          <span class="gr-time">Updated ${ago(r.pushed_at)}</span>
        </a>
      </li>`).join('');
  }

  /* ═══════════════ boot ══════════════════════════════════ */
  async function load() {
    status('sync', 'syncing');
    let ok = 0, failed = 0;

    const [user, repos, events, cal] = await Promise.allSettled([
      getJSON(`${API}/users/${USER}`),
      getJSON(`${API}/users/${USER}/repos?per_page=100&sort=pushed`),
      getJSON(`${API}/users/${USER}/events/public?per_page=100`),
      getJSON(CAL)
    ]);

    if (cal.status === 'fulfilled' && cal.value.contributions?.length) {
      const days = cal.value.contributions.filter(d => d.date <= new Date().toISOString().slice(0, 10));
      const total = cal.value.total?.lastYear ?? days.reduce((a, d) => a + d.count, 0);
      counter($('ghContrib'), total);
      $('ghContribSub').textContent = `across ${days.filter(d => d.count > 0).length} active days`;
      const st = streakOf(days);
      counter($('ghStreak'), st);
      $('ghStreakSub').textContent = st === 1 ? 'day in a row' : 'days in a row';
      renderHeatmap(days);
      ok++;
    } else {
      failed++;
      $('ghContrib').textContent = '—';
      $('ghContribSub').textContent = 'calendar unavailable';
      $('ghStreak').textContent = '—';
      $('ghStreakSub').textContent = 'calendar unavailable';
      const h = $('heatmap');
      if (h) h.innerHTML = `<p class="muted gh-empty">Contribution calendar couldn't be loaded right now —
        <a class="link" href="https://github.com/${USER}" target="_blank" rel="noopener">view it on GitHub</a>.</p>`;
    }

    if (user.status === 'fulfilled') {
      counter($('ghRepos'), user.value.public_repos);
      const since = new Date(user.value.created_at)
        .toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      $('ghReposSub').textContent = `on GitHub since ${since}`;
      ok++;
    } else { failed++; $('ghReposSub').textContent = 'unavailable'; }

    if (repos.status === 'fulfilled' && repos.value.length) {
      const list = repos.value;
      const last = list[0];
      $('ghLast').textContent = ago(last.pushed_at);
      $('ghLastSub').textContent = last.name;
      renderLanguages(list);
      renderRepos(list);
      ok++;
    } else {
      failed++;
      $('ghLast').textContent = '—';
      $('ghLastSub').textContent = 'unavailable';
      $('ghRepoList').innerHTML = '';
      $('langChart').innerHTML = '<p class="muted gh-empty">Repository data unavailable.</p>';
    }

    if (events.status === 'fulfilled') { renderFeed(events.value); ok++; }
    else {
      failed++;
      $('ghFeed').innerHTML = `<li class="muted">Activity feed unavailable —
        <a class="link" href="https://github.com/${USER}" target="_blank" rel="noopener">open GitHub</a>.</li>`;
    }

    if (!ok) status('down', 'offline');
    else if (failed) status('partial', 'partial');
    else status('live', 'live');
  }

  const start = () => {
    const section = $('ghConsole');
    if (!section) return;
    /* fetch as the section approaches, so the numbers animate in on arrival */
    new IntersectionObserver((e, o) => {
      if (!e[0].isIntersecting) return;
      o.disconnect();
      load().catch(() => status('down', 'offline'));
    }, { rootMargin: '300px 0px' }).observe(section);
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else start();
})();
