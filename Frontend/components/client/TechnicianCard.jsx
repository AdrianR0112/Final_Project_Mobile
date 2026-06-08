export default function TechnicianCard({ name = 'David Morales', specialty = 'Hardware, placas y micro-soldadura', distance = '2.4 km', rating = '4.9' }) {
  return (
    <article className="surface-card surface-card-hover p-6">
      <div className="mb-4 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dce1ff] text-lg font-bold text-[#003ec7]">
          {name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)}
        </div>
        <div>
          <h3 className="text-[20px] font-semibold text-[#0b1c30]">{name}</h3>
          <p className="text-sm text-[#434656]">{specialty}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-[#434656]">
        <span>{distance}</span>
        <span className="font-semibold text-[#003ec7]">{rating} / 5</span>
      </div>
    </article>
  );
}
