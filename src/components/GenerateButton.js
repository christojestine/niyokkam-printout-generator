/**
 * GenerateButton.js
 *
 * Format selector (Word .docx / PDF) + "Generate Document" button + status
 * feedback. Disabled when items list is empty or while generation is in
 * progress. Each item is rendered on its own page (see buildDocument.js /
 * buildPdf.js).
 */

import { html } from "htm/react";
import { useState, useCallback } from "react";
import { buildDocument } from "../docgen/buildDocument.js";
import { downloadDocx } from "../docgen/downloadDocx.js";
import { buildPdf } from "../docgen/buildPdf.js";
import { downloadPdf } from "../docgen/downloadPdf.js";

/**
 * @param {{
 *   items: Array<{id:string, date:string, content:string}>,
 * }} props
 */
export function GenerateButton({ items }) {
  const [status, setStatus] = useState("idle"); // "idle" | "pending" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const [format, setFormat] = useState("pdf"); // "docx" | "pdf"

  const handleGenerate = useCallback(async () => {
    if (items.length === 0 || status === "pending") return;

    setStatus("pending");
    setErrorMsg("");

    try {
      if (format === "pdf") {
        const blob = await buildPdf(items);
        downloadPdf(blob);
      } else {
        const doc = await buildDocument(items);
        await downloadDocx(doc);
      }
      setStatus("success");
      // Auto-reset success state after 4 seconds
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      console.error("Document generation failed:", err);
      setErrorMsg(err?.message ?? "Unknown error");
      setStatus("error");
    }
  }, [items, format, status]);

  const isDisabled = items.length === 0 || status === "pending";

  return html`
    <div class="generate-section">
      <div class="generate-options" role="radiogroup" aria-label="Export format">
        <label class="radio-label">
          <input
            type="radio"
            name="export-format"
            value="docx"
            checked=${format === "docx"}
            onChange=${() => setFormat("docx")}
          />
          <span>Word (.docx)</span>
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="export-format"
            value="pdf"
            checked=${format === "pdf"}
            onChange=${() => setFormat("pdf")}
          />
          <span>PDF</span>
        </label>
      </div>

      <button
        id="generate-btn"
        class="btn btn-generate ${status === "pending" ? "btn--loading" : ""}"
        onClick=${handleGenerate}
        disabled=${isDisabled}
        aria-busy=${status === "pending"}
      >
        ${status === "pending"
          ? html`<span class="spinner"></span> Generating…`
          : html`<span class="btn-icon">⬇</span> Generate ${format === "pdf" ? "PDF" : "Document"}`}
      </button>

      ${status === "success" && html`
        <div class="status-badge status-badge--success" role="status">
          ✓ Document downloaded successfully!
        </div>
      `}
      ${status === "error" && html`
        <div class="status-badge status-badge--error" role="alert">
          ✕ Generation failed: ${errorMsg}
        </div>
      `}
      ${items.length === 0 && html`
        <p class="generate-hint">Add at least one item above to enable export.</p>
      `}
    </div>

    ${status === "pending" && format === "pdf" && html`
      <div class="generating-overlay" role="status" aria-live="polite">
        <span class="spinner spinner--lg"></span>
        <p>Generating PDF…</p>
      </div>
    `}
  `;
}
