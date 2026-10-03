# ReceptWise marketing site (prototype v1)

Static HTML/CSS/vanilla JS. No build step, no frameworks. All paths are relative,
so it works at a GitHub Pages sub-path (e.g. `https://<user>.github.io/<repo>/`).

## Files
- `index.html`: the landing page (hero, who it's for, features, how it works, savings calculator, pricing, FAQ, CTA, footer, contact modal)
- `terms.html`, `privacy.html`: DRAFT placeholder legal pages (company name is `[Placeholder]`)
- `css/styles.css`: all styles (mobile first, respects `prefers-reduced-motion`)
- `js/main.js`: nav, scroll reveals, calculator, contact modal
- `js/browser-call.js`: in-browser "Talk in browser" call (hidden until a real public key is set)
- `assets/vapi-config.js`: public key and assistant id for the in-browser call
- `assets/vendor/vapi-web.js`: vendored browser bundle used by the in-browser call
- `assets/`: logo and owl mark (SVG + PNG)
- `screenshots/`: QA screenshots (not needed for publishing; you can delete this folder)
- `.nojekyll`: tells GitHub Pages to serve files as-is

## Preview locally
```bash
cd receptwise-site
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish on GitHub Pages
1. Create a new GitHub repository (public, or private on a plan that supports Pages).
2. Upload the contents of this folder (so `index.html` is at the repo root), commit to `main`.
3. In the repo go to **Settings → Pages**. Under "Build and deployment" pick
   **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, then Save.
4. After a minute the site is live at `https://<user>.github.io/<repo>/`.
5. Optional custom domain: add it under Settings → Pages → Custom domain and follow the DNS instructions.

## Call to book a demo
The live AI receptionist number is **(781) 705-7179** (`tel:+17817057179`). It is the primary
call to action: a compact pill in the hero, the final CTA, and the footer, plus a small
floating "Call now" pill in the bottom-right corner on small screens. Calling it books a free 20-minute demo.

The public contact email is **info@receptwise.com** (`mailto:info@receptwise.com`). It appears next to the phone number in the hero, the final CTA, the footer, and the contact modal, and it replaces the placeholder contact line on the Terms and Privacy pages.

## Talk in the browser
Next to the phone pill, visitors can press **Talk in browser** and speak with Nora without a phone.
The button, and the line "Calls may be recorded to improve service.", stay hidden while
`VAPI_PUBLIC_KEY` in `assets/vapi-config.js` is still `VAPI_PUBLIC_KEY_PLACEHOLDER`.
Replace that placeholder with the real public key and the button shows up in the hero,
the closing section, the footer, and the floating mobile cluster.

"Book a free 20-minute chat" stays as a secondary option. Those buttons open an on-page form
that POSTs JSON to `DEMO_REQUEST_URL` in `js/main.js`
(`https://panel.receptwise.com/api/public/demo-requests`). The body includes
`name`, `business_name`, `phone`, `email`, `business_type`, `preferred_time`,
`message`, `source_page` (the page URL), and `website` (a hidden honeypot humans do not see).
A name plus a phone number or email is required. The request times out after 8 seconds.
To send people to an external scheduler instead, set `BOOKING_URL` in `js/main.js` to that
https URL. The book buttons then open it in a new tab and skip the modal.

## Publish on Cloudflare Pages
This site is static files with relative paths and no build step. In the Pages project leave
the build command empty and set the build output directory to `/`.

## Before going live
- Replace every `[Placeholder]` (footer copyright, legal pages) with the real company/legal name.
- Have the Terms and Privacy pages written or reviewed properly; the current text is a draft.
- Review calculator assumptions in `js/main.js` (`WEEKS_PER_MONTH`, `HANDLED_SHARE`, `DEFAULTS`).
