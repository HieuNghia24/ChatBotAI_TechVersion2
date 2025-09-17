const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Session setup =====
app.use(
  session({
    secret: "chatbot-secret-key", // đổi thành chuỗi mạnh hơn
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // secure:true nếu chạy HTTPS
  })
);

// ---- Load FAQ từ file Excel ----
let faqData = [];

function loadFAQ() {
  try {
    const filePath = path.join(__dirname, "faq.xlsx");

    if (!fs.existsSync(filePath)) {
      console.warn("⚠️  File faq.xlsx không tồn tại.");
      faqData = [];
      return;
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    faqData = xlsx.utils.sheet_to_json(sheet);

    console.log(`✅ Đã load ${faqData.length} FAQ từ ${filePath}`);
  } catch (err) {
    console.error("❌ Lỗi khi load faq.xlsx:", err.message);
    faqData = [];
  }
}

loadFAQ();

// ===== Middleware kiểm tra login =====
function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/login.html");
  }
}

// ===== Routes =====

// Trang login (static)
app.use(express.static(path.join(__dirname, "public")));

// API login xử lý form
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // demo: user = admin, pass = 123456
  if (username === "admin" && password === "123456") {
    req.session.user = username;
    return res.redirect("/index.html"); // vào chatbot
  }

  res.send(`<p>Sai tài khoản/mật khẩu. <a href="/login.html">Thử lại</a></p>`);
});

// Đăng xuất
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

// Bảo vệ chatbot: chỉ vào được nếu login
app.get("/index.html", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API lấy FAQ
app.get("/faq", requireLogin, (req, res) => {
  res.json(faqData);
});

// API tìm kiếm
app.get("/faq/search", requireLogin, (req, res) => {
  const keyword = (req.query.q || "").toLowerCase();
  const results = faqData.filter(
    (item) => item.question && item.question.toLowerCase().includes(keyword)
  );
  res.json({ keyword, results });
});

// Khởi động server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
