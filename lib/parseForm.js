import { extractStudentId } from './extractStudentId.js';

function normaliseText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findProgramme(text = '') {
  const patterns = [
    /programme\s*[:\-]?\s*([^\n]+)/i,
    /program\s*[:\-]?\s*([^\n]+)/i
  ];

  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match && match[1]) return match[1].trim();
  }

  return null;
}

function detectMissingFields(text = '', formType = '') {
  const normalized = normaliseText(text);

  const rules = {
    fee_review_request: [
      'student name',
      'id no',
      'programme',
      'semester',
      'year',
      'fees to be reviewed'
    ],
    academic_dismissal_appeal: [
      'student id',
      'programme',
      'reason for appeal',
      'signature',
      'date'
    ],
    course_withdrawal: [
      'course code',
      'course title',
      'reason for withdrawal'
    ],
    postponement_of_studies: [
      'programme',
      'semester',
      'reason for postponement'
    ]
  };

  const fields = rules[formType] || [];
  return fields.filter((field) => !normalized.includes(field));
}

function resolveSubmitTo(formType = '') {
  const map = {
    fee_review_request: 'Bursary Department',
    academic_dismissal_appeal: 'Faculty Academic Office',
    course_withdrawal: 'Dean / School',
    postponement_of_studies: 'Academic Office'
  };

  return map[formType] || null;
}

export function parseForm({
  filename = '',
  extracted = {},
  formDetection = {},
  studentId = null
} = {}) {
  const text = String(extracted?.text || '');
  const title = extracted?.title || null;
  const resolvedStudentId = studentId || extractStudentId(text);
  const formType = formDetection?.formType || 'unknown_form';
  const programme = findProgramme(text);
  const missingFields = detectMissingFields(text, formType);

  return {
    documentType: 'form',
    filename: filename || null,
    title,
    formType,
    studentId: resolvedStudentId || null,
    programme: programme || null,
    submitTo: resolveSubmitTo(formType),
    missingFields,
    extractionConfidence: formDetection?.confidence ?? 0.5,
    signals: formDetection?.signals || []
  };
}