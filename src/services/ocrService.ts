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
  'brincos g': 'Brinco G',
  'brincos i': 'Brinco I',
  'brincos m': 'Brinco M',
  'brinco': 'Brinco',
  'argolas': 'Argola',
  'argola': 'Argola',
};

interface TableData {
  headers: string[];
  rows: string[][];
}

function extractTableStructure(text: string): TableData {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const headers: string[] = [];
  const rows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = line.toLowerCase();

    // Detectar linha de cabeçalho (categorias)
    const categoryMatch = Object.keys(CATEGORIAS_MAP).find(cat =>
      cleanLine.includes(cat)
    );

    if (categoryMatch && headers.length === 0) {
      // Extrair todos os headers da linha
      const parts = line.split(/\s+|\|/).filter(p => p.trim());
      headers.push(...parts.map(p => {
        const normalized = p.toLowerCase().trim();
        return CATEGORIAS_MAP[normalized] || p;
      }));
      continue;
    }

    // Extrair valores numéricos da linha
    const numbers = line.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      const validNumbers = numbers
        .map(n => parseInt(n))
        .filter(n => n >= 10 && n < 10000);

      if (validNumbers.length > 0) {
        rows.push(validNumbers.map(String));
      }
    }
  }

  return { headers, rows };
}

function parseInventoryTable(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const { headers, rows } = extractTableStructure(text);

  console.log('Headers:', headers);
  console.log('Rows:', rows);

  if (headers.length === 0 || rows.length === 0) {
    return items;
  }

  // Processar cada coluna (categoria)
  for (let colIndex = 0; colIndex < headers.length; colIndex++) {
    const categoria = headers[colIndex];
    const valorCounts = new Map<number, number>();

    // Coletar todos os valores desta coluna
    const valoresColuna: number[] = [];
    for (const row of rows) {
      if (row[colIndex]) {
        const valor = parseInt(row[colIndex]);
        if (!isNaN(valor) && valor >= 10 && valor < 10000) {
          valoresColuna.push(valor);
          valorCounts.set(valor, (valorCounts.get(valor) || 0) + 1);
        }
      }
    }

    // Criar itens agrupando valores repetidos
    valorCounts.forEach((quantidade, valor) => {
      items.push({
        categoria,
        valor,
        quantidade,
        descricao: `${categoria} - ${valor}`
      });
    });
  }

  return items;
}

function deduplicateItems(items: ExtractedItem[]): ExtractedItem[] {
  const map = new Map<string, ExtractedItem>();

  items.forEach(item => {
    const key = `${item.categoria}-${item.valor}`;
    const existing = map.get(key);

    if (existing) {
      existing.quantidade += item.quantidade;
    } else {
      map.set(key, { ...item });
    }
  });

  return Array.from(map.values());
}

export async function processInventoryImage(imageFile: File | string): Promise<OCRResult> {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imageFile,
      'por',
      {
        logger: (m) => console.log(m),
      }
    );

    console.log('OCR Raw Text:', text);

    const extractedItems = parseInventoryTable(text);
    const uniqueItems = deduplicateItems(extractedItems);

    console.log('Extracted Items:', uniqueItems);

    return {
      items: uniqueItems,
      success: true,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      items: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
