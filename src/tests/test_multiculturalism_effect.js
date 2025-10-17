const assert = require('assert');
const { initializeGame, playCard, endTurn } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲悟､壽枚蛹紋ｸｻ鄒ｩ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case 1: Placement effect ---
runTest('驟咲ｽｮ譎ゅ∵э隴倥′-50%(蛻・昏縺ｦ)縺輔ｌ縲∬ｦ乗ｨ｡縺・100%縺輔ｌ繧九°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    const multiculturalismCard = { ...card_definitions_map['螟壽枚蛹紋ｸｻ鄒ｩ'], instance_id: 'p1-multi-1', owner: PlayerId.PLAYER1 };
    p1.hand = [multiculturalismCard];
    p1.scale = 10;
    p1.consciousness = 21; // Odd number to test rounding down

    const initialScale = p1.scale;
    const initialConsciousness = p1.consciousness;

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, multiculturalismCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion
    assert.strictEqual(finalP1.consciousness, 11, '諢剰ｭ倥′豁｣縺励￥-50%(蛻・昏縺ｦ)縺輔ｌ縺ｦ縺・∪縺帙ｓ (21 -> 11)');
    assert.strictEqual(finalP1.scale, initialScale * 2, '隕乗ｨ｡縺・100%縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.ok(finalP1.ideology && finalP1.ideology.name === '螟壽枚蛹紋ｸｻ鄒ｩ', '繧､繝・が繝ｭ繧ｮ繝ｼ縺ｨ縺励※驟咲ｽｮ縺輔ｌ縺ｦ縺・∪縺帙ｓ');
});

// --- Test Case 2: End of turn effect ---
runTest('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲√き繝ｼ繝峨ｒ2譫壼ｼ輔￥縺・, () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    const multiculturalismCard = { ...card_definitions_map['螟壽枚蛹紋ｸｻ鄒ｩ'], instance_id: 'p1-multi-1', owner: PlayerId.PLAYER1, location: 'field' };
    p1.ideology = multiculturalismCard; // Place it directly on the field
    p1.deck = [
        { ...card_definitions_map['霎ｲ豌・], instance_id: 'p1-deck-1', owner: PlayerId.PLAYER1 },
        { ...card_definitions_map['霎ｲ豌・], instance_id: 'p1-deck-2', owner: PlayerId.PLAYER1 },
    ];
    p1.hand = []; // Start with an empty hand

    // Action
    const finalState = endTurn(gameState);
    const finalP1 = finalState.players[PlayerId.PLAYER1]; // It's still P1's turn for END_TURN_OWNER effects

    // Assertion
    assert.strictEqual(finalP1.hand.length, 2, '謇区惆縺・譫壹↓縺ｪ縺｣縺ｦ縺・∪縺帙ｓ');
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
