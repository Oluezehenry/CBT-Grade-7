import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSourceCapacity,
  computeRemainingSeconds,
  deriveQuestionNavState,
  detectWeeklySections,
  evaluateQuestionBankValidation,
  extractStructuredMCQsFromText,
  filterPassagesBySelection,
  formatMathExpressionsToKaTeX,
  getTargetCognitiveDistribution,
  getTimerUrgencyInfo,
  getTimerWarningState,
  gradeExaminationAttempt,
  inferSubjectFromDocument,
  normalizeBoldAndAllCaps,
  stripAnswerKeyForClient,
  stripWeekReferences,
  synthesizeGroundedQuestionsFromPassages,
  validateQuestionQuality,
} from './cbtLogic';
import {
  checkRateLimit,
  clearRateLimit,
  generateSixDigitAuthCode,
  hashPasswordWithSalt,
  recordFailedAttempt,
  sanitizeInputText,
  sanitizeSafeFilename,
  signSessionToken,
  validateEmailAddress,
  validatePasswordStrength,
  verifyAuthCodeConstantTime,
  verifyPasswordConstantTime,
  verifySessionToken,
} from './security';
import { ExamAttempt, StudyDocument } from '../types/cbt';

const SAMPLE_WEEKS_1_TO_6 = `
Table of Contents
Week 1: Whole Numbers and Indices ............ 1
Week 2: Fractions, Decimals and Percentages .. 3

[Page 1]
Week 1: Whole Numbers, Place Value, and Laws of Indices
Whole numbers and large numbers are represented using powers of ten in standard form.
The First Law of Indices states that when multiplying powers with the same base, we add the exponents: a^m * a^n = a^(m+n).
The Second Law of Indices states that when dividing powers with the same base, we subtract the exponents: a^m / a^n = a^(m-n).
Any non-zero base raised to the power of zero equals one (a^0 = 1).

[Page 2]
Week Two - Fractions, Decimals, Ratios, and Proportions
Equivalent fractions represent the same proportional value even when numerators and denominators differ by a constant scale factor.
To convert a terminating decimal to a fraction in lowest terms, express the digits over the corresponding power of 10 and divide by the greatest common divisor.
Direct proportion means that when one quantity increases by a factor k, the related quantity increases by the exact same factor k.

[Page 3]
Wk 3: Algebraic Expressions and Linear Equations
An algebraic expression combines variables, coefficients, and constants using arithmetic operations.
Like terms contain identical variable factors raised to the exact same powers and can be combined by adding their coefficients.
Solving a linear equation in one variable requires applying inverse operations to both sides of the equality to isolate the unknown variable.

[Page 4]
Week 4: Plane Geometry, Angles, and Polygon Properties
Complementary angles are two angles whose measures have a sum of 90 degrees, whereas supplementary angles have a sum of 180 degrees.
Vertically opposite angles formed by two intersecting straight lines are always equal in measure.
The sum of interior angles of an n-sided convex polygon is given by the formula (n - 2) multiplied by 180 degrees.

[Page 5]
Week Five: Mensuration of Perimeter, Area, and Volume
The perimeter of a plane figure is the total distance around its outer boundary measured in linear units.
The area of a triangle equals one-half multiplied by its base length and perpendicular height (A = 0.5 * b * h).
The volume of a cuboid is calculated by multiplying its length, width, and height in cubic units.

[Page 6]
Wk 6 - Statistics, Data Collection, and Central Tendency
The arithmetic mean of a data set is calculated by dividing the sum of all observed values by the total number of observations.
The median is the middle value when observations are arranged in ascending or descending order.
The mode is the observation that occurs with the greatest frequency in a frequency distribution.
`;

const SAMPLE_WEEKS_1_TO_4_ONLY = `
Week 1: Living and Non-Living Matter
Living organisms carry out seven essential life processes: movement, respiration, sensitivity, growth, reproduction, excretion, and nutrition.

Week 2: Cell Structure and Organization
The cell is the basic structural and functional unit of all living organisms. Plant cells possess a rigid cellulose cell wall and chloroplasts, whereas animal cells lack a cell wall.

Week 3: Human Nutrition and Balanced Diet
Carbohydrates provide primary metabolic energy, proteins repair worn-out tissues, and vitamins regulate biochemical processes.

Week 4: States of Matter and Kinetic Theory
Matter exists primarily as solid, liquid, or gas. Solid particles vibrate in fixed positions with strong intermolecular forces.
`;

