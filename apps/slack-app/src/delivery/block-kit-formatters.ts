import { SynthesizedResponse } from '../modes/ask-mode/synthesis';
import { CatchupBrief } from '../commands/catchup';

const MAX_SECTION_TEXT = 2_900;
const MAX_BUTTON_TEXT = 70;

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function plainText(value: string, limit = MAX_BUTTON_TEXT) {
  return { type: 'plain_text', text: truncate(value, limit), emoji: false };
}

function confidenceLabel(confidence: SynthesizedResponse['confidence']): string {
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'moderate') return 'Moderate confidence';
  return 'Low confidence';
}

export function formatAskResponse(response: SynthesizedResponse) {
  const blocks: any[] = [
    {
      type: 'header',
      text: plainText('Sarvenix evidence brief', 150),
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: truncate(response.answer, MAX_SECTION_TEXT) },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*${confidenceLabel(response.confidence)}* · ${truncate(response.confidenceReasoning, 1_500)}`,
        },
      ],
    },
  ];

  if (response.citations.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Verified sources* · ${response.citations.length} deep link${response.citations.length === 1 ? '' : 's'}` },
    });

    const sourceButtons = response.citations.slice(0, 10).map((citation) => ({
      type: 'button',
      text: plainText(`[${citation.index}] ${citation.title}`),
      value: `citation_${citation.index}`,
      url: citation.url,
      action_id: `click_citation_${citation.index}`,
      accessibility_label: `Open source ${citation.index}: ${truncate(citation.title, 120)}`,
    }));

    for (let index = 0; index < sourceButtons.length; index += 5) {
      blocks.push({ type: 'actions', elements: sourceButtons.slice(index, index + 5) });
    }
  } else {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '_No verifiable source links were available. Treat this response as incomplete._' }],
    });
  }

  blocks.push({
    type: 'actions',
    block_id: 'ask_feedback',
    elements: [
      {
        type: 'button',
        text: plainText('Accurate'),
        value: 'accurate',
        action_id: 'feedback_accurate',
        accessibility_label: 'Mark this answer accurate',
      },
      {
        type: 'button',
        text: plainText('Needs correction'),
        value: 'wrong',
        action_id: 'feedback_wrong',
        accessibility_label: 'Report an unsupported or incorrect answer',
      },
    ],
  });

  return blocks;
}

export interface ServeModeAlertInput {
  newDecisionSummary: string;
  pastDecisionSummary: string;
  pastDecisionOwner: string;
  pastDecisionOwnerId: string;
  citationUrl: string;
  priorDecisionId: string;
  similarityScore: number;
}

export function formatServeModeAlert(input: ServeModeAlertInput) {
  return [
    {
      type: 'header',
      text: plainText('Potential decision conflict', 150),
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*New proposal*\n${truncate(input.newDecisionSummary, 900)}\n\n*Prior decision · ${input.pastDecisionOwner}*\n>${truncate(input.pastDecisionSummary, 900)}`,
      },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn',           text: `_Verified by the adversarial critic · ${Math.round(input.similarityScore * 100)}% semantic match · Decision ID: \`${input.priorDecisionId}\` · No action taken automatically._` }],

    },
    {
      type: 'actions',
      block_id: 'contradiction_actions',
      elements: [
        {
          type: 'button',
          text: plainText('Open prior context'),
          url: input.citationUrl,
          action_id: 'view_past_context',
          accessibility_label: 'Open the source for the prior decision',
        },
        {
          type: 'button',
          text: plainText(`Loop in ${input.pastDecisionOwner}`),
          value: input.pastDecisionOwnerId,
          action_id: 'loop_in_owner',
        },
        {
          type: 'button',
          style: 'primary',
          text: plainText('Draft reconciliation'),
          value: `${input.newDecisionSummary}|||${input.pastDecisionSummary}|||${input.pastDecisionOwnerId}`,
          action_id: 'draft_reconciliation',
        },
        {
          type: 'button',
          text: plainText('Resolve prior decision'),
          value: input.priorDecisionId,
          action_id: 'resolve_decision_conflict',
          confirm: {
            title: plainText('Resolve conflict', 100),
            text: plainText('Close the prior decision and remove its open conflict links?', 300),
            confirm: plainText('Resolve', 30),
            deny: plainText('Cancel', 30),
            style: 'danger',
          },
        },
        {
          type: 'button',
          text: plainText('Dismiss'),
          value: 'dismiss',
          action_id: 'dismiss_contradiction',
        },
      ],
    },
  ];
}

