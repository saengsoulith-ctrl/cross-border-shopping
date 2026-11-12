import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {z} from "zod";
export const runtime="nodejs";
const customerSchema=z.object({name:z.string().min(1).max(160),phone:z.string().min(5).max(40),contact:z.string().max(160).optional().default(""),address:z.string().min(5).max(1000)});
const itemSchema=z.object({origin:z.enum(["CN","TH","VN"]),category:z.enum(["general","clothes","liquid","other"]),url:z.string().url(),name:z.string().min(1).max(300),observedPrice:z.string().min(1),currency:z.enum(["CNY","THB","VND"]),quantity:z.string().min(1),color:z.string().optional(),size:z.string().optional(),volume:z.string().optional(),unit:z.string().optional(),spec:z.string().optional()});
export async function POST(req:Request){try{
 const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!u||!k)return NextResponse.json({error:"ยังไม่ได้ตั้งค่า Supabase"},{status:503});
 const f=await req.formData(),customer=customerSchema.parse(JSON.parse(String(f.get("customer")||"{}"))),items=z.array(itemSchema).min(1).max(30).parse(JSON.parse(String(f.get("products")||"[]"))),currency=z.enum(["LAK","THB"]).parse(String(f.get("paymentCurrency"))),carrier=String(f.get("carrierCode"));
 const imgs=items.map((_,i)=>f.get("screenshot_"+i));if(imgs.some(x=>!(x instanceof File)||x.size===0))return NextResponse.json({error:"ต้องแนบภาพทุกสินค้า"},{status:400});
 for(const x of imgs as File[])if(!["image/jpeg","image/png","image/webp"].includes(x.type)||x.size>8*1024*1024)return NextResponse.json({error:"ภาพต้องเป็น JPG/PNG/WEBP และไม่เกิน 8 MB"},{status:400});
 const db=createClient(u,k,{auth:{persistSession:false}}),orderNumber="CBS-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+crypto.randomUUID().slice(0,6).toUpperCase();
 const {data:o,error:e}=await db.from("orders").insert({order_number:orderNumber,customer_name:customer.name,customer_phone:customer.phone,customer_contact:customer.contact,destination_address:customer.address,payment_currency:currency,carrier_code:carrier,status:"received"}).select("id").single();if(e)throw e;
 for(let i=0;i<items.length;i++){const p=items[i],img=imgs[i] as File,ext=img.type==="image/png"?"png":img.type==="image/webp"?"webp":"jpg",path=`${o.id}/${i+1}-${crypto.randomUUID()}.${ext}`;
  const {error:up}=await db.storage.from("product-evidence").upload(path,img,{contentType:img.type});if(up)throw up;
  const {error:ie}=await db.from("order_items").insert({order_id:o.id,origin_country:p.origin,category:p.category,product_url:p.url,product_name:p.name,customer_observed_price:Number(p.observedPrice),source_currency:p.currency,quantity:Number(p.quantity),color:p.color||null,size:p.size||null,volume:p.volume?Number(p.volume):null,volume_unit:p.unit||null,specification:p.spec||null,screenshot_path:path,verification_status:"pending"});if(ie)throw ie;
 }
 await db.from("order_status_history").insert({order_id:o.id,status:"received",note:"Customer submitted order"});
 return NextResponse.json({orderNumber},{status:201});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"ข้อมูลไม่ถูกต้อง"},{status:400})}}
