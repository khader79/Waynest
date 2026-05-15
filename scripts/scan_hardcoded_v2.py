import re, glob

# Scan for remaining hardcoded UI text patterns
patterns = [
    # Double-quoted UI strings in JSX
    (r'(?:=|{|:)\s*"([A-Z][A-Za-z\s.,!?()-]{4,})"', 'double-quoted UI string'),
    # Single-quoted UI strings in JSX
    (r"(?:=|{|:)\s*'([A-Z][A-Za-z\s.,!?()-]{4,})'", 'single-quoted UI string'),
    # JSX text content directly between tags
    (r'(?:>{1})([A-Z][A-Za-z\s.,!?()-]{4,})(?:<{1})', 'JSX text content'),
]

exclude_files = [
    'node_modules', '.next', 'dist', 'build', '.git', '__tests__', 'test', 'tests',
    '.css', '.scss', '.less', '.config.', '.d.ts'
]

results = []
for f in sorted(glob.glob('waynest-FE/src/**/*.{jsx,tsx}', recursive=True)):
    rel = f.replace('waynest-FE/', '')
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        lines = fh.readlines()
    for i, line in enumerate(lines, 1):
        # Skip if already using t() or i18n.t()
        if 't(' in line or 'i18n.t' in line:
            continue
        # Skip comments
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*') or stripped.startswith('*'):
            continue
        # Skip if it's just a CSS className reference
        if 'className=' in line and not any(x in line for x in ['> ', '": "', "': '"]):
            continue

        for pattern, desc in patterns:
            for m in re.finditer(pattern, line):
                text = m.group(1)
                # Skip non-UI values
                if any(x in text for x in ['http', 'https://', 'src/', 'import ', 'from ', 'export ', 'return ', 'function ']):
                    continue
                if text in ['true', 'false', 'null', 'undefined', 'none', 'auto', 'block', 'inline', 'flex', 'none', 'this', 'that', 'div', 'span', 'input', 'button', 'form', 'img', 'a ', 'p ', 'h1', 'h2', 'h3', 'ul', 'li', 'br', 'hr', 'pre', 'code']:
                    continue
                if len(text) < 5:
                    continue
                # Skip prop names and non-visible strings
                if text in ['className', 'style', 'type', 'name', 'id', 'key', 'ref', 'value', 'onChange', 'onClick', 'onSubmit', 'placeholder', 'disabled', 'required', 'checked', 'readOnly', 'src', 'href', 'alt', 'title']:
                    continue
                # Skip file extensions
                if '.' in text and text.split('.')[-1] in ['js', 'ts', 'tsx', 'jsx', 'css', 'json', 'html', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico']:
                    continue
                # Skip JS keywords
                if text in ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'class', 'new', 'this', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'typeof', 'instanceof', 'try', 'catch', 'finally', 'throw']:
                    continue

                results.append({
                    'file': rel,
                    'line': i,
                    'text': text.strip(),
                    'type': desc,
                    'content': line.strip()[:150]
                })

# Deduplicate
seen = set()
unique = []
for r in results:
    key = (r['file'], r['line'], r['text'])
    if key not in seen:
        seen.add(key)
        unique.append(r)

unique.sort(key=lambda x: (x['file'], x['line']))

print(f"Found {len(unique)} potential hardcoded UI strings:\n")
current_file = ''
for r in unique:
    if r['file'] != current_file:
        current_file = r['file']
        print(f"=== {current_file} ===")
    print(f"  L{r['line']}: \"{r['text']}\"")
    print(f"      -> {r['content']}")
    print()