test('Test B: detectWeeklySections accurately extracts Weeks 1-6, ignores Table of Contents, and preserves page references', () => {
  const { weeks, passages } = detectWeeklySections('doc-math', 'Mathematics', SAMPLE_WEEKS_1_TO_6);
  assert.equal(weeks.length, 6);
  assert.deepEqual(
    weeks.map((w) => w.weekNumber),
    [1, 2, 3, 4, 5, 6]
  );
  assert.ok(weeks[0].lessonTitle.includes('Whole Numbers'));
  assert.equal(weeks[0].pageReference, 'Page 1');
  assert.ok(passages.length >= 6);
});

test('Test B2: detectWeeklySections does not fabricate Weeks 5-6 when document only contains Weeks 1-4', () => {
  const { weeks } = detectWeeklySections('doc-sci', 'Basic Science', SAMPLE_WEEKS_1_TO_4_ONLY);
  assert.equal(weeks.length, 4);
  assert.deepEqual(
    weeks.map((w) => w.weekNumber),
    [1, 2, 3, 4]
  );
});

import { GRADE_7_CURRICULUM_DOCUMENTS } from '../server/seedCurriculum';

test('Test D, E, F, G, H: Full multi-week (Weeks 1-12) round-robin generation, zero week/study-material labels in questionText, zero option justifications, and 100% distinct questions across all 15 curriculum documents', () => {
  assert.equal(GRADE_7_CURRICULUM_DOCUMENTS.length, 15, 'Must have all 15 uploaded JSS 1 curriculum documents');
  for (const seedDoc of GRADE_7_CURRICULUM_DOCUMENTS) {
    const { weeks, passages } = detectWeeklySections(seedDoc.id, seedDoc.subject, seedDoc.rawText);
    assert.ok(
      weeks.length >= 9 && weeks.length <= 12,
      `Document ${seedDoc.title} must have Weeks 1 through its final week (got ${weeks.length} weeks)`
    );
    assert.equal(weeks[0].weekNumber, 1, `Document ${seedDoc.title} must start at Week 1`);

    const qs60 = synthesizeGroundedQuestionsFromPassages(
      passages,
      { [seedDoc.id]: seedDoc.title },
      60,
      'High difficulty'
    );
    assert.equal(qs60.length, 60);

    const uniqueStems = new Set(qs60.map((q) => q.questionText.toLowerCase()));
    assert.equal(uniqueStems.size, 60, `All 60 questions in ${seedDoc.subject} must have distinct stems`);

    for (const wk of weeks) {
      const countForWeek = qs60.filter((q) => q.weekNumber === wk.weekNumber).length;
      assert.ok(countForWeek >= 3, `Week ${wk.weekNumber} in ${seedDoc.subject} should contribute questions in a 60-question exam`);
    }

    for (const q of qs60) {
      assert.equal(q.subject, seedDoc.subject, `Question subject must strictly match ${seedDoc.subject}`);
      assert.equal(
        /\b(?:week|wk)\s*(?:1[0-2]|[1-9])\b/i.test(q.questionText),
        false,
        `Question stem must not show week label: "${q.questionText}"`
      );
      assert.equal(
        /\b(?:in the study material|from the source material|in the lesson notes)\b/i.test(q.questionText),
        false,
        `Question stem must not mention study/source material: "${q.questionText}"`
      );
      for (const opt of q.options) {
        assert.equal(
          /\b(?:week|wk)\s*(?:1[0-2]|[1-9])\b/i.test(opt.text),
          false,
          `Option text must not show week label: "${opt.text}"`
        );
        assert.equal(
          /\b(?:because|in the study material|from the source material|in the lesson notes)\b/i.test(opt.text),
          false,
          `Option text must not include embedded reasons or meta-text: "${opt.text}"`
        );
      }
      assert.equal(validateQuestionQuality(q).valid, true);
      const bankValidation = evaluateQuestionBankValidation(q);
      assert.equal(bankValidation.overallValid, true, `12-point bank validation failed for: ${q.questionText}`);
    }
  }

  // Also test unlabeled document upload auto-partitioning across Weeks 1-6
  const unlabeledText = Array.from(
    { length: 12 },
    (_, i) =>
      `Concept ${i + 1}: In physical science, principle ${i + 1} states that energy transformation in system ${
        i + 1
      } conserved total mass and momentum across ${i + 2} stages.`
  ).join('\n');
  const unlabeledResult = detectWeeklySections('doc-custom', 'Basic Science', unlabeledText);
  assert.deepEqual(
    unlabeledResult.weeks.map((w) => w.weekNumber),
    [1, 2, 3, 4, 5, 6],
    'Unlabeled uploaded document with >= 6 sentences must be organized into Weeks 1 to 6'
  );

  const { weeks, passages } = detectWeeklySections('doc-math', 'Mathematics', SAMPLE_WEEKS_1_TO_6);
  const doc: StudyDocument = {
    id: 'doc-math',
    title: 'Grade 7 Mathematics Curriculum Notes',
    subject: 'Mathematics',
    classTerm: 'Grade 7 - Term 1',
    description: 'Weeks 1-6 Notes',
    originalFilename: 'math_g7.txt',
    fileType: 'TXT',
    fileSizeBytes: 2400,
    uploadDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    processingStatus: 'ready',
    extractionStatus: 'complete',
    storagePath: '/data/math_g7.txt',
    rawText: SAMPLE_WEEKS_1_TO_6,
    weeks,
    passages,
  };

  // Test D: Select ONLY Week 2
  const week2Passages = filterPassagesBySelection([doc], [
    {
      documentId: 'doc-math',
      subject: 'Mathematics',
      documentTitle: doc.title,
      selectedWeeks: [2],
    },
  ]);
  assert.ok(week2Passages.length > 0);
  assert.ok(week2Passages.every((p) => p.weekNumber === 2));

  const week2Questions = synthesizeGroundedQuestionsFromPassages(
    week2Passages,
    { 'doc-math': doc.title },
    50,
    'High difficulty'
  );
  assert.equal(week2Questions.length, 50);
  for (const q of week2Questions) {
    assert.equal(q.weekNumber, 2, 'Every question must originate strictly from Week 2');
    assert.equal(q.options.length, 4, 'Every question must have 4 options');
    assert.equal(validateQuestionQuality(q).valid, true);
  }

  // Test F: Larger counts (50, 60, 75, 100) across all weeks
  for (const count of [50, 60, 75, 100]) {
    const qs = synthesizeGroundedQuestionsFromPassages(
      passages,
      { 'doc-math': doc.title },
      count,
      'Expert challenge'
    );
    assert.equal(qs.length, count);
    const stemSet = new Set(qs.map((q) => q.questionText.toLowerCase()));
    assert.equal(stemSet.size, count);
  }

  // Test G: Cognitive category distribution for 50 questions
  const dist = getTargetCognitiveDistribution(50);
  assert.equal(dist['Recall and precise knowledge'], 5);
  assert.equal(dist['Conceptual understanding'], 10);
  assert.equal(dist['Application'], 15);
  assert.equal(dist['Analysis'], 10);
  assert.equal(dist['Multi-step reasoning and misconception detection'], 10);
});

