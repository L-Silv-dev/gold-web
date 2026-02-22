declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}
declare module "https://esm.sh/@supabase/supabase-js@2.39.8" {
  export const createClient: (...args: any[]) => any;
}
declare const Deno: { env: { get(name: string): string | undefined } };
