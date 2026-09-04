'use client';

import { MotionConfig } from 'motion/react';
import { AuthProvider } from '@/context/AuthContext';

export default function Providers({ children }) {
  // reducedMotion="user" makes every motion component respect the OS setting (PRD 31).
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>{children}</AuthProvider>
    </MotionConfig>
  );
}
