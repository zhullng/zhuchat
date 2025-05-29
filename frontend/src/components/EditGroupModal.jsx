// components/EditGroupModal.jsx
import { useState, useRef, useEffect } from "react";
import { X, Upload, Trash2, Camera, Check } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import toast from "react-hot-toast";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const EditGroupModal = ({ isOpen, onClose }) => {
  const { selectedGroup, updateGroupInfo } = useGroupStore();
  const [name, setName] = useState(selectedGroup?.name || "");
  const [description, setDescription] = useState(selectedGroup?.description || "");
  const [profilePic, setProfilePic] = useState(selectedGroup?.profilePic || "");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Estado para cropping
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [srcImg, setSrcImg] = useState(null);
  const [crop, setCrop] = useState({ 
    unit: '%', 
    width: 80,
    height: 80,
    x: 10,
    y: 10,
    aspect: 1
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  
  // Estado para modal de remoção de foto
  const [isRemovePhotoModalOpen, setIsRemovePhotoModalOpen] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [photoWasRemoved, setPhotoWasRemoved] = useState(false);

  // Atualizar estados quando o grupo selecionado mudar
  useEffect(() => {
    if (selectedGroup) {
      setName(selectedGroup.name || "");
      setDescription(selectedGroup.description || "");
      setProfilePic(selectedGroup.profilePic || "");
      setPhotoWasRemoved(false); // Reset o estado de remoção quando o grupo muda
    }
  }, [selectedGroup]);

  // Efeito para dePalavra-passer a pré-visualização do corte
  useEffect(() => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');
    const pixelRatio = window.devicePixelRatio;

    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
  }, [completedCrop]);

  const validateImage = (file) => {
    // Limite de 10MB para imagens de grupo
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    // Formatos permitidos
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'image/webp'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato inválido. Use JPEG, PNG ou WebP');
    }
    
    if (file.size > maxSize) {
      const sizeMB = maxSize / (1024 * 1024);
      throw new Error(`Imagem muito grande. Máximo de ${sizeMB}MB`);
    }
    
    return true;
  };
  
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      validateImage(file);
  
      // Criar URL para a imagem selecionada
      const reader = new FileReader();
      reader.onload = () => {
        setSrcImg(reader.result);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      toast.error(error.message || "Erro ao processar a imagem");
      e.target.value = "";
    }
  };

  const getCroppedImage = (canvas) => {
    return new Promise((resolve) => {
      canvas.toBlob((file) => {
        // Converte para base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          resolve(reader.result);
        };
      }, 'image/jpeg', 0.9);
    });
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) {
      return;
    }

    try {
      const croppedImage = await getCroppedImage(previewCanvasRef.current);
      
      // Fechar modal de corte
      setIsCropModalOpen(false);
      
      // Atualizar o preview
      setProfilePic(croppedImage);
      setPhotoWasRemoved(false); // Resetar flag ao adicionar nova foto
      
      toast.success('Imagem recortada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast.error('Erro ao processar imagem. Tente novamente.');
    }
  };

  const cancelCrop = () => {
    setIsCropModalOpen(false);
    setSrcImg(null);
    setCrop({ 
      unit: '%', 
      width: 80,
      height: 80,
      x: 10,
      y: 10,
      aspect: 1
    });
    setCompletedCrop(null);
  };

  const handleRemovePhoto = () => {
    setIsRemovingPhoto(true);
    
    // Remover a imagem do estado
    setProfilePic("");
    // Marcar que a foto foi removida explicitamente
    setPhotoWasRemoved(true);
    
    setIsRemovePhotoModalOpen(false);
    setIsRemovingPhoto(false);
    
    toast.success("Foto do grupo removida");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("O nome do grupo é obrigatório");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const updateData = {
        name: name.trim(),
        description: description.trim(),
        // Sempre incluir profilePic no objeto para garantir que o backend receba o valor
        // mesmo que seja uma string vazia
        profilePic: photoWasRemoved ? "" : profilePic
      };
      
      // Log para depuração
      console.log("Enviando dados para atualização:", {
        ...updateData,
        photoWasRemoved,
        profilePicLength: updateData.profilePic.length
      });
      
      await updateGroupInfo(selectedGroup._id, updateData);
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
      setIsLoading(false);
    }
  };

  // Verificar se há foto de perfil
  const hasProfilePic = Boolean(profilePic);

  if (!isOpen || !selectedGroup) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-lg font-medium">Editar Grupo</h2>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {/* Imagem de perfil */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-base-200 mb-3">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Foto de perfil do grupo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={36} className="opacity-40" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
                <div className="opacity-0 hover:opacity-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-primary text-primary-content p-1.5 rounded-full"
                    title="Alterar foto"
                  >
                    <Upload size={16} />
                  </button>
                  
                  {hasProfilePic && (
                    <button
                      type="button"
                      onClick={() => setIsRemovePhotoModalOpen(true)}
                      className="bg-error text-error-content p-1.5 rounded-full"
                      title="Remover foto"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
            />
            
            <p className="text-xs text-base-content/70">
              Clique para alterar foto do grupo
            </p>
          </div>
          
          {/* Campo de nome */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nome do grupo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Digite o nome do grupo"
              required
            />
          </div>
          
          {/* Campo de descrição */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full h-20"
              placeholder="Digite uma descrição para o grupo"
            />
          </div>
          
          {/* Estado de depuração (remover em produção) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-base-200 rounded text-xs">
              <p>Debug: {photoWasRemoved ? 'Foto marcada para remoção' : 'Foto não marcada para remoção'}</p>
            </div>
          )}
          
          {/* Botões de ação */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "A guardar..." : "Guardar Alterações"}
            </button>
          </div>
        </form>
      </div>
      
      {/* Modal de Remoção de Foto */}
      {isRemovePhotoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center mb-4">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-error/10 rounded-full">
                  <Trash2 className="size-8 text-error" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Remover Foto do Grupo</h3>
              <p className="text-sm text-base-content/70">
                Tem a certeza que deseja remover a foto deste grupo? O grupo ficará com a imagem padrão.
              </p>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsRemovePhotoModalOpen(false)}
                className="btn btn-ghost"
                disabled={isRemovingPhoto}
              >
                Cancelar
              </button>
              <button
                onClick={handleRemovePhoto}
                className="btn btn-error"
                disabled={isRemovingPhoto}
              >
                {isRemovingPhoto ? "Removendo..." : "Remover Foto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Corte de Imagem */}
      {isCropModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recortar Imagem</h3>
              <button
                onClick={cancelCrop}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="overflow-auto max-h-[60vh]">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentageCrop) => setCrop(percentageCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  circularCrop
                  keepSelection
                  aspect={1}
                  minWidth={100}
                  minHeight={100}
                >
                  <img 
                    src={srcImg} 
                    ref={imgRef} 
                    style={{ maxWidth: '100%' }} 
                    alt="Imagem para recortar"
                    onLoad={(e) => {
                      imgRef.current = e.currentTarget;
                    }}
                  />
                </ReactCrop>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                <p className="text-sm mb-3 text-base-content/70">Pré-visualização</p>
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-base-300 bg-base-200">
                  {completedCrop && (
                    <canvas
                      ref={previewCanvasRef}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={cancelCrop}
                className="btn btn-ghost gap-2"
              >
                <X className="size-4" />
                Cancelar
              </button>
              <button
                onClick={handleCropComplete}
                className="btn btn-primary gap-2"
                disabled={!completedCrop?.width || !completedCrop?.height}
              >
                <Check className="size-4" />
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditGroupModal;