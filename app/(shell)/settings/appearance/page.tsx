import { redirect } from 'next/navigation';

export default function SettingsAppearanceRedirect() {
  redirect('/settings/profile');
}
