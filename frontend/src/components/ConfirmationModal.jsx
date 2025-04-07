// components/ConfirmationModal.jsx
import { X } from "lucide-react";

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  variant = "primary" // primary, error, warning
}) => {
  if (!isOpen) return null;
  
  // Determinar classe do botão de confirmação com base na variante
  const buttonClass = variant === "error" 
    ? "btn btn-error" 
    : variant === "warning" 
      ? "btn btn-warning" 
      : "btn btn-primary";
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-sm flex flex-col animate-scaleIn">
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-lg font-medium">{title}</h2>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-base-content">{message}</p>
        </div>
        
        <div className="p-4 border-t border-base-300 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="btn btn-ghost"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              if (onConfirm) {
                onConfirm();
              }
            }}
            className={buttonClass}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;