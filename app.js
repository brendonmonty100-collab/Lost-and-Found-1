const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// in-memory data store, resets whenever the server restarts, that's fine for this project
let items = [];
let nextId = 1;

const CATEGORIES = ['Electronics', 'ID Card / Documents', 'Bag', 'Bottle / Lunchbox', 'Other', 'keys'];

// short icon labels used next to each category in the filter bar and item cards
const CATEGORY_ICON = {
  'Electronics': 'EL',
  'ID Card / Documents': 'ID',
  'Bag': 'BG',
  'Bottle / Lunchbox': 'BL',
  'Other': 'OT',
};

const STEPS = [
  {
    title: 'Report what you found',
    body: 'Fill in the item, where you found it and roughly when. The more specific the description, the faster the owner recognizes it.',
  },
  {
    title: 'The board lists it',
    body: 'Your entry appears immediately below, sorted with the newest reports first, so anyone checking the board sees it right away.',
  },
  {
    title: 'Owner comes forward',
    body: 'Once the owner is confirmed in person, whoever is holding the item marks it claimed. No account or login is needed for any of this.',
  },
];

const TIPS = [
  'Name the item the way its owner would search for it, for example "Grey Casio calculator" rather than just "calculator".',
  'Mention the building or room, not just "campus", so people know where to come and ask.',
  'Leave a name or contact detail in the reporter field so the owner knows who to look for.',
  'Mark an item claimed as soon as it is handed back, so the board stays accurate for everyone else.',
];

// escape user input so no one can inject HTML/script tags through the form
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const sha = process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || 'local';
const commit = sha.slice(0, 7);

function pageStyles() {
  return `
    :root {
      --ink: #1c2430;
      --ink-soft: #4b5563;
      --line: #dde2e8;
      --panel: #ffffff;
      --floor: #f4f6f8;
      --accent: #1d4ed8;
      --accent-ink: #14337c;
      --unclaimed-bg: #fdf1de;
      --unclaimed-ink: #92400e;
      --claimed-bg: #e5f4ea;
      --claimed-ink: #1e6b3c;
      font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--floor);
      color: var(--ink);
      line-height: 1.5;
    }
    a { color: var(--accent); }
    .top-bar {
      background: #101828;
      color: #e6e9ee;
      padding: 14px 24px;
    }
    .top-bar-inner {
      max-width: 1040px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .brand {
      font-weight: 700;
      font-size: 17px;
      letter-spacing: 0.2px;
    }
    .brand span { color: #93c5fd; }
    .top-links { display: flex; gap: 18px; font-size: 13px; }
    .top-links a { color: #cbd5e1; text-decoration: none; }
    .top-links a:hover { color: #ffffff; }

    .hero {
      background: #101828;
      color: #e6e9ee;
      padding: 40px 24px 56px;
    }
    .hero-inner { max-width: 1040px; margin: 0 auto; }
    .hero h1 {
      font-size: 28px;
      margin: 0 0 10px;
      max-width: 640px;
    }
    .hero p.lede {
      color: #b6bfcc;
      max-width: 560px;
      margin: 0 0 26px;
      font-size: 15px;
    }
    .stat-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .stat-card {
      background: #182236;
      border: 1px solid #263349;
      border-radius: 8px;
      padding: 14px 18px;
      min-width: 140px;
    }
    .stat-card .n {
      font-size: 22px;
      font-weight: 700;
    }
    .stat-card .l {
      font-size: 12px;
      color: #9aa5b4;
      margin-top: 2px;
    }

    .wrap {
      max-width: 1040px;
      margin: -30px auto 0;
      padding: 0 24px 60px;
    }

    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 26px;
      margin-bottom: 28px;
    }
    .panel h2 {
      font-size: 18px;
      margin: 0 0 4px;
    }
    .panel .sub {
      font-size: 13px;
      color: var(--ink-soft);
      margin: 0 0 20px;
    }

    .report-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px 16px;
    }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field.full { grid-column: 1 / -1; }
    .field label {
      font-size: 12px;
      font-weight: 600;
      color: var(--ink-soft);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    input[type=text], input:not([type]), select {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 9px 11px;
      font-size: 14px;
      background: #fff;
      color: var(--ink);
      font-family: inherit;
    }
    input:focus, select:focus {
      outline: 2px solid #bfdbfe;
      outline-offset: 1px;
      border-color: var(--accent);
    }
    .form-actions {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 4px;
    }

    button, .btn {
      background: var(--accent);
      color: #fff;
      border: 1px solid var(--accent-ink);
      border-radius: 6px;
      padding: 9px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    button:hover, .btn:hover { background: var(--accent-ink); }
    button.secondary, .btn.secondary {
      background: #fff;
      color: var(--ink);
      border: 1px solid var(--line);
    }
    button.secondary:hover, .btn.secondary:hover { background: var(--floor); }

    .filter-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .filter-row a {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      font-size: 13px;
      color: var(--ink);
      background: var(--floor);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 6px 12px;
    }
    .filter-row a.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent-ink);
    }
    .filter-row .icon {
      font-size: 10px;
      font-weight: 700;
      background: rgba(0,0,0,0.08);
      border-radius: 4px;
      padding: 1px 4px;
    }
    .filter-row a.active .icon { background: rgba(255,255,255,0.25); }

    .items-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
    }
    .item-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
      background: #fff;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .item-card .top-line {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .item-card h3 {
      margin: 0;
      font-size: 15px;
    }
    .cat-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--ink-soft);
      background: var(--floor);
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 2px 6px;
      white-space: nowrap;
    }
    .item-card .desc {
      font-size: 13.5px;
      color: var(--ink-soft);
    }
    .item-card .meta {
      font-size: 12px;
      color: #6b7280;
      border-top: 1px dashed var(--line);
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .status-pill {
      font-size: 11px;
      font-weight: 700;
      border-radius: 4px;
      padding: 3px 8px;
    }
    .status-pill.unclaimed { background: var(--unclaimed-bg); color: var(--unclaimed-ink); }
    .status-pill.claimed { background: var(--claimed-bg); color: var(--claimed-ink); }
    .item-card form { margin: 0; }
    .item-card button { padding: 6px 12px; font-size: 12.5px; }

    .empty-state {
      border: 1px dashed var(--line);
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      color: var(--ink-soft);
      font-size: 14px;
    }

    .steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .step {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }
    .step .num {
      display: inline-block;
      width: 22px;
      height: 22px;
      line-height: 22px;
      text-align: center;
      background: var(--accent);
      color: #fff;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    .step h3 { margin: 0 0 6px; font-size: 14.5px; }
    .step p { margin: 0; font-size: 13px; color: var(--ink-soft); }

    .two-col {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 28px;
    }
    .tip-list { margin: 0; padding-left: 18px; font-size: 13.5px; color: var(--ink-soft); }
    .tip-list li { margin-bottom: 8px; }

    .cat-breakdown {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cat-breakdown .row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }
    .cat-breakdown .row .name { flex: 1; color: var(--ink-soft); }
    .cat-breakdown .bar-track {
      flex: 2;
      background: var(--floor);
      border-radius: 4px;
      height: 8px;
      overflow: hidden;
    }
    .cat-breakdown .bar-fill {
      background: var(--accent);
      height: 100%;
    }
    .cat-breakdown .count { width: 22px; text-align: right; font-weight: 600; }

    footer {
      max-width: 1040px;
      margin: 0 auto;
      padding: 0 24px 40px;
      font-size: 12.5px;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    @media (max-width: 720px) {
      .report-grid, .items-grid, .steps, .two-col { grid-template-columns: 1fr; }
      .wrap { margin-top: -20px; }
    }
  `;
}