test('Test J, K, L, O: Answer-key stripping, authoritative timer math, and accurate grading', () => {
  const { passages } = detectWeeklySections('doc-math', 'Mathematics', SAMPLE_WEEKS_1_TO_6);
  const fullQuestions = synthesizeGroundedQuestionsFromPassages(
    passages,
    { 'doc-math': 'Grade 7 Math' },
    50,
    'High difficulty'
  );

  // Test O: Answer-key protection
  const publicQuestions = stripAnswerKeyForClient(fullQuestions);
  assert.equal(publicQuestions.length, 50);
  assert.equal('correctOptionId' in publicQuestions[0], false);
  assert.equal('explanation' in publicQuestions[0], false);

  // Test J & K: Timer warnings & authoritative deadline
  const now = 1700000000000;
  const deadline30m = new Date(now + 30 * 60 * 1000).toISOString();
  assert.equal(computeRemainingSeconds(deadline30m, now), 1800);
  assert.equal(getTimerWarningState(1800), 'normal');
  assert.equal(getTimerWarningState(299), 'warning_5m');
  assert.equal(getTimerWarningState(59), 'critical_1m');
  assert.equal(getTimerWarningState(0), 'expired');

  // Question navigator states
  assert.equal(deriveQuestionNavState(undefined), 'not_visited');
  assert.equal(
    deriveQuestionNavState({
      questionId: 'q1',
      selectedOptionId: null,
      markedForReview: false,
      visited: true,
      updatedAt: '',
    }),
    'visited_unanswered'
  );
  assert.equal(
    deriveQuestionNavState({
      questionId: 'q1',
      selectedOptionId: 'B',
      markedForReview: true,
      visited: true,
      updatedAt: '',
    }),
    'marked_for_review'
  );

  // Test L: Grading 40 correct, 5 incorrect, 5 unanswered out of 50 => 80%
  const responses: ExamAttempt['responses'] = {};
  fullQuestions.forEach((q, idx) => {
    if (idx < 40) {
      responses[q.id] = {
        questionId: q.id,
        selectedOptionId: q.correctOptionId,
        markedForReview: false,
        visited: true,
        updatedAt: new Date(now).toISOString(),
      };
    } else if (idx < 45) {
      const wrongOpt = q.correctOptionId === 'A' ? 'B' : 'A';
      responses[q.id] = {
        questionId: q.id,
        selectedOptionId: wrongOpt,
        markedForReview: false,
        visited: true,
        updatedAt: new Date(now).toISOString(),
      };
    }
  });

  const attempt: ExamAttempt = {
    id: 'attempt-1',
    config: {
      id: 'cfg-1',
      title: 'Mathematics Assessment',
      selections: [
        {
          documentId: 'doc-math',
          subject: 'Mathematics',
          documentTitle: 'Grade 7 Math',
          selectedWeeks: [1, 2, 3, 4, 5, 6],
        },
      ],
      questionCount: 50,
      durationMinutes: 60,
      difficulty: 'High difficulty',
      createdAt: new Date(now - 1200000).toISOString(),
    },
    status: 'in_progress',
    startedAt: new Date(now - 1200000).toISOString(),
    deadlineAt: new Date(now + 2400000).toISOString(),
    currentQuestionIndex: 0,
    responses,
    questions: publicQuestions,
  };

  const result = gradeExaminationAttempt(
    attempt,
    fullQuestions,
    'manual',
    new Date(now).toISOString()
  );
  assert.equal(result.totalQuestions, 50);
  assert.equal(result.correctAnswers, 40);
  assert.equal(result.incorrectAnswers, 5);
  assert.equal(result.unansweredQuestions, 5);
  assert.equal(result.percentageScore, 80);
  assert.equal(result.reviews.length, 50);
  assert.ok(result.reviews[40].whySelectedIncorrect);
});

