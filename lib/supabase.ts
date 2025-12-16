import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zdeeictdsetconpixixp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZWVpY3Rkc2V0Y29ucGl4aXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNjYzOTUsImV4cCI6MjA4MDk0MjM5NX0.3sjkYDAKhH_Q4fk3dTQGusT2dr9dHaiv8kr0xv5P9I8';

export const supabase = createClient(supabaseUrl, supabaseKey);