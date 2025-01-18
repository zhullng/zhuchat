const MessageSkeleton = () => {
  // Cria um array com 6 elementos para representar as mensagens de esqueleto
  const skeletonMessages = Array(6).fill(null);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Mapeia sobre o array de esqueleto para renderizar 6 mensagens fictícias */}
      {skeletonMessages.map((_, idx) => (
        <div
          key={idx}
          className={`chat ${idx % 2 === 0 ? "chat-start" : "chat-end"}`} // Alterna entre o alinhamento esquerdo e direito.
        >
          {/* Avatar da mensagem */}
          <div className="chat-image avatar">
            <div className="size-10 rounded-full"> 
              <div className="skeleton w-full h-full rounded-full" /> {/* Elemento esqueleto circular */}
            </div>
          </div>

          {/* Nome do user ou cabeçalho da mensagem */}
          <div className="chat-header mb-1">
            <div className="skeleton h-4 w-16" /> {/* Esqueleto de linha representando o nome */}
          </div>

          {/* Conteúdo da mensagem */}
          <div className="chat-bubble bg-transparent p-0">
            <div className="skeleton h-16 w-[200px]" /> {/* Esqueleto de bloco que representa o conteúdo */}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;
