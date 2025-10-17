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

console.log('縲檎ｵ梧ｸ亥ｭｦ縺ｮ闊医ｊ縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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

// --- Test Case 1: Effects on play ---
runTest('繝励Ξ繧､譎ゅ∵焔譛ｭ縺ｫ縲碁㍾驥台ｸｻ鄒ｩ縲阪′蜉繧上ｊ縲∵э隴倥′+1縺輔ｌ繧九°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    const p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    const riseOfEconomicsCard = { ...card_definitions_map['邨梧ｸ亥ｭｦ縺ｮ闊医ｊ'], instance_id: 'p1-roe-1', owner: PlayerId.PLAYER1 };
    p1.hand = [riseOfEconomicsCard];
    p1.scale = 3;
    const initialConsciousness = p1.consciousness;
    const initialHandCount = p1.hand.length;

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, riseOfEconomicsCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion
    const mercantilismInHand = finalP1.hand.find(c => c.name === '驥埼≡荳ｻ鄒ｩ');
    assert.ok(mercantilismInHand, '謇区惆縺ｫ縲碁㍾驥台ｸｻ鄒ｩ縲阪′霑ｽ蜉縺輔ｌ縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.consciousness, initialConsciousness + 1, '諢剰ｭ倥′1蠅怜刈縺励※縺・∪縺帙ｓ');
    // Card is played, one is added, so hand count should be the same
    assert.strictEqual(finalP1.hand.length, initialHandCount, '謇区惆縺ｮ譫壽焚縺後・繝ｬ繧､蜑阪→螟峨ｏ縺｣縺ｦ縺・∪縺帙ｓ');
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
