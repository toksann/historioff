const assert = require('assert');
const { initializeGame } = require('../gameLogic/main');
const { processEffects } = require('../gameLogic/effectHandler');
const { PlayerId, GamePhase, TriggerType } = require('../gameLogic/constants');
const { createCardInstance } = require('../gameLogic/gameUtils');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = [{"name": "test_deck", "description": "A minimal deck for testing purposes.", "cards": []}];

console.log('縲碁幕諡薙阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

runTest('繝励Ξ繧､譎ゅ∬・蛻・・蝣ｴ縺ｮ繧ｫ繝ｼ繝我ｸ企剞縺・蠅怜刈縺吶ｋ縺・, () => {
    // 1. Setup
    let gameState = initializeGame(card_definitions_map, preset_decks, 'test_deck', 'test_deck');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // P1縺ｮ隕乗ｨ｡繧・0縺ｫ險ｭ螳・    p1.scale = 30;

    // 縲碁幕諡薙阪き繝ｼ繝峨ｒ菴懈・
    const pioneeringTemplate = card_definitions_map['髢区挙'];
    const pioneeringCard = createCardInstance(pioneeringTemplate, p1.id, gameState);
    p1.hand.push(pioneeringCard);

    const initialFieldLimit = p1.field_limit;
    gameState.current_turn = p1.id;
    gameState.game_phase = GamePhase.MAIN_PHASE;

    console.log(`  蛻晄悄迥ｶ諷・ P1 蝣ｴ縺ｮ荳企剞=${initialFieldLimit}`);

    // 2. Execution
    // playCard繧貞他縺ｰ縺壹↓逶ｴ謗･蜉ｹ譫懊ｒ繧ｭ繝･繝ｼ縺ｫ霑ｽ蜉縺吶ｋ
    const playEffect = {
        effect_type: TriggerType.PLAY_EVENT_THIS,
        args: { card_id: pioneeringCard.instance_id, player_id: p1.id, target_card_id: pioneeringCard.instance_id }
    };
    gameState.effect_queue.push([playEffect, pioneeringCard]);

    let finalState = processEffects(gameState);

    while (finalState.effect_queue.length > 0 && !finalState.awaiting_input) {
        finalState = processEffects(finalState);
    }

    // 3. Verification
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const expectedFieldLimit = initialFieldLimit + 1;

    console.log(`  譛邨ら憾諷・ P1 蝣ｴ縺ｮ荳企剞=${finalP1.field_limit}`);

    assert.strictEqual(finalP1.field_limit, expectedFieldLimit, `蝣ｴ縺ｮ繧ｫ繝ｼ繝我ｸ企剞縺梧悄蠕・､(${expectedFieldLimit})縺ｨ逡ｰ縺ｪ繧翫∪縺兪);
});


// --- 邨先棡繧ｵ繝槭Μ繝ｼ ---
console.log('\n' + '='.repeat(50));
console.log('繝・せ繝育ｵ先棡繧ｵ繝槭Μ繝ｼ');
console.log('='.repeat(50));
console.log(`笨・謌仙粥: ${testsPassed}莉ｶ`);
console.log(`笶・螟ｱ謨・ ${testsFailed}莉ｶ`);

if (testsFailed > 0) {
    console.log('\n笞・・ 荳驛ｨ縺ｮ繝・せ繝医′螟ｱ謨励＠縺ｾ縺励◆縲ょｮ溯｣・ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・);
} else {
    console.log('\n脂 縺吶∋縺ｦ縺ｮ繝・せ繝医′謌仙粥縺励∪縺励◆・・);
}
