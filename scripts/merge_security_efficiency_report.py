from pathlib import Path
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
security = ROOT / "output" / "pdf" / "plano_seguranca_continuidade_SIG.pdf"
economy = ROOT / "output" / "pdf" / "relatorio_economia_eficiencia_SIG.pdf"
target = ROOT / "output" / "pdf" / "Relatorio_de_Seguranca_e_Eficiencia_SIG_Sapeacu.pdf"

writer = PdfWriter()
for source in (security, economy):
    reader = PdfReader(str(source))
    for page in reader.pages:
        writer.add_page(page)

writer.add_metadata({
    "/Title": "Relatório de Segurança e Eficiência SIG - Sapeaçu",
    "/Author": "SIG / Prefeitura Municipal de Sapeaçu",
    "/Subject": "Segurança, continuidade, backup, economia e eficiência operacional",
})
with target.open("wb") as output:
    writer.write(output)
print(target)
