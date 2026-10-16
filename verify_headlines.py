#!/usr/bin/env python3
"""Checks every curated item in index.html: opens each source link, keeps only links
that load, and records the publisher's exact headline (og:title > <h1> > <title>).
Polish headlines also get an English translation. Writes data/headlines.json, which
the dashboard uses for the Live News Feed. Overrides in config/headline_overrides.json win."""
import html, json, os, re, sys, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, os.environ.get("INDEX_PATH", "index.html"))
OUT = os.path.join(ROOT, "data", "headlines.json")
OVR = os.path.join(ROOT, "config", "headline_overrides.json")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8", "Accept-Language": "en-GB,en;q=0.9,pl;q=0.8"}
# Listing / home pages are not articles - never used as the headline link
GENERIC = re.compile(r"(current-reports/?$|results-center/?$|aktualnosci-rynku-mocy/?$|/komunikaty/?$|/espi/current/?$|/homepage/?$|/energy/?$|"
                     r"regulamin-rynku-mocy\.html$|/investor-relations/?$)", re.I)
PL_CHARS = re.compile(r"[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]")

def load_data(path):
    src = open(path, encoding="utf-8").read()
    m = re.search(r"const DATA\s*=\s*(\[.*?\]);\s*\n\s*const LOGOS", src, re.S)
    if not m: sys.exit("Could not find 'const DATA = [...]' in " + path)
    return json.loads(m.group(1))

def is_generic(url):
    p = urllib.parse.urlparse(url)
    return p.path in ("", "/", "/en", "/en/", "/pl", "/pl/") or bool(GENERIC.search(p.path))

def meta(page, *names):
    for n in names:
        for pat in (rf'<meta[^>]+(?:property|name)=["\']{n}["\'][^>]*content=["\']([^"\']+)', rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']{n}["\']'):
            m = re.search(pat, page, re.I)
            if m: return m.group(1)
    return ""

def clean(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t or ""))).strip()

def extract_title(page):
    t = clean(meta(page, "og:title", "twitter:title"))
    if not t:
        m = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.I | re.S); t = clean(m.group(1)) if m else ""
    if not t:
        m = re.search(r"<title[^>]*>(.*?)</title>", page, re.I | re.S); t = clean(m.group(1)) if m else ""
        parts = re.split(r"\s+[|–-]\s+", t)
        if len(parts) > 1 and len(parts[-1]) < 45: t = " - ".join(parts[:-1])
    return t

def check(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
            ctype = r.headers.get("Content-Type", ""); body = r.read(600000)
            final = r.geturl()
        if "pdf" in ctype.lower(): return {"ok": True, "pdf": True, "final": final}
        page = body.decode("utf-8", "replace")
        return {"ok": True, "title": extract_title(page), "final": final}
    except Exception as e:
        return {"ok": False, "err": f"{type(e).__name__}: {str(e)[:80]}"}

_tr = None
def translate(t):
    global _tr
    try:
        if _tr is None:
            from deep_translator import GoogleTranslator
            _tr = GoogleTranslator(source="pl", target="en")
        return _tr.translate(t) or ""
    except Exception as e:
        print("  translate failed:", e); return ""

def main():
    data = load_data(INDEX)
    ovr = {k: v for k, v in json.load(open(OVR, encoding="utf-8")).items() if not k.startswith("_")} if os.path.exists(OVR) else {}
    urls = sorted({l["url"] for s in data for l in s.get("links", []) if l.get("url")})
    print(f"{len(data)} items, {len(urls)} links to check")
    with ThreadPoolExecutor(8) as ex: res = dict(zip(urls, ex.map(check, urls)))
    items, bad = {}, [u for u, r in res.items() if not r["ok"]]
    for s in data:
        sid = s["id"]
        if sid in ovr: items[sid] = {**ovr[sid], "source": "manual"}; continue
        for l in s.get("links", []):
            r = res.get(l["url"], {})
            if r.get("ok") and r.get("title") and not is_generic(l["url"]):
                t = r["title"]; rec = {"title": t, "url": l["url"], "source": "auto"}
                if PL_CHARS.search(t): rec["title_en"] = translate(t)
                items[sid] = rec; break
        else:
            ok_links = [l["url"] for l in s.get("links", []) if res.get(l["url"], {}).get("ok")]
            items[sid] = {"title": None, "url": ok_links[0] if ok_links else None, "source": "none"}
    json.dump({"generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "items": items, "bad_links": bad},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    n = sum(1 for v in items.values() if v.get("title"))
    print(f"Exact headlines: {n}/{len(data)} | broken links: {len(bad)}")
    for u in bad: print("  broken:", u, "->", res[u]["err"])
    for k, v in items.items():
        if not v.get("title"): print("  no headline (Signal Intelligence only):", k)

if __name__ == "__main__":
    main()
