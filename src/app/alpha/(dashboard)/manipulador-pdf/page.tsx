'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Files,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  ArrowDownUp
} from 'lucide-react'
import { toast } from 'sonner'
import { mergePdfs } from '@/lib/pdfUtils'
import { formatBytes } from '@/lib/imageCompression'

export default function ManipuladorPdfPage() {
  const [activeTab, setActiveTab] = useState<'merge' | 'split'>('merge')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  // Estados: Merge
  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [mergedPdf, setMergedPdf] = useState<{ url: string; blob: Blob } | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (mergedPdf) URL.revokeObjectURL(mergedPdf.url)
    }
  }, [mergedPdf])

  const handlePdfsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf')
    
    if (files.length < e.target.files.length) {
      toast.warning('Apenas arquivos PDF são suportados.')
    }
    
    setPdfFiles((prev) => [...prev, ...files])
    if (mergedPdf) {
      URL.revokeObjectURL(mergedPdf.url)
      setMergedPdf(null)
    }
  }

  const handleMergePdfs = async () => {
    if (pdfFiles.length < 2) {
      toast.error('Selecione pelo menos 2 arquivos PDF para mesclar.')
      return
    }
    
    setIsProcessing(true)
    setProgress(0)

    try {
      const pdfBlob = await mergePdfs(pdfFiles, (pct) => {
        if (isMounted.current) setProgress(pct)
      })
      if (isMounted.current) {
        const url = URL.createObjectURL(pdfBlob)
        setMergedPdf({ url, blob: pdfBlob })
        toast.success('Arquivos mesclados com sucesso!')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao mesclar PDFs: ' + (err.message || 'Desconhecido'))
    } finally {
      if (isMounted.current) setIsProcessing(false)
    }
  }

  const removePdf = (index: number) => {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index))
    if (mergedPdf) {
      URL.revokeObjectURL(mergedPdf.url)
      setMergedPdf(null)
    }
  }

  // Simples reordenador (mover para cima/baixo)
  const movePdf = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === pdfFiles.length - 1) return
    
    const newFiles = [...pdfFiles]
    const temp = newFiles[index]
    if (direction === 'up') {
      newFiles[index] = newFiles[index - 1]
      newFiles[index - 1] = temp
    } else {
      newFiles[index] = newFiles[index + 1]
      newFiles[index + 1] = temp
    }
    setPdfFiles(newFiles)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
              <Files className="w-5 h-5" />
            </div>
            Mesclador de PDFs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Junte múltiplos arquivos PDF em um único documento contínuo de forma instantânea.
          </p>
        </div>
      </div>

      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="space-y-6">
          {pdfFiles.length === 0 ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 hover:border-indigo-500/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                <UploadCloud className="w-10 h-10 mb-3 text-indigo-400" />
                <p className="mb-2 text-sm font-semibold">Selecione 2 ou mais arquivos PDF</p>
                <p className="text-xs">O processamento é feito localmente no seu computador</p>
              </div>
              <input type="file" multiple className="hidden" accept="application/pdf" onChange={handlePdfsUpload} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
                  <Plus className="w-4 h-4" />
                  Adicionar mais PDFs
                  <input type="file" multiple className="hidden" accept="application/pdf" onChange={handlePdfsUpload} />
                </label>
                
                {mergedPdf ? (
                  <a
                    href={mergedPdf.url}
                    download="documentos_mesclados.pdf"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDF Mesclado
                  </a>
                ) : (
                  <button
                    onClick={handleMergePdfs}
                    disabled={isProcessing || pdfFiles.length < 2}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Files className="w-4 h-4" />}
                    {isProcessing ? 'Mesclando...' : 'Mesclar Arquivos'}
                  </button>
                )}
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>Processando {pdfFiles.length} arquivos...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {pdfFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl group hover:border-indigo-500/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                        {i + 1}
                      </div>
                      <div className="max-w-[200px] sm:max-w-md truncate">
                        <p className="text-sm font-semibold text-white truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => movePdf(i, 'up')} 
                        disabled={i === 0 || isProcessing}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md disabled:opacity-30 transition-colors"
                        title="Mover para Cima"
                      >
                        <ArrowDownUp className="w-4 h-4 rotate-180" />
                      </button>
                      <button 
                        onClick={() => movePdf(i, 'down')} 
                        disabled={i === pdfFiles.length - 1 || isProcessing}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md disabled:opacity-30 transition-colors"
                        title="Mover para Baixo"
                      >
                        <ArrowDownUp className="w-4 h-4" />
                      </button>
                      <div className="w-px h-6 bg-slate-700 mx-1"></div>
                      <button 
                        onClick={() => removePdf(i)} 
                        disabled={isProcessing}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md disabled:opacity-30 transition-colors"
                        title="Remover arquivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-xs text-center text-slate-500 pt-4">
                Dica: A ordem dos arquivos na lista será a ordem exata das páginas no PDF gerado.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
