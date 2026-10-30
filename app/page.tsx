'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  OccupationTypeSchema,
  StructuredActivityLevelSchema,
  UserProfileSchema,
  type MealSlotInput,
  type UserProfileInput,
} from '@/lib/schemas/userProfileSchema';
import { generateNutritionPlan } from '@/lib/engine/nutritionEngine';

const PROFILE_KEY = 'adaptive-tracker-profile';
const DAILY_LOG_PREFIX = 'adaptive-tracker-day';
const DEFAULT_PROFILE: UserProfileInput = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  sex: 'male',
  age: 35,
  heightCm: 180,
  weightKg: 85,
  targetWeightKg: 78,
  occupationType: 'desk_sedentary',
  activityLevel: 'sedentary',
  healthConditions: [],
  dietaryRestrictions: ['none'],
};

const MEAL_INFO: Record<MealSlotInput['slot'], { title: string; time: string; icon: string; foods: string[]; share: number }> = {
  breakfast: {
    title: 'Breakfast',
    time: '8:00 AM',
    icon: 'sun',
    foods: ['Greek yogurt', 'Blueberries & oats', 'Almond butter'],
    share: 0.25,
  },
  lunch: {
    title: 'Lunch',
    time: '12:30 PM',
    icon: 'bowl',
    foods: ['Grilled chicken', 'Quinoa & greens', 'Avocado dressing'],
    share: 0.35,
  },
  snack: {
    title: 'Afternoon snack',
    time: '3:30 PM',
    icon: 'apple',
    foods: ['Cottage cheese', 'Sliced pear'],
    share: 0.15,
  },
  dinner: {
    title: 'Dinner',
    time: '7:00 PM',
    icon: 'moon',
    foods: ['Baked salmon', 'Roasted vegetables', 'Brown rice'],
    share: 0.25,
  },
};

const MEAL_ORDER: MealSlotInput['slot'][] = ['breakfast', 'lunch', 'snack', 'dinner'];

type DailyLog = { completedSlots: MealSlotInput['slot'][]; steps: number };

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    plate: <><circle cx="12" cy="12" r="8" /><path d="M12 4v5m-8 3h16M4 5v4m2-4v4m13-3v7m0-7c-2 2-2 4 0 5" /></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    chart: <><path d="M4 19V5m0 14h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    bowl: <><path d="M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8Zm3 11h12M8 7c0-1.2.8-1.5.8-2.5M12 7c0-1.2.8-1.5.8-2.5M16 7c0-1.2.8-1.5.8-2.5" /></>,
    apple: <><path d="M12 7c-4-5-9 0-7 6s4 8 7 5c3 3 6 1 7-5s-3-11-7-6Zm0 0c0-3 2-5 5-5" /></>,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? paths.sparkle}
    </svg>
  );
}

function formatNumber(number: number) {
  return Math.round(number).toLocaleString('en-US');
}

