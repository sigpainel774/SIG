'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useFuncionarioForm } from '../context/FuncionarioFormContext'

export function PessoaisTab() {
  const {
    nome, setNome,
    censo, setCenso,
    email, setEmail,
    isEditing,
    sexo, setSexo,
    estadoCivil, setEstadoCivil,
    corRaca, setCorRaca,
    nascimento, setNascimento,
    nomeMae, setNomeMae,
    nomePai, setNomePai,
    nacionalidade, setNacionalidade,
    nacionalidadeEspec, setNacionalidadeEspec,
    municipioNasc, setMunicipioNasc,
    ufNasc, setUfNasc,
  } = useFuncionarioForm()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Label>Nome Completo *</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo conforme documentos"
            className="bg-[#181818] border-borderCustom text-white mt-1"
            required
          />
        </div>
        <div>
          <Label>Identificação CENSO (INEP)</Label>
          <Input
            value={censo}
            onChange={(e) => setCenso(e.target.value)}
            placeholder="Código INEP do Professor"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>E-mail de Login *</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@escola.com"
            className="bg-[#181818] border-borderCustom text-white mt-1"
            required
            disabled={isEditing}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Sexo</Label>
          <select
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Não declarado">Não declarado</option>
            <option value="Feminino">Feminino</option>
            <option value="Masculino">Masculino</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div>
          <Label>Estado Civil</Label>
          <select
            value={estadoCivil}
            onChange={(e) => setEstadoCivil(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Não declarado">Não declarado</option>
            <option value="Solteiro">Solteiro(a)</option>
            <option value="Casado">Casado(a)</option>
            <option value="Separado">Separado(a)</option>
            <option value="Divorciado">Divorciado(a)</option>
            <option value="Viúvo">Viúvo(a)</option>
          </select>
        </div>
        <div>
          <Label>Cor / Raça</Label>
          <select
            value={corRaca}
            onChange={(e) => setCorRaca(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Não declarado">Não declarado</option>
            <option value="Branca">Branca</option>
            <option value="Preta">Preta</option>
            <option value="Parda">Parda</option>
            <option value="Amarela">Amarela</option>
            <option value="Indígena">Indígena</option>
          </select>
        </div>
        <div>
          <Label>Data de Nascimento</Label>
          <Input
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Nome da Mãe</Label>
          <Input
            value={nomeMae}
            onChange={(e) => setNomeMae(e.target.value)}
            placeholder="Nome completo da mãe"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div>
          <Label>Nome do Pai</Label>
          <Input
            value={nomePai}
            onChange={(e) => setNomePai(e.target.value)}
            placeholder="Nome completo do pai"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Nacionalidade</Label>
          <select
            value={nacionalidade}
            onChange={(e) => setNacionalidade(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
          >
            <option value="Brasileira">Brasileira</option>
            <option value="Brasileira exterior">Naturalizado / Nascido no exterior</option>
            <option value="Estrangeira">Estrangeira</option>
          </select>
        </div>
        <div className={nacionalidade === 'Estrangeira' ? 'block' : 'hidden'}>
          <Label>Especifique País</Label>
          <Input
            value={nacionalidadeEspec}
            onChange={(e) => setNacionalidadeEspec(e.target.value)}
            placeholder="Qual país?"
            className="bg-[#181818] border-borderCustom text-white mt-1"
          />
        </div>
        <div className={nacionalidade === 'Estrangeira' ? 'md:col-span-2' : 'md:col-span-3'}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Município de Nascimento</Label>
              <Input
                value={municipioNasc}
                onChange={(e) => setMunicipioNasc(e.target.value)}
                placeholder="Cidade de nascimento"
                className="bg-[#181818] border-borderCustom text-white mt-1"
              />
            </div>
            <div>
              <Label>UF Nascimento</Label>
              <Input
                value={ufNasc}
                onChange={(e) => setUfNasc(e.target.value.toUpperCase())}
                placeholder="Ex: BA"
                maxLength={2}
                className="bg-[#181818] border-borderCustom text-white mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
