import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getSession,
  closeDriver,
  initializeVectorIndex,
  createDecision,
  createPerson,
  createArtifact,
  createChannel,
  linkNodes,
} from '../packages/knowledge-graph/src';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const geminiApiKey = process.env.GEMINI_API_KEY;

async function getEmbedding(text: string): Promise<number[]> {
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenerativeAI(geminiApiKey);
      const model = ai.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      if (result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
    } catch (e) {
      console.warn(`Gemini embedding failed for "${text}":`, e);
    }
  }

  // Fallback: Generate deterministic pseudo-random embedding of 768 dimensions
  console.log(`Generating mock embedding for: "${text}"`);
  const values: number[] = [];
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed += text.charCodeAt(i);
  }
  for (let i = 0; i < 768; i++) {
    const x = Math.sin(seed + i) * 10000;
    values.push(x - Math.floor(x));
  }
  // Normalize
  const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return values.map((v) => v / magnitude);
}

async function seedDemoData() {
  console.log('Initializing vector index in Neo4j...');
  await initializeVectorIndex();

  console.log('Seeding demo data into Neo4j graph...');
  const session = getSession();

  try {
    // Clear graph
    await session.run('MATCH (n) DETACH DELETE n');

    // 1. Create People (Sarah Chen, Dana, Priya)
    await createPerson({
      id: 'person-sarah',
      slackUserId: 'U11111',
      displayName: 'Sarah Chen',
      roles: ['tech-lead', 'infra'],
    });

    await createPerson({
      id: 'person-dana',
      slackUserId: 'U22222',
      displayName: 'Dana Miller',
      roles: ['engineer'],
    });

    await createPerson({
      id: 'person-priya',
      slackUserId: 'U33333',
      displayName: 'Priya Sharma',
      roles: ['senior-engineer'],
    });

    // 2. Create Channels
    await createChannel({
      id: 'channel-dev-infra',
      slackChannelId: 'C11111',
      name: 'dev-infra',
      isMuted: false,
      alertCountToday: 0,
    });

    await createChannel({
      id: 'channel-platform',
      slackChannelId: 'C22222',
      name: 'platform',
      isMuted: false,
      alertCountToday: 0,
    });

    await createChannel({
      id: 'channel-eng-general',
      slackChannelId: 'C33333',
      name: 'eng-general',
      isMuted: false,
      alertCountToday: 0,
    });

    // 3. Create Artifacts
    await createArtifact({
      id: 'artifact-pr-412',
      type: 'github_pr',
      externalId: 'PR #412',
      externalUrl: 'https://github.com/org/repo/pull/412',
      title: 'Fix database connection pooling memory leak',
      lastSyncedAt: new Date('2026-06-15T10:00:00Z'),
    });

    await createArtifact({
      id: 'artifact-jira-migrate-412',
      type: 'jira_ticket',
      externalId: 'MIGRATE-412',
      externalUrl: 'https://org.atlassian.net/browse/MIGRATE-412',
      title: 'Legacy Database Migration to v2',
      lastSyncedAt: new Date('2026-06-16T15:30:00Z'),
    });

    // 4. Create Decisions
    const desc1 = 'Drop legacy DB migration due to schema conflict and memory leaks';
    const emb1 = await getEmbedding(desc1);
    await createDecision({
      id: 'decision-drop-migration',
      summary: desc1,
      status: 'rejected',
      confidence: 'high',
      extractedAt: new Date('2026-06-16T16:00:00Z'),
      decidedAt: new Date('2026-06-16T15:30:00Z'),
      embedding: emb1,
    });

    const desc2 = 'Migration to v2 API approved';
    const emb2 = await getEmbedding(desc2);
    await createDecision({
      id: 'decision-approve-v2-migration',
      summary: desc2,
      status: 'active',
      confidence: 'high',
      extractedAt: new Date('2026-07-01T09:00:00Z'),
      decidedAt: new Date('2026-07-01T09:00:00Z'),
      embedding: emb2,
    });

    // 5. Link relationships
    // Decision 1 (Drop migration) links
    await linkNodes('Decision', 'decision-drop-migration', 'Person', 'person-sarah', 'OWNED_BY', {
      confidence: 'high',
    });
    await linkNodes('Decision', 'decision-drop-migration', 'Artifact', 'artifact-jira-migrate-412', 'RESOLVED_BY', {
      resolutionType: "Won't Do",
    });
    await linkNodes('Decision', 'decision-drop-migration', 'Artifact', 'artifact-pr-412', 'REFERENCES', {
      referenceType: 'code-review-comment',
    });
    await linkNodes('Decision', 'decision-drop-migration', 'Channel', 'channel-dev-infra', 'DISCUSSED_IN', {
      message_ts: '1719000000.0001',
      permalink: 'https://slack.com/archives/C11111/p17190000000001',
    });

    // Decision 2 (Approve v2 migration) links
    await linkNodes('Decision', 'decision-approve-v2-migration', 'Person', 'person-dana', 'OWNED_BY', {
      confidence: 'high',
    });
    await linkNodes('Decision', 'decision-approve-v2-migration', 'Channel', 'channel-platform', 'DISCUSSED_IN', {
      message_ts: '1720000000.0001',
      permalink: 'https://slack.com/archives/C22222/p17200000000001',
    });

    console.log('Demo data successfully seeded!');
  } catch (error) {
    console.error('Error seeding demo data:', error);
  } finally {
    await session.close();
    await closeDriver();
  }
}

seedDemoData().catch(console.error);
