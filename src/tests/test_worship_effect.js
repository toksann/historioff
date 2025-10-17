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

console.log('縲悟ｴ・享縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case 1: Consciousness < 40 ---
runTest('繝励Ξ繧､譎ゅ∵э隴・0譛ｪ貅縺ｪ繧峨梧舞荳悶阪・蜉繧上ｉ縺ｪ縺・, () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
    let p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    p1.scale = 10;
    p1.consciousness = 36; // Will become 39, which is < 40
    const worshipCard = createCardInstance(card_definitions_map['蟠・享'], PlayerId.PLAYER1);
    worshipCard.location = 'hand';
    p1.hand.push(worshipCard);

    const initialScale = p1.scale;
    const initialConsciousness = p1.consciousness;
    const initialHandCount = p1.hand.length;

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, worshipCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion
    assert.strictEqual(finalP1.scale, initialScale - 2, '隕乗ｨ｡縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.consciousness, initialConsciousness + 3, '諢剰ｭ倥′3蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.hand.length, initialHandCount - 1, '謇区惆縺・譫壽ｸ帙▲縺ｦ縺・∪縺帙ｓ・亥ｴ・享繝励Ξ繧､・・);
    assert.strictEqual(finalP1.hand.some(c => c.name === '謨台ｸ・), false, '縲梧舞荳悶阪′謇区惆縺ｫ蜉縺医ｉ繧後※縺・∪縺・);
});

// --- Test Case 2: Consciousness >= 40 ---
runTest('繝励Ξ繧､譎ゅ∵э隴・0莉･荳翫↑繧峨梧舞荳悶阪′蜉繧上ｋ', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
    let p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    p1.scale = 10;
    p1.consciousness = 37; // Will become 40
    const worshipCard = createCardInstance(card_definitions_map['蟠・享'], PlayerId.PLAYER1);
    worshipCard.location = 'hand';
    p1.hand.push(worshipCard);

    const initialScale = p1.scale;
    const initialConsciousness = p1.consciousness;
    const initialHandCount = p1.hand.length;

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, worshipCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion
    assert.strictEqual(finalP1.scale, initialScale - 2, '隕乗ｨ｡縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.consciousness, initialConsciousness + 3, '諢剰ｭ倥′3蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.hand.length, initialHandCount, '謇区惆縺ｮ譫壽焚縺悟､峨ｏ縺｣縺ｦ縺・∪縺帙ｓ・亥ｴ・享繝励Ξ繧､縲∵舞荳冶ｿｽ蜉・・);
    assert.strictEqual(finalP1.hand.some(c => c.name === '謨台ｸ・), true, '縲梧舞荳悶阪′謇区惆縺ｫ蜉縺医ｉ繧後※縺・∪縺帙ｓ');
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
