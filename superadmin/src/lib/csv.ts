/**
 * Génère un contenu CSV (RFC 4180) à partir d'en-têtes et de lignes.
 * Échappe les valeurs contenant des virgules, guillemets ou retours à la ligne.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(escapeCsvValue).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(','))
  }
  // BOM UTF-8 pour un affichage correct des accents dans Excel.
  return '﻿' + lines.join('\r\n')
}

export function csvResponseHeaders(filename: string): HeadersInit {
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  }
}
