import { authHandlers } from "./auth.handlers";
import { catalogHandlers } from "./catalog.handlers";
import { pipelineHandlers } from "./pipeline.handlers";
import { reportsHandlers } from "./reports.handlers";

export const handlers = [
  ...authHandlers,
  ...catalogHandlers,
  ...pipelineHandlers,
  ...reportsHandlers
];
