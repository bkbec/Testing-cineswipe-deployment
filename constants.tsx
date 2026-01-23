
import { Movie } from './types';

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
  },
  {
    id: '3',
    title: 'The Zone of Interest',
    description: 'A commandant of Auschwitz strives to build a dream life for his family next to the camp.',
    fullSynopsis: 'The commandant of Auschwitz, Rudolf Höss, and his wife Hedwig, strive to build a dream life for their family in a house and garden next to the camp.',
    director: 'Jonathan Glazer',
    cast: ['Christian Friedel', 'Sandra Hüller'],
    runtime: '1h 45m',
    posterUrl: 'https://picsum.photos/seed/zone/400/600',
    backdropUrl: 'https://picsum.photos/seed/zone-bg/1200/800',
    releaseYear: 2023,
    genres: ['War', 'Drama', 'History'],
    ratings: {
      rottenTomatoesCritic: 93,
      rottenTomatoesAudience: 78,
      letterboxd: 4.1,
      imdb: 7.5
    }
  },
  {
    id: '4',
    title: 'Spirited Away',
    description: 'A 10-year-old girl wanders into a world ruled by gods, witches, and spirits.',
    fullSynopsis: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits. After her parents are turned into pigs, she must work in a bathhouse to find a way to free them and return to the human world.',
    director: 'Hayao Miyazaki',
    cast: ['Rumi Hiiragi', 'Miyu Irino'],
    runtime: '2h 5m',
    posterUrl: 'https://picsum.photos/seed/spirited/400/600',
    backdropUrl: 'https://picsum.photos/seed/spirited-bg/1200/800',
    releaseYear: 2001,
    genres: ['Animation', 'Fantasy', 'Adventure'],
    ratings: {
      rottenTomatoesCritic: 96,
      rottenTomatoesAudience: 96,
      letterboxd: 4.5,
      imdb: 8.6
    }
  }
];

export const SEED_MOVIES: Partial<Movie>[] = [
  { id: 's1', title: 'Inception', posterUrl: 'https://picsum.photos/seed/inc/200/300' },
  { id: 's2', title: 'The Matrix', posterUrl: 'https://picsum.photos/seed/mat/200/300' },
  { id: 's3', title: 'Pulp Fiction', posterUrl: 'https://picsum.photos/seed/pulp/200/300' },
  { id: 's4', title: 'The Godfather', posterUrl: 'https://picsum.photos/seed/god/200/300' },
  { id: 's5', title: 'Interstellar', posterUrl: 'https://picsum.photos/seed/int/200/300' },
  { id: 's6', title: 'Parasite', posterUrl: 'https://picsum.photos/seed/par/200/300' },
  { id: 's7', title: 'The Dark Knight', posterUrl: 'https://picsum.photos/seed/tdk/200/300' },
  { id: 's8', title: 'Fight Club', posterUrl: 'https://picsum.photos/seed/fgt/200/300' },
  { id: 's9', title: 'La La Land', posterUrl: 'https://picsum.photos/seed/lll/200/300' },
  { id: 's10', title: 'Everything Everywhere', posterUrl: 'https://picsum.photos/seed/eeaao/200/300' },
  { id: 's11', title: 'The Shining', posterUrl: 'https://picsum.photos/seed/shi/200/300' },
  { id: 's12', title: 'Inside Out', posterUrl: 'https://picsum.photos/seed/io/200/300' },
];
