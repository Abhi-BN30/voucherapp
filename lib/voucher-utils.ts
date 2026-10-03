export function formatVoucherNumber(id: number, date?: string) {
  const value = Number(id);
  const d = date ? new Date(`${String(date).slice(0, 10)}T00:00:00`) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
  return `PV/${fy}/${String(value).padStart(4, "0")}`;
}
