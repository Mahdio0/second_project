const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/user/summaries
 * Returns all saved summaries for the authenticated user, newest first.
 */
router.get('/summaries', async (req, res) => {
  const { data, error } = await supabase
    .from('summaries')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch summaries error:', error);
    return res.status(500).json({ error: 'Could not fetch summaries.' });
  }

  res.json({ summaries: data });
});

/**
 * POST /api/user/summaries
 * Saves a new summary for the authenticated user.
 * Body: { videoId, videoUrl, title, summary, mindmap? }
 */
router.post('/summaries', async (req, res) => {
  const { videoId, videoUrl, title, summary, mindmap } = req.body;

  if (!videoId || !summary) {
    return res.status(400).json({ error: 'videoId and summary are required.' });
  }

  const { data, error } = await supabase
    .from('summaries')
    .insert([
      {
        user_id: req.user.id,
        video_id: videoId,
        video_url: videoUrl || null,
        title: title || 'Untitled Video',
        summary,
        mindmap: mindmap || null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Save summary error:', error);
    return res.status(500).json({ error: 'Could not save summary.' });
  }

  res.status(201).json({ summary: data });
});

/**
 * DELETE /api/user/summaries/:id
 * Deletes a summary by its row ID — only if it belongs to the current user.
 */
router.delete('/summaries/:id', async (req, res) => {
  const { error } = await supabase
    .from('summaries')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) {
    console.error('Delete summary error:', error);
    return res.status(500).json({ error: 'Could not delete summary.' });
  }

  res.json({ message: 'Summary deleted.' });
});

module.exports = router;
