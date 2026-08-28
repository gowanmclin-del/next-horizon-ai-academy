export default function StatusMessage({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  const isError = tone === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm font-semibold ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {children}
    </p>
  );
}
