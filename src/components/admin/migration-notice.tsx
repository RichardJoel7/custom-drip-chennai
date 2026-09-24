export function MigrationNotice({ file = "0009_custom_studio.sql" }: { file?: string }) {
  return (
    <div className="max-w-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-semibold">One-time database setup needed</p>
      <p className="mt-1">
        Run <code className="font-mono">supabase/migrations/{file}</code> in the Supabase SQL Editor, then refresh
        this page.
      </p>
    </div>
  );
}
