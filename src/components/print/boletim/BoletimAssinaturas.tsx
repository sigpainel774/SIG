'use client'

import React from 'react'

interface BoletimAssinaturasProps {
  secretarioNome?: string
  isEditMode: boolean
  dataEmissao: string
  setDataEmissao: (val: string) => void
  gestorAssinatura: string
  setGestorAssinatura: (val: string) => void
  fol: string
  setFol: (val: string) => void
  alunoRodape: string
  setAlunoRodape: (val: string) => void
  assinaturaTrimestre1: string
  setAssinaturaTrimestre1: (val: string) => void
  assinaturaTrimestre2: string
  setAssinaturaTrimestre2: (val: string) => void
  assinaturaTrimestre3: string
  setAssinaturaTrimestre3: (val: string) => void
}

export function BoletimAssinaturas({
  secretarioNome,
  isEditMode,
  dataEmissao,
  setDataEmissao,
  gestorAssinatura,
  setGestorAssinatura,
  fol,
  setFol,
  alunoRodape,
  setAlunoRodape,
  assinaturaTrimestre1,
  setAssinaturaTrimestre1,
  assinaturaTrimestre2,
  setAssinaturaTrimestre2,
  assinaturaTrimestre3,
  setAssinaturaTrimestre3
}: BoletimAssinaturasProps) {
  return (
    <div className="flex flex-col gap-2 mt-3 select-text font-sans">
      {/* Linha 1: Secretário, Folha, Emissão */}
      <div className="grid grid-cols-12 text-[8px] font-bold gap-3 items-center">
        <div className="col-span-6 flex items-center border-b border-black py-0.5">
          <span className="uppercase text-[7.5px] mr-1 shrink-0 text-black">Secretário(a) de Educação:</span>
          <span className="uppercase font-bold text-[8.5px] text-black">
            {secretarioNome && secretarioNome.trim() !== '' ? secretarioNome : 'MARCUS ALANO CORREIA OLIVEIRA'}
          </span>
        </div>
        <div className="col-span-3 flex items-center border-b border-black py-0.5">
          <span className="uppercase text-[7.5px] mr-1 shrink-0 text-black">Folha/Reg:</span>
          <input
            type="text"
            value={fol}
            onChange={(e) => setFol(e.target.value)}
            disabled={!isEditMode}
            placeholder="—"
            className="flex-1 bg-transparent focus:outline-none uppercase font-bold text-[8.5px] py-0 text-black text-center"
          />
        </div>
        <div className="col-span-3 flex items-center border-b border-black py-0.5">
          <span className="uppercase text-[7.5px] mr-1 shrink-0 text-black">Emissão:</span>
          <input
            type="text"
            value={dataEmissao}
            onChange={(e) => setDataEmissao(e.target.value)}
            disabled={!isEditMode}
            className="flex-1 bg-transparent focus:outline-none uppercase font-bold text-[8.5px] py-0 text-black text-center"
          />
        </div>
      </div>

      {/* Linha 2: Grade de Assinaturas Trimestrais e Diretor */}
      <div className="grid grid-cols-12 gap-3 mt-1.5 items-end">
        {/* Assinaturas Trimestrais (Pais) */}
        <div className="col-span-9 grid grid-cols-3 gap-2">
          {/* Assinatura 1º TRI */}
          <div className="border border-black bg-[#fafafa] flex flex-col justify-between h-14 p-1 rounded-sm">
            <span className="text-[6.5px] text-gray-500 font-extrabold uppercase leading-none mb-1">
              Assinatura do Responsável - 1º Trimestre
            </span>
            <input
              type="text"
              value={assinaturaTrimestre1}
              onChange={(e) => setAssinaturaTrimestre1(e.target.value)}
              disabled={!isEditMode}
              className="w-full bg-transparent focus:outline-none border-b border-gray-300 text-center font-bold text-[8px] py-0.5 text-black"
            />
          </div>

          {/* Assinatura 2º TRI */}
          <div className="border border-black bg-[#fafafa] flex flex-col justify-between h-14 p-1 rounded-sm">
            <span className="text-[6.5px] text-gray-500 font-extrabold uppercase leading-none mb-1">
              Assinatura do Responsável - 2º Trimestre
            </span>
            <input
              type="text"
              value={assinaturaTrimestre2}
              onChange={(e) => setAssinaturaTrimestre2(e.target.value)}
              disabled={!isEditMode}
              className="w-full bg-transparent focus:outline-none border-b border-gray-300 text-center font-bold text-[8px] py-0.5 text-black"
            />
          </div>

          {/* Assinatura 3º TRI */}
          <div className="border border-black bg-[#fafafa] flex flex-col justify-between h-14 p-1 rounded-sm">
            <span className="text-[6.5px] text-gray-500 font-extrabold uppercase leading-none mb-1">
              Assinatura do Responsável - 3º Trimestre
            </span>
            <input
              type="text"
              value={assinaturaTrimestre3}
              onChange={(e) => setAssinaturaTrimestre3(e.target.value)}
              disabled={!isEditMode}
              className="w-full bg-transparent focus:outline-none border-b border-gray-300 text-center font-bold text-[8px] py-0.5 text-black"
            />
          </div>
        </div>

        {/* Assinatura do Gestor/Diretor Escolar */}
        <div className="col-span-3 border border-black bg-white flex flex-col justify-between h-14 p-1.5 rounded-sm relative">
          <div className="flex flex-col text-center">
            <input
              type="text"
              value={gestorAssinatura}
              onChange={(e) => setGestorAssinatura(e.target.value)}
              disabled={!isEditMode}
              className="w-full bg-transparent focus:outline-none border-b border-dashed border-gray-400 text-center font-black text-[8px] uppercase py-0.5 text-black"
            />
            <span className="text-[6px] text-[#0b4a8c] font-black uppercase tracking-widest mt-1">
              Gestor(a) Escolar
            </span>
          </div>
          <div className="text-[5px] text-gray-400 font-bold uppercase tracking-wider text-center mt-1 border-t border-gray-100 pt-0.5">
            Carimbo e Assinatura
          </div>
        </div>
      </div>

      {/* Linha 3: Rodapé e Nome do Aluno no canhoto */}
      <div className="flex justify-between items-center text-[7px] font-black text-gray-400 uppercase tracking-widest mt-2 border-t border-gray-200 pt-1">
        <span>SIG Sapeaçu · Secretaria Municipal de Educação</span>
        <div className="flex items-center gap-1">
          <span>ALUNO (A):</span>
          <input
            type="text"
            value={alunoRodape}
            onChange={(e) => setAlunoRodape(e.target.value)}
            disabled={!isEditMode}
            className="bg-transparent focus:outline-none font-bold text-[7.5px] py-0 text-black uppercase w-32 border-b border-gray-300"
          />
        </div>
        <span>BOLETIM DE RENDIMENTO ESCOLAR</span>
      </div>
    </div>
  )
}
