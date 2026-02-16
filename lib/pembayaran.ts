export const PERIODE_LABEL: Record<string, string> = {
  '3_bulan': '3 Bulan (Watermint)',
  '6_bulan': '6 Bulan (Watermint)',
  '1_tahun': '1 Tahun (Watermint)',
  bebas: 'Bebas (Custom)',
};

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
