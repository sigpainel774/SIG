'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Paperclip, Eye, Check } from 'lucide-react'
import { useFuncionarioForm } from '../context/FuncionarioFormContext'

export function AnexosTab() {
  const {
    docIdentidadeUrl, setDocIdentidadeUrl,
    docCpfUrl, setDocCpfUrl,
    docCompResidenciaUrl, setDocCompResidenciaUrl,
    docFundamentalUrl, setDocFundamentalUrl,
    docMedioUrl, setDocMedioUrl,
    docSuperiorUrl, setDocSuperiorUrl,
    docPosUrl, setDocPosUrl,
    docMestradoUrl, setDocMestradoUrl,
    docDoutoradoUrl, setDocDoutoradoUrl,
    observacoes, setObservacoes,
    dataPreenchimento, setDataPreenchimento,
    handleDocUpload,
  } = useFuncionarioForm()

  const documentos = [
    { key: 'identidade', label: 'Identidade (RG)', url: docIdentidadeUrl, setter: setDocIdentidadeUrl },
    { key: 'cpf', label: 'CPF', url: docCpfUrl, setter: setDocCpfUrl },
    { key: 'residencia', label: 'Comprovante de Residência', url: docCompResidenciaUrl, setter: setDocCompResidenciaUrl },
    { key: 'fund', label: 'Comprovante Escolaridade: Fundamental', url: docFundamentalUrl, setter: setDocFundamentalUrl },
    { key: 'medio', label: 'Comprovante Escolaridade: Médio', url: docMedioUrl, setter: setDocMedioUrl },
    { key: 'sup', label: 'Comprovante Escolaridade: Superior', url: docSuperiorUrl, setter: setDocSuperiorUrl },
    { key: 'pos', label: 'Comprovante Escolaridade: Pós-Graduação', url: docPosUrl, setter: setDocPosUrl },
    { key: 'mestrado', label: 'Comprovante Escolaridade: Mestrado', url: docMestradoUrl, setter: setDocMestradoUrl },
    { key: 'doutorado', label: 'Comprovante Escolaridade: Doutorado', url: docDoutoradoUrl, setter: setDocDoutoradoUrl },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-[#18181a] p-4 rounded-xl border border-zinc-800">
        <h4 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-2 mb-4">
          Documentos Comprovatórios Obrigatórios (PDF, JPG ou PNG)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {documentos.map((doc) => (
            <div key={doc.key} className="flex flex-col gap-1 p-3 rounded bg-[#121212] border border-zinc-800">
              <span className="font-semibold text-zinc-300">{doc.label}</span>
              <div className="flex items-center gap-2 mt-1">
                <label className="flex-1 flex items-center justify-between px-3 py-1.5 rounded bg-[#1a1a1c] border border-zinc-700 hover:bg-[#252528] transition-colors cursor-pointer text-zinc-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    {doc.url ? 'Substituir Arquivo' : 'Escolher Arquivo'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => handleDocUpload(e, doc.key, doc.setter)}
                  />
                </label>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 font-bold hover:bg-emerald-900/60 flex items-center gap-1"
                    title="Visualizar documento cadastrado"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver
                  </a>
                )}
                {doc.url && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Observações Gerais</Label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Adicione observações importantes sobre a contratação, licenças ou restrições..."
          rows={4}
          className="w-full mt-1 p-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none focus:border-[#3ea6ff]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Data de Preenchimento</Label>
          <Input
            type="date"
            value={dataPreenchimento}
            onChange={(e) => setDataPreenchimento(e.target.value)}
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div className="flex items-end">
          <p className="text-[10px] text-zinc-500 leading-normal mb-1 bg-[#18181a] p-2 rounded border border-zinc-800">
            * Nota: A data de preenchimento e a assinatura do funcionário são impressas para validação em papel. O preenchimento da data é automático no envio.
          </p>
        </div>
      </div>
    </div>
  )
}
