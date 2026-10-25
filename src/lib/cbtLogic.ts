import {
  BreakdownStat,
  CognitiveCategory,
  DifficultyLevel,
  DocumentWeekSelection,
  ExamAttempt,
  ExamResultSummary,
  ExtractedPassage,
  OptionId,
  PublicExamQuestion,
  QuestionNavState,
  QuestionOption,
  QuestionReviewItem,
  QuestionValidationCheck,
  QuestionValidationReport,
  StudentQuestionResponse,
  StudyDocument,
  ValidatedQuestion,
  WeeklySection,
} from '../types/cbt';

const WORD_TO_WEEK: Record<string, number> = {
  '1': 1,
  one: 1,
  first: 1,
  '2': 2,
  two: 2,
  second: 2,
  '3': 3,
  three: 3,
  third: 3,
  '4': 4,
  four: 4,
  fourth: 4,
  '5': 5,
  five: 5,
  fifth: 5,
  '6': 6,
  six: 6,
  sixth: 6,
  '7': 7,
  seven: 7,
  seventh: 7,
  '8': 8,
  eight: 8,
  eighth: 8,
  '9': 9,
  nine: 9,
  ninth: 9,
  '10': 10,
  ten: 10,
  tenth: 10,
  '11': 11,
  eleven: 11,
  eleventh: 11,
  '12': 12,
  twelve: 12,
  twelfth: 12,
};

export const COGNITIVE_CATEGORIES: CognitiveCategory[] = [
  'Recall and precise knowledge',
  'Conceptual understanding',
  'Application',
  'Analysis',
  'Multi-step reasoning and misconception detection',
];

/**
 * Target distribution for a 50-question exam (scaled proportionally for any count):
 * Recall: 5/50 (10%)
 * Conceptual: 10/50 (20%)
 * Application: 15/50 (30%)
 * Analysis: 10/50 (20%)
 * Multi-step & Misconception: 10/50 (20%)
 */
export function getTargetCognitiveDistribution(totalQuestions: number): Record<CognitiveCategory, number> {
  const recall = Math.round(totalQuestions * 0.1);
  const conceptual = Math.round(totalQuestions * 0.2);
  const application = Math.round(totalQuestions * 0.3);
  const analysis = Math.round(totalQuestions * 0.2);
  const multiStep = Math.max(0, totalQuestions - (recall + conceptual + application + analysis));

  return {
    'Recall and precise knowledge': recall,
    'Conceptual understanding': conceptual,
    Application: application,
    Analysis: analysis,
    'Multi-step reasoning and misconception detection': multiStep,
  };
}

/**
 * Automatically infers the academic subject from the document's content headers, title, or filename
 * so that uploading a file without manually changing the subject dropdown never mislabels the file as Mathematics.
 */
export function inferSubjectFromDocument(
  filenameOrSubject: string,
  customTitleOrFilename: string = '',
  extractedText: string = '',
  requestedSubjectArg?: string
): string {
  // Support both (filename, title, text, requestedSubject) and (requestedSubject, filename, text, title)
  const hasFourArgs = requestedSubjectArg !== undefined;
  const filename = hasFourArgs ? filenameOrSubject : customTitleOrFilename;
  const customTitle = hasFourArgs ? customTitleOrFilename : '';
  const cleanReq = (hasFourArgs ? requestedSubjectArg : filenameOrSubject || '').trim();
  const headerSlice = (extractedText || '').slice(0, 1800);

  // 1. Check for an explicit "SUBJECT: ..." line inside the document header
  const explicitSubjectMatch = headerSlice.match(
    /(?:^|\n)\s*(?:\*\*|#+\s*)?SUBJECT\s*:\s*\*?\*?\s*([^\n\r*]+)/i
  );
  if (explicitSubjectMatch) {
    const rawHeaderSubj = explicitSubjectMatch[1].replace(/[_-]+/g, ' ').trim();
    if (/\bmusic\b/i.test(rawHeaderSubj)) return 'Music';
    if (
      /\b(?:physical\s+and\s+health\s+education|physical\s*&\s*health|\bphe\b|physical\s+education)\b/i.test(
        rawHeaderSubj
      )
    ) {
      return 'Physical & Health Education';
    }
    if (/\bbasic\s*science\s*(?:&\s*technology\s*2|\btech)/i.test(rawHeaderSubj) || /\bbasic\s*technology\b/i.test(rawHeaderSubj)) {
      return 'Basic Technology';
    }
    if (/\bbasic\s*science\b/i.test(rawHeaderSubj)) return 'Basic Science';
    if (/\bmath(?:ematics|s)?\b/i.test(rawHeaderSubj)) return 'Mathematics';
    if (/\benglish\b/i.test(rawHeaderSubj)) return 'English Studies';
    if (/\bsocial\s*(?:and|&)\s*citizenship/i.test(rawHeaderSubj)) return 'Social & Citizenship Studies';
    if (/\bsocial\s*studies\b/i.test(rawHeaderSubj)) return 'Social Studies';
    if (/\bcivic\b/i.test(rawHeaderSubj)) return 'Civic Education';
    if (/\bdigital\s*tech/i.test(rawHeaderSubj)) return 'Digital Technology';
    if (/\bcomputer|\bict\b/i.test(rawHeaderSubj)) return 'Computer Studies';
    if (/\bhorticulture|\bcrop\s*production/i.test(rawHeaderSubj)) return 'Horticulture & Crop Production';
    if (/\bagric/i.test(rawHeaderSubj)) return 'Agricultural Science';
    if (/\bbusiness\s*studies/i.test(rawHeaderSubj)) return 'Business Studies';
    if (/\bcultural\s*(?:and|&)\s*creative\s*art/i.test(rawHeaderSubj)) return 'Cultural & Creative Art';
    if (/\bchristian\s*religious|\bcrs\b/i.test(rawHeaderSubj)) return 'Christian Religious Studies';
    if (/\bfrench\b/i.test(rawHeaderSubj)) return 'French';
    if (/\bhistory\b/i.test(rawHeaderSubj)) return 'History';
    if (/\byoruba\b|\bèdè\s*yorùbá/i.test(rawHeaderSubj)) return 'Yoruba';
    if (rawHeaderSubj.length >= 3 && rawHeaderSubj.length <= 60) {
      return rawHeaderSubj;
    }
  }

  // Replace underscores and hyphens with spaces so filenames like Grade_7_Music_100_Tricky_MCQs.md match word boundaries
  const combinedMeta = `${filename || ''} ${customTitle || ''} ${headerSlice}`
    .replace(/[_-]+/g, ' ')
    .toLowerCase();

  const detectFromKeywords = (text: string): string | null => {
    if (/\b(?:yoruba|yorùbá|alifabeeti|onkaro|ise\s+iranlowo)\b/i.test(text)) {
      return 'Yoruba';
    }
    if (/\b(?:french|français|saluer|épeler|conjugaison)\b/i.test(text)) {
      return 'French';
    }
    if (/\b(?:horticulture|crop\s+production|nursery\s+bed|fertilizer\s+application)\b/i.test(text)) {
      return 'Horticulture & Crop Production';
    }
    if (/\b(?:digital\s+technolog|microsoft\s+word|word\s+processor|central\s+processing\s+unit)\b/i.test(text)) {
      return 'Digital Technology';
    }
    if (/\b(?:business\s+studies|book\s+keeping|clerical\s+staff|sole\s+proprietorship|occupation)\b/i.test(text)) {
      return 'Business Studies';
    }
    if (/\b(?:christian\s+religious|\bcrs\b|disobedience\s+of\s+adam|reconciliation|repentance)\b/i.test(text)) {
      return 'Christian Religious Studies';
    }
    if (/\b(?:cultural\s+and\s+creative\s+art|cultural\s*&\s*creative\s*art|papier\s+mache|tie\s+and\s+dye|rudiments\s+of\s+art)\b/i.test(text)) {
      return 'Cultural & Creative Art';
    }
    if (/\b(?:basic\s+technology|workshop\s+safety|drawing\s+instruments|board\s+practice|freehand\s+sketching)\b/i.test(text)) {
      return 'Basic Technology';
    }
    if (/\b(?:history|historical\s+sources|nok\s+culture|ife\s+and\s+benin|igbo\s+ukwu|kanem\s+borno)\b/i.test(text)) {
      return 'History';
    }
    if (/\b(?:social\s+and\s+citizenship|social\s*&\s*citizenship|socialization|family\s+and\s+marriage)\b/i.test(text)) {
      return 'Social & Citizenship Studies';
    }
    if (
      /\b(?:music|musical|treble\s+clef|bass\s+clef|time\s+signature|semibreve|minim|crotchet|quaver|solfa|ledger\s+line|binary\s+form|ternary)\b/i.test(
        text
      )
    ) {
      return 'Music';
    }
    if (
      /\b(?:physical\s+and\s+health\s+education|physical\s*&\s*health\s+education|\bphe\b|physical\s+education|health\s+education|sewage\s+disposal|refuse\s+disposal|pathogens|athletics|gymnastics|swimming)\b/i.test(
        text
      )
    ) {
      return 'Physical & Health Education';
    }
    if (
      /\b(?:basic\s*science|biology|chemistry|physics|living\s+things|organelles|photosynthesis)\b/i.test(
        text
      )
    ) {
      return 'Basic Science';
    }
    if (
      /\b(?:english\s*studies|english\s*language|grammar|comprehension|literature|phonetics|part\s+of\s+speech)\b/i.test(
        text
      )
    ) {
      return 'English Studies';
    }
    if (/\b(?:social\s*studies|geography)\b/i.test(text)) {
      return 'Social Studies';
    }
    if (/\b(?:civic\s*education|citizenship)\b/i.test(text)) {
      return 'Civic Education';
    }
    if (/\b(?:agricultural\s*science|agriculture)\b/i.test(text)) {
      return 'Agricultural Science';
    }
    if (/\b(?:computer\s*studies|information\s+technology|\bict\b)\b/i.test(text)) {
      return 'Computer Studies';
    }
    if (
      /\b(?:mathematics|maths|algebra|arithmetic|geometry|bodmas|numeration)\b/i.test(
        text
      )
    ) {
      return 'Mathematics';
    }
    return null;
  };

  const detected = detectFromKeywords(combinedMeta);

  const isAutoOrDefault =
    !cleanReq ||
    /^auto(?:-detect)?$/i.test(cleanReq) ||
    /^general\s*studies$/i.test(cleanReq);

  if (isAutoOrDefault) {
    if (detected) return detected;
    const baseName = (customTitle || filename || '')
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(
        /\b(?:grade\s*\d+|jss\s*\d+|weeks?\s*\d+(?:\s*to\s*\d+|\s*-\s*\d+)?|\d+\s*tricky\s*mcqs?\s*bank|[0-9a-f]{8})\b/gi,
        ' '
      )
      .replace(/\s+/g, ' ')
      .trim();
    return baseName.length >= 3 ? baseName.slice(0, 50) : 'Uploaded Subject';
  }

  if (/^mathematics$/i.test(cleanReq) && detected && detected !== 'Mathematics') {
    return detected;
  }

  return cleanReq;
}

export interface ParsedMCQItem {
  questionNumber: number;
  stem: string;
  options: [string, string, string, string];
  correctOptionId: OptionId;
  explanation?: string;
}

/**
 * Parses an ANSWER KEY block (e.g. "1. **B** | 2. **A**" or "1. B") from a document.
 */
export function parseAnswerKeyMap(rawText: string): Map<number, OptionId> {
  const map = new Map<number, OptionId>();
  const answerKeyHeaderIdx = rawText.search(/(?:^|\n)\s*#*\s*ANSWER\s+KEY\b/i);
  const targetSlice = answerKeyHeaderIdx >= 0 ? rawText.slice(answerKeyHeaderIdx) : rawText;

  // Match patterns like "1. **B**", "1. B", "1) B", "Q1: C"
  const regex = /\b(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.):\-]\s*\*\*([A-D])\*\*|\b(\d{1,3})\s*[.):]\s*([A-D])(?=\s*\||\s*$|\s+\d{1,3}\s*[.):])/gm;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(targetSlice)) !== null) {
    const qNum = Number(m[1] || m[3]);
    const letter = (m[2] || m[4] || '').toUpperCase() as OptionId;
    if (qNum >= 1 && ['A', 'B', 'C', 'D'].includes(letter)) {
      map.set(qNum, letter);
    }
  }
  return map;
}

/**
 * Extracts structured multiple-choice questions (numbered stems + A/B/C/D options) from a text block.
 */
export function extractStructuredMCQsFromText(
  sectionText: string,
  answerKeyMap?: Map<number, OptionId>
): ParsedMCQItem[] {
  const items: ParsedMCQItem[] = [];
  const lines = sectionText.replace(/\r\n/g, '\n').split('\n');

  let currentQNum: number | null = null;
  let currentStemLines: string[] = [];
  let currentOptions: Partial<Record<OptionId, string>> = {};
  let inlineAnswer: OptionId | null = null;
  let inlineExplanation: string | undefined = undefined;

  const flushCurrent = () => {
    if (
      currentQNum !== null &&
      currentStemLines.length > 0 &&
      currentOptions.A &&
      currentOptions.B &&
      currentOptions.C &&
      currentOptions.D
    ) {
      const stem = currentStemLines
        .join(' ')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
      const ans: OptionId =
        inlineAnswer ||
        answerKeyMap?.get(currentQNum) ||
        'B';
      if (stem.length >= 10) {
        items.push({
          questionNumber: currentQNum,
          stem,
          options: [
            currentOptions.A.replace(/\*\*([^*]+)\*\*/g, '$1').trim(),
            currentOptions.B.replace(/\*\*([^*]+)\*\*/g, '$1').trim(),
            currentOptions.C.replace(/\*\*([^*]+)\*\*/g, '$1').trim(),
            currentOptions.D.replace(/\*\*([^*]+)\*\*/g, '$1').trim(),
          ],
          correctOptionId: ans,
          ...(inlineExplanation ? { explanation: inlineExplanation } : {}),
        });
      }
    }
    currentQNum = null;
    currentStemLines = [];
    currentOptions = {};
    inlineAnswer = null;
    inlineExplanation = undefined;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (/^#*\s*ANSWER\s+KEY\b/i.test(trimmed)) {
      break;
    }

    // Check for encoded serialized MCQ line
    if (trimmed.startsWith('@@MCQ@@')) {
      try {
        const parsed = JSON.parse(trimmed.slice(7)) as ParsedMCQItem;
        if (parsed && parsed.stem && Array.isArray(parsed.options) && parsed.options.length === 4) {
          items.push(parsed);
        }
      } catch {
        // Ignore malformed line
      }
      continue;
    }

    // Match question start: e.g. "1. A community builds..." or "14) Which of the following..."
    const qStart = trimmed.match(/^(?:Q(?:uestion)?\s*)?(\d{1,3})[.)]\s+(.+)$/i);
    if (qStart && !/^\d+[.)]\s*\*\*[A-D]\*\*/.test(trimmed)) {
      flushCurrent();
      currentQNum = Number(qStart[1]);
      currentStemLines = [qStart[2].trim()];
      continue;
    }

    // Match option line: e.g. "- A) Physical fitness" or "A. Physical fitness" or "(A) Physical fitness"
    const optMatch = trimmed.match(/^(?:[-*•]\s*)?\(?([A-D])[.)]\s+(.+)$/);
    if (optMatch && currentQNum !== null) {
      const letter = optMatch[1].toUpperCase() as OptionId;
      let optText = optMatch[2].trim();
      // Check if option has an inline correct marker like "[Correct]" or "✅"
      if (/\s*(?:\[correct\]|✓|✅)\s*$/i.test(optText)) {
        inlineAnswer = letter;
        optText = optText.replace(/\s*(?:\[correct\]|✓|✅)\s*$/i, '').trim();
      }
      currentOptions[letter] = optText;
      continue;
    }

    // Match inline "Answer: B" or "Correct Answer: C"
    const ansMatch = trimmed.match(/^(?:correct\s+)?answer\s*[:\-]\s*\*?\*?([A-D])\*?\*?\b/i);
    if (ansMatch && currentQNum !== null) {
      inlineAnswer = ansMatch[1].toUpperCase() as OptionId;
      continue;
    }

    // Match inline "Explanation: ..."
    const expMatch = trimmed.match(/^explanation\s*[:\-]\s*(.+)$/i);
    if (expMatch && currentQNum !== null) {
      inlineExplanation = expMatch[1].trim();
      continue;
    }

    // Continuation of question stem if options haven't started yet
    if (
      currentQNum !== null &&
      Object.keys(currentOptions).length === 0 &&
      !trimmed.startsWith('---') &&
      !trimmed.startsWith('###')
    ) {
      currentStemLines.push(trimmed);
    }
  }

  flushCurrent();
  return items;
}

/**
 * Detects whether a heading line is a Table of Contents reference rather than a real lesson header.
 */
