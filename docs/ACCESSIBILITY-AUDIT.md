# Accessibility audit: Larchwood maintenance request

**Target:** WCAG 2.2 Level AA (this also covers WCAG 2.1 AA, because 2.2 includes every 2.1 criterion except 4.1.1 Parsing, which is obsolete).
**Date:** 2026-11-06
**Tools:** axe-core 4.10.2 (run in Chromium), manual keyboard testing, manual contrast calculation (WCAG relative-luminance formula), viewport testing at 320, 375, 1024 and 1440 px.

> Automated tools find only part of WCAG issues. These results come from automated testing plus manual checks. They are not a claim of full conformance.

## 1. Colour palette and contrast (1.4.3, 1.4.6, 1.4.11)

| Token | Hex | Used for | Pair checked | Ratio | Result |
|---|---|---|---|---|---|
| ink | `#1B2430` | Body text | on white / on page `#F4F5F7` | 15.65 / 14.35 | AAA |
| muted | `#4A5565` | Hints, secondary text | on white / page / utility `#EEF1F5` | 7.56 / 6.93 / 6.67 | AA (AAA on white) |
| navy-900 | `#16202E` | Hero, dark cards, footer | white text | 16.40 | AAA |
| navy-700 | `#1F3A5F` | Primary buttons, links | white on it / it on white | 11.48 | AAA |
| gold-500 | `#C9A55A` | CTA background, eyebrow on navy | navy text on gold / gold on lightest hero gradient `#243245` | 7.04 / 5.57 | AA+ |
| gold-600 | `#B8913F` | CTA hover | navy text on it | 5.59 | AA |
| hero lede | `#C7CED8` | Hero paragraph | on `#243245` (worst case) | 8.19 | AAA |
| error | `#B42318` | Error text, emergency pill | on white / on `#FEF3F2` | 6.57 / 6.05 | AA |
| success | `#1E6B3A` | Confirmation | on white / on `#ECF7EF` | 6.52 / 5.94 | AA |
| warn | `#7A3E00` | "Urgent" pill, char counter | on `#FFF4E5` | 7.68 | AAA |
| border-strong | `#6B7585` | Form control borders (non-text) | on white / page | 4.66 / 4.27 | ≥ 3:1 required |
| focus | `#1D4ED8` | Focus ring on light surfaces | on white / `#E8EEF6` / `#FEF3F2` | 6.70 / 5.74 / 6.16 | ≥ 3:1 required |
| focus-dark | `#E8C77A` | Focus ring on navy | on `#16202E` | 10.06 | ≥ 3:1 required |

### 1b. Dark theme

The site follows the operating-system setting (`prefers-color-scheme`) by default. The theme button in the utility bar overrides it. The button is labelled with the action it performs: it shows a moon and "Dark mode" in light mode, and a sun and "Light mode" in dark mode, and its accessible name is "Switch to Light/Dark mode". It deliberately does not use `aria-pressed`, because a changing label combined with a pressed state would announce contradictory information. The choice is saved in `localStorage`. A small inline script in `<head>` applies the saved theme before first paint, so the page never flashes the wrong theme. The navy hero, emergency card and footer stay navy in both themes. The logo switches to a lighter version (`--heading` `#F3F6FA` with a lighter gold accent, `#D9B970`).

**Why it matters for these users:** some tenants have light sensitivity, migraines or low vision, or are reporting a problem at night. Others, including some people with astigmatism, read light text on dark backgrounds less easily. So dark mode is an option alongside light, not a replacement.

| Token | Dark hex | Pair checked | Ratio | Result |
|---|---|---|---|---|
| ink | `#E8EDF3` | on surface `#182230` / page `#0F1621` / utility `#1F2B3C` | 13.61 / 15.42 / 12.14 | AAA |
| muted | `#A7B2C1` | on surface / page / utility / selected tint `#22344D` | 7.46 / 8.45 / 6.66 / 5.87 | AA+ |
| heading (incl. logo) | `#F3F6FA` | on surface / utility | 14.79 / 13.19 | AAA |
| link / primary | `#9EC1F0` | on surface / page / tint | 8.65 / 9.80 / 6.81 | AA+ |
| on-accent | `#0F1621` | on primary `#9EC1F0` / hover `#C3D9F7` / error `#FF9B8F` / success `#7FD6A0` | 9.80 / 12.61 / 8.93 / 10.40 | AAA |
| error | `#FF9B8F` | on surface / error-bg `#3A1D1F` | 7.89 / 7.52 | AAA |
| success | `#7FD6A0` | on surface / success-bg `#15301F` | 9.18 / 8.16 | AAA |
| warn | `#F6C177` | on surface / warn-bg `#36290F` | 9.78 / 8.65 | AAA |
| border-strong | `#7F8C9E` | on surface / page / utility (non-text) | 4.69 / 5.31 / 4.18 | ≥ 3:1 required |
| focus | `#8AB4FF` | on surface / page / tint / error-bg / utility | 7.67 / 8.69 / 6.03 / 7.31 / 6.84 | ≥ 3:1 required |
| logo accent | `#D9B970` | on surface (non-text) | 8.49 | ≥ 3:1 required |

axe-core 4.10.2 in dark mode: **0 violations** on the form, the error state, the emergency selection, review and confirmation, at 1440 px and 375 px. The only items flagged for manual review are the hero gradient contrast checks, and those were verified manually above.

