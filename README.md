# Poland Energy Market Intelligence v6 — GitHub toolkit (v6.2)

## What it does
| View | Headline | Link |
|---|---|---|
| Live News Feed | Publisher's **exact** headline (Polish shown in Polish + EN translation) | Working article link |
| Signal Intelligence | **Rephrased** signal headline + summary | All working source links |

## Files
| File | Purpose |
|---|---|
| `headline-patch.js` | Adds the behaviour above to v6 and loads `data/signals.json` (v6 looked for `signals.json` in the wrong folder) |
| `.github/workflows/update-news.yml` | Every 30 min: new articles from RSS (exact headline + link) |
| `.github/workflows/verify-headlines.yml` | Daily: opens every curated link, drops broken ones, records exact headlines |
| `scripts/fetch_news.py`, `scripts/verify_headlines.py` | The two jobs |
| `config/sources.json` | RSS feeds |
| `config/headline_overrides.json` | Hand-checked headlines/links (win over the automatic check) |
| `data/signals.json`, `data/headlines.json` | Outputs read by the dashboard |

## Install
1. Upload all files to the repo root (keep folders). `index.html` = your v6 dashboard.
2. Edit `index.html` → find `</body>` (last lines) → paste above it:
   `<script src="headline-patch.js"></script>`
3. Settings → Actions → General → Workflow permissions → **Read and write**.
4. Actions → **Verify headlines and links** → Run workflow. Then **Update Poland Energy news feed** → Run workflow.
5. Open the github.io page, Ctrl+F5.

## Items without an exact headline
Curated items whose links are home/listing pages, or whose site blocks the checker, stay in Signal Intelligence only.
The verify log lists them ("no headline"). To restore one, add its article to `config/headline_overrides.json`.
