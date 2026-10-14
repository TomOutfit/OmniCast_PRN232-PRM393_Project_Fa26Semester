# Cloudinary Studio Upload — Bypass Vercel 4.5 MB Limit

Tích hợp Cloudinary cho phép mobile upload video **bất kỳ dung lượng nào (đến 100 MB/file trên gói Free)** mà không cần đẩy byte qua API Vercel (giới hạn 4.5 MB body size).

## Bối cảnh

Trước đây, flow "TỰ GHI HÌNH" của Studio gặp 2 vấn đề khi deploy lên Vercel:

1. **Body size limit 4.5 MB** — Vercel Hobby từ chối mọi multipart upload > 4.5 MB. Một clip 6 phút 1080p ~36 MB.
2. **Ephemeral filesystem** — Backend ghi file vào local disk rồi trả URL tương đối. Sau vài giây URL hết hiệu lực vì function instance bị recycle.

Cloudinary giải quyết cả hai:
- Video sống trên CDN Cloudinary (không qua Vercel filesystem).
- Mobile upload trực tiếp file lên Cloudinary qua **signed payload** mà API ký → không cần đẩy byte qua Vercel.

## Cấu hình (một lần)

### 1. Tạo tài khoản Cloudinary

1. Vào https://cloudinary.com → **Sign Up Free** (có thể dùng Google sign-in).
2. Sau đăng nhập vào **Console** → tab **API Keys** (menu trái).
3. Sao chép 3 giá trị:
   - **Cloud name** (vd: `dxyz123abc`)
   - **API Key** (vd: `123456789012345`)
   - **API Secret** (vd: `abcdef...`) — chỉ hiển thị 1 lần, copy ngay

### 2. Cập nhật `backend/.env`

```bash
# Cloudinary (Studio self-record flow, bypasses Vercel 4.5 MB body limit)
CLOUDINARY_CLOUD_NAME="dxyz123abc"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="abcdef_your_secret_here"
CLOUDINARY_DEFAULT_FOLDER="omnicast-studio"
```

### 3. Cập nhật trên Vercel

1. Mở https://vercel.com → Project `omnicast-api` → **Settings** → **Environment Variables**
2. Thêm 4 biến trên (Production, Preview, Development đều thêm)
3. **Redeploy** để Vercel pick up biến mới.

## Flow hoạt động

### Mobile → Backend → Cloudinary (3 bước)

```
┌──────────┐  1. POST /uploads/cloudinary/sign  ┌──────────┐
│  Mobile  │ ──────────────────────────────────▶ │ Backend  │
│  App     │ ◀──────────── signed payload ──── │ (Nest)   │
└────┬─────┘                                     └──────────┘
     │
     │  2. POST <uploadUrl> + signature + file
     ▼
┌──────────┐
│Cloudinary│  (file không qua Vercel)
│  CDN     │
└────┬─────┘
     │
     │  3. POST /studio/recordings/library { videoUrl: secure_url }
     ▼
┌──────────┐
│ Backend  │  → persist Recording row
└──────────┘
```

### Decision matrix trong `live_studio_screen.dart`

```dart
final fileSize = await pickedFile.length();
const vercelBodyLimit = 4 * 1024 * 1024; // 4 MB
final useCloudinary = fileSize > vercelBodyLimit;

if (useCloudinary) {
  // Cloudinary direct upload (bypass Vercel 4.5 MB)
  await _repo.addToLibraryFromCloudinaryUpload(...);
} else {
  // Legacy in-process upload (faster for small clips)
  await _repo.uploadSelfRecordFile(...);
}
```

## API Endpoints mới

### `POST /api/v1/uploads/cloudinary/sign`

Ký một payload cho phép mobile upload thẳng lên Cloudinary.

**Request** (Staff/Admin JWT):
```json
{
  "channelSlug": "sport-1",
  "title": "Highlight V-League vòng 12",
  "tags": ["highlight", "vleague"],
  "maxBytes": 104857600
}
```

**Response 200**:
```json
{
  "data": {
    "cloudName": "dxyz123abc",
    "apiKey": "123456789012345",
    "timestamp": 1697223600,
    "signature": "abc123...hex-sha1",
    "folder": "omnicast-studio/sport-1",
    "publicId": "highlight-v-league-vong-12",
    "resourceType": "video",
    "tags": ["studio-self-record", "user:abc-123", "highlight", "vleague"],
    "allowedFormats": ["mp4", "mov", "m4v", "webm", "mkv"],
    "maxFileSize": 104857600,
    "context": "channel=sport-1|uploadedBy=abc-123|source=mobile-studio-recorder",
    "uploadUrl": "https://api.cloudinary.com/v1_1/dxyz123abc/video/upload"
  }
}
```