function renderStatRow(counts) {
  return `
    <div class="stat-row">
      <div class="stat-card"><div class="n">${counts.total}</div><div class="l">Items reported</div></div>
      <div class="stat-card"><div class="n">${counts.unclaimed}</div><div class="l">Still unclaimed</div></div>
      <div class="stat-card"><div class="n">${counts.claimed}</div><div class="l">Returned to owners</div></div>
    </div>
  `;
}

function renderReportForm() {
  return `
    <section class="panel">
      <h2>Report an item</h2>
      <p class="sub">Anyone can post here, no account needed. Fields marked required must be filled before the report is added to the board.</p>
      <form method="POST" action="/items" class="report-grid">
        <div class="field">
          <label for="itemName">Item name</label>
          <input id="itemName" name="itemName" placeholder="e.g. Grey Casio calculator" required>
        </div>
        <div class="field">
          <label for="category">Category</label>
          <select id="category" name="category" required>
            ${CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="field full">
          <label for="description">Where and when it was found</label>
          <input id="description" name="description" placeholder="e.g. Left on a bench outside the library, Tuesday afternoon" required>
        </div>
        <div class="field">
          <label for="reportedBy">Your name</label>
          <input id="reportedBy" name="reportedBy" placeholder="So the owner knows who to ask" required>
        </div>
        <div class="form-actions">
          <button type="submit">Add to board</button>
          <span style="font-size:12.5px;color:var(--ink-soft)">Reports appear on the board right after you submit.</span>
        </div>
      </form>
    </section>
  `;
}

function renderFilterRow(activeCategory) {
  const allLink = `<a href="/" class="${!activeCategory ? 'active' : ''}">All items</a>`;
  const catLinks = CATEGORIES.map((c) => {
    const isActive = activeCategory === c;
    return `<a href="/?category=${encodeURIComponent(c)}" class="${isActive ? 'active' : ''}">
      <span class="icon">${CATEGORY_ICON[c]}</span>${esc(c)}
    </a>`;
  }).join('');
  return `<div class="filter-row">${allLink}${catLinks}</div>`;
}

function renderItemCard(it) {
  const claimBtn = it.status === 'unclaimed'
    ? `<form method="POST" action="/items/${it.id}/claim">
         <button type="submit">Mark claimed</button>
       </form>`
    : '';
  return `
    <article class="item-card">
      <div class="top-line">
        <h3>${esc(it.itemName)}</h3>
        <span class="cat-tag">${esc(it.category)}</span>
      </div>
      <div class="desc">${esc(it.description)}</div>
      <div class="meta">
        <span>Reported by ${esc(it.reportedBy)}</span>
        <span class="status-pill ${it.status}">${it.status === 'unclaimed' ? 'Unclaimed' : 'Claimed'}</span>
      </div>
      ${claimBtn}
    </article>
  `;
}

