'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import {
  HardDrive,
  Search,
  Building2,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  File as FileIcon,
  Globe,
  ExternalLink,
  ShieldAlert,
  FolderOpen,
  ArrowUpDown,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useLocalSearch } from '@/hooks/useLocalSearch'

// Interfaces que batem com o retorno da API
interface SchoolStat {
  escolaId: string
  escolaNome: string
  totalBytes: number
  fileCount: number
  breakdown: { images: number; docs: number; videos: number; others: number }
}

interface MappedFile {
  id: string
  name: string
  bucketId: string
  size: number
  mimetype: string
  createdAt: string
  escolaId: string | null
  escolaNome: string
  type: 'images' | 'docs' | 'videos' | 'others'
}

interface StorageData {
  totalBytes: number
  sharedBytes: number
  sharedFileCount: number
  sharedBreakdown: { images: number; docs: number; videos: number; others: number }
  totalFileCount: number
  bySchool: SchoolStat[]
  topFiles: MappedFile[]
}

// Helper para formatar tamanho de arquivos
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export default function AdminArmazenamentoPage() {
  const router = useRouter()
  const { funcionario } = useAuthStore()

  // Estados dos dados e de carregamento
  const [data, setData] = useState<StorageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Estados dos filtros do inspetor de arquivos
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL')
  const [selectedBucket, setSelectedBucket] = useState<string>('ALL')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'size' | 'date'>('size')

  const loadStorageData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/admin/armazenamento')
      if (!res.ok) {
        if (res.status === 403) {
          toast.error('Sem permissão de acesso.')
          router.push('/home')
          return
        }
        throw new Error('Falha ao consultar armazenamento')
      }
      const json = await res.json()
      setData(json)
      if (isRefresh) {
        toast.success('Dados de armazenamento atualizados!')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao carregar metadados de armazenamento.')
    } finally {
      if (!isRefresh) setLoading(false)
      setRefreshing(false)
    }
  }

  // Guarda de rota + carga inicial consolidados:
  // aguarda `funcionario` estar disponível antes de qualquer fetch
  useEffect(() => {
    if (!funcionario) return // ainda carregando o perfil — aguarda
    if (!funcionario.is_superadmin) {
      toast.error('Acesso restrito a administradores ROOT.')
      router.push('/home')
      return
    }
    loadStorageData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionario])

  // Lista única de buckets para filtro
  const bucketsList = useMemo(() => {
    if (!data?.topFiles) return []
    const set = new Set<string>()
    data.topFiles.forEach(f => set.add(f.bucketId))
    return Array.from(set).sort()
  }, [data])

  const searchedFiles = useLocalSearch(data?.topFiles || [], searchTerm, ['name'])

  // Filtrar e ordenar arquivos do inspetor de arquivos
  const filteredFiles = useMemo(() => {
    return searchedFiles
      .filter(file => {
        // Filtro de Escola
        const schoolMatch =
          selectedSchool === 'ALL' ||
          (selectedSchool === 'SHARED' && file.escolaId === null) ||
          file.escolaId === selectedSchool
        // Filtro de Bucket
        const bucketMatch = selectedBucket === 'ALL' || file.bucketId === selectedBucket
        // Filtro de Tipo
        const typeMatch = selectedType === 'ALL' || file.type === selectedType

        return schoolMatch && bucketMatch && typeMatch
      })
      .sort((a, b) => {
        if (sortBy === 'size') {
          return b.size - a.size
        } else {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
      })
  }, [searchedFiles, selectedSchool, selectedBucket, selectedType, sortBy])

  // Calcular percentuais para a barra de progresso empilhada global
  const typeBreakdownPercentages = useMemo(() => {
    if (!data || data.totalBytes === 0) return { images: 0, docs: 0, videos: 0, others: 0 }
    
    // Soma o total de cada tipo na rede inteira
    let imagesSum = data.sharedBreakdown.images
    let docsSum = data.sharedBreakdown.docs
    let videosSum = data.sharedBreakdown.videos
    let othersSum = data.sharedBreakdown.others

    data.bySchool.forEach(s => {
      imagesSum += s.breakdown.images
      docsSum += s.breakdown.docs
      videosSum += s.breakdown.videos
      othersSum += s.breakdown.others
    })

    const total = data.totalBytes

    return {
      images: (imagesSum / total) * 100,
      docs: (docsSum / total) * 100,
      videos: (videosSum / total) * 100,
      others: (othersSum / total) * 100,
      imagesBytes: imagesSum,
      docsBytes: docsSum,
      videosBytes: videosSum,
      othersBytes: othersSum
    }
  }, [data])

  // Retorna a URL pública de download do arquivo com cache busting
  const getFilePublicUrl = (bucketId: string, name: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
    return `${supabaseUrl}/storage/v1/object/public/${bucketId}/${name}?t=${Date.now()}`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-[#8e8e93] font-medium text-sm animate-pulse">
          Analisando volumes e medindo espaço em disco...
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto gap-4">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <h3 className="text-white font-bold text-lg">Erro ao processar dados</h3>
        <p className="text-[#8e8e93] text-sm">
          Não foi possível conectar ao storage do Supabase. Verifique suas políticas de acesso ou tente novamente.
        </p>
        <Button onClick={() => loadStorageData()} className="mt-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white">
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#232328]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <HardDrive className="w-7 h-7 text-purple-500" />
            Armazenamento do Servidor
          </h2>
          <p className="text-[#aaa] text-sm mt-1">
            Análise detalhada do uso do Supabase Storage por escolas, buckets e formatos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadStorageData(true)}
            disabled={refreshing}
            variant="outline"
            className="border-[#2a2a2a] hover:bg-[#272727] text-white cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Sincronizando...' : 'Atualizar Dados'}
          </Button>
        </div>
      </div>

      {/* ── Métricas Principais (Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#121214] border-[#232326] rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
              Armazenamento Total
            </CardDescription>
            <CardTitle className="text-2xl font-black text-white mt-1">
              {formatBytes(data.totalBytes)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#8e8e93]">Espaço ocupado por toda a rede municipal.</p>
          </CardContent>
        </Card>

        <Card className="bg-[#121214] border-[#232326] rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
              Rede Compartilhada
            </CardDescription>
            <CardTitle className="text-2xl font-black text-sky-400 mt-1">
              {formatBytes(data.sharedBytes)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#8e8e93]">
              Logos, murais e anexos de comunicados globais.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#121214] border-[#232326] rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
              Total de Arquivos
            </CardDescription>
            <CardTitle className="text-2xl font-black text-emerald-400 mt-1">
              {data.totalFileCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#8e8e93]">Arquivos cadastrados nos buckets públicos.</p>
          </CardContent>
        </Card>

        <Card className="bg-[#121214] border-[#232326] rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
              Eficiência e Custo
            </CardDescription>
            <CardTitle className="text-2xl font-black text-purple-400 mt-1">
              {((data.totalBytes / (5 * 1024 * 1024 * 1024)) * 100).toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#8e8e93]">Consumido do limite padrão grátis de 5 GB.</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Distribuição Visual por Formato (Stacked Progress + Indicators) ── */}
      <Card className="bg-[#121214] border-[#232326] rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
            Breakdown por Tipo de Arquivo
          </CardTitle>
          <CardDescription className="text-xs">
            Distribuição proporcional do espaço total em disco.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stacked Progress Bar */}
          <div className="w-full bg-[#1e1e22] rounded-full h-4 overflow-hidden flex border border-[#2d2d33]">
            {typeBreakdownPercentages.images > 0 && (
              <div
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${typeBreakdownPercentages.images}%` }}
                title={`Imagens: ${typeBreakdownPercentages.images.toFixed(1)}%`}
              />
            )}
            {typeBreakdownPercentages.docs > 0 && (
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${typeBreakdownPercentages.docs}%` }}
                title={`Documentos: ${typeBreakdownPercentages.docs.toFixed(1)}%`}
              />
            )}
            {typeBreakdownPercentages.videos > 0 && (
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${typeBreakdownPercentages.videos}%` }}
                title={`Vídeos: ${typeBreakdownPercentages.videos.toFixed(1)}%`}
              />
            )}
            {typeBreakdownPercentages.others > 0 && (
              <div
                className="bg-slate-500 h-full transition-all"
                style={{ width: `${typeBreakdownPercentages.others}%` }}
                title={`Outros: ${typeBreakdownPercentages.others.toFixed(1)}%`}
              />
            )}
            {data.totalBytes === 0 && <div className="bg-slate-700 w-full h-full" />}
          </div>

          {/* Grid Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-[#17171a] p-3 rounded-xl border border-[#27272a]">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#8e8e93] font-semibold uppercase">Imagens</p>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {formatBytes(typeBreakdownPercentages.imagesBytes ?? 0)}
                </h4>
                <p className="text-[10px] text-[#8e8e93] mt-0.5">
                  {typeBreakdownPercentages.images.toFixed(1)}% do disco
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#17171a] p-3 rounded-xl border border-[#27272a]">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#8e8e93] font-semibold uppercase">Documentos</p>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {formatBytes(typeBreakdownPercentages.docsBytes ?? 0)}
                </h4>
                <p className="text-[10px] text-[#8e8e93] mt-0.5">
                  {typeBreakdownPercentages.docs.toFixed(1)}% do disco
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#17171a] p-3 rounded-xl border border-[#27272a]">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                <VideoIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#8e8e93] font-semibold uppercase">Vídeos</p>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {formatBytes(typeBreakdownPercentages.videosBytes ?? 0)}
                </h4>
                <p className="text-[10px] text-[#8e8e93] mt-0.5">
                  {typeBreakdownPercentages.videos.toFixed(1)}% do disco
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#17171a] p-3 rounded-xl border border-[#27272a]">
              <div className="p-2 bg-slate-500/10 text-slate-400 rounded-lg">
                <FileIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#8e8e93] font-semibold uppercase">Outros</p>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {formatBytes(typeBreakdownPercentages.othersBytes ?? 0)}
                </h4>
                <p className="text-[10px] text-[#8e8e93] mt-0.5">
                  {typeBreakdownPercentages.others.toFixed(1)}% do disco
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Consumo por Unidades Escolares ── */}
      <Card className="bg-[#121214] border-[#232326] rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-500" />
            Consumo por Escola da Rede
          </CardTitle>
          <CardDescription className="text-xs">
            Lista de escolas cadastradas e o volume ocupado individualmente no disco.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-[#17171a]">
                <TableRow className="border-b border-[#2a2a2a] hover:bg-transparent">
                  <TableHead className="text-white font-bold text-xs uppercase">Escola / Origem</TableHead>
                  <TableHead className="text-white font-bold text-xs uppercase text-center w-32">Nº Arquivos</TableHead>
                  <TableHead className="text-white font-bold text-xs uppercase w-48">Consumo por Categoria (Proporção)</TableHead>
                  <TableHead className="text-white font-bold text-xs uppercase text-right w-44">Espaço Ocupado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Linha da Rede Compartilhada */}
                <TableRow className="border-b border-[#202024] hover:bg-[#1a1a1f] transition-colors">
                  <TableCell className="font-semibold text-white flex items-center gap-2 py-3.5">
                    <Globe className="w-4 h-4 text-sky-400" />
                    <span>Rede Compartilhada (Global)</span>
                    <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] ml-2 font-extrabold uppercase">
                      Sistema
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium text-[#8e8e93]">{data.sharedFileCount}</TableCell>
                  <TableCell>
                    {/* Visual mini-bar */}
                    <div className="w-full bg-[#202024] rounded-full h-1.5 overflow-hidden flex">
                      {data.sharedBytes > 0 ? (
                        <>
                          <div className="bg-purple-500 h-full" style={{ width: `${(data.sharedBreakdown.images / data.sharedBytes) * 100}%` }} />
                          <div className="bg-amber-500 h-full" style={{ width: `${(data.sharedBreakdown.docs / data.sharedBytes) * 100}%` }} />
                          <div className="bg-rose-500 h-full" style={{ width: `${(data.sharedBreakdown.videos / data.sharedBytes) * 100}%` }} />
                          <div className="bg-slate-500 h-full" style={{ width: `${(data.sharedBreakdown.others / data.sharedBytes) * 100}%` }} />
                        </>
                      ) : (
                        <div className="bg-slate-700 w-full h-full" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-extrabold text-sky-400">
                    {formatBytes(data.sharedBytes)}
                    <span className="text-[10px] text-[#8e8e93] font-normal block mt-0.5">
                      {data.totalBytes > 0 ? ((data.sharedBytes / data.totalBytes) * 100).toFixed(1) : 0}% do total
                    </span>
                  </TableCell>
                </TableRow>

                {/* Listagem das Escolas */}
                {data.bySchool.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-[#8e8e93] text-sm">
                      Nenhuma escola com consumo registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.bySchool.map(school => {
                    const pct = data.totalBytes > 0 ? (school.totalBytes / data.totalBytes) * 100 : 0

                    return (
                      <TableRow key={school.escolaId} className="border-b border-[#202024] hover:bg-[#1a1a1f] transition-colors">
                        <TableCell className="font-semibold text-white py-3.5 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-purple-400" />
                          <span className="truncate max-w-[320px] md:max-w-[450px]" title={school.escolaNome}>
                            {school.escolaNome}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-medium text-[#8e8e93]">{school.fileCount}</TableCell>
                        <TableCell>
                          {/* Visual mini-bar */}
                          <div className="w-full bg-[#202024] rounded-full h-1.5 overflow-hidden flex">
                            {school.totalBytes > 0 ? (
                              <>
                                <div className="bg-purple-500 h-full" style={{ width: `${(school.breakdown.images / school.totalBytes) * 100}%` }} />
                                <div className="bg-amber-500 h-full" style={{ width: `${(school.breakdown.docs / school.totalBytes) * 100}%` }} />
                                <div className="bg-rose-500 h-full" style={{ width: `${(school.breakdown.videos / school.totalBytes) * 100}%` }} />
                                <div className="bg-slate-500 h-full" style={{ width: `${(school.breakdown.others / school.totalBytes) * 100}%` }} />
                              </>
                            ) : (
                              <div className="bg-slate-700 w-full h-full" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-extrabold text-white">
                          {formatBytes(school.totalBytes)}
                          <span className="text-[10px] text-[#8e8e93] font-normal block mt-0.5">
                            {pct.toFixed(1)}% do total
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Inspetor de Arquivos (Auditoria Detalhada) ── */}
      <Card className="bg-[#121214] border-[#232326] rounded-2xl">
        <CardHeader className="pb-3 border-b border-[#232326]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-purple-500" />
                Inspetor de Arquivos em Armazenamento
              </CardTitle>
              <CardDescription className="text-xs">
                Audite e gerencie os 100 maiores arquivos em disco por busca e filtros.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Controles de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Campo de Busca */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#8e8e93]" />
              <input
                type="text"
                placeholder="Buscar por nome do arquivo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#17171a] border border-[#2a2a2a] hover:border-white/10 focus:border-purple-500 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-[#8e8e93] outline-none transition-all"
              />
            </div>

            {/* Filtro de Escola */}
            <div className="flex items-center gap-2 bg-[#17171a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-[#8e8e93]">
              <Building2 className="w-4 h-4 shrink-0 text-[#8e8e93]" />
              <select
                value={selectedSchool}
                onChange={e => setSelectedSchool(e.target.value)}
                className="bg-transparent border-none text-white outline-none w-full cursor-pointer text-xs font-semibold"
              >
                <option value="ALL" className="bg-[#17171a]">Filtrar Escola: Todas</option>
                <option value="SHARED" className="bg-[#17171a]">Filtrar Escola: Rede Global</option>
                {data.bySchool.map(s => (
                  <option key={s.escolaId} value={s.escolaId} className="bg-[#17171a]">
                    {s.escolaNome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Bucket */}
            <div className="flex items-center gap-2 bg-[#17171a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-[#8e8e93]">
              <FolderOpen className="w-4 h-4 shrink-0 text-[#8e8e93]" />
              <select
                value={selectedBucket}
                onChange={e => setSelectedBucket(e.target.value)}
                className="bg-transparent border-none text-white outline-none w-full cursor-pointer text-xs font-semibold"
              >
                <option value="ALL" className="bg-[#17171a]">Filtrar Bucket: Todos</option>
                {bucketsList.map(b => (
                  <option key={b} value={b} className="bg-[#17171a]">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Tipo */}
            <div className="flex items-center gap-2 bg-[#17171a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-[#8e8e93]">
              <Filter className="w-4 h-4 shrink-0 text-[#8e8e93]" />
              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="bg-transparent border-none text-white outline-none w-full cursor-pointer text-xs font-semibold"
              >
                <option value="ALL" className="bg-[#17171a]">Filtrar Tipo: Todos</option>
                <option value="images" className="bg-[#17171a]">Imagens</option>
                <option value="docs" className="bg-[#17171a]">Documentos</option>
                <option value="videos" className="bg-[#17171a]">Vídeos</option>
                <option value="others" className="bg-[#17171a]">Outros</option>
              </select>
            </div>
          </div>

          {/* Opções extras (Ordenação e Resultados) */}
          <div className="flex items-center justify-between text-xs text-[#8e8e93] px-1">
            <div>
              Mostrando <strong className="text-white">{filteredFiles.length}</strong> de{' '}
              <strong className="text-white">{data.topFiles.length}</strong> arquivos auditados.
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#8e8e93]" /> Ordenar por:
              </span>
              <button
                onClick={() => setSortBy('size')}
                className={`font-semibold cursor-pointer ${sortBy === 'size' ? 'text-purple-400 underline decoration-2 underline-offset-4' : 'text-[#8e8e93] hover:text-white'}`}
              >
                Maior Tamanho
              </button>
              <button
                onClick={() => setSortBy('date')}
                className={`font-semibold cursor-pointer ${sortBy === 'date' ? 'text-purple-400 underline decoration-2 underline-offset-4' : 'text-[#8e8e93] hover:text-white'}`}
              >
                Recentes
              </button>
            </div>
          </div>

          {/* Tabela do Inspetor */}
          <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-[#17171a]">
                <TableRow className="border-b border-[#2a2a2a] hover:bg-transparent">
                  <TableHead className="text-white font-bold text-xs uppercase">Arquivo</TableHead>
                  <TableHead className="text-white font-bold text-xs uppercase w-48">Bucket</TableHead>
                  <TableHead className="text-white font-bold text-xs uppercase w-56">Proprietário / Escola</TableHead>
                  <TableHead className="text-white font-bold text-xs uppercase text-right w-36">Tamanho</TableHead>
                  <TableHead className="text-white font-bold text-xs uppercase text-center w-24">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-[#8e8e93] text-sm">
                      Nenhum arquivo correspondente aos filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFiles.map(file => {
                    let TypeIcon = FileIcon
                    let typeColor = 'text-slate-400 bg-slate-500/10'
                    if (file.type === 'images') {
                      TypeIcon = ImageIcon
                      typeColor = 'text-purple-400 bg-purple-500/10'
                    } else if (file.type === 'docs') {
                      TypeIcon = FileText
                      typeColor = 'text-amber-400 bg-amber-500/10'
                    } else if (file.type === 'videos') {
                      TypeIcon = VideoIcon
                      typeColor = 'text-rose-400 bg-rose-500/10'
                    }

                    return (
                      <TableRow key={file.id} className="border-b border-[#202024] hover:bg-[#1a1a1f] transition-colors">
                        <TableCell className="py-3 max-w-[280px] md:max-w-[400px]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${typeColor}`}>
                              <TypeIcon className="w-4 h-4" />
                            </div>
                            <div className="truncate flex flex-col min-w-0">
                              <span className="font-bold text-white truncate text-[13px]" title={file.name}>
                                {file.name.split('/').pop() ?? file.name}
                              </span>
                              <span className="text-[10px] text-[#8e8e93] truncate mt-0.5" title={file.name}>
                                Caminho: {file.name}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-mono text-xs text-[#8e8e93] bg-[#202024] border border-[#2a2a2a] px-2 py-0.5 rounded">
                            {file.bucketId}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs font-semibold text-white">
                            {file.escolaId ? file.escolaNome : 'Rede Compartilhada'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3 font-bold text-white text-[13px]">
                          {formatBytes(file.size)}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <a
                            href={getFilePublicUrl(file.bucketId, file.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Abrir arquivo em nova aba"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