function isTableOfContentsLine(line: string, followingLines: string[]): boolean {
  const trimmed = line.trim();
  if (/\.{3,}\s*\d+$/.test(trimmed)) return true;
  if (/\s+[-–—]\s*Page\s+\d+$/i.test(trimmed) && followingLines.length > 0) {
    const nextNonEmpty = followingLines.find((l) => l.trim().length > 0) || '';
    if (/^(?:weeks?|wk)\s*(?:1[0-2]|[1-9]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i.test(nextNonEmpty.trim())) {
      return true;
    }
  }
  return false;
}

/**
 * Parses raw document text into Week 1–12 sections and passages without fabricating missing weeks.
 */
export function detectWeeklySections(
  documentId: string,
  subject: string,
  rawText: string,
  ensureAllSixWeeks: boolean = false
): { weeks: WeeklySection[]; passages: ExtractedPassage[] } {
  const normalized = rawText.replace(/\r\n/g, '\n');
  const answerKeyMap = parseAnswerKeyMap(normalized);

  // Strip the trailing "## ANSWER KEY" section from lesson body so answer key tables are not treated as prose
  const answerKeyHeaderIdx = normalized.search(/(?:^|\n)\s*#+\s*ANSWER\s+KEY\b/i);
  const bodyWithoutAnswerKey =
    answerKeyHeaderIdx >= 0 ? normalized.slice(0, answerKeyHeaderIdx).trim() : normalized;

  const lines = bodyWithoutAnswerKey.split('\n');

  interface RawMatch {
    weekNumber: number;
    headingLine: string;
    lessonTitle: string;
    lineIndex: number;
    pageHint: string;
  }

  const matches: RawMatch[] = [];
  let currentPage = 'Page 1';
  let insideTocBlock = false;

  const headingRegex =
    /^(?:#+\s*)?(?:lesson\s+|unit\s+|module\s+)?(weeks?|wk)\s*(1[0-2]|[1-9]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b(?:\s*(?:and|&|to|[-–—])\s*(?:1[0-2]|[1-9]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b)?(?:\s*[:\-–—.]\s*(.*))?$/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const pageMatch = rawLine.match(/^(?:\[|\-\-\-\s*)?Page\s+(\d+)(?:\]|\s*\-\-\-)?$/i);
    if (pageMatch) {
      currentPage = `Page ${pageMatch[1]}`;
      continue;
    }

    if (/^table of contents$/i.test(rawLine)) {
      insideTocBlock = true;
      continue;
    }

    const m = rawLine.match(headingRegex);
    if (m) {
      const upcoming = lines.slice(i + 1, i + 6);
      if (isTableOfContentsLine(rawLine, upcoming)) {
        continue;
      }

      let proseCharsBeforeNextHeading = 0;
      for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
        const checkLine = lines[j].trim();
        if (!checkLine) continue;
        if (headingRegex.test(checkLine)) break;
        proseCharsBeforeNextHeading += checkLine.length;
      }

      if (insideTocBlock && proseCharsBeforeNextHeading < 80) {
        continue;
      }
      insideTocBlock = false;

      const weekToken = m[2].toLowerCase();
      const weekNumber = WORD_TO_WEEK[weekToken];
      if (!weekNumber || weekNumber < 1 || weekNumber > 12) continue;

      let lessonTitle = (m[3] || '')
        .replace(/\s*\(Questions\s+\d+[–\-]\d+\)\s*$/i, '')
        .trim();
      if (!lessonTitle && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && nextLine.length < 90 && !headingRegex.test(nextLine)) {
          lessonTitle = nextLine;
        }
      }
      if (!lessonTitle) {
        lessonTitle = `${subject} Week ${weekNumber} Lesson`;
      }

      matches.push({
        weekNumber,
        headingLine: rawLine.replace(/^#+\s*/, '').replace(/\s*\(Questions\s+\d+[–\-]\d+\)\s*$/i, ''),
        lessonTitle,
        lineIndex: i,
        pageHint: currentPage,
      });
    }
  }

  const weeksMap = new Map<number, WeeklySection>();
  const allPassages: ExtractedPassage[] = [];
  const distinctMatchedWeeks = new Set(matches.map((m) => m.weekNumber));

  if (matches.length === 0 || (ensureAllSixWeeks && distinctMatchedWeeks.size < 6)) {
    const cleanContent = bodyWithoutAnswerKey.trim();
    if (!cleanContent) {
      return { weeks: [], passages: [] };
    }

    const allStructuredMcqs = extractStructuredMCQsFromText(cleanContent, answerKeyMap);
    if (allStructuredMcqs.length >= 6) {
      const targetWeekCount = 6;
      const chunkSize = Math.max(1, Math.ceil(allStructuredMcqs.length / targetWeekCount));
      for (let wk = 1; wk <= targetWeekCount; wk++) {
        const slice = allStructuredMcqs.slice((wk - 1) * chunkSize, wk * chunkSize);
        if (slice.length === 0) continue;
        const wkContent = slice
          .map(
            (q) =>
              `${q.questionNumber}. ${q.stem}\n- A) ${q.options[0]}\n- B) ${q.options[1]}\n- C) ${q.options[2]}\n- D) ${q.options[3]}`
          )
          .join('\n\n');
        const lessonTitle = `${subject} — Unit ${wk} Assessment Concepts`;
        const heading = `Week ${wk}: ${lessonTitle}`;
        const pageRef = `Page ${wk}`;
        const weekPassages = splitIntoPassages(
          documentId,
          subject,
          wk,
          heading,
          lessonTitle,
          pageRef,
          wkContent,
          answerKeyMap
        );
        allPassages.push(...weekPassages);
        const words = wkContent.split(/\s+/).filter(Boolean).length;
        weeksMap.set(wk, {
          id: `${documentId}-wk-${wk}`,
          documentId,
          weekNumber: wk,
          detectedHeading: heading,
          lessonTitle,
          content: wkContent,
          preview: wkContent.slice(0, 260) + (wkContent.length > 260 ? '...' : ''),
          pageReference: pageRef,
          confidence: 'high',
          isConfirmed: true,
          wordCount: words,
          passageCount: weekPassages.length,
        });
      }
      return {
        weeks: Array.from(weeksMap.values()).sort((a, b) => a.weekNumber - b.weekNumber),
        passages: allPassages,
      };
    }

    const rawSentences = extractSentences(cleanContent).filter(
      (s) => !headingRegex.test(s.trim())
    );
    const linesFallback = cleanContent
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !headingRegex.test(l));
    const items = rawSentences.length >= 6 ? rawSentences : linesFallback;

    const targetWeekCount = Math.min(6, Math.max(1, items.length));
    const chunkSize = Math.max(1, Math.ceil(items.length / targetWeekCount));

    for (let wk = 1; wk <= targetWeekCount; wk++) {
      const slice = items.slice((wk - 1) * chunkSize, wk * chunkSize);
      const wkContent = (slice.length > 0 ? slice.join('\n') : cleanContent).trim();
      const existingMatch = matches.find((m) => m.weekNumber === wk);
      const lessonTitle = existingMatch
        ? existingMatch.lessonTitle
        : `${subject} — Unit ${wk} Core Concepts`;
      const heading = existingMatch ? existingMatch.headingLine : `Week ${wk}: ${lessonTitle}`;
      const pageRef = existingMatch ? existingMatch.pageHint : `Page ${wk}`;

      const weekPassages = splitIntoPassages(
        documentId,
        subject,
        wk,
        heading,
        lessonTitle,
        pageRef,
        wkContent,
        answerKeyMap
      );
      allPassages.push(...weekPassages);
      const words = wkContent.split(/\s+/).filter(Boolean).length;

      weeksMap.set(wk, {
        id: `${documentId}-wk-${wk}`,
        documentId,
        weekNumber: wk,
        detectedHeading: heading,
        lessonTitle,
        content: wkContent,
        preview: wkContent.slice(0, 260) + (wkContent.length > 260 ? '...' : ''),
        pageReference: pageRef,
        confidence: 'high',
        isConfirmed: true,
        wordCount: words,
        passageCount: weekPassages.length,
      });
    }

    return {
      weeks: Array.from(weeksMap.values()).sort((a, b) => a.weekNumber - b.weekNumber),
      passages: allPassages,
    };
  }

  for (let idx = 0; idx < matches.length; idx++) {
    const current = matches[idx];
    const nextLineIndex = idx + 1 < matches.length ? matches[idx + 1].lineIndex : lines.length;
    const sectionLines = lines.slice(current.lineIndex + 1, nextLineIndex);

    const pagesFound = new Set<string>([current.pageHint]);
    const cleanedLines: string[] = [];
    for (let sIdx = 0; sIdx < sectionLines.length; sIdx++) {
      const l = sectionLines[sIdx];
      const pm = l.trim().match(/^(?:\[|\-\-\-\s*)?Page\s+(\d+)(?:\]|\s*\-\-\-)?$/i);
      if (pm) {
        const hasFollowingProse = sectionLines
          .slice(sIdx + 1)
          .some((rem) => rem.trim().length > 0 && !/^(?:\[|\-\-\-\s*)?Page\s+\d+/i.test(rem.trim()));
        if (hasFollowingProse) {
          pagesFound.add(`Page ${pm[1]}`);
        }
      } else {
        cleanedLines.push(l);
      }
    }

    const content = cleanedLines.join('\n').trim();
    if (content.length < 30) {
      continue;
    }

    const pageArray = Array.from(pagesFound);
    const pageReference =
      pageArray.length > 1
        ? `${pageArray[0]}–${pageArray[pageArray.length - 1].replace('Page ', '')}`
        : pageArray[0];

    const words = content.split(/\s+/).filter(Boolean).length;
    const confidence: 'high' | 'medium' | 'needs_review' =
      words >= 60 ? 'high' : words >= 25 ? 'medium' : 'needs_review';

    const existing = weeksMap.get(current.weekNumber);
    const mergedContent = existing ? `${existing.content}\n\n${content}` : content;
    const mergedWords = mergedContent.split(/\s+/).filter(Boolean).length;

    const weekPassages = splitIntoPassages(
      documentId,
      subject,
      current.weekNumber,
      current.headingLine,
      current.lessonTitle,
      pageReference,
      mergedContent,
      answerKeyMap
    );

    for (let pIdx = allPassages.length - 1; pIdx >= 0; pIdx--) {
      if (allPassages[pIdx].weekNumber === current.weekNumber) {
        allPassages.splice(pIdx, 1);
      }
    }
    allPassages.push(...weekPassages);

    weeksMap.set(current.weekNumber, {
      id: `${documentId}-wk-${current.weekNumber}`,
      documentId,
      weekNumber: current.weekNumber,
      detectedHeading: current.headingLine,
      lessonTitle: existing ? existing.lessonTitle : current.lessonTitle,
      content: mergedContent,
      preview: mergedContent.slice(0, 260) + (mergedContent.length > 260 ? '...' : ''),
      pageReference,
      confidence,
      isConfirmed: confidence === 'high',
      wordCount: mergedWords,
      passageCount: weekPassages.length,
    });
  }

  const sortedWeeks = Array.from(weeksMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
  return { weeks: sortedWeeks, passages: allPassages };
}

export function splitIntoPassages(
  documentId: string,
  subject: string,
  weekNumber: number,
  sectionHeading: string,
  lessonTitle: string,
  pageReference: string,
  content: string,
  answerKeyMap?: Map<number, OptionId>
): ExtractedPassage[] {
  // Check if this week's content contains structured MCQs (e.g., Grade 7 Music or PHE MCQ banks)
  const structuredMcqs = extractStructuredMCQsFromText(content, answerKeyMap);
  if (structuredMcqs.length > 0) {
    const passages: ExtractedPassage[] = [];
    const chunkSize = 4;
    let passageIndex = 1;
    for (let i = 0; i < structuredMcqs.length; i += chunkSize) {
      const slice = structuredMcqs.slice(i, i + chunkSize);
      const serializedFacts = slice.map((item) => `@@MCQ@@${JSON.stringify(item)}`);
      const readableBlock = slice
        .map(
          (item) =>
            `${item.questionNumber}. ${item.stem} A) ${item.options[0]} B) ${item.options[1]} C) ${item.options[2]} D) ${item.options[3]}`
        )
        .join('\n');
      passages.push({
        id: `${documentId}-w${weekNumber}-p${passageIndex++}`,
        documentId,
        subject,
        weekNumber,
        sectionHeading,
        lessonTitle,
        pageReference,
        content: readableBlock,
        keyFacts: serializedFacts,
      });
    }
    return passages;
  }

  const extractedFacts = extractSentences(content);
  const paragraphs = content
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 20 && !isHeadingOrTemplateNoiseLine(p));

  const passages: ExtractedPassage[] = [];
  const sourceItems = extractedFacts.length > 0 ? extractedFacts : paragraphs;

  let buffer: string[] = [];
  let bufferChars = 0;
  let passageIndex = 1;

  for (const item of sourceItems) {
    if (bufferChars + item.length > 480 && buffer.length >= 2) {
      const joined = buffer.join(' ');
      passages.push({
        id: `${documentId}-w${weekNumber}-p${passageIndex++}`,
        documentId,
        subject,
        weekNumber,
        sectionHeading,
        lessonTitle,
        pageReference,
        content: joined,
        keyFacts: [...buffer],
      });
      buffer = [item];
      bufferChars = item.length;
    } else {
      buffer.push(item);
      bufferChars += item.length;
    }
  }

  if (buffer.length > 0) {
    const joined = buffer.join(' ');
    passages.push({
      id: `${documentId}-w${weekNumber}-p${passageIndex++}`,
      documentId,
      subject,
      weekNumber,
      sectionHeading,
      lessonTitle,
      pageReference,
      content: joined,
      keyFacts: [...buffer],
    });
  }

  return passages;
}

const ALLOWED_ACRONYMS = new Set([
  'DNA',
  'RNA',
  'ATP',
  'GPS',
  'HCF',
  'LCM',
  'HIV',
  'AIDS',
  'STI',
  'STD',
  'CPU',
  'RAM',
  'ROM',
  'USB',
  'LED',
  'LCD',
  'BODMAS',
  'BIDMAS',
  'PEMDAS',
  'SI',
  'WHO',
  'UNICEF',
  'UNESCO',
  'NAFDAC',
  'COVID',
  'BC',
  'AD',
  'AM',
  'PM',
  'II',
  'III',
  'IV',
  'VI',
  'VII',
  'VIII',
  'IX',
  'XL',
  'XC',
  'CD',
  'CM',
  'JSS',
  'SSS',
  'CRS',
  'CCA',
  'PHE',
  'NDLEA',
  'FRSC',
  'NEMA',
  'INEC',
  'EFCC',
  'ICPC',
  'ECOWAS',
]);

/**
 * Normalizes ALL-CAPS words ("bold letters") and strips markdown bold markers (** or __)
 * while preserving any inline LaTeX math segments ($...$) untouched.
 */
export function normalizeBoldAndAllCaps(text: string): string {
  if (!text) return '';
  const mathParts = text.split(/(\$[^$\n]+?\$)/g);
  return mathParts
    .map((part) => {
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        return part;
      }
      const noMarkdownBold = part
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1');

      return noMarkdownBold.replace(/\b([A-Z]{3,})\b/g, (word) => {
        if (ALLOWED_ACRONYMS.has(word)) return word;
        return word.toLowerCase();
      });
    })
    .join('');
}

/**
 * Detects ALL-CAPS topic headings, subheadings, school note template labels, and raw exercise prompt lists
 * so they are completely excluded from questions and options.
 */
function isHeadingOrTemplateNoiseLine(line: string): boolean {
  const trimmed = line.replace(/^[•▪◦*\-\s]+/, '').trim();
  if (!trimmed) return true;
  if (/^\d{1,4}$/.test(trimmed)) return true;
  if (/^(?:\[|\-\-\-\s*)?Page\s+\d+(?:\]|\s*\-\-\-)?$/i.test(trimmed)) return true;
  if (
    /^(?:week|wk)\s*(?:[1-9]|1[0-3]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (
    /^(?:Date\b|Topic\b|Objectives\/learning|outcomes\b|What I have learnt|Skills Acquired|My Question|Reflections|Action goal|ST FRANCIS CATHOLIC|1ST FRANCIS CATHOLIC|The Jesuit-Run|Scheme of Work|Behavioural Objectives|At the end of the lesson|students should be able to|PERIOD\s+[I12V]+|Example\s+\d+|Solution\s+\d+|Method\s+\d+|Simplify the following|Arrange the following|Convert the following|Express the following|Change the following|Round off\b|Approximate\b|Given\s+\d+|Recall that|Numerals\s+Words|Mass\s+Weight|Physical Properties of|Characteristics of|Properties of|Similarities between|Differences between|Uses of\b|Types of\b|Classification of\b|Rules For Rounding Off|Addition and Subtraction Using|Decimal Places and Significant|Physical changes during|Sexual reproduction in|Common Equipment)/i.test(
      trimmed
    )
  ) {
    return true;
  }

  if (/(?:\([a-g]\)|[a-g]\.\)|\b[a-g]\))\s*\S+.*(?:\([b-g]\)|[b-g]\.\)|\b[b-g]\))/i.test(trimmed)) {
    return true;
  }

  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 4) return true;
  const upperCount = trimmed.replace(/[^A-Z]/g, '').length;
  if (upperCount / letters.length >= 0.65) {
    return true;
  }

  if (letters.length / trimmed.length < 0.42) {
    return true;
  }

  const words = trimmed.split(/\s+/);
  if (
    words.length <= 7 &&
    !/[.!?:=]$/.test(trimmed) &&
    !trimmed.includes(':') &&
    !/\b(?:is|are|was|were|has|have|had|can|will|means|refers|controls|allows|loses|gains|starts|begins|represents|divides|stores|produces|requires|measures|equals)\b/i.test(
      trimmed
    )
  ) {
    return true;
  }

  return false;
}

function extractSentences(text: string): string[] {
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  const cleanedLines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i]
      .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F\u2010-\u2027\u2200-\u22FF×÷−≈≠≤≥]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!line) continue;

    line = line
      .replace(/^(?:Insight|Summary|Key words\/New terms|Application)\s+/i, '')
      .trim();

    const numWordMatch = line.match(
      /^(\d[\d\s,]{2,18}\d)\s+(One\s+[a-z\s]+|Ten\s+[a-z\s]+|One hundred\s+[a-z\s]+)$/i
    );
    if (numWordMatch) {
      cleanedLines.push(
        `The numeral ${numWordMatch[1].trim()}: it is written in words as ${numWordMatch[2]
          .trim()
          .toLowerCase()}.`
      );
      continue;
    }

    const eqMatch = line.match(
      /^(?:[a-g][.)]+\s*)?([−\-]?\d+)\s*([+\−\-×÷])\s*\(?([−\-]?\d+)\)?\s*=\s*(?:[^=]+=\s*)?([−\-]?\d+)\.?$/
    );
    if (eqMatch) {
      const a = Number(eqMatch[1].replace('−', '-'));
      const op = eqMatch[2];
      const b = Number(eqMatch[3].replace('−', '-'));
      const expected = Number(eqMatch[4].replace('−', '-'));
      let actual = NaN;
      if (op === '+') actual = a + b;
      else if (op === '-' || op === '−') actual = a - b;
      else if (op === '×') actual = a * b;
      else if (op === '÷' && b !== 0) actual = a / b;

      if (!Number.isNaN(actual) && actual === expected) {
        const cleanExpr = `${eqMatch[1]} ${op} ${eqMatch[3]}`;
        cleanedLines.push(`Simplifying ${cleanExpr}: the value obtained is ${expected}.`);
      }
      continue;
    }

    if (isHeadingOrTemplateNoiseLine(line)) {
      continue;
    }

    cleanedLines.push(line);
  }

  const unwrappedParagraphs: string[] = [];
  for (const line of cleanedLines) {
    const isNewBulletOrNumber =
      /^(?:[•▪◦*\-]|\d+[.)]|[iIvVxX]{1,4}[.)]|[a-g][.)])\s+/.test(line) ||
      /^[A-Z][A-Za-z\s\-()]{2,35}:\s+/.test(line);

    if (
      unwrappedParagraphs.length > 0 &&
      !isNewBulletOrNumber &&
      !/[.!?]["'”’)]?$/.test(unwrappedParagraphs[unwrappedParagraphs.length - 1])
    ) {
      unwrappedParagraphs[unwrappedParagraphs.length - 1] =
        `${unwrappedParagraphs[unwrappedParagraphs.length - 1]} ${line}`.replace(/\s+/g, ' ');
    } else {
      unwrappedParagraphs.push(line);
    }
  }

  const results: string[] = [];
  for (const para of unwrappedParagraphs) {
    const splitSentences = para
      .split(/(?<=[.!?]["'”’)]?)\s+/)
      .map((s) =>
        s
          .replace(/^(?:[•▪◦*\-]|\d+[.)]|[iIvVxX]{1,4}[.)]|[a-g][.)]+)\s+/, '')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter((s) => {
        if (s.length < 22) return false;
        if (isHeadingOrTemplateNoiseLine(s)) return false;
        if (
          /^(?:e\.g\.|i\.e\.|for instance|such as|note:|recall that|that is|he\s+|she\s+|if\s+a\s+|if\s+the\s+|one\s+lecture|a\s+pen\s+cost|let\s+|solve\s+|find\s+|calculate\s+|evaluate\s+|simplify\s+)/i.test(
            s
          )
        ) {
          return false;
        }
        if (/\b(?:him|her|his|my|i\s+learned|i'll|we\s+should|you\s+can|naira)\b/i.test(s)) return false;
        if (/[+\-×÷],\s*[+\-×÷]/.test(s)) return false;
        return /[a-z]{3,}/.test(s);
      });

    for (const s of splitSentences) {
      results.push(normalizeBoldAndAllCaps(s));
    }
  }

  return results;
}

/**
 * Strictly retrieves ONLY passages matching the student's selected documents and selected weeks.
 */
export function filterPassagesBySelection(
  documents: StudyDocument[],
  selections: DocumentWeekSelection[]
): ExtractedPassage[] {
  const result: ExtractedPassage[] = [];
  for (const sel of selections) {
    const doc = documents.find((d) => d.id === sel.documentId);
    if (!doc || doc.processingStatus === 'error') continue;
    const allowedWeeks = new Set(sel.selectedWeeks);
    for (const passage of doc.passages) {
      if (allowedWeeks.has(passage.weekNumber)) {
        result.push(passage);
      }
    }
  }
  return result;
}

/**
 * Estimates maximum supported unique questions from the selected passages without inventing facts.
 */
export function calculateSourceCapacity(passages: ExtractedPassage[]): {
  totalFacts: number;
  totalWords: number;
  maxSupportedQuestions: number;
} {
  if (passages.length === 0) {
    return { totalFacts: 0, totalWords: 0, maxSupportedQuestions: 0 };
  }
  let totalFacts = 0;
  let totalWords = 0;
  for (const p of passages) {
    totalFacts += Math.max(1, p.keyFacts.length);
    totalWords += p.content.split(/\s+/).filter(Boolean).length;
  }
  const capacityByFacts = totalFacts * 6;
  const capacityByWords = Math.floor(totalWords / 10);
  const maxSupportedQuestions = Math.min(120, Math.max(capacityByFacts, capacityByWords));
  return { totalFacts, totalWords, maxSupportedQuestions };
}

/**
 * Validates that a generated question meets all quality-control rules.
 */
export function validateQuestionQuality(q: ValidatedQuestion): { valid: boolean; reason?: string } {
  if (!q.questionText || q.questionText.trim().length < 10) {
    return { valid: false, reason: 'Question stem is too short or empty' };
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return { valid: false, reason: 'Must have exactly 4 answer options' };
  }
  const expectedIds: OptionId[] = ['A', 'B', 'C', 'D'];
  const seenTexts = new Set<string>();
  for (let i = 0; i < 4; i++) {
    const opt = q.options[i];
    if (!opt || opt.id !== expectedIds[i] || !opt.text || opt.text.trim().length < 1) {
      return { valid: false, reason: `Invalid or empty option at position ${i}` };
    }
    const normalizedOpt = opt.text.trim().toLowerCase();
    if (
      normalizedOpt.includes('all of the above') ||
      normalizedOpt.includes('none of the above')
    ) {
      return { valid: false, reason: 'Prohibited option phrase (all/none of the above)' };
    }
    if (seenTexts.has(normalizedOpt)) {
      return { valid: false, reason: 'Duplicate option text within question' };
    }
    seenTexts.add(normalizedOpt);
  }
  if (!expectedIds.includes(q.correctOptionId)) {
    return { valid: false, reason: 'Invalid correctOptionId' };
  }
  if (!q.explanation || q.explanation.trim().length < 10) {
    return { valid: false, reason: 'Missing or insufficient explanation' };
  }
  if (!q.sourceDocumentId || !q.weekNumber || !q.supportingExcerpt) {
    return { valid: false, reason: 'Missing source provenance (document, week, or excerpt)' };
  }
  return { valid: true };
}

/**
 * Inspects a string containing LaTeX math delimiters for malformed syntax or unsafe commands
 * so invalid expressions can be rendered safely as a fallback and flagged for administrator review.
 */
export function detectMalformedLatex(text: string): {
  malformed: boolean;
  issues: string[];
} {
  if (!text) return { malformed: false, issues: [] };
  const issues: string[] = [];

  // Check for dangerous / untrusted LaTeX commands
  if (
    /\\(?:href|url|htmlData|htmlId|htmlClass|htmlStyle|includegraphics|input|include|write18|def|let|csname)\b/i.test(
      text
    )
  ) {
    issues.push('Contains restricted LaTeX macro or external command');
  }

  // Strip valid $$...$$ blocks first, then count remaining unescaped $
  const withoutDisplay = text.replace(/\$\$[\s\S]+?\$\$/g, '');
  const singleDollars = withoutDisplay.match(/(?<!\\)\$/g) || [];
  if (singleDollars.length % 2 !== 0) {
    issues.push('Unclosed inline math delimiter ($)');
  }

  // Inspect each math block for unbalanced braces or incomplete \frac / \sqrt
  const mathBlocks = text.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g) || [];
  for (const rawBlock of mathBlocks) {
    const inner = rawBlock.startsWith('$$') ? rawBlock.slice(2, -2) : rawBlock.slice(1, -1);
    let depth = 0;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '{' && inner[i - 1] !== '\\') depth++;
      else if (inner[i] === '}' && inner[i - 1] !== '\\') depth--;
      if (depth < 0) break;
    }
    if (depth !== 0) {
      issues.push(`Unbalanced curly braces in math expression: ${rawBlock}`);
    }
    if (/\\frac\s*(?!\{)/.test(inner) || /\\sqrt\s*$/.test(inner.trim())) {
      issues.push(`Incomplete \\frac or \\sqrt command in: ${rawBlock}`);
    }
  }

  return {
    malformed: issues.length > 0,
    issues,
  };
}

/**
 * Ensures all mathematical expressions, equations, exponents, fractions, square roots, Greek symbols,
 * and formulas in any stem, option, or explanation consistently use KaTeX-compatible ($...$) LaTeX syntax.
 */
