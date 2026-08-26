'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  FileImage,
  ArrowLeft,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Sliders,
  Maximize2,
  X,
  FileArchive,
  AlertCircle,
  Eye,
  Zap,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { formatBytes } from '@/lib/imageCompression'

interface ImageItem {
  id: string
  file: File
  originalUrl: string
  originalSize: number
  width?: number
  height?: number
  compressedUrl?: string
  compressedBlob?: Blob
  compressedSize?: number
  compressedWidth?: number
  compressedHeight?: number
  savingsPercent?: number
  format: 'webp' | 'jpeg' | 'png' | 'avif'
  quality: number
  status: 'pending' | 'processing' | 'done' | 'error'
  errorMsg?: string
  outputFilename: string
}

export default function AlphaImageCompressorPage() {
  const [items, setItems] = useState<ImageItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [globalFormat, setGlobalFormat] = useState<'webp' | 'jpeg' | 'png' | 'avif'>('webp')
  const [globalQuality, setGlobalQuality] = useState<number>(80)
  const [maxWidth, setMaxWidth] = useState<string>('')
  const [maxHeight, setMaxHeight] = useState<string>('')
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [comparingItem, setComparingItem] = useState<ImageItem | null>(null)

  const isMounted = useRef(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mitigação de Memory Leak: revogar URLs ao desmontar (ES-7)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      items.forEach((item) => {
        if (item.originalUrl) URL.revokeObjectURL(item.originalUrl)
        if (item.compressedUrl && item.compressedUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.compressedUrl)
        }
      })
    }
  }, [items])

  // Helper para ler dimensões
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        resolve({ width: 0, height: 0 })
        URL.revokeObjectURL(url)
      }
      img.src = url
    })
  }

  // Adicionar arquivos
  const handleAddFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validImages = fileArray.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|bmp|tiff?|gif|ico)$/i.test(f.name))

    if (validImages.length === 0) {
      toast.error('Nenhum formato de imagem suportado selecionado.')
      return
    }

    const newItems: ImageItem[] = []

    for (const file of validImages) {
      // ES-8: Aviso caso GIF animado
      if (file.type === 'image/gif' || file.name.endsWith('.gif')) {
        toast.info(`GIF "${file.name}" detectado: a compressão gera um quadro estático otimizado.`)
      }

      const dimensions = await getImageDimensions(file)
      const originalUrl = URL.createObjectURL(file)
      const baseName = file.name.replace(/\.[^/.]+$/, '')

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        originalUrl,
        originalSize: file.size,
        width: dimensions.width,
        height: dimensions.height,
        format: globalFormat,
        quality: globalQuality,
        status: 'pending',
        outputFilename: `${baseName}.${globalFormat === 'jpeg' ? 'jpg' : globalFormat}`,
      })
    }

    setItems((prev) => [...prev, ...newItems])
    toast.success(`${newItems.length} imagem(ns) adicionada(s) à fila!`)
  }

  // Compressão Client-side via Canvas (Fast & 100% Offline)
  const compressClientCanvas = async (
    item: ImageItem,
    quality: number,
    format: 'webp' | 'jpeg' | 'png',
    maxW?: number,
    maxH?: number
  ): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        let w = img.naturalWidth || img.width
        let h = img.naturalHeight || img.height

        if (maxW && w > maxW) {
          h = Math.round((h * maxW) / w)
          w = maxW
        }
        if (maxH && h > maxH) {
          w = Math.round((w * maxH) / h)
          h = maxH
        }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Falha ao inicializar contexto Canvas 2D'))
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, w, h)

        const mimeMap: Record<string, string> = {
          webp: 'image/webp',
          jpeg: 'image/jpeg',
          png: 'image/png',
        }
        const mime = mimeMap[format] || 'image/webp'
        const q = quality / 100

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Navegador bloqueou renderização Blob (Safari/Canvas Error)'))
              return
            }
            resolve({ blob, width: w, height: h })
          },
          mime,
          q
        )
      }
      img.onerror = (e) => reject(new Error('Erro ao carregar imagem para compressão.'))
      img.src = item.originalUrl
    })
  }

  // Helper para converter File em Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
  }

  // Compressão Server-side via Sharp API (Fallback & AVIF)
  const compressServerSharp = async (
    item: ImageItem,
    quality: number,
    format: 'webp' | 'jpeg' | 'png' | 'avif',
    maxW?: number,
    maxH?: number
  ) => {
    const base64 = await fileToBase64(item.file)
    const res = await fetch('/api/alpha/compress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        filename: item.file.name,
        quality,
        format,
        maxWidth: maxW,
        maxHeight: maxH,
      }),
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      throw new Error(errJson.error || 'Erro na resposta do servidor Sharp')
    }

    const data = await res.json()
    // Converter data URL para Blob
    const fetchBlob = await fetch(data.processedBase64)
    const blob = await fetchBlob.blob()

    return {
      blob,
      url: data.processedBase64,
      width: data.width,
      height: data.height,
      compressedSize: data.compressedSize,
      savingsPercent: data.savingsPercent,
    }
  }

  // Processar um item individual
  const processItem = async (itemId: string, customFormat?: 'webp' | 'jpeg' | 'png' | 'avif', customQuality?: number) => {
    const targetItem = items.find((i) => i.id === itemId)
    if (!targetItem) return

    const format = customFormat ?? targetItem.format
    const quality = customQuality ?? targetItem.quality
    const maxW = maxWidth ? parseInt(maxWidth, 10) : undefined
    const maxH = maxHeight ? parseInt(maxHeight, 10) : undefined

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: 'processing', format, quality, errorMsg: undefined } : i))
    )

    try {
      let compressedBlob: Blob
      let compressedUrl: string
      let compWidth = targetItem.width
      let compHeight = targetItem.height
      let compressedSize: number
      let savings: number

      // Estratégia Híbrida Inteligente:
      // Se for AVIF, usa Sharp server (já que Canvas não suporta encoder AVIF nativo na maioria dos browsers).
      // Se for WebP/JPEG/PNG, executa via Client Canvas (instantâneo e 100% offline), com fallback Server se Canvas falhar.
      if (format === 'avif') {
        if (!navigator.onLine) {
          throw new Error('AVIF requer conexão ativa com o motor Sharp do servidor.')
        }

        const serverRes = await compressServerSharp(targetItem, quality, format, maxW, maxH)
        compressedBlob = serverRes.blob
        compressedUrl = serverRes.url
        compWidth = serverRes.width
        compHeight = serverRes.height
        compressedSize = serverRes.compressedSize
        savings = serverRes.savingsPercent
      } else {
        try {
          // Client Canvas
          const clientRes = await compressClientCanvas(targetItem, quality, format as 'webp' | 'jpeg' | 'png', maxW, maxH)
          compressedBlob = clientRes.blob
          compressedUrl = URL.createObjectURL(compressedBlob)
          compWidth = clientRes.width
          compHeight = clientRes.height
          compressedSize = compressedBlob.size
          savings = Math.max(0, Math.round(((targetItem.originalSize - compressedSize) / targetItem.originalSize) * 100))
        } catch (canvasErr) {
          // Fallback para Server Sharp se tamanho permitir (ES-2)
          if (targetItem.originalSize <= 3.5 * 1024 * 1024 && navigator.onLine) {
            const serverRes = await compressServerSharp(targetItem, quality, format, maxW, maxH)
            compressedBlob = serverRes.blob
            compressedUrl = serverRes.url
            compWidth = serverRes.width
            compHeight = serverRes.height
            compressedSize = serverRes.compressedSize
            savings = serverRes.savingsPercent
          } else {
            throw canvasErr
          }
        }
      }

      const baseName = targetItem.file.name.replace(/\.[^/.]+$/, '')
      const ext = format === 'jpeg' ? 'jpg' : format
      const outputFilename = `${baseName}_comprimido.${ext}`

      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                status: 'done',
                compressedBlob,
                compressedUrl,
                compressedSize,
                compressedWidth: compWidth,
                compressedHeight: compHeight,
                savingsPercent: savings,
                outputFilename,
              }
            : i
        )
      )
    } catch (err: any) {
      console.error('Erro ao comprimir imagem:', err)
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status: 'error', errorMsg: err?.message || 'Falha na compressão' } : i))
      )
      toast.error(`Falha ao comprimir "${targetItem.file.name}": ${err?.message || 'Erro inesperado'}`)
    }
  }

  // Processar todos os itens pendentes
  const handleProcessAll = async () => {
    const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'error')
    if (pendingItems.length === 0) {
      toast.info('Todas as imagens já foram processadas.')
      return
    }

    setIsProcessingAll(true)
    let processedCount = 0

    for (const item of pendingItems) {
      await processItem(item.id, globalFormat, globalQuality)
      processedCount++
    }

    setIsProcessingAll(false)
    toast.success(`Processamento concluído para ${processedCount} imagem(ns)!`)
  }

  // Baixar imagem individual
  const downloadSingle = (item: ImageItem) => {
    if (!item.compressedBlob && !item.compressedUrl) return

    const link = document.createElement('a')
    link.href = item.compressedUrl || URL.createObjectURL(item.compressedBlob!)
    link.download = item.outputFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Download de "${item.outputFilename}" iniciado!`)
  }

  // Baixar tudo em um único arquivo ZIP
  const handleDownloadZip = async () => {
    const readyItems = items.filter((i) => i.status === 'done' && (i.compressedBlob || i.compressedUrl))
    if (readyItems.length === 0) {
      toast.error('Nenhuma imagem comprimida pronta para download.')
      return
    }

    setIsZipping(true)
    const toastId = toast.loading('Compactando imagens em arquivo ZIP...')

    try {
      const zip = new JSZip()
      const folder = zip.folder('imagens_otimizadas_sig_alpha') || zip

      for (const item of readyItems) {
        let blob = item.compressedBlob
        if (!blob && item.compressedUrl) {
          const res = await fetch(item.compressedUrl)
          blob = await res.blob()
        }
        if (blob) {
          folder.file(item.outputFilename, blob)
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `sig_alpha_imagens_comprimidas_${Date.now()}.zip`
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
        if (target.compressedUrl && target.compressedUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.compressedUrl)
        }
      }
      return prev.filter((i) => i.id !== id)
    })
  }

  // Limpar toda a lista
  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl)
      if (item.compressedUrl && item.compressedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.compressedUrl)
      }
    })
    setItems([])
    toast.info('Lista de imagens limpa.')
  }

  // Totais de economia
  const totalOriginalSize = items.reduce((acc, i) => acc + i.originalSize, 0)
  const doneItems = items.filter((i) => i.status === 'done' && i.compressedSize)
  const totalCompressedSize = doneItems.reduce((acc, i) => acc + (i.compressedSize || 0), 0)
  const totalSavings =
    totalOriginalSize > 0 && doneItems.length > 0
      ? Math.max(0, Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100))
      : 0

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
                <FileImage className="w-5 h-5" />
              </span>
              Compressor de Imagens
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Otimize JPG, PNG, WebP e AVIF com prévia imediata e controle granular de qualidade.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            Híbrido: Client &amp; Sharp Engine
          </span>
        </div>
      </div>

      {/* ── Painel de Configurações Globais de Compressão ── */}
      <div className="bg-white rounded-2xl border border-sidebar-border p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-sidebar-border pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sidebar-foreground">
            <Sliders className="w-4 h-4 text-sidebar-primary" />
            Parâmetros Globais de Otimização
          </div>
          <span className="text-[11px] text-muted-foreground">
            Aplicar automaticamente a novas imagens adicionadas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Seletor de Formato */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-sidebar-foreground block">
              Formato de Saída
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-sidebar-accent/50 p-1 rounded-xl border border-sidebar-border">
              {(['webp', 'jpeg', 'png', 'avif'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setGlobalFormat(fmt)}
                  className={`py-1.5 text-xs font-bold rounded-lg uppercase transition-all cursor-pointer ${
                    globalFormat === fmt
                      ? 'bg-sidebar-primary text-white shadow-xs'
                      : 'text-sidebar-foreground hover:bg-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {globalFormat === 'webp'
                ? '⭐ Recomendado: Máxima compatibilidade e alta taxa de compressão.'
                : globalFormat === 'avif'
                ? '🚀 Nova geração: Compressão extrema para navegadores modernos.'
                : globalFormat === 'jpeg'
                ? '📷 Clássico fotográfico sem transparência.'
                : '🎨 Preserva transparência perfeita sem perdas.'}
            </p>
          </div>

          {/* Slider de Qualidade */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-sidebar-foreground">
                Nível de Qualidade
              </label>
              <span className="text-xs font-bold text-sidebar-accent-foreground bg-sidebar-accent px-2 py-0.5 rounded-md border border-sidebar-border">
                {globalQuality}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={globalQuality}
              onChange={(e) => setGlobalQuality(Number(e.target.value))}
              className="w-full accent-[#0067c0] cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Mais Leve (10%)</span>
              <span className="text-emerald-600 font-semibold">Equilibrado (80%)</span>
              <span>Visual Perfeito (100%)</span>
            </div>
          </div>

          {/* Dimensões Opcionais */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-sidebar-foreground block">
              Redimensionamento Máximo (Opcional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  placeholder="Largura px"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-sidebar-border text-xs text-sidebar-foreground placeholder-slate-400 focus:outline-hidden focus:border-sidebar-primary"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Altura px"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-sidebar-border text-xs text-sidebar-foreground placeholder-slate-400 focus:outline-hidden focus:border-sidebar-primary"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Mantém o aspect ratio original automaticamente.</p>
          </div>
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
          accept="image/*,.webp,.avif,.png,.jpg,.jpeg,.bmp,.tiff,.gif,.ico"
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
            Arraste suas fotos e imagens aqui ou clique para navegar
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Suporta múltiplos arquivos simultaneamente: JPG, PNG, WEBP, AVIF, BMP, GIF e TIFF (até 25 MB por arquivo).
          </p>
        </div>
      </div>

      {/* ── Barra de Ações & Estatísticas de Ganho ── */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-sidebar-border shadow-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-muted-foreground block">Total de Arquivos</span>
              <span className="text-sm font-bold text-sidebar-foreground">{items.length} imagem(ns)</span>
            </div>
            <div className="h-7 w-px bg-sidebar-border" />
            <div>
              <span className="text-xs text-muted-foreground block">Tamanho Original</span>
              <span className="text-sm font-bold text-sidebar-foreground">{formatBytes(totalOriginalSize)}</span>
            </div>
            {doneItems.length > 0 && (
              <>
                <div className="h-7 w-px bg-sidebar-border" />
                <div>
                  <span className="text-xs text-muted-foreground block">Tamanho Otimizado</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatBytes(totalCompressedSize)} (-{totalSavings}%)
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl bg-white border border-sidebar-border hover:bg-sidebar-accent text-sidebar-foreground text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Limpar Lista
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
              {isProcessingAll ? 'Processando...' : 'Comprimir Todas'}
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

      {/* ── Lista de Imagens em Processamento ── */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-sidebar-border p-4 transition-all hover:border-sidebar-primary/50 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4"
            >
              {/* Thumbnail & Dados */}
              <div className="flex items-center gap-3.5 min-w-0 w-full md:w-auto">
                <div className="w-16 h-16 rounded-xl bg-sidebar-accent/40 border border-sidebar-border overflow-hidden shrink-0 relative flex items-center justify-center">
                  <img
                    src={item.compressedUrl || item.originalUrl}
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
                    <span>Original: {formatBytes(item.originalSize)}</span>
                    {item.width && item.height && (
                      <span>
                        • {item.width}×{item.height}px
                      </span>
                    )}
                    {item.status === 'done' && item.compressedSize && (
                      <>
                        <span className="text-emerald-600 font-bold">
                          ➔ {formatBytes(item.compressedSize)}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[10px]">
                          -{item.savingsPercent}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Ações */}
              <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
                {item.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => processItem(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 border border-sidebar-border text-sidebar-accent-foreground text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    Comprimir
                  </button>
                )}

                {item.status === 'processing' && (
                  <span className="flex items-center gap-1.5 text-xs text-sidebar-primary font-semibold px-3 py-1.5 rounded-xl bg-sidebar-accent border border-sidebar-border">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Otimizando...
                  </span>
                )}

                {item.status === 'error' && (
                  <span className="flex items-center gap-1.5 text-xs text-destructive font-semibold px-2.5 py-1 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="w-3 h-3" />
                    {item.errorMsg || 'Erro'}
                  </span>
                )}

                {item.status === 'done' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setComparingItem(item)}
                      className="p-2 rounded-xl bg-white hover:bg-sidebar-accent border border-sidebar-border text-sidebar-foreground text-xs transition-colors cursor-pointer shadow-xs"
                      title="Comparar Lado a Lado"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadSingle(item)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar
                    </button>
                  </>
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

      {/* ── Modal de Comparação Lado a Lado ── */}
      {comparingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-sidebar-border rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-sidebar-border pb-3">
              <div>
                <h3 className="text-base font-bold text-sidebar-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-sidebar-primary" />
                  Comparação Visual: Original vs. Otimizado
                </h3>
                <p className="text-xs text-muted-foreground">{comparingItem.file.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setComparingItem(null)}
                className="p-1.5 rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original */}
              <div className="space-y-2 bg-sidebar-accent/20 p-3 rounded-2xl border border-sidebar-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sidebar-foreground">Original</span>
                  <span className="text-muted-foreground">{formatBytes(comparingItem.originalSize)}</span>
                </div>
                <div className="h-64 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img
                    src={comparingItem.originalUrl}
                    alt="Original"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              {/* Comprimido */}
              <div className="space-y-2 bg-sidebar-accent/20 p-3 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-700">
                    Otimizado ({comparingItem.format.toUpperCase()})
                  </span>
                  <span className="text-emerald-700 font-bold">
                    {formatBytes(comparingItem.compressedSize || 0)} (-{comparingItem.savingsPercent}%)
                  </span>
                </div>
                <div className="h-64 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img
                    src={comparingItem.compressedUrl}
                    alt="Otimizado"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-sidebar-border">
              <button
                type="button"
                onClick={() => setComparingItem(null)}
                className="px-4 py-2 rounded-xl bg-white border border-sidebar-border text-xs font-semibold text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadSingle(comparingItem)
                  setComparingItem(null)
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sidebar-primary hover:bg-sidebar-primary/90 text-white text-xs font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar Versão Otimizada
              </button>
            </div>
          </div>
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
            <span>[SIG_ALPHA_AD_SLOT_COMPRESSOR]</span>
          </div>
        </div>
      </div>
    </div>
  )
}
