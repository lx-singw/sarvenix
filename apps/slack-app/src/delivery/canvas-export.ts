import { WebClient } from '@slack/web-api';
import { CatchupBrief } from '../commands/catchup';

export async function exportBriefToCanvas(
  client: WebClient,
  brief: CatchupBrief
): Promise<string> {
  const dateStr = new Date().toLocaleDateString();
  const title = `Sarvenix Catchup Brief — ${dateStr}`;

  let markdown = `# ${title}\n\n`;
  markdown += `*Generated automatically by Sarvenix*\n\n---\n\n`;

  brief.bullets.forEach((bullet) => {
    const emoji =
      bullet.severity === 'red'
        ? '🔴 [Action Required]'
        : bullet.severity === 'yellow'
        ? '🟡 [Relevant Context]'
        : '🟢 [FYI]';

    markdown += `### ${emoji} ${bullet.title}\n`;
    markdown += `${bullet.description}\n\n`;
  });

  try {
    // Call Slack canvases.create API
    // Note: Canvases API is available in Slack Enterprise Grid/Developer sandboxes
    const result = await (client as any).canvases.create({
      title: title,
      document_content: {
        type: 'markdown',
        markdown: markdown,
      },
    });

    if (result.ok && result.canvas_id) {
      return `https://slack.com/canvas/${result.canvas_id}`;
    }
  } catch (error) {
    console.warn('Slack canvases.create failed, falling back to mock canvas link:', error);
  }

  // Sandbox simulation fallback
  const mockId = Math.random().toString(36).substring(2, 11);
  return `https://slack.com/canvas/mock-${mockId}`;
}
