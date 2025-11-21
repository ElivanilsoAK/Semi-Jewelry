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
  private static readonly COLORS = {
    gold: [212, 175, 55] as [number, number, number],
    darkGold: [184, 134, 11] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    lightGray: [248, 248, 248] as [number, number, number],
    mediumGray: [230, 230, 230] as [number, number, number],
    darkGray: [100, 100, 100] as [number, number, number],
    black: [33, 33, 33] as [number, number, number]
  };

  static async gerarCatalogoPDF(
    itens: ItemCatalogo[],
    nomeConsultora: string = 'SPHERE'
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const addHeader = (isFirstPage: boolean = false) => {
      doc.setFillColor(...this.COLORS.gold);
      doc.rect(0, 0, pageWidth, isFirstPage ? 60 : 35, 'F');

      if (isFirstPage) {
        doc.setFillColor(...this.COLORS.darkGold);
        doc.circle(pageWidth / 2, 20, 8, 'F');

        doc.setTextColor(...this.COLORS.white);
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.text(nomeConsultora, pageWidth / 2, 42, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('CATÁLOGO DE PRODUTOS', pageWidth / 2, 50, { align: 'center' });

        doc.setFontSize(9);
        doc.text(new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }), pageWidth / 2, 56, { align: 'center' });
      } else {
        doc.setTextColor(...this.COLORS.white);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(nomeConsultora, pageWidth / 2, 20, { align: 'center' });
      }
    };

    const addFooter = (pageNum: number, totalPages: number) => {
      const footerY = pageHeight - 15;

      doc.setDrawColor(...this.COLORS.gold);
      doc.setLineWidth(0.5);
      doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

      doc.setTextColor(...this.COLORS.darkGray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'Entre em contato para fazer seu pedido',
        pageWidth / 2,
        footerY,
        { align: 'center' }
      );

      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${pageNum} de ${totalPages}`,
        pageWidth - 20,
        footerY,
        { align: 'right' }
      );
    };

    const categorias = [...new Set(itens.map(item => item.categoria))].sort();
    const totalPages = Math.ceil(itens.length / 6) + 1;
    let currentPage = 1;
    let yPosition = 70;

    addHeader(true);

    for (const categoria of categorias) {
      const produtosCategoria = itens.filter(item => item.categoria === categoria);

      if (yPosition > pageHeight - 100) {
        addFooter(currentPage, totalPages);
        doc.addPage();
        currentPage++;
        addHeader(false);
        yPosition = 45;
      }

      doc.setFillColor(...this.COLORS.gold);
      doc.roundedRect(15, yPosition, pageWidth - 30, 10, 2, 2, 'F');

      doc.setTextColor(...this.COLORS.white);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(categoria.toUpperCase(), 20, yPosition + 7);

      yPosition += 18;

      const cardWidth = (pageWidth - 50) / 3;
      const cardHeight = 75;
      let col = 0;
      let rowY = yPosition;

      for (const produto of produtosCategoria) {
        if (col === 0 && rowY > pageHeight - 100) {
          addFooter(currentPage, totalPages);
          doc.addPage();
          currentPage++;
          addHeader(false);
          rowY = 45;
          yPosition = 45;
        }

        const xPos = 15 + (col * (cardWidth + 10));

        doc.setFillColor(...this.COLORS.white);
        doc.setDrawColor(...this.COLORS.mediumGray);
        doc.setLineWidth(0.3);
        doc.roundedRect(xPos, rowY, cardWidth, cardHeight, 3, 3, 'FD');

        doc.setFillColor(...this.COLORS.lightGray);
        doc.roundedRect(xPos + 3, rowY + 3, cardWidth - 6, 35, 2, 2, 'F');

        if (produto.foto_url) {
          try {
            await this.addImageToPDF(
              doc,
              produto.foto_url,
              xPos + 3,
              rowY + 3,
              cardWidth - 6,
              35
            );
          } catch {
            this.drawNoImagePlaceholder(doc, xPos, rowY, cardWidth);
          }
        } else {
          this.drawNoImagePlaceholder(doc, xPos, rowY, cardWidth);
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...this.COLORS.black);

        const descricao = produto.descricao.length > 35
          ? produto.descricao.substring(0, 35) + '...'
          : produto.descricao;

        doc.text(descricao, xPos + cardWidth / 2, rowY + 46, {
          align: 'center',
          maxWidth: cardWidth - 8
        });

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...this.COLORS.gold);
        doc.text(
          `R$ ${produto.valor_unitario.toFixed(2)}`,
          xPos + cardWidth / 2,
          rowY + 58,
          { align: 'center' }
        );

        doc.setFillColor(...this.COLORS.lightGray);
        doc.roundedRect(xPos + 8, rowY + 63, cardWidth - 16, 8, 2, 2, 'F');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...this.COLORS.darkGray);
        doc.text(
          `Disponível: ${produto.quantidade_disponivel} un`,
          xPos + cardWidth / 2,
          rowY + 68,
          { align: 'center' }
        );

        col++;
        if (col === 3) {
          col = 0;
          rowY += cardHeight + 8;
        }
      }

      yPosition = col === 0 ? rowY : rowY + cardHeight + 8;
      yPosition += 5;
    }

    addFooter(currentPage, totalPages);

    const filename = `catalogo-${nomeConsultora.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  private static drawNoImagePlaceholder(
    doc: jsPDF,
    xPos: number,
    yPos: number,
    cardWidth: number
  ): void {
    const imgCenterX = xPos + cardWidth / 2;
    const imgCenterY = yPos + 20;

    doc.setFillColor(240, 240, 240);
    doc.roundedRect(xPos + 3, yPos + 3, cardWidth - 6, 35, 2, 2, 'F');

    doc.setDrawColor(...this.COLORS.mediumGray);
    doc.setLineWidth(1.5);
    doc.roundedRect(imgCenterX - 8, imgCenterY - 6, 16, 12, 1, 1, 'S');

    doc.circle(imgCenterX - 4, imgCenterY - 2, 2, 'S');

    doc.line(imgCenterX - 6, imgCenterY + 3, imgCenterX - 2, imgCenterY - 1);
    doc.line(imgCenterX - 2, imgCenterY - 1, imgCenterX + 2, imgCenterY + 3);
    doc.line(imgCenterX + 2, imgCenterY + 3, imgCenterX + 6, imgCenterY - 1);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.COLORS.darkGray);
    doc.text('SEM IMAGEM', imgCenterX, imgCenterY + 11, { align: 'center' });
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

    doc.setFillColor(...this.COLORS.gold);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(...this.COLORS.white);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(nomeConsultora, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('RELATÓRIO DE VENDAS', pageWidth / 2, 30, { align: 'center' });

    let yPosition = 55;
    doc.setFillColor(...this.COLORS.lightGray);
    doc.roundedRect(15, yPosition, pageWidth - 30, 30, 3, 3, 'F');

    doc.setTextColor(...this.COLORS.black);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const periodoTexto = `Período: ${
      dataInicio
        ? new Date(dataInicio).toLocaleDateString('pt-BR')
        : 'Início'
    } até ${
      dataFim
        ? new Date(dataFim).toLocaleDateString('pt-BR')
        : 'Hoje'
    }`;

    doc.text(periodoTexto, 20, yPosition + 10);
    doc.text(`Total de Vendas: ${vendas.length}`, 20, yPosition + 17);
    doc.text(
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      20,
      yPosition + 24
    );

    yPosition += 40;

    const colWidths = [30, 75, 35, 35];
    const headers = ['Data', 'Cliente', 'Valor', 'Status'];

    doc.setFillColor(...this.COLORS.gold);
    doc.rect(15, yPosition, pageWidth - 30, 10, 'F');

    doc.setTextColor(...this.COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    let xPos = 15;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 3, yPosition + 7);
      xPos += colWidths[i];
    });

    yPosition += 10;

    doc.setTextColor(...this.COLORS.black);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const totalVendas = vendas.reduce((sum, v) => sum + v.valor_total, 0);

    for (let i = 0; i < vendas.length; i++) {
      const venda = vendas[i];

      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      if (i % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(15, yPosition, pageWidth - 30, 9, 'F');
      }

      xPos = 15;
      doc.text(
        new Date(venda.data_venda).toLocaleDateString('pt-BR'),
        xPos + 3,
        yPosition + 6
      );
      xPos += colWidths[0];

      const clienteText = venda.clientes.nome.length > 28
        ? venda.clientes.nome.substring(0, 28) + '...'
        : venda.clientes.nome;
      doc.text(clienteText, xPos + 3, yPosition + 6);
      xPos += colWidths[1];

      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${venda.valor_total.toFixed(2)}`, xPos + 3, yPosition + 6);
      doc.setFont('helvetica', 'normal');
      xPos += colWidths[2];

      const statusMap: Record<string, string> = {
        'pago': 'Pago',
        'pendente': 'Pendente',
        'parcial': 'Parcial',
        'atrasado': 'Atrasado'
      };
      doc.text(
        statusMap[venda.status_pagamento] || venda.status_pagamento,
        xPos + 3,
        yPosition + 6
      );

      yPosition += 9;
    }

    yPosition += 8;
    doc.setDrawColor(...this.COLORS.gold);
    doc.setLineWidth(1);
    doc.line(15, yPosition, pageWidth - 15, yPosition);

    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...this.COLORS.gold);
    doc.text(
      `TOTAL: R$ ${totalVendas.toFixed(2)}`,
      pageWidth - 20,
      yPosition,
      { align: 'right' }
    );

    const finalY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.COLORS.darkGray);
    doc.text(
      `Gerado por ${nomeConsultora}`,
      pageWidth / 2,
      finalY,
      { align: 'center' }
    );

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
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imgData = canvas.toDataURL('image/jpeg', 0.8);
          doc.addImage(imgData, 'JPEG', x, y, width, height, undefined, 'FAST');
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
