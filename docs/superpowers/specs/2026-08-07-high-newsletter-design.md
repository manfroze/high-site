# HIGH newsletter — design

**Date:** 2026-08-07
**Status:** Approved, ready for implementation planning
**Scope:** Add a newsletter signup to hijinks.uno and stand up the list behind it.

## Context

`high` is a static Astro 4 site — a single page ([`src/pages/index.astro`](../../../src/pages/index.astro), ~1300 lines) built with `astro build` and rsynced to nginx on the droppalon droplet. There is no server runtime, so signups must go to a third-party endpoint.

The site already links six channels from the header: email, itch.io, Patreon, Discord, Telegram, Mastodon. Email adds an owned, portable list that reaches people who will never join a Discord.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Purpose | Release announcements | A few sends a year — "Extravagaria is out", "Ship Shape hit Playdate". Not a devlog. Low authoring burden, high value per send. |
| Platform | Buttondown | Indie-scale, markdown authoring, plain-POST embed endpoint that works from a static build, no upsell cruft. |
| Placement | A card in the project grid | More distinctive than a footer band, and native to a card-based page. |
| Card visuals | **Deferred to the user** | Design comes later; the architecture must not presume a look. |
| Opt-in | Double opt-in | Likely EU/CH audience, and it makes the success message honest (see below). |

### Non-goals

No archive page, no RSS-to-email automation, no tags or segments, no popup or interstitial. A few sends a year does not justify any of it.

## Architecture

Two pieces, split so visual work and submit logic stay independent.

### `src/components/NewsletterForm.astro` (new)

Self-contained: markup, states, and submit script. Its scoped `<style>` block carries **only** structural CSS — the flex arrangement of input + button and the show/hide of status text. Every skin decision (color, type, borders, spacing) lives in `global.css` under `#newsletter`, so the card can be designed later without opening this file.

Props:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `username` | `string` | — required | Buttondown handle. Public (it appears in the endpoint URL), not a secret. |
| `placeholder` | `string` | `'you@email.com'` | |
| `cta` | `string` | `'Join'` | Button label. |

Emits a `<form>` with a stable class hook (`.newsletter-form`) plus element hooks (`.newsletter-input`, `.newsletter-btn`, `.newsletter-status`) for styling.

### Card row in `index.astro`

A new `.card-grid` row appended after the Chromle/KeyDraw row (currently the last), containing:

```astro
<ProjectCard id="newsletter">
  <div class="card-inner">
    <!-- wordmark + copy: designed later -->
    <NewsletterForm username="..." />
  </div>
</ProjectCard>
```

Constraints this must respect:

- **No `href` prop.** [`ProjectCard.astro`](../../../src/components/ProjectCard.astro) renders `href` as a full-card `<a class="card-link">` overlay, which would swallow clicks on the input.
- Styling goes in [`global.css`](../../../src/styles/global.css) under `#newsletter`, following the existing per-card pattern (`#chromle .card-btn`, `#atlas .card-desc`, …).
- Row inherits the standard geometry: 1000px max width, 284px tall, `.card-inner` bottom-left aligned with `28px 32px` padding.

## Submit behavior

`fetch()` POST of `email` to Buttondown's embed-subscribe endpoint for `username`, keeping the user on the page.

States:

1. **idle** — input + button
2. **submitting** — button disabled, label swapped
3. **success** — form replaced by "Check your inbox to confirm."
4. **error** — message shown, form still usable for retry

### CORS contingency

The embed endpoint may not return permissive CORS headers. **Verify with curl during implementation.**

- If `Access-Control-Allow-Origin` is present: read the real response and report accurately.
- If not: submit with `mode: 'no-cors'`. The response is opaque, so success cannot be distinguished from a duplicate address — but under double opt-in "Check your inbox to confirm" is true in both cases, so the message stays honest. A genuine network failure still rejects the promise and surfaces as a real error.

Both paths differ by one branch in the same component; the choice is made once, at implementation time, from observed behavior.

### Traps to handle

- **`<base target="_blank">`** in [`Layout.astro:32`](../../../src/layouts/Layout.astro#L32) applies to form submission, not just links. The no-JS fallback `<form>` needs an explicit `target="_self"` or it submits into a new tab.
- **Honeypot:** one hidden input. If filled, skip the POST entirely and show the normal success state, so bots get no signal that they were caught. Cheap, and a list poisoned by bots is painful to clean.
- **No-JS fallback:** the form is a real `<form>` with `method="post"` and the Buttondown `action`, so it degrades to a native submit landing on Buttondown's hosted confirmation page. JS upgrades it to inline.

### Accessibility

- `<label>` for the input, visually hidden if the design calls for it
- `type="email"` `required` for native validation
- Status region with `aria-live="polite"` and `role="status"`
- Disabled state communicated via the `disabled` attribute, not styling alone

### Analytics

One `gtag('event', 'newsletter_signup')` on success. GA is already loaded in [`Layout.astro`](../../../src/layouts/Layout.astro).

## Buttondown account setup

Prerequisite — user-side, blocks a real endpoint:

1. Create the account and choose the username (this string goes into the `username` prop).
2. Enable **double opt-in**.
3. Write the confirmation email and the welcome email.
4. Confirm current pricing at signup time rather than relying on remembered tiers.

## Privacy and consent

A one-line consent note sits under the field: *"Only when we ship. Unsubscribe anytime."* Buttondown supplies the unsubscribe link in every send.

The site has **no privacy policy page**, and adding one was raised and left at the default: inline note only. Revisit if the list grows or if a store/publisher requires it.

## Verification

No test framework exists in this repo, so verification is manual and evidence-based — output shown, not asserted:

1. `npm run build` completes without error.
2. `curl -i` the embed endpoint to observe CORS headers, and pick the fetch path from what comes back.
3. Submit a real address on the dev server (port 4321, already running — do not kill it).
4. Subscriber appears in Buttondown as **unconfirmed**.
5. Confirmation link works; subscriber flips to confirmed.
6. Verify the no-JS path submits to Buttondown in the same tab (JS disabled).

## Deploy

Standard path, via the `deploy-high` skill: `npm run build` → rsync `dist/` to `/var/www/high/` with a `--delete` dry-run first → `curl -sI https://hijinks.uno/`.
