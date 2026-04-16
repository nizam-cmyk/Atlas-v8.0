import { extractDocumentText } from '../lib/extract.js';
import { classifyDocument } from '../lib/classify.js';
import { detectFormType } from '../lib/detectFormType.js';
import { parseTranscript } from '../lib/parseTranscript.js';
import { parseForm } from '../lib/parseForm.js';
import { extractStudentId, extractStudentThirdDigit } from '../lib/extractStudentId.js';
import {
  loadPrefixMap,
  loadRegistry,
  resolveIntakeFromStudentId,
  resolveHandbookMeta
} from '../lib/resolveIntake.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const message = body?.message || '';
    const fileMeta = body?.fileMeta || null;
    const rawText = body?.documentText || '';
    const fileUpload = body?.fileUpload || null;

    const filename = fileMeta?.filename || fileUpload?.filename || '';
    const mimeType = fileMeta?.type || fileUpload?.type || null;
    const base64String = fileUpload?.base64 || '';

    const extracted = await extractDocumentText({
      filename,
      rawText,
      fileUpload
    });

    const baseClassification = classifyDocument({
      message,
      filename,
      documentText: extracted?.text || ''
    });

    const formDetection = detectFormType({
      filename,
      documentText: extracted?.text || '',
      extractedTitle: extracted?.title || '',
      topLines: extracted?.topLines || []
    });

    const combinedIdentityText = [
      message,
      extracted?.text || '',
      extracted?.title || '',
      ...(extracted?.topLines || [])
    ].filter(Boolean).join(' ');

    const studentId = extractStudentId(combinedIdentityText);
    const studentThirdDigit = extractStudentThirdDigit(studentId);

    const prefixMap = loadPrefixMap();
    const registry = loadRegistry();

    const intakeMatch = resolveIntakeFromStudentId(studentId, prefixMap);
    const handbookMeta = intakeMatch?.intake
      ? resolveHandbookMeta(intakeMatch.intake, registry)
      : null;

    let documentType = baseClassification?.documentType || 'unknown_upload';
    let parsed = null;

    if (formDetection?.formType && formDetection.formType !== 'unknown_form') {
      documentType = 'form';
      parsed = parseForm({
        filename,
        extracted,
        formDetection,
        studentId
      });
    } else if (
      documentType === 'transcript' ||
      /cgpa|gpa|credit hours|statement of results|transcript/i.test(extracted?.text || '')
    ) {
      documentType = 'transcript';
      parsed = parseTranscript({
        filename,
        extracted,
        studentId
      });
    } else if (documentType === 'form') {
      parsed = parseForm({
        filename,
        extracted,
        formDetection,
        studentId
      });
    }

    const response = {
      success: Boolean(extracted?.success),
      filename,
      documentType,
      title: extracted?.title || null,
      extracted: {
        success: Boolean(extracted?.success),
        reason: extracted?.reason || null,
        topLines: extracted?.topLines || []
      },
      classification: {
        ...baseClassification,
        formType: formDetection?.formType || null,
        formConfidence: formDetection?.confidence ?? null,
        formSignals: formDetection?.signals || []
      },
      student: {
        studentId: studentId || null,
        studentThirdDigit: studentThirdDigit || null,
        intake: intakeMatch?.intake || null,
        handbookLabel: handbookMeta?.label || intakeMatch?.label || null,
        handbookVersion: handbookMeta?.version || intakeMatch?.version || null
      },
      parsed: parsed || null,
      debug: {
        filename,
        mimeType,
        hasRawText: Boolean(rawText),
        rawTextLength: rawText ? String(rawText).length : 0,
        hasBase64: Boolean(base64String),
        base64Length: base64String ? String(base64String).length : 0,
        extractedSuccess: Boolean(extracted?.success),
        extractedTextLength: extracted?.text ? String(extracted.text).length : 0
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('uploadDocument error:', error);
    return res.status(200).json({
      success: false,
      error: `ATLAS could not process the uploaded document: ${error.message}`
    });
  }
}