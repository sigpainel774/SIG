'use client'

import React, { useMemo } from 'react'
import { MapContainer, TileLayer, LayersControl, CircleMarker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'

export interface UsuarioAcessoItem {
  nome: string
  cargo: string
  escola: string
}

export interface PontoAcessoMap {
  ip: string
  latitude: number
  longitude: number
  city: string
  region: string
  country: string
  provider?: string
  usuarios: UsuarioAcessoItem[]
  count: number
  ultimo_acesso?: string
  suspeito: boolean
}

interface MapaCalorAcessosProps {
  pontos: PontoAcessoMap[]
}

export default function MapaCalorAcessos({ pontos }: MapaCalorAcessosProps) {
  // Filtrar pontos válidos com coordenadas numéricas
  const pontosValidos = useMemo(() => {
    return (pontos || []).filter(
      (p) =>
        p &&
        typeof p.latitude === 'number' &&
        typeof p.longitude === 'number' &&
        !isNaN(p.latitude) &&
        !isNaN(p.longitude)
    )
  }, [pontos])

  // Calcular centro do mapa ou focar em Sapeaçu (-12.723, -39.206)
  const centerPos: [number, number] = useMemo(() => {
    if (pontosValidos.length > 0) {
      return [pontosValidos[0].latitude, pontosValidos[0].longitude]
    }
    return [-12.723, -39.206]
  }, [pontosValidos])

  // Limites geográficos se houver múltiplos pontos
  const bounds = useMemo(() => {
    if (pontosValidos.length === 0) return undefined
    if (pontosValidos.length === 1) return undefined
    try {
      const coords: [number, number][] = pontosValidos.map((p) => [p.latitude, p.longitude])
      return L.latLngBounds(coords)
    } catch {
      return undefined
    }
  }, [pontosValidos])

  if (pontosValidos.length === 0) {
    return (
      <div className="w-full h-[480px] rounded-2xl bg-[#141a27] border border-[#232d42] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-300 font-bold mb-2">Sem Dados Geográficos no Momento</p>
        <p className="text-sm text-slate-500 max-w-sm">
          Nenhuma sessão ativa com coordenadas GPS ou IP válido para plotagem no mapa neste instante.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full h-[480px] rounded-2xl overflow-hidden border border-[#26304d] bg-[#182030] z-0">
        <MapContainer
          center={centerPos}
          zoom={bounds ? undefined : 12}
          bounds={bounds}
          boundsOptions={{ padding: [50, 50] }}
          className="w-full h-full"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Google Satélite (Híbrido)">
              <TileLayer
                attribution="&copy; Google Maps"
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Mapa de Ruas (OpenStreetMap)">
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
            {pontosValidos.map((pt, idx) => {
              // Determinar cor com base no status do IP
              let color = '#10b981' // Verde: Local (Sapeaçu / Bahia)
              let fillColor = '#10b981'

              if (pt.suspeito) {
                color = '#ef4444' // Vermelho: Fora da Bahia / Suspeito
                fillColor = '#ef4444'
              } else if (pt.region !== 'Bahia' && pt.region !== 'BA') {
                color = '#f59e0b' // Amarelo: Outro estado
                fillColor = '#f59e0b'
              }

              // Tamanho proporcional ao número de usuários do mesmo IP (min 10px, max 26px)
              const radius = Math.min(26, Math.max(10, 8 + pt.count * 3))

              return (
                <CircleMarker
                  key={`${pt.ip}-${idx}`}
                  center={[pt.latitude, pt.longitude]}
                  radius={radius}
                  pathOptions={{
                    color,
                    fillColor,
                    fillOpacity: 0.6,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="font-sans text-xs space-y-2 p-1 min-w-[200px]">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <strong className="text-slate-900 font-mono text-xs">{pt.ip}</strong>
                        {pt.suspeito ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                            SUSPEITO
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                            OK
                          </span>
                        )}
                      </div>

                      <div className="text-slate-600 space-y-1">
                        <div>
                          📍 <strong>Localidade:</strong> {pt.city}, {pt.region} ({pt.country})
                        </div>
                        {pt.provider && (
                          <div>
                            🌐 <strong>Provedor:</strong> {pt.provider}
                          </div>
                        )}
                        <div>
                          👥 <strong>Sessões Ativas:</strong> {pt.count}
                        </div>
                      </div>

                      {pt.usuarios && pt.usuarios.length > 0 && (
                        <div className="border-t pt-1.5 space-y-1">
                          <strong className="text-slate-800 text-[11px] block">Usuários Conectados:</strong>
                          <div className="max-h-24 overflow-y-auto space-y-1">
                            {pt.usuarios.map((u, uIdx) => (
                              <div key={uIdx} className="bg-slate-100 p-1.5 rounded text-[11px]">
                                <div className="font-bold text-slate-800">{u.nome}</div>
                                <div className="text-slate-500 text-[10px]">
                                  {u.cargo} • {u.escola}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  )
}
