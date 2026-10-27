(function (root) {
  'use strict';

  var KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var FILES = 'abcdefgh';

  function colorOf(p) { return p === p.toUpperCase() ? 'w' : 'b'; }

  function initialState() {
    var b = new Array(64).fill('');
    var back = 'RNBQKBNR';
    for (var c = 0; c < 8; c++) {
      b[c] = back[c].toLowerCase();
      b[8 + c] = 'p';
      b[48 + c] = 'P';
      b[56 + c] = back[c];
    }
    return { board: b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, full: 1 };
  }

  function fromFEN(fen) {
    var parts = fen.trim().split(/\s+/);
    var b = new Array(64).fill('');
    var i = 0;
    for (var k = 0; k < parts[0].length; k++) {
      var ch = parts[0][k];
      if (ch === '/') continue;
      if (/\d/.test(ch)) i += +ch; else b[i++] = ch;
    }
    var cs = parts[2] || '-';
    var ep = -1;
    if (parts[3] && parts[3] !== '-') ep = (8 - parseInt(parts[3][1], 10)) * 8 + FILES.indexOf(parts[3][0]);
    return {
      board: b, turn: parts[1] || 'w',
      castle: { K: cs.indexOf('K') >= 0, Q: cs.indexOf('Q') >= 0, k: cs.indexOf('k') >= 0, q: cs.indexOf('q') >= 0 },
      ep: ep, half: +(parts[4] || 0), full: +(parts[5] || 1)
    };
  }

  // Is square sq attacked by pieces of colour `by`?
  function attacked(b, sq, by) {
    var r = sq >> 3, c = sq & 7, up = by === 'w', i, dr, dc, rr, cc;
    var pr = up ? r + 1 : r - 1;
    var P = up ? 'P' : 'p';
    if (pr >= 0 && pr < 8) {
      for (i = -1; i <= 1; i += 2) {
        cc = c + i;
        if (cc >= 0 && cc < 8 && b[pr * 8 + cc] === P) return true;
      }
    }
    var N = up ? 'N' : 'n', K = up ? 'K' : 'k';
    for (i = 0; i < 8; i++) {
      rr = r + KN[i][0]; cc = c + KN[i][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === N) return true;
      rr = r + KG[i][0]; cc = c + KG[i][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === K) return true;
    }
    var Q = up ? 'Q' : 'q', B = up ? 'B' : 'b', R = up ? 'R' : 'r', p;
    for (i = 0; i < 4; i++) {
      dr = DIAG[i][0]; dc = DIAG[i][1]; rr = r + dr; cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = b[rr * 8 + cc];
        if (p) { if (p === B || p === Q) return true; break; }
        rr += dr; cc += dc;
      }
      dr = ORTH[i][0]; dc = ORTH[i][1]; rr = r + dr; cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = b[rr * 8 + cc];
        if (p) { if (p === R || p === Q) return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  }

  function kingAttacked(b, color) {
    var sq = b.indexOf(color === 'w' ? 'K' : 'k');
    if (sq < 0) return false;
    return attacked(b, sq, color === 'w' ? 'b' : 'w');
  }

  function pseudoMoves(s) {
    var b = s.board, t = s.turn, out = [];
    function addPawn(from, to, promo) {
      if (promo) {
        out.push({ from: from, to: to, promo: 'q' }, { from: from, to: to, promo: 'r' },
          { from: from, to: to, promo: 'b' }, { from: from, to: to, promo: 'n' });
      } else out.push({ from: from, to: to });
    }
    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (!p || colorOf(p) !== t) continue;
      var r = i >> 3, c = i & 7, type = p.toLowerCase(), k, rr, cc, to, tp;
      if (type === 'p') {
        var dir = t === 'w' ? -1 : 1, startRow = t === 'w' ? 6 : 1, promoRow = t === 'w' ? 0 : 7;
        var r1 = r + dir;
        if (r1 >= 0 && r1 < 8) {
          if (!b[r1 * 8 + c]) {
            addPawn(i, r1 * 8 + c, r1 === promoRow);
            if (r === startRow && !b[(r + 2 * dir) * 8 + c]) out.push({ from: i, to: (r + 2 * dir) * 8 + c, flag: 'double' });
          }
          for (k = -1; k <= 1; k += 2) {
            cc = c + k;
            if (cc < 0 || cc > 7) continue;
            to = r1 * 8 + cc; tp = b[to];
            if (tp && colorOf(tp) !== t) addPawn(i, to, r1 === promoRow);
            else if (!tp && to === s.ep) out.push({ from: i, to: to, flag: 'ep' });
          }
        }
      } else if (type === 'n' || type === 'k') {
        var steps = type === 'n' ? KN : KG;
        for (k = 0; k < 8; k++) {
          rr = r + steps[k][0]; cc = c + steps[k][1];
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          to = rr * 8 + cc; tp = b[to];
          if (!tp || colorOf(tp) !== t) out.push({ from: i, to: to });
        }
        if (type === 'k') {
          var opp = t === 'w' ? 'b' : 'w';
          if (t === 'w' && i === 60) {
            if (s.castle.K && b[63] === 'R' && !b[61] && !b[62] && !attacked(b, 60, opp) && !attacked(b, 61, opp))
              out.push({ from: 60, to: 62, flag: 'castleK' });
            if (s.castle.Q && b[56] === 'R' && !b[57] && !b[58] && !b[59] && !attacked(b, 60, opp) && !attacked(b, 59, opp))
              out.push({ from: 60, to: 58, flag: 'castleQ' });
          } else if (t === 'b' && i === 4) {
            if (s.castle.k && b[7] === 'r' && !b[5] && !b[6] && !attacked(b, 4, opp) && !attacked(b, 5, opp))
              out.push({ from: 4, to: 6, flag: 'castleK' });
            if (s.castle.q && b[0] === 'r' && !b[1] && !b[2] && !b[3] && !attacked(b, 4, opp) && !attacked(b, 3, opp))
              out.push({ from: 4, to: 2, flag: 'castleQ' });
          }
        }
      } else {
        var dirs = type === 'b' ? DIAG : type === 'r' ? ORTH : DIAG.concat(ORTH);
        for (k = 0; k < dirs.length; k++) {
          var dr = dirs[k][0], dc = dirs[k][1];
          rr = r + dr; cc = c + dc;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            to = rr * 8 + cc; tp = b[to];
            if (!tp) out.push({ from: i, to: to });
            else { if (colorOf(tp) !== t) out.push({ from: i, to: to }); break; }
            rr += dr; cc += dc;
          }
        }
      }
    }
    return out;
  }

  function applyMove(s, m) {
    var b = s.board.slice(), p = b[m.from], t = s.turn, captured = b[m.to];
    b[m.to] = p; b[m.from] = '';
    if (m.flag === 'ep') b[m.to + (t === 'w' ? 8 : -8)] = '';
    if (m.promo) b[m.to] = t === 'w' ? m.promo.toUpperCase() : m.promo.toLowerCase();
    if (m.flag === 'castleK') {
      if (t === 'w') { b[61] = b[63]; b[63] = ''; } else { b[5] = b[7]; b[7] = ''; }
    } else if (m.flag === 'castleQ') {
      if (t === 'w') { b[59] = b[56]; b[56] = ''; } else { b[3] = b[0]; b[0] = ''; }
    }
    var castle = { K: s.castle.K, Q: s.castle.Q, k: s.castle.k, q: s.castle.q };
    if (p === 'K') { castle.K = false; castle.Q = false; }
    if (p === 'k') { castle.k = false; castle.q = false; }
    if (m.from === 63 || m.to === 63) castle.K = false;
    if (m.from === 56 || m.to === 56) castle.Q = false;
    if (m.from === 7 || m.to === 7) castle.k = false;
    if (m.from === 0 || m.to === 0) castle.q = false;
    return {
      board: b, turn: t === 'w' ? 'b' : 'w', castle: castle,
      ep: m.flag === 'double' ? (m.from + m.to) / 2 : -1,
      half: (p.toLowerCase() === 'p' || captured || m.flag === 'ep') ? 0 : s.half + 1,
      full: s.full + (t === 'b' ? 1 : 0)
    };
  }

  function legalMoves(s) {
    var t = s.turn;
    return pseudoMoves(s).filter(function (m) {
      return !kingAttacked(applyMove(s, m).board, t);
    });
  }

  function inCheck(s) { return kingAttacked(s.board, s.turn); }

  function insufficient(s) {
    var minors = [], i, p;
    for (i = 0; i < 64; i++) {
      p = s.board[i];
      if (!p) continue;
      var lt = p.toLowerCase();
      if (lt === 'k') continue;
      if (lt === 'p' || lt === 'r' || lt === 'q') return false;
      minors.push({ t: lt, sq: ((i >> 3) + (i & 7)) & 1 });
    }
    if (minors.length <= 1) return true;
    var allB = minors.every(function (x) { return x.t === 'b'; });
    return allB && minors.every(function (x) { return x.sq === minors[0].sq; });
  }

  function status(s) {
    if (!legalMoves(s).length) {
      return inCheck(s) ? { over: true, type: 'checkmate', winner: s.turn === 'w' ? 'b' : 'w' } : { over: true, type: 'stalemate' };
    }
    if (insufficient(s)) return { over: true, type: 'insufficient' };
    if (s.half >= 100) return { over: true, type: 'fifty' };
    return { over: false };
  }

  function sqName(i) { return FILES[i & 7] + (8 - (i >> 3)); }

  function toSAN(s, m) {
    var p = s.board[m.from], type = p.toUpperCase(), san = '';
    if (m.flag === 'castleK') san = 'O-O';
    else if (m.flag === 'castleQ') san = 'O-O-O';
    else {
      var capture = s.board[m.to] || m.flag === 'ep';
      if (type === 'P') {
        if (capture) san += FILES[m.from & 7];
      } else {
        san += type;
        var others = legalMoves(s).filter(function (o) {
          return o.from !== m.from && o.to === m.to && s.board[o.from] === p;
        });
        if (others.length) {
          var sameFile = others.some(function (o) { return (o.from & 7) === (m.from & 7); });
          var sameRank = others.some(function (o) { return (o.from >> 3) === (m.from >> 3); });
          if (!sameFile) san += FILES[m.from & 7];
          else if (!sameRank) san += (8 - (m.from >> 3));
          else san += sqName(m.from);
        }
      }
      if (capture) san += 'x';
      san += sqName(m.to);
      if (m.promo) san += '=' + m.promo.toUpperCase();
    }
    var ns = applyMove(s, m);
    if (!legalMoves(ns).length) { if (inCheck(ns)) san += '#'; }
    else if (inCheck(ns)) san += '+';
    return san;
  }

  function perft(s, d) {
    if (d === 0) return 1;
    var ms = legalMoves(s);
    if (d === 1) return ms.length;
    var n = 0;
    for (var i = 0; i < ms.length; i++) n += perft(applyMove(s, ms[i]), d - 1);
    return n;
  }

  /* ---------------- AI ---------------- */
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  var PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
  };
  var INF = 1e9, MATE = 100000, TIMEOUT = { timeout: true };
  var nodes = 0, deadline = 0;

  function centerDist(sq) {
    var r = sq >> 3, c = sq & 7;
    return Math.max(3 - r, r - 4) + Math.max(3 - c, c - 4);
  }
  function mopUp(own, enemy) {
    var d = Math.abs((own >> 3) - (enemy >> 3)) + Math.abs((own & 7) - (enemy & 7));
    return 10 * centerDist(enemy) + 4 * (14 - d);
  }

  function evaluate(s) {
    var b = s.board, sc = 0, wm = 0, bm = 0, wk = -1, bk = -1;
    for (var i = 0; i < 64; i++) {
      var p = b[i];
      if (!p) continue;
      var lt = p.toLowerCase(), w = p === p.toUpperCase();
      var v = VAL[lt] + PST[lt][w ? i : i ^ 56];
      if (lt === 'k') { if (w) wk = i; else bk = i; }
      else if (lt !== 'p') { if (w) wm += VAL[lt]; else bm += VAL[lt]; }
      sc += w ? v : -v;
    }
    if (bm === 0 && wm >= 500 && wk >= 0 && bk >= 0) sc += mopUp(wk, bk);
    if (wm === 0 && bm >= 500 && wk >= 0 && bk >= 0) sc -= mopUp(bk, wk);
    return s.turn === 'w' ? sc : -sc;
  }

  function orderMoves(s, moves) {
    var b = s.board;
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i], sc = 0, cap = b[m.to];
      if (cap) sc = 1000 + 10 * VAL[cap.toLowerCase()] - VAL[b[m.from].toLowerCase()];
      else if (m.flag === 'ep') sc = 1900;
      if (m.promo) sc += 800 + VAL[m.promo];
      m.score = sc;
    }
    return moves.sort(function (a, c) { return c.score - a.score; });
  }

  function tick() {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw TIMEOUT;
  }

  function quiesce(s, alpha, beta, qd) {
    tick();
    var stand = evaluate(s);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qd >= 6) return alpha;
    var b = s.board;
    var caps = pseudoMoves(s).filter(function (m) { return b[m.to] || m.flag === 'ep' || m.promo; });
    orderMoves(s, caps);
    for (var i = 0; i < caps.length; i++) {
      var ns = applyMove(s, caps[i]);
      if (kingAttacked(ns.board, s.turn)) continue;
      var sc = -quiesce(ns, -beta, -alpha, qd + 1);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function search(s, depth, alpha, beta, ply) {
    if (depth <= 0) return quiesce(s, alpha, beta, 0);
    tick();
    var moves = orderMoves(s, pseudoMoves(s)), legalCount = 0;
    for (var i = 0; i < moves.length; i++) {
      var ns = applyMove(s, moves[i]);
      if (kingAttacked(ns.board, s.turn)) continue;
      legalCount++;
      var sc = -search(ns, depth - 1, -beta, -alpha, ply + 1);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    if (!legalCount) return kingAttacked(s.board, s.turn) ? -MATE + ply : 0;
    return alpha;
  }

  function searchRoot(s, moves, depth, noise) {
    var alpha = -INF, best = null;
    for (var i = 0; i < moves.length; i++) {
      var ns = applyMove(s, moves[i]), sc;
      if (noise) sc = -search(ns, depth - 1, -INF, INF, 1) + (Math.random() * 2 - 1) * noise;
      else sc = -search(ns, depth - 1, -INF, -alpha, 1);
      if (best === null || sc > alpha) { alpha = sc; best = moves[i]; }
    }
    return best;
  }

  // opts: { depth, time (ms), noise }
  function bestMove(s, opts) {
    nodes = 0;
    deadline = Date.now() + (opts.time || 1000);
    var moves = orderMoves(s, legalMoves(s));
    if (!moves.length) return null;
    if (moves.length === 1) return moves[0];
    var best = moves[0];
    for (var d = 1; d <= opts.depth; d++) {
      try {
        best = searchRoot(s, moves, d, opts.noise || 0);
        moves = [best].concat(moves.filter(function (m) { return m !== best; }));
      } catch (e) {
        if (e === TIMEOUT) break;
        throw e;
      }
    }
    return best;
  }

  root.ChessEngine = {
    initialState: initialState, fromFEN: fromFEN, legalMoves: legalMoves, applyMove: applyMove,
    inCheck: inCheck, status: status, toSAN: toSAN, bestMove: bestMove, perft: perft, colorOf: colorOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
