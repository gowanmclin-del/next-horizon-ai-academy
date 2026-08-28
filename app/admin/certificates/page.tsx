import { getAdminCertificates } from "@/lib/data/admin";

export default async function AdminCertificatesPage() {
  const certificates = await getAdminCertificates();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Certificates</h1>
      <p className="mt-2 text-sm text-slate-600">
        Every certificate here was issued through the secure server-side eligibility check in{" "}
        <code className="rounded bg-white px-1.5 py-0.5 text-xs">issue_certificate_if_eligible()</code> — there is
        no administrative override that bypasses course completion in this phase.
      </p>

      {certificates.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No certificates issued yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Certificate Number</th>
                <th className="px-4 py-3">Issued</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{c.studentName}</p>
                    <p className="text-xs text-slate-500">{c.studentEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.courseTitle}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.certificateNumber}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(c.issuedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
