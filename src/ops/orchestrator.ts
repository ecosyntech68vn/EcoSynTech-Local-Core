import { Policy } from './policy';

interface SkillContext {
  event: Record<string, unknown>;
  logger: unknown;
  stateStore: unknown;
  baseUrl?: string;
  packageVersion?: string;
  config?: Record<string, unknown>;
  cwd?: string;
}

interface SkillOutput {
  ok: boolean;
  action?: string;
  note?: string;
  timestamp: string;
  [key: string]: unknown;
}

interface Skill {
  id: string;
  name: string;
  triggers: string[];
  riskLevel: string;
  canAutoFix: boolean;
  run(ctx: SkillContext): Promise<SkillOutput>;
}

interface Result {
  skillId: string;
  ok: boolean;
  ms: number;
  output?: SkillOutput;
  error?: string;
}

class Orchestrator {
  private registry: Skill[];
  private logger: unknown;
  private stateStore: unknown;
  private policy: Policy;

  constructor(options: { registry: Skill[]; logger: unknown; stateStore: unknown }) {
    this.registry = options.registry;
    this.logger = options.logger;
    this.stateStore = options.stateStore;
    this.policy = new Policy();
  }

  async handle(event: Record<string, unknown>): Promise<Result[]> {
    const candidates = this.policy.match(event, this.registry);
    const results: Result[] = [];

    for (const skill of candidates) {
      const startedAt = Date.now();
      try {
        const output = await skill.run({
          event,
          logger: this.logger,
          stateStore: this.stateStore,
          baseUrl: event.baseUrl as string,
          packageVersion: event.packageVersion as string,
          config: event.config as Record<string, unknown>,
          cwd: event.cwd as string || process.cwd()
        });
        results.push({
          skillId: skill.id,
          ok: true,
          ms: Date.now() - startedAt,
          output
        });
      } catch (error) {
        results.push({
          skillId: skill.id,
          ok: false,
          ms: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }
}

export = { Orchestrator };
export type { Skill, SkillContext, SkillOutput, Result };