import type { Place } from './place';

export interface Tag {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  places?: Place[];
}
