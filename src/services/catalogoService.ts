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
    goldNoble: [212, 175, 55] as [number, number, number],
    goldDark: [184, 134, 11] as [number, number, number],
    goldLight: [255, 215, 0] as [number, number, number],
    cream: [250, 250, 250] as [number, number, number],
    offWhite: [255, 255, 255] as [number, number, number],
    textDark: [51, 51, 51] as [number, number, number],
    textMedium: [102, 102, 102] as [number, number, number],
    textLight: [153, 153, 153] as [number, number, number],
    black: [0, 0, 0] as [number, number, number],
    cardBg: [255, 253, 250] as [number, number, number],
    borderLight: [230, 230, 230] as [number, number, number],
    stockGreen: [34, 197, 94] as [number, number, number],
    stockOrange: [251, 146, 60] as [number, number, number],
    stockRed: [239, 68, 68] as [number, number, number],
    shadow: [0, 0, 0] as [number, number, number]
  };

  private static readonly CATEGORY_DISPLAY: Record<string, string> = {
    'Anéis': 'ANÉIS',
    'Brincos': 'BRINCOS',
    'Colares': 'COLARES',
    'Pulseiras': 'PULSEIRAS',
    'Pingentes': 'PINGENTES',
    'Tornozeleiras': 'TORNOZELEIRAS',
    'Conjuntos': 'CONJUNTOS'
  };

  private static drawMarbleTexture(doc: jsPDF, x: number, y: number, width: number, height: number) {
    doc.setFillColor(...CatalogoService.COLORS.cream);
    doc.rect(x, y, width, height, 'F');

    doc.setFillColor(245, 245, 245);
    for (let i = 0; i < 30; i++) {
      const px = x + Math.random() * width;
      const py = y + Math.random() * height;
      const size = Math.random() * 3 + 1;
      doc.circle(px, py, size, 'F');
    }
  }

  static async gerarCatalogoPDF(
    itens: ItemCatalogo[],
    nomeConsultora: string = 'SPHERE'
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    const addCoverPage = async () => {
      CatalogoService.drawMarbleTexture(doc, 0, 0, pageWidth, pageHeight);

      const centerX = pageWidth / 2;
      const centerY = 90;

      const circleRadius = 35;

      try {
        const logoPath = '/esfera logo.png';
        const logoImg = await CatalogoService.loadImage(logoPath);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const size = circleRadius * 2 * 4;
        canvas.width = size;
        canvas.height = size;

        const img = new Image();
        img.src = logoPath;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, 0, 0, size, size);

        const circularImgData = canvas.toDataURL('image/png');

        doc.addImage(
          circularImgData,
          'PNG',
          centerX - circleRadius,
          centerY - circleRadius,
          circleRadius * 2,
          circleRadius * 2,
          undefined,
          'FAST'
        );

        doc.setDrawColor(...CatalogoService.COLORS.goldNoble);
        doc.setLineWidth(3);
        doc.circle(centerX, centerY, circleRadius + 2, 'S');
      } catch (error) {
        console.log('Logo não carregada:', error);
      }

      const lineY = centerY + circleRadius + 35;
      const fullLineWidth = pageWidth - (margin * 2);
      doc.setFillColor(...CatalogoService.COLORS.goldNoble);
      doc.rect(margin, lineY, fullLineWidth, 2, 'F');

      const titleY = lineY + 25;
      doc.setTextColor(...CatalogoService.COLORS.black);
      doc.setFontSize(46);
      doc.setFont('helvetica', 'bold');
      doc.text('S P H E R E', centerX, titleY, {
        align: 'center'
      });

      const subtitleY = titleY + 12;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...CatalogoService.COLORS.textMedium);
      doc.text('C A T Á L O G O   P R E M I U M', centerX, subtitleY, {
        align: 'center'
      });

      const dataFormatada = new Date().toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
      });
      const dataTexto = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
      const dataComEspacos = dataTexto.split('').join(' ');

      doc.setFontSize(9);
      doc.setTextColor(...CatalogoService.COLORS.textLight);
      doc.text(dataComEspacos, centerX, pageHeight - 30, {
        align: 'center'
      });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...CatalogoService.COLORS.goldNoble);
      doc.text('by Magold Ana Kelly', centerX, pageHeight - 20, {
        align: 'center'
      });
    };

    const addHeader = (pageNum: number) => {
      doc.setFillColor(...CatalogoService.COLORS.cream);
      doc.rect(0, 0, pageWidth, 35, 'F');

      doc.setDrawColor(...CatalogoService.COLORS.goldNoble);
      doc.setLineWidth(2);
      doc.line(margin, 32, pageWidth - margin, 32);

      doc.setTextColor(...CatalogoService.COLORS.black);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const nomeComEspacos = nomeConsultora.toUpperCase().split('').join(' ');
      doc.text(nomeComEspacos, pageWidth / 2, 18, {
        align: 'center'
      });

      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...CatalogoService.COLORS.goldNoble);
      doc.text('by Magold Ana Kelly', pageWidth / 2, 26, {
        align: 'center'
      });
    };

    const addFooter = (pageNum: number, totalPages: number) => {
      const footerY = pageHeight - 20;

      doc.setDrawColor(...CatalogoService.COLORS.goldNoble);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...CatalogoService.COLORS.textMedium);
      doc.text(
        `${nomeConsultora.toUpperCase()} - Coleção 2025`,
        margin,
        footerY + 6
      );

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...CatalogoService.COLORS.goldNoble);
      doc.text(
        `${String(pageNum).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`,
        pageWidth - margin,
        footerY + 6,
        { align: 'right' }
      );

      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...CatalogoService.COLORS.textLight);
      doc.text(
        'Entre em contato para garantir seu produto',
        pageWidth / 2,
        footerY + 10,
        { align: 'center' }
      );
    };

    const drawCategoryHeader = (categoria: string, y: number) => {
      const headerHeight = 20;

      doc.setFillColor(...CatalogoService.COLORS.cream);
      doc.rect(margin, y, contentWidth, headerHeight, 'F');

      doc.setDrawColor(...CatalogoService.COLORS.goldNoble);
      doc.setLineWidth(1);
      doc.rect(margin, y, contentWidth, headerHeight, 'S');

      doc.setDrawColor(...CatalogoService.COLORS.goldNoble);
      doc.setLineWidth(3);
      doc.line(margin, y, margin, y + headerHeight);

      doc.setTextColor(...CatalogoService.COLORS.black);
      doc.setFontSize(16);
      doc.setFont('times', 'bold');
      const displayName = CatalogoService.CATEGORY_DISPLAY[categoria] || categoria.toUpperCase();
      doc.text(displayName, margin + 8, y + 13);
    };

    const drawStockBadge = (doc: jsPDF, x: number, y: number, quantidade: number) => {
      let color: [number, number, number];
      let icon: string;

      if (quantidade === 0) {
        color = CatalogoService.COLORS.stockRed;
        icon = '●';
      } else if (quantidade <= 2) {
        color = CatalogoService.COLORS.stockOrange;
        icon = '●';
      } else {
        color = CatalogoService.COLORS.stockGreen;
        icon = '●';
      }

      doc.setFillColor(...color);
      doc.circle(x, y, 2, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text(
        quantidade === 0 ? 'Esgotado' : quantidade <= 2 ? `Restam ${quantidade}` : 'Disponível',
        x + 4,
        y + 1.5
      );
    };

    const drawProductCard = async (
      produto: ItemCatalogo,
      x: number,
      y: number,
      cardWidth: number,
      cardHeight: number
    ) => {
      doc.setFillColor(...CatalogoService.COLORS.offWhite);
      doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'F');

      doc.setDrawColor(...CatalogoService.COLORS.goldNoble);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'S');

      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(...CatalogoService.COLORS.borderLight);
      doc.setLineWidth(0.3);

      const imgHeight = cardHeight * 0.6;
      const imgY = y + 3;
      const imgX = x + 3;
      const imgWidth = cardWidth - 6;

      doc.roundedRect(imgX, imgY, imgWidth, imgHeight, 3, 3, 'FD');

      if (produto.foto_url) {
        try {
          await CatalogoService.addImageProportional(
            doc,
            produto.foto_url,
            imgX,
            imgY,
            imgWidth,
            imgHeight
          );
        } catch {
          CatalogoService.drawLuxuryPlaceholder(doc, imgX, imgY, imgWidth, imgHeight);
        }
      } else {
        CatalogoService.drawLuxuryPlaceholder(doc, imgX, imgY, imgWidth, imgHeight);
      }

      drawStockBadge(doc, imgX + 5, imgY + 5, produto.quantidade_disponivel);

      const textY = imgY + imgHeight + 8;

      doc.setFontSize(10);
      doc.setFont('times', 'bold');
      doc.setTextColor(...CatalogoService.COLORS.textDark);

      const descricaoLimpa = produto.descricao.substring(0, 45);
      const lines = doc.splitTextToSize(descricaoLimpa, cardWidth - 10);
      const descText = lines.length > 2
        ? lines.slice(0, 2).join(' ').substring(0, 45) + '...'
        : lines.slice(0, 2).join(' ');

      doc.text(descText, x + cardWidth / 2, textY, {
        align: 'center',
        maxWidth: cardWidth - 10
      });

      const priceY = y + cardHeight - 18;

      doc.setFillColor(...CatalogoService.COLORS.goldNoble);
      doc.roundedRect(x + 5, priceY, cardWidth - 10, 14, 3, 3, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...CatalogoService.COLORS.offWhite);
      doc.text('R$', x + cardWidth / 2 - 15, priceY + 7);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(
        produto.valor_unitario.toFixed(2).replace('.', ','),
        x + cardWidth / 2 + 5,
        priceY + 9,
        { align: 'center' }
      );
    };

    const categorias = [...new Set(itens.map(item => item.categoria))].sort();

    const totalProductPages = Math.ceil(
      categorias.reduce((total, cat) => {
        const produtosCategoria = itens.filter(item => item.categoria === cat);
        return total + Math.ceil(produtosCategoria.length / 4);
      }, 0)
    );
    const totalPages = 1 + totalProductPages;

    await addCoverPage();

    let currentPage = 1;
    let yPosition = 0;
    let isFirstCategory = true;

    for (const categoria of categorias) {
      const produtosCategoria = itens.filter(item => item.categoria === categoria);

      if (isFirstCategory || yPosition > pageHeight - 150) {
        doc.addPage();
        currentPage++;
        addHeader(currentPage);
        yPosition = 45;
        isFirstCategory = false;
      }

      drawCategoryHeader(categoria, yPosition);
      yPosition += 28;

      const cols = 2;
      const cardSpacing = 12;
      const cardWidth = (contentWidth - cardSpacing) / cols;
      const cardHeight = 110;
      let col = 0;
      let rowY = yPosition;

      for (const produto of produtosCategoria) {
        if (col === 0 && rowY > pageHeight - cardHeight - 40) {
          addFooter(currentPage, totalPages);
          doc.addPage();
          currentPage++;
          addHeader(currentPage);
          rowY = 45;
          yPosition = 45;
        }

        const xPos = margin + (col * (cardWidth + cardSpacing));
        await drawProductCard(produto, xPos, rowY, cardWidth, cardHeight);

        col++;
        if (col === cols) {
          col = 0;
          rowY += cardHeight + cardSpacing;
        }
      }

      yPosition = col === 0 ? rowY : rowY + cardHeight + cardSpacing;
      yPosition += 10;
    }

    addFooter(currentPage, totalPages);

    const filename = `catalogo-${nomeConsultora.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  private static drawLuxuryPlaceholder(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');

    doc.setDrawColor(...CatalogoService.COLORS.goldNoble);
    doc.setLineWidth(2);

    const iconSize = Math.min(width, height) * 0.25;

    doc.circle(centerX, centerY - 5, iconSize, 'S');

    doc.setLineWidth(1.5);
    const gemSize = iconSize * 0.4;
    doc.line(centerX - gemSize, centerY - 5, centerX, centerY - 5 - gemSize * 0.7);
    doc.line(centerX, centerY - 5 - gemSize * 0.7, centerX + gemSize, centerY - 5);
    doc.line(centerX + gemSize, centerY - 5, centerX + gemSize * 0.6, centerY - 5 + gemSize * 0.5);
    doc.line(centerX + gemSize * 0.6, centerY - 5 + gemSize * 0.5, centerX - gemSize * 0.6, centerY - 5 + gemSize * 0.5);
    doc.line(centerX - gemSize * 0.6, centerY - 5 + gemSize * 0.5, centerX - gemSize, centerY - 5);

    doc.setFontSize(8);
    doc.setFont('times', 'italic');
    doc.setTextColor(...CatalogoService.COLORS.textLight);
    doc.text('Produto Premium', centerX, centerY + iconSize + 10, { align: 'center' });
  }

  private static async addImageProportional(
    doc: jsPDF,
    imageUrl: string,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const imgRatio = img.width / img.height;
          const boxRatio = maxWidth / maxHeight;

          let finalWidth = maxWidth;
          let finalHeight = maxHeight;
          let finalX = x;
          let finalY = y;

          if (imgRatio > boxRatio) {
            finalHeight = maxWidth / imgRatio;
            finalY = y + (maxHeight - finalHeight) / 2;
          } else {
            finalWidth = maxHeight * imgRatio;
            finalX = x + (maxWidth - finalWidth) / 2;
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const imgData = canvas.toDataURL('image/jpeg', 0.90);
          doc.addImage(imgData, 'JPEG', finalX, finalY, finalWidth, finalHeight, undefined, 'FAST');
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  private static async loadImage(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Canvas context not available'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = path;
    });
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

    doc.setFillColor(...CatalogoService.COLORS.goldNoble);
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setFillColor(...CatalogoService.COLORS.goldDark);
    doc.rect(0, 45, pageWidth, 5, 'F');

    doc.setTextColor(...CatalogoService.COLORS.offWhite);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(nomeConsultora.toUpperCase(), pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('RELATÓRIO DE VENDAS', pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('by Magold Ana Kelly', pageWidth / 2, 38, { align: 'center' });

    let yPosition = 60;
    doc.setFillColor(...CatalogoService.COLORS.cream);
    doc.roundedRect(15, yPosition, pageWidth - 30, 30, 3, 3, 'F');

    doc.setTextColor(...CatalogoService.COLORS.textDark);
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

    doc.setFillColor(...CatalogoService.COLORS.goldNoble);
    doc.roundedRect(15, yPosition, pageWidth - 30, 10, 2, 2, 'F');

    doc.setTextColor(...CatalogoService.COLORS.offWhite);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    let xPos = 15;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 3, yPosition + 7);
      xPos += colWidths[i];
    });

    yPosition += 10;

    doc.setTextColor(...CatalogoService.COLORS.textDark);
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
        doc.setFillColor(...CatalogoService.COLORS.cream);
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
      doc.setTextColor(...CatalogoService.COLORS.goldNoble);
      doc.text(`R$ ${venda.valor_total.toFixed(2)}`, xPos + 3, yPosition + 6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...CatalogoService.COLORS.textDark);
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
    doc.setDrawColor(...CatalogoService.COLORS.goldNoble);
    doc.setLineWidth(1);
    doc.line(15, yPosition, pageWidth - 15, yPosition);

    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...CatalogoService.COLORS.goldNoble);
    doc.text(
      `TOTAL: R$ ${totalVendas.toFixed(2)}`,
      pageWidth - 20,
      yPosition,
      { align: 'right' }
    );

    const finalY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CatalogoService.COLORS.textMedium);
    doc.text(
      `Gerado por ${nomeConsultora}`,
      pageWidth / 2,
      finalY,
      { align: 'center' }
    );

    doc.save(`relatorio-vendas-${new Date().toISOString().split('T')[0]}.pdf`);
  }
}
