import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Load FAQ safely
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

// POST /api/ask - find best match (contains)
app.post("/api/ask", (req, res) => {
  const question = (req.body?.question || "").toString().trim().toLowerCase();
  if(!question) return res.json({ answer: "Vui lòng nhập câu hỏi." });

  // Exact contains match on 'question' column (case-insensitive)
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

// reload endpoint
app.get("/api/reload-faq", (req,res)=>{
  loadFaq();
  res.json({ok:true, count: faqs.length});
});

// serve index


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});







const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình session
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

// Middleware để parse form data
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('public'));

// Route mặc định -> chuyển về login.html
app.get('/', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/index.html');
  } else {
    res.redirect('/login.html');
  }
});

// Xử lý login (giả định user/pass là cố định)
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Kiểm tra tài khoản
  if (username === 'admin' && password === '1234') {
    req.session.loggedIn = true;
    res.redirect('/index.html');
  } else {
    res.send('Login thất bại. <a href="/login.html">Thử lại</a>');
  }
});

// Middleware kiểm tra đăng nhập trước khi truy cập index.html
app.get('/index.html', (req, res, next) => {
  if (req.session.loggedIn) {
    return next(); // Cho phép truy cập file index.html
  } else {
    return res.redirect('/login.html');
  }
});

// Đăng xuất
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
