// Leer lassen = Einträge bleiben nur im Browser des jeweiligen Geräts (mit Export/Import als Backup).
// Ausfüllen = Leo und Coach sehen dieselben Einträge (Supabase, siehe README).
window.CONFIG = {
  supabaseUrl: 'https://aywhmueknxwjoczbxvcn.supabase.co',      // z. B. 'https://abcdefgh.supabase.co'
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5d2htdWVrbnh3am9jemJ4dmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2MTYyMTUsImV4cCI6MjExMTE5MjIxNX0.8qal9iuS7Tk35kz8yvDrkowumXymuM_46RRZLTQi_gk',  // "anon public" Key aus Supabase → Project Settings → API
  planId: 'leo-woborsky-2026-27'
};