export function formatMathExpressionsToKaTeX(text: string): string {
  if (!text) return '';

  // Normalize \( ... \) -> $ ... $ and \[ ... \] -> $$ ... $$
  let preNormalized = text
    .replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');

  // Convert parenthesized raw LaTeX expressions such as (\frac{a+b}{c}), (\sqrt{49} = 7), (\alpha, \theta, \pi)
  preNormalized = preNormalized.replace(
    /\(\s*(\\(?:frac|sqrt|alpha|beta|gamma|theta|pi|sum|int|le|ge|neq)[^()]*)\s*\)/g,
    '$$$1$$'
  );

  // Split by existing display ($$...$$) or inline ($...$) math blocks so we do not double-wrap
  const segments = preNormalized.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  return segments
    .map((segment) => {
      if (
        (segment.startsWith('$$') && segment.endsWith('$$') && segment.length > 4) ||
        (segment.startsWith('$') && segment.endsWith('$') && segment.length > 2)
      ) {
        const isDisplay = segment.startsWith('$$');
        const inner = isDisplay ? segment.slice(2, -2) : segment.slice(1, -1);
        const normalizedInner = inner
          .replace(/\^\(([a-zA-Z0-9+\-−]+)\)/g, '^{$1}')
          .replace(/([a-zA-Z0-9)\]}])\s*\*\s*([a-zA-Z0-9(\[{])/g, '$1 \\times $2')
          .replace(/×/g, '\\times ')
          .replace(/÷/g, '\\div ')
          .replace(/≤/g, '\\le ')
          .replace(/≥/g, '\\ge ')
          .replace(/≠/g, '\\neq ')
          .replace(/±/g, '\\pm ')
          .replace(/°/g, '^\\circ ');
        return isDisplay ? `$$${normalizedInner}$$` : `$${normalizedInner}$`;
      }

      let out = segment;

      // 0. Bare LaTeX \frac{a}{b} or \sqrt{x} outside $...$
      out = out.replace(
        /\\frac\{([^{}]+)\}\{([^{}]+)\}(?:\s*=\s*([−\-]?\d+(?:\.\d+)?))?/g,
        (_m, num, den, rhs) => (rhs ? `$\\frac{${num}}{${den}} = ${rhs}$` : `$\\frac{${num}}{${den}}$`)
      );
      out = out.replace(
        /\\sqrt\{([^{}]+)\}(?:\s*=\s*([−\-]?\d+(?:\.\d+)?))?/g,
        (_m, rad, rhs) => (rhs ? `$\\sqrt{${rad}} = ${rhs}$` : `$\\sqrt{${rad}}$`)
      );

      // 1. Laws of indices & exponent equations: e.g. "a^m * a^n = a^(m+n)", "a^m / a^n = a^(m-n)", "a^0 = 1"
      out = out.replace(
        /\b([a-zA-Z0-9]+)\^(\([a-zA-Z0-9+\-]+\)|[a-zA-Z0-9]+)\s*([*×/÷])\s*([a-zA-Z0-9]+)\^(\([a-zA-Z0-9+\-]+\)|[a-zA-Z0-9]+)\s*=\s*([a-zA-Z0-9]+)\^(\([a-zA-Z0-9+\-]+\)|[a-zA-Z0-9]+)/g,
        (_m, b1, e1, op, b2, e2, b3, e3) => {
          const cleanE1 = e1.startsWith('(') ? `{${e1.slice(1, -1)}}` : e1.length > 1 ? `{${e1}}` : e1;
          const cleanE2 = e2.startsWith('(') ? `{${e2.slice(1, -1)}}` : e2.length > 1 ? `{${e2}}` : e2;
          const cleanE3 = e3.startsWith('(') ? `{${e3.slice(1, -1)}}` : e3.length > 1 ? `{${e3}}` : e3;
          const latexOp = op === '*' || op === '×' ? '\\times' : '\\div';
          return `$${b1}^${cleanE1} ${latexOp} ${b2}^${cleanE2} = ${b3}^${cleanE3}$`;
        }
      );

      // 2. Simple power equality: e.g. "a^0 = 1", "10^6 = 1000000"
      out = out.replace(
        /\b([a-zA-Z0-9]+)\^(\([a-zA-Z0-9+\-]+\)|\{[a-zA-Z0-9+\-]+\}|[a-zA-Z0-9+\-]+)\s*=\s*([−\-]?\d+(?:\.\d+)?)\b/g,
        (_m, base, exp, rhs) => {
          const cleanExp = exp.startsWith('(')
            ? `{${exp.slice(1, -1)}}`
            : exp.startsWith('{')
            ? exp
            : exp.length > 1
            ? `{${exp}}`
            : exp;
          return `$${base}^${cleanExp} = ${rhs.replace('−', '-')}$`;
        }
      );

      // 3. Geometric & algebraic formulas: e.g. "A = 0.5 * b * h", "V = l * w * h", "P = 2(l + w)"
      out = out.replace(
        /\b([A-Z])\s*=\s*0\.5\s*[*×]\s*([a-zA-Z])\s*[*×]\s*([a-zA-Z])\b/g,
        '$$$1 = \\frac{1}{2}$2$3$$'
      );
      out = out.replace(
        /\b([A-Z])\s*=\s*([a-zA-Z0-9]+)\s*([*×+\-])\s*([a-zA-Z0-9]+)(?:\s*([*×+\-])\s*([a-zA-Z0-9]+))?\b/g,
        (_m, lhs, t1, op1, t2, op2, t3) => {
          const lOp1 = op1 === '*' || op1 === '×' ? '\\times' : op1;
          if (op2 && t3) {
            const lOp2 = op2 === '*' || op2 === '×' ? '\\times' : op2;
            return `$${lhs} = ${t1} ${lOp1} ${t2} ${lOp2} ${t3}$`;
          }
          return `$${lhs} = ${t1} ${lOp1} ${t2}$`;
        }
      );

      // 4. Worked linear or arithmetic equations & inequalities: e.g. "2x + 5 = 17", "2x + 5 <= 13"
      out = out.replace(
        /(?<![a-zA-Z0-9$])([−\-]?\d+(?:\.\d+)?[a-zA-Z]?)\s*([+\−\-×*÷/])\s*\(?([−\-]?\d+(?:\.\d+)?[a-zA-Z]?)\)?\s*(=|<=|>=|!=|≤|≥|≠)\s*([−\-]?\d+(?:\.\d+)?[a-zA-Z]?)(?![a-zA-Z0-9$])/g,
        (_m, a, op, b, rel, c) => {
          const lOp =
            op === '*' || op === '×'
              ? '\\times'
              : op === '/' || op === '÷'
              ? '\\div'
              : op === '−'
              ? '-'
              : op;
          const lRel =
            rel === '<=' || rel === '≤'
              ? '\\le'
              : rel === '>=' || rel === '≥'
              ? '\\ge'
              : rel === '!=' || rel === '≠'
              ? '\\neq'
              : '=';
          return `$${a.replace('−', '-')} ${lOp} ${b.replace('−', '-')} ${lRel} ${c.replace('−', '-')}$`;
        }
      );

      // 5. Standalone exponent expressions: e.g. "10^6", "10^{-3}", "x^2"
      out = out.replace(
        /(?<![a-zA-Z0-9$\\])([a-zA-Z0-9]+)\^(\([a-zA-Z0-9+\-]+\)|\{[a-zA-Z0-9+\-]+\}|[\-]?[0-9]{1,3}|[a-zA-Z])(?![a-zA-Z0-9$])/g,
        (_m, base, exp) => {
          const cleanExp = exp.startsWith('(')
            ? `{${exp.slice(1, -1)}}`
            : exp.startsWith('{')
            ? exp
            : exp.length > 1
            ? `{${exp}}`
            : exp;
          return `$${base}^${cleanExp}$`;
        }
      );

      // 6. Standalone numeric fractions: e.g. "3/4", "5/8" (not dates like 10/12/2026)
      out = out.replace(
        /(?<![a-zA-Z0-9$/\\])(\d{1,3})\/(\d{1,3})(?![a-zA-Z0-9$/])/g,
        (_m, num, den) => `$\\frac{${num}}{${den}}$`
      );

      // 7. Degree values: e.g. "90 degrees", "180 degrees", "90°"
      out = out.replace(/\b(\d{1,3})\s*(?:°|degrees\b)/gi, '$$$1^\\circ$$');

      return out;
    })
    .join('');
}

export function stripWeekReferences(text: string): string {
  if (!text) return '';
  const mathNormalized = formatMathExpressionsToKaTeX(text);
  const mathParts = mathNormalized.split(/(\$[^$\n]+?\$)/g);
  return mathParts
    .map((part) => {
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        return part;
      }
      return part
        .replace(
          /\b(?:in|during|from|for|of)?\s*(?:weeks?|wk|lesson|unit|module|period)\s*(?:1[0-2]|[1-9]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)\b(?:\s*[:\-–—,]?\s*)?/gi,
          ' '
        )
        .replace(
          /\b(?:found\s+in|in|from|according\s+to|based\s+on|stated\s+in|taught\s+in)?\s*(?:the\s+)?(?:uploaded\s+|verified\s+)?(?:study\s+material|source\s+material|lesson\s+material|study\s+notes|lesson\s+notes|source\s+passage|study\s+guide|uploaded\s+notes)\b/gi,
          ' '
        )
        .replace(/\b(?:in\s+a\s+(?:grade\s*\d+\s+|school\s+)?examination\s*,?\s*)/gi, ' ')
        .replace(/\s*,?\s*and\s+(?:why|state\s+the\s+complete\s+step-by-step\s+justification)\s*\?/gi, '?')
        .replace(/\bpage\s+\d+(?:[–-]\d+)?\b/gi, ' ')
        .replace(/\[Page\s+\d+\]/gi, ' ')
        .replace(/\s*\((?:Item|Case|Question)\s+\d+\)/gi, '');
    })
    .join('')
    .replace(/\s+,/g, ',')
    .replace(/\s+\?/g, '?')
    .replace(/\s+\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatCleanOptionText(str: string): string {
  const cleaned = stripWeekReferences(normalizeBoldAndAllCaps(str))
    .replace(/^(?:[•▪◦*\-]|\d+[.)]|[iIvVxX]{1,4}[.)]|[a-g][.)]+)\s+/, '')
    .replace(/^also\s+/i, '')
    .replace(/^because\s+/i, '')
    .replace(
      /(?<=\S)\s*,?\s*\b(?:because|since\s+it\s+is|which\s+serves\s+as|which\s+operates\s+in|which\s+directly\s+explains)\b.+$/i,
      ''
    )
    .replace(/\b(?:all|none)\s+of\s+the\s+above\b/gi, 'all listed characteristics')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const capitalized = capitalizeFirst(cleaned);
  const wordCount = capitalized.split(/\s+/).filter(Boolean).length;
  // Keep short terms, numeric values, and math expressions clean without forcing a trailing period
  if (wordCount <= 6 || capitalized.endsWith('$')) {
    return capitalized.replace(/[.,;:]$/, '');
  }
  if (/[.!?]["'”’)$]?$/.test(capitalized)) {
    return capitalized;
  }
  return `${capitalized.replace(/[,;:]$/, '')}.`;
}

function capitalizeFirst(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('$')) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function decapitalize(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('$')) return trimmed;
  if (/^[A-Z]{2,}\b/.test(trimmed)) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

/**
 * Extracts a clean, natural, Grade-7-friendly clause directly from a sentence in the uploaded file.
 */
function extractKeyPointClause(rawClause: string, maxWords: number = 22): string {
  let cleaned = stripWeekReferences(normalizeBoldAndAllCaps(rawClause))
    .replace(/^(?:[•▪◦*\-]|\d+[.)]|[iIvVxX]{1,4}[.)]|[a-g][.)]+)\s+/, '')
    .replace(/^[A-Za-z][A-Za-z0-9\s\-()/]{1,35}:\s+/, '')
    .replace(
      /^(?:this is|is the|it is defined as|it is also|they are also|it is|they are|also|refers to|means that|states that|can be described as)\s+/i,
      ''
    )
    .replace(/^be\s+(reduced|expressed|converted|written|divided|multiplied)\b/i, 'can be $1')
    .replace(/\s*-\s+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  // Split at secondary sentences if there are multiple sentences
  const sentenceParts = cleaned.split(/\.\s+/);
  if (sentenceParts[0] && sentenceParts[0].trim().split(/\s+/).length >= 4) {
    cleaned = sentenceParts[0].trim();
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) {
    const sub = words.slice(0, maxWords).join(' ');
    const lastComma = Math.max(sub.lastIndexOf(', '), sub.lastIndexOf('; '));
    if (lastComma > 28) {
      cleaned = sub.slice(0, lastComma).trim();
    } else {
      const sliceWords = words.slice(0, maxWords);
      while (
        sliceWords.length > 4 &&
        /^(?:the|a|an|of|in|to|for|with|on|at|from|by|and|or|as|that|which|is|are|was|were|be|been|into|through|between|its|their|because|while|whereas|further|establishes|characterized|include|includes|such|how|when|where|who)$/i.test(
          sliceWords[sliceWords.length - 1].replace(/[.,;:]$/, '')
        )
      ) {
        sliceWords.pop();
      }
      cleaned = sliceWords.join(' ');
    }
  }

  return cleaned.replace(/[,;:.]+$/, '').trim();
}

/**
 * Formats an option cleanly as a standard school examination choice without appending artificial reasons or meta-text.
 */
export function ensureConsiderableOptionLength(
  baseText: string,
  _secondaryContext: string = '',
  _subject: string = 'General',
  _targetWordCount: number = 14
): string {
  let cleaned = stripWeekReferences(normalizeBoldAndAllCaps(baseText))
    .replace(/^(?:[•▪◦*\-]|\d+[.)]|[iIvVxX]{1,4}[.)]|[a-g][.)]+)\s+/, '')
    .replace(/\s*,\s*because\s+it\s+is\s+defined.*$/i, '')
    .replace(/\s*-\s+/g, '-')
    .replace(/[,;:.]+$/, '')
    .trim();

  const finalWords = cleaned.split(/\s+/).filter(Boolean);
  if (finalWords.length > 28 && !cleaned.includes('$')) {
    const sub = finalWords.slice(0, 26).join(' ');
    const lastPunct = Math.max(sub.lastIndexOf(', '), sub.lastIndexOf('; '));
    if (lastPunct > 45) {
      cleaned = sub.slice(0, lastPunct).trim();
    }
  }

  return formatCleanOptionText(cleaned);
}

/**
 * Normalizes option texts as clean, plausible, parallel examination choices without embedded reasons,
 * and places the correct answer at targetCorrectId (A, B, C, or D).
 */
function buildBalancedOptions(
  correctText: string,
  distractors: string[],
  fallbackPool: string[],
  targetCorrectId: OptionId,
  misconceptionNotes: [string, string, string],
  subject: string = 'General'
): {
  options: [QuestionOption, QuestionOption, QuestionOption, QuestionOption];
  distractorRationales: Record<OptionId, string>;
} {
  const ids: OptionId[] = ['A', 'B', 'C', 'D'];
  const correctIdx = ids.indexOf(targetCorrectId);
  const options: QuestionOption[] = [];
  const distractorRationales: Record<OptionId, string> = {
    A: '',
    B: '',
    C: '',
    D: '',
  };

  const formattedCorrect = ensureConsiderableOptionLength(correctText, '', subject);
  const usedOptionLower = new Set<string>([formattedCorrect.toLowerCase()]);

  const candidateDistractors = [...distractors, ...fallbackPool];
  let dCursor = 0;
  let noteCursor = 0;

  for (let i = 0; i < 4; i++) {
    const id = ids[i];
    if (i === correctIdx) {
      options.push({ id, text: formattedCorrect });
      distractorRationales[id] =
        'This option is accurate and directly supported by the curriculum principles.';
    } else {
      let chosen = '';
      while (dCursor < candidateDistractors.length) {
        const rawCand = candidateDistractors[dCursor++];
        if (!rawCand || rawCand.trim().length < 1) continue;
        const candidate = ensureConsiderableOptionLength(rawCand, '', subject);
        if (candidate.length >= 1 && !usedOptionLower.has(candidate.toLowerCase())) {
          chosen = candidate;
          break;
        }
      }
      if (!chosen) {
        const swappedRaw = invertDetailedStatement(correctText, noteCursor + 1);
        const swapped = swappedRaw
          ? ensureConsiderableOptionLength(swappedRaw, '', subject)
          : '';
        if (swapped.length >= 1 && !usedOptionLower.has(swapped.toLowerCase())) {
          chosen = swapped;
        } else {
          const cleanBase = extractKeyPointClause(correctText, 12);
          const fallbackVariants = [
            `Operates independently of ${decapitalize(cleanBase)}`,
            `Varies inversely with ${decapitalize(cleanBase)}`,
            `Prevents ${decapitalize(cleanBase)} from occurring`,
          ];
          const fb = ensureConsiderableOptionLength(
            fallbackVariants[noteCursor % fallbackVariants.length],
            '',
            subject
          );
          chosen = !usedOptionLower.has(fb.toLowerCase())
            ? fb
            : formatCleanOptionText(`${fb.replace(/\.$/, '')} (variant ${noteCursor + 1})`);
        }
      }
      usedOptionLower.add(chosen.toLowerCase());
      const dNote = misconceptionNotes[noteCursor] || misconceptionNotes[0];
      options.push({ id, text: chosen });
      distractorRationales[id] = dNote;
      noteCursor++;
    }
  }

  return {
    options: options as [QuestionOption, QuestionOption, QuestionOption, QuestionOption],
    distractorRationales,
  };
}

interface PrebuiltQuestionBlueprint {
  stem: string;
  correctText: string;
  distractors: [string, string, string];
  misconceptionNotes: [string, string, string];
  explanation: string;
  supportingExcerpt: string;
  conceptLabel: string;
}

interface ParsedConceptUnit {
  passage: ExtractedPassage;
  sentence: string;
  shortTerm: string;
  hasExplicitTerm: boolean;
  detailedPrimaryFact: string;
  detailedSecondaryFact: string;
  comprehensiveStatement: string;
  prebuiltBlueprint?: PrebuiltQuestionBlueprint;
}

/**
 * Generates a rich bank of Grade 7 Mathematics calculation and worked problem-solving items
 * across Weeks 1 to 6 using authentic LaTeX ($...$) notation and detailed, equal-length options
 * containing all key calculation steps and mathematical principles.
 */
