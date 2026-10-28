const themeButtons = document.querySelectorAll('[data-theme-choice]');
const views = document.querySelectorAll('.view');
let currentClass = 'running';

const classData = {
  running: {
    title: 'Running Class', level: 'Level 24', xp: '720 / 1,000 lifetime XP', best: 'Fastest 5K', bestLevel: 'Level 50', rarest: 'Long Haul', rarestDetail: 'Earned by 8% of runners',
    skills: [
      { category: 'SPEED', title: 'Fastest 1K', icon: 'icon-speed', level: 'Level 14', currentValue: '5:28', nextValue: '5:10', progress: 48 },
      { category: 'SPEED', title: 'Fastest 5K', icon: 'icon-speed', level: 'Level 50', currentValue: '27:14', nextValue: '26:30', progress: 72 },
      { category: 'SPEED', title: 'Fastest 10K', icon: 'icon-speed', level: 'Level 34', currentValue: '58:42', nextValue: '57:30', progress: 56 },
      { category: 'ENDURANCE', title: 'Fastest Half Marathon', icon: 'icon-endurance', level: 'Level 27', currentValue: '2:11:08', nextValue: '2:05:00', progress: 44 },
      { category: 'ENDURANCE', title: 'Fastest Marathon', icon: 'icon-endurance', locked: 'Complete a marathon to unlock' }
    ],
    achievements: [
      { icon: '*', category: 'SPEED', title: '30 Minute 5K', detail: 'Run 5K in under 30 minutes.', status: 'Earned' },
      { icon: '+', category: 'DISTANCE', title: 'Long Haul', detail: 'Log 500 lifetime running kilometers.', status: 'Earned' },
      { icon: '~', category: 'ENDURANCE', title: '3 Hour Marathon', detail: 'Complete a marathon in under 3 hours.', status: 'Locked' },
      { icon: '!', category: 'CONSISTENCY', title: 'Run the Month', detail: 'Complete 12 running activities in one month.', status: 'Locked' }
    ]
  },
  strength: {
    title: 'Strength Class', level: 'Level 12', xp: '180 / 400 lifetime XP', best: 'Bench Press', bestLevel: 'Level 42', rarest: 'Iron Will', rarestDetail: 'Earned by 11% of lifters',
    skills: [
      { category: 'POWER', title: 'Bench press', icon: 'icon-strength', level: 'Level 42', currentValue: '185 lb', nextValue: '200 lb', progress: 82 },
      { category: 'POWER', title: 'Deadlift', icon: 'icon-strength', locked: 'Record a one-rep max to unlock' },
      { category: 'POWER', title: 'Squat', icon: 'icon-strength', locked: 'Record a one-rep max to unlock' }
    ],
    achievements: [
      { icon: '+', category: 'POWER', title: 'One Plate Club', detail: 'Bench press 135 lb.', status: 'Earned' },
      { icon: '*', category: 'CONSISTENCY', title: 'Four Week Forge', detail: 'Train strength every week for a month.', status: 'Earned' },
      { icon: '!', category: 'POWER', title: 'Double Plate', detail: 'Bench press 225 lb.', status: 'Locked' },
      { icon: '~', category: 'VOLUME', title: 'Volume King', detail: 'Lift 100,000 lb in one month.', status: 'Locked' }
    ]
  },
  cycling: {
    title: 'Cycling Class', level: 'Level 11', xp: '300 / 1,000 lifetime XP', best: 'Fastest 20K', bestLevel: 'Level 24', rarest: 'Century Rider', rarestDetail: 'Earned by 6% of cyclists',
    skills: [
      { category: 'SPEED', title: 'Fastest 5K', icon: 'icon-speed', level: 'Level 12', currentValue: '8:42', nextValue: '8:20', progress: 38 },
      { category: 'SPEED', title: 'Fastest 20K', icon: 'icon-speed', level: 'Level 24', currentValue: '34:12', nextValue: '33:30', progress: 58 },
      { category: 'SPEED', title: 'Fastest 50K', icon: 'icon-speed', locked: 'Complete a 50 km effort to unlock' },
      { category: 'ENDURANCE', title: 'Fastest 75K', icon: 'icon-endurance', locked: 'Complete a 75 km effort to unlock' },
      { category: 'ENDURANCE', title: 'Fastest 100K', icon: 'icon-endurance', locked: 'Complete a 100 km effort to unlock' }
    ],
    achievements: [
      { icon: '~', category: 'DISTANCE', title: 'Century Rider', detail: 'Complete a 100 km ride.', status: 'Earned' },
      { icon: '+', category: 'CONSISTENCY', title: 'Chain Reaction', detail: 'Ride on seven days in one month.', status: 'Earned' },
      { icon: '!', category: 'CLIMBING', title: 'Mountain Goat', detail: 'Climb 2,000 m in a single ride.', status: 'Locked' },
      { icon: '*', category: 'SPEED', title: 'Breakaway', detail: 'Ride 20 km in under 30 minutes.', status: 'Locked' }
    ]
  },
};

