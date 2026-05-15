import re, glob, os, json

hardcoded = []
for f in sorted(glob.glob('waynest-FE/src/**/*.{jsx,tsx}', recursive=True)):
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        lines = fh.readlines()
    for i, line in enumerate(lines, 1):
        if 't(' in line or 'i18n.t' in line:
            continue
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            continue
        matches = re.finditer(r'[\"]([A-Za-z][A-Za-z\s.,!?()-]{3,80}?)[\"]', line)
        for m in matches:
            text = m.group(1)
            if any(x in text for x in ['http', 'https', 'src/', 'url', 'className', 'id=', 'type=']):
                continue
            if text in ['js', 'tsx', 'ts', 'jsx', 'css', 'json', 'html', 'svg', 'md']:
                continue
            words = text.split()
            if len(words) <= 1 and len(text) < 10:
                continue
            if '/' in text and '.' in text:
                continue
            if any(x in text for x in ['react', 'react-i18next', 'react-icons', 'react-router']):
                continue
            if text in ['true', 'false', 'null', 'undefined', 'none', 'auto', 'block']:
                continue
            hardcoded.append({
                'file': f.replace('waynest-FE/', ''),
                'line': i,
                'text': text,
                'line_content': line.strip()[:120]
            })

keywords_ui = ['click', 'submit', 'search', 'cancel', 'save', 'delete', 'edit', 'add', 'back', 'next',
               'view', 'open', 'close', 'load', 'loading', 'error', 'success', 'name', 'title', 'description',
               'label', 'password', 'email', 'phone', 'message', 'confirm', 'reset', 'upload', 'download',
               'print', 'share', 'copy', 'filter', 'sort', 'export', 'import', 'upload', 'avatar', 'profile',
               'home', 'about', 'contact', 'help', 'settings', 'logout', 'login', 'signin', 'signup',
               'register', 'forgot', 'remember', 'subscribe', 'unsubscribe', 'reply', 'comment', 'post',
               'update', 'create', 'new', 'old', 'first', 'last', 'all', 'any', 'yes', 'no', 'ok', 'done',
               'remove', 'cancel', 'publish', 'draft', 'preview', 'details', 'summary', 'overview', 'stats',
               'total', 'average', 'rating', 'reviews', 'price', 'cost', 'amount', 'currency', 'date',
               'time', 'day', 'week', 'month', 'year', 'today', 'tomorrow', 'yesterday', 'now',
               'start', 'end', 'begin', 'finish', 'continue', 'proceed', 'confirm', 'approve', 'reject',
               'pending', 'active', 'inactive', 'enabled', 'disabled', 'visible', 'hidden', 'required',
               'optional', 'available', 'unavailable', 'free', 'paid', 'trial', 'demo', 'premium', 'basic',
               'standard', 'professional', 'enterprise', 'personal', 'business', 'admin', 'user']

filtered = []
for item in hardcoded:
    text_lower = item['text'].lower()
    if len(text_lower.split()) >= 2:
        filtered.append(item)
    elif any(kw in text_lower for kw in keywords_ui):
        filtered.append(item)

filtered.sort(key=lambda x: (x['file'], x['line']))

print(f'Found {len(filtered)} potential hardcoded UI strings:\n')
for item in filtered:
    print(f"{item['file']}:{item['line']}: \"{item['text']}\"")
    print(f"  -> {item['line_content']}")
    print()