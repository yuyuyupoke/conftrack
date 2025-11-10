import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { saveUserKeywords, getUserKeywords, getAllPresentationsWithDetails } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // User keywords router
  keywords: router({
    save: protectedProcedure
      .input(z.object({
        keywords: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        await saveUserKeywords(ctx.user.id, input.keywords);
        return { success: true };
      }),
    
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
      }))
      .query(async ({ ctx, input }) => {
        const keywords = await getUserKeywords(ctx.user.id, input.limit);
        return keywords;
      }),
  }),

  // Presentations router
  presentations: router({
    getAll: publicProcedure
      .query(async () => {
        const presentations = await getAllPresentationsWithDetails();
        return presentations;
      }),
  }),
});

export type AppRouter = typeof appRouter;
