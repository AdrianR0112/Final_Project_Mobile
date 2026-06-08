export default function Modal({ open = false, title = 'Ventana', onClose, children, widthClassName = 'max-w-3xl' }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b1c30]/55 px-4 py-6" onClick={onClose}>
      <div
        className={`relative max-h-[90vh] w-full overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(11,28,48,0.28)] ${widthClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#d8dbeb] px-6 py-4">
          <h2 className="text-[20px] font-semibold text-[#0b1c30]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#434656] transition-colors hover:bg-[#eff4ff] hover:text-[#003ec7]"
            aria-label="Cerrar modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="max-h-[calc(90vh-73px)] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
