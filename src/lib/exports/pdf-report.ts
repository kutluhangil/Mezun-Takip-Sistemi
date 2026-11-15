import path from 'path'
import PDFDocument from 'pdfkit'
import type { DashboardSummary, QuestionAggregation } from '../aggregate'
import type { Lang } from '../survey-types'

const INK = '#141413'
const INK_2 = '#52514E'
const INK_3 = '#87867F'
const RULE = '#E1E1DF'
const CARD = '#F9F9F7'
const CLAY = '#D97757'
const LIKERT_COLORS = ['#C45D47', '#E09278', '#A3A29B', '#6D9886', '#4A7C6F']

function fontPaths() {
  const base = path.join(process.cwd(), 'node_modules', 'dejavu-fonts-ttf', 'ttf')
  return {
    regular: path.join(base, 'DejaVuSans.ttf'),
    bold: path.join(base, 'DejaVuSans-Bold.ttf'),
    serifBold: path.join(base, 'DejaVuSerif-Bold.ttf'),
  }
}

export async function generatePdfReport(params: {
  summary: DashboardSummary
  filterLabel: string
  lang: Lang
  logoBuffer: Buffer | null
}): Promise<Buffer> {
  const { summary, filterLabel, lang, logoBuffer } = params
  const isEn = lang === 'en'
  const fonts = fontPaths()

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 46, bottom: 48, left: 46, right: 46 },
      bufferPages: true,
      info: {
        Title: isEn ? 'FBÜ First and Emergency Aid Alumni Report' : 'FBÜ İlk ve Acil Yardım Mezun Takip Raporu',
        Author: 'Fenerbahçe Üniversitesi · İlk ve Acil Yardım Programı',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.registerFont('Sans', fonts.regular)
    doc.registerFont('SansBold', fonts.bold)
    doc.registerFont('SerifBold', fonts.serifBold)

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
    const left = doc.page.margins.left
    const bottomLimit = doc.page.height - doc.page.margins.bottom

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > bottomLimit) {
        doc.addPage()
      }
    }

    // Üst başlık ve FBÜ logosu
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, left, doc.y, { width: 120 })
        doc.y += 60
      } catch {
        // Logo okunamazsa metin başlıkla devam et
      }
    }

    doc
      .font('SerifBold')
      .fontSize(20)
      .fillColor(INK)
      .text(
        isEn ? 'First and Emergency Aid Alumni Report' : 'İlk ve Acil Yardım Mezun Takip Raporu',
        left,
        doc.y,
        { width: pageWidth }
      )

    doc.moveDown(0.35)
    doc
      .font('Sans')
      .fontSize(9.5)
      .fillColor(INK_3)
      .text(
        `${isEn ? 'Fenerbahçe University · Vocational School of Health Services' : 'Fenerbahçe Üniversitesi · Sağlık Hizmetleri MYO'}  ·  ${filterLabel}  ·  ${new Date().toLocaleDateString(
          isEn ? 'en-US' : 'tr-TR'
        )}`,
        left,
        doc.y,
        { width: pageWidth }
      )

    doc.moveDown(0.8)
    doc.moveTo(left, doc.y).lineTo(left + pageWidth, doc.y).strokeColor(RULE).lineWidth(1).stroke()
    doc.moveDown(0.8)

    // KPI KARTLARI (4 kutu)
    ensureSpace(88)
    const kpiGap = 10
    const kpiW = (pageWidth - kpiGap * 3) / 4
    const kpiH = 66
    const kpis = [
      {
        label: isEn ? 'Responses' : 'Toplam Yanıt',
        val: String(summary.totalResponses),
        sub: `${summary.uniqueGraduatesResponded} ${isEn ? 'alumni' : 'mezun'}`,
      },
      {
        label: isEn ? 'Employment' : 'İstihdam',
        val: `%${summary.employmentRate}`,
        sub: `${summary.inFieldEmployedCount} ${isEn ? 'in-field' : 'alan içi'}`,
      },
      {
        label: isEn ? 'Satisfaction' : 'Memnuniyet',
        val: `${summary.meanSatisfaction}/10`,
        sub: isEn ? 'Scale 0–10' : '0–10 Ölçeği',
      },
      {
        label: isEn ? 'Recommend' : 'Önerme',
        val: `%${summary.recommendRate}`,
        sub: isEn ? 'Yes / Def. yes' : 'Evet + Kesinlikle',
      },
    ]

    const cardTop = doc.y
    kpis.forEach((k, idx) => {
      const x = left + idx * (kpiW + kpiGap)
      doc.roundedRect(x, cardTop, kpiW, kpiH, 8).fillAndStroke(CARD, RULE)
      doc.font('Sans').fontSize(8.5).fillColor(INK_3).text(k.label, x + 10, cardTop + 10, { width: kpiW - 20 })
      doc.font('SansBold').fontSize(17).fillColor(INK).text(k.val, x + 10, cardTop + 26, { width: kpiW - 20 })
      doc.font('Sans').fontSize(8).fillColor(CLAY).text(k.sub, x + 10, cardTop + 48, { width: kpiW - 20 })
    })
    doc.y = cardTop + kpiH + 18

    const renderQuestion = (agg: QuestionAggregation, num: number) => {
      ensureSpace(78)
      doc
        .font('SansBold')
        .fontSize(11)
        .fillColor(INK)
        .text(`${num}. ${agg.question.label[lang]}`, left, doc.y, { width: pageWidth })
      doc.moveDown(0.35)

      if (agg.kind === 'categorical') {
        const items = [
          ...agg.options,
          ...agg.otherGroups.map((g) => ({
            value: `other_${g.label}`,
            label: `${isEn ? '[Other]' : '[Diğer]'} ${g.label}`,
            count: g.count,
            pct: agg.answered > 0 ? Number(((g.count / agg.answered) * 100).toFixed(1)) : 0,
          })),
        ].slice(0, 14)

        if (items.length === 0) {
          doc.font('Sans').fontSize(9).fillColor(INK_3).text(isEn ? 'No answers yet.' : 'Henüz yanıt yok.')
          doc.moveDown(0.6)
          return
        }

        const labelW = Math.round(pageWidth * 0.44)
        const barMaxW = Math.round(pageWidth * 0.38)
        const valW = pageWidth - labelW - barMaxW - 14
        const maxCount = Math.max(1, ...items.map((i) => i.count))

        for (const item of items) {
          ensureSpace(22)
          const rowY = doc.y
          const shortLabel = item.label.length > 48 ? `${item.label.slice(0, 45)}…` : item.label
          doc.font('Sans').fontSize(8.5).fillColor(INK_2).text(shortLabel, left, rowY + 3, { width: labelW })

          const trackX = left + labelW + 6
          const barW = Math.max(2, Math.round((item.count / maxCount) * barMaxW))
          doc.roundedRect(trackX, rowY + 4, barMaxW, 10, 3).fill('#ECECE8')
          if (item.count > 0) {
            doc.roundedRect(trackX, rowY + 4, barW, 10, 3).fill(CLAY)
          }

          doc
            .font('SansBold')
            .fontSize(8.5)
            .fillColor(INK)
            .text(`${item.count} (%${item.pct})`, trackX + barMaxW + 8, rowY + 3, {
              width: valW,
              align: 'right',
            })
          doc.y = rowY + 18
        }
        doc.moveDown(0.5)
        return
      }

      if (agg.kind === 'scale') {
        ensureSpace(125)
        doc
          .font('Sans')
          .fontSize(9)
          .fillColor(CLAY)
          .text(
            isEn
              ? `Answered: ${agg.scale.answered}  ·  Mean: ${agg.scale.mean} / 10  ·  Median: ${agg.scale.median}`
              : `Yanıt: ${agg.scale.answered}  ·  Ortalama: ${agg.scale.mean} / 10  ·  Medyan: ${agg.scale.median}`,
            left,
            doc.y
          )
        doc.moveDown(0.4)

        const chartH = 70
        const baseY = doc.y + chartH
        const colW = (pageWidth - 10 * 6) / 11
        const maxBucket = Math.max(1, ...agg.scale.buckets.map((b) => b.count))

        agg.scale.buckets.forEach((b, i) => {
          const x = left + i * (colW + 6)
          const h = Math.round((b.count / maxBucket) * (chartH - 16))
          doc.roundedRect(x, doc.y + 12, colW, chartH - 12, 3).fill('#F2F2EE')
          if (b.count > 0) {
            doc.roundedRect(x, baseY - h, colW, h, 3).fill(CLAY)
            doc.font('SansBold').fontSize(7.5).fillColor(INK).text(String(b.count), x, baseY - h - 11, {
              width: colW,
              align: 'center',
            })
          }
          doc.font('Sans').fontSize(8).fillColor(INK_2).text(String(b.score), x, baseY + 3, {
            width: colW,
            align: 'center',
          })
        })
        doc.y = baseY + 22
        doc.moveDown(0.5)
        return
      }

      if (agg.kind === 'matrix') {
        ensureSpace(64)
        // Renk açıklaması (Legend)
        let lx = left
        const legendY = doc.y
        agg.columns.forEach((c, idx) => {
          const col = LIKERT_COLORS[idx % LIKERT_COLORS.length]
          doc.rect(lx, legendY + 2, 8, 8).fill(col)
          doc.font('Sans').fontSize(7.5).fillColor(INK_2).text(c.label, lx + 11, legendY + 1)
          lx += Math.min(105, c.label.length * 4.7 + 22)
        })
        doc.y = legendY + 18

        const labelW = Math.round(pageWidth * 0.45)
        const barW = Math.round(pageWidth * 0.42)
        const meanW = pageWidth - labelW - barW - 10

        for (const r of agg.rows) {
          ensureSpace(26)
          const ry = doc.y
          const shortText = r.label.length > 52 ? `${r.label.slice(0, 49)}…` : r.label
          doc.font('Sans').fontSize(8).fillColor(INK_2).text(shortText, left, ry + 1, { width: labelW })

          const bx = left + labelW + 6
          let curX = bx
          const total = r.answered
          if (total === 0) {
            doc.roundedRect(bx, ry + 3, barW, 11, 3).fill('#ECECE8')
          } else {
            agg.columns.forEach((c, idx) => {
              const cnt = r.counts[c.value] ?? 0
              const segW = Math.round((cnt / total) * barW)
              if (segW > 0) {
                doc.rect(curX, ry + 3, segW, 11).fill(LIKERT_COLORS[idx % LIKERT_COLORS.length])
                curX += segW
              }
            })
          }

          doc
            .font('SansBold')
            .fontSize(8)
            .fillColor(INK)
            .text(`${r.mean.toFixed(2)}`, bx + barW + 6, ry + 2, { width: meanW, align: 'right' })
          doc.y = ry + 22
        }
        doc.moveDown(0.5)
        return
      }

      if (agg.kind === 'duration') {
        ensureSpace(32)
        doc
          .font('Sans')
          .fontSize(9.5)
          .fillColor(INK_2)
          .text(
            isEn
              ? `Working: ${agg.duration.workingCount}  ·  Not working: ${agg.duration.notWorkingCount}  ·  Mean: ${agg.duration.meanMonths} months  ·  Median: ${agg.duration.medianMonths} months`
              : `Çalışan: ${agg.duration.workingCount}  ·  Çalışmayan: ${agg.duration.notWorkingCount}  ·  Ortalama: ${agg.duration.meanMonths} ay  ·  Medyan: ${agg.duration.medianMonths} ay`
          )
        doc.moveDown(0.6)
        return
      }

      if (agg.kind === 'text') {
        const preview = agg.text.entries.slice(0, 12)
        if (preview.length === 0) {
          doc
            .font('Sans')
            .fontSize(9)
            .fillColor(INK_3)
            .text(
              isEn
                ? `No written entries (${agg.text.noneCount} chose None).`
                : `Yazılı görüş yok (${agg.text.noneCount} kişi Yok seçti).`
            )
        } else {
          for (const e of preview) {
            ensureSpace(24)
            doc
              .font('SansBold')
              .fontSize(8.5)
              .fillColor(INK)
              .text(`• ${e.graduateName} (${e.graduationYear ?? '—'}): `, { continued: true })
              .font('Sans')
              .fillColor(INK_2)
              .text(e.text)
          }
        }
        doc.moveDown(0.6)
      }
    }

    summary.questions.forEach((agg, i) => renderQuestion(agg, i + 1))

    // Sayfa alt bilgisi (numaralandırma)
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i)
      doc
        .font('Sans')
        .fontSize(8)
        .fillColor(INK_3)
        .text(
          `${isEn ? 'Page' : 'Sayfa'} ${i + 1} / ${range.count}`,
          left,
          doc.page.height - 30,
          { width: pageWidth, align: 'right' }
        )
    }

    doc.end()
  })
}
