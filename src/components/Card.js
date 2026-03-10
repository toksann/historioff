import React from 'react';
import '../App.css';

const Card = ({ card, mode = 'library', onClick, onAnimationEnd, id }) => {
  // modeに応じてベースとなるクラスを決定
  const baseClassName = mode === 'game' ? 'card-game' : 'card-library';

  // カード名の長さに応じてクラスを追加（CSSでの微調整用）
  const nameLengthClass = card.name.length > 10 ? 'name-long' : card.name.length > 6 ? 'name-medium' : 'name-short';

  const cardClassName = `${baseClassName} ${onClick ? 'clickable' : ''} card-type-${card.card_type} ${card.animation || ''} ${nameLengthClass}`;

  const handleClick = () => {
    if (onClick) {
      onClick(card);
    }
  };

  const handleAnimationEnd = () => {
    if (card.animation === 'destroying' && onAnimationEnd) {
      onAnimationEnd(card.instance_id);
    }
  };

  // 耐久値の表示（財カードのみ）
  const showDurability = card.card_type === '財';
  const durabilityValue = card.current_durability !== undefined ? card.current_durability : card.durability;

  // ゲームモード用のシンプルなカード表示
  if (mode === 'game') {
    return (
      <div 
        className={cardClassName} 
        onClick={handleClick}
        onAnimationEnd={handleAnimationEnd}
        data-card-id={card.instance_id}
        id={id}
      >
        <div className="card-header">
          <div className="card-name-container">
            <div className="card-name">{card.name}</div>
          </div>
        </div>
        
        <div className="card-center">
          {/* 将来的にここにイラストが入る想定 */}
          {card.image && <img src={card.image} alt={card.name} className="card-illustration" />}
        </div>

        <div className="card-footer">
          <div className="card-cost">
            <span>⭐ {card.required_scale}</span>
            {showDurability && (
              <span className="card-durability-value">
                {' / '}🛡️ {durabilityValue}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ライブラリ/デッキ構築モード用の詳細なカード表示
  return (
    <div 
      className={cardClassName} 
      onClick={handleClick}
      onAnimationEnd={handleAnimationEnd}
      data-card-id={card.instance_id}
      id={id}
    >
      <div className="card-header">
        <div className="card-header-main">
          <h3>{card.name}</h3>
          {card.is_token && <span className="token-badge">TOKEN</span>}
        </div>
        <span className="card-type">{card.card_type}</span>
      </div>
      <div className="card-info">
        <div>必要規模: {card.required_scale}</div>
        {showDurability && (
          <div>耐久値: {card.durability}</div>
        )}
      </div>
      <div className="card-description">
        {card.description}
      </div>
    </div>
  );
};

export default Card;
