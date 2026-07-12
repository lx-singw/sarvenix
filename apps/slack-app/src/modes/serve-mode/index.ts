import { Decision } from '@sarvenix/shared-types';
import { extractDecisionEntity } from '../../ingestion/entity-extraction';
import { getEmbedding } from '../../lib/gemini-client';
import { detectContradiction } from './contradiction-detector';
import { verifyContradiction } from './adversarial-verifier';
import { isAllowedToAlert, recordAlertSent } from './rate-limiter';
import { formatServeModeAlert } from '../../delivery/block-kit-formatters';

export interface ServeModeResult {
  alertBlocks: any[] | null;
  criticReasoning: string;
  isApproved: boolean;
}

export async function processServeMode(
  messageText: string,
  channelId: string
): Promise<ServeModeResult> {
  const defaultResult: ServeModeResult = {
    alertBlocks: null,
    criticReasoning: 'No contradiction detected or message was not a decision.',
    isApproved: false,
  };

  try {
    // 1. Extract decision entity from message
    const extracted = await extractDecisionEntity(messageText);
    if (!extracted.isDecision) {
      return defaultResult;
    }

    // 2. Generate embedding for the proposed decision
    const newEmbedding = await getEmbedding(extracted.summary);

    // 3. Find if it contradicts past decisions
    const match = await detectContradiction(newEmbedding);
    if (!match) {
      return {
        alertBlocks: null,
        criticReasoning: 'No historical contradiction found in the Knowledge Graph.',
        isApproved: false,
      };
    }

    // 4. Check rate limiting and mute controls
    const allowed = await isAllowedToAlert(channelId);
    if (!allowed) {
      return {
        alertBlocks: null,
        criticReasoning: 'Alert suppressed due to channel rate limits or channel is muted.',
        isApproved: false,
      };
    }

    // 5. Run adversarial verification (critic pass)
    // To feed the critic pass, we try to gather the history rationale. We can use the similarDecision summary/rationale.
    const criticVerdict = await verifyContradiction(
      messageText,
      extracted.summary,
      match.similarDecision.summary,
      match.similarDecision.summary // using summary as context for mock fallback
    );

    if (!criticVerdict.approved) {
      return {
        alertBlocks: null,
        criticReasoning: `Alert rejected by adversarial verifier. Reason: ${criticVerdict.reason}`,
        isApproved: false,
      };
    }

    // 6. Build the Block Kit alert payload
    const alertBlocks = formatServeModeAlert({
      newDecisionSummary: extracted.summary,
      pastDecisionSummary: match.similarDecision.summary,
      pastDecisionOwner: match.ownerName,
      pastDecisionOwnerId: match.ownerSlackId,
      citationUrl: match.citationUrl,
    });

    // 7. Increment alert counter
    await recordAlertSent(channelId);

    return {
      alertBlocks,
      criticReasoning: criticVerdict.reason,
      isApproved: true,
    };
  } catch (error) {
    console.error('Error in processServeMode orchestration:', error);
    return {
      alertBlocks: null,
      criticReasoning: `Error processing serve mode: ${error}`,
      isApproved: false,
    };
  }
}
