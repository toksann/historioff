const assert = require('assert');
const { initializeGame, playCard } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲檎黄縲・ｺ､謠帙阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case 1: Normal case with cards in hand ---
runTest('謇区惆縺ｫ繧ｫ繝ｼ繝峨′縺ゅｋ蝣ｴ蜷医∵怙螟ｧ隕乗ｨ｡縺ｮ繧ｫ繝ｼ繝峨ｒ繝・ャ繧ｭ縺ｫ謌ｻ縺・譫壼ｼ輔￥縺・, () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // Setup: Player 1 has multiple cards in hand
    const barterCard = { ...card_definitions_map['迚ｩ縲・ｺ､謠・], instance_id: 'p1-barter-1', owner: PlayerId.PLAYER1 };
    const warriorCard = { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-1', owner: PlayerId.PLAYER1, required_scale: 1 };
    const fortressCard = { ...card_definitions_map['遐ｦ'], instance_id: 'p1-fortress-1', owner: PlayerId.PLAYER1, required_scale: 15 };
    p1.hand = [barterCard, warriorCard, fortressCard];

    const peasantCard = { ...card_definitions_map['霎ｲ豌・], instance_id: 'p1-peasant-deck', owner: PlayerId.PLAYER1 };
    p1.deck = [peasantCard];

    const initialHandCount = p1.hand.length;
    const cardToReturnId = fortressCard.instance_id; // Fortress has the highest required scale
    const cardToDrawId = peasantCard.instance_id;

    // Action: Player 1 plays "迚ｩ縲・ｺ､謠・
    const finalState = playCard(gameState, PlayerId.PLAYER1, barterCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion: Check results
    assert.strictEqual(finalP1.hand.length, initialHandCount - 1, '謇区惆縺ｮ譫壽焚縺・譫壽ｸ帙▲縺ｦ縺・∪縺帙ｓ');
    assert.ok(!finalP1.hand.find(c => c.instance_id === cardToReturnId), '譛螟ｧ隕乗ｨ｡縺ｮ繧ｫ繝ｼ繝会ｼ育ｦ・峨′謇区惆縺ｫ谿九▲縺ｦ縺・∪縺・);
    assert.ok(finalP1.deck.find(c => c.instance_id === cardToReturnId), '譛螟ｧ隕乗ｨ｡縺ｮ繧ｫ繝ｼ繝会ｼ育ｦ・峨′繝・ャ繧ｭ縺ｫ謌ｻ縺｣縺ｦ縺・∪縺帙ｓ');
    assert.ok(finalP1.hand.find(c => c.instance_id === cardToDrawId), '譁ｰ縺励＞繧ｫ繝ｼ繝峨ｒ繝・ャ繧ｭ縺九ｉ蠑輔＞縺ｦ縺・∪縺帙ｓ');
});

// --- Test Case 2: Edge case with only the event card in hand ---
runTest('謇区惆縺檎黄縲・ｺ､謠帙・縺ｿ縺ｮ蝣ｴ蜷医∽ｽ輔ｂ襍ｷ縺薙ｉ縺壹き繝ｼ繝峨ｂ蠑輔°縺ｪ縺・°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // Setup: Player 1 has only "迚ｩ縲・ｺ､謠・ in hand
    const barterCard = { ...card_definitions_map['迚ｩ縲・ｺ､謠・], instance_id: 'p1-barter-1', owner: PlayerId.PLAYER1 };
    p1.hand = [barterCard];
    const peasantCard = { ...card_definitions_map['霎ｲ豌・], instance_id: 'p1-peasant-deck', owner: PlayerId.PLAYER1 };
    p1.deck = [peasantCard];

    const initialDeckCount = p1.deck.length;

    // Action: Player 1 plays "迚ｩ縲・ｺ､謠・
    const finalState = playCard(gameState, PlayerId.PLAYER1, barterCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion: Check results
    assert.strictEqual(finalP1.hand.length, 0, '謇区惆縺・譫壹↓縺ｪ縺｣縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.deck.length, initialDeckCount, '繝・ャ繧ｭ縺ｮ譫壽焚縺悟､峨ｏ縺｣縺ｦ縺・∪縺呻ｼ医き繝ｼ繝峨ｒ蠑輔∋縺阪〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ・・);
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
