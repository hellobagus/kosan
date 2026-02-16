import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect('/');
  return (
    <div className="login-page">
      <div className="login-box">
        <h1>Login Administrator</h1>
        <LoginForm />
      </div>
    </div>
  );
}
