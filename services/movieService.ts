
import { Movie, InteractionType, UserInteraction, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = 'b43d3f66cace96b72ccc3da0a85c0cee'; 

export class MovieService {
  /**
   * Gemini Vision for Screenshot Sync
   */
  static async syncWatchedListFromImage(base64Image: string): Promise<Partial<Movie>[]> {
    try {
      // Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
      
      // Remove data:image/jpeg;base64, prefix if exists
      const cleanBase64 = base64Image.split(',')[1] || base64Image;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
              {
                text: "Analyze this screenshot of movie posters or a Letterboxd list. Extract the titles of all movies you see. Return the titles as a JSON array of strings. Only return the JSON.",
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["titles"]
          }
        }
      });

      const jsonStr = response.text || '{"titles": []}';
      const { titles } = JSON.parse(jsonStr);
      
      if (!titles || titles.length === 0) return [];

      // Cross-reference with TMDB to get proper IDs and posters
      const movies = await Promise.all(
        titles.slice(0, 20).map(async (title: string) => {
          const results = await this.searchMovies(title);
          return results && results.length > 0 ? results[0] : null;
        })
      );

      return movies.filter((m): m is Partial<Movie> => m !== null && m.id !== undefined);
    } catch (e) {
      console.error("AI Sync failed:", e);
      return [];
    }
  }

  /**
   * Profiles Management
   */
  static async getAllProfiles(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return (data || []).map(p => ({
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        isOnboarded: true
      }));
    } catch (e) {
      console.error("Fetch profiles failed:", e);
      return [];
    }
  }

  static async saveProfile(profile: UserProfile): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url
        }, { onConflict: 'username' });
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("Save profile failed:", e);
      return false;
    }
  }

  static async uploadAvatar(username: string, file: File): Promise<string | null> {
    try {
      const fileName = `${username}-${Date.now()}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);
      
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (e) {
      console.error("Upload avatar failed:", e);
      return null;
    }
  }

  /**
   * Interations Management
   */
  private static mapFromDb(item: any): UserInteraction {
    return {
      userId: item.user_name,
      user_name: item.user_name,
      movieId: String(item.movie_id),
      movie_id: String(item.movie_id),
      title: item.title,
      movie_title: item.movie_title,
      posterUrl: item.poster_url,
      poster_url: item.poster_url,
      poster_path: item.poster_path,
      type: item.type as InteractionType,
      swipe_type: item.swipe_type as InteractionType,
      timestamp: item.timestamp,
      personalRating: item.personal_rating,
      personal_rating: item.personal_rating,
      notes: item.notes
    };
  }

  private static mapToDb(interaction: UserInteraction): any {
    const ts = interaction.timestamp || Date.now();
    const type = interaction.type;
    const mid = String(interaction.movieId);
    const title = interaction.title || interaction.movie_title || '';
    const purl = interaction.posterUrl || interaction.poster_url || '';

    return {
      user_name: interaction.userId,
      movie_id: mid,
      movie_title: title,
      title: title,
      swipe_type: type,
      type: type,
      poster_path: purl,
      poster_url: purl,
      timestamp: ts,
      personal_rating: interaction.personalRating ?? null,
      notes: interaction.notes ?? null
    };
  }

  static async getInteractions(userId: string): Promise<UserInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('swipes')
        .select('*')
        .eq('user_name', userId);
      
      if (error) return [];
      return (data || []).map(item => this.mapFromDb(item));
    } catch (e) {
      return [];
    }
  }

  static async submitInteraction(interaction: UserInteraction): Promise<boolean> {
    try {
      const payload = this.mapToDb(interaction);
      const { error } = await supabase
        .from('swipes')
        .upsert([payload], { onConflict: 'user_name,movie_id' });
      
      if (error) {
        console.error("Supabase interaction save error:", error);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  static async updateInteraction(userId: string, movieId: string, updates: Partial<UserInteraction>): Promise<boolean> {
    try {
      const dbUpdates: any = {};
      if (updates.personalRating !== undefined) {
        dbUpdates.personal_rating = updates.personalRating;
      }
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.type !== undefined) {
        dbUpdates.type = updates.type;
        dbUpdates.swipe_type = updates.type;
      }

      const { error } = await supabase
        .from('swipes')
        .update(dbUpdates)
        .match({ user_name: userId, movie_id: String(movieId) });
      
      if (error) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  static async checkForMatches(movieId: string, currentUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('swipes')
        .select('user_name')
        .eq('movie_id', String(movieId))
        .eq('type', InteractionType.YES)
        .neq('user_name', currentUserId);
      
      if (error) return false;
      return data && data.length > 0;
    } catch (e) {
      return false;
    }
  }

  static async getDiscoverQueue(userId: string, page: number = 1): Promise<{ movies: Movie[], nextPage: number }> {
    const interactions = await this.getInteractions(userId);
    const historyIds = interactions.map(i => String(i.movieId));
    
    let candidateMovies: Movie[] = [];
    
    try {
      let url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}&sort_by=popularity.desc&vote_count.gte=100`;
      const res = await fetch(url);
      const data = await res.json();
      candidateMovies = (data.results || []).map((m: any) => this.mapTMDBToMovie(m));

      const filtered = candidateMovies.filter((m, index, self) => 
        m && 
        m.id && 
        !historyIds.includes(String(m.id)) &&
        self.findIndex(t => t.id === m.id) === index
      );

      return { 
        movies: filtered.slice(0, 20), 
        nextPage: page + 1 
      };
    } catch (error) {
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
