import { extractStudentId } from './extractStudentId.js';

function normaliseText(input) {
  return String(input || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getAllMatches(text, regex) {
  const matches = [];
  let match;
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');

  while ((match = re.exec(text)) !== null) {
    if (match[1] != null) matches.push(match[1]);
  }

  return matches;
}

function pickLastNumber(values = []) {
  const nums = values
    .map((v) => Number.parseFloat(String(v).trim()))
    .filter((v) => Number.isFinite(v));
  return nums.length ? nums[nums.length - 1] : null;
}

function pickLastInteger(values = []) {
  const nums = values
    .map((v) => Number.parseInt(String(v).trim(), 10))
    .filter((v) => Number.isFinite(v));
  return nums.length ? nums[nums.length - 1] : null;
}

function detectProgramme(text = '') {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  // Strong preference for full programme names in transcript pages
  const strongLine = lines.find((line) =>
    /bachelor of .* with honours|master of .*|diploma in .*|foundation in .*|doctor of philosophy|phd/i.test(line)
  );
  if (strongLine) return strongLine;

  // Fallback: line after "PROGRAMME"
  for (let i = 0; i < lines.length; i++) {
    if (/^programme\b/i.test(lines[i])) {
      const next = lines[i + 1] || '';
      if (next && !/student id|nric|passport|status|major/i.test(next)) {
        return next.trim();
      }
    }
  }

  return null;
}

function extractCgpa(text = '') {
  const matches = getAllMatches(
    text,
    /cgpa\s*[:=]?\s*(\d+(?:\.\d+)?)/ig
  );

  // Prefer realistic CGPA values only
  const valid = matches
    .map((v) => Number.parseFloat(v))
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 4.5);

  return valid.length ? valid[valid.length - 1] : null;
}

function extractGpa(text = '') {
  const matches = getAllMatches(
    text,
    /gpa\s*[:=]?\s*(\d+(?:\.\d+)?)/ig
  );

  const valid = matches
    .map((v) => Number.parseFloat(v))
    .filter((v) => Number.isFinite(v) && v >= 0 && v <= 4.5);

  return valid.length ? valid[valid.length - 1] : null;
}

function extractCreditsCompleted(text = '') {
  const cumulativeMatches = getAllMatches(
    text,
    /cumulative credits earned\s*[:=]?\s*(\d+)/ig
  );

  if (cumulativeMatches.length) {
    return pickLastInteger(cumulativeMatches);
  }

  const fallbackMatches = getAllMatches(
    text,
    /completed\s+(\d+)\s+credits/ig
  );

  if (fallbackMatches.length) {
    return pickLastInteger(fallbackMatches);
  }

  return null;
}

function extractStandingText(text = '') {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const hit = lines.find((line) =>
    /academic standing|good standing|probation|dismissal|active/i.test(line)
  );

  return hit || null;
}

function transcriptConfidence({ studentId, programme, cgpa, creditsCompleted }) {
  let score = 0.25;
  if (studentId) score += 0.2;
  if (programme) score += 0.2;
  if (cgpa != null) score += 0.2;
  if (creditsCompleted != null) score += 0.15;
  return Math.min(score, 0.95);
}

export function parseTranscript({ filename = '', extracted = {}, studentId = null } = {}) {
  const text = normaliseText(extracted?.text || '');
  const resolvedStudentId = studentId || extractStudentId(text);
  const programme = detectProgramme(text);
  const cgpa = extractCgpa(text);
  const gpa = extractGpa(text);
  const creditsCompleted = extractCreditsCompleted(text);
  const standingText = extractStandingText(text);

  return {
    documentType: 'transcript',
    filename: filename || null,
    title: extracted?.title || null,
    studentId: resolvedStudentId || null,
    programme: programme || null,
    cgpa,
    gpa,
    creditsCompleted,
    standingText,
    extractionConfidence: transcriptConfidence({
      studentId: resolvedStudentId,
      programme,
      cgpa,
      creditsCompleted
    }),
    warnings: text ? [] : ['No readable transcript text was extracted.']
  };
}