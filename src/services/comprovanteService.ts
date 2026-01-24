import jsPDF from 'jspdf';
import { ComprovanteVisualService } from './comprovanteVisualService';

interface ItemComprovante {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  categoria?: string;
}

interface DadosComprovante {
  vendaId: string;
  clienteNome: string;
  clienteTelefone?: string;
  data: string;
  itens: ItemComprovante[];
  subtotal: number;
  desconto: number;
  total: number;
  formaPagamento: string;
  nomeLoja?: string;
  parcelas?: {
    numero: number;
    valor: number;
    vencimento: string;
    status?: string;
  }[];
}

export class ComprovanteService {

  static gerarPDF(dados: DadosComprovante): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 15;
    let y = margin;

    const nomeLoja = dados.nomeLoja || 'SPHERE';

    // Cores e Estilos
    const primaryColor = [212, 175, 55]; // Gold #D4AF37
    const secondaryColor = [45, 55, 72]; // Dark Gray #2D3748
    const lightGray = [247, 250, 252]; // Light Gray #F7FAFC
    const borderColor = [226, 232, 240]; // Border #E2E8F0

    // --- Header ---
    // Barras decorativas superiores
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Logo Placeholder (Círculo dourado com texto se não tiver imagem)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(pageWidth / 2, 25, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('S', pageWidth / 2, 28, { align: 'center' });

    // Nome da Loja
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(24);
    doc.setFont('times', 'bold'); // Fonte serifada para luxo
    doc.text(nomeLoja.toUpperCase(), pageWidth / 2, 45, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('SEMIJOIAS DE LUXO & ACESSÓRIOS', pageWidth / 2, 52, { align: 'center' });

    y = 65;

    // --- Grid Info Venda ---
    // Caixa Principal
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, pageWidth - (margin * 2), 35, 2, 2, 'FD');

    // Título da Caixa
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(margin + 0.2, y + 0.2, pageWidth - (margin * 2) - 0.4, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text('DETALHES DO PEDIDO', margin + 5, y + 5.5);

    // Dados da Venda (Grid 2 colunas)
    y += 15;
    doc.setFontSize(10);

    // Coluna 1
    doc.setFont('helvetica', 'bold');
    doc.text('Venda:', margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${dados.vendaId.slice(0, 8).toUpperCase()}`, margin + 25, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Data:', margin + 5, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(dados.data).toLocaleDateString('pt-BR'), margin + 25, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Hora:', margin + 5, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(dados.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), margin + 25, y + 12);

    // Coluna 2 (Cliente)
    const col2X = pageWidth / 2 + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente:', col2X, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.clienteNome, col2X + 20, y);

    if (dados.clienteTelefone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Tel:', col2X, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(dados.clienteTelefone, col2X + 20, y + 6);
    }

    y += 30;

    // --- Tabela ITENS ---
    // Cabeçalho da Tabela
    const headerHeight = 8;
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(margin, y, pageWidth - (margin * 2), headerHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    const colProd = margin + 5;
    const colQtd = pageWidth - margin - 50;
    const colUnit = pageWidth - margin - 30;
    const colTotal = pageWidth - margin - 5;

    doc.text('DESCRIÇÃO', colProd, y + 5.5);
    doc.text('QTD', colQtd, y + 5.5, { align: 'center' });
    doc.text('UNIT.', colUnit, y + 5.5, { align: 'right' });
    doc.text('TOTAL', colTotal, y + 5.5, { align: 'right' });

    y += headerHeight;

    // Itens
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(9);

    dados.itens.forEach((item, index) => {
      // Verificar quebra de página
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin + 10;

        // Redesenhar cabeçalho
        doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.rect(margin, y, pageWidth - (margin * 2), headerHeight, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIÇÃO', colProd, y + 5.5);
        doc.text('QTD', colQtd, y + 5.5, { align: 'center' });
        doc.text('UNIT.', colUnit, y + 5.5, { align: 'right' });
        doc.text('TOTAL', colTotal, y + 5.5, { align: 'right' });
        y += headerHeight;
      }

      // Zebra striping
      if (index % 2 === 0) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
      }

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

      doc.setFont('helvetica', 'normal');
      doc.text(item.descricao.substring(0, 50) + (item.descricao.length > 50 ? '...' : ''), colProd, y + 5.5);

      doc.text(item.quantidade.toString(), colQtd, y + 5.5, { align: 'center' });
      doc.text(item.valor_unitario.toFixed(2), colUnit, y + 5.5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text(item.valor_total.toFixed(2), colTotal, y + 5.5, { align: 'right' });

      y += 8;
    });

    // Linha final da tabela
    doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);

    y += 5;

    // --- Totais ---
    const totalsWidth = 70;
    const totalsX = pageWidth - margin - totalsWidth;

    // Subtotal
    if (dados.desconto > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Subtotal:', totalsX, y + 5);
      doc.text(`R$ ${dados.subtotal.toFixed(2)}`, pageWidth - margin - 5, y + 5, { align: 'right' });
      y += 6;

      doc.setTextColor(200, 50, 50); // Red
      doc.text('Desconto:', totalsX, y + 5);
      doc.text(`- R$ ${dados.desconto.toFixed(2)}`, pageWidth - margin - 5, y + 5, { align: 'right' });
      y += 8;
    }

    // Caixa TOTAL
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(totalsX - 5, y, totalsWidth + 5, 12, 1, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL A PAGAR', totalsX, y + 7.5);
    doc.setFontSize(14);
    doc.text(`R$ ${dados.total.toFixed(2)}`, pageWidth - margin - 5, y + 8, { align: 'right' });

    y += 20;

    // --- Informações de Pagamento e Parcelas (Lado a Lado se possível) ---
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

    // Forma de Pagamento
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMA DE PAGAMENTO:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.formaPagamento.toUpperCase().replace('_', ' '), margin + 50, y);

    y += 10;

    // Se houver parcelas, criar mini-tabela
    if (dados.parcelas && dados.parcelas.length > 1) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PARCELAMENTO', margin, y);
      y += 5;

      // Header Parcelas
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(margin, y, 100, 6, 'F');
      doc.setFontSize(8);
      doc.text('#', margin + 2, y + 4);
      doc.text('VENCIMENTO', margin + 15, y + 4);
      doc.text('VALOR', margin + 50, y + 4);
      doc.text('STATUS', margin + 80, y + 4);

      y += 6;

      dados.parcelas.forEach((p) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }
        doc.setFont('helvetica', 'normal');
        doc.text(`${p.numero}`, margin + 2, y + 4);
        doc.text(new Date(p.vencimento).toLocaleDateString('pt-BR'), margin + 15, y + 4);
        doc.text(`R$ ${p.valor.toFixed(2)}`, margin + 50, y + 4);

        const status = p.status || 'pendente';
        if (status === 'pago') doc.setTextColor(0, 150, 0);
        else if (status === 'atrasado') doc.setTextColor(200, 0, 0);

        doc.text(status.toUpperCase(), margin + 80, y + 4);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]); // Reset color

        doc.setDrawColor(240, 240, 240);
        doc.line(margin, y + 6, margin + 100, y + 6);
        y += 6;
      });
    }

    // --- Footer ---
    const footerY = pageHeight - 20;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('________________________________________________', pageWidth / 2, footerY - 5, { align: 'center' }); // Linha assinatura
    doc.text('Obrigado pela preferência!', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Este documento não possui valor fiscal.', pageWidth / 2, footerY + 4, { align: 'center' });

    // QRCode Placeholder (Simulated)
    // doc.rect(pageWidth - margin - 20, footerY - 10, 20, 20);

    return doc;
  }

  static gerarComprovanteTexto(dados: DadosComprovante): string {
    const nomeLoja = dados.nomeLoja || 'SPHERE';
    const itensTexto = dados.itens
      .map(item => `  ${item.quantidade}x ${item.descricao}\n     R$ ${item.valor_unitario.toFixed(2)} x ${item.quantidade} = R$ ${item.valor_total.toFixed(2)}`)
      .join('\n\n');

    const parcelasTexto = dados.parcelas && dados.parcelas.length > 1
      ? `\n\n╔════════════════════════════════════╗\n║          PARCELAS                  ║\n╚════════════════════════════════════╝\n\n${dados.parcelas
        .map(p => `  ${p.numero}ª Parcela - R$ ${p.valor.toFixed(2)}\n  Vencimento: ${new Date(p.vencimento).toLocaleDateString('pt-BR')}`)
        .join('\n\n')}`
      : dados.parcelas && dados.parcelas.length === 1
        ? '\n\n💳 PAGAMENTO À VISTA'
        : '';

    return `
╔════════════════════════════════════╗
║                                    ║
║         ⭐ ${nomeLoja} ⭐            ║
║   Semijoias de Qualidade Premium   ║
║                                    ║
╚════════════════════════════════════╝

╔════════════════════════════════════╗
║      COMPROVANTE DE VENDA          ║
╚════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INFORMAÇÕES DA VENDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Venda: #${dados.vendaId.slice(0, 8).toUpperCase()}
Data: ${new Date(dados.data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })}
Horário: ${new Date(dados.data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nome: ${dados.clienteNome}
${dados.clienteTelefone ? `Telefone: ${dados.clienteTelefone}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️  PRODUTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${itensTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 RESUMO FINANCEIRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${dados.desconto > 0 ? `Subtotal: R$ ${dados.subtotal.toFixed(2)}\nDesconto: -R$ ${dados.desconto.toFixed(2)}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}TOTAL: R$ ${dados.total.toFixed(2)}

Forma de Pagamento: ${dados.formaPagamento.toUpperCase().replace('_', ' ')}
${parcelasTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 Obrigado pela sua compra! 🌟

Sua confiança é muito importante para nós.
Estamos sempre à disposição para
melhor atendê-la.

✨ Volte sempre! ✨

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${nomeLoja} - Semijoias de Qualidade
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  static downloadPDF(dados: DadosComprovante): void {
    const doc = this.gerarPDF(dados);
    const fileName = `Comprovante_${dados.vendaId.slice(0, 8)}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
  }

  static imprimirPDF(dados: DadosComprovante): void {
    const doc = this.gerarPDF(dados);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  static async enviarWhatsAppImagem(dados: DadosComprovante): Promise<void> {
    if (!dados.clienteTelefone) {
      alert('❌ Cliente não possui telefone cadastrado para envio via WhatsApp.');
      return;
    }

    try {
      const dadosVisuais = {
        nomeCliente: dados.clienteNome,
        nomeConsultora: dados.nomeLoja || 'SPHERE',
        dataVenda: dados.data,
        itens: dados.itens,
        valorTotal: dados.total,
        statusPagamento: 'pago',
        formaPagamento: dados.formaPagamento,
        observacoes: dados.parcelas && dados.parcelas.length > 1
          ? `Pagamento parcelado em ${dados.parcelas.length}x`
          : undefined
      };

      await ComprovanteVisualService.compartilharWhatsApp(dadosVisuais);
    } catch (error) {
      console.error('Erro ao gerar comprovante visual:', error);
      this.enviarWhatsApp(dados);
    }
  }

  static enviarWhatsApp(dados: DadosComprovante): void {
    if (!dados.clienteTelefone) {
      alert('❌ Cliente não possui telefone cadastrado para envio via WhatsApp.');
      return;
    }

    const comprovante = this.gerarComprovanteTexto(dados);
    const mensagem = encodeURIComponent(comprovante);
    const numero = dados.clienteTelefone.replace(/\D/g, '');

    const numeroFormatado = numero.startsWith('55') ? numero : `55${numero}`;
    const url = `https://wa.me/${numeroFormatado}?text=${mensagem}`;

    window.open(url, '_blank');
  }

  static async baixarComprovanteImagem(dados: DadosComprovante): Promise<void> {
    try {
      const dadosVisuais = {
        nomeCliente: dados.clienteNome,
        nomeConsultora: dados.nomeLoja || 'SPHERE',
        dataVenda: dados.data,
        itens: dados.itens,
        valorTotal: dados.total,
        statusPagamento: 'pago',
        formaPagamento: dados.formaPagamento,
        observacoes: dados.parcelas && dados.parcelas.length > 1
          ? `Pagamento parcelado em ${dados.parcelas.length}x`
          : undefined
      };

      await ComprovanteVisualService.baixarComprovante(dadosVisuais);
    } catch (error) {
      console.error('Erro ao gerar comprovante visual:', error);
      alert('❌ Erro ao gerar comprovante. Tente novamente.');
    }
  }

  static copiarParaAreaTransferencia(dados: DadosComprovante): void {
    const comprovante = this.gerarComprovanteTexto(dados);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(comprovante)
        .then(() => {
          alert('✅ Comprovante copiado para a área de transferência!');
        })
        .catch(() => {
          this.fallbackCopyToClipboard(comprovante);
        });
    } else {
      this.fallbackCopyToClipboard(comprovante);
    }
  }

  private static fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      alert('✅ Comprovante copiado para a área de transferência!');
    } catch (err) {
      alert('❌ Erro ao copiar. Tente novamente.');
    }

    document.body.removeChild(textArea);
  }
}