function buildMathCalculationBlueprintsForWeek(
  weekNumber: number
): PrebuiltQuestionBlueprint[] {
  const wk = ((weekNumber - 1) % 6) + 1;

  if (wk === 1) {
    return [
      {
        stem: 'What is the place value and exact numerical value of the digit $7$ in the whole number $472\\,850\\,000$?',
        correctText: 'Ten millions ($70\\,000\\,000$)',
        distractors: [
          'Hundred millions ($700\\,000\\,000$)',
          'Millions ($7\\,000\\,000$)',
          'Hundred thousands ($700\\,000$)',
        ],
        misconceptionNotes: [
          'This option shifts the place-value column one position too far to the left ($10^8$ instead of $10^7$).',
          'This option undercounts the trailing digits and assigns the millions column ($10^6$) instead of ten-millions ($10^7$).',
          'This option confuses the ten-millions column with the hundred-thousands column ($10^5$).',
        ],
        explanation:
          'Counting place-value columns from right to left in $472\\,850\\,000$, the digit $7$ is in the ten-millions ($10^7$) position, giving $7 \\times 10\\,000\\,000 = 70\\,000\\,000$.',
        supportingExcerpt: '10 000 000 = Ten million; place value determines the value of each digit in a numeral.',
        conceptLabel: 'Place Value of Large Whole Numbers',
      },
      {
        stem: 'When $47$ counters are grouped strictly in base $5$ (groups of fives and units), which expression represents the correct breakdown?',
        correctText: '$9$ fives and $2$ units: $(9 \\times 5) + 2$',
        distractors: [
          '$8$ fives and $7$ units: $(8 \\times 5) + 7$',
          '$9$ fives and $3$ units: $(9 \\times 5) + 3$',
          '$7$ fives and $12$ units: $(7 \\times 5) + 12$',
        ],
        misconceptionNotes: [
          'In base-5 grouping, the remainder must be strictly less than $5$, so a remainder of $7$ is invalid.',
          'Since $9 \\times 5 = 45$, adding $3$ gives $48$ instead of $47$.',
          'A remainder of $12$ contains two additional groups of $5$ that were not regrouped.',
        ],
        explanation:
          'In base-5 grouping, $47 = (9 \\times 5) + 2$ because $9 \\times 5 = 45$ and $47 - 45 = 2$, leaving $9$ fives and $2$ units.',
        supportingExcerpt: 'Counting in groups of fives (base 5) and tens (base 10).',
        conceptLabel: 'Base 5 Group Counting',
      },
      {
        stem: 'What is the difference between the place value of the digit $8$ and the place value of the digit $3$ in $58\\,430\\,200$?',
        correctText: '$7\\,970\\,000$',
        distractors: [
          '$79\\,700\\,000$',
          '$7\\,700\\,000$',
          '$797\\,000$',
        ],
        misconceptionNotes: [
          'This option multiplies both place values by $10$, treating $58\\,430\\,200$ as a nine-digit number.',
          'This option misidentifies the digit $3$ as being in the hundred-thousands place instead of the ten-thousands place.',
          'This option shifts both digits one column to the right, reducing the result by a factor of $10$.',
        ],
        explanation:
          'In $58\\,430\\,200$, $8$ is in the millions place ($8\\,000\\,000$) and $3$ is in the ten-thousands place ($30\\,000$). Subtracting yields $8\\,000\\,000 - 30\\,000 = 7\\,970\\,000$.',
        supportingExcerpt: 'Numerals and place value in millions, billions, and trillions.',
        conceptLabel: 'Difference of Place Values',
      },
      {
        stem: 'What is the value of the Roman numeral $\\text{MCMXCIV}$ expressed as a Hindu-Arabic whole number?',
        correctText: '$1994$',
        distractors: [
          '$1996$',
          '$2216$',
          '$1494$',
        ],
        misconceptionNotes: [
          'This option reads $\\text{IV}$ as $6$ ($\\text{VI}$) instead of $5 - 1 = 4$.',
          'This option ignores the subtractive principle where a smaller numeral before a larger one is subtracted.',
          'This option confuses $\\text{CM}$ ($1000 - 100 = 900$) with $\\text{CD}$ ($500 - 100 = 400$).',
        ],
        explanation:
          'In $\\text{MCMXCIV}$, $\\text{M} = 1000$, $\\text{CM} = 1000 - 100 = 900$, $\\text{XC} = 100 - 10 = 90$, and $\\text{IV} = 5 - 1 = 4$. Their sum is $1994$.',
        supportingExcerpt: 'Roman numerals and conversion between words and figures.',
        conceptLabel: 'Roman Numeral Calculation',
      },
      {
        stem: 'What is the sum of $2\\,450\\,000\\,000$ and $750\\,000\\,000$ expressed in standard form?',
        correctText: '$3.2 \\times 10^9$ ($3\\,200\\,000\\,000$)',
        distractors: [
          '$3.2 \\times 10^8$ ($320\\,000\\,000$)',
          '$3.1 \\times 10^9$ ($3\\,100\\,000\\,000$)',
          '$3.2 \\times 10^{10}$ ($32\\,000\\,000\\,000$)',
        ],
        misconceptionNotes: [
          'This option drops a zero and confuses billions ($10^9$) with hundred-millions ($10^8$).',
          'This option fails to carry $100\\,000\\,000$ when adding $450\\,000\\,000 + 750\\,000\\,000 = 1\\,200\\,000\\,000$.',
          'This option adds an extra zero, shifting the sum from billions ($10^9$) to ten-billions ($10^{10}$).',
        ],
        explanation:
          '$2\\,450\\,000\\,000 + 750\\,000\\,000 = 3\\,200\\,000\\,000 = 3.2 \\times 10^9$.',
        supportingExcerpt: '1 000 000 000 = One billion; 1 000 000 000 000 = One trillion.',
        conceptLabel: 'Addition of Large Numbers in Billions',
      },
      {
        stem: 'How many millions are required to make exactly one trillion ($1\\,000\\,000\\,000\\,000$)?',
        correctText: '$1\\,000\\,000$ ($10^6$ millions)',
        distractors: [
          '$1\\,000$ ($10^3$ millions)',
          '$10\\,000$ ($10^4$ millions)',
          '$1\\,000\\,000\\,000$ ($10^9$ millions)',
        ],
        misconceptionNotes: [
          'One thousand millions ($10^3 \\times 10^6 = 10^9$) equals one billion, not one trillion.',
          'Ten thousand millions ($10^4 \\times 10^6 = 10^{10}$) equals ten billion, not one trillion.',
          'One billion millions ($10^9 \\times 10^6 = 10^{15}$) exceeds one trillion by a factor of $1\\,000$.',
        ],
        explanation:
          'Since one trillion is $10^{12}$ and one million is $10^6$, the ratio is $\\frac{10^{12}}{10^6} = 10^{12-6} = 10^6 = 1\\,000\\,000$.',
        supportingExcerpt: '1 000 000 = One million; 1 000 000 000 = One billion; 1 000 000 000 000 = One trillion.',
        conceptLabel: 'Powers of Ten & Trillions',
      },
      {
        stem: 'Evaluate $\\text{CDXLVI} + \\text{CCLIV}$ and express the result as a Hindu-Arabic numeral and Roman numeral.',
        correctText: '$700$ ($\\text{DCC}$)',
        distractors: [
          '$900$ ($\\text{CM}$)',
          '$722$ ($\\text{DCCXXII}$)',
          '$690$ ($\\text{DCXC}$)',
        ],
        misconceptionNotes: [
          'This option misreads $\\text{CD}$ ($500 - 100 = 400$) as $\\text{DC}$ ($500 + 100 = 600$).',
          'This option misreads $\\text{XL}$ ($40$) as $\\text{LX}$ ($60$) and $\\text{IV}$ ($4$) as $\\text{VI}$ ($6$).',
          'This option subtracts $10$ during addition of the tens column.',
        ],
        explanation:
          '$\\text{CDXLVI} = 400 + 40 + 6 = 446$ and $\\text{CCLIV} = 200 + 50 + 4 = 254$. Adding them gives $446 + 254 = 700 = \\text{DCC}$.',
        supportingExcerpt: 'Roman numerals and arithmetic operations with numerals.',
        conceptLabel: 'Roman Numeral Addition',
      },
      {
        stem: 'How is "Six hundred and four billion, twenty-nine million, and eighty-five thousand" written in figures?',
        correctText: '$604\\,029\\,085\\,000$',
        distractors: [
          '$604\\,290\\,850\\,000$',
          '$604\\,029\\,850$',
          '$604\\,002\\,985\\,000$',
        ],
        misconceptionNotes: [
          'Writing $290$ in the millions group changes $29\\,000\\,000$ to $290\\,000\\,000$.',
          'Omitting the final three zeros reduces the number by a factor of $1\\,000$ from billions to millions.',
          'Shifting the digits across period boundaries corrupts both the millions and thousands periods.',
        ],
        explanation:
          'Each period has three digits: $604$ (billions), $029$ (millions), $085$ (thousands), and $000$ (units), forming $604\\,029\\,085\\,000$.',
        supportingExcerpt: 'Converting numbers from words to figures and figures to words.',
        conceptLabel: 'Words to Figures Conversion',
      },
    ];
  }

  if (wk === 2) {
    return [
      {
        stem: 'Simplify the algebraic product $6ab \\times 4b^2$ completely.',
        correctText: '$24ab^3$',
        distractors: [
          '$10ab^2$',
          '$24ab^2$',
          '$24a^2b^3$',
        ],
        misconceptionNotes: [
          'Numerical coefficients in a product must be multiplied ($6 \\times 4 = 24$), not added ($6 + 4 = 10$).',
          'Since $b = b^1$, multiplying $b^1 \\times b^2$ requires adding indices ($1 + 2 = 3$) to get $b^3$, not $b^2$.',
          'The variable $a$ appears only once ($a^1$), so its exponent remains $1$, not $2$.',
        ],
        explanation:
          '$6ab \\times 4b^2 = (6 \\times 4) \\times a \\times (b^1 \\times b^2) = 24ab^{1+2} = 24ab^3$.',
        supportingExcerpt: 'Simplify 6ab × 4b² = 6 × a × b × 4 × b × b = 24ab³.',
        conceptLabel: 'Algebraic Multiplication with Indices',
      },
      {
        stem: 'Simplify the three-variable algebraic product $x^2yz \\times yz^2$.',
        correctText: '$x^2y^2z^3$',
        distractors: [
          '$x^2yz^2$',
          '$x^3y^3z^3$',
          '$x^3y^2z^2$',
        ],
        misconceptionNotes: [
          'When multiplying powers with the same base ($y^1 \\times y^1$ and $z^1 \\times z^2$), exponents are added, not multiplied.',
          'Only identical bases have their exponents added; $x^2$ is not multiplied by another $x$ term.',
          'The base $z$ has exponents $1 + 2 = 3$, whereas $x$ remains $x^2$.',
        ],
        explanation:
          '$x^2yz \\times yz^2 = x^2 \\times (y \\times y) \\times (z \\times z^2) = x^2y^2z^3$.',
        supportingExcerpt: 'Simplify x²yz × yz² = x × x × y × z × y × z × z = x²y²z³.',
        conceptLabel: 'Multiplying Multi-Variable Monomials',
      },
      {
        stem: 'Evaluate the algebraic quotient $24x^2y \\div 3xy$.',
        correctText: '$8x$',
        distractors: [
          '$8x^3y^2$',
          '$8xy$',
          '$21x$',
        ],
        misconceptionNotes: [
          'Division of powers requires subtracting exponents ($x^{2-1} = x^1$ and $y^{1-1} = y^0 = 1$), not adding them.',
          'Since $y \\div y = 1$, the variable $y$ cancels out completely from the quotient.',
          'Coefficients in a division expression must be divided ($24 \\div 3 = 8$), not subtracted.',
        ],
        explanation:
          '$\\frac{24x^2y}{3xy} = \\left(\\frac{24}{3}\\right) \\times \\left(\\frac{x^2}{x}\\right) \\times \\left(\\frac{y}{y}\\right) = 8 \\times x \\times 1 = 8x$.',
        supportingExcerpt: 'Simplify 24x²y ÷ 3xy = 8x.',
        conceptLabel: 'Division of Algebraic Monomials',
      },
      {
        stem: 'Simplify the expression $\\frac{2}{3} \\text{ of } 81y$.',
        correctText: '$54y$',
        distractors: [
          '$121.5y$',
          '$27y$',
          '$162y$',
        ],
        misconceptionNotes: [
          'The fraction is $\\frac{2}{3}$, so we divide by the denominator $3$ and multiply by the numerator $2$, not its reciprocal.',
          '$27y$ is $\\frac{1}{3} \\text{ of } 81y$; it must still be multiplied by the numerator $2$ to obtain $54y$.',
          '$162y$ omits the division by the denominator $3$.',
        ],
        explanation:
          'In BODMAS, "of" means multiplication: $\\frac{2}{3} \\times 81y = 2 \\times 27y = 54y$.',
        supportingExcerpt: 'Simplify 2/3 of 81y = 2 × 27y = 54y.',
        conceptLabel: 'BODMAS Fraction of an Algebraic Term',
      },
      {
        stem: 'Using the BODMAS order of operations, evaluate $18 + 6 \\div (5 - 2) \\times 4$.',
        correctText: '$26$',
        distractors: [
          '$32$',
          '$18.5$',
          '$24$',
        ],
        misconceptionNotes: [
          'Addition must never be performed before Division and Multiplication in BODMAS.',
          'In $6 \\div 3 \\times 4$, division comes first ($6 \\div 3 = 2$), then $2 \\times 4 = 8$.',
          'The last operation before addition is $2 \\times 4 = 8$, not $2 + 4 = 6$.',
        ],
        explanation:
          'By BODMAS: Brackets $(5-2)=3 \\Rightarrow 18 + 6 \\div 3 \\times 4$; Division $6 \\div 3 = 2 \\Rightarrow 18 + 2 \\times 4$; Multiplication $2 \\times 4 = 8$; Addition $18 + 8 = 26$.',
        supportingExcerpt: 'BODMAS represents Bracket, Of, Division, Multiplication, Addition and Subtraction.',
        conceptLabel: 'Multi-Step BODMAS Calculation',
      },
      {
        stem: 'Evaluate $45 - (12 + 8) \\div 4 \\times 3$ using the BODMAS rule.',
        correctText: '$30$',
        distractors: [
          '$18.75$',
          '$43\\frac{1}{3}$',
          '$120$',
        ],
        misconceptionNotes: [
          'Subtraction ($45 - 20$) cannot be carried out before Division and Multiplication.',
          'In $20 \\div 4 \\times 3$, $20$ is divided by $4$ first ($= 5$) and the result is multiplied by $3$ ($= 15$).',
          'Multiplication ($5 \\times 3 = 15$) has higher priority than Subtraction ($45 - 15 = 30$).',
        ],
        explanation:
          '$45 - (12 + 8) \\div 4 \\times 3 = 45 - 20 \\div 4 \\times 3 = 45 - 5 \\times 3 = 45 - 15 = 30$.',
        supportingExcerpt: 'Where there are more than one operation, BODMAS determines which operation comes first.',
        conceptLabel: 'BODMAS with Brackets and Subtraction',
      },
      {
        stem: 'Simplify $24 \\div \\left(\\frac{1}{3} \\text{ of } 18\\right) + 7 \\times 2$.',
        correctText: '$18$',
        distractors: [
          '$1310$',
          '$22$',
          '$3\\frac{9}{13}$',
        ],
        misconceptionNotes: [
          'In BODMAS, "Of" inside the bracket must be evaluated ($\\frac{1}{3} \\times 18 = 6$) before dividing $24$.',
          'Multiplication ($7 \\times 2 = 14$) must be completed before Addition ($4 + 14 = 18$).',
          'Addition cannot precede Division and Multiplication.',
        ],
        explanation:
          'First $\\frac{1}{3} \\text{ of } 18 = 6$. Then $24 \\div 6 + 7 \\times 2 = 4 + 14 = 18$.',
        supportingExcerpt: 'BODMAS: Bracket, Of, Division, Multiplication, Addition and Subtraction.',
        conceptLabel: 'BODMAS with Of, Division, and Multiplication',
      },
      {
        stem: 'Simplify the algebraic expression $\\frac{36a^3b^2}{9ab} + 5a^2b$.',
        correctText: '$9a^2b$',
        distractors: [
          '$4a^3b^2 + 5a^2b$',
          '$20a^4b^2$',
          '$32a^2b$',
        ],
        misconceptionNotes: [
          'When dividing $a^3b^2$ by $ab$, the exponents decrease by $1$ ($a^{3-1}b^{2-1} = a^2b$).',
          'Adding like terms $4a^2b + 5a^2b$ adds the coefficients ($4 + 5 = 9$) while keeping the variable part $a^2b$ unchanged.',
          '$36$ is divided by $9$ ($36 \\div 9 = 4$), not subtracted.',
        ],
        explanation:
          'By BODMAS, divide first: $\\frac{36a^3b^2}{9ab} = 4a^2b$. Then add like terms: $4a^2b + 5a^2b = 9a^2b$.',
        supportingExcerpt: 'Order of operations and simplification of algebraic fractions.',
        conceptLabel: 'Combined Algebraic Division and Addition',
      },
    ];
  }

  if (wk === 3) {
    return [
      {
        stem: 'On a horizontal directed number line, a pointer starts at $+5$ and moves $7$ units to the left to represent $5 - 7$. What is its final position?',
        correctText: '$-2$',
        distractors: [
          '$+12$',
          '$+2$',
          '$-12$',
        ],
        misconceptionNotes: [
          'Subtraction ($- 7$) requires moving $7$ units to the left, not to the right.',
          'Since $7 > 5$, moving $7$ units left from $+5$ passes $0$ into negative numbers, giving $-2$ rather than $+2$.',
          'The starting point is $+5$ (to the right of $0$), not $-5$.',
        ],
        explanation:
          'On a number line, $5 - 7$ starts at $+5$ and moves $7$ steps left: $5 \\rightarrow 0$ uses $5$ steps, and $2$ more steps left reaches $-2$.',
        supportingExcerpt: '5 – 7: start at 5 and move 7 units to the left, giving -2.',
        conceptLabel: 'Number Line Subtraction Crossing Zero',
      },
      {
        stem: 'Arrange the integers $-5, 10, -8, 0, 5, 2, 7, -3$ in descending order (from highest to lowest) and state the range.',
        correctText: '$10, 7, 5, 2, 0, -3, -5, -8$ (Range $= 18$)',
        distractors: [
          '$10, 7, 5, 2, 0, -8, -5, -3$ (Range $= 2$)',
          '$-8, -5, -3, 0, 2, 5, 7, 10$ (Range $= -18$)',
          '$10, -8, 7, -5, 5, -3, 2, 0$ (Range $= 10$)',
        ],
        misconceptionNotes: [
          'For negative numbers, $-3 > -5 > -8$ because $-3$ lies further to the right on the number line than $-8$.',
          '$-8, -5, -3, 0, 2, 5, 7, 10$ is ascending order (lowest to highest), not descending order.',
          'Ordering integers by absolute value ignores their signs; negative integers are always less than $0$.',
        ],
        explanation:
          'Values increase from left to right on a number line, so highest to lowest is $10 > 7 > 5 > 2 > 0 > -3 > -5 > -8$, and $10 - (-8) = 18$.',
        supportingExcerpt: 'Arrange -5, 10, -8, 0, 5, 2, 7, -3 in descending order: 10, 7, 5, 2, 0, -3, -5, -8.',
        conceptLabel: 'Ordering Directed Integers & Range',
      },
      {
        stem: 'A particle on a number line starts at $-6$, moves $11$ units to the right, and then moves $8$ units to the left. What is its final coordinate?',
        correctText: '$-3$',
        distractors: [
          '$+9$',
          '$-25$',
          '$+3$',
        ],
        misconceptionNotes: [
          'Starting at $-6$ and adding $11$ gives $-6 + 11 = +5$, not $6 + 11 = +17$.',
          'Moving to the right adds $+11$, whereas moving to the left subtracts $8$.',
          '$5 - 8 = -3$ (three units to the left of zero), not $+3$.',
        ],
        explanation:
          'The net position is $-6 + 11 - 8 = 5 - 8 = -3$.',
        supportingExcerpt: 'To add a positive number, move to the right; to subtract a positive number, move to the left.',
        conceptLabel: 'Multi-Step Number Line Displacement',
      },
      {
        stem: 'What are the total distance and the midpoint coordinate between $-9$ and $+15$ on a horizontal number line?',
        correctText: 'Distance $= 24\\text{ units}$, Midpoint $= +3$',
        distractors: [
          'Distance $= 6\\text{ units}$, Midpoint $= +3$',
          'Distance $= 24\\text{ units}$, Midpoint $= -12$',
          'Distance $= 24\\text{ units}$, Midpoint $= +12$',
        ],
        misconceptionNotes: [
          'The distance from $-9$ to $0$ is $9$ units and from $0$ to $+15$ is $15$ units, giving $9 + 15 = 24$ units, not $6$.',
          'The midpoint is the average $\\frac{-9 + 15}{2} = +3$, not $\\frac{-9 - 15}{2} = -12$.',
          '$+12$ is the half-distance ($\\frac{24}{2}$); adding $12$ to the left endpoint $-9$ gives $-9 + 12 = +3$.',
        ],
        explanation:
          'Distance $= 15 - (-9) = 15 + 9 = 24\\text{ units}$. Midpoint $= \\frac{-9 + 15}{2} = \\frac{6}{2} = +3$.',
        supportingExcerpt: 'The number line extends indefinitely to the left and right of zero (0).',
        conceptLabel: 'Number Line Distance and Midpoint',
      },
      {
        stem: 'Which inequality statement and separation value accurately compare the directed integers $-14$ and $-6$ on a number line?',
        correctText: '$-14 < -6$ ($-14$ lies $8$ units to the left of $-6$)',
        distractors: [
          '$-14 > -6$ ($-14$ lies $8$ units to the right of $-6$)',
          '$-14 < -6$ ($-14$ lies $20$ units to the left of $-6$)',
          '$-14 > -6$ ($-14$ lies $20$ units to the left of $-6$)',
        ],
        misconceptionNotes: [
          'On the negative side of $0$, a larger absolute value means a smaller (more negative) number, so $-14 < -6$.',
          'The separation between $-6$ and $-14$ is $|-6 - (-14)| = |-6 + 14| = 8$ units, not $20$ units.',
          'Numbers always decrease in value as you move to the left on a horizontal number line.',
        ],
        explanation:
          'On a number line, $-6$ is $6$ units left of $0$ while $-14$ is $14$ units left of $0$. Since $-14$ is $8$ units to the left of $-6$, $-14 < -6$.',
        supportingExcerpt: 'Negative numbers are to the left of zero (0); values decrease from right to left.',
        conceptLabel: 'Comparing Negative Integers',
      },
      {
        stem: 'The temperature of a chemical sample drops from $+4^\\circ\\text{C}$ by $13^\\circ\\text{C}$ and then rises by $6^\\circ\\text{C}$. What is the final temperature?',
        correctText: '$-3^\\circ\\text{C}$',
        distractors: [
          '$+15^\\circ\\text{C}$',
          '$-15^\\circ\\text{C}$',
          '$+3^\\circ\\text{C}$',
        ],
        misconceptionNotes: [
          '$4 - 13 = -9^\\circ\\text{C}$ (below zero), not $+9^\\circ\\text{C}$.',
          'A temperature rise of $6^\\circ\\text{C}$ means adding $+6$ to $-9^\\circ\\text{C}$, which moves right to $-3^\\circ\\text{C}$.',
          '$-9 + 6 = -3^\\circ\\text{C}$, not $+3^\\circ\\text{C}$.',
        ],
        explanation:
          'Using directed numbers: $+4 - 13 + 6 = -9 + 6 = -3^\\circ\\text{C}$.',
        supportingExcerpt: 'Addition and subtraction of integers using the number line.',
        conceptLabel: 'Directed Number Temperature Calculation',
      },
      {
        stem: 'Given the integer set $S = \\{-12, 4, -3, 9, -7, 0\\}$, what is the sum of the two smallest integers in $S$?',
        correctText: '$-19$',
        distractors: [
          '$-3$',
          '$+19$',
          '$-5$',
        ],
        misconceptionNotes: [
          '$-12$ and $-7$ lie furthest to the left on the number line, so they are smaller than $-3$ and $0$.',
          'Adding two negative numbers moves further left on the number line: $(-12) + (-7) = -19$, not $+19$.',
          '$-12 + (-7) = -19$, whereas $-12 - (-7) = -5$.',
        ],
        explanation:
          'Ordering $S$ from lowest to highest gives $-12 < -7 < -3 < 0 < 4 < 9$. The two smallest are $-12$ and $-7$, and $(-12) + (-7) = -19$.',
        supportingExcerpt: 'Ordering integers from lowest to highest and adding negative numbers.',
        conceptLabel: 'Ordering and Summing Negative Integers',
      },
      {
        stem: 'On a number line, starting at $1$, moving $5$ units right to $6$, and then moving $3$ units left represents which pair of equations?',
        correctText: '$1 + 5 = 6$ and $6 - 3 = 3$',
        distractors: [
          '$1 - 5 = -4$ and $-4 + 3 = -1$',
          '$1 + 5 = 6$ and $6 + 3 = 9$',
          '$5 - 1 = 4$ and $4 - 3 = 1$',
        ],
        misconceptionNotes: [
          'Moving $5$ units to the right from $1$ adds $5$ ($1 + 5 = 6$), rather than subtracting $5$.',
          'Moving $3$ units to the left from $6$ subtracts $3$ ($6 - 3 = 3$), rather than adding $3$.',
          'The starting coordinate is $1$ and the shift is $+5$, reaching $6$ rather than $4$.',
        ],
        explanation:
          'Moving $5$ units right from $1$ gives $1 + 5 = 6$; moving $3$ units left from $6$ gives $6 - 3 = 3$.',
        supportingExcerpt: '1 + 5 = 6 (start at 1 and move 5 units to the right); 6 – 3 = 3 (start at 6 and move 3 units to the left).',
        conceptLabel: 'Interpreting Number Line Operations',
      },
    ];
  }

  if (wk === 4) {
    return [
      {
        stem: 'Simplify the directed integer expression $16 + (-9) - (-10)$.',
        correctText: '$17$',
        distractors: [
          '$-3$',
          '$35$',
          '$15$',
        ],
        misconceptionNotes: [
          'Subtracting a negative number $- (-10)$ is equivalent to adding $+10$, not subtracting $10$.',
          'Adding a negative number $+ (-9)$ is equivalent to subtracting $9$, not adding $9$.',
          'Two like negative signs $- (-10)$ combine to form $+ 10$, giving $7 + 10 = 17$.',
        ],
        explanation:
          '$16 + (-9) - (-10) = 16 - 9 + 10 = 7 + 10 = 17$.',
        supportingExcerpt: '16 + (-9) – (-10) = 16 – 9 + 10 = 7 + 10 = 17.',
        conceptLabel: 'Addition and Subtraction of Directed Integers',
      },
      {
        stem: 'Evaluate the four-term directed number expression $(-12) + (-8) + 15 - (-5)$.',
        correctText: '$0$',
        distractors: [
          '$-10$',
          '$+16$',
          '$+40$',
        ],
        misconceptionNotes: [
          '$- (-5)$ becomes $+ 5$, so the last two terms sum to $15 + 5 = 20$, not $15 - 5 = 10$.',
          '$+ (-8)$ means $- 8$, so $-12 - 8 = -20$, not $-4$.',
          'Adding two negative integers $(-12) + (-8)$ yields $-20$, not $+20$.',
        ],
        explanation:
          '$(-12) + (-8) + 15 - (-5) = -12 - 8 + 15 + 5 = -20 + 20 = 0$.',
        supportingExcerpt: '(-12) + (-8) + 15 – (-5) = -12 – 8 + 15 + 5 = -20 + 20 = 0.',
        conceptLabel: 'Multi-Term Directed Integer Simplification',
      },
      {
        stem: 'When a certain integer $x$ is added to $26$, the result is $-4$. What is the value of $x$?',
        correctText: '$-30$',
        distractors: [
          '$+22$',
          '$-22$',
          '$+30$',
        ],
        misconceptionNotes: [
          'To isolate $x$ in $26 + x = -4$, we subtract $26$ from both sides ($x = -4 - 26 = -30$), not add $26$.',
          'The result given in the problem is $-4$, so $x = -4 - 26 = -30$, not $-22$.',
          'Substituting $+30$ gives $26 + 30 = 56 \\ne -4$.',
        ],
        explanation:
          'From $26 + x = -4$, subtract $26$ from both sides: $x = -4 - 26 = -30$. Verification: $26 + (-30) = -4$.',
        supportingExcerpt: '26 + x = -4 => x = -4 – 26 = -30.',
        conceptLabel: 'Solving Word Equations with Directed Numbers',
      },
      {
        stem: 'Solve for the unknown integer $q$ in the linear equation $-3 - q = 4$.',
        correctText: '$-7$',
        distractors: [
          '$+1$',
          '$+7$',
          '$-1$',
        ],
        misconceptionNotes: [
          'Substituting $q = 1$ into $-3 - q$ gives $-3 - 1 = -4$, which is the opposite sign of $+4$.',
          'Since $-q = 7$, multiplying both sides by $-1$ gives $q = -7$, not $+7$.',
          'Substituting $q = -1$ gives $-3 - (-1) = -2 \\ne 4$.',
        ],
        explanation:
          'In $-3 - q = 4$, subtract $4$ from $-3$ to get $q = -3 - 4 = -7$. Check: $-3 - (-7) = -3 + 7 = 4$.',
        supportingExcerpt: '-3 – q = 4 => q = -3 – 4 = -7.',
        conceptLabel: 'Linear Equations with Negative Unknowns',
      },
      {
        stem: 'What is the exact value of $78 - 252$?',
        correctText: '$-174$',
        distractors: [
          '$+174$',
          '$-330$',
          '$-184$',
        ],
        misconceptionNotes: [
          '$78 - 252$ is negative because $252 > 78$; $+174$ is the result of $252 - 78$.',
          'Because $78$ is positive and $-252$ is negative, we find the difference of their magnitudes ($252 - 78 = 174$), not their sum.',
          '$252 - 78 = 174$, not $184$ ($174 + 78 = 252$).',
        ],
        explanation:
          'When subtracting a larger positive integer from a smaller one, $78 - 252 = -(252 - 78) = -174$.',
        supportingExcerpt: '78 – 252 = -174.',
        conceptLabel: 'Subtracting Larger Integers from Smaller Integers',
      },
      {
        stem: 'Evaluate the expressions $-11 - 19$ and $-33 - 12$, and find the sum of their two results.',
        correctText: '$-75$',
        distractors: [
          '$+75$',
          '$-29$',
          '$-15$',
        ],
        misconceptionNotes: [
          'Two negative signs make a positive only when multiplying or when a minus precedes a bracketed negative $-(-a)$, not when subtracting $-11 - 19$.',
          'Both terms in $-11 - 19$ are negative, so their magnitudes add: $-(11 + 19) = -30$ and $-(33 + 12) = -45$.',
          'The question asks for the sum $(-30) + (-45) = -75$, not $-45 - (-30) = -15$.',
        ],
        explanation:
          '$-11 - 19 = -30$ and $-33 - 12 = -45$. Their sum is $(-30) + (-45) = -75$.',
        supportingExcerpt: '-11 – 19 = -30; -33 – 12 = -45.',
        conceptLabel: 'Combining Negative Integer Sums',
      },
      {
        stem: 'Evaluate the three-term integer expression $3 - 11 + 2$.',
        correctText: '$-6$',
        distractors: [
          '$-10$',
          '$+6$',
          '$+10$',
        ],
        misconceptionNotes: [
          'In $3 - 11 + 2$, the negative sign belongs only to $11$ ($-11 + 2 = -9$), not $-(11 + 2) = -13$.',
          'Since $11 > 5$, $5 - 11 = -6$ (negative), not $+6$.',
          '$3 - 11 = -8$ (negative), not $+8$.',
        ],
        explanation:
          '$3 - 11 + 2 = (3 - 11) + 2 = -8 + 2 = -6$. Alternatively, $(3 + 2) - 11 = 5 - 11 = -6$.',
        supportingExcerpt: '3 – 11 + 2 = -8 + 2 = -6.',
        conceptLabel: 'Three-Term Directed Integer Calculation',
      },
      {
        stem: 'Find the unknown integer $y$ that satisfies the directed equation $y - (-18) = -7$.',
        correctText: '$-25$',
        distractors: [
          '$+11$',
          '$-11$',
          '$+25$',
        ],
        misconceptionNotes: [
          'Since $- (-18) = +18$, the equation is $y + 18 = -7$, not $y - 18 = -7$.',
          'Check: $(-11) - (-18) = -11 + 18 = +7 \\ne -7$, whereas $(-25) - (-18) = -25 + 18 = -7$.',
          'Subtracting $18$ from $-7$ gives $-7 - 18 = -25$, not $+25$.',
        ],
        explanation:
          '$y - (-18) = -7 \\Rightarrow y + 18 = -7 \\Rightarrow y = -7 - 18 = -25$.',
        supportingExcerpt: 'Two like signs give positive: -(-a) = +a.',
        conceptLabel: 'Solving Directed Equations with Double Negatives',
      },
    ];
  }

  if (wk === 5) {
    return [
      {
        stem: 'Convert the mixed number $3\\frac{1}{2}$ into an improper fraction and express it as a percentage.',
        correctText: '$\\frac{7}{2}$ ($350\\%$)',
        distractors: [
          '$\\frac{5}{2}$ ($250\\%$)',
          '$\\frac{7}{2}$ ($3.5\\%$)',
          '$\\frac{4}{2}$ ($200\\%$)',
        ],
        misconceptionNotes: [
          'To convert a mixed number, multiply the whole number by the denominator ($3 \\times 2 = 6$) and add the numerator ($+1 = 7$), not $3 \\times 1 + 2$.',
          '$3.5$ is the decimal form of $\\frac{7}{2}$; converting a decimal to a percentage requires multiplying by $100\\%$ to get $350\\%$.',
          'Adding the whole number directly to the numerator ($3 + 1$) ignores that $3 = \\frac{6}{2}$.',
        ],
        explanation:
          '$3\\frac{1}{2} = \\frac{(3 \\times 2) + 1}{2} = \\frac{7}{2}$. As a percentage, $\\frac{7}{2} \\times 100\\% = 7 \\times 50\\% = 350\\%$.',
        supportingExcerpt: '3 1/2 = 3 + 1/2 = 7/2; to convert a fraction to percentage, multiply by 100%.',
        conceptLabel: 'Mixed Numbers to Improper Fractions and Percentages',
      },
      {
        stem: 'What is the Highest Common Factor ($\\text{HCF}$) of $36$ and $84$, and what is $\\frac{36}{84}$ reduced to lowest terms?',
        correctText: '$\\text{HCF} = 12$; $\\frac{3}{7}$',
        distractors: [
          '$\\text{HCF} = 6$; $\\frac{6}{14}$',
          '$\\text{HCF} = 12$; $\\frac{4}{7}$',
          '$\\text{HCF} = 9$; $\\frac{3}{4}$',
        ],
        misconceptionNotes: [
          '$\\frac{6}{14}$ is not in lowest terms because both $6$ and $14$ are still divisible by $2$.',
          '$36 \\div 12 = 3$, not $4$ ($4 \\times 12 = 48$).',
          'Equivalent fractions are formed by dividing numerator and denominator by the same factor, never by subtracting.',
        ],
        explanation:
          '$36 = 12 \\times 3$ and $84 = 12 \\times 7$, so $\\text{HCF}(36, 84) = 12$. Dividing both by $12$ gives $\\frac{3}{7}$.',
        supportingExcerpt: 'Fractions can be reduced to their lowest term by dividing numerator and denominator by their HCF.',
        conceptLabel: 'Reducing Fractions to Lowest Terms via HCF',
      },
      {
        stem: 'Classify the decimal forms of $\\frac{2}{5}$ and $\\frac{1}{3}$, and evaluate the sum $\\frac{2}{5} + \\frac{1}{3}$.',
        correctText: '$0.4$ (terminating), $0.\\dot{3}$ (recurring); sum $= \\frac{11}{15}$',
        distractors: [
          '$0.25$ (terminating), $0.3$ (terminating); sum $= \\frac{3}{8}$',
          '$0.4$ (recurring), $0.\\dot{3}$ (terminating); sum $= \\frac{7}{15}$',
          '$0.4$ (terminating), $0.\\dot{3}$ (recurring); sum $= \\frac{3}{8}$',
        ],
        misconceptionNotes: [
          '$\\frac{2}{5} = 2 \\div 5 = 0.4$ (not $0.25$), and $\\frac{1}{3} = 0.333\\ldots$ is a recurring decimal.',
          '$0.4$ terminates with remainder $0$, whereas $0.333\\ldots$ repeats endlessly.',
          'Fractions with different denominators must be converted to their $\\text{LCM}$ ($15$) before adding: $\\frac{6}{15} + \\frac{5}{15} = \\frac{11}{15}$, never $\\frac{2+1}{5+3}$.',
        ],
        explanation:
          '$2 \\div 5 = 0.4$ (terminating) and $1 \\div 3 = 0.333\\ldots = 0.\\dot{3}$ (recurring). Using $\\text{LCM}(5,3)=15$, $\\frac{2}{5} + \\frac{1}{3} = \\frac{6+5}{15} = \\frac{11}{15}$.',
        supportingExcerpt: '2/5 = 0.4 (terminating decimal) and 1/3 = 0.333... (recurring or repeating decimal).',
        conceptLabel: 'Terminating vs Recurring Decimals & Fraction Addition',
      },
      {
        stem: 'In a Grade 7 class of $40$ students, $35\\%$ belong to the Science Club. What is $35\\%$ as a simplified fraction, and how many students are in the club?',
        correctText: '$\\frac{7}{20}$; $14\\text{ students}$',
        distractors: [
          '$\\frac{7}{25}$; $11\\text{ students}$',
          '$\\frac{7}{20}$; $5\\text{ students}$',
          '$\\frac{3}{5}$; $24\\text{ students}$',
        ],
        misconceptionNotes: [
          'Dividing $100 \\div 5$ gives $20$, so $\\frac{35}{100} = \\frac{7}{20}$, not $\\frac{7}{25}$.',
          'Percentage of a quantity is found by multiplying $\\frac{35}{100} \\times 40 = 14$, not by subtracting $40 - 35$.',
          '$\\frac{3}{5}$ equals $60\\%$, whereas $35\\%$ simplifies to $\\frac{7}{20}$.',
        ],
        explanation:
          '$35\\% = \\frac{35}{100} = \\frac{35 \\div 5}{100 \\div 5} = \\frac{7}{20}$. Multiplying by $40$ students gives $\\frac{7}{20} \\times 40 = 14\\text{ students}$.',
        supportingExcerpt: 'Percentage means per cent or out of 100 (symbol %).',
        conceptLabel: 'Percentage to Fraction and Quantity Calculation',
      },
      {
        stem: 'Express the improper fraction $\\frac{59}{8}$ as both a mixed number and an exact terminating decimal.',
        correctText: '$7\\frac{3}{8}$ ($7.375$)',
        distractors: [
          '$6\\frac{11}{8}$ ($7.125$)',
          '$7\\frac{3}{8}$ ($7.38$)',
          '$8\\frac{5}{8}$ ($8.625$)',
        ],
        misconceptionNotes: [
          'In a mixed number, the fractional part must be a proper fraction (numerator $<$ denominator), so $\\frac{11}{8}$ is invalid.',
          '$\\frac{3}{8} = 3 \\div 8 = 0.375$ exactly; $7.38$ is a rounded approximation, not the exact terminating decimal.',
          '$8 \\times 8 = 64 > 59$, so the whole-number quotient is $7$ ($7 \\times 8 = 56$), not $8$.',
        ],
        explanation:
          '$59 = (7 \\times 8) + 3$, so $\\frac{59}{8} = 7\\frac{3}{8}$. Since $\\frac{3}{8} = 0.375$, $7\\frac{3}{8} = 7.375$.',
        supportingExcerpt: 'Improper fractions have numerator greater than denominator and can be written as mixed numbers.',
        conceptLabel: 'Improper Fraction to Mixed Number and Decimal',
      },
      {
        stem: 'Given the equivalent fraction equation $\\frac{7}{12} = \\frac{x}{84}$, find the value of $x$ and evaluate $x + 12$.',
        correctText: '$x = 49$; $x + 12 = 61$',
        distractors: [
          '$x = 79$; $x + 12 = 91$',
          '$x = 42$; $x + 12 = 54$',
          '$x = 84$; $x + 12 = 96$',
        ],
        misconceptionNotes: [
          'Equivalent fractions preserve a constant multiplication ratio ($\\times 7$), not an additive difference ($+ 72$).',
          '$84 \\div 12 = 7$ (since $12 \\times 7 = 84$), whereas $12 \\times 6 = 72$.',
          'The numerator $7$ must be multiplied by the scale factor $7$ to get $x = 49$, not $12 \\times 7$.',
        ],
        explanation:
          '$\\frac{7}{12} = \\frac{7 \\times 7}{12 \\times 7} = \\frac{49}{84}$, so $x = 49$ and $x + 12 = 61$.',
        supportingExcerpt: 'Equivalent fractions are obtained by multiplying or dividing the numerator and denominator by the same quantity.',
        conceptLabel: 'Solving Equivalent Fraction Equations',
      },
      {
        stem: 'A student scored $42$ marks out of $60$ in a test. Express this score as a fraction in lowest terms and as a percentage.',
        correctText: '$\\frac{7}{10}$ ($70\\%$)',
        distractors: [
          '$\\frac{6}{10}$ ($60\\%$)',
          '$\\frac{21}{30}$ ($82\\%$)',
          '$\\frac{7}{12}$ ($58.\\dot{3}\\%$)',
        ],
        misconceptionNotes: [
          '$42 \\div 6 = 7$ (not $6$), so the fraction is $\\frac{7}{10} = 70\\%$.',
          'Converting a score out of $60$ to a percentage requires multiplying by $\\frac{100}{60}$, never adding $40$ to the numerator.',
          '$60 \\div 6 = 10$ (not $12$), so the simplified denominator is $10$.',
        ],
        explanation:
          '$\\frac{42}{60} = \\frac{42 \\div 6}{60 \\div 6} = \\frac{7}{10}$. Percentage $= \\frac{7}{10} \\times 100\\% = 70\\%$.',
        supportingExcerpt: 'Converting fractions to percentages by multiplying by 100%.',
        conceptLabel: 'Test Score Fraction and Percentage Calculation',
      },
      {
        stem: 'Arrange the fractions $\\frac{3}{4}, \\frac{2}{3}, \\frac{5}{6}, \\frac{7}{12}$ in ascending order (from lowest to highest).',
        correctText: '$\\frac{7}{12} < \\frac{2}{3} < \\frac{3}{4} < \\frac{5}{6}$',
        distractors: [
          '$\\frac{2}{3} < \\frac{3}{4} < \\frac{5}{6} < \\frac{7}{12}$',
          '$\\frac{5}{6} > \\frac{3}{4} > \\frac{2}{3} > \\frac{7}{12}$',
          '$\\frac{2}{3} < \\frac{7}{12} < \\frac{3}{4} < \\frac{5}{6}$',
        ],
        misconceptionNotes: [
          'Comparing numerators or denominators directly without a common denominator leads to an incorrect ordering.',
          '$\\frac{5}{6} > \\frac{3}{4} > \\frac{2}{3} > \\frac{7}{12}$ is descending order (highest to lowest), not ascending order.',
          '$\\frac{2}{3} = \\frac{2 \\times 4}{3 \\times 4} = \\frac{8}{12}$ (not $\\frac{6}{12}$), which is greater than $\\frac{7}{12}$.',
        ],
        explanation:
          'Using $\\text{LCM}(4,3,6,12) = 12$: $\\frac{7}{12} = \\frac{7}{12}$, $\\frac{2}{3} = \\frac{8}{12}$, $\\frac{3}{4} = \\frac{9}{12}$, $\\frac{5}{6} = \\frac{10}{12}$. Thus $\\frac{7}{12} < \\frac{2}{3} < \\frac{3}{4} < \\frac{5}{6}$.',
        supportingExcerpt: 'Comparing and ordering fractions using equivalent fractions with a common denominator.',
        conceptLabel: 'Ordering Fractions via Common Denominator',
      },
    ];
  }

  // Week 6: Multiplication & Division of Fractions, Word Problems, Rounding, Decimal Places & Significant Figures
  return [
    {
      stem: 'Evaluate $\\frac{12}{25} \\div \\frac{9}{10}$ and express the result in lowest terms.',
      correctText: '$\\frac{8}{15}$',
      distractors: [
        '$\\frac{54}{125}$',
        '$1\\frac{7}{8}$',
        '$\\frac{6}{15}$',
      ],
      misconceptionNotes: [
        'Division by a fraction $\\frac{9}{10}$ requires multiplying by its reciprocal $\\frac{10}{9}$, not $\\frac{9}{10}$.',
        'Always invert the divisor (second fraction $\\frac{9}{10}$), never the dividend (first fraction $\\frac{12}{25}$).',
        'After cross-cancelling $\\frac{4}{5} \\times \\frac{2}{3}$, the product of the numerators is $4 \\times 2 = 8$, giving $\\frac{8}{15}$ rather than $\\frac{6}{15}$.',
      ],
      explanation:
        '$\\frac{12}{25} \\div \\frac{9}{10} = \\frac{12}{25} \\times \\frac{10}{9} = \\frac{4 \\times 2}{5 \\times 3} = \\frac{8}{15}$.',
      supportingExcerpt: '12/25 ÷ 9/10 = 12/25 × 10/9 = 8/15.',
      conceptLabel: 'Division of Proper Fractions via Reciprocal',
    },
    {
      stem: 'Evaluate the mixed-number division $1\\frac{2}{3} \\div 5$ in simplest fractional form.',
      correctText: '$\\frac{1}{3}$',
      distractors: [
        '$8\\frac{1}{3}$',
        '$\\frac{3}{25}$',
        '$1\\frac{2}{15}$',
      ],
      misconceptionNotes: [
        'Dividing by $5$ ($\\frac{5}{1}$) means multiplying by its reciprocal $\\frac{1}{5}$, not multiplying by $5$.',
        '$1\\frac{2}{3} = \\frac{1 \\times 3 + 2}{3} = \\frac{5}{3}$, not $\\frac{3}{5}$.',
        'A mixed number must always be converted into an improper fraction ($\\frac{5}{3}$) before dividing.',
      ],
      explanation:
        '$1\\frac{2}{3} \\div 5 = \\frac{5}{3} \\div \\frac{5}{1} = \\frac{5}{3} \\times \\frac{1}{5} = \\frac{1}{3}$.',
      supportingExcerpt: '1 2/3 ÷ 5 = 5/3 ÷ 5/1 = 5/3 × 1/5 = 1/3.',
      conceptLabel: 'Dividing a Mixed Number by a Whole Number',
    },
    {
      stem: 'A mathematics course requires $30\\text{ hours}$ of instruction. If each lecture lasts $1\\frac{1}{2}\\text{ hours}$, how many lectures are in the course?',
      correctText: '$20\\text{ lectures}$',
      distractors: [
        '$45\\text{ lectures}$',
        '$10\\text{ lectures}$',
        '$28.5\\text{ lectures}$',
      ],
      misconceptionNotes: [
        'Finding the number of $1\\frac{1}{2}$-hour lectures inside $30$ hours requires division ($30 \\div 1\\frac{1}{2}$), not multiplication.',
        '$30 \\div \\frac{3}{2} = 30 \\times \\frac{2}{3} = 20$; dividing by $3$ alone omits multiplying by $2$.',
        'Number of lectures equals total duration divided by duration per lecture, not subtraction.',
      ],
      explanation:
        '$\\text{Number of lectures} = 30 \\div 1\\frac{1}{2} = 30 \\div \\frac{3}{2} = 30 \\times \\frac{2}{3} = 20\\text{ lectures}$.',
      supportingExcerpt: 'A course lasts 30 hours. If one lecture lasts 1 1/2 hours, number of lectures = 30 ÷ 1 1/2 = 30 × 2/3 = 20 lectures.',
      conceptLabel: 'Fraction Division Word Problem',
    },
    {
      stem: 'Evaluate $9 \\times \\frac{4}{3}$ and $6 \\div \\frac{3}{5}$, and calculate the sum of their values.',
      correctText: '$22$',
      distractors: [
        '$15.6$',
        '$16.75$',
        '$120$',
      ],
      misconceptionNotes: [
        'In $6 \\div \\frac{3}{5}$, dividing by $\\frac{3}{5}$ means multiplying by $\\frac{5}{3}$ ($6 \\times \\frac{5}{3} = 10$), not multiplying by $\\frac{3}{5}$.',
        'In $9 \\times \\frac{4}{3}$, the whole number $9$ multiplies the numerator $4$ ($\\frac{36}{3} = 12$), not the denominator.',
        'The question asks for the sum ($12 + 10 = 22$) of the two results, not their product.',
      ],
      explanation:
        '$9 \\times \\frac{4}{3} = \\frac{36}{3} = 12$ and $6 \\div \\frac{3}{5} = 6 \\times \\frac{5}{3} = 10$. Adding them gives $12 + 10 = 22$.',
      supportingExcerpt: '9 × 4/3 = 3 × 4 = 12; 6 ÷ 3/5 = 6 × 5/3 = 2 × 5 = 10.',
      conceptLabel: 'Multiplying and Dividing Fractions by Whole Numbers',
    },
    {
      stem: 'Round $16.51$ and $7.83$ each to $1$ decimal place ($1\\text{ d.p.}$), and find the sum of the two rounded numbers.',
      correctText: '$24.3$ ($16.5 + 7.8$)',
      distractors: [
        '$24.5$ ($16.6 + 7.9$)',
        '$24.4$ ($16.5 + 7.9$)',
        '$25.0$ ($17.0 + 8.0$)',
      ],
      misconceptionNotes: [
        'When rounding to $1\\text{ d.p.}$, we inspect the second decimal digit ($1$ and $3$). Since both are $< 5$, we round down (keep the tenths digit unchanged).',
        'To round $7.83$ to $1\\text{ d.p.}$, look at the digit after $8$ (which is $3 < 5$), not the digit $8$ itself.',
        'Rounding to the nearest whole number gives $0\\text{ d.p.}$ rather than the required $1\\text{ d.p.}$',
      ],
      explanation:
        'To $1\\text{ d.p.}$, $16.51 \\rightarrow 16.5$ (since $1 < 5$) and $7.83 \\rightarrow 7.8$ (since $3 < 5$). Their sum is $16.5 + 7.8 = 24.3$.',
      supportingExcerpt: 'Rules for rounding off: if the next digit is less than 5, round down; if 5 or more, round up. 16.51 = 16.5 (1 d.p.), 7.83 = 7.8 (1 d.p.).',
      conceptLabel: 'Rounding to Decimal Places',
    },
    {
      stem: 'Round $0.04862$ to $2$ significant figures ($2\\text{ s.f.}$) and $45\\,872$ to $3$ significant figures ($3\\text{ s.f.}$).',
      correctText: '$0.049$ and $45\\,900$',
      distractors: [
        '$0.05$ and $459$',
        '$0.048$ and $45\\,800$',
        '$0.05$ and $46\\,000$',
      ],
      misconceptionNotes: [
        'Leading zeros in $0.04862$ are not significant, and trailing placeholder zeros in $45\\,900$ must be kept to preserve place value.',
        'In $0.04862$ the third significant digit is $6 \\ge 5$ (so $8 \\rightarrow 9$), and in $45\\,872$ the fourth digit is $7 \\ge 5$ (so $8 \\rightarrow 9$).',
        '$0.05$ has only $1$ significant figure ($2\\text{ d.p.}$), whereas $2\\text{ s.f.}$ requires two non-zero digits ($0.049$).',
      ],
      explanation:
        'In $0.04862$, the first two significant figures are $4$ and $8$; since the next digit is $6 \\ge 5$, it rounds to $0.049$. In $45\\,872$, the first three significant figures are $4, 5, 8$; since the next digit is $7 \\ge 5$, it rounds to $45\\,900$.',
      supportingExcerpt: 'Significant figures start from the first non-zero digit; round up when the following digit is 5, 6, 7, 8 or 9.',
      conceptLabel: 'Rounding to Significant Figures',
    },
    {
      stem: 'Evaluate the product of the mixed numbers $2\\frac{1}{4} \\times 1\\frac{1}{3}$.',
      correctText: '$3$',
      distractors: [
        '$2\\frac{1}{12}$',
        '$1\\frac{11}{16}$',
        '$2\\frac{1}{3}$',
      ],
      misconceptionNotes: [
        'Multiplying whole numbers and fractions separately ($2 \\times 1 + \\frac{1}{4} \\times \\frac{1}{3}$) omits the cross-products $2 \\times \\frac{1}{3}$ and $1 \\times \\frac{1}{4}$.',
        'This option inverts the second fraction as if dividing rather than multiplying.',
        '$2\\frac{1}{4} = \\frac{2 \\times 4 + 1}{4} = \\frac{9}{4}$, not $\\frac{7}{4}$.',
      ],
      explanation:
        '$2\\frac{1}{4} \\times 1\\frac{1}{3} = \\frac{9}{4} \\times \\frac{4}{3} = \\frac{9}{3} \\times \\frac{4}{4} = 3 \\times 1 = 3$.',
      supportingExcerpt: 'To multiply mixed numbers, first convert them to improper fractions and cancel common factors.',
      conceptLabel: 'Multiplication of Mixed Numbers',
    },
    {
      stem: 'A student has $\\$1\\,800$ and spends $\\frac{2}{5}$ of it on textbooks and $\\frac{1}{3}$ of the remainder on stationery. How much money is left?',
      correctText: '$\\$720$',
      distractors: [
        '$\\$480$',
        '$\\$360$',
        '$\\$1\\,080$',
      ],
      misconceptionNotes: [
        'The $\\frac{1}{3}$ spent on stationery is $\\frac{1}{3}$ of the remainder ($\\$1\\,080$), not $\\frac{1}{3}$ of the original $\\$1\\,800$.',
        '$\\$360$ is the amount spent on stationery; the amount left is $\\$1\\,080 - \\$360 = \\$720$.',
        '$\\$1\\,080$ is the remainder after buying textbooks, before subtracting the cost of stationery.',
      ],
      explanation:
        'Textbooks cost $\\frac{2}{5} \\times 1800 = \\$720$. Remainder $= 1800 - 720 = \\$1\\,080$. Stationery costs $\\frac{1}{3} \\times 1080 = \\$360$. Money left $= 1080 - 360 = \\$720$.',
      supportingExcerpt: 'Word problems involving fractions: convert the word problem into fractional operations and simplify.',
      conceptLabel: 'Multi-Step Fraction Remainder Word Problem',
    },
  ];
}

