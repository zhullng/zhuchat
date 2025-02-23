import { THEMES } from "../constants"; 
import { useThemeStore } from "../store/useThemeStore"; // Importa o estado do tema e a função para alterar o tema
import { Send } from "lucide-react"; // Importa o ícone de envio de mensagem

// Mensagens de exemplo para visualização no chat
const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! ZhuChat is the best chat app I've ever used!", isSent: true },
];

const SettingsPage = () => {
  // Recebe o tema atual e a função para alterá-lo do store
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="h-screen container mx-auto pt-5 pl-18 pr-2 max-w-5xl sm:pl-20">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {/* Mapeia os temas e cria um botão para cada um */}
          {THEMES.map((t) => (
            <button
              key={t} // Usa o nome do tema como chave
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}
              `}
              onClick={() => setTheme(t)} // Atualiza o tema ao clicar no botão
            >
              {/* Pré-visualização do tema */}
              <div className="relative h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary"></div>
                  <div className="rounded bg-secondary"></div>
                  <div className="rounded bg-accent"></div>
                  <div className="rounded bg-neutral"></div>
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)} {/* Nome do tema em formato legível */}
              </span>
            </button>
          ))}
        </div>

        {/* Secsção de Pré-visualização */}
        <h3 className="text-lg font-semibold mb-3">Preview</h3>
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
          <div className="p-4 bg-base-200">
            <div className="max-w-lg mx-auto">
              {/* Interface do Chat (Mock) */}
              <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
                {/* Cabeçalho do Chat */}
                <div className="px-4 py-3 border-b border-base-300 bg-base-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                      Z {/* Avatar do user */}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Zhu</h3>
                      <p className="text-xs text-base-content/70">Online</p> {/* Estado do user */}
                    </div>
                  </div>
                </div>

                {/* Mensagens do Chat */}
                <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
                  {PREVIEW_MESSAGES.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSent ? "justify-end" : "justify-start"}`} // Alinha as mensagens à direita ou à esquerda
                    >
                      <div
                        className={`
                          max-w-[80%] rounded-xl p-3 shadow-sm
                          ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                        `}
                      >
                        <p className="text-sm">{message.content}</p> {/* Conteúdo da mensagem */}
                        <p
                          className={`
                            text-[10px] mt-1.5
                            ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                          `}
                        >
                          12:00 PM {/* Hora da mensagem */}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Campo de Entrada de Mensagem */}
                <div className="p-4 border-t border-base-300 bg-base-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered flex-1 text-sm h-10"
                      placeholder="Type a message..." // Texto de placeholder
                      value="This is a preview" // Valor fixo para a pré-visualização
                      readOnly // Não permite edição na pré-visualização
                    />
                    <button className="btn btn-primary h-10 min-h-0">
                      <Send size={18} /> {/* Ícone de envio de mensagem */}
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

export default SettingsPage;
