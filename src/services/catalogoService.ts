import jsPDF from 'jspdf';

interface ItemCatalogo {
  id: string;
  descricao: string;
  categoria: string;
  valor_unitario: number;
  quantidade_disponivel: number;
  foto_url?: string;
}

interface Venda {
  id: string;
  data_venda: string;
  valor_total: number;
  status_pagamento: string;
  clientes: { nome: string };
}

export class CatalogoService {
  static async gerarCatalogoPDF(
    itens: ItemCatalogo[],
    nomeConsultora: string = 'SPHERE'
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Cabeçalho
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(`✨ ${nomeConsultora} ✨`, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Catálogo de Produtos - ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 30, { align: 'center' });

    yPosition = 50;

    // Agrupar por categoria
    const categorias = [...new Set(itens.map(item => item.categoria))].sort();

    for (const categoria of categorias) {
      const produtosCategoria = itens.filter(item => item.categoria === categoria);

      // Verificar espaço para categoria
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Título da categoria
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(categoria || 'Sem Categoria', 15, yPosition);

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(15, yPosition + 2, pageWidth - 15, yPosition + 2);

      yPosition += 10;

      // Grid de produtos (2 colunas)
      const colWidth = (pageWidth - 40) / 2;
      const cardHeight = 70;
      let col = 0;
      let currentY = yPosition;

      for (const produto of produtosCategoria) {
        const xPosition = 15 + (col * (colWidth + 10));

        // Verificar espaço
        if (currentY > pageHeight - cardHeight - 20) {
          doc.addPage();
          currentY = 20;
        }

        // Card do produto
        doc.setDrawColor(224, 224, 224);
        doc.setLineWidth(0.5);
        doc.roundedRect(xPosition, currentY, colWidth, cardHeight, 3, 3, 'S');

        // Área da imagem
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(xPosition + 2, currentY + 2, colWidth - 4, 35, 2, 2, 'F');

        // Se tiver foto_url, tentar carregar
        if (produto.foto_url) {
          try {
            await this.addImageToPDF(doc, produto.foto_url, xPosition + 2, currentY + 2, colWidth - 4, 35);
          } catch (error) {
            // Se falhar, mostrar emoji
            doc.setFontSize(24);
            doc.setTextColor(212, 175, 55);
            doc.text('💎', xPosition + colWidth / 2, currentY + 22, { align: 'center' });
          }
        } else {
          // Emoji padrão
          doc.setFontSize(24);
          doc.setTextColor(212, 175, 55);
          doc.text('💎', xPosition + colWidth / 2, currentY + 22, { align: 'center' });
        }

        // Informações do produto
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 51, 51);

        const maxWidth = colWidth - 8;
        const descricaoLines = doc.splitTextToSize(produto.descricao, maxWidth);
        const descricaoText = descricaoLines.length > 2
          ? descricaoLines.slice(0, 2).join(' ').substring(0, 50) + '...'
          : descricaoLines.join(' ');

        doc.text(descricaoText, xPosition + 4, currentY + 43);

        // Preço
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(212, 175, 55);
        doc.text(`R$ ${produto.valor_unitario.toFixed(2)}`, xPosition + 4, currentY + 52);

        // Estoque
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(102, 102, 102);
        doc.text(`Disponível: ${produto.quantidade_disponivel}`, xPosition + 4, currentY + 58);

        col++;
        if (col === 2) {
          col = 0;
          currentY += cardHeight + 5;
        }
      }

      yPosition = col === 0 ? currentY : currentY + cardHeight + 5;
      yPosition += 10;
    }

    // Rodapé na última página
    const finalY = pageHeight - 20;
    doc.setFillColor(44, 62, 80);
    doc.rect(0, finalY - 10, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Entre em contato para fazer seu pedido!', pageWidth / 2, finalY, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`© ${new Date().getFullYear()} ${nomeConsultora} - Todos os direitos reservados`, pageWidth / 2, finalY + 5, { align: 'center' });

    // Salvar PDF
    doc.save(`catalogo-${nomeConsultora.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  static async gerarRelatorioVendasPDF(
    vendas: Venda[],
    nomeConsultora: string = 'SPHERE',
    dataInicio?: string,
    dataFim?: string
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cabeçalho
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(nomeConsultora, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(14);
    doc.text('Relatório de Vendas', pageWidth / 2, 25, { align: 'center' });

    // Informações
    let yPosition = 45;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, yPosition, pageWidth - 30, 25, 3, 3, 'F');

    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text(`Período: ${dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : 'Início'} até ${dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : 'Hoje'}`, 20, yPosition + 8);
    doc.text(`Total de Vendas: ${vendas.length}`, 20, yPosition + 14);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, yPosition + 20);

    yPosition += 35;

    // Tabela
    const colWidths = [30, 70, 35, 35];
    const headers = ['Data', 'Cliente', 'Valor', 'Status'];

    // Cabeçalho da tabela
    doc.setFillColor(212, 175, 55);
    doc.rect(15, yPosition, pageWidth - 30, 10, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    let xPos = 15;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 2, yPosition + 7);
      xPos += colWidths[i];
    });

    yPosition += 10;

    // Linhas
    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const totalVendas = vendas.reduce((sum, v) => sum + v.valor_total, 0);

    for (const venda of vendas) {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }

      // Linha zebrada
      if (vendas.indexOf(venda) % 2 === 0) {
        doc.setFillColor(249, 249, 249);
        doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
      }

      xPos = 15;
      doc.text(new Date(venda.data_venda).toLocaleDateString('pt-BR'), xPos + 2, yPosition + 5.5);
      xPos += colWidths[0];

      const clienteText = venda.clientes.nome.length > 25
        ? venda.clientes.nome.substring(0, 25) + '...'
        : venda.clientes.nome;
      doc.text(clienteText, xPos + 2, yPosition + 5.5);
      xPos += colWidths[1];

      doc.text(`R$ ${venda.valor_total.toFixed(2)}`, xPos + 2, yPosition + 5.5);
      xPos += colWidths[2];

      const statusMap: Record<string, string> = {
        'pago': 'Pago',
        'pendente': 'Pendente',
        'parcial': 'Parcial',
        'atrasado': 'Atrasado'
      };
      doc.text(statusMap[venda.status_pagamento] || venda.status_pagamento, xPos + 2, yPosition + 5.5);

      yPosition += 8;
    }

    // Total
    yPosition += 5;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(15, yPosition, pageWidth - 15, yPosition);

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(212, 175, 55);
    doc.text(`TOTAL: R$ ${totalVendas.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });

    // Rodapé
    const finalY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text(`Gerado por ${nomeConsultora}`, pageWidth / 2, finalY, { align: 'center' });

    doc.save(`relatorio-vendas-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  private static async addImageToPDF(
    doc: jsPDF,
    imageUrl: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          doc.addImage(img, 'JPEG', x, y, width, height, undefined, 'FAST');
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }
}
