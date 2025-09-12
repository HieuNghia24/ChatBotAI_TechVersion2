import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import fs from "fs";
import session from "express-session"; // Thêm dòng này

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Để đọc form login

// Cấu hình session
app.use(session({
  secret: 'your_secret_key', // Thay bằng key mạnh
  resave: false,
  saveUninitialized: true
}));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// ========== ĐĂNG NHẬP ==========

// Route GET: Mặc định chuyển về login nếu chưa login
app.get("/", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/index.html");
  } else {
    res.redirect("/login.html");
  }
});

// Route POST: Xử lý form đăng nhập
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Bạn có thể thay đoạn này bằng logic check thật
  if (username === "admin" && password === "1234") {
    req.session.loggedIn = true;
    res.redirect("/index.html");
  } else {
    res.send("Sai tài khoản hoặc mật khẩu. <a href='/login.html'>Thử lại</a>");
  }
});

// Route logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login.html");
  });
});

// Bảo vệ truy cập index.html
app.get("/index.html", (req, res, next) => {
  if (req.session.loggedIn) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.redirect("/login.html");
  }
});

// ========== API CHATBOT ==========

let faqs = [];
function loadFaq(){
  try{
    const filePath = path.join(__dirname, "faq.xlsx");
    if (!fs.existsSync(filePath)) {
      console.warn("faq.xlsx not found at", filePath);
      faqs = [];
      return;
    }
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    faqs = xlsx.utils.sheet_to_json(sheet);
    console.log(`✅ Loaded ${faqs.length} FAQ rows from ${filePath}`);
  }catch(err){
    console.error("Error loading faq.xlsx:", err.message);
    faqs = [];
  }
}
loadFaq();

app.get("/ping", (req,res) => res.json({ok:true}));

app.post("/api/ask", (req, res) => {
  const question = (req.body?.question || "").toString().trim().toLowerCase();
  if(!question) return res.json({ answer: "Vui lòng nhập câu hỏi." });

  let answer = null;
  for (const row of faqs) {
    if (!row.question) continue;
    try {
      const q = row.question.toString().toLowerCase();
      if (question.includes(q) || q.includes(question)) {
        answer = row.answer || "";
        break;
      }
    } catch(e){ continue; }
  }

  if (!answer) answer = "Xin lỗi, tôi chưa có câu trả lời phù hợp.";

  return res.json({ answer });
});

app.get("/api/reload-faq", (req,res)=>{
  loadFaq();
  res.json({ok:true, count: faqs.length});
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
