import { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default function CreateLayout({ children }: { children: ReactNode }) {
  return children;
}
