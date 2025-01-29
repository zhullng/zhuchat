// ChatHeader.jsx
import { ArrowLeft } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="p-4 border-b border-base-300 bg-base-100">
      <div className="flex items-center gap-4">
        {isMobile && (
          <button
            onClick={() => {
              setSelectedUser(null);
              document.body.classList.remove('chat-open');
            }}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <div className="avatar">
          <div className="size-12 rounded-full border-2 border-primary">
            <img 
              src={selectedUser.profilePic || "/avatar.png"} 
              alt={selectedUser.fullName}
              className="object-cover"
            />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold">{selectedUser.fullName}</h2>
          <p className="text-sm text-base-content/60">
            {onlineUsers.includes(selectedUser._id) ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;