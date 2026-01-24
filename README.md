# SPHERE - Sistema de Gestão Premium de Semijoias 💎

O **SPHERE** é uma solução completa e sofisticada para o gerenciamento de vendas, estoque e consignações de semijoias. Focado em oferecer uma experiência de usuário "Premium", o sistema combina design elegante com funcionalidades robustas de automação.

![Status do Projeto](https://img.shields.io/badge/Status-Finalizado-success)
![Versão](https://img.shields.io/badge/Versão-2026-gold)

## 🚀 Funcionalidades Principais

### 🛒 Vendas & PDV
- **Venda Rápida**: Interface ágil para lançar vendas, calcular trocos e descontos.
- **Comprovante Premium**: Geração automática de comprovantes em **PDF** com layout profissional.
- **WhatsApp Integrado**: Envio do comprovante como **IMAGEM** diretamente para o WhatsApp do cliente com um clique.
- **Controle de Parcelas**: Cálculos precisos de parcelamento e datas de vencimento.

### 📦 Gestão de Estoque & Panos
- **Consignação (Panos)**: Controle total de panos enviados para revendedoras.
- **OCR Inteligente**: Importação de itens via foto do pano (lê a tabela automaticamente).
- **Validação de Fotos**: Sistema inteligente que recusa arquivos inválidos ou muito pesados.

### 🛡️ Pós-Venda
- **Garantias**: Módulo completo para Trocas e Devoluções.
- **Vouchers**: Geração automática de crédito para clientes em caso de devolução ou troco.

## 🛠️ Tecnologias Utilizadas

O projeto foi construído com uma stack moderna focada em performance e escalabilidade:

- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/) (Segurança e robustez)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) (Design responsivo e customizável)
- **Banco de Dados & Auth**: [Supabase](https://supabase.com/) (PostgreSQL em tempo real)
- **PDF & Imagens**: `jspdf`, `html2canvas`

## ⚙️ Como Rodar o Projeto

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/semi-jewelry.git
   cd semi-jewelry
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente**
   Crie um arquivo `.env` na raiz e adicione suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

4. **Rode o servidor local**
   ```bash
   npm run dev
   ```

## 📞 Contato & Suporte

Desenvolvido e mantido por:

**Elivanilso Junior**  
📱 **WhatsApp**: (91) 99127-7724

## ☕ Apoie o Projeto

Gostou do sistema? Você pode apoiar o desenvolvimento contínuo através de uma doação:

**Pix (Chave Aleatória)**:
`14c31a69-d965-4b80-8e20-d56c0dc45483`
**Futuramente será hospedado em**: `https://sphere.vercel.app/`
---
© 2026 SPHERE Systems. Todos os direitos reservados.
