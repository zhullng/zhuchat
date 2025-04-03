import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2, Lock, Mail, User, Camera, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    gender: "",
    profilePic: null // Adicionando campo para a foto de perfil
  });

  // Estados para o gerenciamento da imagem de perfil
  const [selectedImg, setSelectedImg] = useState(null);
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

  const { signup, isSigningUp } = useAuthStore();

  // Efeito para desenhar a pré-visualização do corte
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

  const validatePassword = (password) => {
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
    return complexityRegex.test(password);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error("Nome completo é obrigatório");
    if (!formData.gender) return toast.error("Género é obrigatório");
    if (!formData.email.trim()) return toast.error("Email é obrigatório");
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error("Formato de email inválido");
    
    // Updated password validation
    if (!formData.password) return toast.error("Palavra-passe é obrigatória");
    if (formData.password.length < 6) return toast.error("Palavra-passe deve ter pelo menos 6 caracteres");
    if (!validatePassword(formData.password)) return toast.error("Palavra-passe deve conter letras maiúsculas, minúsculas e números");

    return true;
  };

  const validateImage = (file) => {
    // Permitir imagens até 50MB
    const maxSize = 50 * 1024 * 1024; // 50MB em bytes
    
    // Formatos permitidos
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
      setSelectedImg(croppedImage);
      
      // Atualizar formData com a imagem
      setFormData(prev => ({
        ...prev,
        profilePic: croppedImage
      }));
      
      toast.success('Foto adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast.error('Erro ao processar a foto. Tente novamente.');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = validateForm();
    if (success === true) {
      // Envia os dados do formulário incluindo a foto de perfil (se existir)
      signup(formData);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center animate-bounce">
                <img src="/logoZhuChat.png" alt="Logo" className="w-12 h-12 rounded-full" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Criar Conta</h1>
              <p className="text-base-content/60">Comece com a sua conta gratuita</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Área para upload de foto de perfil */}
            <div className="flex flex-col items-center gap-2 mb-2">
              <div className="relative w-24 h-24">
                <img
                  src={selectedImg || "/avatar.png"}
                  alt="Foto de Perfil"
                  className="w-full h-full rounded-full object-cover border-4 border-base-300"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-2 -right-2 
                    bg-primary hover:bg-primary-focus
                    p-2 rounded-full cursor-pointer 
                    transition-all duration-200 shadow-lg"
                  title="Formatos aceites: JPEG, PNG, WebP, HEIC, HEIF. Tamanho máximo: 50MB"
                >
                  <Camera className="size-5 text-base-100" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <p className="text-xs text-base-content/70 text-center">
                Foto de perfil (opcional)
              </p>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Nome Completo</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-5 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full pl-10"
                  placeholder="João Zhu"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Género</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-5 text-base-content/40" />
                </div>
                <select
                  className="select select-bordered w-full pl-10"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="">Selecionar Género</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10"
                  placeholder="seu.email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Palavra-passe</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="size-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input input-bordered w-full pl-10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 text-base-content/40" />
                  ) : (
                    <Eye className="size-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isSigningUp}>
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  A carregar...
                </>
              ) : (
                "Criar Conta"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Já tem uma conta?{" "}
              <Link to="/login" className="link link-primary">
                Bem Vindo
              </Link>
            </p>
          </div>
        </div>
      </div>

      <AuthImagePattern
        title="Junte-se à nossa comunidade"
        subtitle="Ligue-se com amigos, partilhe momentos e mantenha-se em contacto com os seus entes queridos."
      />

      {/* Modal de Corte de Imagem */}
      // Update the Modal section of your code with these changes
{/* Modal de Corte de Imagem */}
    {isCropModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
        <div className="bg-base-100 rounded-lg p-6 max-w-3xl w-full mx-4 my-8">
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
            <div className="max-h-[50vh] overflow-auto">
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

export default SignUpPage;