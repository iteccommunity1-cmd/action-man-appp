import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
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
                  brand: 'hsl(224.3 76.3% 48%)', // A vibrant blue
                  brandAccent: 'hsl(224.3 76.3% 38%)', // A darker blue for hover
                  inputBackground: 'hsl(0 0% 100%)',
                  inputBorder: 'hsl(214.3 31.8% 91.4%)',
                  inputBorderHover: 'hsl(224.3 76.3% 48%)',
                  inputBorderFocus: 'hsl(224.3 76.3% 48%)',
                  inputText: 'hsl(222.2 84% 4.9%)',
                  inputLabel: 'hsl(215.4 16.3% 46.9%)',
                },
                radii: {
                  borderRadiusButton: '0.75rem', // Rounded buttons
                  button: '0.75rem',
                  input: '0.75rem',
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