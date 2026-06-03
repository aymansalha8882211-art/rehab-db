import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useData } from '@/lib/dataContext';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X,
  ArrowLeft, RefreshCw, TableProperties
} from 'lucide-react';
import { useLocation } from 'wouter';
import {
  GAZA_AREAS, INJURY_TYPES, BENEFICIARY_CLASSIFICATIONS,
  Beneficiary
} from '@/data/mockData';

// ─── Types ────────────────────────────────────────────────────────────────────
type ImportMode = 'beneficiaries';
type RowData = Record<string, string>;

interface FieldDef {
  key: keyof Beneficiary;
  label: string;
  required: boolean;
  hint?: string;
}

// ─── Field definitions ────────────────────────────────────────────────────────
const BENEFICIARY_FIELDS: FieldDef[] = [
  { key: 'nationalId',            label: 'رقم الهوية',           required: true  },
  { key: 'fullName',              label: 'الاسم الرباعي',         required: true  },
  { key: 'gender',                label: 'الجنس (male/female)',   required: true  },
  { key: 'dateOfBirth',           label: 'تاريخ الميلاد',         required: true, hint: 'YYYY-MM-DD' },
  { key: 'injuryDate',            label: 'تاريخ الإصابة',         required: true, hint: 'YYYY-MM-DD' },
  { key: 'phone',                 label: 'رقم الجوال',            required: true  },
  { key: 'alternativePhone',      label: 'جوال بديل',             required: false },
  { key: 'residenceArea',         label: 'منطقة السكن',           required: true  },
  { key: 'caregiverName',         label: 'اسم الوصي',             required: true  },
  { key: 'injuryType',            label: 'نوع الإصابة',           required: true  },
  { key: 'classification',        label: 'تصنيف المستفيد',        required: true  },
  { key: 'project',               label: 'المشروع (CBM/Church)',  required: true  },
  { key: 'hasDisability',         label: 'إعاقة (true/false)',    required: false },
  { key: 'disabilityDescription', label: 'وصف الإعاقة',           required: false },
  { key: 'generalNotes',          label: 'ملاحظات عامة',          required: false },
];

// Attempt to auto-match a column name to a field key
const AUTO_MAP: Record<string, keyof Beneficiary> = {
  'رقم الهوية': 'nationalId', 'national id': 'nationalId', 'nationalid': 'nationalId',
  'id': 'nationalId', 'هوية': 'nationalId', 'هويه': 'nationalId',
  'الاسم': 'fullName', 'الاسم الرباعي': 'fullName', 'الاسم الكامل': 'fullName',
  'full name': 'fullName', 'name': 'fullName', 'اسم': 'fullName',
  'الجنس': 'gender', 'gender': 'gender', 'جنس': 'gender',
  'تاريخ الميلاد': 'dateOfBirth', 'date of birth': 'dateOfBirth', 'dob': 'dateOfBirth',
  'تاريخ الإصابة': 'injuryDate', 'injury date': 'injuryDate',
  'رقم الجوال': 'phone', 'phone': 'phone', 'جوال': 'phone', 'هاتف': 'phone',
  'جوال بديل': 'alternativePhone', 'alt phone': 'alternativePhone',
  'منطقة السكن': 'residenceArea', 'المنطقة': 'residenceArea', 'area': 'residenceArea',
  'اسم الوصي': 'caregiverName', 'الوصي': 'caregiverName', 'caregiver': 'caregiverName',
  'نوع الإصابة': 'injuryType', 'injury type': 'injuryType',
  'تصنيف': 'classification', 'classification': 'classification',
  'المشروع': 'project', 'project': 'project',
  'إعاقة': 'hasDisability', 'disability': 'hasDisability',
  'وصف الإعاقة': 'disabilityDescription', 'ملاحظات': 'generalNotes',
};

function normalizeGender(v: string): 'male' | 'female' {
  const l = v.trim().toLowerCase();
  if (l === 'female' || l === 'أنثى' || l === 'انثى' || l === 'f') return 'female';
  return 'male';
}

function normalizeDate(v: string): string {
  if (!v) return '';
  // Try to parse various formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
  const cleaned = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const parts = cleaned.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
    if (parseInt(parts[2]) > 1900) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return cleaned;
}

function normalizeArea(v: string): string {
  const match = GAZA_AREAS.find(a => a.includes(v.trim()) || v.trim().includes(a));
  return match || v.trim();
}

