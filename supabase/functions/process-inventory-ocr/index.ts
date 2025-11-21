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

const SYSTEM_PROMPT = `Você é um especialista em digitalização de documentos manuscritos. Analise a imagem fornecida, que é uma tabela de controle de vendas de joias.

Estrutura da Tabela:
- O cabeçalho contém as categorias: Pulseiras, Correntes, Pingentes, Anéis, Brincos G, Brincos I, Brincos M, Argolas.
- As linhas verticais são divisórias estritas. NÃO misture números de colunas diferentes.
- Cada célula contendo um número manuscrito representa um item único e seu preço.
- Ignore células com um 'X' ou vazias.

Sua Tarefa:
Extraia todos os itens visíveis e retorne APENAS um array JSON puro, sem markdown, neste formato exato:

[
  { "categoria": "Pulseiras", "valor": 316, "quantidade": 1 },
  { "categoria": "Pulseiras", "valor": 214, "quantidade": 1 },
  { "categoria": "Correntes", "valor": 884, "quantidade": 1 }
]

Atenção:
- O número dentro da célula é o preço (valor).
- Se houver dúvidas entre dois dígitos por causa da caligrafia, use a lógica de preços de mercado.
- Cada célula com número gera UM item separado.
- Respeite estritamente as colunas da tabela.
- Retorne APENAS o JSON, sem texto adicional, sem markdown, sem explicações.`;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Google API Key from environment
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!googleApiKey) {
      console.error("GOOGLE_API_KEY not found in environment");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração do servidor incompleta. Entre em contato com o administrador.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const formData = await req.formData();
    const imageFile = formData.get("image");

    if (!imageFile || !(imageFile instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhuma imagem foi enviada" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing image:", imageFile.name, imageFile.type, imageFile.size);

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Get mime type
    let mimeType = imageFile.type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      mimeType = "image/jpeg";
    }

    console.log("Image converted to base64, size:", base64Image.length, "mime:", mimeType);

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("Calling Gemini API...");

    // Call Gemini with image and prompt
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

    console.log("Gemini response:", text);

    // Parse JSON response
    let items: ExtractedItem[];
    try {
      // Remove markdown code blocks if present
      let cleanedText = text.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/```\n?/g, "");
      }
      cleanedText = cleanedText.trim();

      items = JSON.parse(cleanedText);

      // Validate structure
      if (!Array.isArray(items)) {
        throw new Error("Response is not an array");
      }

      // Validate each item
      items = items.filter(item => {
        return (
          item &&
          typeof item === "object" &&
          typeof item.categoria === "string" &&
          typeof item.valor === "number" &&
          typeof item.quantidade === "number" &&
          item.valor > 0 &&
          item.quantidade > 0
        );
      });

      if (items.length === 0) {
        throw new Error("No valid items found in response");
      }

      console.log(`Successfully extracted ${items.length} items`);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      console.error("Raw response:", text);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível processar a resposta da IA. Tente novamente.",
          rawResponse: text,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return success
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
    console.error("Error processing OCR:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao processar imagem",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});