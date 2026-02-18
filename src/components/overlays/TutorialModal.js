import React from 'react';
import './InfoModal.css'; // InfoModalのCSSを流用

const TutorialModal = ({ step, onNext }) => {
    console.log('[DEBUG TutorialModal] Rendered. Step:', step ? step.step : 'null', 'onNext defined:', !!onNext); // ★ここにログを追加

    // stepやstep.textが存在しない場合はモーダルを表示しない
    if (!step || !step.text) {
        return null;
    }

    return (
        <div className="info-modal-overlay">
            <div className="info-modal-content">
                <div className="info-modal-header">
                    <h3>チュートリアル</h3>
                </div>
                <div className="info-modal-body">
                    <p>{step.text}</p>
                </div>
                <div className="info-modal-footer">
                    <button onClick={onNext} className="info-modal-ok-button">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TutorialModal;
