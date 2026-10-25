import fs from 'node:fs/promises';
export const seedDefinitions=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url),'utf8'));
