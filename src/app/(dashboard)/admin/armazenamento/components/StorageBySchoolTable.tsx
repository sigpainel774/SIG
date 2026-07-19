'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Building2, Globe } from 'lucide-react'
import { StorageData } from '@/hooks/useAdminStorage'

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

interface StorageBySchoolTableProps {
  data: StorageData
}

interface TableRowData {
  id: string
  escolaNome: string
  isGlobal?: boolean
  fileCount: number
  totalBytes: number
  breakdown: { images: number; docs: number; videos: number; others: number }
}

export function StorageBySchoolTable({ data }: StorageBySchoolTableProps) {
  const tableRows = useMemo<TableRowData[]>(() => {
    const globalRow: TableRowData = {
      id: 'global-shared',
      escolaNome: 'Rede Compartilhada (Global)',
      isGlobal: true,
      fileCount: data.sharedFileCount,
      totalBytes: data.sharedBytes,
      breakdown: data.sharedBreakdown
    }

    const schoolRows: TableRowData[] = data.bySchool.map((s) => ({
      id: s.escolaId,
      escolaNome: s.escolaNome,
      isGlobal: false,
      fileCount: s.fileCount,
      totalBytes: s.totalBytes,
      breakdown: s.breakdown
    }))

    return [globalRow, ...schoolRows]
  }, [data])

  const columns: TableColumn<TableRowData>[] = useMemo(() => [
    {
      header: 'Escola / Origem',
      accessor: (item) => (
        <div className="font-semibold text-white flex items-center gap-2">
          {item.isGlobal ? (
            <>
              <Globe className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{item.escolaNome}</span>
              <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] ml-2 font-extrabold uppercase">
                Sistema
              </Badge>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="truncate max-w-[320px] md:max-w-[450px]" title={item.escolaNome}>
                {item.escolaNome}
              </span>
            </>
          )}
        </div>
      )
    },
    {
      header: 'Nº Arquivos',
      headClassName: 'text-center w-32',
      className: 'text-center font-medium text-[#8e8e93]',
      accessor: (item) => item.fileCount
    },
    {
      header: 'Consumo por Categoria (Proporção)',
      headClassName: 'w-48',
      accessor: (item) => (
        <div className="w-full bg-[#202024] rounded-full h-1.5 overflow-hidden flex">
          {item.totalBytes > 0 ? (
            <>
              <div className="bg-purple-500 h-full" style={{ width: `${(item.breakdown.images / item.totalBytes) * 100}%` }} />
              <div className="bg-amber-500 h-full" style={{ width: `${(item.breakdown.docs / item.totalBytes) * 100}%` }} />
              <div className="bg-rose-500 h-full" style={{ width: `${(item.breakdown.videos / item.totalBytes) * 100}%` }} />
              <div className="bg-slate-500 h-full" style={{ width: `${(item.breakdown.others / item.totalBytes) * 100}%` }} />
            </>
          ) : (
            <div className="bg-slate-700 w-full h-full" />
          )}
        </div>
      )
    },
    {
      header: 'Espaço Ocupado',
      headClassName: 'text-right w-44',
      className: 'text-right font-extrabold',
      accessor: (item) => {
        const pct = data.totalBytes > 0 ? ((item.totalBytes / data.totalBytes) * 100).toFixed(1) : '0'
        return (
          <div className={item.isGlobal ? 'text-sky-400' : 'text-white'}>
            {formatBytes(item.totalBytes)}
            <span className="text-[10px] text-[#8e8e93] font-normal block mt-0.5">
              {pct}% do total
            </span>
          </div>
        )
      }
    }
  ], [data.totalBytes])

  return (
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
        <StandardTable
          data={tableRows}
          columns={columns}
          keyExtractor={(item) => item.id}
          emptyMessage="Nenhuma escola com consumo registrado."
        />
      </CardContent>
    </Card>
  )
}

