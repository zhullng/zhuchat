<div className="h-full flex flex-col"> {/* Contêiner principal */}
  {/* Header no topo */}
  <ChatHeader />

  {/* Contêiner das mensagens (ocupa o espaço restante) */}
  <div className="flex-1 overflow-y-auto p-4">
    {messages.map((message) => (
      <div
        key={message._id}
        className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
      >
        {/* Conteúdo da mensagem */}
        <div className="chat-image avatar">
          <div className="size-10 rounded-full border">
            <img
              src={
                message.senderId === authUser._id
                  ? authUser.profilePic || "/avatar.png"
                  : selectedUser.profilePic || "/avatar.png"
              }
              alt="profile pic"
            />
          </div>
        </div>
        <div className="chat-header mb-1">
          <time className="text-xs opacity-50 ml-1">
            {formatMessageTime(message.createdAt)}
          </time>
        </div>
        <div className="chat-bubble flex flex-col">
          {message.image && (
            <img
              src={message.image}
              alt="Attachment"
              className="sm:max-w-[200px] rounded-md mb-2"
            />
          )}
          {message.text && <p>{message.text}</p>}
        </div>
      </div>
    ))}
    <div ref={messageEndRef} /> {/* Ref para scroll automático */}
  </div>

  {/* Input na parte inferior */}
  <div className="p-4">
    <MessageInput />
  </div>
</div>