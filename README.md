# Host Note

แอปจดรอบสำหรับคนทำงานบาร์/host บน iPhone แบบ PWA

## ใช้งานบน iPhone

1. อัปโหลดไฟล์ทั้งหมดขึ้นโฮสต์ HTTPS เช่น GitHub Pages, Netlify หรือ Vercel
2. เปิดลิงก์ด้วย Safari บน iPhone
3. กดปุ่ม Share แล้วเลือก Add to Home Screen

ข้อมูลที่กรอกจะถูกเก็บในเครื่องด้วย `localStorage` และแอปมี `service worker` สำหรับเปิดซ้ำแบบออฟไลน์หลังติดตั้งแล้ว

## ไฟล์หลัก

- `index.html` หน้าแอป
- `styles.css` หน้าตาแอป
- `app.js` การคำนวณและบันทึกข้อมูล
- `manifest.webmanifest` ข้อมูลติดตั้ง PWA
- `sw.js` แคชไฟล์สำหรับใช้ออฟไลน์
- `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` ไอคอนสำหรับ iPhone/PWA
