export default function AdminWorkspace({ active }: { active: string }) {
  return <main className="flex-1 overflow-auto p-4 md:p-7">
    <div className="mx-auto max-w-6xl">
      <p className="mb-1 text-sm text-[#9aa8b8]">Admin Studio / {active}</p>
      <h2 className="mb-5 text-xl font-semibold">{active}</h2>
      <section className="rounded-xl border border-[#303844] bg-[#191f28] p-5 md:p-7">
        <p className="text-sm text-[#b8c2cf]">
          Workspace ready for {active}.
        </p>
        <p className="mt-2 text-sm text-[#8998aa]">
          Editor tools will be added as separate modules.
        </p>
      </section>
    </div>
  </main>;
}
