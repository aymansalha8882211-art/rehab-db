import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/dataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Globe, Moon, Sun, Clock, User, Shield, Loader2, KeyRound, Save, Lock, LockOpen, LogOut, Wrench, AlertTriangle } from 'lucide-react';
import { getMaintenanceStatus, setMaintenanceStatus } from '@/lib/api';

export default function Settings() {
  const { t, language, setLanguage }                       = useLanguage();
  const { currentUser, sessionTimeoutMins, setSessionTimeoutMins,
          pinEnabled, setupPin, disablePin, lockNow }       = useAuth();
  const { users, updateUser }                              = useData();
  const { toast }                                          = useToast();

  const isAr = language === 'ar';

  const [darkMode, setDarkMode]             = useState(() => document.documentElement.classList.contains('dark'));
  const [profileName, setProfileName]       = useState(currentUser?.fullName || '');
  const [profilePhone, setProfilePhone]     = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPwd,  setCurrentPwd]  = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [pwdLoading,  setPwdLoading]  = useState(false);

  const [pinStep,  setPinStep]  = useState<'idle' | 'enter' | 'confirm'>('idle');
  const [pinFirst, setPinFirst] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // ── Maintenance — محفوظة في Supabase
  const [maintenance,    setMaintenance]    = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState(isAr ? 'الموقع تحت الصيانة، يرجى المحاولة لاحقاً.' : 'Site under maintenance, please try again later.');
  const [maintLoading,   setMaintLoading]   = useState(false);
  const [maintMsgLoading, setMaintMsgLoading] = useState(false);

  // جلب حالة الصيانة من Supabase عند فتح الصفحة
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      getMaintenanceStatus().then(({ enabled, message }) => {
        setMaintenance(enabled);
        setMaintenanceMsg(message);
      });
    }
  }, [currentUser]);

  const handleToggleMaintenance = async (v: boolean) => {
    setMaintLoading(true);
    try {
      await setMaintenanceStatus(v, maintenanceMsg);
      setMaintenance(v);
      if (v) {
        toast({ title: isAr ? '🔴 وضع الصيانة مفعّل' : '🔴 Maintenance mode enabled', description: isAr ? 'المستخدمون لن يتمكنوا من الدخول' : 'Users cannot access the site' });
      } else {
        toast({ title: isAr ? '🟢 الموقع يعمل بشكل طبيعي' : '🟢 Site is back online' });
      }
    } catch {
      toast({ title: isAr ? 'فشل تغيير حالة الصيانة' : 'Failed to update maintenance status', variant: 'destructive' });
    } finally {
      setMaintLoading(false);
    }
  };

  const handleSaveMaintenanceMsg = async () => {
    setMaintMsgLoading(true);
    try {
      await setMaintenanceStatus(maintenance, maintenanceMsg);
      toast({ title: isAr ? 'تم حفظ رسالة الصيانة' : 'Maintenance message saved' });
    } catch {
      toast({ title: isAr ? 'فشل الحفظ' : 'Save failed', variant: 'destructive' });
    } finally {
      setMaintMsgLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser) return;
    const dbUser = users.find(u => u.id === currentUser.id);
    if (!dbUser || dbUser.password !== currentPwd) {
      toast({ title: 'كلمة المرور الحالية غير صحيحة', variant: 'destructive' }); return;
    }
    if (newPwd.length < 6) {
      toast({ title: 'كلمة المرور الجديدة قصيرة جداً', description: '6 أحرف على الأقل', variant: 'destructive' }); return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: 'كلمة المرور الجديدة لا تطابق التأكيد', variant: 'destructive' }); return;
    }
    setPwdLoading(true);
    try {
      await updateUser({ ...dbUser, password: newPwd });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      toast({ title: 'تم تغيير كلمة المرور بنجاح' });
    } finally { setPwdLoading(false); }
  };

  const handleDarkMode = (v: boolean) => {
    setDarkMode(v);
    document.documentElement.classList.toggle('dark', v);
    // Without this the toggle worked but forgot itself on the next reload.
    try { localStorage.setItem('rehab-theme', v ? 'dark' : 'light'); } catch {}
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const trimmed = profileName.trim();
    if (!trimmed) { toast({ title: 'الاسم لا يمكن أن يكون فارغاً', variant: 'destructive' }); return; }
    const dbUser = users.find(u => u.id === currentUser.id);
    if (!dbUser) return;
    setProfileLoading(true);
    try {
      await updateUser({ ...dbUser, fullName: trimmed });
      toast({ title: 'تم حفظ الاسم بنجاح', description: 'سيظهر الاسم الجديد عند تسجيل الدخول التالي' });
    } catch { toast({ title: 'فشل الحفظ', variant: 'destructive' }); }
    finally { setProfileLoading(false); }
  };

  const handleTimeoutChange = (v: string) => {
    setSessionTimeoutMins(v === 'never' ? 'never' : Number(v));
    toast({ title: 'تم حفظ إعداد انتهاء الجلسة' });
  };

  const startPinSetup = () => { setPinStep('enter'); setPinInput(''); setPinFirst(''); setPinError(''); };

  const handlePinNext = () => {
    if (pinInput.length !== 4) { setPinError(isAr ? 'أدخل 4 أرقام' : 'Enter 4 digits'); return; }
    setPinFirst(pinInput); setPinInput(''); setPinError(''); setPinStep('confirm');
  };

  const handlePinConfirm = () => {
    if (pinInput !== pinFirst) { setPinError(isAr ? 'الرمزان غير متطابقين' : 'PINs do not match'); setPinInput(''); return; }
    setupPin(pinInput); setPinStep('idle'); setPinInput(''); setPinFirst(''); setPinError('');
    toast({ title: isAr ? 'تم تفعيل قفل PIN ✓' : 'PIN lock enabled ✓' });
  };

  const handleDisablePin = () => { disablePin(); toast({ title: isAr ? 'تم تعطيل قفل PIN' : 'PIN lock disabled' }); };

  const timeoutValue = sessionTimeoutMins === 'never' ? 'never' : String(sessionTimeoutMins);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-bold">{t('Settings')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isAr ? 'إعدادات النظام والحساب والأمان' : 'System, account and security settings'}
        </p>
      </div>

      {/* ── Maintenance Mode (Admin only) ── */}
      {currentUser?.role === 'admin' && (
        <Card className={`border-2 ${maintenance ? 'border-red-400 bg-red-50/30' : 'border-border'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className={`w-4 h-4 ${maintenance ? 'text-red-600' : 'text-primary'}`} />
              {isAr ? 'وضع الصيانة' : 'Maintenance Mode'}
              {maintenance && (
                <span className="ms-auto text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium animate-pulse">
                  {isAr ? 'مفعّل' : 'Active'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {maintenance && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-100 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">
                  {isAr ? 'الموقع مغلق حالياً — المستخدمون لا يمكنهم الدخول' : 'Site is currently closed — users cannot access it'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">{isAr ? 'تفعيل وضع الصيانة' : 'Enable Maintenance Mode'}</p>
                <p className="text-xs text-muted-foreground">
                  {isAr ? 'يمنع كل المستخدمين من الدخول (عدا الأدمن)' : 'Blocks all users except admin'}
                </p>
              </div>
              {maintLoading
                ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                : (
                  <Switch
                    checked={maintenance}
                    onCheckedChange={handleToggleMaintenance}
                    className={maintenance ? 'data-[state=checked]:bg-red-600' : ''}
                  />
                )
              }
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{isAr ? 'رسالة الصيانة' : 'Maintenance Message'}</Label>
              <div className="flex gap-2">
                <Input
                  value={maintenanceMsg}
                  onChange={e => setMaintenanceMsg(e.target.value)}
                  placeholder={isAr ? 'رسالة تظهر للمستخدمين...' : 'Message shown to users...'}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={handleSaveMaintenanceMsg} disabled={maintMsgLoading}>
                  {maintMsgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAr ? 'هذه الرسالة ستظهر للمستخدمين على كل الأجهزة عند محاولة الدخول' : 'This message appears to all users on all devices when they try to access the site'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Language */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />{isAr ? 'اللغة' : 'Language'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(['en', 'ar'] as const).map(lang => (
              <button key={lang} onClick={() => setLanguage(lang)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${language === lang ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                {lang === 'en' ? 'English' : 'العربية'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {darkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
            {isAr ? 'المظهر' : 'Appearance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{isAr ? 'الوضع الداكن' : 'Dark Mode'}</p>
              <p className="text-xs text-muted-foreground">{isAr ? 'تفعيل المظهر الداكن' : 'Enable dark theme'}</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={handleDarkMode} />
          </div>
        </CardContent>
      </Card>

      {/* Session Timeout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{isAr ? 'أمان الجلسة' : 'Session Security'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">{isAr ? 'تسجيل الخروج التلقائي عند الخمول' : 'Auto-logout on inactivity'}</Label>
            <Select value={timeoutValue} onValueChange={handleTimeoutChange}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">{isAr ? '15 دقيقة' : '15 minutes'}</SelectItem>
                <SelectItem value="30">{isAr ? '30 دقيقة (موصى)' : '30 minutes (recommended)'}</SelectItem>
                <SelectItem value="60">{isAr ? 'ساعة واحدة' : '1 hour'}</SelectItem>
                <SelectItem value="never">{isAr ? 'أبداً' : 'Never'}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {sessionTimeoutMins === 'never'
                ? (isAr ? 'لن يُسجَّل الخروج تلقائياً — يُنصح بالحذر' : 'Auto-logout disabled — use with caution')
                : (isAr ? `سيُسجَّل الخروج تلقائياً بعد ${sessionTimeoutMins} دقيقة` : `Auto-logout after ${sessionTimeoutMins} min`)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PIN Lock */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Lock className="w-4 h-4 text-primary" />{isAr ? 'قفل PIN' : 'PIN Lock'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {isAr ? 'يقفل التطبيق تلقائياً عند تبديل التبويب أو إخفاء النافذة' : 'Locks the app when you switch tabs or minimize'}
          </p>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {pinEnabled ? <Lock className="w-4 h-4 text-green-600" /> : <LockOpen className="w-4 h-4 text-muted-foreground" />}
              <span className="text-sm font-medium">{pinEnabled ? (isAr ? 'قفل PIN مفعّل' : 'PIN lock enabled') : (isAr ? 'قفل PIN معطّل' : 'PIN lock disabled')}</span>
            </div>
            {pinEnabled && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{isAr ? 'نشط' : 'Active'}</span>}
          </div>
          {pinStep === 'idle' && (
            <div className="flex gap-2">
              <Button variant={pinEnabled ? 'outline' : 'default'} size="sm" className="flex-1 gap-2" onClick={startPinSetup}>
                <Lock className="w-3.5 h-3.5" />{pinEnabled ? (isAr ? 'تغيير PIN' : 'Change PIN') : (isAr ? 'تفعيل قفل PIN' : 'Enable PIN Lock')}
              </Button>
              {pinEnabled && (
                <>
                  <Button variant="outline" size="sm" className="gap-2" onClick={lockNow}>
                    <LogOut className="w-3.5 h-3.5" />{isAr ? 'قفل الآن' : 'Lock Now'}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={handleDisablePin}>
                    <LockOpen className="w-3.5 h-3.5" />{isAr ? 'تعطيل' : 'Disable'}
                  </Button>
                </>
              )}
            </div>
          )}
          {pinStep === 'enter' && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium">{isAr ? 'أدخل رمز PIN الجديد (4 أرقام)' : 'Enter new PIN (4 digits)'}</p>
              <Input type="password" inputMode="numeric" maxLength={4} value={pinInput}
                onChange={e => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
                placeholder="••••" className="text-center text-xl tracking-widest font-mono w-32" autoFocus />
              {pinError && <p className="text-xs text-destructive">{pinError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePinNext}>{isAr ? 'التالي' : 'Next'}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setPinStep('idle'); setPinInput(''); setPinError(''); }}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </div>
          )}
          {pinStep === 'confirm' && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <p className="text-sm font-medium">{isAr ? 'أكّد رمز PIN' : 'Confirm your PIN'}</p>
              <Input type="password" inputMode="numeric" maxLength={4} value={pinInput}
                onChange={e => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
                placeholder="••••" className="text-center text-xl tracking-widest font-mono w-32" autoFocus />
              {pinError && <p className="text-xs text-destructive">{pinError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePinConfirm}>{isAr ? 'حفظ PIN' : 'Save PIN'}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setPinStep('idle'); setPinInput(''); setPinError(''); }}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" />{t('Change Password')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">{t('Current Password')}</Label>
            <Input type="password" placeholder="••••••••" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t('New Password')} {isAr ? '(6 أحرف على الأقل)' : '(min 6 characters)'}</Label>
            <Input type="password" placeholder="••••••••" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t('Confirm Password')}</Label>
            <Input type="password" placeholder="••••••••" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="font-mono" />
          </div>
          <Button onClick={handleChangePassword} disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd} className="w-full gap-2">
            {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {isAr ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4 text-primary" />{isAr ? 'الملف الشخصي' : 'Profile'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{currentUser?.fullName}</p>
              <p className="text-xs text-muted-foreground">@{currentUser?.username} · {t(currentUser?.role === 'data_entry' ? 'Data Entry' : currentUser?.role === 'admin' ? 'Admin' : currentUser?.role === 'supervisor' ? 'Supervisor' : 'Viewer')}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t('Full Name')}</Label>
            <Input value={profileName} onChange={e => setProfileName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">{t('Phone')}</Label>
            <Input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+970..." />
          </div>
          <Button onClick={handleSaveProfile} disabled={profileLoading || !profileName.trim() || profileName.trim() === currentUser?.fullName} className="w-full gap-2">
            {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('Save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
