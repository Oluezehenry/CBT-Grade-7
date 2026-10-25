import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  CognitiveCategory,
  DifficultyLevel,
  ExtractedPassage,
  OptionId,
  ValidatedQuestion,
} from '../types/cbt';
import {
  COGNITIVE_CATEGORIES,
  ensureConsiderableOptionLength,
  formatMathExpressionsToKaTeX,
  normalizeBoldAndAllCaps,
  stripWeekReferences,
  synthesizeGroundedQuestionsFromPassages,
  validateQuestionQuality,
} from '../lib/cbtLogic';

function isGeminiApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 10 && key !== 'MY_GEMINI_API_KEY');
}

function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateSourceGroundedExamQuestions(
  passages: ExtractedPassage[],
  documentTitleLookup: Record<string, string>,
  requestedCount: number,
  difficulty: DifficultyLevel,
  options?: {
    iteration?: number;
    seed?: number;
    avoidStems?: Set<string>;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
  }
): Promise<{ questions: ValidatedQuestion[]; generationEngine: 'gemini_hybrid_rag' | 'deterministic_rag' }> {
  // Always build the full deterministic source-grounded baseline from the exact selected passages
  const deterministicQuestions = synthesizeGroundedQuestionsFromPassages(
    passages,
    documentTitleLookup,
    requestedCount,
    difficulty,
    options
  );

  if (!isGeminiApiKeyConfigured() || passages.length === 0) {
    return {
      questions: deterministicQuestions,
      generationEngine: 'deterministic_rag',
    };
  }

  try {
    const ai = createGeminiClient();
    const iter = Math.max(0, (options?.iteration ?? 1) - 1);
    const offset = (iter * 3) % Math.max(1, passages.length);
    const rotated = [...passages.slice(offset), ...passages.slice(0, offset)];
    const samplePassages = rotated.slice(0, 4);
    const contextBlock = samplePassages
      .map(
        (p, idx) =>
          `[PASSAGE ${idx + 1} | DocumentId: ${p.documentId} | Subject: ${p.subject}]\n${p.content}`
      )
      .join('\n\n');

    const batchTarget = Math.min(4, requestedCount);
    const isMathSubject = samplePassages.some(p => p.subject.toLowerCase() === 'mathematics');

    const geminiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate ${batchTarget} rigorous Grade 7 multiple-choice questions at "${difficulty}" level strictly grounded in the following source passages.
Do not use any outside knowledge not present in these passages.
CRITICAL RULES FOR EVERY UPLOADED DOCUMENT:
1. NEVER mention "Week 1".."Week 6", "Page X", "from the source material", "in the study material", "in the lesson notes", or any organizational metadata in the questionText or options.
2. NEVER include topic titles in ALL-CAPS or bold letters (no **bold** text and no ALL-CAPS words) in the questionText or options.
3. Deduplicate all questions completely. Every question must test a distinct concept or worked calculation.
4. Make each of the 4 options (A, B, C, D) concise, parallel, and plausible WITHOUT appending reasons or justifications (NEVER write "because..." inside an option).
5. All 4 options (A, B, C, D) must seem similar and plausible so the student has to think deeply to select the single true answer, matching a formal school examination.
${isMathSubject ? '6. For Mathematics or quantitative topics, prioritize calculation and worked problem-solving questions, and wrap all mathematical expressions, fractions (e.g. $\\frac{2}{3}$), exponents (e.g. $x^2$), and equations in inline LaTeX ($...$).' : '6. Do not generate mathematics calculation questions.'}
7. Never use "All of the above" or "None of the above".

SOURCE PASSAGES:
${contextBlock}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'You are an expert Grade 7 educational assessment specialist. Generate 100% distinct, source-grounded multiple-choice questions strictly from the provided passages. Ask direct, thought-provoking examination questions without mentioning "the study material", "source material", "lesson notes", or "in the text". Provide 4 parallel, plausible options (A, B, C, D) without any embedded justifications or "because..." explanations. For Mathematics, generate calculation questions using inline LaTeX ($...$). Never use "All of the above" or "None of the above". Never include meta-text or hints about where the information is found.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              optionA: { type: Type.STRING },
              optionB: { type: Type.STRING },
              optionC: { type: Type.STRING },
              optionD: { type: Type.STRING },
              correctOptionId: { type: Type.STRING },
              explanation: { type: Type.STRING },
              whyAIncorrect: { type: Type.STRING },
              whyBIncorrect: { type: Type.STRING },
              whyCIncorrect: { type: Type.STRING },
              whyDIncorrect: { type: Type.STRING },
              conceptToRevisit: { type: Type.STRING },
              passageIndex: { type: Type.INTEGER },
              supportingExcerpt: { type: Type.STRING },
              cognitiveCategory: { type: Type.STRING },
            },
            required: [
              'questionText',
              'optionA',
              'optionB',
              'optionC',
              'optionD',
              'correctOptionId',
              'explanation',
              'conceptToRevisit',
              'passageIndex',
              'supportingExcerpt',
              'cognitiveCategory',
            ],
          },
        },
      },
    });

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 4500)
    );
    const response = await Promise.race([geminiPromise, timeoutPromise]);
    if (!response) {
      return { questions: deterministicQuestions, generationEngine: 'deterministic_rag' };
    }

    const rawText = response.text?.trim();
    if (!rawText) {
      return { questions: deterministicQuestions, generationEngine: 'deterministic_rag' };
    }

    const parsedItems = JSON.parse(rawText) as Array<Record<string, unknown>>;
    const aiValidated: ValidatedQuestion[] = [];

    const cleanStem = (s: string) =>
      formatMathExpressionsToKaTeX(stripWeekReferences(normalizeBoldAndAllCaps(s)));

    for (let i = 0; i < parsedItems.length; i++) {
      const item = parsedItems[i];
      const pIdx = Math.max(
        0,
        Math.min(samplePassages.length - 1, (Number(item.passageIndex) || 1) - 1)
      );
      const sourcePassage = samplePassages[pIdx];
      const correctId = String(item.correctOptionId || 'A')
        .trim()
        .toUpperCase() as OptionId;
      const validCat = COGNITIVE_CATEGORIES.includes(item.cognitiveCategory as CognitiveCategory)
        ? (item.cognitiveCategory as CognitiveCategory)
        : COGNITIVE_CATEGORIES[i % COGNITIVE_CATEGORIES.length];

      const docTitle =
        documentTitleLookup[sourcePassage.documentId] || `${sourcePassage.subject} Study Guide`;

      const candidate: ValidatedQuestion = {
        id: `q-item-${i + 1}-ai${(i + 1) * 19}`,
        questionNumber: i + 1,
        questionText: cleanStem(String(item.questionText || '')),
        options: [
          {
            id: 'A',
            text: formatMathExpressionsToKaTeX(
              ensureConsiderableOptionLength(
                String(item.optionA || ''),
                '',
                sourcePassage.subject,
                20
              )
            ),
          },
          {
            id: 'B',
            text: formatMathExpressionsToKaTeX(
              ensureConsiderableOptionLength(
                String(item.optionB || ''),
                '',
                sourcePassage.subject,
                20
              )
            ),
          },
          {
            id: 'C',
            text: formatMathExpressionsToKaTeX(
              ensureConsiderableOptionLength(
                String(item.optionC || ''),
                '',
                sourcePassage.subject,
                20
              )
            ),
          },
          {
            id: 'D',
            text: formatMathExpressionsToKaTeX(
              ensureConsiderableOptionLength(
                String(item.optionD || ''),
                '',
                sourcePassage.subject,
                20
              )
            ),
          },
        ],
        correctOptionId: ['A', 'B', 'C', 'D'].includes(correctId) ? correctId : 'A',
        explanation: formatMathExpressionsToKaTeX(String(item.explanation || '')),
        distractorRationales: {
          A: String(item.whyAIncorrect || 'Not supported by the selected lesson passage.'),
          B: String(item.whyBIncorrect || 'Not supported by the selected lesson passage.'),
          C: String(item.whyCIncorrect || 'Not supported by the selected lesson passage.'),
          D: String(item.whyDIncorrect || 'Not supported by the selected lesson passage.'),
        },
        conceptToRevisit: String(
          item.conceptToRevisit || `${sourcePassage.lessonTitle} (Week ${sourcePassage.weekNumber})`
        ),
        subject: sourcePassage.subject,
        sourceDocumentId: sourcePassage.documentId,
        sourceDocumentTitle: docTitle,
        weekNumber: sourcePassage.weekNumber,
        sectionHeading: sourcePassage.sectionHeading,
        pageReference: sourcePassage.pageReference,
        supportingExcerpt: String(item.supportingExcerpt || sourcePassage.content.slice(0, 180)),
        cognitiveCategory: validCat,
        difficultyLevel: difficulty,
        validationStatus: 'validated',
      };

      if (validateQuestionQuality(candidate).valid) {
        aiValidated.push(candidate);
      }
    }

    if (aiValidated.length === 0) {
      return { questions: deterministicQuestions, generationEngine: 'deterministic_rag' };
    }

    // Merge AI-validated questions with deterministic RAG questions with strict deduplication
    const merged: ValidatedQuestion[] = [...aiValidated];
    const seenStems = new Set(aiValidated.map((q) => q.questionText.toLowerCase()));
    const seenCorrect = new Set(
      aiValidated.map((q) => {
        const cOpt = q.options.find((o) => o.id === q.correctOptionId);
        return (cOpt?.text || '').toLowerCase();
      })
    );

    for (const dq of deterministicQuestions) {
      if (merged.length >= requestedCount) break;
      const dqCorrectText =
        dq.options.find((o) => o.id === dq.correctOptionId)?.text.toLowerCase() || '';
      if (!seenStems.has(dq.questionText.toLowerCase()) && !seenCorrect.has(dqCorrectText)) {
        seenStems.add(dq.questionText.toLowerCase());
        seenCorrect.add(dqCorrectText);
        merged.push({
          ...dq,
          id: `q-item-${merged.length + 1}-m${(merged.length + 1) * 31}`,
          questionNumber: merged.length + 1,
        });
      }
    }

    return {
      questions: merged.slice(0, requestedCount),
      generationEngine: 'gemini_hybrid_rag',
    };
  } catch (err) {
    console.warn('Gemini generation fallback to deterministic source-grounded RAG:', err);
    return {
      questions: deterministicQuestions,
      generationEngine: 'deterministic_rag',
    };
  }
}
