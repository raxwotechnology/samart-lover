const dns = require('dns').promises;

const BLOCKED_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
]);

const BLOCKED_LOCAL_PART_PATTERNS = [
  /^test/i,
  /^fake/i,
  /^example/i,
  /^demo/i,
  /^sample/i,
  /^asdf/i,
  /^qwerty/i,
  /^temp/i,
  /^user\d*$/i,
];

const isRealEmailAddress = async (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is required' };
  }

  const normalized = email.trim().toLowerCase();
  const parts = normalized.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'Invalid email format' };
  }

  const localPart = parts[0];
  const domain = parts[1];
  if (localPart.length < 3) {
    return { valid: false, reason: 'Email looks invalid. Please use your real email address.' };
  }
  if (BLOCKED_LOCAL_PART_PATTERNS.some((rx) => rx.test(localPart))) {
    return { valid: false, reason: 'Please use a real personal email address' };
  }
  if (BLOCKED_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Use a real email address (example/test domains are not allowed)' };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, reason: 'Email domain cannot receive email (no MX records found)' };
    }
  } catch (err) {
    return { valid: false, reason: 'Email domain is not valid or has no mail server' };
  }

  return { valid: true, normalizedEmail: normalized };
};

module.exports = {
  isRealEmailAddress,
};
