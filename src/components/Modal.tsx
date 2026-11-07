import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open && !visible) return null;

  const maxW =
    size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        open ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="absolute inset-0 bg-carbon-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${maxW} max-h-[90vh] overflow-y-auto rounded-2xl border border-carbon-700 bg-carbon-900 shadow-2xl animate-slide-up`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-carbon-700 bg-carbon-900/95 px-5 py-4 backdrop-blur-sm">
          <h3 className="font-display text-lg font-bold uppercase tracking-wide text-carbon-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-carbon-400 transition-colors hover:bg-carbon-800 hover:text-carbon-100"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
