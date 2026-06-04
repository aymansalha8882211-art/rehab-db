import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useData } from '@/lib/dataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Role, DEFAULT_PERMISSIONS, UserPermissions, ROLE_LABELS } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Pencil, Shield, Eye, Edit2, User as UserIcon, Settings2, Trash2, Send, Copy, AlertTriangle } from 'lucide-react';

const roleBadgeColors: Record<Role, string> = {
  admin:         'bg-purple-100 text-purple-700',
  supervisor:    'bg-blue-100 text-blue-700',
  data_entry:    'bg-green-100 text-green-700',
  viewer:        'bg-gray-100 text-gray-600',
  nursing:       'bg-orange-100 text-orange-700',
  psychology:    'bg-pink-100 text-pink-700',
  physiotherapy: 'bg-teal-100 text-teal-700',
};

const roleIcons: Record<string, typeof Shield> = {
  admin: Shield, supervisor: Eye, data_entry: Edit2,
  viewer: UserIcon, nursing: UserIcon, psychology: UserIcon, physiotherapy: UserIcon,
};

const PERM_LABELS: Record<keyof UserPermissions, string> = {
  canAddSession:       'إضافة جلسة',
  canEditSession:      'تعديل جلساته',
  canDeleteSession:    'حذف جلساته',
  canAddBeneficiary:  'إضافة حالة جديدة',
  canEditBeneficiary: 'تعديل بيانات حالة',
  canCloseCase:       'إغلاق حالة',
  canTransferCase:    'نقل حالة',
  canViewReports:     'مشاهدة التقارير',
  canViewStats:       'مشاهدة الإحصاءات',
  canManageUsers:     'إدارة المستخدمين',
  allowedServiceTypes: 'أنواع الخدمات المسموحة',
};

const ALL_SERVICE_TYPES = ['علاج طبيعي', 'علاج وظيفي', 'تمريض', 'دعم نفسي', 'توجيه أسري'];
const SITE_URL = 'https://rehab-db.pages.dev';

function PermissionsPanel({ role, permissions, onChange }: {
  role: Role;
  permissions: Partial<UserPermissions>;
  onChange: (p: Partial<UserPermissions>) => void;
}) {
  const base   = DEFAULT_PERMISSIONS[role];
  const merged = { ...base, ...permissions };

  const toggleBool = (key: keyof UserPermissions) => {
    if (key === 'allowedServiceTypes') return;
    onChange({ ...permissions, [key]: !merged[key] });
  };

  const toggleServiceType = (type: string) => {
    const current = merged.allowedServiceTypes || [];
    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    onChange({ ...permissions, allowedServiceTypes: updated });
  };

  const boolKeys = (Object.keys(PERM_LABELS) as (keyof UserPermissions)[]).filter(k => k !== 'allowedServiceTypes');

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        الصلاحيات الافتراضية لدور <span className="font-semibold text-foreground">{ROLE_LABELS[role]}</span> — يمكنك تخصيصها لهذا المستخدم
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {boolKeys.map(key => {
          const isDefault = base[key as keyof typeof base];
          const current   = merged[key as keyof typeof merged] as boolean;
          return (
            <div key={key} className={`flex items-center justify-between p-2.5 rounded-lg border ${current ? 'bg-green-50/50 border-green-200' : 'bg-muted/30 border-border'}`}>
              <div className="min-w-0">
                <p className="text-xs font-medium">{PERM_LABELS[key]}</p>
                {current !== isDefault && <p className="text-[10px] text-amber-600">معدّل من الافتراضي</p>}
              </div>
              <Switch checked={current} onCheckedChange={() => toggleBool(key)} className={current ? 'data-[state=checked]:bg-green-600' : ''} />
            </div>
          );
        })}
      </div>
      {merged.canAddSession && (
        <div className="space-y-2 p-3 rounded-lg border bg-blue-50/30 border-blue-200">
          <p className="text-xs font-medium text-blue-700">
            أنواع الخدمات المسموح له بإضافتها
            <span className="text-muted-foreground font-normal me-1"> (فارغ = كل الأنواع)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_SERVICE_TYPES.map(type => {
              const allowed = merged.allowedServiceTypes || [];
              return (
                <label key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs cursor-pointer border transition-all ${allowed.includes(type) ? 'bg-blue-600 text-white border-blue-600' : allowed.length === 0 ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-muted text-muted-foreground border-border'}`}>
                  <Checkbox checked={allowed.includes(type)} onCheckedChange={() => toggleServiceType(type)} className="w-3 h-3" />
                  {type}
                </label>
              );
            })}
          </div>
          {(merged.allowedServiceTypes?.length ?? 0) === 0 && <p className="text-[10px] text-blue-600">كل أنواع الخدمات مسموحة حالياً</p>}
        </div>
      )}
    </div>
  );
}

