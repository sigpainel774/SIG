'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Importa os componentes reais do mapa sem SSR
const MiniMapaReal = dynamic(() => import('./MiniMapa'), { 
  ssr: false, 
  loading: () => <MapLoadingSkeleton height="220px" /> 
});

const MapaGlobalReal = dynamic(() => import('./MapaGlobal'), { 
  ssr: false, 
  loading: () => <MapLoadingSkeleton height="520px" /> 
});

const MapaAuditoriaReal = dynamic(() => import('./MapaAuditoria'), { 
  ssr: false, 
  loading: () => <MapLoadingSkeleton height="400px" /> 
});

const MapaAlunosReal = dynamic(() => import('./MapaAlunos'), { 
  ssr: false, 
  loading: () => <MapLoadingSkeleton height="520px" /> 
});

function MapLoadingSkeleton({ height }: { height: string }) {
  return (
    <div 
      style={{ height }} 
      className="w-full rounded-xl bg-[#141a27] border border-[#232d42] flex items-center justify-center text-slate-400 animate-pulse"
    >
      <span className="text-sm font-semibold">Carregando mapa interativo...</span>
    </div>
  );
}

export { MiniMapaReal as MiniMapa, MapaGlobalReal as MapaGlobal, MapaAuditoriaReal as MapaAuditoria, MapaAlunosReal as MapaAlunos };
