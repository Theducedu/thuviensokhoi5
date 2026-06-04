# Thu vien so Khoi 5

Ung dung quan ly kho hoc lieu cho Khoi 5: thu vien giao an PPT, sach tham khao, anh hoat dong, dong gop tai lieu, cam nang CNTT-AI, khong gian so va khu quan tri.

## Chay local

```bash
npm install
npm run dev
```

## Dang nhap Google

Ung dung su dung Firebase Google Auth. Luong quyen truy cap:

1. Khach bam vao bat ky muc nao se phai dang nhap Google.
2. He thong ghi thong ke Gmail dang nhap vao Firestore.
3. Gmail chua duoc cap quyen co vai tro `Nguoi xem`.
4. Chi email da duoc admin them trong muc `Quan tri` moi co quyen tai/dong gop.
5. Admin mac dinh: `nguyenduc91ltk@gmail.com`.

Quan tri co the them email, thu hoi truy cap hoac xoa email khoi danh sach.

## Firestore

Can bat Cloud Firestore trong Firebase de luu danh sach email duoc cap quyen va thong ke Gmail dang nhap.

Sau khi tao Firestore, dan noi dung file `firestore.rules` vao tab Rules va Publish.

## Bien moi truong Vercel

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

## Deploy mien phi

### Vercel

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `/`

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`

## Luu tru tai lieu

- PPT, PDF, sach tham khao: de tren Google Drive.
- Web chi luu tieu de, mon hoc, loai tai lieu, mo ta, nguoi dong gop va link Drive.
- Anh hoat dong nen dung anh da nen hoac link anh cong khai de tiet kiem dung luong mien phi.
