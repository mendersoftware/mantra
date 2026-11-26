export const gql = String.raw;

export const request = async ({ url, document, variables = {}, requestHeaders = {} }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...requestHeaders },
    body: JSON.stringify({ query: document, variables })
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`GraphQL request to ${url} failed: ${response.status} ${response.statusText} (non-JSON response)`);
  }
  const { data, errors } = result;
  if (!response.ok || errors?.length) {
    const details = errors?.length ? errors.map(({ message }) => message).join('; ') : `${response.status} ${response.statusText}`;
    throw new Error(`GraphQL request to ${url} failed: ${details}`);
  }
  return data;
};
