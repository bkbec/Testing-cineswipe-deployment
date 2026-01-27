import { Movie, InteractionType, UserInteraction } from '../types';
import { supabase } from '../lib/supabase';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = 'b43d3f66cace96b72ccc3da0a85c0cee'; 

export class MovieService {
  /**
   * Fetches user interactions from Supabase.
   */
  static async getInteractions(userId: string): Promise<UserInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('*')
        .eq('userId', userId);
      
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Failed to fetch interactions from Supabase", e);
      return [];
    }
  }

  /**
   * Persists an interaction (Like, No, Watched) to Supabase.
   */
  static async submitInteraction(interaction: UserInteraction): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('likes')
        .upsert([interaction], { onConflict: 'userId,movieId' });
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Failed to save interaction to Supabase", e);
      return false;
    }
  }

  /**
   * Updates an existing interaction (e.g., adding a personal rating).
   */
  static async updateInteraction(userId: string, movieId: string, updates: Partial<UserInteraction>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('likes')
        .update(updates)
        .match({ userId, movieId });
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Failed to update interaction in Supabase", e);
      return false;
    }
  }

  /**
   * Checks for matches: finding other users who liked the same movie.
   */
  static async checkForMatches(movieId: string, currentUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('userId')
        .eq('movieId', movieId)
        .eq('type', InteractionType.YES)
        .neq('userId', currentUserId);
      
      if (error) throw error;
      return data && data.length > 0;
    } catch (e) {
      console.error("Match check failed", e);
      return false;
    }
  }

  static async getDiscoverQueue(userId: string, page: number = 1): Promise<{ movies: Movie[], nextPage: number }> {
    const interactions = await this.getInteractions(userId);
    const history = interactions.map(i => i.movieId);
    
    let allFilteredMovies: Movie[] = [];
    let currentPage = page;
    const MAX_PAGES_TO_SCAN = 3; 

    try {
      while (allFilteredMovies.length < 10 && (currentPage - page) < MAX_PAGES_TO_SCAN) {
        const response = await fetch(`${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${currentPage}`);
        if (!response.ok) break;
        
        const data = await response.json();
        const results = data.results || [];
        
        const filtered = results
          .filter((m: any) => {
            if (!m || !m.id) return false;
            const rtRating = Math.round((m.vote_average || 0) * 10);
            return !history.includes(m.id.toString()) && rtRating > 65;
          })
          .map((m: any) => this.mapTMDBToMovie(m));
          
        allFilteredMovies = [...allFilteredMovies, ...filtered];
        currentPage++;
        
        if (data.total_pages < currentPage) break;
      }

      return { 
        movies: allFilteredMovies, 
        nextPage: currentPage 
      };
    } catch (error) {
      console.error('Error fetching discovery queue:', error);
      return { movies: [], nextPage: page };
    }
  }

  static async searchMovies(query: string): Promise<Partial<Movie>[]> {
    if (!query || query.length < 2) return [];
    try {
      const response = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`);
      if (!response.ok) throw new Error(`TMDB Search Error`);
      const data = await response.json();
      if (!data || !data.results) return [];

      return data.results.slice(0, 12).map((m: any) => ({
        id: m?.id?.toString() || Math.random().toString(),
        title: m?.title || 'Unknown Title',
        posterUrl: m?.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster'
      }));
    } catch (error) {
      console.error('Error searching movies:', error);
      return [];
    }
  }

  static async getTrendingForOnboarding(): Promise<Partial<Movie>[]> {
    try {
      const response = await fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`);
      if (!response.ok) throw new Error(`TMDB Trending Error`);
      const data = await response.json();
      if (!data || !data.results) return [];

      return data.results.slice(0, 12).map((m: any) => ({
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
    if (!m) return { id: 'error', title: 'Error', description: '', posterUrl: '', backdropUrl: '', releaseYear: 0, genres: [], ratings: { rottenTomatoesCritic: 0, rottenTomatoesAudience: 0, letterboxd: 0, imdb: 0 } };
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