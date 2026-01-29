
import { Movie } from './types';

export const APP_VERSION = '1.1.0';

export const MOCK_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'Dune: Part Two',
    description: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge.',
    fullSynopsis: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.',
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    runtime: '2h 46m',
    posterUrl: 'https://picsum.photos/seed/dune/400/600',
    backdropUrl: 'https://picsum.photos/seed/dune-bg/1200/800',
    releaseYear: 2024,
    genres: ['Sci-Fi', 'Adventure', 'Epic'],
    ratings: {
      rottenTomatoesCritic: 93,
      rottenTomatoesAudience: 95,
      letterboxd: 4.5,
      imdb: 8.7
    }
  },
  {
    id: '2',
    title: 'Poor Things',
    description: 'The incredible tale about the fantastical evolution of Bella Baxter.',
    fullSynopsis: 'Brought back to life by an unorthodox scientist, a young woman runs off with a lawyer on a whirlwind adventure across the continents. Free from the prejudices of her times, she grows steadfast in her purpose to stand for equality and liberation.',
    director: 'Yorgos Lanthimos',
    cast: ['Emma Stone', 'Mark Ruffalo', 'Willem Dafoe'],
    runtime: '2h 21m',
    posterUrl: 'https://picsum.photos/seed/poor/400/600',
    backdropUrl: 'https://picsum.photos/seed/poor-bg/1200/800',
    releaseYear: 2023,
    genres: ['Comedy', 'Drama', 'Romance'],
    ratings: {
      rottenTomatoesCritic: 92,
      rottenTomatoesAudience: 79,
      letterboxd: 4.2,
      imdb: 8.0
    }
  }
];

export const SEED_MOVIES: Partial<Movie>[] = [
  { id: 's1', title: 'Inception', posterUrl: 'https://picsum.photos/seed/inc/200/300' },
  { id: 's2', title: 'The Matrix', posterUrl: 'https://picsum.photos/seed/mat/200/300' },
  { id: 's3', title: 'Pulp Fiction', posterUrl: 'https://picsum.photos/seed/pulp/200/300' },
  { id: 's4', title: 'The Godfather', posterUrl: 'https://picsum.photos/seed/god/200/300' },
];
