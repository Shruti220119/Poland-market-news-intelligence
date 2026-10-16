/* ═══ Poland Energy Market Intelligence v6 — headline & link patch ═══
   Load AFTER the main dashboard script:  <script src="headline-patch.js"></script>  (just before </body>)

   Live News Feed      → publisher's EXACT headline + a working article link
                         (Polish headlines shown in Polish, with an English translation underneath)
   Signal Intelligence → rephrased signal headline + summary

   Exact headlines come from data/headlines.json (written daily by the "Verify headlines and links"
   workflow) and data/signals.json (live RSS items, which already carry the exact headline).
   Curated items without a verified headline stay in Signal Intelligence only.            */
(function () {
  /* Headlines checked by hand (same as config/headline_overrides.json) — used until headlines.json loads */
  let H = {
    x2: {title: "Engie acquires 438-MW battery storage project in Poland", url: "https://renewablesnow.com/news/engie-acquires-438-mw-battery-storage-project-in-poland-1300726/"},
    x3: {title: "EIB contributes over €260 million to Poland's second-largest onshore wind farm", url: "https://www.eib.org/en/press/all/2026-264-eib-contributes-over-eur260-million-to-poland-s-second-largest-onshore-wind-farm"},
    x4: {title: "Operatorzy łączą siły: wspólna platforma na Giełdzie zmieni zarządzanie siecią energetyczną w Polsce", url: "https://energa-operator.pl/aktualnosci/873585/operatorzy-lacza-sily-wspolna-platforma-na-gieldzie-zmieni-zarzadzanie-siecia-energetyczna-w-polsce", title_en: "Operators join forces: a common platform on the Exchange will change power grid management in Poland"},
    x5: {title: "Magazyny energii jednym z filarów bezpieczeństwa Polski. Minister Energii Miłosz Motyka podpisał strategiczny list intencyjny z TAURONEM", url: "https://www.gov.pl/web/energia/magazyny-energii-jednym-z-filarow-bezpieczenstwa-polski-minister-energii-milosz-motyka-podpisal-strategiczny-list-intencyjny-z-tauronem", title_en: "Energy storage is one of the pillars of Poland's security. Energy Minister Miłosz Motyka signs strategic letter of intent with TAURON"},
    r1: {title: "Poland approves overhaul of power grid connection rules", url: "https://www.polskieradio.pl/395/7786/Artykul/3630987,poland-approves-overhaul-of-power-grid-connection-rules"},
    p1: {title: "Poland allocates subsidies to 14.5 GWh of energy storage projects", url: "https://www.ess-news.com/2025/12/19/poland-allocates-subsidies-to-14-5-gwh-of-energy-storage-projects/"}
  };
  /* Items whose titles were taken word-for-word from the source when curated */
  const EXACT_AT_SOURCE = /^(a|h)\d+$/;
  /* Items whose only links are home/listing pages or a different article → no exact headline possible */
  const NO_ARTICLE = new Set(['x1','e2','e4','g2','g4','n18','n23','n26','n33','n39','nu2','h20','o8']);
  let BAD = new Set();

  const css = document.createElement('style');
  css.textContent = `.ntable .ntr{font-size:11.5px;color:var(--dim);margin-top:3px;line-height:1.35}
    .ntable .ntr b{font-size:9px;letter-spacing:.1em;color:var(--mute);margin-right:4px}
    .feed-note{font-size:11px;color:var(--mute);padding:10px 14px}`;
  document.head.appendChild(css);

  const tidy = t => String(t || '').replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, '').replace(/^["'„“]+|["'”]+$/g, '').trim();
  function liveSignalTitle(s) {
    const co = (s.cos || []).filter(c => c !== 'ALL' && c !== 'OTHER').map(coLabel)[0];
    let t = tidy(s.title); const w = t.split(/\s+/);
    if (w.length > 14) t = w.slice(0, 14).join(' ') + '…';
    if (co && !t.toLowerCase().startsWith(co.toLowerCase())) t = co + ': ' + t;
    return t;
  }
  function firstWorkingLink(s) {
    const l = (s.links || []).find(x => !BAD.has(x.url)) || (s.links || [])[0];
    return l ? l.url : '#';
  }
  function enrich(s) {
    const h = H[s.id];
    if (s.auto) {                                   /* live RSS item: title is already exact */
      s.src_title = s.title_pl || s.title;
      s.src_en = s.title_pl ? s.title : '';
      s.src_url = firstWorkingLink(s);
      s.in_feed = true;
      s.sig_title = liveSignalTitle(s);
    } else if (h && h.title) {                      /* verified exact headline */
      s.src_title = h.title; s.src_en = h.title_en || '';
      s.src_url = h.url || firstWorkingLink(s);
      s.in_feed = true;
      s.sig_title = s.title !== h.title ? s.title : (s.change || s.title);
    } else if (EXACT_AT_SOURCE.test(s.id) && !NO_ARTICLE.has(s.id)) {
      s.src_title = s.title_pl || s.title; s.src_en = s.title_pl ? s.title : '';
      s.src_url = (h && h.url) || firstWorkingLink(s);
      s.in_feed = true;
      s.sig_title = s.change || s.title;            /* source title is exact → use rephrased 'what changed' */
    } else {                                        /* headline not yet verified → Signal Intelligence only */
      s.src_title = ''; s.src_en = ''; s.src_url = firstWorkingLink(s);
      s.in_feed = false;
      s.sig_title = s.title;                        /* curated title is already an analyst rephrase */
    }
    return s;
  }
  const ensure = s => (('src_title' in s) ? s : enrich(s));
  const reEnrichAll = () => { SEED.forEach(enrich); SIGNALS.forEach(enrich); };

  /* ── VIEW 1 — LIVE NEWS FEED: exact headline · working link ── */
  renderNews = function () {
    const all = SIGNALS.filter(s => passes(s)).map(ensure);
    const list = dedupe(all.filter(s => s.in_feed).sort((a, b) => b.date.localeCompare(a.date)));
    const pending = all.filter(s => !s.in_feed).length;
    const rows = list.map(s => `<tr><td class="nd">${fmtDate(s.date)}</td>
      <td class="nhd"><a href="${esc(s.src_url)}" target="_blank" rel="noopener">${esc(s.src_title)}</a>${s.auto ? ' <span class="pill livep">LIVE</span>' : ''}
        ${s.src_en ? `<div class="ntr"><b>EN</b>${esc(s.src_en)}</div>` : ''}</td>
      <td class="ns">${esc(s.publisher)}</td></tr>`).join('');
    $('#view').innerHTML = list.length
      ? `<div class="ntable panel"><table><thead><tr><th style="width:120px">Date</th><th>Headline (as published)</th><th style="width:200px">Source</th></tr></thead><tbody>${rows}</tbody></table>
         ${pending ? `<div class="feed-note">${pending} curated item${pending > 1 ? 's' : ''} without a verified source headline ${pending > 1 ? 'are' : 'is'} shown in Signal Intelligence only.</div>` : ''}</div>`
      : `<div class="empty"><h2>No news for this selection</h2><p>Adjust the search, filters or date range.</p></div>`;
    $('#cnt').innerHTML = `Showing <b>${list.length}</b> articles · published ${F.from ? fmtDate(F.from) : '1 Jan 2024'} – ${F.to ? fmtDate(F.to) : 'today'}`;
  };

  /* ── VIEW 2 — SIGNAL INTELLIGENCE: rephrased headline + summary ── */
  card = function (s) {
    ensure(s);
    const cos = s.cos.filter(c => c !== 'ALL');
    const full = hasAnalysis(s);
    const summary = s.summary || s.why || '';
    return `<article class="card" style="--pc:${SC[s.cat].col}">
      <div class="c-top">${catPills(s)}${s.auto ? '<span class="pill livep">● LIVE</span>' : ''}${s.pl ? '<span class="pill trp">PL → EN</span>' : ''}
        <span class="c-date">${fmtDate(s.date)} · ${ago(s.date)}</span></div>
      <h3>${esc(s.sig_title)}</h3>
      ${full && !s.auto && (s.change || s.why) ? `<div class="cw">
        ${s.change ? `<div class="sg chg"><label>What changed</label><b>${esc(s.change)}</b></div>` : ''}
        ${s.why ? `<div class="sg why"><label>Why it matters</label><p>${esc(s.why)}</p></div>` : ''}
      </div>` : ''}
      ${summary ? `<p class="sum"><span class="sl">Summary</span>${esc(summary)}</p>` : ''}
      ${full ? `<div class="sg-grid">
        <div class="sg"><label>Company</label>${cos.length ? cos.map(c => `<span class="tg co" style="background:${CO[c].c}">${coLabel(c)}</span>`).join('') : '<span class="na">Market-wide</span>'}</div>
        <div class="sg"><label>Asset</label>${s.assets.length ? s.assets.map(a => `<button class="tg as" data-asset="${esc(a)}">${esc(a)}</button>`).join('') : '<span class="na">Portfolio / non-asset</span>'}</div>
        <div class="sg"><label>Technology</label>${s.tech.map(t => `<span class="tg">${TECH_LABEL[t]}</span>`).join('')}</div>
        <div class="sg"><label>Geography</label>${s.regions.map(r => `<span class="tg">📍 ${esc(r)}</span>`).join('')}</div>
      </div>` : ''}
      <div class="c-src"><span class="lab">SOURCES</span>${linksHtml({links: (s.links || []).filter(l => !BAD.has(l.url))})}</div>
    </article>`;
  };

  /* keep the Live News Feed tab count in line with what the feed shows */
  const baseRender = render;
  render = function () {
    baseRender();
    const v0 = view; view = 'news';
    $('#nNews').textContent = dedupe(SIGNALS.filter(s => passes(s)).map(ensure).filter(s => s.in_feed)).length;
    view = v0;
  };

  /* ── LOADER: data/headlines.json + data/signals.json (fixes v6 reading signals.json from the wrong folder) ── */
  async function getJson(paths) {
    for (const p of paths) {
      try { const r = await fetch(p, {cache: 'no-store'}); if (r.ok) return await r.json(); } catch (e) {}
    }
    return null;
  }
  loadFeed = async function () {
    const [hj, sj] = await Promise.all([getJson(['data/headlines.json']), getJson(['data/signals.json', 'signals.json'])]);
    if (hj && hj.items) {
      Object.entries(hj.items).forEach(([id, v]) => { if (v && v.title && !(H[id] && H[id].source === 'manual')) H[id] = v; else if (v && v.url && !H[id]) H[id] = {url: v.url}; });
      BAD = new Set(hj.bad_links || []);
    }
    if (sj) {
      const ids = new Set(SEED.map(x => x.id));
      const live = (sj.signals || []).filter(x => x && x.id && !ids.has(x.id) && (x.lang !== 'pl' || x.translated)).map(x => normalise({...x, auto: true}));
      SIGNALS = SEED.concat(live);
      const ts = sj.updated || sj.generated;
      lastUpdate = ts ? new Date(ts) : new Date();
    } else { SIGNALS = SEED.slice(); lastUpdate = null; }
    reEnrichAll();
    $('#clock').textContent = lastUpdate
      ? 'Live · updated ' + lastUpdate.toLocaleString('en-GB', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'})
      : 'Curated · ' + new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
    render();
  };

  reEnrichAll();
  loadFeed();
  setTimeout(loadFeed, 3000);   /* re-run once in case the original v6 loader finishes after this one */
})();
