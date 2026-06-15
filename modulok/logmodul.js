// modulok/logmodul.js
// Production-szintű, adattakarékos aktivitásnaplózó.
// Cél: biztonsági/audit események rögzítése személyes/tartalmi adatok duplikálása nélkül.

const crypto = require('crypto');

const MAX_ACTIVITY_LENGTH = Number(process.env.ACTIVITY_LOG_MAX_ACTIVITY_LENGTH || 120);
const MAX_STRING_LENGTH = Number(process.env.ACTIVITY_LOG_MAX_STRING_LENGTH || 160);
const MAX_JSON_LENGTH = Number(process.env.ACTIVITY_LOG_MAX_JSON_LENGTH || 3000);
const MAX_ARRAY_ITEMS = Number(process.env.ACTIVITY_LOG_MAX_ARRAY_ITEMS || 25);
const MAX_DEPTH = Number(process.env.ACTIVITY_LOG_MAX_DEPTH || 4);

// IP-kezelés: alapból hash, hogy incidenskor korrelálható legyen, de ne nyers IP kerüljön a logba.
// Lehetséges értékek: hash | mask | raw | none
const IP_MODE = String(process.env.ACTIVITY_LOG_IP_MODE || 'hash').toLowerCase();

// User-Agent-kezelés: alapból rövidített. Lehetséges értékek: truncate | hash | raw | none
const UA_MODE = String(process.env.ACTIVITY_LOG_UA_MODE || 'truncate').toLowerCase();

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /jelszo/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /session/i,
  /authorization/i,
  /auth/i,
  /api[_-]?key/i,
  /aes/i,
  /kulcs/i,

  // személyes adatok
  /^nev$/i,
  /(^|_)(nev|név)($|_)/i,
  /name/i,
  /vizsgalt/i,
  /vizsgált/i,
  /alany/i,
  /szemely/i,
  /személy/i,
  /mail/i,
  /email/i,
  /e[-_]?mail/i,
  /tel/i,
  /telefon/i,
  /ip/i,
  /user[_-]?agent/i,
  /ua/i,

  // tartalmi / üzleti / szakmai adatok
  /valasz/i,
  /válasz/i,
  /szoveg/i,
  /szöveg/i,
  /kerdes/i,
  /kérdés/i,
  /uzenet/i,
  /üzenet/i,
  /message/i,
  /warm/i,
  /prompt/i,
  /ai/i,
  /jellemzes/i,
  /jellemzés/i,
  /essze/i,
  /esszé/i,
  /szakmai/i,
  /megjegyzes/i,
  /megjegyzés/i,
  /reszlet/i,
  /részlet/i
];

// Ezek rövid, kontrollált enum/státusz jellegű stringek lehetnek.
const SAFE_STRING_KEY_PATTERNS = [
  /^action$/i,
  /^event$/i,
  /^type$/i,
  /^tipus$/i,
  /^típus$/i,
  /^status$/i,
  /^state$/i,
  /^role$/i,
  /^route$/i,
  /^method$/i,
  /^mode$/i,
  /^verzio$/i,
  /^version$/i,
  /^idoszak$/i,
  /^időszak$/i
];

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeActivityName(value) {
  return String(value || 'ismeretlen_muvelet')
    .replace(/[\r\n\t\0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ACTIVITY_LENGTH);
}

function hashValue(value) {
  return crypto
    .createHash('sha256')
    .update(String(value || ''), 'utf8')
    .digest('hex');
}

function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress || null;
}

function maskIp(ip) {
  const value = String(ip || '').trim();
  if (!value) return null;

  // IPv4: 192.168.1.42 -> 192.168.1.0
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    const parts = value.split('.');
    parts[3] = '0';
    return parts.join('.');
  }

  // IPv6 vagy proxyzott forma: csak hash-elhető/maszkolható jelzés.
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

function normalizeIpForLog(req) {
  const ip = getClientIp(req);
  if (!ip || IP_MODE === 'none') return null;

  if (IP_MODE === 'raw') return String(ip).slice(0, 120);
  if (IP_MODE === 'mask') return maskIp(ip);

  return `sha256:${hashValue(ip)}`;
}

function normalizeUserAgentForLog(req) {
  const ua = req?.get ? req.get('User-Agent') : req?.headers?.['user-agent'];
  if (!ua || UA_MODE === 'none') return null;

  const clean = String(ua).replace(/[\r\n\0]/g, ' ').trim();

  if (UA_MODE === 'raw') return clean.slice(0, 500);
  if (UA_MODE === 'hash') return `sha256:${hashValue(clean)}`;

  return clean.slice(0, 220);
}

