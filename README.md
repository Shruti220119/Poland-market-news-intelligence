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
2. Use poland-energy-market-intelligence-v8.html as `index.html` (the patch is already built in). For the old v6, add `<script src="headline-patch.js"></script>` above `</body>` instead.
3. Settings → Actions → General → Workflow permissions → **Read and write**.
4. Actions → **Verify headlines and links** → Run workflow. Then **Update Poland Energy news feed** → Run workflow.
5. Open the github.io page, Ctrl+F5.

## Items without an exact headline
All items appear in the Live News Feed. Items not yet verified show the curated title; the daily check replaces it with the exact publisher headline once the article page loads.
