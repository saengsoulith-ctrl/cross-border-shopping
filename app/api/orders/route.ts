import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function GET(req: Request) {
  const pw = req.headers.get("x-admin-password");
  if (pw !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "รหัสผ่านแอดมินไม่ถูกต้อง" }, { status: 401 });

  const supabase = db();
  const { data: orders } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(30);
  
  for (const o of orders || []) {
    for (const item of o.order_items || []) {
      const { data } = await supabase.storage.from("product-evidence").createSignedUrl(item.screenshot_path, 3600);
      item.signedUrl = data?.signedUrl || "";
    }
  }
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const pw = req.headers.get("x-admin-password");
  if (pw !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "รหัสผ่านแอดมินไม่ถูกต้อง" }, { status: 401 });

  const { orderId, finalTotal, note } = await req.json();
  const supabase = db();
  const { data: order, error } = await supabase.from("orders").update({ final_total: Number(finalTotal), status: "waiting_customer_approval" }).eq("id", orderId).select("*").single();
  if (error || !order) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 400 });

  const psidMatch = order.customer_contact?.match(/PSID:(\d+)/);
  const psid = psidMatch ? psidMatch.at(1) : null;
  if (!psid) {
    return NextResponse.json({ error: "บันทึกยอดแล้ว แต่ลูกค้ายังไม่ได้กดปุ่มรับแจ้งเตือนผ่าน Messenger (กรุณาส่งเลขที่ออเดอร์ให้ลูกค้าทักเพจก่อน)" }, { status: 400 });
  }

  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const msgText = `📋 แจ้งสรุปราคาออเดอร์: ${order.order_number}\n👤 ลูกค้า: ${order.customer_name}\n${note ? `📝 รายละเอียด: ${note}\n` : ""}💰 ยอดรวมทั้งหมด: ${Number(finalTotal).toLocaleString()} ${order.payment_currency}\n\nกดปุ่มด้านล่างเพื่อยืนยันสั่งซื้อและรับ QR ชำระเงินครับ 👇`;

  const fbRes = await fetch(`https://facebook.com{token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: psid },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: msgText,
            buttons: [
              { type: "postback", title: "✅ ตกลงสั่งซื้อ", payload: `CONFIRM_ORDER_${order.order_number}` }
            ],
          },
        },
      },
    }),
  });

  if (!fbRes.ok) {
    const errData = await fbRes.json();
    return NextResponse.json({ error: "ส่งเข้า Messenger ไม่สำเร็จ: " + (errData.error?.message || "Unknown error") }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
