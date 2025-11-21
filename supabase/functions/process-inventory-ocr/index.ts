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

const SYSTEM_PROMPT = `Você é um especialista em transcrição de documentos contábeis manuscritos (OCR avançado).
Sua missão é extrair dados de uma tabela de controle de estoque de joias com precisão cirúrgica.

### 🗺️ MAPA DA TABELA (Leia da Esquerda para a Direita)
As colunas seguem estritamente esta ordem visual:
1. Pulseiras
2. Correntes
3. Pingentes
4. Anéis
5. Brincos G
6. Brincos I
7. Brincos M
8. Argolas

### ⚠️ REGRAS DE OURO (Visão Computacional)
1. **Barreiras Verticais:** As linhas verticais são muros intransponíveis. NUNCA leia um número atravessando uma linha vertical.
2. **Leitura Vertical:** Leia uma coluna inteira de cima para baixo antes de passar para a próxima coluna à direita.
3. **Separador de Itens:** Cada número escrito em uma "célula" (espaço entre linhas da pauta) é um item ÚNICO.
   - Erro comum a evitar: Ler "20" na linha de cima e "00" na linha de baixo como "2000". Se estão em linhas de pauta diferentes, são dois preços distintos.
4. **Formatação de Preço:** Os números representam valores em Reais (R$).
   - Exemplo: Um "52" escrito à mão é R$ 52,00.
   - Ignore símbolos de moeda, foque nos dígitos.
5. **Células Vazias:** Ignore células com "X", "-" ou vazias.
6. **Múltiplos Números:** Se houver múltiplos números na mesma célula (ex: 200 e 6 um abaixo do outro), cada um é um item separado.

### 🎯 ESTRATÉGIA DE LEITURA
1. Identifique o cabeçalho com as 8 categorias
2. Para cada coluna (da esquerda para a direita):
   - Leia todos os números de cima para baixo
   - Cada número = 1 item com aquela categoria
   - Pule para a próxima coluna
3. NUNCA misture valores de colunas adjacentes

### 📤 SAÍDA ESPERADA
Retorne APENAS um JSON válido contendo um array de objetos. Sem markdown, sem explicações, sem texto extra.

Formato EXATO:
[
  { "categoria": "Pulseiras", "valor": 316, "quantidade": 1 },
  { "categoria": "Pulseiras", "valor": 214, "quantidade": 1 },
  { "categoria": "Correntes", "valor": 52, "quantidade": 1 },
  { "categoria": "Anéis", "valor": 125, "quantidade": 1 }
]

IMPORTANTE:
- Use os nomes EXATOS das categorias: Pulseiras, Correntes, Pingentes, Anéis, Brincos G, Brincos I, Brincos M, Argolas
- quantidade sempre = 1
- valor = número inteiro (sem centavos)
- Retorne APENAS o array JSON, sem comentários`;

Deno.serve(async (req: Request) => {
  console.log("\n=== NOVA REQUISIÇÃO OCR (Gemini 1.5 Pro) ===", new Date().toISOString());

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
          error: "Chave da API do Google não configurada. Consulte GOOGLE_API_SETUP.md",
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

    console.log("🤖 Inicializando Gemini 1.5 Pro (Raciocínio Espacial Avançado)...");
    const genAI = new GoogleGenerativeAI(googleApiKey);

    // 🚀 MUDANÇA CRÍTICA: Usando 'gemini-1.5-pro' para melhor raciocínio espacial em tabelas
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      },
    });

    console.log("🚀 Chamando Gemini 1.5 Pro com prompt estruturado...");

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

    console.log("\n📥 Resposta Gemini Pro:");
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

      // Validação e Normalização
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
      }).map(item => ({
        ...item,
        // Garante que a categoria tenha a primeira letra maiúscula
        categoria: item.categoria.charAt(0).toUpperCase() + item.categoria.slice(1).toLowerCase()
      }));

      items = validItems;

      if (items.length === 0) {
        console.warn("⚠️ Nenhum item válido");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Nenhum item detectado. Verifique se a foto está nítida e contém uma tabela clara.",
            rawResponse: text,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`\n✅ SUCESSO: ${items.length} itens válidos`);
      console.log("📊 Amostra:", items.slice(0, 5));

      // Resumo por categoria
      const resumo: { [key: string]: number } = {};
      items.forEach(item => {
        resumo[item.categoria] = (resumo[item.categoria] || 0) + 1;
      });
      console.log("📈 Resumo por categoria:", resumo);

    } catch (parseError) {
      console.error("❌ Erro parse:", parseError);
      console.error("Texto original:", text);
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