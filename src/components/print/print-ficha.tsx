'use client'

import React from 'react'
import { PrintHeader } from '@/components/print/print-header'

interface PrintFichaProps {
  nome: string
  fotoUrl?: string
  cpf?: string
  inep?: string
  rg?: string
  nascimento?: string
  mae?: string
  pai?: string
  endereco?: string
  telefone?: string
  escola?: string
  escolaLogoUrl?: string
}

export function PrintFicha({
  nome = 'João Silva',
  fotoUrl = '',
  cpf = '000.111.222-33',
  inep = '12345678',
  rg = '12.345.678-90 SSP/BA',
  nascimento = '15/05/2012',
  mae = 'Maria da Silva',
  pai = 'José da Silva',
  endereco = 'Rua Principal, Nº 100 - Centro, Sapeaçu - BA',
  telefone = '(75) 99999-8888',
  escola = 'Colégio Dr Eraldo Tinoco',
  escolaLogoUrl
}: Partial<PrintFichaProps>) {
  return (
    <div className="p-6 bg-white text-black max-w-3xl mx-auto rounded-xl border border-gray-300 shadow-sm print:shadow-none print:border-none print:p-0">
      <div className="flex justify-between items-center mb-4 no-print border-b pb-4">
        <h2 className="text-lg font-bold text-slate-800">Visualização de Impressão — Ficha Cadastral</h2>
        <button 
          onClick={() => window.print()} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md cursor-pointer"
        >
          🖨️ Imprimir Ficha (A4)
        </button>
      </div>

      <div className="border border-black p-4 font-sans text-xs space-y-4">
        {/* Header Oficial */}
        <PrintHeader
          escolaNome={escola}
          escolaLogoUrl={escolaLogoUrl}
          docTitulo="FICHA CADASTRAL DO ESTUDANTE"
        />

        {/* Quadro com Foto e Identificação */}
        <div className="flex justify-between items-start gap-4 pb-2 border-b border-gray-300">
          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-xs uppercase bg-gray-200 p-1 border border-black">1. Identificação Básica</h3>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div><strong>Nome Completo:</strong> {nome}</div>
              <div><strong>Data Nasc:</strong> {nascimento}</div>
              <div><strong>CPF:</strong> {cpf}</div>
              <div><strong>Código INEP (Censo):</strong> {inep}</div>
              <div><strong>RG / Órgão:</strong> {rg}</div>
              <div><strong>Telefone:</strong> {telefone}</div>
            </div>
          </div>

          <div className="w-16 h-20 border border-black flex-shrink-0 flex items-center justify-center bg-gray-100 text-[10px] text-gray-500 font-mono text-center">
            {fotoUrl ? (
              <img 
                src={fotoUrl.startsWith('data:') ? fotoUrl : `${fotoUrl.split('?')[0]}?t=${Date.now()}`} 
                alt={nome} 
                className="w-full h-full object-cover" 
              />
            ) : (
              'Foto 3x4'
            )}
          </div>
        </div>

        <h3 className="font-bold text-xs uppercase bg-gray-200 p-1 border border-black">2. Filiação e Endereço</h3>
        <div className="space-y-1 text-xs">
          <div><strong>Nome da Mãe:</strong> {mae}</div>
          <div><strong>Nome do Pai:</strong> {pai}</div>
          <div><strong>Endereço Residencial:</strong> {endereco}</div>
        </div>

        <div className="pt-10 text-center text-[10px] grid grid-cols-2 gap-4">
          <div>
            <div className="border-t border-black w-40 mx-auto mb-1"></div>
            <p>Assinatura do Responsável</p>
          </div>
          <div>
            <div className="border-t border-black w-40 mx-auto mb-1"></div>
            <p>Carimbo e Assinatura da Escola</p>
          </div>
        </div>
      </div>
    </div>
  )
}
