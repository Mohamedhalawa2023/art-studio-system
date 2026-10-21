'use client';
import React from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
  className = ''
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with a sliding window
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        start = 1;
        end = maxVisible;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 1;
        end = totalPages;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-sm text-[#94A3B8] ${className}`}>
      {/* Information text */}
      <div className="font-medium text-xs text-[#94A3B8]">
        عرض <span className="font-bold text-[#F8FAFC]">{startItem}</span> إلى{' '}
        <span className="font-bold text-[#F8FAFC]">{endItem}</span> من إجمالي{' '}
        <span className="font-bold text-[#D97706] font-mono">{totalItems}</span> سجل
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1 dir-rtl">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="الصفحة الأولى"
          className="p-1.5 rounded-lg border border-[#2A3B56] bg-[#1B2537] hover:bg-[#111827] hover:text-[#F8FAFC] disabled:opacity-30 disabled:cursor-not-allowed text-[#94A3B8] transition"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="الصفحة السابقة"
          className="p-1.5 rounded-lg border border-[#2A3B56] bg-[#1B2537] hover:bg-[#111827] hover:text-[#F8FAFC] disabled:opacity-30 disabled:cursor-not-allowed text-[#94A3B8] transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-[#94A3B8] select-none">
                  ...
                </span>
              );
            }
            const pageNum = page as number;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[34px] h-[34px] px-2 rounded-lg text-xs font-bold transition ${
                  isActive
                    ? 'bg-[#0D9488] text-white shadow-sm shadow-[#0D9488]/30 border border-[#0D9488]'
                    : 'bg-[#1B2537] border border-[#2A3B56] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="الصفحة التالية"
          className="p-1.5 rounded-lg border border-[#2A3B56] bg-[#1B2537] hover:bg-[#111827] hover:text-[#F8FAFC] disabled:opacity-30 disabled:cursor-not-allowed text-[#94A3B8] transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="الصفحة الأخيرة"
          className="p-1.5 rounded-lg border border-[#2A3B56] bg-[#1B2537] hover:bg-[#111827] hover:text-[#F8FAFC] disabled:opacity-30 disabled:cursor-not-allowed text-[#94A3B8] transition"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
