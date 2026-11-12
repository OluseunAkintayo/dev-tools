import { useLocation } from "react-router-dom";

/** Data carried from one tool (or the landing page) into another via router state. */
export interface Handoff {
  input: string;
  options?: Record<string, string>;
}

const isHandoff = (value: unknown): value is Handoff =>
  typeof value === "object" && value !== null && typeof (value as Handoff).input === "string";

export const useHandoff = (): Handoff | null => {
  const location = useLocation();
  return isHandoff(location.state) ? location.state : null;
};
