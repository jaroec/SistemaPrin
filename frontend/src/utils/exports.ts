// frontend/src/utils/exports.ts
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Sale } from '@/types';

// Convierte array de ventas a hoja Excel
export const exportToExcel = (rows: Sale[], opts?: { filename?: string; sheetName?: string }) => {
  const data = rows.map((r) => ({
    Código: r.code,
    Fecha: new Date(r.created_at).toLocaleString(),
    Cliente: r.client_name || 'Público General',
    Total: r.total_usd ?? 0,
    Pagado: r.paid_usd ?? 0,
    Pendiente: r.balance_usd ?? 0,
    Estado: r.status,
    Tipo: r.type || '',
    Sucursal: r.branch || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, opts?.sheetName || 'Reporte');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), opts?.filename || 'reporte.xlsx');
};

// Exportar PDF básico: genera una tabla (captura DOM si quieres incluir gráficos)
// Aquí esperamos que el caller pase `tableElementId` o usaremos un canvas de la página.
export const exportToPDF = async (payload: {
  title: string;
  filters?: Record<string, any>;
  tableData: Sale[];
  includeCharts?: boolean;
  // opcional: elementIdToCapture?: string;
}) => {
  // Generamos un HTML resumido para insertar en el PDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 40;
  doc.setFontSize(14);
  doc.text(payload.title, margin, 50);

  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString()}`, margin, 68);
  // Filtros
  if (payload.filters) {
    doc.setFontSize(9);
    doc.text(`Filtros: ${JSON.stringify(payload.filters)}`, margin, 86, { maxWidth: 520 });
  }

  // Tabla simple (limitamos filas para que quepan)
  const startY = 110;
  const pageWidth = doc.internal.pageSize.getWidth();
  // cabeceras
  doc.setFontSize(9);
  const headers = ['Código','Fecha','Cliente','Total','Pagado','Pendiente','Estado'];
  const colWidths = [60,90,130,60,60,60,60];

  let y = startY;
  doc.setFillColor(245,245,245);
  doc.rect(margin - 6, y - 12, pageWidth - margin * 2 + 12, 18, 'F');
  let x = margin;
  headers.forEach((h, i) => {
    doc.text(h, x, y);
    x += colWidths[i] || 60;
  });
  y += 18;

  const rows = payload.tableData.slice(0, 40); // limitamos 40 filas
  rows.forEach((r) => {
    x = margin;
    const cells = [
      r.code,
      new Date(r.created_at).toLocaleString(),
      r.client_name || 'Público General',
      (r.total_usd ?? 0).toFixed(2),
      (r.paid_usd ?? 0).toFixed(2),
      (r.balance_usd ?? 0).toFixed(2),
      r.status,
    ];
    cells.forEach((c, i) => {
      doc.text(String(c), x, y);
      x += colWidths[i] || 60;
    });
    y += 16;
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 40;
    }
  });

  // Si includeCharts: intentamos capturar el DOM (requiere que desde la UI se le pase el elemento)
  if (payload.includeCharts) {
    try {
      // Buscamos un elemento con id 'charts-root' en la página
      const el = document.getElementById('charts-root');
      if (el) {
        const canvas = await html2canvas(el, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        doc.addPage();
        const imgProps = doc.getImageProperties(imgData);
        const pdfWidth = doc.internal.pageSize.getWidth() - margin*2;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        doc.addImage(imgData, 'PNG', margin, 40, pdfWidth, pdfHeight);
      }
    } catch (e) {
      console.warn('No se pudo capturar gráficos para PDF', e);
    }
  }

  doc.save(`reporte_${new Date().toISOString().slice(0,10)}.pdf`);
};
