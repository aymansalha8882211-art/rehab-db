/**
 * SDQTab.tsx
 * artifacts/rehab-db/src/components/SDQTab.tsx
 *
 * استبيان نقاط القوة والصعوبات (SDQ)
 * 25 سؤال — 5 مجالات — حساب تلقائي للنتائج
 * يُحفظ في IndexedDB مرتبط بالمستفيد
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Brain, CheckCircle2, AlertTriangle, XCircle, Loader2, RotateCcw, Clock } from 'lucide-react';

// ─── SDQ Data ─────────────────────────────────────────────────────────────────
const SDQ_OPTIONS = ['لا تنطبق', 'تنطبق إلى حد ما', 'تنطبق تماماً'] as const;
type SdqOption = typeof SDQ_OPTIONS[number];
const OPTION_SCORES: Record<SdqOption, number> = {
  'لا تنطبق': 0,
  'تنطبق إلى حد ما': 1,
  'تنطبق تماماً': 2,
};

interface SdqQuestion {
  id: number;
  text: string;
  domain: 'emotional' | 'conduct' | 'hyperactivity' | 'peer' | 'prosocial';
  reversed: boolean; // reversed scoring
}

const SDQ_QUESTIONS: SdqQuestion[] = [
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

const DOMAIN_LABELS: Record<string, string> = {
  emotional:     'الأعراض العاطفية',
  conduct:       'مشكلات السلوك',
  hyperactivity: 'فرط الحركة / نقص الانتباه',
  peer:          'مشكلات العلاقات مع الأقران',
  prosocial:     'السلوك الاجتماعي الإيجابي',
};

const DOMAIN_COLORS: Record<string, string> = {
  emotional:     'text-blue-700 bg-blue-50 border-blue-200',
  conduct:       'text-orange-700 bg-orange-50 border-orange-200',
  hyperactivity: 'text-purple-700 bg-purple-50 border-purple-200',
  peer:          'text-teal-700 bg-teal-50 border-teal-200',
  prosocial:     'text-green-700 bg-green-50 border-green-200',
};

// Thresholds (normal / borderline / abnormal)
const THRESHOLDS: Record<string, [number, number]> = {
  // [borderline_min, abnormal_min]
  emotional:     [4, 6],
  conduct:       [3, 4],
  hyperactivity: [6, 7],
  peer:          [3, 5],
  prosocial:     [0, 0], // reversed: lower is worse — handled separately
  total:         [15, 20],
};

function getCategory(domain: string, score: number): 'normal' | 'borderline' | 'abnormal' {
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

const CATEGORY_STYLE: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  normal:     { label: 'طبيعي',       color: 'text-green-700 bg-green-100',  icon: CheckCircle2 },
  borderline: { label: 'حدي',         color: 'text-amber-700 bg-amber-100',  icon: AlertTriangle },
  abnormal:   { label: 'غير طبيعي',  color: 'text-red-700 bg-red-100',      icon: XCircle },
};

// ─── DB Interface ─────────────────────────────────────────────────────────────
interface SdqRecord {
  id: string;
  beneficiaryId: string;
  answers: Record<number, SdqOption>;
  scores: Record<string, number>;
  totalScore: number;
  completedAt: string;
  completedBy: string;
  completedByName: string;
  notes: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  beneficiaryId: string;
  language: string;
  canEdit: boolean;
}

export default function SDQTab({ beneficiaryId, language, canEdit }: Props) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isAr = language === 'ar';

  const [records,   setRecords]   = useState<SdqRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [mode,      setMode]      = useState<'view' | 'fill'>('view');
  const [answers,   setAnswers]   = useState<Record<number, SdqOption>>({});
  const [notes,     setNotes]     = useState('');
  const [activeRec, setActiveRec] = useState<SdqRecord | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const all = await (db as any).table('sdqRecords')
        .where('beneficiaryId').equals(beneficiaryId)
        .toArray().catch(() => []);
      all.sort((a: SdqRecord, b: SdqRecord) => b.completedAt.localeCompare(a.completedAt));
      setRecords(all);
      if (all.length > 0) setActiveRec(all[0]);
    } catch { setRecords([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadRecords(); }, [beneficiaryId]);

  const computeScores = (ans: Record<number, SdqOption>) => {
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
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered   = answeredCount === 25;

  const handleSave = async () => {
    if (!allAnswered) {
      toast({ title: 'يرجى الإجابة على جميع الأسئلة (25 سؤال)', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { scores, totalScore } = computeScores(answers);
      const rec: SdqRecord = {
        id: 'sdq_' + Date.now(),
        beneficiaryId,
        answers,
        scores,
        totalScore,
        completedAt: new Date().toISOString(),
        completedBy: currentUser?.id || '',
        completedByName: currentUser?.fullName || '',
        notes,
      };
      await (db as any).table('sdqRecords').add(rec).catch(async () => {
        // table may not exist yet — create via upgrade
        await db.open();
        await (db as any).table('sdqRecords').add(rec);
      });
      toast({ title: 'تم حفظ تقييم SDQ بنجاح ✓' });
      setMode('view');
      setAnswers({});
      setNotes('');
      await loadRecords();
    } catch (e) {
      toast({ title: 'فشل الحفظ — تأكد من إعداد قاعدة البيانات', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // ── View mode ──────────────────────────────────────────────────────────────
  if (mode === 'view') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {isAr ? 'استبيان نقاط القوة والصعوبات — 25 سؤال في 5 مجالات' : 'Strengths and Difficulties Questionnaire — 25 items, 5 domains'}
            </p>
            {records.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{records.length} تقييم سابق</p>}
          </div>
          {canEdit && (
            <Button size="sm" className="gap-2" onClick={() => { setAnswers({}); setNotes(''); setMode('fill'); }}>
              <Brain className="w-4 h-4" />تقييم جديد
            </Button>
          )}
        </div>

        {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}

        {!loading && records.length === 0 && (
          <Card>
            <CardContent className="py-14 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto">
                <Brain className="w-7 h-7 text-purple-600" />
              </div>
              <p className="text-sm font-medium">{isAr ? 'لم يتم تقييم SDQ بعد' : 'No SDQ assessment yet'}</p>
              <p className="text-xs text-muted-foreground">
                {isAr ? 'استبيان SDQ يساعد في تقييم الصحة النفسية والسلوكية للأطفال والمراهقين' : 'SDQ helps assess mental health and behavioral strengths and difficulties'}
              </p>
              {canEdit && (
                <Button size="sm" className="gap-2 mt-2" onClick={() => setMode('fill')}>
                  <Brain className="w-4 h-4" />ابدأ التقييم
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && activeRec && (
          <>
            {/* History selector */}
            {records.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {records.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveRec(r)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeRec.id === r.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}
                  >
                    <Clock className="w-3 h-3 inline ms-1" />
                    {new Date(r.completedAt).toLocaleDateString('ar-EG')}
                    {i === 0 && <span className="ms-1 opacity-70">(أحدث)</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Total score */}
            <Card className={`border-2 ${activeRec.totalScore >= 20 ? 'border-red-300 bg-red-50/50' : activeRec.totalScore >= 15 ? 'border-amber-300 bg-amber-50/50' : 'border-green-300 bg-green-50/50'}`}>
              <CardContent className="p-5 flex items-center gap-5">
                <div className="text-center">
                  <p className={`text-5xl font-bold ${activeRec.totalScore >= 20 ? 'text-red-600' : activeRec.totalScore >= 15 ? 'text-amber-600' : 'text-green-600'}`}>
                    {activeRec.totalScore}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">من 40</p>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">الدرجة الكلية للصعوبات</p>
                  <p className={`text-sm font-medium mt-0.5 ${activeRec.totalScore >= 20 ? 'text-red-600' : activeRec.totalScore >= 15 ? 'text-amber-600' : 'text-green-600'}`}>
                    {getCategory('total', activeRec.totalScore) === 'normal' ? '✓ ضمن المعدل الطبيعي' : getCategory('total', activeRec.totalScore) === 'borderline' ? '⚠️ في المنطقة الحدية' : '⚠️ يستدعي المتابعة'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    بواسطة: {activeRec.completedByName} · {new Date(activeRec.completedAt).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Domain scores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['emotional', 'conduct', 'hyperactivity', 'peer', 'prosocial'] as const).map(domain => {
                const score    = activeRec.scores[domain] ?? 0;
                const cat      = getCategory(domain, score);
                const style    = CATEGORY_STYLE[cat];
                const Icon     = style.icon;
                const maxScore = domain === 'prosocial' ? 10 : 10;

                return (
                  <div key={domain} className={`rounded-xl border p-4 ${DOMAIN_COLORS[domain]}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{DOMAIN_LABELS[domain]}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${style.color}`}>
                        <Icon className="w-3 h-3" />{style.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cat === 'normal' ? 'bg-green-500' : cat === 'borderline' ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${(score / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold w-8 text-end">{score}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            {activeRec.notes && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">ملاحظات المقيِّم</p>
                  <p className="text-sm">{activeRec.notes}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Fill mode ──────────────────────────────────────────────────────────────
  const domains = ['emotional', 'conduct', 'hyperactivity', 'peer', 'prosocial'] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />تعبئة استبيان SDQ
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            أجب عن {25 - answeredCount} سؤال متبقٍ ({answeredCount}/25)
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setMode('view')}>
          <RotateCcw className="w-4 h-4" />إلغاء
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${(answeredCount / 25) * 100}%` }}
        />
      </div>

      {/* Questions by domain */}
      {domains.map(domain => (
        <Card key={domain} className={`border ${DOMAIN_COLORS[domain].split(' ')[2]}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${DOMAIN_COLORS[domain].split(' ')[0]}`}>
              {DOMAIN_LABELS[domain]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {SDQ_QUESTIONS.filter(q => q.domain === domain).map(q => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground text-xs ms-1">{q.id}.</span> {q.text}
                  {q.reversed && <span className="text-xs text-muted-foreground ms-1">(عكسي)</span>}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {SDQ_OPTIONS.map(opt => (
                    <label
                      key={opt}
                      className={`flex-1 min-w-[100px] flex items-center justify-center p-2.5 rounded-xl border-2 cursor-pointer text-xs font-medium transition-all ${answers[q.id] === opt ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-border hover:border-purple-300'}`}
                    >
                      <input
                        type="radio"
                        name={`q${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        className="sr-only"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Notes */}
      <Card>
        <CardContent className="p-4 space-y-1.5">
          <label className="text-sm font-medium">ملاحظات إضافية (اختياري)</label>
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="أي ملاحظات حول التقييم أو سلوك الطفل..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-3 justify-end pb-6">
        <Button variant="outline" onClick={() => setMode('view')}>إلغاء</Button>
        <Button
          onClick={handleSave}
          disabled={!allAnswered || saving}
          className="gap-2 min-w-36"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {allAnswered ? 'حفظ التقييم' : `${25 - answeredCount} سؤال متبقٍ`}
        </Button>
      </div>
    </div>
  );
}
