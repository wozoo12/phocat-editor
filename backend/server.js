// FILE: backend/server.js

// 1. Nạp các thư viện cốt lõi
const express = require("express");
const cors = require("cors");
const fs = require("fs"); // Thư viện quản lý file hệ thống
const path = require("path");

const app = express();

// --- CẤU HÌNH CHUNG ---

// CẤU HÌNH CỔNG (PORT)
// Sử dụng cổng do môi trường cung cấp (ví dụ: Render) hoặc mặc định là 5000
const port = process.env.PORT || 5000;

// CẤU HÌNH ĐƯỜNG DẪN LƯU ẢNH (Quan trọng cho Render)
// Sử dụng đường dẫn tương đối: thư mục 'uploads' nằm ngay trong thư mục chứa file server.js
const UPLOAD_DIR = path.join(__dirname, "uploads");

// Đảm bảo thư mục lưu trữ tồn tại khi khởi động server
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`✅ Đã tạo thư mục upload: ${UPLOAD_DIR}`);
  }
} catch (err) {
  console.error(
    "❌ Lỗi nghiêm trọng: Không thể truy cập/tạo thư mục upload:",
    err.message
  );
  // Trên Render, lỗi này thường do quyền truy cập file hệ thống (rất hiếm gặp ở thư mục dự án)
  process.exit(1); // Dừng server nếu không có quyền ghi
}

// Middleware
// Tăng giới hạn kích thước request để nhận ảnh lớn (50mb)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// Cho phép frontend gọi API (CORS)
// Trên Render, bạn có thể cần cấu hình lại origin nếu frontend khác domain
// Ví dụ: app.use(cors({ origin: 'https://your-frontend.onrender.com' }));
// Để '*' là cho phép tất cả (tiện cho demo nhưng kém bảo mật hơn)
app.use(cors());

// Cấu hình để server phục vụ các file tĩnh trong thư mục uploads (để frontend có thể xem ảnh)
// Frontend sẽ truy cập qua: https://your-app.onrender.com/uploads/ten_file.png
app.use("/uploads", express.static(UPLOAD_DIR));

// =============================================
// CÁC API ENDPOINTS
// =============================================

// API 1: Lưu ảnh nháp vào ổ đĩa server
app.post("/api/save-draft-to-disk", (req, res) => {
  try {
    const { imageData, filename } = req.body;

    if (!imageData || typeof imageData !== "string") {
      return res.status(400).json({ error: "Dữ liệu ảnh không hợp lệ" });
    }

    // 1. Tách phần header base64 để lấy dữ liệu ảnh thô
    // Hỗ trợ nhiều định dạng (png, jpeg, webp...)
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

    // 2. Tạo tên file
    const finalFilename = filename || `draft_${Date.now()}.png`;
    const filePath = path.join(UPLOAD_DIR, finalFilename);

    // 3. Ghi file vào ổ cứng (bất đồng bộ)
    fs.writeFile(filePath, base64Data, "base64", (err) => {
      if (err) {
        console.error("❌ Lỗi khi ghi file:", err);
        // Trả về lỗi 500 nếu không ghi được xuống đĩa
        return res
          .status(500)
          .json({
            error: "Lỗi hệ thống: Không thể lưu file vào ổ cứng server",
          });
      }
      // Thành công
      console.log(`✅ Đã lưu nháp thành công: ${filePath}`);

      // Trả về đường dẫn tương đối để frontend có thể truy cập
      // Ví dụ: /uploads/draft_123456789.png
      const relativePath = `/uploads/${finalFilename}`;

      res.json({
        success: true,
        path: filePath, // Đường dẫn tuyệt đối trên server (để debug)
        url: relativePath, // Đường dẫn web để frontend dùng
        message: "Đã lưu ảnh thành công trên server",
      });
    });
  } catch (error) {
    console.error("❌ Lỗi server (save-draft):", error);
    res
      .status(500)
      .json({ error: "Lỗi server không xác định: " + error.message });
  }
});

// =============================================
// KHỞI ĐỘNG SERVER
// =============================================
app.listen(port, () => {
  console.log(`\n========================================`);
  // Khi chạy trên Render, URL sẽ không phải là localhost
  console.log(`🚀 Backend đang chạy trên cổng ${port}`);
  console.log(`📁 Thư mục lưu ảnh nháp: ${UPLOAD_DIR}`);
  console.log(
    `⚠️ Lưu ý trên Render: Ảnh trong thư mục này sẽ bị xóa khi server khởi động lại.`
  );
  console.log(`========================================\n`);
});
