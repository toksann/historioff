const assert = require('assert');
const { initializeGame, endTurn } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲悟ｸ晏嵜荳ｻ鄒ｩ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

runTest('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲∝ｴ縺ｮ蠎・＆縺ｫ蠢懊§縺ｦ諢剰ｭ倥′螟牙虚縺吶ｋ縺・, () => {
    // 1. 繧ｻ繝・ヨ繧｢繝・・
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ', '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ');

    const p1 = gameState.players[PlayerId.PLAYER1];
    const p2 = gameState.players[PlayerId.PLAYER2];

    // 繝励Ξ繧､繝､繝ｼ1縺ｮ繧､繝・が繝ｭ繧ｮ繝ｼ繧偵悟ｸ晏嵜荳ｻ鄒ｩ縲阪↓險ｭ螳・    const imperialismCard = Object.values(p1.deck).find(c => c.name === '蟶晏嵜荳ｻ鄒ｩ');
    if (!imperialismCard) {
        // 繝・ャ繧ｭ縺ｫ縺ｪ縺・ｴ蜷医∵焔蜍輔〒菴懈・縺励※霑ｽ蜉
        const imperialismTemplate = card_definitions_map['蟶晏嵜荳ｻ鄒ｩ'];
        p1.ideology = { ...imperialismTemplate, instance_id: 'test-imperialism-1', owner: PlayerId.PLAYER1, location: 'field' };
    } else {
        p1.ideology = imperialismCard;
        p1.ideology.location = 'field';
        p1.deck = p1.deck.filter(c => c.instance_id !== imperialismCard.instance_id);
    }
    
    // 蝣ｴ縺ｮ繧ｫ繝ｼ繝我ｸ企剞縺ｫ蟾ｮ繧偵▽縺代ｋ
    p1.field_limit = 5;
    p2.field_limit = 3;
    const limit_diff = p1.field_limit - p2.field_limit; // 蟾ｮ縺ｯ2

    // 蛻晄悄迥ｶ諷九ｒ險倬鹸
    const initial_p1_consciousness = p1.consciousness;
    const initial_p2_consciousness = p2.consciousness;

    console.log(`  蛻晄悄迥ｶ諷・ P1諢剰ｭ・${initial_p1_consciousness}, P2諢剰ｭ・${initial_p2_consciousness}, P1荳企剞=${p1.field_limit}, P2荳企剞=${p2.field_limit}`);

    // 2. 螳溯｡・    // 繝励Ξ繧､繝､繝ｼ1縺ｮ繧ｿ繝ｼ繝ｳ縺ｧ繧ｿ繝ｼ繝ｳ邨ゆｺ・    gameState.current_turn = PlayerId.PLAYER1;
    const finalState = endTurn(gameState);

    // 3. 讀懆ｨｼ
    const final_p1 = finalState.players[PlayerId.PLAYER1];
    const final_p2 = finalState.players[PlayerId.PLAYER2];

    console.log(`  譛邨ら憾諷・ P1諢剰ｭ・${final_p1.consciousness}, P2諢剰ｭ・${final_p2.consciousness}`);

    assert.strictEqual(final_p1.consciousness, initial_p1_consciousness + limit_diff, '繝励Ξ繧､繝､繝ｼ1縺ｮ諢剰ｭ倥′荳企剞縺ｮ蟾ｮ蛻・□縺大｢怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(final_p2.consciousness, initial_p2_consciousness - limit_diff, '繝励Ξ繧､繝､繝ｼ2縺ｮ諢剰ｭ倥′荳企剞縺ｮ蟾ｮ蛻・□縺第ｸ帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
});

runTest('逶ｸ謇九・雋｡遐ｴ螢頑凾縲∵э隴倥→雋｡縺ｮ閠蝉ｹ・､縺御ｸ頑・縺吶ｋ縺・, () => {
    // 1. 繧ｻ繝・ヨ繧｢繝・・
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ', '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ');
    const { processEffects } = require('../gameLogic/effectHandler');
    const { EffectType } = require('../gameLogic/constants');

    const p1 = gameState.players[PlayerId.PLAYER1];
    const p2 = gameState.players[PlayerId.PLAYER2];

    // P1縺ｮ繧､繝・が繝ｭ繧ｮ繝ｼ繧偵悟ｸ晏嵜荳ｻ鄒ｩ縲阪↓險ｭ螳・    const imperialismTemplate = card_definitions_map['蟶晏嵜荳ｻ鄒ｩ'];
    p1.ideology = { ...imperialismTemplate, instance_id: 'test-imperialism-1', owner: PlayerId.PLAYER1, location: 'field' };

    // P1縺ｮ蝣ｴ縺ｫ雋｡繧帝・鄂ｮ
    const p1WealthTemplate = card_definitions_map['謌ｦ螢ｫ'];
    const p1WealthCard = { ...p1WealthTemplate, instance_id: 'p1-wealth-1', owner: PlayerId.PLAYER1, location: 'field', durability: 2, current_durability: 2 };
    p1.field.push(p1WealthCard);

    // P2縺ｮ蝣ｴ縺ｫ遐ｴ螢翫＆繧後ｋ雋｡繧帝・鄂ｮ
    const p2WealthTemplate = card_definitions_map['譫懷ｮ・];
    const p2WealthCard = { ...p2WealthTemplate, instance_id: 'p2-wealth-1', owner: PlayerId.PLAYER2, location: 'field', durability: 1, current_durability: 1 };
    p2.field.push(p2WealthCard);

    // P1縺ｮ繧ｿ繝ｼ繝ｳ縺ｫ險ｭ螳・    gameState.current_turn = PlayerId.PLAYER1;

    // 蛻晄悄迥ｶ諷九ｒ險倬鹸
    const initial_p1_consciousness = p1.consciousness;
    const initial_p1_wealth_durability = p1WealthCard.current_durability;

    console.log(`  蛻晄悄迥ｶ諷・ P1諢剰ｭ・${initial_p1_consciousness}, P1雋｡閠蝉ｹ・､=${initial_p1_wealth_durability}`);

    // 2. 螳溯｡・    // P2縺ｮ雋｡繧堤ｴ螢翫☆繧句柑譫懊ｒ繧ｭ繝･繝ｼ縺ｫ霑ｽ蜉
    const destroyEffect = {
        effect_type: EffectType.MODIFY_CARD_DURABILITY,
        args: { card_id: p2WealthCard.instance_id, amount: -1 }
    };
    gameState.effect_queue.push([destroyEffect, null]);

    const finalState = processEffects(gameState);

    // 3. 讀懆ｨｼ
    const final_p1 = finalState.players[PlayerId.PLAYER1];
    const final_p1_wealth = final_p1.field.find(c => c.instance_id === p1WealthCard.instance_id);

    console.log(`  譛邨ら憾諷・ P1諢剰ｭ・${final_p1.consciousness}, P1雋｡閠蝉ｹ・､=${final_p1_wealth.current_durability}`);

    assert.strictEqual(final_p1.consciousness, initial_p1_consciousness + 2, '繝励Ξ繧､繝､繝ｼ1縺ｮ諢剰ｭ倥′2蠅怜刈縺励※縺・∪縺帙ｓ');
    assert.strictEqual(final_p1_wealth.current_durability, initial_p1_wealth_durability + 2, '繝励Ξ繧､繝､繝ｼ1縺ｮ雋｡縺ｮ閠蝉ｹ・､縺・蠅怜刈縺励※縺・∪縺帙ｓ');
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
