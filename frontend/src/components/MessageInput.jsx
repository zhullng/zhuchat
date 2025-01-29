// MessageInput.jsx
import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-2 md:p-4 w-full">
      {imagePreview && (
        <div className="mb-2 flex items-center gap-1">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-12 h-12 md:w-20 md:h-20 object-cover rounded border"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-2.5" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-1 md:gap-2">
        <div className="flex-1 flex gap-1">
          <input
            type="text"
            className="input input-bordered rounded-lg input-sm md:input-md flex-1"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`btn btn-circle btn-xs md:btn-md
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="size-3 md:size-4" />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-circle btn-sm md:btn-md"
          disabled={!text.trim() && !imagePreview}
        >
          <Send className="size-3 md:size-4" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;