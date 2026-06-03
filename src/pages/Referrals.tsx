import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useData } from '@/lib/dataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, Search, ChevronRight, ExternalLink } from 'lucide-react';

export default function Referrals() {
  const [, setLocation] = useLocation();
  const { sessions, beneficiaries } = useData();

  const [searchText,    setSearchText]    = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');

  const referrals = useMemo(() => {
    return sessions
      .filter(s => s.referralMade === true)
      .map(s => ({ session: s, beneficiary: beneficiaries.find(b => b.id === s.beneficiaryId) }))
      .filter(r => !!r.beneficiary)
      .sort((a, b) => b.session.serviceDate.localeCompare(a.session.serviceDate));
  }, [sessions, beneficiaries]);

  const filtered = useMemo(() => {
    return referrals.filter(({ session, beneficiary }) => {
      if (projectFilter !== 'all' && session.formType !== projectFilter) return false;
      if (dateFrom && session.serviceDate < dateFrom) return false;
      if (dateTo   && session.serviceDate > dateTo)   return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        if (!beneficiary!.fullName.toLowerCase().includes(q) && !beneficiary!.nationalId.includes(searchText)) return false;
      }
      return true;
    });
  }, [referrals, projectFilter, dateFrom, dateTo, searchText]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            الإحالات
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            جميع حالات الإحالة المسجّلة ضمن الجلسات
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-0 text-sm px-3 py-1">
          {referrals.length} إحالة
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute top-2.5 right-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو رقم الهوية..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="المشروع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="CBM">CBM</SelectItem>
            <SelectItem value="Church">Church</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="من" />
        <Input type="date" className="w-36" value={dateTo}   onChange={e => setDateTo(e.target.value)}   placeholder="إلى" />
        {(dateFrom || dateTo || searchText || projectFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchText(''); setProjectFilter('all'); setDateFrom(''); setDateTo(''); }}>
            مسح
          </Button>
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        عرض {filtered.length} من أصل {referrals.length} إحالة
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-2">
            <ArrowRightLeft className="w-9 h-9 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {referrals.length === 0
                ? 'لا توجد إحالات مسجّلة بعد — تُسجَّل الإحالات من خلال نموذج جلسة CBM'
                : 'لا توجد نتائج تطابق الفلاتر المحددة'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ session, beneficiary }) => (
            <Card key={session.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
                    onClick={() => setLocation(`/beneficiary/${beneficiary!.id}`)}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{beneficiary!.fullName.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{beneficiary!.fullName}</p>
                      <p className="text-xs text-muted-foreground">{beneficiary!.nationalId} · {beneficiary!.residenceArea}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-[10px] border-0 ${session.formType === 'CBM' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {session.formType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{session.serviceDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground flex-shrink-0">مقدم الخدمة:</span>
                    <span className="font-medium">{session.providerName || '—'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground flex-shrink-0">الخدمات:</span>
                    <span className="font-medium">{session.serviceTypes.join('، ')}</span>
                  </div>
                </div>

                {session.referralDetails && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                    <span className="text-xs text-blue-600 font-medium block mb-1">تفاصيل الإحالة:</span>
                    <p className="text-blue-900">{session.referralDetails}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="ghost" size="sm"
                    className="text-xs gap-1.5 text-primary"
                    onClick={() => setLocation(`/beneficiary/${beneficiary!.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    فتح ملف المستفيد
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
