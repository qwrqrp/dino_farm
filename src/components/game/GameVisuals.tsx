"use client";

type DinoSpriteProps = {
  level: number;
  className?: string;
};

const DINO_PALETTES = [
  ["#78d66c", "#4aa453", "#eaffb8"],
  ["#68c7e8", "#3489ad", "#d9f6ff"],
  ["#f5a65b", "#cf6f36", "#fff0c9"],
  ["#c98af4", "#8e58c2", "#f0ddff"],
  ["#f07c91", "#bd4b67", "#ffe0e8"],
  ["#84d7b0", "#439f79", "#ddfff0"],
  ["#f0d75f", "#b79d2f", "#fff7bf"],
  ["#76a8f4", "#4969bf", "#e1eaff"],
];

export function DinoSprite({
  level,
  className = "",
}: DinoSpriteProps) {
  const palette = DINO_PALETTES[(Math.max(1, level) - 1) % DINO_PALETTES.length];
  const [body, shade, belly] = palette;
  const variant = (Math.max(1, level) - 1) % 4;

  return (
    <svg
      className={`dino-sprite dino-variant-${variant} ${className}`}
      viewBox="0 0 120 100"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="60" cy="88" rx="34" ry="7" fill="rgba(0,0,0,.16)" />

      <path
        d="M34 65 C21 61 15 53 18 45 C22 50 30 52 39 51 Z"
        fill={shade}
      />

      <path
        d="M38 47 C42 31 55 23 72 25 C91 27 101 42 97 59 C94 73 82 82 64 82 C47 82 34 72 34 58 Z"
        fill={body}
      />

      <ellipse cx="68" cy="62" rx="22" ry="17" fill={belly} opacity=".8" />

      <path
        d="M72 29 C77 16 88 11 99 16 C111 22 112 38 104 47 C99 52 92 55 84 54 Z"
        fill={body}
      />

      <circle cx="94" cy="28" r="7.4" fill="#fff" />
      <circle cx="96" cy="29" r="3.4" fill="#17331f" />
      <circle cx="97" cy="27.5" r="1.1" fill="#fff" />

      <path
        d="M100 39 C96 42 91 42 87 39"
        fill="none"
        stroke="#24432c"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      <path
        d="M48 77 C44 87 47 91 55 91 L59 79"
        fill={shade}
      />
      <path
        d="M76 77 C73 87 77 91 85 91 L87 76"
        fill={shade}
      />

      {variant === 0 ? (
        <>
          <path d="M49 29 L54 17 L61 28" fill={shade} />
          <path d="M63 25 L70 12 L75 28" fill={shade} />
          <path d="M79 27 L87 16 L90 33" fill={shade} />
        </>
      ) : null}

      {variant === 1 ? (
        <>
          <path
            d="M80 19 C77 7 91 6 103 14 C95 14 88 18 84 25 Z"
            fill={shade}
          />
          <path d="M104 22 L116 17 L108 29" fill={belly} />
        </>
      ) : null}

      {variant === 2 ? (
        <>
          <path d="M45 31 L38 17 L53 25" fill={shade} />
          <path d="M58 25 L55 10 L67 23" fill={shade} />
          <path d="M74 24 L75 10 L83 27" fill={shade} />
        </>
      ) : null}

      {variant === 3 ? (
        <>
          <path
            d="M28 58 C19 50 19 37 27 32 C27 40 34 46 41 49 Z"
            fill={shade}
          />
          <circle cx="31" cy="37" r="4" fill={belly} opacity=".8" />
        </>
      ) : null}

      <circle cx="54" cy="47" r="2.5" fill={shade} opacity=".55" />
      <circle cx="63" cy="40" r="2" fill={shade} opacity=".45" />
      <circle cx="74" cy="49" r="2.2" fill={shade} opacity=".42" />
    </svg>
  );
}

export function EggSprite({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={`egg-sprite ${className}`}
      viewBox="0 0 70 90"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="eggFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff7d1" />
          <stop offset="65%" stopColor="#f0e0a2" />
          <stop offset="100%" stopColor="#d7c27b" />
        </linearGradient>
      </defs>
      <path
        d="M35 5 C19 7 8 31 8 52 C8 73 19 85 35 85 C51 85 62 73 62 52 C62 31 51 7 35 5 Z"
        fill="url(#eggFill)"
        stroke="#fff8d9"
        strokeWidth="2"
      />
      <ellipse cx="25" cy="27" rx="7" ry="11" fill="rgba(255,255,255,.5)" />
      <circle cx="43" cy="42" r="4" fill="#7fb86a" opacity=".65" />
      <circle cx="26" cy="56" r="3" fill="#8d6cc7" opacity=".55" />
      <circle cx="43" cy="65" r="2.6" fill="#d8875a" opacity=".6" />
    </svg>
  );
}

