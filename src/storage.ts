import { validateState } from "./backup.ts";
import type { LearnerState } from "./types.ts";
import type { Account } from "./account.ts";
export { empty } from "./state.ts";

export function recoveryMessage(error: unknown): string {
  return `${error instanceof Error ? error.message : String(error)} No progress was replaced. Reload progress before trying again.`;
}
interface Envelope { protocol: 1; owner: string; revision: string; snapshot: { schemaVersion: 2; data: LearnerState } }
export class LearnerStorage {
  private revision?: string;
  private uncertain = false;
  private readonly account: Account;
  constructor(account: Account) { this.account = account; }
  private async call(name: string, args: object = {}): Promise<unknown> {
    const response = await fetch(`${this.account.project}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: this.account.key, Authorization: `Bearer ${this.account.token}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || body?.code === "42501") this.account.invalidate();
      throw new Error(body?.message ?? `Account request failed (${response.status}).`);
    }
    return body;
  }
  private validate(value: unknown): Envelope {
    const v = value as Envelope;
    if (!v || v.protocol !== 1 || v.owner !== this.account.subject || typeof v.revision !== "string" || !v.revision || v.snapshot?.schemaVersion !== 2) throw new Error("Account data could not be verified.");
    return { ...v, snapshot: { schemaVersion: 2, data: validateState(v.snapshot.data) } };
  }
  async load(): Promise<LearnerState> {
    const result = this.validate(await this.call("account_load"));
    this.revision = result.revision;
    this.uncertain = false;
    return result.snapshot.data;
  }
  async reset(): Promise<LearnerState> {
    if (!this.revision || this.uncertain) throw new Error("Reload progress before resetting.");
    this.uncertain = true;
    const result = this.validate(await this.call("account_reset", { p_expected_revision: this.revision }));
    this.revision = result.revision;
    this.uncertain = false;
    return result.snapshot.data;
  }
  async save(candidate: LearnerState): Promise<void> {
    if (!this.revision || this.uncertain) throw new Error("Reload progress before saving again.");
    const snapshot = { schemaVersion: 2, data: validateState(candidate) };
    this.uncertain = true;
    const result = this.validate(await this.call("account_save", { p_expected_revision: this.revision, p_snapshot: snapshot }));
    this.revision = result.revision;
    this.uncertain = false;
  }
}
