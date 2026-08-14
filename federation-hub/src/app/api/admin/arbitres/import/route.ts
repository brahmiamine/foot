import { NextRequest, NextResponse } from 'next/server'
import { ensureAdminAuth } from '@/lib/adminAuth'
import { ArbitreImportInput, importArbitres } from '@/lib/adminArbitres'
import { logAdminAction } from '@/lib/auditLog'

export const runtime = 'nodejs'

function detectDelimiter(header: string) {
  if (header.includes(';')) return ';'
  return ','
}

function parseCsv(content: string): ArbitreImportInput[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return []

  const delimiter = detectDelimiter(lines[0])
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase())
  const rows: ArbitreImportInput[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ''))
    if (values.length === 0) continue
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = values[index] ?? ''
    })

    rows.push({
      id: record.id || undefined,
      nom: record.nom,
      nom_en: record.nom_en || undefined,
      nom_ar: record.nom_ar || undefined,
      date_naissance: record.date_naissance || undefined,
      photo_url: record.photo_url || undefined,
      nationalite: record.nationalite || undefined,
      nationalite_ar: record.nationalite_ar || undefined,
    })
  }

  return rows
}

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request)
  if (unauthorized) return unauthorized

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier CSV requis' }, { status: 400 })
    }

    const content = await file.text()
    const rows = parseCsv(content)
    const result = await importArbitres(rows)
    await logAdminAction({ request, action: 'import', entityType: 'arbitre', summary: `${rows.length} ligne(s) importée(s)` })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error importing arbitres:', error)
    return NextResponse.json({ error: 'Erreur lors de l’import' }, { status: 500 })
  }
}


