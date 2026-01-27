import { Movie, InteractionType, UserInteraction } from '../types';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = 'b43d3f66cace96b72ccc3da0a85c0cee'; 

export class MovieService {
  private static STORAGE_KEY = 'cinematch_interactions';

  static getInteractions(): UserInteraction[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to parse interactions from local storage", e);
      return [];
    }
  }

  static async submitInteraction(interaction: UserInteraction): Promise<boolean> {
    try {
      const interactions = this.getInteractions();
      interactions.push(interaction);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(interactions));
      return true;
    } catch (e) {
      console.error("Failed to save interaction", e);
      return false;
    }
  }

  static async getDiscoverQueue(userId: string): Promise<Movie[]> {
    const history = this.getInteractions().map(i => i.movieId);
    
    try {
      const response = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
      if (!response.ok) {
        throw new Error(`TMDB API Error: ${response.statusText}`);
      }
      const data = await response.json();
      
      if (!data || !data.results) {
        console.error("TMDB returned no results for discovery queue", data);
        return [];
      }
      
      const results = data.results || [];
      
      const movies = results
        .filter((m: any) => m && m.id && !history.includes(m.id.toString()))
        .map((m: any) => this.mapTMDBToMovie(m));

      return movies;
    } catch (error) {
      console.error('Error fetching discovery queue:', error);
      return [];
    }
  }

  static async getTrendingForOnboarding(): Promise<Partial<Movie>[]> {
    try {
      const response = await fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`);
      if (!response.ok) {
        throw new Error(`TMDB API Error: ${response.statusText}`);
      }
      const data = await response.json();

      if (!data || !data.results) {
        console.error("TMDB returned no results for onboarding", data);
        return [];
      }

      const results = data.results || [];

      return results.slice(0, 12).map((m: any) => ({
        id: m?.id?.toString() || Math.random().toString(),
        title: m?.title || 'Unknown Title',
        posterUrl: m?.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster'
      }));
    } catch (error) {
      console.error('Error fetching onboarding movies:', error);
      return [];
    }
  }

  static async getTrailerKey(movieId: string): Promise<string | null> {
    if (!movieId) return null;
    try {
      const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data || !data.results) return null;
      
      const results = data.results || [];

      const trailer = results.find((v: any) => v && v.type === 'Trailer' && v.site === 'YouTube');
      return trailer ? trailer.key : (results[0]?.key || null);
    } catch (error) {
      return null;
    }
  }

  static async getMoviesByIds(ids: string[]): Promise<Movie[]> {
    if (!ids || ids.length === 0) return [];
    try {
      const movies = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`);
          if (!res.ok) return null;
          const data = await res.json();
          return this.mapTMDBToMovie(data);
        })
      );
      return movies.filter((m): m is Movie => m !== null);
    } catch (error) {
      console.error('Error fetching movies by IDs:', error);
      return [];
    }
  }

  private static mapTMDBToMovie(m: any): Movie {
    if (!m) {
      return {
        id: 'error', title: 'Error', description: '', posterUrl: '', backdropUrl: '', releaseYear: 0, genres: [], ratings: { rottenTomatoesCritic: 0, rottenTomatoesAudience: 0, letterboxd: 0, imdb: 0 }
      };
    }

    const releaseDate = m.release_date ? new Date(m.release_date) : null;
    const releaseYear = releaseDate && !isNaN(releaseDate.getTime()) ? releaseDate.getFullYear() : 0;

    return {
      id: m.id?.toString() || Math.random().toString(),
      title: m.title || 'Unknown Title',
      description: m.overview || 'No description available.',
      fullSynopsis: m.overview || 'No synopsis available.',
      releaseYear: releaseYear,
      posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
      backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : '',
      genres: m.genres ? m.genres.map((g: any) => g.name) : (m.genre_ids ? [] : []), 
      runtime: m.runtime ? `${m.runtime}m` : 'N/A',
      ratings: {
        rottenTomatoesCritic: Math.round((m.vote_average || 0) * 10),
        rottenTomatoesAudience: Math.round(((m.vote_average || 0) * 10) + (Math.random() * 10 - 5)),
        letterboxd: Number(((m.vote_average || 0) / 2).toFixed(1)),
        imdb: m.vote_average || 0
      }
    };
  }
}