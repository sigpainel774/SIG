import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPin, Plus } from 'lucide-react'
import { useFuncionarioForm } from '../context/FuncionarioFormContext'

export function EmpregoTab() {
  const {
    cargo, setCargo,
    cargaHoraria, setCargaHoraria,
    funcaoEspec, setFuncaoEspec,
    tipoVinculo, setTipoVinculo,
    tipoVinculoEspec, setTipoVinculoEspec,
    modalidadeEnsino, setModalidadeEnsino,
    dataAdmissao, setDataAdmissao,
    status, setStatus,
    cargos,
    isEditing,
    setLotacoesModalOpen,
  } = useFuncionarioForm()

  return (
    <div className="space-y-5">
      {/* Botão '+' / Banner de Gestão de Lotações */}
      {isEditing && (
        <div className="bg-[#18181a] border border-borderCustom rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#3ea6ff] uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              Lotações e Vínculos Escolares
            </div>
            <Button
              type="button"
              onClick={() => setLotacoesModalOpen(true)}
              className="bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold text-xs h-8 px-3 gap-1.5 cursor-pointer border-none"
            >
              <Plus className="w-4 h-4" />
              Adicionar Lotação
            </Button>
          </div>
          <p className="text-xs text-zinc-400">
            Adicione ou altere vínculos deste servidor em diferentes unidades escolares, ajustando a carga horária semanal (ex: 20h) e a modalidade (Regular ou EJA).
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cargo === 'Outro' ? 'md:col-span-1' : 'md:col-span-2'}>
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

        <div>
          <Label>Carga Horária (h/semana)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={cargaHoraria}
            onChange={(e) => setCargaHoraria(e.target.value)}
            placeholder="Ex: 20, 30, 40"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Label>Modalidade de Atuação</Label>
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
          <Label>Data de Admissão</Label>
          <Input
            type="date"
            value={dataAdmissao}
            onChange={(e) => setDataAdmissao(e.target.value)}
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
