import { extractStudentId } from './extractStudentId.js';

function normaliseText(input) {
  return String(input || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstMatch(text, patterns = [], transform = (v) => v) {
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match && match[1] != null) {
      return transform(match[1]);
    }
  }
  return null;
}

function detectProgramme(text = '') {
  const value = String(text || '');

  const patterns = [
    /programme\s*[:\-]?\s*([^\n]+)/i,
    /program\s*[:\-]?\s*([^\n]+)/i,
    /course\s*[:\-]?\s*([^\n]+)/i
  ];

  return firstMatch(value, patterns, (v) => v.trim());
}

function extractCgpa(text = '') {
  return firstMatch(
    text,
    [
      /cgpa\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i,
      /cumulative gpa\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i
    ],
    (v) => parseFloat(v)
  );
}

function extractGpa(text = '') {
  return firstMatch(
    text,
    [
      /\bgpa\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i,
      /semester gpa\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i
    ],
    (v) => parseFloat(v)
  );
}

function extractCreditsCompleted(text = '') {
  return firstMatch(
    text,
    [
      /completed credit hours\s*(?:is|=|:)?\s*(\d+)/i,
      /credit hours completed\s*(?:is|=|:)?\s*(\d+)/i,
      /total credits earned\s*(?:is|=|:)?\s*(\d+)/i,
      /(\d+)\s*credits?\s*(?:completed|earned)?/i
    ],
    (v) => parseInt(v, 10)
  );
}

function extractStandingText(text = '') {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const hit = lines.find((line) =>
    /academic standing|good standing|probation|dismissal/i.test(line)
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
    warnings: text
      ? []
      : ['No readable transcript text was extracted.']
  };
}