Colour never carries meaning by itself (1.4.1). Urgency pills always show text ("Emergency", "Urgent" and so on). Errors use text, an icon, a thicker red left border and `aria-invalid`. Completed steps show a check mark plus hidden "(completed)" text.

## 2. Issues found and fixed (before → after)

| # | Issue | WCAG | How it was found | Fix |
|---|---|---|---|---|
| 1 | Utility bar, hero and progress stepper were outside any landmark (axe `region`, 3 nodes) | 1.3.1 (best practice) | axe-core | Utility bar moved into `<header>`; hero and stepper moved into `<main>` (see `docs/audit/axe-before.json` → `axe-after.json`) |
| 2 | `aria-invalid` was set on urgency/entry `<fieldset>` elements, where role=group does not allow it | 4.1.2 | axe-core (`aria-prohibited-attr`, error state) | `aria-invalid` now goes on each radio; the fieldset keeps `aria-describedby` pointing at the error |
| 3 | Error summary `div` used `aria-labelledby` with no role | 4.1.2 | axe-core (needs review) | Added `role="group"` |
| 4 | Hidden inline error paragraphs still showed a ⚠ glyph (CSS `display:flex` overrode `[hidden]`) | 1.3.1 / visual | Manual visual check | Global `[hidden]{display:none !important}` |
| 5 | Progress step labels cut off ("Descri…") at 375 px | 1.4.10 Reflow | Manual mobile test | Below 640 px, steps stack the number above the label so the full text wraps |
| 6 | Logo mark shrank to 0 width in the desktop header at 1024 px | Visual | Manual test | `flex: none` on the brand |
| 7 | Changing steps scrolled to page top, so on mobile the new content was below the fold | 2.4.3 / usability | Manual mobile test | Scrolls the stepper into view and focuses the step heading |
| 8 | The theme toggle and member info made the mobile utility bar 3 rows (120 px) tall | 1.4.10 / usability | Manual test at 375 px | Below 640 px the toggle is icon-only (36×36 px, accessible name "Dark mode" kept), so the bar is 2 rows (88 px) |

## 3. Implemented accessibility features (by criterion)

- **1.3.1 Info and relationships:** native `<label for>` on every control. Radio groups use `<fieldset>`/`<legend>`. The review and confirmation screens use `<dl>`. Landmarks: header, nav, main, aside, footer.
- **1.3.5 Identify input purpose:** `autocomplete="name"`, `"email"`, `"tel"`.
- **1.4.4 / 1.4.10 / 1.4.12:** sizes are in rem, there is no fixed height on text, and no horizontal scroll at 320 px.
- **2.1.1 Keyboard:** every control is a native element (select, radio, button, dialog). The mobile menu is a disclosure button with `aria-expanded`, and Escape closes it and returns focus.
- **2.4.1 Bypass blocks:** "Skip to main content" link.
- **2.4.2 Page titled:** `document.title` updates for each step.
- **2.4.3 Focus order:** focus moves to the step heading on step change, to the error summary on failed validation, and back to the "Clear form" button when the dialog closes.
- **2.4.6 / 2.4.7 / 2.4.11 / 2.4.13 Focus:** 3 px focus ring with 2 px offset, ≥ 3:1 against every background. Nothing is sticky, so focus is never covered.
- **2.5.8 Target size (minimum):** buttons and inputs are at least 44 px tall, and inline "Change" links are at least 28 px.
- **3.2.2 On input:** choosing a property never moves focus. It only filters options, and a polite live region explains what changed.
- **3.3.1 / 3.3.3 Error identification and suggestion:** a GOV.UK-style error summary with links to each field, plus inline errors that say how to fix the problem ("Enter a 10-digit phone number, for example…").
- **3.3.2 Labels or instructions:** optional fields are marked "(optional)", and hints are linked with `aria-describedby`.
- **3.3.4 Error prevention:** a review step before submission, and the "Clear form" action asks for confirmation in a modal dialog.
- **3.3.7 Redundant entry:** name and email are pre-filled from the member account. "Change" links on the review screen return you to the exact field with your data kept.
- **4.1.3 Status messages:** toast and property note use `role="status"` / `aria-live="polite"`.
- **User preferences:** `prefers-reduced-motion` and `forced-colors` (Windows High Contrast) are supported. There is also a print stylesheet for the confirmation receipt.

## 4. Keyboard test script (performed)

1. Load the page and press Tab. The skip link appears, and Enter jumps to main.
2. At 375 px, Tab to "Menu" and press Enter. The menu opens, and Tab moves through its links. Escape closes it and focus returns to "Menu".
3. Tab to "Review request" with an empty form and press Enter. Focus moves to the error summary, which lists 8 errors. Enter on a link focuses that field.
4. Fill the form using only the keyboard. Arrow keys change the urgency and entry radios. Choosing "Emergency" shows the emergency call-out.
5. Press "Review request". Focus moves to the "Step 2 of 3" heading. "Change" on a row returns to that field.
6. Press "Submit request". Focus moves to the "Request submitted" heading, which shows the reference number and timestamp.
7. "Submit another request" returns to an empty step 1 with name and email pre-filled.
8. "Clear form" opens the dialog with focus on "Keep my answers". Escape closes it and focus returns to the trigger.

## 5. Known limitations (justified)

- **Photo attachments** are previewed locally only. There is no upload, because a backend is out of scope.
- **Screen reader testing** was done by inspecting the accessibility tree. A full NVDA/VoiceOver pass is still recommended for the final report.
- **Google Fonts (Manrope)** loads from a CDN. If it is blocked, the system font fallback keeps the same contrast and layout.
