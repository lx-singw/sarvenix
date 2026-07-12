import { getSession, closeDriver } from '../packages/knowledge-graph/src';

async function seedDemoData() {
  console.log('Seeding demo data into Neo4j graph...');
  const session = getSession();
  try {
    // Clear graph
    await session.run('MATCH (n) DETACH DELETE n');

    // Create a demo Person
    await session.run(`
      CREATE (p:Person {
        id: "person-1",
        slackUserId: "U12345",
        displayName: "Sarah Chen",
        roles: ["tech-lead"]
      })
    `);

    // Create a demo Channel
    await session.run(`
      CREATE (c:Channel {
        id: "channel-1",
        slackChannelId: "C12345",
        name: "dev-infra",
        isMuted: false,
        alertCountToday: 0
      })
    `);

    // Create a demo Decision (status: rejected)
    await session.run(`
      CREATE (d:Decision {
        id: "decision-1",
        summary: "Drop legacy DB migration",
        status: "rejected",
        confidence: "high",
        extractedAt: "2026-07-12T00:00:00Z"
      })
    `);

    // Create relationships
    await session.run(`
      MATCH (d:Decision {id: "decision-1"}), (p:Person {id: "person-1"})
      CREATE (d)-[:OWNED_BY {confidence: "high"}]->(p)
    `);

    await session.run(`
      MATCH (d:Decision {id: "decision-1"}), (c:Channel {id: "channel-1"})
      CREATE (d)-[:DISCUSSED_IN {message_ts: "1719000000.0001", permalink: "https://slack.com/archives/C12345/p17190000000001"}]->(c)
    `);

    console.log('Demo data successfully seeded!');
  } catch (error) {
    console.error('Error seeding demo data:', error);
  } finally {
    await session.close();
    await closeDriver();
  }
}

seedDemoData().catch(console.error);
