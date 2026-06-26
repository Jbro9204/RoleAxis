import brandLogo from "../../assets/brand/roleaxis-transparent.png";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "brandLogo brandLogoCompact" : "brandLogo"} aria-label="RoleAxis">
      <img src={brandLogo} alt="" aria-hidden="true" />
    </span>
  );
}
