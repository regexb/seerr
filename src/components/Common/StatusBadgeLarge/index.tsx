import Spinner from '@app/assets/spinner.svg';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import {
  BellIcon,
  ClockIcon,
  EyeSlashIcon,
  MinusSmallIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import { MediaStatus } from '@server/constants/media';

interface StatusBadgeLargeProps {
  status: MediaStatus;
  inProgress?: boolean;
}

const StatusBadgeLarge = ({
  status,
  inProgress = false,
}: StatusBadgeLargeProps) => {
  const badgeStyle = [
    'flex h-[72px] w-[72px] items-center justify-center rounded-full border shadow-2xl backdrop-blur-xl',
  ];

  const iconStyle = 'h-10 w-10';

  let indicatorIcon: React.ReactNode;

  switch (status) {
    case MediaStatus.PROCESSING:
      badgeStyle.push('border-indigo-500/50 bg-indigo-500/20 text-indigo-400');
      indicatorIcon = <ClockIcon className={iconStyle} />;
      break;
    case MediaStatus.AVAILABLE:
      badgeStyle.push(
        'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
      );
      indicatorIcon = <CheckCircleIcon className={iconStyle} />;
      break;
    case MediaStatus.PENDING:
      badgeStyle.push('border-yellow-500/50 bg-yellow-500/20 text-yellow-400');
      indicatorIcon = <BellIcon className={iconStyle} />;
      break;
    case MediaStatus.BLOCKLISTED:
      badgeStyle.push('border-red-500/50 bg-red-500/20 text-red-500');
      indicatorIcon = <EyeSlashIcon className={iconStyle} />;
      break;
    case MediaStatus.PARTIALLY_AVAILABLE:
      badgeStyle.push(
        'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
      );
      indicatorIcon = <MinusSmallIcon className={iconStyle} />;
      break;
    case MediaStatus.DELETED:
      badgeStyle.push('border-red-500/50 bg-red-500/20 text-red-400');
      indicatorIcon = <TrashIcon className={iconStyle} />;
      break;
  }

  if (inProgress) {
    indicatorIcon = <Spinner className={iconStyle} />;
  }

  return (
    <div>
      <div className={badgeStyle.join(' ')}>{indicatorIcon}</div>
    </div>
  );
};

export default StatusBadgeLarge;
