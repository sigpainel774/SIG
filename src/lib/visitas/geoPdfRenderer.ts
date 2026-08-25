import * as pdfjsLib from 'pdfjs-dist';
import { PdfControlPoint, GeoBounds } from '@/types/visitas';

// Configura o worker do PDF.js para ambiente de browser
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface RenderedPdfPage {
  dataUrl: string;
  width: number;
  height: number;
  pageNumber: number;
  totalPages: number;
}

/**
 * Renderiza uma página de arquivo PDF para uma imagem DataURL (PNG)
 */
export async function renderizarPaginaPdf(
  fileOrUrl: File | string,
  pageNumber: number = 1,
  scale: number = 2.0
): Promise<RenderedPdfPage> {
  let loadingTask: any;

  if (typeof fileOrUrl === 'string') {
    loadingTask = pdfjsLib.getDocument({ url: fileOrUrl });
  } else {
    const arrayBuffer = await fileOrUrl.arrayBuffer();
    loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  }

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const safePageNum = Math.min(Math.max(1, pageNumber), totalPages);

  const page = await pdfDoc.getPage(safePageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Falha ao obter contexto 2D do Canvas para renderização de PDF');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
    pageNumber: safePageNum,
    totalPages,
  };
}

/**
 * Estima os limites geográficos (GeoBounds) a partir de 2 ou mais pontos de controle de calibração
 */
export function estimarGeoBoundsDePontosControle(
  pontos: PdfControlPoint[],
  imageWidth: number,
  imageHeight: number
): GeoBounds | null {
  if (!pontos || pontos.length < 2) return null;

  // Usa 2 pontos mínimos para interpolação linear
  const p1 = pontos[0];
  const p2 = pontos[1];

  const dX = p2.pdfX - p1.pdfX;
  const dY = p2.pdfY - p1.pdfY;

  if (Math.abs(dX) < 0.001 || Math.abs(dY) < 0.001) {
    // Pontos muito alinhados, usa expansão simples
    const lats = pontos.map((p) => p.lat);
    const lngs = pontos.map((p) => p.lng);

    return {
      north: Math.max(...lats) + 0.005,
      south: Math.min(...lats) - 0.005,
      east: Math.max(...lngs) + 0.005,
      west: Math.min(...lngs) - 0.005,
    };
  }

  const dLat = p2.lat - p1.lat;
  const dLng = p2.lng - p1.lng;

  const latPerY = dLat / dY;
  const lngPerX = dLng / dX;

  const latTop = p1.lat - p1.pdfY * latPerY;
  const latBottom = latTop + latPerY;

  const lngLeft = p1.lng - p1.pdfX * lngPerX;
  const lngRight = lngLeft + lngPerX;

  return {
    north: Math.max(latTop, latBottom),
    south: Math.min(latTop, latBottom),
    east: Math.max(lngLeft, lngRight),
    west: Math.min(lngLeft, lngRight),
  };
}
