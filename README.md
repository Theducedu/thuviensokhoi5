# Thư viện số Khối 5

Ứng dụng quản lý kho học liệu cho Khối 5: thư viện giáo án PPT, sách tham khảo, ảnh hoạt động, mục đóng góp tài liệu, cẩm nang CNTT-AI, không gian số và khu quản trị.

## Chạy local

```bash
npm install
npm run dev
```

Tài khoản demo khi chưa cấu hình Firebase:

- Admin: `admin@khoi5.edu.vn` / `ADMIN-2026`
- Giáo viên: `lan@khoi5.edu.vn` / `GV5-LAN-2026`

## Đăng nhập Google

Ứng dụng đã hỗ trợ Firebase Google Auth. Luồng đăng nhập là:

1. Giáo viên bấm `Đăng nhập bằng Google`.
2. Hệ thống lấy email Google thật.
3. Giáo viên nhập mã do admin cấp.
4. Email Google và mã phải khớp tài khoản trong danh sách giáo viên.

Khi đưa lên Vercel, thêm các biến môi trường:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Nếu chưa thêm biến Firebase, app vẫn chạy chế độ demo bằng email + mã để kiểm tra giao diện.

## Deploy miễn phí

### Vercel

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `/`

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`

## Lưu trữ tài liệu

- PPT, PDF, sách tham khảo: để trên Google Drive.
- Web chỉ lưu tiêu đề, môn học, loại tài liệu, mô tả, người đóng góp và link Drive.
- Ảnh hoạt động nên dùng ảnh đã nén hoặc link ảnh công khai để tiết kiệm dung lượng miễn phí.
