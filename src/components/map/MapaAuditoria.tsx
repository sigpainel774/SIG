'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';

interface MapaAuditoriaProps {
  pontoLat?: number;
  pontoLng?: number;
  batidaLat?: number;
  batidaLng?: number;
  nomePonto: string;
  nomeVigia: string;
}

// Cria marcadores personalizados com cores diferentes
const iconeAzul = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const iconeVermelho = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function MapaAuditoria({
  pontoLat,
  pontoLng,
  batidaLat,
  batidaLng,
  nomePonto,
  nomeVigia,
}: MapaAuditoriaProps) {
  
  // Validação das coordenadas
  const coordenadasValidas = useMemo(() => {
    return (
      pontoLat !== undefined &&
      pontoLng !== undefined &&
      batidaLat !== undefined &&
      batidaLng !== undefined &&
      !isNaN(pontoLat) &&
      !isNaN(pontoLng) &&
      !isNaN(batidaLat) &&
      !isNaN(batidaLng)
    );
  }, [pontoLat, pontoLng, batidaLat, batidaLng]);

  // Se as coordenadas forem inválidas, renderiza tela de aviso
  if (!coordenadasValidas) {
    return (
      <div className="w-full h-[400px] rounded-2xl bg-[#141a27] border border-[#232d42] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-300 font-bold mb-2">Coordenadas Incompletas</p>
        <p className="text-sm text-slate-500 max-w-sm">
          O ponto físico ou a batida do vigia não possuem coordenadas GPS válidas registradas para este log.
        </p>
      </div>
    );
  }

  const pPos: [number, number] = [pontoLat!, pontoLng!];
  const bPos: [number, number] = [batidaLat!, batidaLng!];
  
  // Distância calculada
  const distanciaMetros = L.latLng(pPos).distanceTo(L.latLng(bPos));

  // Coordenadas da linha tracejada
  const polylineCoords = [pPos, bPos];

  // Limites geográficos para focar os dois pontos simultaneamente
  const bounds = L.latLngBounds([pPos, bPos]);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="text-xs text-slate-400 flex items-center justify-between">
        <span>
          Auditoria de log: <strong className="text-slate-200">{nomeVigia}</strong> no ponto{' '}
          <strong className="text-slate-200">{nomePonto}</strong>.
        </span>
        <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-1 rounded-lg font-mono">
          Distância: {distanciaMetros.toFixed(1)} metros
        </span>
      </div>

      <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-[#26304d] bg-[#182030] z-0">
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [50, 50] }}
          className="w-full h-full"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Mapa de Ruas">
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satélite">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Marcador Azul do Ponto de Ronda */}
          <Marker position={pPos} icon={iconeAzul}>
            <Popup>
              <div className="font-sans text-xs text-slate-800">
                <strong>QR Code Físico (Esperado)</strong>
                <br />
                {nomePonto}
              </div>
            </Popup>
          </Marker>
          {/* Marcador Vermelho da Batida do Vigia */}
          <Marker position={bPos} icon={iconeVermelho}>
            <Popup>
              <div className="font-sans text-xs text-slate-800">
                <strong>Local da Batida (Celular)</strong>
                <br />
                {nomeVigia}
              </div>
            </Popup>
          </Marker>
          {/* Linha tracejada vermelha conectando os dois */}
          <Polyline
            positions={polylineCoords}
            pathOptions={{ color: '#ef4444', dashArray: '5, 5', weight: 3 }}
          />
        </MapContainer>
      </div>
    </div>
  );
}
