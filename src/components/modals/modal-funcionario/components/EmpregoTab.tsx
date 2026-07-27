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
    modalidadeEnsino, setModalidadeEnsino,
    status, setStatus,
    cargos,
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
            {cargos.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
            {/* Fallback para cargos antigos não listados no banco */}
            {cargo && !cargos.some(c => c.nome === cargo) && cargo !== 'Outro' && (
              <option value={cargo}>{cargo}</option>
            )}
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
          <Label>Modalidade de Atuação / Ensino</Label>
          <select
            value={modalidadeEnsino}
            onChange={(e) => setModalidadeEnsino(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1 font-medium"
          >
            <option value="Regular">Regular (Ensino Regular)</option>
            <option value="EJA">EJA (Educação de Jovens e Adultos)</option>
          </select>
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
