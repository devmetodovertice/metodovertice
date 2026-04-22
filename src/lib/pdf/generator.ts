import PDFDocument from 'pdfkit'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Section =
  | 'none' | 'header' | 'contact' | 'availability'
  | 'tools' | 'prazer' | 'experience' | 'education' | 'additional'

// ─── Constantes de design ─────────────────────────────────────────────────────

const C = {
  name:        '#0a0a0a',
  sectionLabel:'#aaaaaa',
  rule:        '#e8e8e8',
  body:        '#2a2a2a',
  muted:       '#666666',
  faint:       '#999999',
  impact:      '#1a1a1a',
  cargo:       '#0a0a0a',
}

const F = {
  bold:    'Helvetica-Bold',
  regular: 'Helvetica',
  italic:  'Helvetica-Oblique',
}

const PAGE_W   = 595
const MARGIN_H = 55   // left & right
const MARGIN_V = 50   // top & bottom
const CONTENT_W = PAGE_W - MARGIN_H * 2

// ─── Helpers de seção ─────────────────────────────────────────────────────────

const SECTION_MAP: Record<string, Section> = {
  'CABEÇALHO':                         'header',
  'CONTATO':                           'contact',
  'DISPONIBILIDADE':                   'availability',
  'FERRAMENTAS':                       'tools',
  'EXPERIÊNCIA PROFISSIONAL':          'experience',
  'FORMAÇÃO E CURSOS':                 'education',
  'INFORMAÇÕES ADICIONAIS RELEVANTES': 'additional',
}

function detectSection(line: string): Section | null {
  const t = line.trim()
  if (SECTION_MAP[t]) return SECTION_MAP[t]
  if (/^PRAZER,\s+\S/.test(t)) return 'prazer'
  return null
}

function isDateLine(s: string): boolean {
  return /(\d{4}|[Aa]tual|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|XXXX)/i.test(s)
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export async function generatePDF(resumeText: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN_V, bottom: MARGIN_V, left: MARGIN_H, right: MARGIN_H },
    })

    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const lines = resumeText.split('\n')

    let section: Section = 'none'
    let sectionLineIndex = 0   // lines rendered within current section
    let prazerPhraseDone = false

    // Experience state
    let expEntryLine = -1      // -1 = not inside entry
    type ExpField = 'cargo' | 'empresa' | 'date' | 'desc'
    let expField: ExpField = 'cargo'

    for (let i = 0; i < lines.length; i++) {
      const raw     = lines[i]
      const trimmed = raw.trim()

      // ── Detecção de seção ─────────────────────────────────────────────────
      const detectedSection = detectSection(trimmed)
      if (detectedSection) {
        section          = detectedSection
        sectionLineIndex = 0
        expEntryLine     = -1
        prazerPhraseDone = false

        if (section === 'prazer') {
          // Renderiza "Prazer, Nome." como label inline
          renderSectionRule(doc)
          doc
            .font(F.bold).fontSize(9).fillColor(C.muted)
            .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W })
          doc.moveDown(0.5)
        } else if (section !== 'header') {
          // Labels de seção normais (ocultar CABEÇALHO)
          renderSectionRule(doc)
          doc
            .font(F.bold).fontSize(7).fillColor(C.sectionLabel)
            .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W, characterSpacing: 1 })
          doc.moveDown(0.4)
        }
        continue
      }

      // ── Linha vazia ───────────────────────────────────────────────────────
      if (!trimmed) {
        if (section === 'experience') {
          expEntryLine = -1   // próxima linha não-vazia inicia novo entry
        } else {
          doc.moveDown(section === 'prazer' ? 0.7 : 0.4)
        }
        continue
      }

      sectionLineIndex++

      // ── Renderização por seção ────────────────────────────────────────────
      switch (section) {

        case 'header': {
          // Primeira linha = nome (grande, bold)
          if (sectionLineIndex === 1) {
            doc
              .font(F.bold).fontSize(20).fillColor(C.name)
              .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W })
            doc.moveDown(0.15)
          } else {
            bodyLine(doc, trimmed)
          }
          break
        }

        case 'contact': {
          doc
            .font(F.regular).fontSize(9).fillColor(C.muted)
            .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W, lineGap: 1.5 })
          break
        }

        case 'availability': {
          doc
            .font(F.italic).fontSize(9).fillColor(C.muted)
            .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W, lineGap: 1.5 })
          break
        }

        case 'tools': {
          const colonIdx = trimmed.indexOf(':')
          if (colonIdx > -1) {
            // "Grupo: item1, item2" — grupo em bold, itens em regular
            const label = trimmed.slice(0, colonIdx + 1)
            const items = trimmed.slice(colonIdx + 1)
            const x = doc.x
            const y = doc.y
            doc.font(F.bold).fontSize(9).fillColor(C.body).text(label, x, y, { continued: true, lineGap: 2 })
            doc.font(F.regular).fontSize(9).fillColor(C.muted).text(items, { lineGap: 2 })
          } else {
            bodyLine(doc, trimmed)
          }
          break
        }

        case 'prazer': {
          // Primeira linha = frase de impacto (italic, ligeiramente maior)
          if (!prazerPhraseDone) {
            doc
              .font(F.italic).fontSize(10.5).fillColor(C.impact)
              .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W, lineGap: 2 })
            prazerPhraseDone = true
          } else {
            doc
              .font(F.regular).fontSize(9.5).fillColor(C.body)
              .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W, lineGap: 2.5 })
          }
          break
        }

        case 'experience': {
          if (expEntryLine === -1) {
            // Nova entrada começa — esta linha é o CARGO
            expEntryLine = 0
            expField = 'cargo'
          }

          if (expField === 'cargo') {
            // Pequena margem entre entries
            if (sectionLineIndex > 1) doc.moveDown(0.6)
            doc
              .font(F.bold).fontSize(9.5).fillColor(C.cargo)
              .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W })
            expField = 'empresa'
          } else if (expField === 'empresa') {
            doc
              .font(F.regular).fontSize(9).fillColor(C.muted)
              .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W })
            expField = isDateLine(trimmed) ? 'desc' : 'date'
          } else if (expField === 'date') {
            doc
              .font(F.italic).fontSize(8.5).fillColor(C.faint)
              .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W })
            expField = 'desc'
          } else {
            doc
              .font(F.regular).fontSize(9).fillColor(C.body)
              .text(trimmed, MARGIN_H, doc.y, { width: CONTENT_W, lineGap: 2 })
          }
          expEntryLine++
          break
        }

        case 'education':
        case 'additional':
        default: {
          bodyLine(doc, trimmed)
          break
        }
      }
    }

    doc.end()
  })
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function bodyLine(doc: PDFKit.PDFDocument, text: string) {
  doc
    .font(F.regular).fontSize(9.5).fillColor(C.body)
    .text(text, MARGIN_H, doc.y, { width: CONTENT_W, lineGap: 2 })
}

function renderSectionRule(doc: PDFKit.PDFDocument) {
  doc.moveDown(0.8)
  const y = doc.y
  doc
    .save()
    .moveTo(MARGIN_H, y)
    .lineTo(PAGE_W - MARGIN_H, y)
    .strokeColor(C.rule)
    .lineWidth(0.5)
    .stroke()
    .restore()
  doc.moveDown(0.5)
}
