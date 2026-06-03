import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hehnmafwvkxmvqcrpzgx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A6Om9eDYGEKRiKgCaQhg9Q_kA8vQR0_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);