const styles = {
  pending: 'bg-[#ffdad6] text-[#93000a]',
  assigned: 'bg-[#e5eeff] text-[#003ec7]',
  in_progress: 'bg-[#dce1ff] text-[#0038b6]',
  completed: 'bg-[#d8defe] text-[#141a32]',
  cancelled: 'bg-[#dfe2ea] text-[#43474d]',
};

export default function StatusBadge({ status = 'pending', children }) {
  const label = children || status.replaceAll('_', ' ');

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.05em] ${styles[status] || styles.pending}`}
    >
      {label}
    </span>
  );
}
