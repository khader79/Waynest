# Deployment and Safe-Deploy Instructions

This repository includes an atomic deploy script and a reference GitHub Actions workflow.
Follow these steps on your personal server to ensure deploys don't break the site.

1. Place the deploy script

---

- Copy `scripts/deploy_atomic.sh` into `/home/<user>/scripts/deploy_atomic.sh` and make it executable:

```bash
scp scripts/deploy_atomic.sh user@your.server:/home/user/scripts/deploy_atomic.sh
ssh user@your.server 'chmod +x /home/user/scripts/deploy_atomic.sh && mkdir -p /srv/waynest/releases /srv/waynest/shared'
```

2. Prepare shared environment

---

- Put production env file at `/srv/waynest/shared/.env` with these variables (example):

```
NODE_ENV=production
PORT=3001
REDIS_URL=redis://:password@redis.example:6379
DATABASE_URL=postgres://user:pass@db.example:5432/waynest
JWT_SECRET=...
PUBLIC_APP_URL=https://yourfrontend.example
```

3. Start the app (first-time)

---

- Use `pm2` or `systemd`. Example `pm2` run (first time):

```bash
ln -s /srv/waynest/releases/<some-release> /srv/waynest/current
pm2 start /srv/waynest/current/dist/main.js --name waynest --env production
```

4. GitHub Actions

---

- Add repository secrets: `SRV_HOST`, `SRV_USER`, `SRV_SSH_KEY`, `SRV_PORT` (optional), `SRV_APP_NAME`.
- On push to `main` the `.github/workflows/atomic-deploy.yml` will build both backend and frontend,
  create an archive and invoke the `deploy_atomic.sh` script on the server.

5. Nginx suggested config (serve frontend + proxy API)

---

Example (adjust paths and domain):

```
server {
  listen 80;
  server_name yourfrontend.example;

  root /srv/waynest/current/frontend;
  index index.html;

  location /assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location / {
    try_files $uri /index.html;
    add_header Cache-Control "no-store, max-age=0";
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

6. Quick smoke tests after deploy

---

```bash
curl -i -X OPTIONS 'https://api.yourdomain/api/currencies' -H 'Origin: https://waynest.live' -H 'Access-Control-Request-Method: GET'
curl -I 'https://yourfrontend.example/assets/AuthLayout-wEkV3hb-.css'
curl -i 'https://api.yourdomain/api/notifications/unread-count' -H 'Origin: https://waynest.live'
```

If you want, provide SSH access (deploy user key) and I can run the first deploy for you and validate these smoke-tests.

Notes:

- The backend now uses a centralized Redis client with short connect timeouts and fail-open behavior.
- Early Express-level CORS middleware is in place so preflight and early-error responses include `Access-Control-Allow-*` headers.
- The GitHub Actions workflow packages build artifacts and calls the server `deploy_atomic.sh` for atomic swap.
