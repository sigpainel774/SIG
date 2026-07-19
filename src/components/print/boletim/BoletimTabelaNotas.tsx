'use client'

import React from 'react'
import { BoletimMateriaData } from '../print-boletim-sapeacu'

interface BoletimTabelaNotasProps {
  isEditMode: boolean
  materiasComuns: BoletimMateriaData[]
  materiasDiversas: BoletimMateriaData[]
  notasState: Record<string, string>
  recsState: Record<string, string>
  handleNotaChange: (materiaId: string, unidade: number, valor: string) => void
  handleRecChange: (materiaId: string, valor: string) => void
  calcularTotal: (materiaId: string) => number | null
  calcularMediaFinal: (materiaId: string) => number | null
}

export function BoletimTabelaNotas({
  isEditMode,
  materiasComuns,
  materiasDiversas,
  notasState,
  recsState,
  handleNotaChange,
  handleRecChange,
  calcularTotal,
  calcularMediaFinal
}: BoletimTabelaNotasProps) {
  const totalComum = materiasComuns.length
  const totalDiversas = materiasDiversas.length

  return (
    <table className="w-full border-collapse border border-black text-center font-bold text-[9px]">
      <thead>
        <tr style={{ backgroundColor: 'rgba(160, 190, 220, 1)' }} className="font-bold text-black text-[8.5px]">
          <th className="border border-black w-6"></th>
          <th className="border border-black px-1.5 py-0.5 text-left uppercase w-[38%]">
            Componentes Curriculares
          </th>
          <th className="border border-black py-0.5 w-[8%]">1º TRI</th>
          <th className="border border-black py-0.5 w-[8%]">2º TRI</th>
          <th className="border border-black py-0.5 w-[8%]">3º TRI</th>
          <th className="border border-black py-0.5 w-[10%]">TOTAL</th>
          <th className="border border-black py-0.5 w-[11%]">REC</th>
          <th className="border border-black py-0.5 w-[11%]">Média Final</th>
        </tr>
      </thead>
      <tbody>
        {/* Seção BASE COMUM */}
        {totalComum === 0 ? (
          <tr>
            <td
              rowSpan={1}
              style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
              className="border border-black p-1 font-black text-center text-[8.5px] uppercase w-5 leading-none shrink-0"
            >
              <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black select-none">
                Base Comum
              </div>
            </td>
            <td colSpan={7} className="border border-black p-1.5 text-center text-gray-500 italic font-normal text-[9px]">
              Nenhuma disciplina de Base Comum vinculada a esta turma.
            </td>
          </tr>
        ) : (
          materiasComuns.map((mat, index) => {
            const total = calcularTotal(mat.id)
            const mediaFinal = calcularMediaFinal(mat.id)
            return (
              <tr key={mat.id} className="text-[9px]">
                {index === 0 && (
                  <td
                    rowSpan={totalComum}
                    style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
                    className="border border-black font-black text-center text-[8.5px] uppercase w-5 leading-none select-none shrink-0"
                  >
                    <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black">
                      Base Comum
                    </div>
                  </td>
                )}
                <td className="border border-black px-1.5 py-0.5 text-left font-bold text-black uppercase truncate max-w-[125px]">
                  {mat.nome}
                </td>
                
                {/* Trimestre 1 */}
                <td className="border border-black p-0">
                  <input
                    type="text"
                    value={notasState[`${mat.id}_1`] || ''}
                    onChange={(e) => handleNotaChange(mat.id, 1, e.target.value)}
                    disabled={!isEditMode}
                    className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                  />
                </td>
                {/* Trimestre 2 */}
                <td className="border border-black p-0">
                  <input
                    type="text"
                    value={notasState[`${mat.id}_2`] || ''}
                    onChange={(e) => handleNotaChange(mat.id, 2, e.target.value)}
                    disabled={!isEditMode}
                    className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                  />
                </td>
                {/* Trimestre 3 */}
                <td className="border border-black p-0">
                  <input
                    type="text"
                    value={notasState[`${mat.id}_3`] || ''}
                    onChange={(e) => handleNotaChange(mat.id, 3, e.target.value)}
                    disabled={!isEditMode}
                    className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                  />
                </td>

                {/* TOTAL */}
                <td className="border border-black py-0.5 bg-slate-50 text-black">
                  {total !== null ? total.toFixed(1) : '-'}
                </td>
                {/* Recuperação Final */}
                <td className="border border-black p-0">
                  <input
                    type="text"
                    value={recsState[mat.id] || ''}
                    onChange={(e) => handleRecChange(mat.id, e.target.value)}
                    disabled={!isEditMode}
                    className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                  />
                </td>
                {/* Média Final */}
                <td className={`border border-black py-0.5 ${
                  mediaFinal !== null && mediaFinal < 5.0 ? 'text-red-600 bg-red-50/10' : 'text-slate-950'
                }`}>
                  {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
                </td>
              </tr>
            )
          })
        )}

        {/* Seção DIVERSAS */}
        {totalDiversas === 0 ? (
          <tr>
            <td
              rowSpan={1}
              style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
              className="border border-black p-1 font-black text-center text-[8.5px] uppercase w-5 leading-none shrink-0"
            >
              <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black select-none">
                Diversificada
              </div>
            </td>
            <td colSpan={7} className="border border-black p-1.5 text-center text-gray-500 italic font-normal text-[9px]">
              Nenhuma disciplina de Parte Diversificada vinculada a esta turma.
            </td>
          </tr>
        ) : (
          materiasDiversas.map((mat, index) => {
            const total = calcularTotal(mat.id)
            const mediaFinal = calcularMediaFinal(mat.id)
            return (
              <tr key={mat.id} className="text-[9px]">
                {index === 0 && (
                  <td
                    rowSpan={totalDiversas}
                    style={{ backgroundColor: 'rgba(215, 230, 245, 1)' }}
                    className="border border-black font-black text-center text-[8.5px] uppercase w-5 leading-none select-none shrink-0"
                  >
                    <div className="[writing-mode:vertical-lr] [transform:rotate(180deg)] mx-auto font-black">
                      Diversificada
                    </div>
                  </td>
                )}
                <td className="border border-black px-1.5 py-0.5 text-left font-bold text-black uppercase truncate max-w-[125px]">
                  {mat.nome}
                </td>
                
                {/* Trimestre 1 */}
                <td className="border border-black p-0">
                  <input
                    type="text"
                    value={notasState[`${mat.id}_1`] || ''}
                    onChange={(e) => handleNotaChange(mat.id, 1, e.target.value)}
                    disabled={!isEditMode}
                    className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                  />
                </td>
                {/* Trimestre 2 */}
                <td className="border border-black p-0">
                  <input
                    type="text"
                    value={notasState[`${mat.id}_2`] || ''}
                    onChange={(e) => handleNotaChange(mat.id, 2, e.target.value)}
                    disabled={!isEditMode}
                    className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                  />
                </td>
                {/* Trimestre 3 */}
                <td className="border border-black p-0">
                  <input
                    type="text"
                    value={notasState[`${mat.id}_3`] || ''}
                    onChange={(e) => handleNotaChange(mat.id, 3, e.target.value)}
                    disabled={!isEditMode}
                    className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                  />
                </td>

                {/* TOTAL */}
                <td className="border border-black py-0.5 bg-slate-50 text-black">
                  {total !== null ? total.toFixed(1) : '-'}
                </td>
                {/* Recuperação Final */}
                <td className="border border-black p-0">
                  <input
                    type="text"
                    value={recsState[mat.id] || ''}
                    onChange={(e) => handleRecChange(mat.id, e.target.value)}
                    disabled={!isEditMode}
                    className="w-full text-center bg-transparent focus:outline-none font-bold text-black text-[9px] py-0.5"
                  />
                </td>
                {/* Média Final */}
                <td className={`border border-black py-0.5 ${
                  mediaFinal !== null && mediaFinal < 5.0 ? 'text-red-600 bg-red-50/10' : 'text-slate-950'
                }`}>
                  {mediaFinal !== null ? mediaFinal.toFixed(1) : '-'}
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
