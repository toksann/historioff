const assert = require('assert');
const { initializeGame, playCard, endTurn } = require('../gameLogic/main');
const { PlayerId, CardType } = require('../gameLogic/constants');
const { moveCard } = require('../gameLogic/effectHandler');
const { createCardInstance } = require('../gameLogic/gameUtils'); // Add this line

// Load definitions
const card_definitions_array = require('../../public/card_definitions.json');
const card_definitions_map = card_definitions_array.reduce((acc, card) => {
    acc[card.name] = card;
    return acc;
}, {});
const preset_decks = require('../../public/preset_decks.json');

console.log('縲御ｸ逾樊蕗縲阪・蜉ｹ譫懊ユ繧ｹ繝医せ繧､繝ｼ繝磯幕蟋欺n');

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
runTest('驟咲ｽｮ譎ゅ∵焔譛ｭ/繝・ャ繧ｭ縺ｮ繧､繝・が繝ｭ繧ｮ繝ｼ縺梧昏縺ｦ繧峨ｌ縲∫ｵよ忰縺後ョ繝・く縺ｮ蠎輔↓蜉縺医ｉ繧後ｋ縺・, () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];

    // Clear existing hand and deck to set up specific test cards
    p1.hand = [];
    p1.deck = [];

    // Setup specific cards for the test, ensuring consistent instance_ids
    const monotheismCard = createCardInstance(card_definitions_map['荳逾樊蕗'], PlayerId.PLAYER1);
    const ideologyInHand = createCardInstance(card_definitions_map['迚ｩ雉ｪ荳ｻ鄒ｩ'], PlayerId.PLAYER1);
    const ideologyInDeck = createCardInstance(card_definitions_map['螟夂･樊蕗'], PlayerId.PLAYER1);
    const warriorCard = createCardInstance(card_definitions_map['謌ｦ螢ｫ'], PlayerId.PLAYER1); // A non-ideology card for deck

    p1.hand.push(monotheismCard, ideologyInHand);
    p1.deck.push(ideologyInDeck, warriorCard);

    // Manually add these cards to gameState.all_card_instances for lookup by ID
    gameState.all_card_instances[monotheismCard.instance_id] = monotheismCard;
    gameState.all_card_instances[ideologyInHand.instance_id] = ideologyInHand;
    gameState.all_card_instances[ideologyInDeck.instance_id] = ideologyInDeck;
    gameState.all_card_instances[warriorCard.instance_id] = warriorCard;

    p1.scale = 15; // Required scale

    console.log(`TEST DEBUG: monotheismCard instance_id: ${monotheismCard.instance_id}`);
    console.log(`TEST DEBUG: ideologyInHand instance_id: ${ideologyInHand.instance_id}`);
    console.log(`TEST DEBUG: ideologyInDeck instance_id: ${ideologyInDeck.instance_id}`);

    // Action
    const finalState = playCard(gameState, PlayerId.PLAYER1, monotheismCard.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion
    console.log(`TEST DEBUG: finalP1.discard contents: ${finalP1.discard.map(c => c.name + ' (' + c.instance_id + ')').join(', ')}`);
    assert.strictEqual(finalP1.discard.some(c => c.instance_id === ideologyInHand.instance_id), true, '謇区惆縺ｮ繧､繝・が繝ｭ繧ｮ繝ｼ縺梧昏縺ｦ繧峨ｌ縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.discard.some(c => c.instance_id === ideologyInDeck.instance_id), true, '繝・ャ繧ｭ縺ｮ繧､繝・が繝ｭ繧ｮ繝ｼ縺梧昏縺ｦ繧峨ｌ縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(finalP1.deck[0].name, '邨よ忰', '繝・ャ繧ｭ縺ｮ蠎包ｼ磯・蛻励・蜈磯ｭ・峨↓邨よ忰縺後≠繧翫∪縺帙ｓ');
    assert.strictEqual(finalP1.ideology.name === '荳逾樊蕗', true, '荳逾樊蕗縺後う繝・が繝ｭ繧ｮ繝ｼ縺ｨ縺励※驟咲ｽｮ縺輔ｌ縺ｦ縺・∪縺帙ｓ');
});

// --- Test Case 2: End of turn effect ---
runTest('繧ｿ繝ｼ繝ｳ邨ゆｺ・凾縲∝ｴ縺ｮ雋｡縺御ｸ企剞譛ｪ貅縺ｪ繧峨瑚＊蜈ｸ縲阪ｒ謇区惆縺ｫ蜉縺医ｋ縺・, () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];
    p1.field_limit = 5;

    // Setup
    p1.ideology = { ...card_definitions_map['荳逾樊蕗'], instance_id: 'p1-mono-1', owner: PlayerId.PLAYER1, location: 'field' };
    p1.field = [ { ...card_definitions_map['謌ｦ螢ｫ'], instance_id: 'p1-w-1'} ]; // Field has 1 card, less than limit
    const initialHandCount = p1.hand.length;

    // Action
    const finalState = endTurn(gameState);
    const finalP1 = finalState.players[PlayerId.PLAYER1];

    // Assertion
    assert.strictEqual(finalP1.hand.length, initialHandCount + 1, '謇区惆縺・譫壼｢励∴縺ｦ縺・∪縺帙ｓ');
    assert.ok(finalP1.hand.some(c => c.name === '閨門・'), '謇区惆縺ｫ縲瑚＊蜈ｸ縲阪′縺ゅｊ縺ｾ縺帙ｓ');
});

// --- Test Case 3: Discard effect ---
runTest('謐ｨ縺ｦ繧峨ｌ縺滓凾縲∬ｦ乗ｨ｡-10・・ｿ・ｦ∬ｦ乗ｨ｡0縺ｧ謇区惆縺ｫ謌ｻ繧九°', () => {
    let gameState = initializeGame(card_definitions_map, preset_decks, '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ', '蝓ｺ譛ｬ謌宣聞繝・ャ繧ｭ');
    let p1 = gameState.players[PlayerId.PLAYER1];

    // Setup
    const monotheismCard = { ...card_definitions_map['荳逾樊蕗'], instance_id: 'p1-mono-1', owner: PlayerId.PLAYER1, location: 'field' };
    p1.ideology = monotheismCard;
    p1.scale = 20;
    const initialScale = p1.scale;

    // Action: Manually trigger discard by replacing ideology
    const anotherIdeology = { ...card_definitions_map['迚ｩ雉ｪ荳ｻ鄒ｩ'], instance_id: 'p1-materialism-1', owner: PlayerId.PLAYER1 };
    p1.hand.push(anotherIdeology);
    gameState.all_card_instances[anotherIdeology.instance_id] = anotherIdeology; // Add this line to register the card
    const finalState = playCard(gameState, PlayerId.PLAYER1, anotherIdeology.instance_id);
    const finalP1 = finalState.players[PlayerId.PLAYER1];
    const returnedMonotheism = finalP1.hand.find(c => c.name === '荳逾樊蕗');

    // Assertion
    assert.strictEqual(finalP1.scale, initialScale - 10, '隕乗ｨ｡縺・0貂帛ｰ代＠縺ｦ縺・∪縺帙ｓ');
    assert.ok(returnedMonotheism, '荳逾樊蕗縺梧焔譛ｭ縺ｫ謌ｻ縺｣縺ｦ縺・∪縺帙ｓ');
    assert.strictEqual(returnedMonotheism.required_scale, 0, '謌ｻ縺｣縺滉ｸ逾樊蕗縺ｮ蠢・ｦ∬ｦ乗ｨ｡縺・縺ｫ縺ｪ縺｣縺ｦ縺・∪縺帙ｓ');
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
