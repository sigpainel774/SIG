'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, LayersControl, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Search, ExternalLink, MapPin } from 'lucide-react';

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
  const [lat, setLat] = useState<number>(initialLat || -14.235004);
  const [lng, setLng] = useState<number>(initialLng || -51.925282);
  const [zoom, setZoom] = useState<number>(initialLat && initialLng ? 16 : 4);
  const [isSearching, setIsSearching] = useState(false);
  const [localAddress, setLocalAddress] = useState(address || '');
  
  const markerRef = useRef<L.Marker>(null);
  const mapRef = useRef<L.Map>(null);

  // Sincroniza estado interno caso o pai atualize as coordenadas
  useEffect(() => {
    if (initialLat && initialLng) {
      setLat(initialLat);
      setLng(initialLng);
      setZoom(16);
      mapRef.current?.setView([initialLat, initialLng], 16);
    }
  }, [initialLat, initialLng]);

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
    onCoordinatesChange(clickedLat, clickedLng);
  }, [onCoordinatesChange]);

  // Geocodificação Nominatim
  const handleGeocode = async (silent = false) => {
    if (!localAddress.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(localAddress)}`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLat(newLat);
        setLng(newLng);
        setZoom(16);
        onCoordinatesChange(newLat, newLng);
        mapRef.current?.setView([newLat, newLng], 16);
      } else {
        if (!silent) alert('Endereço não encontrado no mapa. Tente digitar de outra forma ou arraste o marcador manualmente.');
      }
    } catch (error) {
      if (!silent) console.error('Erro ao buscar o endereço:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce automático do endereço
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (localAddress && localAddress.length > 10) {
        handleGeocode(true);
      }
    }, 1200);
    return () => clearTimeout(delayDebounceFn);
  }, [localAddress]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Input de Endereço */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1">Endereço</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-[#141a27] border border-[#232d42] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
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
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 text-slate-950 font-bold rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Header do Mini-Mapa */}
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-400" />
          Posição no Mapa <span className="text-slate-500">(arraste o pino ou clique no mapa para ajustar)</span>
        </span>
        <button
          type="button"
          onClick={handleOpenGoogleMaps}
          className="text-sky-400 hover:underline flex items-center gap-1 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ver no Google Maps
        </button>
      </div>

      {/* Container Leaflet */}
      <div className="w-full h-[220px] rounded-xl overflow-hidden border border-[#232d42] bg-[#141a27] z-0">
        <MapContainer
          center={[lat, lng]}
          zoom={zoom}
          ref={mapRef}
          className="w-full h-full"
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Mapa de Ruas">
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Google Satélite (Híbrido)">
              <TileLayer
                attribution="&copy; Google Maps"
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Google Satélite">
              <TileLayer
                attribution="&copy; Google Maps"
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                maxZoom={20}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satélite (Esri)">
              <TileLayer
                attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          <Marker
            position={[lat, lng]}
            draggable={true}
            eventHandlers={eventHandlers}
            ref={markerRef}
          />
          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>
      </div>

      {/* Inputs Manuais de Lat/Lng */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-slate-500 mb-1">Latitude</label>
          <input
            type="number"
            step="any"
            className="w-full bg-[#141a27] border border-[#232d42] rounded-lg px-3 py-1.5 text-slate-300"
            value={lat.toFixed(7)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                setLat(val);
                onCoordinatesChange(val, lng);
                mapRef.current?.setView([val, lng], mapRef.current?.getZoom() || zoom);
              }
            }}
          />
        </div>
        <div>
          <label className="block text-slate-500 mb-1">Longitude</label>
          <input
            type="number"
            step="any"
            className="w-full bg-[#141a27] border border-[#232d42] rounded-lg px-3 py-1.5 text-slate-300"
            value={lng.toFixed(7)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
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
