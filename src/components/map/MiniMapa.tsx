'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Search, ExternalLink, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import LocalidadesLayer from './LocalidadesLayer';

// Corrige os ícones padrão do Leaflet no ambiente de empacotamento (Next.js)
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MiniMapaProps {
  initialLat?: number;
  initialLng?: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  address: string;
  onAddressChange: (val: string) => void;
}

// Sub-componente interno para lidar com cliques no mapa
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MiniMapa({
  initialLat,
  initialLng,
  onCoordinatesChange,
  address,
  onAddressChange
}: MiniMapaProps) {
  const SAPEACU_LAT = -12.7299932;
  const SAPEACU_LNG = -39.1858195;

  const hasInitialCoords =
    typeof initialLat === 'number' &&
    typeof initialLng === 'number' &&
    !isNaN(initialLat) &&
    !isNaN(initialLng) &&
    initialLat !== 0 &&
    initialLng !== 0;

  const [lat, setLat] = useState<number>(hasInitialCoords ? initialLat! : SAPEACU_LAT);
  const [lng, setLng] = useState<number>(hasInitialCoords ? initialLng! : SAPEACU_LNG);
  const [latInput, setLatInput] = useState<string>(hasInitialCoords ? String(initialLat) : String(SAPEACU_LAT));
  const [lngInput, setLngInput] = useState<string>(hasInitialCoords ? String(initialLng) : String(SAPEACU_LNG));
  const [zoom, setZoom] = useState<number>(hasInitialCoords ? 16 : 14);
  const [isSearching, setIsSearching] = useState(false);
  const [localAddress, setLocalAddress] = useState(address || '');
  
  const markerRef = useRef<L.Marker>(null);
  const mapRef = useRef<L.Map>(null);

  // Sincroniza estado interno caso o pai atualize as coordenadas
  useEffect(() => {
    if (
      typeof initialLat === 'number' &&
      typeof initialLng === 'number' &&
      !isNaN(initialLat) &&
      !isNaN(initialLng) &&
      initialLat !== 0 &&
      initialLng !== 0
    ) {
      setLat(initialLat);
      setLng(initialLng);
      setLatInput(String(initialLat));
      setLngInput(String(initialLng));
      setZoom(16);
      mapRef.current?.setView([initialLat, initialLng], 16);
    } else if (!initialLat && !initialLng) {
      setLat(SAPEACU_LAT);
      setLng(SAPEACU_LNG);
      setLatInput(String(SAPEACU_LAT));
      setLngInput(String(SAPEACU_LNG));
      setZoom(14);
      mapRef.current?.setView([SAPEACU_LAT, SAPEACU_LNG], 14);
    }
  }, [initialLat, initialLng]);

  // Garante que o Leaflet recalcule as dimensões do container ao abrir em modais ou abas
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Sincroniza estado interno do endereço caso o pai envie um novo endereço
  useEffect(() => {
    setLocalAddress(address || '');
  }, [address]);

  // Função para abrir o Google Maps
  const handleOpenGoogleMaps = () => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  // Lógica de arrastar o pino
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setLat(newPos.lat);
          setLng(newPos.lng);
          setLatInput(newPos.lat.toFixed(7));
          setLngInput(newPos.lng.toFixed(7));
          onCoordinatesChange(newPos.lat, newPos.lng);
        }
      },
    }),
    [onCoordinatesChange]
  );

  // Clique no mapa
  const handleMapClick = useCallback((clickedLat: number, clickedLng: number) => {
    setLat(clickedLat);
    setLng(clickedLng);
    setLatInput(clickedLat.toFixed(7));
    setLngInput(clickedLng.toFixed(7));
    onCoordinatesChange(clickedLat, clickedLng);
  }, [onCoordinatesChange]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const geocodeCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // Geocodificação Nominatim com AbortController e cache
  const handleGeocode = async (silent = false) => {
    const termoOriginal = localAddress.trim().toLowerCase();
    if (!termoOriginal) return;

    // 0. Verifica cache em memória
    const cached = geocodeCacheRef.current.get(termoOriginal);
    if (cached) {
      setLat(cached.lat);
      setLng(cached.lng);
      setLatInput(cached.lat.toFixed(7));
      setLngInput(cached.lng.toFixed(7));
      setZoom(16);
      onCoordinatesChange(cached.lat, cached.lng);
      mapRef.current?.setView([cached.lat, cached.lng], 16);
      return;
    }

    // Aborta requisição em andamento anterior se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    try {
      // 1. Tenta buscar exatamente o que o usuário digitou
      let response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(localAddress.trim())}`,
        { headers: { 'Accept-Language': 'pt-BR' }, signal: controller.signal }
      );
      let data = await response.json();

      // 2. Se não encontrou e o usuário não especificou outra cidade/UF, tenta com o contexto de Sapeaçu
      if ((!data || data.length === 0) && !termoOriginal.includes('sapeaçu') && !termoOriginal.includes('sapeacu')) {
        const termoSapeacu = `${localAddress.trim()}, Sapeaçu, BA`;
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(termoSapeacu)}`,
          { headers: { 'Accept-Language': 'pt-BR' }, signal: controller.signal }
        );
        data = await response.json();
      }

      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        geocodeCacheRef.current.set(termoOriginal, { lat: newLat, lng: newLng });
        setLat(newLat);
        setLng(newLng);
        setLatInput(newLat.toFixed(7));
        setLngInput(newLng.toFixed(7));
        setZoom(16);
        onCoordinatesChange(newLat, newLng);
        mapRef.current?.setView([newLat, newLng], 16);
      } else {
        if (!silent) toast.warning('Endereço não encontrado no mapa. Tente digitar com nome da cidade/UF ou arraste o marcador manualmente.');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      if (!silent) console.error('Erro ao buscar o endereço:', error);
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
      }
    }
  };

  // Debounce automático do endereço com cancelamento no unmount/redigitação
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (localAddress && localAddress.trim().length > 10) {
        handleGeocode(true);
      }
    }, 1500);

    return () => {
      clearTimeout(delayDebounceFn);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [localAddress]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Input de Endereço */}
      <div>
        <label className="block text-xs font-semibold text-foreground/80 mb-1">Endereço</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-background dark:bg-[#141a27] border border-input dark:border-[#232d42] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            placeholder="Rua, número, bairro, cidade"
            value={localAddress}
            onChange={(e) => {
              setLocalAddress(e.target.value);
              onAddressChange(e.target.value);
            }}
          />
          <button
            type="button"
            onClick={() => handleGeocode(false)}
            disabled={isSearching}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Header do Mini-Mapa */}
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          Posição no Mapa <span className="text-muted-foreground/75 font-normal">(arraste o pino ou clique no mapa para ajustar)</span>
        </span>
        <button
          type="button"
          onClick={handleOpenGoogleMaps}
          className="text-primary hover:underline flex items-center gap-1 transition-all font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ver no Google Maps
        </button>
      </div>

      {/* Container Leaflet */}
      <div className="w-full h-[286px] rounded-xl overflow-hidden border border-border dark:border-[#232d42] bg-muted/40 dark:bg-[#141a27] z-0">
        <MapContainer
          center={[lat, lng]}
          zoom={zoom}
          ref={mapRef}
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
          <Marker
            position={[lat, lng]}
            draggable={true}
            eventHandlers={eventHandlers}
            ref={markerRef}
          />
          <LocalidadesLayer />
          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>
      </div>

      {/* Inputs Manuais de Lat/Lng */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-muted-foreground font-medium mb-1">Latitude</label>
          <input
            type="text"
            className="w-full bg-background dark:bg-[#141a27] border border-input dark:border-[#232d42] rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            value={latInput}
            onChange={(e) => {
              const strVal = e.target.value;
              setLatInput(strVal);
              const val = parseFloat(strVal);
              if (!isNaN(val)) {
                setLat(val);
                onCoordinatesChange(val, lng);
                mapRef.current?.setView([val, lng], mapRef.current?.getZoom() || zoom);
              }
            }}
          />
        </div>
        <div>
          <label className="block text-muted-foreground font-medium mb-1">Longitude</label>
          <input
            type="text"
            className="w-full bg-background dark:bg-[#141a27] border border-input dark:border-[#232d42] rounded-lg px-3 py-1.5 text-foreground text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            value={lngInput}
            onChange={(e) => {
              const strVal = e.target.value;
              setLngInput(strVal);
              const val = parseFloat(strVal);
              if (!isNaN(val)) {
                setLng(val);
                onCoordinatesChange(lat, val);
                mapRef.current?.setView([lat, val], mapRef.current?.getZoom() || zoom);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
