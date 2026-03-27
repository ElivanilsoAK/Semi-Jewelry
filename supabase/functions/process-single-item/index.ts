import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@latest";

const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY');
// Usar gemini-3-flash-preview / gemini-1.5-flash permite até 15 RPM na camada free v1beta
const MODEL_NAME = 'gemini-3-flash-preview';

interface RequestBody {
  image_url: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GOOGLE_API_KEY");
    }

    const { image_url }: RequestBody = await req.json();

    if (!image_url) {
      throw new Error("Missing image_url in request body");
    }

    // 1. Download image
    const imageRes = await fetch(image_url);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image: ${imageRes.statusText}`);
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const mimeType = imageRes.headers.get("content-type") || "image/jpeg";
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // 2. Setup Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // 3. Prompt constraints
    const prompt = `Você é um avaliador de semijoias (SPHERE BY MAGOLD).
Eu preciso classificar e cadastrar essa peça que foi fotografada. Olhe atentamente a foto.

Retorne SOMENTE um JSON válido com este formato exato:
{
  "sucesso": true,
  "categoria": "Pulseiras" | "Correntes" | "Pingentes" | "Anéis" | "Brincos G" | "Brincos I" | "Brincos M" | "Argolas" | "Outro",
  "descricao_venda": "Nome e descrição altamente profissional para vitrine da peça (Ex: Colar Ouro 18k com Zircônia Cravejada)",
  "observacoes": "Descreva detalhes que notou na peça, se é banhada, se parece prateada ou dourada, pedra, tamanho aproximado."
}

INSTRUÇÕES:
1. Classifique na 'categoria' existente que faz mais sentido. Prata ou dourado não é categoria, e sim Brinco, Corrente, Anel etc.
2. A 'descricao_venda' deve ser chique, comercial, breve. NUNCA exceda 8-10 palavras (Exemplo ruim: "Uma linda gargantilha dourada com elos...". Exemplo bom: "Gargantilha Dourada Banhada Elos Ovos 45cm").
3. Retorne APENAS um bloco JSON limpo (sem tags \`\`\`json Markdown).`;

    // 4. Generate Content
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType
            }
          }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const text = result.response.text();

    return new Response(
      text, // Deve vir puramente Json devido ao responseMimeType
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error Single Item process:', error.message);
    return new Response(JSON.stringify({ 
      sucesso: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
