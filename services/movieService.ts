
import { Movie, InteractionType, UserInteraction, UserProfile, DiscoveryFilters } from '../types';
import { supabase } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";
import Papa from 'papaparse';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = 'b43d3f66cace96b72ccc3da0a85c0cee'; 

export class MovieService {
  /**
   * Syncs Letterboxd history using the exported watched.csv file.
   */
  static async syncLetterboxdCSV(
    file: File, 
    userId: string, 
    onProgress?: (msg: string, percent: number) => void
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rows = results.data as any[];
            const total = rows.length;
            let successCount = 0;
            
            console.log(`Successfully parsed CSV with ${total} entries.`);
            
            // Letterboxd CSV headers: Date, Name, Year, Letterboxd URI, Rating
            for (let i = 0; i < total; i++) {
              const row = rows[i];
              const title = row.Name || row.Title;
              const year = row.Year;
              
              if (!title) continue;

              const percent = Math.round(((i + 1) / total) * 100);
              if (onProgress) onProgress(`Matching: ${title}`, percent);

              try {
                // Search TMDB for match
                const searchResults = await this.searchMovies(title, year ? parseInt(year) : undefined);
                if (searchResults && searchResults.length > 0) {
                  const match = searchResults[0];
                  
                  // Submit as WATCHED
                  await this.submitInteraction({
                    userId,
                    movieId: String(match.id),
                    title: match.title || title,
                    posterUrl: match.posterUrl || '',
                    type: InteractionType.WATCHED,
                    timestamp: Date.now(),
                    notes: 'Letterboxd CSV Import'
                  });
                  successCount++;
                }
              } catch (e) {
                console.error(`TMDB mapping failed for ${title}:`, e);
              }

              // Minor delay to respect TMDB rate limits (40 req/10s)
              if (i % 5 === 0) await new Promise(r => setTimeout(r, 100));
            }

            resolve(successCount);
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err)
      });
    });
  }

  // Keep remaining service methods...
  static async validateLetterboxdUser(username: string): Promise<boolean> {
     // Legacy RSS validation - No longer strictly needed for CSV flow but keeping signature
     return !!username;
  }

  private static async analyzeTaste(userId: string, filters?: DiscoveryFilters): Promise<any> {
    try {
      const interactions = await this.getInteractions(userId);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const likes = interactions.filter(i => i.type === InteractionType.YES).map(i => i.title);
      const highRated = interactions.filter(i => i.type === InteractionType.WATCHED && (i.personalRating || 0) >= 4)
        .map(i => `${i.title} (${i.personalRating} stars)`);

      const prompt = `Analyze taste DNA for user recommendations.
      Likes: ${likes.join(', ')}
      Highly Rated: ${highRated.join(' | ')}
      Mood: ${filters?.mood || 'Any'}
      Genre: ${filters?.genre || 'Any'}
      Wildcard: ${filters?.wildcard ? 'YES' : 'NO'}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggested_titles: { type: Type.ARRAY, items: { type: Type.STRING } },
              genre_ids: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              reasoning: { type: Type.STRING }
            },
            required: ["suggested_titles", "genre_ids"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (e) {
      return null;
    }
  }

  static async getDiscoverQueue(userId: string, page: number = 1, filters?: DiscoveryFilters): Promise<{ movies: Movie[], nextPage: number }> {
    try {
      const interactions = await this.getInteractions(userId);
      const swipedIds = new Set(interactions.map(i => String(i.movieId)));
      const taste = (page === 1) ? await this.analyzeTaste(userId, filters) : null;
      
      let candidateMovies: Movie[] = [];

      if (taste?.suggested_titles?.length > 0) {
        const aiMovies = await Promise.all(
          taste.suggested_titles.map(async (title: string) => {
            const results = await this.searchMovies(title);
            return results && results.length > 0 ? results[0] : null;
          })
        );
        const detailedAiMovies = await this.getMoviesByIds(aiMovies.filter(m => m && m.id).map(m => m!.id!));
        candidateMovies.push(...detailedAiMovies);
      }

      let discoverUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}&sort_by=popularity.desc&vote_count.gte=150&language=en-US`;
      if (taste?.genre_ids?.length > 0) discoverUrl += `&with_genres=${taste.genre_ids.join('|')}`;
      if (filters?.maxRuntime) discoverUrl += `&with_runtime.lte=${filters.maxRuntime}`;

      const res = await fetch(discoverUrl);
      const data = await res.json();
      const discovered = (data.results || []).map((m: any) => this.mapTMDBToMovie(m));
      candidateMovies.push(...discovered);

      const filtered = candidateMovies.filter((m, index, self) => 
        m && m.id && !swipedIds.has(m.id) && self.findIndex(t => t.id === m.id) === index
      );

      if (filtered.length < 10 && page < 30) {
        const nextBatch = await this.getDiscoverQueue(userId, page + 1, filters);
        return {
          movies: [...filtered, ...nextBatch.movies],
          nextPage: nextBatch.nextPage
        };
      }

      return { movies: filtered, nextPage: page + 1 };
    } catch (error) {
      return { movies: [], nextPage: page };
    }
  }

  static async getAllProfiles(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return (data || []).map(p => ({
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        letterboxd_username: p.letterboxd_username,
        isOnboarded: true
      }));
    } catch (e) {
      return [];
    }
  }

  static async saveProfile(profile: UserProfile): Promise<boolean> {
    try {
      const { error } = await supabase.from('profiles').upsert({
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          letterboxd_username: profile.letterboxd_username
        }, { onConflict: 'username' });
      return !error;
    } catch (e) {
      return false;
    }
  }

  static async deleteProfile(username: string): Promise<boolean> {
    try {
      await supabase.from('swipes').delete().eq('user_name', username);
      const { error } = await supabase.from('profiles').delete().eq('username', username);
      return !error;
    } catch (e) {
      return false;
    }
  }

  static async uploadAvatar(username: string, file: File): Promise<string | null> {
    try {
      const fileName = `${username}-${Date.now()}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      return publicUrl;
    } catch (e) {
      return null;
    }
  }

  private static mapFromDb(item: any): UserInteraction {
    return {
      userId: item.user_name,
      movieId: String(item.movie_id),
      title: item.movie_title || item.title,
      posterUrl: item.poster_url || item.poster_path,
      type: item.swipe_type as InteractionType || item.type as InteractionType,
      timestamp: item.timestamp,
      personalRating: item.personal_rating,
      notes: item.notes
    };
  }

  private static mapToDb(interaction: UserInteraction): any {
    const title = interaction.title || interaction.movie_title || '';
    const purl = interaction.posterUrl || interaction.poster_url || '';
    return {
      user_name: interaction.userId,
      movie_id: String(interaction.movieId),
      movie_title: title,
      title: title,
      swipe_type: interaction.type,
      type: interaction.type,
      poster_path: purl,
      poster_url: purl,
      timestamp: interaction.timestamp || Date.now(),
      personal_rating: interaction.personalRating ?? null,
      notes: interaction.notes ?? null
    };
  }

  static async getInteractions(userId: string): Promise<UserInteraction[]> {
    try {
      const { data, error } = await supabase.from('swipes').select('*').eq('user_name', userId);
      if (error) return [];
      return (data || []).map(item => this.mapFromDb(item));
    } catch (e) {
      return [];
    }
  }

  static async getSharedMatches(userId: string): Promise<Movie[]> {
    try {
      const { data: myLikes } = await supabase.from('swipes').select('movie_id').eq('user_name', userId).eq('swipe_type', InteractionType.YES);
      if (!myLikes || myLikes.length === 0) return [];
      const myLikeIds = (myLikes as any[]).map(l => String(l.movie_id));
      const { data: othersLikes } = await supabase.from('swipes').select('movie_id').in('movie_id', myLikeIds).eq('swipe_type', InteractionType.YES).neq('user_name', userId);
      if (!othersLikes || othersLikes.length === 0) return [];
      const sharedIds = Array.from(new Set((othersLikes as any[]).map(l => String(l.movie_id))));
      return await this.getMoviesByIds(sharedIds);
    } catch (e) {
      return [];
    }
  }

  static async submitInteraction(interaction: UserInteraction): Promise<boolean> {
    try {
      const { error } = await supabase.from('swipes').upsert([this.mapToDb(interaction)], { onConflict: 'user_name,movie_id' });
      return !error;
    } catch (e) {
      return false;
    }
  }

  static async updateInteraction(userId: string, movieId: string, updates: Partial<UserInteraction>): Promise<boolean> {
    try {
      const dbUpdates: any = {};
      if (updates.personalRating !== undefined) dbUpdates.personal_rating = updates.personalRating;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.type !== undefined) {
        dbUpdates.type = updates.type;
        dbUpdates.swipe_type = updates.type;
      }
      const { error } = await supabase.from('swipes').update(dbUpdates).match({ user_name: userId, movie_id: String(movieId) });
      return !error;
    } catch (e) {
      return false;
    }
  }

  static async checkForMatches(movieId: string, currentUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('swipes').select('user_name').eq('movie_id', String(movieId)).eq('swipe_type', InteractionType.YES).neq('user_name', currentUserId);
      return !!(data && data.length > 0);
    } catch (e) {
      return false;
    }
  }

  static async searchMovies(query: string, year?: number): Promise<Partial<Movie>[]> {
    if (!query || query.length < 2) return [];
    try {
      let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`;
      if (year) url += `&year=${year}`;
      const response = await fetch(url);
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
      genres: m.genres ? m.genres.map((g: any) => g.name) : [],
      ratings: {
        rottenTomatoesCritic: Math.round((m.vote_average || 0) * 10),
        rottenTomatoesAudience: Math.round((m.vote_average || 0) * 10 + 2),
        letterboxd: Number(((m.vote_average || 0) / 2).toFixed(1)),
        imdb: m.vote_average || 0
      }
    };
  }
}
