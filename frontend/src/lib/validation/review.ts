import { z } from 'zod';

// TODO: review schema, shared by the client form and the route handler.
export const reviewSchema = z.object({});
export type ReviewValues = z.infer<typeof reviewSchema>;
