export default function RequestCard({
  title = 'Caida de red',
  detail = 'Perdida total de conectividad en una oficina.',
  badge = 'Domicilio',
  meta = [],
  actions = [],
  children = null,
}) {
  return (
    <article className="surface-card surface-card-hover flex h-full min-h-[320px] flex-col rounded-[20px] border border-[#c3c5d9] p-5">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-[#ffdad6] p-3 text-[#93000a]">
          <span className="material-symbols-outlined text-[20px]">router</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[20px] font-semibold text-[#0b1c30]">{title}</h3>
              <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#003ec7]">{badge}</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#434656]">{detail}</p>
            {meta.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">
                {meta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-3">
          {actions.map((action) => (
            <button
              key={action.key || action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={action.variant === 'secondary'
                ? 'inline-flex items-center justify-center rounded-full border border-[#c3c5d9] px-5 py-2 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30] transition-colors hover:bg-[#eff4ff] disabled:cursor-not-allowed disabled:opacity-70'
                : 'inline-flex items-center justify-center rounded-full bg-[#003ec7] px-5 py-2 text-[14px] font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0052ff] disabled:cursor-not-allowed disabled:opacity-70'}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      {children ? <div className="mt-4 border-t border-[#d8dbeb] pt-4">{children}</div> : null}
    </article>
  );
}
