export function normaliseText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsAny(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword));
}

function countMatches(text, keywords = []) {
  return keywords.reduce((count, keyword) => {
    return count + (text.includes(keyword) ? 1 : 0);
  }, 0);
}

export function classifyDocument({ message = '', filename = '', documentText = '' }) {
  const text = normaliseText(message);
  const file = normaliseText(filename);
  const doc = normaliseText(documentText);
  const combined = [text, file, doc].filter(Boolean).join(' ');

  const strictFormKeywords = [
    'fee review request form',
    'academic dismissal appeal form',
    'dismissal appeal form',
    'course withdrawal form',
    'application for postponement of studies',
    'postponement of studies',
    'deferment form',
    'rof-',
    'rof '
  ];

  const formFieldKeywords = [
    'reason for appeal',
    'reason for withdrawal',
    'fees to be reviewed',
    'semester to defer',
    'semester to postpone',
    'student signature',
    'signature & stamp'
  ];

  const transcriptKeywords = [
    'partial academic transcripts',
    'academic transcript',
    'official transcript',
    'transcript',
    'statement of results',
    'semester results',
    'result slip',
    'results slip',
    'cgpa',
    'gpa',
    'cumulative credits earned',
    'credits earned',
    'credit hours',
    'total credits earned',
    'student id',
    'programme',
    'semester :',
    'grade'
  ];

  const graduationDocumentKeywords = [
    'application for graduation',
    'semester to graduate',
    'programme checklist',
    'registrar’s office',
    'registrar office',
    'total credit to graduate',
    'completed 140 credits',
    'completed credits',
    'graduate'
  ];

  const graduationQuestionKeywords = [
    'eligible to graduate',
    'can i graduate',
    'graduation check',
    'credits remaining'
  ];

  const transcriptScore =
    countMatches(combined, transcriptKeywords) * 2 +
    (doc.includes('cgpa') ? 2 : 0) +
    (doc.includes('cumulative credits earned') ? 2 : 0) +
    (doc.includes('partial academic transcripts') ? 4 : 0);

  const graduationDocumentScore =
    countMatches(combined, graduationDocumentKeywords) * 2 +
    (doc.includes('application for graduation') ? 4 : 0) +
    (doc.includes('total credit to graduate') ? 3 : 0);

  const formScore =
    countMatches(combined, strictFormKeywords) * 3 +
    countMatches(combined, formFieldKeywords);

  let documentType = 'unknown_upload';
  let confidence = 0.35;
  const signals = [];

  if (transcriptScore >= 6) {
    documentType = 'transcript';
    confidence = transcriptScore >= 12 ? 0.96 : 0.88;
    signals.push('transcript-like keywords detected');
  }

  if (
    graduationDocumentScore >= 5 &&
    graduationDocumentScore > transcriptScore &&
    formScore < graduationDocumentScore
  ) {
    documentType = 'graduation_document';
    confidence = graduationDocumentScore >= 9 ? 0.93 : 0.82;
    signals.push('graduation-document keywords detected');
  }

  if (
    formScore >= 4 &&
    formScore > transcriptScore &&
    formScore >= graduationDocumentScore
  ) {
    documentType = 'form';
    confidence = formScore >= 8 ? 0.92 : 0.82;
    signals.push('form-like keywords detected');
  }

  if (
    documentType === 'unknown_upload' &&
    containsAny(combined, graduationQuestionKeywords)
  ) {
    documentType = 'graduation_document';
    confidence = 0.7;
    signals.push('graduation-related question keywords detected');
  }

  return {
    documentType,
    confidence,
    signals
  };
}