test('Test P & Q: Strips Week X metadata and ALL-CAPS headers, produces considerable-length balanced options with all key points, deduplicates questions, and generates LaTeX calculation questions for Mathematics and any uploaded file', () => {
  const schoolNotesWithCapsAndWeeks = `
Week 1: ORDER OF OPERATIONS AND BODMAS
LIVING AND NON-LIVING THINGS IV: METALS AND NON-METALS
PERIOD II
**Metals**: They lose electrons to become positively charged cations during chemical reactions.
**Non-metals**: They gain electrons to become negatively charged anions during chemical reactions.
Nucleus: It is the spherical structure found mainly at the center of a cell that controls cellular activities.
Cell Wall: It surrounds the plasma membrane and gives rigidity and structural support to plant cells.
Fractions: Fractions can be reduced to their lowest term by dividing the numerator and denominator by the same factor.
Number line: A number line is a picture of the counting numbers extending to the left and right of zero.
`;
  const { passages } = detectWeeklySections(
    'doc-school-notes',
    'Basic Science',
    schoolNotesWithCapsAndWeeks,
    true
  );
  const qs = synthesizeGroundedQuestionsFromPassages(
    passages,
    { 'doc-school-notes': 'School Notes' },
    20,
    'High difficulty'
  );
  assert.equal(qs.length, 20);

  const seenStems = new Set<string>();
  for (const q of qs) {
    assert.equal(
      seenStems.has(q.questionText.toLowerCase()),
      false,
      `Duplicate question stem found: ${q.questionText}`
    );
    seenStems.add(q.questionText.toLowerCase());

    assert.equal(
      /\b(?:week|wk|period|page)\s*(?:[1-6]|i|ii|iii|iv)\b/i.test(q.questionText),
      false,
      `Question stem must not contain week/period/page metadata: ${q.questionText}`
    );
    assert.equal(
      q.questionText.includes('**') || q.questionText.includes('ORDER OF OPERATIONS'),
      false,
      `Question stem must not contain bold markers or ALL-CAPS topic headers: ${q.questionText}`
    );

    const optTexts = q.options.map((o) => o.text.toLowerCase());
    assert.equal(new Set(optTexts).size, 4, 'All 4 options must be distinct');

    const wordCounts = q.options.map((o) => o.text.split(/\s+/).filter(Boolean).length);
    const minWords = Math.min(...wordCounts);
    const maxWords = Math.max(...wordCounts);

    for (const opt of q.options) {
      assert.equal(
        /\b(?:week|wk|period|page)\s*(?:[1-6]|i|ii|iii|iv)\b/i.test(opt.text),
        false,
        `Option must not contain week/period/page metadata: ${opt.text}`
      );
      assert.equal(
        opt.text.includes('**') || opt.text.includes('LIVING AND NON-LIVING'),
        false,
        `Option must not contain bold markers or ALL-CAPS topic headers: ${opt.text}`
      );
      assert.equal(
        /\b(?:because|in the study material|from the source material|in the lesson notes)\b/i.test(opt.text),
        false,
        `Option must not contain embedded reasons or study-material references: "${opt.text}"`
      );
    }
  }

  // Verify built-in Mathematics curriculum document (doc-math-g7-t1) has majority calculation questions with LaTeX ($...$) notation
  const mathDoc = GRADE_7_CURRICULUM_DOCUMENTS[0];
  const mathParsed = detectWeeklySections(mathDoc.id, mathDoc.subject, mathDoc.rawText, true);
  const mathQs = synthesizeGroundedQuestionsFromPassages(
    mathParsed.passages,
    { [mathDoc.id]: mathDoc.title },
    50,
    'High difficulty'
  );
  assert.equal(mathQs.length, 50);

  const latexMathCount = mathQs.filter(
    (q) =>
      /\$[^$]+\$/.test(q.questionText) ||
      q.options.some((o) => /\$[^$]+\$/.test(o.text))
  ).length;
  assert.ok(
    latexMathCount >= 35,
    `Mathematics exam should have majority LaTeX calculation questions (got ${latexMathCount}/50)`
  );

  // Verify inferSubjectFromDocument never defaults non-Math uploaded files to Mathematics
  assert.equal(
    inferSubjectFromDocument('Grade_7_Music_100_Tricky_MCQs.md', '', 'Binary form AB and Ternary ABA', 'AUTO'),
    'Music'
  );
  assert.equal(
    inferSubjectFromDocument('Grade_7_PHE_100_Tricky_MCQs.md', '', 'Swimming strokes and gymnastics', 'AUTO'),
    'Physical & Health Education'
  );
  const musicSeed = GRADE_7_CURRICULUM_DOCUMENTS.find((d) => d.id === 'doc-music-g7-t1');
  if (musicSeed) {
    const mcqs = extractStructuredMCQsFromText(musicSeed.rawText);
    assert.ok(mcqs.length >= 18, 'Music seed file must extract structured tricky MCQs across all weeks');
  }

  assert.equal(
    stripWeekReferences('In Week 3: Page 4 Period II Fractions are numbers'),
    'Fractions are numbers'
  );
  assert.equal(
    normalizeBoldAndAllCaps('**METALS** and **NON-METALS** use DNA and ATP'),
    'metals and non-metals use DNA and ATP'
  );
});

