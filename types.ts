
export interface Ratings {
  rottenTomatoesCritic: number | string;
  rottenTomatoesAudience: number | string;
  letterboxd: number;
  imdb: number | string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  fullSynopsis?: string;
  director?: string;
  cast?: string[];
  runtime?: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: number;
  genres: string[];
  ratings: Ratings;
  trailerUrl?: string;
  imdbId?: string;
}

export enum InteractionType {
  YES = 'YES',
  NO = 'NO',
  WATCHED = 'WATCHED'
}

export interface UserInteraction {
  userId: string;
  user_name?: string;
  movieId: string;
  movie_id?: string;
  title?: string;
  movie_title?: string;
  posterUrl?: string;
  poster_url?: string;
  poster_path?: string;
  type: InteractionType;
  swipe_type?: InteractionType;
  timestamp: number;
  personalRating?: number; 
  personal_rating?: number;
  notes?: string;
}

export type OnboardingStep = 'IDENTITY' | 'PHOTO' | 'GENRES' | 'ANCHORS' | 'FILTERS' | 'SYNC' | 'COMPLETE';

export interface OnboardingData {
  name: string;
  photoFile: File | null;
  photoPreview: string | null;
  genres: string[];
  masterpieces: string[];
  filters: string[];
  letterboxdUsername?: string;
  detectedWatchedMovies?: Partial<Movie>[];
}

export interface UserProfile {
  username: string;
  full_name: string;
  avatar_url: string;
  letterboxd_username?: string;
  isOnboarded?: boolean;
}

export interface DiscoveryFilters {
  genre?: string;
  mood?: string;
  maxRuntime?: number;
  wildcard?: boolean;
}
