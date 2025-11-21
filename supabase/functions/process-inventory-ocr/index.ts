import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractedItem {
  categoria: string;
  valor: number;
  quantidade: number;
}

interface OCRResponse {
  items: ExtractedItem[];
  success: boolean;
  error?: string;
  rawResponse?: string;
}

const SYSTEM_PROMPT = `Você é um especialista em digitalização de documentos manuscritos. Analise a imagem fornecida, que é uma tabela de controle de vendas de joias/semijoias.

Estrutura da Tabela:
- O cabeçalho contém as categorias: Pulseiras, Correntes, Pingentes, Anéis, Brincos G, Brincos I, Brincos M, Argolas.
- As linhas verticais são divisórias estritas entre colunas. NÃO misture números de colunas diferentes.
- Cada célula contendo um número manuscrito representa um item único e seu preço em reais.
- Ignore células com um 'X', traço '-' ou vazias.
- Se houver múltiplos números na mesma célula, cada um é um item separado.

Sua Tarefa:
Extraia TODOS os itens visíveis da tabela e retorne APENAS um array JSON puro, sem markdown, sem comentários, neste formato EXATO:

[
  { "categoria": "Pulseiras", "valor": 316, "quantidade": 1 },
  { "categoria": "Pulseiras", "valor": 214, "quantidade": 1 },
  { "categoria": "Correntes", "valor": 884, "quantidade": 1 },
  { "categoria": "Pingentes", "valor": 125, "quantidade": 1 }
]

REGRAS CRÍTICAS:
1. O número dentro da célula é o PREÇO (valor) em reais
2. Cada célula com número gera UM item separado (quantidade sempre 1)
3. Respeite RIGOROSAMENTE as colunas da tabela (não misture colunas)
4. Use os nomes EXATOS das categorias: Pulseiras, Correntes, Pingentes, Anéis, Brincos G, Brincos I, Brincos M, Argolas
5. Se a caligrafia for ambígua, use lógica de preços de mercado (joias custam entre R$15 e R$9999)
6. Retorne APENAS o JSON array, sem explicações, sem markdown, sem texto extra
7. Se não encontrar itens, retorne array vazio: []`;

Deno.serve(async (req: Request) => {
  console.log("\n=== NOVA REQUISIÇÃO OCR ===", new Date().toISOString());

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      console.error("❌ Método não permitido:", req.method);
      return new Response(
        JSON.stringify({ success: false, error: "Método não permitido" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!googleApiKey) {
      console.error("❌ GOOGLE_API_KEY não encontrada");
      return new Response(
        JSON.stringify({
          success: false,
          error: "GOOGLE_API_KEY não configurada. Consulte GOOGLE_API_SETUP.md",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ GOOGLE_API_KEY encontrada");

    const formData = await req.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      console.error("❌ Nenhuma imagem enviada");
      return new Response(
        JSON.stringify({ success: false, error: "Nenhuma imagem enviada" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("📷 Imagem:", imageFile.name, imageFile.type, (imageFile.size / 1024).toFixed(2) + "KB");

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    let mimeType = imageFile.type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      mimeType = "image/jpeg";
    }

    console.log("✅ Base64:", (base64Image.length / 1024).toFixed(2) + "KB");

    console.log("🤖 Inicializando Gemini 2.0 Flash Experimental...");
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      },
    });

    console.log("🚀 Chamando Gemini API...");

    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    console.log("\n📥 Resposta Gemini:");
    console.log(text);

    let items: ExtractedItem[];
    try {
      let cleanedText = text.trim();

      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/```\n?/g, "");
      }

      const jsonMatch = cleanedText.match(/\[.*\]/s);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      cleanedText = cleanedText.trim();

      console.log("🧼 Parsing JSON...");

      items = JSON.parse(cleanedText);

      if (!Array.isArray(items)) {
        throw new Error("Resposta não é array");
      }

      console.log(`📦 ${items.length} itens parseados`);

      const validItems = items.filter(item => {
        const isValid = (
          item &&
          typeof item === "object" &&
          typeof item.categoria === "string" &&
          typeof item.valor === "number" &&
          typeof item.quantidade === "number" &&
          item.valor > 0 &&
          item.quantidade > 0
        );

        if (!isValid) {
          console.warn("⚠️ Item inválido:", JSON.stringify(item));
        }

        return isValid;
      });

      items = validItems;

      if (items.length === 0) {
        console.warn("⚠️ Nenhum item válido");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Nenhum item detectado. Verifique se a foto está nítida e contém uma tabela.",
            rawResponse: text,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`\n✅ SUCESSO: ${items.length} itens válidos`);
      console.log("Amostra:", items.slice(0, 3));

    } catch (parseError) {
      console.error("❌ Erro parse:", parseError);
      console.error("Texto:", text);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao interpretar resposta IA: " + (parseError as Error).message,
          rawResponse: text,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ocrResponse: OCRResponse = {
      items,
      success: true,
      rawResponse: text,
    };

    return new Response(JSON.stringify(ocrResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ ERRO GERAL:", error);
    console.error("Stack:", (error as Error).stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Erro ao processar: " + ((error as Error).message || "Erro desconhecido"),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
    );
  }
});