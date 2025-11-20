# Roadmap de Melhorias - Sistema Semi-Joias

## ✅ Concluído

### Database
- ✅ Tabela `categorias` criada (categorias customizáveis)
- ✅ Tabela `user_roles` criada (gerenciamento de permissões)
- ✅ Tabela `garantias` criada (trocas e garantias)
- ✅ Campo `categoria_custom` adicionado em `itens_pano`
- ✅ RLS policies configuradas para todas as novas tabelas

## 🔄 Em Desenvolvimento (Próximos Passos)

### 1. Tela de Configurações
**Prioridade: ALTA**

Criar `/src/components/views/ConfiguracoesView.tsx`:
- Aba "Categorias": CRUD completo de categorias
- Aba "Perfil": Editar dados do usuário
- Aba "Permissões": Gerenciar outros usuários (admin apenas)
- Aba "Preferências": Tema, notificações, etc.

### 2. Correção do Botão Venda Rápida
**Prioridade: CRÍTICA**

Modificar `/src/components/modals/VendaRapidaModal.tsx`:
- Adicionar campo "Forma de Pagamento": à vista / parcelado
- Se à vista: registrar pagamento imediatamente
- Se parcelado: gerar parcelas com datas
- Criar registros em `pagamentos` table
- Status da venda: 'pago' ou 'pendente' conforme pagamento

### 3. Melhorar Nova Venda
**Prioridade: ALTA**

Modificar `/src/components/modals/NovaVendaModal.tsx`:
- Adicionar seção "Pagamento":
  - Radio: À vista / Parcelado
  - Se À vista: campo "Valor pago agora"
  - Se Parcelado: manter sistema atual de parcelas
  - Calcular automaticamente valor restante
  - Mostrar resumo claro do pagamento

### 4. Cadastro Rápido de Itens (Excel-like)
**Prioridade: ALTA**

Criar `/src/components/views/CadastroRapidoItensView.tsx`:
- Layout tipo planilha
- Colunas: Número | Categoria | Descrição | Qtd | Valor
- Tecla Enter passa para próximo campo
- Tab navega entre colunas
- Salvar múltiplos itens de uma vez
- Validação em tempo real

### 5. Melhorar Visualização de Itens
**Prioridade: MÉDIA**

Modificar `/src/components/modals/ItensModal.tsx`:
- Agrupar itens por categoria
- Cards expansíveis por categoria
- Contadores por categoria
- Valor total por categoria
- Filtros rápidos
- Ordenação customizável

### 6. Permitir Edição de Vendas
**Prioridade: ALTA**

Modificar `/src/components/views/VendasView.tsx`:
- Adicionar botão "Editar" em cada venda
- Criar `EditarVendaModal.tsx`:
  - Editar data da venda
  - Editar itens (adicionar/remover)
  - Editar cliente
  - Editar observações
  - Recalcular totais automaticamente
  - Atualizar pagamentos se necessário

### 7. Sistema de Garantias
**Prioridade: MÉDIA**

Criar `/src/components/views/GarantiasView.tsx`:
- Listar todas as garantias
- Filtrar por status (pendente, concluída, etc.)
- Criar nova garantia:
  - Selecionar venda original
  - Selecionar item a ser trocado
  - Selecionar item novo do pano atual
  - Registrar motivo da troca
  - Atualizar estoque automaticamente
  - Histórico completo da garantia

### 8. Layout Mobile Responsivo
**Prioridade: ALTA**

Melhorias gerais:
- Forms em uma coluna no mobile
- Botões maiores (min 44px touch target)
- Inputs maiores e mais espaçados
- Navigation drawer no mobile
- Modais full-screen no mobile
- Swipe gestures para fechar modais

### 9. Melhorias de Animação
**Prioridade: MÉDIA**

- Transições page-to-page
- Loading states em todas as ações
- Toast notifications customizadas
- Confirmações visuais
- Progress indicators

### 10. Reorganização do Dashboard
**Prioridade: MÉDIA**

Modificar `/src/components/Dashboard.tsx`:
- Sidebar colapsável no mobile
- Menu reorganizado:
  - 📊 Dashboard
  - 📦 Panos
  - 🛍️ Vendas
  - 💳 Pagamentos
  - 👥 Clientes
  - 🔄 Garantias
  - ⚙️ Configurações
- Breadcrumbs para navegação
- Search global

## 📋 Estrutura de Arquivos Sugerida

```
src/
├── components/
│   ├── common/           # Componentes reutilizáveis
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── Table.tsx
│   ├── modals/
│   │   ├── PanoModal.tsx
│   │   ├── ItensModal.tsx
│   │   ├── NovaVendaModal.tsx
│   │   ├── VendaRapidaModal.tsx
│   │   ├── EditarVendaModal.tsx    # NOVO
│   │   ├── NovaGarantiaModal.tsx   # NOVO
│   │   └── ...
│   ├── views/
│   │   ├── HomeView.tsx
│   │   ├── PanosView.tsx
│   │   ├── VendasView.tsx
│   │   ├── PagamentosView.tsx
│   │   ├── ClientesView.tsx
│   │   ├── GarantiasView.tsx       # NOVO
│   │   ├── ConfiguracoesView.tsx   # NOVO
│   │   └── CadastroRapidoItensView.tsx # NOVO
│   ├── Dashboard.tsx
│   └── Login.tsx
├── lib/
│   ├── supabase.ts
│   └── utils.ts                     # NOVO - funções auxiliares
└── contexts/
    ├── AuthContext.tsx
    └── SettingsContext.tsx          # NOVO - configurações globais
```

## 🎯 Implementação Recomendada (Ordem)

1. **Fase 1 - Crítico** (1-2 dias)
   - Corrigir VendaRapida com pagamentos
   - Melhorar NovaVenda com info de pagamento
   - Permitir edição de vendas

2. **Fase 2 - Importante** (2-3 dias)
   - Cadastro rápido de itens
   - Melhorar visualização de itens
   - Layout mobile responsivo

3. **Fase 3 - Complementar** (2-3 dias)
   - Tela de Configurações completa
   - Sistema de Garantias
   - Melhorias de animação

4. **Fase 4 - Refinamento** (1-2 dias)
   - Reorganização do Dashboard
   - Polimento geral
   - Testes e correções

## 💡 Sugestões Adicionais

### Melhorias de UX
- Atalhos de teclado (Ctrl+N para nova venda, etc.)
- Busca global inteligente
- Histórico de ações do usuário
- Modo escuro (opcional)
- Exportação de relatórios (PDF/Excel)

### Funcionalidades Avançadas
- Notificações de pagamentos vencidos
- Dashboard analítico avançado
- Integração com WhatsApp para cobranças
- Backup automático de dados
- Importação em lote de itens

### Performance
- Paginação em listas grandes
- Virtual scrolling para tabelas
- Cache inteligente
- Lazy loading de componentes
- Service Worker para offline

## 📝 Notas Importantes

1. **Backward Compatibility**: Manter compatibilidade com dados existentes
2. **Migration Path**: Criar scripts de migração de dados se necessário
3. **Testing**: Testar cada feature antes de deploy
4. **Documentation**: Documentar todas as novas features
5. **User Feedback**: Coletar feedback após cada implementação

---

**Status Atual**: Database pronto, front-end aguardando implementação.
**Próximo Passo**: Começar pela Fase 1 (features críticas).
