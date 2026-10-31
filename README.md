# ระบบส่งงานและจัดการการเรียนการสอน (Classroom Assignment LMS)
**พัฒนาระบบ โดย: Jessica_P.**

### สถาปัตยกรรมใหม่: GitHub Pages (Frontend) + Google Apps Script Web App (API) + Google Sheets & Google Drive (Database & Storage)

---

## 📌 บทนำและภาพรวมระบบ (Overview)

ระบบจัดการการเรียนการสอนและการส่งการบ้าน (Classroom Assignment & Grading LMS) ที่ได้รับการปรับปรุงสถาปัตยกรรมใหม่จากระบบเดิมที่ทำงานแบบ Monolithic บน Google Apps Script ให้กลายเป็น **Decoupled Architecture**:
* **Frontend**: โฮสต์บน **GitHub Pages** เป็น Static Web Pages (HTML5, Tailwind CSS, FontAwesome, JavaScript ES6+) โหลดไวผ่านเครือข่ายสากล (Global CDN) รองรับการเปิดใช้งานบนทุกอุปกรณ์ (Responsive & Mobile-first)
* **Backend API**: พัฒนาด้วย **Google Apps Script (`Code.gs`)** ให้บริการในรูปแบบ RESTful JSON API (`doPost` / `doGet`)
* **Database**: ใช้ **Google Sheets** เป็นฐานข้อมูลหลัก จัดเก็บข้อมูลนักเรียน ครู การบ้าน การส่งงาน คะแนน และประกาศ
* **File Storage**: ใช้ **Google Drive** จัดเก็บไฟล์งานที่นักเรียนอัปโหลด และรายงาน Gradebook ที่สร้างขึ้น

---

## 🔍 การวิเคราะห์จุดอ่อนของระบบเดิม vs จุดที่พัฒนาใหม่

| มิติ | ❌ ระบบเดิม (จุดอ่อน) | ✅ ระบบใหม่ที่พัฒนาแล้ว (จุดแข็ง) |
| :--- | :--- | :--- |
| **1. สถาปัตยกรรม (Architecture)** | ผูกติดแน่นกับ Google Apps Script Runtime (`<?= url ?>`, `google.script.run`) ไม่สามารถนำไปรันบนเว็บโฮสติ้งอื่นได้ | **Decoupled แยกอิสระ**: หน้าบ้านรันบน GitHub Pages ได้ 100% สื่อสารกับหลังบ้านผ่าน REST API และมี Dual-Engine Proxy รองรับทั้งสองสภาพแวดล้อม |
| **2. ปัญหา CORS & Preflight** | เมื่อพยายามย้ายหน้าเว็บออกไปข้างนอก จะติดข้อจำกัด CORS Preflight (OPTIONS Request) ทำให้ Apps Script ปฏิเสธการเชื่อมต่อ (405 Method Not Allowed) | **CORS Simple-Request Bypassing**: ออกแบบ Client ใน `js/api.js` ให้ส่ง `Content-Type: text/plain;charset=utf-8` พร้อม JSON payload ทำให้ Fetch ผ่านฉลุยโดยไม่ต้องผ่าน preflight |
| **3. คุณภาพโค้ดหลังบ้าน (Backend Code)** | โค้ดเดิมยาวกว่า 4,005 บรรทัด มีการประกาศฟังก์ชันซ้ำซ้อน (Duplicate/Shadowing) เช่น `doGet`, `sheetToJson`, `sanitizeConfigForStudent_` | **Unified Codebase (`Code.gs`)**: รวมโค้ดสะอาด ลดความซ้ำซ้อน แยกโมดูลการทำงานชัดเจน จัดการ Error Handling อย่างเป็นระบบ |
| **4. ความปลอดภัยของรหัสผ่าน (Password Security)** | รหัสผ่านเก็บเป็นข้อความธรรมดา (Plain text) หรือใช้การเข้ารหัสแบบไม่มี Salt เสี่ยงต่อ Rainbow Table Attack | **SHA-256 + Salted Hashing**: รหัสผ่านของครูและนักเรียนถูก Hash ด้วยอัลกอริทึม SHA-256 ผสม Salt เฉพาะบุคคล ป้องกันการถอดรหัส |
| **5. ประสิทธิภาพการโหลด (Performance)** | โหลดช้าเพราะเซิร์ฟเวอร์ GAS ต้องประมวลผล HTML Template และฝัง Scriptlet ทุกครั้งที่มีคนเปิดหน้าเว็บ | **Ultra-Fast Static Serving**: หน้าเว็บโหลดจาก GitHub Pages ทันที ทรัพยากรถูกแคชบน CDN และดึงข้อมูลเฉพาะที่จำเป็นผ่าน AJAX/Fetch |
| **6. การจัดการ Session & Token** | อาศัย LocalStorage ทั่วไป ขาดการตรวจสอบอายุโทเค็นที่รัดกุม | **Timed Session Tokens**: มีระบบ Session Management พร้อมตรวจสอบสิทธิ์ Role-Based (Student vs Teacher vs Admin) ป้องกันการเข้าถึงข้อมูลข้ามสิทธิ์ |
| **7. การทำงานแบบ Fallback** | หากไม่มีฟังก์ชันที่ต้องการ ระบบจะเกิด Runtime Crash หน้าจอค้าง | **Transparent Proxy Shim**: `js/api.js` มี Shim สำหรับ `google.script.run` แบบอัตโนมัติ ทำให้โค้ด UI เดิมทำงานได้อย่างต่อเนื่องไร้รอยต่อ |

