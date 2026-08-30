import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useData } from '@/lib/dataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import {
  Users, Activity, Heart, Stethoscope, Brain, Wrench,
  TrendingUp, Clock, Plus, CalendarCheck, User, Search,
  AlertTriangle, CheckCircle2, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GAZA_AREAS, PROJECTS, getProject} from '@/data/mockData';

const COLORS = ['hsl(215,100%,35%)', 'hsl(160,60%,45%)', 'hsl(30,90%,55%)', 'hsl(340,75%,55%)', 'hsl(270,60%,55%)'];

export default function Dashboard() {
  const { language }    = useLanguage();
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const { beneficiaries, sessions, alerts } = useData();

  // ─── بحث سريع ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return [];
    return beneficiaries.filter(b =>
      b.fullName.includes(q) || b.nationalId.includes(q)
    ).slice(0, 5);
  }, [searchQuery, beneficiaries]);

  const isExactMatch = searchQuery.length >= 9 && beneficiaries.find(b => b.nationalId === searchQuery.trim());

  // ─── هل المستخدم مدير أو مشرف ────────────────────────
  const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';

  // ─── إحصاءات الموظف الشخصية ──────────────────────────
  const myStats = useMemo(() => {
    if (isPrivileged || !currentUser) return null;
    const nameParts = currentUser.fullName?.split(' ') || [];
    const firstName = nameParts[0] || '';
    const lastName  = nameParts[nameParts.length - 1] || '';
    const mySessions = sessions.filter(s =>
      s.providerName?.includes(firstName) ||
      s.providerName?.includes(lastName) ||
      s.providerName === currentUser.fullName
    );
    const myBeneficiaries = new Set(mySessions.map(s => s.beneficiaryId));
    const lastSession = [...mySessions].sort((a,b) => b.serviceDate.localeCompare(a.serviceDate))[0];
    const monthly = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (2 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('ar-EG', { month: 'short' });
      return { month: label, جلسات: mySessions.filter(s => s.serviceDate.startsWith(key)).length };
    });
    const serviceTypes: Record<string, number> = {};
    mySessions.forEach(s => (s.serviceTypes||[]).forEach((t: string) => { serviceTypes[t] = (serviceTypes[t]||0)+1; }));
    return { totalSessions: mySessions.length, totalBeneficiaries: myBeneficiaries.size, lastDate: lastSession?.serviceDate||'—', monthly, serviceTypes };
  }, [sessions, currentUser, isPrivileged]);

  // ─── إحصاءات عامة ─────────────────────────────────────
  const totalCases     = beneficiaries.length;
  const totalSessions  = sessions.length;
  const physioCount    = sessions.filter(s => s.serviceTypes?.includes('علاج طبيعي')).length;
  const nursingCount   = sessions.filter(s => s.serviceTypes?.includes('تمريض')).length;
  const psychCount     = sessions.filter(s => s.serviceTypes?.includes('دعم نفسي')).length;
  const otCount        = sessions.filter(s => s.serviceTypes?.includes('علاج وظيفي')).length;
  const familyCount    = sessions.filter(s => s.serviceTypes?.includes('توجيه أسري')).length;
  const pendingDevices = sessions.filter(s => s.neededDevices?.some((d: string) => d !== 'لا يحتاج أي أداة مساعدة')).length;

  const genderData  = [
    { name: 'ذكر',  value: beneficiaries.filter(b=>b.gender==='male').length },
    { name: 'أنثى', value: beneficiaries.filter(b=>b.gender==='female').length },
  ];
  const projectData = PROJECTS.map(p => ({
    name: p.label,
    value: beneficiaries.filter(b => b.project === p.code).length,
  }));
  const serviceData = [
    { name:'علاج طبيعي', count:physioCount },{ name:'علاج وظيفي', count:otCount },
    { name:'تمريض', count:nursingCount },{ name:'دعم نفسي', count:psychCount },{ name:'توجيه أسري', count:familyCount },
  ];
  const areaData = GAZA_AREAS.map(area => ({ name:area, count:beneficiaries.filter(b=>b.residenceArea===area).length }));
  const visitsTimeData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-(5-i));
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return { month: d.toLocaleDateString('ar-EG',{month:'short'}), جلسات: sessions.filter(s=>s.serviceDate.startsWith(key)).length };
  }), [sessions]);

  const todayStr          = new Date().toISOString().split('T')[0];
  const todaySessionCount = sessions.filter(s=>s.serviceDate===todayStr).length;

  const kpis = [
    { labelAr:'جلسات اليوم',       value:todaySessionCount, icon:CalendarCheck, color:'text-emerald-600', bg:'bg-emerald-50' },
    { labelAr:'إجمالي الحالات',    value:totalCases,        icon:Users,         color:'text-blue-600',   bg:'bg-blue-50',   href:'/search' },
    { labelAr:'إجمالي الجلسات',    value:totalSessions,     icon:Activity,      color:'text-green-600',  bg:'bg-green-50' },
    { labelAr:'علاج طبيعي',        value:physioCount,       icon:Heart,         color:'text-purple-600', bg:'bg-purple-50' },
    { labelAr:'علاج وظيفي',        value:otCount,           icon:Wrench,        color:'text-teal-600',   bg:'bg-teal-50' },
    { labelAr:'تمريض',             value:nursingCount,      icon:Stethoscope,   color:'text-orange-600', bg:'bg-orange-50' },
    { labelAr:'دعم نفسي',          value:psychCount,        icon:Brain,         color:'text-pink-600',   bg:'bg-pink-50' },
    { labelAr:'توجيه أسري',        value:familyCount,       icon:Users,         color:'text-indigo-600', bg:'bg-indigo-50' },
    { labelAr:'يحتاج أداة مساعدة', value:pendingDevices,    icon:Clock,         color:'text-rose-600',   bg:'bg-rose-50',   href:'/alerts' },
  ];

  const alertTypeColors: Record<string,string>  = { device_needed:'bg-orange-100 text-orange-700', follow_up_needed:'bg-blue-100 text-blue-700', missing_data:'bg-yellow-100 text-yellow-700' };
  const alertTypeLabels: Record<string,string>  = { device_needed:'يحتاج أداة', follow_up_needed:'يحتاج متابعة', missing_data:'بيانات ناقصة' };
  const recentAlerts    = alerts.filter(a=>!a.isResolved).slice(0,4);
  const getBenName      = (id: string) => beneficiaries.find(b=>b.id===id)?.fullName ?? id;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            مرحباً {currentUser?.fullName} —{' '}
            {new Date().toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2 text-xs" onClick={()=>setLocation('/beneficiary/new')}>
            <Plus className="w-3.5 h-3.5"/>حالة جديدة
          </Button>
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={()=>setLocation('/search')}>
            <Users className="w-3.5 h-3.5"/>تصفح الحالات
          </Button>
        </div>
      </div>

      {/* ─── بحث سريع — للجميع ─────────────────────────── */}
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-muted-foreground pointer-events-none"/>
            <Input
              placeholder="ابحث قبل إضافة حالة جديدة — اسم أو رقم هوية..."
              className="pe-10 text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* نتائج البحث */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map(b => (
                <div key={b.id}
                  onClick={() => setLocation(`/beneficiary/${b.id}`)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors border border-border/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                      {b.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.fullName}</p>
                      <p className="text-xs text-muted-foreground">{b.nationalId} · {b.residenceArea}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge className={`text-[10px] border-0 ${getProject(b.project).badgeClass}`}>{b.project}</Badge>
                    <Badge className={`text-[10px] border-0 ${b.caseStatus==='active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{b.caseStatus==='active'?'نشط':'مغلق'}</Badge>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground"/>
                  </div>
                </div>
              ))}
              <p className="text-xs text-center text-muted-foreground pt-1">
                الحالة موجودة؟ افتح ملفها بدل إضافة جديدة
              </p>
            </div>
          )}

          {/* لا نتائج */}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0"/>
              <p className="text-xs text-green-700">لا توجد حالة بهذا الاسم أو الرقم — يمكنك إضافة حالة جديدة</p>
              <Button size="sm" className="ms-auto text-xs h-7 gap-1" onClick={() => {
                const url = searchQuery.replace(/\D/g,'').length >= 9
                  ? `/beneficiary/new?nationalId=${searchQuery.trim()}`
                  : '/beneficiary/new';
                setLocation(url);
              }}>
                <Plus className="w-3 h-3"/>إضافة
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── قسم أدائي — للموظفين فقط ─────────────────── */}
      {myStats && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <User className="w-4 h-4"/>أدائي الشخصي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-white border border-border">
                <p className="text-2xl font-bold text-primary">{myStats.totalSessions}</p>
                <p className="text-xs text-muted-foreground mt-0.5">جلسة قدّمتها</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white border border-border">
                <p className="text-2xl font-bold text-green-600">{myStats.totalBeneficiaries}</p>
                <p className="text-xs text-muted-foreground mt-0.5">مستفيد خدمتهم</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white border border-border">
                <p className="text-sm font-bold text-amber-600">{myStats.lastDate}</p>
                <p className="text-xs text-muted-foreground mt-0.5">آخر جلسة</p>
              </div>
            </div>
            {Object.keys(myStats.serviceTypes).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">أنواع خدماتي</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(myStats.serviceTypes).sort(([,a],[,b])=>b-a).map(([type,count])=>(
                    <Badge key={type} variant="outline" className="text-xs gap-1">{type} <span className="font-bold text-primary">{count}</span></Badge>
                  ))}
                </div>
              </div>
            )}
            {myStats.totalSessions > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">جلساتي آخر 3 أشهر</p>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={myStats.monthly} margin={{top:0,right:0,left:-30,bottom:0}}>
                    <XAxis dataKey="month" tick={{fontSize:10}}/>
                    <YAxis tick={{fontSize:10}}/>
                    <Tooltip/>
                    <Bar dataKey="جلسات" fill="hsl(215,100%,35%)" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {myStats.totalSessions === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">لم يتم تسجيل جلسات باسمك بعد</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── KPI Grid — للأدمن والسوبرفايزر ─────────────── */}
      {isPrivileged && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {kpis.map((kpi,i) => {
              const Icon = kpi.icon;
              const card = (
                <Card key={i} className={kpi.href?'cursor-pointer hover:shadow-md transition-shadow hover:border-primary/30':''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground leading-tight">{kpi.labelAr}</p>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${kpi.bg}`}><Icon className={`w-4 h-4 ${kpi.color}`}/></div>
                    </div>
                  </CardContent>
                </Card>
              );
              return kpi.href ? <Link key={i} href={kpi.href}>{card}</Link> : card;
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary"/>الجلسات عبر الزمن</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={visitsTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
                    <Tooltip/>
                    <Line type="monotone" dataKey="جلسات" stroke="hsl(215,100%,35%)" strokeWidth={2} dot={{r:4}}/>
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">توزيع الجنس</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false}>
                      {genderData.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
                    </Pie><Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">الخدمات المقدمة</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={serviceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis type="number" tick={{fontSize:11}}/>
                    <YAxis dataKey="name" type="category" tick={{fontSize:11}} width={90}/>
                    <Tooltip/><Bar dataKey="count" fill="hsl(215,100%,35%)" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">توزيع الحالات حسب المنطقة</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={areaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:11}}/>
                    <Tooltip/><Bar dataKey="count" fill="hsl(160,60%,45%)" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">توزيع الحالات حسب المشروع</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={projectData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false}>
                    {projectData.map((_,i)=><Cell key={i} fill={COLORS[i+2]}/>)}
                  </Pie><Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">آخر التنبيهات</CardTitle>
              <Link href="/alerts" className="text-xs text-primary hover:underline">عرض الكل</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAlerts.length===0 ? <p className="text-sm text-muted-foreground">لا توجد تنبيهات</p> : recentAlerts.map(alert=>(
                <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${alertTypeColors[alert.alertType]??'bg-gray-100 text-gray-700'}`}>{alertTypeLabels[alert.alertType]??alert.alertType}</span>
                  <div className="min-w-0"><p className="text-xs font-medium truncate">{getBenName(alert.beneficiaryId)}</p><p className="text-xs text-muted-foreground truncate">{alert.alertMessage}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── للموظف: تنبيهاته فقط ────────────────────── */}
      {!isPrivileged && recentAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">آخر التنبيهات</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentAlerts.map(alert=>(
              <div key={alert.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${alertTypeColors[alert.alertType]??'bg-gray-100 text-gray-700'}`}>{alertTypeLabels[alert.alertType]??alert.alertType}</span>
                <div className="min-w-0"><p className="text-xs font-medium truncate">{getBenName(alert.beneficiaryId)}</p><p className="text-xs text-muted-foreground truncate">{alert.alertMessage}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
