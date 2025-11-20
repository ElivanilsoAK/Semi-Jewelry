# Próximas Implementações Necessárias

## ✅ Concluído Nesta Sessão

### 1. Database - Suporte a Fotos
- ✅ Campo `foto_url` adicionado em `itens_pano`
- ✅ Bucket `item-photos` criado no Supabase Storage
- ✅ Storage configurado para fotos públicas

### 2. OCR Melhorado
- ✅ Serviço OCR reescrito para entender estrutura de tabela
- ✅ Detecta categorias como colunas (Pulseiras, Correntes, etc.)
- ✅ Agrupa valores repetidos automaticamente
- ✅ Conta quantidade de cada valor por categoria
- ✅ Gera descrição: "Categoria - Valor"

## 📋 Pendente de Implementação

### 1. Componente de Upload de Foto (ALTA PRIORIDADE)

Criar componente reutilizável: `/src/components/common/PhotoUpload.tsx`

```typescript
interface PhotoUploadProps {
  onPhotoSelected: (file: File) => void;
  currentPhoto?: string;
  optional?: boolean;
}
```

Funcionalidades:
- Botão "Tirar Foto" (acesso à câmera)
- Botão "Escolher Arquivo"  
- Preview da foto selecionada
- Botão para remover foto
- Compressão automática de imagem

### 2. Atualizar OCRPreviewModal

Arquivo: `/src/components/modals/OCRPreviewModal.tsx`

Mudanças necessárias:
- Usar nova interface `ExtractedItem` (categoria, valor, quantidade, descricao)
- Mostrar itens agrupados por categoria
- Exibir quantidade de cada item
- Permitir edição antes de salvar
- Adicionar foto opcional para cada item

### 3. Atualizar ItensModal

Arquivo: `/src/components/modals/ItensModal.tsx`

Melhorias:
- Agrupar itens por categoria
- Mostrar foto de cada item (thumbnail)
- Cards expansíveis por categoria
- Contadores por categoria
- Botão "Editar" em cada item
- Filtros e busca

### 4. Criar Modal de Edição de Item

Criar: `/src/components/modals/EditarItemModal.tsx`

Campos:
- Descrição
- Categoria
- Valor unitário
- Quantidade disponível
- **Foto** (upload/captura)

### 5. Criar View de Relatórios

Criar: `/src/components/views/RelatoriosView.tsx`

Abas:
1. **Catálogo** - Imprimir produtos com fotos
2. **Vendas** - Relatório de vendas por período
3. **Clientes** - Ranking e histórico
4. **Financeiro** - Pagamentos e pendências

### 6. Criar Gerador de Catálogo PDF

Criar: `/src/lib/catalogPDF.ts`

Funcionalidades:
- Logo do sistema no topo
- Nome "Semi-Joias - Sistema de Gestão"
- Grid de produtos com:
  - Foto (se disponível)
  - Nome do produto
  - Valor
  - Design minimalista e profissional
- Exportar como PDF para impressão

### 7. Criar Relatório de Vendas

Arquivo: `/src/components/views/RelatoriosView.tsx` (aba Vendas)

Filtros:
- Período (data início/fim)
- Cliente específico
- Status (pago/pendente)
- Pano específico

Visualizações:
- Tabela de vendas
- Gráfico de vendas por período
- Total vendido
- Ticket médio
- Exportar para PDF/Excel

### 8. Mobile Responsivo

Melhorias gerais em todos os modals e views:
- Forms em coluna única no mobile
- Botões maiores (44px mínimo)
- Inputs maiores e espaçados
- Modals full-screen em mobile
- Navegação tipo drawer
- Touch-friendly

## 🎯 Estrutura de Arquivos Sugerida