---

## 📁 โครงสร้างโปรเจกต์ (Project Directory)

```text
classroomAssingnment/
├── index.html         # หน้า Landing Page & Smart Router (นำทางอัตโนมัติไปยังหน้าตามบทบาท)
├── login.html         # ระบบเข้าสู่ระบบ/ลงทะเบียน สำหรับทั้งนักเรียนและครู
├── student.html       # พอร์ทัลนักเรียน (แดชบอร์ด, ดูการบ้าน, ส่งไฟล์งาน, แชทกับครู, ผลการเรียน)
├── admin.html         # พอร์ทัลครูผู้สอน/แอดมิน (สร้างวิชา, สั่งงาน, ตรวจงาน, Gradebook V2, ส่งออกรายงาน)
├── js/
│   ├── config.js      # กำหนดค่า URL ของ Web App และ ID ของ Spreadsheet/Drive
│   └── api.js         # Unified API Client, Dual-engine Bridge, Session & Storage Helper
├── Code.gs            # โค้ด Backend หลักบน Google Apps Script (REST API & Sheets DB Handler)
└── README.md          # คู่มือการติดตั้งและใช้งานระบบ
```

---

## 🚀 ขั้นตอนการติดตั้งและขึ้นระบบ (Deployment Guide)

### ขั้นตอนที่ 1: ตั้งค่า Google Apps Script (Backend)

1. เปิด **Google Spreadsheet** ฐานข้อมูลของคุณ:
   - URL: `https://docs.google.com/spreadsheets/d/1UMTTfpFow5lh8CSA5kXZVsYhqQlWPa2dCzJQvjAH2V0/edit`
2. ไปที่เมนู **ส่วนขยาย (Extensions)** ➔ **Apps Script**
3. ลบโค้ดเดิมในไฟล์ `Code.gs` ทั้งหมด แล้วคัดลอกโค้ดจากไฟล์ **`Code.gs`** ในโปรเจกต์นี้ไปวางแทนที่
4. ตรวจสอบค่าคงที่ด้านบนสุดของ `Code.gs`:
   ```javascript
   var SPREADSHEET_ID_CONFIG = '1UMTTfpFow5lh8CSA5kXZVsYhqQlWPa2dCzJQvjAH2V0';
   var ROOT_FOLDER_ID_CONFIG = '1F7HnHe8wRanOGTIJwN51vqLozSystOEP';
   var SUBFOLDER_NAME_CONFIG = '2-2569';
   ```
5. กดปุ่ม **บันทึก (Save)** 💾
6. กดปุ่ม **ทำให้ใช้งานได้ (Deploy)** ➔ **การทำให้ใช้งานได้รายการใหม่ (New deployment)**
   - เลือกประเภท: **เว็บแอป (Web app)**
   - คำอธิบาย (Description): `Classroom LMS API V2`
   - ปฏิบัติการในฐานะ (Execute as): **ฉัน (Me - your account)**
   - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): **ทุกคน (Anyone)** *(สำคัญมาก: ต้องเลือก Anyone เพื่อให้ GitHub Pages เรียก API ได้)*
7. กด **ทำให้ใช้งานได้ (Deploy)** และให้สิทธิ์การเข้าถึง (Authorize access)
8. **คัดลอก URL ของเว็บแอป (Web App URL)** ที่ได้ เช่น:
   `https://script.google.com/macros/s/AKfycbx.../exec`

---

### ขั้นตอนที่ 2: ตั้งค่า URL ในไฟล์ Config (Frontend)

1. เปิดไฟล์ `js/config.js` ในโฟลเดอร์โปรเจกต์
2. นำ URL ที่คัดลอกมาจากขั้นตอนที่ 1 มาใส่ในตัวแปร `API_URL`:
   ```javascript
   const CONFIG = {
     // วาง URL ของ Apps Script Web App ที่ได้จากการ Deploy ที่นี่
     API_URL: 'https://script.google.com/macros/s/AKfycbx.../exec',
     
     SPREADSHEET_ID: '1UMTTfpFow5lh8CSA5kXZVsYhqQlWPa2dCzJQvjAH2V0',
     DRIVE_FOLDER_ID: '1F7HnHe8wRanOGTIJwN51vqLozSystOEP',
     DEFAULT_SEMESTER: '2-2569',
     MAX_UPLOAD_MB: 25,
     FORCE_HTTP_API: true
   };
   ```
3. บันทึกไฟล์ `js/config.js`

---

### ขั้นตอนที่ 3: เผยแพร่เว็บผ่าน GitHub Pages

