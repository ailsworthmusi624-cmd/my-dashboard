import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Да", confirmColor = "bg-red-600" }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl scale-in-center">
        <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-8 font-medium">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel} 
            className="flex-1 p-4 rounded-2xl font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={onConfirm} 
            className={`flex-1 p-4 rounded-2xl font-black text-white transition-colors ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}