const express = require('express');
const router = express.Router();
const Database = require('../services/database');

/**
 * Stats Dashboard - Show project statistics
 */
router.get('/', (req, res) => {
  try {
    const totalMatches = Database.getTotalMatches();
    const liveMatches = Database.getLiveMatchCount();
    const totalStreams = Database.getTotalStreams();
    const workingStreams = Database.getWorkingStreams();
    const recentMatches = Database.getRecentMatches(10);
    const topStreams = Database.getTopStreams(5);
    const leagueStats = Database.getLeagueStats();
    
    res.render('stats', {
      stats: {
        totalMatches,
        liveMatches,
        totalStreams,
        workingStreams,
        reliability: totalStreams > 0 ? Math.round((workingStreams / totalStreams) * 100) : 0
      },
      recentMatches,
      topStreams,
      leagueStats,
      pageTitle: 'Statistics'
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).send('Failed to load stats');
  }
});

/**
 * API: Get stats as JSON
 */
router.get('/api', (req, res) => {
  try {
    const totalMatches = Database.getTotalMatches();
    const liveMatches = Database.getLiveMatchCount();
    const totalStreams = Database.getTotalStreams();
    const workingStreams = Database.getWorkingStreams();
    
    res.json({
      totalMatches,
      liveMatches,
      totalStreams,
      workingStreams,
      reliability: totalStreams > 0 ? Math.round((workingStreams / totalStreams) * 100) : 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Stats API error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
