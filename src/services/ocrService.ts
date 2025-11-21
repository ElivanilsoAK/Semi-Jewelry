import Tesseract from 'tesseract.js';

export interface ExtractedItem {
  categoria: string;
  valor: number;
  quantidade: number;
  descricao: string;
}

export interface OCRResult {
  items: ExtractedItem[];
  success: boolean;
  error?: string;
}

const CATEGORIAS_MAP: Record<string, string> = {
  'pulseiras': 'Pulseira',
  'pulseira': 'Pulseira',
  'correntes': 'Corrente',
  'corrente': 'Corrente',
  'pingentes': 'Pingente',
  'pingente': 'Pingente',
  'aneis': 'Anel',
  'anel': 'Anel',
  'brincos': 'Brinco',
  'brinco': 'Brinco',
  'argolas': 'Argola',
  'argola': 'Argola',
  'alianças': 'Aliança',
  'aliança': 'Aliança',
  'tornozeleiras': 'Tornozeleira',
  'tornozeleira': 'Tornozeleira',
};

interface ParsedLine {
  categoria?: string;
  valores: number[];
}

function normalizarCategoria(texto: string): string | null {
  const textoNormalizado = texto.toLowerCase().trim();

  for (const [key, value] of Object.entries(CATEGORIAS_MAP)) {
    if (textoNormalizado.includes(key)) {
      return value;
    }
  }

  return null;
}

function extrairValores(texto: string): number[] {
  const valores: number[] = [];
  const padrao = /\d+/g;
  let match;

  while ((match = padrao.exec(texto)) !== null) {
    const numero = parseInt(match[0]);
    if (numero >= 10 && numero <= 9999) {
      valores.push(numero);
    }
  }

  return valores;
}

function parseInventoryTable(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const linhas = text.split('\n')
    .map(linha => linha.trim())
    .filter(linha => linha.length > 3);

  console.log('Linhas detectadas:', linhas);

  let categoriaAtual: string | null = null;
  const valoresPorCategoria = new Map<string, Map<number, number>>();

  for (const linha of linhas) {
    const categoria = normalizarCategoria(linha);

    if (categoria) {
      categoriaAtual = categoria;
      if (!valoresPorCategoria.has(categoria)) {
        valoresPorCategoria.set(categoria, new Map());
      }
      console.log('Categoria encontrada:', categoria);
      continue;
    }

    if (categoriaAtual) {
      const valores = extrairValores(linha);

      if (valores.length > 0) {
        const mapaValores = valoresPorCategoria.get(categoriaAtual)!;

        valores.forEach(valor => {
          const qtdAtual = mapaValores.get(valor) || 0;
          mapaValores.set(valor, qtdAtual + 1);
        });
      }
    }
  }

  valoresPorCategoria.forEach((valoresMap, categoria) => {
    valoresMap.forEach((quantidade, valor) => {
      items.push({
        categoria,
        valor,
        quantidade,
        descricao: `${categoria} - R$ ${valor},00`
      });
    });
  });

  console.log('Itens extraídos:', items);

  return items.sort((a, b) => {
    if (a.categoria !== b.categoria) {
      return a.categoria.localeCompare(b.categoria);
    }
    return a.valor - b.valor;
  });
}

export async function processInventoryImage(imageFile: File | string): Promise<OCRResult> {
  try {
    console.log('Iniciando processamento OCR...');

    const { data: { text } } = await Tesseract.recognize(
      imageFile,
      'por',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      }
    );

    console.log('OCR Texto extraído:', text);

    const extractedItems = parseInventoryTable(text);

    if (extractedItems.length === 0) {
      console.warn('Nenhum item foi extraído do texto OCR');
      return {
        items: [],
        success: false,
        error: 'Não foi possível identificar itens na imagem. Verifique se a foto está nítida e bem iluminada.',
      };
    }

    return {
      items: extractedItems,
      success: true,
    };
  } catch (error) {
    console.error('Erro no OCR:', error);
    return {
      items: [],
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido no processamento OCR',
    };
  }
}
