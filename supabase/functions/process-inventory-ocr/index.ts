import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InventoryItem {
  categoria: string;
  items: Array<{
    numero: string;
    valor: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { panoId, imageUrl } = await req.json();

    if (!panoId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'panoId and imageUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the image from Supabase Storage
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    // Use OpenAI Vision API to extract data
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      // Fallback: Parse manually with basic structure
      const ocrData = {
        categorias: [
          { nome: 'Pulseiras', items: [] },
          { nome: 'Correntes', items: [] },
          { nome: 'Pingentes', items: [] },
          { nome: 'Anéis', items: [] },
          { nome: 'Brincos G', items: [] },
          { nome: 'Brincos I', items: [] },
          { nome: 'Brincos M', items: [] },
          { nome: 'Argolas', items: [] },
        ],
        processed_at: new Date().toISOString(),
        method: 'manual'
      };

      await supabase
        .from('panos')
        .update({ ocr_processed: true, ocr_data: ocrData })
        .eq('id', panoId);

      return new Response(
        JSON.stringify({ success: true, data: ocrData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extraia TODOS os dados desta tabela de inventário de joias. Para cada categoria (Pulseiras, Correntes, Pingentes, Anéis, Brincos G, Brincos I, Brincos M, Argolas), liste TODOS os números e seus valores correspondentes. Retorne um JSON estruturado com o formato:
{
  "categorias": [
    {
      "nome": "Pulseiras",
      "items": [{"numero": "166", "valor": 0}, {"numero": "248", "valor": 0}, ...]
    },
    ...
  ]
}

IMPORTANTE: 
- Cada número na coluna é um produto
- Cada número tem um valor correspondente na linha
- Se um número tem X marcado, ainda assim inclua
- Capture TODOS os números visíveis em cada categoria
- Os valores estão na última linha de cada coluna`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000
      }),
    });

    const openaiData = await openaiResponse.json();
    
    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(openaiData)}`);
    }

    const extractedText = openaiData.choices[0].message.content;
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    const ocrData = jsonMatch ? JSON.parse(jsonMatch[0]) : { categorias: [] };
    ocrData.processed_at = new Date().toISOString();
    ocrData.method = 'openai-vision';

    // Update the pano with OCR data
    const { error: updateError } = await supabase
      .from('panos')
      .update({ ocr_processed: true, ocr_data: ocrData })
      .eq('id', panoId);

    if (updateError) throw updateError;

    // Auto-create items in itens_pano table
    const categoryMap: Record<string, string> = {
      'Pulseiras': 'pulseira',
      'Correntes': 'colar',
      'Pingentes': 'pingente',
      'Anéis': 'anel',
      'Brincos G': 'brinco',
      'Brincos I': 'brinco',
      'Brincos M': 'brinco',
      'Argolas': 'argola',
    };

    const itemsToInsert = [];
    for (const cat of ocrData.categorias) {
      const categoria = categoryMap[cat.nome] || 'outro';
      for (const item of cat.items) {
        itemsToInsert.push({
          pano_id: panoId,
          categoria,
          descricao: `${cat.nome} - ${item.numero}`,
          quantidade_inicial: 1,
          quantidade_disponivel: 1,
          valor_unitario: item.valor || 0,
        });
      }
    }

    if (itemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('itens_pano')
        .insert(itemsToInsert);

      if (insertError) {
        console.error('Error inserting items:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: ocrData, itemsCreated: itemsToInsert.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});