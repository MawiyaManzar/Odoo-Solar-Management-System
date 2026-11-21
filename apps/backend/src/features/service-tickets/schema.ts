import { z } from "zod";
import { SERVICE_TICKET_STATUSES } from "../../db/schema/service-tickets.js";

export const serviceTicketListQuerySchema = z.object({
  status: z.enum(SERVICE_TICKET_STATUSES).optional(),
  customerId: z.string().trim().min(1).optional()
});

export type ServiceTicketListQuery = z.infer<typeof serviceTicketListQuerySchema>;
