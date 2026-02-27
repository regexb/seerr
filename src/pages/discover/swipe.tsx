import PageTitle from '@app/components/Common/PageTitle';
import SwipeFeed from '@app/components/Discover/SwipeFeed';
import useRouteGuard from '@app/hooks/useRouteGuard';
import useSettings from '@app/hooks/useSettings';
import { Permission } from '@app/hooks/useUser';
import Error from '@app/pages/_error';
import type { NextPage } from 'next';

const DiscoverSwipePage: NextPage = () => {
  const settings = useSettings();

  useRouteGuard(Permission.VOTE);

  if (!settings.currentSettings.enableVoting) {
    return <Error statusCode={404} />;
  }

  return (
    <>
      <PageTitle title="Swipe" />
      <SwipeFeed />
    </>
  );
};

export default DiscoverSwipePage;
