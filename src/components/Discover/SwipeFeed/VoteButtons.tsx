import { HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/react/24/solid';

interface VoteButtonsProps {
  onPass: () => void;
  onInterested: () => void;
  disabled?: boolean;
  currentVote?: 'interested' | 'not_interested' | null;
}

const VoteButtons = ({
  onPass,
  onInterested,
  disabled,
  currentVote,
}: VoteButtonsProps) => {
  const isNotInterested = currentVote === 'not_interested';
  const isInterested = currentVote === 'interested';

  return (
    <div className="flex items-center justify-center space-x-8">
      <button
        onClick={onPass}
        disabled={disabled}
        aria-label="Pass"
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border shadow-2xl backdrop-blur-xl transition hover:bg-gray-800 active:scale-90 disabled:pointer-events-none disabled:opacity-50 ${
          isNotInterested
            ? 'border-rose-500/50 bg-rose-500/20'
            : 'border-white/10 bg-gray-900/90'
        }`}
      >
        <HandThumbDownIcon
          className={`h-10 w-10 transition ${
            isNotInterested ? 'text-rose-500' : 'text-gray-400'
          }`}
        />
      </button>

      <button
        onClick={onInterested}
        disabled={disabled}
        aria-label="Interested"
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border shadow-2xl backdrop-blur-xl transition hover:bg-gray-800 active:scale-90 disabled:pointer-events-none disabled:opacity-50 ${
          isInterested
            ? 'border-emerald-500/50 bg-emerald-500/20'
            : 'border-white/10 bg-gray-900/90'
        }`}
      >
        <HandThumbUpIcon
          className={`h-10 w-10 transition ${
            isInterested ? 'text-emerald-400' : 'text-gray-400'
          }`}
        />
      </button>
    </div>
  );
};

export default VoteButtons;
