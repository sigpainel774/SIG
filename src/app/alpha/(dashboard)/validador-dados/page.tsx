'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  CheckSquare,
  ArrowLeft,
  Copy,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ListFilter
} from 'lucide-react'
import { toast } from 'sonner'

export default function AlphaValidadorDadosPage() {
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<{
    validos: string[]
    invalidos: string[]
    duplicados: number
  } | null>(null)

  const isValidCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]+/g, '')
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false
    const split = cpf.split('')
    let v1 = 0
    let v2 = 0
    for (let i = 0; i < 9; i++) {
      v1 += parseInt(split[i]) * (10 - i)
    }
    v1 = (v1 * 10) % 11
    if (v1 === 10 || v1 === 11) v1 = 0
    if (v1 !== parseInt(split[9])) return false
    for (let i = 0; i < 10; i++) {
      v2 += parseInt(split[i]) * (11 - i)
    }
    v2 = (v2 * 10) % 11
    if (v2 === 10 || v2 === 11) v2 = 0
    if (v2 !== parseInt(split[10])) return false
    return true
  }

  const formatCPF = (cpf: string): string => {
    const cleaned = cpf.replace(/[^\d]/g, "")
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }

  const handleValidate = () => {
    if (!inputText.trim()) {
      toast.error('Insira dados para validar.')
      return
    }

    setIsProcessing(true)
    setTimeout(() => {
      const lines = inputText.split('\n')
      
      const extractedCPFs: string[] = []
      
      lines.forEach(line => {
        const nums = line.replace(/[^\d]/g, '')
        let i = 0;
        while(i <= nums.length - 11) {
            extractedCPFs.push(nums.substring(i, i+11))
            i += 11
        }
      })

      const uniqueCPFs = new Set<string>()
      let duplicados = 0
      const validos: string[] = []
      const invalidos: string[] = []

      extractedCPFs.forEach(cpf => {
        if (uniqueCPFs.has(cpf)) {
          duplicados++
        } else {
          uniqueCPFs.add(cpf)
          if (isValidCPF(cpf)) {
            validos.push(formatCPF(cpf))
          } else {
            invalidos.push(formatCPF(cpf))
          }
        }
      })

      setResults({
        validos,
        invalidos,
        duplicados
      })
      setIsProcessing(false)
      toast.success('Validação concluída!')
    }, 500)
  }

  const copyToClipboard = (textList: string[]) => {
    const text = textList.join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a área de transferência!')
  }

  const downloadCSV = (textList: string[], filename: string) => {
    const text = textList.join('\n')
    const blob = new Blob([text], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Download iniciado!')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ── Topo com Navegação & Identificação ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/40 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/alpha"
            className="p-2 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/50 text-blue-300 transition-colors cursor-pointer"
            title="Voltar para a Central Alpha"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <span className="p-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <CheckSquare className="w-5 h-5" />
              </span>
              Validador de Listas & CPFs
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Valide CPFs, higienize dados em lote e remova duplicados.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Entrada de Dados */}
        <div className="space-y-4">
          <div className="bg-[#0c1427]/90 rounded-2xl border border-blue-900/40 p-5 shadow-xl flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-blue-400" />
                Dados de Entrada
              </h3>
              <button
                onClick={() => {
                  setInputText('')
                  setResults(null)
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Tudo
              </button>
            </div>
            
            <textarea
              className="flex-1 w-full bg-[#080d1b] border border-blue-900/60 rounded-xl p-4 text-sm text-slate-300 resize-none focus:outline-hidden focus:border-blue-500 transition-colors"
              placeholder="Cole aqui sua lista de CPFs (um por linha, com ou sem pontuação)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            <button
              onClick={handleValidate}
              disabled={isProcessing || !inputText.trim()}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isProcessing ? 'Validando...' : 'Validar e Higienizar'}
            </button>
          </div>
        </div>

        {/* Lado Direito: Resultados */}
        <div className="space-y-4">
          <div className="bg-[#0c1427]/90 rounded-2xl border border-blue-900/40 p-5 shadow-xl min-h-[500px] flex flex-col">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Resultados da Validação
            </h3>

            {!results ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                <CheckSquare className="w-12 h-12 opacity-20" />
                <p className="text-sm">Aguardando validação...</p>
              </div>
            ) : (
              <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-950/40 border border-emerald-900/40 p-3 rounded-xl text-center">
                    <span className="block text-2xl font-bold text-emerald-400">{results.validos.length}</span>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-500/70 font-bold">Válidos</span>
                  </div>
                  <div className="bg-rose-950/40 border border-rose-900/40 p-3 rounded-xl text-center">
                    <span className="block text-2xl font-bold text-rose-400">{results.invalidos.length}</span>
                    <span className="text-[10px] uppercase tracking-wider text-rose-500/70 font-bold">Inválidos</span>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-700/40 p-3 rounded-xl text-center">
                    <span className="block text-2xl font-bold text-slate-300">{results.duplicados}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Duplicados</span>
                  </div>
                </div>

                {/* Lista de Válidos */}
                {results.validos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        CPFs Válidos
                      </h4>
                      <div className="flex items-center gap-1">
                        <button onClick={() => copyToClipboard(results.validos)} className="p-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 transition-colors cursor-pointer" title="Copiar Válidos">
                          <Copy className="w-3 h-3" />
                        </button>
                        <button onClick={() => downloadCSV(results.validos, 'cpfs_validos.csv')} className="p-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 transition-colors cursor-pointer" title="Baixar CSV">
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#080d1b] border border-blue-900/40 rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-slate-300 font-mono leading-relaxed custom-scrollbar">
                      {results.validos.join(', ')}
                    </div>
                  </div>
                )}

                {/* Lista de Inválidos */}
                {results.invalidos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        CPFs Inválidos
                      </h4>
                      <div className="flex items-center gap-1">
                        <button onClick={() => copyToClipboard(results.invalidos)} className="p-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 transition-colors cursor-pointer" title="Copiar Inválidos">
                          <Copy className="w-3 h-3" />
                        </button>
                        <button onClick={() => downloadCSV(results.invalidos, 'cpfs_invalidos.csv')} className="p-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 transition-colors cursor-pointer" title="Baixar CSV">
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-[#080d1b] border border-blue-900/40 rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-slate-400 font-mono leading-relaxed custom-scrollbar opacity-80">
                      {results.invalidos.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
