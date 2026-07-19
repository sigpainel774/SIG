'use client'

import React from 'react'
import { BookOpen, Star } from 'lucide-react'

interface BoletimCapaProps {
  escolaEditada: string
  escolaLogoUrl?: string | null
  supabaseUrl: string
  getCacheBustedUrl: (url: string) => string
}

export function BoletimCapa({
  escolaEditada,
  escolaLogoUrl,
  supabaseUrl,
  getCacheBustedUrl
}: BoletimCapaProps) {
  return (
    <div 
      className="w-[297mm] h-[210mm] bg-white relative shadow-2xl rounded-sm overflow-hidden print:shadow-none print:rounded-none page-break border border-gray-200 print:border-none"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* Linha tracejada indicando o meio para a dobra da folha (oculta na impressão) */}
      <div className="absolute left-[148.5mm] top-0 bottom-0 border-l border-dashed border-gray-300 print:hidden z-10" />

      {/* Metade Direita da Folha: A Capa */}
      <div className="absolute right-0 top-0 w-[148.5mm] h-full flex flex-col justify-between items-center select-text font-sans">
        
        {/* Topo: Imagem top_boletim.png */}
        <div className="w-full select-none">
          <img
            src={getCacheBustedUrl(`${supabaseUrl}/storage/v1/object/public/logos/top_boletim.png`)}
            alt="Capa Boletim Topo"
            className="w-full h-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Centro: Logotipo / Selo Circular */}
        <div className="flex flex-col items-center justify-center my-2">
          {(() => {
            const isMoises = escolaEditada.toLowerCase().includes('moises') || escolaEditada.toLowerCase().includes('moisés');
            const hasLogo = isMoises || escolaLogoUrl;
            const logoSrc = isMoises 
              ? '/img/logo-moises.png' 
              : (escolaLogoUrl ? getCacheBustedUrl(escolaLogoUrl) : '');

            if (hasLogo) {
              return (
                <div className="w-52 h-52 rounded-full border-4 border-[#0b4a8c] flex items-center justify-center p-2 bg-white relative shadow-inner overflow-hidden">
                  <div className="absolute inset-1 rounded-full border border-[#0b4a8c] pointer-events-none z-10" />
                  <img
                    src={logoSrc}
                    alt="Logo Escola"
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              );
            }

            // Fallback: Selo Circular Estilizado em CSS se não houver imagem
            return (
              <div className="w-52 h-52 rounded-full border-4 border-[#0b4a8c] flex flex-col items-center justify-center p-5 bg-white relative shadow-inner">
                {/* Bordas internas finas circulares */}
                <div className="absolute inset-1 rounded-full border border-[#0b4a8c] pointer-events-none" />
                <div className="absolute inset-2.5 rounded-full border-2 border-double border-[#0b4a8c] pointer-events-none" />
                
                {/* Conteúdo do Selo */}
                <div className="flex flex-col items-center text-center justify-between h-full py-2 z-10 max-w-[155px]">
                  <span className="text-[7.5px] font-extrabold uppercase text-[#0b4a8c] tracking-tight leading-none px-1">
                    {escolaEditada.length > 55 ? escolaEditada.substring(0, 52) + '...' : escolaEditada}
                  </span>
                  
                  <div className="flex flex-col items-center justify-center my-0.5">
                    <span className="text-[12px] font-black uppercase text-[#0b4a8c] leading-none mb-1">
                      {escolaEditada.split(' ').map(w => w[0]).filter(c => c === c.toUpperCase() && c.match(/[A-Z]/)).join('').substring(0, 7)}
                    </span>
                    <div className="w-10 h-[1.5px] bg-[#0b4a8c] mb-1.5" />
                    <div className="flex gap-0.5 text-[#0b4a8c] mb-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      <Star className="w-2.5 h-2.5 fill-current transform -translate-y-0.5" />
                      <Star className="w-2.5 h-2.5 fill-current" />
                    </div>
                    <BookOpen className="w-9 h-9 text-[#185fa5] stroke-[2.5]" />
                  </div>

                  <span className="text-[7px] font-black uppercase text-[#0b4a8c] tracking-widest leading-none pt-0.5 border-t border-[#0b4a8c]/35 w-full">
                    Sapeaçú - BA
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Base: Imagem bottom_boletim.png */}
        <div className="w-full select-none">
          <img
            src={getCacheBustedUrl(`${supabaseUrl}/storage/v1/object/public/logos/bottom_boletim.png`)}
            alt="Capa Boletim Base"
            className="w-full h-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  )
}
