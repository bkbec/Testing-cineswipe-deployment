
import { Movie, InteractionType, UserInteraction } from '../types';
import { MOCK_MOVIES } from '../constants';

export class MovieService {
  /**
   * Mock implementation of movie fetching.
   * In a real app, this would call TMDB or a private API.
   */
  static async getDiscoverQueue(userId: string): Promise<Movie[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In TDD context, this starts as return [];
    return [...MOCK_MOVIES].sort(() => Math.random() - 0.5);
  }

  static async submitInteraction(interaction: UserInteraction): Promise<boolean> {
    console.log('Logging interaction:', interaction);
    return true;
  }
}
