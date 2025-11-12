# Notas Importantes - Sistema Multiusuário com OCR

## O Que Foi Implementado

### 1. Sistema Multiusuário Completo
- Cada usuário tem seus próprios dados isolados
- Nenhum usuário pode ver ou acessar dados de outros usuários
- Segurança garantida através de Row Level Security (RLS) no Supabase

### 2. OCR Gratuito para Cadastro de Panos
- Sistema usa Tesseract.js (100% gratuito, sem custos de API)
- Processa a foto do documento e extrai automaticamente os itens
- Modal de revisão permite corrigir/editar itens antes de salvar

### 3. Campos Adicionais
- Fornecedor (padrão: Magold)
- Comissão percentual

## Como Usar o Sistema

### Primeiro Acesso
1. Crie uma conta com email e senha
2. Faça login com suas credenciais
3. Seus dados são completamente separados de outros usuários

### Cadastrar um Novo Pano
1. Clique em "Novo Pano"
2. Preencha os campos (nome, datas, fornecedor, comissão)
3. **IMPORTANTE**: Tire uma foto clara do documento do pano
4. Faça upload da foto
5. Clique em "Salvar"
6. O sistema vai processar o OCR automaticamente (alguns segundos)
7. Um modal aparece com os itens detectados
8. Revise os itens:
   - Edite números ou categorias se necessário
   - Adicione itens que não foram detectados
   - Remova itens detectados incorretamente
9. Clique em "Confirmar" para salvar os itens no banco

### Dicas para Melhores Resultados com OCR
1. **Iluminação**: Tire foto com boa iluminação
2. **Foco**: Garanta que a foto está nítida e em foco
3. **Ângulo**: Tire a foto de cima, perpendicular ao documento
4. **Enquadramento**: Capture todo o documento na foto
5. **Contraste**: Certifique-se que os números são legíveis

### Observação sobre o OCR
- O OCR pode não ser 100% preciso
- Por isso existe o modal de revisão antes de salvar
- Sempre revise os itens extraídos antes de confirmar
- Você pode adicionar/editar/remover itens manualmente

## Estrutura do Banco de Dados

Todas as tabelas agora tem `user_id`:
- `clientes` - Seus clientes
- `panos` - Seus panos
- `itens_pano` - Itens dos seus panos
- `vendas` - Suas vendas
- `itens_venda` - Itens das suas vendas
- `pagamentos` - Pagamentos das suas vendas

## Segurança

### O que está protegido:
- ✅ Todos os dados são filtrados por usuário automaticamente
- ✅ RLS ativo em todas as tabelas
- ✅ Impossível acessar dados de outros usuários
- ✅ Storage de fotos também tem isolamento por usuário

### Práticas recomendadas:
- Use senhas fortes
- Não compartilhe sua conta
- Cada pessoa que usar o sistema deve ter sua própria conta

## Tecnologias Usadas

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **OCR**: Tesseract.js (gratuito, offline-capable)
- **Segurança**: Row Level Security (RLS)

## Suporte e Melhorias Futuras

### Possíveis melhorias:
- Treinar modelo de OCR específico para esse tipo de documento
- Adicionar mais categorias de produtos
- Exportar relatórios em PDF/Excel
- Notificações de prazos vencidos
- Dashboard com métricas avançadas

## Problemas Comuns

### OCR não detectou nenhum item
- Verifique se a foto está clara e legível
- Tente tirar a foto novamente com melhor iluminação
- Você pode adicionar itens manualmente no modal de revisão

### Dados não aparecem após login
- Verifique se está logado com a conta correta
- Cada conta tem seus próprios dados isolados
- Se cadastrou em uma conta, precisa logar nessa mesma conta para ver os dados

### Upload de foto falha
- Verifique o tamanho da imagem (máximo recomendado: 10MB)
- Formatos aceitos: JPG, PNG
- Verifique sua conexão com a internet

## Contato

Em caso de dúvidas ou problemas, entre em contato com o desenvolvedor.
