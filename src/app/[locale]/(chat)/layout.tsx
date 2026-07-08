import { ReactNode } from 'react';

import { ChatLayoutClient } from '@/shared/blocks/chat/chat-layout-client';

export const dynamic = 'force-dynamic';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ChatLayoutClient>{children}</ChatLayoutClient>;
}
