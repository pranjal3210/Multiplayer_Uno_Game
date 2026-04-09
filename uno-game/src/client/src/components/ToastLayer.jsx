import React from 'react';

export default function ToastLayer({ toasts }) {
  return (
    <div className="toast-layer">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
