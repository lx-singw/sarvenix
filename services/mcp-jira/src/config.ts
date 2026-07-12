import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  jira: {
    clientId: process.env.JIRA_CLIENT_ID || '',
    clientSecret: process.env.JIRA_CLIENT_SECRET || '',
    cloudId: process.env.JIRA_CLOUD_ID || '',
    // Support OAuth token or direct token for developer environments
    accessToken: process.env.JIRA_ACCESS_TOKEN || '', 
  },
};
