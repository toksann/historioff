import React from 'react';
import '../App.css';

const Card = ({ card, isSelectable, onClick, onAnimationEnd }) => {
  // console.log(`DEBUG: Card.js rendering - ${card.name} (ID: ${card.instance_id}), Required Scale: ${card.required_scale}`); // NEW DEBUG LOG

  const cardClassName = `card ${onClick ? 'clickable' : ''} card-type-${card.card_type} ${card.animation || ''}`;

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
