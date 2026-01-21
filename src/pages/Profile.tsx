import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProfileForm } from '@/components/ProfileForm';
import { MadeWithDyad } from '@/components/made-with-dyad';

const Profile: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto mb-6">
        <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 font-medium text-lg transition-colors duration-200">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back to Home
        </Link>
      </div>
      <ProfileForm />
      <MadeWithDyad />
    </div>
  );
};

export default Profile;