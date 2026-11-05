import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/posts";

export function SocialAvatar({
  path,
  name,
  className = "h-10 w-10",
}: {
  path: string | null;
  name: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUrl(null);
    if (path) signedUrl("avatars", path).then((next) => active && setUrl(next));
    return () => {
      active = false;
    };
  }, [path]);

  if (url) return <img src={url} alt="" className={`${className} shrink-0 rounded-full object-cover`} />;
  return (
    <div className={`${className} grid shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary`} aria-hidden="true">
      {name.charAt(0).toUpperCase() || "T"}
    </div>
  );
}