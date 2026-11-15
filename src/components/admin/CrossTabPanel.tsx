'use client'

import React, { useMemo, useState } from 'react'
import { computeCrossTab } from '@/lib/aggregate'
import { t } from '@/lib/i18n'
import type { SubmittedResponseItem, SurveyDefinition } from '@/lib/survey-types'
import { useUI } from '@/components/ui/UIProvider'

export function CrossTabPanel({
  definition,
  responses,
}: {
  definition: SurveyDefinition
  responses: SubmittedResponseItem[]
}) {
  const { lang } = useUI()
  const eligibleQuestions = useMemo(
    () =>
      definition.questions.filter(
        (q) =>
          !q.lockedFromProfile &&
          (q.type === 'single' || q.type === 'year' || q.type === 'scale' || q.type === 'province')
      ),
    [definition]
  )

  const [rowId, setRowId] = useState('q_grad_year')
  const [colId, setColId] = useState('q_work_status')

  const cross = useMemo(() => {
    const rq = eligibleQuestions.find((q) => q.id === rowId) ?? eligibleQuestions[0]
    const cq = eligibleQuestions.find((q) => q.id === colId) ?? eligibleQuestions[1]
    if (!rq || !cq) return null
    return computeCrossTab({ rowQuestion: rq, colQuestion: cq, responses, lang })
  }, [eligibleQuestions, rowId, colId, responses, lang])

  return (
    <div className="rounded-2xl border border-line-2 bg-raised/90 p-5 sm:p-6">
      <h2 className="serif text-2xl font-normal text-ink">{t(lang, 'ana.crossTitle')}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-ink-3">{t(lang, 'ana.crossRow')}</label>
          <select
            value={rowId}
            onChange={(e) => setRowId(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
          >
            {eligibleQuestions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label[lang]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-3">{t(lang, 'ana.crossCol')}</label>
          <select
            value={colId}
            onChange={(e) => setColId(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-clay focus:outline-none"
          >
            {eligibleQuestions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label[lang]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cross && cross.rowLabels.length > 0 && cross.colLabels.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-xl border border-line-2">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-line-2 bg-sunk/70">
                <th className="p-3 text-left font-medium text-ink-2">
                  {cross.rowQuestion.label[lang]} \ {cross.colQuestion.label[lang]}
                </th>
                {cross.colLabels.map((c) => (
                  <th key={c.key} className="p-3 text-center font-medium text-ink-2 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="p-3 text-center font-semibold text-ink">{t(lang, 'ana.crossTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {cross.rowLabels.map((r) => (
                <tr key={r.key} className="border-b border-line-2/70 last:border-b-0">
                  <td className="p-3 font-medium text-ink">{r.label}</td>
                  {cross.colLabels.map((c) => {
                    const cnt = cross.matrix[r.key]?.[c.key] ?? 0
                    return (
                      <td
                        key={c.key}
                        className={`p-3 text-center font-mono tabular ${
                          cnt > 0 ? 'font-semibold text-clay-ink bg-band/20' : 'text-ink-3'
                        }`}
                      >
                        {cnt}
                      </td>
                    )
                  })}
                  <td className="p-3 text-center font-mono font-semibold tabular text-ink">
                    {cross.rowTotals[r.key] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-sunk/50 font-semibold">
                <td className="p-3 text-ink">{t(lang, 'ana.crossTotal')}</td>
                {cross.colLabels.map((c) => (
                  <td key={c.key} className="p-3 text-center font-mono tabular text-ink">
                    {cross.colTotals[c.key] ?? 0}
                  </td>
                ))}
                <td className="p-3 text-center font-mono tabular text-clay-ink">{cross.grandTotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-3">{t(lang, 'dash.noResponses')}</p>
      )}
    </div>
  )
}
