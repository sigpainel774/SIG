'use client'

import React from 'react'
import { useMatriculaEmaeeContext } from '../context/MatriculaEmaeeContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle2, User, Loader2, Camera, MapPin, Search, ScanFace, Trash2, Activity } from 'lucide-react'
import { MiniMapa } from '@/components/map/MapWrapper'

export function SecaoDadosAluno() {
  const {
    fotoUrl,
    handleFotoUpload,
    handleRemoverFoto,
    setScannerOpen,

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
    
    // Endereço Residencial Estruturado
    cep, setCep,
    rua, setRua,
    numero, setNumero,
    bairro, setBairro,
    cidadeEndereco, setCidadeEndereco,
    ufEndereco, setUfEndereco,
    isFetchingCep,
    consultarCep,
    formatCEP,
    endereco, setEndereco,
    latitude, setLatitude,
    longitude, setLongitude,
    zonaResidencial, setZonaResidencial,
    
    contatoEmergencia, setContatoEmergencia,
    telefoneEmergencia, setTelefoneEmergencia,
    turnoAtendimento, setTurnoAtendimento,
    statusMatricula, setStatusMatricula,
    isEditMode,
    alunoSelecionado
  } = useMatriculaEmaeeContext()

  // Sincroniza a string consolidada de endereço ao alterar os campos estruturados
  const handleAtualizarEnderecoConsolidado = (novosDados: { rua?: string, numero?: string, bairro?: string, cidade?: string, uf?: string, cep?: string }) => {
    const r = novosDados.rua !== undefined ? novosDados.rua : rua
    const n = novosDados.numero !== undefined ? novosDados.numero : numero
    const b = novosDados.bairro !== undefined ? novosDados.bairro : bairro
    const c = novosDados.cidade !== undefined ? novosDados.cidade : cidadeEndereco
    const u = novosDados.uf !== undefined ? novosDados.uf : ufEndereco
    const cp = novosDados.cep !== undefined ? novosDados.cep : cep

    const partes = [
      r.trim(),
      n.trim() ? `nº ${n.trim()}` : '',
      b.trim(),
      c.trim() ? `${c.trim()} - ${u || 'BA'}` : '',
      cp.trim() ? `CEP: ${cp.trim()}` : ''
    ].filter(Boolean)

    if (partes.length > 0) {
      setEndereco(partes.join(', '))
    }
  }

  return (
    <section className="overflow-hidden border border-border rounded-2xl bg-card shadow-sm dark:bg-gradient-to-b dark:from-[#1a202c]/95 dark:to-[#121621]/95 dark:shadow-xl [&_label]:text-foreground [&_legend]:text-foreground [&_input]:bg-input [&_select]:bg-input [&_fieldset]:bg-muted/50 dark:[&_fieldset]:bg-[#0b0e14]/40">
      <div className="flex items-start gap-3 p-4 md:p-5 border-b border-border bg-muted/40 dark:bg-white/[0.012]">
        <span className="grid place-items-center w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 font-extrabold text-sm text-primary">
          01
        </span>
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground">Dados do Aluno, Endereço e Localização</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEditMode
              ? 'Edite qualquer dado cadastral, familiar, de endereço ou geolocalização do estudante no EMAEE.'
              : 'Preencha os dados cadastrais, filiação, endereço com CEP e geolocalização do aluno no EMAEE.'}
          </p>
        </div>
      </div>

      <div className="p-4 md:p-5 space-y-5">
        {/* Se estiver no Modo Edição, exibe banner informativo do aluno */}
        {isEditMode && (
          <div className="flex items-center gap-3 p-3.5 border border-primary/40 rounded-xl bg-primary/10">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">
                Editando Ficha do Aluno: {nomeCompleto || alunoSelecionado?.nome}
              </span>
              <span className="text-[11px] text-muted-foreground block truncate">
                {cpf ? `CPF: ${cpf}` : 'Sem CPF'} {alunoSelecionado?.id ? `• ID: ${alunoSelecionado.id}` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Upload / Captura / Escaner de Foto 3x4 do Aluno */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 rounded-xl bg-muted/50 dark:bg-[#121621] border border-border">
          <div className="flex items-center gap-3">
            <div className="relative flex flex-col items-center">
              <div 
                onClick={() => document.getElementById('modalFotoEmaeeInput')?.click()}
                className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-card dark:bg-[#0b0e14] border-2 border-primary flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-85 transition-opacity flex-shrink-0 relative shadow-sm"
                title="Clique para escolher foto ou alterar"
              >
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Foto 3x4 do Aluno" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground text-center p-1">
                    <Camera className="w-6 h-6 mb-1 text-primary" />
                    <span className="text-[9px] font-bold">FOTO 3x4</span>
                  </div>
                )}
              </div>

              {fotoUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoverFoto()
                  }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center cursor-pointer text-white shadow-sm transition-colors z-10"
                  title="Remover foto"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1">
            <h4 className="text-xs font-bold text-foreground">Foto 3x4 do Estudante</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Utilizada na Ficha Oficial, Comprovante de Matrícula e Prontuário Clínico.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('modalFotoEmaeeInput')?.click()}
                className="text-xs h-7 rounded-lg border-border text-foreground hover:bg-muted font-semibold gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-primary" />
                Selecionar Foto
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setScannerOpen(true)}
                className="text-xs h-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-xs"
                title="Escanear ou fotografar foto 3x4 com a câmera"
              >
                <ScanFace className="w-3.5 h-3.5" />
                Escanear Foto 3x4
              </Button>

              <input
                id="modalFotoEmaeeInput"
                type="file"
                accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleFotoUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Formulário de Identificação do Aluno */}
        <div>
          <div className="grid grid-cols-12 gap-3.5">
            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-foreground">
                Nome completo do aluno <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Nome do aluno"
                className="bg-input border-border text-foreground text-sm rounded-xl font-medium"
                required
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-foreground">
                Data de nascimento <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
                required
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-foreground">CPF do aluno</Label>
              <Input
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-foreground">Identificação Censo (INEP)</Label>
              <Input
                placeholder="Código INEP se houver"
                value={identificacaoCenso}
                onChange={(e) => setIdentificacaoCenso(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-foreground">RG do aluno</Label>
              <Input
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-foreground">NIS (CadÚnico)</Label>
              <Input
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-foreground">Certidão de nascimento (Novo modelo)</Label>
              <Input
                placeholder="000000 00 00 0000 0 00000 000 0000000 00"
                value={certidaoNascimento}
                onChange={(e) => setCertidaoNascimento(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <fieldset className="p-3 border border-border rounded-xl bg-muted/40 dark:bg-[#0b0e14]/40 h-full flex flex-col justify-center">
                <legend className="px-1 text-xs font-bold text-foreground">Cor / Raça</legend>
                <div className="flex flex-wrap gap-2 mt-1">
                  {['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Não declarada'].map((c) => (
                    <label key={c} className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                      corRaca === c
                        ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                        : 'border-border bg-input text-foreground/80 hover:border-primary/40'
                    }`}>
                      <input
                        type="radio"
                        name="cor_raca"
                        value={c}
                        checked={corRaca === c}
                        onChange={() => setCorRaca(c)}
                        className="accent-primary"
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="col-span-12 md:col-span-6">
              <fieldset className="p-3 border border-border rounded-xl bg-muted/40 dark:bg-[#0b0e14]/40 h-full flex flex-col justify-center">
                <legend className="px-1 text-xs font-bold text-foreground">Sexo</legend>
                <div className="flex flex-wrap gap-3 mt-1">
                  {['Masculino', 'Feminino'].map((s) => (
                    <label key={s} className={`flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-lg border text-xs font-medium transition-all ${
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

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-foreground">Naturalidade (Cidade)</Label>
              <Input
                value={cidadeNascimento}
                onChange={(e) => setCidadeNascimento(e.target.value)}
                placeholder=""
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-foreground">Estado (UF)</Label>
              <Input
                value={estadoNascimento}
                onChange={(e) => setEstadoNascimento(e.target.value.toUpperCase())}
                placeholder="BA"
                maxLength={2}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            {/* Filiação */}
            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-foreground">Nome da mãe</Label>
              <Input
                value={nomeMae}
                onChange={(e) => setNomeMae(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-foreground">Profissão da mãe</Label>
              <Input
                value={profissaoMae}
                onChange={(e) => setProfissaoMae(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-foreground">Nome do pai</Label>
              <Input
                value={nomePai}
                onChange={(e) => setNomePai(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-foreground">Profissão do pai</Label>
              <Input
                value={profissaoPai}
                onChange={(e) => setProfissaoPai(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-8">
              <Label className="block mb-1 text-xs font-bold text-foreground">Nome do contato de emergência</Label>
              <Input
                placeholder="Ex: Maria dos Santos (Tia / Avó)"
                value={contatoEmergencia}
                onChange={(e) => setContatoEmergencia(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <Label className="block mb-1 text-xs font-bold text-foreground">Telefone de emergência</Label>
              <Input
                placeholder="(75) 00000-0000"
                value={telefoneEmergencia}
                onChange={(e) => setTelefoneEmergencia(e.target.value)}
                className="bg-input border-border text-foreground text-sm rounded-xl"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <fieldset className="p-2.5 border border-border rounded-xl bg-muted/40 dark:bg-[#0b0e14]/40 h-full flex flex-col justify-center">
                <legend className="px-1 text-xs font-bold text-foreground">Zona residencial</legend>
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
              <fieldset className="p-3 border border-border rounded-xl bg-muted/40 dark:bg-[#0b0e14]/40 h-full flex flex-col justify-center">
                <legend className="px-1 text-xs font-bold text-foreground">
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

            {/* SITUAÇÃO / STATUS DE ATENDIMENTO NO EMAEE */}
            <div className="col-span-12">
              <fieldset className="p-3.5 border border-border rounded-xl bg-muted/40 dark:bg-[#0b0e14]/40 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <legend className="px-1 text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    Situação / Status no EMAEE <span className="text-rose-500">*</span>
                  </legend>
                  <span className="text-[11px] text-muted-foreground">
                    Selecione a fase clínica atual do aluno para organização dos prontuários e relatórios
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
                  {[
                    { value: 'EM_INVESTIGACAO', label: 'Em Investigação', desc: 'Avaliação diagnóstica / Triagem', activeClass: 'border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/30 font-bold' },
                    { value: 'ATIVO', label: 'Em Atendimento', desc: 'Sessões ativas no EMAEE', activeClass: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/30 font-bold' },
                    { value: 'FILA_ESPERA', label: 'Fila de Espera', desc: 'Aguardando vaga / profissional', activeClass: 'border-sky-500/60 bg-sky-500/15 text-sky-900 dark:text-sky-300 ring-2 ring-sky-500/30 font-bold' },
                    { value: 'ALTA', label: 'Alta Médica / AEE', desc: 'Ciclo / Tratamento concluído', activeClass: 'border-purple-500/60 bg-purple-500/15 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/30 font-bold' },
                    { value: 'INATIVO', label: 'Arquivado', desc: 'Prontuário inativo / encerrado', activeClass: 'border-rose-500/60 bg-rose-500/15 text-rose-900 dark:text-rose-300 ring-2 ring-rose-500/30 font-bold' },
                  ].map((st) => {
                    const isSelected = (statusMatricula ?? 'FILA_ESPERA') === st.value
                    return (
                      <label
                        key={st.value}
                        className={`flex flex-col justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? st.activeClass
                            : 'border-border bg-input text-foreground/80 hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="status_matricula_emaee"
                            value={st.value}
                            checked={isSelected}
                            onChange={() => setStatusMatricula(st.value)}
                            className="accent-primary w-4 h-4 cursor-pointer shrink-0"
                          />
                          <span className="font-semibold text-xs tracking-tight">{st.label}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-2 pl-6 leading-snug block">
                          {st.desc}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            </div>

            {/* SEÇÃO DE ENDEREÇO ESTRUTURADO COM CEP E MINIMAPA */}
            <div className="col-span-12 pt-3">
              <div className="p-4 md:p-5 rounded-2xl border border-border bg-muted/30 dark:bg-[#0b0e14]/60 space-y-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                    <MapPin className="w-4 h-4" /> Endereço Residencial e Localização no Mapa
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Preenchimento estruturado independente com CEP e ajuste de ponto no mapa
                  </span>
                </div>

                {/* Grid de Endereço com CEP */}
                <div className="grid grid-cols-12 gap-3">
                  {/* CEP */}
                  <div className="col-span-12 sm:col-span-4 md:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-bold text-foreground">CEP</Label>
                      {isFetchingCep && (
                        <span className="text-[10px] text-primary flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        placeholder=""
                        value={cep}
                        onChange={(e) => {
                          const val = formatCEP(e.target.value)
                          setCep(val)
                          if (val.replace(/\D/g, '').length === 8) {
                            consultarCep(val)
                          }
                        }}
                        onBlur={() => {
                          if (cep.replace(/\D/g, '').length === 8) {
                            consultarCep(cep)
                          }
                        }}
                        className="pr-9 bg-input border-border text-foreground text-sm rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => consultarCep(cep)}
                        disabled={isFetchingCep}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                        title="Consultar CEP nos Correios"
                      >
                        {isFetchingCep ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Rua / Logradouro */}
                  <div className="col-span-12 sm:col-span-8 md:col-span-6">
                    <Label className="block mb-1 text-xs font-bold text-foreground">Rua / Logradouro</Label>
                    <Input
                      placeholder="Ex: Rua Manoel Severino"
                      value={rua}
                      onChange={(e) => {
                        setRua(e.target.value)
                        handleAtualizarEnderecoConsolidado({ rua: e.target.value })
                      }}
                      className="bg-input border-border text-foreground text-sm rounded-xl"
                    />
                  </div>

                  {/* Número */}
                  <div className="col-span-12 sm:col-span-4 md:col-span-3">
                    <Label className="block mb-1 text-xs font-bold text-foreground">Número</Label>
                    <Input
                      placeholder="Ex: 120 ou S/N"
                      value={numero}
                      onChange={(e) => {
                        setNumero(e.target.value)
                        handleAtualizarEnderecoConsolidado({ numero: e.target.value })
                      }}
                      className="bg-input border-border text-foreground text-sm rounded-xl"
                    />
                  </div>

                  {/* Bairro */}
                  <div className="col-span-12 sm:col-span-8 md:col-span-5">
                    <Label className="block mb-1 text-xs font-bold text-foreground">Bairro / Localidade</Label>
                    <Input
                      placeholder="Ex: Centro"
                      value={bairro}
                      onChange={(e) => {
                        setBairro(e.target.value)
                        handleAtualizarEnderecoConsolidado({ bairro: e.target.value })
                      }}
                      className="bg-input border-border text-foreground text-sm rounded-xl"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="col-span-12 sm:col-span-8 md:col-span-5">
                    <Label className="block mb-1 text-xs font-bold text-foreground">Cidade</Label>
                    <Input
                      placeholder="Sapeaçu"
                      value={cidadeEndereco}
                      onChange={(e) => {
                        setCidadeEndereco(e.target.value)
                        handleAtualizarEnderecoConsolidado({ cidade: e.target.value })
                      }}
                      className="bg-input border-border text-foreground text-sm rounded-xl"
                    />
                  </div>

                  {/* UF */}
                  <div className="col-span-12 sm:col-span-4 md:col-span-2">
                    <Label className="block mb-1 text-xs font-bold text-foreground">UF</Label>
                    <Input
                      placeholder="BA"
                      value={ufEndereco}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase()
                        setUfEndereco(val)
                        handleAtualizarEnderecoConsolidado({ uf: val })
                      }}
                      maxLength={2}
                      className="bg-input border-border text-foreground text-sm rounded-xl"
                    />
                  </div>

                  {/* Endereço Completo Consolidado */}
                  <div className="col-span-12">
                    <Label className="block mb-1 text-xs font-bold text-foreground">
                      Endereço Completo (Utilizado em Documentos e Relatórios)
                    </Label>
                    <Input
                      placeholder="Ex: Rua Manoel Severino, 120 - Centro, Sapeaçu - BA, CEP: 44530-000"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="bg-input border-border text-foreground text-sm rounded-xl"
                    />
                  </div>
                </div>

                {/* MiniMapa Leaflet Independente */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-foreground">
                      Geolocalização / Ponto no Mapa
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {latitude && longitude ? `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}` : 'Arraste o pin para ajustar o ponto exato'}
                    </span>
                  </div>

                  <MiniMapa
                    initialLat={latitude != null ? latitude : undefined}
                    initialLng={longitude != null ? longitude : undefined}
                    onCoordinatesChange={(lat, lng) => {
                      setLatitude(lat)
                      setLongitude(lng)
                    }}
                    address={endereco}
                    onAddressChange={(val) => {
                      if (!endereco) setEndereco(val)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
