import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  jest: {
    configure: (jestConfig) => {
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,
        '^gameLogic/(.*)$': path.resolve(__dirname, 'src', 'gameLogic', '$1'),
        '^public/(.*)$': path.resolve(__dirname, 'public', '$1'),
      };
      jestConfig.testPathIgnorePatterns = [
        ...(jestConfig.testPathIgnorePatterns || []),
        '<rootDir>/src/tests/test_turn_end_flash.js',
        '<rootDir>/src/tests/test_presentation_controller.js',
        '<rootDir>/src/tests/test_looting_durability_change_debug.js',
        '<rootDir>/src/tests/test_craftsman_turn_end_fix.js',
        '<rootDir>/src/tests/test_helpers.js',
        '<rootDir>/src/tests/npc_card_selection_fix.test.js',
        '<rootDir>/src/tests/accurate_logging.test.js',
        '<rootDir>/src/tests/damage_destroy_animation_sequence.test.js',
        '<rootDir>/src/tests/isolationism_debug.test.js',
        '<rootDir>/src/tests/isolationism_infinite_loop_fix.test.js',
      ];
      return jestConfig;
    },
  },
};
