import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  username,
  avatarUrl,
  className,
}: {
  username: string;
  avatarUrl: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("rounded-sm", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="rounded-sm uppercase">
        {username.slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  );
}
