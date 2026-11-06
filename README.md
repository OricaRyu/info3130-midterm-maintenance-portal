# Larchwood Member Portal: Maintenance Request

INFO3130 (The Emerging Interface), midterm project · Scenario 03: **Property Maintenance Assistant**
Author: Sébastien Violette

A responsive, accessible front-end prototype where a tenant reports a maintenance problem to their property manager.

**Core flow:** Describe issue → select category and urgency → review → submit → confirmation (reference number and timestamp).

## Screens / states
1. **Describe issue:** property, unit and area (options adapt to the property type: high-rise, townhouse, duplex or single-family home), category, urgency (an emergency call-out appears for emergencies), summary, description, optional start date and photos, entry permission, pets, and contact details (pre-filled from the signed-in member).
2. **Review:** read-only summary with "Change" links back to each field, plus "Back to edit" and "Submit request".
3. **Confirmation:** reference number, date and time, next steps based on urgency, the submitted details, "Print or save" and "Submit another request".

Validation shows an error summary and inline messages. Submitted requests are saved to `localStorage` and listed under "Your recent requests". Selecting one reopens it on the confirmation screen (titled "Request details") with its reference number, status and full details. Photos are kept by file name only.

## Tech
Plain HTML, CSS and JavaScript. There is no build step and no backend, so submission is simulated.

```
index.html          markup for all three states
css/styles.css      mobile-first styles (breakpoints 40em / 64em)
js/data.js          sample properties, categories, urgency rules
js/app.js           form logic, validation, step navigation
assets/img/         avatar, favicon
docs/               accessibility audit and axe results
```

## Run locally
```bash
python -m http.server 5173
```
Then open http://localhost:5173. You can also open `index.html` directly.

## Light and dark themes
The site follows your system setting by default. Use the **Dark mode** toggle in the top bar to override it, and your choice is remembered. Both themes use the same colour tokens in `css/styles.css`, and the logo switches to a lighter version in dark mode.

## Accessibility
Built to WCAG 2.2 AA in both themes. See [docs/ACCESSIBILITY-AUDIT.md](docs/ACCESSIBILITY-AUDIT.md) for the palette contrast table, the issues fixed and the keyboard test script.

## Out of scope
No dispatch system, staff portal, email integration or backend. Navigation items other than Maintenance show a "not part of this prototype" message.

## Credits
- Larchwood Property Management is a fictional company. The logo and illustrations are original inline SVG. Addresses and phone numbers (555) are fictional.
- Font: [Manrope](https://fonts.google.com/specimen/Manrope) (SIL Open Font License).
- Built with AI assistance (Claude Code). All design decisions were reviewed and verified by the author.
