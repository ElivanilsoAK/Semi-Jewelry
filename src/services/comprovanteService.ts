import jsPDF from 'jspdf';

interface ItemComprovante {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
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
  parcelas?: {
    numero: number;
    valor: number;
    vencimento: string;
  }[];
}

export class ComprovanteService {
  private static readonly MENSAGEM_ANA_KELLY = `
🌟 *Agradecemos sua preferência!* 🌟

Obrigada por adquirir seus produtos com *Ana Kelly*!

Sua confiança é muito importante para nós. Estamos sempre à disposição para melhor atendê-la.

✨ Volte sempre! ✨

_Ana Kelly - Semijoias de Qualidade_
  `.trim();

  static gerarComprovanteTexto(dados: DadosComprovante): string {
    const itensTexto = dados.itens
      .map(item => `${item.quantidade}x ${item.descricao} - R$ ${item.valor_total.toFixed(2)}`)
      .join('\n');

    const parcelasTexto = dados.parcelas && dados.parcelas.length > 1
      ? `\n\nPARCELAS:\n${dados.parcelas
          .map(p => `${p.numero}ª - R$ ${p.valor.toFixed(2)} - Venc: ${new Date(p.vencimento).toLocaleDateString('pt-BR')}`)
          .join('\n')}`
      : dados.parcelas && dados.parcelas.length === 1
      ? '\n\nÀ VISTA'
      : '';

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🌟 ANA KELLY - SEMIJOIAS 🌟
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPROVANTE DE VENDA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS DO CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cliente: ${dados.clienteNome}
${dados.clienteTelefone ? `Telefone: ${dados.clienteTelefone}` : ''}

Data: ${new Date(dados.data).toLocaleDateString('pt-BR')} às ${new Date(dados.data).toLocaleTimeString('pt-BR')}
Venda: #${dados.vendaId.slice(0, 8).toUpperCase()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRODUTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${itensTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subtotal: R$ ${dados.subtotal.toFixed(2)}
${dados.desconto > 0 ? `Desconto: -R$ ${dados.desconto.toFixed(2)}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: R$ ${dados.total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Forma de Pagamento: ${dados.formaPagamento.toUpperCase()}
${parcelasTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${this.MENSAGEM_ANA_KELLY}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
  }

  static gerarPDF(dados: DadosComprovante): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    let y = 10;
    const lineHeight = 5;
    const pageWidth = 80;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('ANA KELLY - SEMIJOIAS', pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    doc.setFontSize(8);
    doc.text('COMPROVANTE DE VENDA', pageWidth / 2, y, { align: 'center' });
    y += lineHeight * 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Cliente: ${dados.clienteNome}`, 5, y);
    y += lineHeight;

    if (dados.clienteTelefone) {
      doc.text(`Tel: ${dados.clienteTelefone}`, 5, y);
      y += lineHeight;
    }

    doc.text(`Data: ${new Date(dados.data).toLocaleDateString('pt-BR')}`, 5, y);
    y += lineHeight;
    doc.text(`Venda: #${dados.vendaId.slice(0, 8).toUpperCase()}`, 5, y);
    y += lineHeight * 1.5;

    doc.setFont('helvetica', 'bold');
    doc.text('PRODUTOS', 5, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    dados.itens.forEach(item => {
      const texto = `${item.quantidade}x ${item.descricao}`;
      const valor = `R$ ${item.valor_total.toFixed(2)}`;
      doc.text(texto, 5, y);
      doc.text(valor, pageWidth - 5, y, { align: 'right' });
      y += lineHeight;
    });

    y += lineHeight * 0.5;
    doc.line(5, y, pageWidth - 5, y);
    y += lineHeight;

    doc.text('Subtotal:', 5, y);
    doc.text(`R$ ${dados.subtotal.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
    y += lineHeight;

    if (dados.desconto > 0) {
      doc.text('Desconto:', 5, y);
      doc.text(`-R$ ${dados.desconto.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
      y += lineHeight;
    }

    doc.line(5, y, pageWidth - 5, y);
    y += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL:', 5, y);
    doc.text(`R$ ${dados.total.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
    y += lineHeight * 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Pagamento: ${dados.formaPagamento}`, 5, y);
    y += lineHeight;

    if (dados.parcelas && dados.parcelas.length > 1) {
      y += lineHeight * 0.5;
      doc.setFont('helvetica', 'bold');
      doc.text('PARCELAS:', 5, y);
      y += lineHeight;

      doc.setFont('helvetica', 'normal');
      dados.parcelas.forEach(p => {
        const texto = `${p.numero}ª - R$ ${p.valor.toFixed(2)}`;
        const venc = new Date(p.vencimento).toLocaleDateString('pt-BR');
        doc.text(texto, 5, y);
        doc.text(venc, pageWidth - 5, y, { align: 'right' });
        y += lineHeight;
      });
    }

    y += lineHeight;
    doc.line(5, y, pageWidth - 5, y);
    y += lineHeight;

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    const mensagens = this.MENSAGEM_ANA_KELLY.split('\n');
    mensagens.forEach(linha => {
      if (linha.trim()) {
        doc.text(linha.replace(/[*_]/g, ''), pageWidth / 2, y, { align: 'center' });
        y += lineHeight * 0.8;
      }
    });

    return doc;
  }

  static imprimirComprovante(dados: DadosComprovante): void {
    const comprovante = this.gerarComprovanteTexto(dados);
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    if (!printWindow) {
      alert('Bloqueador de pop-ups ativo. Por favor, permita pop-ups para imprimir.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Comprovante de Venda</title>
          <style>
            @media print {
              @page {
                margin: 10mm;
                size: 80mm auto;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              line-height: 1.4;
              margin: 10px;
              padding: 0;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .print-button {
              position: fixed;
              top: 10px;
              right: 10px;
              padding: 10px 20px;
              background: #d4af37;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-weight: bold;
              z-index: 1000;
            }
            .print-button:hover {
              background: #b8941f;
            }
            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">🖨️ Imprimir</button>
          ${comprovante}
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  static downloadPDF(dados: DadosComprovante): void {
    const doc = this.gerarPDF(dados);
    const fileName = `comprovante_${dados.vendaId.slice(0, 8)}_${Date.now()}.pdf`;
    doc.save(fileName);
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
