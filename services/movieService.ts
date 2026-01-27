
import { Movie, InteractionType, UserInteraction } from '../types';
import { supabase } from '../lib/supabase';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = 'b43d3f66cace96b72ccc3da0a85c0cee'; 

export class MovieService {
  /**
   * Internal helper to map DB snake_case to TS camelCase
   * Note: We map the 'user_name' column from the DB to 'userId' in our app logic.
   */
  private static mapFromDb(item: any): UserInteraction {
    return {
      userId: item.user_name, // Mapping user_name column to userId property
      user_name: item.user_name,
      movieId: String(item.movie_id),
      title: item.title,
      posterUrl: item.poster_url,
      type: item.type as InteractionType,
      timestamp: item.timestamp,
      personalRating: item.personal_rating,
      notes: item.notes
    };
  }

  /**
   * Internal helper to map TS camelCase to DB snake_case
   * Note: We map 'userId' from our app to the 'user_name' column in the DB.
   */
  private static mapToDb(interaction: UserInteraction): any {
    return {
      user_name: interaction.userId, // Primary identifier column in SQL is user_name
      movie_id: String(interaction.movieId),
      title: interaction.title,
      poster_url: interaction.posterUrl,
      type: interaction.type,
      timestamp: interaction.timestamp || Date.now(),
      personal_rating: interaction.personalRating,
      notes: interaction.notes
    };
  }

  static async getInteractions(userId: string): Promise<UserInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('swipes')
        .select('*')
        .eq('user_name', userId); // Querying by user_name column
      
      if (error) {
        console.error("Fetch interactions failed:", error.message);
        return [];
      }
      return (data || []).map(item => this.mapFromDb(item));
    } catch (e) {
      console.error("Supabase fetch error:", e);
      return [];
    }
  }

  static async submitInteraction(interaction: UserInteraction): Promise<boolean> {
    try {
      const payload = this.mapToDb(interaction);

      const { error } = await supabase
        .from('swipes')
        .upsert([payload], { onConflict: 'user_name,movie_id' }); // Conflict constraint on user_name and movie_id
      
      if (error) {
        alert("Save failed: " + error.message);
        console.error("Supabase error detail:", error);
        return false;
      }
      return true;
    } catch (e: any) {
      alert("Unexpected save error: " + e.message);
      return false;
    }
  }

  static async updateInteraction(userId: string, movieId: string, updates: Partial<UserInteraction>): Promise<boolean> {
    try {
      // Map update fields to snake_case
      const dbUpdates: any = {};
      if (updates.personalRating !== undefined) dbUpdates.personal_rating = updates.personalRating;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.type !== undefined) dbUpdates.type = updates.type;

      const { error } = await supabase
        .from('swipes')
        .update(dbUpdates)
        .match({ user_name: userId, movie_id: String(movieId) }); // Matching by user_name column
      
      if (error) {
        alert("Update failed: " + error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  static async checkForMatches(movieId: string, currentUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('swipes')
        .select('user_name') // Selecting user_name column
        .eq('movie_id', String(movieId))
        .eq('type', InteractionType.YES)
        .neq('user_name', currentUserId); // Checking for other users via user_name
      
      if (error) return false;
      return data && data.length > 0;
    } catch (e) {
      return false;
    }
  }

  static async getDiscoverQueue(userId: string, page: number = 1): Promise<{ movies: Movie[], nextPage: number }> {
    const interactions = await this.getInteractions(userId);
    const historyIds = interactions.map(i => String(i.movieId));
    
    const seeds = interactions
      .filter(i => i.type === InteractionType.YES || (i.type === InteractionType.WATCHED && (i.personalRating || 0) >= 4))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(i => i.movieId);

    let candidateMovies: Movie[] = [];
    
    try {
      if (seeds.length > 0) {
        const seedPromises = seeds.map(id => 
          fetch(`${TMDB_BASE_URL}/movie/${id}/recommendations?api_key=${TMDB_API_KEY}&page=${page}`)
            .then(res => res.json())
            .then(data => data.results || [])
            .catch(() => [])
        );
        const resultsArray = await Promise.all(seedPromises);
        candidateMovies = resultsArray.flat().map((m: any) => this.mapTMDBToMovie(m));
      }

      if (candidateMovies.length < 15) {
        let url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}&sort_by=popularity.desc&vote_count.gte=100`;
        const res = await fetch(url);
        const data = await res.json();
        const supplemental = (data.results || []).map((m: any) => this.mapTMDBToMovie(m));
        candidateMovies = [...candidateMovies, ...supplemental];
      }

      const filtered = candidateMovies.filter((m, index, self) => 
        m && 
        m.id && 
        !historyIds.includes(String(m.id)) &&
        self.findIndex(t => t.id === m.id) === index &&
        m.ratings.rottenTomatoesCritic > 60
      );

      return { 
        movies: filtered.slice(0, 20), 
        nextPage: page + 1 
      };
    } catch (error) {
      console.error('Error in smart discovery:', error);
      return { movies: [], nextPage: page };
    }
  }

  static async searchMovies(query: string): Promise<Partial<Movie>[]> {
    if (!query || query.length < 2) return [];
    try {
      const response = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`);
      const data = await response.json();
      return (data.results || []).slice(0, 15).map((m: any) => ({
        id: String(m.id),
        title: m.title,
        posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster'
      }));
    } catch (e) { return []; }
  }

  static async getTrendingForOnboarding(): Promise<Partial<Movie>[]> {
    try {
      const response = await fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`);
      const data = await response.json();
      return (data.results || []).slice(0, 18).map((m: any) => ({
        id: String(m.id),
        title: m.title,
        posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster'
      }));
    } catch (e) { return []; }
  }

  static async getTrailerKey(movieId: string): Promise<string | null> {
    try {
      const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`);
      const data = await response.json();
      const trailer = (data.results || []).find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      return trailer ? trailer.key : (data.results?.[0]?.key || null);
    } catch (e) { return null; }
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
    } catch (e) { return []; }
  }

  private static mapTMDBToMovie(m: any): Movie {
    if (!m) return { id: '0', title: 'Unknown', description: '', posterUrl: '', backdropUrl: '', releaseYear: 0, genres: [], ratings: { rottenTomatoesCritic: 0, rottenTomatoesAudience: 0, letterboxd: 0, imdb: 0 } };
    return {
      id: String(m.id),
      title: m.title || m.name || 'Untitled',
      description: m.overview || 'No description.',
      fullSynopsis: m.overview,
      releaseYear: m.release_date ? new Date(m.release_date).getFullYear() : 0,
      posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
      backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : '',
      genres: m.genre_ids ? [] : (m.genres ? m.genres.map((g: any) => g.name) : []),
      ratings: {
        rottenTomatoesCritic: Math.round((m.vote_average || 0) * 10),
        rottenTomatoesAudience: Math.round((m.vote_average || 0) * 10 + 2),
        letterboxd: Number(((m.vote_average || 0) / 2).toFixed(1)),
        imdb: m.vote_average || 0
      }
    };
  }
}
