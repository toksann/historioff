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

console.log('縲悟女髮｣縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case ---
runTest('繝励Ξ繧､譎ゅ∝曙譁ｹ縺ｮ雋｡縺ｫ1繝繝｡繝ｼ繧ｸ繧剃ｸ弱∴縲∬・蛻・・隕乗ｨ｡-5', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
    let p1 = gameState.players[PlayerId.PLAYER1];
    let p2 = gameState.players[PlayerId.PLAYER2];

    // Setup
    p1.scale = 10;
    const sufferingCard = createCardInstance(card_definitions_map['蜿鈴屮'], PlayerId.PLAYER1);
    sufferingCard.location = 'hand';
    p1.hand.push(sufferingCard);

    const p1Warrior = createCardInstance(card_definitions_map['謌ｦ螢ｫ'], PlayerId.PLAYER1); // Durability 2
    const p1Peasant = createCardInstance(card_definitions_map['霎ｲ豌・], PlayerId.PLAYER1); // Durability 1
    p1.field.push(p1Warrior, p1Peasant);

    const p2Warrior = createCardInstance(card_definitions_map['謌ｦ螢ｫ'], PlayerId.PLAYER2); // Durability 2
    p2.field.push(p2Warrior);

    const initialP1Scale = p1.scale;
    const initialP1WarriorDurability = p1Warrior.current_durability;

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, sufferingCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const finalP2 = finalState.players[PlayerId.PLAYER2];

    const finalP1Warrior = finalP1.field.find(c => c.instance_id === p1Warrior.instance_id);
    const finalP1Peasant_field = finalP1.field.find(c => c.instance_id === p1Peasant.instance_id);
    const finalP1Peasant_discard = finalP1.discard.find(c => c.instance_id === p1Peasant.instance_id);
    const finalP2Warrior = finalP2.field.find(c => c.instance_id === p2Warrior.instance_id);

    // Assertion
    assert.strictEqual(finalP1.scale, initialP1Scale - 5, 'P1縺ｮ隕乗ｨ｡縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
    
    assert.ok(finalP1Warrior, 'P1縺ｮ謌ｦ螢ｫ縺後ヵ繧｣繝ｼ繝ｫ繝峨↓谿九▲縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1Warrior.current_durability, initialP1WarriorDurability - 1, 'P1縺ｮ謌ｦ螢ｫ縺ｮ閠蝉ｹ・ｧ縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
    
    assert.strictEqual(finalP1Peasant_field, undefined, 'P1縺ｮ霎ｲ豌代′繝輔ぅ繝ｼ繝ｫ繝峨↓谿九▲縺ｦ縺・∪縺・);
    assert.ok(finalP1Peasant_discard, 'P1縺ｮ霎ｲ豌代′謐ｨ縺ｦ譛ｭ縺ｫ遘ｻ蜍輔＠縺ｦ縺・∪縺帙ｓ');

    assert.ok(finalP2Warrior, 'P2縺ｮ謌ｦ螢ｫ縺後ヵ繧｣繝ｼ繝ｫ繝峨↓谿九▲縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP2Warrior.current_durability, initialP1WarriorDurability - 1, 'P2縺ｮ謌ｦ螢ｫ縺ｮ閠蝉ｹ・ｧ縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
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
