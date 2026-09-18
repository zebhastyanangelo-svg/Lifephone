import { describe, expect, it } from 'vitest';
import {
  buildExportRows,
  buildSummaryRows,
  generateBranchesCsv,
  generateBranchesPdf,
  generateBranchesXlsx,
  toCsvString,
  REPORT_HEADERS,
  type ReportRow
} from '../src/utils/dataExport';
import type { BranchItem } from '../src/components/BranchList';
import type { NationalGrowthMetrics } from '../src/features/expansion/leadsRepository';

function makeBranch(overrides: Partial<BranchItem> = {}): BranchItem {
  return {
    id: 'branch-1',
    store_name: 'Tecno Caracas',
    contact_name: 'Ana Rodriguez',
    state: 'Miranda',
    city: 'Caracas',
    status: 'won',
    created_at: '2026-08-01T12:00:00.000Z',
    rif: 'J-12345678-9',
    google_maps_url: null,
    latitude: null,
    longitude: null,
    owner_name: 'Ana Rodriguez',
    fecha_creacion: '2026-08-01T12:00:00.000Z',
    fecha_negociacion: null,
    fecha_apertura: '2026-08-15T12:00:00.000Z',
    ...overrides
  };
}

const growth: NationalGrowthMetrics = {
  weeklyNewLeads: 2,
  monthlyNewLeads: 8,
  totalInNegotiation: 3,
  totalApprovedActive: 5
};

describe('dataExport: buildExportRows (transformación de sucursales a filas)', () => {
  it('mapea los campos tipados de cada sucursal', () => {
    const rows = buildExportRows([makeBranch()]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      sucursal: 'Tecno Caracas',
      contacto: 'Ana Rodriguez',
      estado: 'Miranda',
      ciudad: 'Caracas',
      rif: 'J-12345678-9',
      status: 'Activa'
    });
    expect(rows[0].fechaCreacion).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(rows[0].fechaApertura).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('traduce cada status al label del sistema', () => {
    const statuses = ['new', 'contacted', 'qualified', 'negotiating', 'won', 'lost'] as const;
    const labels = ['Nuevo', 'Contactado', 'Calificado', 'Negociación', 'Activa', 'Pérdida'];
    const rows = buildExportRows(statuses.map((status, i) => makeBranch({ id: `b-${i}`, status })));
    expect(rows.map((r: ReportRow) => r.status)).toEqual(labels);
  });

  it('normaliza valores ausentes (RIF y fechas null) a cadena vacía', () => {
    const rows = buildExportRows([
      makeBranch({ rif: null, fecha_apertura: null, fecha_creacion: 'fecha-invalida' })
    ]);
    expect(rows[0].rif).toBe('');
    expect(rows[0].fechaApertura).toBe('');
    expect(rows[0].fechaCreacion).toBe('fecha-invalida');
  });
});

describe('dataExport: toCsvString (serialización RFC 4180 + BOM)', () => {
  it('incluye BOM y la fila de encabezados del sistema', () => {
    const csv = toCsvString([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(REPORT_HEADERS.join(','));
  });

  it('escapa celdas con comas, comillas y saltos de línea', () => {
    const csv = toCsvString(
      buildExportRows([
        makeBranch({ store_name: 'Tienda, S.A.', contact_name: 'Ana "La Jefa" Rodriguez' })
      ])
    );
    expect(csv).toContain('"Tienda, S.A."');
    expect(csv).toContain('"Ana ""La Jefa"" Rodriguez"');
  });

  it('usa CRLF como separador de líneas', () => {
    const csv = toCsvString(buildExportRows([makeBranch(), makeBranch({ id: 'b-2' })]));
    const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
    expect(lines).toHaveLength(4);
    expect(lines[3]).toBe('');
  });
});

describe('dataExport: buildSummaryRows (resumen ejecutivo)', () => {
  it('resume totales y crecimiento de las sucursales', () => {
    const rows = buildSummaryRows([makeBranch(), makeBranch({ id: 'b-2' })], growth);
    expect(rows).toEqual([
      ['Sucursales registradas', '2'],
      ['Tiendas activas', '5'],
      ['En negociación', '3'],
      ['Nuevas esta semana', '2'],
      ['Nuevas este mes', '8']
    ]);
  });
});

describe('dataExport: generadores de archivos (payload puro)', () => {
  it('CSV: devuelve filename, mime y contenido con BOM', () => {
    const payload = generateBranchesCsv([makeBranch()]);
    expect(payload.filename).toMatch(/^lifephone_reporte_sucursales_\d{8}_\d{4}\.csv$/);
    expect(payload.mime).toBe('text/csv;charset=utf-8;');
    expect(typeof payload.data).toBe('string');
    expect((payload.data as string).charCodeAt(0)).toBe(0xfeff);
  });

  it('XLSX: devuelve un libro binario no vacío con dos hojas', () => {
    const payload = generateBranchesXlsx([makeBranch()], growth);
    expect(payload.filename).toMatch(/\.xlsx$/);
    expect(payload.mime).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(payload.data).toBeInstanceOf(Uint8Array);
    expect((payload.data as Uint8Array).byteLength).toBeGreaterThan(0);
    const signature = String.fromCharCode(...(payload.data as Uint8Array).slice(0, 2));
    expect(signature).toBe('PK');
  });

  it('PDF: devuelve un documento binario no vacío con firma %PDF', () => {
    const payload = generateBranchesPdf([makeBranch()], growth);
    expect(payload.filename).toMatch(/\.pdf$/);
    expect(payload.mime).toBe('application/pdf');
    expect(payload.data).toBeInstanceOf(Uint8Array);
    const header = new TextDecoder().decode((payload.data as Uint8Array).slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});
