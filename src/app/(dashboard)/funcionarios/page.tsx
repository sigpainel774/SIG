'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Network,
  Printer,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  ArrowLeft,
  Users,
  FileCheck,
  ShieldCheck
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ModalFuncionario } from '@/components/modals/modal-funcionario'
import { ModalGestaoLotacoes } from '@/components/modals/modal-gestao-lotacoes'
import { PermissoesView } from '@/components/PermissoesView'
import { createClient } from '@/lib/supabaseClient'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'
import { IconTile } from '@/components/ui/icon-tile'

/* ─── Tipo Funcionário ─────────────────────────────────────── */

export interface Funcionario {
  id: string
  nome: string
  email: string
  cpf?: string | null
  cargo?: string | null
  status: string
  orgao?: string | null
  data_nascimento?: string | null
  formacao?: string | null
  foto_url?: string | null
  is_superadmin?: boolean | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
}

/* ─── Helpers ────────────────────────────────────────────────── */

function getInitials(nome: string): string {
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_PALETTES: { bg: string; text: string }[] = [
  { bg: 'bg-[#1a3a5c]', text: 'text-[#60a5fa]' },
  { bg: 'bg-[#1a2e1a]', text: 'text-[#4ade80]' },
  { bg: 'bg-[#3a1a1a]', text: 'text-[#f87171]' },
  { bg: 'bg-[#2e1a3a]', text: 'text-[#c084fc]' },
  { bg: 'bg-[#3a2e1a]', text: 'text-[#fbbf24]' },
  { bg: 'bg-[#1a3a3a]', text: 'text-[#34d399]' },
]

function avatarPalette(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/* ─── Componente Principal ────────────────────────────────────── */

export default function FuncionariosPage() {
  const supabase = createClient()
  const { funcionario: authFuncionario, acessos, isAdminGlobalOrRoot, isDiretor } = useAuthStore()
  const { isEditMode } = useEditModeStore()
  const isAdmin = isAdminGlobalOrRoot()
  const isDir = isDiretor()
  const canManagePermissions = isAdmin || isDir

  const [viewMode, setViewMode] = useState<'lista' | 'permissoes'>('lista')

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [carregando, setCarregando] = useState(true)

  /* Filtros */
  const [busca, setBusca] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  /* Modais */
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalEditando, setModalEditando] = useState<Funcionario | null>(null)
  const [modalLotacoesOpen, setModalLotacoesOpen] = useState(false)
  const [funcLotacaoInicial, setFuncLotacaoInicial] = useState<{ id: string } | null>(null)

  /* ── Carregar funcionários ───────────────────────────────── */

  const carregarFuncionarios = async () => {
    setCarregando(true)
    try {
      const isAdmin = useAuthStore.getState().isAdminGlobalOrRoot()

      let query = supabase
        .from('funcionarios')
        .select(`
          id, nome, email, cpf, cargo, status, formacao, foto_url, data_nascimento, is_superadmin,
          endereco, latitude, longitude,
          vinculos_funcionarios(escola_id, cargo, ativo, escolas(nome)),
          acessos_usuarios(nivel, ativo)
        `)
        .is('deleted_at', null)
        .order('nome')

      // Se não for admin global, filtra apenas pelos funcionários vinculados à escola ativa
      if (!isAdmin) {
        const escolaId = useAuthStore.getState().escolaAtivaId
        if (!escolaId) {
          setFuncionarios([])
          return
        }

        const { data: vincs } = await supabase
          .from('vinculos_funcionarios')
          .select('funcionario_id')
          .eq('escola_id', escolaId)
          .eq('ativo', true)

        const ids = (vincs ?? []).map((v: any) => v.funcionario_id as string)
        if (ids.length > 0) {
          query = query.in('id', ids) as typeof query
        } else {
          setFuncionarios([])
          return
        }
      }

      const { data, error } = await query
      if (error) throw error

      const isDir = useAuthStore.getState().isDiretor()

      const formatados: Funcionario[] = (data ?? [])
        .filter((f: Record<string, any>) => {
          if (isDir) {
            // Se for diretor (nível 2), só deve enxergar nível 3 para baixo, portanto oculta superadmin, root, nível 1 e nível 2
            if (f.is_superadmin) return false
            if (f.nome?.toLowerCase() === 'root' || f.email?.toLowerCase().startsWith('root@')) return false
            
            const acessosList = (f.acessos_usuarios as Array<{ nivel: number | null; ativo: boolean }>) ?? []
            if (acessosList.some(a => (a.nivel === 1 || a.nivel === 2) && a.ativo)) {
              return false
            }
          }
          return true
        })
        .map((f: Record<string, any>) => {
          // Pegar o primeiro vínculo ativo como órgão principal
          const vincs = (f.vinculos_funcionarios as Array<Record<string, unknown>>) ?? []
          const vinculoAtivo = vincs.find((v) => v.ativo)
          const escola = vinculoAtivo?.escolas as { nome: string } | null

          return {
            id: f.id as string,
            nome: f.nome as string,
            email: f.email as string,
            cpf: f.cpf as string | null,
            cargo: f.cargo as string | null,
            status: (f.status as string) ?? 'ativo',
            formacao: f.formacao as string | null,
            foto_url: f.foto_url as string | null,
            data_nascimento: f.data_nascimento as string | null,
            is_superadmin: f.is_superadmin as boolean | null,
            orgao: escola?.nome ?? null,
            endereco: f.endereco as string | null,
            latitude: f.latitude ? Number(f.latitude) : null,
            longitude: f.longitude ? Number(f.longitude) : null,
          }
        })

      setFuncionarios(formatados)
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err)
      toast.error('Erro ao carregar lista de funcionários.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarFuncionarios()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Listas para dropdowns ─────────────────────────────────── */

  const cargosUnicos = useMemo(() => {
    const set = new Set(funcionarios.map((f) => f.cargo).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [funcionarios])

  /* ── Filtro ─────────────────────────────────────────────────── */

  const funcsFiltrados = useMemo(() => {
    return funcionarios.filter((f) => {
      const matchBusca =
        f.nome.toLowerCase().includes(busca.toLowerCase()) ||
        f.email.toLowerCase().includes(busca.toLowerCase()) ||
        (f.cpf ?? '').includes(busca) ||
        (f.orgao ?? '').toLowerCase().includes(busca.toLowerCase())

      const matchCargo =
        filtroCargo === 'todos' || f.cargo === filtroCargo

      const matchStatus =
        filtroStatus === 'todos' ||
        (f.status ?? '').toLowerCase() === filtroStatus.toLowerCase()

      return matchBusca && matchCargo && matchStatus
    })
  }, [funcionarios, busca, filtroCargo, filtroStatus])

  /* ── Ações dos cards ────────────────────────────────────────── */

  const handleAbrirLotacoes = (func: Funcionario) => {
    setFuncLotacaoInicial({ id: func.id })
    setModalLotacoesOpen(true)
  }

  const handleEditar = (func: Funcionario) => {
    setModalEditando(func)
  }

  const handleExcluir = async (func: Funcionario) => {
    if (!confirm(`Deseja excluir o funcionário "${func.nome}"? Esta ação pode ser desfeita pela lixeira.`)) return

    try {
      await softDeleteToTrash({
        supabase,
        tableName: 'funcionarios',
        recordId: func.id,
        recordSummary: `${func.nome} (${func.email})`,
        recordPayload: func,
        performedBy: {
          id: authFuncionario?.id ?? null,
          name: authFuncionario?.nome ?? 'Sistema',
          email: authFuncionario?.email ?? '',
        },
      })
      toast.success(`Funcionário "${func.nome}" movido para a lixeira.`)
      await carregarFuncionarios()
    } catch (err) {
      toast.error('Erro ao excluir funcionário.')
      console.error(err)
    }
  }

  const handleImprimir = async (funcId: string) => {
    const loadingToast = toast.loading('Buscando dados da ficha do funcionário...')
    try {
      const { data: f, error } = await supabase
        .from('funcionarios')
        .select(`
          *,
          vinculos_funcionarios(
            escola_id,
            cargo,
            ativo,
            escolas(nome, inep, localizacao)
          )
        `)
        .eq('id', funcId)
        .maybeSingle()

      toast.dismiss(loadingToast)
      if (error || !f) {
        toast.error('Erro ao buscar dados do funcionário.')
        return
      }

      const activeVinc = f.vinculos_funcionarios?.find((v: any) => v.ativo)
      const escolaNome = activeVinc?.escolas?.nome ?? 'Não informada'
      const escolaInep = activeVinc?.escolas?.inep ?? 'Não informado'
      const escolaLocalizacao = activeVinc?.escolas?.localizacao ?? 'Não informada'

      // Formatar Doenças
      const listDoencas = []
      if (f.doenca_diabetes) listDoencas.push('Diabetes')
      if (f.doenca_convulsoes) listDoencas.push('Convulsões')
      if (f.doenca_asma_bronquite) listDoencas.push('Asma / Bronquite')
      if (f.doenca_infeccoes) listDoencas.push('Infecções')
      if (f.doenca_cardiopatias) listDoencas.push('Cardiopatias')
      if (f.doenca_alergias) listDoencas.push('Alergias')
      if (f.doenca_covid19) listDoencas.push('Covid-19')
      if (f.doenca_articulares) listDoencas.push('Doenças Articulares')
      if (f.doenca_outra) listDoencas.push(`Outra: ${f.doenca_outra}`)
      const doencasStr = listDoencas.length > 0 ? listDoencas.join(', ') : 'Nenhuma'

      // Formatar Deficiências
      const defsList = []
      if (f.possui_deficiencia) {
        if (f.deficiencias && f.deficiencias.length > 0) {
          defsList.push(...f.deficiencias)
        }
        if (f.tea) defsList.push('TEA (Transtorno do Espectro Autista)')
        if (f.altas_habilidades) defsList.push('Altas habilidades / Superdotação')
      }
      const defsStr = defsList.length > 0 ? defsList.join(', ') : 'Nenhuma'

      // Formatar Pós-Graduações
      const posList = Array.isArray(f.pos_graduacoes) ? f.pos_graduacoes : []
      const posHtml = posList.length > 0 
        ? posList.map((p: any) => `
            <div class="pos-item">
              <strong>${p.tipo ?? ''}</strong> em ${p.area ?? ''} (Conclusão: ${p.ano ?? ''})
            </div>
          `).join('')
        : 'Nenhuma pós-graduação cadastrada'

      // Outros cursos
      const outrosCursosStr = f.outros_cursos && f.outros_cursos.length > 0
        ? f.outros_cursos.join(', ')
        : 'Nenhum'

      // Documentos anexados
      const docsAnexadosList = []
      if (f.doc_identidade_url) docsAnexadosList.push('Identidade (RG)')
      if (f.doc_cpf_url) docsAnexadosList.push('CPF')
      if (f.doc_comprovante_residencia_url) docsAnexadosList.push('Comprovante de Residência')
      if (f.doc_ensino_fundamental_url) docsAnexadosList.push('Comp. Escolaridade: Fundamental')
      if (f.doc_ensino_medio_url) docsAnexadosList.push('Comp. Escolaridade: Médio')
      if (f.doc_curso_superior_url) docsAnexadosList.push('Comp. Escolaridade: Superior')
      if (f.doc_pos_graduacao_url) docsAnexadosList.push('Comp. Escolaridade: Pós-Graduação')
      if (f.doc_mestrado_url) docsAnexadosList.push('Comp. Escolaridade: Mestrado')
      if (f.doc_doutorado_url) docsAnexadosList.push('Comp. Escolaridade: Doutorado')
      const docsAnexadosStr = docsAnexadosList.length > 0 ? docsAnexadosList.join(', ') : 'Nenhum'

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
      const win = window.open('', '_blank', 'width=900,height=900')
      if (!win) return

      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ficha Sapeaçu - ${f.nome}</title>
            <style>
              @page {
                size: A4;
                margin: 5mm 10mm 5mm 10mm;
              }
              html, body {
                height: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
              }
              body {
                font-family: Arial, sans-serif;
                color: #000;
                background-color: #fff;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-container {
                width: 100%;
                height: 100%;
                max-height: 282mm;
                box-sizing: border-box;
                position: relative;
                padding-bottom: 35px;
              }
              .header {
                display: flex;
                align-items: center;
                border-bottom: 2px solid #000;
                padding-bottom: 6px;
                margin-bottom: 12px;
              }
              .header-logo {
                width: 70px;
                height: 50px;
                border: 1px dashed #999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                color: #888;
                font-weight: bold;
                text-transform: uppercase;
                margin-right: 15px;
              }
              .header-title-box {
                flex-grow: 1;
              }
              .header-pref {
                font-size: 10px;
                font-weight: bold;
                letter-spacing: 0.5px;
                margin: 0;
              }
              .header-sub {
                font-size: 8.5px;
                color: #555;
                margin: 0;
              }
              .header-title {
                font-size: 13px;
                font-weight: 800;
                margin: 1px 0 0 0;
                text-transform: uppercase;
              }
              .photo-box {
                width: 80px;
                height: 105px;
                border: 1px solid #000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 9px;
                text-align: center;
                font-weight: bold;
                background: #fcfcfc;
              }
              .photo-img {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
              .logo-box {
                width: 80px;
                height: 105px;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
              }
              .logo-img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                transform: scale(1.05);
              }
              .school-info-grid {
                flex-grow: 1;
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 5px;
              }
              .section-box {
                border: 1px solid #000;
                margin-bottom: 4px;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .section-title {
                background-color: #000;
                color: #fff;
                font-size: 8.5px;
                font-weight: bold;
                padding: 2.5px 5px;
                border-bottom: 1px solid #000;
                text-transform: uppercase;
              }
              .grid-row {
                display: flex;
                border-bottom: 1px solid #000;
              }
              .grid-row:last-child {
                border-bottom: none;
              }
              .grid-cell {
                padding: 2.5px 4px;
                border-right: 1px solid #000;
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              .grid-cell:last-child {
                border-right: none;
              }
              .cell-label {
                font-size: 6.5px;
                font-weight: bold;
                color: #444;
                text-transform: uppercase;
                margin-bottom: 1px;
              }
              .cell-value {
                font-size: 8.5px;
                font-weight: normal;
              }
              .footer-signature {
                position: absolute;
                bottom: 18px;
                left: 0;
                right: 0;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .signature-grid {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                font-size: 9px;
              }
              .signature-line {
                border-bottom: 1px solid #000;
                text-align: center;
                padding-bottom: 2px;
              }
              .pos-item {
                font-size: 9px;
                margin-bottom: 2px;
                border-bottom: 1px dashed #ddd;
                padding-bottom: 2px;
              }
              .pos-item:last-child {
                border-bottom: none;
              }
              .print-footer {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 12px;
                font-size: 8px;
                color: #888;
                display: flex;
                justify-content: space-between;
                border-top: 1px solid #ddd;
                padding-top: 3px;
                background: #fff;
              }
            </style>
            <script>
              window.onload = function() {
                // Pequeno delay para garantir a renderização completa das imagens
                setTimeout(function() {
                  window.print();
                }, 350);
              };
            </script>
          </head>
          <body>
            
            <div class="print-container">
              <!-- Header -->
              <div class="header">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <div class="photo-box">
                    ${f.foto_url ? `<img src="${f.foto_url}" class="photo-img" />` : 'FOTO 3X4'}
                  </div>
                  <div class="header-title-box" style="text-align: center; flex-grow: 1;">
                    <h4 class="header-pref">PREFEITURA MUNICIPAL DE SAPEAÇU</h4>
                    <p class="header-sub">SECRETARIA MUNICIPAL DE EDUCAÇÃO</p>
                    <h2 class="header-title">CADASTRO DE FUNCIONÁRIO</h2>
                  </div>
                  <div class="logo-box">
                    <img src="${supabaseUrl}/storage/v1/object/public/logos/logo_moises.svg" class="logo-img" onerror="this.onerror=null; this.src='${supabaseUrl}/storage/v1/object/public/logos/logo_moises.sgv';" />
                  </div>
                </div>
              </div>

              <!-- 1-3. Unidade Escolar -->
              <div class="section-box">
                <div class="section-title">Dados da Unidade Escolar</div>
                <div class="grid-row">
                  <div class="grid-cell" style="flex: 2;">
                    <span class="cell-label">1. Unidade Escolar</span>
                    <span class="cell-value">${escolaNome}</span>
                  </div>
                  <div class="grid-cell" style="flex: 1;">
                    <span class="cell-label">2. Código INEP</span>
                    <span class="cell-value">${escolaInep}</span>
                  </div>
                  <div class="grid-cell" style="flex: 1.2;">
                    <span class="cell-label">3. Localização da UE</span>
                    <span class="cell-value">${escolaLocalizacao}</span>
                  </div>
                </div>
              </div>

              <!-- Identificação do Funcionário -->
              <div class="section-box">
                <div class="section-title">Identificação do Funcionário</div>
                <div class="grid-row">
                  <div class="grid-cell" style="flex: 2.5;">
                    <span class="cell-label">4. Nome Completo do Funcionário</span>
                    <span class="cell-value" style="font-weight: bold; font-size: 11px;">${f.nome}</span>
                  </div>
                  <div class="grid-cell" style="flex: 1.5;">
                    <span class="cell-label">5. Identificação CENSO (INEP)</span>
                    <span class="cell-value">${f.censo ?? '—'}</span>
                  </div>
                </div>
                
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">6. Estado Civil</span>
                    <span class="cell-value">${f.estado_civil ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">7. Cor / Raça</span>
                    <span class="cell-value">${f.cor_raca ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">8. Sexo</span>
                    <span class="cell-value">${f.sexo ?? '—'}</span>
                  </div>
                </div>

                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">9. Filiação (Mãe)</span>
                    <span class="cell-value">${f.nome_mae ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">Filiação (Pai)</span>
                    <span class="cell-value">${f.nome_pai ?? '—'}</span>
                  </div>
                </div>

                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">10. Nacionalidade</span>
                    <span class="cell-value">
                      ${f.nacionalidade ?? '—'} 
                      ${f.nacionalidade === 'Estrangeira' && f.nacionalidade_especificacao ? `(${f.nacionalidade_especificacao})` : ''}
                    </span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">11. Data de Nascimento</span>
                    <span class="cell-value">${formatarData(f.data_nascimento)}</span>
                  </div>
                  <div class="grid-cell" style="flex: 1.5;">
                    <span class="cell-label">12. Município de Nascimento</span>
                    <span class="cell-value">${f.municipio_nascimento ?? '—'}</span>
                  </div>
                  <div class="grid-cell" style="flex: 0.5;">
                    <span class="cell-label">13. UF</span>
                    <span class="cell-value">${f.uf_nascimento ?? '—'}</span>
                  </div>
                </div>
              </div>

              <!-- Documentos -->
              <div class="section-box">
                <div class="section-title">Documentos</div>
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">14. Número da Identidade (RG)</span>
                    <span class="cell-value">${f.rg ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">15. Número do NIS (PIS/PASEP)</span>
                    <span class="cell-value">${f.nis ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">16. Número do CPF</span>
                    <span class="cell-value">${f.cpf ?? '—'}</span>
                  </div>
                </div>
              </div>

              <!-- Endereço -->
              <div class="section-box">
                <div class="section-title">Endereço</div>
                <div class="grid-row">
                  <div class="grid-cell" style="flex: 2.5;">
                    <span class="cell-label">17. Avenida / Rua / Travessa</span>
                    <span class="cell-value">${f.logradouro ?? '—'}</span>
                  </div>
                  <div class="grid-cell" style="flex: 0.7;">
                    <span class="cell-label">18. Número</span>
                    <span class="cell-value">${f.numero ?? '—'}</span>
                  </div>
                  <div class="grid-cell" style="flex: 1;">
                    <span class="cell-label">19. CEP</span>
                    <span class="cell-value">${f.cep ?? '—'}</span>
                  </div>
                </div>

                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">20. Bairro / Localidade</span>
                    <span class="cell-value">${f.bairro ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">21. Cidade de Residência</span>
                    <span class="cell-value">${f.cidade ?? '—'}</span>
                  </div>
                  <div class="grid-cell" style="flex: 0.4;">
                    <span class="cell-label">22. UF</span>
                    <span class="cell-value">${f.uf_residencia ?? 'BA'}</span>
                  </div>
                </div>

                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">23. Área de Localização da Residência</span>
                    <span class="cell-value">${f.area_residencia ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">24. Área de Localização Diferenciada</span>
                    <span class="cell-value">${f.area_diferenciada ?? '—'}</span>
                  </div>
                </div>
              </div>

              <!-- Dados Empregatícios -->
              <div class="section-box">
                <div class="section-title">Dados Empregatícios</div>
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">25. Função que exerce na escola</span>
                    <span class="cell-value">
                      ${f.cargo ?? '—'}
                      ${f.cargo === 'Outro' && f.funcao_especifica ? `(${f.funcao_especifica})` : ''}
                    </span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">26. Tipo de Vínculo</span>
                    <span class="cell-value">
                      ${f.tipo_vinculo ?? '—'}
                      ${f.tipo_vinculo === 'Outro' && f.tipo_vinculo_especificacao ? `(${f.tipo_vinculo_especificacao})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Saúde -->
              <div class="section-box">
                <div class="section-title">Saúde</div>
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">27. Profissional com Deficiência, TEA ou Altas Habilidades / Superdotação?</span>
                    <span class="cell-value">${f.possui_deficiencia ? 'SIM' : 'NÃO'}</span>
                  </div>
                </div>
                ${f.possui_deficiencia ? `
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">27.a Especificação detalhada</span>
                    <span class="cell-value">${defsStr}</span>
                  </div>
                </div>
                ` : ''}
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">28. Doenças Crônicas / Ativas</span>
                    <span class="cell-value">${doencasStr}</span>
                  </div>
                </div>
              </div>

              <!-- Escolaridade -->
              <div class="section-box">
                <div class="section-title">Escolaridade</div>
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">29. Maior nível de escolaridade concluído</span>
                    <span class="cell-value" style="font-weight: bold;">${f.escolaridade_nivel ?? '—'}</span>
                  </div>
                  ${f.escolaridade_nivel === 'Ensino Médio' ? `
                  <div class="grid-cell">
                    <span class="cell-label">30. Tipo de Ensino Médio cursado</span>
                    <span class="cell-value">${f.ensino_medio_tipo ?? '—'}</span>
                  </div>
                  ` : ''}
                </div>

                ${f.escolaridade_nivel === 'Educação Superior' ? `
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">31. Dados do Curso Superior: Área do curso</span>
                    <span class="cell-value">${f.superior_area ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">Código do Curso</span>
                    <span class="cell-value">${f.superior_codigo ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">Ano de Conclusão</span>
                    <span class="cell-value">${f.superior_ano_conclusao ?? '—'}</span>
                  </div>
                </div>
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">Tipo de Instituição</span>
                    <span class="cell-value">${f.superior_tipo_instituicao ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">Grau Acadêmico</span>
                    <span class="cell-value">${f.superior_grau ?? '—'}</span>
                  </div>
                  <div class="grid-cell">
                    <span class="cell-label">Instituição de Formação</span>
                    <span class="cell-value">${f.superior_instituicao ?? '—'}</span>
                  </div>
                </div>
                ` : ''}

                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">32. Formação / Complementação Pedagógica</span>
                    <span class="cell-value">${f.complementacao_pedagogica ?? '—'}</span>
                  </div>
                </div>
              </div>

              <!-- Pós-Graduações -->
              <div class="section-box">
                <div class="section-title">33. Pós-Graduações Concluídas</div>
                <div style="padding: 6px; font-size: 10px;">
                  ${posHtml}
                </div>
              </div>

              <!-- Outros Cursos -->
              <div class="section-box">
                <div class="section-title">34. Outros Cursos Específicos (Formação Continuada mín. 80h)</div>
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-value">${outrosCursosStr}</span>
                  </div>
                </div>
              </div>

              <!-- Documentação Anexa -->
              <div class="section-box">
                <div class="section-title">35. Documentação Comprovatória Anexada</div>
                <div class="grid-row">
                  <div class="grid-cell">
                    <span class="cell-label">Cópias de documentos anexados</span>
                    <span class="cell-value" style="font-weight: bold; color: #2e7d32;">${docsAnexadosStr}</span>
                  </div>
                </div>
              </div>

              <!-- Observações -->
              <div class="section-box">
                <div class="section-title">Observações</div>
                <div style="padding: 4px; min-height: 25px; font-size: 9px; line-height: 1.3;">
                  ${f.observacoes ?? 'Nenhuma observação cadastrada.'}
                </div>
              </div>

              <!-- Assinatura e Data (Rodapé) -->
              <div class="footer-signature">
                <div class="signature-grid">
                  <div style="display: flex; align-items: flex-end; padding-bottom: 2px;">
                    <span>Sapeaçu, ${f.data_preenchimento ? formatarData(f.data_preenchimento) : '___/___/_____'}</span>
                  </div>
                  <div style="width: 250px; text-align: center;">
                    <div class="signature-line" style="margin-bottom: 2px;"></div>
                    <div style="font-size: 8px; font-weight: bold;">Assinatura do Funcionário / Servidor</div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Footer Fixo -->
            <div class="print-footer">
              <span>SIG Sapeaçu · Secretaria Municipal de Educação</span>
              <span>Ficha de Cadastro de Funcionário</span>
            </div>

          </body>
        </html>
      `)
      win.document.close()

    } catch (err: any) {
      toast.error('Erro ao gerar a ficha de impressão: ' + err.message)
      console.error(err)
    }
  }

  const handleImprimirLista = () => {
    const linhas = funcsFiltrados
      .map(
        (f) =>
          `<tr>
            <td>${f.nome}</td>
            <td>${f.cargo ?? '—'}</td>
            <td>${f.status}</td>
            <td>${f.orgao ?? '—'}</td>
            <td>${formatarData(f.data_nascimento)}</td>
          </tr>`
      )
      .join('')

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lista de Funcionários</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
            th { background: #f0f0f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Lista de Funcionários</h1>
          <table>
            <thead>
              <tr>
                <th>Nome</th><th>Cargo</th><th>Status</th><th>Órgão</th><th>Nascimento</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 pb-12">
      {/* Modal Novo Funcionário */}
      <ModalFuncionario
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        onSuccess={carregarFuncionarios}
      />

      {/* Modal Editar Funcionário */}
      <ModalFuncionario
        open={!!modalEditando}
        onOpenChange={(v) => { if (!v) setModalEditando(null) }}
        funcionario={modalEditando}
        onSuccess={carregarFuncionarios}
      />

      {/* Modal Gestão de Lotações */}
      <ModalGestaoLotacoes
        open={modalLotacoesOpen}
        onOpenChange={setModalLotacoesOpen}
        funcionarioInicial={funcLotacaoInicial}
      />

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-2 pb-4 border-b border-border">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <IconTile icon={Users} variant="primary" className="h-10 w-10 shrink-0" />
        <h1 className="text-2xl font-bold text-foreground">Gestão de Funcionários</h1>
      </div>

      {/* ── Painel de Ações Rápidas ─────────────────────────── */}
      <div className={cn("grid grid-cols-1 gap-4 mb-6", canManagePermissions ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {/* Atestados Médicos */}
        <Link href="/atestados" className="group">
          <div className="bg-surface-1 hover:bg-hoverCustom border border-border hover:border-success/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 shadow-md cursor-pointer h-full">
            <div className="p-3 rounded-xl bg-success/10 text-success group-hover:scale-105 transition-transform duration-200">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">Atestados Médicos</h3>
              <p className="text-xs text-muted-foreground mt-1">Registrar e gerenciar atestados e afastamentos</p>
            </div>
          </div>
        </Link>

        {/* Gestão de Lotações */}
        <div 
          onClick={() => {
            setFuncLotacaoInicial(null)
            setModalLotacoesOpen(true)
          }}
          className="group bg-surface-1 hover:bg-hoverCustom border border-border hover:border-warning/30 rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 shadow-md cursor-pointer h-full"
        >
          <div className="p-3 rounded-xl bg-warning/10 text-warning group-hover:scale-105 transition-transform duration-200">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm leading-tight">Gestão de Lotações</h3>
            <p className="text-xs text-muted-foreground mt-1">Vincular servidores às suas respectivas escolas</p>
          </div>
        </div>

        {/* Permissões de Acesso */}
        {canManagePermissions && (
          <div
            onClick={() => setViewMode(viewMode === 'lista' ? 'permissoes' : 'lista')}
            className={cn(
              "group bg-surface-1 hover:bg-hoverCustom border rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 shadow-md cursor-pointer h-full",
              viewMode === 'permissoes'
                ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                : "border-border hover:border-primary/30"
            )}
          >
            <div className={cn(
              "p-3 rounded-xl group-hover:scale-105 transition-transform duration-200",
              viewMode === 'permissoes'
                ? "bg-primary/20 text-primary"
                : "bg-primary/10 text-primary"
            )}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">Permissões de Acesso</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {viewMode === 'permissoes'
                  ? 'Voltar para a Lista de Funcionários'
                  : 'Gerenciar níveis e atribuições de acessos'}
              </p>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'permissoes' ? (
        <div className="animate-in fade-in duration-200">
          <PermissoesView onBack={() => setViewMode('lista')} />
        </div>
      ) : (
        <>
          {/* ── Barra de ferramentas ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Busca */}
        <Input
          placeholder="Buscar funcionário por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="bg-surface-1 border-borderCustom text-foreground placeholder:text-muted-foreground h-9 w-56 text-sm"
        />

        {/* Filtro Cargo */}
        <Select value={filtroCargo} onValueChange={(v) => setFiltroCargo(v ?? 'todos')}>
          <SelectTrigger className="bg-surface-1 border-borderCustom text-foreground h-9 text-sm w-44">
            <SelectValue placeholder="Todos os Cargos" />
          </SelectTrigger>
          <SelectContent className="bg-surface-1 border-borderCustom text-foreground">
            <SelectItem value="todos">Todos os Cargos</SelectItem>
            {cargosUnicos.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro Status */}
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v ?? 'todos')}>
          <SelectTrigger className="bg-surface-1 border-borderCustom text-foreground h-9 text-sm w-40">
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent className="bg-surface-1 border-borderCustom text-foreground">
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
            <SelectItem value="desligado">Desligado</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
          </SelectContent>
        </Select>

        {/* Imprimir Lista (Único Primário) */}
        <Button
          onClick={handleImprimirLista}
          className="bg-[#185FA5] hover:bg-[#185FA5]/90 text-white dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 font-semibold gap-2 h-9 text-sm cursor-pointer rounded-xl border-none shadow-sm flex items-center px-4"
        >
          <Printer className="w-4 h-4" />
          Imprimir Lista
        </Button>

        {/* Espaçador + Novo Funcionário */}
        {isEditMode && (
          <div className="ml-auto">
            <Button
              onClick={() => setModalNovoOpen(true)}
              className="bg-surface-1 hover:bg-hoverCustom border border-borderCustom text-foreground font-semibold gap-2 h-9 text-sm cursor-pointer rounded-xl"
              variant="outline"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
              Novo Funcionário
            </Button>
          </div>
        )}
      </div>

      {/* ── Grade de Cards ─────────────────────────────────────── */}
      {carregando ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : funcsFiltrados.length === 0 ? (
        <div className="bg-surface-1 border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
          Nenhum funcionário encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {funcsFiltrados.map((func) => {
            const palette = avatarPalette(func.nome)
            const isAtivo = (func.status ?? '').toLowerCase() === 'ativo'

            return (
              <div
                key={func.id}
                className="bg-card border-[0.5px] border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col gap-4 transition-all shadow-md"
              >
                {/* ── Topo do card: Avatar + Nome + Badges + Ações ── */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-border/50">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Avatar circular */}
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 overflow-hidden ${palette.bg} ${palette.text}`}
                    >
                      {func.foto_url ? (
                        <img
                          src={func.foto_url}
                          alt={func.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(func.nome)
                      )}
                    </div>

                    {/* Nome + badges */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-foreground tracking-tight truncate">
                        {func.nome}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {/* Badge Cargo */}
                        {func.cargo && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold tracking-wide truncate max-w-[130px]">
                            {func.cargo}
                          </span>
                        )}
                        {/* Badge Status */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${
                            isAtivo
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isAtivo ? 'bg-emerald-500' : 'bg-zinc-500'}`}
                          />
                          {isAtivo ? 'Ativo' : func.status.charAt(0).toUpperCase() + func.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Botões de Ação ──────────────────────── */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* M — Gestão de Lotações */}
                    {isEditMode && (
                      <button
                        onClick={() => handleAbrirLotacoes(func)}
                        title="Gestão de Lotações"
                        className="w-9 h-9 rounded-xl bg-transparent hover:bg-hoverCustom border border-border text-foreground font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                      >
                        M
                      </button>
                    )}
                    {/* Imprimir ficha (Único Destaque do Card) */}
                    <button
                      onClick={() => handleImprimir(func.id)}
                      title="Imprimir ficha"
                      className="w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-none flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {/* Editar */}
                    {isEditMode && (
                      <button
                        onClick={() => handleEditar(func)}
                        title="Editar funcionário"
                        className="w-9 h-9 rounded-xl bg-transparent hover:bg-hoverCustom border border-border text-foreground flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {/* Excluir */}
                    {isEditMode && (
                      <button
                        onClick={() => handleExcluir(func)}
                        title="Excluir funcionário"
                        className="w-9 h-9 rounded-xl bg-transparent hover:bg-destructive/10 hover:text-destructive border border-border text-foreground flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Informações Adicionais ────────────────── */}
                <div className="space-y-2.5">
                  {func.orgao && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Órgão</span>
                      <span className="text-sm font-normal text-muted-foreground">{func.orgao}</span>
                    </div>
                  )}
                  {func.data_nascimento && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Nascimento</span>
                      <span className="text-sm font-normal text-muted-foreground">{formatarData(func.data_nascimento)}</span>
                    </div>
                  )}
                  {func.formacao && (
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Formação</span>
                      <span className="text-sm font-normal text-muted-foreground">{func.formacao}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
        </>
      )}
    </div>
  )
}
