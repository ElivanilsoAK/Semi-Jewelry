import { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Save, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ItemRow {
  id: string;
  descricao: string;
  categoria: string;
  valor_unitario: string;
  quantidade: string;
}

interface CadastroRapidoItensModalProps {
  panoId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function CadastroRapidoItensModal({ panoId, onClose, onSave }: CadastroRapidoItensModalProps) {
  const [items, setItems] = useState<ItemRow[]>([
    { id: '1', descricao: '', categoria: 'Pulseira', valor_unitario: '', quantidade: '1' }
  ]);
  const [saving, setSaving] = useState(false);
  const [categorias, setCategorias] = useState<string[]>([
    'Pulseira', 'Corrente', 'Pingente', 'Anel', 'Brinco', 'Argola', 'Outro'
  ]);

  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    carregarCategorias();
  }, []);

  async function carregarCategorias() {
    const { data } = await supabase
      .from('categorias')
      .select('nome')
      .eq('ativo', true)
      .order('ordem');

    if (data && data.length > 0) {
      setCategorias([...data.map(c => c.nome), 'Outro']);
    }
  }

  function addRow() {
    const newId = (parseInt(items[items.length - 1]?.id || '0') + 1).toString();
    setItems([...items, {
      id: newId,
      descricao: '',
      categoria: items[items.length - 1]?.categoria || 'Pulseira',
      valor_unitario: '',
      quantidade: '1'
    }]);

    setTimeout(() => {
      const nextInput = inputRefs.current[`descricao-${newId}`];
      nextInput?.focus();
    }, 50);
  }

  function removeRow(id: string) {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  }

  function updateItem(id: string, field: keyof ItemRow, value: string) {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  }

  function handleKeyDown(e: React.KeyboardEvent, rowId: string, field: keyof ItemRow) {
    if (e.key === 'Enter') {
      e.preventDefault();

      const currentIndex = items.findIndex(item => item.id === rowId);
      const fields: (keyof ItemRow)[] = ['descricao', 'categoria', 'valor_unitario', 'quantidade'];
      const currentFieldIndex = fields.indexOf(field);

      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        const nextInput = inputRefs.current[`${nextField}-${rowId}`];
        nextInput?.focus();
      } else {
        if (currentIndex === items.length - 1) {
          addRow();
        } else {
          const nextRowId = items[currentIndex + 1].id;
          const nextInput = inputRefs.current[`descricao-${nextRowId}`];
          nextInput?.focus();
        }
      }
    } else if (e.key === 'Tab' && !e.shiftKey && field === 'quantidade') {
      e.preventDefault();
      const currentIndex = items.findIndex(item => item.id === rowId);
      if (currentIndex === items.length - 1) {
        addRow();
      }
    }
  }

  async function salvarItens() {
    const itensValidos = items.filter(item =>
      item.descricao.trim() &&
      parseFloat(item.valor_unitario) > 0 &&
      parseInt(item.quantidade) > 0
    );

    if (itensValidos.length === 0) {
      alert('Adicione pelo menos um item válido');
      return;
    }

    setSaving(true);

    const itensParaInserir = itensValidos.map(item => ({
      pano_id: panoId,
      descricao: item.descricao.trim(),
      categoria: item.categoria,
      valor_unitario: parseFloat(item.valor_unitario),
      quantidade_total: parseInt(item.quantidade),
      quantidade_disponivel: parseInt(item.quantidade),
    }));

    const { error } = await supabase
      .from('itens_pano')
      .insert(itensParaInserir);

    setSaving(false);

    if (!error) {
      onSave();
      onClose();
    } else {
      alert('Erro ao salvar itens');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Cadastro Rápido de Itens</h3>
              <p className="text-sm text-gray-600">Use Enter ou Tab para navegar entre os campos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="min-w-max">
            <div className="grid grid-cols-[1fr_150px_120px_100px_60px] gap-2 mb-2 pb-2 border-b-2 border-gray-300 font-semibold text-sm text-gray-700">
              <div>Descrição</div>
              <div>Categoria</div>
              <div>Valor Unit. (R$)</div>
              <div>Quantidade</div>
              <div></div>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_150px_120px_100px_60px] gap-2 items-center hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <input
                    ref={(el) => (inputRefs.current[`descricao-${item.id}`] = el)}
                    type="text"
                    value={item.descricao}
                    onChange={(e) => updateItem(item.id, 'descricao', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, item.id, 'descricao')}
                    placeholder="Ex: Pulseira - 316"
                    className="input-field text-sm"
                    autoFocus={index === 0}
                  />

                  <select
                    ref={(el) => (inputRefs.current[`categoria-${item.id}`] = el as any)}
                    value={item.categoria}
                    onChange={(e) => updateItem(item.id, 'categoria', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, item.id, 'categoria')}
                    className="input-field text-sm"
                  >
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <input
                    ref={(el) => (inputRefs.current[`valor_unitario-${item.id}`] = el)}
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.valor_unitario}
                    onChange={(e) => updateItem(item.id, 'valor_unitario', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, item.id, 'valor_unitario')}
                    placeholder="0.00"
                    className="input-field text-sm"
                  />

                  <input
                    ref={(el) => (inputRefs.current[`quantidade-${item.id}`] = el)}
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(e) => updateItem(item.id, 'quantidade', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, item.id, 'quantidade')}
                    className="input-field text-sm"
                  />

                  <button
                    onClick={() => removeRow(item.id)}
                    disabled={items.length === 1}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addRow}
              className="mt-4 btn-secondary w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Linha (Enter)
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={salvarItens}
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
                Salvar {items.filter(i => i.descricao.trim()).length} Itens
              </>
            )}
          </button>
        </div>

        <div className="px-6 pb-4">
          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
            <strong>💡 Dicas:</strong> Use <kbd className="px-2 py-1 bg-blue-200 rounded">Enter</kbd> para avançar campos
            ou <kbd className="px-2 py-1 bg-blue-200 rounded">Tab</kbd> para adicionar nova linha automaticamente
          </div>
        </div>
      </div>
    </div>
  );
}
