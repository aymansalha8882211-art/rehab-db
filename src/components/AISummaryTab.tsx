/**
 * AISummaryTab.tsx
 * artifacts/rehab-db/src/components/AISummaryTab.tsx
 *
 * تاب ملخص AI — يولّد تلخيص طبي ذكي للحالة باستخدام Claude API
 * الاستخدام: ضيفه كتاب جديد في BeneficiaryProfile
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { Beneficiary, Session } from '@/data/mockData';

interface Props {
  beneficiary: Beneficiary;
  sessions: Session[];
  language: string;
}

interface SummarySection {
  title: string;
  content: string;
}

export default function AISummaryTab({ beneficiary, sessions, language }: Props) {
  const [loading,   setLoading]   = useState(false);
  const [summary,   setSummary]   = useState<SummarySection[] | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const isAr = language === 'ar';

  const buildPrompt = () => {
    const age = beneficiary.dateOfBirth
      ? new Date().getFullYear() - new Date(beneficiary.dateOfBirth).getFullYear()
      : '—';

    const lastSessions = sessions
      .slice(-5)
      .map((s, i) => `جلسة ${i + 1}: ${s.serviceDate} | خدمات: ${s.serviceTypes.join('، ')} | ألم: ${s.painLevel}/10${s.sessionResponse ? ` | استجابة: ${s.sessionResponse}` : ''}${s.recommendations ? ` | توصيات: ${s.recommendations}` : ''}`)
      .join('\n');

    const avgPain = sessions.length > 0
      ? (sessions.reduce((a, s) => a + s.painLevel, 0) / sessions.length).toFixed(1)
      : '—';

    const trend = sessions.length >= 2
      ? sessions[sessions.length - 1].painLevel < sessions[0].painLevel ? 'تحسن' : sessions[sessions.length - 1].painLevel > sessions[0].painLevel ? 'تدهور' : 'ثابت'
      : '—';

    return `أنت طبيب تأهيل متخصص. بناءً على البيانات التالية، أعطِ ملخصاً سريرياً موجزاً ومفيداً للفريق الطبي الميداني.

معلومات المستفيد:
- الاسم: ${beneficiary.fullName}
- العمر: ${age} سنة
- الجنس: ${beneficiary.gender === 'male' ? 'ذكر' : 'أنثى'}
- المنطقة: ${beneficiary.residenceArea}
- نوع الإصابة: ${beneficiary.injuryType}
- التصنيف: ${beneficiary.classification}
- إعاقة: ${beneficiary.hasDisability ? 'نعم - ' + (beneficiary.disabilityDescription || '') : 'لا'}
- المشروع: ${beneficiary.project}
- حالة الملف: ${beneficiary.caseStatus === 'active' ? 'نشط' : 'مغلق'}

إحصائيات الجلسات:
- إجمالي الجلسات: ${sessions.length}
- متوسط مستوى الألم: ${avgPain}/10
- اتجاه الألم: ${trend}
- آخر 5 جلسات:
${lastSessions || 'لا توجد جلسات'}

ملاحظات عامة: ${beneficiary.generalNotes || 'لا توجد'}

اكتب ملخصاً سريرياً منظماً بالأقسام التالية بالضبط (JSON فقط، لا تضف أي نص خارج الـ JSON):
{
  "sections": [
    {"title": "الوضع الراهن", "content": "..."},
    {"title": "مسار التأهيل", "content": "..."},
    {"title": "نقاط القلق", "content": "..."},
    {"title": "التوصيات المقترحة", "content": "..."}
  ]
}`;
  };

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: buildPrompt() }],
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const text = data.content?.[0]?.text || '';

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('فشل تحليل الرد');

      const parsed = JSON.parse(jsonMatch[0]);
      setSummary(parsed.sections);
      setGenerated(new Date().toLocaleString('ar-EG'));
    } catch (err) {
      console.error('AI summary error:', err);
      setError(isAr ? 'فشل توليد الملخص. تأكد من الاتصال بالإنترنت وحاول مجدداً.' : 'Failed to generate summary. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const sectionColors: Record<string, string> = {
    'الوضع الراهن':         'border-blue-200 bg-blue-50/50',
    'مسار التأهيل':         'border-green-200 bg-green-50/50',
    'نقاط القلق':           'border-amber-200 bg-amber-50/50',
    'التوصيات المقترحة':   'border-purple-200 bg-purple-50/50',
  };

  const sectionTitleColors: Record<string, string> = {
    'الوضع الراهن':         'text-blue-700',
    'مسار التأهيل':         'text-green-700',
    'نقاط القلق':           'text-amber-700',
    'التوصيات المقترحة':   'text-purple-700',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? 'ملخص سريري ذكي مولَّد بواسطة Claude AI بناءً على بيانات الحالة والجلسات'
              : 'AI-generated clinical summary based on case data and sessions'}
          </p>
          {generated && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {isAr ? `آخر تحديث: ${generated}` : `Last generated: ${generated}`}
            </p>
          )}
        </div>
        <Button
          onClick={generateSummary}
          disabled={loading}
          className="gap-2"
          size="sm"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : summary
              ? <RefreshCw className="w-4 h-4" />
              : <Sparkles className="w-4 h-4" />}
          {loading
            ? (isAr ? 'جارٍ التوليد...' : 'Generating...')
            : summary
              ? (isAr ? 'إعادة التوليد' : 'Regenerate')
              : (isAr ? 'توليد الملخص' : 'Generate Summary')}
        </Button>
      </div>

      {/* Empty state */}
      {!summary && !loading && !error && (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-medium">
              {isAr ? 'لم يتم توليد ملخص بعد' : 'No summary generated yet'}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {isAr
                ? `اضغط "توليد الملخص" للحصول على تحليل سريري ذكي لهذه الحالة (${sessions.length} جلسة)`
                : `Click "Generate Summary" for an AI clinical analysis (${sessions.length} sessions)`}
            </p>
            <Button onClick={generateSummary} size="sm" className="gap-2 mt-2">
              <Sparkles className="w-4 h-4" />
              {isAr ? 'توليد الملخص' : 'Generate Summary'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              {isAr ? 'Claude يحلّل بيانات الحالة...' : 'Claude is analyzing case data...'}
            </p>
            <p className="text-xs text-muted-foreground/60">
              {isAr ? 'قد يستغرق 10-20 ثانية' : 'May take 10-20 seconds'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm text-destructive">{error}</p>
            <Button onClick={generateSummary} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {isAr ? 'إعادة المحاولة' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary sections */}
      {summary && !loading && (
        <div className="space-y-3">
          {summary.map((section, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 space-y-2 ${sectionColors[section.title] || 'border-border bg-muted/30'}`}
            >
              <p className={`text-sm font-semibold ${sectionTitleColors[section.title] || 'text-foreground'}`}>
                {section.title}
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {section.content}
              </p>
            </div>
          ))}

          {/* Disclaimer */}
          <p className="text-[11px] text-muted-foreground/60 text-center pt-2">
            {isAr
              ? '⚠️ هذا الملخص مولَّد بالذكاء الاصطناعي للمساعدة فقط — لا يُغني عن التقييم الطبي المتخصص'
              : '⚠️ AI-generated for assistance only — does not replace professional medical assessment'}
          </p>
        </div>
      )}
    </div>
  );
}
