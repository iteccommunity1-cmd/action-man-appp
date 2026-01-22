import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthChangeEvent, Session } from '@supabase/supabase-js'; // Import AuthChangeEvent and Session

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session) {
        navigate('/'); // Redirect to home page after successful login
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">Welcome Back!</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))', // Use our primary color
                  brandAccent: 'hsl(var(--primary-foreground))', // Use primary-foreground for accent
                  inputBackground: 'hsl(var(--background))',
                  inputBorder: 'hsl(var(--border))',
                  inputBorderHover: 'hsl(var(--primary))',
                  inputBorderFocus: 'hsl(var(--primary))',
                  inputText: 'hsl(var(--foreground))',
                },
                radii: {
                  borderRadiusButton: 'var(--radius)', // Use our global radius
                  inputBorderRadius: 'var(--radius)', // Use our global radius
                },
              },
            },
          }}
          theme="light"
          providers={[]} // Only email/password by default
          redirectTo={window.location.origin + '/'}
        />
      </div>
    </div>
  );
};

export default Login;