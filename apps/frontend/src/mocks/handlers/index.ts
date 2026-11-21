import { authHandlers } from "./auth.handlers";
import { catalogHandlers } from "./catalog.handlers";
import { recordsHandlers } from "./records.handlers";

export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...recordsHandlers
];
