'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT, useI18n } from '@/lib/i18n/i18n-provider';
import { useTheme, type ThemeMode } from '@/lib/theme/theme-provider';
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type Locale,
} from '@/lib/i18n/config';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Moon,
  Sun,
  Monitor,
  Bell,
  Mail,
  Tv,
  Database,
  Lock,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validators/auth';
import { changePassword } from '@/lib/api/users';
import { parseApiError } from '@/lib/errors/api-error';

type NotificationPrefs = {
  push: boolean;
  email: boolean;
  live: boolean;
};

export default function SettingsPage() {
  const t = useT();
  const { mode, setMode } = useTheme();
  const { locale, setLocale } = useI18n();
  const { isAuthenticated } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    push: true,
    email: false,
    live: true,
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dataSaver, setDataSaver] = useState(false);

  const handleSave = () => {
    setSavedAt(new Date().toLocaleString());
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          'omnicast.notifications',
          JSON.stringify(prefs),
        );
        window.localStorage.setItem(
          'omnicast.dataSaver',
          JSON.stringify(dataSaver),
        );
      } catch {
        /* ignore */
      }
    }
  };

  const themeOptions: Array<{
    value: ThemeMode;
    label: string;
    icon: typeof Moon;
  }> = [
    { value: 'light', label: t('settings.theme.light'), icon: Sun },
    { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
    { value: 'system', label: t('settings.theme.system'), icon: Monitor },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">{t('settings.title')}</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-dark-200 dark:text-dark-200 light:text-gray-700">
          {t('settings.section.appearance')}
        </h2>
        <Card className="p-6 space-y-6">
          <div>
            <div className="text-sm font-medium mb-3">
              {t('settings.theme.label')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-colors',
                      mode === opt.value
                        ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                        : 'border-dark-700 bg-dark-800/50 hover:border-dark-600 dark:border-dark-700 dark:bg-dark-800/50 light:border-gray-200 light:bg-white light:hover:border-gray-300',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-3">
              {t('settings.language.label')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_LOCALES.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocale(loc as Locale)}
                  className={cn(
                    'px-4 py-3 rounded-lg border text-sm transition-colors',
                    locale === loc
                      ? 'border-primary-500 bg-primary-500/10 text-primary-300'
                      : 'border-dark-700 bg-dark-800/50 hover:border-dark-600 dark:border-dark-700 dark:bg-dark-800/50 light:border-gray-200 light:bg-white light:hover:border-gray-300',
                  )}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-dark-200 dark:text-dark-200 light:text-gray-700">
          {t('settings.section.notifications')}
        </h2>
        <Card className="p-6 space-y-4">
          <ToggleRow
            icon={Bell}
            label={t('settings.notifications.push')}
            checked={prefs.push}
            onChange={(v) => setPrefs((p) => ({ ...p, push: v }))}
          />
          <ToggleRow
            icon={Mail}
            label={t('settings.notifications.email')}
            checked={prefs.email}
            onChange={(v) => setPrefs((p) => ({ ...p, email: v }))}
          />
          <ToggleRow
            icon={Tv}
            label={t('settings.notifications.live')}
            checked={prefs.live}
            onChange={(v) => setPrefs((p) => ({ ...p, live: v }))}
          />
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-dark-200 dark:text-dark-200 light:text-gray-700">
          {t('settings.section.account')}
        </h2>
        <Card className="p-6 space-y-4">
          <ToggleRow
            icon={Database}
            label={t('settings.dataSaver')}
            checked={dataSaver}
            onChange={setDataSaver}
          />
        </Card>
      </section>

      {/* Change password — only available for authenticated users. */}
      {isAuthenticated && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-dark-200 dark:text-dark-200 light:text-gray-700">
            Bảo mật
          </h2>
          <ChangePasswordCard />
        </section>
      )}

      <div className="flex items-center gap-4">
        <Button onClick={handleSave}>{t('settings.save')}</Button>
        {savedAt && (
          <span className="text-sm text-dark-400 dark:text-dark-400 light:text-gray-500">
            {savedAt}
          </span>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-dark-400 dark:text-dark-400 light:text-gray-500" />
        <span className="text-sm">{label}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-primary-500' : 'bg-dark-700 dark:bg-dark-700 light:bg-gray-300',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
  );
}

function ChangePasswordCard() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    setSubmitting(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Đổi mật khẩu thành công');
      reset();
    } catch (rawError) {
      const api = parseApiError(rawError);
      const description =
        api.fieldError('currentPassword') ??
        api.fieldError('newPassword') ??
        api.fieldError('_form') ??
        api.message;
      toast.error('Đổi mật khẩu thất bại', { description });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="flex items-center gap-2 mb-2 text-dark-200">
          <Lock className="w-4 h-4" />
          <h3 className="text-base font-medium">Đổi mật khẩu</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentPassword" className="text-dark-200">
            Mật khẩu hiện tại
          </Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              className="bg-dark-900/50 border-dark-600 focus:border-primary-500 pr-10"
              aria-invalid={!!errors.currentPassword}
              {...register('currentPassword')}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
              aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-sm text-red-400" role="alert">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-dark-200">
            Mật khẩu mới
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              className="bg-dark-900/50 border-dark-600 focus:border-primary-500 pr-10"
              aria-invalid={!!errors.newPassword}
              {...register('newPassword')}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
              aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-sm text-red-400" role="alert">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmNewPassword" className="text-dark-200">
            Xác nhận mật khẩu mới
          </Label>
          <div className="relative">
            <Input
              id="confirmNewPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              className="bg-dark-900/50 border-dark-600 focus:border-primary-500 pr-10"
              aria-invalid={!!errors.confirmNewPassword}
              {...register('confirmNewPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
              aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmNewPassword && (
            <p className="text-sm text-red-400" role="alert">
              {errors.confirmNewPassword.message}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={submitting || isSubmitting}
            className="gap-2"
          >
            {(submitting || isSubmitting) && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Đổi mật khẩu
          </Button>
          <p className="text-xs text-dark-500">
            Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.
          </p>
        </div>
      </form>
    </Card>
  );
}