import React from 'react';
import './InfoModal.css';

const InfoModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div className="info-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="info-modal-header">
          <h3>{title || '【野暮な知らせ】'}</h3>
          <button onClick={onClose} className="info-modal-close-button">&times;</button>
        </div>
        <div className="info-modal-body">
          <p>{message}</p>
        </div>
        <div className="info-modal-footer">
          <button onClick={onClose} className="info-modal-ok-button">OK</button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
