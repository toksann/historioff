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

console.log('縲御ｺ､譏楢ｷｯ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case 1: Placement Effect ---
runTest('驟咲ｽｮ譎ゅ∬・蛻・・隕乗ｨ｡縺・3縺輔ｌ繧九°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];
    
    const cardTemplate = card_definitions_map['莠､譏楢ｷｯ'];
    const cardInstance = { ...cardTemplate, instance_id: 'p1-traderoute-1', owner: PlayerId.PLAYER1, location: 'hand' };
    p1.hand.push(cardInstance);
    p1.scale = 6;

    const initialScale = p1.scale;
    
    const finalState = playCard(gameState, PlayerId.PLAYER1, cardInstance.instance_id);
    
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    assert.strictEqual(finalP1.scale, initialScale + 3, '隕乗ｨ｡縺・蠅怜刈縺励※縺・∪縺帙ｓ');
});

// --- Test Case 2: Opponent Placement Trigger ---
runTest('逶ｸ謇九′雋｡繧ｫ繝ｼ繝峨ｒ驟咲ｽｮ縺励◆髫帙∬・蛻・・隕乗ｨ｡縺・1縺輔ｌ繧九°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];
    const p2 = gameState.players[PlayerId.PLAYER2];

    // Place "莠､譏楢ｷｯ" on Player 1's field
    const tradeRouteTemplate = card_definitions_map['莠､譏楢ｷｯ'];
    const tradeRouteInstance = { ...tradeRouteTemplate, instance_id: 'p1-traderoute-1', owner: PlayerId.PLAYER1, location: 'field' };
    p1.field.push(tradeRouteInstance);

    // Add a Wealth card ("霎ｲ豌・) to Player 2's hand
    const peasantTemplate = card_definitions_map['霎ｲ豌・];
    const peasantInstance = { ...peasantTemplate, instance_id: 'p2-peasant-1', owner: PlayerId.PLAYER2, location: 'hand' };
    p2.hand.push(peasantInstance);
    p2.scale = 0; // Peasant requires 0 scale

    const initialP1Scale = p1.scale;

    // Set turn to Player 2 and have them play the card
    gameState.current_turn = PlayerId.PLAYER2;
    const finalState = playCard(gameState, PlayerId.PLAYER2, peasantInstance.instance_id);

    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const peasantOnField = finalState.players[PlayerId.PLAYER2].field.find(c => c.instance_id === peasantInstance.instance_id);

    assert.ok(peasantOnField, '逶ｸ謇九・雋｡繧ｫ繝ｼ繝峨′蝣ｴ縺ｫ驟咲ｽｮ縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.scale, initialP1Scale + 1, '莠､譏楢ｷｯ縺ｮ謇譛芽・・隕乗ｨ｡縺・蠅怜刈縺励※縺・∪縺帙ｓ');
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
