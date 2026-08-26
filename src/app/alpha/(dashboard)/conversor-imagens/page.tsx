'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeftRight,
  ArrowLeft,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  FileArchive,
  AlertCircle,
  Zap,
  Info,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { formatBytes } from '@/lib/imageCompression'

export type SupportedTargetFormat = 'webp' | 'jpeg' | 'png' | 'avif' | 'gif' | 'bmp' | 'tiff' | 'ico'

interface ConvertItem {
  id: string
  file: File
  originalUrl: string
  originalSize: number
  originalExt: string
  targetFormat: SupportedTargetFormat
  convertedUrl?: string
  convertedBlob?: Blob
  convertedSize?: number
  status: 'pending' | 'processing' | 'done' | 'error'
  errorMsg?: string
  outputFilename: string
}

export default function AlphaImageConverterPage() {
  const [items, setItems] = useState<ConvertItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [globalTargetFormat, setGlobalTargetFormat] = useState<SupportedTargetFormat>('webp')
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [isZipping, setIsZipping] = useState(false)

  const isMounted = useRef(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mitigação de Memory Leak: revogar URLs ao desmontar (ES-7)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      items.forEach((item) => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl)
        if (item.convertedUrl && item.convertedUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.convertedUrl)
        }
      })
    }
  }, [items])

  // Helper para extrair extensão
  const getFileExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || 'unknown'
    return ext === 'jpg' ? 'jpeg' : ext
  }

  // Adicionar arquivos
  const handleAddFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validImages = fileArray.filter(
      (f) =>
        f.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|avif|bmp|tiff?|gif|ico|svg)$/i.test(f.name)
    )

    if (validImages.length === 0) {
      toast.error('Nenhuma imagem suportada selecionada.')
      return
    }

    const newItems: ConvertItem[] = []

    for (const file of validImages) {
      if (file.type === 'image/gif' || file.name.endsWith('.gif')) {
        toast.info(`GIF "${file.name}" detectado: conversão preservará quadro de alta fidelidade.`)
      }

      const originalUrl = URL.createObjectURL(file)
      const originalExt = getFileExtension(file.name)
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      const targetExt = globalTargetFormat === 'jpeg' ? 'jpg' : globalTargetFormat

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        originalUrl,
        originalSize: file.size,
        originalExt,
        targetFormat: globalTargetFormat,
        status: 'pending',
        outputFilename: `${baseName}.${targetExt}`,
      })
    }

    setItems((prev) => [...prev, ...newItems])
    toast.success(`${newItems.length} imagem(ns) adicionada(s) à fila!`)
  }

  // Conversão Client-side via Canvas (JPG, PNG, WEBP, BMP, ICO)
  const convertClientCanvas = async (
    item: ConvertItem,
    targetFormat: SupportedTargetFormat
  ): Promise<{ blob: Blob }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Falha ao inicializar Canvas 2D'))
          return
        }

        // Se for converter para JPEG e a imagem original tiver fundo transparente, preenche com fundo branco
        if (targetFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        ctx.drawImage(img, 0, 0)

        const mimeMap: Record<string, string> = {
          webp: 'image/webp',
          jpeg: 'image/jpeg',
          png: 'image/png',
          bmp: 'image/bmp',
          ico: 'image/x-icon',
        }

        const mime = mimeMap[targetFormat] || 'image/webp'

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Falha ao gerar Blob do formato selecionado via Canvas.'))
            return
          }
          resolve({ blob })
        }, mime, 0.92)
      }
      img.onerror = () => reject(new Error('Erro ao decodificar imagem no navegador.'))
      img.src = item.originalUrl
    })
  }

  // Helper para File -> Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
  }

  // Conversão Server-side via Sharp API (AVIF, TIFF, GIF, e fallback geral)
  const convertServerSharp = async (item: ConvertItem, targetFormat: SupportedTargetFormat) => {
    const base64 = await fileToBase64(item.file)
    const res = await fetch('/api/alpha/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        filename: item.file.name,
        targetFormat,
        quality: 90,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.error || 'Falha no motor de conversão Sharp do servidor.')
    }

    const data = await res.json()
    const fetchBlob = await fetch(data.processedBase64)
    const blob = await fetchBlob.blob()

    return {
      blob,
      url: data.processedBase64,
      convertedSize: data.convertedSize,
    }
  }

  // Processar conversão de item individual
  const processItem = async (itemId: string, customTargetFormat?: SupportedTargetFormat) => {
    const targetItem = items.find((i) => i.id === itemId)
    if (!targetItem) return

    const format = customTargetFormat ?? targetItem.targetFormat

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: 'processing', targetFormat: format, errorMsg: undefined } : i))
    )

    try {
      let convertedBlob: Blob
      let convertedUrl: string
      let convertedSize: number

      // Decisão do Motor (Client Canvas vs Server Sharp)
      const requiresServer = ['avif', 'tiff', 'gif'].includes(format) || ['tiff', 'heic', 'psd'].includes(targetItem.originalExt)

      if (requiresServer) {
        if (!navigator.onLine) {
          throw new Error(`Conversão para .${format.toUpperCase()} requer conexão ativa com o servidor.`)
        }
        const serverRes = await convertServerSharp(targetItem, format)
        convertedBlob = serverRes.blob
        convertedUrl = serverRes.url
        convertedSize = serverRes.convertedSize
      } else {
        try {
          const clientRes = await convertClientCanvas(targetItem, format)
          convertedBlob = clientRes.blob
          convertedUrl = URL.createObjectURL(convertedBlob)
          convertedSize = convertedBlob.size
        } catch (canvasErr) {
          // Fallback para servidor se disponível
          if (targetItem.originalSize <= 3.5 * 1024 * 1024 && navigator.onLine) {
            const serverRes = await convertServerSharp(targetItem, format)
            convertedBlob = serverRes.blob
            convertedUrl = serverRes.url
            convertedSize = serverRes.convertedSize
          } else {
            throw canvasErr
          }
        }
      }

      const baseName = targetItem.file.name.replace(/\.[^/.]+$/, '')
      const ext = format === 'jpeg' ? 'jpg' : format
      const outputFilename = `${baseName}.${ext}`

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                status: 'done',
                convertedBlob,
                convertedUrl,
                convertedSize,
                outputFilename,
                targetFormat: format,
              }
            : i
        )
      )
    } catch (err: any) {
      console.error('Erro ao converter imagem:', err)
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status: 'error', errorMsg: err?.message || 'Falha na conversão' } : i))
      )
      toast.error(`Falha ao converter "${targetItem.file.name}": ${err?.message || 'Erro inesperado'}`)
    }
  }

  // Converter todos
  const handleProcessAll = async () => {
    const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'error')
    if (pendingItems.length === 0) {
      toast.info('Todas as imagens já foram convertidas.')
      return
    }

    setIsProcessingAll(true)
    let processedCount = 0

    for (const item of pendingItems) {
      await processItem(item.id, globalTargetFormat)
      processedCount++
    }

    setIsProcessingAll(false)
    toast.success(`Conversão concluída para ${processedCount} imagem(ns)!`)
  }

  // Download individual
  const downloadSingle = (item: ConvertItem) => {
    if (!item.convertedBlob && !item.convertedUrl) return

    const link = document.createElement('a')
    link.href = item.convertedUrl || URL.createObjectURL(item.convertedBlob!)
    link.download = item.outputFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Download de "${item.outputFilename}" iniciado!`)
  }

  // Baixar tudo em ZIP
  const handleDownloadZip = async () => {
    const readyItems = items.filter((i) => i.status === 'done' && (i.convertedBlob || i.convertedUrl))
    if (readyItems.length === 0) {
      toast.error('Nenhuma imagem convertida pronta para download.')
      return
    }

    setIsZipping(true)
    const toastId = toast.loading('Compactando imagens convertidas em arquivo ZIP...')

    try {
      const zip = new JSZip()
      const folder = zip.folder('imagens_convertidas_sig_alpha') || zip

      for (const item of readyItems) {
        let blob = item.convertedBlob
        if (!blob && item.convertedUrl) {
          const res = await fetch(item.convertedUrl)
          blob = await res.blob()
        }
        if (blob) {
          folder.file(item.outputFilename, blob)
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `sig_alpha_imagens_convertidas_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      toast.success('Arquivo ZIP gerado com sucesso!', { id: toastId })
    } catch (err: any) {
      console.error('Erro ao gerar ZIP:', err)
      toast.error('Falha ao gerar arquivo ZIP.', { id: toastId })
    } finally {
      setIsZipping(false)
    }
  }

  // Remover item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) {
        if (target.originalUrl) URL.revokeObjectURL(target.originalUrl)
        if (target.convertedUrl && target.convertedUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.convertedUrl)
        }
      }
      return prev.filter((i) => i.id !== id)
    })
  }

  // Limpar lista
  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl)
      if (item.convertedUrl && item.convertedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.convertedUrl)
      }
    })
    setItems([])
    toast.info('Lista de conversão limpa.')
  }

  // Atualizar formato global e refletir nos itens pendentes
  const handleGlobalFormatChange = (fmt: SupportedTargetFormat) => {
    setGlobalTargetFormat(fmt)
    setItems((prev) =>
      prev.map((item) => {
        if (item.status === 'pending') {
          const baseName = item.file.name.replace(/\.[^/.]+$/, '')
          const ext = fmt === 'jpeg' ? 'jpg' : fmt
          return {
            ...item,
            targetFormat: fmt,
            outputFilename: `${baseName}.${ext}`,
          }
        }
        return item
      })
    )
  }

  const doneItems = items.filter((i) => i.status === 'done')

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ── Topo com Navegação & Identificação ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sidebar-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/alpha"
            className="p-2 rounded-xl bg-white hover:bg-sidebar-accent border border-sidebar-border text-sidebar-foreground transition-colors shadow-xs"
            title="Voltar para a Central Alpha"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-sidebar-accent text-sidebar-primary border border-sidebar-border">
                <ArrowLeftRight className="w-5 h-5" />
              </span>
              Conversor de Imagens
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Converta imagens instantaneamente entre WebP, JPG, PNG, AVIF, GIF, BMP, TIFF e ICO.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sidebar-accent border border-sidebar-border text-sidebar-accent-foreground text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" />
            Matriz Universal de Formatos
          </span>
        </div>
      </div>

      {/* ── Barra de Escolha do Formato Alvo Global ── */}
      <div className="bg-white rounded-2xl border border-sidebar-border p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sidebar-foreground">
            <Sparkles className="w-4 h-4 text-sidebar-primary" />
            Converter Todas as Imagens Para:
          </div>
          <span className="text-[11px] text-muted-foreground">
            {items.length > 0 ? `${items.length} imagem(ns) na fila` : 'Selecione o formato desejado'}
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {(['webp', 'jpeg', 'png', 'avif', 'gif', 'bmp', 'tiff', 'ico'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => handleGlobalFormatChange(fmt)}
              className={`py-2 px-3 text-xs font-bold rounded-xl uppercase transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                globalTargetFormat === fmt
                  ? 'bg-sidebar-primary text-white shadow-xs border border-sidebar-primary scale-[1.02]'
                  : 'bg-sidebar-accent/40 text-sidebar-foreground hover:bg-sidebar-accent border border-sidebar-border'
              }`}
            >
              <span>{fmt === 'jpeg' ? 'JPG' : fmt.toUpperCase()}</span>
              <span className="text-[9px] font-normal opacity-70">
                {fmt === 'webp' ? 'Web' : fmt === 'avif' ? 'NextGen' : fmt === 'png' ? 'Alpha' : 'Padrão'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Dropzone de Upload ── */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (e.dataTransfer.files) {
            handleAddFiles(e.dataTransfer.files)
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-sidebar-primary bg-sidebar-accent/50 scale-[1.01]'
            : 'border-sidebar-border hover:border-sidebar-primary/60 bg-white hover:bg-sidebar-accent/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.webp,.avif,.png,.jpg,.jpeg,.bmp,.tiff,.gif,.ico,.svg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleAddFiles(e.target.files)
            }
          }}
        />

        <div className="w-14 h-14 rounded-2xl bg-sidebar-accent border border-sidebar-border text-sidebar-primary flex items-center justify-center shadow-xs">
          <UploadCloud className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-base font-bold text-sidebar-foreground">
            Arraste suas fotos para conversão ou clique para selecionar
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Suporta conversão cruzada entre JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF e ICO em lote.
          </p>
        </div>
      </div>

      {/* ── Barra de Ações & Resumo ── */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-sidebar-border shadow-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-muted-foreground block">Total</span>
              <span className="text-sm font-bold text-sidebar-foreground">{items.length} arquivo(s)</span>
            </div>
            <div className="h-7 w-px bg-sidebar-border" />
            <div>
              <span className="text-xs text-muted-foreground block">Concluídos</span>
              <span className="text-sm font-bold text-emerald-600">
                {doneItems.length} de {items.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl bg-white border border-sidebar-border hover:bg-sidebar-accent text-sidebar-foreground text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Limpar Tudo
            </button>
            <button
              type="button"
              disabled={isProcessingAll || items.every((i) => i.status === 'done')}
              onClick={handleProcessAll}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sidebar-primary hover:bg-sidebar-primary/90 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              {isProcessingAll ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isProcessingAll ? 'Convertendo...' : 'Converter Todos'}
            </button>
            {doneItems.length > 0 && (
              <button
                type="button"
                disabled={isZipping}
                onClick={handleDownloadZip}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isZipping ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileArchive className="w-3.5 h-3.5" />
                )}
                Baixar Tudo (.ZIP)
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Lista de Itens na Fila de Conversão ── */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-sidebar-border p-4 transition-all hover:border-sidebar-primary/50 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4"
            >
              {/* Thumbnail & Nomes */}
              <div className="flex items-center gap-3.5 min-w-0 w-full md:w-auto">
                <div className="w-16 h-16 rounded-xl bg-sidebar-accent/40 border border-sidebar-border overflow-hidden shrink-0 relative flex items-center justify-center">
                  <img
                    src={item.convertedUrl || item.originalUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                  {item.status === 'done' && (
                    <span className="absolute bottom-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-sidebar-foreground truncate" title={item.file.name}>
                    {item.file.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded-sm bg-sidebar-accent text-sidebar-accent-foreground font-mono text-[10px] uppercase font-bold">
                      {item.originalExt}
                    </span>
                    <ArrowRight className="w-3 h-3 text-sidebar-primary" />
                    <span className="px-1.5 py-0.5 rounded-sm bg-sidebar-accent border border-sidebar-border text-sidebar-primary font-mono text-[10px] uppercase font-bold">
                      {item.targetFormat}
                    </span>
                    <span>• {formatBytes(item.originalSize)}</span>
                    {item.status === 'done' && item.convertedSize && (
                      <span className="text-emerald-600 font-bold">
                        ➔ {formatBytes(item.convertedSize)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Seletor de Formato Individual & Ações */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
                {item.status !== 'processing' && item.status !== 'done' && (
                  <select
                    value={item.targetFormat}
                    onChange={(e) => {
                      const fmt = e.target.value as SupportedTargetFormat
                      const baseName = item.file.name.replace(/\.[^/.]+$/, '')
                      const ext = fmt === 'jpeg' ? 'jpg' : fmt
                      setItems((prev) =>
                        prev.map((i) =>
                          i.id === item.id ? { ...i, targetFormat: fmt, outputFilename: `${baseName}.${ext}` } : i
                        )
                      )
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-sidebar-border text-xs text-sidebar-foreground uppercase font-bold cursor-pointer focus:outline-hidden focus:border-sidebar-primary"
                  >
                    {(['webp', 'jpeg', 'png', 'avif', 'gif', 'bmp', 'tiff', 'ico'] as const).map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt === 'jpeg' ? 'JPG' : fmt.toUpperCase()}
                      </option>
                    ))}
                  </select>
                )}

                {item.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => processItem(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 border border-sidebar-border text-sidebar-accent-foreground text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    Converter
                  </button>
                )}

                {item.status === 'processing' && (
                  <span className="flex items-center gap-1.5 text-xs text-sidebar-primary font-semibold px-3 py-1.5 rounded-xl bg-sidebar-accent border border-sidebar-border">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Convertendo...
                  </span>
                )}

                {item.status === 'error' && (
                  <span className="flex items-center gap-1.5 text-xs text-destructive font-semibold px-2.5 py-1 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="w-3 h-3" />
                    {item.errorMsg || 'Erro'}
                  </span>
                )}

                {item.status === 'done' && (
                  <button
                    type="button"
                    onClick={() => downloadSingle(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ESPAÇO PARA BANNER DE ANÚNCIO / ÁREA DE TESTES PUBLICITÁRIOS ── */}
      <div className="mt-8 pt-6 border-t border-sidebar-border">
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-sidebar-border bg-sidebar-accent/20 p-5 text-center flex flex-col items-center justify-center gap-2 group hover:border-sidebar-primary/60 transition-colors">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sidebar-accent border border-sidebar-border text-[10px] font-extrabold uppercase tracking-widest text-sidebar-accent-foreground">
            <Info className="w-3 h-3" />
            Espaço Publicitário &amp; Área de Testes
          </div>
          <p className="text-xs text-muted-foreground max-w-lg">
            Área reservada para inserção de banners promocionais, comunicados institucionais ou campanhas parceiras (Dimensões flexíveis: 728×90, 300×250 ou responsivo).
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span>[SIG_ALPHA_AD_SLOT_CONVERTER]</span>
          </div>
        </div>
      </div>
    </div>
  )
}