function parseBoolean(v: string): boolean {
  return ['true', '1', 'yes', 'نعم', 'يوجد'].includes(v.trim().toLowerCase());
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Import() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const { beneficiaries, addBeneficiary } = useData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [rawRows, setRawRows]     = useState<RowData[]>([]);
  const [columns, setColumns]     = useState<string[]>([]);
  const [fileName, setFileName]   = useState('');
  const [mapping, setMapping]     = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [results, setResults]     = useState({ imported: 0, skipped: 0, errors: 0 });
  const [dragging, setDragging]   = useState(false);

  // ─── Parse file ─────────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse<RowData>(file, {
        header: true, skipEmptyLines: true,
        complete: ({ data, meta }) => {
          setRawRows(data);
          const cols = meta.fields || [];
          setColumns(cols);
          initMapping(cols);
          setStep('map');
        },
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = e => {
        const wb = XLSX.read(e.target?.result, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<RowData>(ws, { defval: '', raw: false });
        const cols = data.length > 0 ? Object.keys(data[0]) : [];
        setRawRows(data);
        setColumns(cols);
        initMapping(cols);
        setStep('map');
      };
      reader.readAsBinaryString(file);
    } else {
      toast({ title: 'صيغة الملف غير مدعومة', description: 'استخدم CSV أو Excel (.xlsx)', variant: 'destructive' });
    }
  }, []);

  const initMapping = (cols: string[]) => {
    const m: Record<string, string> = {};
    cols.forEach(col => {
      const key = AUTO_MAP[col.trim().toLowerCase()] || AUTO_MAP[col.trim()];
      if (key) m[key] = col;
    });
    setMapping(m);
  };

  // ─── Drag & Drop ─────────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  // ─── Row conversion ──────────────────────────────────────────────────────────
  const convertRow = (row: RowData, index: number): Beneficiary | null => {
    const get = (field: string) => (mapping[field] ? (row[mapping[field]] || '') : '');
    const nationalId = get('nationalId').trim();
    const fullName   = get('fullName').trim();
    if (!nationalId || !fullName) return null;
    return {
      id: 'imp_' + Date.now() + '_' + index,
      nationalId,
      fullName,
      gender: normalizeGender(get('gender')),
      dateOfBirth: normalizeDate(get('dateOfBirth')),
      injuryDate:  normalizeDate(get('injuryDate')),
      phone:       get('phone').trim() || '—',
      alternativePhone: get('alternativePhone').trim(),
      residenceArea:    normalizeArea(get('residenceArea')) as any,
      caregiverName:    get('caregiverName').trim() || '—',
      injuryType:       get('injuryType').trim() as any,
      classification:   get('classification').trim() as any,
      project:          (get('project').trim() === 'Church' ? 'Church' : 'CBM') as 'CBM' | 'Church',
      hasDisability:    parseBoolean(get('hasDisability')),
      disabilityDescription: get('disabilityDescription').trim(),
      generalNotes:     get('generalNotes').trim(),
      caseStatus:       'active',
      registrationDate: new Date().toISOString().split('T')[0],
      createdBy:        currentUser?.id || '',
      createdAt:        new Date().toISOString().split('T')[0],
    };
  };

  const existingIds = new Set(beneficiaries.map(b => b.nationalId));

  const previewRows = rawRows.slice(0, 5).map((r, i) => convertRow(r, i)).filter(Boolean) as Beneficiary[];
  const totalRows   = rawRows.length;
  const dupCount    = rawRows.filter(r => {
    const id = mapping['nationalId'] ? r[mapping['nationalId']]?.trim() : '';
    return id && existingIds.has(id);
  }).length;
  const newCount = totalRows - dupCount;

  // ─── Import ───────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    let imported = 0, skipped = 0, errors = 0;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const nationalId = mapping['nationalId'] ? row[mapping['nationalId']]?.trim() : '';
      if (!nationalId || existingIds.has(nationalId)) { skipped++; continue; }
      const ben = convertRow(row, i);
      if (!ben) { errors++; continue; }
      try {
        await addBeneficiary(ben);
        existingIds.add(nationalId);
        imported++;
      } catch { errors++; }
      setProgress(Math.round(((i + 1) / rawRows.length) * 100));
    }
    setResults({ imported, skipped, errors });
    setImporting(false);
    setStep('done');
    toast({ title: `تم الاستيراد: ${imported} حالة جديدة` });
  };

  const reset = () => {
    setStep('upload'); setRawRows([]); setColumns([]);
    setFileName(''); setMapping({}); setProgress(0);
    setResults({ imported: 0, skipped: 0, errors: 0 });
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation('/search')} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TableProperties className="w-5 h-5 text-primary" />
            استيراد البيانات
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">استيراد المستفيدين من KoboToolbox أو Google Forms أو Excel</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(['upload', 'map', 'preview', 'done'] as const).map((s, i) => {
          const labels = ['رفع الملف', 'ربط الأعمدة', 'معاينة', 'اكتمل'];
          const active = s === step;
          const done = ['upload','map','preview','done'].indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${active ? 'bg-primary text-primary-foreground' : done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={active ? 'font-medium text-foreground' : 'text-muted-foreground'}>{labels[i]}</span>
              {i < 3 && <span className="text-muted-foreground">←</span>}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold text-sm">اسحب الملف هنا أو اضغط للاختيار</p>
              <p className="text-xs text-muted-foreground mt-1">يدعم: CSV، Excel (.xlsx / .xls)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
              />
            </div>

            {/* Tips */}
            <div className="mt-5 p-4 rounded-lg bg-blue-50 border border-blue-100 space-y-2">
              <p className="text-xs font-semibold text-blue-800">تعليمات التصدير:</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li><strong>KoboToolbox:</strong> البيانات → تنزيل → XLS Legacy أو CSV</li>
                <li><strong>Google Forms:</strong> جداول البيانات → ملف → تنزيل → CSV</li>
                <li>لا تحتاج لتغيير الأعمدة — النظام يربطها تلقائياً</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Column Mapping ── */}
      {step === 'map' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">ربط الأعمدة</CardTitle>
                <Badge variant="outline" className="text-xs">{fileName}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{totalRows} صف — ربط كل حقل بالعمود المناسب من ملفك</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {BENEFICIARY_FIELDS.map(f => (
                <div key={f.key} className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <Label className="text-xs font-medium">
                      {f.label}
                      {f.required && <span className="text-destructive ms-1">*</span>}
                    </Label>
                    {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                  </div>
                  <Select
                    value={mapping[f.key] || '__none__'}
                    onValueChange={v => setMapping(m => ({ ...m, [f.key]: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="— لا يوجد —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— لا يوجد —</SelectItem>
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-between">
            <Button variant="outline" onClick={reset} className="gap-2">
              <X className="w-4 h-4" /> إلغاء
            </Button>
            <Button
              onClick={() => setStep('preview')}
              disabled={!mapping['nationalId'] || !mapping['fullName']}
              className="gap-2"
            >
              معاينة البيانات
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{totalRows}</p>
                <p className="text-xs text-muted-foreground">إجمالي الصفوف</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{newCount}</p>
                <p className="text-xs text-muted-foreground">سيُستورد</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{dupCount}</p>
                <p className="text-xs text-muted-foreground">مكرر (سيُتخطى)</p>
              </CardContent>
            </Card>
          </div>

          {/* Preview table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">معاينة أول {Math.min(5, previewRows.length)} صفوف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['رقم الهوية', 'الاسم', 'الجنس', 'المنطقة', 'المشروع', 'نوع الإصابة'].map(h => (
                        <th key={h} className="text-start py-2 px-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className={`border-b border-border/50 ${existingIds.has(r.nationalId) ? 'opacity-40' : ''}`}>
                        <td className="py-2 px-2 font-mono">{r.nationalId}</td>
                        <td className="py-2 px-2 font-medium">{r.fullName}</td>
                        <td className="py-2 px-2">{r.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                        <td className="py-2 px-2">{r.residenceArea}</td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-xs">{r.project}</Badge>
                        </td>
                        <td className="py-2 px-2">{r.injuryType || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalRows > 5 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">… و {totalRows - 5} صفوف أخرى</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-between">
            <Button variant="outline" onClick={() => setStep('map')} className="gap-2">
              <ArrowLeft className="w-4 h-4 rotate-180" /> تعديل الربط
            </Button>
            <Button onClick={handleImport} disabled={newCount === 0} className="gap-2 min-w-36">
              <Upload className="w-4 h-4" />
              استيراد {newCount} حالة
            </Button>
          </div>
        </div>
      )}

      {/* ── Importing progress ── */}
      {importing && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <RefreshCw className="w-8 h-8 mx-auto text-primary animate-spin" />
            <p className="font-medium text-sm">جاري الاستيراد...</p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Done ── */}
      {step === 'done' && (
        <Card>
          <CardContent className="p-8 text-center space-y-5">
            <CheckCircle2 className="w-14 h-14 mx-auto text-green-500" />
            <div>
              <p className="text-xl font-bold">اكتمل الاستيراد!</p>
              <p className="text-sm text-muted-foreground mt-1">تم استيراد البيانات بنجاح إلى قاعدة البيانات</p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              <div className="p-3 rounded-lg bg-green-50 text-center">
                <p className="text-2xl font-bold text-green-700">{results.imported}</p>
                <p className="text-xs text-green-600">مُستورد</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 text-center">
                <p className="text-2xl font-bold text-amber-700">{results.skipped}</p>
                <p className="text-xs text-amber-600">مكرر</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 text-center">
                <p className="text-2xl font-bold text-red-700">{results.errors}</p>
                <p className="text-xs text-red-600">خطأ</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={reset} className="gap-2">
                <Upload className="w-4 h-4" /> استيراد ملف آخر
              </Button>
              <Button onClick={() => setLocation('/search')} className="gap-2">
                <CheckCircle2 className="w-4 h-4" /> عرض الحالات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supported formats info */}
      {step === 'upload' && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <p className="text-xs font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-primary" />
              الأعمدة التي يتعرف عليها النظام تلقائياً:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(AUTO_MAP).map(k => (
                <Badge key={k} variant="secondary" className="text-xs font-normal">{k}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
