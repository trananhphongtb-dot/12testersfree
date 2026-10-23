# 12 Testers Free — app test chéo miễn phí

App Android giúp nhà phát triển tìm đủ **12 người thử nghiệm trong 14 ngày** (yêu cầu của Google Play với tài khoản cá nhân mới) bằng cách test chéo cho nhau. Miễn phí hoàn toàn; điểm chỉ giúp app được đẩy lên đầu danh sách.

**Tính năng:** đăng app cần test (Google Group hoặc danh sách email) · tham gia test theo từng bước, có **ảnh chụp màn hình xác nhận** gửi chủ app · điểm danh mở app mỗi ngày (thanh 14 ngày) · nhắc mở app hằng ngày bằng thông báo · góp ý cho chủ app · chép nhanh Gmail người test để dán vào Play Console · báo cáo nội dung xấu · xóa tài khoản trong app · tiếng Việt / English.

---

## Bước 1 — Tạo Firebase (miễn phí, khoảng 10 phút)

1. Vào **https://console.firebase.google.com** → **Create a project** (Tạo dự án), đặt tên ví dụ `tester12free`. Tắt Google Analytics cũng được.
2. **Authentication** → **Get started** → tab **Sign-in method** → bật **Email/Password** → Save.
3. **Firestore Database** → **Create database** → chọn vùng **asia-southeast1 (Singapore)** → **Start in production mode**.
4. Trong Firestore, tab **Rules** → xóa hết nội dung cũ → dán toàn bộ file `firestore.rules` → **Publish**.
5. Về trang chủ dự án → bấm biểu tượng **`</>`** (Web) → đặt tên app → **Register app**. Firebase hiện một đoạn `firebaseConfig = { apiKey: ..., ... }`.
6. Mở file `app/src/main/assets/www/config.js`, thay 6 dòng `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` bằng giá trị của anh.

### Bước 1b — Bật đăng nhập bằng Google (nên làm)

Người dùng bấm "Đăng nhập bằng Google", chọn tài khoản có sẵn trên máy. Gmail đó tự thành Gmail test, không phải gõ.

1. **Authentication → Sign-in method → Add new provider → Google** → bật **Enable**, chọn email hỗ trợ → **Save**.
2. Mở lại dòng **Google** vừa bật → mục **Web SDK configuration** → chép **Web client ID** (dạng `123...-abc.apps.googleusercontent.com`) → dán vào `GOOGLE_WEB_CLIENT_ID` trong `config.js`.
3. **Project settings → Your apps → Add app → Android**: package `vn.tester12.free` → Register (bỏ qua các bước tải file google-services.json, app này không cần).
4. Thêm **SHA-1** cho app Android đó (**Add fingerprint**), cần 2 mã:
   - **Mã khóa tải lên:** sau khi GitHub Actions chạy, mở lần chạy đó → phần tóm tắt (Summary) có dòng *SHA-1 khóa ký*.
   - **Mã khóa ký của Google Play:** sau khi tải AAB lên Play Console → **Kiểm tra và phát hành → Thiết lập → Tính toàn vẹn của ứng dụng → Ký ứng dụng** → chép *Tệp chứng chỉ SHA-1* của **khóa ký ứng dụng**.

   Thiếu mã thứ hai thì bản cài từ Google Play sẽ báo "Không đăng nhập được bằng Google".

   **Cài thử đăng nhập Google:** dùng file `app-release.apk` (ký bằng khóa của anh). File `app-debug.apk` chỉ đăng nhập bằng email được.

> apiKey của Firebase web không phải mật khẩu, để trong app là bình thường. Bảo mật nằm ở file `firestore.rules`.

## Bước 2 — Dựng APK/AAB bằng GitHub (như các app trước)