function skillCard(skill) {
  if (skill.locked) return `<article class="subskill-card locked-skill"><div class="subskill-header"><div class="subskill-icon"><svg><use href="#${skill.icon}"></use></svg></div><div class="subskill-copy"><p class="eyebrow">${skill.category}</p><h3>${skill.title}</h3></div><div class="subskill-stat"><strong>Locked</strong></div></div><div class="skill-divider"></div><p class="locked-copy">${skill.locked}</p></article>`;
  return `<article class="subskill-card"><div class="subskill-header"><div class="subskill-icon"><svg><use href="#${skill.icon}"></use></svg></div><div class="subskill-copy"><p class="eyebrow">${skill.category}</p><h3>${skill.title}</h3></div></div><div class="skill-divider"></div><div class="subskill-level"><span>${skill.level}</span></div><div class="skill-progress"><div class="meter-row"><span class="meter-step" aria-hidden="true">−</span><div class="meter"><span style="width:${skill.progress}%"></span></div><span class="meter-step" aria-hidden="true">+</span></div><div class="metric-row"><span>${skill.currentValue}</span><b>${skill.nextValue}</b></div></div><div class="subskill-actions"><button class="text-button" data-view="leaderboard"><svg><use href="#icon-ranks"></use></svg>Ranks</button><button class="text-button" data-view="history"><svg><use href="#icon-history"></use></svg>History</button></div></article>`;
}

function achievementCard(achievement) {
  const locked = achievement.status === 'Locked' ? ' locked-skill' : '';
  return `<article class="achievement-card${locked}"><div class="achievement-mark">${achievement.icon}</div><div><p class="eyebrow">${achievement.category}</p><h3>${achievement.title}</h3><p>${achievement.detail}</p></div><strong>${achievement.status}</strong></article>`;
}

function renderClass(classKey = currentClass) {
  currentClass = classKey;
  const data = classData[classKey];
  if (!data) return;
  document.getElementById('class-title').textContent = data.title;
  document.getElementById('class-level').textContent = data.level;
  document.getElementById('class-xp').textContent = data.xp;
  document.getElementById('class-best-skill').textContent = data.best;
  document.getElementById('class-best-level').textContent = data.bestLevel;
  document.getElementById('achievement-class-level').textContent = data.level;
  document.getElementById('achievement-class-xp').textContent = data.xp;
  document.getElementById('class-rarest').textContent = data.rarest;
  document.getElementById('class-rarest-detail').textContent = data.rarestDetail;
  document.getElementById('class-skills-content').innerHTML = `<div class="subsection-heading"><p class="eyebrow">UNLOCKED SKILLS</p><h3>Skills you can train now</h3></div><div class="subskill-grid">${data.skills.filter((skill) => !skill.locked).map(skillCard).join('')}</div><div class="subsection-heading"><p class="eyebrow">LOCKED SKILLS</p><h3>Milestones still ahead</h3></div><div class="subskill-grid">${data.skills.filter((skill) => skill.locked).map(skillCard).join('')}</div>`;
  document.getElementById('class-achievements-content').innerHTML = `<div class="subsection-heading"><p class="eyebrow">UNLOCKED ACHIEVEMENTS</p><h3>Proof of your progress</h3></div><div class="achievement-grid">${data.achievements.filter((achievement) => achievement.status !== 'Locked').map(achievementCard).join('')}</div><div class="subsection-heading"><p class="eyebrow">LOCKED ACHIEVEMENTS</p><h3>Challenges still ahead</h3></div><div class="achievement-grid">${data.achievements.filter((achievement) => achievement.status === 'Locked').map(achievementCard).join('')}</div>`;
}

function showView(name, classKey) {
  if (name === 'class') renderClass(classKey || currentClass);
  views.forEach((view) => view.classList.toggle('active', view.id === `${name}-view`));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    document.body.dataset.theme = button.dataset.themeChoice;
    themeButtons.forEach((item) => item.classList.toggle('active', item === button));
  });
});

document.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]');
  if (actionButton?.dataset.action === 'sync') {
    const status = document.getElementById('sync-status');
    if (status) status.textContent = 'Sync complete · 3 activities checked';
  }
  if (actionButton?.dataset.action === 'save-manual') {
    const status = document.getElementById('sync-status');
    if (status) status.textContent = 'Manual activity ready to review';
  }
  if (actionButton?.dataset.action === 'complete-workout') {
    const status = document.getElementById('sync-status');
    if (status) status.textContent = 'Workout saved · Strength volume recorded';
  }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton && !viewButton.matches('[data-theme-choice]')) showView(viewButton.dataset.view, viewButton.dataset.classKey);
});

document.querySelectorAll('.toggle, .scope').forEach((button) => {
  button.addEventListener('click', () => {
    button.parentElement.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
  });
});

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    const container = button.closest('.view');
    container.querySelectorAll('[data-mode]').forEach((item) => item.classList.toggle('active', item === button));
    container.querySelectorAll('[data-mode-panel]').forEach((panel) => {
      panel.classList.toggle('is-hidden', panel.dataset.modePanel !== mode);
    });
  });
});

renderClass();
