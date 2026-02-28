interface SwipeToVoteAnimationProps {
  className?: string;
}

const SwipeToVoteAnimation = ({ className }: SwipeToVoteAnimationProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 380"
      className={className}
      aria-hidden="true"
    >
      <style>
        {`
          .swipe-card {
            transform-origin: center bottom;
            animation: swipeAnimation 8s infinite ease-in-out;
          }

          .dislike-overlay {
            animation: showDislike 8s infinite ease-in-out;
          }

          .like-overlay {
            animation: showLike 8s infinite ease-in-out;
          }

          .bg-card-1 {
            animation: pulseBg1 8s infinite ease-in-out;
            transform-origin: center;
          }

          .bg-card-2 {
            animation: pulseBg2 8s infinite ease-in-out;
            transform-origin: center;
          }

          @keyframes swipeAnimation {
            0%,
            15% {
              transform: translate(0, 0) rotate(0deg);
              opacity: 1;
            }

            22% {
              opacity: 0.8;
            }

            25% {
              transform: translate(-250px, 60px) rotate(-20deg);
              opacity: 0;
            }

            25.01%,
            65% {
              transform: translate(0, 0) scale(1) rotate(0deg);
              opacity: 1;
            }

            72% {
              opacity: 0.8;
            }

            75% {
              transform: translate(250px, 60px) rotate(20deg);
              opacity: 0;
            }

            75.01%,
            100% {
              transform: translate(0, 0) scale(1) rotate(0deg);
              opacity: 1;
            }
          }

          @keyframes showDislike {
            0%,
            15% {
              opacity: 0;
            }

            20% {
              opacity: 1;
            }

            25%,
            100% {
              opacity: 0;
            }
          }

          @keyframes showLike {
            0%,
            65% {
              opacity: 0;
            }

            70% {
              opacity: 1;
            }

            75%,
            100% {
              opacity: 0;
            }
          }

          @keyframes pulseBg1 {
            0%,
            15% {
              transform: scale(0.9) translateY(-15px);
              opacity: 0.7;
            }

            25% {
              transform: scale(1) translateY(0);
              opacity: 1;
            }

            25.01%,
            65% {
              transform: scale(0.9) translateY(-15px);
              opacity: 0.7;
            }

            75% {
              transform: scale(1) translateY(0);
              opacity: 1;
            }

            75.01%,
            100% {
              transform: scale(0.9) translateY(-15px);
              opacity: 0.7;
            }
          }

          @keyframes pulseBg2 {
            0%,
            15% {
              transform: scale(0.8) translateY(-30px);
              opacity: 0.3;
            }

            25% {
              transform: scale(0.9) translateY(-15px);
              opacity: 0.7;
            }

            25.01%,
            65% {
              transform: scale(0.8) translateY(-30px);
              opacity: 0.3;
            }

            75% {
              transform: scale(0.9) translateY(-15px);
              opacity: 0.7;
            }

            75.01%,
            100% {
              transform: scale(0.8) translateY(-30px);
              opacity: 0.3;
            }
          }
        `}
      </style>

      <defs>
        <linearGradient
          id="swipeCardGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        <linearGradient
          id="swipeLikeGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="rgba(16, 185, 129, 0.35)" />
          <stop offset="100%" stopColor="rgba(16, 185, 129, 0.85)" />
        </linearGradient>

        <linearGradient
          id="swipeDislikeGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="rgba(244, 63, 94, 0.35)" />
          <stop offset="100%" stopColor="rgba(244, 63, 94, 0.8)" />
        </linearGradient>

        <filter
          id="swipeCardShadow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="4"
            floodColor="#000"
            floodOpacity="0.25"
          />
        </filter>

        <g id="swipe-card-content">
          <rect
            x="0"
            y="0"
            width="150"
            height="260"
            rx="16"
            fill="url(#swipeCardGradient)"
            stroke="#64748B"
            strokeWidth="1"
          />
          <rect
            x="100"
            y="12"
            width="38"
            height="16"
            rx="8"
            fill="#475569"
            opacity="0.6"
          />
          <rect
            x="15"
            y="215"
            width="90"
            height="10"
            rx="5"
            fill="#475569"
            opacity="0.6"
          />
          <rect
            x="15"
            y="233"
            width="60"
            height="8"
            rx="4"
            fill="#475569"
            opacity="0.6"
          />
        </g>
      </defs>

      <g transform="translate(150, 308)">
        <circle
          cx="-32"
          cy="0"
          r="12"
          fill="#1E293B"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <circle
          cx="0"
          cy="0"
          r="9"
          fill="#1E293B"
          stroke="#334155"
          strokeWidth="1.5"
        />
        <circle
          cx="32"
          cy="0"
          r="12"
          fill="#1E293B"
          stroke="#334155"
          strokeWidth="1.5"
        />
      </g>

      <g transform="translate(75, 20)">
        <g className="bg-card-2">
          <use href="#swipe-card-content" />
        </g>

        <g className="bg-card-1">
          <use href="#swipe-card-content" />
        </g>

        <g className="swipe-card" filter="url(#swipeCardShadow)">
          <use href="#swipe-card-content" />

          <g className="dislike-overlay">
            <rect
              x="0"
              y="0"
              width="150"
              height="260"
              rx="16"
              fill="url(#swipeDislikeGradient)"
            />
            <circle cx="75" cy="130" r="32" fill="rgba(0,0,0,0.15)" />
            <path
              d="M93 118v-12M85 122.12l-1-4.12h-5.83a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 80.5 106H94a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11l-3.45 3.89h0a3.13 3.13 0 0 1-3-3.88Z"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(-10, 15)"
            />
          </g>

          <g className="like-overlay">
            <rect
              x="0"
              y="0"
              width="150"
              height="260"
              rx="16"
              fill="url(#swipeLikeGradient)"
            />
            <circle cx="75" cy="130" r="32" fill="rgba(0,0,0,0.15)" />
            <path
              d="M57 114v12M65 109.88l1 4.12h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 69.5 126H56a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11l3.45-3.89h0a3.13 3.13 0 0 1 3 3.88Z"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(10, 15)"
            />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default SwipeToVoteAnimation;
