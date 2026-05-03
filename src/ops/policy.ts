export interface Skill {
  id: string;
  triggers?: string[];
  run: (ctx: unknown) => unknown;
  [key: string]: unknown;
}

export interface Event {
  type?: string;
  route?: string;
  topic?: string;
  [key: string]: unknown;
}

export class Policy {
  match(event: Event, registry: Map<string, Skill>): Skill[] {
    const list = [...registry.values()];
    return list.filter(skill => {
      if (!Array.isArray(skill.triggers)) return false;
      return skill.triggers.some(trigger => {
        if (trigger === event.type || trigger === `event:${event.type}`) return true;
        if (event.route && trigger === `route:${event.route}`) return true;
        if (event.topic && trigger === `topic:${event.topic}`) return true;
        return false;
      });
    });
  }
}

export default { Policy };