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
    console.log('🚀 Iniciando processamento com Google Gemini 2.0 Flash Experimental...');

    // Convert to File if it's a string (URL)
    let file: File;
    if (typeof imageFile === 'string') {
      console.log('📥 Baixando imagem da URL...');
      const response = await fetch(imageFile);
      const blob = await response.blob();
      file = new File([blob], 'image.jpg', { type: blob.type });
    } else {
      file = imageFile;
    }

    console.log('📸 Imagem:', file.name, file.type, (file.size / 1024).toFixed(2) + 'KB');
    console.log('📤 Enviando para Google Gemini AI via Edge Function...');

    // Get Supabase URL and anon key
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('❌ Configuração do Supabase não encontrada. Verifique o arquivo .env');
    }

    // Get session token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('❌ Usuário não autenticado. Faça login novamente.');
    }

    // Call Edge Function
    const formData = new FormData();
    formData.append('image', file);

    const functionUrl = `${supabaseUrl}/functions/v1/process-inventory-ocr`;

    console.log('🌐 Chamando:', functionUrl);

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    console.log('📡 Status da resposta:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Erro HTTP ${response.status}: ${response.statusText}`
      }));
      console.error('❌ Erro da Edge Function:', errorData);
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const result: OCRResult = await response.json();

    console.log('✅ Resposta recebida do Gemini 2.0 Flash Experimental');
    console.log('========================================');
    console.log('ITENS EXTRAÍDOS PELO GEMINI:');
    console.log(JSON.stringify(result.items, null, 2));
    console.log('========================================');

    if (!result.success) {
      console.warn('⚠️ OCR não teve sucesso:', result.error);
      return {
        items: [],
        success: false,
        error: result.error || 'Nenhum item foi detectado na imagem. Verifique se a foto está nítida e bem iluminada.',
        rawText: result.rawText,
      };
    }

    if (result.items.length === 0) {
      console.warn('⚠️ Nenhum item foi extraído');
      return {
        items: [],
        success: false,
        error: 'Nenhum item foi detectado na imagem. Certifique-se de que:\n• A foto está nítida e bem iluminada\n• A tabela está visível e legível\n• Os números estão escritos claramente',
        rawText: result.rawText,
      };
    }

    console.log(`\n🎉 SUCESSO! ${result.items.length} itens extraídos`);
    const resumo: { [key: string]: number } = {};
    result.items.forEach(item => {
      resumo[item.categoria] = (resumo[item.categoria] || 0) + 1;
    });
    console.log('📊 Resumo por categoria:', resumo);
    console.log('');

    return {
      items: result.items,
      success: true,
      rawText: result.rawText,
    };
  } catch (error) {
    console.error('❌ ERRO no processamento OCR:', error);
    console.error('Stack:', (error as Error).stack);

    let errorMessage = 'Erro ao processar imagem';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Mensagens mais amigáveis para erros comuns
      if (error.message.includes('GOOGLE_API_KEY')) {
        errorMessage = '⚠️ A chave do Google AI não está configurada. Consulte o arquivo GOOGLE_API_SETUP.md para instruções.';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        errorMessage = '⚠️ Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message.includes('não autenticado')) {
        errorMessage = '⚠️ Sessão expirada. Faça login novamente.';
      }
    }

    return {
      items: [],
      success: false,
      error: errorMessage,
    };
  }
}
