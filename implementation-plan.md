# Niyokkam Printout Generator — Implementation Plan

## 1. Goal

Build a web app that:

1. Lets a user enter one or more **(date, content)** pairs ("Niyokkam" items) — content
   typed in Malayalam Unicode.
2. Converts each item's **content only** (not the date) from Malayalam Unicode to the
   legacy ASCII glyph codes required by the **Karthika** font, using the logic documented
   in [conversionlogic.md](conversionlogic.md).
3. Generates a **Word document (.docx)** matching the structure of the sample PDF:
   for each item — a bold, centered date heading (e.g. `July 9`) followed by a centered
   paragraph of the converted content, one item after another (page break between items
   optional/configurable, matching the "one item per section" layout seen in the sample).

## 2. Architecture decision: Static-only (no backend)

**Recommendation: pure static site, hostable on GitHub Pages. No backend required.**

Reasoning:

- The only "heavy" operation is generating a `.docx` file. This can be done **entirely in
  the browser** using the [`docx`](https://docx.js.org) JS library (pure JS, no native
  deps), which builds a real OOXML `.docx` in memory and produces a `Blob` for download
  via `Packer.toBlob()`. No server round-trip needed.
- The Unicode→ASCII conversion is pure string manipulation (a lookup table + a loop) —
  trivial to run client-side, no computation-heavy or sensitive logic that needs hiding.
- There's no persistence requirement across users/sessions described — each user's session
  is local, so no database or server state is needed.
- Static hosting means zero latency to a backend, no server costs, no cold starts — this
  directly satisfies the "fast, low overhead" requirement.
- The Karthika **font itself is never embedded** in the docx — Word renders the glyph
  codes using the Karthika font _installed on the machine that opens the document_
  (exactly like the legacy system this replaces). This is identical whether generated
  client-side or server-side, so a backend gives no advantage here.

**When a backend would be justified (not needed now, noted for completeness):**
If future requirements need server-side persistence (saved templates, shared history,
multi-user sync), user accounts, or heavier document post-processing (e.g. PDF conversion
requiring LibreOffice/`docx2pdf`), a small **Python** backend (FastAPI/Flask +
`python-docx`) could be added later. It would reuse the _same_ conversion table
(ported to Python) and expose a `/generate` endpoint. This plan does not include it
because it isn't required to meet the stated goal and would only add latency/hosting
complexity.

## 3. Tech stack

**No build step / no bundler.** React 19 is loaded directly in the browser as native ES
modules — there is no Vite, Webpack, Babel, or compile step of any kind. The whole app is
just static `.html`/`.js`/`.css` files, which is the simplest possible thing to host on
GitHub Pages (literally copy the files, no build pipeline to maintain or debug).

