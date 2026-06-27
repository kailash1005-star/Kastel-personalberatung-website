#!/usr/bin/env python3
"""Build a local static mirror of black-grey.com from scraped raw HTML."""
import os, re, sys, time, urllib.request, urllib.parse, ssl
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.abspath(__file__))
HTML_SRC = os.path.join(ROOT, ".firecrawl", "html")
SITE = os.path.join(ROOT, "site")
HOST = "black-grey.com"
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# slug -> local html filename (page links)
PAGES = {
    "": "index.html",
    "employers": "employers.html",
    "candidates": "candidates.html",
    "executive-search": "executive-search.html",
    "contingency-multiple-hiring": "contingency-multiple-hiring.html",
    "assessments": "assessments.html",
    "cv-writing-packages": "cv-writing-packages.html",
    "bg-global-recruitment": "bg-global-recruitment.html",
    "world-connect": "world-connect.html",
    "contact": "contact.html",
    "privacy-policy-2": "privacy-policy-2.html",
    "terms-of-use": "terms-of-use.html",
}

downloaded = {}   # url -> local path (relative to SITE) or None on fail
ASSET_EXT = ("css","js","png","jpg","jpeg","gif","svg","webp","woff","woff2","ttf","eot","ico","mp4","webm","otf","json")

def local_for(url):
    """Map an absolute asset URL to a local path relative to SITE (no query)."""
    p = urllib.parse.urlparse(url)
    path = p.path.lstrip("/")
    if not path:
        path = "index_asset"
    if p.netloc.lower().endswith(HOST):
        return path
    # external host -> _ext/<host>/<path>
    return f"_ext/{p.netloc}/{path}"

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=CTX, timeout=60) as r:
        return r.read()

def download(url):
    url = url.split("#")[0]
    if url in downloaded:
        return downloaded[url]
    rel = local_for(url)
    dest = os.path.join(SITE, rel.replace("/", os.sep))
    downloaded[url] = rel
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return rel
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for attempt in range(3):
        try:
            data = fetch(url)
            with open(dest, "wb") as f:
                f.write(data)
            return rel
        except Exception as e:
            if attempt == 2:
                print(f"  FAIL {url} -> {e}")
                downloaded[url] = None
                return None
            time.sleep(1)

def absolutize(u, base):
    u = u.strip().strip('"').strip("'")
    if u.startswith("data:") or u.startswith("#") or u.startswith("mailto:") or u.startswith("tel:") or u.startswith("javascript:"):
        return None
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("http"):
        return u
    return urllib.parse.urljoin(base, u)

CSS_URL_RE = re.compile(r"url\(\s*([^)]+?)\s*\)", re.I)
CSS_IMPORT_RE = re.compile(r"@import\s+(?:url\()?\s*['\"]?([^'\")]+)['\"]?\s*\)?", re.I)

def process_css(rel_path):
    """Download resources referenced in a CSS file and rewrite them relative to the CSS."""
    dest = os.path.join(SITE, rel_path.replace("/", os.sep))
    if not os.path.exists(dest):
        return
    try:
        css = open(dest, "r", encoding="utf-8", errors="ignore").read()
    except Exception:
        return
    base_url = "https://" + HOST + "/" + rel_path if not rel_path.startswith("_ext/") else None
    if rel_path.startswith("_ext/"):
        parts = rel_path[len("_ext/"):].split("/", 1)
        base_url = f"https://{parts[0]}/{parts[1] if len(parts)>1 else ''}"
    refs = set()
    for m in CSS_URL_RE.finditer(css):
        refs.add(m.group(1))
    for m in CSS_IMPORT_RE.finditer(css):
        refs.add(m.group(1))
    css_dir = os.path.dirname(rel_path)
    replacements = {}
    for raw in refs:
        au = absolutize(raw, base_url)
        if not au:
            continue
        sub = download(au)
        if not sub:
            continue
        relrel = os.path.relpath(sub, css_dir).replace(os.sep, "/")
        replacements[raw] = relrel
    if replacements:
        def repl_url(m):
            inner = m.group(1).strip().strip('"').strip("'")
            if inner in replacements:
                return f'url("{replacements[inner]}")'
            return m.group(0)
        css = CSS_URL_RE.sub(repl_url, css)
        def repl_imp(m):
            inner = m.group(1).strip().strip('"').strip("'")
            if inner in replacements:
                return f'@import url("{replacements[inner]}")'
            return m.group(0)
        css = CSS_IMPORT_RE.sub(repl_imp, css)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(css)

