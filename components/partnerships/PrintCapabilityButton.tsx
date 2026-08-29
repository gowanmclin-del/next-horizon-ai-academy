"use client";
export default function PrintCapabilityButton(){return <button type="button" onClick={()=>window.print()} className="rounded-lg bg-horizon-navy px-5 py-2.5 font-bold text-white print:hidden">Print / Save PDF</button>}