**Response 503** (Cloudinary chưa cấu hình):
```json
{
  "message": "Cloudinary chưa được cấu hình trên server. Vui lòng thêm CLOUDINARY_CLOUD_NAME, ..."
}
```

### `POST /api/v1/uploads/cloudinary/server`

Fallback server-side upload (chỉ dành cho file ≤ 4 MB hoặc web admin tool).

**Request** (multipart/form-data, Staff/Admin JWT):
- `file` (binary, video/*)
- `channelSlug` (string)
- `title` (string)
- `tags` (string, comma-separated, optional)

**Response 201**:
```json
{
  "data": {
    "url": "https://res.cloudinary.com/dxyz123abc/video/upload/v123/omnicast-studio/sport-1/my-clip.mp4",
    "publicId": "omnicast-studio/sport-1/my-clip",
    "bytes": 25165824,
    "resourceType": "video",
    "format": "mp4",
    "durationSec": 372.5,
    "thumbnailUrl": "https://res.cloudinary.com/.../w_640,h_360,c_fill/...jpg",
    "width": 1920,
    "height": 1080
  }
}
```

## Lưu ý quan trọng

### Giới hạn gói Free Cloudinary

| Hạng mục | Giới hạn |
|----------|----------|
| Storage | 25 GB tổng (ảnh + video + raw) |
| Bandwidth | 25 GB/tháng |
| File size tối đa | **100 MB/file** (≥100 MB phải dùng Pro) |
| Số file | Không giới hạn (mỗi file tính vào 25 GB storage) |

Nếu vượt 25 GB bandwidth, video sẽ không tải được cho người xem. Cho demo đồ án (vài chục người xem) thì **dùng cả năm không hết**.

### Anti-piracy vẫn áp dụng

URL Cloudinary được classify là `UPLOADED_LOCAL` + `BUNNY_SELF_HOSTED` license (mobile tự override khi gọi `addToLibrary`). Backend vẫn HEAD-probe URL trước khi lưu.

### Fallback cho Vercel Hobby

Nếu Cloudinary chưa cấu hình, `live_studio_screen.dart` vẫn dùng `uploadSelfRecordFile` cũ cho file < 4 MB. File > 4 MB sẽ fail với lỗi 503 rõ ràng.

## Files đã thay đổi

### Backend (mới)
- `backend/src/cloudinary/cloudinary.service.ts` — service ký payload + upload từ buffer
- `backend/src/cloudinary/cloudinary.module.ts` — Nest module
- `backend/src/cloudinary/cloudinary-upload.controller.ts` — REST endpoints
- `backend/src/cloudinary/dto/sign-upload.dto.ts` — validation DTO

### Backend (sửa)
- `backend/src/app.module.ts` — import `CloudinaryModule`
- `backend/package.json` — thêm `cloudinary`, `streamifier`, `@types/streamifier`
- `backend/.env.example` — thêm 4 biến `CLOUDINARY_*`

### Mobile (sửa)
- `mobile/lib/core/constants/app_constants.dart` — thêm `cloudinarySign`, `cloudinaryServer`, `studioAddToLibrary`
- `mobile/lib/data/repositories/live_studio_repository.dart` — thêm `signCloudinaryUpload`, `uploadFileToCloudinary`, `addToLibraryFromCloudinaryUpload`, `addToLibrary` + 3 model classes
- `mobile/lib/presentation/screens/studio/live_studio_screen.dart` — `_uploadAndBroadcast` chọn path dựa trên file size

## Test thủ công

### 1. Test backend standalone

```bash
# Trong backend/
npm run start:dev

# Swagger UI → http://localhost:3000/swagger
# Endpoint: POST /v1/uploads/cloudinary/sign
# Body: { "channelSlug": "sport-1", "title": "test clip" }
# → Phải trả 200 với signed payload
```

### 2. Test mobile flow

1. Mở app → vào **Studio** (tài khoản Staff/Admin)
2. Tab **TỰ GHI HÌNH** → **GHI HÌNH** từ camera
3. Quay video ~30 giây → bấm **SỬ DỤNG BẢN GHI NÀY**
4. Nhập tiêu đề → bấm **PHÁT SÓNG**
5. App sẽ tự detect file size:
   - < 4 MB → upload qua Vercel (nhanh, cũ)
   - ≥ 4 MB → upload thẳng lên Cloudinary (mới, bypass 4.5 MB)
6. Kiểm tra Cloudinary Console → Media Library → folder `omnicast-studio/<channel-slug>/` sẽ thấy file mới upload

### 3. Verify anti-piracy

- Vào Cloudinary Console → xóa file vừa upload
- Quay lại Studio → chọn file đó trong "CHỌN NỘI DUNG" → bấm **PHÁT SÓNG**
- Backend sẽ báo lỗi "URL video không truy cập được" → anti-piracy guard hoạt động đúng.
