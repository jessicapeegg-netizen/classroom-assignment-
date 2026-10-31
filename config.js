/**
 * Classroom LMS Configuration
 * พัฒนาระบบ โดย Jessica_P.
 */
/**
 * การตั้งค่าระบบส่งงานและจัดการการเรียนรู้ (LMS Config)
 * สำหรับใช้งานบน GitHub Pages หรือ Static Hosting
 */
window.CONFIG = {
  // นำ URL ที่ได้จากการ Deploy Google Apps Script Web App มาใส่ที่นี่
  // ตัวอย่าง: https://script.google.com/macros/s/AKfycbx.../exec
  API_URL: "https://script.google.com/macros/s/AKfycbzZDSZg90H-57NJLfnyG96eu14Bi5mdaezFRK2FCeI18COklwSJqR07iLU5W-nnUB67/exec",

  // ข้อมูล Google Spreadsheet และ Drive สำหรับแสดงผลหรืออ้างอิง
  SPREADSHEET_ID: "1UMTTfpFow5lh8CSA5kXZVsYhqQlWPa2dCzJQvjAH2V0",
  SPREADSHEET_URL: "https://docs.google.com/spreadsheets/d/1UMTTfpFow5lh8CSA5kXZVsYhqQlWPa2dCzJQvjAH2V0/edit?gid=1702566810#gid=1702566810",
  DRIVE_FOLDER_ID: "1F7HnHe8wRanOGTIJwN51vqLozSystOEP",
  DRIVE_FOLDER_URL: "https://drive.google.com/drive/folders/1F7HnHe8wRanOGTIJwN51vqLozSystOEP",

  // ข้อมูลระบบเริ่มต้น
  APP_NAME: "ระบบส่งงานนักเรียน & จัดการเรียนการสอน",
  SEMESTER_DEFAULT: "ภาคเรียนที่ 1/2567",
  ACADEMIC_YEAR_DEFAULT: "2569",

  // บังคับใช้ HTTP API เสมอ แม้จะเปิดบน Apps Script Web App (แนะนำ true สำหรับ GitHub Pages)
  FORCE_HTTP_API: false
};
