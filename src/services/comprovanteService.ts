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
  private static readonly COR_PRIMARIA = '#D4AF37';
  private static readonly COR_SECUNDARIA = '#B8941F';
  private static readonly COR_TEXTO = '#2D3748';
  private static readonly COR_TEXTO_CLARO = '#718096';

  static gerarPDF(dados: DadosComprovante): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    let y = margin;

    const nomeLoja = dados.nomeLoja || 'SPHERE';

    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text(nomeLoja, pageWidth / 2, y + 15, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Semijoias de Qualidade Premium', pageWidth / 2, y + 25, { align: 'center' });

    y = 60;

    doc.setTextColor(45, 55, 72);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROVANTE DE VENDA', pageWidth / 2, y, { align: 'center' });

    y += 15;
    doc.setFillColor(212, 175, 55);
    doc.rect(margin, y, pageWidth - 2 * margin, 0.5, 'F');
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 128, 150);

    const vendaInfo = [
      ['Venda:', `#${dados.vendaId.slice(0, 8).toUpperCase()}`],
      ['Data:', new Date(dados.data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })],
    ];

    vendaInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(113, 128, 150);
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(45, 55, 72);
      doc.text(value, margin + 35, y);
      y += 7;
    });

    y += 5;
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, pageWidth - 2 * margin, 25, 'F');

    doc.setFillColor(212, 175, 55);
    doc.rect(margin, y, 3, 25, 'F');

    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(113, 128, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', margin + 8, y);

    y += 7;
    doc.setFontSize(12);
    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'bold');
    doc.text(dados.clienteNome, margin + 8, y);

    if (dados.clienteTelefone) {
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor(113, 128, 150);
      doc.setFont('helvetica', 'normal');
      doc.text(`📱 ${dados.clienteTelefone}`, margin + 8, y);
    }

    y += 15;

    doc.setFillColor(212, 175, 55);
    doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    const colItem = margin + 5;
    const colQtd = pageWidth - margin - 95;
    const colUnit = pageWidth - margin - 65;
    const colTotal = pageWidth - margin - 35;

    doc.text('PRODUTO', colItem, y + 7);
    doc.text('QTD', colQtd, y + 7, { align: 'center' });
    doc.text('UNIT.', colUnit, y + 7, { align: 'right' });
    doc.text('TOTAL', colTotal, y + 7, { align: 'right' });

    y += 12;

    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    dados.itens.forEach((item, index) => {
      if (y > pageHeight - 80) {
        doc.addPage();
        y = margin;
      }

      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, y - 4, pageWidth - 2 * margin, 10, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.text(item.descricao, colItem, y);

      if (item.categoria) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(113, 128, 150);
        doc.text(item.categoria, colItem, y + 4);
        doc.setFontSize(10);
        doc.setTextColor(45, 55, 72);
      }

      doc.setFont('helvetica', 'normal');
      doc.text(item.quantidade.toString(), colQtd, y, { align: 'center' });
      doc.text(`R$ ${item.valor_unitario.toFixed(2)}`, colUnit, y, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${item.valor_total.toFixed(2)}`, colTotal, y, { align: 'right' });

      y += item.categoria ? 12 : 10;
    });

    y += 5;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    const totaisCol1 = margin + 10;
    const totaisCol2 = pageWidth - margin - 10;

    if (dados.desconto > 0) {
      doc.setTextColor(113, 128, 150);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Subtotal:', totaisCol1, y);
      doc.text(`R$ ${dados.subtotal.toFixed(2)}`, totaisCol2, y, { align: 'right' });
      y += 7;

      doc.setTextColor(220, 38, 38);
      doc.text('Desconto:', totaisCol1, y);
      doc.text(`- R$ ${dados.desconto.toFixed(2)}`, totaisCol2, y, { align: 'right' });
      y += 10;
    }

    doc.setFillColor(212, 175, 55);
    doc.roundedRect(margin, y - 2, pageWidth - 2 * margin, 12, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL:', totaisCol1, y + 7);
    doc.text(`R$ ${dados.total.toFixed(2)}`, totaisCol2, y + 7, { align: 'right' });

    y += 20;

    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, pageWidth - 2 * margin, 15, 'F');

    y += 8;
    doc.setTextColor(113, 128, 150);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('FORMA DE PAGAMENTO:', margin + 5, y);

    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const formaPgtoTexto = dados.formaPagamento.toUpperCase().replace('_', ' ');
    doc.text(formaPgtoTexto, margin + 60, y);

    y += 20;

    if (dados.parcelas && dados.parcelas.length > 1) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 55, 72);
      doc.text('PARCELAS', margin, y);
      y += 8;

      const parcelaHeader = y;
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, parcelaHeader - 4, pageWidth - 2 * margin, 8, 'F');

      doc.setFontSize(9);
      doc.setTextColor(113, 128, 150);
      doc.setFont('helvetica', 'bold');
      doc.text('PARCELA', margin + 5, parcelaHeader);
      doc.text('VALOR', pageWidth / 2, parcelaHeader, { align: 'center' });
      doc.text('VENCIMENTO', pageWidth - margin - 40, parcelaHeader);
      doc.text('STATUS', pageWidth - margin - 5, parcelaHeader, { align: 'right' });

      y += 8;

      dados.parcelas.forEach((parcela, index) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = margin;
        }

        if (index % 2 === 0) {
          doc.setFillColor(255, 255, 255);
          doc.rect(margin, y - 4, pageWidth - 2 * margin, 8, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(45, 55, 72);

        doc.text(`${parcela.numero}ª`, margin + 5, y);
        doc.text(`R$ ${parcela.valor.toFixed(2)}`, pageWidth / 2, y, { align: 'center' });
        doc.text(new Date(parcela.vencimento).toLocaleDateString('pt-BR'), pageWidth - margin - 40, y);

        const status = parcela.status || 'pendente';
        const statusCor = status === 'paga' ? [34, 197, 94] : status === 'atrasada' ? [239, 68, 68] : [113, 128, 150];
        doc.setTextColor(statusCor[0], statusCor[1], statusCor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(status.toUpperCase(), pageWidth - margin - 5, y, { align: 'right' });

        y += 8;
      });

      y += 5;
    }

    y = pageHeight - 40;

    doc.setFillColor(249, 250, 251);
    doc.rect(0, y, pageWidth, 40, 'F');

    y += 10;
    doc.setTextColor(45, 55, 72);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Obrigado pela sua compra!', pageWidth / 2, y, { align: 'center' });

    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 128, 150);
    doc.text('Sua confiança é muito importante para nós.', pageWidth / 2, y, { align: 'center' });
    doc.text('Estamos sempre à disposição para melhor atendê-la.', pageWidth / 2, y + 5, { align: 'center' });

    y += 15;
    doc.setFillColor(212, 175, 55);
    doc.rect(pageWidth / 2 - 30, y - 2, 60, 0.5, 'F');

    y += 5;
    doc.setTextColor(212, 175, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`${nomeLoja} - Semijoias de Qualidade`, pageWidth / 2, y, { align: 'center' });

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
