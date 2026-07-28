'use client'

import React, { useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface ItemMapaImpressao {
  id: string
  nome: string
  cargoOuTurma: string
  escola: string
  foto_url?: string
  latitude: number
  longitude: number
  modalidade?: string
}

interface MapaImpressaoProps {
  items: ItemMapaImpressao[]
  tipo: 'funcionarios' | 'alunos'
}

const SAPEACU_CENTER: [number, number] = [-12.7299932, -39.1858195]

export default function MapaImpressao({ items, tipo }: MapaImpressaoProps) {
  const mapRef = useRef<L.Map>(null)

  const validItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.latitude != null &&
        item.longitude != null &&
        !isNaN(Number(item.latitude)) &&
        !isNaN(Number(item.longitude)) &&
        Number(item.latitude) !== 0 &&
        Number(item.longitude) !== 0
    )
  }, [items])

  useEffect(() => {
    const invalidate = () => {
      if (mapRef.current) {
        const map = mapRef.current
        map.invalidateSize()

        if (validItems.length === 1) {
          map.setView([validItems[0].latitude, validItems[0].longitude], 15)
        } else if (validItems.length > 1) {
          const bounds = L.latLngBounds(
            validItems.map((item) => [item.latitude, item.longitude])
          )
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
        } else {
          map.setView(SAPEACU_CENTER, 14)
        }
      }
    }

    // Invalidação inicial com tempo seguro para carregamento de DOM
    const timer = setTimeout(invalidate, 150)

    // Handler de segurança para evento de impressão e resize da janela
    const handleBeforePrintOrResize = () => {
      invalidate()
    }

    window.addEventListener('beforeprint', handleBeforePrintOrResize)
    window.addEventListener('resize', handleBeforePrintOrResize)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeprint', handleBeforePrintOrResize)
      window.removeEventListener('resize', handleBeforePrintOrResize)
    }
  }, [validItems])

  const criarIconePin = (nome: string, modalidade?: string) => {
    const isEJA = modalidade === 'EJA'
    const color = isEJA ? '#8b5cf6' : tipo === 'funcionarios' ? '#2563eb' : '#059669'
    const initials = nome
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

    return L.divIcon({
      className: 'print-map-pin',
      html: `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: ${color};
          color: #ffffff;
          font-weight: 800;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          font-family: sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        ">
          ${initials}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    })
  }

  return (
    <div className="w-full h-[320px] rounded-xl overflow-hidden border border-gray-300 relative print:h-[280px] print:w-full print:block print:overflow-hidden print-map-container">
      <MapContainer
        center={SAPEACU_CENTER}
        zoom={14}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; CartoDB &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          crossOrigin="anonymous"
        />

        {validItems.map((item) => (
          <Marker
            key={item.id}
            position={[item.latitude, item.longitude]}
            icon={criarIconePin(item.nome, item.modalidade)}
          >
            <Tooltip permanent direction="top" offset={[0, -12]} className="print-tooltip">
              <span className="font-bold text-[9px] text-gray-900">{item.nome}</span>
            </Tooltip>
            <Popup>
              <div className="text-xs p-1">
                <strong className="block text-gray-900">{item.nome}</strong>
                <span className="text-gray-600 text-[10px] block">{item.cargoOuTurma}</span>
                <span className="text-gray-500 text-[10px] block">{item.escola}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Badge no canto do mapa */}
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm border border-gray-300 text-gray-800 text-[9px] font-bold px-2 py-1 rounded shadow z-[1000] no-print">
        {validItems.length} {validItems.length === 1 ? 'ponto registrado' : 'pontos registrados no mapa'}
      </div>
    </div>
  )
}
