from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, ListFlowable, ListItem
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "relatorio_economia_eficiencia_SIG.pdf"
FONT = Path("C:/Windows/Fonts/arial.ttf"); FONT_BOLD = Path("C:/Windows/Fonts/arialbd.ttf")
if FONT.exists() and FONT_BOLD.exists():
    pdfmetrics.registerFont(TTFont("SIG", str(FONT))); pdfmetrics.registerFont(TTFont("SIG-Bold", str(FONT_BOLD)))
    F, FB = "SIG", "SIG-Bold"
else: F, FB = "Helvetica", "Helvetica-Bold"
NAVY=colors.HexColor("#101827"); BLUE=colors.HexColor("#155E9C"); TEAL=colors.HexColor("#0D9488"); INK=colors.HexColor("#1E293B"); MUTED=colors.HexColor("#475569"); LIGHT=colors.HexColor("#EEF4F8")
s=getSampleStyleSheet()
s.add(ParagraphStyle(name="TitleX",fontName=FB,fontSize=23,leading=28,textColor=colors.white))
s.add(ParagraphStyle(name="CoverX",fontName=F,fontSize=11,leading=16,textColor=colors.HexColor("#DCE9F4")))
s.add(ParagraphStyle(name="H1X",fontName=FB,fontSize=16,leading=21,textColor=NAVY,spaceBefore=10,spaceAfter=7))
s.add(ParagraphStyle(name="H2X",fontName=FB,fontSize=11.5,leading=15,textColor=BLUE,spaceBefore=9,spaceAfter=5))
s.add(ParagraphStyle(name="BodyX",fontName=F,fontSize=8.6,leading=12.2,textColor=INK,spaceAfter=5))
s.add(ParagraphStyle(name="SmallX",fontName=F,fontSize=7.2,leading=9.4,textColor=MUTED,spaceAfter=3))
s.add(ParagraphStyle(name="TblX",fontName=F,fontSize=7.15,leading=9.1,textColor=INK))
s.add(ParagraphStyle(name="ThX",fontName=FB,fontSize=7.15,leading=9.1,textColor=colors.white))
def p(x,st="BodyX"): return Paragraph(x,s[st])
def bullets(xs): return ListFlowable([ListItem(p(x),leftIndent=10) for x in xs],bulletType="bullet",leftIndent=15,bulletFontName=F,bulletFontSize=7)
def tab(head,rows,w):
    t=Table([[p(x,"ThX") for x in head]]+[[p(x,"TblX") for x in r] for r in rows],colWidths=w,repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),NAVY),("GRID",(0,0),(-1,-1),.25,colors.HexColor("#CBD5E1")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4),("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,LIGHT])]))
    return t
def call(title,text):
    t=Table([[p(f"<b>{title}</b><br/>{text}","BodyX")]],colWidths=[17.2*cm])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#F0FDFA")),("LINEBEFORE",(0,0),(0,-1),3,TEAL),("BOX",(0,0),(-1,-1),.3,colors.HexColor("#99F6E4")),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)])); return t
def footer(c,d):
    c.saveState(); c.setStrokeColor(colors.HexColor("#CBD5E1")); c.line(1.8*cm,1.45*cm,19.2*cm,1.45*cm); c.setFont(F,7); c.setFillColor(MUTED); c.drawString(1.8*cm,.88*cm,"SIG - Relatório de Economia e Eficiência"); c.drawRightString(19.2*cm,.88*cm,f"Uso institucional - Página {d.page}"); c.restoreState()

story=[]
cover=Table([[p("RELATÓRIO DE ECONOMIA,<br/>EFICIÊNCIA E DIGITALIZAÇÃO<br/>DA SECRETARIA", "TitleX"),p("Cenários para 2.000 alunos e<br/>1.000 a 1.500 servidores municipais<br/>01 de agosto de 2026", "CoverX")]],colWidths=[11.8*cm,5.4*cm],rowHeights=[14.8*cm])
cover.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),NAVY),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),16),("RIGHTPADDING",(0,0),(-1,-1),16),("LINEAFTER",(0,0),(0,-1),.8,colors.HexColor("#31506F"))]))
story += [Spacer(1,3.1*cm),cover,Spacer(1,.5*cm),p("Parte II do Relatório de Segurança e Eficiência SIG - Sapeaçu.","SmallX"),PageBreak()]

