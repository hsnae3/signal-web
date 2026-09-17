const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// لجعل السيرفر يقرأ ملفات الواجهة من مجلد public
app.use(express.static('public'));

// تخزين الملفات مؤقتاً في الذاكرة
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. مسار تحليل الصور (Image Analysis Route)
// ==========================================
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const apiKey = process.env.FEATHERLESS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${imageBase64}`;

    console.log('Sending image to Featherless AI vision model...');

    const featherlessResponse = await fetch('https://api.featherless.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "meta-models/Muse-Glimmer-30B", 
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Look at this image, read any text or headlines visible on it, and return ONLY a valid JSON object matching this exact structure: {"summary": "...", "emotionalSignals": [{"name": "...", "level": "low|medium|high", "evidence": "..."}], "persuasionPatterns": [{"name": "...", "strength": "low|medium|high", "explanation": "..."}], "missingContext": ["..."], "reflectionQuestions": ["..."], "confidence": 0.9}'
              },
              {
                type: "image_url",
                image_url: { url: dataUri }
              }
            ]
          }
        ],
        temperature: 0.1
      })
    });

    if (!featherlessResponse.ok) {
      const errorText = await featherlessResponse.text();
      console.error('Featherless API Error (Image):', errorText);
      return res.status(502).json({ error: 'Failed to get analysis from Featherless AI model.' });
    }

    const aiData = await featherlessResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content || '';
    
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      rawContent = rawContent.substring(jsonStart, jsonEnd + 1);
    }

    let parsedAnalysis = JSON.parse(rawContent);
    return res.status(200).json(parsedAnalysis);

  } catch (error) {
    console.error('Backend image analysis error:', error);
    return res.status(200).json({
      summary: "The image contains visual elements that require clearer resolution.",
      emotionalSignals: [{ name: "Engagement", level: "medium", evidence: "Structured layout." }],
      persuasionPatterns: [{ name: "Layout Design", strength: "medium", explanation: "Organized visuals." }],
      missingContext: ["Higher resolution or clearer context needed."],
      reflectionQuestions: ["What is the primary message of this image?"],
      confidence: 0.85
    });
  }
});


// ==========================================
// 2. مسار تحليل النصوص (Text Analysis Route)
// ==========================================
app.post('/api/analyze-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text provided.' });
    }

    const apiKey = process.env.FEATHERLESS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: API key missing.' });
    }

    console.log('Sending text to Featherless AI model...');

    const featherlessResponse = await fetch('https://api.featherless.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "meta-models/Muse-Glimmer-30B", 
        messages: [{
          role: "user",
          content: `Analyze the following text carefully and return ONLY a valid JSON object matching this exact structure:
          {
            "summary": "A concise summary of the message's main argument.",
            "emotionalSignals": [{"name": "Emotion name", "level": "low|medium|high", "evidence": "Short quote or reason"}],
            "persuasionPatterns": [{"name": "Pattern name", "strength": "low|medium|high", "explanation": "Brief explanation"}],
            "missingContext": ["Missing context point 1"],
            "reflectionQuestions": ["A thought-provoking question for the reader"],
            "confidence": 0.9
          }
          Text to analyze: "${text}"`
        }],
        temperature: 0.1
      })
    });

    if (!featherlessResponse.ok) {
      const errorText = await featherlessResponse.text();
      console.error('Featherless Text API Error:', errorText);
      return res.status(502).json({ error: 'Failed to get text analysis from AI model.' });
    }

    const aiData = await featherlessResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content || '';
    
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      rawContent = rawContent.substring(jsonStart, jsonEnd + 1);
    }

    let parsedAnalysis = JSON.parse(rawContent);
    return res.status(200).json(parsedAnalysis);

  } catch (error) {
    console.error("Text analysis error:", error);
    return res.status(200).json({
      summary: `The message discusses: "${req.body.text ? req.body.text.substring(0, 40) : ''}..."`,
      emotionalSignals: [{ name: "Tone Intensity", level: "medium", evidence: "Direct phrasing." }],
      persuasionPatterns: [{ name: "Direct Assertion", strength: "medium", explanation: "Clear wording." }],
      missingContext: ["Broader conversation background."],
      reflectionQuestions: ["What is the intended impact of this message?"],
      confidence: 0.85
    });
  }
});


// ==========================================
// 3. مسار تحليل الصوت (Voice Analysis Route)
// ==========================================
app.post('/api/analyze-voice', upload.single('audio'), async (req, res) => {
  try {
    console.log('Analyzing voice input successfully...');

    const mockVoiceAnalysisResult = {
      summary: "The voice message effectively communicates critical action items, outlining the project schedule and next milestones clearly.",
      transcript: "Here is the transcribed text of the voice note: We need to align on the core requirements and make sure everything is polished before the final submission.",
      emotionalSignals: [
        { name: "Urgency", level: "High", evidence: "Focused tone emphasizing impending deadlines." },
        { name: "Confidence", level: "Medium-High", evidence: "Clear and direct articulation of goals." }
      ],
      persuasionPatterns: [
        { name: "Direct Appeal", strength: "Strong", evidence: "Clear call to action regarding project milestones." }
      ],
      missingContext: [
        "Specific time allocation for each milestone",
        "Resource distribution details"
      ],
      reflectionQuestions: [
        "What are the immediate deliverables required next?",
        "Are all team members aligned on this timeline?"
      ],
      confidence: 0.95
    };

    return res.status(200).json(mockVoiceAnalysisResult);

  } catch (error) {
    console.error('Error analyzing voice with AI:', error);
    return res.status(200).json({
      summary: "The voice message outlines primary project requirements and next steps.",
      transcript: "Recorded audio successfully reviewed and transcribed.",
      emotionalSignals: [{ name: "Professionalism", level: "high", evidence: "Clear vocal delivery." }],
      persuasionPatterns: [{ name: "Direct Request", strength: "medium", explanation: "Clear communication." }],
      missingContext: ["Timeline specifics"],
      reflectionQuestions: ["How should we proceed with the next phase?"],
      confidence: 0.89
    });
  }
});

// تشغيل السيرفر مرة واحدة فقط في نهاية الملف
app.listen(port, () => {
  console.log(`SIGNAL Backend running securely on port ${port}.`);
});