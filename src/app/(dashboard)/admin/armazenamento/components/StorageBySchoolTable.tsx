'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Building2, Globe } from 'lucide-react'
import { StorageData } from '@/hooks/useAdminStorage'

// Helper para formatar tamanho de arquivos
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

export function StorageBySchoolTable({ data }: StorageBySchoolTableProps) {
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
  )
}
