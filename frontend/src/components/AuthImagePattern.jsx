import { MessageCircle, Users, Image, Video, Smile, Send, Phone, Share2, Heart } from "lucide-react";

const AuthImagePattern = ({ title, subtitle }) => {
  // Ícones para usar no padrão
  const icons = [
    <MessageCircle size={24} />,
    <Users size={24} />,
    <Image size={24} />,
    <Video size={24} />,
    <Smile size={24} />,
    <Send size={24} />,
    <Phone size={24} />,
    <Share2 size={24} />,
    <Heart size={24} />
  ];

  return (
    <div className="hidden lg:flex flex-col items-center justify-center bg-base-200 p-12">
      <div className="max-w-md text-center">
        <div className="grid grid-cols-3 gap-3 mb-8">
          {icons.map((icon, i) => (
            <div
              key={i}
              className={`aspect-square rounded-2xl bg-primary/10 flex items-center justify-center 
                ${i % 2 === 0 ? "animate-pulse" : ""}`}
            >
              <div className="text-primary/70">
                {icon}
              </div>
            </div>
          ))}
        </div>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-base-content/60">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;