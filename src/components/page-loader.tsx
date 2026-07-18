import { Loader2 } from "lucide-react";

/** Route-transition fallback shown by `loading.tsx` while a page loads. */
export function PageLoader({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full items-center justify-center gap-3"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
