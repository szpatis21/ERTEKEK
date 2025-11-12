// generate_aes_key.js
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import path from 'path';

// 1) Generálj 32 bájtot
const key = randomBytes(32);
const keyHex = key.toString('hex');  // 64 hex-karakter

// 2) Írd bele a .env-be (hozzáfűzve)
const envPath = path.resolve(process.cwd(), '.env');
writeFileSync(envPath, `AES_KEY_HEX=${keyHex}\n`, { flag: 'a' });
