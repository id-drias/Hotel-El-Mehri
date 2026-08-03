import { z } from 'zod';

// TODO: reservation schema, shared by the client form and the route handler.
export const reservationSchema = z.object({});
export type ReservationValues = z.infer<typeof reservationSchema>;
