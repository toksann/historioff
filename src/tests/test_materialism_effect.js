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

console.log('縲檎黄雉ｪ荳ｻ鄒ｩ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case 1: Scale increase with < 3 wealth cards ---
runTest('雋｡縺・譫壹・譎ゅ√ち繝ｼ繝ｳ邨ゆｺ・凾縺ｫ隕乗ｨ｡縺・蠅怜刈縺励∵э隴倥・螟牙喧縺励↑縺・°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];
    let p2 = gameState.players[PlayerId.PLAYER2];

    // Setup
    p1.ideology = { ...card_definitions_map['迚ｩ雉ｪ荳ｻ鄒ｩ'], instance_id: 'p1-materialism-1', owner: PlayerId.PLAYER1, location: 'field' };
    p1.field = [
        { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-1', owner: PlayerId.PLAYER1, card_type: CardType.WEALTH },
        { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-2', owner: PlayerId.PLAYER1, card_type: CardType.WEALTH },
    ];
    const initialP1Scale = p1.scale;
    const initialP1Consciousness = p1.consciousness;
    const initialP2Consciousness = p2.consciousness;

    // Action
    const finalState = endTurn(gameState);
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const finalP2 = finalState.players[PlayerId.PLAYER2];

    // Assertion
    assert.strictEqual(finalP1.scale, initialP1Scale + 2, '繝励Ξ繧､繝､繝ｼ1縺ｮ隕乗ｨ｡縺・蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.consciousness, initialP1Consciousness, '繝励Ξ繧､繝､繝ｼ1縺ｮ諢剰ｭ倥′螟牙喧縺励※縺・∪縺・);
    assert.strictEqual(finalP2.consciousness, initialP2Consciousness, '繝励Ξ繧､繝､繝ｼ2縺ｮ諢剰ｭ倥′螟牙喧縺励※縺・∪縺・);
});

// --- Test Case 2: Scale and Consciousness change with >= 3 wealth cards ---
runTest('雋｡縺・譫壹・譎ゅ√ち繝ｼ繝ｳ邨ゆｺ・凾縺ｫ隕乗ｨ｡縺・蠅怜刈縺励∵э隴倥′(閾ｪ+1,逶ｸ-1)縺輔ｌ繧九°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];
    let p2 = gameState.players[PlayerId.PLAYER2];

    // Setup
    p1.ideology = { ...card_definitions_map['迚ｩ雉ｪ荳ｻ鄒ｩ'], instance_id: 'p1-materialism-1', owner: PlayerId.PLAYER1, location: 'field' };
    p1.field = [
        { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-1', owner: PlayerId.PLAYER1, card_type: CardType.WEALTH },
        { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-2', owner: PlayerId.PLAYER1, card_type: CardType.WEALTH },
        { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-3', owner: PlayerId.PLAYER1, card_type: CardType.WEALTH },
    ];
    const initialP1Scale = p1.scale;
    const initialP1Consciousness = p1.consciousness;
    const initialP2Consciousness = p2.consciousness;

    // Action
    const finalState = endTurn(gameState);
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const finalP2 = finalState.players[PlayerId.PLAYER2];

    // Assertion
    assert.strictEqual(finalP1.scale, initialP1Scale + 3, '繝励Ξ繧､繝､繝ｼ1縺ｮ隕乗ｨ｡縺・蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.consciousness, initialP1Consciousness + 1, '繝励Ξ繧､繝､繝ｼ1縺ｮ諢剰ｭ倥′1蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(finalP2.consciousness, initialP2Consciousness - 1, '繝励Ξ繧､繝､繝ｼ2縺ｮ諢剰ｭ倥′1貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
});

// --- Test Case 3: No change with 0 wealth cards ---
runTest('雋｡縺後↑縺・凾縲√ち繝ｼ繝ｳ邨ゆｺ・凾縺ｫ隕乗ｨ｡繧よэ隴倥ｂ螟牙喧縺励↑縺・°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];
    let p2 = gameState.players[PlayerId.PLAYER2];

    // Setup
    p1.ideology = { ...card_definitions_map['迚ｩ雉ｪ荳ｻ鄒ｩ'], instance_id: 'p1-materialism-1', owner: PlayerId.PLAYER1, location: 'field' };
    p1.field = []; // No wealth cards
    const initialP1Scale = p1.scale;
    const initialP1Consciousness = p1.consciousness;
    const initialP2Consciousness = p2.consciousness;

    // Action
    const finalState = endTurn(gameState);
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const finalP2 = finalState.players[PlayerId.PLAYER2];

    // Assertion
    assert.strictEqual(finalP1.scale, initialP1Scale, '繝励Ξ繧､繝､繝ｼ1縺ｮ隕乗ｨ｡縺悟､牙喧縺励※縺・∪縺・);
    assert.strictEqual(finalP1.consciousness, initialP1Consciousness, '繝励Ξ繧､繝､繝ｼ1縺ｮ諢剰ｭ倥′螟牙喧縺励※縺・∪縺・);
    assert.strictEqual(finalP2.consciousness, initialP2Consciousness, '繝励Ξ繧､繝､繝ｼ2縺ｮ諢剰ｭ倥′螟牙喧縺励※縺・∪縺・);
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
