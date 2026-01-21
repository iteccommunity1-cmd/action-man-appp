import React from 'react';
import { ProfileForm } from '@/components/ProfileForm';

const Profile: React.FC = () => {
  return (
    <div className="flex flex-col items-center w-full">
      <ProfileForm />
    </div>
  );
};

export default Profile;