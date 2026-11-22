import Stripe from "stripe";
import { ServiceError } from "./service-error.js";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new ServiceError(503, "Stripe is not configured. Set STRIPE_SECRET_KEY on the API.");
  }
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

export function frontendBaseUrl(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "");
}
