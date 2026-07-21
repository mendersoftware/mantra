import { request } from 'graphql-request';

const maxRetries = 3;

// GitLab and GitHub regularly answer with a 502/503 from their edge, occasionally rate limit us and sometimes just
// drop the connection - none of which says anything about the query itself, so those are worth another attempt
const isRetriable = error => {
  const status = error?.response?.status;
  return status === undefined || status === 429 || status >= 500;
};

export const requestWithRetry = async options => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await request(options);
    } catch (error) {
      if (attempt === maxRetries || !isRetriable(error)) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000;
      const reason = error?.response?.status ?? 'a network error';
      console.warn(`(GraphQL ${new URL(options.url).host}): attempt ${attempt}/${maxRetries} failed with ${reason}, retrying in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