| Concern             | Choice                                                                                                                                                                                                                                  | Why                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Package manager     | **pnpm**                                                                                                                                                                                                                                | Used only for local dev-only tooling (running unit tests). Not used to bundle/build the shipped app — there is nothing to build |
| UI framework        | **React 19** via native browser ES modules (`<script type="module">` + an **import map**), loaded straight from a CDN (e.g. `esm.sh`/`unpkg`) — no local `node_modules` copy needed for the shipped app                                 | Declarative list/form state management for the multi-item editor, with zero build tooling                                       |
| Component authoring | Plain `React.createElement(...)` calls, **or** the tiny [`htm`](https://github.com/developit/htm) tagged-template library (also loaded via the import map) for JSX-like syntax that runs natively in the browser without any transpiler | Avoids needing JSX-to-JS compilation (Babel/SWC), which is the main reason projects normally reach for a bundler                |
| Docx generation     | [`docx`](https://www.npmjs.com/package/docx) library, loaded via the same CDN as an ES module (`https://esm.sh/docx@<version>`)                                                                                                         | Works fully in-browser, no bundling required to consume it as `type="module"`                                                   |
| Hosting             | GitHub Pages, serving the repo's static files directly (no `dist/` build artifact — the source _is_ the deployable site)                                                                                                                | Simplest possible GH Pages setup: push files, done                                                                              |
| Testing             | Plain Node test runner (`node --test`) for the converter module                                                                                                                                                                         | Converter is pure vanilla JS logic with no JSX/React involved, so it runs directly under Node with no transform step            |

No Python/backend is included in the primary plan (per the reasoning above).

## 4. Data model

Illustrative shape (plain JS objects at runtime — there's no TypeScript compiler in this
plan, so this is documentation only, not literal source code):

```ts
interface NiyokkamItem {
  id: string; // uuid/local id for list management (add/remove/reorder)
  date: string; // free text or formatted date label, e.g. "July 9"
  content: string; // raw Malayalam Unicode text (converted only at export time)
}

type NiyokkamList = NiyokkamItem[];
```

- Kept entirely in-memory (a JS array in app state). Optionally persisted to
  `localStorage` so a user doesn't lose in-progress entries on refresh (nice-to-have,
  not required).
- **Conversion is applied only at document-generation time**, not while typing/storing —
  this keeps the editable state as clean Unicode (so users can still edit/re-check what
  they typed) and isolates the conversion logic to one place.

## 5. Module breakdown

```
/src
  /converter
    mapTable.js             -- the Karthika Unicode→ASCII map (ported verbatim from source)
    unicode2ascii.js         -- pure function: (text: string) => string, per conversionlogic.md
    unicode2ascii.test.js
  /docgen
    buildDocument.js          -- (items: NiyokkamItem[]) => docx.Document
    downloadDocx.js           -- (doc: docx.Document, filename) => triggers browser download
  /components
    ItemForm.js               -- controlled form: date + content textarea, "Add Item" handler
    ItemList.js               -- renders current list of items with inline edit/delete controls
    ItemRow.js                -- single list row (edit-in-place, delete button)
    GenerateButton.js         -- "Generate Document" button + status message (loading/success/error)
  /hooks
    useNiyokkamItems.js       -- state + add/update/remove logic for the item list (optionally synced to localStorage)
  App.js                      -- composes ItemForm + ItemList + GenerateButton, owns top-level state
  main.js                     -- ReactDOM.createRoot entry point
index.html                     -- contains the <script type="importmap"> and the single
                                  <script type="module" src="./src/main.js"> app entry
style.css
```

`index.html` declares an import map so plain `import` statements in the `.js` files
resolve React/ReactDOM/`docx`/`htm` to CDN URLs, e.g.:

```html
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19.0.0",
      "react-dom/client": "https://esm.sh/react-dom@19.0.0/client",
      "docx": "https://esm.sh/docx@9.0.0",
      "htm": "https://esm.sh/htm@3.1.1",
      "htm/react": "https://esm.sh/htm@3.1.1/react"
    }
  }
</script>
<script type="module" src="./src/main.js"></script>
```

Note the explicit `"htm/react"` entry — `htm`'s React binding is a separate subpath
export, so it needs its own import-map entry alongside the bare `"htm"` package.

React is used purely as a **thin state/rendering layer** over the same pure functions
(`unicode2ascii`, `buildDocument`, `downloadDocx`) described below — none of the core
conversion or docx-generation logic is React-specific, keeping it fully unit-testable in
isolation from the UI (those modules are plain JS and run directly under Node, no DOM or
React involved).

Components are authored with `htm` bound to `React.createElement`, giving JSX-like markup
without any transpiler, e.g.:

```js
import { html } from "htm/react";
function ItemRow({ item, onEdit, onRemove }) {
  return html`<li>
    <strong>${item.date}</strong>: ${item.content}
    <button onClick=${() => onRemove(item.id)}>Delete</button>
  </li>`;
}
```

If even the `htm` dependency is undesirable, components can be written with raw
`React.createElement(...)` calls instead — slightly more verbose but with zero extra
dependencies beyond React/ReactDOM themselves.

### 5.1 `converter/unicode2ascii.js`

- Direct, cleaned port of the provided `unicode2ascii()` function.
- Exported as a pure function with no globals (replace the `var mapTable` global with an
  explicit import from `mapTable.js`).
- Priority order and special cases (ൈ / ോ,ൊ,ൌ / ്യേ,്യെ / െ,േ,്ര / default) implemented
  exactly as documented in [conversionlogic.md](conversionlogic.md) §4, preserving the
  `bRepham` flag behavior.
- Unit tests cover: plain consonants, conjuncts (ണ്ട, ക്ഷ, സ്റ്റ), each vowel-sign
  special case, reph (്ര) followed by a wrap-around vowel, and unmapped passthrough
  characters (spaces, digits, Latin text).

### 5.2 `docgen/buildDocument.js`

- Takes the item list, and for each item builds:
  - A `Paragraph` with `bold: true`, `alignment: CENTER`, text = `item.date` (heading style,
    matching sample: `July 9`).
  - A `Paragraph` with `alignment: CENTER`, `font: "Karthika"`, text =
    `unicode2ascii(item.content)`.
  - Optional spacing paragraph between items (or `PageBreak` if each item should start on
    its own page — configurable via a UI toggle, since the two attached sample PDFs show
    both "one item per page" and "all items in one page" layouts).
- Returns a single `docx.Document` containing all sections in order.

### 5.3 `docgen/downloadDocx.js`

- `Packer.toBlob(doc)` → `URL.createObjectURL` → temporary `<a download>` click → revoke
  object URL. Filename e.g. `niyokkam-<yyyymmdd>.docx`.

### 5.4 React component flow (no build tooling)

- `useNiyokkamItems` hook owns the `NiyokkamItem[]` state (via `useState`) and exposes
  `addItem`, `updateItem`, `removeItem` — the only mutation surface for the list.
- `ItemForm` is a controlled component (date + content `<textarea>`) that calls `addItem`
  on submit and clears itself.
- `ItemList` maps state to `ItemRow` components; each row supports inline edit (calls
  `updateItem`) and delete (calls `removeItem`).
- `GenerateButton` is disabled while `items.length === 0`; on click it runs an **async**
  handler (generation is still fast, but `Packer.toBlob()` from the `docx` library
  returns a `Promise`, so the handler must `await` it rather than treat it as
  synchronous):
  1. `await buildDocument(items)` (only the `Packer.toBlob` step is actually async)
  2. `await downloadDocx(doc, filename)`
  3. Sets local status state (`idle | pending | success | error`) shown inline — no
     `alert()`. The button is disabled while `pending` to prevent duplicate downloads
     from a double-click.
- `App.js` composes these three pieces and passes the shared state/handlers down as
  props (no global state library needed given the small scope — Context is unnecessary
  since state is only used by direct children of `App`).

## 6. Matching the sample structure

From the attached PDFs:

- Each entry starts with a **bold date line** (e.g. `July 9`), centered.
- Below it, the **content** text, centered, wrapped across 2–3 lines as needed.
- One sample shows **one item per page**; the other shows **all 4 items stacked on a
  single page**, separated by blank lines. The plan supports both by making
  "page break between items" a checkbox in the UI (default: off / stacked, matching the
  simpler combined-document sample), since this is purely a layout toggle in
  `buildDocument.js` (insert a `PageBreak` vs. a spacing `Paragraph`).

## 7. Efficiency considerations

- Conversion is O(n) per content string (single pass with small constant-size lookahead
  of ≤3 chars) — negligible even for large inputs.
- Document generation only runs once, on demand (button click), not on every keystroke.
- No network calls at app-runtime beyond the initial (browser-cached) CDN fetches of
  React/ReactDOM/`docx`/`htm` — there's no build step and no bundle to download beyond
  those libraries themselves, so time-to-interactive and generation time are both
  effectively instant on repeat visits (browser HTTP cache), and fast even on first visit
  since each of those libraries is small and served from a CDN edge.
- No font files are bundled (Karthika rendering depends on the font being installed in
  Word on the machine that opens the generated file) — keeps the deployed site tiny
  (a handful of small `.js`/`.html`/`.css` files, no build artifacts).

## 8. Testing & validation plan

1. Unit tests for `unicode2ascii` against a curated set of known input/output pairs
   (derived from the original mapping's special cases) — run via plain `node --test`
   (the converter module is dependency-free vanilla JS, so it needs no transform to run
   under Node).
2. Manual verification: open a generated `.docx` in Word/LibreOffice with the Karthika
   font installed and visually confirm glyphs match the sample PDFs for the 4 sample
   sentences provided.
3. Manual/browser verification of the React UI (add/edit/remove items, generate
   document) — since there's no build step, this is just opening `index.html` via a
   simple static file server (e.g. `pnpm dlx serve .` or the VS Code Live Server
   extension) and clicking through the flow.
4. Edge cases to explicitly test: content ending mid-conjunct, content with only
   Latin/digits, empty content, multiple items with mixed reph/vowel combinations.

## 9. Deployment

1. Create the file structure directly (no scaffolding CLI needed, since there's no
   framework template to generate): `index.html` at the repo root with the import map,
   plus `/src` as laid out in §5.
2. Add a minimal `package.json` with `"type": "module"` (so `node --test` treats the
   `.js` files as ES modules, matching how the browser loads them) and a
   `"test": "node --test src/converter"` script. `pnpm init` can scaffold this; it's
   dev-only and not required to run or deploy the app itself.
3. No build/compile step: the repo's files **are** the deployable site as-is.
4. Deploy via GitHub Pages pointed directly at the repo (Settings → Pages → "Deploy from
   a branch" → `main` / root, or a minimal GitHub Actions workflow that just uploads the
   repo contents with `actions/upload-pages-artifact` + `actions/deploy-pages`, with no
   install/build commands in between).
5. Pin exact CDN versions in the import map (e.g. `react@19.0.0`, not `react@19`) so the
   deployed site doesn't silently change behavior when the CDN's "latest for major
   version" resolution updates.
6. Note the browser support requirement: native `<script type="importmap">` needs a
   reasonably modern browser (Chrome/Edge 89+, Firefox 108+, Safari 16.4+). Not a
   concern for a typical desktop/GH-Pages audience, but worth being aware of if older
   browser support is ever required.

## 10. Milestones

1. Create `index.html` with the import map (React 19, ReactDOM, `docx`, `htm`/`htm/react`
   pinned to exact versions) and a placeholder `main.js` that renders "Hello" to confirm
   the no-build React setup works in the browser. **Also smoke-test the `docx` CDN import
   at this stage** (build and download a trivial one-paragraph document) — this is the
   one third-party dependency most likely to have browser/ESM compatibility quirks via
   esm.sh, so it's worth validating early rather than after the rest of the UI is built.
2. Port `mapTable` + `unicode2ascii` as a plain JS module with `node --test` unit tests
   passing.
3. Build minimal React UI: `useNiyokkamItems` hook + `ItemForm`/`ItemList` add/edit/remove.
4. Integrate the `docx` CDN module into the real flow; generate a single-item document
   and verify visually.
5. Extend to multi-item documents with the page-break/stacked toggle.
6. Polish UI (validation, status messages, optional `localStorage` persistence).
7. Enable GitHub Pages on the repo (no build step to configure) and verify the live URL.
