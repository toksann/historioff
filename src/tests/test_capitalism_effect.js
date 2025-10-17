const assert = require('assert');
const { initializeGame, startTurn, endTurn } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, GamePhase } = require('../gameLogic/constants');
const { createCardInstance } = require('../gameLogic/gameUtils');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
// preset_decks.json縺ｮ莉｣繧上ｊ縺ｫ縲√ユ繧ｹ繝育畑縺ｮ繝・ャ繧ｭ繧堤峩謗･螳夂ｾｩ縺励∪縺吶・const preset_decks = [{
    "name": "test_deck",
    "description": "A minimal deck for testing purposes.",
    "cards": [
        "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・,
        "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・,
        "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・, "霎ｲ豌・
    ]
}];


console.log('縲瑚ｳ・悽荳ｻ鄒ｩ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Helper Function ---
const findCardByName = (pile, name) => pile.find(c => c.name === name);
const findCardsByName = (pile, name) => pile.filter(c => c.name === name);


// --- Test Cases ---

runTest('繧ｿ繝ｼ繝ｳ髢句ｧ区凾蜉ｹ譫懶ｼ壼ｴ縺ｮ雋｡繧呈ｶ郁ｲｻ縺励※謇区惆縺ｫ繝槭ロ繝ｼ繧堤函謌舌☆繧・, () => {
    // 1. Setup
    let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
    const p1 = gameState.players[PlayerId.PLAYER1];
    
    // P1縺ｮ繧､繝・が繝ｭ繧ｮ繝ｼ繧偵瑚ｳ・悽荳ｻ鄒ｩ縲阪↓險ｭ螳・    const capitalismTemplate = card_definitions_map['雉・悽荳ｻ鄒ｩ'];
    const capitalismCard = createCardInstance(capitalismTemplate, p1.id, gameState);
    capitalismCard.location = 'ideology';
    p1.ideology = capitalismCard;

    // P1縺ｮ蝣ｴ縺ｫ縲瑚ｾｲ豌代阪ｒ2譫夐・鄂ｮ
    const farmerTemplate = card_definitions_map['霎ｲ豌・];
    const farmer1 = createCardInstance(farmerTemplate, p1.id, gameState);
    farmer1.location = 'field';
    farmer1.current_durability = 5;
    p1.field.push(farmer1);

    const farmer2 = createCardInstance(farmerTemplate, p1.id, gameState);
    farmer2.location = 'field';
    farmer2.current_durability = 5;
    p1.field.push(farmer2);

    gameState.current_turn = PlayerId.PLAYER1;
    gameState.game_phase = GamePhase.MAIN_PHASE;

    console.log(`  蛻晄悄迥ｶ諷・ P1 謇区惆=${p1.hand.length}, 霎ｲ豌・閠蝉ｹ・${farmer1.current_durability}, 霎ｲ豌・閠蝉ｹ・${farmer2.current_durability}`);

    // 2. Execution
    let stateAfterTurnStart = startTurn(gameState);
    let finalState = processEffects(stateAfterTurnStart);
    
    while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
        finalState = processEffects(finalState);
    }

    // 3. Verification
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const finalFarmers = findCardsByName(finalP1.field, '霎ｲ豌・);
    const moneyInHand = findCardByName(finalP1.hand, '繝槭ロ繝ｼ');

    const expectedFarmerDurability = 3; // 5 - 2
    const expectedMoneyDurability = expectedFarmerDurability * 2; // 3 + 3

    console.log(`  譛邨ら憾諷・ P1 謇区惆=${finalP1.hand.length}, 霎ｲ豌題蝉ｹ・${finalFarmers.map(f => f.current_durability)}`);
    if(moneyInHand) {
        console.log(`  謇区惆縺ｮ繝槭ロ繝ｼ閠蝉ｹ・ ${moneyInHand.current_durability}`);
    }

    assert.strictEqual(finalFarmers.length, 2, '霎ｲ豌代き繝ｼ繝峨′2譫壼ｴ縺ｫ谿九▲縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalFarmers[0].current_durability, expectedFarmerDurability, '霎ｲ豌・縺・繝繝｡繝ｼ繧ｸ繧貞女縺代※縺・∪縺帙ｓ');
    assert.strictEqual(finalFarmers[1].current_durability, expectedFarmerDurability, '霎ｲ豌・縺・繝繝｡繝ｼ繧ｸ繧貞女縺代※縺・∪縺帙ｓ');
    assert.ok(moneyInHand, '謇区惆縺ｫ繝槭ロ繝ｼ繧ｫ繝ｼ繝峨′霑ｽ蜉縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(moneyInHand.current_durability, expectedMoneyDurability, `繝槭ロ繝ｼ縺ｮ閠蝉ｹ・､縺梧悄蠕・､(${expectedMoneyDurability})縺ｨ逡ｰ縺ｪ繧翫∪縺兪);
});


runTest('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾蜉ｹ譫懶ｼ壼ｴ縺ｮ繝槭ロ繝ｼ繧呈ｶ郁ｲｻ縺励※莉悶・雋｡繧貞ｼｷ蛹悶☆繧・, () => {
    // 1. Setup
    let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // P1縺ｮ繧､繝・が繝ｭ繧ｮ繝ｼ繧偵瑚ｳ・悽荳ｻ鄒ｩ縲阪↓險ｭ螳・    const capitalismTemplate = card_definitions_map['雉・悽荳ｻ鄒ｩ'];
    const capitalismCard = createCardInstance(capitalismTemplate, p1.id, gameState);
    capitalismCard.location = 'ideology';
    p1.ideology = capitalismCard;

    // P1縺ｮ蝣ｴ縺ｫ縲後・繝阪・縲・譫壹→縲瑚ｾｲ豌代・譫壹ｒ驟咲ｽｮ
    const moneyTemplate = card_definitions_map['繝槭ロ繝ｼ'];
    const moneyCard = createCardInstance(moneyTemplate, p1.id, gameState);
    moneyCard.location = 'field';
    moneyCard.current_durability = 10;
    p1.field.push(moneyCard);

    const farmerTemplate = card_definitions_map['霎ｲ豌・];
    const farmer1 = createCardInstance(farmerTemplate, p1.id, gameState);
    farmer1.location = 'field';
    farmer1.current_durability = 3;
    p1.field.push(farmer1);
    
    const farmer2 = createCardInstance(farmerTemplate, p1.id, gameState);
    farmer2.location = 'field';
    farmer2.current_durability = 3;
    p1.field.push(farmer2);

    const initialFarmerDurabilitySum = farmer1.current_durability + farmer2.current_durability;

    gameState.current_turn = PlayerId.PLAYER1;
    gameState.game_phase = GamePhase.MAIN_PHASE;

    console.log(`  蛻晄悄迥ｶ諷・ 霎ｲ豌大粋險郁蝉ｹ・${initialFarmerDurabilitySum}, 繝槭ロ繝ｼ閠蝉ｹ・${moneyCard.current_durability}`);

    // 2. Execution
    let stateAfterTurnEnd = endTurn(gameState);
    let finalState = processEffects(stateAfterTurnEnd);

    while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
        finalState = processEffects(finalState);
    }

    // 3. Verification
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const moneyInDiscard = findCardByName(finalP1.discard, '繝槭ロ繝ｼ');
    const finalFarmers = findCardsByName(finalP1.field, '霎ｲ豌・);
    const finalFarmerDurabilitySum = finalFarmers.reduce((sum, card) => sum + card.current_durability, 0);
    
    const expectedFarmerDurabilitySum = initialFarmerDurabilitySum + moneyCard.current_durability;

    console.log(`  譛邨ら憾諷・ 霎ｲ豌大粋險郁蝉ｹ・${finalFarmerDurabilitySum}`);
    if (moneyInDiscard) {
        console.log('  繝槭ロ繝ｼ縺ｯ謐ｨ縺ｦ譛ｭ縺ｫ縺ゅｊ縺ｾ縺吶・);
    }

    assert.ok(moneyInDiscard, '繝槭ロ繝ｼ繧ｫ繝ｼ繝峨′謐ｨ縺ｦ譛ｭ縺ｫ遘ｻ蜍輔＠縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalFarmers.length, 2, '霎ｲ豌代き繝ｼ繝峨′2譫壼ｴ縺ｫ谿九▲縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalFarmerDurabilitySum, expectedFarmerDurabilitySum, `霎ｲ豌代・蜷郁ｨ郁蝉ｹ・､縺梧悄蠕・､(${expectedFarmerDurabilitySum})縺ｨ逡ｰ縺ｪ繧翫∪縺兪);
});


// --- 邨先棡繧ｵ繝槭Μ繝ｼ ---
console.log('\n' + '='.repeat(50));
console.log('繝・せ繝育ｵ先棡繧ｵ繝槭Μ繝ｼ');
console.log('='.repeat(50));
console.log(`笨・謌仙粥: ${testsPassed}莉ｶ`);
console.log(`笶・螟ｱ謨・ ${testsFailed}莉ｶ`);

if (testsFailed > 0) {
    console.log('\n笞・・ 荳驛ｨ縺ｮ繝・せ繝医′螟ｱ謨励＠縺ｾ縺励◆縲ょｮ溯｣・ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・);
    // process.exit(1); 
} else {
    console.log('\n脂 縺吶∋縺ｦ縺ｮ繝・せ繝医′謌仙粥縺励∪縺励◆・・);
}