export function formatCatchupBrief(brief: CatchupBrief) {
  const severityLabel = { red: 'Needs attention', yellow: 'Review soon', green: 'For awareness' } as const;
  const blocks: any[] = [
    { type: 'header', text: plainText('Your Sarvenix catch-up brief', 150) },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${brief.bullets.length} prioritized update${brief.bullets.length === 1 ? '' : 's'} from workspace decisions visible to you.` }],
    },
    { type: 'divider' },
  ];

  for (const bullet of brief.bullets.slice(0, 3)) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${severityLabel[bullet.severity]} · ${truncate(bullet.title, 180)}*\n${truncate(bullet.description, 1_800)}`,
      },
    });
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        style: 'primary',
        text: plainText('Export to Canvas'),
        value: 'export_canvas',
        action_id: 'export_catchup_canvas',
        accessibility_label: 'Export this catch-up brief to Slack Canvas',
      },
    ],
  });
  return blocks;
}

export interface AppHomeStats {
  totalDecisions: number;
  unresolvedConflicts: number;
  monitoredChannels: number;
}

export function formatAppHome(stats: AppHomeStats, recentDecisions: any[]) {
  const blocks: any[] = [
    { type: 'header', text: plainText('Sarvenix command center', 150) },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*Institutional memory you can inspect and control.*\nTrace why decisions were made, catch conflicts early, and return from time away with a focused brief.' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Indexed decisions*\n${stats.totalDecisions}` },
        { type: 'mrkdwn', text: `*Open conflicts*\n${stats.unresolvedConflicts}` },
        { type: 'mrkdwn', text: `*Monitored channels*\n${stats.monitoredChannels}` },
        { type: 'mrkdwn', text: '*Service*\nOperational' },
      ],
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', style: 'primary', text: plainText('Generate catch-up'), action_id: 'home_trigger_catchup' },
        { type: 'button', text: plainText('Configure alerts'), action_id: 'configure_channels_modal' },
      ],
    },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: '*Recent decisions visible to you*' } },
  ];

  if (recentDecisions.length === 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_No decisions are indexed in your accessible channels yet. Sarvenix will populate this view as decisions are captured._' },
    });
  } else {
    for (const decision of recentDecisions.slice(0, 5)) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${truncate(decision.summary, 220)}*\n${String(decision.confidence).toUpperCase()} confidence · ${new Date(decision.extractedAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}`,
        },
      });
    }
  }

  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: 'Sarvenix only surfaces channels and evidence the requesting user can access.' }] });
  return { type: 'home', blocks };
}

export function formatChannelConfigModal(channels: { id: string; name: string; isMuted: boolean }[]) {
  const options = channels.slice(0, 100).map((channel) => ({
    text: plainText(`#${channel.name}`),
    value: channel.id,
  }));
  const initialOptions = options.filter((option) => channels.find((channel) => channel.id === option.value)?.isMuted);
  const blocks: any[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: 'Choose channels where proactive conflict alerts should be paused. Muting also stops new message indexing in that channel.' },
    },
  ];

  if (options.length === 0) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '_No accessible channels were found._' } });
  } else {
    const element: any = { type: 'checkboxes', options, action_id: 'mute_checkboxes' };
    if (initialOptions.length > 0) element.initial_options = initialOptions;
    blocks.push({
      type: 'input',
      block_id: 'mute_block',
      label: plainText('Channels to mute'),
      element,
      optional: true,
    });
  }

  return {
    type: 'modal',
    callback_id: 'configure_channels_submit',
    title: plainText('Alert controls', 24),
    submit: plainText('Save', 24),
    close: plainText('Cancel', 24),
    blocks,
  };
}
