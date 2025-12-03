/**
 * パーティクル爆発演出を作成
 * @param {HTMLElement} target - 対象カード要素
 * @param {string} cardType - カードタイプ
 */
export const createParticleExplosion = (target, cardType) => {
    if (!target) {
        console.warn('🎬ANIM [Particle] Target for particle explosion is null.');
        return;
    }
    console.log('🎬ANIM [Particle] Creating particle explosion for card type:', cardType);
    
    // カードの中心位置を取得
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // パーティクルの色を決定
    const particleClass = cardType === '財' ? 'particle-wealth' : 
                          cardType === '事象' ? 'particle-event' : 'particle-ideology';
    
    // パーティクル数
    const particleCount = 12;
    
    // パーティクルを生成
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = `particle ${particleClass}`;
        
        // 放射状の角度を計算
        const angle = (i / particleCount) * 2 * Math.PI;
        const distance = 60 + Math.random() * 40; // 60-100pxの範囲でランダム
        const randomScale = 0.8 + Math.random() * 0.4; // 0.8-1.2倍のランダムスケール
        
        // 初期位置（カードの中心）
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.position = 'fixed';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        
        // 初期状態：小さくて透明度高め
        particle.style.transform = 'translate(-50%, -50%) scale(0.2)';
        particle.style.opacity = '0.9';
        particle.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        particle.style.animation = 'none'; // CSSアニメーションを無効化
        
        // DOMに追加
        document.body.appendChild(particle);
        
        // 少し遅延してから拡散開始（視覚効果向上）
        setTimeout(() => {
            const endX = centerX + Math.cos(angle) * distance;
            const endY = centerY + Math.sin(angle) * distance;
            
            // 拡大しながら拡散し、フェードアウト
            particle.style.left = endX + 'px';
            particle.style.top = endY + 'px';
            particle.style.transform = `translate(-50%, -50%) scale(${randomScale})`;
            particle.style.opacity = '0';
        }, 50);
        
        // パーティクルを自動削除
        setTimeout(() => {
            if (particle.parentNode) {
                document.body.removeChild(particle);
            }
        }, 900); // アニメーション時間より少し長め
    }
    
    console.log('🎬ANIM [Particle] Created', particleCount, 'particles');
};
