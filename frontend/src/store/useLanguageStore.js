import { create } from "zustand";
import i18n from "../lib/i18next"; // Importando o i18n para mudar o idioma

// Criando a store com Zustand para gerenciar o idioma
export const useLanguageStore = create((set) => ({
  language: localStorage.getItem("language") || "en", // Carregar o idioma do localStorage ou 'en' como padrão
  setLanguage: (language) => {
    localStorage.setItem("language", language); // Salvar a escolha do idioma no localStorage
    set({ language }); // Atualiza o estado do idioma na store do Zustand
    i18n.changeLanguage(language); // Muda o idioma no i18next
  },
}));
