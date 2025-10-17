const assert = require('assert');
const { initializeGame, endTurn } = require('../gameLogic/main');
const { PlayerId, CardType } = require('../gameLogic/constants');
const { processEffects } = require('../gameLogic/effectHandler');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲梧姶螢ｫ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- 繝・せ繝医こ繝ｼ繧ｹ ---

runTest('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲∵ｭ｣髱｢縺ｮ逶ｸ謇九・雋｡縺ｫ繝繝｡繝ｼ繧ｸ繧剃ｸ弱∴縲∫嶌謇九・諢剰ｭ倥ｒ-1縺吶ｋ縺・, () => {
    // 1. 繧ｻ繝・ヨ繧｢繝・・
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ', '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ');

    const p1 = gameState.players[PlayerId.PLAYER1];
    const p2 = gameState.players[PlayerId.PLAYER2];

    // P1縺ｮ蝣ｴ縺ｫ縲梧姶螢ｫ縲阪ｒ驟咲ｽｮ
    const warriorTemplate = card_definitions_map['謌ｦ螢ｫ'];
    const warriorCard = { ...warriorTemplate, instance_id: 'p1-warrior-1', owner: PlayerId.PLAYER1, location: 'field', current_durability: 2 };
    p1.field.push(warriorCard);

    // P2縺ｮ蝣ｴ縲∵姶螢ｫ縺ｮ豁｣髱｢縺ｫ縲梧棡螳溘阪ｒ驟咲ｽｮ
    const fruitTemplate = card_definitions_map['譫懷ｮ・];
    const fruitCard = { ...fruitTemplate, instance_id: 'p2-fruit-1', owner: PlayerId.PLAYER2, location: 'field', current_durability: 1 };
    p2.field.push(fruitCard);

    // 蛻晄悄迥ｶ諷九ｒ險倬鹸
    const initial_p2_consciousness = p2.consciousness;
    const initial_fruit_durability = fruitCard.current_durability;
    const warrior_durability = warriorCard.current_durability;

    console.log(`  蛻晄悄迥ｶ諷・ P2諢剰ｭ・${initial_p2_consciousness}, 譫懷ｮ溯蝉ｹ・､=${initial_fruit_durability}, 謌ｦ螢ｫ閠蝉ｹ・､=${warrior_durability}`);

    // 2. 螳溯｡・    // 繝励Ξ繧､繝､繝ｼ1縺ｮ繧ｿ繝ｼ繝ｳ縺ｧ繧ｿ繝ｼ繝ｳ邨ゆｺ・    gameState.current_turn = PlayerId.PLAYER1;
    const finalState = endTurn(gameState);

    // 3. 讀懆ｨｼ
    const final_p2 = finalState.players[PlayerId.PLAYER2];
    const final_fruit = final_p2.discard.find(c => c.instance_id === fruitCard.instance_id);

    console.log(`  譛邨ら憾諷・ P2諢剰ｭ・${final_p2.consciousness}`);
    assert.strictEqual(final_p2.consciousness, initial_p2_consciousness - 1, '繝励Ξ繧､繝､繝ｼ2縺ｮ諢剰ｭ倥′1貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
    assert.ok(final_fruit, '譫懷ｮ溘き繝ｼ繝峨′謐ｨ縺ｦ譛ｭ縺ｫ遘ｻ蜍輔＠縺ｦ縺・∪縺帙ｓ');
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