```
src/
├── components/
│   ├── common/
│   │   ├── PhotoUpload.tsx          # CRIAR
│   │   ├── Button.tsx
│   │   └── Modal.tsx
│   ├── modals/
│   │   ├── EditarItemModal.tsx      # CRIAR
│   │   ├── OCRPreviewModal.tsx      # ATUALIZAR
│   │   └── ItensModal.tsx           # ATUALIZAR
│   ├── views/
│   │   ├── RelatoriosView.tsx       # CRIAR
│   │   └── ...
├── lib/
│   ├── catalogPDF.ts                # CRIAR
│   ├── reportHelpers.ts             # CRIAR
│   └── imageCompression.ts          # CRIAR
```

## 💡 Código de Exemplo

### PhotoUpload Component (Base)

```typescript
import { Camera, Upload, X } from 'lucide-react';
import { useState } from 'react';

export default function PhotoUpload({ onPhotoSelected, currentPhoto, optional = true }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoSelected(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Foto {optional && '(Opcional)'}
      </label>
      
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
          <button onClick={() => { setPreview(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <label className="flex-1 btn-secondary cursor-pointer">
            <Camera className="w-4 h-4 inline mr-2" />
            Tirar Foto
            <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          </label>
          <label className="flex-1 btn-secondary cursor-pointer">
            <Upload className="w-4 h-4 inline mr-2" />
            Escolher
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </label>
        </div>
      )}
    </div>
  );
}
```

### Upload para Supabase Storage

```typescript
async function uploadItemPhoto(file: File, userId: string, itemId: string): Promise<string> {
  // Comprimir imagem
  const compressed = await compressImage(file);
  
  const fileName = `${userId}/${itemId}-${Date.now()}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('item-photos')
    .upload(fileName, compressed);
    
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('item-photos')
    .getPublicUrl(fileName);
    
  return publicUrl;
}
```

## 🔄 Ordem de Implementação Recomendada

1. **PhotoUpload Component** - Base para tudo
2. **EditarItemModal** - Permite adicionar fotos aos itens
3. **Atualizar ItensModal** - Mostra fotos e permite editar
4. **Atualizar OCRPreviewModal** - Usar nova estrutura OCR
5. **RelatoriosView - Catálogo** - Imprimir com fotos
6. **RelatoriosView - Vendas** - Relatórios de vendas
7. **Mobile Responsivo** - Ajustes finais

## 📊 Status Atual

### O Que Funciona ✅
- Sistema multiusuário
- OCR melhorado (nova lógica)
- Database com suporte a fotos
- Storage configurado
- VendaRápida com pagamentos
- Animações e UX

### O Que Falta ❌
- UI para upload de fotos
- Editar itens existentes
- Visualizar fotos dos itens
- Relatórios e catálogo
- Mobile otimizado

## 🎨 Design do Catálogo (Sugestão)

```
┌─────────────────────────────────────┐
│ 💎 Semi-Joias - Sistema de Gestão   │
│     Catálogo de Produtos            │
├─────────────────────────────────────┤
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │ FOTO │  │ FOTO │  │ FOTO │     │
│  │      │  │      │  │      │     │
│  └──────┘  └──────┘  └──────┘     │
│  Pulseira  Corrente    Anel        │
│  R$ 316    R$ 884     R$ 174       │
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │ FOTO │  │ FOTO │  │ FOTO │     │
│  │      │  │      │  │      │     │
│  └──────┘  └──────┘  └──────┘     │
│  Brinco    Pingente   Argola       │
│  R$ 215    R$ 172     R$ 418       │
│                                     │
└─────────────────────────────────────┘
```

## 📝 Observações Importantes

1. **Fotos são opcionais** - Sistema deve funcionar com e sem fotos
2. **Compressão** - Comprimir imagens antes de upload (máx 500KB)
3. **Thumbnails** - Criar versões pequenas para listagens
4. **Fallback** - Ícone padrão quando não houver foto
5. **Performance** - Lazy loading de imagens em listas grandes

---

**Status**: Database pronto, aguardando implementação de UI
**Próximo Passo**: Criar PhotoUpload component
