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

// Mapeia variações de nomes de categorias (PLURAL conforme papel OCR)
const CATEGORIAS_MAP: { [key: string]: string } = {
  'pulseira': 'Pulseiras',
  'pulseiras': 'Pulseiras',
  'corrente': 'Correntes',
  'correntes': 'Correntes',
  'pingente': 'Pingentes',
  'pingentes': 'Pingentes',
  'anel': 'Anéis',
  'aneis': 'Anéis',
  'anéis': 'Anéis',
  'brinco': 'Brincos G', // Fallback genérico
  'brincos': 'Brincos G',
  'brincosg': 'Brincos G',
  'brincos g': 'Brincos G',
  'brinco g': 'Brincos G',
  'brincosi': 'Brincos I',
  'brincos i': 'Brincos I',
  'brinco i': 'Brincos I',
  'brincosm': 'Brincos M',
  'brincos m': 'Brincos M',
  'brinco m': 'Brincos M',
  'argola': 'Argolas',
  'argolas': 'Argolas',
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

// Extrai números de uma linha com informações de posição
function extrairNumerosComPosicao(linha: string): Array<{valor: number, posicao: number}> {
  const numeros: Array<{valor: number, posicao: number}> = [];
  const regex = /\d+/g;
  let match;

  while ((match = regex.exec(linha)) !== null) {
    const num = parseInt(match[0]);
    if (num >= 10 && num <= 9999) {
      numeros.push({
        valor: num,
        posicao: match.index
      });
    }
  }

  return numeros;
}

// Extrai números de uma linha (compatibilidade)
function extrairNumeros(linha: string): number[] {
  return extrairNumerosComPosicao(linha).map(n => n.valor);
}

// Processa tabela de inventário com colunas de categorias
function processarTabelaInventario(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const linhas = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  console.log('=== PROCESSANDO TABELA ===');
  console.log('Total de linhas:', linhas.length);

  // Procura pela linha de cabeçalho com categorias
  let categorias: string[] = [];
  let posicoesColuna: number[] = [];
  let linhaInicioDados = 0;

  // Primeiro, encontra o cabeçalho
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const linha = linhas[i];
    const categoriasDetectadas = detectarCategorias(linha);

    if (categoriasDetectadas.length >= 3) {
      categorias = categoriasDetectadas;
      linhaInicioDados = i + 1;
      console.log('Cabeçalho encontrado na linha', i);
      console.log('Categorias detectadas:', categorias);

      // Detecta as posições das colunas baseado no cabeçalho
      const palavrasLower = linha.toLowerCase();
      for (const cat of categorias) {
        const catLower = cat.toLowerCase();
        const pos = palavrasLower.indexOf(catLower);
        if (pos !== -1) {
          posicoesColuna.push(pos);
        }
      }
      console.log('Posições das colunas:', posicoesColuna);
      break;
    }
  }

  // Se não encontrou cabeçalho, usa ordem padrão
  if (categorias.length === 0) {
    console.log('Cabeçalho não detectado, usando ordem padrão do papel OCR');
    categorias = ['Pulseiras', 'Correntes', 'Pingentes', 'Anéis', 'Brincos G', 'Brincos I', 'Brincos M', 'Argolas'];

    // Tenta encontrar primeira linha com múltiplos números para determinar colunas
    for (let i = 0; i < Math.min(linhas.length, 15); i++) {
      const numerosComPos = extrairNumerosComPosicao(linhas[i]);
      if (numerosComPos.length >= 4) {
        linhaInicioDados = i;
        // Usa as posições dos números como referência das colunas
        posicoesColuna = numerosComPos.slice(0, categorias.length).map(n => n.posicao);
        console.log('Primeira linha de dados na posição:', i);
        console.log('Posições das colunas estimadas:', posicoesColuna);
        break;
      }
    }
  }

  console.log('Processando dados a partir da linha:', linhaInicioDados);

  // Analisa linhas de dados para construir mapa de colunas mais preciso
  const valoresPorColuna: number[][] = Array(categorias.length).fill(null).map(() => []);
  const linhasDeDados: string[] = [];

  // Coleta primeiras linhas de dados
  for (let i = linhaInicioDados; i < Math.min(linhaInicioDados + 20, linhas.length); i++) {
    const linha = linhas[i];
    const numeros = extrairNumeros(linha);

    if (numeros.length >= 2 && numeros.length <= 10) {
      linhasDeDados.push(linha);
    }
  }

  // Se encontramos posições de colunas, usa para mapear valores
  if (posicoesColuna.length > 0 && linhasDeDados.length > 0) {
    console.log('Usando mapeamento por posição de colunas');

    for (const linha of linhasDeDados) {
      const numerosComPos = extrairNumerosComPosicao(linha);

      // Mapeia cada número à coluna mais próxima
      for (const num of numerosComPos) {
        let colunaIdx = 0;
        let menorDistancia = Math.abs(num.posicao - posicoesColuna[0]);

        for (let j = 1; j < posicoesColuna.length; j++) {
          const distancia = Math.abs(num.posicao - posicoesColuna[j]);
          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            colunaIdx = j;
          }
        }

        // Só adiciona se a distância for razoável (dentro da coluna)
        if (menorDistancia < 50) {
          valoresPorColuna[colunaIdx].push(num.valor);
        }
      }
    }
  } else {
    // Fallback: distribui números sequencialmente
    console.log('Usando distribuição sequencial (fallback)');

    for (const linha of linhasDeDados) {
      const numeros = extrairNumeros(linha);

      // Pula o primeiro número se parecer ser um código de linha (< 1000)
      const inicioIdx = (numeros[0] < 1000 && numeros.length > 3) ? 1 : 0;

      for (let j = inicioIdx; j < numeros.length; j++) {
        const colunaIdx = j - inicioIdx;
        if (colunaIdx < categorias.length) {
          valoresPorColuna[colunaIdx].push(numeros[j]);
        }
      }
    }
  }

  // Cria itens a partir dos valores mapeados
  for (let i = 0; i < categorias.length; i++) {
    const categoria = categorias[i];
    const valores = valoresPorColuna[i];

    console.log(`${categoria}: ${valores.length} valores -`, valores.slice(0, 5));

    for (const valor of valores) {
      // Filtra valores muito pequenos (provavelmente códigos)
      if (valor >= 15) {
        items.push({
          categoria: categoria,
          valor: valor,
          quantidade: 1
        });
      }
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
