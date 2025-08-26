const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    keys: {
      openai: !!process.env.OPENAI_API_KEY,
      ideogram: !!process.env.IDEOGRAM_API_KEY
    }
  });
});

// OpenAI proxy endpoint
app.post('/api/openai/chat', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'gpt-3.5-turbo',
        messages,
        response_format: options.response_format || { type: 'json_object' },
        ...options
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return res.status(response.status).json({ error: 'OpenAI API request failed' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('OpenAI proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ideogram proxy endpoint
app.post('/api/ideogram/generate', async (req, res) => {
  try {
    const { prompt, aspect_ratio = 'ASPECT_1_1' } = req.body;
    
    if (!process.env.IDEOGRAM_API_KEY) {
      return res.status(500).json({ error: 'Ideogram API key not configured' });
    }

    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Api-Key': process.env.IDEOGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_request: {
          prompt,
          aspect_ratio,
          model: 'V_2',
          magic_prompt_option: 'AUTO'
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Ideogram API error:', error);
      return res.status(response.status).json({ error: 'Ideogram API request failed' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Ideogram proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Secure API proxy server running on port ${PORT}`);
  console.log(`🔑 Keys configured: OpenAI=${!!process.env.OPENAI_API_KEY}, Ideogram=${!!process.env.IDEOGRAM_API_KEY}`);
});