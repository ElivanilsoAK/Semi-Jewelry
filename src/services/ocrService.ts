import Tesseract from 'tesseract.js';

export interface ExtractedItem {
  valor: number;
  quantidade: number;
}

export interface OCRResult {
  items: ExtractedItem[];
  success: boolean;
  error?: string;
  rawText?: string;
}

function extrairValoresEQuantidades(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  console.log('Linhas do OCR:', linhas);

  const valoresEncontrados = new Map<number, number>();

  for (const linha of linhas) {
    const numeros = linha.match(/\d+/g);

    if (numeros && numeros.length > 0) {
      for (const numStr of numeros) {
        const num = parseInt(numStr);

        if (num >= 10 && num <= 9999) {
          const qtdAtual = valoresEncontrados.get(num) || 0;
          valoresEncontrados.set(num, qtdAtual + 1);
        }
      }
    }
  }

  valoresEncontrados.forEach((quantidade, valor) => {
    items.push({ valor, quantidade });
  });

  return items.sort((a, b) => a.valor - b.valor);
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

    console.log('Texto OCR extraído:', text);

    const extractedItems = extrairValoresEQuantidades(text);

    console.log('Valores e quantidades extraídos:', extractedItems);

    if (extractedItems.length === 0) {
      return {
        items: [],
        success: false,
        error: 'Nenhum valor foi detectado na imagem. Verifique se a foto está nítida.',
        rawText: text,
      };
    }

    return {
      items: extractedItems,
      success: true,
      rawText: text,
    };
  } catch (error) {
    console.error('Erro no OCR:', error);
    return {
      items: [],
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido no OCR',
    };
  }
}
