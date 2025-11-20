import { useState, useEffect } from 'react';
import { supabase, Venda } from '../../lib/supabase';
import { X, Save } from 'lucide-react';

interface EditarVendaModalProps {
  venda: Venda;
  onClose: () => void;
  onSave: () => void;
}

export default function EditarVendaModal({ venda, onClose, onSave }: EditarVendaModalProps) {
  const [formData, setFormData] = useState({
    cliente_nome: '',
    data_venda: '',
    observacoes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      cliente_nome: venda.cliente_nome,
      data_venda: venda.data_venda,
      observacoes: venda.observacoes || '',
    });
  }, [venda]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('vendas')
      .update({
        cliente_nome: formData.cliente_nome,
        data_venda: formData.data_venda,
        observacoes: formData.observacoes,
      })
      .eq('id', venda.id);

    setSaving(false);

    if (!error) {
      onSave();
      onClose();
    } else {
      alert('Erro ao salvar alterações');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Editar Venda</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={formData.cliente_nome}
              onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data da Venda
            </label>
            <input
              type="date"
              value={formData.data_venda}
              onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
              className="input-field"
              placeholder="Observações sobre a venda..."
            />
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Atenção:</strong> A edição não altera os itens vendidos nem os valores.
              Para modificar itens ou pagamentos, entre em contato com o suporte.
            </p>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
