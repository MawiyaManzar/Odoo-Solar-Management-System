import { z } from "zod";
import { SERVICE_TICKET_STATUSES } from "../../db/schema/service-tickets.js";

export const serviceTicketListQuerySchema = z.object({
  status: z.enum(SERVICE_TICKET_STATUSES).optional(),
  customerId: z.string().trim().min(1).optional()
});

export type ServiceTicketListQuery = z.infer<typeof serviceTicketListQuerySchema>;

export const customerTicketCreateSchema = z.object({
  serialUnitId: z.string().trim().min(1, "Pick a serial unit."),
  faultCode: z.string().trim().min(1).max(40).optional(),
  description: z.string().trim().min(3, "Describe the fault.").max(2000),
  billableInr: z.number().finite().min(0).optional()
});

export type CustomerTicketCreate = z.infer<typeof customerTicketCreateSchema>;
