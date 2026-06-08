export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none transition-colors placeholder:text-[#737688] focus:border-[#003ec7] ${className}`}
      {...props}
    />
  );
}
