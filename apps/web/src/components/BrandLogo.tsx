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
      ? "h-8 max-w-[7.5rem]"
      : size === "sm"
        ? "h-11 max-w-[12.5rem]"
        : size === "lg"
          ? "h-20 max-w-[22rem]"
          : "h-16 max-w-[18rem]";
  const alignment = align === "start" ? "mx-0" : "mx-auto";

  return (
    <span className={`inline-flex shrink-0 items-center rounded-md bg-white px-1.5 py-1 ${alignment} ${className}`.trim()}>
      <img
        src="/abg-logo.png"
        alt="ABG Sports City"
        className={`w-auto object-contain object-left ${box}`}
      />
    </span>
  );
}
