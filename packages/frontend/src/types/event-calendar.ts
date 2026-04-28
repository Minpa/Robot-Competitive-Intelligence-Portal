export type EventType = '전시' | '학회' | '정책';

export interface RobotAIEvent {
  id: string;
  name: string;
  type: EventType;
  date_start: string;
  date_end: string;
  location: string;
  country: string;
  url: string;
  tags: string[];
  relevance_score: 1 | 2 | 3 | 4 | 5;
}
