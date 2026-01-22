import React from 'react';
import { DailyDigestTaskList } from '@/components/DailyDigestTaskList';

const DailyDigest: React.FC = () => {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-3xl">
        <DailyDigestTaskList />
      </div>
    </div>
  );
};

export default DailyDigest;