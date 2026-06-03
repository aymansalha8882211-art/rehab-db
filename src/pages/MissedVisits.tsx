import { useState, useMemo } from 'react';
import { useData } from '@/lib/dataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import * as XLSX from 'xlsx';
import { UserX, Search, MapPin, Phone, Calendar, FileDown, AlertTriangle, Clock } from 'lucide-react';
import { GAZA_AREAS } from '@/data/mockData';

const THRESHOLD_DAYS = 30;

export default function MissedVisits() {
  const { beneficiaries, sessions } = useData();
  const [searchQ, setSearchQ]       = useState('');
  const [projectF, setProjectF]     = useState('all');
  const [areaF, setAreaF]           = useState('all');
  const [sortBy, setSortBy]         = useState<'days' | 'name'>('days');

  const today = new Date();
  const thresholdStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - THRESHOLD_DAYS);
    return d.toISOString().split('T')[0];
  })();

  const rows = useMemo(() => {
    return beneficiaries
      .filter(b => b.caseStatus !== 'closed')
      .map(b => {
        const benSessions = sessions.filter(s => s.beneficiaryId === b.id);
        const lastDate = benSessions.length > 0
          ? [...benSessions].sort((a, z) => z.serviceDate.localeCompare(a.serviceDate))[0].serviceDate
          : null;
        const daysSince = lastDate
          ? Math.floor((today.getTime() - new Date(lastDate).getTime()) / 86400000)
          : null;
        const isOverdue = !lastDate || lastDate < thresholdStr;
        return { ...b, lastDate, daysSince, sessionCount: benSessions.length, isOverdue };
      })
      .filter(r => r.isOverdue);
  }, [beneficiaries, sessions, thresholdStr]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (projectF !== 'all' && r.project !== projectF) return false;
      if (areaF !== 'all' && r.residenceArea !== areaF) return false;
      if (searchQ.trim()) {
        const q = searchQ.trim();
        if (!r.fullName.includes(q) && !r.nationalId.includes(q) && !r.phone.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
      const da = a.daysSince ?? 9999;
      const db = b.daysSince ?? 9999;
      return db - da;
    });
  }, [rows, projectF, areaF, searchQ, sortBy]);

  const priorityColor = (days: number | null) => {
    if (days === null || days > 90) return 'bg-red-100 text-red-700 border-red-200';
    if (days > 60) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  const handleExport = () => {
    const rows2 = filtered.map(r => ({
      'الاسم': r.fullName,
      'رقم الهوية': r.nationalId,
      'الجوال': r.phone,
      'المشروع': r.project,
      'المنطقة': r.residenceArea,
      'حالة الملف': r.caseStatus,
      'آخر جلسة': r.lastDate || 'لم تُسجَّل بعد',
      'أيام منذ آخر جلسة': r.daysSince ?? 'لا جلسات',
      'إجمالي الجلسات': r.sessionCount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows2);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الزيارات الفائتة');
    XLSX.writeFile(wb, `زيارات_فائتة_${new Date().toLocaleDateString('ar')}.xlsx`);
  };

  const groupsByDays = [
    { label: '90+ يوم (عاجل جداً)', min: 90,  color: 'text-red-700',    bg: 'border-red-200 bg-red-50/50' },
    { label: '60–90 يوم (عاجل)',      min: 60, max: 89,  color: 'text-orange-700', bg: 'border-orange-200 bg-orange-50/50' },
    { label: '30–59 يوم (متأخر)',      min: 30, max: 59,  color: 'text-amber-700',  bg: 'border-amber-200 bg-amber-50/50' },
  ];

  return (
    <div className="p-6 space-y-5" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <UserX className="w-5 h-5 text-destructive" />الزيارات الفائتة
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            الحالات النشطة التي لم تتلقَّ جلسة منذ {THRESHOLD_DAYS} يوماً أو أكثر
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleExport} disabled={filtered.length === 0}>
          <FileDown className="w-4 h-4" />تصدير Excel
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {groupsByDays.map(g => {
          const count = rows.filter(r => {
            const d = r.daysSince ?? 9999;
            return d >= g.min && (g.max === undefined || d <= (g.max ?? Infinity));
          }).length;
          return (
            <Card key={g.label} className={`border ${g.bg}`}>
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${g.color}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{g.label}</p>
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-gray-200 bg-gray-50/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-gray-700">{rows.filter(r => r.daysSince === null).length}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">بدون أي جلسة</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute top-2.5 right-3 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم / الهوية / الجوال..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="pr-9" />
        </div>
        <Select value={projectF} onValueChange={setProjectF}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المشاريع</SelectItem>
            <SelectItem value="CBM">CBM</SelectItem>
            <SelectItem value="Church">Church</SelectItem>
          </SelectContent>
        </Select>
        <Select value={areaF} onValueChange={setAreaF}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المناطق</SelectItem>
            {GAZA_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="days">ترتيب بالأقدمية</SelectItem>
            <SelectItem value="name">ترتيب بالاسم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <UserX className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {rows.length === 0 ? 'لا توجد حالات فائتة — عمل ممتاز!' : 'لا توجد نتائج مطابقة للفلاتر'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">{filtered.length} حالة — الأولوية للأقدم</p>
          {filtered.map(r => (
            <Card key={r.id} className={`border ${r.daysSince === null || r.daysSince > 90 ? 'border-red-200' : r.daysSince > 60 ? 'border-orange-200' : 'border-amber-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className={`w-4 h-4 ${r.daysSince === null || r.daysSince > 90 ? 'text-red-500' : r.daysSince > 60 ? 'text-orange-500' : 'text-amber-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/beneficiary/${r.id}`} className="font-semibold text-sm hover:text-primary hover:underline">
                        {r.fullName}
                      </Link>
                      <Badge className={`text-[10px] border-0 ${r.project === 'CBM' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {r.project}
                      </Badge>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityColor(r.daysSince)}`}>
                        {r.daysSince !== null ? `${r.daysSince} يوم` : 'بدون جلسات'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.residenceArea}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />
                        {r.lastDate ? `آخر جلسة: ${r.lastDate}` : 'لم تُسجَّل أي جلسة'}
                      </span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.sessionCount} جلسة مسجّلة</span>
                    </div>
                  </div>
                  <Link href={`/beneficiary/${r.id}`}>
                    <Button size="sm" variant="outline" className="text-xs flex-shrink-0">فتح الملف</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
