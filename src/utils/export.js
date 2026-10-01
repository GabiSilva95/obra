// CSV export
export function exportCsv(filename, rows, headers) {
  const escape = v => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Design-system custom properties of the current page, so the print window can use var(--token).
function tokensCss() {
  const cs = getComputedStyle(document.documentElement);
  return [...cs].filter(p => p.startsWith("--")).map(p => `${p}:${cs.getPropertyValue(p)}`).join(";");
}

// Print-based PDF export (uses browser print dialog)
export function exportPdf(title, htmlContent) {
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>${title}</title>
    <style>
      :root { ${tokensCss()} }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: var(--font-sans); color: var(--text-primary); background: var(--surface-card); padding: var(--space-8); font-size: var(--fs-p6); }
      h1 { font: var(--type-page-title); font-size: var(--fs-p3); margin-bottom: var(--space-1); }
      .sub { font-size: var(--fs-caption); color: var(--text-secondary); margin-bottom: var(--space-6); }
      table { width: 100%; border-collapse: collapse; margin-top: var(--space-3); }
      th { background: var(--surface-table-header); color: var(--text-on-sidebar); text-align: left; padding: var(--space-2) var(--space-3); font-size: var(--fs-caption); font-weight: var(--fw-semibold); }
      td { padding: var(--space-2) var(--space-3); border-bottom: var(--border-w) solid var(--border-subtle); }
      tr:last-child td { border-bottom: none; }
      .section { margin-bottom: var(--space-8); }
      .section-title { font: var(--type-card-title); font-size: var(--fs-p5-5); margin-bottom: var(--space-2-5); padding-bottom: var(--space-1-5); border-bottom: var(--border-w) solid var(--border-default); }
      @media print { body { padding: 0; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
  </head><body>${htmlContent}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
  win.document.close();
}
