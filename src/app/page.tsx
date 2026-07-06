"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type WorkStatus = "before" | "working" | "break" | "after";
type SalaryMode = "daily" | "monthly" | "annual";

type Settings = {
  salaryMode: SalaryMode;
  dailyWage: string;
  monthlySalary: string;
  monthlyWorkDays: string;
  annualSalary: string;
  weeklyWorkDays: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
};

const STORAGE_KEY = "realtime-wage-calculator-settings";

const DEFAULT_SETTINGS: Settings = {
  salaryMode: "daily",
  dailyWage: "500",
  monthlySalary: "10875",
  monthlyWorkDays: "21.75",
  annualSalary: "130000",
  weeklyWorkDays: "5",
  startTime: "09:00",
  endTime: "18:00",
  breakStart: "12:00",
  breakEnd: "13:00",
};

const SALARY_MODE_LABELS: Record<SalaryMode, string> = {
  daily: "日薪",
  monthly: "月薪",
  annual: "年薪",
};

const STATUS_LABELS: Record<WorkStatus, string> = {
  before: "未开始",
  working: "工作中",
  break: "午休中",
  after: "已下班",
};

const STATUS_HINTS: Record<WorkStatus, string> = {
  before: "今天的工资计时还没有开始",
  working: "工资正在按秒增加",
  break: "午休时间不计入工资",
  after: "今天的计薪已经结束",
};

function parseTimeToSeconds(time: string) {
  const [hour, minute] = time.split(":").map(Number);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return 0;
  }

  return hour * 3600 + minute * 60;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatCurrency(value: number, fractionDigits = 2) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function parsePositiveNumber(value: string) {
  return Math.max(0, Number(value) || 0);
}

