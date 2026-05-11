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

// Print-based PDF export (uses browser print dialog)
export function exportPdf(title, htmlContent) {
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, sans-serif; color: #111; background: #fff; padding: 32px; font-size: 12px; }
      h1 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
      .sub { font-size: 11px; color: #666; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 2px solid #e5e7eb; }
      td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
      tr:last-child td { border-bottom: none; }
      .section { margin-bottom: 28px; }
      .section-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>${htmlContent}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
  win.document.close();
}