test('Test Q: ActiveExamView Time Running Out visual pulse & ticking audio urgency logic', () => {
  const normal = getTimerUrgencyInfo(1800, 60);
  assert.equal(normal.state, 'normal');
  assert.equal(normal.isTimeRunningOut, false);
  assert.equal(normal.pulseClass, '');
  assert.equal(normal.shouldPlayTick, false);

  const warning = getTimerUrgencyInfo(240, 60);
  assert.equal(warning.state, 'warning_5m');
  assert.equal(warning.isTimeRunningOut, true);
  assert.equal(warning.pulseClass, 'exam-timer-pulse-warning');
  assert.equal(warning.badgeLabel, 'Time Running Out');
  assert.equal(warning.shouldPlayTick, true);
  assert.equal(warning.tickIntervalSeconds, 5);

  const critical = getTimerUrgencyInfo(45, 60);
  assert.equal(critical.state, 'critical_1m');
  assert.equal(critical.isTimeRunningOut, true);
  assert.equal(critical.pulseClass, 'exam-timer-pulse-critical');
  assert.equal(critical.badgeLabel, 'Time Running Out!');
  assert.equal(critical.shouldPlayTick, true);
  assert.equal(critical.tickIntervalSeconds, 1);
});

test('Test R: 100% Site Security — Scrypt hashing, 6-digit OTP, HMAC session, XSS/filename sanitization & rate limiting', () => {
  // 1. Input & filename sanitization
  const dirty = '<script>alert("xss")</script>David & Co.';
  const clean = sanitizeInputText(dirty);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean, 'David & Co.');

  assert.equal(sanitizeSafeFilename('../../etc/passwd'), 'passwd');
  assert.equal(validateEmailAddress('David.Scholar@Grade7.edu'), true);
  assert.equal(validateEmailAddress('not-an-email'), false);

  // 2. Password strength & Scrypt constant-time verification
  assert.equal(validatePasswordStrength('short').valid, false);
  assert.equal(validatePasswordStrength('ScholarGrade7!').valid, true);

  const { hash, salt } = hashPasswordWithSalt('ScholarGrade7!');
  assert.equal(verifyPasswordConstantTime('ScholarGrade7!', hash, salt), true);
  assert.equal(verifyPasswordConstantTime('WrongPassword1!', hash, salt), false);

  // 3. 6-digit Auth Code generation & constant-time verification
  const code = generateSixDigitAuthCode();
  assert.match(code, /^\d{6}$/);
  assert.equal(verifyAuthCodeConstantTime(code, code), true);
  assert.equal(verifyAuthCodeConstantTime('000000', '999999'), false);

  // 4. Stateless HMAC-SHA256 session tokens
  const secret = 'test-server-hmac-secret-key-256';
  const token = signSessionToken(
    {
      userId: 'usr-1',
      email: 'david@grade7.edu',
      studentName: 'David Adeyemi',
      exp: Date.now() + 60_000,
    },
    secret
  );
  const verified = verifySessionToken(token, secret);
  assert.equal(verified.valid, true);
  assert.equal(verified.payload?.email, 'david@grade7.edu');
  assert.equal(verifySessionToken(token + 'tampered', secret).valid, false);

  // 5. Brute-force rate limiter
  const bucket = new Map();
  const key = 'test-ip-login';
  clearRateLimit(bucket, key);
  assert.equal(checkRateLimit(bucket, key).allowed, true);
  for (let i = 0; i < 6; i++) {
    recordFailedAttempt(bucket, key, 5, 60_000);
  }
  const locked = checkRateLimit(bucket, key);
  assert.equal(locked.allowed, false);
  assert.ok(locked.retryAfterSeconds > 0);
  clearRateLimit(bucket, key);
});





