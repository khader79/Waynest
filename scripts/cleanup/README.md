# Cleanup scripts

This folder contains conservative cleanup utilities used to remove commented-out code, `TODO`/`FIXME` comments, and debug `console.log`/`debugger` statements while preserving license headers and backing up original files.

Usage:

```powershell
node scripts/cleanup/cleanup-comments.cjs
```

Notes:

- The script creates backups under `.cleanup-backups/<timestamp>/...` before modifying files.
- It skips `node_modules`, `dist`, `public`, `db`, `migrations`, `uploads`, `.git`, and any file whose header contains `license` or `copyright`.
- It is intentionally conservative to avoid breaking runtime behavior.
