"""Fail closed when the presentation checkout contains unexpected public files."""
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
ALLOWLIST = {
    '.gitignore', 'README.md', 'assets/cover.svg', 'assets/architecture.svg',
    'assets/order-flow.svg', 'docs/engineering.md', 'docs/privacy.md',
    'docs/design-notes.md', 'docs/index.html', 'docs/showcase.css',
    'docs/showcase.js', 'docs/demo-model.mjs', 'docs/favicon.svg',
    'docs/.nojekyll', 'tests/demo-model.test.mjs', 'scripts/check_public.py',
    'docs/landing.css', 'docs/landing.js', 'docs/product-case.md',
}
# Inspect tracked and non-ignored files. Ignored local output is never staged implicitly.
files = set(subprocess.check_output(
    ['git', 'ls-files', '--cached', '--others', '--exclude-standard'], cwd=ROOT,
    text=True).splitlines())
assert files == ALLOWLIST, f'Allowlist mismatch: {files ^ ALLOWLIST}'
for name in sorted(files):
    path = ROOT / name
    assert not path.is_symlink(), f'Symlink: {name}'
    content = path.read_text()
    assert path.stat().st_size < 100_000, f'Oversized artifact: {name}'
    if name != 'scripts/check_public.py':
        patterns = [r'/Users/[^\s"\']+', r'/Volumes/[^\s"\']+',
                    r'gh[pousr]_[A-Za-z0-9_]{16,}', r'github_pat_[A-Za-z0-9_]+',
                    r'sk-[A-Za-z0-9_-]{16,}', r'-----BEGIN .*PRIVATE KEY-----',
                    r'[\w.+-]+@[\w.-]+\.[a-z]{2,}', r'\b(?:SH|SZ)\.\d{6}\b']
        for pattern in patterns:
            assert not re.search(pattern, content), f'Privacy review required: {name}'
    if path.suffix == '.svg':
        tree = ET.fromstring(content)
        assert not any(e.tag.split('}')[-1] in {'script', 'foreignObject', 'image'} for e in tree.iter())
        assert 'href=' not in content
    if path.suffix in {'.js', '.mjs'}:
        assert not re.search(r'\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB)\b|document\.cookie|\beval\s*\(', content), f'Unexpected data access: {name}'
    if path.suffix == '.md':
        for link in re.findall(r'\]\(([^)]+)\)', content):
            if link.startswith(('https://', '#')):
                continue
            assert (path.parent / link.split('#')[0]).is_file(), f'Broken link: {name}: {link}'

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids = set(); self.links = []; self.csp = ''
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'Duplicate ID: {attrs["id"]}'
            self.ids.add(attrs['id'])
        if tag == 'meta' and attrs.get('http-equiv') == 'Content-Security-Policy':
            self.csp = attrs['content']
        assert not any(key.startswith('on') for key in attrs), 'Inline event handler'
        assert tag not in {'iframe', 'form', 'object', 'embed'}, f'Unexpected element: {tag}'
        for key in ('src', 'href'):
            if key in attrs: self.links.append((tag, attrs[key]))

parser = PageParser(); parser.feed((ROOT / 'docs/index.html').read_text())
assert "connect-src 'none'" in parser.csp and "script-src 'self'" in parser.csp
for tag, link in parser.links:
    if link == '#': continue
    if link.startswith('#'): assert link[1:] in parser.ids, f'Broken anchor: {link}'
    elif link.startswith('https://'):
        assert tag == 'a' and link.startswith('https://github.com/dongshuangcheng/kiwi-trader-showcase'), f'Unexpected remote dependency: {link}'
    else:
        assert (ROOT / 'docs' / link).is_file(), f'Broken asset: {link}'
print(f'PASS: {len(files)} allowlisted files; privacy patterns, links, SVG, CSP and no-network demo checks.')
