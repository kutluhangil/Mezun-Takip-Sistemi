import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { DashboardSummary } from '../aggregate'
import type { Lang } from '../survey-types'

function makeCell(text: string, bold = false, shaded = false): TableCell {
  return new TableCell({
    shading: shaded ? { fill: 'F4EEEB' } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'E1E1DF' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E1E1DF' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'E1E1DF' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'E1E1DF' },
    },
    children: [
      new Paragraph({
        spacing: { before: 70, after: 70 },
        children: [
          new TextRun({
            text,
            bold,
            font: 'Calibri',
            size: 20,
            color: '141413',
          }),
        ],
      }),
    ],
  })
}

export async function generateDocxReport(params: {
  summary: DashboardSummary
  filterLabel: string
  lang: Lang
  logoBuffer: Buffer | null
}): Promise<Buffer> {
  const { summary, filterLabel, lang, logoBuffer } = params
  const isEn = lang === 'en'

  const children: (Paragraph | Table)[] = []

  if (logoBuffer) {
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new ImageRun({
            data: logoBuffer,
            type: 'png',
            transformation: { width: 170, height: 75 },
          }),
        ],
      })
    )
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: isEn
            ? 'First and Emergency Aid Alumni Tracking Report'
            : 'İlk ve Acil Yardım Programı Mezun Takip Raporu',
          bold: true,
          size: 36,
          color: '141413',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${isEn ? 'Fenerbahçe University · Vocational School of Health Services' : 'Fenerbahçe Üniversitesi · Sağlık Hizmetleri Meslek Yüksekokulu'}\n${
            isEn ? 'Filter:' : 'Filtre:'
          } ${filterLabel}  |  ${isEn ? 'Date:' : 'Tarih:'} ${new Date().toLocaleDateString(isEn ? 'en-US' : 'tr-TR')}`,
          size: 20,
          color: '52514E',
        }),
      ],
    })
  )

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 160, after: 120 },
      children: [new TextRun({ text: isEn ? '1. Key Programme Indicators' : '1. Program Genel Göstergeleri', bold: true, size: 26 })],
    })
  )

  const kpiRows: [string, string][] = [
    [isEn ? 'Submitted Responses' : 'Toplam Gönderilen Yanıt', String(summary.totalResponses)],
    [isEn ? 'Unique Graduates Participated' : 'Katılan Tekil Mezun', String(summary.uniqueGraduatesResponded)],
    [
      isEn ? 'Whitelist Participation Rate' : 'Mezun Listesi Katılım Oranı',
      summary.totalGraduatesInWhitelist > 0
        ? `%${summary.participationRate} (${summary.uniqueGraduatesResponded} / ${summary.totalGraduatesInWhitelist})`
        : isEn
        ? 'No whitelist uploaded yet'
        : 'Mezun listesi henüz yüklenmedi',
    ],
    [isEn ? 'Overall Employment Rate' : 'Genel İstihdam Oranı', `%${summary.employmentRate} (${summary.employedCount})`],
    [isEn ? 'In-Field Paramedic Employment' : 'Alan İçi (Paramedik) İstihdam', String(summary.inFieldEmployedCount)],
    [isEn ? 'Not Working Count' : 'Çalışmayan Mezun', String(summary.notWorkingCount)],
    [isEn ? 'Mean Programme Satisfaction (0–10)' : 'Eğitim Memnuniyet Ortalaması (0–10)', String(summary.meanSatisfaction)],
    [isEn ? 'Recommend University Rate' : 'Üniversiteyi Önerme Oranı', `%${summary.recommendRate}`],
  ]

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [makeCell(isEn ? 'Metric' : 'Gösterge', true, true), makeCell(isEn ? 'Value' : 'Değer', true, true)],
        }),
        ...kpiRows.map(([k, v]) => new TableRow({ children: [makeCell(k), makeCell(v, true)] })),
      ],
    })
  )

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 260, after: 120 },
      children: [new TextRun({ text: isEn ? '2. Question-by-Question Results' : '2. Soru Bazlı Bulgular', bold: true, size: 26 })],
    })
  )

  let qIndex = 1
  for (const agg of summary.questions) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 90 },
        children: [
          new TextRun({
            text: `${qIndex}. ${agg.question.label[lang]}`,
            bold: true,
            size: 22,
            color: '141413',
          }),
        ],
      })
    )
    qIndex++

    if (agg.kind === 'categorical') {
      const rows = agg.options.map(
        (o) => new TableRow({ children: [makeCell(o.label), makeCell(String(o.count)), makeCell(`%${o.pct}`)] })
      )
      for (const g of agg.otherGroups) {
        rows.push(
          new TableRow({
            children: [
              makeCell(`${isEn ? '[Other grouped]' : '[Diğer grup]'} ${g.label}`),
              makeCell(String(g.count)),
              makeCell(agg.answered > 0 ? `%${((g.count / agg.answered) * 100).toFixed(1)}` : '%0'),
            ],
          })
        )
      }
      if (rows.length > 0) {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  makeCell(isEn ? 'Option' : 'Seçenek', true, true),
                  makeCell(isEn ? 'Count' : 'Kişi', true, true),
                  makeCell('%', true, true),
                ],
              }),
              ...rows,
            ],
          })
        )
      } else {
        children.push(
          new Paragraph({ children: [new TextRun({ text: isEn ? 'No data yet.' : 'Henüz veri yok.', color: '87867F' })] })
        )
      }
    } else if (agg.kind === 'scale') {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: isEn
                ? `Answered: ${agg.scale.answered} · Mean: ${agg.scale.mean} / 10 · Median: ${agg.scale.median}`
                : `Yanıt: ${agg.scale.answered} · Ortalama: ${agg.scale.mean} / 10 · Medyan: ${agg.scale.median}`,
              size: 20,
              color: 'D97757',
              bold: true,
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                makeCell(isEn ? 'Score' : 'Puan', true, true),
                makeCell(isEn ? 'Count' : 'Kişi', true, true),
                makeCell('%', true, true),
              ],
            }),
            ...agg.scale.buckets.map(
              (b) =>
                new TableRow({
                  children: [makeCell(`${b.score} / 10`), makeCell(String(b.count)), makeCell(`%${b.pct}`)],
                })
            ),
          ],
        })
      )
    } else if (agg.kind === 'matrix') {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                makeCell(isEn ? 'Statement' : 'İfade', true, true),
                ...agg.columns.map((c) => makeCell(c.label, true, true)),
                makeCell(isEn ? 'Mean' : 'Ort.', true, true),
              ],
            }),
            ...agg.rows.map(
              (r) =>
                new TableRow({
                  children: [
                    makeCell(r.label),
                    ...agg.columns.map((c) => makeCell(`${r.counts[c.value] ?? 0} (%${r.pcts[c.value] ?? 0})`)),
                    makeCell(String(r.mean), true),
                  ],
                })
            ),
          ],
        })
      )
    } else if (agg.kind === 'duration') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: isEn
                ? `Working responses: ${agg.duration.workingCount} · Not working: ${agg.duration.notWorkingCount} · Mean: ${agg.duration.meanMonths} months · Median: ${agg.duration.medianMonths} months`
                : `Çalışan: ${agg.duration.workingCount} · Çalışmayan: ${agg.duration.notWorkingCount} · Ortalama: ${agg.duration.meanMonths} ay · Medyan: ${agg.duration.medianMonths} ay`,
              size: 20,
            }),
          ],
        })
      )
    } else if (agg.kind === 'text') {
      if (agg.text.entries.length === 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: isEn ? `None (${agg.text.noneCount} selected None)` : `Metin girişi yok (${agg.text.noneCount} kişi Yok işaretledi)`,
                color: '87867F',
              }),
            ],
          })
        )
      } else {
        for (const e of agg.text.entries.slice(0, 60)) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 60 },
              children: [
                new TextRun({ text: `${e.graduateName} (${e.graduationYear ?? '—'}): `, bold: true, size: 19 }),
                new TextRun({ text: e.text, size: 19 }),
              ],
            })
          )
        }
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
