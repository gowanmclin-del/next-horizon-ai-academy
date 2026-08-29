"use client";
import { useState } from "react";

const questions = [
  "Our organization has identified specific business problems AI could help address.",
  "Employees understand appropriate and inappropriate uses of generative AI.",
  "We have guidance for privacy, confidential data, verification, and human review.",
  "Leaders agree on the outcomes we expect from AI adoption.",
  "We can measure time saved, quality improved, risk reduced, or value created.",
  "Employees have opportunities to practice with approved AI tools.",
  "We have a process for evaluating tools before wider adoption.",
  "Training plans reflect the needs of different roles and skill levels.",
];

export default function ReadinessAssessment() {
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(0));
  const [show, setShow] = useState(false);
  const score = answers.reduce((a,b)=>a+b,0);
  const level = score >= 25 ? ["Scaling readiness", "Your organization has useful foundations. Focus on role-specific implementation, governance, and measurable outcomes."] : score >= 15 ? ["Building readiness", "Momentum exists, but shared practices, workflow priorities, or hands-on training need strengthening."] : ["Foundation stage", "Start with common AI fluency, responsible-use guidance, and a focused pilot tied to a real business need."];
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
    <p className="text-sm text-slate-500">Rate each statement: 1 = not yet, 2 = beginning, 3 = developing, 4 = established.</p>
    <div className="mt-7 space-y-7">{questions.map((q,i)=><fieldset key={q}><legend className="font-semibold text-horizon-navy">{i+1}. {q}</legend><div className="mt-3 flex flex-wrap gap-3">{[1,2,3,4].map(n=><label key={n} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-bold ${answers[i]===n ? "border-horizon-blue bg-horizon-blue text-white" : "border-slate-300 text-slate-600"}`}><input type="radio" className="sr-only" name={`q${i}`} checked={answers[i]===n} onChange={()=>{const next=[...answers];next[i]=n;setAnswers(next);setShow(false)}}/>{n}</label>)}</div></fieldset>)}</div>
    <button type="button" disabled={answers.some(a=>a===0)} onClick={()=>setShow(true)} className="mt-8 rounded-lg bg-horizon-blue px-6 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">View Readiness Result</button>
    {show && <div className="mt-7 rounded-xl bg-horizon-cloud p-6" role="status"><p className="text-sm font-bold uppercase tracking-[0.15em] text-horizon-blue">Score: {score} of 32</p><h3 className="mt-2 text-2xl font-bold text-horizon-navy">{level[0]}</h3><p className="mt-3 leading-7 text-slate-600">{level[1]}</p><p className="mt-3 text-sm text-slate-500">This educational snapshot is not an audit or certification.</p><a href="/corporate-partnerships/inquiry" className="mt-5 inline-block font-bold text-horizon-blue">Discuss your results →</a></div>}
  </div>;
}
