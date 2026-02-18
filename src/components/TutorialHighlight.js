import React, { useState, useEffect } from 'react';
import './TutorialHighlight.css';

const TutorialHighlight = ({ targetId, onTargetClick }) => {
    const [rect, setRect] = useState(null);

    useEffect(() => {
        if (!targetId) {
            setRect(null);
            return;
        }

        const updateRect = () => {
            const element = document.getElementById(targetId);
            if (element) {
                const elementRect = element.getBoundingClientRect();
                setRect({
                    top: elementRect.top,
                    left: elementRect.left,
                    width: elementRect.width,
                    height: elementRect.height,
                    bottom: elementRect.bottom,
                    right: elementRect.right
                });
            } else {
                setRect(null);
            }
        };

        // 初回実行
        updateRect();

        // ウィンドウのリサイズやスクロールに合わせて更新
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);

        // アニメーション等で動く可能性があるため、定期的にチェック
        const interval = setInterval(updateRect, 100);

        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
            clearInterval(interval);
        };
    }, [targetId]);

    if (!rect) return null;

    return (
        <div className="tutorial-highlight-container">
            {/* 上パネル */}
            <div className="tutorial-mask" style={{ top: 0, left: 0, width: '100%', height: rect.top }} />
            {/* 下パネル */}
            <div className="tutorial-mask" style={{ top: rect.bottom, left: 0, width: '100%', height: 'calc(100% - ' + rect.bottom + 'px)' }} />
            {/* 左パネル */}
            <div className="tutorial-mask" style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
            {/* 右パネル */}
            <div className="tutorial-mask" style={{ top: rect.top, left: rect.right, width: 'calc(100% - ' + rect.right + 'px)', height: rect.height }} />

            {/* 点滅する強調枠 */}
            <div 
                className={`tutorial-focus-frame ${onTargetClick ? 'clickable' : ''}`}
                style={{ 
                    top: rect.top, 
                    left: rect.left, 
                    width: rect.width, 
                    height: rect.height 
                }} 
                onClick={onTargetClick}
            />
        </div>
    );
};

export default TutorialHighlight;