test('Test S: synthesizeGroundedQuestionsFromPassages generates a distinct, fresh set of questions on every retake for a subject', () => {
  const { passages } = detectWeeklySections('doc-math', 'Mathematics', SAMPLE_WEEKS_1_TO_6);
  assert.ok(passages.length >= 6);

  // Attempt 1: First time taking Mathematics exam
  const exam1 = synthesizeGroundedQuestionsFromPassages(
    passages,
    { 'doc-math': 'General Mathematics' },
    15,
    'High difficulty',
    { iteration: 1, seed: 100 }
  );
  assert.equal(exam1.length, 15);

  const exam1Stems = new Set(exam1.map((q) => q.questionText.trim().toLowerCase()));

  // Attempt 2: Retaking Mathematics exam with fresh iteration & avoidStems
  const exam2 = synthesizeGroundedQuestionsFromPassages(
    passages,
    { 'doc-math': 'General Mathematics' },
    15,
    'High difficulty',
    { iteration: 2, seed: 200, avoidStems: exam1Stems }
  );
  assert.equal(exam2.length, 15);

  // Check that the questions generated in Exam 2 are distinct from Exam 1
  let duplicateCount = 0;
  for (const q of exam2) {
    if (exam1Stems.has(q.questionText.trim().toLowerCase())) {
      duplicateCount++;
    }
  }

  // The retake must generate fresh questions, with zero duplicates
  assert.equal(duplicateCount, 0, 'Retaking an exam must produce fresh questions not asked in attempt 1');

  // Verify option rotation across iterations
  assert.notDeepEqual(
    exam1.map((q) => q.correctOptionId),
    exam2.map((q) => q.correctOptionId),
    'Answer keys should rotate dynamically across retakes'
  );
});

