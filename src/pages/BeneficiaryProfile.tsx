import { useState, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { useData } from '@/lib/dataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import SDQTab from '@/components/SDQTab';
import AssessmentsTab from '@/components/AssessmentsTab';
import { Session, GAZA_AREAS, INJURY_TYPES, BENEFICIARY_CLASSIFICATIONS, CBM_SERVICE_TYPES, CHURCH_SERVICE_TYPES } from '@/data/mockData';
import AttachmentsTab from '@/components/AttachmentsTab';
import {
  ArrowLeft, Plus, Phone, MapPin, Calendar, User, Stethoscope,
  Brain, Heart, FileText, CheckCircle2, Trash2, Lock, Eye,
  Printer, XCircle, RotateCcw, Pencil, AlertTriangle,
  ArrowRightLeft, SlidersHorizontal, X as XIcon, MoreVertical,
  ClipboardList, Clock, Activity, Sparkles, Loader2,
  AlertCircle, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

const CLOSURE_REASONS = [
  'اكتمل البرنامج العلاجي', 'رفض المستفيد الاستمرار في العلاج',
  'انتقل المستفيد إلى منطقة أخرى', 'وفاة المستفيد',
  'لم يستجب المستفيد للتواصل', 'إحالة إلى جهة متخصصة أخرى',
  'حالة مستقرة ولا تحتاج متابعة', 'أخرى',
];

function DataRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground sm:w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
function BoolChip({ value, trueLabel='نعم', falseLabel='لا' }: { value?: boolean; trueLabel?: string; falseLabel?: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{value ? trueLabel : falseLabel}</span>;
}
function TagList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return <div className="flex flex-wrap gap-1.5 mt-1">{items.map(i => <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{i}</span>)}</div>;
}

// ─── Timeline ─────────────────────────────────────────────
type TimelineEvent = {
  id: string; date: string;
  type: 'session' | 'assessment' | 'closed' | 'opened' | 'transferred' | 'registered';
  title: string; subtitle?: string; badges?: string[]; meta?: string; pain?: number; gad?: number;
};
function TimelineItem({ event }: { event: TimelineEvent }) {
  const typeConfig: Record<string, { icon: string; color: string; bg: string; border: string }> = {
    session:     { icon: '📅', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
    assessment:  { icon: '📋', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    closed:      { icon: '🔒', color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-200' },
    opened:      { icon: '🔓', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
    transferred: { icon: '🔄', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
    registered:  { icon: '✅', color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  };
  const cfg = typeConfig[event.type] || typeConfig.session;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 border ${cfg.bg} ${cfg.border}`}>{cfg.icon}</div>
        <div className="w-px flex-1 bg-border/60 mt-1" />
      </div>
      <div className="flex-1 pb-4">
        <div className={`rounded-xl border p-3 ${cfg.bg} ${cfg.border}`}>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className={`text-sm font-semibold ${cfg.color}`}>{event.title}</p>
              {event.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{event.subtitle}</p>}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{event.date}</span>
          </div>
          {(event.badges?.length || event.pain !== undefined || event.gad !== undefined) && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {event.badges?.map(b => <Badge key={b} variant="outline" className="text-[10px] px-1.5">{b}</Badge>)}
              {event.pain !== undefined && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${event.pain<=3?'bg-green-100 text-green-700':event.pain<=6?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>ألم {event.pain}/10</span>}
              {event.gad !== undefined && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${event.gad<=4?'bg-green-100 text-green-700':event.gad<=9?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>GAD-7: {event.gad}</span>}
              {event.meta && <span className="text-[10px] text-muted-foreground">{event.meta}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session, index, currentUserId, canEdit, canDelete, onDelete, onEdit }: {
  session: Session; index: number; currentUserId?: string;
  canEdit: boolean; canDelete: boolean;
  onDelete: (id: string) => void; onEdit: (s: Session) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOwner = session.createdBy === currentUserId;
  const responseColors: Record<string, string> = {
    'تحسن ملحوظ':'bg-green-100 text-green-700','تحسن بسيط':'bg-blue-100 text-blue-700',
    'بدون تحسن':'bg-amber-100 text-amber-700','تدهور':'bg-red-100 text-red-700',
  };
  return (
    <Card className="border-border/70">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">{index+1}</div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{session.sessionNumber||session.serviceDate}</p>
                <Badge className={`text-[10px] px-1.5 py-0 border-0 ${session.formType==='Church'?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700'}`}>{session.formType}</Badge>
                {!isOwner&&<span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Eye className="w-3 h-3"/>مشاهدة فقط</span>}
              </div>
              <p className="text-xs text-muted-foreground">{session.serviceDate} · {session.serviceArea} · {session.providerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {session.serviceTypes.map(t=><Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
            {session.sessionResponse&&<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${responseColors[session.sessionResponse]||'bg-gray-100 text-gray-600'}`}>{session.sessionResponse}</span>}
            {isOwner&&canEdit&&<button type="button" onClick={()=>onEdit(session)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"><Pencil className="w-3.5 h-3.5"/></button>}
            {isOwner&&canDelete&&<button type="button" onClick={()=>onDelete(session.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground">مستوى الألم</p><p className={`font-bold text-base ${session.painLevel<=3?'text-green-600':session.painLevel<=6?'text-amber-600':'text-red-600'}`}>{session.painLevel}/10</p></div>
          {session.formType==='CBM'&&<>
            <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground">الوضع الحالي</p><p className="font-medium">{session.functionalStatus||'—'}</p></div>
            <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground">المدة</p><p className="font-medium">{session.sessionDuration||'—'}</p></div>
            <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground">تعاون الأسرة</p><p className="font-medium">{session.familyCooperation||'—'}</p></div>
          </>}
          {session.formType==='Church'&&<>
            <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground">تصنيف العمر</p><p className="font-medium">{session.ageClassification||'—'}</p></div>
            <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground">مستوى الصدمة</p><p className="font-medium">{session.traumaLevel||'—'}</p></div>
            <div className="bg-muted/50 rounded-lg p-2"><p className="text-muted-foreground">المكان</p><p className="font-medium text-[11px]">{session.exactLocation||'—'}</p></div>
          </>}
        </div>
        <button type="button" onClick={()=>setExpanded(v=>!v)} className="text-xs text-primary hover:underline">{expanded?'إخفاء التفاصيل':'عرض التفاصيل الكاملة'}</button>
        {expanded&&(
          <div className="pt-2 space-y-3 border-t border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <DataRow label="مكان التنفيذ" value={session.exactLocation}/>
              {session.sessionType&&<DataRow label="نوع الجلسة" value={session.sessionType}/>}
              {session.beneficiaryCount&&<DataRow label="عدد المستفيدين" value={String(session.beneficiaryCount)}/>}
              {session.totalSessionsPlanned&&<DataRow label="الجلسات المخططة" value={session.totalSessionsPlanned}/>}
            </div>
            {session.neededDevices.length>0&&<div><p className="text-xs text-muted-foreground mb-1">الأدوات المساعدة المطلوبة</p><TagList items={session.neededDevices}/></div>}
            {session.formType==='CBM'&&<>
              {(session.physioInterventions?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">تدخلات العلاج الطبيعي/الوظيفي</p><TagList items={session.physioInterventions}/></div>}
              {(session.physioModalities?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">وسائل العلاج الفيزيائي</p><TagList items={session.physioModalities}/></div>}
              {(session.familyGuidanceTopics?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">موضوع التوجيه الأسري</p><TagList items={session.familyGuidanceTopics}/></div>}
              {(session.improvementTypes?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">نوع التحسن</p><TagList items={session.improvementTypes}/></div>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">تصوير:</span><BoolChip value={session.photoConsent}/></div>
                <div className="flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">مخاطر حماية:</span><BoolChip value={session.protectionRisks}/></div>
                <div className="flex items-center gap-1.5 text-xs"><span className="text-muted-foreground">إحالة GBV/DBV:</span><BoolChip value={session.gbvDbvReferral}/></div>
              </div>
              {session.referralMade&&<div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs"><span className="font-medium text-amber-700">إحالة: </span><span className="text-amber-700">{session.referralDetails}</span></div>}
            </>}
            {session.formType==='Church'&&<>
              {(session.woundStatus?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">حالة الجرح</p><TagList items={session.woundStatus}/></div>}
              {(session.nursingInterventions?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">التدخل التمريضي</p><TagList items={session.nursingInterventions}/></div>}
              {(session.physioAssessment?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">التقييم الفيزيائي</p><TagList items={session.physioAssessment}/></div>}
              {(session.physioInterventions?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">خطة العلاج الطبيعي</p><TagList items={session.physioInterventions}/></div>}
              {(session.physioModalities?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">وسائل العلاج الفيزيائي</p><TagList items={session.physioModalities}/></div>}
              {session.eventDescription&&<div><p className="text-xs text-muted-foreground mb-1">وصف الحدث</p><div className="p-2.5 rounded-lg bg-muted/50 text-sm">{session.eventDescription}</div></div>}
              {session.beneficiaryChallenges&&<DataRow label="أبرز التحديات" value={session.beneficiaryChallenges}/>}
            </>}
            {(session.psychState?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">الحالة النفسية</p><TagList items={session.psychState}/></div>}
            {(session.psychInterventions?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">التدخل النفسي</p><TagList items={session.psychInterventions}/></div>}
            {session.psychNotes&&<DataRow label="ملاحظات نفسية" value={session.psychNotes}/>}
            {(session.nextSessionServices?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">خدمات الجلسة القادمة</p><TagList items={session.nextSessionServices}/></div>}
            {session.recommendations&&<DataRow label="التوصيات" value={session.recommendations}/>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BeneficiaryProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { currentUser, permissions } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { beneficiaries, sessions: allSessions, alerts: allAlerts, users,
          assessments: allAssessments,
          deleteSession, updateSession, updateBeneficiary, deleteBeneficiary } = useData();

  const beneficiary   = beneficiaries.find(b => b.id === id);
  const sessions      = allSessions.filter(s => s.beneficiaryId === id);
  const alerts        = allAlerts.filter(a => a.beneficiaryId === id && !a.isResolved);
  const myAssessments = allAssessments.filter(a => a.beneficiaryId === id);

  const canAddSession      = permissions.canAddSession && beneficiary?.caseStatus !== 'closed';
  const canEditSession     = permissions.canEditSession;
  const canDeleteSession   = permissions.canDeleteSession;
  const canEditBeneficiary = permissions.canEditBeneficiary;
  const canCloseCase       = permissions.canCloseCase;
  const canTransferCase    = permissions.canTransferCase;
  const isAdmin            = currentUser?.role === 'admin';
  const userProjects       = currentUser?.projects || [];
  const canViewBeneficiary = isAdmin || userProjects.length === 0 || userProjects.includes(beneficiary?.project as any);

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showEditDialog,  setShowEditDialog]  = useState(false);
  const [editLoading,     setEditLoading]     = useState(false);
  const [editForm, setEditForm] = useState({
    fullName:'', phone:'', alternativePhone:'', caregiverName:'',
    residenceArea:'', dateOfBirth:'', injuryDate:'', injuryType:'',
    classification:'', hasDisability:false, disabilityDescription:'', generalNotes:'',
  });

  const openEdit = () => {
    if (!beneficiary) return;
    setEditForm({
      fullName:beneficiary.fullName, phone:beneficiary.phone,
      alternativePhone:beneficiary.alternativePhone||'', caregiverName:beneficiary.caregiverName,
      residenceArea:beneficiary.residenceArea, dateOfBirth:beneficiary.dateOfBirth,
      injuryDate:beneficiary.injuryDate, injuryType:beneficiary.injuryType,
      classification:beneficiary.classification, hasDisability:beneficiary.hasDisability,
      disabilityDescription:beneficiary.disabilityDescription||'', generalNotes:beneficiary.generalNotes||'',
    });
    setShowEditDialog(true); setShowActionsMenu(false);
  };
  const handleSaveEdit = async () => {
    if (!beneficiary||!editForm.fullName.trim()) return;
    setEditLoading(true);
    try { await updateBeneficiary({...beneficiary,...editForm} as typeof beneficiary); setShowEditDialog(false); toast({title:'تم تحديث بيانات المستفيد بنجاح'}); }
    finally { setEditLoading(false); }
  };

  const [showDeleteDialog,   setShowDeleteDialog]   = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteLoading,      setDeleteLoading]      = useState(false);
  const handleDelete = async () => {
    if (!beneficiary||deleteConfirmInput!==beneficiary.fullName) return;
    setDeleteLoading(true);
    try { await deleteBeneficiary(beneficiary.id); toast({title:'تم حذف الحالة نهائياً'}); setLocation('/search'); }
    finally { setDeleteLoading(false); }
  };

  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closureReason,   setClosureReason]   = useState('');
  const [closureNote,     setClosureNote]     = useState('');
  const [closureLoading,  setClosureLoading]  = useState(false);
  const handleCloseCase = async () => {
    if (!beneficiary||!closureReason) return;
    setClosureLoading(true);
    try {
      await updateBeneficiary({...beneficiary,caseStatus:'closed',closureReason,closureNote,closureDate:new Date().toISOString().split('T')[0]});
      setShowCloseDialog(false); setClosureReason(''); setClosureNote('');
      toast({title:'تم إغلاق الحالة',description:`سبب الإغلاق: ${closureReason}`});
    } finally { setClosureLoading(false); }
  };
  const handleReopenCase = async () => {
    if (!beneficiary) return;
    await updateBeneficiary({...beneficiary,caseStatus:'active',closureReason:undefined,closureDate:undefined,closureNote:undefined});
    toast({title:'تم إعادة فتح الحالة'}); setShowActionsMenu(false);
  };
  const handlePrint = () => { window.print(); setShowActionsMenu(false); };

  const handlePdfExport = () => {
    if (!beneficiary) return;
    const now = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const avgPainVal = sessions.length > 0 ? (sessions.reduce((a,s)=>a+s.painLevel,0)/sessions.length).toFixed(1) : '—';
    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>ملف المستفيد — ${beneficiary.fullName}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Noto Sans Arabic',Arial,sans-serif;font-size:10pt;color:#1a1a2e;direction:rtl;padding:1.5cm 2cm}
h1{font-size:18pt;color:#1a3a6b;text-align:center;margin-bottom:4px}.sub{font-size:10pt;color:#666;text-align:center;margin-bottom:4px}
.meta{font-size:9pt;color:#888;text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:12px;margin-bottom:20px}
h2{font-size:12pt;color:#1a3a6b;border-bottom:1px solid #1a3a6b;padding-bottom:4px;margin:20px 0 10px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}
.kpi{background:#f0f4fa;border-radius:8px;padding:10px;text-align:center;border:1px solid #dce4f0}
.kpi-val{font-size:20pt;font-weight:700;color:#1a3a6b;line-height:1}.kpi-lbl{font-size:8pt;color:#555;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:16px}
th{background:#1a3a6b;color:white;padding:6px 8px;text-align:right;font-weight:600}
td{padding:5px 8px;border-bottom:1px solid #e8edf5}tr:nth-child(even) td{background:#f7f9fc}
.info-row{display:flex;gap:8px;padding:5px 8px;border-bottom:1px solid #e8edf5}.info-row:nth-child(even){background:#f7f9fc}
.info-lbl{color:#666;width:140px;flex-shrink:0;font-size:9pt}.info-val{font-weight:600;font-size:9pt}
.footer{margin-top:30px;border-top:1px solid #ccc;padding-top:10px;font-size:8pt;color:#888;display:flex;justify-content:space-between}
@media print{@page{margin:0;size:A4 portrait}body{padding:1cm 1.5cm}}</style></head><body>
<h1>نظام إدارة حالات إعادة التأهيل</h1>
<p class="sub">${beneficiary.project==='CBM'?'مشروع CBM':'مشروع الكنيسة'} — ملف المستفيد</p>
<p class="meta">تاريخ الطباعة: ${now} | طُبع بواسطة: ${currentUser?.fullName||'—'}</p>
<h2>البيانات الأساسية</h2><div>
${[['الاسم الرباعي',beneficiary.fullName],['رقم الهوية',beneficiary.nationalId],['الجنس',beneficiary.gender==='male'?'ذكر':'أنثى'],['تاريخ الميلاد',beneficiary.dateOfBirth],['تاريخ الإصابة',beneficiary.injuryDate],['منطقة السكن',beneficiary.residenceArea],['نوع الإصابة',beneficiary.injuryType],['التصنيف',beneficiary.classification],['اسم الوصي',beneficiary.caregiverName],['رقم الجوال',beneficiary.phone],['المشروع',beneficiary.project],['تاريخ التسجيل',beneficiary.registrationDate],['الحالة',beneficiary.caseStatus==='active'?'نشط':'مغلق']].map(([l,v])=>`<div class="info-row"><span class="info-lbl">${l}</span><span class="info-val">${v||'—'}</span></div>`).join('')}
</div><h2>مؤشرات الأداء</h2>
<div class="kpi-grid">
<div class="kpi"><div class="kpi-val">${sessions.length}</div><div class="kpi-lbl">إجمالي الجلسات</div></div>
<div class="kpi"><div class="kpi-val">${avgPainVal}</div><div class="kpi-lbl">متوسط الألم</div></div>
<div class="kpi"><div class="kpi-val">${physioSessions.length+otSessions.length}</div><div class="kpi-lbl">علاج طبيعي</div></div>
<div class="kpi"><div class="kpi-val">${psychSessions.length}</div><div class="kpi-lbl">دعم نفسي</div></div>
<div class="kpi"><div class="kpi-val">${nursingSessions.length}</div><div class="kpi-lbl">تمريض</div></div>
<div class="kpi"><div class="kpi-val">${familySessions.length}</div><div class="kpi-lbl">توجيه أسري</div></div>
<div class="kpi"><div class="kpi-val">${referrals}</div><div class="kpi-lbl">إحالات</div></div>
<div class="kpi"><div class="kpi-val">${myAssessments.length}</div><div class="kpi-lbl">تقييمات</div></div>
</div>
${sessions.length>0?`<h2>سجل الجلسات (${sessions.length})</h2><table><thead><tr><th>#</th><th>التاريخ</th><th>الخدمات</th><th>مستوى الألم</th><th>الاستجابة</th><th>مقدم الخدمة</th><th>المنطقة</th></tr></thead><tbody>${sessions.map((s,i)=>`<tr><td style="text-align:center">${i+1}</td><td>${s.serviceDate}</td><td>${s.serviceTypes.join('، ')}</td><td style="text-align:center;font-weight:700;color:${s.painLevel<=3?'#059669':s.painLevel<=6?'#d97706':'#dc2626'}">${s.painLevel}/10</td><td>${s.sessionResponse||'—'}</td><td>${s.providerName||'—'}</td><td>${s.serviceArea||'—'}</td></tr>`).join('')}</tbody></table>`:''}
${beneficiary.generalNotes?`<h2>ملاحظات عامة</h2><p style="padding:8px;background:#f7f9fc;border-radius:6px;font-size:10pt">${beneficiary.generalNotes}</p>`:''}
<div class="footer"><span>مستفيد رقم: ${beneficiary.id} — وثيقة سرية للاستخدام الرسمي فقط</span><span>جذور — نظام إدارة التأهيل</span></div>
</body></html>`;
    const win = window.open('','_blank','width=900,height=700');
    if (!win){toast({title:'تعذّر فتح نافذة الطباعة',variant:'destructive'});return;}
    win.document.write(html); win.document.close();
    win.onload=()=>{setTimeout(()=>{win.focus();win.print();},500);};
    setShowActionsMenu(false);
  };

  const [editingSession,  setEditingSession]  = useState<Session|null>(null);
  const [editSessionSave, setEditSessionSave] = useState(false);
  const handleSaveEditSession = async () => {
    if (!editingSession) return;
    setEditSessionSave(true);
    try { await updateSession(editingSession); setEditingSession(null); toast({title:'تم تحديث الجلسة بنجاح'}); }
    finally { setEditSessionSave(false); }
  };

  const [sessionFilterFrom, setSessionFilterFrom] = useState('');
  const [sessionFilterTo,   setSessionFilterTo]   = useState('');
  const [sessionFilterType, setSessionFilterType] = useState('all');
  const [showSessionFilter, setShowSessionFilter] = useState(false);
  const filteredSessions = sessions.filter(s => {
    if (sessionFilterFrom&&s.serviceDate<sessionFilterFrom) return false;
    if (sessionFilterTo&&s.serviceDate>sessionFilterTo) return false;
    if (sessionFilterType!=='all'&&!s.serviceTypes.includes(sessionFilterType)) return false;
    return true;
  });
  const sessionFilterActive = !!(sessionFilterFrom||sessionFilterTo||sessionFilterType!=='all');

  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferToUserId,   setTransferToUserId]   = useState('');
  const [transferNote,       setTransferNote]       = useState('');
  const [transferring,       setTransferring]       = useState(false);
  const handleTransfer = async () => {
    if (!beneficiary||!transferToUserId) return;
    const targetUser = users.find(u=>u.id===transferToUserId);
    if (!targetUser) return;
    setTransferring(true);
    try {
      await updateBeneficiary({...beneficiary,createdBy:transferToUserId});
      setShowTransferDialog(false); setTransferToUserId(''); setTransferNote('');
      toast({title:`تم نقل الحالة إلى ${targetUser.fullName}`});
    } finally { setTransferring(false); }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s=>s.id===sessionId);
    if (!session) return;
    if (session.createdBy!==currentUser?.id) {
      toast({title:'لا يمكنك حذف هذه الجلسة',description:'يمكنك فقط حذف الجلسات التي أدخلتها أنت',variant:'destructive'});
      return;
    }
    await deleteSession(sessionId);
    toast({title:'تم حذف الجلسة'});
  };

  // ─── AI Summary ────────────────────────────────────────────
  const [aiLoading,  setAiLoading]  = useState(false);
  const [aiSummary,  setAiSummary]  = useState<string | null>(null);
  const [aiError,    setAiError]    = useState<string | null>(null);

  const handleAiSummary = async () => {
    if (!beneficiary) return;
    setAiLoading(true); setAiSummary(null); setAiError(null);

    const avgPainVal = sessions.length > 0
      ? (sessions.reduce((a,s)=>a+s.painLevel,0)/sessions.length).toFixed(1) : 'غير متاح';
    const lastGad = myAssessments.filter(a=>a.gadTotal!==undefined).pop();
    const lastSdq = myAssessments.filter(a=>a.sdqTotal!==undefined).pop();
    const improvementList = sessions.map(s=>s.sessionResponse).filter(Boolean);
    const neededDevices = [...new Set(sessions.flatMap(s=>s.neededDevices).filter(d=>d!=='لا يحتاج أي أداة مساعدة'))];
    const referralCount = sessions.filter(s=>s.referralMade).length;

    const prompt = `أنت مساعد طبي متخصص في إعادة التأهيل. لديك بيانات كاملة عن حالة مستفيد من برنامج إعادة التأهيل الميداني في غزة. قم بتوليد ملخص طبي وتأهيلي شامل باللغة العربية.

بيانات المستفيد:
- الاسم: ${beneficiary.fullName}
- الجنس: ${beneficiary.gender==='male'?'ذكر':'أنثى'}
- تاريخ الميلاد: ${beneficiary.dateOfBirth}
- نوع الإصابة: ${beneficiary.injuryType}
- تاريخ الإصابة: ${beneficiary.injuryDate}
- المشروع: ${beneficiary.project}
- حالة القضية: ${beneficiary.caseStatus==='active'?'نشطة':'مغلقة'}
- منطقة السكن: ${beneficiary.residenceArea}
- وصف الإصابة: ${beneficiary.disabilityDescription || 'غير محدد'}

إحصائيات الجلسات:
- إجمالي الجلسات: ${sessions.length}
- علاج طبيعي: ${physioSessions.length} جلسة
- تمريض: ${nursingSessions.length} جلسة
- دعم نفسي: ${psychSessions.length} جلسة
- متوسط مستوى الألم: ${avgPainVal}/10
- آخر جلسة: ${sessions[sessions.length-1]?.serviceDate || 'لا توجد'}
- استجابات الجلسات: ${improvementList.join('، ') || 'غير متاح'}
- إحالات خارجية: ${referralCount}
- أجهزة مساعدة مطلوبة: ${neededDevices.join('، ') || 'لا توجد'}

التقييمات:
- عدد التقييمات الشاملة: ${myAssessments.length}
${lastGad ? `- آخر GAD-7: ${lastGad.gadTotal} (${lastGad.gadTotal!<=4?'قلق خفيف جداً':lastGad.gadTotal!<=9?'قلق خفيف':lastGad.gadTotal!<=14?'قلق متوسط':'قلق شديد'})` : ''}
${lastSdq ? `- آخر SDQ: ${lastSdq.sdqTotal}` : ''}

اكتب ملخصاً منظماً يحتوي على هذه الأقسام بالضبط (استخدم هذا التنسيق):

**ملخص الحالة الطبية:**
[وصف موجز للحالة الطبية والإصابة]

**مسار العلاج والتقدم:**
[تقييم تقدم العلاج بناءً على الجلسات والاستجابات]

**المؤشرات النفسية:**
[تقييم الحالة النفسية بناءً على GAD-7 وجلسات الدعم النفسي]

**الأولويات والتوصيات:**
[3-4 توصيات محددة وقابلة للتنفيذ]

**درجة الخطورة:**
[منخفضة 🟢 / متوسطة 🟡 / عالية 🔴] مع سبب مختصر

اجعل الملخص دقيقاً ومهنياً ومفيداً للفريق الطبي.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.content?.map((c: any) => c.text || '').join('') || '';
      if (text) { setAiSummary(text); }
      else { setAiError('لم يتمكن النظام من توليد الملخص. حاول مرة أخرى.'); }
    } catch (err) {
      setAiError('خطأ في الاتصال بالخادم. تحقق من اتصال الإنترنت.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!beneficiary || !canViewBeneficiary) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <p className="text-muted-foreground">لم يتم العثور على الحالة أو ليس لديك صلاحية مشاهدتها</p>
        <Button variant="outline" className="mt-4" onClick={()=>setLocation('/search')}>العودة للبحث</Button>
      </div>
    );
  }

  const age              = beneficiary.dateOfBirth ? new Date().getFullYear()-new Date(beneficiary.dateOfBirth).getFullYear() : null;
  const sessionsByType   = (type: string) => sessions.filter(s=>s.serviceTypes.includes(type));
  const physioSessions   = sessionsByType('علاج طبيعي');
  const otSessions       = sessionsByType('علاج وظيفي');
  const nursingSessions  = sessionsByType('تمريض');
  const psychSessions    = sessionsByType('دعم نفسي');
  const familySessions   = sessionsByType('توجيه أسري');
  const lastSession      = sessions[sessions.length-1];
  const referrals        = sessions.filter(s=>s.referralMade).length;
  const avgPain          = sessions.length>0 ? (sessions.reduce((acc,s)=>acc+s.painLevel,0)/sessions.length).toFixed(1) : null;
  const mySessions       = sessions.filter(s=>s.createdBy===currentUser?.id);
  const othersSessions   = sessions.filter(s=>s.createdBy!==currentUser?.id);

  // ─── Timeline ─────────────────────────────────────────────
  const timelineEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    if (beneficiary.registrationDate) {
      events.push({ id:'reg', date:beneficiary.registrationDate, type:'registered',
        title:'تسجيل الحالة في النظام', subtitle:`${beneficiary.project} · ${beneficiary.injuryType}` });
    }
    sessions.forEach(s => events.push({
      id:s.id, date:s.serviceDate, type:'session',
      title:`جلسة ${s.serviceTypes.join(' + ')}`,
      subtitle:`${s.providerName||'—'} · ${s.serviceArea}`,
      badges: s.sessionResponse ? [s.sessionResponse] : [],
      pain: s.painLevel,
      meta: s.sessionNumber ? `جلسة رقم ${s.sessionNumber}` : undefined,
    }));
    myAssessments.forEach(a => events.push({
      id:a.id, date:a.assessmentDate, type:'assessment', title:'تقييم شامل',
      subtitle: a.groups?.join(' + ') || (a.project==='CBM'?'CBM':'Church'),
      gad: a.gadTotal, pain: a.painPresent ? a.painScore : undefined,
      meta: a.sdqTotal !== undefined ? `SDQ: ${a.sdqTotal}` : undefined,
    }));
    if (beneficiary.caseStatus==='closed' && beneficiary.closureDate) {
      events.push({ id:'closed', date:beneficiary.closureDate, type:'closed',
        title:'تم إغلاق الحالة', subtitle:beneficiary.closureReason||'' });
    }
    return events.sort((a,b) => b.date.localeCompare(a.date));
  }, [sessions, myAssessments, beneficiary]);
  const totalEvents = timelineEvents.length;

  // ─── AI Summary renderer ───────────────────────────────────
  const renderAiSummary = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-primary mt-4 mb-1 text-sm">{line.replace(/\*\*/g,'')}</p>;
      }
      if (line.trim().startsWith('-')) {
        return <p key={i} className="text-sm text-foreground pr-3 py-0.5">• {line.trim().slice(1).trim()}</p>;
      }
      if (line.trim() === '') return <div key={i} className="h-1" />;
      return <p key={i} className="text-sm text-foreground py-0.5">{line}</p>;
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5" dir="rtl">
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <button onClick={()=>setLocation('/search')} className="p-2 rounded-lg hover:bg-muted transition-colors mt-0.5 flex-shrink-0"><ArrowLeft className="w-4 h-4 rotate-180"/></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-bold leading-snug break-words">{beneficiary.fullName}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge className={`border-0 text-xs ${beneficiary.caseStatus==='active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{beneficiary.caseStatus==='active'?'نشط':'مغلق'}</Badge>
              <Badge className={`border-0 text-xs ${beneficiary.project==='Church'?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700'}`}>{beneficiary.project}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3"/>{beneficiary.nationalId}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{beneficiary.residenceArea}</span>
              {age&&<span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{age} سنة</span>}
              <span className="flex items-center gap-1"><Phone className="w-3 h-3"/>{beneficiary.phone}</span>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <button onClick={()=>setShowActionsMenu(v=>!v)} className="p-2 rounded-lg hover:bg-muted transition-colors"><MoreVertical className="w-5 h-5"/></button>
            {showActionsMenu&&(
              <div className="absolute top-full end-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <button onClick={handlePrint} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"><Printer className="w-4 h-4"/>طباعة</button>
                <button onClick={handlePdfExport} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"><FileText className="w-4 h-4"/>تصدير PDF</button>
                {canEditBeneficiary&&<button onClick={openEdit} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"><Pencil className="w-4 h-4"/>تعديل البيانات</button>}
                {canTransferCase&&<button onClick={()=>{setTransferToUserId('');setTransferNote('');setShowTransferDialog(true);setShowActionsMenu(false);}} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-violet-700"><ArrowRightLeft className="w-4 h-4"/>نقل الحالة</button>}
                {canCloseCase&&beneficiary.caseStatus==='active'&&<button onClick={()=>{setShowCloseDialog(true);setShowActionsMenu(false);}} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-orange-600"><XCircle className="w-4 h-4"/>إغلاق الحالة</button>}
                {canCloseCase&&beneficiary.caseStatus==='closed'&&<button onClick={handleReopenCase} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-green-700"><RotateCcw className="w-4 h-4"/>إعادة فتح الحالة</button>}
                {isAdmin&&<button onClick={()=>{setDeleteConfirmInput('');setShowDeleteDialog(true);setShowActionsMenu(false);}} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-destructive border-t border-border"><Trash2 className="w-4 h-4"/>حذف الحالة</button>}
              </div>
            )}
          </div>
        </div>

        {canAddSession ? (
          <div className="grid grid-cols-2 gap-2">
            <Button className="gap-2" onClick={()=>setLocation(`/add-visit/${id}`)}><Plus className="w-4 h-4"/>إضافة جلسة</Button>
            <Button variant="outline" className="gap-2" onClick={()=>setLocation(`/assessment/${id}`)}><ClipboardList className="w-4 h-4"/>تقييم شامل</Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 py-2"><Lock className="w-3.5 h-3.5"/>مشاهدة فقط</div>
        )}
      </div>

      {sessions.length>0&&(
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 flex-shrink-0"/>
          <span>{mySessions.length>0?`لديك ${mySessions.length} جلسة بصلاحية التحكم الكامل.${othersSessions.length>0?` ${othersSessions.length} جلسة أخرى بصلاحية المشاهدة فقط.`:''}` : `جميع الجلسات (${sessions.length}) مدخلة من مستخدمين آخرين — صلاحية المشاهدة فقط.`}</span>
        </div>
      )}

      {beneficiary.caseStatus==='closed'&&(
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <XCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0"/>
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-semibold text-gray-700">الحالة مغلقة</p>
            <p className="text-gray-500 text-xs mt-0.5">سبب الإغلاق: <span className="font-medium text-gray-700">{beneficiary.closureReason}</span>{beneficiary.closureDate&&` · ${beneficiary.closureDate}`}</p>
            {beneficiary.closureNote&&<p className="text-gray-500 text-xs mt-0.5">{beneficiary.closureNote}</p>}
          </div>
        </div>
      )}

      {alerts.length>0&&(
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
          <div className="w-4 h-4 text-red-500 flex-shrink-0">⚠</div>
          <div className="flex-1 min-w-0">{alerts.map(a=><p key={a.id} className="text-sm text-red-700">{a.alertMessage}</p>)}</div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {[
          {label:'إجمالي الجلسات',value:sessions.length,               icon:FileText,   color:'text-blue-600 bg-blue-50'},
          {label:'آخر جلسة',      value:lastSession?.serviceDate||'—',  icon:Calendar,   color:'text-green-600 bg-green-50'},
          {label:'متوسط الألم',   value:avgPain?`${avgPain}/10`:'—',    icon:Heart,      color:'text-rose-600 bg-rose-50'},
          {label:'علاج طبيعي',    value:physioSessions.length,          icon:Stethoscope,color:'text-purple-600 bg-purple-50'},
          {label:'دعم نفسي',      value:psychSessions.length,           icon:Brain,      color:'text-indigo-600 bg-indigo-50'},
        ].map((kpi,i)=>{const Icon=kpi.icon;return(
          <Card key={i}><CardContent className="p-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${kpi.color}`}><Icon className="w-3.5 h-3.5"/></div>
            <p className="text-lg font-bold leading-none">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
          </CardContent></Card>
        );})}
      </div>

      <Tabs defaultValue="basic">
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="basic"       className="text-xs rounded-lg">البيانات الأساسية</TabsTrigger>
          <TabsTrigger value="timeline"    className="text-xs rounded-lg">📅 التاريخ {totalEvents>0&&<span className="ms-1 bg-primary/20 text-primary rounded-full text-[10px] px-1.5">{totalEvents}</span>}</TabsTrigger>
          <TabsTrigger value="sessions"    className="text-xs rounded-lg">الجلسات {sessions.length>0&&<span className="ms-1 bg-primary/20 text-primary rounded-full text-[10px] px-1.5">{sessions.length}</span>}</TabsTrigger>
          <TabsTrigger value="physio"      className="text-xs rounded-lg">علاج طبيعي {(physioSessions.length+otSessions.length)>0&&<span className="ms-1 bg-primary/20 text-primary rounded-full text-[10px] px-1.5">{physioSessions.length+otSessions.length}</span>}</TabsTrigger>
          <TabsTrigger value="nursing"     className="text-xs rounded-lg">تمريض {nursingSessions.length>0&&<span className="ms-1 bg-primary/20 text-primary rounded-full text-[10px] px-1.5">{nursingSessions.length}</span>}</TabsTrigger>
          <TabsTrigger value="psych"       className="text-xs rounded-lg">دعم نفسي {psychSessions.length>0&&<span className="ms-1 bg-primary/20 text-primary rounded-full text-[10px] px-1.5">{psychSessions.length}</span>}</TabsTrigger>
          {beneficiary.project==='CBM'&&<TabsTrigger value="family" className="text-xs rounded-lg">توجيه أسري {familySessions.length>0&&<span className="ms-1 bg-primary/20 text-primary rounded-full text-[10px] px-1.5">{familySessions.length}</span>}</TabsTrigger>}
          <TabsTrigger value="devices"     className="text-xs rounded-lg">الأدوات</TabsTrigger>
          <TabsTrigger value="ai"          className="text-xs rounded-lg">🤖 تحليل AI</TabsTrigger>
          <TabsTrigger value="attachments" className="text-xs rounded-lg">📎 المرفقات</TabsTrigger>
          <TabsTrigger value="sdq"         className="text-xs rounded-lg">🧠 SDQ</TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs rounded-lg">📋 التقييمات {myAssessments.length>0&&<span className="ms-1 bg-primary/20 text-primary rounded-full text-[10px] px-1.5">{myAssessments.length}</span>}</TabsTrigger>
        </TabsList>

        {/* ── التاريخ الزمني ── */}
        <TabsContent value="timeline" className="mt-4">
          {timelineEvents.length===0 ? (
            <Card><CardContent className="py-12 text-center"><Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3"/><p className="text-sm text-muted-foreground">لا توجد أحداث مسجلة بعد</p></CardContent></Card>
          ) : (
            <div className="space-y-0">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary"/>
                <p className="text-sm font-medium">{totalEvents} حدث مسجل</p>
                <span className="text-xs text-muted-foreground">— من {timelineEvents[timelineEvents.length-1]?.date} إلى {timelineEvents[0]?.date}</span>
              </div>
              {timelineEvents.map(event => <TimelineItem key={event.id} event={event} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="basic" className="mt-4">
          <Card><CardContent className="p-5 space-y-0">
            <DataRow label="الاسم الرباعي"   value={beneficiary.fullName}/>
            <DataRow label="رقم هوية المصاب" value={beneficiary.nationalId}/>
            <DataRow label="الجنس"            value={beneficiary.gender==='male'?'ذكر':'أنثى'}/>
            <DataRow label="تاريخ الميلاد"    value={beneficiary.dateOfBirth}/>
            <DataRow label="تاريخ الإصابة"    value={beneficiary.injuryDate}/>
            <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-2 border-b border-border/50">
              <span className="text-xs text-muted-foreground sm:w-40 flex-shrink-0 pt-0.5">يوجد إعاقة</span>
              <BoolChip value={beneficiary.hasDisability}/>
            </div>
            <DataRow label="تصنيف المستفيد"  value={beneficiary.classification}/>
            <DataRow label="منطقة السكن"      value={beneficiary.residenceArea}/>
            <DataRow label="اسم الوصي"        value={beneficiary.caregiverName}/>
            <DataRow label="رقم الجوال"       value={beneficiary.phone}/>
            <DataRow label="رقم جوال بديل"   value={beneficiary.alternativePhone}/>
            <DataRow label="نوع الإصابة"      value={beneficiary.injuryType}/>
            <DataRow label="وصف الإصابة"      value={beneficiary.disabilityDescription}/>
            <DataRow label="المشروع"           value={beneficiary.project}/>
            <DataRow label="تاريخ التسجيل"   value={beneficiary.registrationDate}/>
            <DataRow label="ملاحظات عامة"     value={beneficiary.generalNotes}/>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4 space-y-3">
          {sessions.length>0&&(
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{sessionFilterActive?`${filteredSessions.length} من ${sessions.length} جلسة`:`${sessions.length} جلسة`}</p>
                <Button size="sm" variant="ghost" className={`gap-1.5 text-xs h-7 ${sessionFilterActive?'text-primary':'text-muted-foreground'}`} onClick={()=>setShowSessionFilter(v=>!v)}>
                  <SlidersHorizontal className="w-3.5 h-3.5"/>{showSessionFilter?'إخفاء الفلتر':'فلتر الجلسات'}{sessionFilterActive&&<span className="w-1.5 h-1.5 bg-primary rounded-full"/>}
                </Button>
              </div>
              {showSessionFilter&&(
                <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground whitespace-nowrap">من</span><Input type="date" className="h-7 text-xs w-32" value={sessionFilterFrom} onChange={e=>setSessionFilterFrom(e.target.value)}/></div>
                  <div className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground whitespace-nowrap">إلى</span><Input type="date" className="h-7 text-xs w-32" value={sessionFilterTo} onChange={e=>setSessionFilterTo(e.target.value)}/></div>
                  <Select value={sessionFilterType} onValueChange={setSessionFilterType}>
                    <SelectTrigger className="h-7 text-xs w-36"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الخدمات</SelectItem>
                      {['علاج طبيعي','علاج وظيفي','تمريض','دعم نفسي','توجيه أسري'].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {sessionFilterActive&&<Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={()=>{setSessionFilterFrom('');setSessionFilterTo('');setSessionFilterType('all');}}><XIcon className="w-3 h-3"/>مسح</Button>}
                </div>
              )}
            </div>
          )}
          {sessions.length===0 ? (
            <Card><CardContent className="py-12 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3"/>
              <p className="text-sm text-muted-foreground mb-3">لا توجد جلسات مسجلة بعد</p>
              {canAddSession&&<Button size="sm" className="gap-2" onClick={()=>setLocation(`/add-visit/${id}`)}><Plus className="w-4 h-4"/>إضافة أول جلسة</Button>}
            </CardContent></Card>
          ) : filteredSessions.length===0 ? (
            <Card><CardContent className="py-10 text-center"><p className="text-sm text-muted-foreground">لا توجد جلسات تطابق الفلاتر المحددة</p></CardContent></Card>
          ) : filteredSessions.map((s,i)=>(
            <SessionCard key={s.id} session={s} index={i} currentUserId={currentUser?.id}
              canEdit={canEditSession} canDelete={canDeleteSession}
              onDelete={handleDeleteSession} onEdit={s=>setEditingSession({...s})}
            />
          ))}
        </TabsContent>

        <TabsContent value="physio" className="mt-4 space-y-3">
          {(physioSessions.length+otSessions.length)===0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">لا توجد جلسات علاج طبيعي</CardContent></Card> : (
            [...physioSessions,...otSessions].sort((a,b)=>a.serviceDate.localeCompare(b.serviceDate)).map(s=>(
              <Card key={s.id}><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between"><div><p className="font-semibold text-sm">{s.sessionNumber||s.serviceDate}</p><p className="text-xs text-muted-foreground">{s.serviceDate} · {s.providerName}</p></div><div className="flex gap-1.5">{s.serviceTypes.map(t=><Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div></div>
                <div className="grid grid-cols-2 gap-x-4"><DataRow label="مستوى الألم" value={`${s.painLevel}/10`}/>{s.functionalStatus&&<DataRow label="الوضع الوظيفي" value={s.functionalStatus}/>}</div>
                {(s.physioInterventions?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">التدخلات المنفذة</p><TagList items={s.physioInterventions}/></div>}
                {(s.physioModalities?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">وسائل العلاج الفيزيائي</p><TagList items={s.physioModalities}/></div>}
                {(s.physioAssessment?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">التقييم الفيزيائي</p><TagList items={s.physioAssessment}/></div>}
                <DataRow label="الأدوات المتوفرة" value={s.availableDevices}/>
                {s.neededDevices.length>0&&<div><p className="text-xs text-muted-foreground mb-1">أدوات مطلوبة</p><TagList items={s.neededDevices}/></div>}
              </CardContent></Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="nursing" className="mt-4 space-y-3">
          {nursingSessions.length===0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">لا توجد جلسات تمريض</CardContent></Card> : (
            nursingSessions.map(s=>(
              <Card key={s.id}><CardContent className="p-4 space-y-3">
                <div><p className="font-semibold text-sm">{s.sessionNumber||s.serviceDate}</p><p className="text-xs text-muted-foreground">{s.serviceDate} · {s.providerName}</p></div>
                {(s.woundStatus?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">حالة الجرح</p><TagList items={s.woundStatus}/></div>}
                {(s.nursingInterventions?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">التدخل التمريضي</p><TagList items={s.nursingInterventions}/></div>}
                <DataRow label="الأدوات المتوفرة" value={s.availableDevices}/>
              </CardContent></Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="psych" className="mt-4 space-y-3">
          {psychSessions.length===0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">لا توجد جلسات دعم نفسي</CardContent></Card> : (
            psychSessions.map(s=>(
              <Card key={s.id}><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold text-sm">{s.sessionNumber||s.serviceDate}</p><p className="text-xs text-muted-foreground">{s.serviceDate} · {s.providerName}</p></div>
                  {s.traumaLevel&&<span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.traumaLevel==='شديدة'?'bg-red-100 text-red-700':s.traumaLevel==='متوسطة'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>صدمة {s.traumaLevel}</span>}
                </div>
                {s.eventDescription&&<div><p className="text-xs text-muted-foreground mb-1">وصف الحدث</p><div className="p-2.5 rounded-lg bg-muted/50 text-sm">{s.eventDescription}</div></div>}
                {(s.psychState?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">الحالة النفسية</p><TagList items={s.psychState}/></div>}
                {(s.psychInterventions?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">التدخل المقدم</p><TagList items={s.psychInterventions}/></div>}
                {s.psychNotes&&<div className="p-2.5 rounded-lg bg-muted/50 text-sm">{s.psychNotes}</div>}
              </CardContent></Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="family" className="mt-4 space-y-3">
          {familySessions.length===0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">لا توجد جلسات توجيه أسري</CardContent></Card> : (
            familySessions.map(s=>(
              <Card key={s.id}><CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between"><div><p className="font-semibold text-sm">{s.sessionNumber}</p><p className="text-xs text-muted-foreground">{s.serviceDate} · {s.providerName}</p></div><Badge variant="outline" className="text-xs">عدد المستفيدين: {s.beneficiaryCount}</Badge></div>
                {(s.familyGuidanceTopics?.length??0)>0&&<div><p className="text-xs text-muted-foreground mb-1">موضوع الجلسة</p><TagList items={s.familyGuidanceTopics}/></div>}
                <DataRow label="استجابة الأسرة" value={s.familyCooperation}/>
              </CardContent></Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="devices" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">الأدوات المساعدة المطلوبة</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {sessions.length===0 ? <p className="text-sm text-muted-foreground">لا توجد بيانات</p> : (
                sessions.map(s=>{const devices=s.neededDevices.filter(d=>d!=='لا يحتاج أي أداة مساعدة');if(!devices.length)return null;return(
                  <div key={s.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="text-xs text-muted-foreground w-28 flex-shrink-0 pt-0.5">{s.serviceDate}</div>
                    <div className="flex flex-wrap gap-1.5">{devices.map(d=><span key={d} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{d}</span>)}</div>
                  </div>
                );})
              )}
              {sessions.length>0&&sessions.every(s=>s.neededDevices.every(d=>d==='لا يحتاج أي أداة مساعدة')||s.neededDevices.length===0)&&(
                <p className="text-sm text-green-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/>المستفيد لا يحتاج أدوات مساعدة حالياً</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI تحليل الحالة ── */}
        <TabsContent value="ai" className="mt-4">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-primary">
                <Sparkles className="w-4 h-4" />
                تحليل الحالة بالذكاء الاصطناعي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-center">
                  <p className="text-blue-700 font-bold text-lg">{sessions.length}</p>
                  <p className="text-blue-600">إجمالي الجلسات</p>
                </div>
                <div className={`rounded-lg p-2.5 text-center border ${avgPain && parseFloat(avgPain)<=3 ? 'bg-green-50 border-green-200' : avgPain && parseFloat(avgPain)<=6 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`font-bold text-lg ${avgPain && parseFloat(avgPain)<=3 ? 'text-green-700' : avgPain && parseFloat(avgPain)<=6 ? 'text-amber-700' : 'text-red-700'}`}>{avgPain||'—'}</p>
                  <p className="text-muted-foreground">متوسط الألم</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-center">
                  <p className="text-purple-700 font-bold text-lg">{myAssessments.length}</p>
                  <p className="text-purple-600">تقييمات</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                  <p className="text-emerald-700 font-bold text-lg">{sessions.filter(s=>s.sessionResponse==='تحسن ملحوظ'||s.sessionResponse==='تحسن بسيط').length}</p>
                  <p className="text-emerald-600">جلسات تحسن</p>
                </div>
              </div>

              {/* زر التحليل */}
              {!aiSummary && !aiLoading && !aiError && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">اضغط لتوليد ملخص طبي وتأهيلي شامل للحالة</p>
                  <Button onClick={handleAiSummary} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    تحليل الحالة بالذكاء الاصطناعي
                  </Button>
                </div>
              )}

              {/* Loading */}
              {aiLoading && (
                <div className="text-center py-8 space-y-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">جارٍ تحليل بيانات الحالة...</p>
                </div>
              )}

              {/* Error */}
              {aiError && !aiLoading && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm font-medium">{aiError}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAiSummary} className="gap-2">
                    <Loader2 className="w-3.5 h-3.5" />إعادة المحاولة
                  </Button>
                </div>
              )}

              {/* النتيجة */}
              {aiSummary && !aiLoading && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    {renderAiSummary(aiSummary)}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setAiSummary(null); setAiError(null); }}>
                      <XIcon className="w-3.5 h-3.5" />مسح
                    </Button>
                    <Button size="sm" className="gap-1.5 text-xs" onClick={handleAiSummary}>
                      <Sparkles className="w-3.5 h-3.5" />تحديث التحليل
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <AttachmentsTab beneficiaryId={id!} sessions={sessions} language={language} canUpload={canAddSession} />
        </TabsContent>
        <TabsContent value="sdq" className="mt-4">
          <SDQTab beneficiaryId={id!} language={language} canEdit={canAddSession} />
        </TabsContent>
        <TabsContent value="assessments" className="mt-4">
          <AssessmentsTab beneficiaryId={id!} canAdd={canAddSession} />
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-primary"/>تعديل بيانات المستفيد</DialogTitle><DialogDescription>تعديل بيانات المستفيد — رقم الهوية والمشروع غير قابلَين للتعديل.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs font-semibold text-primary border-b pb-1">البيانات الشخصية</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1"><Label className="text-sm">الاسم رباعي *</Label><Input value={editForm.fullName} onChange={e=>setEditForm(f=>({...f,fullName:e.target.value}))}/></div>
              <div className="space-y-1"><Label className="text-sm">رقم الجوال *</Label><Input value={editForm.phone} onChange={e=>setEditForm(f=>({...f,phone:e.target.value}))}/></div>
              <div className="space-y-1"><Label className="text-sm">رقم جوال بديل</Label><Input value={editForm.alternativePhone} onChange={e=>setEditForm(f=>({...f,alternativePhone:e.target.value}))}/></div>
              <div className="space-y-1"><Label className="text-sm">اسم الوصي</Label><Input value={editForm.caregiverName} onChange={e=>setEditForm(f=>({...f,caregiverName:e.target.value}))}/></div>
              <div className="space-y-1"><Label className="text-sm">منطقة السكن</Label><Select value={editForm.residenceArea} onValueChange={v=>setEditForm(f=>({...f,residenceArea:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{GAZA_AREAS.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label className="text-sm">تاريخ الميلاد</Label><Input type="date" value={editForm.dateOfBirth} onChange={e=>setEditForm(f=>({...f,dateOfBirth:e.target.value}))}/></div>
              <div className="space-y-1"><Label className="text-sm">تاريخ الإصابة</Label><Input type="date" value={editForm.injuryDate} onChange={e=>setEditForm(f=>({...f,injuryDate:e.target.value}))}/></div>
            </div>
            <p className="text-xs font-semibold text-primary border-b pb-1 mt-2">التصنيف الطبي</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-sm">نوع الإصابة</Label><Select value={editForm.injuryType} onValueChange={v=>setEditForm(f=>({...f,injuryType:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{INJURY_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label className="text-sm">تصنيف المستفيد</Label><Select value={editForm.classification} onValueChange={v=>setEditForm(f=>({...f,classification:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{BENEFICIARY_CLASSIFICATIONS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg bg-muted/40"><Switch checked={editForm.hasDisability} onCheckedChange={v=>setEditForm(f=>({...f,hasDisability:v}))}/><Label className="text-sm cursor-pointer">يوجد إعاقة لدى المصاب</Label></div>
              <div className="sm:col-span-2 space-y-1"><Label className="text-sm">وصف الإعاقة / الإصابة</Label><Textarea rows={2} value={editForm.disabilityDescription} onChange={e=>setEditForm(f=>({...f,disabilityDescription:e.target.value}))}/></div>
            </div>
            <p className="text-xs font-semibold text-primary border-b pb-1 mt-2">ملاحظات</p>
            <div className="space-y-1"><Label className="text-sm">ملاحظات عامة</Label><Textarea rows={3} value={editForm.generalNotes} onChange={e=>setEditForm(f=>({...f,generalNotes:e.target.value}))}/></div>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={()=>setShowEditDialog(false)} disabled={editLoading}>إلغاء</Button><Button onClick={handleSaveEdit} disabled={!editForm.fullName.trim()||editLoading} className="gap-2"><Pencil className="w-4 h-4"/>{editLoading?'جارٍ الحفظ...':'حفظ التعديلات'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5"/>حذف الحالة نهائياً</DialogTitle><DialogDescription>هذا الإجراء لا يمكن التراجع عنه.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">لتأكيد الحذف، اكتب اسم المستفيد كاملاً:<span className="font-bold block mt-1">{beneficiary.fullName}</span></div>
            <Input placeholder="اكتب الاسم هنا..." value={deleteConfirmInput} onChange={e=>setDeleteConfirmInput(e.target.value)} className="border-red-300"/>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={()=>setShowDeleteDialog(false)} disabled={deleteLoading}>إلغاء</Button><Button variant="destructive" onClick={handleDelete} disabled={deleteConfirmInput!==beneficiary.fullName||deleteLoading} className="gap-2"><Trash2 className="w-4 h-4"/>{deleteLoading?'جارٍ الحذف...':'حذف نهائي'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><XCircle className="w-5 h-5 text-red-500"/>إغلاق الحالة</DialogTitle><DialogDescription>سيتم تغيير حالة المستفيد إلى مغلق.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>سبب الإغلاق *</Label><Select value={closureReason} onValueChange={setClosureReason}><SelectTrigger><SelectValue placeholder="اختر سبب الإغلاق..."/></SelectTrigger><SelectContent>{CLOSURE_REASONS.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>ملاحظات إضافية (اختياري)</Label><Textarea placeholder="أي تفاصيل إضافية..." value={closureNote} onChange={e=>setClosureNote(e.target.value)} rows={3}/></div>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={()=>setShowCloseDialog(false)} disabled={closureLoading}>إلغاء</Button><Button variant="destructive" onClick={handleCloseCase} disabled={!closureReason||closureLoading} className="gap-2"><XCircle className="w-4 h-4"/>{closureLoading?'جارٍ الإغلاق...':'تأكيد الإغلاق'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferDialog} onOpenChange={open=>{if(!open)setShowTransferDialog(false);}}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-violet-600"/>نقل الحالة</DialogTitle><DialogDescription>نقل ملكية هذه الحالة إلى موظف آخر.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-sm">المالك الحالي</Label><div className="p-2.5 rounded-lg bg-muted/50 text-sm text-muted-foreground">{users.find(u=>u.id===beneficiary?.createdBy)?.fullName||'—'}</div></div>
            <div className="space-y-1.5"><Label className="text-sm">نقل إلى *</Label><Select value={transferToUserId} onValueChange={setTransferToUserId}><SelectTrigger><SelectValue placeholder="اختر الموظف..."/></SelectTrigger><SelectContent>{users.filter(u=>u.status==='active'&&u.id!==beneficiary?.createdBy).map(u=><SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label className="text-sm">ملاحظة (اختياري)</Label><Textarea placeholder="سبب النقل..." value={transferNote} onChange={e=>setTransferNote(e.target.value)} rows={2}/></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowTransferDialog(false)} disabled={transferring}>إلغاء</Button><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleTransfer} disabled={!transferToUserId||transferring}>{transferring?'جارٍ النقل...':'تأكيد النقل'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSession} onOpenChange={open=>{if(!open)setEditingSession(null);}}>
        <DialogContent dir="rtl" className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4 text-primary"/>تعديل الجلسة</DialogTitle><DialogDescription>عدّل البيانات ثم اضغط حفظ</DialogDescription></DialogHeader>
          {editingSession&&(
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">تاريخ الجلسة</Label><Input type="date" value={editingSession.serviceDate} onChange={e=>setEditingSession(s=>s?{...s,serviceDate:e.target.value}:s)}/></div>
                <div className="space-y-1.5"><Label className="text-xs">مستوى الألم (0-10)</Label><Input type="number" min={0} max={10} value={editingSession.painLevel} onChange={e=>setEditingSession(s=>s?{...s,painLevel:Number(e.target.value)}:s)}/></div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">أنواع الخدمات</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(editingSession.formType==='CBM'?[...CBM_SERVICE_TYPES]:[...CHURCH_SERVICE_TYPES]).map(type=>{
                    const active=editingSession.serviceTypes.includes(type);
                    return(<button key={type} type="button" onClick={()=>setEditingSession(s=>{if(!s)return s;const types=active?s.serviceTypes.filter(t=>t!==type):[...s.serviceTypes,type];return{...s,serviceTypes:types};})} className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${active?'bg-primary text-primary-foreground border-primary':'bg-background text-muted-foreground border-border'}`}>{type}</button>);
                  })}
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">مقدم الخدمة</Label><Input value={editingSession.providerName} onChange={e=>setEditingSession(s=>s?{...s,providerName:e.target.value}:s)}/></div>
              <div className="space-y-1.5"><Label className="text-xs">المنطقة</Label><Select value={editingSession.serviceArea} onValueChange={v=>setEditingSession(s=>s?{...s,serviceArea:v as typeof s.serviceArea}:s)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{GAZA_AREAS.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
              {editingSession.formType==='CBM'&&<div className="space-y-1.5"><Label className="text-xs">استجابة المستفيد</Label><Select value={editingSession.sessionResponse||''} onValueChange={v=>setEditingSession(s=>s?{...s,sessionResponse:v}:s)}><SelectTrigger><SelectValue placeholder="اختر..."/></SelectTrigger><SelectContent>{['تحسن ملحوظ','تحسن بسيط','بدون تحسن','تدهور'].map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>}
              {editingSession.formType==='CBM'&&<div className="space-y-2 p-3 rounded-lg bg-muted/40"><div className="flex items-center gap-3"><Switch checked={!!editingSession.referralMade} onCheckedChange={v=>setEditingSession(s=>s?{...s,referralMade:v}:s)}/><Label className="text-xs">تمت إحالة</Label></div>{editingSession.referralMade&&<Input placeholder="تفاصيل الإحالة..." value={editingSession.referralDetails||''} onChange={e=>setEditingSession(s=>s?{...s,referralDetails:e.target.value}:s)}/>}</div>}
              <div className="space-y-1.5"><Label className="text-xs">التوصيات</Label><Textarea placeholder="التوصيات..." value={editingSession.recommendations||''} onChange={e=>setEditingSession(s=>s?{...s,recommendations:e.target.value}:s)} rows={2}/></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={()=>setEditingSession(null)} disabled={editSessionSave}>إلغاء</Button><Button onClick={handleSaveEditSession} disabled={editSessionSave}>{editSessionSave?'جارٍ الحفظ...':'حفظ التعديلات'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Zone */}
      <div className="print-zone" aria-hidden="true">
        <div style={{direction:'rtl',fontFamily:"'Noto Sans Arabic', Arial, sans-serif",color:'#000',fontSize:'11pt',lineHeight:1.7}}>
          <div style={{textAlign:'center',borderBottom:'2px solid #1a3a6b',paddingBottom:'14px',marginBottom:'20px'}}>
            <h1 style={{fontSize:'17pt',fontWeight:'bold',color:'#1a3a6b',margin:0}}>نظام إدارة حالات إعادة التأهيل</h1>
            <p style={{fontSize:'10pt',color:'#555',margin:'4px 0 0'}}>{beneficiary.project==='CBM'?'مشروع CBM':'مشروع الكنيسة'} — وثيقة سرية للاستخدام الرسمي فقط</p>
            <p style={{fontSize:'9pt',color:'#888',margin:'2px 0 0'}}>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'})}</p>
          </div>
          {sessions.length>0&&(
            <div>
              <h2 style={{fontSize:'12pt',color:'#1a3a6b',borderBottom:'1px solid #1a3a6b',paddingBottom:'4px',margin:'20px 0 10px'}}>سجل الجلسات</h2>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'9pt'}}>
                <thead><tr>{['#','التاريخ','النوع','الخدمات','مستوى الألم','الاستجابة','مقدم الخدمة'].map(h=><th key={h} style={{background:'#1a3a6b',color:'white',padding:'6px 8px',textAlign:'right'}}>{h}</th>)}</tr></thead>
                <tbody>{sessions.map((s,i)=><tr key={s.id}><td style={{padding:'5px 8px',textAlign:'center'}}>{i+1}</td><td style={{padding:'5px 8px'}}>{s.serviceDate}</td><td style={{padding:'5px 8px'}}>{s.formType}</td><td style={{padding:'5px 8px'}}>{s.serviceTypes.join('، ')}</td><td style={{padding:'5px 8px',textAlign:'center'}}>{s.painLevel}/10</td><td style={{padding:'5px 8px'}}>{s.sessionResponse||'—'}</td><td style={{padding:'5px 8px'}}>{s.providerName}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          <div style={{marginTop:'30px',borderTop:'1px solid #ccc',paddingTop:'10px',fontSize:'9pt',color:'#888',display:'flex',justifyContent:'space-between'}}>
            <span>مستفيد رقم: {beneficiary.id}</span><span>طُبع بواسطة: {currentUser?.fullName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
