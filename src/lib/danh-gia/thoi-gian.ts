// Tiện ích thời gian dùng ở tầng hiển thị: hàm thuần trong thư viện (không gọi Date.now() trực tiếp trong component)
export function daBatDau(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}
