'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StandardTable } from '@/components/ui/table'
import { 
  Search, 
  Building2, 
  FolderOpen, 
  Filter, 
  ArrowUpDown, 
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  File as FileIcon
} from 'lucide-react'
import { MappedFile, SchoolStat } from '@/hooks/useAdminStorage'


// Helper para formatar tamanho de arquivos
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

interface StorageFileInspectorProps {
  searchTerm: string
  setSearchTerm: (v: string) => void
  selectedSchool: string
  setSelectedSchool: (v: string) => void
  selectedBucket: string
  setSelectedBucket: (v: string) => void
  selectedType: string
  setSelectedType: (v: string) => void
  sortBy: 'size' | 'date'
  setSortBy: (v: 'size' | 'date') => void
  bySchool: SchoolStat[]
  bucketsList: string[]
  filteredFiles: MappedFile[]
  totalFilesCount: number
}

export function StorageFileInspector({
  searchTerm,
  setSearchTerm,
  selectedSchool,
  setSelectedSchool,
  selectedBucket,
  setSelectedBucket,
  selectedType,
  setSelectedType,
  sortBy,
  setSortBy,
  bySchool,
  bucketsList,
  filteredFiles,
  totalFilesCount
}: StorageFileInspectorProps) {
  // Retorna a URL pública de download do arquivo com cache busting
  const getFilePublicUrl = (bucketId: string, name: string) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
    return `${supabaseUrl}/storage/v1/object/public/${bucketId}/${name}?t=${Date.now()}`
  }

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader className="border-b border-border pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
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
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome do arquivo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-border bg-input py-2 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/20 focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {/* Filtro de Escola */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              value={selectedSchool}
              onChange={e => setSelectedSchool(e.target.value)}
              className="w-full cursor-pointer border-none bg-transparent text-xs font-semibold text-foreground outline-none"
            >
              <option value="ALL" className="bg-popover text-popover-foreground">Filtrar Escola: Todas</option>
              <option value="SHARED" className="bg-popover text-popover-foreground">Filtrar Escola: Rede Global</option>
              {bySchool.map(s => (
                <option key={s.escolaId} value={s.escolaId} className="bg-popover text-popover-foreground">
                  {s.escolaNome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Bucket */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 text-sm text-muted-foreground">
            <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              value={selectedBucket}
              onChange={e => setSelectedBucket(e.target.value)}
              className="w-full cursor-pointer border-none bg-transparent text-xs font-semibold text-foreground outline-none"
            >
              <option value="ALL" className="bg-popover text-popover-foreground">Filtrar Bucket: Todos</option>
              {bucketsList.map(b => (
                <option key={b} value={b} className="bg-popover text-popover-foreground">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Tipo */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full cursor-pointer border-none bg-transparent text-xs font-semibold text-foreground outline-none"
            >
              <option value="ALL" className="bg-popover text-popover-foreground">Filtrar Tipo: Todos</option>
              <option value="images" className="bg-popover text-popover-foreground">Imagens</option>
              <option value="docs" className="bg-popover text-popover-foreground">Documentos</option>
              <option value="videos" className="bg-popover text-popover-foreground">Vídeos</option>
              <option value="others" className="bg-popover text-popover-foreground">Outros</option>
            </select>
          </div>
        </div>

        {/* Opções extras (Ordenação e Resultados) */}
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <div>
            Mostrando <strong className="text-foreground">{filteredFiles.length}</strong> de{' '}
            <strong className="text-foreground">{totalFilesCount}</strong> arquivos auditados.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /> Ordenar por:
            </span>
            <button
              onClick={() => setSortBy('size')}
              className={`cursor-pointer font-semibold ${sortBy === 'size' ? 'text-primary underline decoration-2 underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Maior Tamanho
            </button>
            <button
              onClick={() => setSortBy('date')}
              className={`cursor-pointer font-semibold ${sortBy === 'date' ? 'text-primary underline decoration-2 underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Recentes
            </button>
          </div>
        </div>

        {/* Tabela do Inspetor */}
        <StandardTable<MappedFile>
          data={filteredFiles}
          columns={[
            {
              header: 'Arquivo',
              className: 'py-3 max-w-[280px] md:max-w-[400px]',
              accessor: (file: MappedFile) => {
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
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${typeColor}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="truncate flex flex-col min-w-0">
                      <span className="truncate text-[13px] font-bold text-foreground" title={file.name}>
                        {file.name.split('/').pop() ?? file.name}
                      </span>
                      <span className="mt-0.5 truncate text-[10px] text-muted-foreground" title={file.name}>
                        Caminho: {file.name}
                      </span>
                    </div>
                  </div>
                )
              }
            },
            {
              header: 'Bucket',
              headClassName: 'w-48',
              className: 'py-3',
              accessor: (file: MappedFile) => (
                <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {file.bucketId}
                </span>
              )
            },
            {
              header: 'Proprietário / Escola',
              headClassName: 'w-56',
              className: 'py-3',
              accessor: (file: MappedFile) => (
                <span className="text-xs font-semibold text-foreground">
                  {file.escolaId ? file.escolaNome : 'Rede Compartilhada'}
                </span>
              )
            },
            {
              header: 'Tamanho',
              headClassName: 'text-right w-36',
              className: 'text-right py-3 text-[13px] font-bold text-foreground',
              accessor: (file: MappedFile) => formatBytes(file.size)
            },
            {
              header: 'Link',
              headClassName: 'text-center w-24',
              className: 'text-center py-3',
              accessor: (file: MappedFile) => (
                <a
                  href={getFilePublicUrl(file.bucketId, file.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors cursor-pointer"
                  title="Abrir arquivo em nova aba"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )
            }
          ]}
          keyExtractor={(file: MappedFile) => file.id}
          emptyMessage="Nenhum arquivo correspondente aos filtros aplicados."
        />

      </CardContent>
    </Card>
  )
}
