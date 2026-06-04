# Thư viện số Khối 5

Ứng dụng quản lý kho học liệu cho khối 5: bảng tin, kho giáo án PPT, kho sách tham khảo, form đóng góp tài liệu, phân quyền giáo viên/admin và kiểm duyệt tài liệu.

## Chạy local

```bash
npm install
npm run dev
```

Tài khoản demo:

- Admin: `admin@khoi5.edu.vn` / `ADMIN-2026`
- Giáo viên: `lan@khoi5.edu.vn` / `GV5-LAN-2026`

## Deploy miễn phí

### Vercel

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`

## Lưu trữ tài liệu

- PPT, PDF, sách tham khảo: để trên Google Drive.
- Web chỉ lưu tiêu đề, môn học, loại tài liệu, mô tả, người đóng góp và link Drive.
- Ảnh bảng tin nên dùng ảnh đã nén hoặc link ảnh công khai để tiết kiệm dung lượng miễn phí.

## Nối Supabase sau khi tạo project

1. Tạo project Supabase free.
2. Chạy file `supabase/schema.sql` trong SQL Editor.
3. Bật Google provider trong Supabase Auth.
4. Copy `.env.example` thành `.env.local` và điền:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Bản hiện tại chạy bằng localStorage để thử nghiệm giao diện và quy trình. Khi có Supabase URL/key, có thể chuyển lớp dữ liệu sang Supabase mà không đổi giao diện.
