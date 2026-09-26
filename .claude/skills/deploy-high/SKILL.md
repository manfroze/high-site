---
name: deploy-high
description: Deploy the high site (hijinks.uno) to production on the droppalon droplet. Build the Astro static site and rsync it to the nginx web root. Use when deploying high or hijinks.uno.
---

# Deploy high → hijinks.uno

SSH, `deploy-static` and the shared gotchas are in **`/droppalon`** — read it first.

| | |
|---|---|
| Domain | `hijinks.uno`, `www.hijinks.uno` |
| Web root | `/var/www/high/` |
| Build | `npm run build` (`astro build`) → `dist/` (hashed assets in `_astro/`, not `assets/`) |

## 1. Build

```bash
cd /Users/manfroze/htdocs/high
npm run build
```

## 2. Deploy — the two excludes are required

Two separate sites live inside this web root and are not part of the Astro
build. Without an `--exclude` each, `--delete` wipes them:

- `worldmatrix/` — deployed from `htdocs/worldmatrix/deploy.sh`
- `ident/` — deployed from `htdocs/high-ident` with `/deploy-ident`

```bash
deploy-static --exclude /worldmatrix/ --exclude /ident/ dist/ /var/www/high/        # dry run
deploy-static --go --exclude /worldmatrix/ --exclude /ident/ dist/ /var/www/high/
```

Keep the leading `/`. It anchors each exclude to the web root. Without it,
rsync matches the name at any depth, so the old `voidjunker/` exclude also
skipped `dist/img/voidjunker/` and the card's images never reached the server.

A new hijinks.uno subpath needs its own exclude here. `deploy-static` refuses
to `--go` if a whole top-level directory would be deleted, which is what a
forgotten one looks like.

## 3. Verify

```bash
curl -sI https://hijinks.uno/ | head -3                                    # 200, nginx
curl -s https://hijinks.uno/ident/ | grep -o '<title>[^<]*</title>'        # nested sites intact
curl -sI https://hijinks.uno/worldmatrix/ | head -1
```

## Gotchas

- The dry run touching `_astro/` is normal — Astro's hashed bundles live there.
- `/voidjunker/` is gone (removed 2026-09-26). The game ships on itch only,
  at `highlyintegratedgayhijink.itch.io/voidjunker`, and the homepage card links
  there. A backup of the old build is in `~/site-backups/` on droppalon.
