import React from 'react';
import '../App.css';

const Card = ({ card, mode = 'library', onClick, onAnimationEnd }) => {
  // modeに応じてベースとなるクラスを決定
  const baseClassName = mode === 'game' ? 'card-game' : 'card-library';

  const cardClassName = `${baseClassName} ${onClick ? 'clickable' : ''} card-type-${card.card_type} ${card.animation || ''}`;

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
      >
        <div className="card-header">
          <div className="card-name">{card.name}</div>
        </div>
        
        <div className="card-center">
          {showDurability && (
            <div className="card-durability">
              {durabilityValue}
            </div>
          )}
        </div>
        
        <div className="card-footer">
          <div className="card-cost">規模: {card.required_scale}</div>
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
    >
      <div className="card-header">
        <h3>{card.name}</h3>
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