story += [p("1. Síntese executiva", "H1X"),p("A digitalização integrada pelo SIG pode reduzir de forma relevante a impressão de fichas, relatórios, formulários, cópias de prontuários, controles de frequência, documentos de transporte, solicitações e consultas internas. Também diminui retrabalho, procura manual de documentos e consolidação em planilhas. Este estudo estima o ganho potencial, não uma economia já realizada."),call("Resultado de referência - cenário-base", "Para 2.000 alunos e 1.250 servidores, a projeção é de <b>R$ 146 mil/ano</b> em redução de impressão, <b>R$ 91 mil/ano</b> em capacidade operacional recuperada e <b>R$ 20 mil/ano</b> em despesas físicas evitáveis. Impacto econômico anual bruto estimado: <b>R$ 257 mil</b>."),p("O benefício financeiro diretamente observável é principalmente papel, toner, manutenção, cópias terceirizadas, arquivo e deslocamentos. A redução de horas é uma <b>capacidade recuperada</b>: ela vira economia financeira somente se reduzir horas extras, contratações, serviços terceirizados ou custos equivalentes."),p("Faixa anual de impacto", "H2X"),tab(["Cenário","Impacto bruto anual","Depois da operação de backup","Retorno estimado"],[
    ["Conservador","R$ 106 mil","R$ 95 mil","Até 12 meses, conforme implantação."],
    ["Base recomendado","R$ 257 mil","R$ 246 mil","2 a 6 meses, conforme implantação."],
    ["Alta digitalização","R$ 507 mil","R$ 496 mil","1 a 4 meses, conforme implantação."],
],[3.3*cm,4.4*cm,4.9*cm,6.6*cm]),PageBreak()]

story += [p("2. Escopo e premissas de cálculo", "H1X"),p("O estudo considera a Secretaria de Educação com cadastro digital de alunos e servidores, documentos anexados, histórico institucional, perfis de acesso, relatórios e fluxos administrativos no SIG. Não supõe eliminação total de papel: documentos legalmente exigidos, atendimento sem acesso digital e contingências continuam previstos."),tab(["Variável","Conservador","Base","Alta digitalização"],[
    ["Alunos", "2.000", "2.000", "2.000"],
    ["Servidores", "1.000", "1.250", "1.500"],
    ["Páginas anuais antes do SIG", "300.000", "550.000", "850.000"],
    ["Custo médio por página impressa", "R$ 0,32", "R$ 0,38", "R$ 0,45"],
    ["Redução de impressão alcançada", "60%", "70%", "75%"],
    ["Horas anuais recuperadas", "1.250 h", "2.400 h", "4.000 h"],
    ["Custo-hora carregado usado", "R$ 32", "R$ 38", "R$ 45"],
    ["Arquivo, cópia, deslocamento e mensageria evitáveis", "R$ 8 mil", "R$ 20 mil", "R$ 40 mil"],
],[5.8*cm,3.8*cm,3.8*cm,3.8*cm]),p("O custo por página deve incluir papel, toner, manutenção, energia, depreciação, assistência, cópia terceirizada e descarte. O custo-hora deve incluir remuneração e encargos apenas se for usado para planejamento financeiro; para eficiência, pode ser apresentado como horas liberadas."),call("Como validar em 30 dias", "Extrair contadores das impressoras, notas de papel/toner, gastos com cópia, volumes de arquivo e uma amostra de tempo gasto em cinco processos. Substituir as premissas desta tabela pelos números da Secretaria antes de anexar o relatório a uma peça orçamentária."),PageBreak()]

story += [p("3. De onde vem a economia de papel", "H1X"),tab(["Processo digitalizado","Antes","Depois no SIG","Efeito"],[
    ["Cadastro e matrícula de aluno","Ficha e cópias físicas repetidas em escola e Secretaria","Cadastro único, anexos, permissões e histórico digital","Menos reimpressão, extravio e digitação duplicada."],
    ["Notas, frequência e boletins","Consolidação manual, impressão para conferência e entrega","Lançamento, consulta, exportação e registro por perfil","Reduz cópias recorrentes e tempo de consolidação."],
    ["Dossiê de servidor","Pasta física, formulários e busca por RH/gestão","Dados, lotações e documentos centralizados","Menos arquivo, deslocamento e consultas presenciais."],
    ["Transporte escolar","Listas, roteiros, ocorrências e conferências em papel","Rotas, veículos, alunos e registros digitais","Atualização mais rápida e rastreabilidade."],
    ["Relatórios e auditoria","Planilhas paralelas e relatórios montados manualmente","Dashboards, filtros, exportação controlada e logs","Menos versões conflitantes e cópias para conferência."],
],[4.0*cm,4.1*cm,5.4*cm,4.7*cm]),p("Composição do cenário-base", "H2X"),tab(["Origem do papel","Páginas/ano antes","Redução esperada","Páginas evitadas"],[
    ["Alunos: matrícula, vida escolar, notas, frequência e anexos","230.000","70%","161.000"],
    ["Servidores: cadastros, lotação, requisições e consultas","125.000","70%","87.500"],
    ["Gestão: relatórios, transporte, ofícios, controles e cópias","195.000","70%","136.500"],
    ["Total","550.000","70%","385.000"],
],[7.3*cm,3.6*cm,3.9*cm,4.4*cm]),p("385.000 páginas evitadas a R$ 0,38 por página equivalem a <b>R$ 146.300/ano</b> de redução potencial de impressão no cenário-base."),PageBreak()]

