'use client'

import React from 'react'
import { useAlunoForm } from '../context/AlunoFormContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, Loader2, Trash2, User, FileText, Users } from 'lucide-react'
import { formatNameTitleCase } from '@/lib/stringUtils'

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
    handleRemoverFoto,
    isCompressingPhoto,
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
    <div className="space-y-6 py-2">
      {/* 1. Identificação Básica */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <User className="w-4 h-4 text-highlight" />
          Identificação Básica do Estudante
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Nome Completo do Aluno *</Label>
              <Input 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                onBlur={() => setNome(formatNameTitleCase(nome))}
                placeholder="Nome do Aluno" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Número de Matrícula</Label>
              <Input 
                value={alunoEditar?.numero_matricula || 'Gerado ao salvar'} 
                className="h-8 bg-[#181818] text-muted-foreground border-borderCustom cursor-not-allowed font-mono text-center font-bold text-xs" 
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Data de Nascimento</Label>
              <Input 
                type="date" 
                value={nascimento} 
                onChange={(e) => setNascimento(e.target.value)} 
                className="h-8 bg-[#181818] border-borderCustom text-xs text-foreground" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Código INEP (Censo)</Label>
              <Input 
                value={censo} 
                onChange={(e) => setCenso(e.target.value)} 
                placeholder="87426482" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-medium">CPF do Aluno</Label>
                {cpf.trim().length > 0 && (
                  <span 
                    data-status={isCpfValid ? 'valid' : 'invalid'}
                    className={`text-[10px] font-semibold ${isCpfValid ? 'cpf-valid text-emerald-400' : 'text-rose-400'}`}
                  >
                    {isCpfValid ? '✓ Válido' : '✕ Inválido'}
                  </span>
                )}
              </div>
              <Input 
                value={cpf} 
                onChange={(e) => setCpf(e.target.value)} 
                placeholder="000.000.000-00" 
                className={`h-8 bg-[#181818] border-borderCustom text-xs ${
                  cpf.trim().length > 0 && !isCpfValid ? 'border-rose-500/60 focus:border-rose-500' : ''
                }`} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Estado Civil</Label>
              <Select value={estadoCivil} onValueChange={(val) => setEstadoCivil(val || 'Solteiro')}>
                <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                  <SelectItem value="Solteiro">Solteiro</SelectItem>
                  <SelectItem value="Casado">Casado</SelectItem>
                  <SelectItem value="Não declarado">Não declarado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Telefone do Aluno</Label>
              <Input 
                value={telefone} 
                onChange={(e) => setTelefone(e.target.value)} 
                placeholder="(75) 99999-0000" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Cor / Raça</Label>
              <Select value={corRaca} onValueChange={(val) => setCorRaca(val || '')}>
                <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                  <SelectItem value="Branca">Branca</SelectItem>
                  <SelectItem value="Preta">Preta</SelectItem>
                  <SelectItem value="Parda">Parda</SelectItem>
                  <SelectItem value="Indígena">Indígena</SelectItem>
                  <SelectItem value="Amarela">Amarela</SelectItem>
                  <SelectItem value="Não declarado">Não declarado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Sexo</Label>
              <Select value={sexo} onValueChange={(val) => setSexo(val || '')}>
                <SelectTrigger className="h-8 bg-[#181818] border-borderCustom text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-borderCustom text-foreground text-xs">
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Documentos Pessoais */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <FileText className="w-4 h-4 text-highlight" />
          Documentos & Registro Civil
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Nº Identidade (RG)</Label>
              <Input 
                value={rg} 
                onChange={(e) => setRg(e.target.value)} 
                placeholder="0908272363" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Nº do NIS</Label>
              <Input 
                value={nis} 
                onChange={(e) => setNis(e.target.value)} 
                placeholder="817873766358" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Nº Cartão do SUS</Label>
              <Input 
                value={sus} 
                onChange={(e) => setSus(e.target.value)} 
                placeholder="43287492838" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Certidão de Nascimento (Modelo antigo ou matrícula civil)</Label>
            <Input 
              value={certidao} 
              onChange={(e) => setCertidao(e.target.value)} 
              placeholder="82882728929824415" 
              className="h-8 bg-[#181818] border-borderCustom text-xs" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Nacionalidade</Label>
              <Input 
                value={nacionalidade} 
                onChange={(e) => setNacionalidade(e.target.value)} 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Cidade de Nasc.</Label>
              <Input 
                value={cidadeNasc} 
                onChange={(e) => setCidadeNasc(e.target.value)} 
                onBlur={() => setCidadeNasc(formatNameTitleCase(cidadeNasc))}
                placeholder="Salvador" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">UF Nasc.</Label>
              <Input 
                value={ufNasc} 
                maxLength={2}
                onChange={(e) => setUfNasc(e.target.value.toUpperCase())} 
                placeholder="BA" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filiação e Contato */}
      <div className="p-4 rounded-xl bg-background border border-borderCustom space-y-4">
        <div className="flex items-center gap-2 pb-2.5 border-b border-borderCustom text-highlight font-bold text-xs uppercase tracking-wider">
          <Users className="w-4 h-4 text-highlight" />
          Filiação & Contatos dos Responsáveis
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Nome da Mãe *</Label>
              <Input 
                value={mae} 
                onChange={(e) => setMae(e.target.value)} 
                onBlur={() => setMae(formatNameTitleCase(mae))}
                placeholder="Nome Completo da Mãe" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Telefone da Mãe</Label>
              <Input 
                value={telMae} 
                onChange={(e) => setTelMae(e.target.value)} 
                placeholder="(75) 98237-4736" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Nome do Pai</Label>
              <Input 
                value={pai} 
                onChange={(e) => setPai(e.target.value)} 
                onBlur={() => setPai(formatNameTitleCase(pai))}
                placeholder="Nome Completo do Pai" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Telefone do Pai</Label>
              <Input 
                value={telPai} 
                onChange={(e) => setTelPai(e.target.value)} 
                placeholder="(75) 98882-7645" 
                className="h-8 bg-[#181818] border-borderCustom text-xs" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
