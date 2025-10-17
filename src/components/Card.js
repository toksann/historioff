import React from 'react';
import '../App.css';

const Card = ({ card, isSelectable, onClick }) => {
  const cardClassName = `card ${isSelectable ? 'selectable' : ''} ${onClick ? 'clickable' : ''} card-type-${card.card_type}`;

  const handleClick = () => {
    if (onClick) {
      onClick(card);
    }
  };

  // 耐久値の表示（財カードのみ）
  const showDurability = card.card_type === '財';
  const durabilityValue = card.current_durability !== undefined ? card.current_durability : card.durability;

  return (
    <div className={cardClassName} onClick={handleClick}>
      <div className="card-header">
        <div className="card-name">{card.name}</div>
        <div className="card-type">{card.card_type}</div>
      </div>
      
      <div className="card-center">
        {showDurability && (
          <div className="card-durability">
            {durabilityValue}/{card.durability}
          </div>
        )}
      </div>
      
      <div className="card-footer">
        <div className="card-cost">規模: {card.required_scale}</div>
      </div>
    </div>
  );
};

export default Card;