export default function Users() {
  const { toast } = useToast();
  const { users, addUser, updateUser, deleteUser } = useData();

  const [open,      setOpen]      = useState(false);
  const [editing,   setEditing]   = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [form, setForm] = useState({
    fullName: '', username: '', password: '',
    role: 'data_entry' as Role,
    projects: [] as string[],
    status: 'active' as User['status'],
    permissions: {} as Partial<UserPermissions>,
    assignedStaff: [] as string[],
  });

  const [deleteDialog,   setDeleteDialog]   = useState<User | null>(null);
  const [deleteWithData, setDeleteWithData] = useState(false);
  const [deleteLoading,  setDeleteLoading]  = useState(false);
  const [credDialog,     setCredDialog]     = useState<User | null>(null);

  const openAdd = () => {
    setEditing(null); setActiveTab('info');
    setForm({ fullName: '', username: '', password: '', role: 'data_entry', projects: [], status: 'active', permissions: {} });
    setOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user); setActiveTab('info');
    setForm({ fullName: user.fullName, username: user.username, password: '', role: user.role, projects: user.projects, status: user.status, permissions: user.permissions || {}, assignedStaff: user.assignedStaff || [] });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName || !form.username) { toast({ title: 'يرجى ملء الحقول المطلوبة', variant: 'destructive' }); return; }
    if (editing) {
      await updateUser({ ...editing, ...form, projects: form.projects as any, permissions: Object.keys(form.permissions).length > 0 ? form.permissions : undefined, password: form.password || editing.password });
      toast({ title: 'تم تحديث المستخدم' });
    } else {
      if (!form.password) { toast({ title: 'كلمة المرور مطلوبة', variant: 'destructive' }); return; }
      await addUser({ id: 'u' + Date.now(), ...form, projects: form.projects as any, permissions: Object.keys(form.permissions).length > 0 ? form.permissions : undefined });
      toast({ title: 'تم إضافة المستخدم' });
    }
    setOpen(false);
  };

  const handleDelete = async () => {
  if (!deleteDialog) return;
  setDeleteLoading(true);
  try {
    if (deleteWithData) {
      // حذف حقيقي — يحذف السجل كاملاً
      await deleteUser(deleteDialog.id);
      toast({ title: `تم حذف ${deleteDialog.fullName} نهائياً` });
    } else {
      // تعطيل مؤقت — البيانات تبقى
      await updateUser({ ...deleteDialog, status: 'inactive' });
      toast({ title: `تم تعطيل حساب ${deleteDialog.fullName}` });
    }
    setDeleteDialog(null);
  } catch {
    toast({ title: 'فشلت العملية', variant: 'destructive' });
  } finally {
    setDeleteLoading(false);
  }
};

  const handleRoleChange = (role: Role) => setForm(f => ({ ...f, role, permissions: {} }));
  const toggleProject = (proj: string) => setForm(f => ({ ...f, projects: f.projects.includes(proj) ? f.projects.filter(p => p !== proj) : [...f.projects, proj] }));

  const getCredentialsText = (user: User) =>
    `مرحباً ${user.fullName} 👋\n\nبيانات دخولك إلى نظام إعادة التأهيل:\n🌐 الرابط: ${SITE_URL}\n👤 اسم المستخدم: ${user.username}\n🔑 كلمة المرور: ${user.password}\n\nيُرجى تغيير كلمة المرور بعد أول دخول من الإعدادات.`;

  const copyCredentials = (user: User) => {
    navigator.clipboard.writeText(getCredentialsText(user));
    toast({ title: 'تم نسخ بيانات الدخول ✅' });
  };

  const shareViaWhatsApp = (user: User) => {
    const text = encodeURIComponent(getCredentialsText(user));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">إدارة المستخدمين</h1>
          <p className="text-sm text-muted-foreground mt-0.5">إدارة المستخدمين والصلاحيات</p>
        </div>
        <Button onClick={openAdd} className="gap-2 text-sm">
          <UserPlus className="w-4 h-4" />إضافة مستخدم
        </Button>
      </div>

      <div className="grid gap-3">
        {users.map(user => {
          const RoleIcon = roleIcons[user.role] || UserIcon;
          const hasCustomPerms = user.permissions && Object.keys(user.permissions).length > 0;
          return (
            <Card key={user.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <RoleIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{user.fullName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColors[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                    {hasCustomPerms && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Settings2 className="w-3 h-3" />صلاحيات مخصصة
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">@{user.username}</p>
                  <div className="flex gap-1 mt-1">
                    {user.projects.map(p => <Badge key={p} variant="outline" className="text-xs h-5">{p}</Badge>)}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setCredDialog(user)} title="إرسال بيانات الدخول">
                    <Send className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {user.role !== 'admin' && (
                    <Button variant="ghost" size="sm" onClick={() => { setDeleteWithData(false); setDeleteDialog(user); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog إضافة/تعديل */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}</DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">البيانات الأساسية</TabsTrigger>
              <TabsTrigger value="permissions" className="flex-1 gap-1"><Settings2 className="w-3.5 h-3.5" />الصلاحيات</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label className="text-sm">الاسم الكامل *</Label>
                <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">اسم المستخدم *</Label>
                <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">كلمة المرور {editing ? '(اتركها فارغة للإبقاء)' : '*'}</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">الدور *</Label>
                <Select value={form.role} onValueChange={v => handleRoleChange(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير النظام</SelectItem>
                    <SelectItem value="supervisor">مشرف</SelectItem>
                    <SelectItem value="data_entry">مدخل بيانات</SelectItem>
                    <SelectItem value="viewer">مشاهد</SelectItem>
                    <SelectItem value="nursing">تمريض</SelectItem>
                    <SelectItem value="psychology">دعم نفسي</SelectItem>
                    <SelectItem value="physiotherapy">علاج طبيعي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'data_entry' && (
  <div className="space-y-2">
    <Label className="text-sm">الموظفون المسموح له بالإدخال عنهم</Label>
    <p className="text-xs text-muted-foreground">اتركها فارغة = يشوف كل موظفي مشروعه</p>
    <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
      {users
        .filter(u =>
          form.projects.some(p => u.projects?.includes(p)) &&
          !['admin','data_entry','viewer','supervisor'].includes(u.role) &&
          u.status === 'active'
        )
        .map(u => (
          <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
            <Checkbox
              checked={(form.assignedStaff || []).includes(u.fullName)}
              onCheckedChange={() => {
                const current = form.assignedStaff || [];
                setForm(f => ({
                  ...f,
                  assignedStaff: current.includes(u.fullName)
                    ? current.filter(n => n !== u.fullName)
                    : [...current, u.fullName]
                }));
              }}
            />
            <span className="text-sm">{u.fullName}</span>
            <span className="text-xs text-muted-foreground me-auto">{ROLE_LABELS[u.role]}</span>
          </label>
        ))}
      {users.filter(u => form.projects.some(p => u.projects?.includes(p)) && !['admin','data_entry','viewer','supervisor'].includes(u.role) && u.status === 'active').length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">اختر مشروعاً أولاً</p>
      )}
    </div>
  </div>
)}
               
              <div className="space-y-2">
                <Label className="text-sm">المشاريع المسموح بها</Label>
                <div className="flex gap-4">
                  {['CBM', 'Church'].map(proj => (
                    <div key={proj} className="flex items-center gap-2">
                      <Checkbox id={proj} checked={form.projects.includes(proj)} onCheckedChange={() => toggleProject(proj)} />
                      <Label htmlFor={proj} className="text-sm cursor-pointer">{proj}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">الحالة</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as User['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="permissions" className="pt-3">
              <PermissionsPanel role={form.role} permissions={form.permissions} onChange={p => setForm(f => ({ ...f, permissions: p }))} />
            </TabsContent>
          </Tabs>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog حذف المستخدم */}
      <Dialog open={!!deleteDialog} onOpenChange={o => { if (!o) setDeleteDialog(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />حذف المستخدم
            </DialogTitle>
            <DialogDescription>
              أنت على وشك حذف <span className="font-bold text-foreground">{deleteDialog?.fullName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${!deleteWithData ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
              <input type="radio" checked={!deleteWithData} onChange={() => setDeleteWithData(false)} className="mt-0.5 accent-primary" />
              <div>
                <p className="text-sm font-medium">حذف المستخدم فقط</p>
                <p className="text-xs text-muted-foreground mt-0.5">تُحذف بيانات الحساب — الجلسات والحالات التي أدخلها تبقى في النظام</p>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${deleteWithData ? 'border-red-500 bg-red-50' : 'border-border hover:border-red-300'}`}>
              <input type="radio" checked={deleteWithData} onChange={() => setDeleteWithData(true)} className="mt-0.5 accent-red-600" />
              <div>
                <p className="text-sm font-medium text-red-700">حذف المستخدم وجميع بياناته</p>
                <p className="text-xs text-red-600 mt-0.5">⚠️ تُحذف كل الجلسات والحالات التي أدخلها — لا يمكن التراجع</p>
              </div>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={deleteLoading}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading} className="gap-2">
              <Trash2 className="w-4 h-4" />{deleteLoading ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog إرسال بيانات الدخول */}
      <Dialog open={!!credDialog} onOpenChange={o => { if (!o) setCredDialog(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />إرسال بيانات الدخول
            </DialogTitle>
            <DialogDescription>بيانات دخول {credDialog?.fullName}</DialogDescription>
          </DialogHeader>
          {credDialog && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-muted/50 border border-border leading-relaxed whitespace-pre-line text-xs font-mono">
                {getCredentialsText(credDialog)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => { shareViaWhatsApp(credDialog); setCredDialog(null); }}>
                  <Send className="w-4 h-4" />واتساب
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => { copyCredentials(credDialog); setCredDialog(null); }}>
                  <Copy className="w-4 h-4" />نسخ النص
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">يُنصح بإخبار المستخدم بتغيير كلمة المرور من الإعدادات</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCredDialog(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}