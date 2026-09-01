import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for')
    let ip = forwardedFor ? forwardedFor.split(',')[0].trim() : ((request as any).ip || '127.0.0.1')

    const vercelCity = request.headers.get('x-vercel-ip-city')
    const vercelRegion = request.headers.get('x-vercel-ip-country-region')
    const vercelCountry = request.headers.get('x-vercel-ip-country')
    const vercelLat = request.headers.get('x-vercel-ip-latitude')
    const vercelLng = request.headers.get('x-vercel-ip-longitude')

    if (vercelCity && vercelRegion) {
      const cityDecoded = decodeURIComponent(vercelCity)
      const regionDecoded = decodeURIComponent(vercelRegion)
      const countryDecoded = vercelCountry ? decodeURIComponent(vercelCountry) : 'BR'

      if (ip && ip !== '127.0.0.1') {
        ;(supabaseAdmin as any)
          .from('ip_geolocation_cache')
          .upsert(
            {
              ip_address: ip,
              city: cityDecoded,
              region: regionDecoded,
              country: countryDecoded,
              latitude: vercelLat ? parseFloat(vercelLat) : -12.723,
              longitude: vercelLng ? parseFloat(vercelLng) : -39.206,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'ip_address' }
          )
          .then(({ error: geoErr }: { error: any }) => {
            if (geoErr) console.warn('[GeoCache] Falha ao salvar cache de geo (Vercel):', geoErr.message)
          })
      }

      return NextResponse.json({
        ip,
        city: cityDecoded,
        region: regionDecoded,
        country: countryDecoded,
        latitude: vercelLat ? parseFloat(vercelLat) : -12.723,
        longitude: vercelLng ? parseFloat(vercelLng) : -39.206,
        provider: 'Vercel Edge Network',
      })
    }

    if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return NextResponse.json({
        ip,
        city: 'Sapeaçu',
        region: 'BA',
        country: 'Brasil',
        latitude: -12.723,
        longitude: -39.206,
        provider: 'Rede Local Municipal',
      })
    }

    // 1. Checar se já existe no cache local do Supabase
    const { data: cached } = await (supabaseAdmin as any)
      .from('ip_geolocation_cache')
      .select('*')
      .eq('ip_address', ip)
      .maybeSingle()

    if (cached && (cached as any).city) {
      const c = cached as any
      return NextResponse.json({
        ip: c.ip_address,
        city: c.city,
        region: c.region,
        country: c.country,
        latitude: c.latitude ?? -12.723,
        longitude: c.longitude ?? -39.206,
        provider: c.isp ?? 'Cache Local',
      })
    }

    // 2. Fallback de busca em API pública de IP
    try {
      const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp`, {
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const geo = await res.json()
        if (geo.status === 'success') {
          const payload = {
            ip_address: ip,
            city: geo.city || 'Sapeaçu',
            region: geo.regionName || 'Bahia',
            country: geo.country || 'Brasil',
            isp: geo.isp || 'Provedor Local',
            latitude: geo.lat || -12.723,
            longitude: geo.lon || -39.206,
            updated_at: new Date().toISOString(),
          }

          await (supabaseAdmin as any).from('ip_geolocation_cache').upsert(payload, { onConflict: 'ip_address' })

          return NextResponse.json({
            ip,
            city: payload.city,
            region: payload.region,
            country: payload.country,
            latitude: payload.latitude,
            longitude: payload.longitude,
            provider: payload.isp,
          })
        }
      }
    } catch {
      // Ignorar falha de terceiros
    }

    return NextResponse.json({
      ip,
      city: 'Sapeaçu',
      region: 'Bahia',
      country: 'Brasil',
      latitude: -12.723,
      longitude: -39.206,
      provider: 'Servidor Municipal',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro de geolocalização' }, { status: 500 })
  }
}
