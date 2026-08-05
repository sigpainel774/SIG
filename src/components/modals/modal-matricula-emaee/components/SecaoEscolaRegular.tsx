'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function SecaoEscolaRegular() {
  const {
    escolaRegularId, setEscolaRegularId,
    escolas,
    anoEscolarizacao, setAnoEscolarizacao,
    turnoRegular, setTurnoRegular,
    turmaRegular, setTurmaRegular,
    professorRegular, setProfessorRegular,
    gestorRegular, setGestorRegular
  } = useMatriculaEmaeeContext()

  return (
    <div className="space-y-4">
      <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
        2. Unidade Escolar da Escolarização (Regular)
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-xs text-gray-300">Escola Municipal (Origem)</Label>
          <Select value={escolaRegularId} onValueChange={(val) => setEscolaRegularId(val || '')}>
            <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
              <SelectValue placeholder="Selecione a Escola">
                {escolaRegularId 
                  ? (escolas.find((esc) => esc.id === escolaRegularId)?.nome || (escolas.length === 0 ? 'Carregando...' : escolaRegularId))
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
              <SelectItem value="nenhuma">Nenhuma / Não informada</SelectItem>
              {escolas.map((esc) => (
                <SelectItem key={esc.id} value={esc.id}>{esc.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-gray-300">Ano de Escolarização</Label>
          <Input 
            value={anoEscolarizacao}
            onChange={(e) => setAnoEscolarizacao(e.target.value)}
            placeholder="Ex: 5º Ano"
            className="bg-[#121212] border-[#2a2a2a] text-white mt-1"
          />
        </div>
        
        <div>
          <Label className="text-xs text-gray-300">Turma</Label>
          <Input 
            value={turmaRegular}
            onChange={(e) => setTurmaRegular(e.target.value)}
            placeholder="Ex: A"
            className="bg-[#121212] border-[#2a2a2a] text-white mt-1"
          />
        </div>

        <div>
          <Label className="text-xs text-gray-300">Turno</Label>
          <Select value={turnoRegular} onValueChange={(val) => setTurnoRegular(val || '')}>
            <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
              <SelectItem value="Matutino">Matutino</SelectItem>
              <SelectItem value="Vespertino">Vespertino</SelectItem>
              <SelectItem value="Integral">Integral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-gray-300">Gestor</Label>
          <Input 
            value={gestorRegular}
            onChange={(e) => setGestorRegular(e.target.value)}
            placeholder="Nome do Diretor"
            className="bg-[#121212] border-[#2a2a2a] text-white mt-1"
          />
        </div>
        
        <div className="md:col-span-2">
          <Label className="text-xs text-gray-300">Professor Regular</Label>
          <Input 
            value={professorRegular}
            onChange={(e) => setProfessorRegular(e.target.value)}
            placeholder="Nome do Professor Regente"
            className="bg-[#121212] border-[#2a2a2a] text-white mt-1"
          />
        </div>
      </div>
    </div>
  )
}
