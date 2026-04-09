import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Cho phép truy cập từ các thiết bị khác trong mạng (tốt)
    port: 5173,
    strictPort: true, // Đảm bảo luôn dùng port 5173, nếu bận sẽ báo lỗi thay vì nhảy port khác
    allowedHosts: [
      'unfated-subcoriaceous-irene.ngrok-free.dev'
    ],
    // QUAN TRỌNG: Thêm Proxy để Zalo Webhook có thể chui vào BE
    proxy: {
      '/api': {
        target: 'http://localhost:5106', // Địa chỉ API Back-end của bạn
        changeOrigin: true,
        secure: false,
      }
    },
    // HMR (Hot Module Replacement) có thể bị lỗi khi dùng qua ngrok, thêm cấu hình này để ổn định
    hmr: {
      clientPort: 443, // Ngrok chạy trên cổng 443 (HTTPS)
    }
  },
})