import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function sanitizeUuid(id: any): string | null {
  if (!id || typeof id !== 'string') return null
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id.trim()) ? id.trim() : null
}

const ALLOWED_METRICS = new Set(['ROUTE_CHANGE_MS', 'LCP', 'FCP', 'CLS', 'FID', 'INP', 'TTFB'])
const ALLOWED_RATINGS = new Set(['good', 'needs-improvement', 'poor'])

export async function POST(request: NextRequest) {
  try {
    let bodyData: any = null
    try {
      const text = await request.text()
      if (text) {
        bodyData = JSON.parse(text)
      }
    } catch {
      return NextResponse.json({ success: true, count: 0 })
    }

    if (!bodyData) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const items: any[] = Array.isArray(bodyData)
      ? bodyData
      : Array.isArray(bodyData.metrics)
      ? bodyData.metrics
      : [bodyData]

    if (items.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // Filtrar e validar cada item contra contaminação
    const validBatch = items
      .filter((item) => {
        if (!item || typeof item !== 'object') return false
        if (!ALLOWED_METRICS.has(item.metric_name)) return false

        const val = Number(item.metric_value)
        if (isNaN(val) || !isFinite(val) || val < 0) return false

        // CLS é de 0 a 10. Demais métricas de 1ms a 60.000ms
        if (item.metric_name === 'CLS') {
          if (val > 10.0) return false
        } else {
          if (val < 1.0 || val > 60000.0) return false
        }

        return typeof item.pathname === 'string' && item.pathname.trim().length > 0
      })
      .slice(0, 50) // Limite de 50 itens por batch para proteger a infraestrutura
      .map((item) => {
        const rating = ALLOWED_RATINGS.has(item.rating) ? item.rating : 'needs-improvement'
        const recordId = sanitizeUuid(item.record_id) || crypto.randomUUID()
        const pathname = String(item.pathname).trim().slice(0, 255)
        const metricVal = item.metric_name === 'CLS' 
          ? Number(Number(item.metric_value).toFixed(4))
          : Math.round(Number(item.metric_value))

        return {
          record_id: recordId,
          metric_name: item.metric_name,
          metric_value: metricVal,
          rating,
          pathname,
          funcionario_id: sanitizeUuid(item.funcionario_id),
          escola_id: sanitizeUuid(item.escola_id),
          connection_type: item.connection_type ? String(item.connection_type).trim().slice(0, 30) : null,
          device_memory: typeof item.device_memory === 'number' && item.device_memory > 0 ? item.device_memory : null,
          hardware_concurrency: typeof item.hardware_concurrency === 'number' && item.hardware_concurrency > 0 ? Math.round(item.hardware_concurrency) : null,
          user_agent: item.user_agent ? String(item.user_agent).slice(0, 500) : null,
          created_at: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString()
        }
      })

    if (validBatch.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: 'Nenhuma métrica válida no lote' })
    }

    // Inserção idempotente com supabaseAdmin
    const { error } = await supabaseAdmin
      .from('performance_metrics')
      .upsert(validBatch, { onConflict: 'record_id', ignoreDuplicates: true })

    if (error) {
      // Tentativa de recuperação sem FKs se houver falha de chave estrangeira (usuário/escola removido)
      console.warn('[API desempenho/batch] Tentando inserção defensiva sem FKs:', error.message)
      const safeBatch = validBatch.map(m => ({
        ...m,
        funcionario_id: null,
        escola_id: null
      }))

      const recovery = await supabaseAdmin
        .from('performance_metrics')
        .upsert(safeBatch, { onConflict: 'record_id', ignoreDuplicates: true })

      if (recovery.error) {
        console.error('[API desempenho/batch] Falha na persistência:', recovery.error.message)
        return NextResponse.json({ error: recovery.error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, count: validBatch.length })
  } catch (err: any) {
    console.error('[API desempenho/batch] Erro inesperado:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno do servidor' }, { status: 500 })
  }
}
