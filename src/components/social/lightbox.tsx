import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function Lightbox({
  images,
  index,
  onClose,
}: {
  images: string[];
  index: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(index);
  const next = () => setI((v) => (v + 1) % images.length);
  const prev = () => setI((v) => (v - 1 + images.length) % images.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && images.length > 1) next();
      else if (e.key === "ArrowLeft" && images.length > 1) prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, onClose]);

  const navBtn =
    "grid h-11 w-11 place-items-center rounded-full bg-muted/60 text-foreground transition hover:bg-muted";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className={cnSafe(navBtn, "absolute right-4 top-4 z-10")}
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <>
          <button type="button" onClick={prev} aria-label="Previous image" className={cnSafe(navBtn, "absolute left-4 top-1/2 z-10 -translate-y-1/2")}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={next} aria-label="Next image" className={cnSafe(navBtn, "absolute right-4 top-1/2 z-10 -translate-y-1/2")}>
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <img
        src={images[i]}
        alt={`Image ${i + 1} of ${images.length}`}
        className="max-h-full max-w-full rounded-xl object-contain"
      />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-muted/70 px-3 py-1 text-xs font-medium">
        {i + 1} / {images.length}
      </div>
    </div>
  );
}

// tiny local class join to avoid importing cn for two strings
function cnSafe(...parts: string[]) {
  return parts.filter(Boolean).join(" ");
}
