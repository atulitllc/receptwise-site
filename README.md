# ReceptWise marketing site (prototype v1)

Static HTML/CSS/vanilla JS. No build step, no frameworks. All paths are relative,
so it works at a GitHub Pages sub-path (e.g. `https://<user>.github.io/<repo>/`).

## Files
- `index.html`: the landing page (hero, who it's for, features, how it works, savings calculator, pricing, FAQ, CTA, footer, contact modal)
- `terms.html`, `privacy.html`: DRAFT placeholder legal pages (company name is `[Placeholder]`)
- `css/styles.css`: all styles (mobile first, respects `prefers-reduced-motion`)
- `js/main.js`: nav, scroll reveals, calculator, contact modal
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

## Swap in a real booking link
There is no booking system yet. All "Book a free chat" / "Start free pilot" buttons open an
on-page form that **does not send anything**. Two options:

- **Calendly (or similar):** open `js/main.js` and set
  `var BOOKING_URL = "https://calendly.com/your-team/20min";`
  Every button then opens that link in a new tab instead of the modal.
- **Keep the form, send it somewhere:** in `js/main.js`, find the comment
  `PROTOTYPE: nothing is sent` inside the contact form submit handler and replace it with a
  `fetch()` to your form backend (Formspree, Getform, etc.). There's a matching comment in
  `index.html` above the form.

## Before going live
- Replace every `[Placeholder]` (footer copyright, legal pages) with the real company/legal name.
- Have the Terms and Privacy pages written or reviewed properly; the current text is a draft.
- Review calculator assumptions in `js/main.js` (`WEEKS_PER_MONTH`, `HANDLED_SHARE`, `DEFAULTS`).
