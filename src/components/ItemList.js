/**
 * ItemList.js
 *
 * Renders the ordered list of NiyokkamItems using ItemRow.
 * Shows an empty-state message when there are no items.
 */

import { html } from "htm/react";
import { ItemRow } from "./ItemRow.js";

/**
 * @param {{
 *   items: Array<{id:string, date:string, content:string}>,
 *   onUpdate: (id:string, patch:object) => void,
 *   onRemove: (id:string) => void,
 * }} props
 */
export function ItemList({ items, onUpdate, onRemove }) {
  if (items.length === 0) {
    return html`
      <div class="empty-state" id="empty-state">
        <div class="empty-state__icon">📄</div>
        <p class="empty-state__title">No items yet</p>
        <p class="empty-state__subtitle">
          Add a date and Malayalam content above to get started.
        </p>
      </div>
    `;
  }

  return html`
    <div class="item-list-wrapper">
      <div class="item-list-header">
        <span class="item-list-count">${items.length} item${items.length !== 1 ? "s" : ""}</span>
      </div>
      <ul class="item-list" id="item-list">
        ${items.map(
          (item, i) => html`
            <${ItemRow}
              key=${item.id}
              item=${item}
              index=${i}
              onUpdate=${onUpdate}
              onRemove=${onRemove}
            />
          `
        )}
      </ul>
    </div>
  `;
}
