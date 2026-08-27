'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { PrintHeader } from '@/components/print/print-header'
import { Printer, X, MapPin, AlertTriangle } from 'lucide-react'
import type { ItemMapaImpressao } from '@/components/map/MapaImpressao'

const MapaImpressao = dynamic(() => import('@/components/map/MapaImpressao'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[220px] bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center text-xs text-gray-500 font-semibold animate-pulse">
      Carregando visualização gráfica do mapa de localização...
    </div>
  ),
})

const sessionTimestamp = Date.now()

interface PrintFichaInscricaoEmaeeProps {
  prontuario: any
  onClose: () => void
}

export function PrintFichaInscricaoEmaee({ prontuario, onClose }: PrintFichaInscricaoEmaeeProps) {
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

  const aluno = prontuario?.alunos || {}
  const dm = aluno?.dados_matricula || {}
  const escolaRegularNome = prontuario?.escola_origem_fora_rede && prontuario?.escola_origem_nome
    ? `${prontuario.escola_origem_nome}${prontuario.escola_origem_municipio ? ` (${prontuario.escola_origem_municipio} - ${prontuario.escola_origem_uf ?? 'BA'})` : ''}`
    : (prontuario?.escolas?.nome ?? prontuario?.escola_regular_nome ?? dm?.escolaNome ?? 'Não informada / Encaminhamento externo')

  const hasCoords = useMemo(() => {
    const lat = aluno?.latitude != null ? Number(aluno.latitude) : (dm?.latitude != null ? Number(dm.latitude) : null)
    const lng = aluno?.longitude != null ? Number(aluno.longitude) : (dm?.longitude != null ? Number(dm.longitude) : null)
    return lat != null && lng != null && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
  }, [aluno?.latitude, aluno?.longitude, dm?.latitude, dm?.longitude])

  const mapItems: ItemMapaImpressao[] = useMemo(() => {
    if (!hasCoords) return []
    const lat = Number(aluno?.latitude ?? dm?.latitude)
    const lng = Number(aluno?.longitude ?? dm?.longitude)
    return [
      {
        id: aluno?.id || prontuario?.id || 'aluno-emaee',
        nome: aluno?.nome || 'Aluno EMAEE',
        cargoOuTurma: prontuario?.numero_matricula_emaee ? `Matrícula: ${prontuario.numero_matricula_emaee}` : 'Paciente EMAEE',
        escola: 'EMAEE - Atendimento Especializado',
        foto_url: aluno?.foto_url || undefined,
        latitude: lat,
        longitude: lng,
        modalidade: 'AEE'
      }
    ]
  }, [aluno, prontuario, hasCoords, dm])

  const defaultEmaeeLogo = 'https://nijjizpcodnjhvqwjuso.supabase.co/storage/v1/object/public/logos/escola_1785901172024.png'

  const tipoResp = aluno?.dados_matricula?.tipo_responsavel || prontuario?.condicoes_saude?.tipo_responsavel
  const nomeMae = aluno?.nome_mae || dm?.nomeMae || ''
  const nomePai = aluno?.nome_pai || dm?.nomePai || ''
  const outroNome = aluno?.dados_matricula?.responsavel_outro_nome || prontuario?.responsavel_outro_nome || ''
  const outroParentesco = aluno?.dados_matricula?.responsavel_outro_parentesco || ''

  // Identifica o nome do responsável legal
  let nomeResponsavel = (prontuario?.responsavel_assinatura_nome || '').trim()
  if (!nomeResponsavel) {
    if (tipoResp === 'MAE') nomeResponsavel = nomeMae
    else if (tipoResp === 'PAI') nomeResponsavel = nomePai
    else if (tipoResp === 'OUTRO') nomeResponsavel = outroNome
    else nomeResponsavel = nomeMae || nomePai || outroNome || ''
  }

  // Identifica a relação / papel do responsável
  let labelResponsavel = 'Pai / Mãe / Responsável Legal'
  if (nomeResponsavel && nomeMae && nomeResponsavel.toLowerCase() === nomeMae.toLowerCase()) {
    labelResponsavel = 'Mãe / Responsável Legal'
  } else if (nomeResponsavel && nomePai && nomeResponsavel.toLowerCase() === nomePai.toLowerCase()) {
    labelResponsavel = 'Pai / Responsável Legal'
  } else if (tipoResp === 'OUTRO' || (outroNome && nomeResponsavel.toLowerCase() === outroNome.toLowerCase())) {
    labelResponsavel = outroParentesco ? `${outroParentesco} / Responsável Legal` : 'Responsável Legal'
  }

  if (!mounted) return null

  // Helper para formatar data BR (dd/mm/aaaa)
  const formatarData = (val?: string | null) => {
    if (!val) return '-'
    const str = String(val).trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const [ano, mes, dia] = str.substring(0, 10).split('-')
      return `${dia}/${mes}/${ano}`
    }
    try {
      const d = new Date(str.includes('T') ? str : `${str}T00:00:00`)
      if (!isNaN(d.getTime())) {
        const dia = String(d.getDate()).padStart(2, '0')
        const mes = String(d.getMonth() + 1).padStart(2, '0')
        const ano = d.getFullYear()
        return `${dia}/${mes}/${ano}`
      }
      return str
    } catch {
      return str
    }
  }

  // Lista de deficiências para mapeamento visual
  const deficienciasList = [
    { key: 'def_baixa_visao', label: 'Baixa Visão' },
    { key: 'def_cegueira', label: 'Cegueira' },
    { key: 'def_auditiva', label: 'Def. Auditiva' },
    { key: 'def_fisica', label: 'Def. Física' },
    { key: 'def_surdez', label: 'Surdez' },
    { key: 'def_surdocegueira', label: 'Surdocegueira' },
    { key: 'def_multipla', label: 'Def. Múltipla' },
  ]

  // Lista de condições de saúde e neurodesenvolvimento
  const condicoesSaudeLabels: Record<string, string> = {
    transtorno_tea: 'TEA (Autismo)',
    tdah: 'TDAH',
    deficiencia_intelectual: 'Def. Intelectual (DI)',
    dislexia: 'Dislexia',
    disgrafia_disortografia: 'Disgrafia/Disortografia',
    tod: 'TOD',
    ansiedade: 'Transtorno de Ansiedade',
    superdotacao: 'Superdotação',
  }

  const condicoesSaudeData = (prontuario?.condicoes_saude as Record<string, { selecionado?: boolean, cid?: string }>) || {}
  const condicoesAtivas = Object.entries(condicoesSaudeLabels)
    .filter(([key]) => {
      if (condicoesSaudeData[key]?.selecionado) return true
      if (key === 'transtorno_tea' && prontuario?.transtorno_tea) return true
      if (key === 'deficiencia_intelectual' && prontuario?.def_intelectual) return true
      return false
    })
    .map(([key, label]) => {
      const cid = condicoesSaudeData[key]?.cid || (key === 'transtorno_tea' ? prontuario?.cid_codigo : '')
      return { key, label, cid: cid?.trim() }
    })

  const assinaturaRespUrl = prontuario?.assinatura_responsavel_aluno_url || dm?.assinatura_responsavel_url || aluno?.assinatura_responsavel_url
  const assinaturaServidorUrl = prontuario?.assinatura_responsavel_matricula_url || prontuario?.funcionarios?.assinatura_url

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible print-portal-container">
      <style>{`
        @media print {
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          .print-portal-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Botões Flutuantes na Tela (Ocultos na Impressão) */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2 print-hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2.5 bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-black font-bold rounded-xl shadow-lg flex items-center gap-2 text-xs transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Ficha</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-white rounded-xl text-xs font-semibold border border-[#3f3f46] transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Fechar</span>
        </button>
      </div>

      {/* Folha A4 Oficial */}
      <div 
        className="bg-white text-black w-full max-w-[820px] p-6 shadow-2xl rounded-sm print:shadow-none print:p-0 print:w-full print:max-w-none text-[10.5px] leading-tight font-sans border border-gray-300 print:border-none flex flex-col justify-between my-auto print:m-0 space-y-3"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div>
          {/* Cabeçalho Oficial */}
          <PrintHeader
            className="pb-2.5 border-b-2 border-black mb-2.5"
            escolaLogoUrl={defaultEmaeeLogo}
            escolaNome="EMAEE - Espaço Municipal de Atendimento Educacional Especializado"
            centerContent={
              <>
                <h1 className="text-sm font-black tracking-wider text-gray-900 uppercase leading-tight">
                  FICHA DE INSCRIÇÃO E REQUERIMENTO — EMAEE
                </h1>
                <p className="text-[10px] font-bold text-gray-700 mt-0.5">
                  ATENDIMENTO EDUCACIONAL ESPECIALIZADO / ACOLHIMENTO MULTIDISCIPLINAR
                </p>
                <p className="text-[9px] font-semibold text-gray-500">
                  Ano Letivo {new Date().getFullYear()}
                </p>
              </>
            }
          />

          {/* 1. IDENTIFICAÇÃO DO ALUNO */}
          <div className="bg-black text-white font-bold px-2 py-0.5 text-[9.5px] uppercase tracking-wide">
            1. IDENTIFICAÇÃO DO ALUNO / PACIENTE
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td colSpan={3} className="border border-black p-1.5 bg-gray-50/40">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Nome Completo do Aluno</span>
                  <span className="font-extrabold text-[11px] text-gray-900">{aluno?.nome || prontuario?.nome || '-'}</span>
                </td>
                <td className="border border-black p-1.5 bg-gray-50/40 w-1/4">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Nº Matrícula EMAEE</span>
                  <span className="font-bold text-[11px] font-mono text-purple-800">{prontuario?.numero_matricula_emaee ?? 'Não gerada'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 w-1/4">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Data de Nascimento</span>
                  <span className="font-semibold">{formatarData(aluno?.data_nascimento || dm?.nascimentoAluno)}</span>
                </td>
                <td className="border border-black p-1.5 w-1/4">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">CPF do Aluno</span>
                  <span>{aluno?.cpf || dm?.cpfAluno || '-'}</span>
                </td>
                <td className="border border-black p-1.5 w-1/4">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">RG do Aluno</span>
                  <span>{aluno?.rg || dm?.rgAluno || '-'}</span>
                </td>
                <td className="border border-black p-1.5 w-1/4">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Identificação Censo (INEP)</span>
                  <span>{aluno?.identif_unica_censo || aluno?.inep || dm?.censoAluno || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Sexo</span>
                  <span>{aluno?.sexo || dm?.sexoAluno || '-'}</span>
                </td>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Cor / Raça</span>
                  <span>{aluno?.cor_raca || dm?.corRacaAluno || '-'}</span>
                </td>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Cartão do SUS</span>
                  <span>{aluno?.cartao_sus || dm?.susAluno || '-'}</span>
                </td>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Telefone / Contato</span>
                  <span>{aluno?.telefone || dm?.telefoneAluno || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 2. DADOS FAMILIARES */}
          <div className="bg-black text-white font-bold px-2 py-0.5 text-[9.5px] uppercase tracking-wide flex items-center justify-between">
            <span>2. DADOS FAMILIARES E RESPONSÁVEIS</span>
            {nomeResponsavel && (
              <span className="text-[8px] font-normal normal-case opacity-90">
                Responsável Principal: <strong>{nomeResponsavel}</strong>
              </span>
            )}
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1.5 w-1/2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold block text-[8px] uppercase text-gray-600">Nome da Mãe</span>
                    {nomeResponsavel && nomeMae && nomeResponsavel.trim().toLowerCase() === nomeMae.trim().toLowerCase() && (
                      <span className="text-[7.5px] font-bold bg-black text-white px-1 rounded-xs uppercase">Responsável Legal</span>
                    )}
                  </div>
                  <span className="font-bold">{nomeMae || '-'}</span>
                </td>
                <td className="border border-black p-1.5 w-1/2">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Profissão da Mãe</span>
                  <span>{aluno?.profissao_mae || dm?.profissaoMae || '-'}</span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 w-1/2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold block text-[8px] uppercase text-gray-600">Nome do Pai</span>
                    {nomeResponsavel && nomePai && nomeResponsavel.trim().toLowerCase() === nomePai.trim().toLowerCase() && (
                      <span className="text-[7.5px] font-bold bg-black text-white px-1 rounded-xs uppercase">Responsável Legal</span>
                    )}
                  </div>
                  <span className="font-bold">{nomePai || '-'}</span>
                </td>
                <td className="border border-black p-1.5 w-1/2">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Profissão do Pai</span>
                  <span>{aluno?.profissao_pai || dm?.profissaoPai || '-'}</span>
                </td>
              </tr>
              {(tipoResp === 'OUTRO' || (outroNome && outroNome !== nomeMae && outroNome !== nomePai) || (nomeResponsavel && nomeResponsavel !== nomeMae && nomeResponsavel !== nomePai)) && (
                <tr>
                  <td className="border border-black p-1.5 w-1/2 bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold block text-[8px] uppercase text-gray-600">Outro Responsável Legal</span>
                      <span className="text-[7.5px] font-bold bg-black text-white px-1 rounded-xs uppercase">Responsável Legal</span>
                    </div>
                    <span className="font-bold">{outroNome || nomeResponsavel}</span>
                  </td>
                  <td className="border border-black p-1.5 w-1/2 bg-gray-50/50">
                    <span className="font-bold block text-[8px] uppercase text-gray-600">Parentesco / Vínculo</span>
                    <span>{outroParentesco || 'Tutor / Representante Legal'}</span>
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={2} className="border border-black p-1.5">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Contato de Emergência</span>
                  <span>{aluno?.nome_contato_emergencia || dm?.contatoEmergencia || dm?.nome_contato_emergencia || '-'} {aluno?.telefone || aluno?.telefone_emergencia || dm?.telefoneEmergencia ? `(${aluno?.telefone || aluno?.telefone_emergencia || dm?.telefoneEmergencia})` : ''}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3. DADOS DO ATENDIMENTO EMAEE & ESCOLA REGULAR */}
          <div className="bg-black text-white font-bold px-2 py-0.5 text-[9.5px] uppercase tracking-wide">
            3. DADOS DE ATENDIMENTO E ESCOLARIZAÇÃO
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1.5 w-1/4">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Data de Matrícula EMAEE</span>
                  <span className="font-semibold">{formatarData(prontuario?.data_matricula)}</span>
                </td>
                <td className="border border-black p-1.5 w-1/4">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Turno no EMAEE</span>
                  <span className="font-semibold">{prontuario?.turno_atendimento ?? 'Matutino'}</span>
                </td>
                <td className="border border-black p-1.5 w-1/4">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Localização do Atendimento</span>
                  <span>{prontuario?.localizacao_atendimento ?? 'Urbana'}</span>
                </td>
                <td className="border border-black p-1.5 w-1/4">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Status no EMAEE</span>
                  <span className="font-bold text-purple-900">
                    {prontuario?.status === 'ATIVO' ? 'Em Atendimento' :
                     prontuario?.status === 'EM_INVESTIGACAO' ? 'Em Investigação' :
                     prontuario?.status === 'ALTA' ? 'Alta Médica' :
                     prontuario?.status === 'INATIVO' ? 'Arquivado' : 'Fila de Espera'}
                  </span>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-black p-1.5">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Escola Regular de Origem</span>
                  <span className="font-bold">{escolaRegularNome}</span>
                </td>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Ano / Turma Regular</span>
                  <span>{prontuario?.ano_escolarizacao ?? '-'} {prontuario?.turma_regular ? `(${prontuario.turma_regular})` : ''}</span>
                </td>
                <td className="border border-black p-1.5">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Professor / Gestor</span>
                  <span>{prontuario?.professor_regular || prontuario?.gestor_regular || '-'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 4. QUEIXA CLÍNICA E DIAGNÓSTICO */}
          <div className="bg-black text-white font-bold px-2 py-0.5 text-[9.5px] uppercase tracking-wide">
            4. QUEIXA CLÍNICA E DIAGNÓSTICO
          </div>
          <table className="w-full border-collapse border border-black mb-2 text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black p-1.5 w-1/4 bg-gray-50/50">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Código CID-10 Geral</span>
                  <span className="font-bold text-rose-700 text-[11px]">{prontuario?.cid_codigo || 'Não informado / Em investigação'}</span>
                </td>
                <td colSpan={2} className="border border-black p-1.5">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Principal Queixa / Motivo do Requerimento</span>
                  <span>{prontuario?.principal_queixa || prontuario?.observacoes_requerimento || 'Não informado'}</span>
                </td>
              </tr>
              {condicoesAtivas.length > 0 && (
                <tr>
                  <td colSpan={3} className="border border-black p-1.5 bg-purple-50/20">
                    <span className="font-bold block text-[8px] uppercase text-purple-900">Condições de Saúde e Neurodesenvolvimento Identificadas</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {condicoesAtivas.map(c => (
                        <span key={c.key} className="inline-block px-1.5 py-0.5 border border-purple-800/40 rounded bg-white text-purple-950 font-bold text-[9px]">
                          {c.label}{c.cid ? ` [CID: ${c.cid}]` : ''}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              {prontuario?.outros_transtornos && (
                <tr>
                  <td colSpan={3} className="border border-black p-1.5">
                    <span className="font-bold block text-[8px] uppercase text-gray-600">Outras Condições / Comorbidades</span>
                    <span>{prontuario.outros_transtornos}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 5. MAPEAMENTO AEE (CENSO ESCOLAR) */}
          <div className="bg-black text-white font-bold px-2 py-0.5 text-[9.5px] uppercase tracking-wide">
            5. MAPEAMENTO AEE — DEFICIÊNCIAS (CENSO ESCOLAR)
          </div>
          <div className="border border-black p-2 mb-2 bg-gray-50/30">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-[9px]">
              {deficienciasList.map((d) => {
                const checked = !!prontuario?.[d.key]
                return (
                  <div key={d.key} className="flex items-center gap-1.5">
                    <span className={`w-3.5 h-3.5 rounded border border-black flex items-center justify-center text-[9px] font-black ${
                      checked ? 'bg-black text-white' : 'bg-white text-transparent'
                    }`}>
                      {checked ? '✓' : ''}
                    </span>
                    <span className={`font-semibold ${checked ? 'text-black font-bold' : 'text-gray-600'}`}>{d.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 6. ENDEREÇO RESIDENCIAL E LOCALIZAÇÃO NO MAPA */}
          <div className="bg-black text-white font-bold px-2 py-0.5 text-[9.5px] uppercase tracking-wide flex items-center justify-between">
            <span>6. ENDEREÇO RESIDENCIAL E GEOLOCALIZAÇÃO</span>
            <span className="text-[8px] font-normal normal-case opacity-80 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Relatório de Geolocalização Municipal
            </span>
          </div>
          <table className="w-full border-collapse border border-black mb-1 text-[10px]">
            <tbody>
              <tr>
                <td colSpan={2} className="border border-black p-1.5 w-2/3">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Logradouro / Endereço Completo</span>
                  <span className="font-bold">{aluno?.endereco || dm?.endereco || 'Não informado'}</span>
                </td>
                <td className="border border-black p-1.5 w-1/3">
                  <span className="font-bold block text-[8px] uppercase text-gray-600">Zona Residencial</span>
                  <span>{aluno?.zona_residencial || prontuario?.localizacao_atendimento || dm?.zonaResidencial || 'Urbana'}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Minimapa Estático Leaflet */}
          <div className="border border-black rounded-sm overflow-hidden mb-2">
            {hasCoords ? (
              <div className="w-full h-[190px] relative">
                <MapaImpressao items={mapItems} tipo="alunos" />
              </div>
            ) : (
              <div className="w-full h-[80px] bg-gray-50 flex items-center justify-center text-center p-3 text-[9.5px] text-gray-500 italic">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Geolocalização residencial ainda não mapeada. A posição pode ser cadastrada no cadastro do aluno no SIG para alimentar o relatório de geolocalização.</span>
                </div>
              </div>
            )}
          </div>

          {/* 7. TERMO DE AUTORIZAÇÃO E ASSINATURAS */}
          <div className="bg-black text-white font-bold px-2 py-0.5 text-[9.5px] uppercase tracking-wide">
            7. TERMO DE AUTORIZAÇÃO E ASSINATURAS
          </div>
          <div className="border border-black p-2 bg-white">
            <p className="text-[9px] text-gray-700 leading-tight mb-4 text-justify">
              Declaro que as informações acima prestadas são verdadeiras e autorizo a inscrição e o acompanhamento clínico-pedagógico multidisciplinar do(a) estudante junto ao Espaço Municipal de Atendimento Educacional Especializado (EMAEE), bem como o compartilhamento de pareceres entre os profissionais e a equipe pedagógica da rede municipal de ensino.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-3 border-t border-gray-300">
              {/* Assinatura do Responsável */}
              <div className="flex flex-col items-center justify-end text-center">
                <div className="h-10 flex items-center justify-center mb-1">
                  {assinaturaRespUrl ? (
                    <img
                      src={`${assinaturaRespUrl}${assinaturaRespUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`}
                      alt="Assinatura do Responsável"
                      className="max-h-10 object-contain mix-blend-multiply"
                    />
                  ) : (
                    <span className="text-[8.5px] text-gray-400 italic">Assinatura física à caneta</span>
                  )}
                </div>
                <div className="border-t border-black w-full pt-1">
                  <div className="font-bold text-[9.5px] uppercase text-gray-900">
                    {nomeResponsavel || 'Assinatura do Pai/Mãe/Responsável'}
                  </div>
                  <div className="text-[8px] text-gray-500">
                    {labelResponsavel}
                  </div>
                </div>
              </div>

              {/* Assinatura do Servidor EMAEE */}
              <div className="flex flex-col items-center justify-end text-center">
                <div className="h-10 flex items-center justify-center mb-1">
                  {assinaturaServidorUrl ? (
                    <img
                      src={`${assinaturaServidorUrl}${assinaturaServidorUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`}
                      alt="Assinatura do Servidor"
                      className="max-h-10 object-contain mix-blend-multiply"
                    />
                  ) : (
                    <span className="text-[8.5px] text-gray-400 italic">Assinatura do Servidor</span>
                  )}
                </div>
                <div className="border-t border-black w-full pt-1">
                  <div className="font-bold text-[9.5px] uppercase text-gray-900">
                    {prontuario?.responsavel_matricula_nome || prontuario?.funcionarios?.nome || 'Servidor Responsável pela Inscrição'}
                  </div>
                  <div className="text-[8px] text-gray-500">
                    EMAEE — Secretaria Municipal de Educação
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Oficial */}
        <div className="text-center text-[7.5px] text-gray-400 border-t border-gray-200 pt-1.5 print:mt-2">
          Documento oficial emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • SIG — Sistema Integrado de Gestão Municipal
        </div>
      </div>
    </div>,
    document.body
  )
}
