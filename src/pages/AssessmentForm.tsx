import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/dataContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ClipboardList, Lock } from 'lucide-react';
import {
  Assessment,
  FIM_SCALE,
  AMPUTATION_SIDES, AMPUTATION_SIDES_CHURCH,
  AMPUTATION_LEVELS_CBM, AMPUTATION_LEVELS_CHURCH,
  STUMP_CONDITIONS, STUMP_SHAPES,
  ASSISTIVE_TYPES, ASSISTIVE_DEVICE_NEEDS,
  PAIN_DESCRIPTIONS,
  SERVICES_REQUIRED,
  SHORT_TERM_GOALS, LONG_TERM_GOALS, TREATMENT_PLAN,
  HEALTH_CONDITIONS,
  IMPROVEMENT_STATUS, IMPROVEMENT_STATUS_CHURCH,
  DISABILITY_TYPES_CBM, INJURY_RECENT,
  JOB_STATUS, RELATIONSHIPS,
  CBM_SIGNATURE, CHURCH_SIGNATURE,
  CBM_ASSESSMENT_GROUPS_LABELS,
  SESSION_NUMBERS, getProject
} from '@/data/mockData';

// ─── Helpers ──────────────────────────────────────────────
function SectionHeader({ num, title, color = 'bg-primary', textColor = 'text-primary', badge }: {
  num: string; title: string; color?: string; textColor?: string; badge?: string;
}) {
  return (
    <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${textColor}`}>
      <span className={`w-6 h-6 rounded-full ${color} text-white text-xs flex items-center justify-center font-bold flex-shrink-0`}>{num}</span>
      {title}
      {badge && <Badge variant="outline" className="text-xs ms-auto border-current">{badge}</Badge>}
    </CardTitle>
  );
}

function CheckboxGroup({ label, options, value, onChange, cols = 2, other, onOtherChange }: {
  label?: string; options: readonly string[]; value: string[];
  onChange: (v: string[]) => void; cols?: number;
  other?: string; onOtherChange?: (v: string) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {options.map(opt => (
          <label key={opt} className="flex items-start gap-2 cursor-pointer text-sm py-1 leading-tight">
            <Checkbox checked={value.includes(opt)} onCheckedChange={() => toggle(opt)} className="mt-0.5 flex-shrink-0" />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {value.includes('Other') && onOtherChange && (
        <Input className="mt-1 border-amber-300" placeholder="يرجى التوضيح..." value={other || ''} onChange={e => onOtherChange(e.target.value)} />
      )}
    </div>
  );
}

function RadioGroup({ label, options, value, onChange, cols = 2, other, onOtherChange }: {
  label?: string; options: readonly string[]; value: string;
  onChange: (v: string) => void; cols?: number;
  other?: string; onOtherChange?: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {options.map(opt => (
          <label key={opt} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all ${value === opt ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
            <input type="radio" value={opt} checked={value === opt} onChange={() => onChange(opt)} className="w-3.5 h-3.5 accent-primary" />
            {opt}
          </label>
        ))}
      </div>
      {value === 'Other' && onOtherChange && (
        <Input className="mt-1 border-amber-300" placeholder="يرجى التوضيح..." value={other || ''} onChange={e => onOtherChange(e.target.value)} />
      )}
    </div>
  );
}

function YesNo({ label, value, onChange }: { label: string; value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${value ? 'bg-green-50 border-green-200' : 'bg-muted/30 border-border'}`}>
      <Label className="text-sm cursor-pointer">{label}</Label>
      <Switch checked={!!value} onCheckedChange={onChange} className={value ? 'data-[state=checked]:bg-green-600' : ''} />
    </div>
  );
}

const GAD_QUESTIONS = [
  '1. الشعور بالتوتر أو القلق أو الانفعال؟',
  '2. عدم القدرة على التوقف عن القلق أو السيطرة عليه؟',
  '3. القلق الزائد حول أشياء مختلفة؟',
  '4. صعوبة في الاسترخاء؟',
  '5. القلق الشديد الذي يجعل الجلوس بهدوء صعباً؟',
  '6. سهولة الانفعال أو الانزعاج؟',
  '7. الشعور بالخوف كأن شيئاً سيئاً سيحدث؟',
];
const GAD_SCALE = ['0 - لا يوجد', '1 - أيام قليلة', '2 - أكثر من نصف الأيام', '3 - كل يوم تقريباً'];

const SDQ_QUESTIONS = [
  'يهتم بمشاعر الآخرين.',
  'لا يستطيع البقاء أو الاستقرار في مكان واحد، كثير الحركة.',
  'كثيرًا ما يشتكي من صداع أو ألم في البطن أو الشعور بالغثيان.',
  'يشارك الآخرين بسهولة فيما يخصه.',
  'كثيرًا ما يفقد نوبات من الغضب الشديد أو سريع الغضب.',
  'خجول، يميل إلى اللعب لوحده.',
  'مطيع، عادة يفعل ما يطلبه منه الكبار.',
  'يقلق من أشياء كثيرة، كثيرًا ما يبدو عليه القلق.',
  'يساعد الآخرين إذا ما حدث لأحدهم مكروه.',
  'يتململ أو يتلوّى باستمرار.',
  'لديه على الأقل صديق واحد جيد.',
  'كثيرًا ما يتعارك مع الآخرين من نفس سنه أو يتنمر عليهم.',
  'كثيرًا ما يكون غير سعيد، حزين أو يبكي بسهولة.',
  'في الغالب محبوب ممن هم في سنه.',
  'يشتت انتباهه بسرعة وقليل التركيز.',
  'في المواقف الجديدة، من السهل أن يفقد ثقته بنفسه.',
  'لطيف مع من هم أصغر منه.',
  'كثيرًا ما يكذب، يخدع أو يغش.',
  'يُستهزأ به أو يتنمر عليه من هم في سنه.',
  'كثيرًا ما يتطوع لمساعدة الآخرين.',
  'يفكر قبل أن يتصرف.',
  'يسرق من البيت أو المدرسة أو من أماكن أخرى.',
  'ينسجم بشكل أفضل مع الكبار عنه مع الأطفال في نفس سنه.',
  'يخاف من أشياء كثيرة، من السهل تخويفه.',
  'يتابع أداء الواجبات حتى النهاية، لديه انتباه جيد.',
];
const SDQ_SCALE = ['0 - لا ينطبق', '1 - ينطبق نوعاً ما', '2 - ينطبق تماماً'];

