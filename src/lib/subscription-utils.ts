// Utility to fetch all subscriptions with pagination
export async function fetchAllSubscriptions(accessToken: string): Promise<unknown[]> {
  const allSubscriptions: unknown[] = [];
  let pageToken: string | undefined;
  
  do {
    const response = await fetch(
      `/api/youtube/subscriptions?accessToken=${accessToken}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch subscriptions');
    }
    
    const data = await response.json();
    
    if (data.items) {
      allSubscriptions.push(...data.items);
    }
    
    pageToken = data.nextPageToken;
  } while (pageToken && allSubscriptions.length < 1000); // Safety limit
  
  return allSubscriptions;
}