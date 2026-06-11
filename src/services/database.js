const fs = require('fs');
const path = require('path');

// ── JSON-backed data store (Vercel-compatible, no native addons) ──
const MATCHES_FILE = path.join(__dirname, '../../data/matches.json');
const STREAMS_FILE = path.join(__dirname, '../../data/streams.json');

let matches = [];
let streams = [];
let nextMatchId = 1;
let nextStreamId = 1;

function loadData() {
  try {
    const rawMatches = fs.readFileSync(MATCHES_FILE, 'utf8');
    matches = JSON.parse(rawMatches);
    nextMatchId = matches.length > 0 ? Math.max(...matches.map(m => m.id)) + 1 : 1;
  } catch (e) {
    console.log('⚠️  No matches.json found, starting empty');
    matches = [];
  }

  try {
    const rawStreams = fs.readFileSync(STREAMS_FILE, 'utf8');
    streams = JSON.parse(rawStreams);
    nextStreamId = streams.length > 0 ? Math.max(...streams.map(s => s.id)) + 1 : 1;
  } catch (e) {
    console.log('⚠️  No streams.json found, starting empty');
    streams = [];
  }
}

function init() {
  loadData();
  console.log(`✓ Database initialized (${matches.length} matches, ${streams.length} streams)`);
}

function getLiveMatches() {
  return matches.filter(m => m.status === 'live').sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
}

function getUpcomingMatches() {
  return matches.filter(m => m.status !== 'live').sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
}

function getMatchById(id) {
  return matches.find(m => m.id === id) || null;
}

function getStreamsByMatchId(matchId) {
  return streams
    .filter(s => s.match_id === matchId && s.is_working === 1)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));
}

function addMatch(homeTeam, awayTeam, league, matchDate, status = 'scheduled') {
  const match = {
    id: nextMatchId++,
    home_team: homeTeam,
    away_team: awayTeam,
    league,
    match_date: matchDate,
    status,
    created_at: new Date().toISOString()
  };
  matches.push(match);
  return { lastInsertRowid: match.id };
}

function addStream(matchId, sourceName, streamUrl, quality = 'HD', language = 'EN', type = 'link', note = '') {
  const stream = {
    id: nextStreamId++,
    match_id: matchId,
    source_name: sourceName,
    stream_url: streamUrl,
    quality,
    language,
    votes: 0,
    reports: 0,
    is_working: 1,
    type,
    note,
    created_at: new Date().toISOString()
  };
  streams.push(stream);
}

function voteStream(streamId, value = 1) {
  const stream = streams.find(s => s.id === streamId);
  if (stream) stream.votes = (stream.votes || 0) + value;
}

function reportStream(streamId, reason = '') {
  const stream = streams.find(s => s.id === streamId);
  if (stream) {
    stream.reports = (stream.reports || 0) + 1;
    if (reason) console.log(`Report for stream ${streamId}: ${reason}`);
  }
}

function clearOldMatches(hours = 3) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const oldIds = matches
    .filter(m => new Date(m.match_date) < cutoff && m.status === 'finished')
    .map(m => m.id);
  streams = streams.filter(s => !oldIds.includes(s.match_id));
  matches = matches.filter(m => !oldIds.includes(m.id));
}

// ── Stats helpers (used by stats route) ──
function getTotalMatches() {
  return matches.length;
}

function getLiveMatchCount() {
  return matches.filter(m => m.status === 'live').length;
}

function getTotalStreams() {
  return streams.length;
}

function getWorkingStreams() {
  return streams.filter(s => s.is_working === 1).length;
}

function getRecentMatches(limit = 10) {
  return matches
    .slice()
    .sort((a, b) => new Date(b.match_date) - new Date(a.match_date))
    .slice(0, limit)
    .map(m => ({
      ...m,
      stream_count: streams.filter(s => s.match_id === m.id).length
    }));
}

function getTopStreams(limit = 5) {
  return streams
    .filter(s => s.is_working === 1)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, limit)
    .map(s => {
      const match = matches.find(m => m.id === s.match_id);
      return {
        ...s,
        home_team: match ? match.home_team : 'Unknown',
        away_team: match ? match.away_team : 'Unknown'
      };
    });
}

function getLeagueStats() {
  const leagueMap = {};
  matches.forEach(m => {
    leagueMap[m.league] = (leagueMap[m.league] || 0) + 1;
  });
  return Object.entries(leagueMap)
    .map(([league, match_count]) => ({ league, match_count }))
    .sort((a, b) => b.match_count - a.match_count);
}

module.exports = {
  init,
  getLiveMatches,
  getUpcomingMatches,
  getMatchById,
  getStreamsByMatchId,
  addMatch,
  addStream,
  voteStream,
  reportStream,
  clearOldMatches,
  getTotalMatches,
  getLiveMatchCount,
  getTotalStreams,
  getWorkingStreams,
  getRecentMatches,
  getTopStreams,
  getLeagueStats
};