function renderItemsSection(visibleItems, activeCategory) {
  const cards = visibleItems.slice().reverse().map(renderItemCard).join('');
  const emptyText = activeCategory
    ? `No unclaimed or claimed items reported yet in "${esc(activeCategory)}". Use the form above to add one.`
    : 'No items reported yet. Use the form above to be the first.';
  return `
    <section class="panel">
      <h2>Reported items</h2>
      <p class="sub">Newest reports appear first. Filter by category to narrow the list.</p>
      ${renderFilterRow(activeCategory)}
      <div class="items-grid">
        ${cards || `<div class="empty-state" style="grid-column:1/-1">${emptyText}</div>`}
      </div>
    </section>
  `;
}

function renderHowItWorks() {
  return `
    <section class="panel">
      <h2>How the board works</h2>
      <p class="sub">Three steps, no sign-up, handled entirely by whoever finds or loses something.</p>
      <div class="steps">
        ${STEPS.map((s, i) => `
          <div class="step">
            <span class="num">${i + 1}</span>
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.body)}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderTipsAndBreakdown(counts) {
  const maxCount = Math.max(1, ...CATEGORIES.map((c) => counts.byCategory[c] || 0));
  const breakdown = CATEGORIES.map((c) => {
    const n = counts.byCategory[c] || 0;
    const pct = Math.round((n / maxCount) * 100);
    return `
      <div class="row">
        <span class="name">${esc(c)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
        <span class="count">${n}</span>
      </div>
    `;
  }).join('');

  return `
    <section class="panel">
      <div class="two-col">
        <div>
          <h2>Reporting tips</h2>
          <p class="sub">A few habits that make the board more useful for everyone.</p>
          <ul class="tip-list">
            ${TIPS.map((t) => `<li>${esc(t)}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h2>Items by category</h2>
          <p class="sub">Counts across every report on the board right now.</p>
          <div class="cat-breakdown">${breakdown}</div>
        </div>
      </div>
    </section>
  `;
}

function computeCounts(list) {
  const byCategory = {};
  CATEGORIES.forEach((c) => { byCategory[c] = 0; });
  list.forEach((it) => {
    byCategory[it.category] = (byCategory[it.category] || 0) + 1;
  });
  return {
    total: list.length,
    unclaimed: list.filter((i) => i.status === 'unclaimed').length,
    claimed: list.filter((i) => i.status === 'claimed').length,
    byCategory,
  };
}

function renderPage(options = {}) {
  const activeCategory = CATEGORIES.includes(options.category) ? options.category : null;
  const visibleItems = activeCategory ? items.filter((i) => i.category === activeCategory) : items;
  const counts = computeCounts(items);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Campus Lost &amp; Found</title>
  <style>${pageStyles()}</style>
</head>
<body>
  <div class="top-bar">
    <div class="top-bar-inner">
      <div class="brand">Campus <span>Lost &amp; Found</span></div>
      <div class="top-links">
        <a href="/">Board</a>
        <a href="/api/items">API</a>
        <a href="/health">Status</a>
      </div>
    </div>
  </div>

  <div class="hero">
    <div class="hero-inner">
      <h1>Report a lost or found item and reconnect it with its owner.</h1>
      <p class="lede">This board is kept by students, for students. Post what you found, browse what others have reported, and mark an item claimed once it is back with its owner.</p>
      ${renderStatRow(counts)}
    </div>
  </div>

  <div class="wrap">
    ${renderReportForm()}
    ${renderItemsSection(visibleItems, activeCategory)}
    ${renderHowItWorks()}
    ${renderTipsAndBreakdown(counts)}
  </div>

  <footer>
    <span>Campus Lost &amp; Found Board</span>
    <span>commit ${esc(commit)}</span>
  </footer>
</body>
</html>`;
}

app.get('/', (req, res) => {
  res.send(renderPage({ category: req.query.category }));
});

app.post('/items', (req, res) => {
  const { itemName, category, description, reportedBy } = req.body;

  if (!itemName || !category || !description || !reportedBy) {
    return res.status(400).send('itemName, category, description and reportedBy are all required');
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).send('Invalid category');
  }

  items.push({
    id: nextId++,
    itemName,
    category,
    description,
    reportedBy,
    status: 'unclaimed',
  });

  res.redirect('/');
});

app.post('/items/:id/claim', (req, res) => {
  const id = Number(req.params.id);
  const item = items.find((i) => i.id === id);

  if (!item) {
    return res.status(404).send('Item not found');
  }

  item.status = 'claimed';
  res.redirect('/');
});

app.get('/api/items', (req, res) => res.json(items));

app.get('/health', (req, res) => res.json({ status: 'ok', commit }));

// exposed only so tests can reset state between test cases
app.resetForTests = () => {
  items = [];
  nextId = 1;
};

module.exports = app;