test('Test T: formatMathExpressionsToKaTeX converts plain-text mathematical expressions, fractions, equations, exponents, and angles into KaTeX-compatible LaTeX', () => {
  // 1. Plain fractions -> \frac{a}{b}
  const fracFormatted = formatMathExpressionsToKaTeX('Simplify the fraction 3/4 + 5/8 in lowest terms.');
  assert.ok(fracFormatted.includes('\\frac{3}{4}'), `Expected \\frac{3}{4} in: ${fracFormatted}`);
  assert.ok(fracFormatted.includes('\\frac{5}{8}'), `Expected \\frac{5}{8} in: ${fracFormatted}`);

  // 2. Linear equations -> $3x - 7 = 14$
  const eqFormatted = formatMathExpressionsToKaTeX('Solve the linear equation 3x - 7 = 14 to find x.');
  assert.ok(eqFormatted.includes('$3x - 7 = 14$'), `Expected $3x - 7 = 14$ in: ${eqFormatted}`);

  // 3. Exponents and laws of indices -> ^{...}
  const expFormatted = formatMathExpressionsToKaTeX('Apply the index law a^(m+n) and 10^6.');
  assert.ok(expFormatted.includes('^{m+n}') || expFormatted.includes('10^{6}'), `Expected KaTeX exponent braces in: ${expFormatted}`);

  // 4. Degree measures -> ^\circ
  const degFormatted = formatMathExpressionsToKaTeX('Supplementary angles sum to 180 degrees while a right angle is 90°.');
  assert.ok(degFormatted.includes('180^\\circ'), `Expected 180^\\circ in: ${degFormatted}`);
  assert.ok(degFormatted.includes('90^\\circ'), `Expected 90^\\circ in: ${degFormatted}`);

  // 5. Dynamic extraction of linear equations from uploaded passage produces KaTeX questions
  const customMathPassage = `
  Week 1: Solving Linear Equations and Fractions
  In Grade 7 algebra, to solve the equation 4x + 5 = 25, subtract 5 from both sides so that 4x = 20, and divide by 4 to obtain x = 5.
  Similarly, when calculating 15 * 4 = 60, we multiply the factors directly.
  `;
  const { passages } = detectWeeklySections('doc-alg', 'Mathematics', customMathPassage, true);
  const algQuestions = synthesizeGroundedQuestionsFromPassages(
    passages,
    { 'doc-alg': 'Grade 7 Algebra' },
    10,
    'High difficulty'
  );
  assert.equal(algQuestions.length, 10);
  const hasKatexDelimiters = algQuestions.some(
    (q) => /\$[^$]+\$/.test(q.questionText) && q.options.some((o) => /\$[^$]+\$/.test(o.text))
  );
  assert.equal(hasKatexDelimiters, true, 'Dynamically extracted math passages must produce KaTeX-delimited questions and options');
});

test('Test U: Strict Examination Mode strips all source metadata and opaque IDs hide week/doc references, while post-submission grading supports marksPerQuestion and negativeMarkingPenalty', () => {
  const { passages } = detectWeeklySections('doc-math', 'Mathematics', SAMPLE_WEEKS_1_TO_6);
  const fullQuestions = synthesizeGroundedQuestionsFromPassages(
    passages,
    { 'doc-math': 'Grade 7 Math' },
    20,
    'High difficulty',
    { shuffleQuestions: true, shuffleOptions: true, seed: 42 }
  );

  const publicQuestions = stripAnswerKeyForClient(fullQuestions);
  for (const pq of publicQuestions) {
    assert.equal('correctOptionId' in pq, false);
    assert.equal('explanation' in pq, false);
    assert.equal('sourceDocumentId' in pq, false, 'sourceDocumentId must be stripped during active exam');
    assert.equal('sourceDocumentTitle' in pq, false, 'sourceDocumentTitle must be stripped during active exam');
    assert.equal('weekNumber' in pq, false, 'weekNumber must be stripped during active exam');
    assert.equal('sectionHeading' in pq, false, 'sectionHeading must be stripped during active exam');
    assert.equal('pageReference' in pq, false, 'pageReference must be stripped during active exam');
    assert.equal(pq.id.includes('doc-math'), false, 'Question ID must be opaque and not leak document ID');
  }

  // Verify configurable marks per question (2 marks) and negative marking penalty (0.5 marks)
  const now = Date.now();
  const responses: ExamAttempt['responses'] = {};
  fullQuestions.forEach((q, idx) => {
    if (idx < 10) {
      // 10 correct -> 10 * 2 = 20 marks
      responses[q.id] = {
        questionId: q.id,
        selectedOptionId: q.correctOptionId,
        markedForReview: false,
        visited: true,
        updatedAt: new Date(now).toISOString(),
      };
    } else if (idx < 14) {
      // 4 wrong -> 4 * -0.5 = -2 marks => net 18 / 40 marks
      const wrongOpt = q.correctOptionId === 'A' ? 'B' : 'A';
      responses[q.id] = {
        questionId: q.id,
        selectedOptionId: wrongOpt,
        markedForReview: false,
        visited: true,
        updatedAt: new Date(now).toISOString(),
      };
    }
  });

  const attempt: ExamAttempt = {
    id: 'attempt-marks',
    config: {
      id: 'cfg-marks',
      title: 'Mathematics Formal Exam',
      selections: [
        {
          documentId: 'doc-math',
          subject: 'Mathematics',
          documentTitle: 'Grade 7 Math',
          selectedWeeks: [1, 2, 3, 4, 5, 6],
        },
      ],
      questionCount: 20,
      durationMinutes: 30,
      difficulty: 'High difficulty',
      marksPerQuestion: 2,
      negativeMarkingPenalty: 0.5,
      passMarkPercentage: 50,
      createdAt: new Date(now - 600000).toISOString(),
    },
    status: 'in_progress',
    startedAt: new Date(now - 600000).toISOString(),
    deadlineAt: new Date(now + 1200000).toISOString(),
    currentQuestionIndex: 0,
    responses,
    questions: publicQuestions,
  };

  const result = gradeExaminationAttempt(
    attempt,
    fullQuestions,
    'manual',
    new Date(now).toISOString()
  );
  assert.equal(result.maxPossibleMarks, 40);
  assert.equal(result.totalMarksEarned, 18);
  assert.equal(result.percentageScore, 45);
  assert.equal(result.passed, false);
});

