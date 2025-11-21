# Configuração da Google Generative AI (Gemini)

O sistema de OCR agora usa a **Google Generative AI API (Gemini)** para leitura inteligente de tabelas manuscritas.

## Por que Gemini?

- **Precisão superior** em caligrafia manuscrita
- **Compreensão contextual** da estrutura de tabelas
- **Separação correta** de colunas (não mistura valores)
- **Melhor interpretação** de números ambíguos

## Como Configurar

### 1. Obter a API Key do Google

1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em **"Get API Key"** ou **"Create API Key"**
4. Copie a chave gerada (formato: `AIza...`)

### 2. Adicionar no Supabase

A chave precisa ser configurada como **secret** na Edge Function:

#### Opção A: Via Dashboard Supabase

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Edge Functions** no menu lateral
4. Clique em **Settings** ou **Manage secrets**
5. Adicione um novo secret:
   - **Nome**: `GOOGLE_API_KEY`
   - **Valor**: Sua chave API do Google (ex: `AIzaSyC...`)
6. Salve

#### Opção B: Via CLI Supabase (se tiver instalado)

```bash
supabase secrets set GOOGLE_API_KEY=AIzaSyC...
```

### 3. Testar a Integração

Após configurar a chave:

1. Acesse o sistema
2. Vá em **Panos** > **Novo Pano**
3. Faça upload da foto da tabela manuscrita
4. O sistema usará automaticamente o Gemini para processar

## Verificando se está Funcionando

No console do navegador (F12), você verá logs como:

```
🚀 Iniciando processamento com Google Gemini AI...
📤 Enviando imagem para Edge Function...
✅ Resposta recebida do Gemini
📊 Total de itens extraídos: 47
```

## Solução de Problemas

### Erro: "Configuração do servidor incompleta"

A variável `GOOGLE_API_KEY` não está configurada no Supabase. Siga o passo 2 acima.

### Erro: "API key not valid"

A chave está incorreta ou expirou. Gere uma nova no Google AI Studio.

### Erro: "Quota exceeded"

Você excedeu o limite gratuito da API. Verifique seu plano no Google Cloud.

## Limites e Custos

- **Gemini 1.5 Flash**: 15 requests/minuto (grátis)
- **Gemini 1.5 Pro**: 2 requests/minuto (grátis)

Para uso maior, considere upgrade no [Google Cloud Console](https://console.cloud.google.com/).

## Modelo Utilizado

O sistema usa o **gemini-1.5-flash** por padrão:
- Rápido (1-2 segundos por imagem)
- Preciso para textos manuscritos
- Ótimo custo-benefício

Se precisar de maior precisão, pode alterar para `gemini-1.5-pro` na Edge Function.

---

**Dúvidas?** Verifique a [documentação oficial do Google AI](https://ai.google.dev/docs)
