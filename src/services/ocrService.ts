import Tesseract from 'tesseract.js';

export interface ExtractedItem {
  categoria: string;
  valor: number;
  quantidade: number;
}

export interface OCRResult {
  items: ExtractedItem[];
  success: boolean;
  error?: string;
  rawText?: string;
}

// Mapeia variações de nomes de categorias
const CATEGORIAS_MAP: { [key: string]: string } = {
  'pulseira': 'Pulseira',
  'pulseiras': 'Pulseira',
  'corrente': 'Corrente',
  'correntes': 'Corrente',
  'pingente': 'Pingente',
  'pingentes': 'Pingente',
  'anel': 'Anel',
  'aneis': 'Anel',
  'anéis': 'Anel',
  'brinco': 'Brinco',
  'brincos': 'Brinco',
  'argola': 'Argola',
  'argolas': 'Argola',
  'tornozeleira': 'Tornozeleira',
  'tornozeleiras': 'Tornozeleira',
  'conjunto': 'Conjunto',
  'conjuntos': 'Conjunto',
  'infantil': 'Infantil',
  'colar': 'Colar',
  'colares': 'Colar',
};

// Detecta categorias no cabeçalho (aceita variações)
function detectarCategorias(headerLine: string): string[] {
  const categorias: string[] = [];
  const palavras = headerLine.toLowerCase().split(/[\s|,;]+/);

  for (const palavra of palavras) {
    const palavraLimpa = palavra.replace(/[^\w\sáéíóúâêôãõç]/gi, '').trim();
    if (CATEGORIAS_MAP[palavraLimpa]) {
      categorias.push(CATEGORIAS_MAP[palavraLimpa]);
    }
  }

  return categorias;
}

// Extrai números de uma linha
function extrairNumeros(linha: string): number[] {
  const numeros: number[] = [];
  const matches = linha.match(/\d+/g);

  if (matches) {
    for (const match of matches) {
      const num = parseInt(match);
      if (num >= 10 && num <= 9999) {
        numeros.push(num);
      }
    }
  }

  return numeros;
}

// Processa tabela de inventário com colunas de categorias
function processarTabelaInventario(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  console.log('=== PROCESSANDO TABELA ===');
  console.log('Total de linhas:', linhas.length);

  // Procura pela linha de cabeçalho com categorias
  let categorias: string[] = [];
  let linhaInicioDados = 0;

  for (let i = 0; i < Math.min(linhas.length, 10); i++) {
    const linha = linhas[i];
    const categoriasDetectadas = detectarCategorias(linha);

    if (categoriasDetectadas.length >= 3) {
      categorias = categoriasDetectadas;
      linhaInicioDados = i + 1;
      console.log('Cabeçalho encontrado na linha', i);
      console.log('Categorias detectadas:', categorias);
      break;
    }
  }

  // Se não encontrou cabeçalho, tenta detectar por padrão comum
  if (categorias.length === 0) {
    console.log('Cabeçalho não detectado, usando padrão comum');
    categorias = ['Pulseira', 'Corrente', 'Pingente', 'Anel', 'Brinco G', 'Brinco I', 'Brinco M', 'Argola'];
    linhaInicioDados = 0;

    // Tenta encontrar primeira linha com múltiplos números
    for (let i = 0; i < Math.min(linhas.length, 10); i++) {
      const numeros = extrairNumeros(linhas[i]);
      if (numeros.length >= 4) {
        linhaInicioDados = i;
        console.log('Primeira linha de dados na posição:', i);
        break;
      }
    }
  }

  console.log('Processando dados a partir da linha:', linhaInicioDados);

  // Processa as linhas de dados
  for (let i = linhaInicioDados; i < linhas.length; i++) {
    const linha = linhas[i];
    const numeros = extrairNumeros(linha);

    // Ignora linhas sem números suficientes
    if (numeros.length < 2) continue;

    console.log(`Linha ${i}:`, numeros);

    // Processa cada número como um valor na sequência de categorias
    for (let j = 0; j < numeros.length && j < categorias.length; j++) {
      const valor = numeros[j];
      const categoria = categorias[j] || 'Outro';

      // Cada valor representa 1 peça daquela categoria
      items.push({
        categoria: categoria,
        valor: valor,
        quantidade: 1
      });

      console.log(`  → ${categoria}: R$ ${valor}`);
    }
  }

  console.log('Total de itens extraídos:', items.length);
  return items;
}

// Modo alternativo: extrai valores e agrupa por similaridade
function extrairValoresSimples(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  console.log('=== MODO SIMPLES ===');

  const valoresCategoria: { [categoria: string]: number[] } = {
    'Outro': []
  };

  let categoriaAtual = 'Outro';

  for (const linha of linhas) {
    // Detecta se é uma linha de categoria
    const categoriasDetectadas = detectarCategorias(linha);
    if (categoriasDetectadas.length > 0) {
      categoriaAtual = categoriasDetectadas[0];
      if (!valoresCategoria[categoriaAtual]) {
        valoresCategoria[categoriaAtual] = [];
      }
      continue;
    }

    // Extrai números da linha
    const numeros = extrairNumeros(linha);
    if (numeros.length > 0) {
      valoresCategoria[categoriaAtual].push(...numeros);
    }
  }

  // Converte em itens (cada valor = 1 peça)
  for (const [categoria, valores] of Object.entries(valoresCategoria)) {
    for (const valor of valores) {
      items.push({
        categoria,
        valor,
        quantidade: 1
      });
    }
  }

  console.log('Total de itens extraídos (modo simples):', items.length);
  return items;
}

export async function processInventoryImage(imageFile: File | string): Promise<OCRResult> {
  try {
    console.log('Iniciando processamento OCR avançado...');

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

    console.log('========================================');
    console.log('TEXTO OCR COMPLETO:');
    console.log(text);
    console.log('========================================');

    // Tenta processar como tabela primeiro
    let extractedItems = processarTabelaInventario(text);

    // Se não conseguir extrair muitos itens, tenta modo simples
    if (extractedItems.length < 5) {
      console.log('Poucos itens encontrados, tentando modo simples...');
      extractedItems = extrairValoresSimples(text);
    }

    if (extractedItems.length === 0) {
      return {
        items: [],
        success: false,
        error: 'Nenhum item foi detectado na imagem. Verifique se a foto está nítida e bem iluminada.',
        rawText: text,
      };
    }

    console.log('========================================');
    console.log('RESUMO DOS ITENS EXTRAÍDOS:');
    const resumo: { [key: string]: number } = {};
    extractedItems.forEach(item => {
      resumo[item.categoria] = (resumo[item.categoria] || 0) + 1;
    });
    console.log(resumo);
    console.log('========================================');

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
