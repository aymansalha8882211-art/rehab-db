import { useEffect, useState } from 'react';
import { useData } from '@/lib/dataContext';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Assessment } from '@/data/mockData';
import { ClipboardList, Plus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground sm:w-44 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function Tags({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="py-1.5 border-b border-border/40 last:border-0">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(i => <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{i}</span>)}
      </div>
    </div>
  );
}

function Bool({ label, value }: { label: string; value?: boolean }) {
  if (value === undefined) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{value ? 'نعم' : 'لا'}</span>
    </div>
  );
}

function GadScore({ total }: { total?: number }) {
  if (total === undefined) return null;
  const level = total <= 4 ? { label: 'خفيف أو لا يوجد', color: 'bg-green-100 text-green-700' }
              : total <= 9 ? { label: 'قلق خفيف',         color: 'bg-yellow-100 text-yellow-700' }
              : total <= 14 ? { label: 'قلق متوسط',        color: 'bg-orange-100 text-orange-700' }
              : { label: 'قلق شديد',                        color: 'bg-red-100 text-red-700' };
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">مجموع GAD-7</span>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{total}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${level.color}`}>{level.label}</span>
      </div>
    </div>
  );
}

function AssessmentCard({ a, index }: { a: Assessment; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const hasPain      = a.painPresent;
  const hasPhysio    = !!(a.jointRom || a.muscleTest);
  const hasFim       = !!(a.fimBedChair || a.fimToilet);
  const hasGad       = a.gadTotal !== undefined;
  const hasSdq       = a.sdqTotal !== undefined;
  const hasOutcomes  = !!(a.majorProblems || (a.shortTermGoals?.length));

  return (
    <Card className="border-border/70">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {index + 1}
            </div>
            <div>
              <p className="font-semibold text-sm">{a.assessmentDate}</p>
              <p className="text-xs text-muted-foreground">
                {a.sessionNumber && `${a.sessionNumber} · `}
                {a.groups?.join('، ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {hasPain     && <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">ألم {a.painScore}/10</Badge>}
            {hasGad      && <Badge variant="outline" className="text-[10px] text-pink-600 border-pink-200">GAD {a.gadTotal}</Badge>}
            {hasSdq      && <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">SDQ {a.sdqTotal}</Badge>}
            {a.photoConsent && <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">📷 موافقة</Badge>}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-muted-foreground">البتر</p>
            <p className="font-medium mt-0.5">{a.amputationSide || '—'}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-muted-foreground">الألم</p>
            <p className={`font-bold text-base ${!a.painPresent ? 'text-green-600' : a.painScore! <= 3 ? 'text-green-600' : a.painScore! <= 6 ? 'text-amber-600' : 'text-red-600'}`}>
              {a.painPresent ? `${a.painScore}/10` : 'لا يوجد'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-muted-foreground">GAD-7</p>
            <p className="font-bold text-base">{a.gadTotal ?? '—'}</p>
          </div>
        </div>

        <button type="button" onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs text-primary hover:underline">
          {expanded ? <><ChevronUp className="w-3 h-3"/>إخفاء التفاصيل</> : <><ChevronDown className="w-3 h-3"/>عرض التفاصيل الكاملة</>}
        </button>

        {expanded && (
          <div className="pt-2 space-y-4 border-t border-border/50">

            {/* البتر */}
            {(a.amputationSide || a.amputationDate) && (
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-2">🦾 تقييم البتر</p>
                <div className="space-y-0">
                  <Row label="جانب البتر"    value={a.amputationSide} />
                  <Row label="تاريخ البتر"   value={a.amputationDate} />
                  <Row label="مستوى البتر"   value={a.amputationLevel?.join('، ')} />
                  <Row label="شكل الجذع"     value={a.stumpShape} />
                  <Row label="محيط الجذع"    value={a.stumpCircumference ? `${a.stumpCircumference} سم` : null} />
                  <Bool label="طرف صناعي متاح" value={a.hasProsthesis} />
                  <Tags label="حالة الجذع"   items={a.stumpCondition} />
                </div>
              </div>
            )}

            {/* الألم */}
            {hasPain && (
              <div>
                <p className="text-xs font-semibold text-red-700 mb-2">💢 تقييم الألم</p>
                <div className="space-y-0">
                  <Row label="مكان الألم"    value={a.painLocation} />
                  <Tags label="وصف الألم"    items={a.painDescription} />
                  <Row label="ما يزيد الألم" value={a.painIncreases} />
                  <Row label="ما يخفف الألم" value={a.painDecreases} />
                  <Row label="درجة الألم"    value={`${a.painScore}/10`} />
                </div>
              </div>
            )}

            {/* العلاج الطبيعي */}
            {hasPhysio && (
              <div>
                <p className="text-xs font-semibold text-purple-700 mb-2">🏃 التقييم الفيزيائي</p>
                <div className="space-y-0">
                  <Row label="ROM"           value={a.jointRom} />
                  <Bool label="ROM مقيّد"    value={a.romRestricted} />
                  <Row label="اختبار العضلات" value={a.muscleTest} />
                  <Row label="قوة العضلات"   value={a.musclePower} />
                  <Bool label="التوازن طبيعي" value={a.balance} />
                </div>
              </div>
            )}

            {/* FIM */}
            {hasFim && (
              <div>
                <p className="text-xs font-semibold text-teal-700 mb-2">🪑 تقييم FIM</p>
                <div className="space-y-0">
                  <Row label="السرير ↔ الكرسي"  value={a.fimBedChair} />
                  <Row label="المرحاض"           value={a.fimToilet} />
                  <Row label="الحمام"            value={a.fimTubShower} />
                  <Row label="المشي / الكرسي"    value={a.fimWalkWheelchair} />
                  <Row label="السلالم"           value={a.fimStairs} />
                </div>
              </div>
            )}

            {/* GAD-7 */}
            {hasGad && (
              <div>
                <p className="text-xs font-semibold text-pink-700 mb-2">🧠 GAD-7</p>
                <GadScore total={a.gadTotal} />
              </div>
            )}

            {/* SDQ */}
            {hasSdq && (
              <div>
                <p className="text-xs font-semibold text-indigo-700 mb-2">👧 SDQ</p>
                <Row label="المجموع الكلي" value={a.sdqTotal} />
              </div>
            )}

            {/* المخرجات */}
            {hasOutcomes && (
              <div>
                <p className="text-xs font-semibold text-primary mb-2">🎯 المخرجات وخطة التدخل</p>
                <div className="space-y-0">
                  <Row label="المشاكل الرئيسية"        value={a.majorProblems} />
                  <Tags label="الخدمات المطلوبة"        items={a.servicesRequired} />
                  <Row label="تفاصيل الإحالة"           value={a.servicesReferral} />
                  <Tags label="أهداف قصيرة المدى"       items={a.shortTermGoals} />
                  <Tags label="أهداف طويلة المدى"       items={a.longTermGoals} />
                  <Tags label="خطة العلاج"              items={a.planOfTreatment} />
                  <Row label="التحسن (علاج طبيعي)"      value={a.improvementSinceLast} />
                  <Row label="التحسن (نفسي)"             value={a.improvementSinceLastPss} />
                  <Row label="تاريخ الخروج (علاج طبيعي)" value={a.dischargeDatePhisp} />
                  <Row label="تاريخ الخروج (دعم نفسي)"   value={a.dischargeDatePss} />
                  <Row label="ملاحظات"                   value={a.notes} />
                  <Tags label="توقيع الفريق"             items={a.signature} />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AssessmentsTab({
  beneficiaryId,
  canAdd,
}: {
  beneficiaryId: string;
  canAdd: boolean;
}) {
  const [, setLocation] = useLocation();
  const { getAssessments, assessments: allAssessments } = useData();
  const [loading, setLoading] = useState(true);
  const [loaded,  setLoaded]  = useState(false);

  const myAssessments = allAssessments
    .filter(a => a.beneficiaryId === beneficiaryId)
    .sort((a, b) => b.assessmentDate.localeCompare(a.assessmentDate));

  useEffect(() => {
    if (loaded) return;
    setLoading(true);
    getAssessments(beneficiaryId).finally(() => {
      setLoading(false);
      setLoaded(true);
    });
  }, [beneficiaryId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canAdd && (
        <Button className="w-full gap-2" variant="outline" onClick={() => setLocation(`/assessment/${beneficiaryId}`)}>
          <Plus className="w-4 h-4" />إضافة تقييم شامل جديد
        </Button>
      )}

      {myAssessments.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <ClipboardList className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">لا توجد تقييمات شاملة بعد</p>
            {canAdd && (
              <Button size="sm" className="gap-2" onClick={() => setLocation(`/assessment/${beneficiaryId}`)}>
                <Plus className="w-4 h-4" />إضافة أول تقييم
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{myAssessments.length} تقييم شامل</p>
          {myAssessments.map((a, i) => (
            <AssessmentCard key={a.id} a={a} index={i} />
          ))}
        </>
      )}
    </div>
  );
}
