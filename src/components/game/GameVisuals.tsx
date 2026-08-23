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

type EggGlyphProps = {
  variant?: number;
};

function EggGlyph({ variant = 0 }: EggGlyphProps) {
  const variants = [
    {
      shell: "#fff2bf",
      shade: "#dfc77d",
      spotA: "#79b96b",
      spotB: "#9675c4",
    },
    {
      shell: "#dff3ff",
      shade: "#9dbfd1",
      spotA: "#5e91bb",
      spotB: "#75be93",
    },
    {
      shell: "#e4f7c9",
      shade: "#9fc27d",
      spotA: "#886fc0",
      spotB: "#dc9060",
    },
    {
      shell: "#eadcf7",
      shade: "#b397c8",
      spotA: "#6796ad",
      spotB: "#ca7281",
    },
    {
      shell: "#f8dfbd",
      shade: "#d0a16b",
      spotA: "#75a864",
      spotB: "#916bb3",
    },
  ];

  const current =
    variants[Math.abs(variant) % variants.length];

  return (
    <g className="egg-glyph">
      <ellipse
        className="egg-shadow"
        cx="38"
        cy="88"
        rx="18"
        ry="4.5"
        fill="rgba(0,0,0,.12)"
      />

      <path
        className="egg-shell"
        d="M38 6 C21 8 10 33 10 56 C10 78 21 88 38 88 C55 88 66 78 66 56 C66 33 55 8 38 6 Z"
        fill={current.shell}
        stroke="rgba(255,255,255,.78)"
        strokeWidth="2.1"
      />

      <path
        d="M50 16 C60 30 64 45 64 57 C64 75 55 84 43 87 C52 79 56 68 56 54 C56 37 52 24 50 16 Z"
        fill={current.shade}
        opacity=".22"
      />

      <ellipse
        className="egg-highlight"
        cx="27"
        cy="29"
        rx="7"
        ry="12"
        fill="rgba(255,255,255,.48)"
        transform="rotate(12 27 29)"
      />

      <g className="egg-pattern">
        <circle cx="49" cy="41" r="4.4" fill={current.spotA} opacity=".66" />
        <circle cx="28" cy="58" r="3.6" fill={current.spotB} opacity=".60" />
        <circle cx="47" cy="69" r="3" fill={current.spotB} opacity=".52" />
        <circle cx="34" cy="43" r="2.4" fill={current.spotA} opacity=".44" />
      </g>
    </g>
  );
}

