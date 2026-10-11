export function BrandLogo({
  size = "md",
  align = "center",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  align?: "center" | "start";
  className?: string;
}) {
  const box =
    size === "xs"
      ? "h-8 max-h-8 max-w-[88px]"
      : size === "sm"
        ? "h-14 max-w-[148px]"
        : size === "lg"
          ? "h-24 max-w-[220px]"
          : "h-[72px] max-w-[180px]";
  const alignment = align === "start" ? "mx-0" : "mx-auto";

  return (
    <img
      src="/bsc-logo.png"
      alt="Bashundhara Sports City"
      className={`w-auto object-contain object-center ${box} ${alignment} ${className}`.trim()}
    />
  );
}
