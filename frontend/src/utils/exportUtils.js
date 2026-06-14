/**
 * Export utilities for PDF, Excel, and CSV
 * Uses browser-native approaches to avoid heavy dependencies
 */

// ==================== CSV Export ====================
export const exportToCSV = (data, columns, filename = 'report') => {
  if (!data || data.length === 0) return;

  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      // Escape commas and quotes in CSV
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? '';
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
};

// ==================== Excel Export (using simple HTML table) ====================
export const exportToExcel = (data, columns, filename = 'report') => {
  if (!data || data.length === 0) return;

  let table = '<table border="1"><thead><tr>';
  columns.forEach(c => {
    table += `<th style="background:#10b981;color:white;font-weight:bold;padding:8px">${c.label}</th>`;
  });
  table += '</tr></thead><tbody>';

  data.forEach(row => {
    table += '<tr>';
    columns.forEach(c => {
      const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      table += `<td style="padding:6px">${val ?? ''}</td>`;
    });
    table += '</tr>';
  });
  table += '</tbody></table>';

  const blob = new Blob(
    [`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>${table}</body></html>`],
    { type: 'application/vnd.ms-excel' }
  );
  downloadBlob(blob, `${filename}.xls`);
};

// ==================== PDF Export (using print window) ====================
export const exportToPDF = (data, columns, title = 'Report') => {
  if (!data || data.length === 0) return;

  let table = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="color: #1a1a2e; margin-bottom: 5px;">${title}</h1>
      <p style="color: #666; font-size: 12px; margin-bottom: 20px;">Generated: ${new Date().toLocaleString()}</p>
      <table style="width:100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr>`;
  columns.forEach(c => {
    table += `<th style="background:#10b981;color:white;padding:10px 8px;text-align:left;border:1px solid #ddd">${c.label}</th>`;
  });
  table += `</tr></thead><tbody>`;

  data.forEach((row, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#f9f9f9';
    table += `<tr style="background:${bg}">`;
    columns.forEach(c => {
      const val = typeof c.accessor === 'function' ? c.accessor(row) : row[c.accessor];
      table += `<td style="padding:8px 8px;border:1px solid #eee">${val ?? ''}</td>`;
    });
    table += '</tr>';
  });
  table += '</tbody></table></div>';

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html><head><title>${title}</title></head>
    <body onload="window.print(); window.close();">${table}</body></html>
  `);
  printWindow.document.close();
};

// ==================== Helper ====================
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