story += [p("4. Eficiência operacional e qualidade do serviço", "H1X"),p("A digitalização não apenas reduz custo; ela acelera a entrega de informações e aumenta confiabilidade. O SIG deve ser medido por indicadores, evitando promessas genéricas."),tab(["Ganho","Como medir","Meta inicial"],[
    ["Tempo de localização de documento","Amostra de solicitações: antes/depois","Reduzir de horas/dias para poucos minutos."],
    ["Retrabalho de cadastro","Número de correções e registros duplicados","Reduzir em pelo menos 50% em 12 meses."],
    ["Produção de relatórios","Tempo entre solicitação e entrega","Relatórios recorrentes em minutos, não dias."],
    ["Atendimento ao cidadão","Tempo de resposta e necessidade de retorno presencial","Reduzir retornos por ausência de documento."],
    ["Conformidade e auditoria","Evidência de quem alterou e quando","100% das ações críticas com trilha de auditoria."],
],[5.0*cm,7.0*cm,6.2*cm]),p("Cálculo da capacidade recuperada - cenário-base", "H2X"),tab(["Atividade eliminada/reduzida","Horas anuais liberadas","Valor de capacidade"],[
    ["Busca, cópia, arquivamento e transporte de dossiês","850 h","R$ 32.300"],
    ["Consolidação manual de relatórios e planilhas","700 h","R$ 26.600"],
    ["Redigitação, conferência e correções de cadastro","500 h","R$ 19.000"],
    ["Atendimentos repetidos e deslocamentos internos","350 h","R$ 13.300"],
    ["Total","2.400 h","R$ 91.200"],
],[8.8*cm,3.9*cm,5.5*cm]),call("Uso responsável do indicador", "As 2.400 horas representam cerca de 300 jornadas de 8 horas. A Secretaria deve redirecioná-las para atendimento, acompanhamento pedagógico, auditoria e planejamento. Só registrar como economia orçamentária se houver redução comprovada de despesa."),PageBreak()]

story += [p("5. Comparativo econômico anual", "H1X"),tab(["Componente","Conservador","Base","Alta digitalização"],[
    ["Redução de impressão","R$ 57.600","R$ 146.300","R$ 286.875"],
    ["Capacidade operacional recuperada","R$ 40.000","R$ 91.200","R$ 180.000"],
    ["Arquivo, cópias e deslocamento evitáveis","R$ 8.000","R$ 20.000","R$ 40.000"],
    ["Impacto anual bruto","R$ 105.600","R$ 257.500","R$ 506.875"],
    ["Operação anual de backup seguro (R$ 700 a 960/mês)","R$ 11.520","R$ 11.520","R$ 11.520"],
    ["Impacto anual líquido indicativo","R$ 94.080","R$ 245.980","R$ 495.355"],
],[6.2*cm,4.3*cm,4.3*cm,4.4*cm]),p("A operação de backup foi descontada apenas para demonstrar que segurança e continuidade não anulam a vantagem econômica da digitalização. A tabela não inclui o valor de implantação do SIG, pois depende do escopo já contratado, módulos adicionais e horas de implantação."),p("Retorno do investimento da continuidade", "H2X"),tab(["Cenário","Implantação de backup e segurança","Impacto líquido anual","Tempo de retorno"],[
    ["Conservador","R$ 10.950 a 24.100","R$ 94.080","1,4 a 3,1 meses"],
    ["Base","R$ 10.950 a 24.100","R$ 245.980","0,5 a 1,2 meses"],
    ["Alta digitalização","R$ 10.950 a 24.100","R$ 495.355","0,3 a 0,6 meses"],
],[3.9*cm,5.3*cm,4.3*cm,5.7*cm]),p("O prazo acima é indicativo e considera o impacto econômico total. Para uma visão estritamente de caixa, usar apenas a linha de redução de impressão + despesas físicas evitadas."),PageBreak()]

