const assert = require('assert');
const { initializeGame, playCard, endTurn } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲檎ｦ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

runTest('驟咲ｽｮ譎ゅ∫嶌謇九・諢剰ｭ倥′-4縺輔ｌ繧九°', () => {
    // 1. 繧ｻ繝・ヨ繧｢繝・・
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ', '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ');

    const p1 = gameState.players[PlayerId.PLAYER1];
    const p2 = gameState.players[PlayerId.PLAYER2];
    
    // P1縺ｮ謇区惆縺ｫ縲檎ｦ縲阪ｒ霑ｽ蜉
    const fortressTemplate = card_definitions_map['遐ｦ'];
    const fortressCard = { ...fortressTemplate, instance_id: 'p1-fortress-1', owner: PlayerId.PLAYER1, location: 'hand' };
    p1.hand.push(fortressCard);

    // P1縺ｮ隕乗ｨ｡繧偵檎ｦ縲阪・蠢・ｦ∬ｦ乗ｨ｡莉･荳翫↓縺吶ｋ
    p1.scale = 15;

    // 蛻晄悄迥ｶ諷九ｒ險倬鹸
    const initial_p2_consciousness = p2.consciousness;
    console.log(`  蛻晄悄迥ｶ諷・ P2諢剰ｭ・${initial_p2_consciousness}`);

    // 2. 螳溯｡・    const finalState = playCard(gameState, PlayerId.PLAYER1, fortressCard.instance_id);

    // 3. 讀懆ｨｼ
    const final_p2 = finalState.players[PlayerId.PLAYER2];
    const fortressOnField = finalState.players[PlayerId.PLAYER1].field.find(c => c.instance_id === fortressCard.instance_id);

    console.log(`  譛邨ら憾諷・ P2諢剰ｭ・${final_p2.consciousness}`);

    assert.ok(fortressOnField, '縲檎ｦ縲阪′蝣ｴ縺ｫ驟咲ｽｮ縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(final_p2.consciousness, initial_p2_consciousness - 4, '繝励Ξ繧､繝､繝ｼ2縺ｮ諢剰ｭ倥′4貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
});

runTest('繝繝｡繝ｼ繧ｸ繧貞女縺代◆譎ゅ∝渚謦・＠縺ｦ逶ｸ謇九・雋｡縺ｫ1繝繝｡繝ｼ繧ｸ繧剃ｸ弱∴繧九°', () => {
    // 1. 繧ｻ繝・ヨ繧｢繝・・
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ', '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ');

    const p1 = gameState.players[PlayerId.PLAYER1];
    const p2 = gameState.players[PlayerId.PLAYER2];

    // P1縺ｮ蝣ｴ縺ｫ縲檎ｦ縲阪ｒ驟咲ｽｮ (繝・せ繝医・縺溘ａ逶ｴ謗･驟咲ｽｮ)
    const fortressTemplate = card_definitions_map['遐ｦ'];
    const fortressCard = { ...fortressTemplate, instance_id: 'p1-fortress-1', owner: PlayerId.PLAYER1, location: 'field', current_durability: 5 };
    p1.field.push(fortressCard);

    // P2縺ｮ蝣ｴ縺ｫ縲梧姶螢ｫ縲阪ｒ驟咲ｽｮ (遐ｦ縺ｮ豁｣髱｢)
    const warriorTemplate = card_definitions_map['謌ｦ螢ｫ'];
    const warriorCard = { ...warriorTemplate, instance_id: 'p2-warrior-1', owner: PlayerId.PLAYER2, location: 'field', current_durability: 2 };
    p2.field.push(warriorCard);

    // 蛻晄悄迥ｶ諷九ｒ險倬鹸
    const initial_warrior_durability = warriorCard.current_durability;
    console.log(`  蛻晄悄迥ｶ諷・ 謌ｦ螢ｫ縺ｮ閠蝉ｹ・､=${initial_warrior_durability}`);

    // 2. 螳溯｡・    // P2縺ｮ繧ｿ繝ｼ繝ｳ繧堤ｵゆｺ・＠縲√梧姶螢ｫ縲阪・蜉ｹ譫懊ｒ逋ｺ蜍輔＆縺帙ｋ
    gameState.current_turn = PlayerId.PLAYER2;
    const finalState = endTurn(gameState);

    // 3. 讀懆ｨｼ
    const final_warrior = finalState.players[PlayerId.PLAYER2].field.find(c => c.instance_id === warriorCard.instance_id);
    
    console.log(`  譛邨ら憾諷・ 謌ｦ螢ｫ縺ｮ閠蝉ｹ・､=${final_warrior.current_durability}`);

    assert.ok(final_warrior, '縲梧姶螢ｫ縲阪′蝣ｴ縺ｫ谿九▲縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(final_warrior.current_durability, initial_warrior_durability - 1, '縲梧姶螢ｫ縲阪・閠蝉ｹ・､縺・貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
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