function looksSensitiveString(value) {
  const text = String(value || '');

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) return true;
  if (/(?:\+?\d[\d\s().-]{7,}\d)/.test(text)) return true;
  if (/bearer\s+[a-z0-9._-]+/i.test(text)) return true;
  if (/^[a-f0-9]{32,}$/i.test(text)) return true;

  return false;
}

function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(String(key || '')));
}

function isSafeStringKey(key) {
  return SAFE_STRING_KEY_PATTERNS.some(pattern => pattern.test(String(key || '')));
}

function summarizeRedactedValue(value) {
  if (Array.isArray(value)) {
    return {
      torolve: true,
      ok: 'adattakarekossag',
      tipus: 'array',
      darab: value.length
    };
  }

  if (isPlainObject(value)) {
    return {
      torolve: true,
      ok: 'adattakarekossag',
      tipus: 'object',
      mezok: Object.keys(value).length
    };
  }

  if (typeof value === 'string') {
    return {
      torolve: true,
      ok: 'adattakarekossag',
      tipus: 'string',
      hossz: value.length
    };
  }

  return {
    torolve: true,
    ok: 'adattakarekossag',
    tipus: typeof value
  };
}

function sanitizeValue(value, key = '', depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) return null;

  if (isSensitiveKey(key)) {
    return summarizeRedactedValue(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return Number.isFinite(value) || typeof value === 'boolean' ? value : null;
  }

  if (typeof value === 'string') {
    const clean = value.replace(/[\r\n\0]/g, ' ').replace(/\s+/g, ' ').trim();

    if (!clean) return '';

    if (looksSensitiveString(clean)) {
      return summarizeRedactedValue(clean);
    }

    if (isSafeStringKey(key)) {
      return clean.slice(0, MAX_STRING_LENGTH);
    }

    // Nem ismert string mező: nem mentjük a tartalmat, csak azt, hogy volt ilyen adat.
    return summarizeRedactedValue(clean);
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) {
      return {
        torolve: true,
        ok: 'max_melyseg',
        tipus: 'array',
        darab: value.length
      };
    }

    return value.slice(0, MAX_ARRAY_ITEMS).map((item, index) => sanitizeValue(item, `${key}_${index}`, depth + 1, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return { torolve: true, ok: 'circular_reference' };
    }

    seen.add(value);

    if (!isPlainObject(value)) {
      return summarizeRedactedValue(String(value));
    }

    if (depth >= MAX_DEPTH) {
      return {
        torolve: true,
        ok: 'max_melyseg',
        tipus: 'object',
        mezok: Object.keys(value).length
      };
    }

    const out = {};

    for (const [childKey, childValue] of Object.entries(value)) {
      const cleanKey = String(childKey || '')
        .replace(/[\r\n\t\0]/g, '')
        .trim()
        .slice(0, 80);

      if (!cleanKey) continue;

      out[cleanKey] = sanitizeValue(childValue, cleanKey, depth + 1, seen);
    }

    return out;
  }

  return null;
}

function sanitizeDetails(details) {
  if (!details) return null;

  const sanitized = sanitizeValue(details);
  if (!sanitized) return null;

  let serialized = JSON.stringify(sanitized);

  if (serialized.length <= MAX_JSON_LENGTH) {
    return serialized;
  }

  const fallback = {
    torolve: true,
    ok: 'max_log_meret',
    eredeti_meret: serialized.length,
    max_meret: MAX_JSON_LENGTH,
    felso_szintu_mezok: isPlainObject(sanitized) ? Object.keys(sanitized).slice(0, 50) : []
  };

  serialized = JSON.stringify(fallback);
  return serialized.slice(0, MAX_JSON_LENGTH);
}

module.exports = (db) => {
  return function logActivity(req, felhasznalo_id, tevekenyseg, reszletek = null) {
    const userId = Number(felhasznalo_id);
    if (!Number.isInteger(userId) || userId <= 0) return;

    const activity = normalizeActivityName(tevekenyseg);
    const detailsJson = sanitizeDetails(reszletek);
    const eszkoInfo = normalizeUserAgentForLog(req);
    const ipCim = normalizeIpForLog(req);

    const sql = `
      INSERT INTO aktivitas_log
        (felhasznalo_id, tevekenyseg, reszletek, eskoz_info, ip_cim)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [userId, activity, detailsJson, eszkoInfo, ipCim], (err) => {
      if (err) {
        console.error('Aktivitásnapló mentési hiba:', {
          code: err.code,
          errno: err.errno,
          sqlState: err.sqlState
        });
      }
    });
  };
};
