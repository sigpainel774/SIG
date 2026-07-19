'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StandardTable, TableColumn } from '@/components/ui/table'
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
              {bySchool.map(s => (
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
            <strong className="text-white">{totalFilesCount}</strong> arquivos auditados.
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
                      <span className="font-bold text-white truncate text-[13px]" title={file.name}>
                        {file.name.split('/').pop() ?? file.name}
                      </span>
                      <span className="text-[10px] text-[#8e8e93] truncate mt-0.5" title={file.name}>
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
                <span className="font-mono text-xs text-[#8e8e93] bg-[#202024] border border-[#2a2a2a] px-2 py-0.5 rounded">
                  {file.bucketId}
                </span>
              )
            },
            {
              header: 'Proprietário / Escola',
              headClassName: 'w-56',
              className: 'py-3',
              accessor: (file: MappedFile) => (
                <span className="text-xs font-semibold text-white">
                  {file.escolaId ? file.escolaNome : 'Rede Compartilhada'}
                </span>
              )
            },
            {
              header: 'Tamanho',
              headClassName: 'text-right w-36',
              className: 'text-right py-3 font-bold text-white text-[13px]',
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

