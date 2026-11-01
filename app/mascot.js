// Bo the Bull: the app's mascot. Moods: happy, cheer, think, gentle.
function bo(mood = 'happy', size = 72) {
  const eyes = {
    happy: '<ellipse cx="47" cy="56" rx="7" ry="8" fill="#fff"/><ellipse cx="73" cy="56" rx="7" ry="8" fill="#fff"/><circle cx="48" cy="57" r="4.2" fill="#1b1b24"/><circle cx="72" cy="57" r="4.2" fill="#1b1b24"/><circle cx="49.5" cy="55" r="1.5" fill="#fff"/><circle cx="73.5" cy="55" r="1.5" fill="#fff"/>',
    cheer: '<path d="M40 58q7-8 14 0" stroke="#1b1b24" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M66 58q7-8 14 0" stroke="#1b1b24" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
    think: '<ellipse cx="47" cy="56" rx="7" ry="8" fill="#fff"/><ellipse cx="73" cy="56" rx="7" ry="8" fill="#fff"/><circle cx="50" cy="53.5" r="4" fill="#1b1b24"/><circle cx="76" cy="53.5" r="4" fill="#1b1b24"/><path d="M40 45l12-2M68 43l12 2" stroke="#5a3624" stroke-width="2.4" stroke-linecap="round"/>',
    gentle: '<ellipse cx="47" cy="57" rx="7" ry="7.5" fill="#fff"/><ellipse cx="73" cy="57" rx="7" ry="7.5" fill="#fff"/><circle cx="47" cy="58" r="4.2" fill="#1b1b24"/><circle cx="73" cy="58" r="4.2" fill="#1b1b24"/><circle cx="48.5" cy="56.3" r="1.4" fill="#fff"/><circle cx="74.5" cy="56.3" r="1.4" fill="#fff"/><path d="M40 46l11 3M80 46l-11 3" stroke="#5a3624" stroke-width="2.4" stroke-linecap="round"/>',
  }[mood] || '';
  const mouth = {
    happy: '<path d="M54 83q6 5 12 0" stroke="#7a3b2e" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    cheer: '<path d="M52 81q8 10 16 0z" fill="#7a3b2e"/><path d="M56 85q4 3 8 0" fill="#e8838b"/>',
    think: '<ellipse cx="62" cy="84" rx="3" ry="2.4" fill="#7a3b2e"/>',
    gentle: '<path d="M55 84q5 3 10 0" stroke="#7a3b2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  }[mood] || '';
  const extra = mood === 'cheer' ? '<path d="M14 30l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#d4a72c"/><path d="M104 20l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#d4a72c"/>' : mood === 'think' ? '<circle cx="100" cy="26" r="3" fill="#9aa6b8"/><circle cx="108" cy="16" r="4.5" fill="#9aa6b8"/>' : '';
  return `<svg class="bo-svg bo-${mood}" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="Bo the Bull, ${mood}">
    ${extra}
    <path d="M30 40c-14-4-20-16-17-26 6 8 14 12 24 13z" fill="#efe3c6"/><path d="M90 40c14-4 20-16 17-26-6 8-14 12-24 13z" fill="#efe3c6"/>
    <ellipse cx="24" cy="52" rx="13" ry="7" transform="rotate(-20 24 52)" fill="#7b4a30"/><ellipse cx="96" cy="52" rx="13" ry="7" transform="rotate(20 96 52)" fill="#7b4a30"/>
    <path d="M38 104c0-10 10-16 22-16s22 6 22 16v8H38z" fill="#1f3a63"/><path d="M52 88l8 12 8-12z" fill="#fff"/><path d="M58 92h4l2 4-2 14h-4l-2-14z" fill="#b4373a"/>
    <rect x="30" y="30" width="60" height="62" rx="28" fill="#8b5a3c"/>
    <path d="M47 31c4 6 22 6 26 0-6-4-20-4-26 0z" fill="#6e432c"/>
    ${eyes}
    <ellipse cx="60" cy="78" rx="19" ry="13" fill="#f0c9a8"/><ellipse cx="53" cy="76" rx="2.6" ry="3.2" fill="#9c5f4c"/><ellipse cx="67" cy="76" rx="2.6" ry="3.2" fill="#9c5f4c"/>
    ${mouth}
    <circle cx="38" cy="70" r="4.5" fill="#e8838b" opacity=".45"/><circle cx="82" cy="70" r="4.5" fill="#e8838b" opacity=".45"/>
  </svg>`;
}
function boSays(mood, text, size = 64) {
  return `<div class="bo"><div class="bo-fig">${bo(mood, size)}</div><div class="bo-bubble">${text}</div></div>`;
}
function boLine(kind, ctx = {}) {
  const L = {
    home_queue: [`${ctx.n} cards on deck today. Let's get your reps in.`, 'Consistency beats cramming. Start with today\'s reps.', `${ctx.n} cards ready. Fifteen focused minutes goes a long way.`],
    home_streak: [`${ctx.streak} days in a row. Keep the streak alive.`, `Day ${ctx.streak}. This is how Superday-ready happens.`],
    home_goal: ['Daily goal done. That\'s how analysts are made.', 'Goal hit for today. Nice, steady work.'],
    home_clear: ['All caught up. A quick mock interview keeps you sharp.', 'Nothing due right now. Try a new lesson on the path.'],
    done_good: ['Great session. Those answers are getting interview-ready.', 'Strong work. See you at the next review.'],
    done_ok: ['Good session. The tricky ones will come back soon.', 'Every rep counts. Same time tomorrow?'],
    auth: ['Hi, I\'m Bo. I\'ll help you get interview-ready, one rep at a time.'],
  }[kind] || [''];
  return L[Math.floor(Math.random() * L.length)];
}
