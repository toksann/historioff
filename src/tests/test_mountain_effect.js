const assert = require('assert');
const { initializeGame, playCard } = require('../gameLogic/main');
const { PlayerId } = require('../gameLogic/constants');

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲悟ｱｱ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

runTest('驟咲ｽｮ譎ゅ∬・蛻・・諢剰ｭ倥′+5縺輔ｌ繧九°', () => {
    // 1. 繧ｻ繝・ヨ繧｢繝・・
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ', '蝓ｺ譛ｬ謌ｦ螢ｫ繝・ャ繧ｭ');

    const p1 = gameState.players[PlayerId.PLAYER1];
    
    // P1縺ｮ謇区惆縺ｫ縲悟ｱｱ縲阪ｒ霑ｽ蜉
    const mountainTemplate = card_definitions_map['螻ｱ'];
    const mountainCard = { ...mountainTemplate, instance_id: 'p1-mountain-1', owner: PlayerId.PLAYER1, location: 'hand' };
    p1.hand.push(mountainCard);

    // P1縺ｮ隕乗ｨ｡繧偵悟ｱｱ縲阪・蠢・ｦ∬ｦ乗ｨ｡莉･荳翫↓縺吶ｋ
    p1.scale = 70;

    // 蛻晄悄迥ｶ諷九ｒ險倬鹸
    const initial_p1_consciousness = p1.consciousness;
    console.log(`  蛻晄悄迥ｶ諷・ P1諢剰ｭ・${initial_p1_consciousness}`);

    // 2. 螳溯｡・    const finalState = playCard(gameState, PlayerId.PLAYER1, mountainCard.instance_id);

    // 3. 讀懆ｨｼ
    const final_p1 = finalState.players[PlayerId.PLAYER1];
    const mountainOnField = final_p1.field.find(c => c.instance_id === mountainCard.instance_id);

    console.log(`  譛邨ら憾諷・ P1諢剰ｭ・${final_p1.consciousness}`);

    assert.ok(mountainOnField, '縲悟ｱｱ縲阪′蝣ｴ縺ｫ驟咲ｽｮ縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(final_p1.consciousness, initial_p1_consciousness + 5, '繝励Ξ繧､繝､繝ｼ1縺ｮ諢剰ｭ倥′5蠅怜刈縺励※縺・∪縺帙ｓ');
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
