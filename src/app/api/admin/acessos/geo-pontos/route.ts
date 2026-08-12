import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const ips: string[] = Array.isArray(body.ips) ? body.ips : []

    if (!ips || ips.length === 0) {
      return NextResponse.json({ pontos: [] })
    }

    // Filtrar duplicados
    const uniqueIps = Array.from(new Set(ips.map((i) => i?.trim()).filter(Boolean)))

    // Separar IPs locais/privados dos públicos
    const isPrivateIp = (ip: string) =>
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('172.16.') ||
      ip.startsWith('172.31.')

    const publicIps = uniqueIps.filter((ip) => !isPrivateIp(ip))

    // 1. Buscar registros existentes no cache do Supabase
    const { data: cachedRows, error: cacheErr } = await (supabaseAdmin as any)
      .from('ip_geolocation_cache')
      .select('*')
      .in('ip_address', publicIps)

    if (cacheErr) {
      console.warn('Erro ao consultar ip_geolocation_cache:', cacheErr.message)
    }

    const cachedMap = new Map<string, any>()
    if (cachedRows) {
      for (const row of cachedRows) {
        if (row.latitude !== null && row.longitude !== null) {
          cachedMap.set(row.ip_address, row)
        }
      }
    }

    // 2. Identificar IPs públicos que ainda não possuem latitude/longitude no cache
    const missingIps = publicIps.filter((ip) => !cachedMap.has(ip))

    if (missingIps.length > 0) {
      try {
        // ip-api batch aceita até 100 IPs por requisição
        const batchPayload = missingIps.slice(0, 100).map((ip) => ({ query: ip, fields: 'query,status,country,regionName,city,lat,lon,isp' }))

        const apiRes = await fetch('http://ip-api.com/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchPayload),
          signal: AbortSignal.timeout(4000),
        })

        if (apiRes.ok) {
          const batchData = await apiRes.json()
          const upsertItems: any[] = []

          if (Array.isArray(batchData)) {
            for (const item of batchData) {
              if (item && item.status === 'success' && item.lat && item.lon) {
                const row = {
                  ip_address: item.query,
                  city: item.city || 'Sapeaçu',
                  region: item.regionName || 'Bahia',
                  country: item.country || 'Brasil',
                  isp: item.isp || 'Provedor Web',
                  latitude: item.lat,
                  longitude: item.lon,
                  updated_at: new Date().toISOString(),
                }
                upsertItems.push(row)
                cachedMap.set(item.query, row)
              }
            }
          }

          if (upsertItems.length > 0) {
            await (supabaseAdmin as any)
              .from('ip_geolocation_cache')
              .upsert(upsertItems, { onConflict: 'ip_address' })
          }
        }
      } catch (err: any) {
        console.warn('Falha na chamada batch do ip-api.com:', err?.message)
      }
    }

    // 3. Montar resposta final consolidada
    const pontos = uniqueIps.map((ip) => {
      if (isPrivateIp(ip)) {
        return {
          ip,
          city: 'Sapeaçu',
          region: 'Bahia',
          country: 'Brasil',
          latitude: -12.723,
          longitude: -39.206,
          provider: 'Rede Local / Dev',
        }
      }

      const found = cachedMap.get(ip)
      if (found) {
        return {
          ip: found.ip_address,
          city: found.city || 'Sapeaçu',
          region: found.region || 'Bahia',
          country: found.country || 'Brasil',
          latitude: found.latitude ?? -12.723,
          longitude: found.longitude ?? -39.206,
          provider: found.isp || 'Provedor Web',
        }
      }

      // Fallback padrão para Sapeaçu / BA
      return {
        ip,
        city: 'Sapeaçu',
        region: 'Bahia',
        country: 'Brasil',
        latitude: -12.723,
        longitude: -39.206,
        provider: 'Servidor Municipal',
      }
    })

    return NextResponse.json({ pontos })
  } catch (error: any) {
    console.error('Erro na API geo-pontos:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao processar pontos de geolocalização' }, { status: 500 })
  }
}
