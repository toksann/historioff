// NPCの意思決定エンジン（Python版準拠の簡素実装）

export const NPCDecisionEngine = {
    // ターン継続判定（Python版準拠）
    shouldContinueTurn: (gameState, npcPlayer) => {
        // プレイヤーの今ターンのカードプレイ数を取得
        const cardsPlayedThisTurn = npcPlayer.cards_played_this_turn || 0;
        
        let endTurnProbability = 0.3; // 基本30%
        endTurnProbability += cardsPlayedThisTurn * 0.2; // カード1枚毎に20%増加
        
        const shouldEnd = Math.random() < endTurnProbability;
        
        console.log('[NPCDecisionEngine] Turn continuation decision:', {
            cardsPlayed: cardsPlayedThisTurn,
            endProbability: `${(endTurnProbability * 100).toFixed(1)}%`,
            decision: shouldEnd ? 'END_TURN' : 'CONTINUE'
        });
        
        return !shouldEnd;
    },

    // カード選択の優先度評価（現在はランダム、将来的に拡張可能）
    evaluateCardPriority: (card, gameState, npcPlayer) => {
        // 現在はランダム選択のため、すべて同じ優先度
        // 将来的にここで戦略的判断を実装可能
        return Math.random();
    },

    // プレイ可能カードの取得と評価
    getPlayableCardsWithPriority: (npcPlayer, gameState) => {
        if (!npcPlayer || !gameState) return [];
        
        const effectiveScale = npcPlayer.scale;
        
        const playableCards = npcPlayer.hand.filter(card => {
            // 規模条件チェック
            if (card.required_scale > effectiveScale) return false;
            
            // 財カードの場合は場の上限もチェック
            if (card.card_type === '財') {
                return npcPlayer.field.length < npcPlayer.field_limit;
            }
            
            return true;
        });

        // 各カードに優先度を付与
        const cardsWithPriority = playableCards.map(card => ({
            card,
            priority: NPCDecisionEngine.evaluateCardPriority(card, gameState, npcPlayer)
        }));

        // 優先度でソート（高い順）
        cardsWithPriority.sort((a, b) => b.priority - a.priority);

        console.log('[NPCDecisionEngine] Playable cards evaluated:', {
            totalCards: playableCards.length,
            topChoice: cardsWithPriority[0]?.card.name,
            allChoices: cardsWithPriority.map(c => ({
                name: c.card.name,
                priority: c.priority.toFixed(3)
            }))
        });

        return cardsWithPriority.map(c => c.card);
    },

    // 選択肢の評価（現在はランダム、将来的に拡張可能）
    evaluateChoice: (option, choiceType, gameState) => {
        // 現在はランダム選択のため、すべて同じ評価
        // 将来的にここで戦略的判断を実装可能
        return Math.random();
    },

    // 最適な選択肢の決定
    getBestChoice: (options, choiceType, gameState) => {
        if (!options || options.length === 0) return null;

        // 各選択肢を評価
        const optionsWithScore = options.map(option => ({
            option,
            score: NPCDecisionEngine.evaluateChoice(option, choiceType, gameState)
        }));

        // スコアでソート（高い順）
        optionsWithScore.sort((a, b) => b.score - a.score);

        const bestChoice = optionsWithScore[0].option;

        console.log('[NPCDecisionEngine] Choice evaluation:', {
            type: choiceType,
            totalOptions: options.length,
            bestChoice: bestChoice.name || bestChoice,
            allScores: optionsWithScore.map(o => ({
                choice: o.option.name || o.option,
                score: o.score.toFixed(3)
            }))
        });

        return bestChoice;
    },

    // 数値選択の決定（現在はランダム、将来的に拡張可能）
    getBestNumber: (min, max, context, gameState) => {
        // 現在はランダム選択
        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        
        console.log('[NPCDecisionEngine] Number choice:', {
            range: `${min}-${max}`,
            chosen: randomNumber,
            context: context || 'unknown'
        });

        return randomNumber;
    },

    // 複数カード選択の決定
    getBestCardSelection: (options, count, context, gameState) => {
        if (!options || options.length === 0) return [];
        
        const selectedCount = Math.min(count || 1, options.length);
        
        // 各カードを評価
        const cardsWithScore = options.map(card => ({
            card,
            score: NPCDecisionEngine.evaluateChoice(card, 'card_selection', gameState)
        }));

        // スコアでソート（高い順）
        cardsWithScore.sort((a, b) => b.score - a.score);

        // 上位のカードを選択
        const selectedCards = cardsWithScore.slice(0, selectedCount).map(c => c.card);

        console.log('[NPCDecisionEngine] Multiple card selection:', {
            context: context || 'unknown',
            totalOptions: options.length,
            selectedCount,
            selected: selectedCards.map(c => c.name),
            scores: cardsWithScore.slice(0, selectedCount).map(c => ({
                name: c.card.name,
                score: c.score.toFixed(3)
            }))
        });

        return selectedCards;
    }
};

export default NPCDecisionEngine;