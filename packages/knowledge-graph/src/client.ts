import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver | null = null;

export function getSession() {
  if (!driver) {
    const url = process.env.GRAPH_DB_URL || 'bolt://localhost:7687';
    const user = process.env.GRAPH_DB_USER || 'neo4j';
    const password = process.env.GRAPH_DB_PASSWORD || 'password';
    driver = neo4j.driver(url, neo4j.auth.basic(user, password));
  }
  return driver.session();
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
