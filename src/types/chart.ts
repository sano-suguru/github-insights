import type { UserEvent } from "@/lib/github/types";

/**
 * イベントデータを受け取るチャートコンポーネント用Props
 */
export interface EventsChartProps {
  events: UserEvent[];
}