export function EggSprite({
  className = "",
  variant = 0,
}: {
  className?: string;
  variant?: number;
}) {
  return (
    <svg
      className={`egg-sprite ${className}`}
      viewBox="0 0 76 96"
      aria-hidden="true"
      focusable="false"
    >
      <EggGlyph variant={variant} />
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
    safeFill >= 90 ? 8 :
    safeFill >= 60 ? 6 :
    safeFill >= 30 ? 4 :
    safeFill >= 10 ? 2 :
    safeFill > 0 ? 1 : 0;

  const stage =
    safeFill >= 90 ? "full" :
    safeFill >= 60 ? "high" :
    safeFill >= 30 ? "half" :
    safeFill >= 10 ? "low" :
    "empty";

  /*
    IMPORTANT:
    These are all drawn inside ONE parent SVG.
    We deliberately do not nest <svg> elements here.
    That avoids the desktop/mobile WebView scaling bug.
  */
  const eggPositions = [
    [80, 63, -2, 0, .34],
    [61, 65, -8, 1, .31],
    [100, 64, 9, 2, .31],
    [73, 52, 3, 3, .30],
    [92, 52, -5, 4, .30],
    [51, 57, 8, 2, .28],
    [111, 57, -7, 1, .28],
    [82, 44, 1, 0, .28],
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
        cy="103"
        rx="57"
        ry="9"
        fill="rgba(0,0,0,.16)"
      />

      <g className="nest-back-leaves">
        <path d="M24 70 C15 51 6 47 2 54 C13 57 18 65 22 76 Z" fill="#4d9c49" />
        <path d="M136 69 C145 51 154 50 159 58 C148 60 142 68 138 78 Z" fill="#438b43" />
        <path d="M49 51 C43 35 48 27 58 22 C56 34 61 42 68 49 Z" fill="#69b653" />
        <path d="M111 50 C118 33 127 28 136 31 C128 38 126 46 126 53 Z" fill="#59a94e" />
      </g>

      <g className="nest-bowl">
        <path
          d="M20 72 C30 48 52 38 80 38 C108 38 130 49 140 72 C132 95 111 104 80 104 C49 104 28 95 20 72 Z"
          fill="#684127"
        />

        <path
          d="M29 70 C42 55 59 50 80 50 C102 50 119 56 131 70 C120 84 103 91 80 91 C57 91 40 84 29 70 Z"
          fill="#b87840"
        />

        <ellipse
          cx="80"
          cy="68"
          rx="42"
          ry="20"
          fill="#d8a45b"
          opacity=".38"
        />

        <path d="M27 63 C48 73 79 77 134 62" stroke="#59351f" strokeWidth="5.2" fill="none" strokeLinecap="round" />
        <path d="M34 53 C58 65 91 67 126 53" stroke="#8a5732" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M31 81 C58 70 98 70 128 81" stroke="#55321e" strokeWidth="5.2" fill="none" strokeLinecap="round" />
        <path d="M23 69 L9 58" stroke="#634027" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M137 68 L152 57" stroke="#634027" strokeWidth="4.6" strokeLinecap="round" />
      </g>

      <g className="nest-eggs">
        {eggPositions
          .slice(0, eggCount)
          .map(([x, y, rotate, variant, scale], index) => (
            <g
              key={index}
              className={`nest-egg nest-egg-${index + 1}`}
              transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale}) translate(-38 -48)`}
            >
              <EggGlyph variant={variant} />
            </g>
          ))}
      </g>

      <g className="nest-front-rim">
        <path
          d="M24 72 C39 91 59 99 80 99 C103 99 123 89 137 70"
          fill="none"
          stroke="#764728"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M31 76 C48 89 63 94 80 94 C99 94 115 87 129 75"
          fill="none"
          stroke="#a96d3b"
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity=".8"
        />
      </g>

      <g className="nest-front-grass">
        <path d="M36 87 C31 77 31 69 34 61 C39 71 41 79 40 89" stroke="#58a54a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M45 92 C43 79 47 70 53 65 C51 77 52 85 52 93" stroke="#70b756" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M119 92 C117 79 121 70 128 64 C126 77 126 85 126 93" stroke="#65ae50" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>

      <g className="nest-sparkles">
        <circle cx="42" cy="57" r="1.4" fill="#fff3b0" />
        <circle cx="120" cy="56" r="1.2" fill="#edffb5" />
        <circle cx="110" cy="80" r="1.1" fill="#fff0a5" />
      </g>
    </svg>
  );
}


export function PrehistoricFarmScene({
  fill = 0,
  collecting = false,
}: {
  fill?: number;
  collecting?: boolean;
}) {
  const safeFill = Math.max(0, Math.min(100, fill));

  return (
    <div
      className={`prehistoric-scene premium-scene ${
        collecting ? "scene-collecting" : ""
      }`}
      aria-hidden="true"
    >
      <svg
        className="premium-scene-bg"
        viewBox="0 0 430 440"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="psSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67c8ef" />
            <stop offset="55%" stopColor="#a3e1df" />
            <stop offset="100%" stopColor="#d8edb0" />
          </linearGradient>

          <linearGradient id="psHillBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5aa75d" />
            <stop offset="100%" stopColor="#367943" />
          </linearGradient>

          <linearGradient id="psHillFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8dcc59" />
            <stop offset="100%" stopColor="#4a9142" />
          </linearGradient>

          <linearGradient id="psTreeTrunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6a3f27" />
            <stop offset="48%" stopColor="#a66d3e" />
            <stop offset="100%" stopColor="#5a3524" />
          </linearGradient>

          <linearGradient id="psRock" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9ca883" />
            <stop offset="100%" stopColor="#53664f" />
          </linearGradient>

          <radialGradient id="psSun">
            <stop offset="0%" stopColor="#fffbd0" stopOpacity=".92" />
            <stop offset="35%" stopColor="#ffe878" stopOpacity=".55" />
            <stop offset="100%" stopColor="#ffe878" stopOpacity="0" />
          </radialGradient>

          <filter id="psSoftShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="5"
              stdDeviation="4"
              floodColor="#1e4a2d"
              floodOpacity=".22"
            />
          </filter>
        </defs>

        {/* sky */}
        <rect width="430" height="440" fill="url(#psSky)" />
        <circle cx="365" cy="58" r="72" fill="url(#psSun)" />

        {/* soft cloud groups */}
        <g className="premium-cloud premium-cloud-a" fill="#fff" opacity=".76">
          <ellipse cx="72" cy="63" rx="37" ry="15" />
          <circle cx="54" cy="55" r="17" />
          <circle cx="80" cy="49" r="22" />
          <circle cx="101" cy="60" r="14" />
        </g>

        <g className="premium-cloud premium-cloud-b" fill="#fff" opacity=".58">
          <ellipse cx="316" cy="92" rx="31" ry="12" />
          <circle cx="301" cy="86" r="14" />
          <circle cx="323" cy="80" r="18" />
          <circle cx="338" cy="91" r="11" />
        </g>

        {/* distant mountain range */}
        <path
          d="M0 190 L57 124 L91 163 L139 105 L190 172 L232 118 L280 169 L329 100 L386 167 L430 132 L430 242 L0 242 Z"
          fill="#6ca18b"
          opacity=".43"
        />
        <path
          d="M84 155 L139 105 L168 144 L140 133 L121 147 Z"
          fill="#e9f3d3"
          opacity=".42"
        />
        <path
          d="M295 143 L329 100 L351 135 L330 126 L316 141 Z"
          fill="#e9f3d3"
          opacity=".38"
        />

        {/* volcano */}
        <g className="premium-volcano">
          <path
            d="M179 209 L224 113 L275 209 Z"
            fill="#62835e"
            opacity=".73"
          />
          <path
            d="M217 128 L224 113 L233 130 L228 128 L224 132 Z"
            fill="#d07149"
          />
          <g className="premium-smoke" fill="#eef4e8" opacity=".62">
            <circle cx="225" cy="101" r="10" />
            <circle cx="232" cy="88" r="13" />
            <circle cx="226" cy="73" r="9" />
          </g>
        </g>

        {/* rear forest/hills */}
        <path
          d="M0 199 C52 164 105 179 154 197 C204 166 253 174 302 198 C350 170 392 174 430 194 L430 298 L0 298 Z"
          fill="url(#psHillBack)"
        />
        <path
          d="M0 249 C58 211 114 221 168 245 C217 211 281 211 328 243 C368 218 401 220 430 239 L430 337 L0 337 Z"
          fill="url(#psHillFront)"
        />

        {/* path in the clearing */}
        <path
          d="M198 224 C223 237 231 255 218 275 C199 302 189 331 209 440 L303 440 C269 337 275 302 297 276 C319 249 294 229 260 218 Z"
          fill="#c7c77a"
          opacity=".32"
        />

        {/* left hero tree */}
        <g filter="url(#psSoftShadow)">
          <path
            d="M32 37 C29 101 27 170 31 253"
            stroke="url(#psTreeTrunk)"
            strokeWidth="25"
            strokeLinecap="round"
          />
          <path
            d="M41 99 C83 76 90 38 79 9"
            stroke="#79502f"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
          <g fill="#2f7c43">
            <circle cx="21" cy="24" r="50" />
            <circle cx="60" cy="25" r="43" />
            <circle cx="89" cy="45" r="35" />
            <circle cx="20" cy="72" r="40" />
          </g>
          <g fill="#4d9850" opacity=".75">
            <circle cx="41" cy="9" r="25" />
            <circle cx="73" cy="33" r="22" />
          </g>
        </g>

        {/* right hero tree */}
        <g filter="url(#psSoftShadow)">
          <path
            d="M399 65 C397 125 402 184 399 254"
            stroke="url(#psTreeTrunk)"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M389 115 C351 82 348 48 357 19"
            stroke="#79502f"
            strokeWidth="11"
            fill="none"
            strokeLinecap="round"
          />
          <g fill="#2d7840">
            <circle cx="411" cy="43" r="46" />
            <circle cx="376" cy="35" r="40" />
            <circle cx="346" cy="60" r="33" />
            <circle cx="408" cy="87" r="38" />
          </g>
          <g fill="#4d9850" opacity=".72">
            <circle cx="390" cy="25" r="23" />
            <circle cx="357" cy="55" r="19" />
          </g>
        </g>

        {/* mid trees */}
        <g opacity=".82">
          <path d="M120 151 L120 236" stroke="#7d5434" strokeWidth="11" />
          <circle cx="120" cy="142" r="34" fill="#377f43" />
          <circle cx="101" cy="149" r="23" fill="#49944c" />
          <circle cx="137" cy="149" r="25" fill="#3c8848" />

          <path d="M323 151 L323 232" stroke="#765033" strokeWidth="10" />
          <circle cx="323" cy="141" r="31" fill="#377f43" />
          <circle cx="306" cy="149" r="22" fill="#4a944d" />
          <circle cx="340" cy="149" r="23" fill="#3c8848" />
        </g>

        {/* bushes */}
        <g fill="#2b763c">
          <circle cx="53" cy="224" r="26" />
          <circle cx="77" cy="228" r="19" />
          <circle cx="352" cy="223" r="24" />
          <circle cx="378" cy="228" r="21" />
        </g>
        <g fill="#5ca54f">
          <circle cx="67" cy="218" r="12" />
          <circle cx="365" cy="217" r="11" />
        </g>

        {/* flowers */}
        <g fill="#fff7d7" opacity=".9">
          <circle cx="89" cy="248" r="3" />
          <circle cx="100" cy="236" r="2.5" />
          <circle cx="335" cy="245" r="3" />
          <circle cx="348" cy="255" r="2.5" />
          <circle cx="175" cy="263" r="2.5" />
        </g>
        <g fill="#e98b9a" opacity=".85">
          <circle cx="93" cy="247" r="2" />
          <circle cx="339" cy="244" r="2" />
        </g>

        {/* foreground rocks */}
        <g fill="url(#psRock)">
          <path d="M25 359 Q42 328 64 355 L70 375 L17 375 Z" />
          <path d="M356 359 Q377 327 401 354 L407 376 L348 376 Z" />
        </g>

        {/* decorative foreground leaves */}
        <g fill="#1f6d3b">
          <path d="M0 440 L0 362 C26 373 33 401 36 440 Z" />
          <path d="M9 440 C17 397 39 376 67 365 C54 393 49 416 48 440 Z" />
          <path d="M430 440 L430 359 C405 369 398 400 395 440 Z" />
          <path d="M422 440 C412 397 390 376 363 365 C376 393 381 417 381 440 Z" />
        </g>

        {/* pterodactyl silhouette */}
        <path
          className="premium-ptero"
          d="M269 57 C278 51 286 52 294 58 C303 51 311 51 319 56 C310 56 303 60 294 66 C287 61 278 58 269 57 Z"
          fill="#3d6e62"
          opacity=".5"
        />
      </svg>

      {/* Characters are existing visual sprites only; they do not exist in state */}
      <div className="premium-dino premium-dino-left">
        <DinoSprite level={2} />
      </div>

      <div className="premium-dino premium-dino-center">
        <DinoSprite level={5} />
      </div>

      <div className="premium-dino premium-dino-right">
        <DinoSprite level={4} />
      </div>

      <div className="premium-nest-stage">
        <div className="premium-nest-backlight" />
        <NestSprite fill={safeFill} />
      </div>

      <div className="premium-egg-drop">
        <EggSprite variant={2} />
      </div>

      <div className="premium-leaf leaf-one" />
      <div className="premium-leaf leaf-two" />
    </div>
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
