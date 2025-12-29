import React from 'react';

export default function HollyShipLogo({
  width = 800,
  height = 450,
  bg = '#24343A',
  color = '#F1EFE8',
  showText = true,
  titleSize = 84,
  fontFamily = "Georgia, 'Times New Roman', serif",
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 800 450"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="title desc"
    >
      <title id="title">HollyShip Logo</title>
      <desc id="desc">A clean package box with wings and the text HollyShip.</desc>

      {bg ? <rect x="0" y="0" width="800" height="450" fill={bg} /> : null}

      <g transform="translate(400,175)">
        <path
          fill={color}
          d="M -210,-10 c -12,-28 10,-60 28,-75 c 15,-12 33,-20 45,-6 c 10,12 -5,28 -20,35
             c 16,-8 30,-6 34,6 c 6,16 -10,28 -26,30 c 18,-5 28,2 26,16 c -3,18 -24,28 -48,26
             c -16,-2 -30,-12 -39,-28 z"
        />
        <path
          fill={color}
          d="M 210,-10 c 12,-28 -10,-60 -28,-75 c -15,-12 -33,-20 -45,-6 c -10,12 5,28 20,35
             c -16,-8 -30,-6 -34,6 c -6,16 10,28 26,30 c -18,-5 -28,2 -26,16 c 3,18 24,28 48,26
             c 16,-2 30,-12 39,-28 z"
        />
        <polygon fill={color} points="-70,-70 0,-100 70,-70 0,-40" />
        <polygon fill={color} points="-70,-70 -70,20 0,50 0,-40" />
        <polygon fill={color} points="70,-70 70,20 0,50 0,-40" />
        <path d="M -15,-88 L -15,-48" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <path d="M 15,-88 L 15,-48" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <path d="M -70,-70 L 70,-70" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <path d="M 0,-40 L 0,50" stroke={color} strokeWidth="10" strokeLinecap="round" />
        <path d="M -70,20 L 0,50 L 70,20" stroke={color} strokeWidth="10" strokeLinecap="round" fill="none" />
      </g>

      {showText ? (
        <text
          x="400"
          y="360"
          textAnchor="middle"
          fontSize={titleSize}
          fontFamily={fontFamily}
          fill={color}
        >
          HollyShip
        </text>
      ) : null}
    </svg>
  );
}
