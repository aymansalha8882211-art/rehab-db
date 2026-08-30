import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/dataContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardPlus, Lock } from 'lucide-react';
import {
  GAZA_AREAS, SESSION_NUMBERS, SESSION_DURATIONS,
  NEEDED_DEVICES, PHYSIO_INTERVENTIONS, PHYSIO_MODALITIES,
  PSYCH_STATES, TRAUMA_LEVELS, PSYCH_INTERVENTIONS,
  FAMILY_GUIDANCE_TOPICS, FUNCTIONAL_STATUS, SESSION_RESPONSE,
  IMPROVEMENT_TYPES, TOTAL_SESSIONS_PLANNED, CBM_NEXT_SESSION_SERVICES,
  FAMILY_COOPERATION, INJURY_TYPES,
  CBM_SERVICE_TYPES, CHURCH_SERVICE_TYPES,
  AGE_CLASSIFICATIONS, WOUND_STATUS, NURSING_INTERVENTIONS,
  PHYSIO_ASSESSMENT, CHURCH_NEXT_SESSION_SERVICES, Session, getProject, type ProjectDef
} from '@/data/mockData';

// ─── "أخرى" textbox helper ────────────────────────────────────────────────────
function OtherInput({ show, value, onChange, placeholder = 'يرجى التوضيح...' }: {
  show: boolean; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  if (!show) return null;
  return (
    <Input
      className="mt-2 border-amber-300 focus-visible:ring-amber-400"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function CheckboxGroup({ label, note, options, value, onChange, cols = 2, otherValue, onOtherChange, disabledOptions }: {
  label?: string; note?: string; options: readonly string[];
  value: string[]; onChange: (v: string[]) => void; cols?: number;
  otherValue?: string; onOtherChange?: (v: string) => void;
  disabledOptions?: string[];
}) {
  const toggle = (opt: string) => {
    if (disabledOptions?.includes(opt)) return;
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };
  const hasOther = options.includes('أخرى' as any);
  const showOtherInput = hasOther && value.includes('أخرى') && onOtherChange !== undefined;
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {note && <p className="text-xs text-muted-foreground -mt-1">{note}</p>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map(opt => {
          const isDisabled = disabledOptions?.includes(opt);
          return (
            <label key={opt} className={`flex items-start gap-2 cursor-pointer text-sm py-1 leading-tight ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
              <Checkbox checked={value.includes(opt)} onCheckedChange={() => toggle(opt)} className="mt-0.5 flex-shrink-0" disabled={isDisabled} />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
      <OtherInput show={!!showOtherInput} value={otherValue || ''} onChange={onOtherChange || (() => {})} />
    </div>
  );
}

function RadioGrid({ label, options, value, onChange, cols = 2, colorMap, otherValue, onOtherChange }: {
  label?: string; options: readonly string[]; value: string;
  onChange: (v: string) => void; cols?: number; colorMap?: Record<string, string>;
  otherValue?: string; onOtherChange?: (v: string) => void;
}) {
  const hasOther = options.includes('أخرى' as any);
  const showOtherInput = hasOther && value === 'أخرى' && onOtherChange !== undefined;
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map(opt => {
          const active = value === opt;
          const color = colorMap?.[opt] || (active ? 'border-primary bg-primary/5 text-primary font-medium' : '');
          return (
            <label key={opt} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all ${active ? (color || 'border-primary bg-primary/5 text-primary font-medium') : 'border-border hover:border-primary/40'}`}>
              <input type="radio" value={opt} checked={active} onChange={() => onChange(opt)} className="w-3.5 h-3.5 accent-primary" />
              {opt}
            </label>
          );
        })}
      </div>
      <OtherInput show={!!showOtherInput} value={otherValue || ''} onChange={onOtherChange || (() => {})} />
    </div>
  );
}

function SectionHeader({ num, title, color = 'bg-primary', textColor = 'text-primary', badge }: {
  num: string; title: string; color?: string; textColor?: string; badge?: string;
}) {
  return (
    <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${textColor}`}>
      <span className={`w-5 h-5 rounded-full ${color} text-white text-xs flex items-center justify-center font-bold flex-shrink-0`}>{num}</span>
      {title}
      {badge && <Badge variant="outline" className="text-xs ms-auto border-current">{badge}</Badge>}
    </CardTitle>
  );
}

// ─── CBM Schema ───────────────────────────────────────────────────────────────
const cbmSchema = z.object({
  sessionNumber:        z.string().min(1, 'رقم الجلسة مطلوب'),
  serviceDate:          z.string().min(1, 'تاريخ الخدمة مطلوب'),
  serviceArea:          z.string().min(1, 'منطقة الخدمة مطلوبة'),
  exactLocation:        z.string().min(2, 'مكان التنفيذ مطلوب'),
  sessionType:          z.enum(['علاج فردي', 'توجيه أسري']),
  providerName:         z.string().min(1, 'اسم مقدم الخدمة مطلوب'),
  injuryType:           z.string().optional(),
  functionalStatus:     z.string().optional(),
  painLevel:            z.number().min(1).max(10),
  availableDevices:     z.string().optional(),
  traumaLevel:          z.string().optional(),
  psychNotes:           z.string().optional(),
  beneficiaryCount:     z.number().min(1),
  sessionDuration:      z.string().optional(),
  sessionResponse:      z.string().optional(),
  familyCooperation:    z.string().optional(),
  totalSessionsPlanned: z.string().optional(),
  referralMade:         z.boolean(),
  referralDetails:      z.string().optional(),
  photoConsent:         z.boolean(),
  protectionRisks:      z.boolean(),
  gbvDbvReferral:       z.boolean(),
  recommendations:      z.string().optional(),
});

// ─── Church Schema ────────────────────────────────────────────────────────────
const churchSchema = z.object({
  ageClassification:     z.string().optional(),
  serviceDate:           z.string().min(1, 'تاريخ الخدمة مطلوب'),
  serviceArea:           z.string().min(1, 'منطقة الخدمة مطلوبة'),
  exactLocation:         z.string().min(2, 'مكان التنفيذ مطلوب'),
  providerName:          z.string().min(1, 'اسم مقدم الخدمة مطلوب'),
  injuryType:            z.string().optional(),
  painLevel:             z.number().min(1).max(10),
  availableDevices:      z.string().optional(),
  eventDescription:      z.string().optional(),
  traumaLevel:           z.string().optional(),
  psychNotes:            z.string().optional(),
  beneficiaryChallenges: z.string().optional(),
  recommendations:       z.string().optional(),
});

type CbmFormData    = z.infer<typeof cbmSchema>;
type ChurchFormData = z.infer<typeof churchSchema>;

// ─── Helper: قائمة مقدمي الخدمة ──────────────────────────────────────────────
// يجيب الموظفين من قاعدة البيانات حسب المشروع والـ assignedStaff للمدخل
function useProviderList(project: 'CBM' | 'Church', currentUser: any, users: any[]) {
  const assignedStaff: string[] = currentUser?.assignedStaff || [];
  const excludedRoles = ['admin', 'data_entry', 'viewer', 'supervisor'];

  if (assignedStaff.length > 0) {
    // مدخل البيانات عنده قائمة محددة
    return users.filter(u =>
      assignedStaff.includes(u.fullName) &&
      u.status === 'active'
    );
  }

  // بدون قائمة محددة → كل موظفي المشروع
  return users.filter(u =>
    u.projects?.includes(project) &&
    u.status === 'active' &&
    !excludedRoles.includes(u.role)
  );
}

// ─── CBM Form ─────────────────────────────────────────────────────────────────
function CbmForm({ beneficiaryId, prevCount, allowedServiceTypes }: {
  beneficiaryId: string; prevCount: number; allowedServiceTypes: string[];
}) {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { beneficiaries, addSession, users } = useData();
  const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
  const providerList = useProviderList('CBM', currentUser, users);

  const disabledTypes = allowedServiceTypes.length > 0
    ? [...CBM_SERVICE_TYPES].filter(t => !allowedServiceTypes.includes(t))
    : [];

  const [serviceTypes,         setServiceTypes]         = useState<string[]>(() =>
    allowedServiceTypes.length === 1 ? [allowedServiceTypes[0]] : []
  );
  const [neededDevices,        setNeededDevices]        = useState<string[]>([]);
  const [physioInterventions,  setPhysioInterventions]  = useState<string[]>([]);
  const [physioModalities,     setPhysioModalities]     = useState<string[]>([]);
  const [psychState,           setPsychState]           = useState<string[]>([]);
  const [psychInterventions,   setPsychInterventions]   = useState<string[]>([]);
  const [familyGuidanceTopics, setFamilyGuidanceTopics] = useState<string[]>([]);
  const [nextSessionServices,  setNextSessionServices]  = useState<string[]>([]);
  const [improvementTypes,     setImprovementTypes]     = useState<string[]>([]);

  const [otherInjuryType,          setOtherInjuryType]          = useState('');
  const [otherFunctionalStatus,    setOtherFunctionalStatus]    = useState('');
  const [otherNeededDevices,       setOtherNeededDevices]       = useState('');
  const [otherPhysioInterventions, setOtherPhysioInterventions] = useState('');
  const [otherPhysioModalities,    setOtherPhysioModalities]    = useState('');
  const [otherPsychState,          setOtherPsychState]          = useState('');
  const [otherPsychInterventions,  setOtherPsychInterventions]  = useState('');
  const [otherFamilyTopics,        setOtherFamilyTopics]        = useState('');
  const [otherImprovementTypes,    setOtherImprovementTypes]    = useState('');
  const [otherNextServices,        setOtherNextServices]        = useState('');

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<CbmFormData>({
    resolver: zodResolver(cbmSchema),
    defaultValues: {
      sessionNumber: SESSION_NUMBERS[Math.min(prevCount, 5)],
      sessionType: 'علاج فردي', providerName: '',
      injuryType: beneficiary?.injuryType || '',
      painLevel: 5, beneficiaryCount: 1,
      referralMade: false, photoConsent: false,
      protectionRisks: false, gbvDbvReferral: false,
    },
  });

  const watchReferral = watch('referralMade');
  const watchResponse = watch('sessionResponse');
  const canSeePhysio  = allowedServiceTypes.length === 0 || allowedServiceTypes.some(t => ['علاج طبيعي','علاج وظيفي'].includes(t));
  const canSeePsych   = allowedServiceTypes.length === 0 || allowedServiceTypes.includes('دعم نفسي');
  const canSeeFamily  = allowedServiceTypes.length === 0 || allowedServiceTypes.includes('توجيه أسري');
  const showPhysio    = canSeePhysio && (serviceTypes.includes('علاج طبيعي') || serviceTypes.includes('علاج وظيفي'));
  const showPsych     = canSeePsych  && serviceTypes.includes('دعم نفسي');
  const showFamily    = canSeeFamily && serviceTypes.includes('توجيه أسري');

  const Err = ({ msg }: { msg?: string }) => msg ? <p className="text-xs text-destructive mt-1">{msg}</p> : null;
  const resolveOther = (arr: string[], otherText: string) =>
    arr.map(v => v === 'أخرى' && otherText.trim() ? `أخرى: ${otherText.trim()}` : v);

  const onSubmit = async (data: CbmFormData) => {
    if (serviceTypes.length === 0) {
      toast({ title: 'يرجى اختيار نوع الخدمة المقدمة', variant: 'destructive' });
      return;
    }
    if (allowedServiceTypes.length > 0) {
      const unauthorized = serviceTypes.filter(t => !allowedServiceTypes.includes(t));
      if (unauthorized.length > 0) {
        toast({ title: `ليس لديك صلاحية تسجيل: ${unauthorized.join('، ')}`, variant: 'destructive' });
        return;
      }
    }
    const injuryVal = data.injuryType === 'أخرى' && otherInjuryType.trim()
      ? `أخرى: ${otherInjuryType.trim()}` : (data.injuryType || '');
    const funcVal = data.functionalStatus === 'أخرى' && otherFunctionalStatus.trim()
      ? `أخرى: ${otherFunctionalStatus.trim()}` : (data.functionalStatus || '');

    const s: Session = {
      id: 's' + Date.now(), beneficiaryId, formType: 'CBM',
      sessionNumber: data.sessionNumber, serviceTypes,
      serviceDate: data.serviceDate, serviceArea: data.serviceArea as any,
      exactLocation: data.exactLocation, sessionType: data.sessionType,
      providerName: data.providerName, injuryType: injuryVal,
      functionalStatus: funcVal, painLevel: data.painLevel,
      availableDevices: data.availableDevices || '',
      neededDevices: resolveOther(neededDevices, otherNeededDevices),
      physioInterventions: resolveOther(physioInterventions, otherPhysioInterventions),
      physioModalities: resolveOther(physioModalities, otherPhysioModalities),
      psychState: resolveOther(psychState, otherPsychState),
      traumaLevel: data.traumaLevel || '',
      psychInterventions: resolveOther(psychInterventions, otherPsychInterventions),
      psychNotes: data.psychNotes || '',
      familyGuidanceTopics: resolveOther(familyGuidanceTopics, otherFamilyTopics),
      beneficiaryCount: data.beneficiaryCount,
      nextSessionServices: resolveOther(nextSessionServices, otherNextServices),
      sessionDuration: data.sessionDuration || '',
      sessionResponse: data.sessionResponse || '',
      improvementTypes: resolveOther(improvementTypes, otherImprovementTypes),
      familyCooperation: data.familyCooperation || '',
      totalSessionsPlanned: data.totalSessionsPlanned || '',
      referralMade: data.referralMade,
      referralDetails: data.referralDetails || '',
      photoConsent: data.photoConsent,
      protectionRisks: data.protectionRisks,
      gbvDbvReferral: data.gbvDbvReferral,
      recommendations: data.recommendations || '',
      createdBy: currentUser?.id || '', createdAt: new Date().toISOString().split('T')[0],
    };
    await addSession(s);
    toast({ title: 'تم تسجيل الجلسة بنجاح' });
    setLocation(`/beneficiary/${beneficiaryId}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* 1. بيانات الجلسة */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="1" title="بيانات الجلسة" /></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">رقم الجلسة المنفذة *</Label>
            <Controller control={control} name="sessionNumber" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="اختر رقم الجلسة" /></SelectTrigger>
                <SelectContent>{SESSION_NUMBERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            <Err msg={errors.sessionNumber?.message} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">تاريخ تقديم الخدمة *</Label>
            <Input type="date" {...register('serviceDate')} />
            <Err msg={errors.serviceDate?.message} />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label className="text-sm">
              نوع الخدمة المقدمة *
              <span className="text-muted-foreground font-normal"> (يمكن تحديد أكثر من خيار)</span>
              {allowedServiceTypes.length > 0 && (
                <span className="ms-2 text-xs text-amber-600 font-normal">— مقيّد بصلاحياتك</span>
              )}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CBM_SERVICE_TYPES.map(type => {
                const isDisabled = disabledTypes.includes(type);
                return (
                  <label key={type} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${isDisabled ? 'opacity-40 cursor-not-allowed border-border' : 'cursor-pointer ' + (serviceTypes.includes(type) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40')}`}>
                    <Checkbox checked={serviceTypes.includes(type)} disabled={isDisabled}
                      onCheckedChange={() => { if (isDisabled) return; setServiceTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]); }} />
                    {type}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">منطقة تقديم الخدمة *</Label>
            <Controller control={control} name="serviceArea" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                <SelectContent>{GAZA_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            <Err msg={errors.serviceArea?.message} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">نوع الجلسة *</Label>
            <Controller control={control} name="sessionType" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="علاج فردي">علاج فردي</SelectItem>
                  <SelectItem value="توجيه أسري">توجيه أسري</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-sm">مكان التنفيذ بالتحديد *</Label>
            <Input placeholder="مثال: عيادة مخيم خانيونس — خيمة المستفيد رقم 14" {...register('exactLocation')} />
            <Err msg={errors.exactLocation?.message} />
          </div>

          {/* ── اسم مقدم الخدمة — من قاعدة البيانات ── */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-sm">اسم مقدم الخدمة *</Label>
            <Controller control={control} name="providerName" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="اختر اسم مقدم الخدمة" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {providerList.length > 0
                    ? providerList.map(u => (
                        <SelectItem key={u.id} value={u.fullName}>
                          <div className="flex items-center gap-2">
                            <span>{u.fullName}</span>
                          </div>
                        </SelectItem>
                      ))
                    : <SelectItem value="__none__" disabled>لا يوجد موظفون متاحون</SelectItem>
                  }
                </SelectContent>
              </Select>
            )} />
            <Err msg={errors.providerName?.message} />
          </div>
        </CardContent>
      </Card>

      {/* 2. نوع الإصابة والوضع الحالي */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="2" title="نوع الإصابة والوضع الحالي" /></CardHeader>
        <CardContent className="space-y-5">
          <Controller control={control} name="injuryType" render={({ field }) => (
            <RadioGrid label="نوع الإصابة (المشكلة الرئيسية)" options={INJURY_TYPES} value={field.value || ''} onChange={field.onChange} cols={3} otherValue={otherInjuryType} onOtherChange={setOtherInjuryType} />
          )} />
          <Controller control={control} name="functionalStatus" render={({ field }) => (
            <RadioGrid label="الوضع الوظيفي / النفسي الحالي" options={FUNCTIONAL_STATUS} value={field.value || ''} onChange={field.onChange} cols={3} otherValue={otherFunctionalStatus} onOtherChange={setOtherFunctionalStatus} />
          )} />
          <div className="space-y-2">
            <Label className="text-sm">مستوى الألم * <span className="text-muted-foreground font-normal">(1 = لا ألم ← 10 = ألم شديد)</span></Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex gap-1.5 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} type="button" onClick={() => setValue('painLevel', n)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${watch('painLevel') === n ? (n <= 3 ? 'bg-green-500 text-white' : n <= 6 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white') : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 ${watch('painLevel') <= 3 ? 'border-green-400 text-green-600 bg-green-50' : watch('painLevel') <= 6 ? 'border-amber-400 text-amber-600 bg-amber-50' : 'border-red-400 text-red-600 bg-red-50'}`}>
                {watch('painLevel')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. الأدوات المساعدة */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="3" title="الأدوات المساعدة" /></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">توفر أدوات مساعدة صالحة</Label>
            <Input placeholder="اذكر الأدوات المتوفرة أو: لا يوجد" {...register('availableDevices')} />
          </div>
          <CheckboxGroup label="الأداة المساعدة التي يحتاجها المصاب" options={NEEDED_DEVICES} value={neededDevices} onChange={setNeededDevices} cols={2} otherValue={otherNeededDevices} onOtherChange={setOtherNeededDevices} />
        </CardContent>
      </Card>

      {showPhysio && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3"><SectionHeader num="4" title="تدخلات العلاج الطبيعي والوظيفي" color="bg-blue-600" textColor="text-blue-700" /></CardHeader>
          <CardContent className="space-y-5">
            <CheckboxGroup label="التدخل المنفذ خلال الجلسة" options={PHYSIO_INTERVENTIONS} value={physioInterventions} onChange={setPhysioInterventions} cols={2} otherValue={otherPhysioInterventions} onOtherChange={setOtherPhysioInterventions} />
            <hr className="border-border" />
            <CheckboxGroup label="وسائل العلاج الفيزيائي" options={PHYSIO_MODALITIES} value={physioModalities} onChange={setPhysioModalities} cols={2} otherValue={otherPhysioModalities} onOtherChange={setOtherPhysioModalities} />
          </CardContent>
        </Card>
      )}

      {showPsych && (
        <Card className="border-purple-200">
          <CardHeader className="pb-3"><SectionHeader num="5" title="الدعم النفسي" color="bg-purple-600" textColor="text-purple-700" badge="لمقدم الدعم النفسي فقط" /></CardHeader>
          <CardContent className="space-y-5">
            <CheckboxGroup label="وصف الحالة النفسية الحالية" options={PSYCH_STATES} value={psychState} onChange={setPsychState} cols={2} otherValue={otherPsychState} onOtherChange={setOtherPsychState} />
            <hr className="border-border" />
            <div className="space-y-2">
              <Label className="text-sm">تقييم مستوى الصدمة</Label>
              <Controller control={control} name="traumaLevel" render={({ field }) => (
                <div className="flex gap-3">
                  {TRAUMA_LEVELS.map(level => {
                    const colors: Record<string, string> = { 'خفيفة': 'border-green-400 bg-green-50 text-green-700', 'متوسطة': 'border-amber-400 bg-amber-50 text-amber-700', 'شديدة': 'border-red-400 bg-red-50 text-red-700' };
                    return (
                      <label key={level} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer text-sm font-semibold transition-all ${field.value === level ? colors[level] : 'border-border hover:bg-muted/50'}`}>
                        <input type="radio" value={level} checked={field.value === level} onChange={() => field.onChange(level)} className="sr-only" />
                        {level}
                      </label>
                    );
                  })}
                </div>
              )} />
            </div>
            <hr className="border-border" />
            <CheckboxGroup label="التدخل النفسي المقدم" options={PSYCH_INTERVENTIONS} value={psychInterventions} onChange={setPsychInterventions} cols={2} otherValue={otherPsychInterventions} onOtherChange={setOtherPsychInterventions} />
            <div className="space-y-1.5">
              <Label className="text-sm">ملاحظات خاصة / تقييم مختصر</Label>
              <Textarea placeholder="سلوك المصاب – استجابة الأسرة – وجود خطر نفسي" {...register('psychNotes')} rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {showFamily && (
        <Card className="border-teal-200">
          <CardHeader className="pb-3"><SectionHeader num="6" title="التوجيه الأسري" color="bg-teal-600" textColor="text-teal-700" badge="في حال تم تقديمه" /></CardHeader>
          <CardContent>
            <CheckboxGroup label="موضوع جلسة التوجيه الأسري" options={FAMILY_GUIDANCE_TOPICS} value={familyGuidanceTopics} onChange={setFamilyGuidanceTopics} cols={2} otherValue={otherFamilyTopics} onOtherChange={setOtherFamilyTopics} />
          </CardContent>
        </Card>
      )}

      {/* 7. مخرجات الجلسة */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="7" title="مخرجات الجلسة" /></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">عدد المستفيدين *</Label>
              <p className="text-xs text-muted-foreground -mt-1">إذا كان فرداً اكتب 1</p>
              <Input type="number" min="1" {...register('beneficiaryCount', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">المدة الزمنية</Label>
              <Controller control={control} name="sessionDuration" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="اختر المدة" /></SelectTrigger>
                  <SelectContent>{SESSION_DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <Controller control={control} name="sessionResponse" render={({ field }) => (
            <RadioGrid label="استجابة الحالة للجلسة" options={SESSION_RESPONSE} value={field.value || ''} onChange={field.onChange} cols={4}
              colorMap={{ 'تحسن ملحوظ': 'border-green-400 text-green-700 bg-green-50', 'تحسن بسيط': 'border-blue-400 text-blue-700 bg-blue-50', 'بدون تحسن': 'border-amber-400 text-amber-700 bg-amber-50', 'تدهور': 'border-red-400 text-red-700 bg-red-50' }}
            />
          )} />
          {watchResponse && watchResponse !== 'بدون تحسن' && watchResponse !== 'تدهور' && (
            <CheckboxGroup label="إذا حدث تحسن — نوع التحسن" options={IMPROVEMENT_TYPES} value={improvementTypes} onChange={setImprovementTypes} cols={3} otherValue={otherImprovementTypes} onOtherChange={setOtherImprovementTypes} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">استجابة الأسرة وتعاونها</Label>
              <Controller control={control} name="familyCooperation" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{FAMILY_COOPERATION.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">عدد الجلسات المخططة</Label>
              <Controller control={control} name="totalSessionsPlanned" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{TOTAL_SESSIONS_PLANNED.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <CheckboxGroup label="نوع الخدمة في الجلسات القادمة" options={CBM_NEXT_SESSION_SERVICES} value={nextSessionServices} onChange={setNextSessionServices} cols={2} otherValue={otherNextServices} onOtherChange={setOtherNextServices} />
        </CardContent>
      </Card>

      {/* 8. الإحالة */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="8" title="الإحالة" /></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <Controller control={control} name="referralMade" render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <div>
              <Label className="text-sm font-medium">هل تمت إحالة المصاب إلى جهة خارجية أو داخلية؟</Label>
              <p className="text-xs text-muted-foreground">(خارج جذور أو داخلها)</p>
            </div>
          </div>
          {watchReferral && (
            <div className="space-y-1.5">
              <Label className="text-sm">تفاصيل الإحالة</Label>
              <Textarea placeholder="نوع الجهة / سبب الإحالة / حالة الإحالة" {...register('referralDetails')} rows={2} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 9. الحماية والتوثيق */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="9" title="الحماية والتوثيق" /></CardHeader>
        <CardContent className="space-y-3">
          {[
            { name: 'photoConsent'    as const, label: 'هل تمت الموافقة على التصوير؟', desc: '' },
            { name: 'protectionRisks' as const, label: 'هل ظهرت مخاطر حماية؟',         desc: '' },
            { name: 'gbvDbvReferral'  as const, label: 'هل أُحيلت حالة GBV / DBV؟',    desc: 'العنف المبني على النوع الاجتماعي + العنف المبني على الإعاقة' },
          ].map(item => (
            <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
              <Controller control={control} name={item.name} render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )} />
              <div>
                <Label className="text-sm font-medium">{item.label}</Label>
                {item.desc && <p className="text-xs text-muted-foreground">{item.desc}</p>}
              </div>
            </div>
          ))}
          <div className="space-y-1.5 pt-1">
            <Label className="text-sm">أهم التوصيات لتحسين العمل</Label>
            <Textarea placeholder="توصياتك وملاحظاتك الختامية..." {...register('recommendations')} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end pb-8">
        <Button type="button" variant="outline" onClick={() => setLocation(`/beneficiary/${beneficiaryId}`)}>إلغاء</Button>
        <Button type="submit" className="gap-2 min-w-32"><ClipboardPlus className="w-4 h-4" />حفظ الجلسة</Button>
      </div>
    </form>
  );
}

// ─── Church Form ──────────────────────────────────────────────────────────────
function ChurchForm({ beneficiaryId, allowedServiceTypes }: {
  beneficiaryId: string; allowedServiceTypes: string[];
}) {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { beneficiaries, addSession, users } = useData();
  const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
  const providerList = useProviderList('Church', currentUser, users);

  const disabledTypes = allowedServiceTypes.length > 0
    ? [...CHURCH_SERVICE_TYPES].filter(t => !allowedServiceTypes.includes(t))
    : [];

  const [serviceTypes,        setServiceTypes]        = useState<string[]>(() =>
    allowedServiceTypes.length === 1 ? [allowedServiceTypes[0]] : []
  );
  const [neededDevices,       setNeededDevices]       = useState<string[]>([]);
  const [woundStatus,         setWoundStatus]         = useState<string[]>([]);
  const [nursingInterventions,setNursingInterventions]= useState<string[]>([]);
  const [physioAssessment,    setPhysioAssessment]    = useState<string[]>([]);
  const [physioInterventions, setPhysioInterventions] = useState<string[]>([]);
  const [physioModalities,    setPhysioModalities]    = useState<string[]>([]);
  const [psychState,          setPsychState]          = useState<string[]>([]);
  const [psychInterventions,  setPsychInterventions]  = useState<string[]>([]);
  const [nextSessionServices, setNextSessionServices] = useState<string[]>([]);

  const [otherNeededDevices,        setOtherNeededDevices]        = useState('');
  const [otherWoundStatus,          setOtherWoundStatus]          = useState('');
  const [otherNursingInterventions, setOtherNursingInterventions] = useState('');
  const [otherPhysioAssessment,     setOtherPhysioAssessment]     = useState('');
  const [otherPhysioInterventions,  setOtherPhysioInterventions]  = useState('');
  const [otherPhysioModalities,     setOtherPhysioModalities]     = useState('');
  const [otherPsychState,           setOtherPsychState]           = useState('');
  const [otherPsychInterventions,   setOtherPsychInterventions]   = useState('');
  const [otherNextServices,         setOtherNextServices]         = useState('');

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<ChurchFormData>({
    resolver: zodResolver(churchSchema),
    defaultValues: { providerName: '', injuryType: beneficiary?.injuryType || '', painLevel: 5 },
  });

  const canSeeNursing = allowedServiceTypes.length === 0 || allowedServiceTypes.includes('تمريض');
  const canSeePhysio  = allowedServiceTypes.length === 0 || allowedServiceTypes.some(t => ['علاج طبيعي','علاج وظيفي'].includes(t));
  const canSeePsych   = allowedServiceTypes.length === 0 || allowedServiceTypes.includes('دعم نفسي');
  const showNursing   = canSeeNursing && serviceTypes.includes('تمريض');
  const showPhysio    = canSeePhysio  && serviceTypes.includes('علاج طبيعي');
  const showPsych     = canSeePsych   && serviceTypes.includes('دعم نفسي');
  const Err = ({ msg }: { msg?: string }) => msg ? <p className="text-xs text-destructive mt-1">{msg}</p> : null;
  const resolveOther = (arr: string[], otherText: string) =>
    arr.map(v => v === 'أخرى' && otherText.trim() ? `أخرى: ${otherText.trim()}` : v);

  const onSubmit = async (data: ChurchFormData) => {
    if (serviceTypes.length === 0) {
      toast({ title: 'يرجى اختيار نوع الخدمة المقدمة', variant: 'destructive' });
      return;
    }
    if (allowedServiceTypes.length > 0) {
      const unauthorized = serviceTypes.filter(t => !allowedServiceTypes.includes(t));
      if (unauthorized.length > 0) {
        toast({ title: `ليس لديك صلاحية تسجيل: ${unauthorized.join('، ')}`, variant: 'destructive' });
        return;
      }
    }
    const s: Session = {
      id: 's' + Date.now(), beneficiaryId, formType: 'Church',
      serviceTypes, serviceDate: data.serviceDate,
      serviceArea: data.serviceArea as any, exactLocation: data.exactLocation,
      providerName: data.providerName, injuryType: data.injuryType || '',
      painLevel: data.painLevel, availableDevices: data.availableDevices || '',
      ageClassification: data.ageClassification || '',
      neededDevices:        resolveOther(neededDevices, otherNeededDevices),
      woundStatus:          resolveOther(woundStatus, otherWoundStatus),
      nursingInterventions: resolveOther(nursingInterventions, otherNursingInterventions),
      physioAssessment:     resolveOther(physioAssessment, otherPhysioAssessment),
      physioInterventions:  resolveOther(physioInterventions, otherPhysioInterventions),
      physioModalities:     resolveOther(physioModalities, otherPhysioModalities),
      psychState:           resolveOther(psychState, otherPsychState),
      traumaLevel: data.traumaLevel || '',
      psychInterventions:   resolveOther(psychInterventions, otherPsychInterventions),
      psychNotes: data.psychNotes || '',
      eventDescription: data.eventDescription || '',
      beneficiaryChallenges: data.beneficiaryChallenges || '',
      nextSessionServices: resolveOther(nextSessionServices, otherNextServices),
      recommendations: data.recommendations || '',
      createdBy: currentUser?.id || '', createdAt: new Date().toISOString().split('T')[0],
    };
    await addSession(s);
    toast({ title: 'تم تسجيل الجلسة بنجاح' });
    setLocation(`/beneficiary/${beneficiaryId}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* 1. بيانات الجلسة */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="1" title="بيانات الجلسة" /></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm">رقم هوية المصاب</Label>
            <Input value={beneficiary?.nationalId || ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">الجنس</Label>
            <Input value={beneficiary ? (beneficiary.gender === 'male' ? 'ذكر' : 'أنثى') : ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">تصنيف العمر</Label>
            <Controller control={control} name="ageClassification" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{AGE_CLASSIFICATIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">تاريخ تقديم الخدمة *</Label>
            <Input type="date" {...register('serviceDate')} />
            <Err msg={errors.serviceDate?.message} />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label className="text-sm">
              نوع الخدمة المقدمة *
              {allowedServiceTypes.length > 0 && (
                <span className="ms-2 text-xs text-amber-600 font-normal">— مقيّد بصلاحياتك</span>
              )}
            </Label>
            <div className="flex gap-3 flex-wrap">
              {CHURCH_SERVICE_TYPES.map(type => {
                const isDisabled = disabledTypes.includes(type);
                return (
                  <label key={type} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${isDisabled ? 'opacity-40 cursor-not-allowed border-border' : 'cursor-pointer ' + (serviceTypes.includes(type) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40')}`}>
                    <Checkbox checked={serviceTypes.includes(type)} disabled={isDisabled}
                      onCheckedChange={() => { if (isDisabled) return; setServiceTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]); }} />
                    {type}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">منطقة تقديم الخدمة *</Label>
            <Controller control={control} name="serviceArea" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                <SelectContent>{GAZA_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            <Err msg={errors.serviceArea?.message} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">مكان التنفيذ بالتحديد *</Label>
            <Input placeholder="المخيم / العيادة / النقطة / عنوان الخيمة" {...register('exactLocation')} />
            <Err msg={errors.exactLocation?.message} />
          </div>

          {/* ── اسم مقدم الخدمة — من قاعدة البيانات ── */}
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-sm">اسم مقدم الخدمة *</Label>
            <Controller control={control} name="providerName" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="اختر اسم مقدم الخدمة" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {providerList.length > 0
                    ? providerList.map(u => (
                        <SelectItem key={u.id} value={u.fullName}>
                          {u.fullName}
                        </SelectItem>
                      ))
                    : <SelectItem value="__none__" disabled>لا يوجد موظفون متاحون</SelectItem>
                  }
                </SelectContent>
              </Select>
            )} />
            <Err msg={errors.providerName?.message} />
          </div>
        </CardContent>
      </Card>

      {/* 2. تقييم الحالة */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="2" title="تقييم الحالة" /></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm">مستوى الألم * <span className="text-muted-foreground font-normal">(1 = لا ألم ← 10 = ألم شديد)</span></Label>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex gap-1.5 flex-wrap">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} type="button" onClick={() => setValue('painLevel', n)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${watch('painLevel') === n ? (n <= 3 ? 'bg-green-500 text-white' : n <= 6 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white') : 'bg-muted text-muted-foreground'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 ${watch('painLevel') <= 3 ? 'border-green-400 text-green-600 bg-green-50' : watch('painLevel') <= 6 ? 'border-amber-400 text-amber-600 bg-amber-50' : 'border-red-400 text-red-600 bg-red-50'}`}>
                {watch('painLevel')}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">توفر أدوات مساعدة</Label>
            <Input placeholder="اذكر الأدوات المتوفرة أو: لا يوجد" {...register('availableDevices')} />
          </div>
          <CheckboxGroup label="الأداة المساعدة التي يحتاجها المصاب" options={NEEDED_DEVICES} value={neededDevices} onChange={setNeededDevices} cols={2} otherValue={otherNeededDevices} onOtherChange={setOtherNeededDevices} />
        </CardContent>
      </Card>

      {showNursing && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3"><SectionHeader num="3" title="التمريض" color="bg-orange-500" textColor="text-orange-700" badge="يجيب عنه التمريض فقط" /></CardHeader>
          <CardContent className="space-y-5">
            <CheckboxGroup label="حالة الجرح" options={WOUND_STATUS} value={woundStatus} onChange={setWoundStatus} cols={2} otherValue={otherWoundStatus} onOtherChange={setOtherWoundStatus} />
            <hr className="border-border" />
            <CheckboxGroup label="التدخل التمريضي المطلوب" options={NURSING_INTERVENTIONS} value={nursingInterventions} onChange={setNursingInterventions} cols={2} otherValue={otherNursingInterventions} onOtherChange={setOtherNursingInterventions} />
          </CardContent>
        </Card>
      )}

      {showPhysio && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3"><SectionHeader num="4" title="العلاج الطبيعي" color="bg-blue-600" textColor="text-blue-700" badge="يجيب عنه أخصائي العلاج الطبيعي فقط" /></CardHeader>
          <CardContent className="space-y-5">
            <CheckboxGroup label="تقييم الحالة فيزيائياً" options={PHYSIO_ASSESSMENT} value={physioAssessment} onChange={setPhysioAssessment} cols={2} otherValue={otherPhysioAssessment} onOtherChange={setOtherPhysioAssessment} />
            <hr className="border-border" />
            <CheckboxGroup label="خطة العلاج الطبيعي" options={PHYSIO_INTERVENTIONS} value={physioInterventions} onChange={setPhysioInterventions} cols={2} otherValue={otherPhysioInterventions} onOtherChange={setOtherPhysioInterventions} />
            <hr className="border-border" />
            <CheckboxGroup label="وسائل العلاج الفيزيائي" options={PHYSIO_MODALITIES} value={physioModalities} onChange={setPhysioModalities} cols={2} otherValue={otherPhysioModalities} onOtherChange={setOtherPhysioModalities} />
          </CardContent>
        </Card>
      )}

      {showPsych && (
        <Card className="border-purple-200">
          <CardHeader className="pb-3"><SectionHeader num="5" title="الدعم النفسي" color="bg-purple-600" textColor="text-purple-700" badge="يجيب عنه مقدم الدعم النفسي فقط" /></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm">وصف مختصر بالحدث</Label>
              <p className="text-xs text-muted-foreground -mt-1">ملخص لما حدث وقت الإصابة، تسلسل الأحداث</p>
              <Textarea placeholder="اكتب ملخصاً للحدث..." {...register('eventDescription')} rows={3} />
            </div>
            <hr className="border-border" />
            <CheckboxGroup label="ردود الفعل النفسية الأولية" options={PSYCH_STATES} value={psychState} onChange={setPsychState} cols={2} otherValue={otherPsychState} onOtherChange={setOtherPsychState} />
            <hr className="border-border" />
            <CheckboxGroup label="التدخل النفسي المقدم" options={PSYCH_INTERVENTIONS} value={psychInterventions} onChange={setPsychInterventions} cols={2} otherValue={otherPsychInterventions} onOtherChange={setOtherPsychInterventions} />
            <hr className="border-border" />
            <div className="space-y-2">
              <Label className="text-sm">تقييم مستوى الصدمة</Label>
              <Controller control={control} name="traumaLevel" render={({ field }) => (
                <div className="flex gap-3">
                  {TRAUMA_LEVELS.map(level => {
                    const colors: Record<string, string> = { 'خفيفة': 'border-green-400 bg-green-50 text-green-700', 'متوسطة': 'border-amber-400 bg-amber-50 text-amber-700', 'شديدة': 'border-red-400 bg-red-50 text-red-700' };
                    return (
                      <label key={level} className={`flex-1 flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer text-sm font-semibold transition-all ${field.value === level ? colors[level] : 'border-border hover:bg-muted/50'}`}>
                        <input type="radio" value={level} checked={field.value === level} onChange={() => field.onChange(level)} className="sr-only" />
                        {level}
                      </label>
                    );
                  })}
                </div>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">ملاحظات خاصة / تقييم مختصر</Label>
              <Textarea placeholder="سلوك المصاب – استجابة الأسرة – وجود خطر نفسي" {...register('psychNotes')} rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. المخرجات والتوصيات */}
      <Card>
        <CardHeader className="pb-3"><SectionHeader num="6" title="المخرجات والتوصيات" /></CardHeader>
        <CardContent className="space-y-4">
          <CheckboxGroup label="نوع الخدمة التي يحتاجها المصاب في الجلسات القادمة" options={CHURCH_NEXT_SESSION_SERVICES} value={nextSessionServices} onChange={setNextSessionServices} cols={2} otherValue={otherNextServices} onOtherChange={setOtherNextServices} />
          <div className="space-y-1.5">
            <Label className="text-sm">أهم التحديات والصعوبات التي تواجه المصاب</Label>
            <Textarea placeholder="اذكر أبرز التحديات التي تواجه الحالة..." {...register('beneficiaryChallenges')} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">أهم التوصيات لتحسين العمل</Label>
            <Textarea placeholder="توصياتك وملاحظاتك الختامية..." {...register('recommendations')} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end pb-8">
        <Button type="button" variant="outline" onClick={() => setLocation(`/beneficiary/${beneficiaryId}`)}>إلغاء</Button>
        <Button type="submit" className="gap-2 min-w-32"><ClipboardPlus className="w-4 h-4" />حفظ الجلسة</Button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AddVisit() {
  const [, setLocation]       = useLocation();
  const { id: beneficiaryId } = useParams<{ id: string }>();
  const { currentUser, permissions } = useAuth();
  const { beneficiaries, sessions } = useData();

  const beneficiary  = beneficiaries.find(b => b.id === beneficiaryId);
  const prevSessions = sessions.filter(s => s.beneficiaryId === beneficiaryId);

  const canAdd       = permissions.canAddSession;
  const allowedTypes = permissions.allowedServiceTypes || [];

  const userProjects   = currentUser?.projects || [];
  const canViewProject = userProjects.length === 0 || userProjects.includes(beneficiary?.project as any);

  if (!canAdd || !canViewProject) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold">ليس لديك صلاحية إضافة جلسات</p>
        <p className="text-sm text-muted-foreground mt-1">
          {!canViewProject ? 'ليس لديك صلاحية على هذا المشروع' : 'دورك لا يسمح بإضافة جلسات'}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation(`/beneficiary/${beneficiaryId}`)}>العودة</Button>
      </div>
    );
  }

  const projectDef   = getProject(beneficiary?.project);
  const projectLabel = projectDef.label;
  const projectColor = projectDef.badgeClass;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setLocation(`/beneficiary/${beneficiaryId}`)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-bold">توثيق جلسة</h1>
          <p className="text-xs text-muted-foreground mt-0.5">يُعبَّأ من قبل عضو فريق التأهيل الميداني المختص</p>
        </div>
        <Badge className={`ms-auto text-xs ${projectColor}`}>{projectLabel}</Badge>
      </div>

      {beneficiary && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex flex-wrap items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {beneficiary.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{beneficiary.fullName}</p>
              <p className="text-xs text-muted-foreground">{beneficiary.nationalId} · {beneficiary.residenceArea}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{beneficiary.injuryType}</Badge>
              <Badge className="text-xs bg-primary/20 text-primary border-0">الجلسة {prevSessions.length + 1}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {allowedTypes.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>صلاحياتك مقيّدة بـ: <strong>{allowedTypes.join('، ')}</strong></span>
        </div>
      )}

      {(projectDef.forms as ProjectDef['forms']) === 'church'
        ? <ChurchForm beneficiaryId={beneficiaryId || ''} allowedServiceTypes={allowedTypes} />
        : <CbmForm beneficiaryId={beneficiaryId || ''} prevCount={prevSessions.length} allowedServiceTypes={allowedTypes} />
      }
    </div>
  );
}
