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
  variant = 0,
}: {
  className?: string;
  variant?: number;
}) {
  const variants = [
    {
      shellA: "#fff7d5",
      shellB: "#e5cf88",
      spotA: "#75b96b",
      spotB: "#9472c7",
    },
    {
      shellA: "#dff5ff",
      shellB: "#9fc7dc",
      spotA: "#5c8fbd",
      spotB: "#7cc99a",
    },
    {
      shellA: "#e6ffd6",
      shellB: "#a8ce89",
      spotA: "#8b70c7",
      spotB: "#e29663",
    },
    {
      shellA: "#f3e0ff",
      shellB: "#b996d0",
      spotA: "#6e9fb6",
      spotB: "#d47a86",
    },
    {
      shellA: "#ffe6c7",
      shellB: "#d7aa72",
      spotA: "#83af6c",
      spotB: "#9c72bd",
    },
  ];

  const current = variants[Math.abs(variant) % variants.length];
  const gradientId = `eggFill-${Math.abs(variant) % variants.length}`;

  return (
    <svg
      className={`egg-sprite egg-variant-${Math.abs(variant) % variants.length} ${className}`}
      viewBox="0 0 76 96"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={current.shellA} />
          <stop offset="68%" stopColor={current.shellA} />
          <stop offset="100%" stopColor={current.shellB} />
        </linearGradient>
      </defs>

      <ellipse
        className="egg-shadow"
        cx="38"
        cy="88"
        rx="20"
        ry="5"
        fill="rgba(0,0,0,.13)"
      />

      <path
        className="egg-shell"
        d="M38 5 C20 7 8 33 8 57 C8 80 20 90 38 90 C56 90 68 80 68 57 C68 33 56 7 38 5 Z"
        fill={`url(#${gradientId})`}
        stroke="rgba(255,255,255,.72)"
        strokeWidth="2.3"
      />

      <ellipse
        className="egg-highlight"
        cx="27"
        cy="29"
        rx="7.5"
        ry="13"
        fill="rgba(255,255,255,.48)"
        transform="rotate(12 27 29)"
      />

      <g className="egg-pattern">
        <circle cx="49" cy="41" r="4.6" fill={current.spotA} opacity=".68" />
        <circle cx="27" cy="59" r="3.8" fill={current.spotB} opacity=".60" />
        <circle cx="47" cy="69" r="3.1" fill={current.spotB} opacity=".52" />
        <circle cx="34" cy="43" r="2.5" fill={current.spotA} opacity=".46" />
        <circle cx="54" cy="58" r="2.2" fill={current.spotA} opacity=".42" />
      </g>

      <path
        d="M19 73 C29 83 48 85 58 73"
        fill="none"
        stroke="rgba(117,83,43,.14)"
        strokeWidth="2"
        strokeLinecap="round"
      />
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
  const safeFill = Math.max(0, Math.min(100, fill));

  const eggCount =
    safeFill >= 90 ? 9 :
    safeFill >= 60 ? 7 :
    safeFill >= 30 ? 5 :
    safeFill >= 10 ? 3 :
    safeFill > 0 ? 1 : 0;

  const stage =
    safeFill >= 90 ? "full" :
    safeFill >= 60 ? "high" :
    safeFill >= 30 ? "half" :
    safeFill >= 10 ? "low" :
    "empty";

  const eggPositions = [
    [68, 50, -10, 0],
    [91, 50, 9, 1],
    [80, 39, 2, 2],
    [52, 61, -7, 3],
    [105, 60, 10, 4],
    [69, 62, 5, 1],
    [89, 65, -8, 2],
    [58, 45, 8, 4],
    [101, 45, -4, 0],
  ] as const;

  return (
    <svg
      className={`nest-sprite nest-stage-${stage} ${className}`}
      viewBox="0 0 160 118"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        className="nest-ground-shadow"
        cx="80"
        cy="101"
        rx="62"
        ry="12"
        fill="rgba(0,0,0,.18)"
      />

      <g className="nest-back-leaves">
        <path
          d="M26 65 C17 48 6 44 1 51 C13 54 19 63 22 75 Z"
          fill="#4eaa4e"
        />
        <path
          d="M132 66 C143 47 154 47 159 56 C147 58 140 67 136 77 Z"
          fill="#438f45"
        />
        <path
          d="M49 48 C42 32 47 23 58 18 C55 31 60 39 68 46 Z"
          fill="#70c55c"
        />
        <path
          d="M111 47 C118 29 127 25 137 28 C128 35 126 43 126 51 Z"
          fill="#5bb552"
        />
      </g>

      <g className="nest-bowl">
        <path
          d="M19 70 C27 45 52 34 80 34 C109 34 133 47 141 71 C132 98 109 107 80 107 C50 107 28 98 19 70 Z"
          fill="#6a4329"
        />

        <path
          d="M28 69 C40 53 58 47 80 47 C103 47 120 54 132 70 C121 86 104 94 80 94 C56 94 39 86 28 69 Z"
          fill="#b97b42"
        />

        <ellipse
          cx="80"
          cy="67"
          rx="45"
          ry="23"
          fill="#d7a55b"
          opacity=".35"
        />

        <path
          d="M25 64 C48 75 80 78 136 62"
          stroke="#58351f"
          strokeWidth="5.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M31 51 C57 65 91 68 129 52"
          stroke="#8d5933"
          strokeWidth="4.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M31 82 C59 70 96 70 127 82"
          stroke="#56331f"
          strokeWidth="5.3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M22 69 L8 57"
          stroke="#654027"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M138 68 L153 56"
          stroke="#654027"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M39 44 L31 28"
          stroke="#67412a"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M120 45 L129 29"
          stroke="#67412a"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <path
          d="M31 74 C49 91 66 97 80 97 C100 97 118 88 134 72"
          fill="none"
          stroke="rgba(255,218,148,.24)"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </g>

      <g className="nest-eggs">
        {eggPositions.slice(0, eggCount).map(([x, y, rotate, variant], index) => (
          <g
            key={index}
            className={`nest-egg nest-egg-${index + 1}`}
            transform={`translate(${x} ${y}) rotate(${rotate}) scale(.36) translate(-38 -48)`}
          >
            <EggSprite variant={variant} />
          </g>
        ))}
      </g>

      <g className="nest-front-grass">
        <path
          d="M34 86 C29 76 28 68 31 60 C36 70 38 78 38 88"
          stroke="#5da94b"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M43 91 C41 78 45 69 52 63 C49 75 50 84 50 92"
          stroke="#73bd55"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M119 91 C117 78 121 68 128 62 C126 75 126 84 126 92"
          stroke="#69b551"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      <g className="nest-sparkles">
        <circle cx="41" cy="55" r="1.6" fill="#fff4b1" />
        <circle cx="122" cy="55" r="1.3" fill="#efffb7" />
        <circle cx="111" cy="79" r="1.2" fill="#fff2a9" />
      </g>
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
