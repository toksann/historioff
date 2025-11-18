// NPCの具体的な行動実行を担当するモジュール

export const NPCActions = {
    // プレイ可能なカードを取得
    getPlayableCards: (player, gameState) => {
        if (!player || !gameState) return [];
        
        // 規模条件を満たすカードを取得
        const effectiveScale = player.scale; // 簡易版：getEffectiveScaleは後で統合
        
        return player.hand.filter(card => {
            // 規模条件チェック
            if (card.required_scale > effectiveScale) return false;
            
            // 財カードの場合は場の上限もチェック
            if (card.card_type === '財') {
                return player.field.length < player.field_limit;
            }
            
            return true;
        });
    },

    // カードプレイの実行
    executeCardPlay: (player, gameState, onPlayCard) => {
        const playableCards = NPCActions.getPlayableCards(player, gameState);
        
        if (playableCards.length > 0) {
            // ランダムにカードを選択してプレイ
            const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
            console.log('[NPCActions] Playing card:', randomCard.name);
            onPlayCard(randomCard);
            return true;
        }
        
        return false;
    },

    // ターン終了の実行
    executeEndTurn: (onEndTurn) => {
        console.log('[NPCActions] Ending turn');
        onEndTurn();
    },

    // ターン継続判定（Python版準拠）
    shouldContinueTurn: (cardsPlayedThisTurn = 0) => {
        let endTurnProbability = 0.3; // 基本30%
        endTurnProbability += cardsPlayedThisTurn * 0.2; // カード1枚毎に20%増加
        
        const shouldEnd = Math.random() < endTurnProbability;
        console.log('[NPCActions] Turn continuation check:', {
            cardsPlayed: cardsPlayedThisTurn,
            endProbability: endTurnProbability,
            shouldEnd
        });
        
        return !shouldEnd;
    },

    // 選択肢からランダム選択
    makeRandomChoice: (options, choiceType) => {
        if (!options || options.length === 0) {
            console.warn('[NPCActions] No options available for choice:', choiceType);
            return null;
        }
        
        const randomChoice = options[Math.floor(Math.random() * options.length)];
        console.log('[NPCActions] Random choice made:', {
            type: choiceType,
            choice: randomChoice.name || randomChoice,
            totalOptions: options.length
        });
        
        return randomChoice;
    },

    // 数値範囲からランダム選択
    makeRandomNumber: (min = 0, max = 1) => {
        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        console.log('[NPCActions] Random number chosen:', randomNumber, `(range: ${min}-${max})`);
        return randomNumber;
    },

    // 複数カードのランダム選択
    makeRandomCardSelection: (options, count) => {
        if (!options || options.length === 0) return [];
        
        const selectedCount = Math.min(count || 1, options.length);
        const shuffled = [...options].sort(() => Math.random() - 0.5);
        const selectedCards = shuffled.slice(0, selectedCount);
        
        console.log('[NPCActions] Multiple cards selected:', {
            selected: selectedCards.map(c => c.name),
            count: selectedCount,
            totalOptions: options.length
        });
        
        return selectedCards;
    }
};

export default NPCActions;