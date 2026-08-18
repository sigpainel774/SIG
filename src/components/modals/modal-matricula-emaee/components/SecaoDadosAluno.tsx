'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Search, CheckCircle2, User, Loader2, Camera } from 'lucide-react'

export function SecaoDadosAluno() {
  const {
    searchLoading,
    alunosEncontrados,
    alunoSelecionado,
    handleSelectAluno,
    handleSearchAluno,
    searchTerm,
    setSearchTerm,

    fotoUrl,
    handleFotoUpload,

    nomeCompleto, setNomeCompleto,
    dataNascimento, setDataNascimento,
    cpf, setCpf,
    identificacaoCenso, setIdentificacaoCenso,
    rg, setRg,
    nis, setNis,
    certidaoNascimento, setCertidaoNascimento,
    corRaca, setCorRaca,
    sexo, setSexo,
    cidadeNascimento, setCidadeNascimento,
    estadoNascimento, setEstadoNascimento,
    nomeMae, setNomeMae,
    profissaoMae, setProfissaoMae,
    nomePai, setNomePai,
    profissaoPai, setProfissaoPai,
    endereco, setEndereco,
    zonaResidencial, setZonaResidencial,
    contatoEmergencia, setContatoEmergencia,
    telefoneEmergencia, setTelefoneEmergencia,
    turnoAtendimento, setTurnoAtendimento
  } = useMatriculaEmaeeContext()

  return (
    <section className="overflow-hidden border border-border rounded-2xl bg-card shadow-sm dark:bg-gradient-to-b dark:from-[#1a202c]/95 dark:to-[#121621]/95 dark:shadow-xl [&_label]:text-foreground [&_legend]:text-foreground [&_input]:bg-input [&_select]:bg-input [&_fieldset]:bg-muted/50 dark:[&_fieldset]:bg-[#0b0e14]/40">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-border bg-muted/40 dark:bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 font-extrabold text-sm text-primary">
          02
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">Dados do aluno</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Localize o aluno cadastrado no SIG para auto-preencher seus dados pessoais e evitar duplicações.</p>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-5">
        {/* Campo de Busca viva de Aluno */}
        <div className="relative">
          <Label className="block mb-1.5 text-xs font-bold text-foreground">
            Buscar aluno no SIG <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Digite o nome, CPF ou identificação do Censo para buscar..."
              value={searchTerm}
              onChange={(e) => handleSearchAluno(e.target.value)}
              className="pl-10 pr-10 bg-input border-border text-foreground text-sm rounded-xl"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            O resultado selecionado fornecerá os dados do aluno. Selecione na lista abaixo.
          </p>

          {/* Dropdown de Alunos Encontrados */}
          {alunosEncontrados.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-border">
              {alunosEncontrados.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleSelectAluno(a)}
                  className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-primary/10 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-primary" />
                    <div>
                      <span className="font-bold text-foreground block">{a.nome}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {a.cpf ? `CPF: ${a.cpf}` : 'Sem CPF'} | Mãe: {a.nome_mae ?? 'Não inf.'}
                      </span>
                    </div>
                  </div>
                  <span className="text-primary font-semibold text-[11px]">Selecionar</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card Aluno Selecionado */}
        {alunoSelecionado && (
          <div className="flex items-center gap-3 p-3 border border-primary/30 rounded-xl bg-primary/10">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">Aluno Vinculado: {alunoSelecionado.nome}</span>
              <span className="text-[11px] text-muted-foreground block truncate">ID do Aluno: {alunoSelecionado.id}</span>
            </div>
          </div>
        )}

        {/* Upload / Captura de Foto 3x4 do Aluno */}
        <div className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/50 dark:bg-[#121621] border border-border">
          <div 
            onClick={() => document.getElementById('modalFotoEmaeeInput')?.click()}
            className="w-20 h-20 rounded-full bg-card dark:bg-[#0b0e14] border-2 border-primary flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          >
            {fotoUrl ? (
              <img src={fotoUrl} alt="Foto 3x4 do Aluno" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <Label className="text-xs font-bold text-foreground block">Foto 3x4 do Aluno</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Clique no círculo para selecionar um arquivo ou capturar pela câmera.
            </p>
            <button
              type="button"
              onClick={() => document.getElementById('modalFotoEmaeeInput')?.click()}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              {fotoUrl ? 'Alterar Foto 3x4' : 'Capturar/Enviar Foto 3x4'}
            </button>
            <input 
              id="modalFotoEmaeeInput" 
              type="file" 
              accept="image/*" 
              capture="user"
              className="hidden" 
              onChange={handleFotoUpload} 
            />
          </div>
        </div>

        {/* Subseção 1: Identificação */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-extrabold text-primary uppercase tracking-wider">Identificação</span>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          <div className="grid grid-cols-12 gap-3.5">
            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Nome completo <span className="text-rose-500">*</span></Label>
              <Input
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
                required
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Data de nascimento</Label>
              <Input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-slate-200">CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Identificação única (Censo)</Label>
              <Input
                value={identificacaoCenso}
                onChange={(e) => setIdentificacaoCenso(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Carteira de identidade (RG)</Label>
              <Input
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Nº de Identificação Social (NIS)</Label>
              <Input
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Certidão de nascimento (modelo novo)</Label>
              <Input
                value={certidaoNascimento}
                onChange={(e) => setCertidaoNascimento(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>

            {/* Cor / Raça */}
            <div className="col-span-12 md:col-span-8">
              <fieldset className="p-3 border border-border rounded-xl bg-[#0b0e14]/40">
                <legend className="px-1 text-xs font-bold text-slate-200">Cor / raça</legend>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['Branco', 'Pardo', 'Preto', 'Amarelo', 'Indígena'].map((item) => (
                    <label key={item} className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                      corRaca === item
                        ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                        : 'border-border bg-input text-foreground/80 hover:border-primary/40'
                    }`}>
                      <input
                        type="radio"
                        name="cor_raca"
                        value={item}
                        checked={corRaca === item}
                        onChange={() => setCorRaca(item)}
                        className="accent-primary"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {/* Sexo */}
            <div className="col-span-12 md:col-span-4">
              <fieldset className="p-3 border border-border rounded-xl bg-[#0b0e14]/40 h-full flex flex-col justify-center">
                <legend className="px-1 text-xs font-bold text-slate-200">Sexo</legend>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['Feminino', 'Masculino'].map((s) => (
                    <label key={s} className={`flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                      sexo === s
                        ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                        : 'border-border bg-input text-foreground/80 hover:border-primary/40'
                    }`}>
                      <input
                        type="radio"
                        name="sexo"
                        value={s}
                        checked={sexo === s}
                        onChange={() => setSexo(s)}
                        className="accent-primary"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="col-span-12 md:col-span-7">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Cidade de nascimento</Label>
              <Input
                value={cidadeNascimento}
                onChange={(e) => setCidadeNascimento(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-5">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Estado de nascimento</Label>
              <select
                value={estadoNascimento}
                onChange={(e) => setEstadoNascimento(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 border border-border rounded-xl outline-none bg-[#121621] text-foreground text-sm focus:border-[#3ea6ff]"
              >
                <option value="">Selecione a UF</option>
                {['BA', 'AL', 'AM', 'AP', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Subseção 2: Família e contato */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-extrabold text-primary uppercase tracking-wider">Família e contato</span>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          <div className="grid grid-cols-12 gap-3.5">
            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Nome da mãe</Label>
              <Input
                value={nomeMae}
                onChange={(e) => setNomeMae(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Profissão da mãe</Label>
              <Input
                value={profissaoMae}
                onChange={(e) => setProfissaoMae(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Nome do pai</Label>
              <Input
                value={nomePai}
                onChange={(e) => setNomePai(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Profissão do pai</Label>
              <Input
                value={profissaoPai}
                onChange={(e) => setProfissaoPai(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Endereço</Label>
              <Input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <fieldset className="p-2.5 border border-border rounded-xl bg-[#0b0e14]/40 h-full flex flex-col justify-center">
                <legend className="px-1 text-xs font-bold text-slate-200">Zona residencial</legend>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['Rural', 'Urbana'].map((z) => (
                    <label key={z} className={`flex items-center gap-1.5 cursor-pointer px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                      zonaResidencial === z
                        ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                        : 'border-border bg-input text-foreground/80 hover:border-primary/40'
                    }`}>
                      <input
                        type="radio"
                        name="zona_residencial"
                        value={z}
                        checked={zonaResidencial === z}
                        onChange={() => setZonaResidencial(z)}
                        className="accent-primary"
                      />
                      {z}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Contato em caso de emergência</Label>
              <Input
                value={contatoEmergencia}
                onChange={(e) => setContatoEmergencia(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-slate-200">Telefone</Label>
              <Input
                placeholder="(75) 00000-0000"
                value={telefoneEmergencia}
                onChange={(e) => setTelefoneEmergencia(e.target.value)}
                className="bg-[#121621] border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12">
              <fieldset className="p-3 border border-border rounded-xl bg-[#0b0e14]/40">
                <legend className="px-1 text-xs font-bold text-slate-200">
                  Turno da matrícula para atendimento <span className="text-rose-500">*</span>
                </legend>
                <div className="flex flex-wrap gap-3 mt-1">
                  {['Matutino', 'Vespertino'].map((t) => (
                    <label key={t} className={`flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      turnoAtendimento === t
                        ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                        : 'border-border bg-input text-foreground/80 hover:border-primary/40'
                    }`}>
                      <input
                        type="radio"
                        name="turno_atendimento"
                        value={t}
                        checked={turnoAtendimento === t}
                        onChange={() => setTurnoAtendimento(t)}
                        className="accent-primary"
                        required
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
