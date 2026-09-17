import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { IconType } from 'react-icons';

interface MetaItemProps {
  icon: IconType;
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'muted';
}

export function MetaItem({ icon: Icon, children, className, tone = 'default' }: MetaItemProps) {
  return (
    <span
       className={clsx(
          'inline-flex items-center gap-1.5 text-xs transition-colors duration-180 ease-snappy',
          tone === 'muted' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-600 dark:text-slate-200',
          className
        )}
    >
      <Icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
      <span>{children}</span>
    </span>
  );
}
