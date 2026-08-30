import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/dataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import {
  GAZA_AREAS, INJURY_TYPES, BENEFICIARY_CLASSIFICATIONS, Beneficiary, PROJECTS, PROJECT_CODES
} from '@/data/mockData';

const schema = z.object({
  nationalId:            z.string().min(9, 'رقم الهوية مطلوب (9 أرقام على الأقل)'),
  fullName:              z.string().min(3, 'الاسم الرباعي مطلوب'),
  gender:                z.enum(['male', 'female']),
  dateOfBirth:           z.string().min(1, 'تاريخ الميلاد مطلوب'),
  injuryDate:            z.string().min(1, 'تاريخ الإصابة مطلوب'),
  hasDisability:         z.boolean(),
  classification:        z.string().min(1, 'تصنيف المستفيد مطلوب'),
  phone:                 z.string().min(9, 'رقم الجوال مطلوب'),
  alternativePhone:      z.string().optional(),
  residenceArea:         z.string().min(1, 'منطقة السكن مطلوبة'),
  caregiverName:         z.string().min(2, 'اسم الوصي مطلوب'),
  injuryType:            z.string().min(1, 'نوع الإصابة مطلوب'),
  disabilityDescription: z.string().optional(),
  project:               z.enum(PROJECT_CODES),
  generalNotes:          z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewBeneficiary() {
  const [, setLocation] = useLocation();
  const { language }    = useLanguage();
  const { currentUser } = useAuth();
  const { toast }       = useToast();
  const { beneficiaries, addBeneficiary } = useData();
  const [hasDisability, setHasDisability] = useState(false);

  const params    = new URLSearchParams(window.location.search);
  const prefillId = params.get('nationalId') || '';

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nationalId: prefillId, hasDisability: false, gender: 'male', project: 'CBM' },
  });

  const watchedId = watch('nationalId');

  // ─── تحقق لحظي من رقم الهوية ─────────────────────────
  const duplicate = watchedId && watchedId.length >= 9
    ? beneficiaries.find(b => b.nationalId === watchedId)
    : null;

  const onSubmit = async (data: FormData) => {
    if (beneficiaries.find(b => b.nationalId === data.nationalId)) {
      toast({ title: 'رقم الهوية موجود مسبقاً في النظام', variant: 'destructive' });
      return;
    }
    const newId  = 'b' + Date.now();
    const newBen: Beneficiary = {
      id: newId, ...data,
      alternativePhone:      data.alternativePhone || '',
      disabilityDescription: data.disabilityDescription || '',
      generalNotes:          data.generalNotes || '',
      residenceArea:  data.residenceArea  as any,
      injuryType:     data.injuryType     as any,
      classification: data.classification as any,
      caseStatus: 'active',
      registrationDate: new Date().toISOString().split('T')[0],
      createdBy: currentUser?.id || '',
      createdAt: new Date().toISOString().split('T')[0],
    };
    await addBeneficiary(newBen);
    toast({ title: 'تم تسجيل الحالة بنجاح' });
    setLocation(`/beneficiary/${newId}`);
  };

  const FieldError = ({ name }: { name: keyof FormData }) =>
    errors[name] ? <p className="text-xs text-destructive mt-1">{errors[name]?.message as string}</p> : null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation('/search')} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-bold">تسجيل حالة جديدة</h1>
          <p className="text-sm text-muted-foreground">أدخل بيانات المصاب</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* البيانات الشخصية */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary">البيانات الشخصية</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-sm">الاسم رباعي *</Label>
              <Input placeholder="الاسم الأول والأب والجد والعائلة" {...register('fullName')} />
              <FieldError name="fullName" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">رقم هوية المصاب *</Label>
              <Input placeholder="9 أرقام على الأقل" {...register('nationalId')} />
              <FieldError name="nationalId" />
              {/* تحذير التكرار اللحظي */}
              {duplicate && (
                <div className="mt-2 p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-semibold">هذا الرقم مسجّل مسبقاً!</p>
                  </div>
                  <div className="text-xs text-red-600 space-y-0.5">
                    <p>الاسم: <span className="font-medium">{duplicate.fullName}</span></p>
                    <p>المشروع: <span className="font-medium">{duplicate.project}</span> · المنطقة: <span className="font-medium">{duplicate.residenceArea}</span></p>
                    <p>الحالة: <span className={`font-medium ${duplicate.caseStatus==='active'?'text-green-700':'text-gray-600'}`}>{duplicate.caseStatus==='active'?'نشط':'مغلق'}</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocation(`/beneficiary/${duplicate.id}`)}
                    className="flex items-center gap-1.5 text-xs text-red-700 font-medium hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    فتح ملف الحالة الموجودة
                  </button>
                </div>
              )}
              {/* تأكيد لما الرقم جديد */}
              {!duplicate && watchedId && watchedId.length >= 9 && (
                <div className="flex items-center gap-1.5 mt-1 text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <p className="text-xs">رقم جديد — غير مسجل في النظام</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">الجنس *</Label>
              <Controller control={control} name="gender" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">تاريخ الميلاد *</Label>
              <Input type="date" {...register('dateOfBirth')} />
              <FieldError name="dateOfBirth" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">تاريخ الإصابة *</Label>
              <Input type="date" {...register('injuryDate')} />
              <FieldError name="injuryDate" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">رقم جوال *</Label>
              <Input type="tel" placeholder="05xxxxxxxx" {...register('phone')} />
              <FieldError name="phone" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">رقم جوال بديل</Label>
              <Input type="tel" placeholder="05xxxxxxxx (اختياري)" {...register('alternativePhone')} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">منطقة السكن الأصلي *</Label>
              <Controller control={control} name="residenceArea" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                  <SelectContent>
                    {GAZA_AREAS.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              <FieldError name="residenceArea" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">اسم الوصي *</Label>
              <Input placeholder="اسم الوصي أو المرافق" {...register('caregiverName')} />
              <FieldError name="caregiverName" />
            </div>

          </CardContent>
        </Card>

        {/* تصنيف الحالة */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary">تصنيف الحالة الطبية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              <Switch
                checked={hasDisability}
                onCheckedChange={v => { setHasDisability(v); setValue('hasDisability', v); }}
              />
              <div>
                <Label className="text-sm font-medium cursor-pointer">يوجد إعاقة لدى المصاب</Label>
                <p className="text-xs text-muted-foreground">فعّل إذا كانت الإعاقة موجودة قبل الإصابة أو مترتبة عليها</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">تصنيف المستفيد *</Label>
              <Controller control={control} name="classification" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                  <SelectContent>
                    {BENEFICIARY_CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              <FieldError name="classification" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">نوع الإصابة (المشكلة الرئيسية) *</Label>
              <Controller control={control} name="injuryType" render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="اختر نوع الإصابة" /></SelectTrigger>
                  <SelectContent>
                    {INJURY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              <FieldError name="injuryType" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">وصف الإعاقة / الإصابة</Label>
              <Textarea placeholder="وصف تفصيلي للإصابة أو الإعاقة..." {...register('disabilityDescription')} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">المشروع *</Label>
                <Controller control={control} name="project" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROJECTS.map(p => (
                        <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">ملاحظات عامة</Label>
              <Textarea placeholder="أي ملاحظات إضافية..." {...register('generalNotes')} rows={2} />
            </div>

          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-6">
          <Button type="button" variant="outline" onClick={() => setLocation('/search')}>إلغاء</Button>
          <Button type="submit" disabled={!!duplicate} className="gap-2">
            <UserPlus className="w-4 h-4" />
            حفظ وفتح الملف
          </Button>
        </div>
      </form>
    </div>
  );
}
