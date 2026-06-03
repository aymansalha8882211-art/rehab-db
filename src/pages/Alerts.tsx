import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/dataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, CheckCircle2, Filter, Plus, CheckCheck, User, UserCheck, X, Clock, AlertTriangle } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { Alert } from '@/data/mockData';

const alertTypeBadge: Record<string, string> = {
  device_needed:    'bg-orange-100 text-orange-700 border-orange-200',
  follow_up_needed: 'bg-blue-100 text-blue-700 border-blue-200',
  missing_data:     'bg-yellow-100 text-yellow-700 border-yellow-200',
};
const priorityBadge: Record<string, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-gray-100 text-gray-600',
};
const emptyForm = {
  beneficiaryId: '',
  alertType: 'follow_up_needed' as Alert['alertType'],
  priority: 'medium' as Alert['priority'],
  alertMessage: '',
  assignedToUserId: '',
  assignedToUserName: '',
};

export default function Alerts() {
  const { language, t } = useLanguage();
  const { currentUser }  = useAuth();
  const { toast }        = useToast();
  const [, setLocation]  = useLocation();
  const { alerts, beneficiaries, sessions, users, resolveAlert, addAlert } = useData();

  const isAr = language === 'ar';

  // ─── إنشاء تنبيهات تلقائية للحالات المتأخرة ──────────
  // نستخدم beneficiaries و sessions فقط كـ dependency — مش alerts — لمنع الـ loop
  useEffect(() => {
    if (!beneficiaries.length || !sessions.length) return;

    const today   = new Date();
    const DAYS_30 = 30 * 24 * 60 * 60 * 1000;

    beneficiaries.forEach(b => {
      if (b.caseStatus !== 'active') return;

      // آخر جلسة لهذه الحالة
      const benSessions = sessions
        .filter(s => s.beneficiaryId === b.id)
        .sort((a, c) => c.serviceDate.localeCompare(a.serviceDate));

      const lastSession = benSessions[0];
      if (!lastSession) return;

      const lastDate  = new Date(lastSession.serviceDate);
      const diffMs    = today.getTime() - lastDate.getTime();
      const diffDays  = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // تحقق إذا فيه تنبيه متأخر موجود مسبقاً وغير محلول
      const existingAlert = alerts.find(
        a => a.beneficiaryId === b.id &&
             a.alertType === 'follow_up_needed' &&
             !a.isResolved &&
             a.alertMessage?.includes('يوم')
      );

      if (diffDays >= 30 && !existingAlert) {
        const newAlert: Alert = {
          id: `auto_followup_${b.id}_${Date.now()}`,
          beneficiaryId: b.id,
          alertType: 'follow_up_needed',
          priority: diffDays >= 60 ? 'high' : 'medium',
          alertMessage: `لم تتم زيارة الحالة منذ ${diffDays} يوماً — آخر جلسة: ${lastSession.serviceDate}`,
          isResolved: false,
          createdAt: new Date().toISOString().split('T')[0],
          createdBy: 'system',
          createdByName: 'النظام (تلقائي)',
        };
        addAlert(newAlert);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beneficiaries.length, sessions.length]);

  const [typeFilter,     setTypeFilter]     = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showResolved,   setShowResolved]   = useState(false);
  const [myAlertsOnly,   setMyAlertsOnly]   = useState(false);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [bulkResolving,  setBulkResolving]  = useState(false);

  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [form,         setForm]         = useState({ ...emptyForm });
  const [benSearch,    setBenSearch]    = useState('');
  const [userSearch,   setUserSearch]   = useState('');
  const [showBenList,  setShowBenList]  = useState(false);
  const [showUserList, setShowUserList] = useState(false);

  const getBeneficiary = (id: string) => beneficiaries.find(b => b.id === id);

  const alertTypeLabel = (type: string) => ({
    device_needed:    isAr ? 'يحتاج أداة مساعدة' : 'Device Needed',
    follow_up_needed: isAr ? 'يحتاج متابعة'       : 'Follow-up Needed',
    missing_data:     isAr ? 'بيانات ناقصة'        : 'Missing Data',
  }[type] ?? type);

  const priorityLabel = (p: string) => ({
    high:   isAr ? 'عالية'   : 'High',
    medium: isAr ? 'متوسطة' : 'Medium',
    low:    isAr ? 'منخفضة' : 'Low',
  }[p] ?? p);

  const handleResolve = async (alertId: string) => {
    await resolveAlert(alertId, currentUser?.fullName || '');
    toast({ title: isAr ? 'تم حل التنبيه بنجاح' : 'Alert resolved successfully' });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkResolve = async () => {
    if (!selectedIds.size) return;
    setBulkResolving(true);
    try {
      for (const id of selectedIds) await resolveAlert(id, currentUser?.fullName || '');
      toast({ title: isAr ? `تم حل ${selectedIds.size} تنبيه بنجاح` : `Resolved ${selectedIds.size} alerts` });
      setSelectedIds(new Set());
    } finally { setBulkResolving(false); }
  };

  const handleAddAlert = async () => {
    if (!form.beneficiaryId || !form.alertMessage.trim()) {
      toast({ title: isAr ? 'يرجى اختيار المستفيد وكتابة رسالة التنبيه' : 'Please select a beneficiary and write a message', variant: 'destructive' });
      return;
    }
    const newAlert: Alert = {
      id: 'a_manual_' + Date.now(),
      beneficiaryId: form.beneficiaryId,
      alertType: form.alertType,
      priority: form.priority,
      alertMessage: form.alertMessage.trim(),
      isResolved: false,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser?.id,
      createdByName: currentUser?.fullName,
      ...(form.assignedToUserId ? { assignedToUserId: form.assignedToUserId, assignedToUserName: form.assignedToUserName } : {}),
    };
    await addAlert(newAlert);
    toast({ title: isAr ? 'تم إضافة التنبيه بنجاح' : 'Alert added successfully' });
    setDialogOpen(false);
    resetDialog();
  };

  const resetDialog = () => {
    setForm({ ...emptyForm }); setBenSearch(''); setUserSearch('');
    setShowBenList(false); setShowUserList(false);
  };

  const filteredBeneficiaries = benSearch.trim()
    ? beneficiaries.filter(b => b.fullName.includes(benSearch) || b.nationalId.includes(benSearch)).slice(0, 10)
    : beneficiaries.slice(0, 8);

  const activeUsers = users.filter(u =>
    u.status === 'active' && u.id !== currentUser?.id &&
    (userSearch.trim() ? u.fullName.includes(userSearch) || u.username.includes(userSearch) : true)
  );

  const myAssignedCount = alerts.filter(a => !a.isResolved && a.assignedToUserId === currentUser?.id).length;
  const unresolvedCount = alerts.filter(a => !a.isResolved).length;
  const autoAlertCount  = alerts.filter(a => !a.isResolved && a.createdBy === 'system').length;

  const filtered = alerts.filter(a => {
    if (!showResolved  && a.isResolved)  return false;
    if (showResolved   && !a.isResolved) return false;
    if (typeFilter     !== 'all' && a.alertType !== typeFilter)     return false;
    if (priorityFilter !== 'all' && a.priority  !== priorityFilter) return false;
    if (myAlertsOnly   && a.assignedToUserId !== currentUser?.id)   return false;
    return true;
  });

  // إحصاء الحالات المتأخرة
  const today   = new Date();
  const lateCount = beneficiaries.filter(b => {
    if (b.caseStatus !== 'active') return false;
    const benSessions = sessions.filter(s => s.beneficiaryId === b.id);
    if (!benSessions.length) return false;
    const last = benSessions.sort((a,c) => c.serviceDate.localeCompare(a.serviceDate))[0];
    const diff = Math.floor((today.getTime() - new Date(last.serviceDate).getTime()) / (1000*60*60*24));
    return diff >= 30;
  }).length;

  return (
    <div className="p-6 space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {t('Alerts')}
            {unresolvedCount > 0 && <Badge className="bg-destructive text-destructive-foreground text-xs">{unresolvedCount}</Badge>}
            {myAssignedCount > 0 && <Badge className="bg-violet-600 text-white text-xs gap-1"><UserCheck className="w-3 h-3"/>{myAssignedCount} {isAr ? 'موجَّه لي' : 'assigned to me'}</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{isAr ? 'التنبيهات والمتابعات المطلوبة' : 'Alerts and required follow-ups'}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" className="gap-2 text-sm border-green-300 text-green-700 hover:bg-green-50" onClick={handleBulkResolve} disabled={bulkResolving}>
              <CheckCheck className="w-4 h-4"/>
              {bulkResolving ? (isAr ? 'جارٍ الحل...' : 'Resolving...') : (isAr ? `حل المحدد (${selectedIds.size})` : `Resolve selected (${selectedIds.size})`)}
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} className="gap-2 text-sm">
            <Plus className="w-4 h-4"/>{t('Add Alert')}
          </Button>
        </div>
      </div>

      {/* تنبيه الحالات المتأخرة */}
      {lateCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {lateCount} حالة نشطة لم تُزار منذ أكثر من 30 يوماً
            </p>
            <p className="text-xs text-amber-600">تم إنشاء تنبيهات تلقائية لها — راجع القائمة أدناه</p>
          </div>
          {autoAlertCount > 0 && (
            <Badge className="bg-amber-200 text-amber-800 border-0">{autoAlertCount} تلقائي</Badge>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground"/>
          <span className="text-sm text-muted-foreground">{t('Filter')}:</span>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder={isAr ? 'نوع التنبيه' : 'Alert type'}/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All')}</SelectItem>
            <SelectItem value="device_needed">{isAr ? 'يحتاج أداة مساعدة' : 'Device Needed'}</SelectItem>
            <SelectItem value="follow_up_needed">{isAr ? 'يحتاج متابعة' : 'Follow-up Needed'}</SelectItem>
            <SelectItem value="missing_data">{isAr ? 'بيانات ناقصة' : 'Missing Data'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder={isAr ? 'الأولوية' : 'Priority'}/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All')}</SelectItem>
            <SelectItem value="high">{t('High')}</SelectItem>
            <SelectItem value="medium">{t('Medium')}</SelectItem>
            <SelectItem value="low">{t('Low')}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={myAlertsOnly ? 'default' : 'outline'} size="sm" className="h-8 text-xs gap-1.5" onClick={() => setMyAlertsOnly(v=>!v)}>
          <UserCheck className="w-3.5 h-3.5"/>
          {t('My Alerts')}
          {myAssignedCount > 0 && <span className="bg-white/20 text-inherit rounded-full px-1.5 py-0 text-xs font-bold">{myAssignedCount}</span>}
        </Button>
        <Button variant={showResolved ? 'default' : 'outline'} size="sm" className="h-8 text-xs" onClick={() => setShowResolved(v=>!v)}>
          <CheckCircle2 className="w-3.5 h-3.5 me-1.5"/>{t('Show Resolved')}
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
        <span className="font-medium">{isAr ? 'تنبيهات تلقائية:' : 'Auto-alerts:'}</span>
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1"><Clock className="w-3 h-3"/>30+ يوم بدون زيارة</span>
        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">أداة مساعدة مطلوبة</span>
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">تدهور / بدون تحسن</span>
        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">مخاطر حماية</span>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center"><Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3"/><p className="text-sm text-muted-foreground">{t('No alerts found')}</p></CardContent></Card>
        ) : filtered.map(alert => {
          const ben          = getBeneficiary(alert.beneficiaryId);
          const isSelected   = selectedIds.has(alert.id);
          const isAssignedToMe = alert.assignedToUserId === currentUser?.id;
          const isAuto       = alert.createdBy === 'system';
          return (
            <Card key={alert.id} className={`${alert.isResolved?'opacity-60':''} ${isSelected?'ring-2 ring-primary/40':''} ${isAssignedToMe?'border-violet-200':''} ${isAuto && !alert.isResolved ? 'border-amber-200' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {!alert.isResolved && <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(alert.id)} className="mt-1 flex-shrink-0"/>}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${alertTypeBadge[alert.alertType]??'bg-gray-100 text-gray-700 border-gray-200'}`}>{alertTypeLabel(alert.alertType)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge[alert.priority]}`}>{priorityLabel(alert.priority)}</span>
                      {isAuto && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3"/>تلقائي</span>}
                      {alert.assignedToUserName && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${isAssignedToMe?'bg-violet-100 text-violet-700':'bg-gray-100 text-gray-600'}`}>
                          <UserCheck className="w-3 h-3"/>
                          {isAssignedToMe ? (isAr?'موجَّه إليك':'Assigned to you') : (isAr?`موجَّه إلى: ${alert.assignedToUserName}`:`Assigned to: ${alert.assignedToUserName}`)}
                        </span>
                      )}
                      {alert.isResolved && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{isAr?'محلول':'Resolved'}</span>}
                    </div>
                    {ben && (
                      <Link href={`/beneficiary/${ben.id}`} className="text-sm font-semibold text-primary hover:underline block">
                        {ben.fullName}<span className="text-xs text-muted-foreground font-normal ms-2">{ben.nationalId}</span>
                      </Link>
                    )}
                    <p className="text-sm text-muted-foreground">{alert.alertMessage}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{alert.createdAt}</span>
                      {alert.createdByName && <span>{isAr?`أنشأه: ${alert.createdByName}`:`Created by: ${alert.createdByName}`}</span>}
                      {alert.isResolved && alert.resolvedBy && <span className="text-green-600">{isAr?`حُل بواسطة: ${alert.resolvedBy}`:`Resolved by: ${alert.resolvedBy}`}</span>}
                    </div>
                  </div>
                  {!alert.isResolved && (
                    <Button size="sm" variant="outline" onClick={() => handleResolve(alert.id)} className="flex-shrink-0 text-xs gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5"/>{t('Resolve')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Alert Dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) resetDialog(); setDialogOpen(open); }}>
        <DialogContent className="max-w-md" dir={isAr ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{t('Add Alert')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('Beneficiary')} *</Label>
              <div className="relative">
                <Input placeholder={isAr?'ابحث بالاسم أو رقم الهوية...':'Search by name or ID...'} value={benSearch}
                  onChange={e=>{setBenSearch(e.target.value);setForm(f=>({...f,beneficiaryId:''}));setShowBenList(true);}}
                  onFocus={()=>setShowBenList(true)} className={form.beneficiaryId?'border-green-400 bg-green-50/50':''}/>
                {form.beneficiaryId && <button type="button" onClick={()=>{setForm(f=>({...f,beneficiaryId:''}));setBenSearch('');setShowBenList(true);}} className="absolute top-2.5 start-2.5 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5"/></button>}
              </div>
              {showBenList && !form.beneficiaryId && (
                <div className="border border-border rounded-lg overflow-hidden shadow-sm">
                  <div className="max-h-44 overflow-y-auto">
                    {filteredBeneficiaries.length > 0 ? filteredBeneficiaries.map(b=>(
                      <button key={b.id} type="button" onClick={()=>{setForm(f=>({...f,beneficiaryId:b.id}));setBenSearch(b.fullName);setShowBenList(false);}}
                        className="w-full text-start px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2">
                        <span className="font-medium">{b.fullName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{b.nationalId}</span>
                      </button>
                    )) : <p className="text-xs text-muted-foreground px-3 py-2">{isAr?'لا توجد نتائج':'No results'}</p>}
                  </div>
                  <div className="border-t border-border p-2">
                    <button type="button" onClick={()=>{setDialogOpen(false);resetDialog();setLocation('/beneficiary/new');}}
                      className="w-full text-start px-3 py-1.5 text-xs text-primary hover:bg-primary/5 rounded-md transition-colors flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5"/>{t('Add New Case')}
                    </button>
                  </div>
                </div>
              )}
              {form.beneficiaryId && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>{isAr?'تم اختيار المستفيد':'Beneficiary selected'}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{isAr?'نوع التنبيه':'Alert type'} *</Label>
              <Select value={form.alertType} onValueChange={v=>setForm(f=>({...f,alertType:v as Alert['alertType']}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="device_needed">{isAr?'يحتاج أداة مساعدة':'Device Needed'}</SelectItem>
                  <SelectItem value="follow_up_needed">{isAr?'يحتاج متابعة':'Follow-up Needed'}</SelectItem>
                  <SelectItem value="missing_data">{isAr?'بيانات ناقصة':'Missing Data'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{isAr?'الأولوية':'Priority'} *</Label>
              <Select value={form.priority} onValueChange={v=>setForm(f=>({...f,priority:v as Alert['priority']}))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">{t('High')}</SelectItem>
                  <SelectItem value="medium">{t('Medium')}</SelectItem>
                  <SelectItem value="low">{t('Low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">{isAr?'رسالة التنبيه':'Alert message'} *</Label>
              <Textarea placeholder={isAr?'اكتب تفاصيل التنبيه...':'Write alert details...'} value={form.alertMessage} onChange={e=>setForm(f=>({...f,alertMessage:e.target.value}))} rows={3}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground"/>
                {isAr?'وجِّه إلى زميل':'Assign to colleague'}
                <span className="text-muted-foreground font-normal text-xs">({isAr?'اختياري':'optional'})</span>
              </Label>
              <div className="relative">
                <Input placeholder={isAr?'ابحث باسم الزميل...':'Search by colleague name...'} value={userSearch}
                  onChange={e=>{setUserSearch(e.target.value);if(form.assignedToUserId)setForm(f=>({...f,assignedToUserId:'',assignedToUserName:''}));setShowUserList(true);}}
                  onFocus={()=>setShowUserList(true)} className={form.assignedToUserId?'border-violet-400 bg-violet-50/50':''}/>
                {form.assignedToUserId && <button type="button" onClick={()=>{setForm(f=>({...f,assignedToUserId:'',assignedToUserName:''}));setUserSearch('');}} className="absolute top-2.5 start-2.5 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5"/></button>}
              </div>
              {showUserList && !form.assignedToUserId && activeUsers.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden shadow-sm max-h-40 overflow-y-auto">
                  {activeUsers.map(u=>(
                    <button key={u.id} type="button" onClick={()=>{setForm(f=>({...f,assignedToUserId:u.id,assignedToUserName:u.fullName}));setUserSearch(u.fullName);setShowUserList(false);}}
                      className="w-full text-start px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2">
                      <span className="font-medium">{u.fullName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.assignedToUserName && <p className="text-xs text-violet-600 flex items-center gap-1"><UserCheck className="w-3.5 h-3.5"/>{isAr?`موجَّه إلى ${form.assignedToUserName}`:`Assigned to ${form.assignedToUserName}`}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>{setDialogOpen(false);resetDialog();}}>{t('Cancel')}</Button>
            <Button onClick={handleAddAlert}>{t('Add Alert')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
