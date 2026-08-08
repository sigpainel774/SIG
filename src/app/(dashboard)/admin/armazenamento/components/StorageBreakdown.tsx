'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ImageIcon, FileText, Video as VideoIcon, File as FileIcon } from 'lucide-react'

// Helper para formatar tamanho de arquivos
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

interface StorageBreakdownProps {
  totalBytes: number
  percentages: {
    images: number
    docs: number
    videos: number
    others: number
    imagesBytes: number
    docsBytes: number
    videosBytes: number
    othersBytes: number
  }
}

export function StorageBreakdown({ totalBytes, percentages }: StorageBreakdownProps) {
  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
          Breakdown por Tipo de Arquivo
        </CardTitle>
        <CardDescription className="text-xs">
          Distribuição proporcional do espaço total em disco.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stacked Progress Bar */}
        <div className="flex h-4 w-full overflow-hidden rounded-full border border-border bg-muted">
          {percentages.images > 0 && (
            <div
              className="bg-purple-500 h-full transition-all"
              style={{ width: `${percentages.images}%` }}
              title={`Imagens: ${percentages.images.toFixed(1)}%`}
            />
          )}
          {percentages.docs > 0 && (
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${percentages.docs}%` }}
              title={`Documentos: ${percentages.docs.toFixed(1)}%`}
            />
          )}
          {percentages.videos > 0 && (
            <div
              className="bg-rose-500 h-full transition-all"
              style={{ width: `${percentages.videos}%` }}
              title={`Vídeos: ${percentages.videos.toFixed(1)}%`}
            />
          )}
          {percentages.others > 0 && (
            <div
              className="bg-slate-500 h-full transition-all"
              style={{ width: `${percentages.others}%` }}
              title={`Outros: ${percentages.others.toFixed(1)}%`}
            />
          )}
          {totalBytes === 0 && <div className="bg-slate-700 w-full h-full" />}
        </div>

        {/* Grid Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Imagens</p>
              <h4 className="mt-0.5 text-sm font-bold text-foreground">
                {formatBytes(percentages.imagesBytes ?? 0)}
              </h4>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {percentages.images.toFixed(1)}% do disco
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Documentos</p>
              <h4 className="mt-0.5 text-sm font-bold text-foreground">
                {formatBytes(percentages.docsBytes ?? 0)}
              </h4>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {percentages.docs.toFixed(1)}% do disco
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <VideoIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Vídeos</p>
              <h4 className="mt-0.5 text-sm font-bold text-foreground">
                {formatBytes(percentages.videosBytes ?? 0)}
              </h4>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {percentages.videos.toFixed(1)}% do disco
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
            <div className="p-2 bg-slate-500/10 text-slate-400 rounded-lg">
              <FileIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Outros</p>
              <h4 className="mt-0.5 text-sm font-bold text-foreground">
                {formatBytes(percentages.othersBytes ?? 0)}
              </h4>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {percentages.others.toFixed(1)}% do disco
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
