'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useFuncionarioForm } from '../context/FuncionarioFormContext'
import { useSchoolStore } from '@/store/useSchoolStore'

export function PessoaisTab() {
  const {
    nome, setNome,
    apelido, setApelido,
    telefone, setTelefone,
    telefoneEmergencia, setTelefoneEmergencia,
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

  const selectedSecretaria = useSchoolStore((state) => state.selectedSecretaria)
  const isSaude = selectedSecretaria?.nome?.toLowerCase().includes('saúde') || false

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Label>Nome Completo *</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo conforme documentos"
            className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
            required
          />
        </div>
        <div>
          <Label>Apelido / Conhecido por</Label>
          <Input
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            placeholder="Ex: Zezinho, Prof. Léo"
            className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
          />
        </div>
        <div>
          <Label>Telefone / Celular</Label>
          <Input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(75) 99999-8888"
            className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Telefone de Emergência</Label>
          <Input
            value={telefoneEmergencia}
            onChange={(e) => setTelefoneEmergencia(e.target.value)}
            placeholder="(75) 98888-7777 (Contato)"
            className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
          />
        </div>
        {!isSaude && (
          <div>
            <Label>Identificação CENSO (INEP)</Label>
            <Input
              value={censo}
              onChange={(e) => setCenso(e.target.value)}
              placeholder="Código INEP do Professor"
              className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
            />
          </div>
        )}
        <div>
          <Label>E-mail de Login *</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="maria@escola.com"
            className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
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
            className="w-full h-10 px-3 rounded-md bg-background dark:bg-[#181818] border border-input text-foreground text-sm outline-none mt-1"
          >
            <option value="Não declarado" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Não declarado</option>
            <option value="Feminino" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Feminino</option>
            <option value="Masculino" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Masculino</option>
            <option value="Outro" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Outro</option>
          </select>
        </div>
        <div>
          <Label>Estado Civil</Label>
          <select
            value={estadoCivil}
            onChange={(e) => setEstadoCivil(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background dark:bg-[#181818] border border-input text-foreground text-sm outline-none mt-1"
          >
            <option value="Não declarado" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Não declarado</option>
            <option value="Solteiro" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Solteiro(a)</option>
            <option value="Casado" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Casado(a)</option>
            <option value="Separado" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Separado(a)</option>
            <option value="Divorciado" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Divorciado(a)</option>
            <option value="Viúvo" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Viúvo(a)</option>
          </select>
        </div>
        <div>
          <Label>Cor / Raça</Label>
          <select
            value={corRaca}
            onChange={(e) => setCorRaca(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background dark:bg-[#181818] border border-input text-foreground text-sm outline-none mt-1"
          >
            <option value="Não declarado" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Não declarado</option>
            <option value="Branca" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Branca</option>
            <option value="Preta" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Preta</option>
            <option value="Parda" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Parda</option>
            <option value="Amarela" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Amarela</option>
            <option value="Indígena" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Indígena</option>
          </select>
        </div>
        <div>
          <Label>Data de Nascimento</Label>
          <Input
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
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
            className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
          />
        </div>
        <div>
          <Label>Nome do Pai</Label>
          <Input
            value={nomePai}
            onChange={(e) => setNomePai(e.target.value)}
            placeholder="Nome completo do pai"
            className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Nacionalidade</Label>
          <select
            value={nacionalidade}
            onChange={(e) => setNacionalidade(e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-background dark:bg-[#181818] border border-input text-foreground text-sm outline-none mt-1"
          >
            <option value="Brasileira" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Brasileira</option>
            <option value="Brasileira exterior" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Naturalizado / Nascido no exterior</option>
            <option value="Estrangeira" className="text-zinc-900 dark:text-white bg-white dark:bg-[#181818]">Estrangeira</option>
          </select>
        </div>
        <div className={nacionalidade === 'Estrangeira' ? 'block' : 'hidden'}>
          <Label>Especifique País</Label>
          <Input
            value={nacionalidadeEspec}
            onChange={(e) => setNacionalidadeEspec(e.target.value)}
            placeholder="Qual país?"
            className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
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
                className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
              />
            </div>
            <div>
              <Label>UF Nascimento</Label>
              <Input
                value={ufNasc}
                onChange={(e) => setUfNasc(e.target.value.toUpperCase())}
                placeholder="Ex: BA"
                maxLength={2}
                className="bg-background dark:bg-[#181818] border-input text-foreground mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
