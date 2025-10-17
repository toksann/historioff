const assert = require('assert');
const { initializeGame, playCard, endTurn, startTurn } = require('../gameLogic/main');
const { PlayerId, CardType } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲悟次蟋句・逕｣蛻ｶ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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
runTest('驟咲ｽｮ譎ゅ∬・蛻・・蝣ｴ縺ｮ縺吶∋縺ｦ縺ｮ雋｡縺ｫ1繝繝｡繝ｼ繧ｸ繧剃ｸ弱∴繧九°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    const primitiveCommunismCard = { ...card_definitions_map['蜴溷ｧ句・逕｣蛻ｶ'], instance_id: 'p1-pc-1', owner: PlayerId.PLAYER1 };
    let warriorCard = { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-1', owner: PlayerId.PLAYER1, durability: 2, current_durability: 2 };
    p1.hand = [primitiveCommunismCard];
    p1.field = [warriorCard];
    p1.scale = 0; // Required scale for Primitive Communism is 0

    const initialWarriorDurability = warriorCard.current_durability;

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, primitiveCommunismCard.instance_id);
    p1 = finalState.players[PlayerId.PLAYER1]; // Re-fetch p1 from finalState
    warriorCard = p1.field.find(c => c.instance_id === warriorCard.instance_id); // Re-fetch warriorCard from finalState

    // Assertion
    assert.strictEqual(warriorCard.current_durability, initialWarriorDurability - 1, '謌ｦ螢ｫ縺ｮ閠蝉ｹ・､縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
});

// --- Test Case 2: Start of turn effect ---
runTest('繧ｿ繝ｼ繝ｳ髢句ｧ区凾縲∬・蛻・・蝣ｴ縺ｮ雋｡縺・譫壽悴貅縺ｪ繧峨瑚ｾｲ豌代阪ｒ驟咲ｽｮ縺吶ｋ縺・, () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    p1.ideology = { ...card_definitions_map['蜴溷ｧ句・逕｣蛻ｶ'], instance_id: 'p1-pc-1', owner: PlayerId.PLAYER1, location: 'field' };
    let warriorCard = { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-1', owner: PlayerId.PLAYER1, durability: 2, current_durability: 2 };
    p1.field = [warriorCard]; // 1 card, so < 2 is true
    p1.deck = [{ ...card_definitions_map['霎ｲ豌・], instance_id: 'p1-peasant-1', owner: PlayerId.PLAYER1 }];

    const initialFieldCount = p1.field.length;

    // Action: Directly start P1's turn
    const finalState = startTurn(gameState); // Call startTurn directly
    p1 = finalState.players[PlayerId.PLAYER1]; // Re-fetch p1 from finalState

    // Assertion
    assert.strictEqual(p1.field.length, initialFieldCount + 1, '霎ｲ豌代′驟咲ｽｮ縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.ok(p1.field.find(c => c.name === '霎ｲ豌・), '蝣ｴ縺ｫ霎ｲ豌代き繝ｼ繝峨′縺ゅｊ縺ｾ縺帙ｓ');
});

// --- Test Case 3: End of turn effect (Discard hand wealth and draw) ---
runTest('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲∵焔譛ｭ縺ｮ雋｡繧ｫ繝ｼ繝峨ｒ縺吶∋縺ｦ謐ｨ縺ｦ縺ｦ縺昴・譫壽焚繝・ャ繧ｭ縺九ｉ繧ｫ繝ｼ繝峨ｒ蠑輔″縲∫嶌謇九・蝣ｴ縺ｮ縺吶∋縺ｦ縺ｮ雋｡縺ｫ1繝繝｡繝ｼ繧ｸ繧剃ｸ弱∴繧九°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];
    let p2 = gameState.players[PlayerId.PLAYER2];

    // Setup
    p1.ideology = { ...card_definitions_map['蜴溷ｧ句・逕｣蛻ｶ'], instance_id: 'p1-pc-1', owner: PlayerId.PLAYER1, location: 'field' };
    let p1Warrior1 = { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-1', owner: PlayerId.PLAYER1, card_type: CardType.WEALTH };
    let p1Warrior2 = { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-2', owner: PlayerId.PLAYER1, card_type: CardType.WEALTH };
    p1.hand = [p1Warrior1, p1Warrior2];
    p1.deck = [
        { ...card_definitions_map['霎ｲ豌・], instance_id: 'p1-deck-1', owner: PlayerId.PLAYER1 },
        { ...card_definitions_map['霎ｲ豌・], instance_id: 'p1-deck-2', owner: PlayerId.PLAYER1 },
    ];
    let p2Warrior = { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p2-warrior-1', owner: PlayerId.PLAYER2, durability: 2, current_durability: 2 };
    p2.field = [p2Warrior];

    const initialP1HandCount = p1.hand.length;
    const initialP2WarriorDurability = p2Warrior.current_durability;

    // Action
    const finalState = endTurn(gameState);
    p1 = finalState.players[PlayerId.PLAYER1]; // Re-fetch p1 from finalState
    p2 = finalState.players[PlayerId.PLAYER2]; // Re-fetch p2 from finalState
    p2Warrior = p2.field.find(c => c.instance_id === p2Warrior.instance_id); // Re-fetch p2Warrior from finalState

    // Assertion
    assert.strictEqual(p1.hand.length, initialP1HandCount, '謇区惆縺ｮ雋｡縺梧昏縺ｦ繧峨ｌ縲∝酔謨ｰ繝峨Ο繝ｼ縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(p1.discard.filter(c => c.card_type === CardType.WEALTH).length, 2, '謇区惆縺ｮ雋｡縺梧昏縺ｦ譛ｭ縺ｫ遘ｻ蜍輔＠縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(p2Warrior.current_durability, initialP2WarriorDurability - 1, '逶ｸ謇九・雋｡縺ｮ閠蝉ｹ・､縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
});

// --- Test Case 4: Wealth card play restriction ---
runTest('蜴溷ｧ句・逕｣蛻ｶ縺碁・鄂ｮ荳ｭ縲∬ｲ｡繧ｫ繝ｼ繝峨ｒ驟咲ｽｮ縺ｧ縺阪↑縺・°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    p1.ideology = { ...card_definitions_map['蜴溷ｧ句・逕｣蛻ｶ'], instance_id: 'p1-pc-1', owner: PlayerId.PLAYER1, location: 'field' };
    let warriorCard = { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-1', owner: PlayerId.PLAYER1, required_scale: 1 };
    p1.hand = [warriorCard];
    p1.scale = 1; // Enough scale to play

    // Action: Try to play a Wealth card
    const stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, warriorCard.instance_id);
    p1 = stateAfterPlay.players[PlayerId.PLAYER1]; // Re-fetch p1 from stateAfterPlay

    // Assertion: Card should not be played, and should remain in hand
    assert.ok(p1.hand.find(c => c.instance_id === warriorCard.instance_id), '雋｡繧ｫ繝ｼ繝峨′謇区惆縺ｫ谿九▲縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(p1.field.length, 0, '雋｡繧ｫ繝ｼ繝峨′蝣ｴ縺ｫ驟咲ｽｮ縺輔ｌ縺ｦ縺・∪縺・);
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
