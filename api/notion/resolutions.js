// api/notion/resolutions.js
// Vercel Serverless Function for Notion API integration
// This file handles CORS and proxies requests to Notion

const NOTION_API = 'https://api.notion.com/v1';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check for required environment variables
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return res.status(500).json({ 
      error: 'Server configuration error',
      message: 'Notion API key or Database ID not configured'
    });
  }

  const headers = {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };

  try {
    // GET - Fetch all resolutions from Notion database
    if (req.method === 'GET') {
      const response = await fetch(
        `${NOTION_API}/databases/${NOTION_DATABASE_ID}/query`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sorts: [
              { property: 'Category', direction: 'ascending' },
              { property: 'Resolution', direction: 'ascending' }
            ]
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Notion API error:', error);
        return res.status(response.status).json({ error: 'Failed to fetch from Notion', details: error });
      }

      const data = await response.json();

      // Transform Notion data to our app format
      const resolutions = data.results.map(page => ({
        id: page.id,
        notionPageId: page.id,
        title: page.properties['Resolution']?.title?.[0]?.plain_text || 'Untitled',
        category: page.properties['Category']?.select?.name || 'Personal Growth',
        target: page.properties['Target']?.number || 0,
        current: page.properties['Current Progress']?.number || 0,
        unit: page.properties['Unit']?.select?.name || 'times',
        frequency: page.properties['Frequency']?.select?.name || 'weekly',
        streak: page.properties['Streak']?.number || 0,
        lastCheckin: page.properties['Last Check-in']?.date?.start || '',
      }));

      return res.status(200).json(resolutions);
    }

    // PATCH - Update a resolution
    if (req.method === 'PATCH') {
      const { pageId, updates } = req.body;

      if (!pageId) {
        return res.status(400).json({ error: 'pageId is required' });
      }

      // Build properties object based on what's being updated
      const properties = {};

      if (updates.current !== undefined) {
        properties['Current Progress'] = { number: updates.current };
      }

      if (updates.lastCheckin) {
        properties['Last Check-in'] = { 
          date: { start: updates.lastCheckin } 
        };
      }

      if (updates.streak !== undefined) {
        properties['Streak'] = { number: updates.streak };
      }

      if (updates.title) {
        properties['Resolution'] = { 
          title: [{ text: { content: updates.title } }] 
        };
      }

      if (updates.category) {
        properties['Category'] = { select: { name: updates.category } };
      }

      if (updates.target !== undefined) {
        properties['Target'] = { number: updates.target };
      }

      if (updates.unit) {
        properties['Unit'] = { select: { name: updates.unit } };
      }

      if (updates.frequency) {
        properties['Frequency'] = { select: { name: updates.frequency } };
      }

      const response = await fetch(`${NOTION_API}/pages/${pageId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ properties })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Notion update error:', error);
        return res.status(response.status).json({ error: 'Failed to update in Notion', details: error });
      }

      const data = await response.json();
      return res.status(200).json({ 
        success: true, 
        id: data.id,
        message: 'Resolution updated successfully' 
      });
    }

    // POST - Create a new resolution
    if (req.method === 'POST') {
      const { title, category, target, current, unit, frequency, streak, lastCheckin } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      const properties = {
        'Resolution': { 
          title: [{ text: { content: title } }] 
        },
        'Category': { 
          select: { name: category || 'Personal Growth' } 
        },
        'Target': { 
          number: target || 0 
        },
        'Current Progress': { 
          number: current || 0 
        },
        'Unit': { 
          select: { name: unit || 'times' } 
        },
        'Frequency': { 
          select: { name: frequency || 'weekly' } 
        },
        'Streak': { 
          number: streak || 0 
        },
      };

      // Only add date if provided
      if (lastCheckin) {
        properties['Last Check-in'] = { 
          date: { start: lastCheckin } 
        };
      }

      const response = await fetch(`${NOTION_API}/pages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          parent: { database_id: NOTION_DATABASE_ID },
          properties
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Notion create error:', error);
        return res.status(response.status).json({ error: 'Failed to create in Notion', details: error });
      }

      const data = await response.json();
      return res.status(201).json({ 
        success: true, 
        id: data.id,
        message: 'Resolution created successfully' 
      });
    }

    // DELETE - Archive a resolution (Notion doesn't truly delete)
    if (req.method === 'DELETE') {
      const { pageId } = req.body;

      if (!pageId) {
        return res.status(400).json({ error: 'pageId is required' });
      }

      const response = await fetch(`${NOTION_API}/pages/${pageId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ archived: true })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Notion archive error:', error);
        return res.status(response.status).json({ error: 'Failed to archive in Notion', details: error });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Resolution archived successfully' 
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
