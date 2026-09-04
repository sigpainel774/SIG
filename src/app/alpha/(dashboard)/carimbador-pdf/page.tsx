'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Stamp,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  ArrowLeft,
  FileText,
  Sparkles,
  CheckCircle2,
  Layers,
  Settings2,
  Eye,
  Sliders,
  FileCheck,
  PackageCheck,
  Archive,
  Image as ImageIcon,
  Type,
  Hash,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  StampOptions,
  StampMode,
  StampPosition,
  PageTarget,
  DEFAULT_STAMP_OPTIONS,
  STAMP_PRESETS,
  applyStampToPdf,
  applyStampToMultiplePdfs,
} from '@/lib/pdfStampUtils'
import { formatBytes } from '@/lib/imageCompression'
import { cn } from '@/lib/utils'

export default function CarimbadorPdfPage() {
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [options, setOptions] = useState<StampOptions>(DEFAULT_STAMP_OPTIONS)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

  // Estados de Processamento
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedResults, setProcessedResults] = useState<{
    files: { name: string; blob: Blob; url: string }[]
    zipBlob?: Blob
    zipUrl?: string
  } | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (processedResults) {
        processedResults.files.forEach((f) => URL.revokeObjectURL(f.url))
        if (processedResults.zipUrl) URL.revokeObjectURL(processedResults.zipUrl)
      }
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [processedResults, imagePreviewUrl])

  // Manipulação de Upload de PDFs
  const handlePdfsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const incoming = Array.from(e.target.files).filter((f) => f.type === 'application/pdf')

    if (incoming.length < e.target.files.length) {
      toast.warning('Alguns arquivos foram ignorados. Apenas PDFs são suportados.')
    }

    setPdfFiles((prev) => [...prev, ...incoming])
    clearProcessed()
  }

  // Manipulação de Upload de Imagem de Carimbo
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const file = e.target.files[0]
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida (PNG ou JPG).')
      return
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    const url = URL.createObjectURL(file)
    setImagePreviewUrl(url)
    setOptions((prev) => ({ ...prev, imageFile: file }))
    toast.success('Imagem do carimbo carregada!')
  }

  const clearProcessed = () => {
    if (processedResults) {
      processedResults.files.forEach((f) => URL.revokeObjectURL(f.url))
      if (processedResults.zipUrl) URL.revokeObjectURL(processedResults.zipUrl)
      setProcessedResults(null)
    }
  }

  const removePdf = (index: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index))
    clearProcessed()
  }

  const applyPreset = (preset: (typeof STAMP_PRESETS)[0]) => {
    setOptions((prev) => ({
      ...prev,
      mode: 'text',
      text: preset.text,
      colorHex: preset.color,
      rotation: preset.rotation,
      opacity: preset.opacity,
      hasBorder: preset.border,
      position: preset.rotation !== 0 ? 'center-diagonal' : 'center',
    }))
    toast.info(`Preset "${preset.label}" aplicado!`)
  }

  // Processamento Principal
  const handleProcessStamp = async () => {
    if (pdfFiles.length === 0) {
      toast.error('Adicione pelo menos um arquivo PDF.')
      return
    }

    if (options.mode === 'image' && !options.imageFile) {
      toast.error('Selecione uma imagem para o carimbo.')
      return
    }

    if (options.mode === 'text' && !options.text.trim()) {
      toast.error('Informe o texto da marca d’água ou carimbo.')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    clearProcessed()

    try {
      const result = await applyStampToMultiplePdfs(pdfFiles, options, (pct) => {
        if (isMounted.current) setProgress(pct)
      })

      if (isMounted.current) {
        let zipUrl: string | undefined
        if (result.zipBlob) {
          zipUrl = URL.createObjectURL(result.zipBlob)
        }
        setProcessedResults({ ...result, zipUrl })
        toast.success(
          pdfFiles.length === 1
            ? 'Documento carimbado com sucesso!'
            : `${pdfFiles.length} documentos carimbados com sucesso!`
        )
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao processar carimbos: ' + (err.message || 'Falha inesperada'))
    } finally {
      if (isMounted.current) setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ── 1. Topo & Navegação ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 md:p-5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-3.5">
          <Link
            href="/alpha"
            className="p-2.5 rounded-xl bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Voltar ao Catálogo Alpha"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold text-foreground">
                Carimbador &amp; Marca d&apos;Água
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3 h-3" />
                100% Offline
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Insira carimbos digitais, numeração de páginas e marcas d&apos;água em lote com segurança local.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Seus arquivos nunca saem do seu navegador.</span>
        </div>
      </div>

      {/* ── 2. Grid Principal: Configuração & Documentos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Upload e Arquivos (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documentos PDF ({pdfFiles.length})
              </h3>
              {pdfFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPdfFiles([])
                    clearProcessed()
                  }}
                  className="text-xs text-destructive hover:underline cursor-pointer"
                >
                  Limpar todos
                </button>
              )}
            </div>

            {/* Dropzone de Upload */}
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-border border-dashed rounded-2xl cursor-pointer bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-colors p-4 text-center">
              <div className="flex flex-col items-center justify-center text-muted-foreground space-y-1.5">
                <UploadCloud className="w-8 h-8 text-primary" />
                <p className="text-xs font-semibold text-foreground">
                  Clique ou arraste arquivos PDF aqui
                </p>
                <p className="text-[11px]">Suporte a múltiplos arquivos simultâneos</p>
              </div>
              <input
                type="file"
                multiple
                className="hidden"
                accept="application/pdf"
                onChange={handlePdfsUpload}
              />
            </label>

            {/* Lista de Arquivos Selecionados */}
            {pdfFiles.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {pdfFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border text-xs gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium text-foreground truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePdf(idx)}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Remover arquivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Presets Rápidos de Carimbos */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Modelos Rápidos de Carimbo
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {STAMP_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-2 rounded-xl text-left border border-border bg-background hover:bg-muted/70 transition-all text-xs font-semibold text-foreground flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate">{preset.label}</span>
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 ml-1.5"
                    style={{ backgroundColor: preset.color }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Painel Direito: Configurações do Carimbo & Preview (7 colunas) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
            {/* Seletor de Tipo / Modo */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Tipo de Aplicação
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'text', label: 'Marca / Texto', icon: Type },
                  { id: 'image', label: 'Imagem / Selo', icon: ImageIcon },
                  { id: 'pagination', label: 'Paginação', icon: Hash },
                ].map((modeItem) => {
                  const Icon = modeItem.icon
                  const isSelected = options.mode === modeItem.id
                  return (
                    <button
                      key={modeItem.id}
                      type="button"
                      onClick={() =>
                        setOptions((prev) => ({ ...prev, mode: modeItem.id as StampMode }))
                      }
                      className={cn(
                        'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{modeItem.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── MODO TEXTO ── */}
            {options.mode === 'text' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Texto do Carimbo / Marca d&apos;Água
                  </label>
                  <input
                    type="text"
                    value={options.text}
                    onChange={(e) => setOptions({ ...options, text: e.target.value })}
                    placeholder="Ex: CONFIDENCIAL, APROVADO, COPIA"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:border-primary outline-hidden"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Variáveis dinâmicas suportadas: <code className="bg-muted px-1 rounded">{"{data}"}</code>, <code className="bg-muted px-1 rounded">{"{hora}"}</code>, <code className="bg-muted px-1 rounded">{"{num}"}</code>, <code className="bg-muted px-1 rounded">{"{total}"}</code>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cor do Carimbo */}
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Cor do Carimbo
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={options.colorHex}
                        onChange={(e) => setOptions({ ...options, colorHex: e.target.value })}
                        className="w-10 h-9 rounded-lg border border-border cursor-pointer bg-background p-0.5"
                      />
                      <input
                        type="text"
                        value={options.colorHex}
                        onChange={(e) => setOptions({ ...options, colorHex: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs uppercase font-mono text-foreground focus:border-primary outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Tamanho da Fonte */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-foreground mb-1">
                      <span>Tamanho da Fonte</span>
                      <span className="text-muted-foreground font-mono">{options.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={96}
                      step={2}
                      value={options.fontSize}
                      onChange={(e) =>
                        setOptions({ ...options, fontSize: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Opacidade */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-foreground mb-1">
                      <span>Opacidade</span>
                      <span className="text-muted-foreground font-mono">
                        {Math.round(options.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={options.opacity}
                      onChange={(e) =>
                        setOptions({ ...options, opacity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  {/* Rotação */}
                  <div>
                    <div className="flex justify-between text-xs font-bold text-foreground mb-1">
                      <span>Ângulo de Rotação</span>
                      <span className="text-muted-foreground font-mono">{options.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-90}
                      max={90}
                      step={5}
                      value={options.rotation}
                      onChange={(e) =>
                        setOptions({ ...options, rotation: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                {/* Efeito Borda de Carimbo */}
                <div className="flex items-center gap-3 pt-1">
                  <label className="relative flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={options.hasBorder}
                      onChange={(e) => setOptions({ ...options, hasBorder: e.target.checked })}
                      className="w-4 h-4 rounded-sm text-primary accent-primary border-border"
                    />
                    <span>Moldura de Carimbo Físico (Borda Retangular)</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── MODO IMAGEM / SELO ── */}
            {options.mode === 'image' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Arquivo de Imagem (Selo, Brasão, Assinatura PNG/JPG)
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border bg-background hover:bg-muted/50 cursor-pointer transition-colors">
                    <ImageIcon className="w-5 h-5 text-primary shrink-0" />
                    <div className="text-xs min-w-0 flex-1">
                      <span className="font-semibold text-foreground block truncate">
                        {options.imageFile ? options.imageFile.name : 'Selecionar imagem PNG ou JPG'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {options.imageFile
                          ? formatBytes(options.imageFile.size)
                          : 'Recomendado: PNG com fundo transparente'}
                      </span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-foreground mb-1">
                      <span>Escala da Imagem</span>
                      <span className="text-muted-foreground font-mono">
                        {Math.round(options.imageScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.5}
                      step={0.05}
                      value={options.imageScale}
                      onChange={(e) =>
                        setOptions({ ...options, imageScale: parseFloat(e.target.value) })
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-foreground mb-1">
                      <span>Opacidade</span>
                      <span className="text-muted-foreground font-mono">
                        {Math.round(options.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={options.opacity}
                      onChange={(e) =>
                        setOptions({ ...options, opacity: parseFloat(e.target.value) })
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── MODO PAGINAÇÃO ── */}
            {options.mode === 'pagination' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Formato da Paginação
                  </label>
                  <input
                    type="text"
                    value={options.paginationFormat}
                    onChange={(e) => setOptions({ ...options, paginationFormat: e.target.value })}
                    placeholder="Página {num} de {total}"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:border-primary outline-hidden"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['Página {num} de {total}', '{num}/{total}', 'Pág. {num}', 'SIG Alpha - Pág. {num}'].map(
                      (fmt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setOptions({ ...options, paginationFormat: fmt })}
                          className="px-2.5 py-1 rounded-lg bg-muted text-[11px] font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                        >
                          {fmt}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      Iniciar Numeração Em
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={options.paginationStart}
                      onChange={(e) =>
                        setOptions({
                          ...options,
                          paginationStart: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:border-primary outline-hidden"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-foreground mb-1">
                      <span>Tamanho da Fonte</span>
                      <span className="text-muted-foreground font-mono">{options.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={24}
                      step={1}
                      value={options.fontSize > 24 ? 10 : options.fontSize}
                      onChange={(e) =>
                        setOptions({ ...options, fontSize: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── POSICIONAMENTO E PÁGINAS ALVO ── */}
            <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Posição no Documento
                </label>
                <select
                  value={options.position}
                  onChange={(e) =>
                    setOptions({ ...options, position: e.target.value as StampPosition })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:border-primary outline-hidden cursor-pointer"
                >
                  <option value="center-diagonal">Centro (Diagonal 45°)</option>
                  <option value="center">Centro (Horizontal)</option>
                  <option value="top-left">Topo - Esquerda</option>
                  <option value="top-center">Topo - Centro</option>
                  <option value="top-right">Topo - Direita</option>
                  <option value="bottom-left">Rodapé - Esquerda</option>
                  <option value="bottom-center">Rodapé - Centro</option>
                  <option value="bottom-right">Rodapé - Direita</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Aplicar em Quais Páginas?
                </label>
                <select
                  value={options.pageTarget}
                  onChange={(e) =>
                    setOptions({ ...options, pageTarget: e.target.value as PageTarget })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:border-primary outline-hidden cursor-pointer"
                >
                  <option value="all">Todas as páginas</option>
                  <option value="first">Apenas na 1ª página</option>
                  <option value="except-first">Todas, exceto a 1ª página</option>
                  <option value="range">Intervalo personalizado (ex: 1-3, 5)</option>
                </select>
              </div>
            </div>

            {options.pageTarget === 'range' && (
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Intervalo de Páginas
                </label>
                <input
                  type="text"
                  value={options.customPageRange}
                  onChange={(e) => setOptions({ ...options, customPageRange: e.target.value })}
                  placeholder="Ex: 1-3, 5, 8"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:border-primary outline-hidden"
                />
              </div>
            )}

            {/* ── Barra de Ação de Processamento ── */}
            <div className="pt-3 border-t border-border">
              {isProcessing ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                      Carimbando documentos com segurança local...
                    </span>
                    <span className="font-mono text-primary">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleProcessStamp}
                  disabled={pdfFiles.length === 0}
                  className={cn(
                    'w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer',
                    pdfFiles.length === 0
                      ? 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 active:scale-[0.99]'
                  )}
                >
                  <Stamp className="w-4 h-4" />
                  <span>
                    Carimbar {pdfFiles.length === 1 ? 'Documento' : `${pdfFiles.length} Documentos`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ── 3. Painel de Resultados & Download ── */}
          {processedResults && (
            <div className="bg-card border border-emerald-500/40 rounded-2xl p-5 md:p-6 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Processamento Concluído com Sucesso!
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {processedResults.files.length} documento(s) pronto(s) para download.
                    </p>
                  </div>
                </div>

                {processedResults.zipUrl && (
                  <a
                    href={processedResults.zipUrl}
                    download="documentos_carimbados.zip"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs shrink-0"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Baixar Todos (ZIP)</span>
                  </a>
                )}
              </div>

              <div className="space-y-2">
                {processedResults.files.map((resFile, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-background border border-border text-xs gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-foreground truncate">
                        {resFile.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={resFile.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center gap-1.5 transition-colors"
                        title="Visualizar PDF"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </a>
                      <a
                        href={resFile.url}
                        download={resFile.name}
                        className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
