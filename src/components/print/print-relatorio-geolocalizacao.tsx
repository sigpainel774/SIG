'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getVisualizacaoUrl } from '@/lib/photoHelper';
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { X, Printer, MapPin, Users, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'
import { Escola } from '@/store/useSchoolStore'
import type { ItemMapaImpressao } from '@/components/map/MapaImpressao'

const MapaImpressao = dynamic(() => import('@/components/map/MapaImpressao'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] bg-gray-100 rounded-xl border border-gray-300 flex items-center justify-center text-xs text-gray-500 font-semibold animate-pulse">
      Carregando visualização gráfica do mapa com os pontos...
    </div>
  ),
})

// Timestamp fixo de sessão para evitar flickering de avatares/fotos
const sessionTimestamp = Date.now()

export interface FuncionarioMapeado {
  id: string
  nome: string
  cargo: string
  escola: string
  foto_url?: string
  latitude: number
  longitude: number
  modalidade?: string
}

export interface AlunoMapeado {
  id: string
  nome: string
  escola: string
  turma?: string
  foto_url?: string
  latitude: number
  longitude: number
  modalidade?: string
}

interface PrintRelatorioGeolocalizacaoProps {
  aba: 'funcionarios' | 'alunos'
  escola: Escola | null
  funcionarios: FuncionarioMapeado[]
  alunos: AlunoMapeado[]
  onClose: () => void
}

