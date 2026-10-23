// =====================================================================
//  DÁN CẤU HÌNH FIREBASE CỦA ANH VÀO ĐÂY (xem README, bước 2)
//  Firebase Console > Project settings > Your apps > Web app > SDK setup
// =====================================================================
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyB2nhI7UY2-J_BaQYjIubNHqNYsJefZm-g",
  authDomain: "testersfreevn.firebaseapp.com",
  projectId: "testersfreevn",
  storageBucket: "testersfreevn.firebasestorage.app",
  messagingSenderId: "140949714290",
  appId: "1:140949714290:web:84c7c17b6ccb0531ad99eb"
};

// Đăng nhập bằng Google: dán "Web client ID" (xem README, bước 1b).
// Để trống "" thì app chỉ hiện đăng nhập bằng email.
window.GOOGLE_WEB_CLIENT_ID = "140949714290-g4p17vg5ddvsosackciaalutk01rrbrm.apps.googleusercontent.com";

// Số điểm (chỉ để ưu tiên hiển thị, KHÔNG bắt buộc để đăng app)
window.POINTS = {
  join: 10,       // tham gia test 1 app
  checkin: 2,     // điểm danh mở app mỗi ngày
  feedback: 5,    // góp ý lần đầu cho 1 app
  bumpCost: 30    // đẩy app của mình lên đầu danh sách
};

// Email liên hệ hiện trong mục Giới thiệu (anh đổi nếu muốn)
window.CONTACT_EMAIL = "";