function isValidShortTerm(term: string): boolean {
  const cleaned = term.trim();
  if (cleaned.length < 2 || cleaned.length > 58) return false;
  const words = cleaned.split(/\s+/);
  if (words.length > 7) return false;
  if (
    /^(?:there|we|you|he|she|it|they|this|these|those|one|some|many|most|almost|when|if|because|for|also|that|which|what|how|where)\b/i.test(
      cleaned
    )
  ) {
    return false;
  }
  const lastWord = words[words.length - 1].replace(/[.,;:!?]/g, '').toLowerCase();
  if (
    /^(?:the|a|an|of|in|to|for|with|on|at|from|by|and|or|as|that|which|is|are|was|were|began|started|has|have|can|will|basic|they|it|this|these|those|them|he|she|we|you)$/i.test(
      lastWord
    )
  ) {
    return false;
  }
  if (/\b(?:began|decided|went|said|told|asked|gives|they|this|these)\b/i.test(cleaned)) {
    return false;
  }
  return true;
}

function isBuiltInMathCurriculumPassage(passage: ExtractedPassage): boolean {
  return passage.documentId === 'doc-math-g7-t1';
}

/**
 * Dynamically extracts worked arithmetic/algebraic equations and quantitative relationships directly
 * from ANY uploaded document's passage text and formats them as LaTeX ($...$) calculation blueprints.
 */
