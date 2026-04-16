function handbookHeader(handbookContext = {}) {
  if (!handbookContext?.intake) return '';

  const lines = [
    'Handbook in Use:',
    `- Intake: ${handbookContext.intake}`,
    `- Handbook: ${handbookContext.label || 'Intake handbook'}`,
    `- Version: ${handbookContext.version || 'Not specified'}`
  ];

  if (handbookContext.studentId) {
    lines.push(`- Student ID: ${handbookContext.studentId}`);
  }

  return `${lines.join('\n')}\n\n`;
}

export function adviseStanding({
  cgpa = null,
  standingRules = null,
  handbookContext = {}
} = {}) {
  const minGood = standingRules?.rules?.good_status?.cgpa_min ?? 2.0;
  const header = handbookHeader(handbookContext);

  if (cgpa == null) {
    return {
      reference: 'Academic Standing',
      reply: `${header}ATLAS · standing

Issue Summary:
I need your CGPA to interpret your academic standing.

Handbook Basis:
- Good Status: CGPA ${minGood.toFixed(2)} and above
- Academic risk may begin below ${minGood.toFixed(2)}

Recommended Action:
Please provide your CGPA or upload your transcript.`
    };
  }

  const atRisk = cgpa < minGood;

  return {
    reference: 'Academic Standing',
    reply: `${header}ATLAS · standing

Detected CGPA:
${cgpa.toFixed(2)}

Interpretation:
${atRisk
  ? `Your CGPA is below the handbook threshold of ${minGood.toFixed(2)}. This may place you at academic risk or possible probation.`
  : `Your CGPA is at or above the handbook threshold of ${minGood.toFixed(2)} and is generally consistent with Good Status.`}

Important Note:
Final standing still depends on the official academic record and any multi-semester probation/dismissal pattern.`
  };
}

export function adviseGraduation({
  programme = null,
  creditsCompleted = null,
  graduationRule = null,
  handbookContext = {}
} = {}) {
  const header = handbookHeader(handbookContext);

  if (!programme) {
    return {
      reference: 'Graduation Rules',
      reply: `${header}ATLAS · graduation

Issue Summary:
I need your programme information before I can assess graduation progress.`
    };
  }

  if (!graduationRule?.required_total_credits) {
    return {
      reference: 'Graduation Rules',
      reply: `${header}ATLAS · graduation

Programme:
${programme}

Assessment:
I identified your programme, but the exact graduating-credit rule is not yet fully mapped in the current ATLAS dataset.`
    };
  }

  if (creditsCompleted == null) {
    return {
      reference: 'Graduation Rules',
      reply: `${header}ATLAS · graduation

Programme:
${programme}

Required Credits:
${graduationRule.required_total_credits}

Assessment:
I still need your completed credits to estimate graduation progress.`
    };
  }

  const remaining = Math.max(graduationRule.required_total_credits - creditsCompleted, 0);

  return {
    reference: 'Graduation Rules',
    reply: `${header}ATLAS · graduation

Programme:
${programme}

Required Credits:
${graduationRule.required_total_credits}

Completed Credits:
${creditsCompleted}

Assessment:
${remaining === 0
  ? 'You appear to have met the mapped credit requirement, pending compulsory components and official faculty confirmation.'
  : `You appear to need ${remaining} more credit(s) to reach the mapped graduation total.`}`
  };
}

export function adviseForm({
  parsedForm = null,
  handbookContext = {}
} = {}) {
  const header = handbookHeader(handbookContext);

  if (!parsedForm) {
    return {
      reference: 'Form Advisory',
      reply: `${header}ATLAS · form

Issue Summary:
I could not extract enough form information to advise reliably.`
    };
  }

  return {
    reference: 'Form Advisory',
    reply: `${header}ATLAS · form

Form Type:
${parsedForm.formType || 'Unknown'}

Title:
${parsedForm.title || 'Not identified'}

Student ID:
${parsedForm.studentId || 'Not identified'}

Programme:
${parsedForm.programme || 'Not identified'}

Submit To:
${parsedForm.submitTo || 'Please confirm from the official form'}

Missing Items:
${parsedForm.missingFields?.length
  ? parsedForm.missingFields.map((x) => `- ${x}`).join('\n')
  : '- No obvious missing fields detected from extracted text.'}`
  };
}

export function adviseTranscript({
  parsedTranscript = null,
  handbookContext = {}
} = {}) {
  const header = handbookHeader(handbookContext);

  if (!parsedTranscript) {
    return {
      reference: 'Transcript Advisory',
      reply: `${header}ATLAS · transcript

Issue Summary:
I could not extract enough readable transcript information.`
    };
  }

  return {
    reference: 'Transcript Advisory',
    reply: `${header}ATLAS · transcript

Detected Transcript Data:
- Student ID: ${parsedTranscript.studentId || 'Not identified'}
- Programme: ${parsedTranscript.programme || 'Not identified'}
- CGPA: ${parsedTranscript.cgpa != null ? parsedTranscript.cgpa.toFixed(2) : 'Not identified'}
- GPA: ${parsedTranscript.gpa != null ? parsedTranscript.gpa.toFixed(2) : 'Not identified'}
- Credits Completed: ${parsedTranscript.creditsCompleted != null ? parsedTranscript.creditsCompleted : 'Not identified'}

Standing Text:
${parsedTranscript.standingText || 'No standing phrase was detected in the extracted transcript text.'}`
  };
}