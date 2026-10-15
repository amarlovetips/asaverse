"use client";
type Props = { name: string; onCancel: () => void; onConfirm: () => void };
export default function DeleteConfirm({ name, onCancel, onConfirm }: Props) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
    <section className="w-full max-w-sm space-y-4 rounded-xl border border-red-900 bg-slate-900 p-5">
      <h3 className="font-semibold">Delete design?</h3>
      <p className="break-words text-sm text-slate-300">&quot;{name}&quot; will be permanently deleted.</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded bg-slate-700 px-3 py-2 text-xs">Cancel</button>
        <button onClick={onConfirm} className="rounded bg-red-700 px-3 py-2 text-xs">Delete</button>
      </div>
    </section>
  </div>;
}
