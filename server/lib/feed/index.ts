import type { IFeedProvider } from '@server/lib/feed/providers/provider';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';

class FeedManager {
  private providers = new Map<string, IFeedProvider>();

  public registerProviders(providers: IFeedProvider[]): void {
    providers.forEach((provider) => {
      this.providers.set(provider.id, provider);
      logger.info(`Registered feed provider: ${provider.name}`, {
        label: 'Feed',
        providerId: provider.id,
      });
    });
  }

  public getProviders(): IFeedProvider[] {
    return Array.from(this.providers.values());
  }

  public getActiveProviders(): IFeedProvider[] {
    const providerSettings = getSettings().feed.providers;

    return this.getProviders().filter((provider) => {
      return providerSettings[provider.id]?.enabled !== false;
    });
  }

  public getProviderWeight(providerId: string): number {
    const rawWeight = getSettings().feed.providers[providerId]?.weight ?? 1;
    return Math.max(0, rawWeight);
  }

  public getProviderOptions(providerId: string): Record<string, unknown> {
    return getSettings().feed.providers[providerId]?.options ?? {};
  }
}

const feedManager = new FeedManager();

export default feedManager;
