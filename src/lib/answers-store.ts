import type { PoolClient } from 'pg'
import type { AnswerMap } from './survey-types'

/** Bir yanıtın cevaplarını tek sorguda yazar (soru başına gidiş-dönüş yok). */
export async function upsertAnswers(client: PoolClient, responseId: string, answers: AnswerMap): Promise<void> {
  if (Object.keys(answers).length === 0) return
  await client.query(
    `INSERT INTO answers (response_id, question_id, value, updated_at)
     SELECT $1, key, value, NOW() FROM jsonb_each($2::jsonb)
     ON CONFLICT (response_id, question_id)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [responseId, JSON.stringify(answers)]
  )
}

/** Gönderimde cevap seti tam olarak bu haritaya eşitlenir: silinen/boşaltılan eski taslak cevapları kalmaz. */
export async function replaceAnswers(client: PoolClient, responseId: string, answers: AnswerMap): Promise<void> {
  await client.query(`DELETE FROM answers WHERE response_id = $1`, [responseId])
  await upsertAnswers(client, responseId, answers)
}
