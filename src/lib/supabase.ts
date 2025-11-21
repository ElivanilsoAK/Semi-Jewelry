import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

export const withUserId = async <T extends Record<string, any>>(data: T): Promise<T & { user_id: string }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return { ...data, user_id: userId };
};

export interface Cliente {
  id: string;
  user_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cpf_cnpj: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  foto_url: string | null;
  created_at: string;
}

export interface Pano {
  id: string;
  user_id: string;
  nome: string;
  data_retirada: string;
  data_devolucao: string;
  foto_url: string | null;
  observacoes: string | null;
  status: 'ativo' | 'devolvido';
  fornecedor: string;
  comissao_percentual: number;
  percentual_comissao: number;
  cliente_responsavel: string | null;
  data_prevista_retorno: string | null;
  ocr_processed: boolean;
  ocr_data: any | null;
  created_at: string;
}

export interface ItemPano {
  id: string;
  user_id: string;
  pano_id: string;
  categoria: string;
  categoria_custom?: string | null;
  descricao: string;
  quantidade_inicial: number;
  quantidade_disponivel: number;
  valor_unitario: number;
  foto_url?: string | null;
  foto_urls?: any;
  created_at: string;
}

export interface Venda {
  id: string;
  user_id: string;
  cliente_id: string;
  cliente_nome: string;
  data_venda: string;
  valor_total: number;
  status_pagamento: 'pendente' | 'parcial' | 'pago' | 'atrasado';
  forma_pagamento: string;
  desconto: number;
  motivo_cancelamento: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface ItemVenda {
  id: string;
  user_id: string;
  venda_id: string;
  item_pano_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
}

export interface Pagamento {
  id: string;
  user_id: string;
  venda_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'pago';
  created_at: string;
}
