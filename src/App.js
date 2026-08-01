/**
 * App.js
 *
 * Root component. Composes ItemForm, ItemList, and GenerateButton.
 * Owns no state directly — all state lives in useNiyokkamItems.
 */

import { html } from "htm/react";
import { useNiyokkamItems } from "./hooks/useNiyokkamItems.js";
import { ItemForm } from "./components/ItemForm.js";
import { ItemList } from "./components/ItemList.js";
import { GenerateButton } from "./components/GenerateButton.js";

export function App() {
  const { items, addItem, updateItem, removeItem, clearItems } =
    useNiyokkamItems();

  return html`
    <div class="app-shell">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <header class="app-header">
        <div class="header-inner">
          <div class="header-brand">
            <div class="header-logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="url(#g1)"/>
                <path d="M8 10h16M8 16h12M8 22h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="32" y2="32">
                    <stop stop-color="#7C3AED"/>
                    <stop offset="1" stop-color="#3B82F6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 class="header-title">Niyokkam Generator</h1>
              <p class="header-subtitle">Malayalam Unicode printout generator</p>
            </div>
          </div>
        </div>
      </header>

      <!-- ── Main content ───────────────────────────────────────────────── -->
      <main class="app-main">
        <div class="content-grid">

          <!-- Left column: add form -->
          <section class="card" aria-labelledby="add-section-title">
            <div class="card__header">
              <h2 class="card__title" id="add-section-title">
                <span class="card__icon">✍️</span> Add Niyokkam Item
              </h2>
            </div>
            <div class="card__body">
              <${ItemForm} addItem=${addItem} />
            </div>
          </section>

          <!-- Right column: list + generate -->
          <div class="right-column">
            <section class="card" aria-labelledby="list-section-title">
              <div class="card__header">
                <h2 class="card__title" id="list-section-title">
                  <span class="card__icon">📋</span> Items
                </h2>
                ${items.length > 0 && html`
                  <button
                    class="btn btn-ghost btn-sm"
                    id="clear-all-btn"
                    onClick=${clearItems}
                    title="Remove all items"
                  >Clear all</button>
                `}
              </div>
              <div class="card__body">
                <${ItemList}
                  items=${items}
                  onUpdate=${updateItem}
                  onRemove=${removeItem}
                />
              </div>
            </section>

            <section class="card card--generate" aria-labelledby="generate-section-title">
              <div class="card__header">
                <h2 class="card__title" id="generate-section-title">
                  <span class="card__icon">📄</span> Export
                </h2>
              </div>
              <div class="card__body">
                <${GenerateButton} items=${items} />
              </div>
            </section>
          </div>

        </div>
      </main>

      <!-- ── Footer ────────────────────────────────────────────────────── -->
      <footer class="app-footer">
        <p>Niyokkam Printout Generator · Converts Malayalam Unicode to Karthika font glyphs</p>
      </footer>

    </div>
  `;
}
