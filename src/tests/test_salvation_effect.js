const assert = require('assert');
const { initializeGame, playCard } = require('../gameLogic/main');
const { PlayerId, CardType } = require('../gameLogic/constants');
const { createCardInstance } = require('../gameLogic/gameUtils');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲梧舞荳悶阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

let testsPassed = 0;
let testsFailed = 0;

const runTest = (name, testFunction) => {
    try {
        testFunction();
        console.log(`笨・繝・せ繝域・蜉・ ${name}`);
        testsPassed++;
    } catch (error) {
        console.error(`笶・繝・せ繝亥､ｱ謨・ ${name}`);
        console.error(error);
        testsFailed++;
    }
    console.log('-'.repeat(50));
};

// --- Test Case 1: Consciousness >= 100 ---
runTest('繝励Ξ繧､譎ゅ∬・蛻・・諢剰ｭ倥′100莉･荳翫↑繧臥嶌謇九・諢剰ｭ倥ｒ0縺ｫ縺吶ｋ', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
    let p1 = gameState.players[PlayerId.PLAYER1];
    let p2 = gameState.players[PlayerId.PLAYER2];

    // Setup
    p1.consciousness = 100;
    p2.consciousness = 50;
    const salvationCard = createCardInstance(card_definitions_map['謨台ｸ・], PlayerId.PLAYER1);
    salvationCard.location = 'hand';
    p1.hand.push(salvationCard);

    const initialP1Consciousness = p1.consciousness;
    const initialP1DeckCount = p1.deck.length;

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, salvationCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const finalP2 = finalState.players[PlayerId.PLAYER2];

    // Assertion (based on description)
    assert.strictEqual(finalP2.consciousness, 0, '逶ｸ謇九・諢剰ｭ倥′0縺ｫ縺ｪ縺｣縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.consciousness, initialP1Consciousness, '閾ｪ蛻・・諢剰ｭ倥′螟牙喧縺励※縺・∪縺・);
    assert.strictEqual(finalP1.deck.length, initialP1DeckCount, '繝・ャ繧ｭ縺ｫ繧ｫ繝ｼ繝峨′霑ｽ蜉縺輔ｌ縺ｦ縺・∪縺・);
});

// --- Test Case 2: Consciousness < 100 ---
runTest('繝励Ξ繧､譎ゅ∬・蛻・・諢剰ｭ倥′100譛ｪ貅縺ｪ繧芽・蛻・・諢剰ｭ・4縲√ョ繝・く縺ｫ繧ｫ繝ｼ繝芽ｿｽ蜉', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
    let p1 = gameState.players[PlayerId.PLAYER1];
    let p2 = gameState.players[PlayerId.PLAYER2];

    // Setup
    p1.consciousness = 99;
    p2.consciousness = 50;
    const salvationCard = createCardInstance(card_definitions_map['謨台ｸ・], PlayerId.PLAYER1);
    salvationCard.location = 'hand';
    p1.hand.push(salvationCard);

    const initialP1Consciousness = p1.consciousness;
    const initialP2Consciousness = p2.consciousness;
    const initialP1DeckCount = p1.deck.length;

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, salvationCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const finalP2 = finalState.players[PlayerId.PLAYER2];

    // Assertion (based on description)
    assert.strictEqual(finalP2.consciousness, initialP2Consciousness, '逶ｸ謇九・諢剰ｭ倥′螟牙喧縺励※縺・∪縺・);
    assert.strictEqual(finalP1.consciousness, initialP1Consciousness + 4, '閾ｪ蛻・・諢剰ｭ倥′4蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.deck.length, initialP1DeckCount + 1, '繝・ャ繧ｭ縺ｫ繧ｫ繝ｼ繝峨′霑ｽ蜉縺輔ｌ縺ｦ縺・∪縺帙ｓ');
});


// --- 邨先棡繧ｵ繝槭Μ繝ｼ ---
console.log('\n' + '='.repeat(50));
console.log('繝・せ繝育ｵ先棡繧ｵ繝槭Μ繝ｼ');
console.log('='.repeat(50));
console.log(`笨・謌仙粥: ${testsPassed}莉ｶ`);
console.log(`笶・螟ｱ謨・ ${testsFailed}莉ｶ`);

if (testsFailed > 0) {
    console.log('\n笞・・ 荳驛ｨ縺ｮ繝・せ繝医′螟ｱ謨励＠縺ｾ縺励◆縲ょｮ溯｣・ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・);
    process.exit(1);
} else {
    console.log('\n脂 縺吶∋縺ｦ縺ｮ繝・せ繝医′謌仙粥縺励∪縺励◆・・);
}