function extractDynamicCalculationBlueprintsFromPassage(
  passage: ExtractedPassage
): PrebuiltQuestionBlueprint[] {
  if (!/math|algebra|geometry|arithmetic|numeracy|quantitative/i.test(passage.subject)) {
    return [];
  }
  const blueprints: PrebuiltQuestionBlueprint[] = [];
  const lines = passage.content.split(/\n+/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Match explicit worked equations like "a + b = c", "-11 - 19 = -30", "12 * 4 = 48"
    const eqMatch = line.match(
      /(?:^|\s)([−\-]?\d+(?:\.\d+)?)\s*([+\−\-×*÷/])\s*\(?([−\-]?\d+(?:\.\d+)?)\)?\s*=\s*([−\-]?\d+(?:\.\d+)?)(?:\b|$)/
    );
    if (eqMatch) {
      const a = Number(eqMatch[1].replace('−', '-'));
      const rawOp = eqMatch[2];
      const b = Number(eqMatch[3].replace('−', '-'));
      const expected = Number(eqMatch[4].replace('−', '-'));
      let actual = NaN;
      let latexOp = '+';

      if (rawOp === '+') {
        actual = a + b;
        latexOp = '+';
      } else if (rawOp === '-' || rawOp === '−') {
        actual = a - b;
        latexOp = '-';
      } else if (rawOp === '×' || rawOp === '*') {
        actual = a * b;
        latexOp = '\\times';
      } else if ((rawOp === '÷' || rawOp === '/') && b !== 0) {
        actual = a / b;
        latexOp = '\\div';
      }

      if (!Number.isNaN(actual) && Math.abs(actual - expected) < 1e-6) {
        const bDisplay = b < 0 ? `(${b})` : `${b}`;
        const exprLatex = `$${a} ${latexOp} ${bDisplay}$`;
        const wrongSign = expected === 0 ? a - b + 4 : -expected;
        const wrongOpVal =
          rawOp === '+' || rawOp === '-' || rawOp === '−' ? a * b : a + b;
        const offByTwo = expected + (expected >= 0 ? 4 : -4);

        blueprints.push({
          stem: `What is the exact value of the mathematical expression ${exprLatex}?`,
          correctText: `$${expected}$`,
          distractors: [
            `$${wrongSign}$`,
            `$${wrongOpVal}$`,
            `$${offByTwo}$`,
          ],
          misconceptionNotes: [
            `This option reverses the sign of the result ($${wrongSign}$ instead of $${expected}$).`,
            `This option applies the wrong arithmetic operation to $${a}$ and $${b}$.`,
            `This option makes a magnitude calculation error of $4$ units.`,
          ],
          explanation: `Evaluating ${exprLatex} directly gives $${expected}$.`,
          supportingExcerpt: line.slice(0, 160),
          conceptLabel: `Calculation of ${exprLatex}`,
        });
      }
    }

    // Also match linear equations in one variable like "2x + 5 = 17" or "3x - 4 = 11"
    const linMatch = line.match(
      /(?:^|\s)(\d+)\s*([a-zA-Z])\s*([+\−\-])\s*(\d+)\s*=\s*([−\-]?\d+)(?:\b|$)/
    );
    if (linMatch) {
      const coeff = Number(linMatch[1]);
      const variable = linMatch[2];
      const op = linMatch[3] === '−' ? '-' : linMatch[3];
      const constant = Number(linMatch[4]);
      const rhs = Number(linMatch[5].replace('−', '-'));
      if (coeff > 0) {
        const isolatedRhs = op === '+' ? rhs - constant : rhs + constant;
        if (isolatedRhs % coeff === 0) {
          const sol = isolatedRhs / coeff;
          const wrongOpRhs = op === '+' ? rhs + constant : rhs - constant;
          const wrongSol = Math.round((wrongOpRhs / coeff) * 10) / 10;
          const eqLatex = `$${coeff}${variable} ${op} ${constant} = ${rhs}$`;
          const invVerb = op === '+' ? `subtracting $${constant}$` : `adding $${constant}$`;

          blueprints.push({
            stem: `Solve the linear equation ${eqLatex} for $${variable}$.`,
            correctText: `$${variable} = ${sol}$`,
            distractors: [
              `$${variable} = ${wrongSol}$`,
              `$${variable} = ${isolatedRhs * coeff}$`,
              `$${variable} = ${isolatedRhs - coeff}$`,
            ],
            misconceptionNotes: [
              `This option fails to invert the sign of $${constant}$ when moving it across the equals sign.`,
              `This option multiplies by the coefficient $${coeff}$ instead of dividing by $${coeff}$.`,
              `This option subtracts the coefficient $${coeff}$ instead of dividing both sides by $${coeff}$.`,
            ],
            explanation: `Starting from ${eqLatex}, ${invVerb} on both sides gives $${coeff}${variable} = ${isolatedRhs}$. Dividing both sides by $${coeff}$ gives $${variable} = \\frac{${isolatedRhs}}{${coeff}} = ${sol}$.`,
            supportingExcerpt: line.slice(0, 160),
            conceptLabel: `Solving Linear Equation ${eqLatex}`,
          });
        }
      }
    }
  }

  return blueprints;
}

function parseConceptUnits(passages: ExtractedPassage[]): ParsedConceptUnit[] {
  const units: ParsedConceptUnit[] = [];
  const addedMathBlueprintWeeks = new Set<string>();

  for (const passage of passages) {
    const docWeekKey = `${passage.documentId}::w${passage.weekNumber}`;

    // 0. Check if passage contains structured MCQs (e.g. Music, PHE, or uploaded MCQ banks)
    const structuredFromKeyFacts: ParsedMCQItem[] = [];
    for (const kf of passage.keyFacts) {
      if (kf.startsWith('@@MCQ@@')) {
        try {
          const parsed = JSON.parse(kf.slice(7)) as ParsedMCQItem;
          if (parsed && parsed.stem && Array.isArray(parsed.options) && parsed.options.length === 4) {
            structuredFromKeyFacts.push(parsed);
          }
        } catch {
          // ignore malformed JSON
        }
      }
    }
    const structuredMCQs =
      structuredFromKeyFacts.length > 0
        ? structuredFromKeyFacts
        : extractStructuredMCQsFromText(passage.content);

    if (structuredMCQs.length > 0) {
      for (const mcq of structuredMCQs) {
        const letterIdx = ['A', 'B', 'C', 'D'].indexOf(mcq.correctOptionId);
        const safeCorrectIdx = letterIdx >= 0 ? letterIdx : 0;
        const correctText = formatCleanOptionText(mcq.options[safeCorrectIdx]);
        const distractors = mcq.options
          .filter((_, idx) => idx !== safeCorrectIdx)
          .map((opt) => formatCleanOptionText(opt)) as [string, string, string];

        const bp: PrebuiltQuestionBlueprint = {
          stem: stripWeekReferences(mcq.stem),
          correctText,
          distractors,
          misconceptionNotes: [
            'This option represents a closely related concept or common misconception on this topic.',
            'This option reverses or overlooks a key distinguishing detail required by the question.',
            'This option applies to a different condition or category within the subject.',
          ],
          explanation: mcq.explanation
            ? formatMathExpressionsToKaTeX(mcq.explanation)
            : `The correct answer is "${correctText}".`,
          supportingExcerpt: `${mcq.stem} — Correct Answer: ${correctText}`,
          conceptLabel: stripWeekReferences(passage.lessonTitle || passage.sectionHeading || passage.subject),
        };

        units.push({
          passage,
          sentence: bp.supportingExcerpt,
          shortTerm: bp.conceptLabel,
          hasExplicitTerm: true,
          detailedPrimaryFact: correctText,
          detailedSecondaryFact: distractors[0],
          comprehensiveStatement: correctText,
          prebuiltBlueprint: bp,
        });
      }
      continue;
    }

    // 1. Dynamically extract equations/calculations only if the passage belongs to Mathematics
    const dynamicCalcBlueprints = extractDynamicCalculationBlueprintsFromPassage(passage);
    for (const bp of dynamicCalcBlueprints) {
      units.push({
        passage,
        sentence: bp.supportingExcerpt,
        shortTerm: bp.conceptLabel,
        hasExplicitTerm: true,
        detailedPrimaryFact: bp.correctText,
        detailedSecondaryFact: bp.explanation,
        comprehensiveStatement: bp.correctText,
        prebuiltBlueprint: bp,
      });
    }

    // 2. Only for the built-in Mathematics curriculum document, include the worked LaTeX calculation blueprints
    if (isBuiltInMathCurriculumPassage(passage) && !addedMathBlueprintWeeks.has(docWeekKey)) {
      addedMathBlueprintWeeks.add(docWeekKey);
      const mathBlueprints = buildMathCalculationBlueprintsForWeek(passage.weekNumber);
      for (const bp of mathBlueprints) {
        units.push({
          passage,
          sentence: bp.supportingExcerpt,
          shortTerm: bp.conceptLabel,
          hasExplicitTerm: true,
          detailedPrimaryFact: bp.correctText,
          detailedSecondaryFact: bp.explanation,
          comprehensiveStatement: bp.correctText,
          prebuiltBlueprint: bp,
        });
      }
    }

    const sentences =
      passage.keyFacts.length > 0 ? passage.keyFacts : extractSentences(passage.content);

    let lastExplicitTerm = '';

    for (let i = 0; i < sentences.length; i++) {
      const rawSentence = sentences[i];
      const sentence = stripWeekReferences(normalizeBoldAndAllCaps(rawSentence))
        .replace(/^(?:[•▪◦*\-]|\d+[.)]|[iIvVxX]{1,4}[.)]|[a-g][.)]+)\s+/, '')
        .trim();

      if (sentence.length < 20 || isHeadingOrTemplateNoiseLine(sentence)) {
        continue;
      }

      const neighborRaw =
        sentences[(i + 1) % sentences.length] !== rawSentence
          ? sentences[(i + 1) % sentences.length]
          : sentence;

      let shortTerm = '';
      let hasExplicitTerm = false;
      let predicateBody = sentence;

      const colonMatch = sentence.match(/^([A-Za-z][A-Za-z0-9\s\-()/−+×÷]{1,56}?):\s+(.+)$/);
      const verbMatch = sentence.match(
        /^([A-Za-z][A-Za-z0-9\s\-()]{1,50}?)\s+(?:is defined as|can be described as|is known as|are known as|is called|are called|refers to|means|states that|represents|consists of|originates from|starts from|controls|allows|loses|gains|divides|multiplies|stores|produces|requires|measures|equals|contains|includes|forms|causes|prevents|occurs|takes place|is the|are the|is a|is an|was the|were the|is|are|was|were|has|have|can)\s+(.+)$/i
      );

      if (colonMatch) {
        const candidateTerm = colonMatch[1]
          .replace(/^(?:the|a|an)\s+/i, '')
          .replace(/^[A-Z]\s+for\s+/i, '')
          .trim();
        if (isValidShortTerm(candidateTerm)) {
          shortTerm = capitalizeFirst(candidateTerm);
          hasExplicitTerm = !/^simplifying\b/i.test(shortTerm);
          if (hasExplicitTerm) {
            lastExplicitTerm = shortTerm;
          }
          predicateBody = colonMatch[2].trim();
        }
      } else if (verbMatch) {
        const rawSubj = verbMatch[1].trim();
        const isPronoun = /^(?:it|they|this|these)\b/i.test(rawSubj);
        if (isPronoun && lastExplicitTerm) {
          shortTerm = lastExplicitTerm;
          hasExplicitTerm = true;
          predicateBody = sentence
            .replace(/^(?:it|they|this|these)\s+(?:is|are|also\s+is|also\s+are|can\s+be)?\s*/i, '')
            .trim();
        } else if (!isPronoun) {
          const candidateTerm = rawSubj
            .replace(/^(?:the|a|an|in|during|for)\s+/i, '')
            .replace(/^[A-Z]\s+for\s+/i, '')
            .trim();
          if (isValidShortTerm(candidateTerm)) {
            shortTerm = capitalizeFirst(candidateTerm);
            hasExplicitTerm = true;
            lastExplicitTerm = shortTerm;
            predicateBody = verbMatch[2].trim();
          }
        }
      } else if (/^(?:it|they|this|these)\b/i.test(sentence) && lastExplicitTerm) {
        shortTerm = lastExplicitTerm;
        hasExplicitTerm = true;
        predicateBody = sentence.replace(/^(?:it|they|this|these)\s+/i, '').trim();
      }

      if (!shortTerm) {
        if (lastExplicitTerm) {
          shortTerm = lastExplicitTerm;
          hasExplicitTerm = true;
        } else {
          continue;
        }
      }

      if (/^simplifying\b/i.test(shortTerm)) {
        continue;
      }

      const primaryClause = formatCleanOptionText(extractKeyPointClause(predicateBody, 18));
      const neighborClause = formatCleanOptionText(extractKeyPointClause(neighborRaw, 16));

      if (primaryClause.length < 4 || primaryClause.toLowerCase() === shortTerm.toLowerCase()) {
        continue;
      }

      const detailedPrimaryFact = capitalizeFirst(primaryClause);
      const detailedSecondaryFact =
        neighborClause.toLowerCase() !== primaryClause.toLowerCase() &&
        neighborClause.length >= 6
          ? capitalizeFirst(neighborClause)
          : capitalizeFirst(primaryClause);
      const comprehensiveStatement = capitalizeFirst(primaryClause);

      units.push({
        passage,
        sentence,
        shortTerm,
        hasExplicitTerm,
        detailedPrimaryFact,
        detailedSecondaryFact,
        comprehensiveStatement,
      });
    }
  }

  return units;
}

