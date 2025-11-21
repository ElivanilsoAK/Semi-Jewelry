import { useState, useEffect } from 'react';
import { supabase, Pano, withUserId } from '../../lib/supabase';
import { X, Upload, Loader2 } from 'lucide-react';
import { processInventoryImage, ExtractedItem } from '../../services/ocrService';
import OCRPreviewModal from './OCRPreviewModal';

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
    percentual_comissao: 10,
    fornecedor: 'Magold',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [ocrItems, setOcrItems] = useState<ExtractedItem[]>([]);
  const [showOCRPreview, setShowOCRPreview] = useState(false);
  const [savedPanoId, setSavedPanoId] = useState<string | null>(null);

  useEffect(() => {
    if (pano) {
      setFormData({
        nome: pano.nome,
        data_retirada: pano.data_retirada,
        data_devolucao: pano.data_devolucao || '',
        observacoes: pano.observacoes || '',
        status: pano.status,
        percentual_comissao: pano.percentual_comissao || 10,
        fornecedor: pano.fornecedor || 'Magold',
      });
      if (pano.foto_url) {
        setPhotoPreview(pano.foto_url);
      }
    }
  }, [pano]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
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
      let newPanoId = pano?.id;

      // Upload da foto se houver
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(photoFile);
        if (uploadedUrl) {
          fotoUrl = uploadedUrl;
        }
      }

      // Preparar dados do pano
      const panoData: any = {
        nome: formData.nome,
        data_retirada: formData.data_retirada,
        data_devolucao: formData.data_devolucao || null,
        observacoes: formData.observacoes || null,
        status: formData.status,
        percentual_comissao: formData.percentual_comissao || 10,
        fornecedor: formData.fornecedor || 'Magold',
        foto_url: fotoUrl,
      };

      if (pano) {
        // Atualizar pano existente
        const { error } = await supabase
          .from('panos')
          .update(panoData)
          .eq('id', pano.id);

        if (error) throw error;
        newPanoId = pano.id;

        alert('Pano atualizado com sucesso!');
      } else {
        // Criar novo pano
        const dataWithUserId = await withUserId(panoData);
        const { data: insertedData, error } = await supabase
          .from('panos')
          .insert([dataWithUserId])
          .select()
          .single();

        if (error) throw error;
        newPanoId = insertedData.id;
      }

      // Processar OCR se houver foto nova
      if (photoFile && newPanoId && !pano) {
        setSavedPanoId(newPanoId);
        setProcessingOCR(true);

        try {
          console.log('🔍 Iniciando análise de OCR...');
          const ocrResult = await processInventoryImage(photoFile);
          setProcessingOCR(false);

          if (ocrResult.success && ocrResult.items.length > 0) {
            console.log('✅ OCR bem-sucedido! Mostrando preview...');
            setOcrItems(ocrResult.items);
            setShowOCRPreview(true);
            return; // Não fechar, vai para preview do OCR
          } else {
            console.warn('⚠️ OCR não retornou itens:', ocrResult.error);
            alert('⚠️ OCR - Nenhum item detectado\n\n' + (ocrResult.error || 'Não foi possível extrair itens da imagem. Verifique se a foto está nítida e contém uma tabela visível.'));
          }
        } catch (ocrError) {
          console.error('❌ Erro no OCR:', ocrError);
          setProcessingOCR(false);
          alert('❌ Erro ao processar OCR\n\n' + (ocrError instanceof Error ? ocrError.message : 'Erro desconhecido'));
        }
      }

      onClose();
    } catch (error) {
      console.error('Erro ao salvar pano:', error);
      alert('Erro ao salvar pano: ' + (error as Error).message);
      setProcessingOCR(false);
    } finally {
      setUploading(false);
    }
  };

  const handleOCRConfirm = async (confirmedItems: any[]) => {
    try {
      if (!savedPanoId) {
        throw new Error('Pano ID não encontrado');
      }

      const itemsToInsert = await Promise.all(
        confirmedItems.map(async (item) => {
          return await withUserId({
            pano_id: savedPanoId,
            categoria: item.categoria,
            descricao: item.descricao,
            quantidade_inicial: item.quantidade,
            quantidade_disponivel: item.quantidade,
            valor_unitario: item.valor,
          });
        })
      );

      const { error } = await supabase
        .from('itens_pano')
        .insert(itemsToInsert);

      if (error) {
        console.error('Erro ao inserir itens:', error);
        throw error;
      }

      alert(`${confirmedItems.length} itens adicionados ao pano com sucesso!`);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar itens:', error);
      alert('Erro ao salvar itens: ' + (error as Error).message);
    }
  };

  const handleOCRCancel = () => {
    setShowOCRPreview(false);
    onClose();
  };

  if (showOCRPreview && photoPreview) {
    return (
      <OCRPreviewModal
        items={ocrItems}
        imageUrl={photoPreview}
        onConfirm={handleOCRConfirm}
        onCancel={handleOCRCancel}
      />
    );
  }

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
            disabled={uploading || processingOCR}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {processingOCR && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 border-2 border-blue-300 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  🤖 Analisando com Inteligência Artificial
                </p>
                <p className="text-xs text-blue-700 mt-1.5 leading-relaxed">
                  O Google Gemini 2.0 Flash Experimental está lendo a tabela coluna por coluna, respeitando as linhas verticais. Aguarde...
                </p>
                <div className="mt-2 flex gap-1">
                  <div className="h-1 w-8 bg-blue-400 rounded animate-pulse"></div>
                  <div className="h-1 w-8 bg-blue-400 rounded animate-pulse delay-75"></div>
                  <div className="h-1 w-8 bg-blue-400 rounded animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          </div>
        )}

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
              disabled={uploading || processingOCR}
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
                disabled={uploading || processingOCR}
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
                disabled={uploading || processingOCR}
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
                disabled={uploading || processingOCR}
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
                value={formData.percentual_comissao}
                onChange={(e) => setFormData({ ...formData, percentual_comissao: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="0"
                disabled={uploading || processingOCR}
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
              disabled={uploading || processingOCR}
            >
              <option value="ativo">Ativo</option>
              <option value="devolvido">Devolvido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foto do Documento
            </label>
            {photoPreview ? (
              <div className="mb-2">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full rounded-lg border border-gray-300 max-h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                  disabled={uploading || processingOCR}
                >
                  Remover foto
                </button>
              </div>
            ) : (
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
                        disabled={uploading || processingOCR}
                      />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG até 10MB
                  </p>
                </div>
              </div>
            )}
            <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg">
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                🤖 Detecção Inteligente com IA
              </p>
              <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                Quando você enviar a foto, o <strong>Google Gemini 2.0 Flash Experimental</strong> irá ler automaticamente a tabela coluna por coluna, respeitando as linhas verticais e evitando misturar valores de colunas diferentes
              </p>
            </div>
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
              disabled={uploading || processingOCR}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading || processingOCR}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={uploading || processingOCR}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
