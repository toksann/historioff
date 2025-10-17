const assert = require('assert');
const { initializeGame, playCard, resolveInput } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲梧磁蜿弱阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case 1: Normal case with a card on the field ---
runTest('蝣ｴ縺ｫ雋｡縺後≠繧句ｴ蜷医√◎繧後ｒ謇区惆縺ｫ謌ｻ縺励※隕乗ｨ｡+4縺輔ｌ繧九°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    const seizureCard = { ...card_definitions_map['謗･蜿・], instance_id: 'p1-seizure-1', owner: PlayerId.PLAYER1 };
    const warriorCard = { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-warrior-1', owner: PlayerId.PLAYER1 };
    p1.hand = [seizureCard];
    p1.field = [warriorCard];
    p1.scale = 10;

    const initialScale = p1.scale;
    const initialHandCount = p1.hand.length;
    const initialFieldCount = p1.field.length;

    // Action: Play "謗･蜿・
    let stateAfterPlay = playCard(gameState, PlayerId.PLAYER1, seizureCard.instance_id);

    // Assertion: Should be awaiting input
    assert.ok(stateAfterPlay.awaiting_input, '繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ驕ｸ謚槫ｾ・■迥ｶ諷九↓縺ｪ縺｣縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(stateAfterPlay.awaiting_input.type, 'CHOICE_CARD_FOR_EFFECT', '驕ｸ謚槭ち繧､繝励′CHOICE_CARD_FOR_EFFECT縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ');

    // Action: Choose the card to bounce
    const finalState = resolveInput(stateAfterPlay, warriorCard);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion: Check results
    assert.strictEqual(finalP1.scale, initialScale + 4, '隕乗ｨ｡縺・蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.field.length, initialFieldCount - 1, '蝣ｴ縺ｮ繧ｫ繝ｼ繝峨′1譫壽ｸ帙▲縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.hand.length, initialHandCount, '謇区惆縺ｮ譫壽焚縺悟､峨ｏ縺｣縺ｦ縺・∪縺帙ｓ・・譫壹・繝ｬ繧､縲・譫壹ヰ繧ｦ繝ｳ繧ｹ・・);
    assert.ok(finalP1.hand.find(c => c.instance_id === warriorCard.instance_id), '蟇ｾ雎｡縺ｮ繧ｫ繝ｼ繝峨′謇区惆縺ｫ謌ｻ縺｣縺ｦ縺・∪縺帙ｓ');
});

// --- Test Case 2: Edge case with no cards on the field ---
runTest('蝣ｴ縺ｫ雋｡縺後↑縺・ｴ蜷医∽ｽ輔ｂ襍ｷ縺薙ｉ縺ｪ縺・°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    const seizureCard = { ...card_definitions_map['謗･蜿・], instance_id: 'p1-seizure-1', owner: PlayerId.PLAYER1 };
    p1.hand = [seizureCard];
    p1.field = [];
    p1.scale = 10;

    const initialScale = p1.scale;

    // Action: Play "謗･蜿・
    const finalState = playCard(gameState, PlayerId.PLAYER1, seizureCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion: Check results
    assert.strictEqual(finalState.awaiting_input, null, '驕ｸ謚槫ｾ・■迥ｶ諷九↓縺ｪ繧九∋縺阪〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ');
    assert.strictEqual(finalP1.scale, initialScale, '隕乗ｨ｡縺悟､牙虚縺励※縺・∪縺・);
    assert.strictEqual(finalP1.hand.length, 0, '謇区惆縺・譫壹↓縺ｪ縺｣縺ｦ縺・∪縺帙ｓ');
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