/**
 * Interleaves concept units in round-robin order across every selected document and every week (Weeks 1 to 6)
 * so that questions are evenly distributed across Week 1 through Week 6 of each uploaded file.
 */
function orderUnitsRoundRobinAcrossWeeks(units: ParsedConceptUnit[]): ParsedConceptUnit[] {
  const bucketMap = new Map<string, ParsedConceptUnit[]>();
  for (const unit of units) {
    const key = `${unit.passage.documentId}::w${unit.passage.weekNumber}`;
    const list = bucketMap.get(key) || [];
    list.push(unit);
    bucketMap.set(key, list);
  }

  const sortedBucketKeys = Array.from(bucketMap.keys()).sort((a, b) => {
    const [docA, wkA] = a.split('::w');
    const [docB, wkB] = b.split('::w');
    if (docA !== docB) return docA.localeCompare(docB);
    return Number(wkA) - Number(wkB);
  });

  const buckets = sortedBucketKeys.map((k) => bucketMap.get(k)!).filter((b) => b.length > 0);
  const maxLen = Math.max(0, ...buckets.map((b) => b.length));
  const interleaved: ParsedConceptUnit[] = [];

  for (let row = 0; row < maxLen; row++) {
    for (let col = 0; col < buckets.length; col++) {
      const bucket = buckets[col];
      interleaved.push(bucket[row % bucket.length]);
    }
  }

  return interleaved;
}

function selectDistinctPeers(
  unit: ParsedConceptUnit,
  allUnits: ParsedConceptUnit[],
  offset: number,
  requireExplicitTerm: boolean = false
): [ParsedConceptUnit, ParsedConceptUnit, ParsedConceptUnit] {
  const seenTerms = new Set<string>([unit.shortTerm.toLowerCase()]);
  const seenFacts = new Set<string>([unit.detailedPrimaryFact.toLowerCase()]);

  const candidates = allUnits.filter((u) => {
    if (u.prebuiltBlueprint) return false;
    if (!u.hasExplicitTerm) return false;
    if (requireExplicitTerm && !u.hasExplicitTerm) return false;
    if (u.shortTerm.toLowerCase() === unit.shortTerm.toLowerCase()) return false;
    if (u.detailedPrimaryFact.toLowerCase() === unit.detailedPrimaryFact.toLowerCase()) return false;
    return true;
  });

  const sameWeekAndSubj = candidates.filter(
    (u) => u.passage.subject === unit.passage.subject && u.passage.weekNumber === unit.passage.weekNumber
  );
  const sameSubj = candidates.filter((u) => u.passage.subject === unit.passage.subject);
  const pool =
    sameWeekAndSubj.length >= 3
      ? sameWeekAndSubj
      : sameSubj.length >= 3
      ? sameSubj
      : candidates.length > 0
      ? candidates
      : allUnits;

  const picked: ParsedConceptUnit[] = [];
  for (let step = 0; step < pool.length && picked.length < 3; step++) {
    const cand = pool[(offset + step) % pool.length];
    const tKey = cand.shortTerm.toLowerCase();
    const fKey = cand.detailedPrimaryFact.toLowerCase();
    if (!seenTerms.has(tKey) && !seenFacts.has(fKey)) {
      seenTerms.add(tKey);
      seenFacts.add(fKey);
      picked.push(cand);
    }
  }

  while (picked.length < 3) {
    picked.push(pool[(offset + picked.length) % Math.max(1, pool.length)] || unit);
  }

  return [picked[0], picked[1], picked[2]];
}

/**
 * Creates a subtle, plausible, considerable-length distractor directly from a file statement by swapping
 * a critical scientific/mathematical mechanism, direction, or value while preserving similar length.
 */
function invertDetailedStatement(clause: string, variant: number = 1): string {
  const swaps: Array<[RegExp, string]> = [
    [/\blose electrons\b/i, 'gain electrons into their outer shell'],
    [/\bgain electrons\b/i, 'lose electrons from their outer shell'],
    [/\bpositively charged\b/i, 'negatively charged'],
    [/\bnegatively charged\b/i, 'positively charged'],
    [/\bliquid to solid\b/i, 'liquid to gaseous vapour'],
    [/\bliquid to gas\b/i, 'gaseous vapour directly to solid'],
    [/\bgas to liquid\b/i, 'liquid directly to solid'],
    [/\bsolid to liquid\b/i, 'liquid directly to solid'],
    [/\bstarch\b/i, 'glycogen granules'],
    [/\bglycogen\b/i, 'insoluble starch'],
    [/\bright of 0\b/i, 'left of 0'],
    [/\bleft of zero\b/i, 'right of zero'],
    [/\bright of zero\b/i, 'left of zero'],
    [/\bhighest to lowest\b/i, 'lowest to highest'],
    [/\blowest to highest\b/i, 'highest to lowest'],
    [/\bless than\b/i, 'strictly greater than'],
    [/\bgreater than\b/i, 'strictly less than'],
    [/\bat the top\b/i, 'at the bottom'],
    [/\bbelow in a fraction\b/i, 'at the top in a fraction'],
    [/\bwithout remainder\b/i, 'leaving a non-zero remainder'],
    [/\bhave backbones\b/i, 'lack an internal backbone'],
    [/\bincreases(?!\s+or\s+decreases)\b/i, 'decreases progressively'],
    [/\bdecreases\b/i, 'increases progressively'],
    [/\bdirectly proportional\b/i, 'inversely proportional'],
    [/\binversely proportional\b/i, 'directly proportional'],
    [/\babsorbs\b/i, 'releases and expels'],
    [/\breleases\b/i, 'absorbs and retains'],
    [/\bpositive\b/i, 'negative'],
    [/\bnegative\b/i, 'positive'],
    [/\bmultiplying\b/i, 'dividing'],
    [/\bdividing\b/i, 'multiplying'],
    [/\bmultiply\b/i, 'divide'],
    [/\bdivide\b/i, 'multiply'],
    [/\badding\b/i, 'subtracting'],
    [/\bsubtracting\b/i, 'adding'],
    [/\badd\b/i, 'subtract'],
    [/\bsubtract\b/i, 'add'],
    [/\binside\b/i, 'outside'],
    [/\bcenter of a cell\b/i, 'outermost boundary of a cell'],
    [/\bsemi-permeable\b/i, 'completely impermeable'],
    [/\bgood conductor\b/i, 'poor conductor and thermal insulator'],
    [/\bplant\b/i, 'animal'],
    [/\banimal\b/i, 'plant'],
    [/\bone million\b/i, 'one hundred thousand'],
    [/\bone billion\b/i, 'one hundred million'],
    [/\bone trillion\b/i, 'one billion'],
    [/\bno life in them\b/i, 'active cellular life in them'],
    [/\blife in them\b/i, 'no cellular life in them'],
    [/\btestosterone\b/i, 'progesterone and estrogen'],
    [/\bestrogen\b/i, 'testosterone'],
    [/\bchloroplast\b/i, 'mitochondrion'],
    [/\bcell wall\b/i, 'cytoplasmic membrane'],
    [/\bconstant everywhere\b/i, 'variable from place to place'],
    [/\bvaries from place to place\b/i, 'constant throughout the universe'],
  ];

  let modified = clause;
  let swappedCount = 0;

  for (let idx = 0; idx < swaps.length; idx++) {
    const [pattern, replacement] = swaps[(idx + variant - 1) % swaps.length];
    if (pattern.test(modified)) {
      modified = modified.replace(pattern, replacement);
      swappedCount++;
      if (swappedCount >= 1) break;
    }
  }

  const numMatches = Array.from(modified.matchAll(/([−\-]?\d+(?:\.\d+)?)/g));
  if (numMatches.length > 0 && (swappedCount === 0 || variant >= 2)) {
    const targetMatch = numMatches[(variant - 1) % numMatches.length];
    const rawNum = targetMatch[1];
    const normalizedNum = rawNum.replace('−', '-');
    const val = parseFloat(normalizedNum);
    if (!Number.isNaN(val)) {
      const altered =
        val === 0
          ? variant * 2
          : val < 0
          ? variant === 1
            ? Math.abs(val)
            : val - 4
          : val === 1
          ? variant + 1
          : val === 11
          ? 14
          : val === 12
          ? 15
          : val === 100
          ? 10
          : val > 10
          ? val + (variant === 1 ? 6 : -4)
          : val + variant;
      modified = modified.replace(rawNum, String(altered));
      swappedCount++;
    }
  }

  if (swappedCount > 0 && modified.toLowerCase() !== clause.toLowerCase()) {
    return modified;
  }

  return '';
}

/**
 * Builds a clean, standard Grade 7 examination question and 4 parallel, plausible options
 * with zero meta-references ("from the study material") and zero embedded reasons ("because...").
 */
function buildBlueprintStemVariant(
  baseStem: string,
  conceptLabel: string,
  subject: string,
  aspectIndex: number
): string {
  const cleanStem = stripWeekReferences(normalizeBoldAndAllCaps(baseStem)).trim();
  if (aspectIndex <= 0) {
    return cleanStem;
  }

  const isMath = subject.trim().toLowerCase() === 'mathematics';
  if (isMath) {
    const mathPrefixes = [
      '',
      'Calculate the following: ',
      'Solve the following problem: ',
      'Find the exact value: ',
      'Determine the correct result: ',
      'Work out the following: ',
      'Evaluate carefully: ',
      'Compute the exact answer: ',
    ];
    const prefix = mathPrefixes[aspectIndex % mathPrefixes.length];
    return prefix ? `${prefix}${decapitalize(cleanStem)}` : cleanStem;
  }

  const rawTopic = stripWeekReferences(normalizeBoldAndAllCaps(conceptLabel))
    .replace(/^[:\-–—\s]+|[:\-–—\s]+$/g, '')
    .trim();
  const topicText =
    rawTopic && rawTopic.length >= 3 && rawTopic.length <= 65 ? rawTopic : subject;

  const lowerFirst = decapitalize(cleanStem);

  const variantIdx = aspectIndex % 10;
  if (variantIdx === 1) {
    if (/^which of the following\b/i.test(cleanStem)) {
      return cleanStem.replace(/^which of the following\b/i, 'Identify which of the following');
    }
    if (/^which\b/i.test(cleanStem)) {
      return cleanStem.replace(/^which\b/i, 'Select which');
    }
    if (/^what is\b/i.test(cleanStem)) {
      return cleanStem.replace(/^what is\b/i, 'Determine what is');
    }
    if (/^what\b/i.test(cleanStem)) {
      return cleanStem.replace(/^what\b/i, 'Identify what');
    }
    if (/^who\b/i.test(cleanStem)) {
      return cleanStem.replace(/^who\b/i, 'Identify who');
    }
    return `Select the accurate option: ${cleanStem}`;
  }
  if (variantIdx === 2) {
    return `Regarding ${decapitalize(topicText)}, ${lowerFirst}`;
  }
  if (variantIdx === 3) {
    return `When examining ${decapitalize(topicText)}, ${lowerFirst}`;
  }
  if (variantIdx === 4) {
    return `In the context of ${decapitalize(topicText)}, ${lowerFirst}`;
  }
  if (variantIdx === 5) {
    return `Within the study of ${decapitalize(topicText)}, ${lowerFirst}`;
  }
  if (variantIdx === 6) {
    return `Considering the principles of ${decapitalize(topicText)}, ${lowerFirst}`;
  }
  if (variantIdx === 7) {
    return `In relation to ${decapitalize(topicText)}, ${lowerFirst}`;
  }
  if (variantIdx === 8) {
    return `From the rules governing ${decapitalize(topicText)}, ${lowerFirst}`;
  }
  return `When analyzing ${decapitalize(topicText)}, ${lowerFirst}`;
}

function buildDistinctAspectQuestionAndOptions(
  unit: ParsedConceptUnit,
  allUnits: ParsedConceptUnit[],
  unitIdx: number,
  aspectIndex: number
): {
  stem: string;
  correctText: string;
  distractors: string[];
  fallbackPool: string[];
  misconceptionNotes: [string, string, string];
} {
  // 1. Prebuilt question blueprint (Structured MCQ from curriculum subject file or Math calculation)
  if (unit.prebuiltBlueprint) {
    const bp = unit.prebuiltBlueprint;
    const stem = buildBlueprintStemVariant(
      bp.stem,
      bp.conceptLabel || unit.passage.lessonTitle || unit.passage.subject,
      unit.passage.subject,
      aspectIndex
    );
    return {
      stem,
      correctText: formatCleanOptionText(bp.correctText),
      distractors: bp.distractors.map((d) => formatCleanOptionText(d)),
      fallbackPool: bp.distractors.map((d) => formatCleanOptionText(d)),
      misconceptionNotes: bp.misconceptionNotes,
    };
  }

  const [termPeer1, termPeer2, termPeer3] = selectDistinctPeers(
    unit,
    allUnits,
    unitIdx + aspectIndex + 1,
    true
  );
  const [factPeer1, factPeer2, factPeer3] = selectDistinctPeers(
    unit,
    allUnits,
    unitIdx + aspectIndex * 3 + 1,
    false
  );

  const subtle1 = invertDetailedStatement(unit.detailedPrimaryFact, 1);
  const subtle2 = invertDetailedStatement(unit.detailedPrimaryFact, 2);

  const peerFactPool = [
    factPeer1.detailedPrimaryFact,
    factPeer2.detailedPrimaryFact,
    factPeer3.detailedPrimaryFact,
    termPeer1.detailedPrimaryFact,
    termPeer2.detailedPrimaryFact,
    termPeer3.detailedPrimaryFact,
  ].filter(Boolean);

  const effectiveAspect = aspectIndex % 5;

  // Aspect 0: Direct Concept / Term Identification (4 concise, parallel term options)
  if (
    effectiveAspect === 0 &&
    unit.hasExplicitTerm &&
    termPeer1.shortTerm.toLowerCase() !== unit.shortTerm.toLowerCase() &&
    termPeer2.shortTerm.toLowerCase() !== unit.shortTerm.toLowerCase()
  ) {
    const escapedTerm = unit.shortTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const maskedSentence = unit.sentence
      .replace(new RegExp(`^(?:[A-Z]\\s+for\\s+)?${escapedTerm}\\s*(?::|is defined as|is|are|refers to|means)?\\s*`, 'i'), '')
      .replace(/^(?:it|they|this|these)\s+(?:is|are|also\s+is|also\s+are|can\s+be)?\s*/i, '')
      .replace(new RegExp(`\\b${escapedTerm}\\b`, 'gi'), 'this concept');
    const coreClause = formatCleanOptionText(extractKeyPointClause(maskedSentence, 16))
      .replace(/^(?:it|they|this|these)\s+(?:is|are)?\s*/i, '')
      .replace(/[.!?:,;]+$/, '')
      .trim();

    if (coreClause.length >= 10 && !/\bthe\s+this\b/i.test(coreClause)) {
      const startsWithVerb =
        /^(?:contains|controls|allows|loses|gains|divides|multiplies|stores|produces|requires|measures|equals|includes|forms|causes|prevents|occurs|takes|has|have|consists|originates|starts|refers|means|represents|uses|burns)\b/i.test(
          coreClause
        );
      const stem = startsWithVerb
        ? `Which of the following ${decapitalize(coreClause)}?`
        : `Which of the following is ${decapitalize(coreClause)}?`;

      return {
        stem,
        correctText: capitalizeFirst(formatCleanOptionText(unit.shortTerm)),
        distractors: [
          capitalizeFirst(formatCleanOptionText(termPeer1.shortTerm)),
          capitalizeFirst(formatCleanOptionText(termPeer2.shortTerm)),
          capitalizeFirst(formatCleanOptionText(termPeer3.shortTerm)),
        ],
        fallbackPool: [
          capitalizeFirst(formatCleanOptionText(factPeer1.shortTerm)),
          capitalizeFirst(formatCleanOptionText(factPeer2.shortTerm)),
          capitalizeFirst(formatCleanOptionText(factPeer3.shortTerm)),
        ],
        misconceptionNotes: [
          `${termPeer1.shortTerm} refers to a different concept within this subject.`,
          `${termPeer2.shortTerm} has a distinct definition and function.`,
          `${termPeer3.shortTerm} does not match the property described in the question.`,
        ],
      };
    }
  }

  // Aspect 1: Core Definition & Understanding
  if (effectiveAspect === 1 || effectiveAspect === 0) {
    const stem = `Which of the following statements is true about ${decapitalize(
      unit.shortTerm
    )}?`;
    return {
      stem,
      correctText: unit.detailedPrimaryFact,
      distractors: [
        subtle1 || factPeer1.detailedPrimaryFact,
        factPeer1.detailedPrimaryFact,
        subtle2 || factPeer2.detailedPrimaryFact,
      ],
      fallbackPool: peerFactPool,
      misconceptionNotes: [
        'This option alters a key condition or direction of the concept.',
        `This statement describes ${decapitalize(factPeer1.shortTerm)} rather than ${decapitalize(unit.shortTerm)}.`,
        `This statement applies to ${decapitalize(factPeer2.shortTerm)} instead of ${decapitalize(unit.shortTerm)}.`,
      ],
    };
  }

  // Aspect 2: Functional Mechanism & Application
  if (effectiveAspect === 2) {
    const stem = `What is the primary characteristic or function of ${decapitalize(
      unit.shortTerm
    )}?`;
    return {
      stem,
      correctText: unit.comprehensiveStatement,
      distractors: [
        factPeer1.comprehensiveStatement,
        invertDetailedStatement(unit.comprehensiveStatement, 1) || factPeer2.comprehensiveStatement,
        factPeer3.comprehensiveStatement,
      ],
      fallbackPool: peerFactPool,
      misconceptionNotes: [
        `This statement describes ${decapitalize(factPeer1.shortTerm)}.`,
        'This option reverses the actual relationship or process.',
        `This statement applies to ${decapitalize(factPeer3.shortTerm)}.`,
      ],
    };
  }

  // Aspect 3: Distinguishing Criterion Between Related Concepts
  if (effectiveAspect === 3) {
    const stem = `Which feature accurately distinguishes ${decapitalize(
      unit.shortTerm
    )} from other related concepts?`;
    const subtleSec = invertDetailedStatement(unit.detailedSecondaryFact, 1);
    return {
      stem,
      correctText: unit.detailedSecondaryFact,
      distractors: [
        subtleSec || factPeer1.detailedSecondaryFact,
        factPeer1.detailedSecondaryFact,
        factPeer2.detailedSecondaryFact,
      ],
      fallbackPool: [factPeer3.detailedSecondaryFact, ...peerFactPool],
      misconceptionNotes: [
        'This option modifies a key distinguishing property.',
        `This distinguishing feature belongs to ${decapitalize(factPeer1.shortTerm)}.`,
        `This distinguishing feature belongs to ${decapitalize(factPeer2.shortTerm)}.`,
      ],
    };
  }

  // Aspect 4: Analytical Verification
  const stem = `Which statement accurately describes ${decapitalize(unit.shortTerm)}?`;
  const cleanClause = capitalizeFirst(
    formatCleanOptionText(extractKeyPointClause(unit.sentence, 16))
  );
  return {
    stem,
    correctText: cleanClause,
    distractors: [
      invertDetailedStatement(cleanClause, 1) || factPeer2.detailedPrimaryFact,
      factPeer1.detailedPrimaryFact,
      factPeer3.detailedPrimaryFact,
    ],
    fallbackPool: peerFactPool,
    misconceptionNotes: [
      'This option inverts a core factual condition.',
      `This statement pertains to ${decapitalize(factPeer1.shortTerm)} rather than ${decapitalize(unit.shortTerm)}.`,
      `This statement pertains to ${decapitalize(factPeer3.shortTerm)} rather than ${decapitalize(unit.shortTerm)}.`,
    ],
  };
}

