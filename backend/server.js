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

// CẤU HÌNH ĐƯỜNG DẪN LƯU ẢNH (ĐÃ SỬA CHUẨN VÀ Tối ưu thêm)
// ⚠️ LOGIC ĐƯỜNG DẪN: Nếu đang chạy trên server đám mây (có biến môi trường PORT), sử dụng đường dẫn tương đối.
// Nếu chạy trên máy local (không có biến PORT), sử dụng đường dẫn cứng của user.
// Lưu ý: Đối với đường dẫn trên máy local, đảm bảo không có dấu `/` thừa ở cuối nếu UPLOAD_DIR_LOCAL đã có.
const UPLOAD_DIR_LOCAL = String.raw`D:\AI_Intern_Helper\ai-intern-helper\backend\uploads`;
const UPLOAD_DIR_CLOUD = path.join(__dirname, "uploads");

const UPLOAD_DIR = process.env.PORT ? UPLOAD_DIR_CLOUD : UPLOAD_DIR_LOCAL;

// Đảm bảo thư mục lưu trữ tồn tại khi khởi động server
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`✅ Đã tạo thư mục upload: ${UPLOAD_DIR}`);
  }
} catch (err) {
  // Báo lỗi nhưng KHÔNG DỪNG SERVER (để server Render vẫn chạy được)
  console.error("⚠️ CẢNH BÁO: Không thể tạo thư mục upload. Lỗi:", err.message);
  // Nếu thư mục không tạo được, có thể server sẽ không hoạt động đúng
  // Đây là lỗi nghiêm trọng trên Render, nhưng trên local có thể do quyền.
  // Tuy nhiên, chúng ta vẫn cố gắng để server chạy tiếp.
}

// Middleware
// Tăng giới hạn kích thước request để nhận ảnh lớn (50mb)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// Cho phép frontend gọi API (CORS)
app.use(cors());

// Cấu hình để server phục vụ các file tĩnh trong thư mục uploads (để frontend có thể xem ảnh)
// Đây là route cho các ảnh đã được lưu
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
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");

    // 2. Tạo tên file
    const finalFilename = filename || `draft_${Date.now()}.png`;
    const filePath = path.join(UPLOAD_DIR, finalFilename);

    // 3. Ghi file vào ổ cứng (bất đồng bộ)
    fs.writeFile(filePath, base64Data, "base64", (err) => {
      if (err) {
        console.error("❌ Lỗi khi ghi file:", err);
        // Trả về lỗi 500 nếu không ghi được xuống đĩa
        return res.status(500).json({
          error: "Lỗi hệ thống: Không thể lưu file vào ổ cứng server",
          details: err.message,
        });
      }

      console.log(`✅ Đã lưu nháp thành công: ${filePath}`);

      // 4. Trả về đường dẫn tương đối để frontend có thể truy cập
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
// PHỤC VỤ FRONTEND (index.html)
// =============================================

// Lấy đường dẫn thư mục gốc của project (cùng cấp với backend và index.html)
// process.cwd() trả về thư mục mà từ đó bạn chạy lệnh `node server.js`
const projectRoot = process.cwd();

// Phục vụ file index.html khi người dùng truy cập route gốc (/)
// Điều này giả định index.html nằm NGAY trong thư mục gốc của project
// (cùng cấp với thư mục backend)
app.get("/", (req, res) => {
  const indexPath = path.join(projectRoot, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Nếu không tìm thấy index.html, có thể trả về lỗi hoặc một trang mặc định
    res.status(404).send("File index.html không tìm thấy.");
  }
});

// =============================================
// KHỞI ĐỘNG SERVER
// =============================================
app.listen(port, () => {
  console.log(`\n========================================`);
  // Log URL cục bộ để kiểm tra
  console.log(`🚀 Backend đang chạy trên cổng ${port}`);
  console.log(`📁 Thư mục lưu ảnh nháp: ${UPLOAD_DIR}`);
  console.log(`📂 Thư mục gốc project: ${projectRoot}`);
  console.log(
    `🌐 Trang chủ Frontend có thể truy cập tại: http://localhost:${port}`
  );
  console.log(`========================================\n`);
});
