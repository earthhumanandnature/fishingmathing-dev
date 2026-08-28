# Math Fishing — Admin Console

> Local-only developer/admin tool cho game **Câu Cá Giải Toán**. Không deploy ra internet.

## Mục đích

- Cho phép developer truy cập nhanh vào dữ liệu game (saves, users) trên MongoDB Atlas.
- Cho phép admin (nhập mật khẩu) thực thi các action realtime: tạo event, kích hoạt weather boost mutation, give/xoá cá, gửi global message.
- Mọi action được broadcast realtime tới tất cả tab đang bật qua **SSE** — hiển thị ngay tại ticker phía trên dashboard:
  - `<tên admin>: đã <làm gì đó>` (vd: `admin: đã tạo event "Đôi Hạt Sồi Cuối Tuần"`)
  - `<tên admin>: <message>` (cho global message)

## Stack

- **Next.js 16** App Router + TypeScript
- **MongoDB driver** (cùng cluster với game chính: `math_fishing`)
- **jose** JWT cho session cookie HttpOnly
- **TailwindCSS** dark theme + lucide-react icons
- **SSE** (`text/event-stream`) cho realtime broadcast giữa các tab

## Cài đặt

```bash
# 1. Cài deps
npm install

# 2. Chạy ở localhost (KHÔNG cần config gì thêm — Atlas URI đã hardcode trong code)
npm run dev        # http://localhost:3030

# 3. (Tuỳ chọn) Build production
npm run build
npm start
```

> **Lưu ý quan trọng:** App chạy được NGAY KHÔNG CẦN `.env.local` — URI MongoDB Atlas
> (standard, không cần DNS SRV) đã được hardcode trong `src/lib/mongo.ts`.
> Nếu có `.env.local` với `MONGODB_URI` riêng thì env sẽ được ưu tiên.

## Auth model

| Role | Cách đăng nhập | Khả năng |
|---|---|---|
| **Admin** | Username thuộc `ADMIN_USERS` (mặc định `admin`) + mật khẩu (`ADMIN_PASSWORD`, mặc định `admin123`) | Tất cả action |
| **Developer** | Username bất kỳ (không cần mật khẩu, vào thẳng) | Tất cả action giống admin |

## Tính năng

### 1. Dashboard
- Trạng thái MongoDB (ping, ms, dbName)
- Số liệu: users / saves / events active / weathers active / messages
- Top 10 user nhiều hạt sồi nhất

### 2. Events
- Tạo event: tên + loại (`bonus_coins`, `luck_boost`, `double_catch`, `custom`) + multiplier + thời lượng
- Xoá event
- Broadcast: `admin: đã tạo event "..."`

### 3. Weather
- Kích hoạt weather boost mutation (shiny/albino/neon/golden/rainbow/ghost/thunder)
- Boost = +% cơ hội dính mutation (vd: shiny 6% + multiplier 0.3 → 7.8%)
- Tự tắt khi hết hạn
- Broadcast: `admin: đã kích hoạt weather ✨ Lấp Lánh +30%`

### 4. Fish (Give / Delete)
- Nhập username → load save
- Tặng 1–50 con cá bất kỳ loài + trọng lượng (random nếu để trống) + mutations
- Xoá 1 con theo uid / xoá tất cả 1 loài
- Broadcast: `admin: đã tặng cá "🐲 Rồng Biển" cho user_xyz`

### 5. Users
- List toàn bộ user + search
- Coins / totalCatches / bestStreak / loài cá / tank size

### 6. Global Message
- Gửi message realtime tới tất cả tab
- Broadcast: `admin: <message>`

### 7. Audit Log
- Mọi action đều lưu collection `admin_audit`
- Ai / role / action / detail / payload / thời gian

## Debug lỗi kết nối

Nếu gặp lỗi MongoDB, mở: `http://localhost:3030/api/health`
- Trả về URI đang active (mask password), ping status, dbName
- Nếu `ok: false` → kiểm tra mạng / Atlas IP whitelist (đang mở 0.0.0.0/0)

## Collections (trong DB `math_fishing`)

| Collection | Mục đích |
|---|---|
| `users` | (từ game) Tài khoản người chơi |
| `saves` | (từ game) Save game state |
| `admin_events` | Event do admin tạo |
| `admin_weather` | Weather boost mutation |
| `admin_messages` | Lịch sử global message |
| `admin_audit` | Audit log mọi action |

## Bảo mật

- ⚠️ **Chỉ chạy ở localhost**. Không expose ra internet.
- Cookie session JWT HttpOnly, hết hạn 7 ngày
- Password admin plaintext (dev tool) — đổi trong `.env.local` trước khi share

## Đổi password admin

Sửa `.env.local`:
```
ADMIN_USERS=admin,boss
ADMIN_PASSWORD=my-strong-password
```

Restart `npm run dev`.
