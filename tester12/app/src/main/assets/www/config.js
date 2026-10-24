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

// Nhóm Google chung của cộng đồng: mỗi người vào nhóm 1 lần, mỗi chủ app thêm nhóm
// này vào mục Người thử nghiệm trên Play Console 1 lần -> ai cũng test được app của nhau.
window.COMMUNITY_GROUP = {
  email: "12testersfree@googlegroups.com",
  link: "https://groups.google.com/g/12testersfree"
};

// Sao ⭐: thưởng cho người đi test. App của chủ nhiều sao được xếp lên trước ở Khám phá.
window.STARS = {
  join: 10,      // hoàn thành tham gia test 1 app
  day: 2,        // nộp ảnh mỗi ngày
  feedback: 5,   // góp ý lần đầu cho 1 app
  finish: 20     // test đủ 14 ngày
};

// Package của chính app này (nút "Đánh giá trên Google Play")
window.OUR_PACKAGE = "vn.tester12.free";
