import { useState, useEffect } from 'react';
import { X, Check, Trash2, Plus } from 'lucide-react';
import { ExtractedItem } from '../../services/ocrService';

interface OCRPreviewModalProps {
  items: ExtractedItem[];
  imageUrl: string;
  onConfirm: (items: ExtractedItem[]) => void;
  onCancel: () => void;
}

const CATEGORIAS = [
  'argola',
  'infantil',
  'pulseira',
  'colar',
  'brinco',
  'anel',
  'tornozeleira',
  'pingente',
  'conjunto',
  'outro',
] as const;

export default function OCRPreviewModal({ items: initialItems, imageUrl, onConfirm, onCancel }: OCRPreviewModalProps) {
  const [items, setItems] = useState<ExtractedItem[]>(initialItems);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newItem, setNewItem] = useState<ExtractedItem>({
    numero: '',
    categoria: 'outro',
    valor: 0,
  });

  const handleEdit = (index: number, field: keyof ExtractedItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleDelete = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (newItem.numero.trim()) {
      setItems([...items, newItem]);
      setNewItem({ numero: '', categoria: 'outro', valor: 0 });
      setShowAddForm(false);
    }
  };

  const handleConfirm = () => {
    const validItems = items.filter(item => item.numero.trim() !== '');
    onConfirm(validItems);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Revisar Itens Extraídos do OCR
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {items.length} itens detectados. Revise e edite conforme necessário.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <h3 className="font-semibold text-gray-800 mb-3">Imagem Original</h3>
            <img
              src={imageUrl}
              alt="Documento original"
              className="w-full rounded-lg border border-gray-300"
            />
          </div>

          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">Itens Detectados</h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Adicionar Item
              </button>
            </div>

            {showAddForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número
                    </label>
                    <input
                      type="text"
                      value={newItem.numero}
                      onChange={(e) => setNewItem({ ...newItem, numero: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Ex: 123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={newItem.categoria}
                      onChange={(e) => setNewItem({ ...newItem, categoria: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent capitalize"
                    >
                      {CATEGORIAS.map((cat) => (
                        <option key={cat} value={cat} className="capitalize">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor (opcional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.valor || 0}
                      onChange={(e) => setNewItem({ ...newItem, valor: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="R$ 0.00"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAdd}
                    className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum item detectado. Adicione itens manualmente.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={item.numero}
                        onChange={(e) => handleEdit(index, 'numero', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Nº"
                      />
                      <select
                        value={item.categoria}
                        onChange={(e) => handleEdit(index, 'categoria', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm capitalize"
                      >
                        {CATEGORIAS.map((cat) => (
                          <option key={cat} value={cat} className="capitalize">
                            {cat}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={item.valor || 0}
                        onChange={(e) => handleEdit(index, 'valor', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="R$"
                      />
                      <button
                        onClick={() => handleDelete(index)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              disabled={items.length === 0}
            >
              <Check className="w-5 h-5" />
              Confirmar {items.length} {items.length === 1 ? 'Item' : 'Itens'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
