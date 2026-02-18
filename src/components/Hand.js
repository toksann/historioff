import React from 'react';
import Card from './Card.js';
import '../App.css';

const Hand = ({ player, onPlayCard, onProvideInput, awaiting_input, onCardClick }) => {
    if (!player) return <div className="hand">Loading hand...</div>;

    // isSelectableはGame.jsで選択待ち状態にあるかどうかを示すフラグ。
    // Hand.js内でのカード個別の選択可否判定は、awaiting_input.typeに応じて行う。

    const handleClick = (card) => {
        if (onCardClick) {
            onCardClick(card);
        } else {
            // ここでのonPlayCardは、Game.jsにawaiting_inputがない場合にのみ実行されるべき
            // awaits_inputがある場合のクリックはGame.jsのhandleCardClickで処理される
            if (!awaiting_input) {
                onPlayCard(card);
            }
        }
    };

    return (
        <div className="hand">
            <h4>{player.name}の手札 ({player.hand.length}枚)</h4>
            <div className="hand-cards-scrollable">
                {player.hand.map(card => {
                    let isCardSelectable = false;
                    if (awaiting_input) {
                        if (awaiting_input.type === 'CHOICE_CARD_FOR_EFFECT') {
                            isCardSelectable = awaiting_input.valid_target_ids && awaiting_input.valid_target_ids.includes(card.instance_id);
                        } else if (awaiting_input.type === 'CHOICE_CARDS_FOR_OPERATION') {
                            isCardSelectable = awaiting_input.options && awaiting_input.options.some(option => option.instance_id === card.instance_id);
                        }
                    }
                    return (
                        <div key={card.instance_id} className="hand-card-slot" onClick={() => handleClick(card)}>
                            <Card card={card} mode="game" isSelectable={isCardSelectable} id={`card_${card.name}`} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Hand;
