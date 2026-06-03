import { useState } from 'react';
import { useData } from '@/lib/dataContext';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Search, ClipboardList } from 'lucide-react';
import { useLocation } from 'wouter';
import { Redirect } from 'wouter';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create:  { label: 'إضافة',    color: 'bg-green-100 text-green-700' },
  update:  { label: 'تعديل',    color: 'bg-blue-100 text-blue-700' },
  delete:  { label: 'حذف',      color: 'bg-red-100 text-red-700' },
  login:   { label: 'دخول',     color: 'bg-gray-100 text-gray-700' },
  logout:  { label: 'خروج',     color: 'bg-gray-100 text-gray-600' },
  backup:  { label: 'نسخ احتياطي', color: 'bg-purple-100 text-purple-700' },
  restore: { label: 'استعادة',  color: 'bg-orange-100 text-orange-700' },
  import:  { label: 'استيراد',  color: 'bg-teal-100 text-teal-700' },
  export:  { label: 'تصدير',    color: 'bg-indigo-100 text-indigo-700' },
};

const ENTITY_LABELS: Record<string, string> = {
  beneficiary: 'مستفيد',
  session:     'جلسة',
  user:        'مستخدم',
  alert:       'تنبيه',
  system:      'النظام',
};

export default function AuditLog() {
  const { currentUser } = useAuth();
  const { auditLogs, users } = useData();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  if (currentUser?.role !== 'admin') return <Redirect to="/search" />;

  // Enrich logs with userName from users table
  const enriched = auditLogs.map(log => {
    const user = users.find(u => u.id === log.userId);
    return { ...log, resolvedName: user?.fullName || log.userName || log.userId || '—' };
  });

  const filtered = enriched.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (entityFilter !== 'all' && log.entity !== entityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.resolvedName.toLowerCase().includes(q) ||
        (log.entityName || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('ar-EG') + ' ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          سجل التدقيق
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          تتبع كامل لجميع العمليات — من فعل ماذا ومتى (للمدير فقط)
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي العمليات', value: auditLogs.length, color: 'text-primary' },
          { label: 'إضافات',          value: auditLogs.filter(l => l.action === 'create').length,  color: 'text-green-600' },
          { label: 'تعديلات',         value: auditLogs.filter(l => l.action === 'update').length,  color: 'text-blue-600' },
          { label: 'حذوفات',          value: auditLogs.filter(l => l.action === 'delete').length,  color: 'text-red-600' },
        ].map((c, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="h-8 text-xs pe-9"
            placeholder="بحث باسم المستخدم أو التفاصيل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="نوع العملية" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل العمليات</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="الكيان" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} سجل</span>
      </div>

      {/* Log table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">لا توجد سجلات مطابقة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['الوقت', 'المستخدم', 'العملية', 'الكيان', 'التفاصيل'].map(h => (
                      <th key={h} className="text-start py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const act = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={log.id} className={`border-b border-border/40 hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap font-mono">
                          {formatTime(log.timestamp)}
                        </td>
                        <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Shield className="w-3 h-3 text-primary opacity-60" />
                            {log.resolvedName}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${act.color}`}>
                            {act.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge variant="outline" className="text-xs font-normal">
                            {ENTITY_LABELS[log.entity] || log.entity}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate">
                          {log.entityName && <span className="font-medium text-foreground">{log.entityName} — </span>}
                          {log.details || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
