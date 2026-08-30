import { useMemo } from 'react';
import { useData } from '@/lib/dataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Users, MapPin, Activity, HeartPulse, FileDown, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GAZA_AREAS, PROJECTS } from '@/data/mockData';

const PIE_COLORS  = ['hsl(215,100%,40%)', 'hsl(340,75%,55%)', 'hsl(160,60%,40%)', 'hsl(30,90%,55%)', 'hsl(270,60%,50%)', 'hsl(50,80%,50%)'];
const AREA_COLOR  = 'hsl(215,100%,40%)';

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Demographics() {
  const { beneficiaries, sessions } = useData();

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,
      XLSX.utils.json_to_sheet(
        (() => {
          const groups: Record<string, number> = { 'أقل من 12': 0, '12–17': 0, '18–30': 0, '31–45': 0, '46–60': 0, '60+': 0 };
          const now = new Date();
          beneficiaries.forEach(b => {
            if (!b.dateOfBirth) return;
            const age = Math.floor((now.getTime() - new Date(b.dateOfBirth).getTime()) / (365.25 * 86400000));
            if      (age < 12)  groups['أقل من 12']++;
            else if (age < 18)  groups['12–17']++;
            else if (age < 31)  groups['18–30']++;
            else if (age < 46)  groups['31–45']++;
            else if (age < 61)  groups['46–60']++;
            else                groups['60+']++;
          });
          return Object.entries(groups).map(([name, value]) => ({ 'الفئة العمرية': name, 'العدد': value }));
        })()
      ), 'الفئات العمرية');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { 'الجنس': 'ذكر',  'العدد': beneficiaries.filter(b => b.gender === 'male').length },
      { 'الجنس': 'أنثى', 'العدد': beneficiaries.filter(b => b.gender === 'female').length },
    ]), 'الجنس');
    const injuryMap: Record<string, number> = {};
    beneficiaries.forEach(b => { if (b.injuryType) injuryMap[b.injuryType] = (injuryMap[b.injuryType] || 0) + 1; });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      Object.entries(injuryMap).sort((a,b)=>b[1]-a[1]).map(([name, count]) => ({ 'نوع الإصابة': name, 'العدد': count }))
    ), 'الإصابات');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      (['مدينة غزة', 'شمال غزة', 'الوسطى', 'خانيونس', 'رفح'] as const).map(area => ({
        'المنطقة': area,
        'مستفيدون': beneficiaries.filter(b => b.residenceArea === area).length,
        'جلسات': sessions.filter(s => s.serviceArea === area).length,
      }))
    ), 'التوزيع الجغرافي');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      PROJECTS.map(p => ({ 'المشروع': p.label, 'العدد': beneficiaries.filter(b => b.project === p.code).length }))
    ), 'المشاريع');
    XLSX.writeFile(wb, `الديموغرافيا_${new Date().toLocaleDateString('ar')}.xlsx`);
  };

  const handlePrint = () => window.print();

  const ageGroups = useMemo(() => {
    const groups: Record<string, number> = { 'أقل من 12': 0, '12–17': 0, '18–30': 0, '31–45': 0, '46–60': 0, '60+': 0 };
    const now = new Date();
    beneficiaries.forEach(b => {
      if (!b.dateOfBirth) return;
      const age = Math.floor((now.getTime() - new Date(b.dateOfBirth).getTime()) / (365.25 * 86400000));
      if      (age < 12)  groups['أقل من 12']++;
      else if (age < 18)  groups['12–17']++;
      else if (age < 31)  groups['18–30']++;
      else if (age < 46)  groups['31–45']++;
      else if (age < 61)  groups['46–60']++;
      else                groups['60+']++;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [beneficiaries]);

  const genderData = useMemo(() => [
    { name: 'ذكر',  value: beneficiaries.filter(b => b.gender === 'male').length },
    { name: 'أنثى', value: beneficiaries.filter(b => b.gender === 'female').length },
  ], [beneficiaries]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = { نشط: 0, مفتوح: 0, مغلق: 0, 'غير نشط': 0 };
    beneficiaries.forEach(b => {
      if (b.caseStatus === 'active')   map['نشط']++;
      else if (b.caseStatus === 'open')     map['مفتوح']++;
      else if (b.caseStatus === 'closed')   map['مغلق']++;
      else                                  map['غير نشط']++;
    });
    return Object.entries(map).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [beneficiaries]);

  const injuryData = useMemo(() => {
    const map: Record<string, number> = {};
    beneficiaries.forEach(b => { if (b.injuryType) map[b.injuryType] = (map[b.injuryType] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  }, [beneficiaries]);

  const areaData = useMemo(() => {
    return GAZA_AREAS.map(area => ({
      name: area,
      مستفيدون: beneficiaries.filter(b => b.residenceArea === area).length,
      جلسات: sessions.filter(s => s.serviceArea === area).length,
    }));
  }, [beneficiaries, sessions]);

  const projectData = useMemo(() => PROJECTS.map(p => ({
    name: p.label,
    value: beneficiaries.filter(b => b.project === p.code).length,
  })), [beneficiaries]);

  const disabilityData = useMemo(() => [
    { name: 'يوجد إعاقة',   value: beneficiaries.filter(b => b.hasDisability).length },
    { name: 'بدون إعاقة', value: beneficiaries.filter(b => !b.hasDisability).length },
  ], [beneficiaries]);

  const renderLabel = ({ name, value }: { name: string; value: number }) => `${name} (${value})`;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />الإحصاء الديموغرافي
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">توزيع المستفيدين حسب الفئة العمرية، الجنس، المنطقة، والإصابة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handlePrint}>
            <Printer className="w-4 h-4" />طباعة
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleExport}>
            <FileDown className="w-4 h-4" />تصدير Excel
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="إجمالي المستفيدين" value={beneficiaries.length} icon={Users}     color="bg-blue-500" />
        <KpiCard label="إجمالي الجلسات"    value={sessions.length}      icon={HeartPulse} color="bg-green-500" />
        <KpiCard label="ذكور"              value={genderData[0]?.value || 0} icon={Users} color="bg-indigo-500" />
        <KpiCard label="إناث"              value={genderData[1]?.value || 0} icon={Users} color="bg-pink-500" />
      </div>

      {/* Row 1: Age + Gender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">التوزيع حسب الفئة العمرية</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ageGroups} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'inherit' }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="مستفيد" fill="hsl(215,100%,40%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">توزيع الجنس</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={renderLabel}>
                  {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Project + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">توزيع المشروع</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={projectData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={renderLabel}>
                  {projectData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">حالة القضايا</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={renderLabel}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Injury type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-primary" />توزيع نوع الإصابة (أعلى 8)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={injuryData} layout="vertical" margin={{ top: 5, right: 30, left: 110, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontFamily: 'inherit' }} width={110} />
              <Tooltip />
              <Bar dataKey="count" name="حالة" fill="hsl(160,60%,40%)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 4: Area */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />التوزيع الجغرافي (مستفيدون وجلسات)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={areaData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'inherit' }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="مستفيدون" fill="hsl(215,100%,40%)" radius={[4,4,0,0]} />
              <Bar dataKey="جلسات"    fill="hsl(160,60%,40%)"  radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Disability */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">توزيع الإعاقة</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={disabilityData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={renderLabel}>
                {disabilityData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
