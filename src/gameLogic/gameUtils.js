import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a deep copy of an object, handling various types and circular references.
 * @param {any} obj The object to copy.
 * @param {WeakMap} hash A WeakMap to store references to already copied objects to handle circular references.
 * @returns {any} A deep copy of the object.
 */
export const deepCopy = (obj, hash = new WeakMap()) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (hash.has(obj)) return hash.get(obj);

  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // Handle Array objects
  if (Array.isArray(obj)) {
    const newArr = [];
    hash.set(obj, newArr);
    obj.forEach((item, i) => {
      newArr[i] = deepCopy(item, hash);
    });
    return newArr;
  }

  // Handle Object objects
  const newObj = {};
  hash.set(obj, newObj);
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = deepCopy(obj[key], hash);
    }
  }
  return newObj;
  };

/**
 * Creates a unique card instance from a card template.
 * @param {object} cardTemplate The card definition from card_definitions.json.
 * @param {string} ownerId The ID of the player who owns this instance.
 * @returns {object} A new card object with a unique instance_id.
 */
export const createCardInstance = (cardTemplate, ownerId) => {
  return {
    ...cardTemplate,
    owner: ownerId, // Add owner property
    instance_id: `${ownerId}-${cardTemplate.name}-${uuidv4()}`,
    current_durability: cardTemplate.durability, // Add current durability for tracking damage
  };
};

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array The array to shuffle.
 * @returns {Array} The shuffled array.
 */
export const shuffle = (array) => {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
};

/**
 * Calculates the effective scale of a player, including durability of Money cards on the field.
 * @param {object} player The player object.
 * @returns {number} The effective scale.
 */
export const getEffectiveScale = (player, gameState) => { // Added gameState as argument
    if (!player) return 0;
    let moneyDurability = 0;
    // Add Money card durability to effective scale when Money cards are on the field
    const moneyOnField = player.field.filter(card => card.name === 'マネー');
    moneyDurability = moneyOnField.reduce((sum, card) => sum + (card.current_durability || 0), 0);
    return player.scale + moneyDurability;
};

// We need a UUID library for createCardInstance. I'll add it to dependencies.
// I will inform the user about this new dependency.

export const createInitialGameState = (player1Id, player2Id, cardDefs, presetDecks) => {
    const createPlayerState = (id) => ({
        id,
        consciousness: 20,
        scale: 0,
        hand: [],
        deck: [],
        field: [],
        discard: [],
        ideology: null,
        hand_capacity: 7,
        field_limit: 4,
        modify_parameter_corrections: [],
        cards_played_this_turn: 0,
    });

    return {
        players: {
            [player1Id]: createPlayerState(player1Id),
            [player2Id]: createPlayerState(player2Id),
        },
        cardDefs: cardDefs, // Renamed from card_definitions to match JS convention
        all_card_instances: {},
        effect_queue: [],
        animation_queue: [],
        game_log: [],
        current_turn: 0,
        active_player: player1Id,
        game_phase: 'initial', // 'initial', 'ongoing', 'finished'
        winner: null,
        awaiting_input: null,
        temp_effect_data: {},
        effects_to_skip: {},
    };
};
