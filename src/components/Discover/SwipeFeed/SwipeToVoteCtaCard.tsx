import defineMessages from '@app/utils/defineMessages';
import { ArrowRightIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useIntl } from 'react-intl';

import SwipeToVoteAnimation from './SwipeToVoteAnimation';

const messages = defineMessages('components.Discover.SwipeToVoteCtaCard', {
  badge: 'New Feature',
  title: 'Discover and Vote',
  body: 'Try the new swipe mode to discover and vote on new media',
  action: 'Start Swiping',
});

const SwipeToVoteCtaCard = () => {
  const intl = useIntl();

  return (
    <Link
      href="/discover/swipe"
      className="group block w-72 sm:w-72 md:w-[22rem]"
      aria-label={intl.formatMessage(messages.title)}
    >
      <div
        className="relative overflow-hidden rounded-xl bg-gray-800 ring-1 ring-gray-700 transition duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:ring-gray-500"
        style={{ paddingBottom: '75%' }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/0 to-purple-600/0 opacity-0 transition duration-200 group-hover:from-indigo-600/30 group-hover:to-purple-600/30 group-hover:opacity-100" />
        <div className="absolute inset-0 z-10">
          <div className="absolute left-0 right-0 flex items-center justify-between p-2">
            <div className="inline-flex w-fit rounded-full border border-indigo-500 bg-indigo-600/80 shadow-md">
              <div className="flex h-4 items-center px-2 py-2 text-xs font-medium uppercase tracking-wider text-white sm:h-5">
                {intl.formatMessage(messages.badge)}
              </div>
            </div>
          </div>

          <h3 className="mt-8 whitespace-normal pl-2 pr-2 pt-4 text-[20px] font-bold leading-tight text-white sm:text-[22px]">
            {intl.formatMessage(messages.title)}
          </h3>

          <div className="mt-1 grid h-[calc(100%-3.2rem)] grid-cols-[minmax(0,1fr)_42%] pl-2 pt-4">
            <div className="flex min-w-0 flex-col pr-2">
              <p
                className="whitespace-normal text-sm leading-relaxed text-gray-200"
                style={{
                  display: '-webkit-box',
                  overflow: 'hidden',
                  WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word',
                }}
              >
                {intl.formatMessage(messages.body)}
              </p>

              <div className="mt-4 flex justify-start">
                <span className="inline-flex h-8 items-center justify-center rounded-md border border-indigo-500 bg-indigo-600/80 px-3 py-1.5 text-sm font-medium leading-5 text-white transition duration-150 ease-in-out group-hover:border-indigo-500 group-hover:bg-indigo-600">
                  <span>{intl.formatMessage(messages.action)}</span>
                  <ArrowRightIcon className="ml-1.5 h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="flex items-start justify-start">
              <SwipeToVoteAnimation className="h-[94%] w-full max-w-[9.75rem] drop-shadow-lg" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default SwipeToVoteCtaCard;
