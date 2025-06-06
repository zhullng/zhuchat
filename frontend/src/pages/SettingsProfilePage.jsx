import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { 
  Camera, 
  Mail, 
  User, 
  Edit2, 
  ShieldCheck, 
  Clock, 
  Shield,
  ArrowLeft,
  Check,
  X,
  Trash,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const SettingsProfilePage = () => {
  const navigate = useNavigate();
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isRemovePhotoModalOpen, setIsRemovePhotoModalOpen] = useState(false);
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
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    gender: ""
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [showNoChangesAlert, setShowNoChangesAlert] = useState(false);

  // Inicializar os dados do formulário quando o utilizador estiver disponível
  useEffect(() => {
    if (authUser) {
      setFormData({
        fullName: authUser.fullName || "",
        email: authUser.email || "",
        gender: authUser.gender || ""
      });
    }
  }, [authUser]);

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

  // Efeito para esconder o alerta após 3 segundos
  useEffect(() => {
    if (showNoChangesAlert) {
      const timer = setTimeout(() => {
        setShowNoChangesAlert(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showNoChangesAlert]);

  const validateImage = (file) => {
    // Aumentando para 50MB para permitir imagens de alta qualidade
    const maxSize = 50 * 1024 * 1024; // 50MB em bytes
    
    // Formatos permitidos - incluindo formatos de alta qualidade
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'image/webp',
      'image/heic', // Formato HEIC da Apple
      'image/heif'  // Formato HEIF de alta eficiência
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato inválido. Use JPEG, PNG, WebP, HEIC ou HEIF');
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

    const loadingToast = toast.loading('A processar imagem...', {
      duration: Infinity
    });

    try {
      const croppedImage = await getCroppedImage(previewCanvasRef.current);
      
      // Fechar modal de corte
      setIsCropModalOpen(false);
      
      // Atualizar o preview
      setSelectedImg(croppedImage);
      
      // Atualiza o toast para indicar o upload
      toast.loading('A enviar imagem...', {
        id: loadingToast
      });
      
      // Envia para o servidor
      await updateProfile({ profilePic: croppedImage });
      
      toast.dismiss(loadingToast);
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar/enviar imagem:', error);
      toast.dismiss(loadingToast);
      toast.error('Erro ao atualizar foto. Tente novamente.');
      setSelectedImg(null);
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

  const handleRemovePhoto = async () => {
    setIsRemovingPhoto(true);

    try {
      // Enviar atualização com profilePic vazio para remover
      await updateProfile({ profilePic: "" });
      setSelectedImg(null);
      setIsRemovePhotoModalOpen(false);
      toast.success('Foto de perfil removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover foto de perfil:', error);
      toast.error('Erro ao remover foto de perfil. Tente novamente.');
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validação do nome
    if (!formData.fullName?.trim()) {
      newErrors.fullName = "Nome é obrigatório";
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = "Nome deve ter no mínimo 3 caracteres";
    }

    // Validação do email
    if (!formData.email?.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    // Validação do género
    if (formData.gender && !["male", "female"].includes(formData.gender)) {
      newErrors.gender = "Género inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar dados para atualização (remover espaços e campos não alterados)
      const updatedFields = Object.entries(formData).reduce((acc, [key, value]) => {
        const trimmedValue = value?.trim?.() ?? value;
        if (trimmedValue !== authUser[key]) {
          acc[key] = trimmedValue;
        }
        return acc;
      }, {});

      // Se não houver alterações
      if (Object.keys(updatedFields).length === 0) {
        setShowNoChangesAlert(true);
        setIsSubmitting(false);
        return;
      }

      console.log('A enviar dados para atualização:', updatedFields);

      const result = await updateProfile(updatedFields);

      if (result?.errors) {
        setErrors(result.errors);
        Object.values(result.errors).forEach(error => 
          toast.error(error)
        );
        return;
      }

      setIsModalOpen(false);
      setErrors({});
      toast.success('Perfil atualizado com sucesso!');

    } catch (error) {
      console.error("Erro na atualização:", error);
      const errorMessage = error.response?.data?.message || "Erro ao atualizar perfil";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGenderDisplay = (gender) => {
    if (!gender) return "Não especificado";
    return gender === "male" ? "Masculino" : "Feminino";
  };

  // Verificar se o utilizador tem foto de perfil
  const hasProfilePic = Boolean(selectedImg || authUser?.profilePic);

  // Verificar se houve alterações no formulário
  const hasFormChanges = () => {
    return (
      formData.fullName.trim() !== (authUser?.fullName || "") ||
      formData.email.trim() !== (authUser?.email || "") ||
      formData.gender !== (authUser?.gender || "")
    );
  };

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-base-content/70 hover:text-base-content mb-4"
        >
          <ArrowLeft className="size-5" />
          <span>Voltar</span>
        </button>
        <div className="bg-base-200 rounded-xl p-6 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold">Perfil</h1>
            <p className="mt-2 text-base-content/70">As suas informações de perfil</p>
          </div>

          {/* Seção da imagem de perfil */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative w-32 h-32">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Perfil"
                className="w-full h-full rounded-full object-cover border-4 border-base-300"
              />
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute -bottom-2 -right-2 
                  bg-primary hover:bg-primary-focus
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200 shadow-lg
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
                title="Formatos aceites: JPEG, PNG, WebP, HEIC, HEIF. Tamanho máximo: 50MB"
              >
                <Camera className="size-5 text-base-100" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
              
              {/* Botão para remover foto se existir uma */}
              {hasProfilePic && (
                <button
                  onClick={() => setIsRemovePhotoModalOpen(true)}
                  className="absolute -bottom-2 -left-2 bg-error hover:bg-error-focus p-2 rounded-full cursor-pointer transition-all duration-200 shadow-lg"
                  title="Remover foto de perfil"
                  disabled={isUpdatingProfile}
                >
                  <Trash className="size-5 text-base-100" />
                </button>
              )}
            </div>
            {/* Texto movido para fora do container relativo */}
            <p className="text-xs text-base-content/70 text-center">
              Clique para alterar foto
            </p>
          </div>

          {/* Informações do Perfil */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Nome</p>
                  <p className="text-base-content/70">{authUser?.fullName}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-base-content/70">{authUser?.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Género</p>
                  <p className="text-base-content/70 capitalize">{getGenderDisplay(authUser?.gender)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de informações da conta */}
          <div className="bg-base-300 rounded-lg p-4 mb-8">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              Informações da Conta
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-base-content/10">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary/70" />
                  <span className="text-sm">Membro desde</span>
                </div>
                <span className="text-sm font-medium">
                  {new Date(authUser?.createdAt).toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary/70" />
                  <span className="text-sm">Estado da Conta</span>
                </div>
                <span className="text-sm font-medium text-green-500">Ativa</span>
              </div>
            </div>
          </div>

          {/* Botão de Editar */}
          <div className="flex justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary gap-2"
            >
              <Edit2 className="size-5" />
              Editar Perfil
            </button>
          </div>

          {/* Modal de Remoção de Foto */}
          {isRemovePhotoModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-base-100 rounded-lg p-6 max-w-sm w-full mx-4">
                <div className="text-center mb-4">
                  <div className="flex justify-center mb-3">
                    <div className="p-3 bg-error/10 rounded-full">
                      <Trash className="size-8 text-error" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Remover Foto de Perfil</h3>
                  <p className="text-sm text-base-content/70">
                    Tem a certeza que deseja remover a sua foto de perfil? Será substituída pela imagem predefinida.
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
                    {isRemovingPhoto ? (
                      <>Removendo...</>
                    ) : (
                      <>Remover Foto</>
                    )}
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
                    ✕
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

          {/* Modal de Edição */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Editar Perfil</h3>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setErrors({});
                      setFormData({
                        fullName: authUser.fullName || "",
                        email: authUser.email || "",
                        gender: authUser.gender || ""
                      });
                    }}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Alerta de nenhuma alteração dentro do modal */}
                {showNoChangesAlert && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4 flex items-start">
                    <AlertCircle className="size-5 text-warning mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-warning-content">Nenhuma alteração detetada</p>
                      <p className="text-sm text-base-content/70">Modifique algum dos campos para guardar alterações.</p>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Nome Completo</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, fullName: e.target.value}));
                        setErrors(prev => ({...prev, fullName: ""}));
                        setShowNoChangesAlert(false);
                      }}
                      className={`input input-bordered w-full ${errors.fullName ? 'input-error' : ''}`}
                      placeholder="O seu nome completo"
                    />
                    {errors.fullName && (
                      <span className="text-error text-sm mt-1">{errors.fullName}</span>
                    )}
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, email: e.target.value}));
                        setErrors(prev => ({...prev, email: ""}));
                        setShowNoChangesAlert(false);
                      }}
                      className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                      placeholder="seu.email@exemplo.com"
                    />
                    {errors.email && (
                      <span className="text-error text-sm mt-1">{errors.email}</span>
                    )}
                  </div>

                  <div>
                    <label className="label">
                      <span className="label-text">Género</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => {
                        setFormData(prev => ({...prev, gender: e.target.value}));
                        setErrors(prev => ({...prev, gender: ""}));
                        setShowNoChangesAlert(false);
                      }}
                      className={`select select-bordered w-full ${errors.gender ? 'select-error' : ''}`}
                    >
                      <option value="">Não especificado</option>
                      <option value="male">Masculino</option>
                      <option value="female">Feminino</option>
                    </select>
                    {errors.gender && (
                      <span className="text-error text-sm mt-1">{errors.gender}</span>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setErrors({});
                        setShowNoChangesAlert(false);
                        setFormData({
                          fullName: authUser.fullName || "",
                          email: authUser.email || "",
                          gender: authUser.gender || ""
                        });
                      }}
                      className="btn btn-ghost"
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'A guardar...' : 'Guardar Alterações'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsProfilePage;