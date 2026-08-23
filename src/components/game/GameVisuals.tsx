"use client";

type DinoSpriteProps = {
  level: number;
  className?: string;
};

const DINO_PALETTES = [
  ["#79da6d", "#3f9c4b", "#dfffb4", "#285e36"],
  ["#62c8e8", "#2d87aa", "#d8f6ff", "#23566c"],
  ["#f1a358", "#c96b34", "#fff0c9", "#7a4327"],
  ["#c58cf0", "#8555b6", "#f0ddff", "#55356f"],
  ["#ef8197", "#b94d67", "#ffe2e8", "#753243"],
  ["#79d6ae", "#3c9c77", "#ddfff0", "#28644d"],
  ["#ead35a", "#ae962d", "#fff7bd", "#6b5c1f"],
  ["#78a9ef", "#496bb9", "#e1eaff", "#314777"],
];

function Eye() {
  return (
    <g className="dino-eye">
      <ellipse cx="0" cy="0" rx="7.2" ry="7.8" fill="#fff" />
      <circle cx="2" cy="1" r="3.35" fill="#17331f" />
      <circle cx="3" cy="-1" r="1.15" fill="#fff" />
      <path
        className="dino-eyelid"
        d="M-7.5 -1 C-2 -8 4 -8 7.5 -1 C3 -3 -3 -3 -7.5 -1 Z"
        fill="currentColor"
      />
    </g>
  );
}

export function DinoSprite({
  level,
  className = "",
}: DinoSpriteProps) {
  const safeLevel = Math.max(1, Math.min(16, level));
  const palette = DINO_PALETTES[(safeLevel - 1) % DINO_PALETTES.length];
  const [body, shade, belly, dark] = palette;

  // Visual archetype only. It does not create a new gameplay entity.
  const archetype = (safeLevel - 1) % 5;
  const phase = ((safeLevel - 1) % 7) + 1;

  return (
    <svg
      className={`dino-sprite dino-type-${archetype} dino-phase-${phase} ${className}`}
      viewBox="0 0 140 112"
      aria-hidden="true"
      focusable="false"
      style={{ color: body }}
    >
      <ellipse
        className="dino-ground-shadow"
        cx="70"
        cy="100"
        rx="38"
        ry="7"
        fill="rgba(0,0,0,.17)"
      />

      {/* Tail */}
      <g className="dino-tail">
        {archetype === 3 ? (
          <path
            d="M47 69 C31 68 17 61 13 51 C22 57 31 57 46 54 Z"
            fill={shade}
          />
        ) : (
          <path
            d="M49 72 C30 73 16 67 10 57 C21 62 33 60 49 53 Z"
            fill={shade}
          />
        )}
      </g>

      {/* Back decorations */}
      <g className="dino-back-details">
        {archetype === 2 ? (
          <>
            <path d="M47 44 L45 25 L58 41 Z" fill={shade} />
            <path d="M61 37 L64 17 L74 39 Z" fill={shade} />
            <path d="M77 38 L86 20 L89 44 Z" fill={shade} />
          </>
        ) : null}

        {archetype === 4 ? (
          <path
            d="M58 37 C60 23 74 13 90 18 C80 23 75 31 72 43 Z"
            fill={shade}
          />
        ) : null}
      </g>

      {/* Body */}
      <g className="dino-body">
        <path
          d="M42 56 C45 36 62 25 83 28 C103 31 113 47 108 68 C104 86 88 94 66 92 C48 91 35 80 36 66 C36 62 38 59 42 56 Z"
          fill={body}
        />
        <ellipse
          cx="72"
          cy="69"
          rx="25"
          ry="18"
          fill={belly}
          opacity=".78"
        />
        <circle cx="55" cy="55" r="2.8" fill={shade} opacity=".5" />
        <circle cx="67" cy="46" r="2.2" fill={shade} opacity=".42" />
        <circle cx="82" cy="54" r="2.5" fill={shade} opacity=".38" />
      </g>

      {/* Legs */}
      <g className="dino-legs">
        <path
          d="M49 82 C44 91 46 98 56 99 L62 85 Z"
          fill={shade}
        />
        <path
          d="M83 84 C79 93 82 99 93 99 L96 82 Z"
          fill={shade}
        />
        <path
          d="M49 98 C52 96 56 96 60 99"
          stroke={dark}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M84 98 C87 96 91 96 95 99"
          stroke={dark}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Head / neck differs by visual archetype */}
      <g className="dino-neck-head">
        {archetype === 3 ? (
          <>
            <path
              d="M88 50 C88 34 94 18 105 10 C112 5 119 7 123 13 C128 20 123 29 116 34 C110 39 108 50 108 61 Z"
              fill={body}
            />
            <g transform="translate(116 19)">
              <Eye />
            </g>
            <path
              d="M119 29 C116 32 111 33 108 31"
              fill="none"
              stroke={dark}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : archetype === 1 ? (
          <>
            <path
              d="M85 42 C93 22 113 18 126 29 C136 38 131 55 116 60 C105 63 96 58 90 52 Z"
              fill={body}
            />
            <path
              d="M91 34 C86 22 94 14 107 16 C100 21 98 27 98 35 Z"
              fill={shade}
            />
            <path d="M126 35 L138 29 L131 42" fill={belly} />
            <g transform="translate(116 36)">
              <Eye />
            </g>
            <path
              d="M126 48 C121 51 115 51 111 48"
              fill="none"
              stroke={dark}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M82 41 C88 22 109 17 123 28 C136 39 130 57 114 62 C103 66 93 61 87 53 Z"
              fill={body}
            />
            <g transform="translate(113 36)">
              <Eye />
            </g>
            <path
              d="M124 49 C119 52 113 52 109 49"
              fill="none"
              stroke={dark}
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {archetype === 0 ? (
              <>
                <path d="M88 29 L91 17 L98 29" fill={shade} />
                <path d="M101 24 L107 11 L112 27" fill={shade} />
              </>
            ) : null}

            {archetype === 4 ? (
              <path
                d="M91 28 C91 13 104 6 119 12 C110 16 105 22 103 31 Z"
                fill={shade}
              />
            ) : null}
          </>
        )}
      </g>

      {/* Arms */}
      <g className="dino-arms">
        {archetype === 0 ? (
          <>
            <path
              d="M91 61 C101 61 105 66 101 71"
              fill="none"
              stroke={shade}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M96 70 L102 73"
              stroke={dark}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : (
          <path
            d="M91 62 C99 64 102 69 99 74"
            fill="none"
            stroke={shade}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        )}
      </g>

      {/* Small highlight for polished 2D look */}
      <path
        d="M56 39 C67 31 79 31 88 34"
        fill="none"
        stroke="rgba(255,255,255,.24)"
        strokeWidth="3"
        strokeLinecap="round"
      />
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
      <path d="M0 84 C24 62 42 64 58 84 Z" fill="#1f6d3d" />
      <path d="M38 84 C54 39 82 35 94 84 Z" fill="#28794a" />
      <path d="M74 84 C98 53 122 50 137 84 Z" fill="#1e683c" />
      <path d="M122 84 C139 35 166 39 177 84 Z" fill="#2d814e" />
      <path d="M164 84 C188 50 215 52 228 84 Z" fill="#236e41" />
      <path d="M216 84 C236 38 267 43 281 84 Z" fill="#2e7e4c" />
      <path d="M258 84 C272 61 289 62 300 84 Z" fill="#1d6539" />
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