// ─── SDQ Scoring ──────────────────────────────────────────
function calcSdqScores(a: number[]) {
  const r = (i: number) => (a[i] >= 0 ? 2 - a[i] : -1); // reversed
  const s = (i: number) => (a[i] >= 0 ? a[i] : 0);
  const emotional    = [s(2),s(7),s(12),s(15),s(23)].reduce((x,y)=>x+y,0);
  const conduct = [s(4), r(6) >= 0 ? r(6) : 0, s(11), s(17), r(21) >= 0 ? r(21) : 0].reduce((x,y)=>x+y,0);
  const hyperact     = [s(1),s(9),s(14),r(20) >= 0 ? r(20) : 0,r(24) >= 0 ? r(24) : 0].reduce((x,y)=>x+y,0);
  const peer         = [s(5),r(10) >= 0 ? r(10) : 0,r(13) >= 0 ? r(13) : 0,s(18),s(22)].reduce((x,y)=>x+y,0);
  const prosocial    = [s(0),s(3),s(8),s(16),s(19)].reduce((x,y)=>x+y,0);
  const total        = emotional + conduct + hyperact + peer;
  const category     = total <= 16
    ? 'درجة طبيعية ولا يحتاج تدخل نفسي اجتماعي'
    : total <= 20
    ? 'درجة متوسطة ويمكن ضمه لمجموعات التدخل النفسي الاجتماعي'
    : 'درجة عالية ويحتاج تدخل طب نفسي متخصص ويحَوّل لمدير الحالة';
  return { emotional, conduct, hyperact, peer, prosocial, total, category };
}

