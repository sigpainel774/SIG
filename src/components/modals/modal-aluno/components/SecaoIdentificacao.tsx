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
    isCpfValid,
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
    <div className="space-y-4">
      {/* Foto 3x4 Upload */}
      <div className="student-edit-modal__photo-card photo-upload-card flex items-center gap-4 p-4 rounded-xl bg-white border border-[#D1D5DB]">
        <div 
          onClick={() => document.getElementById('modalFotoAlunoInput')?.click()}
          className="photo-upload-circle w-20 h-20 rounded-full bg-[#F8FAFC] border-2 border-[#0067C0] text-[#0067C0] flex items-center justify-center overflow-hidden cursor-pointer hover:bg-[#E8F1FB] transition-colors"
        >
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto Aluno" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-[#0067C0]" />
          )}
        </div>
        <div>
          <Label className="text-sm font-semibold text-[#1F2937]">Foto 3x4 do Aluno</Label>
          <p className="text-xs text-[#6B7280] mt-0.5">Clique no círculo para selecionar a imagem.</p>
          <input 
            id="modalFotoAlunoInput" 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFotoUpload} 
          />
        </div>
      </div>

      {/* 1. Identificação Básica */}
      <div className="student-edit-modal__section student-section-card p-5 rounded-xl bg-white border border-[#D1D5DB]">
        <div className="student-edit-modal__section-title section-title text-[#0067C0] font-bold text-base tracking-[0.01em] pb-2.5 mb-3 border-b border-[#D1D5DB]">
          1. Identificação Básica
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <Label className="text-xs text-muted-foreground font-medium">Nome Completo do Aluno *</Label>
              <Input 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                placeholder="Nome do Aluno" 
                className="mt-1" 
                required
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Número de Matrícula</Label>
              <Input 
                value={alunoEditar?.numero_matricula || 'Gerado ao salvar'} 
                className="mt-1 bg-muted text-muted-foreground border-input cursor-not-allowed font-mono text-center font-bold" 
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Data de Nascimento</Label>
              <Input 
                type="date" 
                value={nascimento} 
                onChange={(e) => setNascimento(e.target.value)} 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Código INEP (Censo)</Label>
              <Input 
                value={censo} 
                onChange={(e) => setCenso(e.target.value)} 
                placeholder="87426482" 
                className="mt-1" 
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-medium">CPF do Aluno</Label>
                {cpf.trim().length > 0 && (
                  <span 
                    data-status={isCpfValid ? 'valid' : 'invalid'}
                    className={`text-[10px] font-semibold ${isCpfValid ? 'cpf-valid text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
                  >
                    {isCpfValid ? '✓ CPF Válido' : '✕ CPF Inválido'}
                  </span>
                )}
              </div>
              <Input 
                value={cpf} 
                onChange={(e) => setCpf(e.target.value)} 
                placeholder="000.000.000-00" 
                className={`mt-1 ${
                  cpf.trim().length > 0 && !isCpfValid ? 'border-rose-500/60 focus:border-rose-500' : ''
                }`} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Estado Civil</Label>
              <Select value={estadoCivil} onValueChange={(val) => setEstadoCivil(val || 'Solteiro')}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solteiro">Solteiro</SelectItem>
                  <SelectItem value="Casado">Casado</SelectItem>
                  <SelectItem value="Não declarado">Não declarado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Telefone do Aluno</Label>
              <Input 
                value={telefone} 
                onChange={(e) => setTelefone(e.target.value)} 
                placeholder="(75) 99999-0000" 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Cor / Raça</Label>
              <Select value={corRaca} onValueChange={(val) => setCorRaca(val || '')}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
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
              <Label className="text-xs text-muted-foreground font-medium">Sexo</Label>
              <Select value={sexo} onValueChange={(val) => setSexo(val || '')}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
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
      <div className="student-edit-modal__section student-section-card p-5 rounded-xl bg-white border border-[#D1D5DB]">
        <div className="student-edit-modal__section-title section-title text-[#0067C0] font-bold text-base tracking-[0.01em] pb-2.5 mb-3 border-b border-[#D1D5DB]">
          3. Documentos
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Nº Identidade (RG)</Label>
              <Input 
                value={rg} 
                onChange={(e) => setRg(e.target.value)} 
                placeholder="0908272363" 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Nº do NIS</Label>
              <Input 
                value={nis} 
                onChange={(e) => setNis(e.target.value)} 
                placeholder="817873766358" 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Nº Cartão do SUS</Label>
              <Input 
                value={sus} 
                onChange={(e) => setSus(e.target.value)} 
                placeholder="43287492838" 
                className="mt-1" 
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-medium">Certidão de Nascimento (Modelo antigo ou número de matrícula)</Label>
            <Input 
              value={certidao} 
              onChange={(e) => setCertidao(e.target.value)} 
              placeholder="82882728929824415" 
              className="mt-1" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Nacionalidade</Label>
              <Input 
                value={nacionalidade} 
                onChange={(e) => setNacionalidade(e.target.value)} 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Cidade de Nasc.</Label>
              <Input 
                value={cidadeNasc} 
                onChange={(e) => setCidadeNasc(e.target.value)} 
                placeholder="Salvador" 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">UF Nasc.</Label>
              <Input 
                value={ufNasc} 
                maxLength={2}
                onChange={(e) => setUfNasc(e.target.value.toUpperCase())} 
                placeholder="BA" 
                className="mt-1" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Filiação e Contato */}
      <div className="student-edit-modal__section student-section-card p-5 rounded-xl bg-white border border-[#D1D5DB]">
        <div className="student-edit-modal__section-title section-title text-[#0067C0] font-bold text-base tracking-[0.01em] pb-2.5 mb-3 border-b border-[#D1D5DB]">
          4. Filiação e Contato
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground font-medium">Nome da Mãe *</Label>
              <Input 
                value={mae} 
                onChange={(e) => setMae(e.target.value)} 
                placeholder="Nome Completo da Mãe" 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Telefone da Mãe</Label>
              <Input 
                value={telMae} 
                onChange={(e) => setTelMae(e.target.value)} 
                placeholder="(75) 98237-4736" 
                className="mt-1" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground font-medium">Nome do Pai</Label>
              <Input 
                value={pai} 
                onChange={(e) => setPai(e.target.value)} 
                placeholder="Nome Completo do Pai" 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-medium">Telefone do Pai</Label>
              <Input 
                value={telPai} 
                onChange={(e) => setTelPai(e.target.value)} 
                placeholder="(75) 98882-7645" 
                className="mt-1" 
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground font-medium">Endereço Completo (Rua, Nº, Bairro)</Label>
            <Input 
              value={endereco} 
              onChange={(e) => setEndereco(e.target.value)} 
              placeholder="Endereço Completo" 
              className="mt-1" 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

