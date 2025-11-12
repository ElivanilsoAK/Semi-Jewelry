import { useState, useEffect } from 'react';
import { supabase, Pano } from '../../lib/supabase';
import { X, Upload } from 'lucide-react';

interface PanoModalProps {
  pano: Pano | null;
  onClose: () => void;
}

export default function PanoModal({ pano, onClose }: PanoModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    data_retirada: '',
    data_devolucao: '',
    observacoes: '',
    status: 'ativo' as 'ativo' | 'devolvido',
    comissao_percentual: 0,
    fornecedor: 'Magold',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (pano) {
      setFormData({
        nome: pano.nome,
        data_retirada: pano.data_retirada,
        data_devolucao: pano.data_devolucao,
        observacoes: pano.observacoes || '',
        status: pano.status,
        comissao_percentual: pano.comissao_percentual || 0,
        fornecedor: pano.fornecedor || 'Magold',
      });
    }
  }, [pano]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `panos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('fotos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let fotoUrl = pano?.foto_url || null;

      if (photoFile) {
        const uploadedUrl = await uploadPhoto(photoFile);
        if (uploadedUrl) {
          fotoUrl = uploadedUrl;
        }
      }

      if (pano) {
        const { error } = await supabase
          .from('panos')
          .update({ ...formData, foto_url: fotoUrl })
          .eq('id', pano.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('panos')
          .insert([{ ...formData, foto_url: fotoUrl }]);

        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Erro ao salvar pano:', error);
      alert('Erro ao salvar pano');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {pano ? 'Editar Pano' : 'Novo Pano'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Pano *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
              placeholder="Ex: Pano Janeiro 2024"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Retirada *
              </label>
              <input
                type="date"
                value={formData.data_retirada}
                onChange={(e) => setFormData({ ...formData, data_retirada: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Devolução *
              </label>
              <input
                type="date"
                value={formData.data_devolucao}
                onChange={(e) => setFormData({ ...formData, data_devolucao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fornecedor
              </label>
              <input
                type="text"
                value={formData.fornecedor}
                onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="Ex: Magold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comissão (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.comissao_percentual}
                onChange={(e) => setFormData({ ...formData, comissao_percentual: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ativo' | 'devolvido' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="ativo">Ativo</option>
              <option value="devolvido">Devolvido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foto do Papel
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-emerald-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500">
                    <span>Upload da foto</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handlePhotoChange}
                    />
                  </label>
                  <p className="pl-1">ou arraste e solte</p>
                </div>
                <p className="text-xs text-gray-500">
                  {photoFile ? photoFile.name : 'PNG, JPG até 10MB'}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Tire uma foto do papel do pano para referência futura
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={3}
              placeholder="Observações adicionais sobre este pano..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={uploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
