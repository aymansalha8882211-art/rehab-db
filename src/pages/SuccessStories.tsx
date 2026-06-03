import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useData } from '@/lib/dataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Search, ChevronRight, Printer, BookOpen } from 'lucide-react';

export default function SuccessStories() {
  const [, setLocation] = useLocation();
  const { sessions, beneficiaries } = useData();

  const [searchText,    setSearchText]    = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Sessions marked as success stories
  const stories = useMemo(() => {
    return sessions
      .filter(s => s.successStory === true)
      .map(s => ({
        session: s,
        beneficiary: beneficiaries.find(b => b.id === s.beneficiaryId),
      }))
      .filter(({ beneficiary }) => !!beneficiary)
      .sort((a, b) => b.session.serviceDate.localeCompare(a.session.serviceDate));
  }, [sessions, beneficiaries]);

  const filtered = useMemo(() => {
    return stories.filter(({ session, beneficiary }) => {
      if (projectFilter !== 'all' && session.formType !== projectFilter) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        if (
          !beneficiary!.fullName.toLowerCase().includes(q) &&
          !beneficiary!.nationalId.includes(searchText) &&
          !(session.successStoryText || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [stories, projectFilter, searchText]);

  const handlePrint = () => window.print();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
            قصص النجاح
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            حالات موثَّقة بتحسن ملحوظ وموافقة على التوثيق والنشر
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-100 text-yellow-700 border-0 text-sm px-3 py-1">
            {stories.length} قصة
          </Badge>
          <Button variant="outline" size="sm" className="gap-2 text-xs print:hidden" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" />طباعة
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 right-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو رقم الهوية أو نص القصة..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="المشروع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="CBM">CBM</SelectItem>
            <SelectItem value="Church">Church</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-medium text-sm">
              {stories.length === 0
                ? 'لا توجد قصص نجاح بعد'
                : 'لا توجد نتائج تطابق البحث'}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {stories.length === 0
                ? 'عند تسجيل جلسة CBM، فعّل خيار "قصة نجاح" واكتب تفاصيل القصة.'
                : 'جرب تغيير كلمة البحث أو فلتر المشروع.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Story cards */}
      <div className="space-y-4">
        {filtered.map(({ session, beneficiary }) => (
          <Card key={session.id} className="overflow-hidden border-yellow-200/60">
            <div className="h-1 bg-gradient-to-l from-yellow-400 to-yellow-300" />
            <CardContent className="p-5 space-y-3">
              {/* Beneficiary row */}
              <div className="flex items-center justify-between gap-3">
                <div
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setLocation(`/beneficiary/${beneficiary!.id}`)}
                >
                  <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-yellow-700">{beneficiary!.fullName.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{beneficiary!.fullName}</p>
                    <p className="text-xs text-muted-foreground">{beneficiary!.nationalId} · {beneficiary!.residenceArea}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge className={`text-[10px] border-0 ${session.formType === 'CBM' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {session.formType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{session.serviceDate}</span>
                </div>
              </div>

              {/* Story text */}
              {session.successStoryText ? (
                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200/60">
                  <div className="flex gap-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed text-foreground">{session.successStoryText}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/40 border border-dashed border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    لم تُكتب تفاصيل القصة — يمكن تعديل الجلسة لإضافتها
                  </p>
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
                <span>مقدم الخدمة: <strong className="text-foreground">{session.providerName || '—'}</strong></span>
                <span>·</span>
                <span>الخدمات: <strong className="text-foreground">{session.serviceTypes.join('، ')}</strong></span>
                {session.injuryType && (
                  <>
                    <span>·</span>
                    <span>الإصابة: <strong className="text-foreground">{session.injuryType}</strong></span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Print-only list */}
      <div className="hidden print:block space-y-6 mt-4">
        <h1 style={{ textAlign: 'center', fontSize: '18pt', fontWeight: 'bold', color: '#1a3a6b' }}>
          قصص النجاح — نظام إدارة حالات إعادة التأهيل
        </h1>
        {filtered.map(({ session, beneficiary }, i) => (
          <div key={session.id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '16px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '12pt' }}>{i + 1}. {beneficiary!.fullName} — {session.serviceDate}</p>
            <p style={{ fontSize: '10pt', color: '#555', marginTop: '2px' }}>
              {beneficiary!.nationalId} · {beneficiary!.residenceArea} · {session.formType}
            </p>
            {session.successStoryText && (
              <p style={{ fontSize: '11pt', marginTop: '8px', lineHeight: 1.8 }}>{session.successStoryText}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
