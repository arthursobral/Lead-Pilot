/**
 * Developer type — mirrors the Developer domain entity.
 *
 * Named intentionally as a person, not a resource or a metric container.
 */
export interface Developer {
  id: string;
  name: string;
  role?: string;
  githubLogin?: string;
  avatarUrl?: string;
  createdAt: string;
}

export type DeveloperListItem = Pick<Developer, 'id' | 'name' | 'role' | 'avatarUrl' | 'githubLogin'>;
