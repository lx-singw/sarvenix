import { SynthesizedResponse } from '../modes/ask-mode/synthesis';
import { CatchupBrief } from '../commands/catchup';

export function formatAskResponse(response: SynthesizedResponse) {
  const confidenceBadge =
    response.confidence === 'high'
      ? '🟢 High Confidence'
      : response.confidence === 'moderate'
      ? '🟡 Moderate Confidence'
      : '⚪ Low Confidence';

  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: response.answer,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Status:* ${confidenceBadge} | _Reasoning: ${response.confidenceReasoning}_`,
        },
      ],
    },
  ];

  if (response.citations && response.citations.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Sources Cited:*',
      },
    });

    const buttonElements = response.citations.map((cit) => ({
      type: 'button',
      text: {
        type: 'plain_text',
        text: `[${cit.index}] ${cit.title}`,
        emoji: true,
      },
      value: `citation_${cit.index}`,
      url: cit.url,
      action_id: `click_citation_${cit.index}`,
    }));

    // Split buttons into chunks of 5 (Slack Block Kit limit per actions block)
    for (let i = 0; i < buttonElements.length; i += 5) {
      blocks.push({
        type: 'actions',
        elements: buttonElements.slice(i, i + 5),
      });
    }
  }

  // Feedback buttons
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '👍 Accurate',
          emoji: true,
        },
        value: 'accurate',
        action_id: 'feedback_accurate',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '👎 Wrong/hallucinated',
          emoji: true,
        },
        value: 'wrong',
        action_id: 'feedback_wrong',
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
}

export function formatServeModeAlert(input: ServeModeAlertInput) {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⚠️ Possible Decision Contradiction',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Proposal:* "${input.newDecisionSummary}"\n\nThis appears to contradict a past decision owned by *${input.pastDecisionOwner}*:\n> "${input.pastDecisionSummary}"`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🔍 View Past Context',
            emoji: true,
          },
          url: input.citationUrl,
          action_id: 'view_past_context',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: `💬 Loop in ${input.pastDecisionOwner}`,
            emoji: true,
          },
          value: input.pastDecisionOwnerId,
          action_id: 'loop_in_owner',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '❌ Dismiss Alert',
            emoji: true,
          },
          value: 'dismiss',
          action_id: 'dismiss_contradiction',
        },
      ],
    },
  ];
}

export function formatCatchupBrief(brief: CatchupBrief) {
  const blocks: any[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*While you were away: here is your personalized Sarvenix Catchup Brief* 🌴',
      },
    },
    { type: 'divider' },
  ];

  brief.bullets.forEach((bullet) => {
    const emoji =
      bullet.severity === 'red'
        ? '🔴'
        : bullet.severity === 'yellow'
        ? '🟡'
        : '🟢';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${bullet.title}*\n${bullet.description}`,
      },
    });
  });

  blocks.push({ type: 'divider' });

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '📝 Export Brief to Canvas',
          emoji: true,
        },
        value: 'export_canvas',
        action_id: 'export_catchup_canvas',
      },
    ],
  });

  return blocks;
}
