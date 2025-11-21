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
    primary: [212, 175, 55] as [number, number, number],
    secondary: [184, 134, 11] as [number, number, number],
    accent: [255, 215, 0] as [number, number, number],
    accentLight: [255, 235, 150] as [number, number, number],
    dark: [52, 48, 43] as [number, number, number],
    darkGray: [74, 74, 74] as [number, number, number],
    mediumGray: [120, 120, 120] as [number, number, number],
    lightGray: [245, 245, 245] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    cardBg: [255, 253, 248] as [number, number, number],
    cardBgAlt: [252, 248, 238] as [number, number, number],
    success: [34, 197, 94] as [number, number, number],
    warning: [251, 146, 60] as [number, number, number],
    shadow: [0, 0, 0] as [number, number, number]
  };

  private static readonly CATEGORY_ICONS: Record<string, string> = {
    'Anéis': '◆',
    'Brincos': '◎',
    'Colares': '◈',
    'Pulseiras': '◇',
    'Pingentes': '◊',
    'Tornozeleiras': '◐',
    'Conjuntos': '◉'
  };

  private static drawPattern(doc: jsPDF, x: number, y: number, width: number, height: number, type: 'dots' | 'lines' | 'gradient') {
    if (type === 'dots') {
      doc.setFillColor(...this.COLORS.accentLight);
      for (let i = 0; i < width; i += 8) {
        for (let j = 0; j < height; j += 8) {
          doc.circle(x + i, y + j, 0.3, 'F');
        }
      }
    } else if (type === 'lines') {
      doc.setDrawColor(...this.COLORS.accentLight);
      doc.setLineWidth(0.2);
      for (let i = 0; i < height; i += 4) {
        doc.line(x, y + i, x + width, y + i);
      }
    }
  }

  static async gerarCatalogoPDF(
    itens: ItemCatalogo[],
    nomeConsultora: string = 'SPHERE'
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    const addHeader = async (isFirstPage: boolean = false) => {
      doc.setFillColor(...this.COLORS.primary);
      doc.roundedRect(0, 0, pageWidth, isFirstPage ? 75 : 45, 0, 0, 'F');

      this.drawPattern(doc, 0, 0, pageWidth, isFirstPage ? 75 : 45, 'dots');

      doc.setFillColor(...this.COLORS.secondary);
      doc.roundedRect(0, isFirstPage ? 70 : 40, pageWidth, 5, 0, 0, 'F');

      if (isFirstPage) {
        try {
          const logoPath = '/esfera logo.png';
          const logoImg = await this.loadImage(logoPath);
          const logoSize = 22;
          const logoX = (pageWidth - logoSize) / 2;
          doc.addImage(logoImg, 'PNG', logoX, 12, logoSize, logoSize, undefined, 'FAST');
        } catch (error) {
          console.log('Logo não carregada, continuando sem ela');
        }

        doc.setTextColor(...this.COLORS.dark);
        doc.setFontSize(36);
        doc.setFont('helvetica', 'bold');
        doc.text(nomeConsultora.toUpperCase(), pageWidth / 2, 45, { align: 'center' });

        doc.setFontSize(13);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...this.COLORS.darkGray);
        doc.text('CATÁLOGO DE PRODUTOS PREMIUM', pageWidth / 2, 53, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(...this.COLORS.mediumGray);
        const dataFormatada = new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
        doc.text(dataFormatada, pageWidth / 2, 59, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...this.COLORS.primary);
        doc.text('by Magold Ana Kelly', pageWidth / 2, 66, { align: 'center' });
      } else {
        doc.setTextColor(...this.COLORS.dark);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(nomeConsultora.toUpperCase(), pageWidth / 2, 22, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...this.COLORS.primary);
        doc.text('by Magold Ana Kelly', pageWidth / 2, 31, { align: 'center' });
      }
    };

    const addFooter = (pageNum: number) => {
      const footerY = pageHeight - 18;

      doc.setDrawColor(...this.COLORS.primary);
      doc.setLineWidth(0.8);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      doc.setFillColor(...this.COLORS.accent);
      doc.roundedRect(margin, footerY + 3, contentWidth, 12, 2, 2, 'F');

      doc.setFillColor(...this.COLORS.primary);
      doc.circle(pageWidth / 2, footerY + 9, 1.5, 'F');

      doc.setTextColor(...this.COLORS.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(
        '📱 FAÇA SEU PEDIDO AGORA!',
        pageWidth / 2,
        footerY + 7,
        { align: 'center' }
      );

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Entre em contato para garantir seu produto',
        pageWidth / 2,
        footerY + 11.5,
        { align: 'center' }
      );

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.COLORS.primary);
      doc.text(
        `Página ${pageNum}`,
        pageWidth - margin - 5,
        footerY - 3,
        { align: 'right' }
      );
    };

    const drawCategoryHeader = (categoria: string, y: number) => {
      const icon = this.CATEGORY_ICONS[categoria] || '◆';
      const headerHeight = 18;

      doc.setFillColor(...this.COLORS.primary);
      doc.roundedRect(margin, y, contentWidth, headerHeight, 4, 4, 'F');

      doc.setFillColor(...this.COLORS.accent);
      doc.roundedRect(margin, y, 8, headerHeight, 4, 0, 'F');

      doc.setFillColor(...this.COLORS.white);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(icon, margin + 4, y + 12, { align: 'center' });

      doc.setTextColor(...this.COLORS.white);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(categoria.toUpperCase(), margin + 15, y + 12);

      doc.setDrawColor(...this.COLORS.accent);
      doc.setLineWidth(2);
      doc.line(margin, y + headerHeight, margin + contentWidth, y + headerHeight);
    };

    const drawStockBadge = (doc: jsPDF, x: number, y: number, quantidade: number) => {
      const badgeWidth = 25;
      const badgeHeight = 6;

      if (quantidade <= 3) {
        doc.setFillColor(...this.COLORS.warning);
      } else {
        doc.setFillColor(...this.COLORS.success);
      }

      doc.roundedRect(x, y, badgeWidth, badgeHeight, 2, 2, 'F');

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.COLORS.white);
      doc.text(
        `✓ ${quantidade} disponível${quantidade !== 1 ? 'eis' : ''}`,
        x + badgeWidth / 2,
        y + 4.5,
        { align: 'center' }
      );
    };

    const drawProductCard = async (
      produto: ItemCatalogo,
      x: number,
      y: number,
      cardWidth: number,
      cardHeight: number,
      isAlternate: boolean
    ) => {
      const bgColor = isAlternate ? this.COLORS.cardBgAlt : this.COLORS.cardBg;

      doc.setFillColor(...bgColor);
      doc.roundedRect(x, y, cardWidth, cardHeight, 5, 5, 'F');

      doc.setDrawColor(...this.COLORS.primary);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, cardWidth, cardHeight, 5, 5, 'S');

      const imgHeight = 45;
      const imgY = y + 5;
      const imgX = x + 5;
      const imgWidth = cardWidth - 10;

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(imgX, imgY, imgWidth, imgHeight, 4, 4, 'F');

      doc.setDrawColor(...this.COLORS.lightGray);
      doc.setLineWidth(0.3);
      doc.roundedRect(imgX, imgY, imgWidth, imgHeight, 4, 4, 'S');

      if (produto.foto_url) {
        try {
          await this.addImageProportional(
            doc,
            produto.foto_url,
            imgX,
            imgY,
            imgWidth,
            imgHeight
          );
        } catch {
          this.drawNoImagePlaceholder(doc, imgX, imgY, imgWidth, imgHeight);
        }
      } else {
        this.drawNoImagePlaceholder(doc, imgX, imgY, imgWidth, imgHeight);
      }

      this.drawStockBadge(doc, imgX + imgWidth - 27, imgY + 2, produto.quantidade_disponivel);

      const textY = imgY + imgHeight + 7;
      const maxDescWidth = cardWidth - 12;

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.COLORS.dark);

      const descricaoLimpa = produto.descricao.substring(0, 42);
      const lines = doc.splitTextToSize(descricaoLimpa, maxDescWidth);
      const descText = lines.length > 2
        ? lines.slice(0, 2).join(' ').substring(0, 42) + '...'
        : lines.slice(0, 2).join(' ');

      doc.text(descText, x + cardWidth / 2, textY, {
        align: 'center',
        maxWidth: maxDescWidth
      });

      const priceY = textY + 10;
      doc.setFillColor(...this.COLORS.primary);
      doc.roundedRect(x + 8, priceY, cardWidth - 16, 14, 4, 4, 'F');

      doc.setFillColor(...this.COLORS.accent);
      doc.circle(x + 15, priceY + 7, 2.5, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...this.COLORS.white);
      doc.text('R$', x + 22, priceY + 8.5);

      doc.setFontSize(14);
      doc.text(
        produto.valor_unitario.toFixed(2).replace('.', ','),
        x + cardWidth / 2 + 6,
        priceY + 9,
        { align: 'center' }
      );
    };

    const categorias = [...new Set(itens.map(item => item.categoria))].sort();
    let currentPage = 1;
    let yPosition = 85;

    await addHeader(true);

    for (let catIndex = 0; catIndex < categorias.length; catIndex++) {
      const categoria = categorias[catIndex];
      const produtosCategoria = itens.filter(item => item.categoria === categoria);

      if (yPosition > pageHeight - 130) {
        addFooter(currentPage);
        doc.addPage();
        currentPage++;
        await addHeader(false);
        yPosition = 55;
      }

      drawCategoryHeader(categoria, yPosition);
      yPosition += 24;

      const cols = 2;
      const cardSpacing = 10;
      const cardWidth = (contentWidth - cardSpacing * (cols - 1)) / cols;
      const cardHeight = 98;
      let col = 0;
      let rowY = yPosition;

      for (const produto of produtosCategoria) {
        if (col === 0 && rowY > pageHeight - cardHeight - 35) {
          addFooter(currentPage);
          doc.addPage();
          currentPage++;
          await addHeader(false);
          rowY = 55;
          yPosition = 55;
        }

        const xPos = margin + (col * (cardWidth + cardSpacing));
        const isAlternate = col % 2 === 1;

        await drawProductCard(produto, xPos, rowY, cardWidth, cardHeight, isAlternate);

        col++;
        if (col === cols) {
          col = 0;
          rowY += cardHeight + cardSpacing;
        }
      }

      yPosition = col === 0 ? rowY : rowY + cardHeight + cardSpacing;
      yPosition += 5;
    }

    addFooter(currentPage);

    const filename = `catalogo-${nomeConsultora.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  }

  private static drawNoImagePlaceholder(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    doc.setFillColor(242, 242, 242);
    doc.roundedRect(x, y, width, height, 4, 4, 'F');

    doc.setDrawColor(...this.COLORS.mediumGray);
    doc.setLineWidth(1.5);

    const iconSize = Math.min(width, height) * 0.28;
    doc.roundedRect(
      centerX - iconSize / 2,
      centerY - iconSize / 2 - 3,
      iconSize,
      iconSize * 0.7,
      2,
      2,
      'S'
    );

    const circleSize = iconSize * 0.18;
    doc.circle(centerX - iconSize * 0.2, centerY - iconSize * 0.15, circleSize, 'S');

    doc.setLineWidth(1.2);
    doc.line(
      centerX - iconSize * 0.35,
      centerY + iconSize * 0.15,
      centerX - iconSize * 0.1,
      centerY - iconSize * 0.05
    );
    doc.line(
      centerX - iconSize * 0.1,
      centerY - iconSize * 0.05,
      centerX + iconSize * 0.1,
      centerY + iconSize * 0.15
    );
    doc.line(
      centerX + iconSize * 0.1,
      centerY + iconSize * 0.15,
      centerX + iconSize * 0.35,
      centerY - iconSize * 0.1
    );

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.COLORS.mediumGray);
    doc.text('SEM FOTO', centerX, centerY + iconSize * 0.5 + 6, { align: 'center' });
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

          const imgData = canvas.toDataURL('image/jpeg', 0.85);
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

    doc.setFillColor(...this.COLORS.primary);
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setFillColor(...this.COLORS.secondary);
    doc.rect(0, 45, pageWidth, 5, 'F');

    doc.setTextColor(...this.COLORS.white);
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
    doc.setFillColor(...this.COLORS.lightGray);
    doc.roundedRect(15, yPosition, pageWidth - 30, 30, 3, 3, 'F');

    doc.setTextColor(...this.COLORS.dark);
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

    doc.setFillColor(...this.COLORS.primary);
    doc.roundedRect(15, yPosition, pageWidth - 30, 10, 2, 2, 'F');

    doc.setTextColor(...this.COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    let xPos = 15;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 3, yPosition + 7);
      xPos += colWidths[i];
    });

    yPosition += 10;

    doc.setTextColor(...this.COLORS.dark);
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
        doc.setFillColor(...this.COLORS.cardBg);
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
      doc.setTextColor(...this.COLORS.primary);
      doc.text(`R$ ${venda.valor_total.toFixed(2)}`, xPos + 3, yPosition + 6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...this.COLORS.dark);
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
    doc.setDrawColor(...this.COLORS.primary);
    doc.setLineWidth(1);
    doc.line(15, yPosition, pageWidth - 15, yPosition);

    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...this.COLORS.primary);
    doc.text(
      `TOTAL: R$ ${totalVendas.toFixed(2)}`,
      pageWidth - 20,
      yPosition,
      { align: 'right' }
    );

    const finalY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...this.COLORS.mediumGray);
    doc.text(
      `Gerado por ${nomeConsultora}`,
      pageWidth / 2,
      finalY,
      { align: 'center' }
    );

    doc.save(`relatorio-vendas-${new Date().toISOString().split('T')[0]}.pdf`);
  }
}
