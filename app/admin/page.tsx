"use client";
import { useState } from "react";

interface OrderItem {
  id: string;
  product_name: string;
  origin_country: string;
  customer_observed_price: number;
  source_currency: string;
  quantity: number;
  product_url: string;
  signedUrl?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  destination_address: string;
  customer_contact?: string;
  status: string;
  payment_currency: string;
  final_total?: number;
  order_items?: OrderItem[];
}

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function loadOrders(password = pw) {
    setLoading(true);
    const r = await fetch("/api/admin/orders", { headers: { "x-admin-password": password } });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { alert(d.error || "รหัสผ่านไม่ถูกต้อง"); return; }
    setAuthed(true);
    setOrders(d.orders || []);
  }

  async function sendQuote(orderId: string) {
    const total = prices[orderId];
    if (!total) { alert("กรุณากรอกยอดเงินรวมสุทธิก่อนส่ง"); return; }
    setLoading(true);
    const r = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ orderId, finalTotal: total, note: notes[orderId] || "" }),
    });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { alert(d.error); return; }
    alert("✅ ส่งใบเสนอราคาพร้อมปุ่มตกลงสั่งซื้อเข้า Messenger ลูกค้าเรียบร้อยแล้ว!");
    loadOrders();
  }

  if (!authed) {
    return (
      <main style={{ maxWidth: "400px", marginTop: "60px" }}>
        <div className="panel">
          <h2>🔐 เข้าสู่ระบบแอดมิน</h2>
          <div className="field">
            <label>รหัสผ่านแอดมิน (ADMIN_PASSWORD)</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="กรอกรหัสผ่าน" />
          </div>
          <button onClick={() => loadOrders()} disabled={loading}>{loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}</button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <header className="hero" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><h1>ระบบจัดการออเดอร์ (Admin)</h1><p>ตรวจสอบราคาและส่งใบเสนอราคาเข้าแชต Messenger</p></div>
        <button className="secondary" onClick={() => loadOrders()}>🔄 รีเฟรช</button>
      </header>

      {orders.map((o) => (
        <div className="panel" key={o.id}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "12px" }}>
            <div>
              <strong style={{ fontSize: "18px", color: "#102a43" }}>{o.order_number}</strong>
              <div className="muted">ลูกค้า: {o.customer_name} ({o.customer_phone}) · ที่อยู่: {o.destination_address}</div>
              <div style={{ fontSize: "13px", color: o.customer_contact?.includes("PSID:") ? "#15803d" : "#c2410c", fontWeight: "bold", marginTop: "4px" }}>
                {o.customer_contact?.includes("PSID:") ? "✅ เชื่อมต่อแชต Messenger แล้ว" : "⚠️ ลูกค้ายังไม่กดเชื่อมแชต Messenger"}
              </div>
            </div>
            <div><span style={{ background: "#e2e8f0", padding: "4px 10px", borderRadius: "999px", fontSize: "13px", fontWeight: "bold" }}>สถานะ: {o.status}</span></div>
          </div>

          {o.order_items?.map((item, idx) => (
            <div key={item.id} style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", marginBottom: "8px", display: "flex", gap: "12px", alignItems: "center" }}>
              {item.signedUrl && <a href={item.signedUrl} target="_blank" rel="noreferrer"><img src={item.signedUrl} alt="item" style={{ width: "70px", height: "70px", objectFit: "cover", borderRadius: "6px" }} /></a>}
              <div style={{ fontSize: "14px" }}>
                <strong>{idx + 1}. {item.product_name}</strong> ({item.origin_country})<br />
                ราคาที่ลูกค้ากรอก: {item.customer_observed_price} {item.source_currency} × {item.quantity} ชิ้น<br />
                <a href={item.product_url} target="_blank" rel="noreferrer" style={{ color: "#0084ff" }}>🔗 เปิดลิงก์สินค้า</a>
              </div>
            </div>
          ))}

          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "12px", borderRadius: "10px", marginTop: "12px" }}>
            <div className="grid">
              <div className="field">
                <label>ยอดรวมสุทธิที่ตรวจสอบแล้ว ({o.payment_currency}) *</label>
                <input type="number" placeholder={`เช่น ${o.payment_currency === "LAK" ? "450000" : "850"}`} value={prices[o.id] ?? o.final_total ?? ""} onChange={(e) => setPrices({ ...prices, [o.id]: e.target.value })} />
              </div>
              <div className="field">
                <label>หมายเหตุ / รายละเอียดค่าส่ง (ส่งให้ลูกค้าเห็น)</label>
                <input placeholder="เช่น ค่าสินค้า + ค่าส่งจีน-ลาว รวมทั้งหมด" value={notes[o.id] || ""} onChange={(e) => setNotes({ ...notes, [o.id]: e.target.value })} />
              </div>
            </div>
            <button onClick={() => sendQuote(o.id)} disabled={loading} style={{ background: "#0084ff" }}>
              📨 บันทึกยอดและส่งปุ่ม "ตกลงสั่งซื้อ" เข้า Messenger
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
