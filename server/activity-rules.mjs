import { readFileSync } from 'node:fs';
export default JSON.parse(readFileSync(new URL('../shared/activity-rules.json', import.meta.url), 'utf8'));
