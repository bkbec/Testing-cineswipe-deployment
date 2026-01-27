
export interface Ratings {
  rottenTomatoesCritic: number;
  rottenTomatoesAudience: number;
  letterboxd: number;
  imdb: number;
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
}

export enum InteractionType {
  YES = 'YES',
  NO = 'NO',
  WATCHED = 'WATCHED'
}

export interface UserInteraction {
  userId: string;
  user_name?: string;   // Added for DB constraint requirements
  movieId: string;
  title?: string;       
  posterUrl?: string;   
  type: InteractionType;
  timestamp: number;
  personalRating?: number; 
  notes?: string;
}

export type OnboardingStep = 'GENRES' | 'ANCHORS' | 'FILTERS' | 'LETTERBOXD' | 'COMPLETE';

export interface OnboardingData {
  genres: string[];
  masterpieces: string[];
  filters: string[];
}