export default function Home() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [dailyLog, setDailyLog] = useState<DailyLog>({ completedSlots: [], steps: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(DEFAULT_PROFILE);
  const [profileError, setProfileError] = useState('');
  const [notice, setNotice] = useState('');
  const date = todayKey();
  const logKey = `${DAILY_LOG_PREFIX}-${profile.userId}-${date}`;

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(PROFILE_KEY);
      if (savedProfile) {
        const parsed = UserProfileSchema.safeParse(JSON.parse(savedProfile));
        if (parsed.success) {
          setProfile(parsed.data);
          setProfileDraft(parsed.data);
        } else {
          setNotice('Your saved profile could not be validated. The example profile is being used.');
        }
      }
    } catch {
      setNotice('Your saved profile could not be read. The example profile is being used.');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const savedLog = localStorage.getItem(logKey);
      if (savedLog) {
        const parsed = JSON.parse(savedLog) as DailyLog;
        if (Array.isArray(parsed.completedSlots) && Number.isFinite(parsed.steps)) {
          setDailyLog({
            completedSlots: parsed.completedSlots.filter((slot) => MEAL_ORDER.includes(slot)),
            steps: Math.min(100_000, Math.max(0, Math.round(parsed.steps))),
          });
          return;
        }
      }
      setDailyLog({ completedSlots: [], steps: 0 });
    } catch {
      setNotice('Today’s local activity log could not be read.');
      setDailyLog({ completedSlots: [], steps: 0 });
    }
  }, [hydrated, logKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(logKey, JSON.stringify(dailyLog));
    } catch {
      setNotice('Your updates could not be saved on this device. Check browser storage settings.');
    }
  }, [dailyLog, hydrated, logKey]);

  const plan = useMemo(() => generateNutritionPlan(profile), [profile]);
  const meals = useMemo(() => MEAL_ORDER.map((slot) => ({
    slot,
    calories: Math.round(plan.targetCalories * MEAL_INFO[slot].share),
  })), [plan.targetCalories]);
  const consumedCalories = meals.reduce(
    (total, meal) => total + (dailyLog.completedSlots.includes(meal.slot) ? meal.calories : 0),
    0,
  );
  const completedCount = dailyLog.completedSlots.length;
  const stepsProgress = Math.min(100, Math.round((dailyLog.steps / 7500) * 100));
  const initials = 'A';

  function updateDailyLog(updates: Partial<DailyLog>) {
    setDailyLog((current) => ({ ...current, ...updates }));
  }

  function toggleMeal(slot: MealSlotInput['slot']) {
    const completedSlots = dailyLog.completedSlots.includes(slot)
      ? dailyLog.completedSlots.filter((item) => item !== slot)
      : [...dailyLog.completedSlots, slot];
    updateDailyLog({ completedSlots });
  }

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = UserProfileSchema.safeParse({
      ...profileDraft,
      age: Number(profileDraft.age),
      heightCm: Number(profileDraft.heightCm),
      weightKg: Number(profileDraft.weightKg),
      ...(profileDraft.targetWeightKg === undefined ? {} : { targetWeightKg: Number(profileDraft.targetWeightKg) }),
    });
    if (!result.success) {
      setProfileError(result.error.issues[0]?.message ?? 'Please check your profile details.');
      return;
    }
    setProfileError('');
    setProfile(result.data);
    setProfileDraft(result.data);
    setProfileOpen(false);
    setNotice('Profile updated. Your nutrition targets have been recalculated.');
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(result.data));
    } catch {
      setNotice('Profile updated for this session, but could not be saved on this device.');
    }
  }

  const occupationLabel = {
    desk_sedentary: 'Desk-based',
    standing: 'Mostly standing',
    active_labor: 'Active work',
  }[profile.occupationType];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Forma home">
          <span className="brand-mark"><Icon name="sparkle" size={21} /></span>
          <span>forma<span className="brand-period">.</span></span>
        </a>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><Icon name="home" />Overview</a>
          <a className="nav-item" href="#nutrition"><Icon name="plate" />Nutrition</a>
          <a className="nav-item" href="#movement"><Icon name="activity" />Movement</a>
          <a className="nav-item" href="#progress"><Icon name="chart" />Your progress</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="coach-card">
            <div className="coach-spark"><Icon name="sparkle" size={17} /></div>
            <strong>Small steps add up.</strong>
            <p>Your plan adapts to your day, not the other way around.</p>
            <a href="#movement">See today’s tips <span>→</span></a>
          </div>
          <button className="profile-button" onClick={() => { setProfileDraft(profile); setProfileOpen(true); }}>
            <span className="avatar">{initials}</span>
            <span className="profile-button-copy"><strong>Alex Morgan</strong><small>{occupationLabel}</small></span>
            <Icon name="settings" size={18} />
          </button>
        </div>
      </aside>

      <section className="main-area" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Your space <span>/</span> <strong>Today</strong></div>
          <div className="topbar-right">
            <span className="local-badge"><span /> Saved on this device</span>
            <button className="top-avatar" aria-label="Edit profile" onClick={() => { setProfileDraft(profile); setProfileOpen(true); }}>{initials}</button>
          </div>
        </header>

        <div className="dashboard">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <h1>A little better, <em>every day.</em></h1>
              <p className="welcome-copy">Your plan is ready. Make today yours.</p>
            </div>
            <button className="date-button" aria-label="Today's date">
              <span className="calendar-icon"><span /><span /><span /><span /></span>
              <span>Today</span>
              <span className="date-chevron">⌄</span>
            </button>
          </div>

          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><Icon name="close" size={15} /></button></div>}

          <section className="hero-card" aria-label="Daily calorie target">
            <div className="hero-copy">
              <span className="hero-label"><span className="hero-spark"><Icon name="sparkle" size={13} /></span> YOUR DAILY TARGET</span>
              <div className="calorie-number">{formatNumber(plan.targetCalories)}<span> kcal</span></div>
              <p className="hero-subtitle">A steady, sustainable target shaped around you.</p>
              <div className="hero-tags">
                <span><i className="tag-dot green" /> Mifflin-St Jeor</span>
                <span><i className="tag-dot" /> {occupationLabel} routine</span>
              </div>
            </div>
            <div className="calorie-ring" aria-label={`${Math.round((consumedCalories / plan.targetCalories) * 100)} percent of calories logged`}>
              <svg viewBox="0 0 132 132" className="ring-svg">
                <circle cx="66" cy="66" r="56" className="ring-track" />
                <circle cx="66" cy="66" r="56" className="ring-progress" style={{ strokeDashoffset: 351.86 * (1 - Math.min(1, consumedCalories / plan.targetCalories)) }} />
              </svg>
              <div className="ring-center"><strong>{formatNumber(Math.max(0, plan.targetCalories - consumedCalories))}</strong><span>kcal left</span></div>
            </div>
            <div className="hero-footer">
              <span><strong>{formatNumber(consumedCalories)}</strong> logged so far</span>
              <span>{formatNumber(plan.targetCalories)} kcal target</span>
            </div>
          </section>

          <div className="section-heading" id="nutrition">
            <div><p className="eyebrow">YOUR DAY, AT A GLANCE</p><h2>Today’s rhythm</h2></div>
            <span className="day-progress">{completedCount} of 4 meals logged</span>
          </div>

          <div className="overview-grid">
            <section className="meal-card panel">
              <div className="panel-heading">
                <div><span className="section-icon peach"><Icon name="plate" size={17} /></span><div><h3>Meals & nourishment</h3><p>Example meal ideas. Choose what works for you.</p></div></div>
                <a className="text-link" href="#nutrition">View plan <Icon name="arrow" size={14} /></a>
              </div>
              <div className="meal-list">
                {meals.map((meal) => {
                  const info = MEAL_INFO[meal.slot];
                  const isComplete = dailyLog.completedSlots.includes(meal.slot);
                  return (
                    <article className={`meal-row ${isComplete ? 'meal-done' : ''}`} key={meal.slot}>
                      <button className={`meal-check ${isComplete ? 'checked' : ''}`} onClick={() => toggleMeal(meal.slot)} aria-label={`${isComplete ? 'Unmark' : 'Mark'} ${info.title} as logged`}>
                        {isComplete && <Icon name="check" size={15} />}
                      </button>
                      <span className={`meal-icon ${info.icon}`}><Icon name={info.icon} size={19} /></span>
                      <div className="meal-copy"><strong>{info.title}</strong><span>{info.foods.join(' · ')}</span></div>
                      <div className="meal-meta"><span>{info.time}</span><strong>{formatNumber(meal.calories)} <small>kcal</small></strong></div>
                    </article>
                  );
                })}
              </div>
              <div className="meal-footer"><span>Meal completions are saved locally on this device.</span><span className="meal-progress-line"><i style={{ width: `${completedCount * 25}%` }} /></span></div>
            </section>

            <section className="movement-card panel" id="movement">
              <div className="panel-heading">
                <div><span className="section-icon mint"><Icon name="activity" size={18} /></span><div><h3>Move a little</h3><p>Every bit of movement counts.</p></div></div>
                <span className="today-label">TODAY</span>
              </div>
              <div className="steps-summary"><div><strong>{formatNumber(dailyLog.steps)}</strong><span>steps logged</span></div><div className="step-target">of 7,500 <span>goal</span></div></div>
              <div className="steps-track"><i style={{ width: `${stepsProgress}%` }} /></div>
              <div className="steps-bottom"><span>{stepsProgress}% of your daily goal</span><button className="add-steps" onClick={() => updateDailyLog({ steps: Math.min(100_000, dailyLog.steps + 500) })}><Icon name="plus" size={15} /> Add 500 steps</button></div>
              <div className="movement-tip"><span className="tip-icon"><Icon name="sparkle" size={16} /></span><p><strong>A desk-friendly nudge</strong>Try a 5-minute stretch or standing break this hour. Small movement breaks can add up.</p></div>
              <p className="movement-footnote">Steps are separate from intentional workouts.</p>
            </section>
          </div>

          <section className="bottom-grid" id="progress">
            <div className="macro-card panel">
              <div className="panel-heading">
                <div><span className="section-icon lavender"><Icon name="chart" size={17} /></span><div><h3>Your nutrition targets</h3><p>Daily guide based on your profile.</p></div></div>
                <button className="edit-link" onClick={() => { setProfileDraft(profile); setProfileOpen(true); }}>Edit profile <Icon name="arrow" size={13} /></button>
              </div>
              <div className="macro-grid">
                <div className="macro-item"><div className="macro-label"><span className="macro-dot protein" />Protein</div><strong>{formatNumber(plan.macros.proteinGrams)}<small>g</small></strong><div className="macro-bar"><i className="protein-fill" style={{ width: `${(plan.macros.proteinGrams * 4 / plan.targetCalories) * 100}%` }} /></div></div>
                <div className="macro-item"><div className="macro-label"><span className="macro-dot carbs" />Carbohydrates</div><strong>{formatNumber(plan.macros.carbsGrams)}<small>g</small></strong><div className="macro-bar"><i className="carbs-fill" style={{ width: `${(plan.macros.carbsGrams * 4 / plan.targetCalories) * 100}%` }} /></div></div>
                <div className="macro-item"><div className="macro-label"><span className="macro-dot fat" />Fat</div><strong>{formatNumber(plan.macros.fatGrams)}<small>g</small></strong><div className="macro-bar"><i className="fat-fill" style={{ width: `${(plan.macros.fatGrams * 9 / plan.targetCalories) * 100}%` }} /></div></div>
              </div>
              <div className="bmr-note">Bars show each macro’s share of target calories. Mifflin-St Jeor · {formatNumber(plan.bmr)} kcal BMR · {formatNumber(plan.tdee)} kcal estimated daily expenditure</div>
            </div>
            <div className="adapt-card">
              <div className="adapt-top"><span className="adapt-spark"><Icon name="sparkle" size={18} /></span><span>YOUR ADAPTIVE PLAN</span></div>
              <h3>Built around <em>real life.</em></h3>
              <p>Nutrition targets are calculated from your profile. Activity-to-plan adjustments are not connected to this dashboard yet.</p>
              <a href="#movement">Explore your movement <span>→</span></a>
            </div>
          </section>

          <footer className="disclaimer">
            <span className="disclaimer-mark">i</span>
            <p><strong>A gentle reminder:</strong> These estimates are for informational purposes, not medical advice. Your needs are personal—talk with a qualified health professional before making significant changes to your diet or activity.</p>
          </footer>
        </div>
      </section>

      {profileOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}>
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <div className="modal-header"><div><p className="eyebrow">PERSONALIZE YOUR PLAN</p><h2 id="profile-title">Your profile</h2></div><button className="close-button" onClick={() => setProfileOpen(false)} aria-label="Close profile"><Icon name="close" /></button></div>
            <form onSubmit={saveProfile}>
              <div className="form-grid">
                <label>Sex used for calculation<select value={profileDraft.sex} onChange={(event) => setProfileDraft({ ...profileDraft, sex: event.target.value as UserProfileInput['sex'] })}><option value="female">Female</option><option value="male">Male</option></select></label>
                <label>Age<input type="number" min="18" max="100" value={profileDraft.age} onChange={(event) => setProfileDraft({ ...profileDraft, age: Number(event.target.value) })} /></label>
                <label>Height (cm)<input type="number" min="120" max="250" value={profileDraft.heightCm} onChange={(event) => setProfileDraft({ ...profileDraft, heightCm: Number(event.target.value) })} /></label>
                <label>Current weight (kg)<input type="number" min="35" max="300" step="0.1" value={profileDraft.weightKg} onChange={(event) => setProfileDraft({ ...profileDraft, weightKg: Number(event.target.value) })} /></label>
                <label>Target weight (kg)<input type="number" min="35" max="300" step="0.1" value={profileDraft.targetWeightKg ?? ''} onChange={(event) => setProfileDraft({ ...profileDraft, targetWeightKg: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
                <label>Typical workday<select value={profileDraft.occupationType} onChange={(event) => { const result = OccupationTypeSchema.safeParse(event.target.value); if (result.success) setProfileDraft({ ...profileDraft, occupationType: result.data }); }}><option value="desk_sedentary">Mostly sitting / desk-based</option><option value="standing">Mostly standing</option><option value="active_labor">Physically active work</option></select></label>
                <label>Usual intentional activity<select value={profileDraft.activityLevel} onChange={(event) => { const result = StructuredActivityLevelSchema.safeParse(event.target.value); if (result.success) setProfileDraft({ ...profileDraft, activityLevel: result.data }); }}><option value="sedentary">Little planned exercise</option><option value="lightly_active">Light exercise 1–3 days/week</option><option value="moderately_active">Moderate exercise 3–5 days/week</option><option value="very_active">Hard exercise 6–7 days/week</option></select></label>
              </div>
              {profileError && <p className="form-error" role="alert">{profileError}</p>}
              <p className="modal-note">Your targets are calculated using the Mifflin-St Jeor equation and a 20% default deficit. Calorie minimums are applied by the nutrition engine.</p>
              <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setProfileOpen(false)}>Cancel</button><button type="submit" className="save-button">Save changes</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
