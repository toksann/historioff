const assert = require('assert');
const { initializeGame, playCard, resolveInput } = require('../gameLogic/main');
const { PlayerId, CardType } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲檎払螂ｪ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case 1: Attack normal wealth ---
runTest('騾壼ｸｸ縺ｮ雋｡繧貞ｯｾ雎｡縺ｨ縺励◆蝣ｴ蜷医∝ｯｾ雎｡縺ｮ閠蝉ｹ・､縺・貂帛ｰ代＠縲∬ｦ乗ｨ｡縺梧ｭ｣縺励￥螟牙虚縺吶ｋ縺・, () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];
    const p2 = gameState.players[PlayerId.PLAYER2];

    // Setup: Player 2 has a "謌ｦ螢ｫ" on the field. Player 1 has "逡･螂ｪ" in hand.
    const warriorTemplate = card_definitions_map['謌ｦ螢ｫ'];
    const warriorInstance = { ...warriorTemplate, instance_id: 'p2-warrior-1', owner: PlayerId.PLAYER2, location: 'field', durability: 2 };
    p2.field.push(warriorInstance);

    const lootingTemplate = card_definitions_map['逡･螂ｪ'];
    const lootingInstance = { ...lootingTemplate, instance_id: 'p1-looting-1', owner: PlayerId.PLAYER1, location: 'hand' };
    p1.hand.push(lootingInstance);
    
    p1.scale = 5;
    p2.scale = 10;
    const initialP1Scale = p1.scale;
    const initialP2Scale = p2.scale;

    // Action: Player 1 plays "逡･螂ｪ"
    let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, lootingInstance.instance_id);

    // Assertion: Should be awaiting input to choose a card
    assert.ok(stateAfterPlay.awaiting_input, '繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ驕ｸ謚槫ｾ・■迥ｶ諷九↓縺ｪ縺｣縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(stateAfterPlay.awaiting_input.type, 'CHOICE_CARD_FOR_EFFECT', '驕ｸ謚槭ち繧､繝励′CHOICE_CARD_FOR_EFFECT縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ');

    // Action: Player 1 chooses the "謌ｦ螢ｫ"
    const finalState = resolveInput(stateAfterPlay, warriorInstance);
    
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const finalP2 = finalState.players[PlayerId.PLAYER2];
    const destroyedWarrior = finalP2.discard.find(c => c.instance_id === warriorInstance.instance_id);

    // Assertion: Check results
    assert.ok(destroyedWarrior, '蟇ｾ雎｡縺ｮ縲梧姶螢ｫ縲阪′遐ｴ螢翫＆繧後∵昏縺ｦ譛ｭ縺ｫ騾√ｉ繧後※縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.scale, initialP1Scale + 2, '繝励Ξ繧､繝､繝ｼ1縺ｮ隕乗ｨ｡縺・蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(finalP2.scale, initialP2Scale - 2, '繝励Ξ繧､繝､繝ｼ2縺ｮ隕乗ｨ｡縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
});

// --- Test Case 2: Attack "繝槭ロ繝ｼ" ---
runTest('縲後・繝阪・縲阪ｒ蟇ｾ雎｡縺ｨ縺励◆蝣ｴ蜷医√・繝ｼ繝翫せ蜉ｹ譫懊′逋ｺ蜍輔＠隕乗ｨ｡縺梧ｭ｣縺励￥螟牙虚縺吶ｋ縺・, () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];
    const p2 = gameState.players[PlayerId.PLAYER2];

    // Setup: Player 2 has a "繝槭ロ繝ｼ" on the field. Player 1 has "逡･螂ｪ" in hand.
    const moneyTemplate = card_definitions_map['繝槭ロ繝ｼ'];
    const moneyInstance = { ...moneyTemplate, instance_id: 'p2-money-1', owner: PlayerId.PLAYER2, location: 'field', durability: 3 };
    p2.field.push(moneyInstance);

    const lootingTemplate = card_definitions_map['逡･螂ｪ'];
    const lootingInstance = { ...lootingTemplate, instance_id: 'p1-looting-1', owner: PlayerId.PLAYER1, location: 'hand' };
    p1.hand.push(lootingInstance);
    
    p1.scale = 5;
    p2.scale = 10;
    const initialP1Scale = p1.scale;
    const initialP2Scale = p2.scale;

    // Action: Player 1 plays "逡･螂ｪ"
    let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, lootingInstance.instance_id);

    // Assertion: Should be awaiting input
    assert.ok(stateAfterPlay.awaiting_input, '繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ驕ｸ謚槫ｾ・■迥ｶ諷九↓縺ｪ縺｣縺ｦ縺・∪縺帙ｓ');

    // Action: Player 1 chooses the "繝槭ロ繝ｼ"
    const finalState = resolveInput(stateAfterPlay, moneyInstance);

    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const finalP2 = finalState.players[PlayerId.PLAYER2];
    const damagedMoney = finalP2.field.find(c => c.instance_id === moneyInstance.instance_id);

    // Assertion: Check results
    assert.ok(damagedMoney, '蟇ｾ雎｡縺ｮ縲後・繝阪・縲阪′蝣ｴ縺ｫ谿九▲縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(damagedMoney.current_durability, 1, '縲後・繝阪・縲阪・閠蝉ｹ・､縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.scale, initialP1Scale + 2 + 3, '繝励Ξ繧､繝､繝ｼ1縺ｮ隕乗ｨ｡縺悟粋險・蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(finalP2.scale, initialP2Scale - 2, '繝励Ξ繧､繝､繝ｼ2縺ｮ隕乗ｨ｡縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
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
