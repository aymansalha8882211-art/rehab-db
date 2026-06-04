import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, Lock, User, AlertCircle } from 'lucide-react';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    const result = await login(data.username, data.password);
    if (result === true) {
      setLocation('/search');
    } else if (typeof result === 'string') {
      // رسالة خطأ محددة من الـ server (مثل: حساب معطّل)
      setError(result);
    } else {
      setError(language === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Invalid username or password');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg">
            <span className="text-primary-foreground text-xl font-bold">RD</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('Rehabilitation Database')}</h1>
          <p className="text-sm text-muted-foreground">{t('Welcome back')}</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('Login')}</CardTitle>
            <CardDescription className="text-xs">{t('Enter your credentials')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm">{t('Username')}</Label>
                <div className="relative">
                  <User className={`absolute top-2.5 w-4 h-4 text-muted-foreground ${language === 'ar' ? 'right-3' : 'left-3'}`} />
                  <Input
                    id="username"
                    data-testid="input-username"
                    className={language === 'ar' ? 'pr-9' : 'pl-9'}
                    autoComplete="username"
                    {...register('username')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">{t('Password')}</Label>
                <div className="relative">
                  <Lock className={`absolute top-2.5 w-4 h-4 text-muted-foreground ${language === 'ar' ? 'right-3' : 'left-3'}`} />
                  <Input
                    id="password"
                    type="password"
                    data-testid="input-password"
                    className={language === 'ar' ? 'pr-9' : 'pl-9'}
                    autoComplete="current-password"
                    {...register('password')}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                data-testid="btn-login"
                className="w-full"
                disabled={isSubmitting}
              >
                {t('Login')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <button
            data-testid="lang-toggle-login"
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {language === 'ar' ? 'English' : 'عربي'}
          </button>
        </div>

        <div className="text-xs text-muted-foreground text-center space-y-1">
        </div>
      </div>
    </div>
  );
}
