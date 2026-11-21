import { html } from '../../utils/html.js';

export function TableSkeleton({ rows = 5 }) {
  return html`
    <div className="w-full space-y-3">
      ${Array.from({ length: rows }).map((_, i) => html`
        <div key=${i} className="flex items-center gap-4 py-3 border-b border-slate-100 animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-3 bg-slate-100 rounded w-1/4"></div>
          </div>
          <div className="w-20 h-5 bg-slate-100 rounded-full"></div>
          <div className="w-16 h-4 bg-slate-100 rounded"></div>
        </div>
      `)}
    </div>
  `;
}

export function CardSkeleton() {
  return html`
    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-24 h-4 bg-slate-200 rounded"></div>
        <div className="w-6 h-6 bg-slate-100 rounded-md"></div>
      </div>
      <div className="w-16 h-7 bg-slate-300 rounded"></div>
      <div className="w-32 h-3 bg-slate-100 rounded"></div>
    </div>
  `;
}

export function AnswerSkeleton() {
  return html`
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4 animate-pulse">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="w-32 h-4 bg-slate-200 rounded"></div>
        <div className="w-20 h-4 bg-slate-100 rounded"></div>
      </div>
      <div className="space-y-2.5">
        <div className="h-4 bg-slate-200 rounded w-full"></div>
        <div className="h-4 bg-slate-200 rounded w-11/12"></div>
        <div className="h-4 bg-slate-200 rounded w-4/5"></div>
        <div className="h-4 bg-slate-100 rounded w-2/3"></div>
      </div>
      <div className="flex gap-2 pt-2">
        <div className="w-28 h-6 bg-blue-50 rounded-md"></div>
        <div className="w-32 h-6 bg-blue-50 rounded-md"></div>
      </div>
    </div>
  `;
}
