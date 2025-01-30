import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, Edit, Save, X, AtSign } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [editStates, setEditStates] = useState({
    gender: false,
    email: false,
    username: false
  });
  const [formData, setFormData] = useState({
    gender: "",
    email: "",
    username: ""
  });
  const [errors, setErrors] = useState({});

  // Inicializar os dados do formulário quando o authUser é carregado
  useEffect(() => {
    if (authUser) {
      setFormData({
        gender: authUser.gender || "",
        email: authUser.email || "",
        username: authUser.username || ""
      });
    }
  }, [authUser]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleUpdate = async (field) => {
    try {
      const payload = { [field]: formData[field] };
      const result = await updateProfile(payload);
      
      if (result?.errors) {
        setErrors(result.errors);
      } else {
        setEditStates(prev => ({ ...prev, [field]: false }));
        setErrors({});
      }
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const renderEditableField = (field, label, icon) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-400 flex items-center gap-2">
          {icon}
          {label}
        </div>
        {!editStates[field] ? (
          <button
            onClick={() => setEditStates(prev => ({ ...prev, [field]: true }))}
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => handleUpdate(field)}
              className="text-sm text-green-500 flex items-center gap-1"
            >
              <Save className="w-4 h-4" /> Save
            </button>
            <button
              onClick={() => {
                setEditStates(prev => ({ ...prev, [field]: false }));
                setFormData(prev => ({ ...prev, [field]: authUser[field] }));
                setErrors({});
              }}
              className="text-sm text-red-500 flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}
      </div>
      
      {editStates[field] ? (
        <div className="relative">
          <input
            type="text"
            value={formData[field]}
            onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full px-4 py-2.5 bg-base-200 rounded-lg border pr-20"
          />
          {errors[field] && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-sm">
              {errors[field]}
            </span>
          )}
        </div>
      ) : (
        <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
          {authUser?.[field] || 'Not specified'}
        </p>
      )}
    </div>
  );

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          {/* ... Seção da imagem de perfil ... */}

          <div className="space-y-6">
            {/* Campo Full Name (não editável) */}
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{authUser?.fullName}</p>
            </div>

            {/* Campo Email editável */}
            {renderEditableField('email', 'Email Address', <Mail className="w-4 h-4" />)}

            {/* Campo Username editável */}
            {renderEditableField('username', 'Username', <AtSign className="w-4 h-4" />)}

            {/* Campo Gender editável */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Gender
                </div>
                {!editStates.gender ? (
                  <button
                    onClick={() => setEditStates(prev => ({ ...prev, gender: true }))}
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate('gender')}
                      className="text-sm text-green-500 flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" /> Save
                    </button>
                    <button
                      onClick={() => {
                        setEditStates(prev => ({ ...prev, gender: false }));
                        setFormData(prev => ({ ...prev, gender: authUser?.gender }));
                      }}
                      className="text-sm text-red-500 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                )}
              </div>
              
              {editStates.gender ? (
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-base-200 rounded-lg border"
                >
                  <option value="">Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              ) : (
                <p className="px-4 py-2.5 bg-base-200 rounded-lg border capitalize">
                  {authUser?.gender || 'Not specified'}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{new Date(authUser?.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;