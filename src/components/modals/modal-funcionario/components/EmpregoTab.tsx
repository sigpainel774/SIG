'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useFuncionarioForm } from '../context/FuncionarioFormContext'

export function EmpregoTab() {
  const {
    cargo, setCargo,
    funcaoEspec, setFuncaoEspec,
    tipoVinculo, setTipoVinculo,
    tipoVinculoEspec, setTipoVinculoEspec,
    status, setStatus,
  } = useFuncionarioForm()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Função / Cargo Principal na Escola</Label>
          <select
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="">Selecione a função</option>
            <option value="Auxiliar Administrativo">Auxiliar Administrativo</option>
            <option value="Auxiliar de Sala">Auxiliar de Sala</option>
            <option value="Auxiliar de Serviços Gerais">Auxiliar de Serviços Gerais</option>
            <option value="Coordenador(a) Pedagógico">Coordenador(a) Pedagógico</option>
            <option value="Diretor(a)">Diretor(a)</option>
            <option value="Merendeira">Merendeira</option>
            <option value="Monitor de Atividade Complementar">Monitor de Atividade Complementar</option>
            <option value="Monitor(a) de área">Monitor(a) de área</option>
            <option value="Nutricionista">Nutricionista</option>
            <option value="Professor(a)">Professor(a)</option>
            <option value="Psicólogo(a)">Psicólogo(a)</option>
            <option value="Psicopedagogo(a)">Psicopedagogo(a)</option>
            <option value="Secretária(o)">Secretária(o)</option>
            <option value="Tecnólogo em Alimentos">Tecnólogo em Alimentos</option>
            <option value="Vice-Diretor">Vice-Diretor</option>
            <option value="Vigilante">Vigilante</option>
            <option value="Zelador(a)">Zelador(a)</option>
            <option value="Outro">Outro (especificar)</option>
          </select>
        </div>
        <div className={cargo === 'Outro' ? 'block' : 'hidden'}>
          <Label>Especificar Função</Label>
          <Input
            value={funcaoEspec}
            onChange={(e) => setFuncaoEspec(e.target.value)}
            placeholder="Qual outra função?"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Tipo de Vínculo</Label>
          <select
            value={tipoVinculo}
            onChange={(e) => setTipoVinculo(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Contratado">Contratado</option>
            <option value="Efetivo">Efetivo</option>
            <option value="Nomeado">Nomeado</option>
            <option value="Outro">Outro (especificar)</option>
          </select>
        </div>
        <div className={tipoVinculo === 'Outro' ? 'block' : 'hidden'}>
          <Label>Especificar Vínculo</Label>
          <Input
            value={tipoVinculoEspec}
            onChange={(e) => setTipoVinculoEspec(e.target.value)}
            placeholder="Qual outro tipo?"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Status Funcional</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="ativo">Ativo</option>
            <option value="afastado">Afastado</option>
            <option value="desligado">Desligado</option>
            <option value="suspenso">Suspenso</option>
          </select>
        </div>
      </div>
    </div>
  )
}
