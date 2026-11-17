import { getAdminSession } from '@/lib/auth'
import { templateWorkbook } from '@/lib/graduates/import'
import { jsonError } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await getAdminSession())) return jsonError(401, 'unauthorized')
  const buf = await templateWorkbook()
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="mezun-listesi-sablonu.xlsx"',
    },
  })
}
