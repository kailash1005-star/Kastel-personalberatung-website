import re

with open('site/index.html', encoding='utf-8') as f:
    html = f.read()

links = re.findall(r'href=[\'\"]([^\'\"]+)[\'\"]', html)
for link in links:
    if 'employer' in link.lower() or 'black-grey' in link.lower() or 'html' in link.lower() or link.startswith('/'):
        print(link)