function calculateDailyWage(settings: Settings) {
  if (settings.salaryMode === "monthly") {
    const monthlySalary = parsePositiveNumber(settings.monthlySalary);
    const monthlyWorkDays = parsePositiveNumber(settings.monthlyWorkDays);

    return monthlyWorkDays > 0 ? monthlySalary / monthlyWorkDays : 0;
  }

  if (settings.salaryMode === "annual") {
    const annualSalary = parsePositiveNumber(settings.annualSalary);
    const weeklyWorkDays = parsePositiveNumber(settings.weeklyWorkDays);
    const annualWorkDays = weeklyWorkDays * 52;

    return annualWorkDays > 0 ? annualSalary / annualWorkDays : 0;
  }

  return parsePositiveNumber(settings.dailyWage);
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${hours}小时 ${minutes.toString().padStart(2, "0")}分 ${seconds
    .toString()
    .padStart(2, "0")}秒`;
}

function getSecondsSinceMidnight(date: Date) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function calculatePaidSeconds(
  nowSeconds: number,
  startSeconds: number,
  endSeconds: number,
  breakStartSeconds: number,
  breakEndSeconds: number,
) {
  if (nowSeconds <= startSeconds) {
    return 0;
  }

  const cappedNow = Math.min(nowSeconds, endSeconds);
  const elapsed = clamp(cappedNow - startSeconds, 0, endSeconds - startSeconds);
  const breakOverlap =
    Math.max(0, Math.min(cappedNow, breakEndSeconds) - Math.max(startSeconds, breakStartSeconds));

  return Math.max(0, elapsed - breakOverlap);
}

function getStatus(
  nowSeconds: number,
  startSeconds: number,
  endSeconds: number,
  breakStartSeconds: number,
  breakEndSeconds: number,
): WorkStatus {
  if (nowSeconds < startSeconds) {
    return "before";
  }

  if (nowSeconds >= endSeconds) {
    return "after";
  }

  if (nowSeconds >= breakStartSeconds && nowSeconds < breakEndSeconds) {
    return "break";
  }

  return "working";
}

export default function Home() {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SETTINGS;
    }

    const savedSettings = window.localStorage.getItem(STORAGE_KEY);

    if (!savedSettings) {
      return DEFAULT_SETTINGS;
    }

    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_SETTINGS;
    }
  });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const calculation = useMemo(() => {
    const dailyWage = calculateDailyWage(settings);
    const startSeconds = parseTimeToSeconds(settings.startTime);
    const endSeconds = parseTimeToSeconds(settings.endTime);
    const breakStartSeconds = parseTimeToSeconds(settings.breakStart);
    const breakEndSeconds = parseTimeToSeconds(settings.breakEnd);
    const workSeconds = Math.max(0, endSeconds - startSeconds);
    const breakSeconds = Math.max(
      0,
      Math.min(endSeconds, breakEndSeconds) - Math.max(startSeconds, breakStartSeconds),
    );
    const totalPaidSeconds = Math.max(0, workSeconds - breakSeconds);
    const nowSeconds = getSecondsSinceMidnight(now);
    const paidSeconds = calculatePaidSeconds(
      nowSeconds,
      startSeconds,
      endSeconds,
      breakStartSeconds,
      breakEndSeconds,
    );
    const progress = totalPaidSeconds > 0 ? clamp(paidSeconds / totalPaidSeconds, 0, 1) : 0;
    const earnedWage = dailyWage * progress;
    const perSecondWage = totalPaidSeconds > 0 ? dailyWage / totalPaidSeconds : 0;
    const status = getStatus(
      nowSeconds,
      startSeconds,
      endSeconds,
      breakStartSeconds,
      breakEndSeconds,
    );

    return {
      dailyWage,
      earnedWage,
      paidSeconds,
      perSecondWage,
      progress,
      status,
      totalPaidSeconds,
      workSeconds,
    };
  }, [now, settings]);

  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }));
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.heading}>
          <p className={styles.kicker}>Realtime Wage Calculator</p>
          <h1>实时工资计算器</h1>
          <p>输入今天的日薪和工作时间，看看此刻已经赚到了多少。</p>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>薪资模式</span>
            <select
              onChange={(event) => updateSetting("salaryMode", event.target.value as SalaryMode)}
              value={settings.salaryMode}
            >
              {Object.entries(SALARY_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {settings.salaryMode === "daily" && (
          <label className={styles.field}>
            <span>日薪资</span>
            <div className={styles.moneyInput}>
              <span>¥</span>
              <input
                inputMode="decimal"
                min="0"
                onChange={(event) => updateSetting("dailyWage", event.target.value)}
                placeholder="500"
                type="number"
                value={settings.dailyWage}
              />
            </div>
          </label>
          )}

          {settings.salaryMode === "monthly" && (
            <>
              <label className={styles.field}>
                <span>月薪</span>
                <div className={styles.moneyInput}>
                  <span>¥</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => updateSetting("monthlySalary", event.target.value)}
                    placeholder="10875"
                    type="number"
                    value={settings.monthlySalary}
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>月工作天数</span>
                <input
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => updateSetting("monthlyWorkDays", event.target.value)}
                  placeholder="21.75"
                  step="0.01"
                  type="number"
                  value={settings.monthlyWorkDays}
                />
              </label>
            </>
          )}

          {settings.salaryMode === "annual" && (
            <>
              <label className={styles.field}>
                <span>年薪</span>
                <div className={styles.moneyInput}>
                  <span>¥</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    onChange={(event) => updateSetting("annualSalary", event.target.value)}
                    placeholder="130000"
                    type="number"
                    value={settings.annualSalary}
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span>周工作天数</span>
                <input
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => updateSetting("weeklyWorkDays", event.target.value)}
                  placeholder="5"
                  step="0.1"
                  type="number"
                  value={settings.weeklyWorkDays}
                />
              </label>
            </>
          )}

          <label className={styles.field}>
            <span>上班时间</span>
            <input
              onChange={(event) => updateSetting("startTime", event.target.value)}
              type="time"
              value={settings.startTime}
            />
          </label>

          <label className={styles.field}>
            <span>下班时间</span>
            <input
              onChange={(event) => updateSetting("endTime", event.target.value)}
              type="time"
              value={settings.endTime}
            />
          </label>

          <label className={styles.field}>
            <span>午休开始</span>
            <input
              onChange={(event) => updateSetting("breakStart", event.target.value)}
              type="time"
              value={settings.breakStart}
            />
          </label>

          <label className={styles.field}>
            <span>午休结束</span>
            <input
              onChange={(event) => updateSetting("breakEnd", event.target.value)}
              type="time"
              value={settings.breakEnd}
            />
          </label>
        </div>
      </section>

      <section className={styles.dashboard} aria-live="polite">
        <div className={styles.statusRow}>
          <div className={styles.statusPill}>{STATUS_LABELS[calculation.status]}</div>
          <span>{STATUS_HINTS[calculation.status]}</span>
        </div>

        <div className={styles.earnings}>
          <span>当前已赚</span>
          <strong>{formatCurrency(calculation.earnedWage, 4)}</strong>
        </div>

        <div className={styles.progressBlock}>
          <div className={styles.progressMeta}>
            <span>今日进度</span>
            <strong>{Math.round(calculation.progress * 100)}%</strong>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${calculation.progress * 100}%` }}
            />
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div>
            <span>今日总工资</span>
            <strong>{formatCurrency(calculation.dailyWage)}</strong>
          </div>
          <div>
            <span>已计薪时长</span>
            <strong>{formatDuration(calculation.paidSeconds)}</strong>
          </div>
          <div>
            <span>计薪总时长</span>
            <strong>{formatDuration(calculation.totalPaidSeconds)}</strong>
          </div>
          <div>
            <span>每秒工资</span>
            <strong>{formatCurrency(calculation.perSecondWage, 4)}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