1. นำไฟล์ทั้งหมดในโปรเจกต์ขึ้นไปยัง **GitHub Repository** ของคุณ:
   ```bash
   git init
   git add .
   git commit -m "feat: upgrade Classroom LMS to GitHub Pages + Google Sheets API"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. เปิดหน้า Repository บนเว็บ GitHub ➔ ไปที่แท็บ **Settings**
3. ที่เมนูด้านซ้าย เลือกหัวข้อ **Pages**
4. ในส่วน **Build and deployment**:
   - Source: เลือก **Deploy from a branch**
   - Branch: เลือก **main** และโฟลเดอร์ **/ (root)**
   - กดปุ่ม **Save**
5. รอประมาณ 1-2 นาที GitHub Pages จะสร้าง URL ให้คุณ เช่น:
   `https://<your-username>.github.io/<your-repo-name>/`
6. เปิดใช้งานระบบผ่าน URL ดังกล่าวได้ทันที! 🎉

---

## ⚙️ คุณสมบัติเด่นของระบบ (Key Features)

### 1. พอร์ทัลนักเรียน (Student Portal - `student.html`)
- **Dashboard สรุปภาพรวม**: แสดงงานที่ต้องส่ง, งานที่ส่งแล้ว, งานที่เลยกำหนด, และคะแนนรวม
- **ส่งงานแบบ Multi-File**: รองรับการแนบไฟล์หลายชนิด (PDF, DOCX, ZIP, รูปภาพ ฯลฯ) รวมกันได้สูงสุด 40MB
- **ระบบสนทนาสองทาง (Feedback Stream)**: พูดคุย สอบถามข้อสงสัย หรือรับข้อเสนอแนะจากครูประจำวิชาได้โดยตรง
- **ลงทะเบียนเข้าชั้นเรียนด้วยตนเอง**: กรอกรหัสเข้าร่วมวิชา (Join Code) ได้ทันที

### 2. พอร์ทัลครูผู้สอนและผู้ดูแลระบบ (Admin/Teacher Portal - `admin.html`)
- **จัดการรายวิชาและการบ้าน**: สั่งงาน กำหนดคะแนนเต็ม กำหนดวันสิ้นสุด และเปิด/ปิดรับงานได้แบบเรียลไทม์
- **ตรวจการบ้านและให้เกรด**: ดูไฟล์งานของนักเรียน ให้คะแนน และพิมพ์ข้อเสนอแนะกลับไปยังนักเรียน
- **สมุดบันทึกคะแนนขั้นสูง (Gradebook V2)**:
  - คำนวณคะแนนเก็บ คะแนนสอบกลางภาค และคะแนนสอบปลายภาคแบบถ่วงน้ำหนักอัตโนมัติ
  - ตัดเกรดอัตโนมัติ (เกรด 4, 3.5, 3, 2.5, 2, 1.5, 1, 0)
  - ส่งออกรายงาน (Export) เป็นไฟล์ **Excel (.xlsx), PDF, หรือ CSV** พร้อมดาวน์โหลด
- **นำเข้ารายชื่อนักเรียน (CSV Import)**: เพิ่มรายชื่อนักเรียนยกห้องเรียนได้ในคลิกเดียว
- **ระบบโลโก้และธีมโรงเรียน**: อัปโหลดภาพตราโรงเรียนเพื่อแสดงบนหัวเว็บและรายงาน

---

## 🔒 มาตรการความปลอดภัย (Security & Best Practices)

1. **การป้องกันรหัสผ่าน**: ใช้เทคนิค Salting ร่วมกับ SHA-256 Hashing ทุกบัญชี
2. **การป้องกันข้อมูลสูญหาย**: โค้ด Backend มีระบบสร้างชีตและคอลัมน์ที่จำเป็นให้อัตโนมัติหากยังไม่มีใน Google Sheet
3. **การป้องกัน URL Injection**: มีฟังก์ชัน `escapeHtml` และ `safeUrl` ตรวจสอบลิงก์ภายนอกก่อนเรนเดอร์ใน DOM เพื่อป้องกันการโจมตีแบบ XSS
4. **โควต้าการส่งงาน**: กำหนดขนาดไฟล์สูงสุดไม่เกิน 25MB ต่อไฟล์ และ 40MB ต่อครั้ง เพื่อไม่ให้กระทบประสิทธิภาพของ Google Drive API

---

## 📞 ข้อมูลสนับสนุนและพัฒนาต่อยอด
- **Spreadsheet DB ID**: `1UMTTfpFow5lh8CSA5kXZVsYhqQlWPa2dCzJQvjAH2V0`
- **Google Drive Storage ID**: `1F7HnHe8wRanOGTIJwN51vqLozSystOEP` (โฟลเดอร์ภาคเรียน: `2-2569`)
- โครงการนี้พร้อมใช้งานทันทีสำหรับการเรียนการสอนในระดับโรงเรียนและสถาบันการศึกษา!
- **พัฒนาระบบ โดย: Jessica_P.**
