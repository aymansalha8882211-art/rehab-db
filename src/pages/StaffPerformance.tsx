import { useState, useMemo } from 'react';
import { useData } from '@/lib/dataContext';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Users2, Award, Calendar, TrendingUp, Search, FileDown, Printer, User, TrendingDown, Minus } from 'lucide-react';
import * as XLSX from 'xlsx';

interface StaffStat {
  name: string;
  sessions: number;
  beneficiaries: Set<string>;
  beneficiaryCount: number;
  lastDate: string;
  cbm: number;
  church: number;
  serviceTypes: Record<string, number>;
  monthlyData: Record<string, number>;
  avgPain: number;
  improvedCount: number;
  deterioratedCount: number;
}

export default function StaffPerformance() {
  const { sessions, beneficiaries } = useData();
  const { currentUser } = useAuth();
  const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';

  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [search,    setSearch]    = useState('');
  const [project,   setProject]   = useState('all');
  const [selected,  setSelected]  = useState<StaffStat | null>(null);

  const filteredSessions = useMemo(() => sessions.filter(s => {
    if (dateFrom && s.serviceDate < dateFrom) return false;
    if (dateTo   && s.serviceDate > dateTo)   return false;
    if (project !== 'all' && s.formType !== project) return false;
    return true;
  }), [sessions, dateFrom, dateTo, project]);

  const staffStats = useMemo(() => {
    const map: Record<string, StaffStat> = {};
    filteredSessions.forEach(s => {
      const key = s.providerName || 'غير محدد';
      if (!map[key]) map[key] = {
        name: key, sessions: 0, beneficiaries: new Set(),
        beneficiaryCount: 0, lastDate: '', cbm: 0, church: 0,
        serviceTypes: {}, monthlyData: {},
        avgPain: 0, improvedCount: 0, deterioratedCount: 0,
      };
      map[key].sessions++;
      map[key].beneficiaries.add(s.beneficiaryId);
      if (!map[key].lastDate || s.serviceDate > map[key].lastDate)
        map[key].lastDate = s.serviceDate;
      if (s.formType === 'CBM') map[key].cbm++;
      else map[key].church++;
      (Array.isArray(s.serviceTypes) ? s.serviceTypes : []).forEach((t: string) => {
        map[key].serviceTypes[t] = (map[key].serviceTypes[t] || 0) + 1;
      });
      const month = s.serviceDate?.slice(0, 7) || '';
      if (month) map[key].monthlyData[month] = (map[key].monthlyData[month] || 0) + 1;
      // الألم والتحسن
      map[key].avgPain += s.painLevel || 0;
      if (s.sessionResponse === 'تحسن ملحوظ' || s.sessionResponse === 'تحسن بسيط') map[key].improvedCount++;
      if (s.sessionResponse === 'تدهور') map[key].deterioratedCount++;
    });
    return Object.values(map).map(v => ({
      ...v,
      beneficiaryCount: v.beneficiaries.size,
      avgPain: v.sessions > 0 ? Math.round((v.avgPain / v.sessions) * 10) / 10 : 0,
    })).sort((a, b) => b.sessions - a.sessions);
  }, [filteredSessions]);

  const filtered = useMemo(() => {
    let base = staffStats;
    if (!isPrivileged && currentUser?.fullName) {
      base = staffStats.filter(s => s.name.includes(currentUser.fullName.split(' ')[0]));
    }
    if (!search.trim()) return base;
    return base.filter(s => s.name.includes(search));
  }, [staffStats, search, isPrivileged, currentUser]);

  const totalSessions  = filteredSessions.length;
  const totalProviders = staffStats.length;
  const avgPerProvider = totalProviders > 0 ? Math.round(totalSessions / totalProviders) : 0;
  const topProvider    = staffStats[0];

  const chartData = filtered.slice(0, 10).map(s => ({
    name: s.name.split(' ')[0],
    جلسات: s.sessions,
    مستفيدون: s.beneficiaryCount,
    تحسن: s.improvedCount,
  }));

  // ─── تصدير Excel ──────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map((s, i) => ({
      'الترتيب': i + 1,
      'مقدم الخدمة': s.name,
      'إجمالي الجلسات': s.sessions,
      'عدد المستفيدين': s.beneficiaryCount,
      'جلسات CBM': s.cbm,
      'جلسات Church': s.church,
      'متوسط الألم': s.avgPain,
      'جلسات تحسن': s.improvedCount,
      'جلسات تدهور': s.deterioratedCount,
      'نسبة التحسن': s.sessions > 0 ? `${Math.round((s.improvedCount/s.sessions)*100)}%` : '—',
      'آخر جلسة': s.lastDate || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'أداء الكادر');
    XLSX.writeFile(wb, `أداء_الكادر_${new Date().toLocaleDateString('ar')}.xlsx`);
  };

  // ─── طباعة ────────────────────────────────────────────
  const handlePrint = (staff?: StaffStat) => {
    const target = staff || null;
    const win    = window.open('', '_blank');
    if (!win) return;

    if (!target) {
      const rows = filtered.map((s, i) => `
        <tr>
          <td>${i+1}</td><td>${s.name}</td><td>${s.sessions}</td>
          <td>${s.beneficiaryCount}</td><td>${s.cbm}</td><td>${s.church}</td>
          <td>${s.avgPain}</td>
          <td>${s.sessions > 0 ? Math.round((s.improvedCount/s.sessions)*100)+'%' : '—'}</td>
          <td>${s.lastDate||'—'}</td>
        </tr>`).join('');
      win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
        <title>أداء الكادر الميداني</title>
        <style>body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#111;direction:rtl}
        h1{font-size:20px;margin-bottom:4px}.meta{display:flex;gap:20px;margin-bottom:20px;font-size:13px;color:#555}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#1e40af;color:white;padding:8px 10px;text-align:right}
        td{padding:7px 10px;border-bottom:1px solid #e5e7eb}
        tr:nth-child(even) td{background:#f9fafb}
        .footer{margin-top:30px;font-size:11px;color:#999;text-align:center}
        @media print{@page{margin:0;size:A4 landscape}body{padding:15px}}</style></head>
        <body><h1>أداء الكادر الميداني — جذور</h1>
        <div class="meta">
          <span>إجمالي المزودين: <strong>${totalProviders}</strong></span>
          <span>إجمالي الجلسات: <strong>${totalSessions}</strong></span>
          ${dateFrom?`<span>من: <strong>${dateFrom}</strong></span>`:''}
          ${dateTo?`<span>إلى: <strong>${dateTo}</strong></span>`:''}
          <span>التقرير: <strong>${new Date().toLocaleDateString('ar-EG')}</strong></span>
        </div>
        <table><thead><tr>
          <th>#</th><th>مقدم الخدمة</th><th>الجلسات</th><th>المستفيدون</th>
          <th>CBM</th><th>Church</th><th>متوسط الألم</th><th>نسبة التحسن</th><th>آخر جلسة</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">نظام إدارة التأهيل — جذور</div></body></html>`);
    } else {
      const svcRows = Object.entries(target.serviceTypes).sort(([,a],[,b])=>b-a)
        .map(([t,c])=>`<tr><td>${t}</td><td>${c}</td></tr>`).join('');
      const mRows = Object.entries(target.monthlyData).sort(([a],[b])=>a.localeCompare(b))
        .map(([m,c])=>`<tr><td>${m}</td><td>${c}</td></tr>`).join('');
      const impRate = target.sessions > 0 ? Math.round((target.improvedCount/target.sessions)*100) : 0;
      win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
        <title>تقرير — ${target.name}</title>
        <style>body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#111;direction:rtl}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:3px solid #1e40af;padding-bottom:16px}
        .header h1{font-size:22px;margin:0 0 4px;color:#1e40af}.header p{color:#666;font-size:13px;margin:0}
        .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px}
        .kpi{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px;text-align:center}
        .kpi .val{font-size:22px;font-weight:bold;color:#1e40af}.kpi .lbl{font-size:10px;color:#666;margin-top:2px}
        h2{font-size:13px;font-weight:bold;margin-bottom:8px;color:#374151;border-right:3px solid #1e40af;padding-right:8px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px}
        th{background:#1e40af;color:white;padding:7px 10px;text-align:right}
        td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
        tr:nth-child(even) td{background:#f9fafb}
        .footer{margin-top:20px;font-size:11px;color:#999;text-align:center;border-top:1px solid #e5e7eb;padding-top:10px}
        @media print{@page{margin:0;size:A4 portrait}body{padding:15px}}</style></head>
        <body><div class="header">
          <div><h1>تقرير أداء الكادر</h1><p>${target.name}</p></div>
          <div style="font-size:13px;font-weight:bold;color:#1e40af">جذور — نظام إدارة التأهيل</div>
        </div>
        <div class="kpis">
          <div class="kpi"><div class="val">${target.sessions}</div><div class="lbl">إجمالي الجلسات</div></div>
          <div class="kpi"><div class="val">${target.beneficiaryCount}</div><div class="lbl">المستفيدون</div></div>
          <div class="kpi"><div class="val">${target.avgPain}</div><div class="lbl">متوسط الألم</div></div>
          <div class="kpi"><div class="val">${impRate}%</div><div class="lbl">نسبة التحسن</div></div>
          <div class="kpi"><div class="val">${target.lastDate||'—'}</div><div class="lbl">آخر جلسة</div></div>
        </div>
        ${svcRows?`<h2>أنواع الخدمات</h2><table><thead><tr><th>نوع الخدمة</th><th>عدد الجلسات</th></tr></thead><tbody>${svcRows}</tbody></table>`:''}
        ${mRows?`<h2>الجلسات الشهرية</h2><table><thead><tr><th>الشهر</th><th>الجلسات</th></tr></thead><tbody>${mRows}</tbody></table>`:''}
        <div class="footer">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
        </body></html>`);
    }
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  // ─── رسم بياني شهري للموظف المختار ──────────────────
  const selectedMonthlyChart = useMemo(() => {
    if (!selected) return [];
    return Object.entries(selected.monthlyData)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month: month.slice(5), جلسات: count }));
  }, [selected]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary"/>أداء الكادر الميداني
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">إحصاءات الجلسات المنفّذة لكل مزوّد خدمة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => handlePrint()}>
            <Printer className="w-4 h-4"/>طباعة الكل
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleExport} disabled={!filtered.length}>
            <FileDown className="w-4 h-4"/>تصدير Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute top-2.5 right-3 w-4 h-4 text-muted-foreground"/>
          <Input placeholder="بحث باسم مقدم الخدمة..." value={search} onChange={e=>setSearch(e.target.value)} className="pr-9"/>
        </div>
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="المشروع"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="CBM">CBM</SelectItem>
            <SelectItem value="Church">Church</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">من</span>
          <Input type="date" className="w-36 h-9" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
          <span className="text-xs text-muted-foreground">إلى</span>
          <Input type="date" className="w-36 h-9" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'مزودو الخدمة',  value:totalProviders,        icon:Users2,    color:'bg-blue-500' },
          { label:'إجمالي الجلسات', value:totalSessions,         icon:TrendingUp, color:'bg-green-500' },
          { label:'متوسط/مزوّد',   value:avgPerProvider,         icon:Calendar,  color:'bg-amber-500' },
          { label:'أعلى جلسات',    value:topProvider?.sessions||0, icon:Award,  color:'bg-purple-500' },
        ].map(k=>(
          <Card key={k.label}><CardContent className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-4 h-4 text-white"/></div>
            <div><p className="text-xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Top provider */}
      {topProvider && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-500"/>
            <div className="flex-1">
              <p className="text-sm font-semibold">{topProvider.name}</p>
              <p className="text-xs text-muted-foreground">
                {topProvider.sessions} جلسة · {topProvider.beneficiaryCount} مستفيد ·
                نسبة تحسن {topProvider.sessions>0?Math.round((topProvider.improvedCount/topProvider.sessions)*100):0}% ·
                آخر جلسة: {topProvider.lastDate}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={()=>handlePrint(topProvider)}>
              <Printer className="w-3.5 h-3.5"/>طباعة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">مقارنة أداء الكادر (أعلى 10)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{top:5,right:10,left:-10,bottom:40}}>
                <XAxis dataKey="name" tick={{fontSize:10}} angle={-35} textAnchor="end" interval={0}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <Bar dataKey="جلسات"    fill="#1d4ed8" radius={[4,4,0,0]}/>
                <Bar dataKey="مستفيدون" fill="#059669" radius={[4,4,0,0]}/>
                <Bar dataKey="تحسن"     fill="#f59e0b" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* جدول الكادر */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">تفاصيل أداء الكادر ({filtered.length} مزوّد)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!filtered.length ? (
            <p className="text-center text-sm text-muted-foreground py-10">لا توجد بيانات</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((s,i) => {
                const impRate = s.sessions > 0 ? Math.round((s.improvedCount/s.sessions)*100) : 0;
                return (
                  <div key={s.name} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <span className="text-lg font-bold text-muted-foreground w-6 flex-shrink-0">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">آخر جلسة: {s.lastDate||'—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                      <div className="text-center"><p className="font-bold text-base">{s.sessions}</p><p className="text-muted-foreground">جلسة</p></div>
                      <div className="text-center"><p className="font-bold text-base">{s.beneficiaryCount}</p><p className="text-muted-foreground">مستفيد</p></div>
                      <div className="text-center">
                        <p className={`font-bold text-base ${s.avgPain<=3?'text-green-600':s.avgPain<=6?'text-amber-600':'text-red-600'}`}>{s.avgPain}</p>
                        <p className="text-muted-foreground">ألم</p>
                      </div>
                      <div className="text-center">
                        <p className={`font-bold text-base ${impRate>=70?'text-green-600':impRate>=40?'text-amber-600':'text-red-600'}`}>{impRate}%</p>
                        <p className="text-muted-foreground">تحسن</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {s.cbm    > 0 && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0">CBM {s.cbm}</Badge>}
                        {s.church > 0 && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">Church {s.church}</Badge>}
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={()=>setSelected(s)}>
                        <User className="w-3.5 h-3.5"/>تفاصيل
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={()=>handlePrint(s)}>
                        <Printer className="w-3.5 h-3.5"/>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog تفاصيل موظف */}
      <Dialog open={!!selected} onOpenChange={o=>{if(!o)setSelected(null);}}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">آخر جلسة: {selected.lastDate||'—'}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={()=>handlePrint(selected)}>
                  <Printer className="w-3.5 h-3.5"/>طباعة تقريره
                </Button>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label:'إجمالي الجلسات', value:selected.sessions, color:'bg-blue-50 border-blue-200 text-blue-700' },
                  { label:'عدد المستفيدين', value:selected.beneficiaryCount, color:'bg-green-50 border-green-200 text-green-700' },
                  { label:'متوسط الألم',    value:selected.avgPain, color:`${selected.avgPain<=3?'bg-green-50 border-green-200 text-green-700':selected.avgPain<=6?'bg-amber-50 border-amber-200 text-amber-700':'bg-red-50 border-red-200 text-red-700'}` },
                  { label:'جلسات تحسن',    value:selected.improvedCount, color:'bg-emerald-50 border-emerald-200 text-emerald-700' },
                  { label:'جلسات تدهور',   value:selected.deterioratedCount, color:'bg-red-50 border-red-100 text-red-600' },
                  { label:'نسبة التحسن',   value:`${selected.sessions>0?Math.round((selected.improvedCount/selected.sessions)*100):0}%`, color:'bg-purple-50 border-purple-200 text-purple-700' },
                ].map(k=>(
                  <div key={k.label} className={`p-3 rounded-xl border text-center ${k.color}`}>
                    <p className="text-xl font-bold">{k.value}</p>
                    <p className="text-xs mt-0.5">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* رسم بياني شهري */}
              {selectedMonthlyChart.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">الجلسات الشهرية</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={selectedMonthlyChart} margin={{top:5,right:5,left:-25,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="month" tick={{fontSize:10}}/>
                      <YAxis tick={{fontSize:10}}/>
                      <Tooltip/>
                      <Line type="monotone" dataKey="جلسات" stroke="#1d4ed8" strokeWidth={2} dot={{r:3}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* أنواع الخدمات */}
              {Object.keys(selected.serviceTypes).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">أنواع الخدمات</p>
                  <div className="space-y-1.5">
                    {Object.entries(selected.serviceTypes).sort(([,a],[,b])=>b-a).map(([type,count])=>(
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-xs flex-1">{type}</span>
                        <div className="h-2 rounded-full bg-primary/20 flex-1 max-w-24">
                          <div className="h-2 rounded-full bg-primary" style={{width:`${Math.min(100,(count/selected.sessions)*100)}%`}}/>
                        </div>
                        <span className="text-xs font-bold w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
