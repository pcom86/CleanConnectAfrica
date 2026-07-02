"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  dark?: boolean;
  variant?: "icon" | "full";
}

export default function Logo({ size = "md", showText = true, dark = false, variant = "icon" }: LogoProps) {
  const sizes = {
    sm: { icon: 28, text: "text-base", full: 100 },
    md: { icon: 36, text: "text-xl", full: 140 },
    lg: { icon: 48, text: "text-2xl", full: 180 },
    xl: { icon: 64, text: "text-3xl", full: 240 },
  };
  const s = sizes[size];

  if (variant === "full") {
    return (
      <img
        src="/logo-full.png"
        alt="CleanConnect Africa"
        width={s.full}
        className="select-none"
      />
    );
  }

  return (
    <div className="flex items-center gap-2 select-none">
      {/* SVG Logo Icon */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Outer circle - navy */}
        <circle cx="50" cy="50" r="46" stroke="#0B2E5B" strokeWidth="6" fill="none" />
        {/* Inner swoosh - green */}
        <path
          d="M10 68 Q30 85 50 85 Q75 85 90 62 Q75 72 50 72 Q30 72 10 68Z"
          fill="#4CAF50"
        />
        {/* House/building silhouette - navy */}
        <path
          d="M32 68 L32 40 L50 24 L68 40 L68 68 L58 68 L58 52 L42 52 L42 68 Z"
          fill="#0B2E5B"
        />
        {/* Window - green */}
        <rect x="46" y="56" width="8" height="8" rx="1" fill="#4CAF50" />
        {/* Leaf accent */}
        <path
          d="M52 22 Q62 14 68 20 Q62 26 52 22Z"
          fill="#4CAF50"
        />
      </svg>

      {showText && (
        <span className={`font-bold ${s.text} ${dark ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
          CleanConnect <span className="text-brand-green">Africa</span>
        </span>
      )}
    </div>
  );
}
