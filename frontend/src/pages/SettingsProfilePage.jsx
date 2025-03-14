import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Edit2, ShieldCheck, Clock, Shield, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";

const SettingsProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    gender: "",
    phone: "",
    country: "",
    city: ""
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when user is available
  useEffect(() => {
    if (authUser) {
      setFormData({
        fullName: authUser.fullName || "",
        email: authUser.email || "",
        gender: authUser.gender || "",
        phone: authUser.phone || "",
        country: authUser.country || "",
        city: authUser.city || ""
      });
    }
  }, [authUser]);

  // Previous image upload and compression logic remains the same...
  const validateImage = (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'image/webp',
      'image/heic', 
      'image/heif'
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
  
  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
  
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
  
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
  
          // Define tamanho máximo mantendo proporção
          const MAX_WIDTH = 2560;
          const MAX_HEIGHT = 1440;
          let width = img.width;
          let height = img.height;
  
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
  
          canvas.width = width;
          canvas.height = height;
  
          // Desenha imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);
  
          // Converte para JPEG com qualidade 0.9 (90%)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(compressedDataUrl);
        };
  
        img.onerror = (error) => reject(error);
      };
  
      reader.onerror = (error) => reject(error);
    });
  };
  
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      validateImage(file);
  
      const loadingToast = toast.loading('Processando imagem...', {
        duration: Infinity // Permanece até ser explicitamente removido
      });
  
      try {
        // Comprime a imagem se necessário
        const processedImage = await compressImage(file);
        
        // Atualiza o preview
        setSelectedImg(processedImage);
        
        // Atualiza o toast para indicar o upload
        toast.loading('Enviando imagem...', {
          id: loadingToast
        });
        
        // Envia para o servidor
        await updateProfile({ profilePic: processedImage });
        
        toast.dismiss(loadingToast);
        toast.success('Foto atualizada com sucesso!');
      } catch (error) {
        console.error('Erro ao processar/enviar imagem:', error);
        toast.dismiss(loadingToast);
        toast.error('Erro ao atualizar foto. Tente novamente.');
        setSelectedImg(null);
      }
  
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      toast.error(error.message || "Erro ao processar a imagem");
      e.target.value = "";
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate full name
    if (!formData.fullName?.trim()) {
      newErrors.fullName = "Nome é obrigatório";
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = "Nome deve ter no mínimo 3 caracteres";
    }

    // Validate email
    if (!formData.email?.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    // Validate phone (optional, but if provided must be valid)
    if (formData.phone?.trim()) {
      const phoneRegex = /^(\+|00)?[1-9]\d{1,14}$/;
      const cleanedPhone = formData.phone.replace(/[\s-().]/g, '');
      if (!phoneRegex.test(cleanedPhone)) {
        newErrors.phone = "Número de telefone inválido";
      }
    }

    // Validate gender
    if (formData.gender && !["masculino", "feminino", "outro", "prefiro não dizer"].includes(formData.gender)) {
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
      // Prepare data for update (remove spaces and unchanged fields)
      const updatedFields = Object.entries(formData).reduce((acc, [key, value]) => {
        const trimmedValue = value?.trim?.() ?? value;
        if (trimmedValue !== authUser[key]) {
          acc[key] = trimmedValue;
        }
        return acc;
      }, {});

      // If no changes
      if (Object.keys(updatedFields).length === 0) {
        toast.info("Nenhuma alteração detectada");
        setIsModalOpen(false);
        return;
      }

      console.log('Enviando dados para atualização:', updatedFields);

      const result = await updateProfile(updatedFields);

      if (result?.errors) {
        setErrors(result.errors);
        Object.values(result.errors).forEach(error => 
          toast.error(error)
        );
        return;
      }

      toast.success("Perfil atualizado com sucesso!");
      setIsModalOpen(false);
      setErrors({});

    } catch (error) {
      console.error("Erro na atualização:", error);
      const errorMessage = error.response?.data?.message || "Erro ao atualizar perfil";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-200 rounded-xl p-6 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold">Perfil</h1>
            <p className="mt-2 text-base-content/70">Suas informações de perfil</p>
          </div>

          {/* Profile Image Section (remains the same) */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative w-32 h-32">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
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
                title="Formatos aceitos: JPEG, PNG, WebP, HEIC, HEIF. Tamanho máximo: 50MB"
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
            </div>
            <p className="text-xs text-base-content/70 text-center">
              Clique para alterar foto (Máx: 50MB)
            </p>
          </div>

          {/* Profile Information */}
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
                  <p className="text-base-content/70 capitalize">{authUser?.gender || "Não especificado"}</p>
                </div>
              </div>
            </div>

            {/* New Phone Section */}
            <div className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Telemóvel</p>
                  <p className="text-base-content/70">{authUser?.phone || "Não especificado"}</p>
                </div>
              </div>
            </div>

            {/* New Country Section */}
            <div className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">País</p>
                  <p className="text-base-content/70">{authUser?.country || "Não especificado"}</p>
                </div>
              </div>
            </div>

            {/* New City Section */}
            <div className="flex items-center justify-between p-4 bg-base-300 rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Cidade</p>
                  <p className="text-base-content/70">{authUser?.city || "Não especificado"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information Section (remains the same) */}
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
                  <span className="text-sm">Status da Conta</span>
                </div>
                <span className="text-sm font-medium text-green-500">Ativa</span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary gap-2"
            >
              <Edit2 className="size-5" />
              Editar Perfil
            </button>
          </div>

       {/* Edit Profile Modal */}
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
              gender: authUser.gender || "",
              phone: authUser.phone || "",
              country: authUser.country || "",
              city: authUser.city || ""
            });
          }}
          className="btn btn-ghost btn-sm btn-circle"
        >
          ✕
        </button>
      </div>

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
            }}
            className={`input input-bordered w-full ${errors.fullName ? 'input-error' : ''}`}
            placeholder="Seu nome completo"
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
            }}
            className={`select select-bordered w-full ${errors.gender ? 'select-error' : ''}`}
        >
            <option value="">Não especificado</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
        </select>
        {errors.gender && (
            <span className="text-error text-sm mt-1">{errors.gender}</span>
        )}
        </div>

        {/* New Phone Field */}
        <div>
          <label className="label">
            <span className="label-text">Telemóvel</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => {
              setFormData(prev => ({...prev, phone: e.target.value}));
              setErrors(prev => ({...prev, phone: ""}));
            }}
            className={`input input-bordered w-full ${errors.phone ? 'input-error' : ''}`}
            placeholder="Seu número de telefone"
          />
          {errors.phone && (
            <span className="text-error text-sm mt-1">{errors.phone}</span>
          )}
        </div>

        {/* New Country Field */}
        <div>
          <label className="label">
            <span className="label-text">País</span>
          </label>
          <input
            type="text"
            value={formData.country}
            onChange={(e) => {
              setFormData(prev => ({...prev, country: e.target.value}));
              setErrors(prev => ({...prev, country: ""}));
            }}
            className="input input-bordered w-full"
            placeholder="Seu país"
          />
        </div>

        {/* New City Field */}
        <div>
          <label className="label">
            <span className="label-text">Cidade</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => {
              setFormData(prev => ({...prev, city: e.target.value}));
              setErrors(prev => ({...prev, city: ""}));
            }}
            className="input input-bordered w-full"
            placeholder="Sua cidade"
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => {
              setIsModalOpen(false);
              setErrors({});
              setFormData({
                fullName: authUser.fullName || "",
                email: authUser.email || "",
                gender: authUser.gender || "",
                phone: authUser.phone || "",
                country: authUser.country || "",
                city: authUser.city || ""
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
           {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
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