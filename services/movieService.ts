
import { Movie, InteractionType, UserInteraction, UserProfile, DiscoveryFilters, Ratings, CurationMethod } from '../types';
import { supabase } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";
import Papa from 'papaparse';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = 'b43d3f66cace96b72ccc3da0a85c0cee'; 
const OMDB_API_KEY = '7c30e383'; 

const TMDB_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

const GENRE_NAME_TO_ID: Record<string, number> = Object.entries(TMDB_GENRES).reduce((acc, [id, name]) => {
  acc[name.toLowerCase()] = parseInt(id);
  return acc;
}, {} as Record<string, number>);

export class MovieService {
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
            
            for (let i = 0; i < total; i++) {
              const row = rows[i];
              const title = row.Name || row.Title;
              const year = row.Year;
              
              if (!title) continue;

              const percent = Math.round(((i + 1) / total) * 100);
              if (onProgress) onProgress(`Matching: ${title}`, percent);

              try {
                const searchResults = await this.searchMovies(title, year ? parseInt(year) : undefined);
                if (searchResults && searchResults.length > 0) {
                  const match = searchResults[0];
                  
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

  private static async getProfile(userId: string): Promise<any> {
    const { data } = await supabase.from('profiles').select('*').eq('username', userId).single();
    return data;
  }

  private static async analyzeTaste(userId: string, filters?: DiscoveryFilters): Promise<any> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Fetch everything from Supabase Cloud to feed the AI
      const profile = await this.getProfile(userId);
      const interactions = await this.getInteractions(userId);
      
      const likes = interactions.filter(i => i.type === InteractionType.YES).map(i => i.title);
      const masterpieces = interactions
        .filter(i => i.type === InteractionType.WATCHED && (i.personalRating || 0) >= 4)
        .map(i => i.title);
      
      const onboardingGenres = profile?.onboarding_genres || []; 

      const systemInstruction = `You are the Cinema Muse. Your knowledge base is the user's SUPABASE CLOUD DATA.
      USER CLOUD PROFILE (Source of Truth):
      - Interests (Genres): ${onboardingGenres.join(', ')}
      - Likes: ${likes.slice(-10).join(', ')}
      - 5-Star Anchors: ${masterpieces.slice(-5).join(', ')}
      
      CURATION RULES:
      1. Prioritize recommendations based on the USER CLOUD PROFILE.
      2. If DIRECTION is provided, blend it with the cloud history.
      3. Suggest niche, artistic, or high-quality films.
      4. EXCLUDE: ${likes.concat(masterpieces).join(', ')}.`;

      const prompt = `DIRECTION: "${filters?.naturalLanguagePrompt || 'Curate based on my Supabase profile'}"
      
      Suggest 15 films. For each film, provide a "logic" field linking it to their cloud profile.
      Return JSON: { "suggested": [{ "title": "Film Name", "logic": "Linked via interest in [Genre/Movie]" }], "genre_ids": [] }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggested: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: {
                    title: { type: Type.STRING },
                    logic: { type: Type.STRING }
                  }
                } 
              },
              genre_ids: { type: Type.ARRAY, items: { type: Type.INTEGER } }
            },
            required: ["suggested", "genre_ids"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Gemini Failure:", e);
      return null;
    }
  }

  static async getDiscoverQueue(userId: string, page: number = 1, filters?: DiscoveryFilters): Promise<{ movies: Movie[], nextPage: number, method: CurationMethod, note?: string }> {
    try {
      const interactions = await this.getInteractions(userId);
      const swipedIds = new Set(interactions.map(i => String(i.movieId)));
      const swipedTitles = new Set(interactions.map(i => (i.title || '').toLowerCase()));
      
      let movies: Movie[] = [];
      let method = CurationMethod.AI_TAILORED;
      let note = "Cinema Muse (Gemini 3) is curating your feed using Supabase Cloud DNA.";

      // 1. Attempt AI Tailoring (Gemini)
      const aiResult = await this.analyzeTaste(userId, filters);
      
      if (aiResult?.suggested?.length > 0) {
        const results = await Promise.all(
          aiResult.suggested.map(async (item: {title: string, logic: string}) => {
            const search = await this.searchMovies(item.title);
            if (search?.[0]?.id) {
               return { id: search[0].id, logic: item.logic };
            }
            return null;
          })
        );
        const validItems = results.filter((item): item is {id: string, logic: string} => !!item);
        const enriched = await this.getMoviesByIds(validItems.map(v => v.id));
        
        movies = enriched.map(m => {
          const matchingItem = validItems.find(vi => vi.id === m.id);
          return matchingItem ? { ...m, curationLogic: matchingItem.logic } : m;
        });
      }

      // 2. Smart Fallback: Use profile data from Supabase directly if AI is down
      if (movies.length < 5) {
        method = CurationMethod.SMART_FALLBACK;
        const profile = await this.getProfile(userId);
        const topGenreNames = profile?.onboarding_genres || ['Drama', 'Sci-Fi'];
        const genreIds = topGenreNames.map((n: string) => GENRE_NAME_TO_ID[n.toLowerCase()]).filter(Boolean);
        
        note = `Gemini connection failed. Using Supabase Fallback: Curating via your cloud-synced ${topGenreNames.join('/')} profile.`;
        
        let discoverUrl = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}&sort_by=popularity.desc&vote_count.gte=100&with_genres=${genreIds.join('|')}`;
        const res = await fetch(discoverUrl);
        const data = await res.json();
        const enriched = await this.enrichMovies(data.results || []);
        movies.push(...enriched);
      }

      // 3. Post-Process Filtering
      const filtered = movies.filter((m, idx, self) => {
        if (!m || !m.id) return false;
        if (swipedIds.has(m.id)) return false;
        if (swipedTitles.has(m.title.toLowerCase())) return false;
        if (self.findIndex(t => t.id === m.id) !== idx) return false;
        
        const lb = m.ratings.letterboxd;
        const rt = m.ratings.rottenTomatoesCritic;
        return (lb >= 3.0 || (rt !== 'N/A' && Number(rt) >= 60));
      });

      if (filtered.length === 0 && page < 3) {
        return this.getDiscoverQueue(userId, page + 1, filters);
      }

      return { 
        movies: filtered, 
        nextPage: page + 1, 
        method, 
        note: filters?.naturalLanguagePrompt ? `Gemini 3 Curating: "${filters.naturalLanguagePrompt}"` : note 
      };
    } catch (e) {
      console.error("Discovery Engine Error:", e);
      return { movies: [], nextPage: page, method: CurationMethod.TRENDING, note: "AI & Cloud sync failed. Falling back to Trending." };
    }
  }

