'use client'

import React, { useState } from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Search, User, CheckCircle2 } from 'lucide-react'

export function SecaoBuscaAluno() {
  const {
    alunoSelecionado, setAlunoSelecionado,
    alunosEncontrados, handleSearchAluno,
    searchLoading
  } = useMatriculaEmaeeContext()

  const [searchTerm, setSearchTerm] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    handleSearchAluno(e.target.value)
  }

  const handleSelect = (aluno: any) => {
    setAlunoSelecionado(aluno)
    setSearchTerm('')
    setIsFocused(false)
  }

  return (
    <div className="space-y-4">
      <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
        1. Identificação do Aluno (Busca no SIG)
      </div>

      {!alunoSelecionado ? (
        <div className="relative">
          <Label className="text-xs text-gray-300">Buscar Paciente/Aluno *</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={searchTerm}
              onChange={onSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Digite o nome do aluno para buscar..."
              className="pl-9 bg-[#121212] border-[#2a2a2a] text-white focus:border-[#3ea6ff]"
            />
            {searchLoading && (
              <div className="absolute right-3 top-2.5">
                <div className="w-4 h-4 border-2 border-[#3ea6ff] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {isFocused && alunosEncontrados.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {alunosEncontrados.map((aluno) => (
                <div
                  key={aluno.id}
                  onClick={() => handleSelect(aluno)}
                  className="p-3 hover:bg-[#27272a] cursor-pointer border-b border-[#27272a]/50 last:border-0 flex flex-col gap-1"
                >
                  <span className="text-sm font-bold text-white">{aluno.nome}</span>
                  <div className="flex gap-3 text-[10px] text-zinc-400">
                    {aluno.cpf && <span>CPF: {aluno.cpf}</span>}
                    {aluno.data_nascimento && <span>Nasc: {aluno.data_nascimento}</span>}
                    {aluno.nome_mae && <span>Mãe: {aluno.nome_mae}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isFocused && searchTerm.length >= 3 && alunosEncontrados.length === 0 && !searchLoading && (
            <div className="absolute z-10 w-full mt-1 bg-[#18181b] border border-[#27272a] rounded-lg p-3 text-center text-xs text-zinc-400">
              Nenhum aluno encontrado com este nome. 
              <br />
              Se necessário, cadastre-o primeiro no módulo de Alunos.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#121212] border border-emerald-500/30 p-4 rounded-xl flex items-start justify-between">
          <div className="space-y-3 w-full">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Paciente Selecionado</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-500 block">Nome Completo</span>
                <span className="text-white font-semibold">{alunoSelecionado.nome}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Data de Nascimento</span>
                <span className="text-white">{alunoSelecionado.data_nascimento ?? 'Não informado'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">CPF</span>
                <span className="text-white">{alunoSelecionado.cpf ?? 'Não informado'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Nome da Mãe</span>
                <span className="text-white">{alunoSelecionado.nome_mae ?? 'Não informado'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Cor / Raça</span>
                <span className="text-white">{alunoSelecionado.cor_raca ?? 'Não informado'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Sexo</span>
                <span className="text-white">{alunoSelecionado.sexo ?? 'Não informado'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-zinc-500 block">Endereço</span>
                <span className="text-white">{alunoSelecionado.endereco ?? 'Não informado'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAlunoSelecionado(null)}
            className="text-xs text-rose-400 hover:text-rose-300 font-bold shrink-0 mt-1"
          >
            Trocar Aluno
          </button>
        </div>
      )}
    </div>
  )
}
