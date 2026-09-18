import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { STATUS_LABELS } from '../constants/statusColors';
import type { BranchItem } from '../components/BranchList';
import type { NationalGrowthMetrics } from '../features/expansion/leadsRepository';

/**
 * Módulo de exportación de datos (cliente). Generación pura y tipada:
 * cada generador devuelve un `ExportPayload` inmutable (filename + mime + data)
 * y la descarga real vive en `downloadExport` (única pieza con side effects).
 */

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export type ExportPayload = {
  filename: string;
  mime: string;
  data: string | Uint8Array;
};

export type ReportRow = {
  sucursal: string;
  contacto: string;
  estado: string;
  ciudad: string;
  rif: string;
  status: string;
  fechaCreacion: string;
  fechaApertura: string;
};

export const REPORT_HEADERS = [
  'Sucursal',
  'Contacto',
  'Estado',
  'Ciudad',
  'RIF',
  'Estatus',
  'Fecha de creación',
  'Fecha de apertura'
] as const;

const CSV_MIME = 'text/csv;charset=utf-8;';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_MIME = 'application/pdf';

function escapeCsvCell(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function formatCell(value: string | null | undefined): string {
  return (value ?? '').toString().trim();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return formatCell(iso);
  return new Date(timestamp).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function reportTimestamp(referenceDate = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${referenceDate.getFullYear()}${pad(referenceDate.getMonth() + 1)}${pad(referenceDate.getDate())}` +
    `_${pad(referenceDate.getHours())}${pad(referenceDate.getMinutes())}`
  );
}

/** Transforma sucursales registradas en filas de reporte listas para exportar. */
export function buildExportRows(branches: readonly BranchItem[]): ReportRow[] {
  return branches.map((branch) => ({
    sucursal: formatCell(branch.store_name),
    contacto: formatCell(branch.contact_name),
    estado: formatCell(branch.state),
    ciudad: formatCell(branch.city),
    rif: formatCell(branch.rif),
    status: STATUS_LABELS[branch.status] ?? formatCell(branch.status),
    fechaCreacion: formatDate(branch.fecha_creacion),
    fechaApertura: formatDate(branch.fecha_apertura)
  }));
}

/** Serializa filas a CSV con BOM (compatibilidad Excel) y escaping RFC 4180. */
export function toCsvString(rows: readonly ReportRow[]): string {
  const lines = [REPORT_HEADERS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.sucursal,
        row.contacto,
        row.estado,
        row.ciudad,
        row.rif,
        row.status,
        row.fechaCreacion,
        row.fechaApertura
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** Filas de resumen (resumen ejecutivo del reporte). */
export function buildSummaryRows(
  branches: readonly BranchItem[],
  growth: NationalGrowthMetrics
): string[][] {
  return [
    ['Sucursales registradas', branches.length.toString()],
    ['Tiendas activas', growth.totalApprovedActive.toString()],
    ['En negociación', growth.totalInNegotiation.toString()],
    ['Nuevas esta semana', growth.weeklyNewLeads.toString()],
    ['Nuevas este mes', growth.monthlyNewLeads.toString()]
  ];
}

/** Genera el CSV de sucursales (puro; sin side effects de descarga). */
export function generateBranchesCsv(branches: readonly BranchItem[]): ExportPayload {
  return {
    filename: `lifephone_reporte_sucursales_${reportTimestamp()}.csv`,
    mime: CSV_MIME,
    data: toCsvString(buildExportRows(branches))
  };
}

/** Genera el libro Excel (.xlsx) con hoja de resumen + hoja de sucursales. */
export function generateBranchesXlsx(
  branches: readonly BranchItem[],
  growth: NationalGrowthMetrics
): ExportPayload {
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['LifePhone — Resumen de Expansión'],
    [],
    ...buildSummaryRows(branches, growth)
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

  const rows = buildExportRows(branches);
  const branchesSheet = XLSX.utils.json_to_sheet(rows, { header: [...REPORT_HEADERS] });
  XLSX.utils.book_append_sheet(workbook, branchesSheet, 'Sucursales');

  const written = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const data =
    written instanceof Uint8Array ? written : new Uint8Array(written as ArrayBuffer);
  return {
    filename: `lifephone_reporte_sucursales_${reportTimestamp()}.xlsx`,
    mime: XLSX_MIME,
    data
  };
}

/** Genera el PDF tabular (formato limpio y profesional) con resumen + detalle. */
export function generateBranchesPdf(
  branches: readonly BranchItem[],
  growth: NationalGrowthMetrics
): ExportPayload {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LifePhone — Reporte de Expansión', 40, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageWidth - 40, 48, {
    align: 'right'
  });
  doc.setTextColor(0);

  autoTable(doc, {
    head: [['Resumen', 'Valor']],
    body: buildSummaryRows(branches, growth),
    startY: 70,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [5, 5, 5], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 220 } },
    margin: { left: 40, right: 40 }
  });

  autoTable(doc, {
    head: [[...REPORT_HEADERS]],
    body: buildExportRows(branches).map((row) => [
      row.sucursal,
      row.contacto,
      row.estado,
      row.ciudad,
      row.rif,
      row.status,
      row.fechaCreacion,
      row.fechaApertura
    ]),
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [0, 68, 255], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 246, 250] },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Página ${pageCount} · LifePhone CRM de Expansión`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'center' }
      );
      doc.setTextColor(0);
    }
  });

  const data = doc.output('arraybuffer') as ArrayBuffer;
  return {
    filename: `lifephone_reporte_sucursales_${reportTimestamp()}.pdf`,
    mime: PDF_MIME,
    data: new Uint8Array(data)
  };
}

/**
 * Descarga el payload generado en el navegador (única pieza con side effects).
 * Separa la generación de la descarga para que la lógica sea testeable.
 */
export function downloadExport(payload: ExportPayload): void {
  const blob = new Blob([payload.data as BlobPart], { type: payload.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = payload.filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