export function PrintRelatorioGeolocalizacao({
  aba,
  escola,
  funcionarios,
  alunos,
  onClose,
}: PrintRelatorioGeolocalizacaoProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handlePrint = () => {
    window.dispatchEvent(new Event('beforeprint'))
    setTimeout(() => {
      window.print()
    }, 200)
  }

  // Safe formatting for coordinates to prevent ES-2 crashes
  const formatCoordinate = (val: number | null | undefined): string => {
    if (val == null || isNaN(Number(val)) || Number(val) === 0) {
      return 'Não mapeado'
    }
    return Number(val).toFixed(6)
  }

  const isFunc = aba === 'funcionarios'
  const currentList = isFunc ? funcionarios : alunos
  const docSubtitulo = isFunc
    ? 'Mapeamento Logístico de Servidores e Funcionários'
    : 'Mapeamento Logístico de Estudantes e Alunos'

  // Map items formatted for Leaflet Map Component
  const mapItems: ItemMapaImpressao[] = useMemo(() => {
    if (isFunc) {
      return funcionarios.map((f) => ({
        id: f.id,
        nome: f.nome,
        cargoOuTurma: f.cargo,
        escola: f.escola,
        foto_url: getVisualizacaoUrl(f),
        latitude: f.latitude,
        longitude: f.longitude,
        modalidade: f.modalidade,
      }))
    } else {
      return alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        cargoOuTurma: a.turma || 'Não enturmado',
        escola: a.escola,
        foto_url: getVisualizacaoUrl(a),
        latitude: a.latitude,
        longitude: a.longitude,
        modalidade: a.modalidade,
      }))
    }
  }, [isFunc, funcionarios, alunos])

  // Calculate operational stats
  const stats = useMemo(() => {
    const total = currentList.length
    const ejaCount = currentList.filter((item) => item.modalidade === 'EJA').length
    const regularCount = total - ejaCount
    return { total, ejaCount, regularCount }
  }, [currentList])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#09090b]/95 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 8mm 10mm;
          }
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          .print-portal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Leaflet map print layer enforcement */
          .leaflet-container,
          .leaflet-container *,
          .leaflet-map-pane,
          .leaflet-tile-pane,
          .leaflet-layer,
          .leaflet-tile-container,
          .leaflet-tile,
          .leaflet-marker-pane,
          .leaflet-shadow-pane,
          .leaflet-overlay-pane,
          .leaflet-marker-icon,
          .leaflet-popup,
          .leaflet-tooltip,
          .print-map-pin {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .leaflet-container {
            width: 100% !important;
            height: 280px !important;
            min-height: 280px !important;
            position: relative !important;
            overflow: hidden !important;
            background-color: #f8fafc !important;
          }

          .leaflet-tile-container {
            width: 100% !important;
            height: 100% !important;
          }

          .leaflet-tile-container img {
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            max-width: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .leaflet-control-container {
            display: none !important;
          }

          .print-tooltip {
            background: white !important;
            border: 1px solid #94a3b8 !important;
            box-shadow: none !important;
            padding: 1px 4px !important;
            font-size: 8px !important;
            color: black !important;
            opacity: 1 !important;
            visibility: visible !important;
          }

          .map-print-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Floating Action Buttons (Hidden on print) */}
      <div className="fixed top-4 right-4 flex gap-3 print:hidden no-print z-[10000]">
        <Button
          onClick={handlePrint}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 px-5 shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Imprimir Relatório (A4)
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          className="bg-secondary border border-border hover:bg-hoverCustom text-foreground font-bold rounded-xl h-10 px-5 shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <X className="w-4 h-4" />
          Fechar
        </Button>
      </div>

      {/* A4 Sheet View */}
      <div className="w-[210mm] min-h-[297mm] bg-white text-black p-8 font-sans shadow-2xl rounded-lg print:shadow-none print:rounded-none print:p-0 print:w-full print:min-h-0">
        
        {/* Official Header */}
        <PrintHeader
          escolaNome={escola?.nome}
          docTitulo="RELATÓRIO OFICIAL DE GEOLOCALIZAÇÃO LOGÍSTICA"
          docSubtitulo={docSubtitulo}
        />

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase block tracking-wider">
              Scope / Unidade
            </span>
            <span className="text-xs font-black text-gray-900 truncate block mt-0.5">
              {escola ? escola.nome : 'Rede Municipal (Visão Macro)'}
            </span>
          </div>

          <div className="border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase block tracking-wider">
              {isFunc ? 'Total Servidores Mapeados' : 'Total Alunos Mapeados'}
            </span>
            <span className="text-sm font-black text-blue-900 block mt-0.5">
              {stats.total} {stats.total === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase block tracking-wider">
              Distribuição por Modalidade
            </span>
            <span className="text-xs font-semibold text-gray-800 block mt-0.5">
              Regular: <strong>{stats.regularCount}</strong> | EJA: <strong>{stats.ejaCount}</strong>
            </span>
          </div>
        </div>

        {/* Visual Map with Pins Section */}
        <div className="mb-6 map-print-section">
          <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-gray-700 mb-2">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Mapeamento Geográfico Visual (Pontos de Referência)</span>
          </div>
          <MapaImpressao items={mapItems} tipo={aba} />
        </div>

        {/* Information Notice */}
        <div className="flex items-center justify-between mb-3 text-[10px] text-gray-600 border-b border-gray-200 pb-2">
          <div className="flex items-center gap-1.5 font-bold uppercase text-gray-700">
            {isFunc ? <Users className="w-3.5 h-3.5 text-blue-600" /> : <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />}
            <span>Tabela Analítica de Localização e Coordenadas GPS</span>
          </div>
          <div>
            Emissão: <strong className="text-gray-900">{new Date().toLocaleString('pt-BR')}</strong>
          </div>
        </div>

        {/* Analytical Data Table */}
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="border-y-2 border-black bg-gray-100 font-bold uppercase text-gray-900">
              <th className="py-2 px-1 text-center w-8">#</th>
              <th className="py-2 px-2">{isFunc ? 'Servidor / Nome' : 'Estudante / Nome'}</th>
              <th className="py-2 px-2">{isFunc ? 'Cargo / Função' : 'Turma / Série'}</th>
              <th className="py-2 px-2">Escola / Lotação</th>
              <th className="py-2 px-2 text-center w-20">Modalidade</th>
              <th className="py-2 px-2 text-center w-36">Latitude / Longitude</th>
              <th className="py-2 px-1 text-center w-20">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(() => {
              const mostrarFotos = currentList.length <= 100;
              
              return currentList.map((item, idx) => {
                const vizUrl = getVisualizacaoUrl(item);
                const fotoUrlClean = mostrarFotos && vizUrl
                  ? vizUrl.startsWith('data:')
                    ? vizUrl
                    : `${vizUrl.split('?')[0]}?t=${sessionTimestamp}`
                  : null

              const cargoOuTurma = isFunc
                ? (item as FuncionarioMapeado).cargo || 'Não especificado'
                : (item as AlunoMapeado).turma || 'Não enturmado'

              const latStr = formatCoordinate(item.latitude)
              const lngStr = formatCoordinate(item.longitude)
              const hasCoords = latStr !== 'Não mapeado' && lngStr !== 'Não mapeado'

              return (
                <tr key={item.id || idx} className="hover:bg-gray-50">
                  <td className="py-2 px-1 text-center font-bold text-gray-500">{idx + 1}</td>
                  <td className="py-2 px-2 font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      {fotoUrlClean ? (
                        <img
                          src={fotoUrlClean}
                          alt=""
                          loading="eager"
                          decoding="async"
                          className="w-6 h-6 rounded-full object-cover border border-gray-300 shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-[9px] shrink-0">
                          {item.nome.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="line-clamp-1">{item.nome}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 font-semibold text-gray-700">{cargoOuTurma}</td>
                  <td className="py-2 px-2 text-gray-600 font-medium">{item.escola}</td>
                  <td className="py-2 px-2 text-center font-bold">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] uppercase ${
                        item.modalidade === 'EJA'
                          ? 'bg-purple-100 text-purple-900 border border-purple-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}
                    >
                      {item.modalidade || 'Regular'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-[9px] text-gray-800 font-medium whitespace-nowrap">
                    {hasCoords ? (
                      <span>
                        {latStr}, {lngStr}
                      </span>
                    ) : (
                      <span className="text-red-500 italic">Pendente</span>
                    )}
                  </td>
                  <td className="py-2 px-1 text-center font-bold">
                    <span
                      className={`inline-block text-[8.5px] px-1.5 py-0.5 rounded uppercase ${
                        hasCoords
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {hasCoords ? 'Mapeado' : 'Sem GPS'}
                    </span>
                  </td>
                </tr>
              )
              })
            })()}

            {currentList.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400 italic text-xs">
                  Nenhum registro geolocalizado encontrado para os parâmetros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Official Document Footer & Validation */}
        <div className="mt-12 pt-6 border-t border-gray-300 flex justify-between text-[9px] text-gray-500 print:mt-16">
          <div className="max-w-[320px]">
            <p className="font-bold text-gray-700">SIG — Sistema Integrado de Gestão Escolar</p>
            <p className="mt-0.5">
              Documento oficial de logística e distribuição geográfica. Válido para instrução de rotas, alocação de pessoal e diretrizes de transporte escolar.
            </p>
          </div>

          <div className="text-center min-w-[200px]">
            <div className="w-44 h-px bg-gray-400 mx-auto mb-1" />
            <p className="font-bold uppercase text-gray-900">Secretaria de Educação</p>
            <p className="text-[8px] text-gray-500">Departamento de Logística e RH</p>
          </div>
        </div>

      </div>
    </div>,
    document.body
  )
}
