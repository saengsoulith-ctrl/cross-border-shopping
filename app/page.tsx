"use client";
import { useState } from "react";

type Product = {
  origin: string; category: string; url: string; name: string;
  observedPrice: string; currency: string; quantity: string;
  color: string; size: string; volume: string; unit: string; spec: string;
  screenshot: File | null;
};

const fresh = (): Product => ({
  origin: "CN", category: "general", url: "", name: "",
  observedPrice: "", currency: "CNY", quantity: "1",
  color: "", size: "", volume: "", unit: "ml", spec: "", screenshot: null,
});

const curr: Record<string, string> = { CN: "CNY", TH: "THB", VN: "VND" };
const PAGE_ID = "18062086765455";
const CARRIER_LIST = ["1", "2", "3", "4"];

export default function Home() {
  const [ps, setPs] = useState<Product[]>([fresh()]);
  const [pay, setPay] = useState("LAK");
  const [carrier, setCarrier] = useState("carrier_1");
  const [cust, setCust] = useState({ name: "", phone: "", contact: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [done, setDone] = useState<{ orderNumber: string; name: string; count: number; currency: string } | null>(null);

  const upd = (i: number, k: keyof Product, v: unknown) =>
    setPs((a) => a.map((p, n) => (n === i ? { ...p, [k]: v, ...(k === "origin" ? { currency: curr[String(v)] } : {}) } : p)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg("");
    if (ps.some((p) => !p.screenshot)) {
      setErrMsg("กรุณาแนบภาพหน้าจอให้ครบทุกสินค้า");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("customer", JSON.stringify(cust));
      fd.append("paymentCurrency", pay);
      fd.append("carrierCode", carrier);
      fd.append("products", JSON.stringify(ps.map(({ screenshot, ...p }) => p)));
      ps.forEach((p, i) => {
        if (p.screenshot) fd.append("screenshot_" + i, p.screenshot);
      });

      const r = await fetch("/api/orders", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "ส่งคำสั่งซื้อไม่สำเร็จ");

      setDone({ orderNumber: d.orderNumber, name: cust.name, count: ps.length, currency: pay });
      setPs([fresh()]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <h1>Cross-border Shopping</h1>
        <p>สั่งสินค้าจากจีน ไทย และเวียดนามในออเดอร์เดียว</p>
        <small>ระบบสั่งซื้อ · ตรวจสอบราคา · ติดตามสถานะ</small>
      </header>

      {done ? (
        <section className="panel" style={{ textAlign: "center", padding: "32px 20px", border: "2px solid #16a34a" }}>
          <div style={{ fontSize: "48px" }}>✅</div>
          <h2 style={{ color: "#15803d", fontSize: "24px", margin: "8px 0" }}>ส่งคำสั่งซื้อสำเร็จแล้ว!</h2>
          <p className="muted">ขอบคุณคุณ <strong>{done.name}</strong> ระบบได้รับรายการของคุณเรียบร้อย</p>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", maxWidth: "420px", margin: "18px auto", textAlign: "left" }}>
            <small>เลขที่คำสั่งซื้อ</small>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#102a43", marginBottom: "10px" }}>{done.orderNumber}</div>
            <small>สถานะปัจจุบัน</small>
            <div style={{ marginTop: "4px", marginBottom: "10px" }}>
              <span style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #f59e0b", padding: "5px 12px", borderRadius: "999px", fontWeight: "bold", fontSize: "13px" }}>
                🔍 ตรวจสอบราคา (Checking Price)
              </span>
            </div>
            <small>รายละเอียด: {done.count} รายการ · ชำระเป็น {done.currency}</small>
          </div>

          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "16px", maxWidth: "420px", margin: "0 auto 20px" }}>
            <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#1e3a8a", fontWeight: "bold" }}>
              📲 กดปุ่มด้านล่างเพื่อรับใบเสนอราคาและ QR ชำระเงินผ่าน Messenger
            </p>
            <a
              href={`https://m.me{PAGE_ID}?ref=${done.orderNumber}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-block", background: "#0084ff", color: "white", padding: "12px 20px", borderRadius: "10px", fontWeight: "bold", textDecoration: "none" }}
            >
              💬 รับแจ้งเตือนผ่าน Messenger
            </a>
          </div>

          <button type="button" className="secondary" onClick={() => setDone(null)}>+ สั่งซื้อรายการใหม่</button>
        </section>
      ) : (
        <>
          {errMsg && <div className="error" style={{ marginBottom: "14px", fontWeight: "bold" }}>⚠️ {errMsg}</div>}
          <form onSubmit={submit}>
            <section className="panel">
              <h2>1. รายการสินค้า</h2>
              <p className="muted">ทุกสินค้าต้องมี URL ราคา และภาพหน้าจอจากแอปต้นทาง</p>
              {ps.map((p, i) => (
                <div className="product" key={i}>
                  <div className="grid">
                    <div className="field"><label>ประเทศต้นทาง</label><select value={p.origin} onChange={(e) => upd(i, "origin", e.target.value)}><option value="CN">จีน</option><option value="TH">ไทย</option><option value="VN">เวียดนาม</option></select></div>
                    <div className="field"><label>ประเภทสินค้า</label><select value={p.category} onChange={(e) => upd(i, "category", e.target.value)}><option value="general">ของใช้ทั่วไป</option><option value="clothes">เสื้อผ้า</option><option value="liquid">ของเหลว/เครื่องสำอาง</option><option value="other">อื่น ๆ</option></select></div>
                  </div>
                  <div className="field"><label>URL สินค้า *</label><input required type="url" value={p.url} onChange={(e) => upd(i, "url", e.target.value)} placeholder="วางลิงก์สินค้า" /></div>
                  <div className="grid">
                    <div className="field"><label>ชื่อสินค้า *</label><input required value={p.name} onChange={(e) => upd(i, "name", e.target.value)} /></div>
                    <div className="field"><label>ราคาที่เห็น ({p.currency}) *</label><input required type="number" min="0" step="any" value={p.observedPrice} onChange={(e) => upd(i, "observedPrice", e.target.value)} /></div>
                    <div className="field"><label>จำนวน *</label><input required type="number" min="1" value={p.quantity} onChange={(e) => upd(i, "quantity", e.target.value)} /></div>
                  </div>
                  {p.category === "clothes" && <div className="grid"><div className="field"><label>สี</label><input value={p.color} onChange={(e) => upd(i, "color", e.target.value)} /></div><div className="field"><label>ไซซ์</label><input value={p.size} onChange={(e) => upd(i, "size", e.target.value)} /></div></div>}
                  {p.category === "liquid" && <div className="grid"><div className="field"><label>ปริมาณ</label><input type="number" value={p.volume} onChange={(e) => upd(i, "volume", e.target.value)} /></div><div className="field"><label>หน่วย</label><select value={p.unit} onChange={(e) => upd(i, "unit", e.target.value)}><option>ml</option><option>L</option><option>g</option><option>kg</option></select></div></div>}
                  {p.category === "other" && <div className="field"><label>รายละเอียด/สเปก</label><textarea value={p.spec} onChange={(e) => upd(i, "spec", e.target.value)} /></div>}
                  <div className="field">
                    <label>ภาพหน้าจอสินค้า <span className="required">* บังคับแนบทุกชิ้น</span></label>
                    <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upd(i, "screenshot", e.target.files ? e.target.files.item(0) : null)} />
                    <small>JPG, PNG หรือ WEBP ไม่เกิน 8 MB</small>
                  </div>
                  {ps.length > 1 && <button type="button" className="secondary" onClick={() => setPs((a) => a.filter((_, n) => n !== i))}>ลบรายการ</button>}
                </div>
              ))}
              <button type="button" className="secondary" onClick={() => setPs((a) => [...a, fresh()])}>+ เพิ่มสินค้า</button>
            </section>
            <section className="panel">
              <h2>2. การจัดส่งและชำระเงิน</h2>
              <div className="grid">
                <div className="field"><label>สกุลเงินชำระ</label><select value={pay} onChange={(e) => setPay(e.target.value)}><option value="LAK">กีบลาว (LAK)</option><option value="THB">บาทไทย (THB)</option></select></div>
                <div className="field"><label>บริษัทขนส่ง</label><select value={carrier} onChange={(e) => setCarrier(e.target.value)}>{CARRIER_LIST.map((n) => <option key={n} value={"carrier_" + n}>บริษัทขนส่ง {n}</option>)}</select></div>
              </div>
            </section>
            <section className="panel">
              <h2>3. ข้อมูลผู้สั่งซื้อ</h2>
              <div className="grid">
                <div className="field"><label>ชื่อ-นามสกุล *</label><input required value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} /></div>
                <div className="field"><label>เบอร์โทรศัพท์ *</label><input required value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} /></div>
                <div className="field"><label>ช่องทางติดต่อเพิ่มเติม</label><input value={cust.contact} onChange={(e) => setCust({ ...cust, contact: e.target.value })} /></div>
              </div>
