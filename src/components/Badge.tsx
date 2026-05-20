type BadgeProps = {
  tone?: "info" | "warning" | "danger" | "success";
  children: React.ReactNode;
};

const tones = {
  info: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  danger: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
};

export default function Badge({ tone = "info", children }: BadgeProps) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}
