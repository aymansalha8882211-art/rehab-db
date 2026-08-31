/**
 * SDQ scoring — Strengths and Difficulties Questionnaire.
 *
 * Extracted from the tab component so the arithmetic can be tested without
 * mounting React or opening IndexedDB. This is clinical scoring for children;
 * it is the part of this codebase least able to afford a silent regression.
 */

export const SDQ_OPTIONS = ['لا تنطبق', 'تنطبق إلى حد ما', 'تنطبق تماماً'] as const;
export type SdqOption = typeof SDQ_OPTIONS[number];
export const OPTION_SCORES: Record<SdqOption, number> = {
  'لا تنطبق': 0,
  'تنطبق إلى حد ما': 1,
  'تنطبق تماماً': 2,
};

export interface SdqQuestion {
  id: number;
  text: string;
  domain: 'emotional' | 'conduct' | 'hyperactivity' | 'peer' | 'prosocial';
  reversed: boolean; // reversed scoring
}

export const SDQ_QUESTIONS: SdqQuestion[] = [
  // Emotional symptoms (5 questions)
  { id: 1,  text: 'يشكو كثيراً من الصداع أو آلام المعدة أو الغثيان',          domain: 'emotional',     reversed: false },
  { id: 2,  text: 'يقلق كثيراً أو يبدو قلقاً جداً',                            domain: 'emotional',     reversed: false },
  { id: 3,  text: 'كثيراً ما يكون تعيساً أو حزيناً أو يبكي',                   domain: 'emotional',     reversed: false },
  { id: 4,  text: 'يشعر بالتوتر في المواقف الجديدة أو يفقد الثقة بنفسه بسهولة', domain: 'emotional',     reversed: false },
  { id: 5,  text: 'عنده مخاوف ومخاوف كثيرة',                                    domain: 'emotional',     reversed: false },

  // Conduct problems (5 questions)
  { id: 6,  text: 'كثيراً ما يثور أو يفقد أعصابه',                              domain: 'conduct',       reversed: false },
  { id: 7,  text: 'عموماً متصرف ومطيع (عكسي)',                                   domain: 'conduct',       reversed: true  },
  { id: 8,  text: 'يتشاجر مع الأطفال الآخرين أو يستغلهم',                        domain: 'conduct',       reversed: false },
  { id: 9,  text: 'يكذب أو يغش في أغلب الأحيان',                                 domain: 'conduct',       reversed: false },
  { id: 10, text: 'يسرق من المنزل أو من المدرسة أو من أماكن أخرى',               domain: 'conduct',       reversed: false },

  // Hyperactivity (5 questions)
  { id: 11, text: 'لا يستطيع الثبات في مكانه أو متململ أو مفرط النشاط',         domain: 'hyperactivity', reversed: false },
  { id: 12, text: 'يتلهى بسهولة أو يجد صعوبة في التركيز',                        domain: 'hyperactivity', reversed: false },
  { id: 13, text: 'يفكر قبل أن يتصرف (عكسي)',                                    domain: 'hyperactivity', reversed: true  },
  { id: 14, text: 'يُتم ما بدأه ولديه انتباه جيد (عكسي)',                         domain: 'hyperactivity', reversed: true  },
  { id: 15, text: 'يتصرف باندفاع دون تفكير',                                      domain: 'hyperactivity', reversed: false },

  // Peer problems (5 questions)
  { id: 16, text: 'يفضل البقاء وحده بدلاً من اللعب مع الأطفال الآخرين',          domain: 'peer',          reversed: false },
  { id: 17, text: 'لديه على الأقل صديق حميم واحد (عكسي)',                         domain: 'peer',          reversed: true  },
  { id: 18, text: 'يُحبه الأطفال الآخرون عموماً (عكسي)',                          domain: 'peer',          reversed: true  },
  { id: 19, text: 'يُعامَل بشكل سيئ أو يُقصى من قبل الأطفال الآخرين',            domain: 'peer',          reversed: false },
  { id: 20, text: 'يتعاون مع الأطفال الكبار أكثر من أقرانه',                     domain: 'peer',          reversed: false },

  // Prosocial (5 questions)
  { id: 21, text: 'يهتم بمشاعر الآخرين',                                          domain: 'prosocial',     reversed: false },
  { id: 22, text: 'يتقاسم مع الأطفال الآخرين بسهولة (حلوى أو ألعاب أو أقلام)',   domain: 'prosocial',     reversed: false },
  { id: 23, text: 'يساعد إذا كان أحدهم مجروحاً أو تعيساً أو يشعر بتوعك',         domain: 'prosocial',     reversed: false },
  { id: 24, text: 'لطيف مع الأطفال الأصغر منه',                                   domain: 'prosocial',     reversed: false },
  { id: 25, text: 'كثيراً ما يتطوع لمساعدة الآخرين (والدين أو معلمين أو أطفال)', domain: 'prosocial',     reversed: false },
];

export const THRESHOLDS: Record<string, [number, number]> = {
  // [borderline_min, abnormal_min]
  emotional:     [4, 6],
  conduct:       [3, 4],
  hyperactivity: [6, 7],
  peer:          [3, 5],
  prosocial:     [0, 0], // reversed: lower is worse — handled separately
  total:         [15, 20],
};

export function getCategory(domain: string, score: number): 'normal' | 'borderline' | 'abnormal' {
  if (domain === 'prosocial') {
    if (score >= 6) return 'normal';
    if (score === 5) return 'borderline';
    return 'abnormal';
  }
  const [bl, ab] = THRESHOLDS[domain] || [99, 99];
  if (score < bl) return 'normal';
  if (score < ab) return 'borderline';
  return 'abnormal';
}

/**
 * Scores one questionnaire.
 *
 * `unanswered` matters: a blank answer is 0 raw, and a reversed question turns
 * a raw 0 into 2 -- the maximum severity. Scoring a partly-filled form would
 * therefore invent difficulty that nobody reported. Callers must pass a
 * complete set of 25 answers; `isComplete` is provided to check first.
 */
export function computeScores(ans: Record<number, SdqOption>) {
  const domains = ['emotional', 'conduct', 'hyperactivity', 'peer', 'prosocial'];
  const scores: Record<string, number> = {};
  for (const domain of domains) {
    scores[domain] = SDQ_QUESTIONS
      .filter(q => q.domain === domain)
      .reduce((sum, q) => {
        const raw = OPTION_SCORES[ans[q.id] ?? 'لا تنطبق'];
        return sum + (q.reversed ? 2 - raw : raw);
      }, 0);
  }
  const totalScore = scores.emotional + scores.conduct + scores.hyperactivity + scores.peer;
  return { scores, totalScore };
}

/** True when every one of the 25 questions has an answer. */
export function isComplete(ans: Record<number, SdqOption>): boolean {
  return SDQ_QUESTIONS.every(q => ans[q.id] !== undefined);
}
