import { SynthesizedResponse } from '../modes/ask-mode/synthesis';
import { CatchupBrief } from '../commands/catchup';
import type { ImpactRadius, SourceHealth } from '@sarvenix/shared-types';

const MAX_SECTION_TEXT = 2_900;
const MAX_BUTTON_TEXT = 70;

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function plainText(value: string, limit = MAX_BUTTON_TEXT) {
  return { type: 'plain_text', text: truncate(value, limit), emoji: false };
}

function confidenceLabel(confidence: SynthesizedResponse['confidence']): string {
  if (confidence === 'high') return '🟢 High confidence';
  if (confidence === 'moderate') return '🟡 Moderate confidence';
  return '🔴 Low confidence';
}

export function formatAskResponse(response: SynthesizedResponse) {
  const blocks: any[] = [
    {
      type: 'header',
      text: plainText('🧠 Sarvenix Evidence Brief', 150),
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
          text: `*${confidenceLabel(response.confidence)}* · ℹ️ ${truncate(response.confidenceReasoning, 1_500)}`,
        },
      ],
    },
  ];
 
  if (response.citations.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*📋 Verified Sources* · ${response.citations.length} deep link${response.citations.length === 1 ? '' : 's'}` },
    });
 
    const sourceButtons = response.citations.slice(0, 10).map((citation) => ({
      type: 'button',
      text: plainText(`🔗 [${citation.index}] ${citation.title}`),
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
      elements: [{ type: 'mrkdwn', text: '_⚠️ No verifiable source links were available. Treat this response as incomplete._' }],
    });
  }
 
  blocks.push({
    type: 'actions',
    block_id: 'ask_feedback',
    elements: [
      {
        type: 'button',
        style: 'primary',
        text: plainText('👍 Accurate'),
        value: 'accurate',
        action_id: 'feedback_accurate',
        accessibility_label: 'Mark this answer accurate',
      },
      {
        type: 'button',
        style: 'danger',
        text: plainText('👎 Needs correction'),
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
      text: plainText('⚠️ Potential Decision Conflict', 150),
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🚨 New Proposal*\n> ${truncate(input.newDecisionSummary, 900)}\n\n*📌 Prior Decision · ${input.pastDecisionOwner}*\n> ${truncate(input.pastDecisionSummary, 900)}`,
      },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `_🛡️ *Adversarial Critic* · ${Math.round(input.similarityScore * 100)}% semantic match · Decision ID: \`${input.priorDecisionId}\` · No action taken automatically._` }],
    },
    {
      type: 'actions',
      block_id: 'contradiction_actions',
      elements: [
        {
          type: 'button',
          text: plainText('🔗 Open prior context'),
          url: input.citationUrl,
          action_id: 'view_past_context',
          accessibility_label: 'Open the source for the prior decision',
        },
        {
          type: 'button',
          text: plainText(`👥 Loop in ${input.pastDecisionOwner}`),
          value: input.pastDecisionOwnerId,
          action_id: 'loop_in_owner',
        },
        {
          type: 'button',
          style: 'primary',
          text: plainText('⚡ Draft reconciliation'),
          value: `${input.newDecisionSummary}|||${input.pastDecisionSummary}|||${input.pastDecisionOwnerId}`,
          action_id: 'draft_reconciliation',
        },
        {
          type: 'button',
          text: plainText('✅ Resolve prior decision'),
          value: input.priorDecisionId,
          action_id: 'resolve_decision_conflict',
          confirm: {
            title: plainText('⚠️ Resolve decision conflict?', 100),
            text: plainText('This will close the prior decision in the knowledge graph and remove its open conflict links. Proceed?', 300),
            confirm: plainText('Resolve', 30),
            deny: plainText('Cancel', 30),
            style: 'danger',
          },
        },
        {
          type: 'button',
          text: plainText('❌ Dismiss'),
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

export function formatAppHome(
  stats: AppHomeStats,
  recentDecisions: any[],
  health: SourceHealth[] = []
) {
  const healthSummary = health.length === 0
    ? 'Source diagnostics have not run yet.'
    : health.map(item => `*${item.source.toUpperCase()}* — ${item.status}${item.detail ? `: ${item.detail}` : ''}`).join('\n');
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
      type: 'section',
      text: { type: 'mrkdwn', text: '*Start here*\n1. Mention `@Sarvenix` with a decision question.\n2. Run a catch-up after time away.\n3. Review proactive conflicts before changing work.' },
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', style: 'primary', text: plainText('Generate catch-up'), action_id: 'home_trigger_catchup' },
        { type: 'button', text: plainText('Run readiness check'), action_id: 'home_readiness_check' },
        { type: 'button', text: plainText('Configure alerts'), action_id: 'configure_channels_modal' },
      ],
    },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: `*Source readiness*\n${healthSummary}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: 'A denied source stays private. A stale or unavailable source lowers confidence and is never replaced with fixture data.' }] },
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

export function formatImpactRadius(impact: ImpactRadius) {
  const blocks: any[] = [
    { type: 'header', text: plainText('Affected work review', 150) },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${impact.items.length} connected item${impact.items.length === 1 ? '' : 's'}*${impact.partial ? ' · Partial result' : ''}\nEach item is backed by a graph path. Review before resolving or superseding the decision.` },
    },
  ];
  for (const item of impact.items.slice(0, 8)) {
    const title = item.url ? `<${item.url}|${truncate(item.title, 160)}>` : truncate(item.title, 160);
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${title}*\n${item.type.replace('_', ' ')} · ${item.freshness} · ${Math.round(item.confidence * 100)}% path confidence\n${truncate(item.reason, 500)}\n_Path: ${item.path.map(value => `\`${value}\``).join(' → ')}_`,
      },
    });
  }
  blocks.push({
    type: 'actions',
    elements: [
      { type: 'button', text: plainText('Snooze review'), value: impact.decisionId, action_id: 'snooze_impact_review' },
      { type: 'button', text: plainText('Not a contradiction'), value: impact.decisionId, action_id: 'reject_impact_alert' },
    ],
  });
  return blocks;
}

export function formatSystemState(
  state: 'loading' | 'empty' | 'timeout' | 'denied' | 'stale' | 'rate_limited' | 'conflicting' | 'partial',
  detail?: string
) {
  const copy = {
    loading: ['Gathering authorized evidence', 'Sarvenix is checking Slack, GitHub, Jira, and decision lineage.'],
    empty: ['No matching evidence', 'Try a decision name, owner, ticket, pull request, or narrower date range.'],
    timeout: ['A source took too long', 'Available evidence is preserved. Retry to check the missing source.'],
    denied: ['Access is limited', 'The source exists but your current identity cannot access it. No details were revealed.'],
    stale: ['Evidence may be stale', 'Review the last sync time before acting on this answer.'],
    rate_limited: ['Source temporarily rate-limited', 'Wait before retrying; Sarvenix will not substitute unverified data.'],
    conflicting: ['Sources disagree', 'Review the timeline and exact citations before choosing the current truth.'],
    partial: ['Partial answer', 'Some sources were unavailable or permission-limited.'],
  } as const;
  const [title, body] = copy[state];
  return [{ type: 'section', text: { type: 'mrkdwn', text: `*${title}*\n${body}${detail ? `\n_${truncate(detail, 500)}_` : ''}` } }];
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
