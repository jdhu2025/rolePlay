'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { ScrollArea, ScrollBar } from '@/shared/components/ui/scroll-area';
import {
  Tabs as TabsComponent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';
import { Tab } from '@/shared/types/blocks/common';

export function Tabs({
  tabs,
  size,
}: {
  tabs: Tab[];
  size?: 'sm' | 'md' | 'lg';
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tabName, setTabName] = useState(
    tabs?.find((tab) => tab.is_active)?.name || ''
  );

  const handleTabChange = (nextTabName: string) => {
    setTabName(nextTabName);

    const currentTab = tabs?.find((tab) => tab.name === nextTabName);
    if (!currentTab?.url) return;

    const locale = pathname?.split('/').filter(Boolean)[0] || '';
    const url =
      currentTab.url.startsWith('/') && locale
        ? `/${locale}${currentTab.url}`
        : currentTab.url;

    if (url !== pathname) {
      router.push(url);
    }
  };

  return (
    <div className="relative mb-8">
      <ScrollArea className="w-full lg:max-w-none">
        <div className="flex items-center space-x-2">
          <TabsComponent value={tabName} onValueChange={handleTabChange}>
            <TabsList className={cn(size === 'sm' && 'h-8')}>
              {tabs.map((tab, idx) => (
                <TabsTrigger key={idx} value={tab.name || ''}>
                  {tab.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </TabsComponent>
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
