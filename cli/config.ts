import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';

export interface Config {
  SERVER: string;
  ACCOUNT_SHORT_NAME: string;
  PROJECT_SHORT_NAME: string;
  ADMIN_HANDLE: string;
  ADMIN_PASSWORD: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'config.json');
const CONFIG_KEYS: (keyof Config)[] = [
  'SERVER',
  'ACCOUNT_SHORT_NAME',
  'PROJECT_SHORT_NAME',
  'ADMIN_HANDLE',
  'ADMIN_PASSWORD',
];

const DEFAULTS: Partial<Config> = {
  SERVER: 'https://forio.com',
};

async function promptForMissingKeys(existingConfig: Partial<Config>): Promise<Config> {
  const config = { ...existingConfig } as Partial<Config>;
  const questions: prompts.PromptObject[] = [];

  for (const key of CONFIG_KEYS) {
    if (!config[key]) {
      const defaultValue = DEFAULTS[key];
      const isPassword = key === 'ADMIN_PASSWORD';

      questions.push({
        type: isPassword ? ('password' as const) : ('text' as const),
        name: key,
        message: key,
        initial: defaultValue,
      });
    }
  }

  if (questions.length > 0) {
    const answers = await prompts(questions);
    Object.assign(config, answers);
  }

  return config as Config;
}

function loadExistingConfig(): Partial<Config> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (_error) {
    console.warn('Warning: Could not read config.json, will prompt for all values');
  }
  return {};
}

function saveConfig(config: Config): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export async function loadConfig(): Promise<Config> {
  const existingConfig = loadExistingConfig();
  const missingKeys = CONFIG_KEYS.filter((key) => !existingConfig[key]);

  if (missingKeys.length > 0) {
    console.log('Configuration incomplete. Please provide the following:');
    console.log();

    const config = await promptForMissingKeys(existingConfig);
    saveConfig(config);

    console.log();
    console.log('Configuration saved to cli/config.json');
    console.log();

    return config;
  }

  return existingConfig as Config;
}