story += [p("6. Plano de implantação para capturar os ganhos", "H1X"),tab(["Fase","0-90 dias","3-6 meses","6-12 meses"],[
    ["Digitalização","Priorizar novos cadastros e documentos ativos; definir padrão de arquivo","Migrar acervo de maior consulta e anexos críticos","Digitalizar acervo remanescente conforme retenção e prioridade."],
    ["Processos","Eliminar formulários duplicados; criar fluxos e perfis","Integrar relatórios e transporte; reduzir planilhas paralelas","Revisar processos e eliminar etapas sem valor."],
    ["Adoção","Treinar multiplicadores; apoio de campo; canal de dúvidas","Acompanhar uso por unidade e corrigir barreiras","Reciclagem e integração de novos servidores."],
    ["Medição","Criar linha de base de impressão, horas e atendimento","Publicar painel mensal de indicadores","Comparar ano contra ano e revisar metas."],
    ["Segurança","Owners institucionais, MFA, backup e teste inicial","Backup manual, rotação SSD e teste mensal","Exercício trimestral de desastre e auditoria de acessos."],
],[3.0*cm,5.4*cm,5.4*cm,5.4*cm]),p("Princípios para não perder eficiência", "H2X"),bullets([
    "Digitalizar na origem: evitar imprimir para depois digitalizar, salvo exigência legal ou histórica.",
    "Manter formulários simples, assinatura eletrônica quando juridicamente admitida e um padrão de nomenclatura de documentos.",
    "Não transformar o SIG em depósito sem organização: aplicar classificação, retenção e permissões por perfil.",
    "Oferecer contingência controlada para unidades sem conectividade, com posterior sincronização e registro.",
]),PageBreak()]

story += [p("7. Governança, riscos e indicadores mensais", "H1X"),p("A economia ocorre somente se houver mudança real de processo. Imprimir a mesma informação que já está disponível no sistema anula parte do ganho. A direção deve definir responsáveis e acompanhar poucos indicadores confiáveis."),tab(["Indicador mensal","Fórmula","Responsável"],[
    ["Páginas impressas por unidade","Contadores de impressão / número de servidores","TI + gestores escolares"],
    ["% de documentos natos digitais","Documentos criados digitais / total de novos documentos","Secretaria + unidades"],
    ["Tempo de resposta a solicitação","Data de entrega - data do pedido","Atendimento/RH/gestão"],
    ["Documentos localizados sem papel","Solicitações atendidas digitalmente / total","Arquivo e setores donos"],
    ["Uso do SIG","Usuários ativos, lançamentos e relatórios por módulo","TI + administração"],
    ["Backup válido","Último backup testado dentro da janela prevista","TI municipal"],
],[5.0*cm,8.0*cm,5.2*cm]),call("Proteção de dados", "Dados de alunos e servidores exigem controles de acesso, minimização, registro de auditoria e retenção compatível com a LGPD e normas municipais. Economia não justifica acesso amplo ou retenção indiscriminada; a segurança do plano complementar é condição do projeto."),p("Riscos a administrar", "H2X"),bullets([
    "Resistência ao uso: treinamento por função, líderes locais e suporte inicial.",
    "Digitalização de baixa qualidade: controle de qualidade, indexação e amostragem antes de descartar documentos, quando permitido.",
    "Dados duplicados: cadastro mestre, regras de validação e auditoria de alterações.",
    "Dependência de fornecedor: propriedade institucional das contas, cópias externas e migrations versionadas.",
]),PageBreak()]

story += [p("8. Orçamento da continuidade e referências", "H1X"),p("O plano de segurança atualizado inclui a seguinte referência de continuidade: equipamentos de R$ 4.950 a R$ 9.100; implantação da automação de R$ 6.000 a R$ 15.000; total inicial de R$ 10.950 a R$ 24.100. A operação recomendada com PITR, mini-PC e cópia externa é de R$ 700 a R$ 960/mês. Estes números devem passar por cotação formal."),p("Referências oficiais", "H2X"),bullets([
    "Supabase Pricing: plano Pro a partir de US$ 25/mês e Point-in-Time Recovery a partir de US$ 100/mês por 7 dias; os limites e excedentes dependem do consumo. https://supabase.com/pricing",
    "Supabase Database Backups: backups de banco, PITR, restauração e limitação referente a objetos Storage. https://supabase.com/docs/guides/platform/backups",
    "Supabase Backup and Restore using the CLI: exportação lógica e restauração em projeto novo. https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore",
    "As faixas de papel, impressão, capacidade de trabalho e equipamentos neste documento são premissas de planejamento, não preços oficiais. Validar com contadores, notas fiscais e pesquisa de mercado local antes de contratação.",
]),call("Conclusão", "Para o porte considerado, digitalizar o ciclo de alunos, servidores e gestão pode gerar impacto anual suficiente para financiar com folga a continuidade segura do sistema. O cenário-base indica R$ 245.980/ano de benefício líquido operacional após a operação de backup, desde que a Secretaria realmente reduza impressões e redesenhe os processos."),Spacer(1,.45*cm),p("Classificação sugerida: uso interno institucional. Revisão semestral das premissas e anual do resultado realizado.","SmallX")]

OUT.parent.mkdir(parents=True,exist_ok=True)
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=1.8*cm,leftMargin=1.8*cm,topMargin=1.55*cm,bottomMargin=1.75*cm,title="Relatório de Economia e Eficiência - SIG",author="SIG / Prefeitura Municipal")
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
