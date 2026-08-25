'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Popup,
  ImageOverlay,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CoordinateTuple,
  VisitasArea,
  VisitasPonto,
  VisitasGeoPdfMap,
} from '@/types/visitas';
import { MapInteractionMode } from './VisitasDrawingToolbar';
import {
  formatarArea,
  calcularDistanciaMetros,
  calcularCentroide,
} from '@/lib/visitas/areaCalculator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Info, Edit3, Trash2, Maximize2 } from 'lucide-react';

// Fix dos ícones padrões do Leaflet para Next.js / Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Gerador de ícone para categorias de pontos
const criarIconeCategoria = (categoria: string, status: string) => {
  let corBg = 'bg-blue-600';
  if (categoria === 'Problema') corBg = 'bg-rose-600';
  if (categoria === 'Observacao') corBg = 'bg-amber-600';
  if (categoria === 'Imovel') corBg = 'bg-indigo-600';
  if (categoria === 'Vegetacao') corBg = 'bg-emerald-600';
  if (status === 'visitado') corBg = 'bg-teal-600';

  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div class="relative flex flex-col items-center" style="transform: translate(-50%, -100%);">
        <div class="w-8 h-8 rounded-full ${corBg} border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-110">
          📍
        </div>
        <div class="w-1.5 h-2 bg-slate-900 shadow-xs"></div>
      </div>
    `,
    iconSize: [32, 36],
    iconAnchor: [16, 36],
  });
};

interface VisitasMapCoreProps {
  center: CoordinateTuple;
  zoom: number;
  mode: MapInteractionMode;
  draftVertices: CoordinateTuple[];
  onAddDraftVertex: (vertex: CoordinateTuple) => void;
  onFinishDraftPolygon: () => void;
  onPointMapClick: (lat: number, lng: number) => void;
  areas: VisitasArea[];
  pontos: VisitasPonto[];
  activeGeoPdf?: VisitasGeoPdfMap | null;
  onSelectArea?: (area: VisitasArea) => void;
  onSelectPonto?: (ponto: VisitasPonto) => void;
  onEditArea?: (area: VisitasArea) => void;
  onDeleteArea?: (areaId: string) => void;
}

// Componente interno para gerenciar eventos de clique e snap no Canvas
function MapEventsHandler({
  mode,
  draftVertices,
  onAddDraftVertex,
  onFinishDraftPolygon,
  onPointMapClick,
}: {
  mode: MapInteractionMode;
  draftVertices: CoordinateTuple[];
  onAddDraftVertex: (vertex: CoordinateTuple) => void;
  onFinishDraftPolygon: () => void;
  onPointMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      if (mode === 'draw_polygon') {
        // Snap inteligente de fechamento do polígono baseado em tolerância de pixels
        if (draftVertices.length >= 3) {
          const firstVertex = draftVertices[0];
          const firstPointPx = map.latLngToContainerPoint([
            firstVertex[0],
            firstVertex[1],
          ]);
          const currentPointPx = map.latLngToContainerPoint([lat, lng]);

          const distancePx = Math.hypot(
            currentPointPx.x - firstPointPx.x,
            currentPointPx.y - firstPointPx.y
          );

          // Se clicou dentro de um raio de 22 pixels do ponto inicial, fecha o polígono
          if (distancePx <= 22) {
            onFinishDraftPolygon();
            return;
          }
        }

        onAddDraftVertex([lat, lng]);
      } else if (mode === 'add_point') {
        onPointMapClick(lat, lng);
      }
    },
  });

  return null;
}

// Componente para auto-pan e animação da câmera
function MapCameraController({ center, zoom }: { center: CoordinateTuple; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

export default function VisitasMapCore({
  center,
  zoom,
  mode,
  draftVertices,
  onAddDraftVertex,
  onFinishDraftPolygon,
  onPointMapClick,
  areas = [],
  pontos = [],
  activeGeoPdf,
  onSelectArea,
  onSelectPonto,
  onEditArea,
  onDeleteArea,
}: VisitasMapCoreProps) {
  // Converte rascunho de polígono para formato de polyline
  const draftPolyline = useMemo(() => {
    return draftVertices.map((v) => [v[0], v[1]] as [number, number]);
  }, [draftVertices]);

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-border shadow-2xl bg-zinc-950">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapCameraController center={center} zoom={zoom} />

        <MapEventsHandler
          mode={mode}
          draftVertices={draftVertices}
          onAddDraftVertex={onAddDraftVertex}
          onFinishDraftPolygon={onFinishDraftPolygon}
          onPointMapClick={onPointMapClick}
        />

        {/* Sobreposição de Camada GeoPDF Calibrada */}
        {activeGeoPdf &&
          activeGeoPdf.is_visible &&
          activeGeoPdf.imagem_renderizada_url &&
          activeGeoPdf.geo_bounds && (
            <ImageOverlay
              url={activeGeoPdf.imagem_renderizada_url}
              bounds={[
                [activeGeoPdf.geo_bounds.south, activeGeoPdf.geo_bounds.west],
                [activeGeoPdf.geo_bounds.north, activeGeoPdf.geo_bounds.east],
              ]}
              opacity={activeGeoPdf.opacidade}
              zIndex={500}
            />
          )}

        {/* Polígonos das Áreas Delimitadas Salvas */}
        {areas
          .filter((area) => !area.deleted_at && area.vertices && area.vertices.length >= 3)
          .map((area) => {
            const positions = area.vertices.map(
              (v) => [v[0], v[1]] as [number, number]
            );
            const centroide = calcularCentroide(area.vertices);

            return (
              <React.Fragment key={area.id}>
                <Polygon
                  positions={positions}
                  pathOptions={{
                    color: area.cor || '#3b82f6',
                    fillColor: area.cor || '#3b82f6',
                    fillOpacity: 0.35,
                    weight: 3,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (mode === 'select' && onSelectArea) {
                        onSelectArea(area);
                      }
                    },
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-3 text-xs space-y-2 min-w-[200px]">
                      <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
                        <span className="font-bold text-sm text-foreground">
                          {area.nome}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold"
                        >
                          {area.status}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-[11px] text-muted-foreground">
                        <div>
                          Área:{' '}
                          <strong className="text-foreground">
                            {formatarArea(area.square_meters)}
                          </strong>
                        </div>
                        <div>
                          Vértices:{' '}
                          <strong className="text-foreground">
                            {area.vertices.length} pontos
                          </strong>
                        </div>
                        {area.descricao && (
                          <div className="mt-1 text-slate-300 italic">
                            "{area.descricao}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border">
                        {onEditArea && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditArea(area)}
                            className="h-6 px-2 text-[10px] gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Editar
                          </Button>
                        )}
                        {onDeleteArea && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDeleteArea(area.id)}
                            className="h-6 px-2 text-[10px] gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              </React.Fragment>
            );
          })}

        {/* Pontos de Interesse (Pins) */}
        {pontos
          .filter((p) => !p.deleted_at)
          .map((ponto) => (
            <Marker
              key={ponto.id}
              position={[Number(ponto.latitude), Number(ponto.longitude)]}
              icon={criarIconeCategoria(ponto.categoria, ponto.status)}
              eventHandlers={{
                click: () => {
                  if (mode === 'select' && onSelectPonto) {
                    onSelectPonto(ponto);
                  }
                },
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-3 text-xs space-y-2 min-w-[220px]">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
                    <span className="font-bold text-sm text-foreground">
                      {ponto.nome}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold"
                    >
                      {ponto.categoria}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    <div>
                      Coordenadas:{' '}
                      <span className="font-mono text-foreground">
                        {Number(ponto.latitude).toFixed(5)},{' '}
                        {Number(ponto.longitude).toFixed(5)}
                      </span>
                    </div>
                    <div>
                      Status:{' '}
                      <span className="capitalize font-semibold text-foreground">
                        {ponto.status}
                      </span>
                    </div>
                    {ponto.descricao && (
                      <div className="mt-1 text-slate-300 italic">
                        "{ponto.descricao}"
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Polígono e Vértices do Rascunho Atual */}
        {draftVertices.length > 0 && (
          <>
            <Polyline
              positions={draftPolyline}
              pathOptions={{
                color: '#38bdf8',
                dashArray: '6, 8',
                weight: 3,
                opacity: 0.9,
              }}
            />

            {draftVertices.length >= 3 && (
              <Polygon
                positions={draftPolyline}
                pathOptions={{
                  color: '#38bdf8',
                  fillColor: '#38bdf8',
                  fillOpacity: 0.25,
                  weight: 2,
                }}
              />
            )}

            {/* Marcadores nos vértices do rascunho */}
            {draftVertices.map((vertex, idx) => {
              const isFirst = idx === 0;
              return (
                <Marker
                  key={`draft-${idx}`}
                  position={[vertex[0], vertex[1]]}
                  icon={L.divIcon({
                    className: 'draft-vertex-marker',
                    html: `
                      <div class="w-4 h-4 rounded-full ${
                        isFirst
                          ? 'bg-emerald-500 ring-4 ring-emerald-400/40 animate-pulse'
                          : 'bg-sky-400'
                      } border-2 border-white shadow-md flex items-center justify-center text-[9px] font-bold text-white" style="transform: translate(-50%, -50%);">
                        ${isFirst ? '●' : idx + 1}
                      </div>
                    `,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                  })}
                />
              );
            })}
          </>
        )}
      </MapContainer>
    </div>
  );
}