export interface QuestionSynthesisOptions {
  seed?: number;
  iteration?: number;
  avoidStems?: Set<string> | string[];
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

/**
 * Deterministic, source-grounded question synthesis engine that generates validated Grade 7 CBT questions
 * strictly from the selected document passages and weeks (Week 1 to Week 6), with 100% deduplicated questions,
 * clean parallel options without embedded justifications, and KaTeX math formatting.
 */
export function synthesizeGroundedQuestionsFromPassages(
  passages: ExtractedPassage[],
  documentTitleLookup: Record<string, string>,
  requestedCount: number,
  difficulty: DifficultyLevel,
  options?: QuestionSynthesisOptions
): ValidatedQuestion[] {
  if (passages.length === 0 || requestedCount <= 0) {
    return [];
  }

  const iter = Math.max(0, (options?.iteration ?? 1) - 1);
  const seedNum = options?.seed ?? (iter > 0 ? iter * 1337 : 0);
  const avoidSet = new Set(
    Array.from(options?.avoidStems || []).map((s) => s.toLowerCase().trim())
  );

  const rawUnits = parseConceptUnits(passages);
  if (rawUnits.length === 0) {
    return [];
  }

  // Group units by (documentId, weekNumber 1..6) so every selected week gets an even round-robin share
  const bucketMap = new Map<string, ParsedConceptUnit[]>();
  for (const unit of rawUnits) {
    const key = `${unit.passage.documentId}::w${unit.passage.weekNumber}`;
    const list = bucketMap.get(key) || [];
    list.push(unit);
    bucketMap.set(key, list);
  }
  const sortedBucketKeys = Array.from(bucketMap.keys()).sort((a, b) => {
    const [docA, wkA] = a.split('::w');
    const [docB, wkB] = b.split('::w');
    if (docA !== docB) return docA.localeCompare(docB);
    return Number(wkA) - Number(wkB);
  });
  const buckets = sortedBucketKeys.map((k) => bucketMap.get(k)!).filter((b) => b.length > 0);
  const bucketCursors = buckets.map((b, bIdx) =>
    iter > 0 ? (bIdx * 7 + iter * 11 + (seedNum % 73)) % b.length : 0
  );

  const units = orderUnitsRoundRobinAcrossWeeks(rawUnits);

  const distribution = getTargetCognitiveDistribution(requestedCount);
  const plannedCategories: CognitiveCategory[] = [];
  for (const category of COGNITIVE_CATEGORIES) {
    const count = distribution[category];
    for (let i = 0; i < count; i++) {
      plannedCategories.push(category);
    }
  }
  while (plannedCategories.length < requestedCount) {
    plannedCategories.push('Application');
  }

  const optionCycle: OptionId[] = ['A', 'B', 'C', 'D'];
  const validatedQuestions: ValidatedQuestion[] = [];
  const usedStems = new Set<string>();

  const questionOpeningVariants = [
    'Which statement accurately explains',
    'What holds true concerning',
    'Which principle governs the behavior of',
    'Which key property characterizes',
    'What is an accurate description of',
    'Which conclusion is valid regarding',
    'When evaluating the properties of',
    'Which criterion defines',
    'What accounts for the characteristics of',
    'Which statement correctly describes',
  ];

  for (let i = 0; i < requestedCount; i++) {
    const bIdx = i % buckets.length;
    const bucket = buckets[bIdx];
    const startCursor = bucketCursors[bIdx];

    let chosenUnit: ParsedConceptUnit | null = null;
    let chosenBuilt: ReturnType<typeof buildDistinctAspectQuestionAndOptions> | null = null;
    let fallbackCandidate: {
      unit: ParsedConceptUnit;
      built: ReturnType<typeof buildDistinctAspectQuestionAndOptions>;
      cursor: number;
    } | null = null;

    for (let scan = 0; scan < bucket.length * 6; scan++) {
      const candidateCursor = startCursor + scan;
      const uIdx = candidateCursor % bucket.length;
      const aspectIdx = Math.floor(candidateCursor / bucket.length) + iter;
      const u = bucket[uIdx];

      const candidateBuilt = buildDistinctAspectQuestionAndOptions(
        u,
        units,
        i + uIdx + scan + iter * 3,
        aspectIdx
      );
      const cleanCandStem = stripWeekReferences(
        normalizeBoldAndAllCaps(candidateBuilt.stem)
      ).toLowerCase();

      if (!usedStems.has(cleanCandStem)) {
        if (!avoidSet.has(cleanCandStem)) {
          chosenUnit = u;
          chosenBuilt = candidateBuilt;
          bucketCursors[bIdx] = candidateCursor + 1;
          break;
        } else if (!fallbackCandidate) {
          fallbackCandidate = { unit: u, built: candidateBuilt, cursor: candidateCursor + 1 };
        }
      }
    }

    if (!chosenUnit || !chosenBuilt) {
      if (fallbackCandidate) {
        chosenUnit = fallbackCandidate.unit;
        chosenBuilt = fallbackCandidate.built;
        bucketCursors[bIdx] = fallbackCandidate.cursor;
      } else {
        chosenUnit = bucket[startCursor % bucket.length];
        chosenBuilt = buildDistinctAspectQuestionAndOptions(
          chosenUnit,
          units,
          startCursor % bucket.length,
          Math.floor(startCursor / bucket.length) + iter
        );
        bucketCursors[bIdx] = startCursor + 1;
      }
    }

    const category = plannedCategories[i];
    const targetCorrectId = optionCycle[(i + iter * 3) % 4];
    const docTitle =
      documentTitleLookup[chosenUnit.passage.documentId] ||
      `${chosenUnit.passage.subject} Study Guide`;

    let finalStem = stripWeekReferences(normalizeBoldAndAllCaps(chosenBuilt.stem));
    if (usedStems.has(finalStem.toLowerCase()) || avoidSet.has(finalStem.toLowerCase())) {
      if (chosenUnit.prebuiltBlueprint) {
        for (let vIdx = 1; vIdx <= 12; vIdx++) {
          const candidateStem = stripWeekReferences(
            normalizeBoldAndAllCaps(
              buildBlueprintStemVariant(
                chosenUnit.prebuiltBlueprint.stem,
                chosenUnit.prebuiltBlueprint.conceptLabel || chosenUnit.passage.lessonTitle,
                chosenUnit.passage.subject,
                vIdx + iter
              )
            )
          );
          if (
            !usedStems.has(candidateStem.toLowerCase()) &&
            !avoidSet.has(candidateStem.toLowerCase())
          ) {
            finalStem = candidateStem;
            break;
          }
        }
      } else {
        for (let vIdx = 0; vIdx < questionOpeningVariants.length; vIdx++) {
          const opener = questionOpeningVariants[(i + vIdx + iter) % questionOpeningVariants.length];
          const contextSnippet = extractKeyPointClause(chosenUnit.sentence, 7 + (vIdx % 5));
          const candidateStem = stripWeekReferences(
            normalizeBoldAndAllCaps(
              `${opener} ${decapitalize(chosenUnit.shortTerm)} in relation to ${decapitalize(
                contextSnippet
              )}?`
            )
          );
          if (
            !usedStems.has(candidateStem.toLowerCase()) &&
            !avoidSet.has(candidateStem.toLowerCase())
          ) {
            finalStem = candidateStem;
            break;
          }
        }
      }
    }
    usedStems.add(finalStem.toLowerCase());

    const finalCorrect = formatCleanOptionText(
      stripWeekReferences(normalizeBoldAndAllCaps(chosenBuilt.correctText))
    );
    const cleanDistractors = chosenBuilt.distractors.map((d) =>
      formatCleanOptionText(stripWeekReferences(normalizeBoldAndAllCaps(d)))
    );
    const cleanFallbackPool = chosenBuilt.fallbackPool.map((d) =>
      formatCleanOptionText(stripWeekReferences(normalizeBoldAndAllCaps(d)))
    );

    const { options, distractorRationales } = buildBalancedOptions(
      finalCorrect,
      cleanDistractors,
      cleanFallbackPool,
      targetCorrectId,
      chosenBuilt.misconceptionNotes,
      chosenUnit.passage.subject
    );

    const explanation = formatMathExpressionsToKaTeX(
      chosenUnit.prebuiltBlueprint
        ? chosenUnit.prebuiltBlueprint.explanation
        : `According to ${docTitle} (${chosenUnit.passage.pageReference}), "${chosenUnit.sentence}" Therefore, option ${targetCorrectId} is the correct answer.`
    );

    const opaqueToken = Math.abs((seedNum || 17) * 31 + (i + 1) * 131 + iter * 53).toString(36);
    const candidate: ValidatedQuestion = {
      id: `q-item-${i + 1}-${opaqueToken}`,
      questionNumber: i + 1,
      questionText: formatMathExpressionsToKaTeX(finalStem),
      options: options.map((opt) => ({
        id: opt.id,
        text: formatMathExpressionsToKaTeX(opt.text),
      })) as [QuestionOption, QuestionOption, QuestionOption, QuestionOption],
      correctOptionId: targetCorrectId,
      explanation,
      distractorRationales,
      conceptToRevisit: `${chosenUnit.shortTerm} (Week ${chosenUnit.passage.weekNumber})`,
      subject: chosenUnit.passage.subject,
      sourceDocumentId: chosenUnit.passage.documentId,
      sourceDocumentTitle: docTitle,
      weekNumber: chosenUnit.passage.weekNumber,
      sectionHeading: chosenUnit.passage.sectionHeading,
      pageReference: chosenUnit.passage.pageReference,
      supportingExcerpt: chosenUnit.sentence,
      cognitiveCategory: category,
      difficultyLevel: difficulty,
      validationStatus: 'validated',
    };

    const check = validateQuestionQuality(candidate);
    if (check.valid) {
      validatedQuestions.push(candidate);
    }
  }

  if (options?.shuffleQuestions && validatedQuestions.length > 1) {
    const sSeed = (seedNum || 101) + iter * 37;
    for (let idx = validatedQuestions.length - 1; idx > 0; idx--) {
      const swapIdx = (sSeed + idx * 19) % (idx + 1);
      const temp = validatedQuestions[idx];
      validatedQuestions[idx] = validatedQuestions[swapIdx];
      validatedQuestions[swapIdx] = temp;
    }
    validatedQuestions.forEach((q, idx) => {
      q.questionNumber = idx + 1;
    });
  }

  return validatedQuestions;
}

/**
 * Strips private answer keys, explanations, and ALL source document/week/page metadata
 * before sending an active attempt to the browser in Strict Examination Mode.
 */
export function stripAnswerKeyForClient(questions: ValidatedQuestion[]): PublicExamQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    questionNumber: q.questionNumber,
    questionText: q.questionText,
    options: q.options,
    subject: q.subject,
    cognitiveCategory: q.cognitiveCategory,
    difficultyLevel: q.difficultyLevel,
  }));
}

/**
 * Authoritative timer calculation from server deadline timestamp.
 */
export function computeRemainingSeconds(deadlineIso: string, nowMs: number = Date.now()): number {
  const deadlineMs = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadlineMs)) return 0;
  return Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
}

export function getTimerWarningState(
  remainingSeconds: number
): 'normal' | 'warning_5m' | 'critical_1m' | 'expired' {
  if (remainingSeconds <= 0) return 'expired';
  if (remainingSeconds <= 60) return 'critical_1m';
  if (remainingSeconds <= 300) return 'warning_5m';
  return 'normal';
}

export interface TimerUrgencyInfo {
  state: 'normal' | 'warning_5m' | 'critical_1m' | 'expired';
  isTimeRunningOut: boolean;
  pulseClass: string;
  badgeLabel: string | null;
  shouldPlayTick: boolean;
  tickIntervalSeconds: number;
}

/**
 * Computes visual pulse and subtle audio notification parameters when exam duration is nearing its end.
 */
export function getTimerUrgencyInfo(
  remainingSeconds: number,
  durationMinutes: number = 60
): TimerUrgencyInfo {
  const totalSeconds = Math.max(60, durationMinutes * 60);
  const twentyPercentThreshold = Math.min(300, Math.max(120, Math.floor(totalSeconds * 0.2)));

  if (remainingSeconds <= 0) {
    return {
      state: 'expired',
      isTimeRunningOut: true,
      pulseClass: 'exam-timer-pulse-critical',
      badgeLabel: 'Time Expired',
      shouldPlayTick: false,
      tickIntervalSeconds: 0,
    };
  }

  if (remainingSeconds <= 60) {
    return {
      state: 'critical_1m',
      isTimeRunningOut: true,
      pulseClass: 'exam-timer-pulse-critical',
      badgeLabel: 'Time Running Out!',
      shouldPlayTick: true,
      tickIntervalSeconds: 1,
    };
  }

  if (remainingSeconds <= Math.max(300, twentyPercentThreshold)) {
    return {
      state: 'warning_5m',
      isTimeRunningOut: true,
      pulseClass: 'exam-timer-pulse-warning',
      badgeLabel: 'Time Running Out',
      shouldPlayTick: true,
      tickIntervalSeconds: remainingSeconds <= 180 ? 2 : 5,
    };
  }

  return {
    state: 'normal',
    isTimeRunningOut: false,
    pulseClass: '',
    badgeLabel: null,
    shouldPlayTick: false,
    tickIntervalSeconds: 0,
  };
}

export function deriveQuestionNavState(
  response: StudentQuestionResponse | undefined
): QuestionNavState {
  if (!response || (!response.visited && !response.selectedOptionId && !response.markedForReview)) {
    return 'not_visited';
  }
  if (response.markedForReview) {
    return 'marked_for_review';
  }
  if (response.selectedOptionId) {
    return 'answered';
  }
  return 'visited_unanswered';
}

/**
 * Grades an examination attempt against the server-side validated question answer key.
 */
export function gradeExaminationAttempt(
  attempt: ExamAttempt,
  answerKeyQuestions: ValidatedQuestion[],
  submissionTrigger: 'manual' | 'timer_expired',
  submittedAtIso: string = new Date().toISOString()
): ExamResultSummary {
  const totalQuestions = answerKeyQuestions.length;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let unansweredQuestions = 0;

  const subjectMap = new Map<string, { correct: number; total: number }>();
  const weekMap = new Map<string, { subject: string; weekNumber: number; correct: number; total: number }>();
  const cognitiveMap = new Map<string, { correct: number; total: number }>();

  const reviews: QuestionReviewItem[] = [];
  const distractorUsage: Record<string, Record<OptionId, number>> = {};

  for (const q of answerKeyQuestions) {
    const resp = attempt.responses[q.id];
    const studentAnswer = resp?.selectedOptionId || null;

    let status: 'correct' | 'incorrect' | 'unanswered' = 'unanswered';
    if (studentAnswer === null) {
      unansweredQuestions++;
      status = 'unanswered';
    } else if (studentAnswer === q.correctOptionId) {
      correctAnswers++;
      status = 'correct';
    } else {
      incorrectAnswers++;
      status = 'incorrect';
      if (!distractorUsage[q.id]) {
        distractorUsage[q.id] = { A: 0, B: 0, C: 0, D: 0 };
      }
      distractorUsage[q.id][studentAnswer] = (distractorUsage[q.id][studentAnswer] || 0) + 1;
    }

    const subjStat = subjectMap.get(q.subject) || { correct: 0, total: 0 };
    subjStat.total++;
    if (status === 'correct') subjStat.correct++;
    subjectMap.set(q.subject, subjStat);

    const weekKey = `${q.subject} — Week ${q.weekNumber}`;
    const wkStat = weekMap.get(weekKey) || {
      subject: q.subject,
      weekNumber: q.weekNumber,
      correct: 0,
      total: 0,
    };
    wkStat.total++;
    if (status === 'correct') wkStat.correct++;
    weekMap.set(weekKey, wkStat);

    const cogStat = cognitiveMap.get(q.cognitiveCategory) || { correct: 0, total: 0 };
    cogStat.total++;
    if (status === 'correct') cogStat.correct++;
    cognitiveMap.set(q.cognitiveCategory, cogStat);

    const whySelectedIncorrect =
      status === 'incorrect' && studentAnswer
        ? q.distractorRationales?.[studentAnswer] ||
          `Option ${studentAnswer} is not supported by the Week ${q.weekNumber} source material.`
        : status === 'unanswered'
        ? 'No answer was selected before the examination was submitted.'
        : null;

    reviews.push({
      questionId: q.id,
      questionNumber: q.questionNumber ?? reviews.length + 1,
      questionText: q.questionText,
      options: q.options,
      studentAnswer,
      correctAnswer: q.correctOptionId,
      status,
      whySelectedIncorrect,
      whyCorrectSupported: q.explanation,
      conceptToRevisit: q.conceptToRevisit || q.sectionHeading,
      subject: q.subject,
      weekNumber: q.weekNumber,
      sourceDocumentId: q.sourceDocumentId,
      sourceDocumentTitle: q.sourceDocumentTitle,
      sectionHeading: q.sectionHeading,
      pageReference: q.pageReference,
      supportingExcerpt: q.supportingExcerpt,
      cognitiveCategory: q.cognitiveCategory,
      difficultyLevel: q.difficultyLevel,
    });
  }

  const marksPerQuestion = Math.max(0.5, attempt.config.marksPerQuestion ?? 1);
  const negativeMarkingPenalty = Math.max(0, attempt.config.negativeMarkingPenalty ?? 0);
  const passMarkPercentage = Math.min(100, Math.max(1, attempt.config.passMarkPercentage ?? 50));

  const maxPossibleMarks = Math.round(totalQuestions * marksPerQuestion * 100) / 100;
  const rawMarks =
    correctAnswers * marksPerQuestion - incorrectAnswers * negativeMarkingPenalty;
  const totalMarksEarned = Math.max(0, Math.round(rawMarks * 100) / 100);

  const percentageScore =
    maxPossibleMarks > 0
      ? Math.round(((totalMarksEarned / maxPossibleMarks) * 100) * 10) / 10
      : 0;
  const passed = percentageScore >= passMarkPercentage;

  const startMs = new Date(attempt.startedAt).getTime();
  const endMs = new Date(submittedAtIso).getTime();
  const maxDurationSec = attempt.config.durationMinutes * 60;
  const rawElapsed = Math.max(1, Math.floor((endMs - startMs) / 1000));
  const timeTakenSeconds = Math.min(maxDurationSec, rawElapsed);

  const subjectBreakdown: BreakdownStat[] = Array.from(subjectMap.entries()).map(
    ([label, stat]) => ({
      label,
      subject: label,
      correct: stat.correct,
      total: stat.total,
      percentage: Math.round((stat.correct / stat.total) * 100),
    })
  );

  const weekBreakdown: BreakdownStat[] = Array.from(weekMap.entries())
    .map(([label, stat]) => ({
      label,
      subject: stat.subject,
      weekNumber: stat.weekNumber,
      correct: stat.correct,
      total: stat.total,
      percentage: Math.round((stat.correct / stat.total) * 100),
    }))
    .sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));

  const cognitiveBreakdown: BreakdownStat[] = Array.from(cognitiveMap.entries()).map(
    ([label, stat]) => ({
      label,
      correct: stat.correct,
      total: stat.total,
      percentage: Math.round((stat.correct / stat.total) * 100),
    })
  );

  return {
    attemptId: attempt.id,
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    unansweredQuestions,
    percentageScore,
    totalMarksEarned,
    maxPossibleMarks,
    marksPerQuestion,
    negativeMarkingPenalty,
    passMarkPercentage,
    passed,
    timeTakenSeconds,
    submittedAt: submittedAtIso,
    submissionTrigger,
    subjectBreakdown,
    weekBreakdown,
    cognitiveBreakdown,
    reviews,
    distractorUsage,
  };
}

/**
 * 12-Point Question Bank Validation Pipeline:
 * Evaluates a question against 12 academic, structural, and examination-integrity checks.
 */
export function evaluateQuestionBankValidation(
  q: ValidatedQuestion,
  existingStems?: Map<string, string>
): QuestionValidationReport {
  const stem = q.questionText.trim();
  const optTexts = q.options.map((o) => o.text.trim());
  const uniqueOpts = new Set(optTexts.map((t) => t.toLowerCase()));
  const correctOpt = q.options.find((o) => o.id === q.correctOptionId);

  const metaRegex =
    /\b(?:in the study material|from the source material|according to the uploaded|in the lesson notes|based on the study material|in a grade 7 examination|weeks?\s*(?:1[0-2]|[1-9])|wk\s*(?:1[0-2]|[1-9]))\b/i;
  const optionReasonRegex = /\b(?:because|since it is defined|as stated in the)\b/i;
  const lazyOptRegex = /\b(?:all of the above|none of the above|both a and b)\b/i;

  const normalizedStem = stem.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const duplicateId =
    existingStems && existingStems.has(normalizedStem) && existingStems.get(normalizedStem) !== q.id
      ? existingStems.get(normalizedStem)
      : undefined;

  const checks: QuestionValidationCheck[] = [
    {
      id: 'source_grounding',
      label: '1. Source Document Grounding',
      passed: Boolean(q.sourceDocumentId && q.supportingExcerpt && q.supportingExcerpt.trim().length >= 8),
      note: q.supportingExcerpt
        ? `Linked to ${q.sourceDocumentTitle} (${q.pageReference})`
        : 'Missing source excerpt reference',
    },
    {
      id: 'grade_7_level',
      label: '2. Grade 7 Academic Standard',
      passed: stem.length >= 12 && stem.length <= 450,
      note: 'Question stem length and vocabulary fit Grade 7 formal examination standards.',
    },
    {
      id: 'four_distinct_options',
      label: '3. Four Distinct Options (A–D)',
      passed: q.options.length === 4 && uniqueOpts.size === 4 && optTexts.every((t) => t.length >= 1),
      note: uniqueOpts.size === 4 ? 'All 4 options A–D are unique and non-empty.' : 'Duplicate or empty options detected.',
    },
    {
      id: 'single_correct_answer',
      label: '4. Unambiguous Correct Option Key',
      passed: Boolean(correctOpt && correctOpt.text.trim().length > 0),
      note: `Verified single correct option (${q.correctOptionId}).`,
    },
    {
      id: 'plausible_distractors',
      label: '5. Plausible Exam Distractors',
      passed: optTexts.every((t) => !lazyOptRegex.test(t)),
      note: 'No "All of the above" or "None of the above" filler options.',
    },
    {
      id: 'clean_exam_stem',
      label: '6. Standard Exam Stem (No Meta-Phrases)',
      passed: !metaRegex.test(stem) && !/,\s*and\s+why\?$/i.test(stem),
      note: !metaRegex.test(stem)
        ? 'No references to "study material", "source material", or "Week X" in stem.'
        : 'Contains prohibited source/week meta-text in stem.',
    },
    {
      id: 'clean_concise_options',
      label: '7. Options Free of Embedded Reasons',
      passed: optTexts.every((t) => !optionReasonRegex.test(t) && !metaRegex.test(t)),
      note: 'Options contain direct answers without "because..." explanations.',
    },
    {
      id: 'parallel_option_structure',
      label: '8. Parallel Option Formatting',
      passed: optTexts.every((t) => t.length <= 360 && !/^(?:option\s+[a-d]|[a-d][.)]\s)/i.test(t)),
      note: 'Options share consistent formatting without duplicate letter prefixes.',
    },
    {
      id: 'week_topic_mapping',
      label: '9. Subject & Week Mapping',
      passed: Boolean(q.subject && q.weekNumber >= 1 && q.weekNumber <= 12),
      note: `${q.subject} • Week ${q.weekNumber}`,
    },
    {
      id: 'cognitive_classification',
      label: '10. Cognitive Skill Tagging',
      passed: Boolean(q.cognitiveCategory),
      note: `Classified under "${q.cognitiveCategory}".`,
    },
    {
      id: 'explanation_present',
      label: '11. Post-Exam Marking Explanation',
      passed: Boolean(q.explanation && q.explanation.trim().length >= 10),
      note: 'Post-exam explanation is ready for student review after submission.',
    },
    {
      id: 'duplicate_check',
      label: '12. Duplicate Question Detection',
      passed: !duplicateId,
      note: duplicateId ? `Duplicate of question ${duplicateId}` : 'Unique question stem in Question Bank.',
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    passedCount,
    totalChecks: checks.length,
    overallValid: passedCount === checks.length,
    checks,
    duplicateOfQuestionId: duplicateId,
  };
}

