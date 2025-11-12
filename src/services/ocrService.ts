import Tesseract from 'tesseract.js';

export interface ExtractedItem {
  numero: string;
  categoria: string;
  valor?: number;
}

export interface OCRResult {
  items: ExtractedItem[];
  success: boolean;
  error?: string;
}

const CATEGORIAS_MAP: Record<string, string> = {
  'pulseiras': 'pulseira',
  'pulseira': 'pulseira',
  'correntes': 'colar',
  'corrente': 'colar',
  'pingentes': 'pingente',
  'pingente': 'pingente',
  'aneis': 'anel',
  'anel': 'anel',
  'brincos g': 'brinco',
  'brincos i': 'brinco',
  'brincos m': 'brinco',
  'brinco': 'brinco',
  'argolas': 'argola',
  'argola': 'argola',
};

function parseInventoryTable(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const lines = text.split('\n').filter(line => line.trim());

  let currentCategory = 'outro';

  for (const line of lines) {
    const cleanLine = line.toLowerCase().trim();

    const categoryMatch = Object.keys(CATEGORIAS_MAP).find(cat =>
      cleanLine.includes(cat)
    );
    if (categoryMatch) {
      currentCategory = CATEGORIAS_MAP[categoryMatch];
      continue;
    }

    const numbers = line.match(/\b\d{2,4}\b/g);
    if (numbers) {
      for (const numero of numbers) {
        if (parseInt(numero) > 10 && parseInt(numero) < 10000) {
          items.push({
            numero,
            categoria: currentCategory,
          });
        }
      }
    }
  }

  return items;
}

function deduplicateItems(items: ExtractedItem[]): ExtractedItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.categoria}-${item.numero}`;
    if (seen.has(key)) {
      return false;
    }
    seen.has(key);
    seen.add(key);
    return true;
  });
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
