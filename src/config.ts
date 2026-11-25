// Remote Config: change the cloud model or the legal rates (e.g. a new ITS
// scale or CNPS ceiling) without shipping a new release. Code defaults apply
// when the template has no value or the fetch fails (offline first).
import { fetchAndActivate, getRemoteConfig, getString } from "firebase/remote-config";
import { app } from "./firebase";
import { CI_RULES_2024, type Rules } from "./rules";

export const DEFAULT_CLOUD_MODEL = "gemini-3.5-flash-lite";

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 60_000 : 3_600_000;
remoteConfig.defaultConfig = { cloud_model: DEFAULT_CLOUD_MODEL, ci_rules: "" };

export interface AppConfig {
  cloudModel: string;
  rules: Rules;
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    await fetchAndActivate(remoteConfig);
  } catch {
    // Offline or blocked: keep the defaults.
  }
  return { cloudModel: getString(remoteConfig, "cloud_model") || DEFAULT_CLOUD_MODEL, rules: parseRules(getString(remoteConfig, "ci_rules")) };
}

// ci_rules is a JSON object overriding some fields of CI_RULES_2024.
// JSON has no Infinity: a null upper bound in itsBrackets means "no limit".
export function parseRules(json: string): Rules {
  if (!json) return CI_RULES_2024;
  try {
    const override = JSON.parse(json) as Partial<Omit<Rules, "itsBrackets">> & { itsBrackets?: [number | null, number][] };
    const brackets = override.itsBrackets?.map(([max, rate]) => [max ?? Infinity, rate] as [number, number]);
    return { ...CI_RULES_2024, ...override, itsBrackets: brackets ?? CI_RULES_2024.itsBrackets };
  } catch {
    return CI_RULES_2024;
  }
}
