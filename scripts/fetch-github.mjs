/* ═══════════════════════════════════════════════════════════
   fetch-github.mjs — runs in CI, writes data/github.json
   Uses GH_TOKEN (the profile owner's PAT) so private-repo
   contributions and events are included. Private repo names
   are masked before anything is written to the public site.
   ═══════════════════════════════════════════════════════════ */
import { mkdir, writeFile } from 'node:fs/promises';

const USER  = process.env.GH_USER || 'Ajish18';
const TOKEN = process.env.GH_TOKEN;
const OUT   = 'data/github.json';

if (!TOKEN) {
  console.log('GH_TOKEN not set — skipping snapshot, site will use live public APIs.');
  process.exit(0);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': `${USER}-portfolio`
};

const rest = async path => {
  const r = await fetch(`https://api.github.com${path}`, { headers });
  if (!r.ok) throw new Error(`${r.status} ${path}: ${await r.text()}`);
  return r.json();
};

const graphql = async (query, variables) => {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST', headers, body: JSON.stringify({ query, variables })
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
  return j.data;
};

const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const [gql, user, repos, events] = await Promise.all([
  graphql(`query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
    }
  }`, { login: USER }),
  rest(`/users/${USER}`),
  rest(`/users/${USER}/repos?per_page=100&sort=pushed`),
  /* authenticated as the owner, this includes private events */
  rest(`/users/${USER}/events?per_page=100`)
]);

const cal = gql.user.contributionsCollection.contributionCalendar;

const snapshot = {
  generatedAt: new Date().toISOString(),
  user: { public_repos: user.public_repos, created_at: user.created_at },
  calendar: {
    total: cal.totalContributions,
    contributions: cal.weeks.flatMap(w => w.contributionDays).map(d => ({
      date: d.date, count: d.contributionCount, level: LEVEL[d.contributionLevel] ?? 0
    }))
  },
  repos: repos.filter(r => !r.private).map(r => ({
    name: r.name, html_url: r.html_url, description: r.description,
    language: r.language, pushed_at: r.pushed_at
  })),
  events: events.map(e => ({
    type: e.type,
    public: e.public,
    created_at: e.created_at,
    repo: { name: e.public ? e.repo.name : null },
    payload: e.public
      ? { action: e.payload.action, ref_type: e.payload.ref_type, ref: e.payload.ref }
      : { action: e.payload.action, ref_type: e.payload.ref_type }
  }))
};

await mkdir('data', { recursive: true });
await writeFile(OUT, JSON.stringify(snapshot));
console.log(`Wrote ${OUT}: ${snapshot.calendar.total} contributions, ${snapshot.events.length} events.`);