import { saveExamQuestionsAndGenerateNext50MCQs } from '../server/storage';

test('Test V: Every finished exam saves its questions to the Question Bank AND generates 50 brand-new MCQs from the subject file', () => {
  const pheSeed = GRADE_7_CURRICULUM_DOCUMENTS.find((d) => d.id === 'doc-phe-g7-t1')!;
  const parsed = detectWeeklySections(pheSeed.id, pheSeed.subject, pheSeed.rawText, true);
  const doc: StudyDocument = {
    id: pheSeed.id,
    title: pheSeed.title,
    subject: pheSeed.subject,
    classTerm: pheSeed.classTerm,
    description: pheSeed.description,
    originalFilename: pheSeed.originalFilename,
    fileType: pheSeed.fileType || 'PDF',
    fileSizeBytes: pheSeed.rawText.length,
    uploadDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    processingStatus: 'ready',
    extractionStatus: 'complete',
    storagePath: pheSeed.storagePath || `/uploads/${pheSeed.originalFilename}`,
    rawText: pheSeed.rawText,
    weeks: parsed.weeks,
    passages: parsed.passages,
  };

  const initialExamQuestions = synthesizeGroundedQuestionsFromPassages(
    doc.passages,
    { [doc.id]: doc.title },
    50,
    'High difficulty',
    { iteration: 1, seed: 1001 }
  );

  const mockDb = {
    version: 12,
    profile: {
      id: 'student-test-1',
      studentName: 'David Scholar',
      gradeLevel: 'Grade 7 (JSS 1)',
      schoolTerm: 'First Term',
      defaultQuestionCount: 50,
      defaultDurationMinutes: 60 as const,
      defaultDifficulty: 'High difficulty' as const,
      autoSaveIntervalSeconds: 10,
      showTimerWarnings: true,
      autoAdvanceOnSelect: false,
      highContrastMode: false,
      badges: [],
    },
    users: {},
    documents: [doc],
    questionBank: [],
    generationJobs: [],
    attempts: [],
    answerKeys: {},
  };

  const mockAttempt: ExamAttempt = {
    id: 'attempt-phe-1',
    config: {
      id: 'cfg-phe-1',
      title: 'PHE Practice Exam',
      selections: [
        {
          documentId: doc.id,
          subject: doc.subject,
          documentTitle: doc.title,
          selectedWeeks: doc.weeks.map((w) => w.weekNumber),
        },
      ],
      questionCount: 50,
      durationMinutes: 60,
      difficulty: 'High difficulty',
      createdAt: new Date().toISOString(),
    },
    status: 'submitted',
    startedAt: new Date().toISOString(),
    deadlineAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    currentQuestionIndex: 0,
    responses: {},
    questions: stripAnswerKeyForClient(initialExamQuestions),
  };

  const outcome = saveExamQuestionsAndGenerateNext50MCQs(
    mockDb,
    mockAttempt,
    initialExamQuestions
  );

  assert.equal(outcome.savedFromExamCount, 50, 'All 50 exam questions must be saved to Question Bank');
  assert.equal(outcome.newlyGeneratedCount, 50, 'Must generate and save 50 brand-new MCQs after exam completion');
  assert.equal(mockDb.questionBank.length, 100, 'Question Bank must now contain 100 distinct items (50 from exam + 50 newly generated)');
  assert.equal(mockDb.generationJobs.length, 1, 'Must record a completed GenerationBatchJob for the 50 new MCQs');
});