export default function AssessmentForm() {
  const { id: beneficiaryId } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { currentUser, permissions } = useAuth();
  const { beneficiaries, addAssessment } = useData();
  const { toast } = useToast();

  const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
  const project = beneficiary?.project || 'CBM';
  const isCBM = getProject(project).forms === 'cbm';
  const canAdd = permissions.canAddSession;
  const userProjects = currentUser?.projects || [];
  const canViewProject = userProjects.length === 0 || userProjects.includes(project as any);

  // ─── الحقول المشتركة ──────────────────────────────────────
  const [assessmentDate,    setAssessmentDate]    = useState(new Date().toISOString().split('T')[0]);
  const [sessionNumber,     setSessionNumber]     = useState('');
  const [photoConsent,      setPhotoConsent]      = useState(false);

  // الصحة العامة
  const [healthConditions,  setHealthConditions]  = useState<string[]>([]);
  const [healthOther,       setHealthOther]       = useState('');

  // البتر
  const [amputationSide,    setAmputationSide]    = useState('');
  const [amputationOther,   setAmputationOther]   = useState('');
  const [amputationDate,    setAmputationDate]    = useState('');
  const [hasProsthesis,     setHasProsthesis]     = useState(false);
  const [assistiveNow,      setAssistiveNow]      = useState(false);
  const [assistiveTypes,    setAssistiveTypes]    = useState<string[]>([]);
  const [assistiveDeviceNeeds, setAssistiveDeviceNeeds] = useState<string[]>([]);
  const [assistiveDeviceSize,  setAssistiveDeviceSize]  = useState('');
  const [amputationLevel,   setAmputationLevel]   = useState<string[]>([]);
  const [amputationLevelOther, setAmputationLevelOther] = useState('');
  const [stumpCondition,    setStumpCondition]    = useState<string[]>([]);
  const [stumpCondOther,    setStumpCondOther]    = useState('');
  const [stumpShape,        setStumpShape]        = useState('');
  const [stumpShapeOther,   setStumpShapeOther]   = useState('');
  const [stumpCircumference, setStumpCircumference] = useState('');

  // الألم
  const [painPresent,       setPainPresent]       = useState(false);
  const [painLocation,      setPainLocation]      = useState('');
  const [painDescription,   setPainDescription]   = useState<string[]>([]);
  const [painDescOther,     setPainDescOther]     = useState('');
  const [painIncreases,     setPainIncreases]     = useState('');
  const [painDecreases,     setPainDecreases]     = useState('');
  const [painScore,         setPainScore]         = useState(0);

  // العلاج الطبيعي
  const [jointRom,          setJointRom]          = useState('');
  const [romRestricted,     setRomRestricted]     = useState(false);
  const [muscleTest,        setMuscleTest]        = useState('');
  const [musclePower,       setMusclePower]       = useState('');
  const [balance,           setBalance]           = useState(false);

  // FIM
  const [fimBedChair,       setFimBedChair]       = useState('');
  const [fimToilet,         setFimToilet]         = useState('');
  const [fimTubShower,      setFimTubShower]      = useState('');
  const [fimWalkWheelchair, setFimWalkWheelchair] = useState('');
  const [fimStairs,         setFimStairs]         = useState('');

  // التثقيف الصحي
  const [eduAmputation,          setEduAmputation]          = useState(false);
  const [eduInfectionPrevention, setEduInfectionPrevention] = useState(false);
  const [eduDiet,                setEduDiet]                = useState(false);
  const [eduPhysiotherapy,       setEduPhysiotherapy]       = useState(false);
  const [eduMobilityTransfer,    setEduMobilityTransfer]    = useState(false);
  const [eduNeedMore,            setEduNeedMore]            = useState(false);
  const [eduTopicsNeeded,        setEduTopicsNeeded]        = useState('');

  // GAD-7
  const [gadAnswers, setGadAnswers] = useState<number[]>(Array(7).fill(-1));

  // المخرجات
  const [majorProblems,        setMajorProblems]        = useState('');
  const [servicesRequired,     setServicesRequired]     = useState<string[]>([]);
  const [servicesReferral,     setServicesReferral]     = useState('');
  const [servicesOther,        setServicesOther]        = useState('');
  const [shortTermGoals,       setShortTermGoals]       = useState<string[]>([]);
  const [longTermGoals,        setLongTermGoals]        = useState<string[]>([]);
  const [planOfTreatment,      setPlanOfTreatment]      = useState<string[]>([]);
  const [notes,                setNotes]                = useState('');

  // ─── CBM فقط ──────────────────────────────────────────────
  const [groups,               setGroups]               = useState<string[]>([]);
  const [amputationPart,       setAmputationPart]       = useState('');
  const [improvementSinceLast,    setImprovementSinceLast]    = useState('');
  const [dischargeDatePhisp,      setDischargeDatePhisp]      = useState('');
  const [improvementSinceLastPss, setImprovementSinceLastPss] = useState('');
  const [dischargeDatePss,        setDischargeDatePss]        = useState('');
  const [signature,            setSignature]            = useState<string[]>([]);
  // قسم الإعاقة (CBM)
  const [hasDisabilityAssess,  setHasDisabilityAssess]  = useState<'yes'|'no'|''>('');
  const [disabilityType,       setDisabilityType]       = useState<string[]>([]);
  const [injuryRecent,         setInjuryRecent]         = useState('');
  const [hasAmputation,        setHasAmputation]        = useState<'yes'|'no'|''>('');
  // SDQ (CBM)
  const [sdqAnswers,           setSdqAnswers]           = useState<number[]>(Array(25).fill(-1));

  // ─── Church فقط ───────────────────────────────────────────
  const [job,                  setJob]                  = useState('');
  const [improvementChurch,    setImprovementChurch]    = useState('');
  const [dischargeDateChurch,  setDischargeDateChurch]  = useState('');
  const [signatureChurch,      setSignatureChurch]      = useState<string[]>([]);

  // ─── Computed ─────────────────────────────────────────────
  const gadTotal  = gadAnswers.filter(v => v >= 0).reduce((a, b) => a + b, 0);
  const gadFilled = gadAnswers.filter(v => v >= 0).length;
  const sdqScores = calcSdqScores(sdqAnswers);

  // ─── الحفظ ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!assessmentDate) {
      toast({ title: 'يرجى تحديد تاريخ التقييم', variant: 'destructive' });
      return;
    }

    const a: Assessment = {
      id: 'a_' + Date.now(),
      beneficiaryId: beneficiaryId || '',
      project,
      assessmentDate,
      sessionNumber,
      photoConsent,
      // الصحة
      healthConditions,
      healthOther,
      // البتر
      amputationSide,
      amputationOther: !isCBM ? amputationOther : undefined,
      amputationDate,
      hasProsthesis,
      assistiveNow,
      assistiveTypes,
      assistiveDeviceNeeds,
      assistiveDeviceSize,
      amputationLevel,
      amputationLevelOther,
      amputationPart: isCBM ? amputationPart : undefined,
      stumpCondition,
      stumpConditionOther: stumpCondOther,
      stumpShape,
      stumpShapeOther,
      stumpCircumference: stumpCircumference ? parseFloat(stumpCircumference) : undefined,
      // الألم
      painPresent,
      painLocation,
      painDescription,
      painDescOther,
      painIncreases,
      painDecreases,
      painScore,
      // العلاج الطبيعي
      jointRom, romRestricted, muscleTest,
      musclePower: musclePower ? parseFloat(musclePower) : undefined,
      balance,
      // FIM
      fimBedChair, fimToilet, fimTubShower, fimWalkWheelchair, fimStairs,
      // التثقيف
      eduAmputation, eduInfectionPrevention, eduDiet,
      eduPhysiotherapy, eduMobilityTransfer, eduNeedMore, eduTopicsNeeded,
      // GAD-7
      gad1: gadAnswers[0] >= 0 ? gadAnswers[0] : undefined,
      gad2: gadAnswers[1] >= 0 ? gadAnswers[1] : undefined,
      gad3: gadAnswers[2] >= 0 ? gadAnswers[2] : undefined,
      gad4: gadAnswers[3] >= 0 ? gadAnswers[3] : undefined,
      gad5: gadAnswers[4] >= 0 ? gadAnswers[4] : undefined,
      gad6: gadAnswers[5] >= 0 ? gadAnswers[5] : undefined,
      gad7: gadAnswers[6] >= 0 ? gadAnswers[6] : undefined,
      gadTotal: gadFilled > 0 ? gadTotal : undefined,
      // المخرجات
      majorProblems, servicesRequired, servicesReferral, servicesOther,
      shortTermGoals, longTermGoals, planOfTreatment, notes,
      // CBM فقط
      ...(isCBM ? {
        groups,
        improvementSinceLast,
        dischargeDatePhisp: improvementSinceLast === 'Discharge' ? dischargeDatePhisp : undefined,
        improvementSinceLastPss,
        dischargeDatePss: improvementSinceLastPss === 'Discharge' ? dischargeDatePss : undefined,
        signature,
        hasDisabilityAssess: hasDisabilityAssess || undefined,
        disabilityType,
        injuryRecent,
        hasAmputation: hasAmputation || undefined,
        sdqQ1:  sdqAnswers[0]  >= 0 ? sdqAnswers[0]  : undefined,
        sdqQ2:  sdqAnswers[1]  >= 0 ? sdqAnswers[1]  : undefined,
        sdqQ3:  sdqAnswers[2]  >= 0 ? sdqAnswers[2]  : undefined,
        sdqQ4:  sdqAnswers[3]  >= 0 ? sdqAnswers[3]  : undefined,
        sdqQ5:  sdqAnswers[4]  >= 0 ? sdqAnswers[4]  : undefined,
        sdqQ6:  sdqAnswers[5]  >= 0 ? sdqAnswers[5]  : undefined,
        sdqQ7:  sdqAnswers[6]  >= 0 ? sdqAnswers[6]  : undefined,
        sdqQ8:  sdqAnswers[7]  >= 0 ? sdqAnswers[7]  : undefined,
        sdqQ9:  sdqAnswers[8]  >= 0 ? sdqAnswers[8]  : undefined,
        sdqQ10: sdqAnswers[9]  >= 0 ? sdqAnswers[9]  : undefined,
        sdqQ11: sdqAnswers[10] >= 0 ? sdqAnswers[10] : undefined,
        sdqQ12: sdqAnswers[11] >= 0 ? sdqAnswers[11] : undefined,
        sdqQ13: sdqAnswers[12] >= 0 ? sdqAnswers[12] : undefined,
        sdqQ14: sdqAnswers[13] >= 0 ? sdqAnswers[13] : undefined,
        sdqQ15: sdqAnswers[14] >= 0 ? sdqAnswers[14] : undefined,
        sdqQ16: sdqAnswers[15] >= 0 ? sdqAnswers[15] : undefined,
        sdqQ17: sdqAnswers[16] >= 0 ? sdqAnswers[16] : undefined,
        sdqQ18: sdqAnswers[17] >= 0 ? sdqAnswers[17] : undefined,
        sdqQ19: sdqAnswers[18] >= 0 ? sdqAnswers[18] : undefined,
        sdqQ20: sdqAnswers[19] >= 0 ? sdqAnswers[19] : undefined,
        sdqQ21: sdqAnswers[20] >= 0 ? sdqAnswers[20] : undefined,
        sdqQ22: sdqAnswers[21] >= 0 ? sdqAnswers[21] : undefined,
        sdqQ23: sdqAnswers[22] >= 0 ? sdqAnswers[22] : undefined,
        sdqQ24: sdqAnswers[23] >= 0 ? sdqAnswers[23] : undefined,
        sdqQ25: sdqAnswers[24] >= 0 ? sdqAnswers[24] : undefined,
        sdqTotal:        sdqAnswers.some(v => v >= 0) ? sdqScores.total        : undefined,
        sdqEmotional:    sdqAnswers.some(v => v >= 0) ? sdqScores.emotional    : undefined,
        sdqConduct:      sdqAnswers.some(v => v >= 0) ? sdqScores.conduct      : undefined,
        sdqHyperactivity:sdqAnswers.some(v => v >= 0) ? sdqScores.hyperact     : undefined,
        sdqPeer:         sdqAnswers.some(v => v >= 0) ? sdqScores.peer         : undefined,
        sdqProsocial:    sdqAnswers.some(v => v >= 0) ? sdqScores.prosocial    : undefined,
        sdqCategory:     sdqAnswers.some(v => v >= 0) ? sdqScores.category     : undefined,
      } : {}),
      // Church فقط
      ...(!isCBM ? {
        job,
        improvementSinceLastChurch: improvementChurch,
        dischargeDateChurch: improvementChurch === 'Discharge' ? dischargeDateChurch : undefined,
        signatureChurch,
      } : {}),
      createdBy: currentUser?.id || '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    await addAssessment(a);
    toast({ title: 'تم حفظ التقييم بنجاح ✅' });
    setLocation(`/beneficiary/${beneficiaryId}`);
  };

  if (!canAdd || !canViewProject) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold">ليس لديك صلاحية إضافة تقييم</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation(`/beneficiary/${beneficiaryId}`)}>العودة</Button>
      </div>
    );
  }

  const projectColor = !isCBM ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
  const ampSides  = isCBM ? AMPUTATION_SIDES  : AMPUTATION_SIDES_CHURCH;
  const ampLevels = isCBM ? AMPUTATION_LEVELS_CBM : AMPUTATION_LEVELS_CHURCH;
  const improvementOpts = isCBM ? IMPROVEMENT_STATUS : IMPROVEMENT_STATUS_CHURCH;
  const sigOptions = isCBM ? CBM_SIGNATURE : CHURCH_SIGNATURE;

  // ─── CBM Groups UI ────────────────────────────────────────
  const CBM_GROUPS_LIST = Object.keys(CBM_ASSESSMENT_GROUPS_LABELS);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setLocation(`/beneficiary/${beneficiaryId}`)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            التقييم الشامل
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isCBM ? 'نموذج Kobo CBM الكامل' : 'نموذج Kobo Church الكامل'} — يُعبَّأ من قبل الفريق المختص
          </p>
        </div>
        <Badge className={`ms-auto text-xs ${projectColor}`}>{project}</Badge>
      </div>

      {/* معلومات المستفيد */}
      {beneficiary && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {beneficiary.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{beneficiary.fullName}</p>
              <p className="text-xs text-muted-foreground">{beneficiary.nationalId} · {beneficiary.residenceArea}</p>
            </div>
            <Badge variant="outline" className="text-xs">{beneficiary.injuryType}</Badge>
          </CardContent>
        </Card>
      )}

      {/* ── 1. بيانات التقييم ── */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="1" title="بيانات التقييم" /></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">تاريخ التقييم *</Label>
              <Input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">رقم الجلسة</Label>
              <Select value={sessionNumber} onValueChange={setSessionNumber}>
                <SelectTrigger><SelectValue placeholder="اختر رقم الجلسة" /></SelectTrigger>
                <SelectContent>{SESSION_NUMBERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Church فقط: العمل */}
          {!isCBM && (
            <div className="space-y-1.5">
              <Label className="text-sm">الوضع الوظيفي</Label>
              <div className="flex gap-2 flex-wrap">
                {JOB_STATUS.map(j => (
                  <label key={j} className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm cursor-pointer transition-all ${job === j ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
                    <input type="radio" checked={job === j} onChange={() => setJob(j)} className="accent-primary w-3.5 h-3.5" />
                    {j}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* CBM فقط: اختيار الأقسام */}
          {isCBM && (
            <div className="space-y-2">
              <Label className="text-sm">الأقسام المراد تعبئتها</Label>
              <div className="flex flex-wrap gap-2">
                {CBM_GROUPS_LIST.map(g => (
                  <label key={g} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs cursor-pointer transition-all ${groups.includes(g) ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
                    <Checkbox checked={groups.includes(g)} onCheckedChange={() => setGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])} />
                    {CBM_ASSESSMENT_GROUPS_LABELS[g]}
                  </label>
                ))}
              </div>
            </div>
          )}

          <YesNo label="الموافقة على التصوير لأغراض التوثيق والتعليم" value={photoConsent} onChange={setPhotoConsent} />
        </CardContent>
      </Card>

      {/* ── 2. الصحة العامة ── */}
      <Card className="border-yellow-200">
        <CardHeader className="pb-3"><SectionHeader num="2" title="الصحة العامة" color="bg-yellow-600" textColor="text-yellow-700" /></CardHeader>
        <CardContent>
          <CheckboxGroup
            label="الحالات الصحية (حدد كل ما ينطبق)"
            options={HEALTH_CONDITIONS}
            value={healthConditions}
            onChange={setHealthConditions}
            cols={2}
          />
          {healthConditions.includes('Others') && (
            <Input className="mt-2 border-amber-300" placeholder="يرجى التوضيح..." value={healthOther} onChange={e => setHealthOther(e.target.value)} />
          )}
        </CardContent>
      </Card>

      {/* ── 3. تقييم البتر ── */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3"><SectionHeader num="3" title="تقييم البتر" color="bg-blue-600" textColor="text-blue-700" /></CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            label="جانب البتر"
            options={ampSides}
            value={amputationSide}
            onChange={setAmputationSide}
            cols={2}
            other={amputationOther}
            onOtherChange={!isCBM ? setAmputationOther : undefined}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">تاريخ البتر</Label>
              <Input type="date" value={amputationDate} onChange={e => setAmputationDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">محيط الجذع (سم)</Label>
              <Input type="number" placeholder="مثال: 25.5" value={stumpCircumference} onChange={e => setStumpCircumference(e.target.value)} />
            </div>
          </div>
          <YesNo label="يوجد طرف صناعي متاح" value={hasProsthesis} onChange={setHasProsthesis} />
          <YesNo label="يستخدم أجهزة مساعدة حالياً؟" value={assistiveNow} onChange={setAssistiveNow} />
          {assistiveNow && (
            <CheckboxGroup label="نوع الأجهزة المستخدمة" options={ASSISTIVE_TYPES} value={assistiveTypes} onChange={setAssistiveTypes} cols={2} />
          )}
          <CheckboxGroup label="الأجهزة المساعدة المطلوبة" options={ASSISTIVE_DEVICE_NEEDS} value={assistiveDeviceNeeds} onChange={setAssistiveDeviceNeeds} cols={2} />
          {(assistiveDeviceNeeds.includes('Wheel chair') || assistiveDeviceNeeds.includes('Elbow Crutches') || assistiveDeviceNeeds.includes('Axillary Crutches') || assistiveDeviceNeeds.includes('Walker')) && (
            <div className="space-y-1.5">
              <Label className="text-sm">تحديد مقاس الجهاز</Label>
              <Input placeholder="مثال: Medium, Large..." value={assistiveDeviceSize} onChange={e => setAssistiveDeviceSize(e.target.value)} />
            </div>
          )}
          <CheckboxGroup label="مستوى البتر" options={ampLevels} value={amputationLevel} onChange={setAmputationLevel} cols={2} other={amputationLevelOther} onOtherChange={setAmputationLevelOther} />
          {/* CBM فقط: تحديد مكان البتر */}
          {isCBM && (
            <div className="space-y-1.5">
              <Label className="text-sm">تحديد مكان البتر</Label>
              <Input placeholder="مثال: فوق الركبة — الجانب الأيسر" value={amputationPart} onChange={e => setAmputationPart(e.target.value)} />
            </div>
          )}
          <CheckboxGroup label="حالة الجذع" options={STUMP_CONDITIONS} value={stumpCondition} onChange={setStumpCondition} cols={2} other={stumpCondOther} onOtherChange={setStumpCondOther} />
          <RadioGroup label="شكل الجذع" options={STUMP_SHAPES} value={stumpShape} onChange={setStumpShape} cols={2} other={stumpShapeOther} onOtherChange={setStumpShapeOther} />
        </CardContent>
      </Card>

      {/* ── 4. تقييم الألم ── */}
      <Card className="border-red-200">
        <CardHeader className="pb-3"><SectionHeader num="4" title="تقييم الألم" color="bg-red-500" textColor="text-red-700" /></CardHeader>
        <CardContent className="space-y-4">
          <YesNo label="هل يوجد ألم؟" value={painPresent} onChange={setPainPresent} />
          {painPresent && (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm">مكان الألم</Label>
                <Input placeholder="مثال: الركبة اليسرى" value={painLocation} onChange={e => setPainLocation(e.target.value)} />
              </div>
              <CheckboxGroup label="وصف الألم" options={PAIN_DESCRIPTIONS} value={painDescription} onChange={setPainDescription} cols={2} other={painDescOther} onOtherChange={setPainDescOther} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">ما يزيد الألم</Label>
                  <Input placeholder="مثال: المشي، الحركة" value={painIncreases} onChange={e => setPainIncreases(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">ما يخفف الألم</Label>
                  <Input placeholder="مثال: الراحة، التبريد" value={painDecreases} onChange={e => setPainDecreases(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">درجة الألم (0-10)</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex gap-1.5 flex-wrap">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} type="button" onClick={() => setPainScore(n)}
                        className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${painScore === n ? (n <= 3 ? 'bg-green-500 text-white' : n <= 6 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white') : 'bg-muted text-muted-foreground'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 ${painScore <= 3 ? 'border-green-400 text-green-600 bg-green-50' : painScore <= 6 ? 'border-amber-400 text-amber-600 bg-amber-50' : 'border-red-400 text-red-600 bg-red-50'}`}>
                    {painScore}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── 5. التقييم الفيزيائي ── */}
      <Card className="border-purple-200">
        <CardHeader className="pb-3"><SectionHeader num="5" title="التقييم الفيزيائي — العلاج الطبيعي" color="bg-purple-600" textColor="text-purple-700" badge="أخصائي العلاج الطبيعي" /></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">مدى حركة المفصل ROM</Label>
              <Input placeholder="مثال: Knee flexion 90°" value={jointRom} onChange={e => setJointRom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">اختبار العضلات</Label>
              <Input placeholder="مثال: Quadriceps 3/5" value={muscleTest} onChange={e => setMuscleTest(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">قوة العضلات (0-5)</Label>
              <Input type="number" placeholder="0-5" min={0} max={5} value={musclePower} onChange={e => setMusclePower(e.target.value)} />
            </div>
          </div>
          <YesNo label="ROM مقيّد" value={romRestricted} onChange={setRomRestricted} />
          <YesNo label="التوازن طبيعي" value={balance} onChange={setBalance} />
        </CardContent>
      </Card>

      {/* ── 6. FIM ── */}
      <Card className="border-teal-200">
        <CardHeader className="pb-3"><SectionHeader num="6" title="تقييم الاستقلالية الوظيفية (FIM)" color="bg-teal-600" textColor="text-teal-700" /></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">قيّم مستوى استقلالية المستفيد في كل نشاط (6 مستويات)</p>
          {[
            { key: 'fimBedChair',       label: 'الانتقال: السرير ↔ الكرسي', val: fimBedChair,       set: setFimBedChair },
            { key: 'fimToilet',         label: 'الانتقال: المرحاض',          val: fimToilet,         set: setFimToilet },
            { key: 'fimTubShower',      label: 'الانتقال: الحمام',           val: fimTubShower,      set: setFimTubShower },
            { key: 'fimWalkWheelchair', label: 'الحركة: المشي / الكرسي',     val: fimWalkWheelchair, set: setFimWalkWheelchair },
            { key: 'fimStairs',         label: 'الحركة: السلالم',            val: fimStairs,         set: setFimStairs },
          ].map(item => (
            <div key={item.key} className="space-y-1.5">
              <Label className="text-sm">{item.label}</Label>
              <div className="flex flex-wrap gap-2">
                {FIM_SCALE.map(scale => (
                  <label key={scale} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs cursor-pointer transition-all ${item.val === scale ? 'border-teal-500 bg-teal-50 text-teal-700 font-medium' : 'border-border hover:border-teal-300'}`}>
                    <input type="radio" checked={item.val === scale} onChange={() => item.set(scale)} className="accent-teal-600 w-3 h-3" />
                    {scale}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── 7. التثقيف الصحي ── */}
      <Card className="border-orange-200">
        <CardHeader className="pb-3"><SectionHeader num="7" title="التثقيف الصحي للمريض والأسرة" color="bg-orange-500" textColor="text-orange-700" /></CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: 'تم توجيه المريض/الأسرة حول البتر وتأثيراته',                          val: eduAmputation,          set: setEduAmputation },
            { label: 'تم التثقيف حول الوقاية من العدوى (غسل اليدين، العناية بالجذع)',        val: eduInfectionPrevention, set: setEduInfectionPrevention },
            { label: 'تلقى المريض/الأسرة إرشادات غذائية وتغذوية',                           val: eduDiet,                set: setEduDiet },
            { label: 'تم التثقيف حول أهمية العلاج الطبيعي وإعادة التأهيل',                 val: eduPhysiotherapy,       set: setEduPhysiotherapy },
            { label: 'تم تدريب المريض/الأسرة على تقنيات الحركة الآمنة والانتقال',           val: eduMobilityTransfer,    set: setEduMobilityTransfer },
            { label: 'المريض/الأسرة بحاجة لجلسات تثقيفية إضافية',                           val: eduNeedMore,            set: setEduNeedMore },
          ].map(item => (
            <YesNo key={item.label} label={item.label} value={item.val} onChange={item.set} />
          ))}
          {eduNeedMore && (
            <div className="space-y-1.5">
              <Label className="text-sm">الموضوعات التي تحتاج مزيداً من التثقيف</Label>
              <Input placeholder="مثال: العناية بالجذع، التغذية..." value={eduTopicsNeeded} onChange={e => setEduTopicsNeeded(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 8. GAD-7 ── */}
      <Card className="border-pink-200">
        <CardHeader className="pb-3"><SectionHeader num="8" title="مقياس اضطراب القلق العام GAD-7" color="bg-pink-600" textColor="text-pink-700" badge="مقدم الدعم النفسي" /></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">قيّم مدى انزعاج المريض من كل مشكلة خلال الأسبوعين الماضيين</p>
          {GAD_QUESTIONS.map((q, i) => (
            <div key={i} className="space-y-2">
              <Label className="text-sm">{q}</Label>
              <div className="flex flex-wrap gap-2">
                {GAD_SCALE.map((scale, val) => (
                  <label key={val} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs cursor-pointer transition-all ${gadAnswers[i] === val ? 'border-pink-500 bg-pink-50 text-pink-700 font-medium' : 'border-border hover:border-pink-300'}`}>
                    <input type="radio" checked={gadAnswers[i] === val} className="accent-pink-600 w-3 h-3"
                      onChange={() => {}}
                      onClick={() => setGadAnswers(prev => { const n=[...prev]; n[i]=val; return n; })} />
                    {scale}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {gadFilled > 0 && (
            <div className={`p-3 rounded-xl border-2 text-center ${gadTotal <= 4 ? 'border-green-400 bg-green-50' : gadTotal <= 9 ? 'border-amber-400 bg-amber-50' : gadTotal <= 14 ? 'border-orange-400 bg-orange-50' : 'border-red-400 bg-red-50'}`}>
              <p className="text-xs text-muted-foreground">المجموع الكلي ({gadFilled}/7 سؤال)</p>
              <p className="text-2xl font-bold">{gadTotal}</p>
              <p className="text-xs font-medium mt-1">
                {gadTotal <= 4 ? '🟢 قلق خفيف أو لا يوجد' : gadTotal <= 9 ? '🟡 قلق خفيف' : gadTotal <= 14 ? '🟠 قلق متوسط' : '🔴 قلق شديد'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 9. SDQ — CBM فقط ── */}
      {isCBM && (
        <Card className="border-indigo-200">
          <CardHeader className="pb-3"><SectionHeader num="9" title="مقياس نقاط القوة والصعوبات SDQ" color="bg-indigo-600" textColor="text-indigo-700" badge="للأطفال فقط — CBM" /></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">هذا المقياس للأطفال دون 18 سنة — قيّم سلوك الطفل خلال 6 أشهر الماضية</p>
            {SDQ_QUESTIONS.map((q, i) => (
              <div key={i} className="space-y-2">
                <Label className="text-sm">{i + 1}. {q}</Label>
                <div className="flex flex-wrap gap-2">
                  {SDQ_SCALE.map((scale, val) => (
                    <label key={val} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs cursor-pointer transition-all ${sdqAnswers[i] === val ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-border hover:border-indigo-300'}`}>
                      <input type="radio" checked={sdqAnswers[i] === val} className="accent-indigo-600 w-3 h-3"
                        onChange={() => {}}
                        onClick={() => setSdqAnswers(prev => { const n=[...prev]; n[i]=val; return n; })} />
                      {scale}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {sdqAnswers.some(v => v >= 0) && (
              <div className="p-4 rounded-xl border-2 border-indigo-300 bg-indigo-50 space-y-2">
                <p className="text-xs font-semibold text-indigo-700 text-center">نتائج مقياس SDQ</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2 text-center"><p className="text-muted-foreground">المشكلات العاطفية</p><p className="font-bold text-lg">{sdqScores.emotional}</p></div>
                  <div className="bg-white rounded-lg p-2 text-center"><p className="text-muted-foreground">مشكلات السلوك</p><p className="font-bold text-lg">{sdqScores.conduct}</p></div>
                  <div className="bg-white rounded-lg p-2 text-center"><p className="text-muted-foreground">فرط النشاط</p><p className="font-bold text-lg">{sdqScores.hyperact}</p></div>
                  <div className="bg-white rounded-lg p-2 text-center"><p className="text-muted-foreground">مشكلات الأقران</p><p className="font-bold text-lg">{sdqScores.peer}</p></div>
                  <div className="bg-white rounded-lg p-2 text-center col-span-2"><p className="text-muted-foreground">السلوك الاجتماعي الإيجابي</p><p className="font-bold text-lg">{sdqScores.prosocial}</p></div>
                </div>
                <div className="text-center border-t border-indigo-200 pt-2">
                  <p className="text-xs text-muted-foreground">المجموع الكلي</p>
                  <p className="text-2xl font-bold text-indigo-700">{sdqScores.total}</p>
                  <p className="text-xs font-medium text-indigo-600 mt-1">{sdqScores.category}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── قسم الإعاقة — CBM فقط ── */}
      {isCBM && (
        <Card className="border-gray-200">
          <CardHeader className="pb-3"><SectionHeader num="10" title="الإعاقة والإصابات" color="bg-gray-600" textColor="text-gray-700" badge="CBM فقط" /></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">هل يعاني المستفيد من أي نوع من الإعاقة؟</Label>
              <div className="flex gap-3">
                {['yes','no'].map(v => (
                  <label key={v} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm cursor-pointer transition-all ${hasDisabilityAssess === v ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
                    <input type="radio" checked={hasDisabilityAssess === v} onChange={() => setHasDisabilityAssess(v as 'yes'|'no')} className="accent-primary w-3.5 h-3.5" />
                    {v === 'yes' ? 'نعم' : 'لا'}
                  </label>
                ))}
              </div>
            </div>
            {hasDisabilityAssess === 'yes' && (
              <CheckboxGroup label="طبيعة الإعاقة" options={DISABILITY_TYPES_CBM} value={disabilityType} onChange={setDisabilityType} cols={2} />
            )}
            <div className="space-y-2">
              <Label className="text-sm">هل تعرض المستفيد لإصابة جسدية بسبب الأحداث الأخيرة/الحرب؟</Label>
              <div className="flex flex-col gap-2">
                {INJURY_RECENT.map(opt => (
                  <label key={opt} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all ${injuryRecent === opt ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
                    <input type="radio" checked={injuryRecent === opt} onChange={() => setInjuryRecent(opt)} className="accent-primary w-3.5 h-3.5" />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">هل يعاني المستفيد من بتر في أحد الأطراف؟</Label>
              <div className="flex gap-3">
                {['yes','no'].map(v => (
                  <label key={v} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm cursor-pointer transition-all ${hasAmputation === v ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
                    <input type="radio" checked={hasAmputation === v} onChange={() => setHasAmputation(v as 'yes'|'no')} className="accent-primary w-3.5 h-3.5" />
                    {v === 'yes' ? 'نعم' : 'لا'}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── المخرجات وخطة التدخل ── */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num={isCBM ? '11' : '9'} title="المخرجات وخطة التدخل" /></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">المشاكل الرئيسية</Label>
            <Textarea placeholder="اذكر أبرز المشاكل التي يعاني منها المستفيد..." rows={3} value={majorProblems} onChange={e => setMajorProblems(e.target.value)} />
          </div>
          <CheckboxGroup label="الخدمات المطلوبة" options={SERVICES_REQUIRED} value={servicesRequired} onChange={setServicesRequired} cols={2} other={servicesOther} onOtherChange={setServicesOther} />
          {servicesRequired.includes('Referral') && (
            <div className="space-y-1.5">
              <Label className="text-sm">تفاصيل الإحالة</Label>
              <Input placeholder="جهة الإحالة وسببها..." value={servicesReferral} onChange={e => setServicesReferral(e.target.value)} />
            </div>
          )}
          <CheckboxGroup label="الأهداف قصيرة المدى" options={SHORT_TERM_GOALS} value={shortTermGoals} onChange={setShortTermGoals} cols={2} />
          <CheckboxGroup label="الأهداف طويلة المدى" options={LONG_TERM_GOALS} value={longTermGoals} onChange={setLongTermGoals} cols={1} />
          <CheckboxGroup label="خطة العلاج" options={TREATMENT_PLAN} value={planOfTreatment} onChange={setPlanOfTreatment} cols={2} />

          {/* CBM: تحسن PHISP + PSS منفصلان */}
          {isCBM && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">التحسن منذ الزيارة الأخيرة — علاج طبيعي (PHISP)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {IMPROVEMENT_STATUS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all ${improvementSinceLast === opt ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
                      <input type="radio" checked={improvementSinceLast === opt} onChange={() => setImprovementSinceLast(opt)} className="accent-primary w-3.5 h-3.5" />
                      {opt}
                    </label>
                  ))}
                </div>
                {improvementSinceLast === 'Discharge' && (
                  <div className="space-y-1.5 mt-2">
                    <Label className="text-sm">تاريخ الخروج (PHISP)</Label>
                    <Input type="date" value={dischargeDatePhisp} onChange={e => setDischargeDatePhisp(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">التحسن منذ الزيارة الأخيرة — نفسي (PSS)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {IMPROVEMENT_STATUS.map(opt => (
                    <label key={opt} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all ${improvementSinceLastPss === opt ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
                      <input type="radio" checked={improvementSinceLastPss === opt} onChange={() => setImprovementSinceLastPss(opt)} className="accent-primary w-3.5 h-3.5" />
                      {opt}
                    </label>
                  ))}
                </div>
                {improvementSinceLastPss === 'Discharge' && (
                  <div className="space-y-1.5 mt-2">
                    <Label className="text-sm">تاريخ الخروج (PSS)</Label>
                    <Input type="date" value={dischargeDatePss} onChange={e => setDischargeDatePss(e.target.value)} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Church: تحسن واحد فقط */}
          {!isCBM && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">التحسن منذ الزيارة الأخيرة</Label>
              <div className="grid grid-cols-3 gap-2">
                {IMPROVEMENT_STATUS_CHURCH.map(opt => (
                  <label key={opt} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all ${improvementChurch === opt ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
                    <input type="radio" checked={improvementChurch === opt} onChange={() => setImprovementChurch(opt)} className="accent-primary w-3.5 h-3.5" />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">ملاحظات ختامية</Label>
            <Textarea placeholder="أي ملاحظات إضافية..." rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* توقيع الفريق */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">توقيع الفريق (من شارك في التقييم)</Label>
            <div className="flex flex-wrap gap-2">
              {sigOptions.map(s => {
                const selected = isCBM ? signature.includes(s) : signatureChurch.includes(s);
                return (
                  <label key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-xs cursor-pointer transition-all ${selected ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-border hover:border-primary/40'}`}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => {
                        if (isCBM) setSignature(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                        else setSignatureChurch(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
                      }}
                    />
                    {s}
                  </label>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* أزرار الحفظ */}
      <div className="flex gap-3 justify-end pb-8">
        <Button type="button" variant="outline" onClick={() => setLocation(`/beneficiary/${beneficiaryId}`)}>إلغاء</Button>
        <Button type="button" onClick={handleSubmit} className="gap-2 min-w-32">
          <ClipboardList className="w-4 h-4" />حفظ التقييم
        </Button>
      </div>
    </div>
  );
}
