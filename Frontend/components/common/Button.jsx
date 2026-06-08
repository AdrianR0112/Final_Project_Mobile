export default function Button({ children, type = 'button', className = '', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#003ec7] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#0052ff] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
