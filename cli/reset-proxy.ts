import { loadConfig } from './config';
import { login, resetProxy } from './epicenter';

async function main() {
  const config = await loadConfig();

  const token = await login(config);
  console.log('Logged in ✓');

  await resetProxy(token, config);
  console.log('Proxy reset ✓');
}

main();
