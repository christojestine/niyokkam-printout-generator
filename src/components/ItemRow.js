/**
 * ItemRow.js
 *
 * Single row in the item list — supports inline edit and delete.
 */

import { html } from "htm/react";
import { useState, useCallback } from "react";

/**
 * @param {{
 *   item: {id:string, date:string, content:string},
 *   index: number,
 *   onUpdate: (id:string, patch:object) => void,
 *   onRemove: (id:string) => void,
 * }} props
 */
export function ItemRow({ item, index, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState(item.date);
  const [draftContent, setDraftContent] = useState(item.content);

  const startEdit = useCallback(() => {
    setDraftDate(item.date);
    setDraftContent(item.content);
    setEditing(true);
  }, [item]);

  const saveEdit = useCallback(() => {
    if (!draftDate.trim() || !draftContent.trim()) return;
    onUpdate(item.id, { date: draftDate.trim(), content: draftContent.trim() });
    setEditing(false);
  }, [item.id, draftDate, draftContent, onUpdate]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  if (editing) {
    return html`
      <li class="item-row item-row--editing" id="item-row-${item.id}">
        <div class="item-row__index">${index + 1}</div>
        <div class="item-row__fields">
          <input
            class="form-control form-control--sm"
            value=${draftDate}
            onInput=${(e) => setDraftDate(e.target.value)}
            placeholder="Date"
            aria-label="Edit date"
          />
          <textarea
            class="form-control form-control--sm malayalam-input"
            rows="3"
            value=${draftContent}
            onInput=${(e) => setDraftContent(e.target.value)}
            placeholder="Content"
            aria-label="Edit content"
          ></textarea>
        </div>
        <div class="item-row__actions">
          <button
            class="btn btn-success btn-sm"
            onClick=${saveEdit}
            id="save-item-${item.id}"
            title="Save changes"
          >✓</button>
          <button
            class="btn btn-ghost btn-sm"
            onClick=${cancelEdit}
            id="cancel-edit-${item.id}"
            title="Cancel edit"
          >✕</button>
        </div>
      </li>
    `;
  }

  return html`
    <li class="item-row" id="item-row-${item.id}">
      <div class="item-row__index">${index + 1}</div>
      <div class="item-row__content">
        <div class="item-row__date">${item.date}</div>
        <div class="item-row__text malayalam-display">${item.content}</div>
      </div>
      <div class="item-row__actions">
        <button
          class="btn btn-ghost btn-sm"
          onClick=${startEdit}
          id="edit-item-${item.id}"
          title="Edit item"
        >✎</button>
        <button
          class="btn btn-danger btn-sm"
          onClick=${() => onRemove(item.id)}
          id="delete-item-${item.id}"
          title="Delete item"
        >🗑</button>
      </div>
    </li>
  `;
}
