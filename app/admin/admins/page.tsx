import { getAdmins } from "@/lib/data/admin";
import PromoteAdminForm from "@/components/admin/PromoteAdminForm";
import DemoteAdminButton from "@/components/admin/DemoteAdminButton";

export default async function AdminAdminsPage() {
  const admins = await getAdmins();
  const isLastAdmin = admins.length <= 1;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-horizon-navy sm:text-3xl">Administrators</h1>

      <div className="mt-6">
        <PromoteAdminForm />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-horizon-navy">Current Administrators</h2>
        <div className="mt-4 flex flex-col gap-3">
          {admins.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-horizon-navy">
                  {`${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || "—"}
                </p>
                <p className="text-sm text-slate-500">{a.email}</p>
              </div>
              <p className="mt-2 text-xs text-slate-400 sm:mt-0">
                Admin since {new Date(a.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-2 sm:mt-0">
                <DemoteAdminButton
                  adminId={a.id}
                  adminName={`${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email}
                  isLastAdmin={isLastAdmin}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
