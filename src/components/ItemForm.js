/**
 * ItemForm.js
 *
 * Controlled form for adding a new NiyokkamItem.
 * Fields: date (text), content (textarea for Malayalam Unicode).
 * Calls addItem on submit and resets itself.
 */

import { html } from "htm/react";
import { useState, useCallback } from "react";

/**
 * @param {{ addItem: (date:string, content:string) => void }} props
 */
export function ItemForm({ addItem }) {
  const [date, setDate] = useState("");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!date.trim()) e.date = "Date is required";
    if (!content.trim()) e.content = "Content is required";
    return e;
  };

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const e2 = validate();
      if (Object.keys(e2).length > 0) {
        setErrors(e2);
        return;
      }
      addItem(date.trim(), content.trim());
      setDate("");
      setContent("");
      setErrors({});
    },
    [date, content, addItem]
  );

  return html`
    <form class="item-form" onSubmit=${handleSubmit} novalidate>
      <div class="form-group">
        <label for="date-input" class="form-label">
          <span class="label-icon">📅</span> Date
        </label>
        <input
          id="date-input"
          type="text"
          class="form-control ${errors.date ? "is-invalid" : ""}"
          placeholder="e.g. July 9"
          value=${date}
          onInput=${(e) => { setDate(e.target.value); setErrors((prev) => ({ ...prev, date: undefined })); }}
        />
        ${errors.date && html`<div class="invalid-feedback">${errors.date}</div>`}
      </div>

      <div class="form-group">
        <label for="content-input" class="form-label">
          <span class="label-icon">✍️</span> Content
          <span class="label-hint">(type in Malayalam)</span>
        </label>
        <textarea
          id="content-input"
          class="form-control malayalam-input ${errors.content ? "is-invalid" : ""}"
          placeholder="മലയാളം ഇവിടെ ടൈപ്പ് ചെയ്യുക..."
          rows="4"
          value=${content}
          onInput=${(e) => { setContent(e.target.value); setErrors((prev) => ({ ...prev, content: undefined })); }}
        ></textarea>
        ${errors.content && html`<div class="invalid-feedback">${errors.content}</div>`}
      </div>

      <button type="submit" class="btn btn-primary" id="add-item-btn">
        <span class="btn-icon">＋</span> Add Item
      </button>
    </form>
  `;
}
