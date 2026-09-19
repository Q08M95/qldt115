// Sinh mật khẩu tạm ngẫu nhiên bằng Web Crypto (chạy được ở trình duyệt và server).
// Bỏ các ký tự dễ nhầm (0/O, 1/l/I) để đọc/gõ lại không sai.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function randomPassword(length = 12): string {
  // Lấy mẫu loại bỏ (rejection sampling) để mọi ký tự có xác suất bằng nhau, không lệch do phép chia dư
  const limit = 256 - (256 % ALPHABET.length);
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < limit && out.length < length) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}
