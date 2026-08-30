import { describe, it, expect } from 'vitest';
import {
  SDQ_QUESTIONS, computeScores, getCategory, isComplete, type SdqOption,
} from './sdq';

/** Fills all 25 answers with the same option. */
const all = (opt: SdqOption): Record<number, SdqOption> =>
  Object.fromEntries(SDQ_QUESTIONS.map(q => [q.id, opt]));

describe('SDQ questionnaire shape', () => {
  it('has 25 questions with unique ids', () => {
    expect(SDQ_QUESTIONS).toHaveLength(25);
    expect(new Set(SDQ_QUESTIONS.map(q => q.id)).size).toBe(25);
  });

  it('puts 5 questions in each of the 5 domains', () => {
    for (const d of ['emotional', 'conduct', 'hyperactivity', 'peer', 'prosocial']) {
      expect(SDQ_QUESTIONS.filter(q => q.domain === d)).toHaveLength(5);
    }
  });

  it('marks exactly the five reverse-scored items', () => {
    expect(SDQ_QUESTIONS.filter(q => q.reversed).map(q => q.id)).toEqual([7, 13, 14, 17, 18]);
  });
});

describe('computeScores', () => {
  it('scores a questionnaire answered "تنطبق تماماً" throughout', () => {
    const { scores, totalScore } = computeScores(all('تنطبق تماماً'));
    // Reverse-scored items invert, so their domains fall short of the 10 maximum.
    expect(scores.emotional).toBe(10);
    expect(scores.conduct).toBe(8);        // q7 reversed
    expect(scores.hyperactivity).toBe(6);  // q13, q14 reversed
    expect(scores.peer).toBe(6);           // q17, q18 reversed
    expect(scores.prosocial).toBe(10);
    // Prosocial is a strengths scale and is excluded from the difficulties total.
    expect(totalScore).toBe(30);
  });

  it('scores a questionnaire answered "لا تنطبق" throughout', () => {
    const { scores, totalScore } = computeScores(all('لا تنطبق'));
    expect(scores.emotional).toBe(0);
    expect(scores.conduct).toBe(2);
    expect(scores.hyperactivity).toBe(4);
    expect(scores.peer).toBe(4);
    expect(scores.prosocial).toBe(0);
    expect(totalScore).toBe(10);
  });

  it('excludes prosocial from the difficulties total', () => {
    const answers = all('لا تنطبق');
    for (const q of SDQ_QUESTIONS.filter(q => q.domain === 'prosocial')) {
      answers[q.id] = 'تنطبق تماماً';
    }
    const { scores, totalScore } = computeScores(answers);
    expect(scores.prosocial).toBe(10);
    expect(totalScore).toBe(10); // unchanged by the prosocial answers
  });

  it('invents difficulty when answers are missing, which is why callers must check isComplete first', () => {
    // A blank form scores 0 raw on every item; the five reverse-scored items
    // turn that 0 into a 2. Scoring an unfinished form therefore reports a
    // child as more affected than anyone said. This is pinned deliberately:
    // the guard belongs at the call site, not in silent zero-filling here.
    const { totalScore } = computeScores({});
    expect(totalScore).toBe(10);
    expect(isComplete({})).toBe(false);
  });
});

describe('isComplete', () => {
  it('is true only when all 25 are answered', () => {
    expect(isComplete(all('لا تنطبق'))).toBe(true);
    const missingOne = all('لا تنطبق');
    delete missingOne[25];
    expect(isComplete(missingOne)).toBe(false);
  });
});

describe('getCategory', () => {
  it('bands the difficulties scales on their own thresholds', () => {
    expect(getCategory('emotional', 3)).toBe('normal');
    expect(getCategory('emotional', 4)).toBe('borderline');
    expect(getCategory('emotional', 6)).toBe('abnormal');

    expect(getCategory('conduct', 2)).toBe('normal');
    expect(getCategory('conduct', 3)).toBe('borderline');
    expect(getCategory('conduct', 4)).toBe('abnormal');
  });

  it('reads prosocial in the opposite direction, where a low score is the concern', () => {
    expect(getCategory('prosocial', 10)).toBe('normal');
    expect(getCategory('prosocial', 6)).toBe('normal');
    expect(getCategory('prosocial', 5)).toBe('borderline');
    expect(getCategory('prosocial', 4)).toBe('abnormal');
    expect(getCategory('prosocial', 0)).toBe('abnormal');
  });

  it('treats an unknown domain as normal rather than throwing', () => {
    expect(getCategory('nonsense', 3)).toBe('normal');
  });
});
