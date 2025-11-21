import html2canvas from 'html2canvas';

interface ItemVenda {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface DadosComprovante {
  nomeCliente: string;
  nomeConsultora: string;
  dataVenda: string;
  itens: ItemVenda[];
  valorTotal: number;
  statusPagamento: string;
  formaPagamento?: string;
  observacoes?: string;
}

export class ComprovanteVisualService {
  private static readonly COLORS = {
    primary: '#D4AF37',
    secondary: '#B8860B',
    accent: '#FFD700',
    dark: '#34302B',
    darkGray: '#4A4A4A',
    mediumGray: '#787878',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
    success: '#22C55E',
    warning: '#FB923C',
    pending: '#F59E0B',
    cardBg: '#FFFDF8'
  };

  static async gerarComprovanteImagem(dados: DadosComprovante): Promise<Blob> {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    try {
      container.innerHTML = this.criarHTMLComprovante(dados);

      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        logging: false,
        width: 600,
        height: container.firstElementChild?.scrollHeight
      });

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao gerar imagem'));
          }
        }, 'image/png', 1.0);
      });
    } finally {
      document.body.removeChild(container);
    }
  }

  private static criarHTMLComprovante(dados: DadosComprovante): string {
    const statusConfig = this.getStatusConfig(dados.statusPagamento);
    const dataFormatada = new Date(dados.dataVenda).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div style="
        width: 600px;
        background: linear-gradient(135deg, ${this.COLORS.cardBg} 0%, ${this.COLORS.white} 100%);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
      ">
        <!-- Header Dourado -->
        <div style="
          background: linear-gradient(135deg, ${this.COLORS.primary} 0%, ${this.COLORS.secondary} 100%);
          padding: 40px 30px;
          position: relative;
          overflow: hidden;
        ">
          <!-- Pattern decorativo -->
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.1;
            background-image: radial-gradient(circle, ${this.COLORS.accent} 1px, transparent 1px);
            background-size: 20px 20px;
          "></div>

          <div style="position: relative; z-index: 1;">
            <div style="
              text-align: center;
              color: ${this.COLORS.white};
              margin-bottom: 15px;
            ">
              <div style="
                font-size: 42px;
                font-weight: 900;
                letter-spacing: 2px;
                text-transform: uppercase;
                margin-bottom: 8px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
              ">${dados.nomeConsultora}</div>
              <div style="
                font-size: 16px;
                font-weight: 600;
                letter-spacing: 4px;
                text-transform: uppercase;
                opacity: 0.95;
              ">Comprovante de Venda</div>
            </div>

            <!-- Badge de Status -->
            <div style="
              text-align: center;
              margin-top: 20px;
            ">
              <span style="
                display: inline-block;
                background: ${statusConfig.color};
                color: ${this.COLORS.white};
                padding: 10px 30px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              ">
                ${statusConfig.icon} ${statusConfig.label}
              </span>
            </div>
          </div>
        </div>

        <!-- Conteúdo -->
        <div style="padding: 30px;">
          <!-- Info Cliente e Data -->
          <div style="
            background: ${this.COLORS.white};
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 2px solid ${this.COLORS.lightGray};
          ">
            <div style="
              display: flex;
              align-items: center;
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 2px dashed ${this.COLORS.lightGray};
            ">
              <div style="
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, ${this.COLORS.primary}, ${this.COLORS.accent});
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                margin-right: 15px;
                flex-shrink: 0;
              ">👤</div>
              <div style="flex: 1;">
                <div style="
                  font-size: 12px;
                  color: ${this.COLORS.mediumGray};
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  font-weight: 600;
                  margin-bottom: 4px;
                ">Cliente</div>
                <div style="
                  font-size: 20px;
                  color: ${this.COLORS.dark};
                  font-weight: 700;
                ">${dados.nomeCliente}</div>
              </div>
            </div>

            <div style="
              display: flex;
              align-items: center;
            ">
              <div style="
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, ${this.COLORS.secondary}, ${this.COLORS.primary});
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                margin-right: 15px;
                flex-shrink: 0;
              ">📅</div>
              <div style="flex: 1;">
                <div style="
                  font-size: 12px;
                  color: ${this.COLORS.mediumGray};
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  font-weight: 600;
                  margin-bottom: 4px;
                ">Data da Venda</div>
                <div style="
                  font-size: 16px;
                  color: ${this.COLORS.dark};
                  font-weight: 600;
                ">${dataFormatada}</div>
              </div>
            </div>
          </div>

          <!-- Itens -->
          <div style="
            background: ${this.COLORS.white};
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 2px solid ${this.COLORS.lightGray};
          ">
            <div style="
              font-size: 16px;
              font-weight: 700;
              color: ${this.COLORS.dark};
              margin-bottom: 20px;
              text-transform: uppercase;
              letter-spacing: 1px;
              display: flex;
              align-items: center;
            ">
              <span style="
                width: 8px;
                height: 8px;
                background: ${this.COLORS.primary};
                border-radius: 50%;
                display: inline-block;
                margin-right: 12px;
              "></span>
              Itens da Venda
            </div>

            ${dados.itens.map((item, index) => `
              <div style="
                padding: 15px;
                margin-bottom: ${index < dados.itens.length - 1 ? '12px' : '0'};
                background: ${index % 2 === 0 ? this.COLORS.cardBg : this.COLORS.white};
                border-radius: 12px;
                border-left: 4px solid ${this.COLORS.accent};
              ">
                <div style="
                  display: flex;
                  justify-content: space-between;
                  align-items: start;
                  margin-bottom: 8px;
                ">
                  <div style="
                    font-size: 16px;
                    font-weight: 700;
                    color: ${this.COLORS.dark};
                    flex: 1;
                    line-height: 1.4;
                  ">${item.descricao}</div>
                  <div style="
                    font-size: 18px;
                    font-weight: 800;
                    color: ${this.COLORS.primary};
                    margin-left: 15px;
                    white-space: nowrap;
                  ">R$ ${item.valor_total.toFixed(2).replace('.', ',')}</div>
                </div>
                <div style="
                  display: flex;
                  gap: 15px;
                  font-size: 13px;
                  color: ${this.COLORS.mediumGray};
                ">
                  <span style="font-weight: 600;">Qtd: ${item.quantidade}</span>
                  <span>×</span>
                  <span>R$ ${item.valor_unitario.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            `).join('')}
          </div>

          ${dados.formaPagamento ? `
          <div style="
            background: ${this.COLORS.white};
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 2px solid ${this.COLORS.lightGray};
            display: flex;
            align-items: center;
          ">
            <div style="
              width: 45px;
              height: 45px;
              background: linear-gradient(135deg, ${this.COLORS.success}, #16A34A);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 22px;
              margin-right: 15px;
            ">💳</div>
            <div style="flex: 1;">
              <div style="
                font-size: 11px;
                color: ${this.COLORS.mediumGray};
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
                margin-bottom: 4px;
              ">Forma de Pagamento</div>
              <div style="
                font-size: 16px;
                color: ${this.COLORS.dark};
                font-weight: 700;
              ">${dados.formaPagamento}</div>
            </div>
          </div>
          ` : ''}

          ${dados.observacoes ? `
          <div style="
            background: ${this.COLORS.cardBg};
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid ${this.COLORS.warning};
          ">
            <div style="
              font-size: 12px;
              color: ${this.COLORS.mediumGray};
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 700;
              margin-bottom: 8px;
            ">📝 Observações</div>
            <div style="
              font-size: 14px;
              color: ${this.COLORS.darkGray};
              line-height: 1.6;
            ">${dados.observacoes}</div>
          </div>
          ` : ''}

          <!-- Total -->
          <div style="
            background: linear-gradient(135deg, ${this.COLORS.primary}, ${this.COLORS.secondary});
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 8px 24px rgba(212, 175, 55, 0.3);
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              opacity: 0.1;
              background-image: radial-gradient(circle, ${this.COLORS.white} 1px, transparent 1px);
              background-size: 15px 15px;
            "></div>

            <div style="position: relative; z-index: 1;">
              <div style="
                text-align: center;
                color: ${this.COLORS.white};
              ">
                <div style="
                  font-size: 14px;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 2px;
                  opacity: 0.9;
                  margin-bottom: 10px;
                ">Valor Total</div>
                <div style="
                  font-size: 52px;
                  font-weight: 900;
                  letter-spacing: -1px;
                  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
                ">R$ ${dados.valorTotal.toFixed(2).replace('.', ',')}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="
          background: ${this.COLORS.dark};
          padding: 25px 30px;
          text-align: center;
        ">
          <div style="
            color: ${this.COLORS.primary};
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 8px;
          ">✨ by Magold Ana Kelly ✨</div>
          <div style="
            color: ${this.COLORS.mediumGray};
            font-size: 12px;
          ">Comprovante gerado automaticamente</div>
        </div>
      </div>
    `;
  }

  private static getStatusConfig(status: string): { color: string; icon: string; label: string } {
    const configs: Record<string, { color: string; icon: string; label: string }> = {
      'pago': { color: this.COLORS.success, icon: '✓', label: 'Pago' },
      'pendente': { color: this.COLORS.pending, icon: '⏳', label: 'Pendente' },
      'parcial': { color: this.COLORS.warning, icon: '⚠', label: 'Parcial' },
      'atrasado': { color: '#EF4444', icon: '⚠', label: 'Atrasado' }
    };

    return configs[status] || configs['pendente'];
  }

  static async baixarComprovante(dados: DadosComprovante): Promise<void> {
    const blob = await this.gerarComprovanteImagem(dados);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante-${dados.nomeCliente.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async compartilharWhatsApp(dados: DadosComprovante): Promise<void> {
    try {
      const blob = await this.gerarComprovanteImagem(dados);

      if (navigator.share && navigator.canShare({ files: [new File([blob], 'comprovante.png', { type: 'image/png' })] })) {
        const file = new File([blob], 'comprovante.png', { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'Comprovante de Venda',
          text: `Comprovante de venda - ${dados.nomeCliente}`
        });
      } else {
        await this.baixarComprovante(dados);
        alert('Imagem baixada! Envie pelo WhatsApp manualmente.');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      await this.baixarComprovante(dados);
    }
  }
}
