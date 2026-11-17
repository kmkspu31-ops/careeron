export function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function getInitials(name: string) {
  return name.slice(0, 1).toUpperCase();
}
