'use client';

import type { ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/Button';

export const CHAT_OPEN_EVENT = 'bsa:chat-open';

/** Öffnet das KI-Chat-Panel (ChatWidget hört auf das Ereignis). */
export function ChatOpenButton({
  children,
  variant = 'light',
  size = 'lg',
  className = '',
}: {
  children: ReactNode;
  variant?: 'light' | 'ghost' | 'secondary';
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <button type="button" className={buttonClasses(variant, size, className)} onClick={() => window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT))}>
      {children}
    </button>
  );
}
