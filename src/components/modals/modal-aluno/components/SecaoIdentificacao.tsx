'use client'

import React from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera } from 'lucide-react'

export function SecaoIdentificacao() {
  const {
    nome, setNome,
    alunoEditar,
    nascimento, setNascimento,
    censo, setCenso,
    cpf, setCpf,
    estadoCivil, setEstadoCivil,
    telefone, setTelefone,
    corRaca, setCorRaca,
    sexo, setSexo,
    fotoUrl, handleFotoUpload,
    rg, setRg,
    nis, setNis,
    sus, setSus,
    certidao, setCertidao,
    nacionalidade, setNacionalidade,
    cidadeNasc, setCidadeNasc,
    ufNasc, setUfNasc,
    mae, setMae,
    telMae, setTelMae,
    pai, setPai,
    telPai, setTelPai,
    endereco, setEndereco
  } = useAlunoForm()

  return (
    <div className="space-y-6">
      {/* 1. Identificação Básica */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          1. Identificação Básica
        </div>

        {/* Foto 3x4 Upload */}
        <div className="flex items-center gap-4 p-3 mb-4 rounded-xl bg-[#121212] border border-[#2a2a2a]">
          <div 
            onClick={() => document.getElementById('modalFotoAlunoInput')?.click()}
            className="w-20 h-20 rounded-full bg-[#181818] border-2 border-[#3ea6ff] flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          >
            {fotoUrl ? (
              <img src={fotoUrl} alt="Foto Aluno" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <Label className="text-sm font-semibold text-white">Foto 3x4 do Aluno</Label>
            <p className="text-xs text-gray-400 mt-0.5">Clique no círculo para selecionar a imagem.</p>
            <input 
              id="modalFotoAlunoInput" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFotoUpload} 
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <Label className="text-xs text-gray-300">Nome Completo do Aluno *</Label>
              <Input 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                placeholder="Nome do Aluno" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1 focus:border-[#3ea6ff]" 
                required
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Número de Matrícula</Label>
              <Input 
                value={alunoEditar?.numero_matricula || 'Gerado ao salvar'} 
                className="bg-[#1a1a1a] border-[#2a2a2a] text-[#888] mt-1 cursor-not-allowed font-mono text-center font-bold" 
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-300">Data de Nascimento</Label>
              <Input 
                type="date" 
                value={nascimento} 
                onChange={(e) => setNascimento(e.target.value)} 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Código INEP (Censo)</Label>
              <Input 
                value={censo} 
                onChange={(e) => setCenso(e.target.value)} 
                placeholder="87426482" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">CPF do Aluno</Label>
              <Input 
                value={cpf} 
                onChange={(e) => setCpf(e.target.value)} 
                placeholder="000.000.000-00" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-gray-300">Estado Civil</Label>
              <Select value={estadoCivil} onValueChange={(val) => setEstadoCivil(val || 'Solteiro')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Solteiro">Solteiro</SelectItem>
                  <SelectItem value="Casado">Casado</SelectItem>
                  <SelectItem value="Não declarado">Não declarado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Telefone do Aluno</Label>
              <Input 
                value={telefone} 
                onChange={(e) => setTelefone(e.target.value)} 
                placeholder="(75) 99999-0000" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Cor / Raça</Label>
              <Select value={corRaca} onValueChange={(val) => setCorRaca(val || '')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Branca">Branca</SelectItem>
                  <SelectItem value="Preta">Preta</SelectItem>
                  <SelectItem value="Parda">Parda</SelectItem>
                  <SelectItem value="Indígena">Indígena</SelectItem>
                  <SelectItem value="Amarela">Amarela</SelectItem>
                  <SelectItem value="Não declarado">Não declarado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-300">Sexo</Label>
              <Select value={sexo} onValueChange={(val) => setSexo(val || '')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Documentos */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          3. Documentos
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-300">Nº Identidade (RG)</Label>
              <Input 
                value={rg} 
                onChange={(e) => setRg(e.target.value)} 
                placeholder="0908272363" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Nº do NIS</Label>
              <Input 
                value={nis} 
                onChange={(e) => setNis(e.target.value)} 
                placeholder="817873766358" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Nº Cartão do SUS</Label>
              <Input 
                value={sus} 
                onChange={(e) => setSus(e.target.value)} 
                placeholder="43287492838" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-300">Certidão de Nascimento (Modelo antigo ou número de matrícula)</Label>
            <Input 
              value={certidao} 
              onChange={(e) => setCertidao(e.target.value)} 
              placeholder="82882728929824415" 
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-gray-300">Nacionalidade</Label>
              <Input 
                value={nacionalidade} 
                onChange={(e) => setNacionalidade(e.target.value)} 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Cidade de Nasc.</Label>
              <Input 
                value={cidadeNasc} 
                onChange={(e) => setCidadeNasc(e.target.value)} 
                placeholder="Salvador" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">UF Nasc.</Label>
              <Input 
                value={ufNasc} 
                maxLength={2}
                onChange={(e) => setUfNasc(e.target.value.toUpperCase())} 
                placeholder="BA" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filiação e Contato */}
      <div>
        <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
          4. Filiação e Contato
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs text-gray-300">Nome da Mãe *</Label>
              <Input 
                value={mae} 
                onChange={(e) => setMae(e.target.value)} 
                placeholder="Nome Completo da Mãe" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Telefone da Mãe</Label>
              <Input 
                value={telMae} 
                onChange={(e) => setTelMae(e.target.value)} 
                placeholder="(75) 98237-4736" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs text-gray-300">Nome do Pai</Label>
              <Input 
                value={pai} 
                onChange={(e) => setPai(e.target.value)} 
                placeholder="Nome Completo do Pai" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-300">Telefone do Pai</Label>
              <Input 
                value={telPai} 
                onChange={(e) => setTelPai(e.target.value)} 
                placeholder="(75) 98882-7645" 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-300">Endereço Completo (Rua, Nº, Bairro)</Label>
            <Input 
              value={endereco} 
              onChange={(e) => setEndereco(e.target.value)} 
              placeholder="Endereço Completo" 
              className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
