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
      return jestConfig;
    },
  },
};
