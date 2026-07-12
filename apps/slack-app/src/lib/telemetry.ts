import type { EvidenceSource, TelemetryContext } from '@sarvenix/shared-types';
import { Logger } from './logger';

export interface MetricEvent {
  name: 'request_completed' | 'source_request' | 'answer_quality' | 'alert_outcome';
  value: number;
  unit: 'count' | 'milliseconds' | 'ratio';
  correlationId: string;
  source?: EvidenceSource;
  attributes?: Record<string, string | number | boolean>;
}

export function startTelemetry(
  workspaceId: string,
  slackUserId?: string,
  correlationId?: string
): TelemetryContext {
  return {
    correlationId: correlationId || crypto.randomUUID(),
    workspaceId,
    slackUserId,
    startedAt: new Date().toISOString(),
  };
}

export async function emitMetric(event: MetricEvent): Promise<void> {
  await Logger.info('metric', {
    metric: event.name,
    value: event.value,
    unit: event.unit,
    correlationId: event.correlationId,
    source: event.source,
    ...event.attributes,
  });
}

export async function completeTelemetry(
  context: TelemetryContext,
  attributes: Record<string, string | number | boolean> = {}
): Promise<void> {
  await emitMetric({
    name: 'request_completed',
    value: Date.now() - new Date(context.startedAt).getTime(),
    unit: 'milliseconds',
    correlationId: context.correlationId,
    attributes,
  });
}
