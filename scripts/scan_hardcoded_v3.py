import os, re

results = []
for root, dirs, files in os.walk('waynest-FE/src'):
    for fname in files:
        if not fname.endswith(('.jsx', '.tsx', '.js', '.ts', '.tsx')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            # Skip lines using t()
            if 't(' in line or 'i18n.t' in line or 'useTranslation' in line:
                continue
            # Skip comments
            s = line.strip()
            if s.startswith('//') or s.startswith('*') or s.startswith('/*') or s.startswith('<//') or s.startswith('{/*'):
                continue
            # Look for capitalized words that look like UI text in JSX context
            # Pattern: uppercase word followed by lowercase words inside JSX
            matches = re.finditer(r'<(?:h[1-6]|p|span|div|button|a[^>]*|label|li|option|th|td|strong|em|b)\s[^>]*>([A-Z][a-zA-Z\s.,!?\'"-]{2,}?)</(?:h[1-6]|p|span|div|button|a>|label|li|option|th|td|strong|em|b)>', line)
            for m in matches:
                text = m.group(1).strip()
                if len(text) < 3:
                    continue
                if text.lower() in ['true', 'false', 'null', 'none', 'div', 'span']:
                    continue
                if '/' in text:
                    continue
                results.append(f"{fpath.replace('waynest-FE/', '')}:{i}: \"{text}\"  -> {s[:100]}")

# Also look for placeholder="..." patterns
for root, dirs, files in os.walk('waynest-FE/src'):
    for fname in files:
        if not fname.endswith(('.jsx', '.tsx', '.js', '.ts', '.tsx')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            if 't(' in line or 'i18n.t' in line:
                continue
            # Check for placeholder=, label=, aria-label=, title=, alt= with hardcoded strings
            for attr_match in re.finditer(r'(?:placeholder|label|aria-label|title|alt)\s*=\s*"([A-Z][A-Za-z\s.,!?\'-]{3,})"', line):
                text = attr_match.group(1)
                if len(text) < 4 or text.lower() in ['true','false','div','span']:
                    continue
                results.append(f"{fpath.replace('waynest-FE/', '')}:{i}: \"{text}\"  -> {line.strip()[:100]}")

# Also look for >Uppercase< patterns (JSX inline text)
for root, dirs, files in os.walk('waynest-FE/src'):
    for fname in files:
        if not fname.endswith(('.jsx', '.tsx', '.js', '.ts', '.tsx')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
        for i, line in enumerate(lines, 1):
            if 't(' in line or 'i18n.t' in line:
                continue
            s = line.strip()
            if s.startswith('//') or s.startswith('*') or s.startswith('{/*') or s.startswith('//'):
                continue
            # Simple: text that appears between > and < that starts with uppercase
            matches = re.finditer(r'>([A-Z][A-Za-z\s.,!?\'-]{3,}?)<', line)
            for m in matches:
                text = m.group(1).strip()
                if len(text) < 3:
                    continue
                if text.lower() in ['true','false','null','none','div','span','br','img','input','link','meta']:
                    continue
                if '/' in text:
                    continue
                # Skip if it looks like a path/URL
                if text.startswith('/') or text.startswith('http'):
                    continue
                # Skip CSS class references and variable interpolations
                if text.startswith('{') or text.endswith('}'):
                    continue
                results.append(f"{fpath.replace('waynest-FE/', '')}:{i}: \"{text}\"  -> {s[:100]}")

results = sorted(set(results))
print(f"Found {len(results)} potential hardcoded UI strings:\n")
for r in results:
    print(r)
    print()