import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
};

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-4",
};

export default function LoadingSpinner({ size = "md", text, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-gray-300 border-t-blue-600",
          sizeMap[size]
        )}
      />
      {text && <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    </div>
  );
}
