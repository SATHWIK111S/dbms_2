import React from 'react';
import { Inbox, Filter, Plus } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description,
  actionLabel,
  onAction,
  resetLabel,
  onReset
}) {
  return (
    <div className="py-12 px-4 text-center max-w-sm mx-auto flex flex-col items-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
          {description}
        </p>
      )}
      <div className="flex items-center gap-2">
        {onReset && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {resetLabel || 'Reset filters'}
          </button>
        )}
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{actionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
