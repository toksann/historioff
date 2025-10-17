const assert = require('assert');
const { initializeGame, playCard, endTurn } = require('../gameLogic/main');
const { PlayerId, CardType } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲悟､夂･樊蕗縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case 1: End of turn effect ---
runTest('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲∵э隴・1縺ｨ莠玖ｱ｡繧ｫ繝ｼ繝峨ｒ隕乗ｨ｡蜊雁・縺ｧ繝峨Ο繝ｼ縺吶ｋ縺・, () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    p1.ideology = { ...card_definitions_map['螟夂･樊蕗'], instance_id: 'p1-poly-1', owner: PlayerId.PLAYER1, location: 'field' };
    const eventCard = { ...card_definitions_map['螟ｧ蠏・], instance_id: 'p1-storm-1', owner: PlayerId.PLAYER1, required_scale: 50 };
    p1.deck = [eventCard];
    p1.hand = [];
    const initialConsciousness = p1.consciousness;

    // Action
    const finalState = endTurn(gameState);
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const drawnCard = finalP1.hand.find(c => c.instance_id === eventCard.instance_id);

    // Assertion
    assert.strictEqual(finalP1.consciousness, initialConsciousness + 1, '諢剰ｭ倥′+1縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.ok(drawnCard, '莠玖ｱ｡繧ｫ繝ｼ繝峨′繝峨Ο繝ｼ縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(drawnCard.required_scale, 25, '繝峨Ο繝ｼ縺励◆莠玖ｱ｡繧ｫ繝ｼ繝峨・蠢・ｦ∬ｦ乗ｨ｡縺悟濠貂・蛻・昏縺ｦ)縺輔ｌ縺ｦ縺・∪縺帙ｓ');
});

// --- Test Case 2: Event play effect ---
runTest('莠玖ｱ｡繧ｫ繝ｼ繝峨・繝ｬ繧､譎ゅ∵昏縺ｦ譛ｭ縺ｮ莠玖ｱ｡繧ｫ繝ｼ繝峨ｒ繝・ャ繧ｭ縺ｫ謌ｻ縺吶°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    p1.ideology = { ...card_definitions_map['螟夂･樊蕗'], instance_id: 'p1-poly-1', owner: PlayerId.PLAYER1, location: 'field' };
    const eventInDiscard = { ...card_definitions_map['雎贋ｽ・], instance_id: 'p1-bountiful-1', owner: PlayerId.PLAYER1, location: 'discard' };
    p1.discard = [eventInDiscard];
    const eventToPlay = { ...card_definitions_map['遘ｻ豌・], instance_id: 'p1-immigrant-1', owner: PlayerId.PLAYER1, required_scale: 0 };
    p1.hand = [eventToPlay];
    p1.scale = 0;

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, eventToPlay.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion
    const returnedCardInDeck = finalP1.deck.find(c => c.instance_id === eventInDiscard.instance_id);
    const cardInDiscard = finalP1.discard.find(c => c.instance_id === eventInDiscard.instance_id);

    assert.ok(returnedCardInDeck, '謐ｨ縺ｦ譛ｭ縺ｮ莠玖ｱ｡繧ｫ繝ｼ繝峨′繝・ャ繧ｭ縺ｫ謌ｻ縺｣縺ｦ縺・∪縺帙ｓ');
    assert.ok(!cardInDiscard, '謐ｨ縺ｦ譛ｭ縺ｮ莠玖ｱ｡繧ｫ繝ｼ繝峨′謐ｨ縺ｦ譛ｭ縺ｫ谿九▲縺ｦ縺・∪縺・);
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
