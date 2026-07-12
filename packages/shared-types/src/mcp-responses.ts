export interface GitHubPRResponse {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  body: string;
  comments: Array<{ author: string; body: string; createdAt: string }>;
}

export interface JiraIssueResponse {
  key: string;
  summary: string;
  url: string;
  status: string;
  description: string;
  resolution?: string;
}

export interface DocResponse {
  id: string;
  title: string;
  url: string;
  content: string;
}
