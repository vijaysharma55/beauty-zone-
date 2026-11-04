export interface RazorpayOrderForCheckout {
  keyId:string; orderId:string; amount:number; currency:string; description?:string;
}
export interface RazorpayCheckoutResult {
  razorpay_payment_id:string; razorpay_order_id:string; razorpay_signature:string;
}
type RazorpayCheckoutInstance = {
  open:()=>void;
  on:(event:string,callback:(response:any)=>void)=>void;
};
declare global {
  interface Window { Razorpay?: new(options:Record<string,unknown>)=>RazorpayCheckoutInstance; }
}
let scriptPromise:Promise<void>|null=null;
function loadRazorpayScript():Promise<void>{
  if(typeof window==='undefined')return Promise.reject(new Error('Online checkout is only available in a browser.'));
  if(window.Razorpay)return Promise.resolve();
  if(scriptPromise)return scriptPromise;
  scriptPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://checkout.razorpay.com/v1/checkout.js';
    script.async=true;
    script.onload=()=>window.Razorpay?resolve():reject(new Error('Razorpay checkout could not be initialized.'));
    script.onerror=()=>{scriptPromise=null;reject(new Error('Could not load Razorpay checkout. Check your internet connection.'));};
    document.head.appendChild(script);
  });
  return scriptPromise;
}
export async function openRazorpayCheckout(order:RazorpayOrderForCheckout,prefill:{name?:string;email?:string;contact?:string}={}):Promise<RazorpayCheckoutResult>{
  if(!order.keyId||!order.orderId||!Number.isFinite(order.amount)||order.amount<=0)throw new Error('Razorpay order details are incomplete.');
  await loadRazorpayScript();
  return new Promise((resolve,reject)=>{
    if(!window.Razorpay){reject(new Error('Razorpay checkout is unavailable.'));return;}
    let settled=false;
    const checkout=new window.Razorpay({
      key:order.keyId,amount:order.amount,currency:order.currency,order_id:order.orderId,
      name:'BeautyZone',description:order.description||'BeautyZone payment',
      prefill:{name:prefill.name||'',email:prefill.email||'',contact:prefill.contact||''},
      theme:{color:'#D09A40'},
      handler:(response:RazorpayCheckoutResult)=>{if(settled)return;settled=true;resolve(response);},
      modal:{ondismiss:()=>{if(!settled){settled=true;reject(new Error('Payment window closed before payment was completed.'));}}},
    });
    checkout.on('payment.failed',(response:any)=>{if(settled)return;settled=true;reject(new Error(response?.error?.description||'Payment failed. Please try again.'));});
    checkout.open();
  });
}