import { z } from 'zod';

// TODO: contact schema, shared by the client form and the route handler.
export const contactSchema = z.object({});
export type ContactValues = z.infer<typeof contactSchema>;
