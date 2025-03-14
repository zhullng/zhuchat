import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Shield, 
  Palette, 
  Lock,
  Eye,
  KeyRound,
  ChevronRight,
  Settings
} from 'lucide-react';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');

  // Menu items configuration
  const menuItems = [
    {
      id: 'profile',
      label: 'Perfil',
      icon: <User className="size-5" />,
      onClick: () => navigate('/settings/profile')
    },
    {
      id: 'security',
      label: 'Segurança da Conta',
      icon: <Shield className="size-5" />,
      subItems: [
        {
          id: 'password',
          label: 'Alterar Senha',
          icon: <KeyRound className="size-4" />,
          onClick: () => navigate('/security/password')
        }
      ]
    },
    {
      id: 'theme',
      label: 'Tema',
      icon: <Palette className="size-5" />,
      onClick: () => navigate('/theme')
    },
    {
      id: 'privacy',
      label: 'Privacidade',
      icon: <Lock className="size-5" />,
      subItems: [
        {
          id: 'blocked',
          label: 'Perfis Bloqueados',
          icon: <Eye className="size-4" />,
          onClick: () => navigate('/privacy/blocked')
        }
      ]
    }
  ];

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Settings className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Configurações</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6">
          {/* Menu lateral */}
          <div className="bg-base-200 rounded-xl p-4 h-fit">
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={item.onClick}
                    className={`
                      w-full flex items-center justify-between p-3 rounded-lg
                      hover:bg-base-300 transition-colors
                      ${activeSection === item.id ? 'bg-base-300' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.subItems && <ChevronRight className="size-4" />}
                  </button>

                  {/* Sub-items */}
                  {item.subItems && (
                    <div className="pl-4 space-y-1">
                      {item.subItems.map((subItem) => (
                        <button
                          key={subItem.id}
                          onClick={subItem.onClick}
                          className="
                            w-full flex items-center gap-3 p-2 rounded-lg
                            hover:bg-base-300 transition-colors
                            text-sm text-base-content/70
                          "
                        >
                          {subItem.icon}
                          <span>{subItem.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Área de conteúdo */}
          <div className="bg-base-200 rounded-xl p-6">
            <div className="text-center text-base-content/70">
              <p>Selecione uma opção no menu para começar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;