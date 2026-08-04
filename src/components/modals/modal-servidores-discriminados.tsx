'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { 
  Search, 
  Building2, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Building,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface ModalServidoresDiscriminadosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipoVinculoInicial?: string // 'Total' | 'Nomeado' | 'Concursado' | 'Contratado' | 'Outros'
  escolaIdAlvo?: string
}

interface ServidorItem {
  id: string
  vinculo_id: string
  nome: string
  cpf?: string | null
  cargo: string
  modalidade: string
  tipoVinculoNormalizado: 'Concursado' | 'Contratado' | 'Nomeado' | 'Outros'
  status: string
  escolaId: string
  escolaNome: string
  secretariaId: string
  secretariaNome: string
}

interface UnidadeGroup {
  unidadeId: string
  unidadeNome: string
  servidores: ServidorItem[]
}

interface SecretariaGroup {
  secretariaId: string
  secretariaNome: string
  unidades: UnidadeGroup[]
  totalServidores: number
}

const ABA_VINCULOS = [
  { id: 'Total', label: 'Todos os Servidores' },
  { id: 'Nomeado', label: 'Nomeados' },
  { id: 'Concursado', label: 'Concursados / Efetivos' },
  { id: 'Contratado', label: 'Contratados' },
]

export function ModalServidoresDiscriminados({
  open,
  onOpenChange,
  tipoVinculoInicial = 'Total',
  escolaIdAlvo,
}: ModalServidoresDiscriminadosProps) {
  const supabase = createClient()
  const [tipoVinculo, setTipoVinculo] = useState<string>(tipoVinculoInicial)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [servidoresRaw, setServidoresRaw] = useState<ServidorItem[]>([])
  
  // Controle de sanfona (expansão) das secretarias e unidades
  const [expandedSecretarias, setExpandedSecretarias] = useState<Record<string, boolean>>({})
  const [expandedUnidades, setExpandedUnidades] = useState<Record<string, boolean>>({})

  const isMountedRef = useRef(true)
  const requestCounter = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Atualiza vínculo selecionado ao abrir com novo tipo inicial
  useEffect(() => {
    if (open) {
      setTipoVinculo(tipoVinculoInicial || 'Total')
      setSearchTerm('')
    }
  }, [open, tipoVinculoInicial])

  // Busca dados de servidores com lotações, escolas e secretarias no Supabase
  const loadServidores = useCallback(async () => {
    if (!open) return
    const currentReq = ++requestCounter.current
    setIsLoading(true)

    try {
      let query = supabase
        .from('vinculos_funcionarios')
        .select(`
          id,
          cargo,
          escola_id,
          escolas (
            id,
            nome,
            secretaria_id,
            secretarias (
              id,
              nome
            )
          ),
          funcionarios!inner (
            id,
            nome,
            cpf,
            status,
            cargo,
            modalidade_ensino,
            tipo_vinculo,
            is_conta_especial,
            deleted_at
          )
        `)
        .eq('ativo', true)
        .is('funcionarios.deleted_at', null)

      if (escolaIdAlvo) {
        query = query.eq('escola_id', escolaIdAlvo)
      }

      const { data, error } = await query

      if (!isMountedRef.current || currentReq !== requestCounter.current) return

      if (error) {
        console.error('Erro ao buscar lotações de servidores:', error)
        toast.error('Erro ao carregar lista de servidores por secretaria.')
        setServidoresRaw([])
        return
      }

      if (data) {
        const mapped: ServidorItem[] = (data as any[])
          .filter((v) => !v.funcionarios?.is_conta_especial)
          .filter((v) => {
            const st = (v.funcionarios?.status ?? 'ATIVO').toUpperCase()
            return st === 'ATIVO' || st === ''
          })
          .map((v) => {
            const f = v.funcionarios
            const esc = v.escolas
            const sec = esc?.secretarias

            const cargoFinal = (v.cargo || f.cargo || 'Cargo não informado').trim()

            const tipoVincUpper = (f.tipo_vinculo ?? '').toUpperCase()
            let tipoNorm: 'Concursado' | 'Contratado' | 'Nomeado' | 'Outros' = 'Outros'

            if (tipoVincUpper.includes('EFETIVO') || tipoVincUpper.includes('CONCURSADO')) {
              tipoNorm = 'Concursado'
            } else if (
              tipoVincUpper.includes('CONTRATADO') ||
              tipoVincUpper.includes('SUBSTITUTO') ||
              tipoVincUpper.includes('PRESTADOR') ||
              tipoVincUpper.includes('RESERVISTA')
            ) {
              tipoNorm = 'Contratado'
            } else if (tipoVincUpper.includes('NOMEADO')) {
              tipoNorm = 'Nomeado'
            }

            const modUpper = (f.modalidade_ensino ?? '').toUpperCase()
            const cargoUpper = cargoFinal.toUpperCase()
            let modFinal = 'Regular'
            if (modUpper.includes('EJA') || cargoUpper.includes('EJA')) {
              modFinal = 'EJA'
            }

            return {
              id: f.id,
              vinculo_id: v.id,
              nome: f.nome ?? 'Sem nome',
              cpf: f.cpf ?? null,
              cargo: cargoFinal,
              modalidade: modFinal,
              tipoVinculoNormalizado: tipoNorm,
              status: f.status ?? 'ativo',
              escolaId: esc?.id ?? 'sem-escola',
              escolaNome: esc?.nome ?? 'Unidade Administrativa Não Informada',
              secretariaId: sec?.id ?? 'sem-secretaria',
              secretariaNome: sec?.nome ?? 'Secretaria Geral / Administração Central',
            }
          })

        setServidoresRaw(mapped)
      }
    } catch (err) {
      if (!isMountedRef.current || currentReq !== requestCounter.current) return
      console.error('Exceção ao carregar servidores por secretaria:', err)
      toast.error('Ocorreu um erro ao carregar os dados.')
      setServidoresRaw([])
    } finally {
      if (isMountedRef.current && currentReq === requestCounter.current) {
        setIsLoading(false)
      }
    }
  }, [open, supabase, escolaIdAlvo])

  useEffect(() => {
    loadServidores()
  }, [loadServidores])

  // Filtragem por Vínculo e Termo de Busca
  const servidoresFiltrados = useMemo(() => {
    return servidoresRaw.filter((item) => {
      // Filtro por Vínculo
      let matchVinc = true
      if (tipoVinculo !== 'Total') {
        matchVinc = item.tipoVinculoNormalizado === tipoVinculo
      }

      // Filtro de Busca
      let matchSearch = true
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        matchSearch =
          item.nome.toLowerCase().includes(term) ||
          item.cargo.toLowerCase().includes(term) ||
          item.escolaNome.toLowerCase().includes(term) ||
          item.secretariaNome.toLowerCase().includes(term) ||
          (!!item.cpf && item.cpf.includes(term))
      }

      return matchVinc && matchSearch
    })
  }, [servidoresRaw, tipoVinculo, searchTerm])

  // Agrupamento por Secretaria -> Unidade Administrativa
  const secretariasAgrupadas = useMemo(() => {
    const mapSec = new Map<string, { secretariaNome: string; unidadesMap: Map<string, { unidadeNome: string; servidores: ServidorItem[] }> }>()

    for (const item of servidoresFiltrados) {
      const secKey = item.secretariaId
      if (!mapSec.has(secKey)) {
        mapSec.set(secKey, {
          secretariaNome: item.secretariaNome,
          unidadesMap: new Map(),
        })
      }

      const secObj = mapSec.get(secKey)!
      const undKey = item.escolaId
      if (!secObj.unidadesMap.has(undKey)) {
        secObj.unidadesMap.set(undKey, {
          unidadeNome: item.escolaNome,
          servidores: [],
        })
      }

      secObj.unidadesMap.get(undKey)!.servidores.push(item)
    }

    const resultado: SecretariaGroup[] = []

    mapSec.forEach((secVal, secKey) => {
      const unidades: UnidadeGroup[] = []
      let secTotalServidores = 0

      secVal.unidadesMap.forEach((undVal, undKey) => {
        // Ordenar servidores por nome
        undVal.servidores.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        secTotalServidores += undVal.servidores.length
        unidades.push({
          unidadeId: undKey,
          unidadeNome: undVal.unidadeNome,
          servidores: undVal.servidores,
        })
      })

      // Ordenar unidades por nome
      unidades.sort((a, b) => a.unidadeNome.localeCompare(b.unidadeNome, 'pt-BR'))

      resultado.push({
        secretariaId: secKey,
        secretariaNome: secVal.secretariaNome,
        unidades,
        totalServidores: secTotalServidores,
      })
    })

    // Ordenar secretarias por nome
    return resultado.sort((a, b) => a.secretariaNome.localeCompare(b.secretariaNome, 'pt-BR'))
  }, [servidoresFiltrados])

  // Estatísticas de Pessoas e Vínculos
  const totalServidoresUnicos = useMemo(() => {
    const setIds = new Set(servidoresFiltrados.map((s) => s.id))
    return setIds.size
  }, [servidoresFiltrados])

  const totalUnidadesCount = useMemo(() => {
    const setUnds = new Set(servidoresFiltrados.map((s) => s.escolaId))
    return setUnds.size
  }, [servidoresFiltrados])

  // Expansão inicial ao carregar ou buscar
  useEffect(() => {
    if (secretariasAgrupadas.length > 0) {
      const initialSecMap: Record<string, boolean> = {}
      const initialUndMap: Record<string, boolean> = {}

      // Se houver busca ou menos de 5 secretarias, expande tudo para facilitador de UX
      const shouldExpandAll = searchTerm.trim().length > 0 || secretariasAgrupadas.length <= 4

      secretariasAgrupadas.forEach((sec, idx) => {
        initialSecMap[sec.secretariaId] = shouldExpandAll || idx === 0
        sec.unidades.forEach((und) => {
          initialUndMap[`${sec.secretariaId}_${und.unidadeId}`] = shouldExpandAll || idx === 0
        })
      })

      setExpandedSecretarias(initialSecMap)
      setExpandedUnidades(initialUndMap)
    }
  }, [secretariasAgrupadas, searchTerm])

  const toggleSecretaria = (secId: string) => {
    setExpandedSecretarias((prev) => ({ ...prev, [secId]: !prev[secId] }))
  }

  const toggleUnidade = (key: string) => {
    setExpandedUnidades((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Título dinâmico do Modal
  const tituloModal = useMemo(() => {
    switch (tipoVinculo) {
      case 'Nomeado':
        return 'Servidores Nomeados por Secretaria e Unidade'
      case 'Concursado':
        return 'Servidores Concursados / Efetivos por Secretaria e Unidade'
      case 'Contratado':
        return 'Servidores Contratados por Secretaria e Unidade'
      default:
        return 'Consolidado Geral de Servidores por Secretaria e Unidade'
    }
  }, [tipoVinculo])

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tituloModal}
      description="Relação oficial discriminada por Secretarias Municipais e Unidades Administrativas."
      maxWidth="sm:max-w-5xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Header: Filtros por Vínculo e Estatísticas */}
        <div className="space-y-3">
          {/* Pills de Vínculo (Scroll Horizontal em Mobile) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar touch-pan-x">
            {ABA_VINCULOS.map((aba) => {
              const count = servidoresRaw.filter((s) => aba.id === 'Total' || s.tipoVinculoNormalizado === aba.id).length
              const isActive = tipoVinculo === aba.id

              return (
                <button
                  key={aba.id}
                  onClick={() => setTipoVinculo(aba.id)}
                  className={cn(
                    'px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer shrink-0',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]'
                      : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary border-border'
                  )}
                >
                  <span>{aba.label}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-extrabold',
                      isActive ? 'bg-background/20 text-white' : 'bg-background/50 text-muted-foreground'
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Cards de Métricas do Filtro Atual */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-secondary/30 p-3 rounded-xl border border-borderCustom/60">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Total de Vínculos</span>
              <strong className="text-primary text-base font-extrabold">{servidoresFiltrados.length}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Servidores Únicos</span>
              <strong className="text-blue-400 text-base font-extrabold">{totalServidoresUnicos}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Secretarias</span>
              <strong className="text-purple-400 text-base font-extrabold">{secretariasAgrupadas.length}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Unidades / Escolas</span>
              <strong className="text-emerald-400 text-base font-extrabold">{totalUnidadesCount}</strong>
            </div>
          </div>

          {/* Campo de Pesquisa em Tempo Real */}
          <div className="relative sticky top-0 z-20 bg-card pt-1 pb-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome do servidor, CPF, cargo, secretaria ou escola..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/50 border border-border text-foreground text-xs rounded-xl pl-9 pr-8 py-2.5 outline-none focus:border-primary font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista Discriminada Agrupada por Secretaria e Unidade */}
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-xs animate-pulse flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span>Carregando lista de servidores por secretarias e unidades...</span>
          </div>
        ) : secretariasAgrupadas.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-xs flex flex-col items-center justify-center space-y-2 border border-dashed border-border rounded-2xl">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
            <p className="font-bold text-foreground">Nenhum servidor encontrado</p>
            <p className="text-muted-foreground text-[11px] max-w-sm">
              {searchTerm ? 'Nenhum registro atende ao termo pesquisado.' : 'Não há servidores cadastrados para esta modalidade/vínculo.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {secretariasAgrupadas.map((sec) => {
              const isSecOpen = expandedSecretarias[sec.secretariaId] ?? true

              return (
                <div
                  key={sec.secretariaId}
                  className="border border-borderCustom rounded-2xl overflow-hidden bg-card/60 shadow-xs"
                >
                  {/* Cabeçalho da Secretaria */}
                  <button
                    onClick={() => toggleSecretaria(sec.secretariaId)}
                    className="w-full bg-surface-1 hover:bg-hoverCustom/80 px-4 py-3 flex items-center justify-between transition-colors border-b border-borderCustom/50 text-left focus:outline-none cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <h3 className="font-bold text-foreground text-sm truncate">{sec.secretariaNome}</h3>
                        <span className="text-[10px] text-muted-foreground block">
                          {sec.unidades.length} unidade(s) • {sec.totalServidores} servidor(es)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                        {sec.totalServidores}
                      </span>
                      {isSecOpen ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Conteúdo da Secretaria (Unidades) */}
                  {isSecOpen && (
                    <div className="p-3 space-y-3 bg-background/30">
                      {sec.unidades.map((und) => {
                        const undKey = `${sec.secretariaId}_${und.unidadeId}`
                        const isUndOpen = expandedUnidades[undKey] ?? true

                        return (
                          <div
                            key={und.unidadeId}
                            className="border border-border rounded-xl overflow-hidden bg-surface-1/70"
                          >
                            {/* Cabeçalho da Unidade Administrativa / Escola */}
                            <button
                              onClick={() => toggleUnidade(undKey)}
                              className="w-full bg-secondary/40 hover:bg-secondary/70 px-3.5 py-2.5 flex items-center justify-between transition-colors text-left focus:outline-none cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="font-semibold text-foreground text-xs truncate">
                                  {und.unidadeNome}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-[10px] font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                                  {und.servidores.length} servidor(es)
                                </span>
                                {isUndOpen ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </button>

                            {/* Conteúdo da Unidade (Servidores) */}
                            {isUndOpen && (
                              <div className="p-2 border-t border-border/60">
                                {/* Visão Desktop: Tabela Responsiva */}
                                <div className="hidden sm:block overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-secondary/50 text-muted-foreground uppercase text-[9px] tracking-wider border-b border-border/50">
                                      <tr>
                                        <th className="py-2 px-3 w-8 text-center">#</th>
                                        <th className="py-2 px-3">Nome do Servidor</th>
                                        <th className="py-2 px-3">Cargo / Função</th>
                                        <th className="py-2 px-3 text-center">Modalidade</th>
                                        <th className="py-2 px-3 text-center">Tipo de Vínculo</th>
                                        <th className="py-2 px-3 text-center">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                      {und.servidores.map((serv, idx) => (
                                        <tr key={serv.vinculo_id || idx} className="hover:bg-hoverCustom/50 transition-colors font-medium">
                                          <td className="py-2 px-3 text-center font-bold text-muted-foreground text-[10px]">
                                            {idx + 1}
                                          </td>
                                          <td className="py-2 px-3 font-semibold text-foreground">
                                            {serv.nome}
                                            {serv.cpf && (
                                              <span className="block font-mono text-[10px] text-muted-foreground font-normal">
                                                CPF: {serv.cpf}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-foreground">{serv.cargo}</td>
                                          <td className="py-2 px-3 text-center">
                                            {serv.modalidade === 'EJA' ? (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                EJA
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                Regular
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center">
                                            {serv.tipoVinculoNormalizado === 'Concursado' ? (
                                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                                Concursado / Efetivo
                                              </span>
                                            ) : serv.tipoVinculoNormalizado === 'Contratado' ? (
                                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                Contratado
                                              </span>
                                            ) : serv.tipoVinculoNormalizado === 'Nomeado' ? (
                                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                                Nomeado
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border">
                                                Outros
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center uppercase text-[10px] font-bold">
                                            <span className={serv.status === 'ativo' ? 'text-emerald-400' : 'text-muted-foreground'}>
                                              {serv.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Visão Mobile: Cards Inteligentes e Compactos */}
                                <div className="block sm:hidden space-y-2">
                                  {und.servidores.map((serv, idx) => (
                                    <div
                                      key={serv.vinculo_id || idx}
                                      className="bg-card border border-borderCustom/70 rounded-xl p-3 space-y-2 shadow-2xs"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                            {idx + 1}
                                          </div>
                                          <div>
                                            <h4 className="font-bold text-foreground text-xs leading-tight">{serv.nome}</h4>
                                            {serv.cpf && (
                                              <span className="text-[10px] font-mono text-muted-foreground block">
                                                CPF: {serv.cpf}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-[9px] uppercase font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                                          {serv.status}
                                        </span>
                                      </div>

                                      <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                        <span className="font-semibold text-foreground">Cargo: </span>
                                        {serv.cargo}
                                      </div>

                                      <div className="flex items-center justify-between gap-2 pt-0.5">
                                        {/* Badge Vínculo */}
                                        {serv.tipoVinculoNormalizado === 'Concursado' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                            Concursado
                                          </span>
                                        ) : serv.tipoVinculoNormalizado === 'Contratado' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                            Contratado
                                          </span>
                                        ) : serv.tipoVinculoNormalizado === 'Nomeado' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                            Nomeado
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border">
                                            Outros
                                          </span>
                                        )}

                                        {/* Badge Modalidade */}
                                        {serv.modalidade === 'EJA' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                            EJA
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            Ensino Regular
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </StandardDialog>
  )
}