# ---- main ----
URL_IN_HTML_RE = re.compile(r'(?:https?:)?//[^\s"\'()<>]+', re.I)

def page_link_local(url):
    """If url is an internal page we mirrored, return local .html name, else None."""
    p = urllib.parse.urlparse(url if url.startswith("http") else "https:"+url if url.startswith("//") else "https://"+HOST+url)
    if not p.netloc.lower().endswith(HOST):
        return None
    slug = p.path.strip("/")
    if slug in PAGES:
        return PAGES[slug]
    return None

def collect_and_rewrite(html_file, out_name):
    html = open(html_file, "r", encoding="utf-8", errors="ignore").read()
    base = "https://" + HOST + "/"

    # gather all candidate URLs
    urls = set(URL_IN_HTML_RE.findall(html))
    asset_urls = set()
    for u in urls:
        full = u if u.startswith("http") else "https:" + u
        pu = urllib.parse.urlparse(full)
        pathlow = pu.path.lower().split("?")[0]
        ext = pathlow.rsplit(".", 1)[-1] if "." in pathlow else ""
        if ext in ASSET_EXT:
            asset_urls.add(full.split("#")[0])

    # download assets
    for au in asset_urls:
        download(au)

    # rewrite: page links first (href to mirrored pages)
    def repl_pagelink(m):
        u = m.group(0)
        loc = page_link_local(u)
        return loc if loc else u
    # replace full internal page URLs (must be a whole link target -> match in quotes)
    for slug, fname in PAGES.items():
        for variant in (f"https://{HOST}/{slug}", f"http://{HOST}/{slug}", f"//{HOST}/{slug}"):
            variant_clean = variant.rstrip("/") if slug else variant
            # with and without trailing slash, wrapped in quotes
            for v in ({variant, variant + "/", variant_clean, variant_clean + "/"}):
                html = html.replace(f'"{v}"', f'"{fname}"')
                html = html.replace(f"'{v}'", f"'{fname}'")

    # rewrite asset URLs -> local relative, stripping query
    def repl_asset(m):
        u = m.group(0)
        full = u if u.startswith("http") else "https:" + u
        clean = full.split("#")[0]
        rel = downloaded.get(clean)
        if rel:
            return rel
        # maybe query-stripped already downloaded under same path
        return u
    # Build replacement by longest-first to avoid partial overlaps
    for au in sorted(asset_urls, key=len, reverse=True):
        rel = downloaded.get(au)
        if not rel:
            continue
        # replace both https and protocol-relative forms
        forms = [au, au.replace("https://", "http://"), au.replace("https://", "//")]
        for f0 in forms:
            html = html.replace(f0, rel)

    os.makedirs(SITE, exist_ok=True)
    with open(os.path.join(SITE, out_name), "w", encoding="utf-8") as f:
        f.write(html)
    return asset_urls

if __name__ == "__main__":
    all_assets = set()
    mapping = {
        "index.html": "index.html",
        "employers.html": "employers.html",
        "candidates.html": "candidates.html",
        "executive-search.html": "executive-search.html",
        "contingency-multiple-hiring.html": "contingency-multiple-hiring.html",
        "assessments.html": "assessments.html",
        "cv-writing-packages.html": "cv-writing-packages.html",
        "bg-global-recruitment.html": "bg-global-recruitment.html",
        "world-connect.html": "world-connect.html",
        "contact.html": "contact.html",
        "privacy-policy-2.html": "privacy-policy-2.html",
        "terms-of-use.html": "terms-of-use.html",
    }
    for src, out in mapping.items():
        fp = os.path.join(HTML_SRC, src)
        if not os.path.exists(fp):
            print(f"skip missing {src}")
            continue
        print(f"processing {src}")
        a = collect_and_rewrite(fp, out)
        all_assets |= a
    print(f"Total unique assets referenced: {len(all_assets)}")
    # process CSS files (recursive fonts/images)
    css_files = [rel for url, rel in downloaded.items() if rel and rel.lower().endswith(".css")]
    print(f"Processing {len(set(css_files))} CSS files for nested assets...")
    for rel in set(css_files):
        process_css(rel)
    # re-process newly added css from imports
    css_files2 = [rel for url, rel in downloaded.items() if rel and rel.lower().endswith(".css")]
    for rel in set(css_files2) - set(css_files):
        process_css(rel)
    print("DONE. Downloaded:", sum(1 for v in downloaded.values() if v))
    print("Failed:", sum(1 for v in downloaded.values() if v is None))