  private static async enrichMovies(tmdbMovies: any[]): Promise<Movie[]> {
    return Promise.all(
      tmdbMovies.map(async (m) => {
        try {
          const detailRes = await fetch(`${TMDB_BASE_URL}/movie/${m.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
          if (!detailRes.ok) return this.mapTMDBToMovie(m);
          const detailData = await detailRes.json();
          const omdbRatings = detailData.imdb_id ? await this.fetchOMDbRatingsById(detailData.imdb_id) : null;
          return this.mapTMDBToMovie(detailData, omdbRatings);
        } catch (e) {
          return this.mapTMDBToMovie(m);
        }
      })
    );
  }

  private static async fetchOMDbRatingsById(imdbId: string): Promise<any> {
    try {
      const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
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

  static async saveProfile(profile: UserProfile, onboardingData?: any): Promise<boolean> {
    try {
      const dbData: any = {
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        letterboxd_username: profile.letterboxd_username
      };

      if (onboardingData?.genres) {
        dbData.onboarding_genres = onboardingData.genres;
      }

      const { error } = await supabase.from('profiles').upsert(dbData, { onConflict: 'username' });
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
      personal_rating: interaction.personal_rating ?? null,
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
      if (updates.personal_rating !== undefined) dbUpdates.personal_rating = updates.personal_rating;
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

  static async deleteInteraction(userId: string, movieId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('swipes').delete().match({ user_name: userId, movie_id: String(movieId) });
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
      return (data.results || []).slice(0, 5).map((m: any) => ({
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
      return (data.results || []).map((m: any) => ({
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
          const res = await fetch(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
          if (!res.ok) return null;
          const data = await res.json();
          const omdbRatings = data.imdb_id ? await this.fetchOMDbRatingsById(data.imdb_id) : null;
          return this.mapTMDBToMovie(data, omdbRatings);
        })
      );
      return movies.filter((m): m is Movie => m !== null);
    } catch (e) { return []; }
  }

  private static mapTMDBToMovie(m: any, omdbData?: any): Movie {
    if (!m) return { id: '0', title: 'Unknown', description: '', posterUrl: '', backdropUrl: '', releaseYear: 0, genres: [], ratings: { rottenTomatoesCritic: 'N/A', rottenTomatoesAudience: 'N/A', letterboxd: 0, imdb: 'N/A' } };
    
    let genreNames: string[] = [];
    if (m.genres) {
      genreNames = m.genres.map((g: any) => g.name);
    } else if (m.genre_ids) {
      genreNames = m.genre_ids.map((id: number) => TMDB_GENRES[id]).filter(Boolean);
    }

    const director = m.credits?.crew?.find((person: any) => person.job === 'Director')?.name;
    const cast = m.credits?.cast?.slice(0, 3).map((person: any) => person.name);
    const runtimeHours = m.runtime ? Math.floor(m.runtime / 60) : 0;
    const runtimeMins = m.runtime ? m.runtime % 60 : 0;
    const runtimeStr = m.runtime ? `${runtimeHours}h ${runtimeMins}m` : undefined;

    let rtScore: string | number = 'N/A';
    if (omdbData?.Ratings) {
      const rtRating = omdbData.Ratings.find((r: any) => r.Source === 'Rotten Tomatoes');
      if (rtRating) rtScore = rtRating.Value.replace('%', '');
    }

    return {
      id: String(m.id),
      imdbId: m.imdb_id || omdbData?.imdbID,
      title: m.title || m.name || 'Untitled',
      description: m.overview || 'No description.',
      fullSynopsis: m.overview,
      releaseYear: m.release_date ? new Date(m.release_date).getFullYear() : 0,
      posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
      backdropUrl: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : '',
      genres: genreNames,
      director,
      cast,
      runtime: runtimeStr,
      ratings: {
        rottenTomatoesCritic: rtScore,
        rottenTomatoesAudience: 'N/A', 
        letterboxd: Number(((m.vote_average || 0) / 2).toFixed(1)),
        imdb: omdbData?.imdbRating || (m.vote_average ? Number((m.vote_average).toFixed(1)) : 'N/A')
      }
    };
  }
}