1. Tạo repo mới trên GitHub (ví dụ `tester12-free`), tải lên **toàn bộ** thư mục này, kể cả thư mục `.github`.
2. Dùng lại khóa ký của anh: **Settings → Secrets and variables → Actions** → thêm 4 secret giống app trước: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`.
3. Vào tab **Actions** → đợi chạy xong (khoảng 3–5 phút) → tải mục **tester12-free**:
   - `app-release.apk` → cài thử trên điện thoại (đăng nhập Google chạy được với bản này).
   - `app-debug.apk` → bản dự phòng, chỉ đăng nhập bằng email.
   - `app-release.aab` → đăng lên Google Play.

Muốn đổi package name: sửa `applicationId` trong `app/build.gradle` **trước khi** đăng lần đầu (sau khi đăng không đổi được).

## Bước 3 — Đăng lên Google Play

Những mục Play Console sẽ hỏi riêng cho app này:

- **Chính sách quyền riêng tư (bắt buộc):** đăng nội dung ở mục dưới lên blog của anh (blogspot), dán link vào Play Console.
- **An toàn dữ liệu:** app thu thập *Email*, *Tên*, *Nội dung do người dùng tạo* (góp ý, mô tả app); dùng cho *Chức năng ứng dụng* và *Quản lý tài khoản*; dữ liệu được mã hóa khi truyền; người dùng **có thể yêu cầu xóa** (nút Xóa tài khoản trong app).
- **Xóa tài khoản:** Google cũng yêu cầu một link web. Dùng chính trang chính sách quyền riêng tư (đã có đoạn hướng dẫn xóa).
- **Đối tượng mục tiêu:** 18 tuổi trở lên.
- **Nội dung do người dùng tạo:** chọn *Có* — app đã có nút **Báo cáo**. Báo cáo được lưu ở Firestore → collection `reports`, anh xem trong Firebase Console và xóa app/góp ý vi phạm tại đó.

## Gói Firebase miễn phí đủ cho bao nhiêu người?

Gói Spark miễn phí cho 50.000 lượt đọc và 20.000 lượt ghi mỗi ngày. App đã giới hạn danh sách Khám phá 60 app và giữ lại 2 phút giữa các lần tải, nên đủ cho vài trăm người dùng hoạt động mỗi ngày. Khi đông hơn mới cần nghĩ đến nâng gói hoặc gắn quảng cáo.

## Cấu trúc thư mục

```
app/src/main/java/vn/tester12/free/   Mã Java: vỏ app, nhắc hằng ngày
app/src/main/assets/www/              Giao diện: index.html, style.css, app.js, i18n.js, config.js
firestore.rules                       Quy tắc bảo mật Firestore
.github/workflows/build.yml           Tự dựng APK/AAB trên GitHub
```

Chỉnh số điểm thưởng ở cuối `config.js`. Sửa chữ hiển thị (Việt/Anh) trong `i18n.js`.

---

## Mẫu chính sách quyền riêng tư (dán lên blog)

**Chính sách quyền riêng tư — 12 Testers Free**

12 Testers Free ("ứng dụng") giúp nhà phát triển test chéo ứng dụng trên Google Play.

*Dữ liệu thu thập:* email đăng nhập; tên hiển thị; Gmail dùng để thử nghiệm; thông tin ứng dụng bạn đăng (tên, package, link Google Group, mô tả); góp ý bạn viết; số ngày bạn mở ứng dụng đang thử nghiệm.

*Mục đích:* để bạn đăng nhập, ghép người thử nghiệm với chủ ứng dụng, và hiển thị góp ý. Gmail thử nghiệm và tên của bạn chỉ hiển thị cho chủ ứng dụng mà bạn tham gia test, để họ thêm bạn vào danh sách thử nghiệm trên Google Play.

*Lưu trữ:* dữ liệu được lưu trên Google Firebase, truyền qua kết nối mã hóa. Ứng dụng không bán hay chia sẻ dữ liệu cho bên thứ ba.

*Xóa dữ liệu:* trong ứng dụng, vào **Tôi → Xóa tài khoản** để xóa vĩnh viễn tài khoản, các ứng dụng bạn đăng, lịch sử thử nghiệm và góp ý. Nếu không còn vào được ứng dụng, gửi email đến [EMAIL CỦA ANH] kèm email tài khoản, chúng tôi xóa trong vòng 7 ngày.

*Trẻ em:* ứng dụng dành cho người từ 18 tuổi.

*Liên hệ:* [EMAIL CỦA ANH]
