import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Configuração de idiomas e traduções
const resources = {
  en: {
    translation: {
      "welcome": "Welcome",
      "change_language": "Change Language",
    },
  },
  pt: {
    translation: {
      "welcome": "Bem-vindo",
      "change_language": "Mudar Idioma",
    },
  },
  // Adicione mais idiomas conforme necessário
};

i18n
  .use(initReactI18next) // Passa o i18n para o React
  .init({
    resources,
    lng: localStorage.getItem("language") || "en", // Carregar o idioma do localStorage ou 'en' como padrão
    interpolation: {
      escapeValue: false, // React já escapa valores
    },
  });

export default i18n;
