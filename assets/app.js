/* WorldViews site — renders content/hub.md (Google Doc exported as Markdown).
   Website coding assisted with Claude (Anthropic). */
{
const CONTENT_URL = 'content/hub.md';
const CONFIG_URL = 'site.config.json';
const HUB = { name: 'Toulouse', lon: 1.44, lat: 43.6 };
const EMOJI = { calendar: '📅', dart: '🎯', pushpin: '📌', warning: '⚠️', link: '🔗' };
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

/* Approximate country centroids [lon, lat] — add a line here for any new country. */
const C = {
  'France':[2.3,46.6],'Germany':[10.4,51.1],'United States':[-98.5,39.8],'Russia':[45,56],'Türkiye':[35.2,39],
  'United Kingdom':[-2,53.5],'Japan':[138.5,36.5],'Austria':[14.5,47.5],'Indonesia':[113.9,-0.8],'India':[78.9,22],
  'New Zealand':[172,-41.5],'Serbia':[20.9,44],'Spain':[-3.7,40.3],'Netherlands':[5.3,52.1],'Czechia':[15.5,49.8],
  'Slovenia':[14.9,46.1],'Poland':[19.1,52],'Belgium':[4.5,50.5],'Italy':[12.6,42.8],'Portugal':[-8.2,39.4],
  'Switzerland':[8.2,46.8],'Sweden':[16,62],'Norway':[9,61],'Denmark':[9.5,56.3],'Finland':[25.7,62],'Ireland':[-8,53.4],
  'Greece':[21.8,39.1],'Hungary':[19.5,47.2],'Romania':[25,45.9],'Croatia':[15.2,45.1],'Slovakia':[19.7,48.7],
  'Bulgaria':[25.5,42.7],'Ukraine':[31.2,48.4],'Lithuania':[23.9,55.2],'Latvia':[24.6,56.9],'Estonia':[25,58.6],
  'Israel':[34.9,31],'Iran':[53.7,32.4],'Saudi Arabia':[45,23.9],'United Arab Emirates':[54,24],'Pakistan':[69.3,30.4],
  'Bangladesh':[90.4,23.7],'China':[104,35.9],'South Korea':[127.8,36],'Taiwan':[121,23.7],'Philippines':[121.8,12.9],
  'Vietnam':[108.3,14.1],'Thailand':[101,15.9],'Malaysia':[101.9,4.2],'Singapore':[103.8,1.35],'Australia':[134,-25.3],
  'Canada':[-106,56],'Mexico':[-102,23.6],'Brazil':[-51.9,-14.2],'Argentina':[-63.6,-38.4],'Chile':[-71.5,-35.7],
  'Colombia':[-74.3,4.6],'Peru':[-75,-9.2],'Ecuador':[-78.2,-1.8],'South Africa':[24.7,-29],'Nigeria':[8.7,9.1],
  'Kenya':[37.9,0],'Egypt':[30.8,26.8],'Morocco':[-7.1,31.8],'Ghana':[-1,7.9],'Ethiopia':[40.5,9.1],'Cameroon':[12.4,7.4],
  'Tunisia':[9.5,34],'Algeria':[2.6,28],'Kazakhstan':[66.9,48],'Georgia':[43.4,42.3],'Armenia':[45,40.1],'Lebanon':[35.9,33.9]
};
const ALIAS = { 'usa':'United States','us':'United States','united states of america':'United States','uk':'United Kingdom',
  'great britain':'United Kingdom','england':'United Kingdom','scotland':'United Kingdom','turkey':'Türkiye','turkiye':'Türkiye',
  'czech republic':'Czechia','new zeland':'New Zealand','russian federation':'Russia','holland':'Netherlands','korea':'South Korea' };

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const unesc = s => s.replace(/\\([!-\/:-@\[-`{-~])/g, '$1');
const plain = s => unesc(s).replace(/\*\*|__|\*/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
const md = s => marked.parse(s || '');
const slug = s => plain(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

/* ---------- 1. Clean Google Docs markdown ---------- */
function clean(t) {
  return t.replace(/\r/g, '')
    .replace(/!\[:([a-z_]+):\]\[image\d+\]/g, (m, n) => EMOJI[n] || '')
    .replace(/^\[\**[^\]\n]*\t\d+\**\]\(#[^)\n]*\)[ \t]*$/gm, '')   // Google table-of-contents lines
    .replace(/[ \t]*\{#[^}\n]*\}[ \t]*$/gm, '')                       // heading anchors {#...}
    .replace(/^(\s*[*-] )#{1,6} /gm, '$1')                            // headings inside bullets
    .replace(/^#{1,6}[ \t]*$/gm, '')                                  // empty headings
    .replace(/^Keywords:.*$/gm, '');                                  // editorial keywords
}

function split(text, level) {
  const h = '#'.repeat(level) + ' ', out = []; let cur = { title: '', body: [] };
  for (const line of text.split('\n')) {
    if (line.startsWith(h)) { out.push(cur); cur = { title: plain(line.slice(h.length)).replace(/:$/, ''), body: [] }; }
    else cur.body.push(line);
  }
  out.push(cur);
  return out.map(s => ({ title: s.title, body: s.body.join('\n').trim() })).filter(s => s.title || s.body);
}

function tables(text) {
  const blocks = [], lines = text.split('\n'); let i = 0;
  while (i < lines.length) {
    if (/^\s*\|/.test(lines[i])) {
      const rows = []; const start = i;
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim());
      const body = rows.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r)).map(cells);
      blocks.push({ head: body[0] || [], rows: body.slice(1), start, end: i, raw: rows.join('\n') });
    } else i++;
  }
  return blocks;
}

function fields(text) {
  const kv = [], rest = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\*\*([^*]+?):?\*\*\s*:?\s*(.*)$/);
    if (m && m[2] && !/^\d/.test(m[1])) kv.push([plain(m[1]).replace(/:$/, ''), m[2].trim()]);
    else rest.push(line);
  }
  return { kv, rest: rest.join('\n').trim() };
}

/* ---------- 2. Country helpers ---------- */
function countries(raw) {
  const s = plain(raw).toLowerCase();
  if (!s) return [];
  return s.split(/\s*(?:\/|,|;| and )\s*/).map(p => {
    if (/t[uü]rk/.test(p)) return 'Türkiye';
    if (ALIAS[p]) return ALIAS[p];
    return Object.keys(C).find(k => k.toLowerCase() === p) || p.replace(/\b\w/g, c => c.toUpperCase());
  });
}

/* ---------- 3. Renderers ---------- */
const nav = [];
function band(id, title, inner, cls = '') {
  if (title) nav.push([id, title]);
  return `<section class="band ${cls}" id="${id}"><div class="wrap">${title ? `<h2>${esc(title)}</h2>` : ''}${inner}</div></section>`;
}

function renderHot(body) {
  const tb = tables(body), qs = [];
  tb.forEach(t => { if (t.head.length === 1 && t.rows[0]) {
    const a = plain(t.rows[0][0]);
    if (a && a !== '-') qs.push(`<div class="q"><small>${esc(plain(t.head[0]))}</small><p>${md(unesc(t.rows[0][0])).replace(/<\/?p>/g,'')}</p></div>`);
  }});
  const stamp = (body.match(/Last update\s*([^*\n]+)/i) || [])[1];
  return { html: qs.length ? `<div class="hot">${qs.join('')}</div>` : '', stamp: stamp ? stamp.trim() : '' };
}

function renderNews(body) {
  const items = split(body, 2).filter(s => s.title);
  return items.map((s, i) => {
    const m = s.title.match(/^(\d{4})[.\-/](\d{2})[.\-/](\d{2})\s*[-–:]*\s*(.*)$/);
    const date = m ? `${m[1]}-${m[2]}-${m[3]}` : '';
    const title = m ? m[4] : s.title;
    const text = s.body.replace(/^\**Subject:?\**:?.*$/m, '');
    return `<details class="entry" ${i === 0 ? 'open' : ''}><summary>${date ? `<time datetime="${date}">${date}</time>` : ''}<span class="t">${esc(title)}</span></summary><div class="entry-body prose">${md(text)}</div></details>`;
  }).join('');
}

function monthIdx(s) { const m = s.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/g); return m ? m.map(x => MONTHS.indexOf(x.slice(0, 3))) : []; }

function renderTimeline(title, body) {
  const base = (title.match(/(\d{4})[.\-/](\d{1,2})/) || []);
  const Y = +base[1] || new Date().getFullYear(), M = (+base[2] || 1) - 1;
  const rows = body.split('\n').filter(l => /^\s*[*-]\s+/.test(l)).map(l => {
    const t = unesc(l.replace(/^\s*[*-]\s+/, '')); const k = t.indexOf(': ');
    if (k < 0) return null;
    const period = t.slice(0, k), label = t.slice(k + 2);
    const ms = monthIdx(period.split('(')[0]); if (!ms.length) return null;
    const s = ms[0], e = ms[ms.length - 1];
    const sy = s >= M - 1 ? Y : Y + 1, ey = sy + (e < s ? 1 : 0);
    const help = /coordinator required/i.test(label);
    return { period, label: label.replace(/\s*-\s*coordinator required/i, ''), help,
      start: new Date(sy, s, 1), end: new Date(ey, e + 1, 0), note: (period.match(/\((.*)\)/) || [])[1] };
  }).filter(Boolean);
  if (!rows.length) return `<div class="prose">${md(body)}</div>`;
  const t0 = new Date(Math.min(...rows.map(r => r.start))), t1 = new Date(Math.max(...rows.map(r => r.end)));
  const months = []; for (let d = new Date(t0); d <= t1; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
  const span = t1 - t0, pct = d => ((d - t0) / span * 100).toFixed(2), now = new Date();
  const head = `<div class="g-head"><div class="g-label">Phase</div><div class="g-months" style="grid-template-columns:repeat(${months.length},1fr)">${months.map(d => `<span>${d.toLocaleString('en', { month: 'short' })}${d.getMonth() === 0 || d === months[0] ? ' ' + String(d.getFullYear()).slice(2) : ''}</span>`).join('')}</div></div>`;
  const body2 = rows.map(r => {
    const st = now > r.end ? 'done' : now >= r.start ? 'ongoing' : 'upcoming';
    const pills = `<span class="pill ${st}">${st}</span>${r.help ? '<span class="pill help">coordinator wanted</span>' : ''}`;
    return `<div class="g-row ${st}"><div class="g-label">${esc(r.label)}${pills}<small>${esc(r.period.split('(')[0].trim())}${r.note ? ' · ' + esc(r.note) : ''}</small></div><div class="g-track">${now >= t0 && now <= t1 ? `<i class="g-today" style="left:${pct(now)}%" title="Today"></i>` : ''}<i class="g-bar" style="left:${pct(r.start)}%;width:${(pct(r.end) - pct(r.start)).toFixed(2)}%"></i></div></div>`;
  }).join('');
  return `<p class="muted">${esc(title)} · red line = today</p><div class="gantt">${head}${body2}</div>`;
}

function renderTasks(body) {
  const t = tables(body)[0]; if (!t) return `<div class="prose">${md(body)}</div>`;
  const head = t.head.map(h => plain(h.replace(/!\[[^\]]*\]\[[^\]]*\]/g, '')));
  const si = head.findIndex(h => /state|status/i.test(h));
  const cls = s => { s = s.toLowerCase(); return /done/.test(s) ? 'done' : /wip|progress/.test(s) ? 'wip' : /block/.test(s) ? 'blocked' : /wait/.test(s) ? 'wait' : 'todo'; };
  const states = [...new Set(t.rows.map(r => plain(r[si] || '')))].filter(Boolean);
  const rows = t.rows.map(r => `<tr data-s="${esc(plain(r[si] || ''))}">${r.map((c, i) => {
    let v = /^fichier$|^file$/i.test(plain(c)) ? '' : plain(c) === '-' ? '—' : md(unesc(c)).replace(/<\/?p>/g, '').trim();
    if (i === si) v = `<span class="state ${cls(plain(c))}">${esc(plain(c))}</span>`;
    return `<td>${v}</td>`; }).join('')}</tr>`).join('');
  return `<div class="filter" role="group" aria-label="Filter by state"><button aria-pressed="true" data-f="">All (${t.rows.length})</button>${states.map(s => `<button aria-pressed="false" data-f="${esc(s)}">${esc(s)} (${t.rows.filter(r => plain(r[si] || '') === s).length})</button>`).join('')}</div>
  <table class="stack tasks"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function parseMembers(body) {
  const t = tables(body)[0]; if (!t) return null;
  const head = t.head.map(h => plain(h).toLowerCase());
  const col = re => head.findIndex(h => re.test(h));
  const fi = col(/family/), gi = col(/first/), ci = col(/country/), ti = col(/task/), ri = col(/role/);
  const people = new Map();
  t.rows.forEach(r => {
    const name = [r[fi], r[gi]].map(x => plain(x || '')).filter(Boolean).join(' ');
    if (!name) return;
    const key = name.toLowerCase().split(/\s+/).sort().join(' ');
    const p = people.get(key) || { name, countries: countries(r[ci] || ''), roles: [] };
    p.roles.push({ tf: plain(r[ti] || '') || 'Lead team', role: plain(r[ri] || '') });
    people.set(key, p);
  });
  const list = [...people.values()], byCountry = {};
  list.forEach(p => p.countries.forEach(c => byCountry[c] = (byCountry[c] || 0) + 1));
  return { list, byCountry, intro: body.slice(0, body.indexOf('|')).trim() };
}

function renderMembers(m) {
  const sorted = Object.entries(m.byCountry).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const max = sorted.length ? sorted[0][1] : 1;
  const bars = sorted.map(([c, n]) => `<div><span>${esc(c)}</span><i style="width:${(n / max * 100).toFixed(1)}%"></i><em>${n}</em></div>`).join('');
  const groups = {};
  m.list.forEach(p => p.roles.forEach(r => (groups[r.tf] = groups[r.tf] || []).push([p, r.role])));
  const tbl = Object.entries(groups).map(([tf, ps]) => `<h3>${esc(tf)} <span class="muted" style="font:500 14px Inter">${ps.length}</span></h3>
    <table class="stack"><thead><tr><th>Name</th><th>Country</th><th>Role</th></tr></thead><tbody>${ps.map(([p, r]) => `<tr><td>${esc(p.name)}</td><td>${esc(p.countries.join(' / '))}</td><td>${esc(r)}</td></tr>`).join('')}</tbody></table>`).join('<br>');
  return `${m.intro ? `<div class="prose">${md(m.intro)}</div>` : ''}<h3>Researchers by country</h3><div class="bars">${bars}</div>${tbl}`;
}

function renderTaskforces(body, members) {
  return `<div class="cards">${split(body, 2).filter(s => s.title).map(s => {
    const f = fields(s.body), key = s.title.toLowerCase().slice(0, 6);
    const n = members ? members.list.filter(p => p.roles.some(r => r.tf.toLowerCase().startsWith(key))).length : 0;
    return `<article class="card"><h3>${esc(s.title)}${n ? `<small>${n} members</small>` : ''}</h3><dl class="kv">${f.kv.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${md(unesc(v)).replace(/<\/?p>/g, '')}</dd>`).join('')}</dl>${f.rest ? `<div class="prose">${md(f.rest)}</div>` : ''}</article>`;
  }).join('')}</div>`;
}

function renderAgreement(title, body) {
  const parts = split(body, 2);
  const intro = parts[0] && !parts[0].title ? parts.shift().body : '';
  return `<div class="prose">${md(intro)}</div>` + parts.map(p => {
    if (/at a glance/i.test(p.title)) {
      const items = p.body.split('\n').filter(l => /^\s*[*-]\s+/.test(l)).map(l => {
        const m = l.replace(/^\s*[*-]\s+/, '').match(/^\*\*([^*]+)\*\*\.?\s*(.*)$/);
        return m ? `<div><b>${esc(plain(m[1]))}</b><p>${md(unesc(m[2])).replace(/<\/?p>/g, '')}</p></div>` : '';
      }).join('');
      return `<h3>${esc(p.title)}</h3><div class="glance">${items}</div>`;
    }
    return `<details class="entry"><summary><span class="t">${esc(p.title)}</span></summary><div class="entry-body prose">${md(p.body)}</div></details>`;
  }).join('');
}

/* ---------- 4. Map ---------- */
function topoFeature(topo, obj) {
  const tr = topo.transform, arcs = topo.arcs.map(a => { let x = 0, y = 0; return a.map(([px, py]) => tr ? [(x += px) * tr.scale[0] + tr.translate[0], (y += py) * tr.scale[1] + tr.translate[1]] : [px, py]); });
  const ring = ids => { const pts = []; ids.forEach((i, k) => { let a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; if (k) a = a.slice(1); pts.push(...a); }); return pts; };
  const geom = g => g.type === 'Polygon' ? { type: 'Polygon', coordinates: g.arcs.map(ring) } : g.type === 'MultiPolygon' ? { type: 'MultiPolygon', coordinates: g.arcs.map(p => p.map(ring)) } : null;
  const gs = obj.type === 'GeometryCollection' ? obj.geometries : [obj];
  return { type: 'FeatureCollection', features: gs.map(g => ({ type: 'Feature', properties: {}, geometry: geom(g) })).filter(f => f.geometry) };
}
let LAND = null;
async function loadLand() {
  for (const u of ['assets/land-110m.json', 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json']) {
    try { const r = await fetch(u); if (!r.ok) continue; const t = await r.json(); return topoFeature(t, t.objects.land); } catch (e) { /* try next */ }
  }
  return null;
}
function drawMap(svg, byCountry) {
  const W = svg.clientWidth, H = svg.clientHeight; if (!W || !H) return;
  const proj = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' }), path = d3.geoPath(proj);
  const pts = Object.entries(byCountry).filter(([c]) => C[c]).map(([c, n]) => ({ c, n, ll: C[c] }));
  const r = n => 3 + Math.sqrt(n) * (W < 520 ? 1.8 : 2.6);
  const arcs = pts.filter(p => p.c !== 'France').map(p => `<path class="arc" d="${path({ type: 'LineString', coordinates: [[HUB.lon, HUB.lat], p.ll] })}"/>`).join('');
  const dots = pts.map(p => { const [x, y] = proj(p.ll); return `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r(p.n).toFixed(1)}"><title>${esc(p.c)}: ${p.n}</title></circle>`; }).join('');
  const [hx, hy] = proj([HUB.lon, HUB.lat]);
  const labels = W < 520 ? '' : pts.filter(p => !['France','Belgium','Netherlands','Austria','Czechia','Slovenia','Serbia','Germany','Poland','United Kingdom','Spain','Switzerland','Italy','Hungary','Slovakia','Croatia','Denmark'].includes(p.c)).map(p => { const [x, y] = proj(p.ll); return `<text class="lbl" x="${(x + r(p.n) + 4).toFixed(1)}" y="${(y + 4).toFixed(1)}">${esc(p.c)}</text>`; }).join('');
  svg.innerHTML = `<path class="sphere" d="${path({ type: 'Sphere' })}"/><path class="grat" d="${path(d3.geoGraticule10())}"/>${LAND ? `<path class="land" d="${path(LAND)}"/>` : ''}${arcs}${dots}<circle class="hub" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="6"><title>Coordination: Toulouse</title></circle>${labels}`;
}

/* ---------- 5. Assemble ---------- */
async function main() {
  const [raw, cfg] = await Promise.all([
    window.HUB_MD ? Promise.resolve(window.HUB_MD) : fetch(CONTENT_URL).then(r => r.text()),
    window.HUB_CONFIG ? Promise.resolve(window.HUB_CONFIG) : fetch(CONFIG_URL).then(r => r.json()).catch(() => ({}))
  ]);
  const text = clean(raw), secs = split(text, 1).filter(s => s.title);
  const hidden = (cfg.hideSections || []).map(s => s.toLowerCase());
  const aStart = (cfg.archiveStart || 'ARCHIVES').toLowerCase(), aEnd = (cfg.archiveEnd || 'INFORMATION LOG').toLowerCase();
  const membersSec = secs.find(s => /members/i.test(s.title) && /task/i.test(s.title));
  const members = membersSec ? parseMembers(membersSec.body) : null;

  let hero = { title: secs[0] ? secs[0].title : cfg.siteTitle, sub: '', body: '' }, i = 1;
  if (secs[0] && !secs[0].body && secs[1] && !/snapshot/i.test(secs[1].title)) { hero.sub = secs[1].title; hero.body = secs[1].body; i = 2; }
  else if (secs[0]) hero.body = secs[0].body;
  document.title = hero.title;

  const out = [], archive = []; let inArchive = false, hot = renderHot(hero.body);
  if (hot.html) out.push(band('news-now', 'Right now', hot.html + (hot.stamp ? `<p class="stamp">Last update ${esc(hot.stamp)}</p>` : '')));
  for (; i < secs.length; i++) {
    const s = secs[i], tl = s.title.toLowerCase(), id = slug(s.title);
    if (tl.includes(aStart)) { inArchive = true; continue; }
    if (inArchive && tl.includes(aEnd)) inArchive = false;
    if (inArchive) { archive.push(s); continue; }
    if (hidden.some(h => tl.startsWith(h))) continue;
    if (/^snapshot/.test(tl)) out.push(band('about', 'About the project', `<div class="prose" style="font-size:18px">${md(s.body)}</div>`));
    else if (/who leads/.test(tl)) out.push(band('leads', 'Who leads the project', `<div class="prose">${md(s.body)}</div>`));
    else if (/^goal/.test(tl)) out.push(band('goal', 'Goal', `<div class="prose">${md(s.body)}</div>`));
    else if (/^timeline/.test(tl)) out.push(band('timeline', 'Timeline', renderTimeline(s.title, s.body)));
    else if (/information log|newsletter/.test(tl)) out.push(band('news', 'News and newsletters', renderNews(s.body)));
    else if (/workflow/.test(tl)) out.push(band('workflow', 'Workflow and tasks', renderTasks(s.body)));
    else if (/members/.test(tl) && /task/.test(tl)) { if (members) out.push(band('team', 'Team', renderMembers(members))); }
    else if (/^task ?forces?$/.test(tl)) out.push(band('taskforces', 'Task forces', renderTaskforces(s.body, members)));
    else if (/agreement/.test(tl)) out.push(band('agreement', 'Collaborator agreement', `<div class="agree">${renderAgreement(s.title, s.body)}</div>`));
    else out.push(band(id, s.title, `<div class="prose">${md(s.body)}</div>`));
  }
  if (archive.length) out.push(band('archives', '', `<details class="entry archive"><summary><span class="t">Archives (${archive.length})</span></summary><div class="entry-body prose">${archive.map(a => `<h3>${esc(a.title)}</h3>${md(a.body)}`).join('')}</div></details>`));

  const nPeople = members ? members.list.length : 0, nCountries = members ? Object.keys(members.byCountry).length : 0;
  const nTF = members ? new Set(members.list.flatMap(p => p.roles.map(r => r.tf)).filter(t => t !== 'Lead team')).size : 0;
  const stats = [[nPeople, 'researchers involved'], [nCountries, 'countries'], [nTF, 'active task forces'], ...(cfg.extraStats || []).map(s => [s.value, s.label])].filter(s => s[0]);
  const btns = (cfg.buttons || []).map((b, k) => `<a class="btn ${k ? '' : 'solid'}" href="${esc(b.url)}">${esc(b.label)}</a>`).join('');
  const plate = `<section class="plate" id="top"><div class="wrap"><h1>${esc(hero.title)}</h1>${hero.sub ? `<p class="sub">${esc(hero.sub)}</p>` : ''}<div class="btns">${btns}</div>
    <div class="fig" role="img" aria-label="Map of the collaborator network: ${nCountries} countries linked to the coordination in Toulouse"><svg id="map"></svg></div>
    <div class="stats">${stats.map(([v, l]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div></div></section>`;

  $('#app').innerHTML = plate + out.join('');
  $('#nav').innerHTML = nav.map(([id, t]) => `<a href="#${id}">${esc(t.replace(/ and .*/, '').replace('Who leads the project', 'Contact'))}</a>`).join('');

  /* task filter */
  document.querySelectorAll('.filter').forEach(f => f.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    f.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    f.nextElementSibling.querySelectorAll('tbody tr').forEach(tr => tr.hidden = b.dataset.f && tr.dataset.s !== b.dataset.f);
  }));
  /* stack-table labels */
  document.querySelectorAll('.stack').forEach(t => { const h = [...t.querySelectorAll('thead th')].map(th => th.textContent); t.querySelectorAll('tbody tr').forEach(tr => [...tr.cells].forEach((c, k) => c.dataset.l = h[k] || '')); });
  /* open agreement when linked */
  const openHash = () => { const el = location.hash && document.getElementById(location.hash.slice(1)); if (el) { const d = el.querySelector('details'); if (d && location.hash === '#agreement') d.open = true; el.scrollIntoView(); } };
  if (location.hash) setTimeout(openHash, 50);

  const svg = $('#map');
  if (svg && members) {
    const draw = () => drawMap(svg, members.byCountry);
    const ro = new ResizeObserver(draw); ro.observe(svg);
    loadLand().then(l => { LAND = l; draw(); });
  }
  fetch('content/last-sync.txt').then(r => r.ok ? r.text() : '').then(t => { if (t && !/</.test(t)) $('#sync').textContent = 'Last synchronised with the Google Doc: ' + t.trim(); }).catch(() => {});
}
main().catch(e => { $('#app').innerHTML = `<section class="band"><div class="wrap"><h2>Content could not be loaded</h2><p class="muted">${esc(e.message)}</p></div></section>`; console.error(e); });
}
