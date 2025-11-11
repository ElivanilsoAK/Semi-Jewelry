import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  created_at: string;
}

export interface Pano {
  id: string;
  nome: string;
  data_retirada: string;
  data_devolucao: string;
  foto_url: string | null;
  observacoes: string | null;
  status: 'ativo' | 'devolvido';
  created_at: string;
}

export interface ItemPano {
  id: string;
  pano_id: string;
  categoria: 'argola' | 'infantil' | 'pulseira' | 'colar' | 'brinco' | 'anel' | 'tornozeleira' | 'pingente' | 'conjunto' | 'outro';
  descricao: string;
  quantidade_inicial: number;
  quantidade_disponivel: number;
  valor_unitario: number;
  created_at: string;
}

export interface Venda {
  id: string;
  cliente_id: string;
  data_venda: string;
  valor_total: number;
  status_pagamento: 'pendente' | 'parcial' | 'pago';
  observacoes: string | null;
  created_at: string;
}

export interface ItemVenda {
  id: string;
  venda_id: string;
  item_pano_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
}

export interface Pagamento {
  id: string;
  venda_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'pendente' | 'pago';
  created_at: string;
}
