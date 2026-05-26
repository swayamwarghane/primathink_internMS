import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { adminConfig } from "@/config/adminConfig";
import { z } from "zod";

/**
 * Grants admin role to the current user if their email matches adminConfig.ADMIN_EMAIL.
 * Safe to call on every login.
 */
export const ensureAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims.email as string | undefined)?.toLowerCase();
    const target = adminConfig.ADMIN_EMAIL.toLowerCase();
    if (!email || email !== target) return { admin: false };

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ name: adminConfig.ADMIN_NAME, onboarding_step: 4 })
      .eq("id", context.userId);

    return { admin: true };
  });

/**
 * Grants admin role to the currently signed-in user if they provide the
 * valid admin signup code. Used by the /admin-signup flow.
 * The code is stored in the admin_settings table and can be changed by any admin.
 */
export const claimAdminWithCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ code: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: settings, error: readErr } = await supabaseAdmin
      .from("admin_settings")
      .select("signup_code")
      .eq("id", 1)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const currentCode = settings?.signup_code ?? adminConfig.ADMIN_SIGNUP_CODE;
    if (data.code !== currentCode) {
      throw new Error("Invalid admin signup code");
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ onboarding_step: 4 })
      .eq("id", context.userId);

    return { admin: true };
  });

/** Returns the current admin signup code. Caller must be an admin. */
export const getAdminSignupCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roles) throw new Error("Forbidden");

    const { data, error } = await supabaseAdmin
      .from("admin_settings")
      .select("signup_code, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { code: data?.signup_code ?? "", updated_at: data?.updated_at ?? null };
  });

/** Updates the admin signup code. Caller must be an admin. */
export const updateAdminSignupCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      code: z.string().trim().min(6, "Code must be at least 6 characters").max(200),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roles) throw new Error("Forbidden");

    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert(
        { id: 1, signup_code: data.code, updated_by: context.userId, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
