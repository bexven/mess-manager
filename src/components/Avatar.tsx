import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
} as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  avatarDataUrl,
  size = "md",
  className,
}: {
  name: string;
  avatarDataUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  if (avatarDataUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- data: URIs aren't supported by next/image
    return (
      <img
        src={avatarDataUrl}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", SIZE_CLASSES[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
