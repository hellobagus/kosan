"use client";

import { Select, Button } from "@/components/ui";
import { getMonthName } from "@/lib/utils";

export function AccountingPeriodBar({
  month,
  year,
  onMonthChange,
  onYearChange,
  onRefresh,
  loading,
  extra,
}: {
  month: string;
  year: string;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onRefresh: () => void;
  loading?: boolean;
  extra?: React.ReactNode;
}) {
  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="flex flex-wrap items-end gap-3 mb-6">
      <Select label="Bulan" value={month} onChange={(e) => onMonthChange(e.target.value)}>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>
            {getMonthName(i + 1)}
          </option>
        ))}
      </Select>
      <Select label="Tahun" value={year} onChange={(e) => onYearChange(e.target.value)}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
      {extra}
      <Button onClick={onRefresh} disabled={loading}>
        {loading ? "Memuat..." : "Tampilkan"}
      </Button>
    </div>
  );
}
