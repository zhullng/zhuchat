import { useState } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { THEMES } from "../constants"; 
import { useThemeStore } from "../store/useThemeStore";
import { Send, ArrowLeft } from "lucide-react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Olá! Como estás?", isSent: false },
  { id: 2, content: "Estou óptimo! O ZhuChat é a melhor aplicação de conversas que já utilizei!", isSent: true },
];

const ThemePage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="h-screen container mx-auto px-4 pt-5 max-w-5xl overflow-auto">
      <div className="space-y-6 pl-16 sm:pl-20">
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-base-content/70 hover:text-base-content mb-4"
        >
          <ArrowLeft className="size-5" />
          <span>Voltar</span>
        </button>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Tema</h2>
          <p className="text-sm text-base-content/70">Escolhe um tema para a tua interface de conversação</p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)}
            >
              <div className="relative h-6 sm:h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>
                  <div className="rounded bg-accent"></div>
                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>

        <h3 className="text-lg font-semibold mb-3">Pré-visualização</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200">
            <div className="max-w-lg mx-auto">
              <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                      Z
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Zhu</h3>
                      <p className="text-xs text-base-content/70">Online</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                  {PREVIEW_MESSAGES.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`
                          max-w-[80%] rounded-xl p-3 shadow-sm
                          ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                        `}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`
                            text-[10px] mt-1.5
                            ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                          `}
                        >
                          12:00
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-base-300 bg-base-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered flex-1 text-sm h-10"
                      placeholder="Escreve uma mensagem..."
                      value="Isto é uma pré-visualização"
                      readOnly
                    />
                    <button className="btn btn-primary h-10 min-h-0">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePage;