import { cn } from "@/lib/utils";

interface TextOverlayProps {
  text: string;
  position: 'bottom' | 'top' | 'left' | 'right' | 'center';
  style: 'translucent' | 'ribbon' | 'minimal';
  className?: string;
}

const overlayStyles = {
  translucent: "bg-black/60 text-white backdrop-blur-sm",
  ribbon: "bg-gradient-to-r from-black/70 to-transparent text-white",
  minimal: "bg-black/40 text-white backdrop-blur-md"
};

const positionStyles = {
  bottom: "absolute bottom-0 left-0 right-0 p-4",
  top: "absolute top-0 left-0 right-0 p-4", 
  left: "absolute left-0 top-0 bottom-0 w-1/3 p-4 flex items-center",
  right: "absolute right-0 top-0 bottom-0 w-1/3 p-4 flex items-center",
  center: "absolute inset-0 flex items-center justify-center p-4"
};

export function TextOverlay({ text, position, style, className }: TextOverlayProps) {
  return (
    <div className={cn(
      positionStyles[position],
      overlayStyles[style],
      "text-sm font-medium leading-tight",
      className
    )}>
      <p className="max-w-full break-words">
        {text}
      </p>
    </div>
  );
}