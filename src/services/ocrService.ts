import { supabase } from '../lib/supabase';

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


export async function processInventoryImage(imageFile: File | string): Promise<OCRResult> {
  try {
    console.log('🚀 Iniciando processamento com Google Gemini AI...');

    // Convert to File if it's a string (URL)
    let file: File;
    if (typeof imageFile === 'string') {
      const response = await fetch(imageFile);
      const blob = await response.blob();
      file = new File([blob], 'image.jpg', { type: blob.type });
    } else {
      file = imageFile;
    }

    console.log('📤 Enviando imagem para Edge Function...');

    // Get Supabase URL and anon key
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração do Supabase não encontrada');
    }

    // Get session token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('Usuário não autenticado');
    }

    // Call Edge Function
    const formData = new FormData();
    formData.append('image', file);

    const functionUrl = `${supabaseUrl}/functions/v1/process-inventory-ocr`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const result: OCRResult = await response.json();

    console.log('✅ Resposta recebida do Gemini');
    console.log('========================================');
    console.log('ITENS EXTRAÍDOS PELO GEMINI:');
    console.log(JSON.stringify(result.items, null, 2));
    console.log('========================================');

    if (!result.success || result.items.length === 0) {
      return {
        items: [],
        success: false,
        error: result.error || 'Nenhum item foi detectado na imagem. Verifique se a foto está nítida e bem iluminada.',
        rawText: result.rawText,
      };
    }

    console.log(`📊 Total de itens extraídos: ${result.items.length}`);
    const resumo: { [key: string]: number } = {};
    result.items.forEach(item => {
      resumo[item.categoria] = (resumo[item.categoria] || 0) + 1;
    });
    console.log('Resumo por categoria:', resumo);

    return {
      items: result.items,
      success: true,
      rawText: result.rawText,
    };
  } catch (error) {
    console.error('❌ Erro no processamento OCR:', error);
    return {
      items: [],
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao processar imagem',
    };
  }
}
