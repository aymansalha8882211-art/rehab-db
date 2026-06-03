import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/lib/i18n';
import { useData } from '@/lib/dataContext';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { GAZA_AREAS, INJURY_TYPES } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Filter, BarChart2, Loader2, Globe } from 'lucide-react';

const COLORS = ['hsl(215,100%,35%)', 'hsl(160,60%,45%)', 'hsl(30,90%,55%)', 'hsl(340,75%,55%)', 'hsl(270,60%,55%)'];

export default function Reports() {
  const { language }    = useLanguage();
  const { toast }       = useToast();
  const { currentUser } = useAuth();
  const { beneficiaries, sessions, logAction } = useData();
  const [pdfLoading,   setPdfLoading]   = useState(false);
  const [donorLoading, setDonorLoading] = useState(false);

  const [projectFilter,  setProjectFilter]  = useState('all');
  const [genderFilter,   setGenderFilter]   = useState('all');
  const [areaFilter,     setAreaFilter]     = useState('all');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [responseFilter, setResponseFilter] = useState('all');

  const filteredBeneficiaries = beneficiaries.filter(b => {
    if (projectFilter !== 'all' && b.project !== projectFilter) return false;
    if (genderFilter  !== 'all' && b.gender  !== genderFilter)  return false;
    if (areaFilter    !== 'all' && b.residenceArea !== areaFilter) return false;
    return true;
  });

  const filteredIds = new Set(filteredBeneficiaries.map(b => b.id));
  const filteredSessions = sessions.filter(s => {
    if (!filteredIds.has(s.beneficiaryId)) return false;
    if (responseFilter !== 'all' && (s.sessionResponse || '') !== responseFilter) return false;
    if (dateFrom && s.serviceDate < dateFrom) return false;
    if (dateTo   && s.serviceDate > dateTo)   return false;
    return true;
  });

  const physioCount  = filteredSessions.filter(s => s.serviceTypes.includes('علاج طبيعي')).length;
  const otCount      = filteredSessions.filter(s => s.serviceTypes.includes('علاج وظيفي')).length;
  const nursingCount = filteredSessions.filter(s => s.serviceTypes.includes('تمريض')).length;
  const psychCount   = filteredSessions.filter(s => s.serviceTypes.includes('دعم نفسي')).length;
  const familyCount  = filteredSessions.filter(s => s.serviceTypes.includes('توجيه أسري')).length;
  const referrals    = filteredSessions.filter(s => s.referralMade === true).length;
  const avgPain      = filteredSessions.length > 0
    ? (filteredSessions.reduce((a, s) => a + s.painLevel, 0) / filteredSessions.length).toFixed(1)
    : '—';
  const activeCases  = filteredBeneficiaries.filter(b => b.caseStatus === 'active').length;
  const closedCases  = filteredBeneficiaries.filter(b => b.caseStatus === 'closed').length;
  const maleCount    = filteredBeneficiaries.filter(b => b.gender === 'male').length;
  const femaleCount  = filteredBeneficiaries.filter(b => b.gender === 'female').length;
  const improvedCount = filteredSessions.filter(s => s.sessionResponse === 'تحسن ملحوظ' || s.sessionResponse === 'تحسن بسيط').length;
  const sessionsWithResponse = filteredSessions.filter(s => s.sessionResponse && s.sessionResponse.trim() !== '').length;
const improvementRate = sessionsWithResponse > 0
  ? ((improvedCount / sessionsWithResponse) * 100).toFixed(1)
  : '0';

  const serviceData = [
    { name: 'علاج طبيعي', count: physioCount },
    { name: 'علاج وظيفي', count: otCount },
    { name: 'تمريض',       count: nursingCount },
    { name: 'دعم نفسي',    count: psychCount },
    { name: 'توجيه أسري',  count: familyCount },
  ];
  const areaData = GAZA_AREAS.map(area => ({
    name: area,
    cases: filteredBeneficiaries.filter(b => b.residenceArea === area).length,
  }));
  const responseData = ['تحسن ملحوظ', 'تحسن بسيط', 'بدون تحسن', 'تدهور'].map(r => ({
    name: r,
    count: filteredSessions.filter(s => s.sessionResponse === r).length,
  }));
  const genderData = [
    { name: 'ذكر',  value: maleCount },
    { name: 'أنثى', value: femaleCount },
  ];
  const injuryData = INJURY_TYPES.slice(0, 7).map(t => ({
    name: t,
    count: filteredBeneficiaries.filter(b => b.injuryType === t).length,
  })).filter(d => d.count > 0);

  const kpis = [
    { label: 'إجمالي الحالات',  value: filteredBeneficiaries.length },
    { label: 'إجمالي الجلسات', value: filteredSessions.length },
    { label: 'علاج طبيعي',     value: physioCount },
    { label: 'علاج وظيفي',     value: otCount },
    { label: 'تمريض',           value: nursingCount },
    { label: 'دعم نفسي',        value: psychCount },
    { label: 'توجيه أسري',      value: familyCount },
    { label: 'إحالات',          value: referrals },
  ];

  // ─── Excel export ─────────────────────────────────────────────────────────
  const handleExcelExport = async () => {
    const wb = XLSX.utils.book_new();
    const benRows = filteredBeneficiaries.map(b => ({
      'رقم الهوية': b.nationalId, 'الاسم الرباعي': b.fullName,
      'الجنس': b.gender === 'male' ? 'ذكر' : 'أنثى', 'تاريخ الميلاد': b.dateOfBirth,
      'المنطقة': b.residenceArea, 'نوع الإصابة': b.injuryType,
      'التصنيف': b.classification, 'المشروع': b.project,
      'الجوال': b.phone, 'الوصي': b.caregiverName,
      'الحالة': b.caseStatus === 'active' ? 'نشط' : 'مغلق',
      'تاريخ التسجيل': b.registrationDate,
      'عدد الجلسات': sessions.filter(s => s.beneficiaryId === b.id).length,
    }));
    const wsBen = XLSX.utils.json_to_sheet(benRows);
    wsBen['!cols'] = Array(13).fill({ wch: 20 });
    XLSX.utils.book_append_sheet(wb, wsBen, 'المستفيدون');

    const sessRows = filteredSessions.map(s => {
      const ben = beneficiaries.find(b => b.id === s.beneficiaryId);
      return {
        'اسم المستفيد': ben?.fullName || s.beneficiaryId,
        'رقم الهوية': ben?.nationalId || '—',
        'نوع النموذج': s.formType, 'تاريخ الجلسة': s.serviceDate,
        'الخدمات': s.serviceTypes.join(' - '), 'مقدم الخدمة': s.providerName || '—',
        'الاستجابة': s.sessionResponse || '—',
        'الأجهزة المطلوبة': (s.neededDevices || []).filter(d => d !== 'لا يحتاج أي أداة مساعدة').join(' - ') || 'لا شيء',
        'إحالة': s.referralMade === true ? 'نعم' : 'لا',
        'مخاطر حماية': s.protectionRisks === true ? 'نعم' : 'لا',
        'ملاحظات': s.recommendations || s.psychNotes || '—',
      };
    });
    const wsSess = XLSX.utils.json_to_sheet(sessRows);
    wsSess['!cols'] = Array(12).fill({ wch: 22 });
    XLSX.utils.book_append_sheet(wb, wsSess, 'الجلسات');

    const kpiRows = [
      { 'المؤشر': 'تاريخ التقرير',     'القيمة': new Date().toLocaleDateString('ar-EG') },
      { 'المؤشر': 'المُصدَّر بواسطة', 'القيمة': currentUser?.fullName || '—' },
      { 'المؤشر': 'الفلتر - المشروع', 'القيمة': projectFilter === 'all' ? 'الكل' : projectFilter },
      { 'المؤشر': 'الفلتر - المنطقة', 'القيمة': areaFilter === 'all' ? 'الكل' : areaFilter },
      { 'المؤشر': '', 'القيمة': '' },
      ...kpis.map(k => ({ 'المؤشر': k.label, 'القيمة': k.value })),
    ];
    const wsKpi = XLSX.utils.json_to_sheet(kpiRows);
    wsKpi['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsKpi, 'ملخص الإحصاءات');

    XLSX.writeFile(wb, `تقرير-إعادة-التأهيل-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'تم تصدير Excel بنجاح', description: `${filteredBeneficiaries.length} مستفيد و${filteredSessions.length} جلسة` });
  };

  // ─── PDF export ────────────────────────────────────────────────────────────
  const handlePdfExport = async () => {
    setPdfLoading(true);
    const filterDesc = [
      projectFilter  !== 'all' ? `المشروع: ${projectFilter}` : '',
      genderFilter   !== 'all' ? `الجنس: ${genderFilter === 'male' ? 'ذكر' : 'أنثى'}` : '',
      areaFilter     !== 'all' ? `المنطقة: ${areaFilter}` : '',
      dateFrom ? `من: ${dateFrom}` : '',
      dateTo   ? `إلى: ${dateTo}` : '',
    ].filter(Boolean).join(' | ') || 'جميع البيانات';
    const now = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>تقرير إعادة التأهيل</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Noto Sans Arabic',Arial,sans-serif;font-size:10pt;color:#1a1a2e;direction:rtl;background:white;padding:1.5cm 2cm}
  h1{font-size:18pt;color:#1a3a6b;text-align:center;margin-bottom:4px}
  .subtitle{font-size:10pt;color:#666;text-align:center;margin-bottom:4px}
  .meta{font-size:9pt;color:#888;text-align:center;border-bottom:2px solid #1a3a6b;padding-bottom:12px;margin-bottom:20px}
  h2{font-size:12pt;color:#1a3a6b;border-bottom:1px solid #1a3a6b;padding-bottom:4px;margin:20px 0 10px}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}
  .kpi{background:#f0f4fa;border-radius:8px;padding:10px;text-align:center;border:1px solid #dce4f0}
  .kpi-val{font-size:22pt;font-weight:700;color:#1a3a6b;line-height:1}
  .kpi-lbl{font-size:8pt;color:#555;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:16px}
  th{background:#1a3a6b;color:white;padding:6px 8px;text-align:right;font-weight:600}
  td{padding:5px 8px;border-bottom:1px solid #e8edf5}
  tr:nth-child(even) td{background:#f7f9fc}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:8pt;font-weight:600}
  .badge-active{background:#d1fae5;color:#065f46}
  .badge-closed{background:#f3f4f6;color:#374151}
  .badge-cbm{background:#dbeafe;color:#1e40af}
  .badge-church{background:#d1fae5;color:#065f46}
  .footer{margin-top:30px;border-top:1px solid #ccc;padding-top:10px;font-size:8pt;color:#888;display:flex;justify-content:space-between}
  .filter-bar{background:#f0f4fa;border:1px solid #dce4f0;border-radius:6px;padding:8px 12px;font-size:9pt;color:#444;margin-bottom:16px}
  @media print{@page{margin:0;size:A4 portrait}body{padding:1cm 1.5cm}}
</style></head><body>
<h1>نظام إدارة حالات إعادة التأهيل</h1>
<p class="subtitle">${projectFilter !== 'all' ? `مشروع ${projectFilter}` : 'مشروع CBM + Church'}</p>
<p class="meta">تاريخ التقرير: ${now} | صادر بواسطة: ${currentUser?.fullName || '—'}</p>
<div class="filter-bar">الفلاتر المطبّقة: ${filterDesc}</div>
<h2>مؤشرات الأداء الرئيسية</h2>
<div class="kpi-grid">
  ${kpis.map(k => `<div class="kpi"><div class="kpi-val">${k.value}</div><div class="kpi-lbl">${k.label}</div></div>`).join('')}
  <div class="kpi"><div class="kpi-val">${avgPain}</div><div class="kpi-lbl">متوسط مستوى الألم</div></div>
</div>
<h2>الخدمات المقدمة</h2>
<table><thead><tr><th>نوع الخدمة</th><th>عدد الجلسات</th><th>النسبة</th></tr></thead><tbody>
  ${serviceData.map(s => `<tr><td>${s.name}</td><td style="text-align:center;font-weight:700">${s.count}</td><td style="text-align:center">${filteredSessions.length > 0 ? ((s.count/filteredSessions.length)*100).toFixed(1)+'%' : '0%'}</td></tr>`).join('')}
</tbody></table>
<h2>توزيع الحالات حسب المنطقة</h2>
<table><thead><tr><th>المنطقة</th><th>عدد الحالات</th><th>النسبة</th></tr></thead><tbody>
  ${areaData.filter(a=>a.cases>0).map(a=>`<tr><td>${a.name}</td><td style="text-align:center;font-weight:700">${a.cases}</td><td style="text-align:center">${filteredBeneficiaries.length>0?((a.cases/filteredBeneficiaries.length)*100).toFixed(1)+'%':'0%'}</td></tr>`).join('')}
</tbody></table>
<h2>استجابة الحالات للجلسات</h2>
<table><thead><tr><th>الاستجابة</th><th>عدد الجلسات</th></tr></thead><tbody>
  ${responseData.filter(r=>r.count>0).map(r=>`<tr><td>${r.name}</td><td style="text-align:center;font-weight:700">${r.count}</td></tr>`).join('')}
</tbody></table>
<h2>قائمة الحالات (${filteredBeneficiaries.length})</h2>
<table><thead><tr><th>#</th><th>رقم الهوية</th><th>الاسم</th><th>الجنس</th><th>المنطقة</th><th>نوع الإصابة</th><th>المشروع</th><th>الجلسات</th><th>الحالة</th></tr></thead><tbody>
  ${filteredBeneficiaries.map((b,i)=>{const sc=sessions.filter(s=>s.beneficiaryId===b.id).length;return`<tr><td style="text-align:center">${i+1}</td><td style="font-family:monospace">${b.nationalId}</td><td style="font-weight:600">${b.fullName}</td><td>${b.gender==='male'?'ذكر':'أنثى'}</td><td>${b.residenceArea}</td><td>${b.injuryType}</td><td><span class="badge ${b.project==='CBM'?'badge-cbm':'badge-church'}">${b.project}</span></td><td style="text-align:center;font-weight:700;color:#1a3a6b">${sc}</td><td><span class="badge ${b.caseStatus==='active'?'badge-active':'badge-closed'}">${b.caseStatus==='active'?'نشط':'مغلق'}</span></td></tr>`;}).join('')}
</tbody></table>
<div class="footer"><span>نظام إدارة حالات إعادة التأهيل — وثيقة سرية للاستخدام الرسمي فقط</span><span>إجمالي: ${filteredBeneficiaries.length} حالة | ${filteredSessions.length} جلسة</span></div>
</body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { toast({ title: 'تعذّر فتح نافذة الطباعة', variant: 'destructive' }); setPdfLoading(false); return; }
    win.document.write(html);
    win.document.close();
    win.onload = () => { setTimeout(() => { win.focus(); win.print(); setPdfLoading(false); }, 500); };
  };

  // ─── تقرير المانحين ────────────────────────────────────────────────────────
  const handleDonorReport = () => {
    setDonorLoading(true);
    const now = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const reportPeriod = dateFrom && dateTo
      ? `${dateFrom} — ${dateTo}`
      : dateFrom ? `من ${dateFrom}` : dateTo ? `حتى ${dateTo}` : 'الفترة الكاملة';
    const projectLabel = projectFilter === 'CBM' ? 'مشروع CBM' : projectFilter === 'Church' ? 'مشروع الكنيسة الإنجيلية' : 'مشروع CBM ومشروع الكنيسة الإنجيلية';
    const avgSessionsPerBeneficiary = filteredBeneficiaries.length > 0
      ? (filteredSessions.length / filteredBeneficiaries.length).toFixed(1)
      : '0';

    // توزيع الإصابات
    const injurySummary = INJURY_TYPES.map(t => ({
      name: t,
      count: filteredBeneficiaries.filter(b => b.injuryType === t).length,
    })).filter(d => d.count > 0).sort((a,b) => b.count - a.count).slice(0, 5);

    // توزيع المناطق
    const areaSummary = GAZA_AREAS.map(area => ({
      name: area,
      count: filteredBeneficiaries.filter(b => b.residenceArea === area).length,
    })).filter(d => d.count > 0).sort((a,b) => b.count - a.count);

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>تقرير المانحين — جذور</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Noto Sans Arabic',Arial,sans-serif;font-size:10pt;color:#1a1a2e;direction:rtl;background:white}
  .page{padding:1.5cm 2cm}

  /* Header */
  .header{background:linear-gradient(135deg,#1a3a6b 0%,#1e4d8c 60%,#0f5f8f 100%);color:white;padding:30px 2cm;margin-bottom:0}
  .header-logo{font-size:28pt;font-weight:800;letter-spacing:-1px;margin-bottom:4px}
  .header-sub{font-size:11pt;opacity:0.85;margin-bottom:16px}
  .header-meta{display:flex;gap:24px;font-size:9pt;opacity:0.75;flex-wrap:wrap}
  .header-meta span{display:flex;align-items:center;gap:4px}

  /* Summary bar */
  .summary-bar{background:#f0f7ff;border-bottom:3px solid #1a3a6b;padding:16px 2cm;display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
  .summary-item{text-align:center}
  .summary-val{font-size:22pt;font-weight:800;color:#1a3a6b;line-height:1}
  .summary-lbl{font-size:8pt;color:#555;margin-top:2px}

  /* Content */
  .section{margin-bottom:28px}
  .section-title{font-size:13pt;font-weight:700;color:#1a3a6b;border-right:4px solid #1a3a6b;padding-right:10px;margin-bottom:14px}

  /* KPI Grid */
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .kpi{background:#f8faff;border:1px solid #dce4f0;border-radius:10px;padding:14px;text-align:center}
  .kpi-val{font-size:20pt;font-weight:800;color:#1a3a6b;line-height:1}
  .kpi-lbl{font-size:8pt;color:#666;margin-top:3px}
  .kpi.highlight{background:linear-gradient(135deg,#1a3a6b,#1e4d8c);border:none}
  .kpi.highlight .kpi-val{color:white}
  .kpi.highlight .kpi-lbl{color:rgba(255,255,255,0.8)}

  /* Tables */
  table{width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:16px}
  th{background:#1a3a6b;color:white;padding:8px 10px;text-align:right;font-weight:600}
  td{padding:6px 10px;border-bottom:1px solid #e8edf5}
  tr:nth-child(even) td{background:#f7f9fc}

  /* Progress bars */
  .progress-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .progress-label{width:100px;font-size:9pt;text-align:right;flex-shrink:0}
  .progress-bar{flex:1;height:10px;background:#e8edf5;border-radius:5px;overflow:hidden}
  .progress-fill{height:100%;background:linear-gradient(90deg,#1a3a6b,#1e6ea8);border-radius:5px;transition:width 0.3s}
  .progress-val{width:40px;font-size:9pt;font-weight:700;color:#1a3a6b;text-align:left;flex-shrink:0}

  /* Two columns */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}

  /* Info box */
  .info-box{background:#f0f7ff;border:1px solid #c3daf5;border-radius:8px;padding:14px}
  .info-box-title{font-size:10pt;font-weight:700;color:#1a3a6b;margin-bottom:8px}
  .info-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e0ecf8;font-size:9pt}
  .info-row:last-child{border-bottom:none}
  .info-key{color:#555}
  .info-val{font-weight:700;color:#1a3a6b}

  /* Achievement box */
  .achievement{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:16px}
  .achievement-title{font-size:11pt;font-weight:700;color:#166534;margin-bottom:8px}
  .achievement-list{list-style:none}
  .achievement-list li{font-size:9pt;color:#15803d;padding:3px 0}
  .achievement-list li::before{content:"✓ ";font-weight:700}

  /* Badge */
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:8pt;font-weight:600}
  .badge-cbm{background:#dbeafe;color:#1e40af}
  .badge-church{background:#d1fae5;color:#065f46}
  .badge-active{background:#d1fae5;color:#065f46}
  .badge-closed{background:#f3f4f6;color:#374151}

  /* Footer */
  .footer{background:#1a3a6b;color:white;padding:16px 2cm;display:flex;justify-content:space-between;align-items:center;font-size:8pt;margin-top:20px}
  .footer-left{opacity:0.8}
  .footer-right{font-weight:600}

  /* Confidential */
  .confidential{background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 14px;font-size:8pt;color:#dc2626;text-align:center;margin-bottom:20px}

  @media print{@page{margin:0;size:A4 portrait}body{font-size:9pt}}
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div class="header-logo">جذور | Juzoor</div>
  <div class="header-sub">تقرير برنامج إعادة التأهيل الميداني في غزة</div>
  <div class="header-meta">
    <span>📅 تاريخ الإصدار: ${now}</span>
    <span>📊 الفترة: ${reportPeriod}</span>
    <span>🏥 البرنامج: ${projectLabel}</span>
    <span>👤 أعدّه: ${currentUser?.fullName || '—'}</span>
  </div>
</div>

<!-- Summary Bar -->
<div class="summary-bar">
  <div class="summary-item"><div class="summary-val">${filteredBeneficiaries.length}</div><div class="summary-lbl">إجمالي المستفيدين</div></div>
  <div class="summary-item"><div class="summary-val">${filteredSessions.length}</div><div class="summary-lbl">إجمالي الجلسات</div></div>
  <div class="summary-item"><div class="summary-val">${improvementRate}%</div><div class="summary-lbl">نسبة التحسن</div></div>
  <div class="summary-item"><div class="summary-val">${avgSessionsPerBeneficiary}</div><div class="summary-lbl">متوسط الجلسات/مستفيد</div></div>
  <div class="summary-item"><div class="summary-val">${referrals}</div><div class="summary-lbl">إحالات خارجية</div></div>
</div>

<div class="page">

<div class="confidential">⚠ وثيقة سرية — للاستخدام الرسمي والمانحين المعتمدين فقط</div>

<!-- الإنجازات -->
<div class="section">
  <div class="section-title">أبرز الإنجازات</div>
  <div class="achievement">
    <div class="achievement-title">مؤشرات النجاح الرئيسية</div>
    <ul class="achievement-list">
      <li>تقديم ${filteredSessions.length} جلسة علاجية لـ ${filteredBeneficiaries.length} مستفيداً</li>
      <li>تحقيق نسبة تحسن ${improvementRate}% في استجابة الحالات للعلاج</li>
      <li>تغطية ${areaSummary.length} منطقة جغرافية مختلفة في قطاع غزة</li>
      <li>تنفيذ ${physioCount} جلسة علاج طبيعي و${psychCount} جلسة دعم نفسي</li>
      ${referrals > 0 ? `<li>إحالة ${referrals} حالة إلى جهات متخصصة للمتابعة</li>` : ''}
    </ul>
  </div>
</div>

<!-- مؤشرات الأداء -->
<div class="section">
  <div class="section-title">مؤشرات الأداء الرئيسية (KPIs)</div>
  <div class="kpi-grid">
    <div class="kpi highlight"><div class="kpi-val">${filteredBeneficiaries.length}</div><div class="kpi-lbl">إجمالي المستفيدين</div></div>
    <div class="kpi highlight"><div class="kpi-val">${filteredSessions.length}</div><div class="kpi-lbl">إجمالي الجلسات</div></div>
    <div class="kpi"><div class="kpi-val">${activeCases}</div><div class="kpi-lbl">حالات نشطة</div></div>
    <div class="kpi"><div class="kpi-val">${closedCases}</div><div class="kpi-lbl">حالات مكتملة</div></div>
    <div class="kpi"><div class="kpi-val">${maleCount}</div><div class="kpi-lbl">ذكور</div></div>
    <div class="kpi"><div class="kpi-val">${femaleCount}</div><div class="kpi-lbl">إناث</div></div>
    <div class="kpi"><div class="kpi-val">${avgSessionsPerBeneficiary}</div><div class="kpi-lbl">متوسط جلسات/مستفيد</div></div>
    <div class="kpi"><div class="kpi-val">${avgPain}</div><div class="kpi-lbl">متوسط مستوى الألم</div></div>
  </div>
</div>

<!-- الخدمات والتوزيع -->
<div class="two-col">
  <div class="section">
    <div class="section-title">توزيع الخدمات المقدمة</div>
    <div class="info-box">
      ${serviceData.filter(s=>s.count>0).map(s=>`
      <div class="progress-row">
        <div class="progress-label">${s.name}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${filteredSessions.length>0?((s.count/filteredSessions.length)*100).toFixed(0):0}%"></div></div>
        <div class="progress-val">${s.count}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-title">التوزيع الجغرافي</div>
    <div class="info-box">
      ${areaSummary.map(a=>`
      <div class="progress-row">
        <div class="progress-label">${a.name}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${filteredBeneficiaries.length>0?((a.count/filteredBeneficiaries.length)*100).toFixed(0):0}%"></div></div>
        <div class="progress-val">${a.count}</div>
      </div>`).join('')}
    </div>
  </div>
</div>

<!-- استجابة الحالات -->
<div class="section">
  <div class="section-title">استجابة الحالات للبرنامج العلاجي</div>
  <table>
    <thead><tr><th>مستوى الاستجابة</th><th>عدد الجلسات</th><th>النسبة المئوية</th><th>التقييم</th></tr></thead>
    <tbody>
      ${responseData.map(r=>{
        const pct = filteredSessions.length > 0 ? ((r.count/filteredSessions.length)*100).toFixed(1) : '0';
        const rating = r.name==='تحسن ملحوظ'?'🟢 ممتاز':r.name==='تحسن بسيط'?'🟡 جيد':r.name==='بدون تحسن'?'🟠 متوسط':'🔴 يحتاج متابعة';
        return `<tr><td style="font-weight:600">${r.name}</td><td style="text-align:center;font-weight:700">${r.count}</td><td style="text-align:center">${pct}%</td><td>${rating}</td></tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

<!-- أنواع الإصابات -->
${injurySummary.length > 0 ? `
<div class="section">
  <div class="section-title">أبرز أنواع الإصابات (أعلى 5)</div>
  <table>
    <thead><tr><th>#</th><th>نوع الإصابة</th><th>عدد الحالات</th><th>النسبة</th></tr></thead>
    <tbody>
      ${injurySummary.map((t,i)=>`<tr><td style="text-align:center">${i+1}</td><td>${t.name}</td><td style="text-align:center;font-weight:700">${t.count}</td><td style="text-align:center">${filteredBeneficiaries.length>0?((t.count/filteredBeneficiaries.length)*100).toFixed(1)+'%':'0%'}</td></tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- ملاحظات ختامية -->
<div class="section">
  <div class="section-title">ملاحظات ختامية وتوصيات</div>
  <div class="info-box">
    <div class="info-box-title">معلومات التقرير</div>
    <div class="info-row"><span class="info-key">تاريخ الإصدار</span><span class="info-val">${now}</span></div>
    <div class="info-row"><span class="info-key">الفترة الزمنية</span><span class="info-val">${reportPeriod}</span></div>
    <div class="info-row"><span class="info-key">البرنامج</span><span class="info-val">${projectLabel}</span></div>
    <div class="info-row"><span class="info-key">أُعدّ بواسطة</span><span class="info-val">${currentUser?.fullName || '—'}</span></div>
    <div class="info-row"><span class="info-key">إجمالي البيانات</span><span class="info-val">${filteredBeneficiaries.length} مستفيد · ${filteredSessions.length} جلسة</span></div>
  </div>
</div>

</div><!-- end page -->

<!-- Footer -->
<div class="footer">
  <div class="footer-left">جذور للإنماء الصحي والإجتماعي — Juzoor for Health and Social Development<br/>نظام إدارة حالات إعادة التأهيل الميداني في غزة</div>
  <div class="footer-right">تقرير سري — للاستخدام الرسمي فقط</div>
</div>

</body>
</html>`;

    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) {
      toast({ title: 'تعذّر فتح نافذة الطباعة', variant: 'destructive' });
      setDonorLoading(false);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
        setDonorLoading(false);
      }, 800);
    };
    toast({ title: 'تم إنشاء تقرير المانحين ✅' });
  };

  return (
    <div className="p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />التقارير والإحصاءات
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">تقارير مشروعي CBM و Church ومؤشرات الأداء</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExcelExport}>
            <Download className="w-3.5 h-3.5" />تصدير Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handlePdfExport} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            تصدير PDF
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleDonorReport} disabled={donorLoading}>
            {donorLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            تقرير المانحين
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Filter className="w-4 h-4" />فلترة البيانات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">المشروع</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="CBM">CBM</SelectItem>
                  <SelectItem value="Church">Church</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الجنس</Label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">المنطقة</Label>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {GAZA_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input type="date" className="h-8 text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input type="date" className="h-8 text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {kpis.map((kpi, i) => (
          <Card key={i}><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">الخدمات المقدمة</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={serviceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(215,100%,35%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع حسب المنطقة</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cases" fill="hsl(160,60%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">استجابة الحالات للجلسات</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={responseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(30,90%,55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع الجنس</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {genderData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {injuryData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm">الحالات حسب نوع الإصابة</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={injuryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(340,75%,55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">قائمة الحالات ({filteredBeneficiaries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['رقم الهوية','الاسم الرباعي','الجنس','المنطقة','نوع الإصابة','المشروع','عدد الجلسات','الحالة'].map(h => (
                    <th key={h} className="text-start py-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBeneficiaries.map(b => {
                  const sessionCount = sessions.filter(s => s.beneficiaryId === b.id).length;
                  return (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono text-xs">{b.nationalId}</td>
                      <td className="py-2.5 px-3 font-medium whitespace-nowrap">{b.fullName}</td>
                      <td className="py-2.5 px-3">{b.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{b.residenceArea}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-xs">{b.injuryType}</td>
                      <td className="py-2.5 px-3">{b.project}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-primary">{sessionCount}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${b.caseStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {b.caseStatus === 'active' ? 'نشط' : 'مغلق'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
