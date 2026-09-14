---
name: deploy-high
description: Deploy the high site (hijinks.uno) to production on the droppalon droplet. Build the Astro static site and rsync it to the nginx web root. Use when deploying high or hijinks.uno.
---

# Deploy high → hijinks.uno

Static **Astro** site on the **droppalon** droplet, served by nginx over HTTPS.

| | |
|---|---|
| Server | `manfroze@167.99.219.6` |
| Domain | `hijinks.uno`, `www.hijinks.uno` |
| Web root | `/var/www/high/` (static; not a git checkout) |
| Build | `npm run build` (`astro build`) → `dist/` (hashed assets land in `_astro/`, not `assets/`) |
| TLS | Certbot |

## 1. Unlock the SSH key (once per session)

```bash
printf '#!/bin/sh\necho <PASSPHRASE>' > /tmp/ap.sh && chmod +x /tmp/ap.sh
SSH_ASKPASS=/tmp/ap.sh SSH_ASKPASS_REQUIRE=force DISPLAY=: ssh-add ~/.ssh/id_rsa
rm -f /tmp/ap.sh
ssh manfroze@167.99.219.6 'hostname'   # → droppalon
```
Passphrase is in the user's password manager (never commit it).

## 2. Build

```bash
cd /Users/manfroze/htdocs/high
npm run build            # → dist/
```

## 3. Deploy (dry-run first — a wrong --delete path wipes the site)

```bash
ls -1 dist/ | sort
ssh manfroze@167.99.219.6 'ls -1 /var/www/high/ | sort'
rsync -avz --delete --checksum --exclude 'worldmatrix/' --exclude 'voidjunker/' --dry-run dist/ manfroze@167.99.219.6:/var/www/high/ | grep '^deleting '

rsync -avz --delete --checksum --exclude 'worldmatrix/' --exclude 'voidjunker/' dist/ manfroze@167.99.219.6:/var/www/high/
```

## 4. Verify

```bash
curl -sI https://hijinks.uno/ | head -3      # 200, server: nginx
```

## Gotchas

- **The `--exclude` flags are required.** Two separate sites live in subdirectories of this web root and are *not* part of the Astro build, so `--delete` wipes them if they are not excluded:
  - `/var/www/high/worldmatrix/` — the world matrix, deployed from `htdocs/worldmatrix/deploy.sh`.
  - `/var/www/high/voidjunker/` — the game at hijinks.uno/voidjunker, deployed from `htdocs/void-junker` with `/deploy-voidjunker`.

  Anything else added under hijinks.uno as a subpath needs its own exclude here too. The dry-run is what catches a forgotten one: if `grep '^deleting '` lists files you do not recognise, stop.

- Astro emits hashed JS/CSS under `_astro/` (Vite-style `assets/` won't exist) — don't be alarmed the dry-run touches `_astro/`.
- Web root is `manfroze:www-data`; rsync keeps files world-readable so nginx serves them.
