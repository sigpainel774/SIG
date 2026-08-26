'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Image as ImageIcon,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  Layers,
  ArrowRight,
  AlertCircle,
  FileArchive,
} from 'lucide-react'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { convertPdfToImages } from '@/lib/pdfToImage'
import { createPdfFromImages } from '@/lib/pdfUtils'
import { formatBytes } from '@/lib/imageCompression'

export default function ConversorPdfImagensPage() {
  const [activeTab, setActiveTab] = useState<'pdfToImg' | 'imgToPdf'>('pdfToImg')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // Estados: PDF -> IMG
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [extractedImages, setExtractedImages] = useState<{ url: string; blob: Blob; pageNumber: number }[]>([])

  // Estados: IMG -> PDF
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [generatedPdf, setGeneratedPdf] = useState<{ url: string; blob: Blob } | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      // Prevenção de Memory Leak (ES-7)
      extractedImages.forEach((img) => URL.revokeObjectURL(img.url))
      if (generatedPdf) URL.revokeObjectURL(generatedPdf.url)
    }
  }, [extractedImages, generatedPdf])

  // --- Funções: PDF -> IMG ---
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Por favor, selecione um arquivo PDF válido.')
      return
    }

    setPdfFile(file)
    setExtractedImages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url))
      return []
    })
  }

  const handleConvertPdfToImages = async () => {
    if (!pdfFile) return
    setIsProcessing(true)
    setProgress(0)

    try {
      const results = await convertPdfToImages(pdfFile, 'image/png', 2.0, (pct) => {
        if (isMounted.current) setProgress(pct)
      })
      if (isMounted.current) {
        setExtractedImages(results)
        toast.success(`PDF convertido com sucesso! ${results.length} páginas extraídas.`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao converter PDF: ' + (err.message || 'Desconhecido'))
    } finally {
      if (isMounted.current) setIsProcessing(false)
    }
  }

  const downloadAllImagesAsZip = async () => {
    if (extractedImages.length === 0) return
    setIsProcessing(true)
    setProgress(0)

    try {
      const zip = new JSZip()
      extractedImages.forEach((img, index) => {
        const num = String(img.pageNumber).padStart(3, '0')
        zip.file(`pagina_${num}.png`, img.blob)
      })

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE', // Rápido, sem travar
      }, (metadata) => {
        setProgress(Math.round(metadata.percent))
      })

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${pdfFile?.name.replace('.pdf', '')}_paginas.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download do ZIP concluído!')
    } catch (err) {
      toast.error('Erro ao gerar arquivo ZIP.')
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  // --- Funções: IMG -> PDF ---
  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const files = Array.from(e.target.files).filter(f => f.type === 'image/jpeg' || f.type === 'image/png')
    
    if (files.length < e.target.files.length) {
      toast.warning('Apenas imagens JPG e PNG são suportadas para geração nativa de PDF neste módulo.')
    }
    
    setImageFiles((prev) => [...prev, ...files])
    if (generatedPdf) {
      URL.revokeObjectURL(generatedPdf.url)
      setGeneratedPdf(null)
    }
  }

  const handleConvertImagesToPdf = async () => {
    if (imageFiles.length === 0) return
    setIsProcessing(true)
    setProgress(0)

    try {
      const pdfBlob = await createPdfFromImages(imageFiles, (pct) => {
        if (isMounted.current) setProgress(pct)
      })
      if (isMounted.current) {
        const url = URL.createObjectURL(pdfBlob)
        setGeneratedPdf({ url, blob: pdfBlob })
        toast.success('PDF gerado com sucesso!')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao gerar PDF: ' + (err.message || 'Desconhecido'))
    } finally {
      if (isMounted.current) setIsProcessing(false)
    }
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    if (generatedPdf) {
      URL.revokeObjectURL(generatedPdf.url)
      setGeneratedPdf(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-accent flex items-center justify-center border border-sidebar-border text-sidebar-primary shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            Conversor PDF &amp; Imagens
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Extraia imagens de PDFs ou crie PDFs a partir de fotos escaneadas, de forma local e segura.
          </p>
        </div>
      </div>

      {/* Tabs Customizadas */}
      <div className="flex p-1 bg-white border border-sidebar-border rounded-xl max-w-md shadow-xs">
        <button
          onClick={() => setActiveTab('pdfToImg')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'pdfToImg' ? 'bg-sidebar-primary text-white shadow-xs font-semibold' : 'text-sidebar-foreground hover:bg-sidebar-accent'
          }`}
        >
          <FileText className="w-4 h-4" />
          PDF para Imagens
        </button>
        <button
          onClick={() => setActiveTab('imgToPdf')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'imgToPdf' ? 'bg-sidebar-primary text-white shadow-xs font-semibold' : 'text-sidebar-foreground hover:bg-sidebar-accent'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Imagens para PDF
        </button>
      </div>

      {/* Area de Trabalho */}
      <div className="bg-white border border-sidebar-border rounded-2xl p-6 shadow-xs">
        
        {/* ABA: PDF -> IMG */}
        {activeTab === 'pdfToImg' && (
          <div className="space-y-6">
            {!pdfFile ? (
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-sidebar-border border-dashed rounded-xl cursor-pointer bg-sidebar-accent/20 hover:bg-sidebar-accent/40 hover:border-sidebar-primary/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                  <UploadCloud className="w-10 h-10 mb-3 text-sidebar-primary" />
                  <p className="mb-2 text-sm font-semibold text-sidebar-foreground">Clique ou arraste um PDF aqui</p>
                  <p className="text-xs">Máximo recomendado: 50MB</p>
                </div>
                <input type="file" className="hidden" accept="application/pdf" onChange={handlePdfUpload} />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-sidebar-accent/30 border border-sidebar-border rounded-xl p-4">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="p-3 bg-red-50 rounded-lg text-destructive border border-red-200">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-sidebar-foreground truncate">{pdfFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(pdfFile.size)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPdfFile(null)}
                      disabled={isProcessing}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                      title="Remover arquivo"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {extractedImages.length === 0 && (
                      <button
                        onClick={handleConvertPdfToImages}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white text-sm font-medium rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
                      >
                        {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                        {isProcessing ? 'Extraindo...' : 'Extrair Páginas'}
                      </button>
                    )}
                  </div>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>Processando...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-sidebar-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {extractedImages.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-sidebar-border">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-sidebar-foreground">
                        {extractedImages.length} páginas extraídas
                      </h3>
                      <button
                        onClick={downloadAllImagesAsZip}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        <FileArchive className="w-4 h-4" />
                        Baixar ZIP
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {extractedImages.map((img) => (
                        <div key={img.pageNumber} className="relative group bg-white border border-sidebar-border rounded-xl overflow-hidden shadow-xs">
                          <img src={img.url} alt={`Página ${img.pageNumber}`} className="w-full aspect-[1/1.4] object-contain bg-slate-50" />
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-black/70 backdrop-blur-xs text-xs font-medium text-white flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>Pág. {img.pageNumber}</span>
                            <a href={img.url} download={`pagina_${img.pageNumber}.png`} className="p-1 hover:text-blue-300">
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA: IMG -> PDF */}
        {activeTab === 'imgToPdf' && (
          <div className="space-y-6">
            
            {imageFiles.length === 0 ? (
               <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-sidebar-border border-dashed rounded-xl cursor-pointer bg-sidebar-accent/20 hover:bg-sidebar-accent/40 hover:border-sidebar-primary/50 transition-colors">
               <div className="flex flex-col items-center justify-center pt-5 pb-6 text-muted-foreground">
                 <ImageIcon className="w-10 h-10 mb-3 text-sidebar-primary" />
                 <p className="mb-2 text-sm font-semibold text-sidebar-foreground">Selecione fotos ou scans (JPG/PNG)</p>
                 <p className="text-xs">Permitido múltipla seleção</p>
               </div>
               <input type="file" multiple className="hidden" accept="image/jpeg, image/png" onChange={handleImagesUpload} />
             </label>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <label className="px-4 py-2 bg-white border border-sidebar-border hover:bg-sidebar-accent text-sidebar-foreground text-sm font-medium rounded-xl cursor-pointer flex items-center gap-2 shadow-xs">
                    <UploadCloud className="w-4 h-4 text-sidebar-primary" />
                    Adicionar mais
                    <input type="file" multiple className="hidden" accept="image/jpeg, image/png" onChange={handleImagesUpload} />
                  </label>
                  
                  {generatedPdf ? (
                    <a
                      href={generatedPdf.url}
                      download="documento_agrupado.pdf"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Baixar PDF Final
                    </a>
                  ) : (
                    <button
                      onClick={handleConvertImagesToPdf}
                      disabled={isProcessing}
                      className="px-5 py-2 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white text-sm font-medium rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                      {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      {isProcessing ? 'Gerando...' : 'Gerar PDF Único'}
                    </button>
                  )}
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground font-medium">
                      <span>Processando imagens...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-sidebar-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {imageFiles.map((file, i) => (
                    <div key={i} className="relative group bg-white border border-sidebar-border rounded-xl overflow-hidden aspect-[3/4] shadow-xs">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)} />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                        <button onClick={() => removeImage(i)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-500 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="absolute top-1 left-1 px-2 py-0.5 bg-black/70 text-[10px] font-bold text-white rounded">
                        Pág. {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
