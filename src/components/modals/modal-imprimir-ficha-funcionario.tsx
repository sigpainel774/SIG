'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { toast } from 'sonner'

const sessionTimestamp = Date.now()

function formatarDataLocal(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const PALETTES = [
  { bg: '#1a3a5c', text: '#60a5fa' },
  { bg: '#1a2e1a', text: '#4ade80' },
  { bg: '#3a1a1a', text: '#f87171' },
  { bg: '#2e1a3a', text: '#c084fc' },
  { bg: '#3a2e1a', text: '#fbbf24' },
  { bg: '#1a3a3a', text: '#34d399' }
]

function getPalette(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTES[Math.abs(hash) % PALETTES.length]
}

interface ModalImprimirFichaFuncionarioProps {
  funcionarioId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModalImprimirFichaFuncionario({
  funcionarioId,
  open,
  onOpenChange
}: ModalImprimirFichaFuncionarioProps) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [funcData, setFuncData] = useState<any | null>(null)

  const supabase = createClient()
  const { acessos, isAdminGlobalOrRoot } = useAuthStore()
  const selectedSecretaria = useSchoolStore((state) => state.selectedSecretaria)
  const isSaude = selectedSecretaria?.nome?.toLowerCase().includes('saúde') || false

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!open || !funcionarioId) {
      setFuncData(null)
      return
    }

    let active = true

    const fetchFuncionario = async () => {
      setLoading(true)
      try {
        const { data: f, error } = await supabase
          .from('funcionarios')
          .select(`
            *,
            vinculos_funcionarios(
              escola_id,
              cargo,
              ativo,
              carga_horaria,
              escolas(nome, inep, localizacao, logo_url)
            )
          `)
          .eq('id', funcionarioId)
          .maybeSingle()

        if (error || !f) {
          toast.error('Erro ao buscar dados da ficha do funcionário.')
          if (active) onOpenChange(false)
          return
        }

        if (active) {
          setFuncData(f)
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados do funcionário para impressão:', err)
        toast.error('Falha ao preparar ficha do funcionário.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchFuncionario()

    return () => {
      active = false
    }
  }, [open, funcionarioId, onOpenChange])

  if (!open || !funcionarioId || !mounted) return null

  const handlePrint = () => {
    window.print()
  }

  // Processamento de dados formatados para a ficha
  const f = funcData
  const activeVinc = f?.vinculos_funcionarios?.find((v: any) => v.ativo)
  const escolaNome = activeVinc?.escolas?.nome ?? 'Não informada'
  const escolaInep = activeVinc?.escolas?.inep ?? 'Não informado'
  const escolaLocalizacao = activeVinc?.escolas?.localizacao ?? 'Não informada'
  const schoolLogoUrl = activeVinc?.escolas?.logo_url ?? null

  // Doenças
  const listDoencas: string[] = []
  if (f?.doenca_diabetes) listDoencas.push('Diabetes')
  if (f?.doenca_convulsoes) listDoencas.push('Convulsões')
  if (f?.doenca_asma_bronquite) listDoencas.push('Asma / Bronquite')
  if (f?.doenca_infeccoes) listDoencas.push('Infecções')
  if (f?.doenca_cardiopatias) listDoencas.push('Cardiopatias')
  if (f?.doenca_alergias) listDoencas.push('Alergias')
  if (f?.doenca_covid19) listDoencas.push('Covid-19')
  if (f?.doenca_articulares) listDoencas.push('Doenças Articulares')
  if (f?.doenca_outra) listDoencas.push(`Outra: ${f.doenca_outra}`)
  const doencasStr = listDoencas.length > 0 ? listDoencas.join(', ') : 'Nenhuma'

  // Deficiências
  const defsList: string[] = []
  if (f?.possui_deficiencia) {
    if (f?.deficiencias && Array.isArray(f.deficiencias) && f.deficiencias.length > 0) {
      defsList.push(...f.deficiencias)
    }
    if (f?.tea) defsList.push('TEA (Transtorno do Espectro Autista)')
    if (f?.altas_habilidades) defsList.push('Altas habilidades / Superdotação')
  }
  const defsStr = defsList.length > 0 ? defsList.join(', ') : 'Nenhuma'

  // Pós-Graduações
  const posList = Array.isArray(f?.pos_graduacoes) ? f.pos_graduacoes : []

  // Outros cursos
  const outrosCursosStr =
    f?.outros_cursos && Array.isArray(f.outros_cursos) && f.outros_cursos.length > 0
      ? f.outros_cursos.join(', ')
      : 'Nenhum'

  // Documentos anexados
  const docsAnexadosList: string[] = []
  if (f?.doc_identidade_url) docsAnexadosList.push('Identidade (RG)')
  if (f?.doc_cpf_url) docsAnexadosList.push('CPF')
  if (f?.doc_comprovante_residencia_url) docsAnexadosList.push('Comprovante de Residência')
  if (f?.doc_ensino_fundamental_url) docsAnexadosList.push('Comp. Escolaridade: Fundamental')
  if (f?.doc_ensino_medio_url) docsAnexadosList.push('Comp. Escolaridade: Médio')
  if (f?.doc_curso_superior_url) docsAnexadosList.push('Comp. Escolaridade: Superior')
  if (f?.doc_pos_graduacao_url) docsAnexadosList.push('Comp. Escolaridade: Pós-Graduação')
  if (f?.doc_mestrado_url) docsAnexadosList.push('Comp. Escolaridade: Mestrado')
  if (f?.doc_doutorado_url) docsAnexadosList.push('Comp. Escolaridade: Doutorado')
  const docsAnexadosStr =
    docsAnexadosList.length > 0 ? docsAnexadosList.join(', ') : 'Nenhum'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
  const isRootOrNivel1 = isAdminGlobalOrRoot() || (acessos && acessos.some((a: any) => a.nivel === 1 && a.ativo))

  const defaultEducacaoLogoUrl = `${supabaseUrl}/storage/v1/object/public/alunos-anexos/logos/logo-secretaria-educacao-2026.png`
  const defaultSaudeLogoUrl = `${supabaseUrl}/storage/v1/object/public/alunos-anexos/logos/sec_1785815672933_saude_oficial.png`
  const logoSecretariaUrl = isSaude ? defaultSaudeLogoUrl : defaultEducacaoLogoUrl

  const logoPrefeituraUrl = `${supabaseUrl}/storage/v1/object/public/logos/logo-prefeitura.png?t=${sessionTimestamp}`
  const logoDireitoUrl = isRootOrNivel1
    ? logoSecretariaUrl
    : schoolLogoUrl
    ? `${schoolLogoUrl.split('?')[0]}?t=${sessionTimestamp}`
    : logoSecretariaUrl

  const initials = f?.nome ? getInitials(f.nome) : '—'
  const palette = f?.nome ? getPalette(f.nome) : { bg: '#1a3a5c', text: '#60a5fa' }
  const fotoCleanUrl = f?.foto_url ? (f.foto_url.startsWith('data:') ? f.foto_url : `${f.foto_url.split('?')[0]}?t=${sessionTimestamp}`) : ''

  const modalContent = (
    <div className="print-portal-container fixed inset-0 z-[9999] bg-black/80 flex justify-center p-4 sm:p-6 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible">
      {/* CSS estrito para ocultar o layout de fundo na impressão física */}
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
            margin: 5mm 10mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Barra de Ações Superior (Fixa na tela, oculta na impressão) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 print:hidden">
        <Button
          type="button"
          onClick={handlePrint}
          disabled={loading || !funcData}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl gap-2 rounded-xl h-10 px-5"
        >
          <Printer className="w-4 h-4" />
          Imprimir Ficha (A4)
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="bg-background border-border text-foreground hover:bg-muted font-semibold shadow-md rounded-xl h-10 px-4"
        >
          <X className="w-4 h-4 mr-1" />
          Fechar
        </Button>
      </div>

      {/* Cartão / Folha de Pré-visualização da Ficha (Rolável) */}
      <div className="bg-white text-black w-full max-w-[850px] rounded-xl shadow-2xl overflow-hidden my-auto p-6 sm:p-8 print:p-0 print:shadow-none print:w-full print:max-w-none print:rounded-none print:m-0 text-xs font-sans">
        {loading || !funcData ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-9 h-9 text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-600">
              Buscando e preparando dados da ficha do funcionário...
            </p>
          </div>
        ) : (
          <div className="space-y-3 relative pb-8">
            {/* Cabeçalho Oficial */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
              <img
                src={logoPrefeituraUrl}
                alt="Logo Prefeitura"
                className="h-12 w-auto object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.visibility = 'hidden'
                }}
              />
              <div className="text-center flex-1 px-4">
                <h2 className="text-xs font-bold tracking-wider uppercase m-0">PREFEITURA MUNICIPAL DE SAPEAÇU</h2>
                <h4 className="text-[10px] text-gray-600 m-0">ESTADO DA BAHIA</h4>
                <h3 className="text-sm font-black tracking-widest uppercase mt-1 m-0 text-black">
                  FICHA CADASTRAL DE FUNCIONÁRIO
                </h3>
              </div>
              <div className="text-right text-[9px] text-gray-600 shrink-0 mr-3">
                <div className="font-bold text-black">SIG SAPEAÇU</div>
                <div>EMISSÃO: {new Date().toLocaleDateString('pt-BR')}</div>
                <div>STATUS: <span className="uppercase font-bold text-black">{f.status ?? '—'}</span></div>
              </div>
              <img
                src={logoDireitoUrl}
                alt="Logo Secretaria/Escola"
                className="h-12 w-auto object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = logoSecretariaUrl
                }}
              />
            </div>

            {/* Conteúdo Principal (Grade com Coluna de Dados e Coluna de Foto) */}
            <div className="flex flex-row gap-3 items-start">
              {/* Coluna Esquerda: Seções Principais (Preenche a largura restante) */}
              <div className="flex-1 min-w-0 space-y-2.5">
                {/* DADOS PESSOAIS */}
                <div className="border border-black rounded overflow-hidden">
                  <div className="bg-gray-100 font-bold px-2 py-1 uppercase text-[10px] border-b border-black tracking-wide">
                    Dados Pessoais
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Nome Completo (Apelido)</span>
                        <span className="font-bold text-[11px]">{f.nome}{f.apelido ? ` (${f.apelido})` : ''}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Nascimento</span>
                        <span className="font-bold text-[10px]">{formatarDataLocal(f.data_nascimento)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-200">
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Sexo</span>
                        <span className="capitalize text-[10px] font-semibold">{f.sexo ?? '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Estado Civil</span>
                        <span className="capitalize text-[10px] font-semibold">{f.estado_civil ?? '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Cor / Raça</span>
                        <span className="capitalize text-[10px] font-semibold">{f.cor_raca ?? '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Nacionalidade</span>
                        <span className="text-[10px] font-semibold">{f.nacionalidade ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONTATO E ENDEREÇO */}
                <div className="border border-black rounded overflow-hidden">
                  <div className="bg-gray-100 font-bold px-2 py-1 uppercase text-[10px] border-b border-black tracking-wide">
                    Contato e Endereço
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Email Principal</span>
                        <span className="font-semibold text-[10px] truncate block">{f.email ?? '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Telefone Celular</span>
                        <span className="font-semibold text-[10px]">{f.telefone ?? '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Telefone Emergência</span>
                        <span className="font-semibold text-[10px]">{f.telefone_emergencia ?? '—'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-200">
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">CEP</span>
                        <span className="font-semibold text-[10px]">{f.cep ?? '—'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Endereço Residencial</span>
                        <span className="font-semibold text-[10px]">{f.endereco ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VÍNCULO ATIVO E LOTAÇÃO */}
                <div className="border border-black rounded overflow-hidden">
                  <div className="bg-gray-100 font-bold px-2 py-1 uppercase text-[10px] border-b border-black tracking-wide">
                    Vínculo Ativo e Lotação
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Unidade de Lotação</span>
                        <span className="font-bold text-[10px]">{escolaNome}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Cargo / Função</span>
                        <span className="font-bold text-[10px]">{f.cargo ?? '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Código INEP Escola</span>
                        <span className="font-semibold text-[10px]">{escolaInep}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-gray-200">
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Tipo de Localização</span>
                        <span className="uppercase text-[9px] font-semibold">{escolaLocalizacao}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Modalidade de Ensino</span>
                        <span className="uppercase text-[9px] font-semibold">{f.modalidade_ensino ?? 'Regular'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Data de Admissão</span>
                        <span className="text-[10px] font-semibold">{formatarDataLocal(f.data_admissao)}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Carga Horária Semanal</span>
                        <span className="text-[10px] font-semibold">
                          {activeVinc?.carga_horaria ? `${activeVinc.carga_horaria}h` : (f.carga_horaria ? `${f.carga_horaria}h` : '—')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Foto 3x4 + QR Code Autenticidade (1 Coluna Fixa) */}
              <div className="w-[115px] shrink-0 flex flex-col items-center gap-3 border-l border-gray-200 pl-2">
                {/* Foto 3x4 */}
                <div className="w-[105px] h-[135px] border-2 border-black rounded overflow-hidden flex items-center justify-center bg-gray-100 shrink-0">
                  {fotoCleanUrl ? (
                    <img
                      src={fotoCleanUrl}
                      alt={f.nome}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                        const fallbackEl = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                        if (fallbackEl) fallbackEl.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-full h-full items-center justify-center text-3xl font-bold"
                    style={{
                      display: fotoCleanUrl ? 'none' : 'flex',
                      backgroundColor: palette.bg,
                      color: palette.text
                    }}
                  >
                    {initials}
                  </div>
                </div>

                {/* QR Code de Autenticidade */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 border border-gray-300 p-1 bg-white flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://sig-six-kappa.vercel.app/verificar/funcionario/' + f.id)}`}
                      alt="QR Code Autenticidade"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[7px] text-gray-500 uppercase font-bold mt-1 text-center">Ficha Autenticada</span>
                </div>
              </div>
            </div>

            {/* DOCUMENTAÇÃO E REGISTROS CIVIS */}
            <div className="border border-black rounded overflow-hidden">
              <div className="bg-gray-100 font-bold px-2 py-1 uppercase text-[10px] border-b border-black tracking-wide">
                Documentação e Registros Civis
              </div>
              <div className="p-2 space-y-1.5">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">CPF</span>
                    <span className="font-bold text-[10px]">{f.cpf ?? '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">RG / Órgão Emissor</span>
                    <span className="font-semibold text-[10px]">{f.rg ?? '—'} ({f.rg_orgao_emissor ?? '—'})</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">PIS / PASEP</span>
                    <span className="font-semibold text-[10px]">{f.pis_pasep ?? '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Título Eleitoral</span>
                    <span className="font-semibold text-[10px]">{f.titulo_eleitor ?? '—'} (Z: {f.titulo_zona ?? '—'} S: {f.titulo_secao ?? '—'})</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-200">
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Certidão Reservista</span>
                    <span className="font-semibold text-[10px]">{f.certificado_reservista ?? '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Nome da Mãe</span>
                    <span className="font-semibold text-[10px]">{f.nome_mae ?? '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Nome do Pai</span>
                    <span className="font-semibold text-[10px]">{f.nome_pai ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FORMAÇÃO ACADÊMICA E QUALIFICAÇÕES */}
            <div className="border border-black rounded overflow-hidden">
              <div className="bg-gray-100 font-bold px-2 py-1 uppercase text-[10px] border-b border-black tracking-wide">
                Formação Acadêmica e Qualificações
              </div>
              <div className="p-2 space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Nível de Escolaridade (Formação Principal)</span>
                    <span className="capitalize font-bold text-[10px]">{f.formacao ?? '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Pós-Graduações Cadastradas</span>
                    {posList.length > 0 ? (
                      <div className="space-y-0.5 text-[9px]">
                        {posList.map((p: any, idx: number) => (
                          <div key={idx}>
                            <strong>{p.tipo ?? ''}</strong> em {p.area ?? ''} ({p.situacao === 'Cursando' ? 'Previsão:' : 'Conclusão:'} {p.ano ?? ''})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-500">Nenhuma pós-graduação cadastrada</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Outros Cursos de Aperfeiçoamento</span>
                    <span className="text-[9px]">{outrosCursosStr}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Comprovantes Digitais Anexados</span>
                    <span className="text-[9px] text-blue-900 font-semibold">{docsAnexadosStr}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SAÚDE E ACESSIBILIDADE */}
            <div className="border border-black rounded overflow-hidden">
              <div className="bg-gray-100 font-bold px-2 py-1 uppercase text-[10px] border-b border-black tracking-wide">
                Saúde e Acessibilidade
              </div>
              <div className="p-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Tipo Sanguíneo / Rh</span>
                    <span className="font-bold text-[10px]">{f.tipo_sanguineo ?? '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Doenças Crônicas</span>
                    <span className="text-[9px]">{doencasStr}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-gray-500 uppercase font-bold">Necessidades / Deficiências</span>
                    <span className="text-[9px]">{defsStr}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Documento */}
            <div className="border-t border-black pt-2 flex justify-between items-center text-[8px] font-bold text-gray-600 uppercase">
              <span>SECRETARIA MUNICIPAL DE EDUCAÇÃO · DEPARTAMENTO DE RECURSOS HUMANOS</span>
              <span>Documento oficial para fins cadastrais municipais · SIG Sapeaçu</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