export function NestSprite({
  fill = 0,
  className = "",
}: {
  fill?: number;
  className?: string;
}) {
  const eggCount =
    fill >= 90 ? 7 :
    fill >= 60 ? 5 :
    fill >= 30 ? 3 :
    fill >= 10 ? 2 :
    fill > 0 ? 1 : 0;

  const eggPositions = [
    [58, 48, -10],
    [86, 50, 8],
    [72, 39, 2],
    [48, 58, -5],
    [96, 59, 10],
    [64, 59, 4],
    [82, 62, -7],
  ] as const;

  return (
    <svg
      className={`nest-sprite ${className}`}
      viewBox="0 0 150 110"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="75" cy="91" rx="57" ry="13" fill="rgba(0,0,0,.18)" />

      <path
        d="M21 64 C30 43 52 33 75 33 C100 33 122 44 130 65 C121 89 104 98 75 99 C47 98 29 88 21 64 Z"
        fill="#70482c"
      />
      <path
        d="M29 65 C42 52 57 48 75 48 C94 48 109 53 121 66 C110 80 95 87 75 87 C55 87 40 80 29 65 Z"
        fill="#b77a43"
      />

      <path d="M27 62 C45 71 62 75 124 61" stroke="#5a351f" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M34 51 C58 63 87 66 118 52" stroke="#8d5a35" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M36 78 C60 67 93 67 115 79" stroke="#5c3822" strokeWidth="5" fill="none" strokeLinecap="round" />

      <path d="M26 58 L13 48" stroke="#6b4227" strokeWidth="5" strokeLinecap="round" />
      <path d="M126 59 L139 48" stroke="#6b4227" strokeWidth="5" strokeLinecap="round" />
      <path d="M38 42 L31 28" stroke="#6b4227" strokeWidth="4" strokeLinecap="round" />
      <path d="M112 43 L120 29" stroke="#6b4227" strokeWidth="4" strokeLinecap="round" />

      <path d="M28 55 C20 43 12 41 5 47 C15 49 19 57 21 66" fill="#5fb95a" />
      <path d="M121 55 C132 42 141 42 147 50 C136 51 131 59 128 68" fill="#4fa74d" />
      <path d="M47 42 C42 30 45 24 54 20 C52 30 56 36 62 42" fill="#75c85e" />

      {eggPositions.slice(0, eggCount).map(([x, y, rotate], index) => (
        <g
          key={index}
          transform={`translate(${x} ${y}) rotate(${rotate}) scale(.38) translate(-35 -45)`}
        >
          <EggSprite />
        </g>
      ))}

      <path
        d="M26 70 C44 84 60 90 75 90 C94 90 111 82 126 68"
        fill="none"
        stroke="rgba(255,207,129,.22)"
        strokeWidth="2"
      />
    </svg>
  );
}

export function SunSprite() {
  return (
    <svg className="sun-sprite" viewBox="0 0 90 90" aria-hidden="true">
      <g transform="translate(45 45)">
        {Array.from({ length: 10 }).map((_, i) => (
          <rect
            key={i}
            x="-3"
            y="-42"
            width="6"
            height="15"
            rx="3"
            fill="#ffd96b"
            transform={`rotate(${i * 36})`}
            opacity=".88"
          />
        ))}
        <circle r="26" fill="#ffe784" />
        <circle cx="-8" cy="-8" r="9" fill="#fff3b0" opacity=".75" />
      </g>
    </svg>
  );
}

export function JungleSilhouette() {
  return (
    <svg
      className="jungle-sprite"
      viewBox="0 0 300 85"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 84 C24 62 42 64 58 84 Z"
        fill="#1f6d3d"
      />
      <path
        d="M38 84 C54 39 82 35 94 84 Z"
        fill="#28794a"
      />
      <path
        d="M74 84 C98 53 122 50 137 84 Z"
        fill="#1e683c"
      />
      <path
        d="M122 84 C139 35 166 39 177 84 Z"
        fill="#2d814e"
      />
      <path
        d="M164 84 C188 50 215 52 228 84 Z"
        fill="#236e41"
      />
      <path
        d="M216 84 C236 38 267 43 281 84 Z"
        fill="#2e7e4c"
      />
      <path
        d="M258 84 C272 61 289 62 300 84 Z"
        fill="#1d6539"
      />
      <path
        d="M53 67 C46 44 54 23 64 10 C64 35 72 49 81 64"
        fill="none"
        stroke="#285e36"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M197 70 C194 42 206 21 218 9 C215 36 222 54 232 66"
        fill="none"
        stroke="#285e36"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
