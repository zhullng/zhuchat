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
  Settings,
  ArrowLeft
} from 'lucide-react';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('main');
  const [currentSubmenu, setCurrentSubmenu] = useState(null);

  // Main menu items configuration
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
      onClick: () => setCurrentSubmenu('security')
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
      onClick: () => setCurrentSubmenu('privacy')
    }
  ];

  // Submenu configurations
  const securitySubMenu = [
    {
      id: 'password',
      label: 'Alterar Senha',
      icon: <KeyRound className="size-4" />,
      onClick: () => navigate('/security/password')
    }
  ];

  const privacySubMenu = [
    {
      id: 'blocked',
      label: 'Perfis Bloqueados',
      icon: <Eye className="size-4" />,
      onClick: () => navigate('/privacy/blocked')
    }
  ];

  // Render method for main menu
  const renderMainMenu = () => (
    <nav className="space-y-2">
      {menuItems.map((item) => (
        <button
          key={item.id}
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
          {item.onClick && <ChevronRight className="size-4" />}
        </button>
      ))}
    </nav>
  );

  // Render method for submenus
  const renderSubMenu = (title, items, onBack) => (
    <nav className="space-y-2">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-4 text-base-content/70 hover:text-base-content"
      >
        <ArrowLeft className="size-5" />
        <span>Voltar</span>
      </button>

      {/* Submenu title */}
      <div className="flex items-center gap-3 mb-4 px-3">
        {title === 'security' ? <Shield className="size-5 text-primary" /> : <Lock className="size-5 text-primary" />}
        <h2 className="text-lg font-semibold">
          {title === 'security' ? 'Segurança da Conta' : 'Privacidade'}
        </h2>
      </div>

      {/* Submenu items */}
      {(title === 'security' ? securitySubMenu : privacySubMenu).map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          className="
            w-full flex items-center gap-3 p-3 rounded-lg
            hover:bg-base-300 transition-colors
          "
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <Settings className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold">Configurações</h1>
        </div>

        {/* Menu */}
        <div className="bg-base-200 rounded-xl p-4">
          {currentSubmenu === null 
            ? renderMainMenu() 
            : renderSubMenu(
                currentSubmenu, 
                currentSubmenu === 'security' ? securitySubMenu : privacySubMenu, 
                () => setCurrentSubmenu(null)
              )
          }
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;