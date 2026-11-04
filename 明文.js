// ====================== P2: 请求上下文封装 ======================
class CollectorContext {
  constructor(env) {
    this.env = env;
    this.startTime = Date.now();
    this.stats = { processed: 0, failed: 0, apiSwitchCount: 0 };
  }
  get remainingTime() {
    return 28000 - (Date.now() - this.startTime);
  }

  checkTimeBudget() {
    if (this.remainingTime < 3000) {
      throw new Error("Insufficient time budget for remaining operations");
    }
  }

  recordSuccess() {
    this.stats.processed++;
  }

  recordFailure() {
    this.stats.failed++;
  }
}

// 创建全局上下文实例（延迟初始化）
let collectorContext = null;
function getCollectorContext(env) {
  if (!collectorContext) {
    collectorContext = new CollectorContext(env);
  }
  return collectorContext;
}

const TEST_BYTES = 300000;
const SPEED_TEST_BYTES = TEST_BYTES;
const DEFAULT_SPEED_TEST_COUNT = 50;
const SPEED_TEST_BATCH_SIZE = 50;
const SPEED_TEST_BATCH_DELAY_MS = 1000;
const DEFAULT_MANUAL_SPEED_TEST_BATCH_SIZE = SPEED_TEST_BATCH_SIZE;
const MIN_MANUAL_SPEED_TEST_BATCH_SIZE = 1;
const MAX_MANUAL_SPEED_TEST_BATCH_SIZE = SPEED_TEST_BATCH_SIZE;
const DEFAULT_MANUAL_SPEED_TEST_BATCH_INTERVAL_SECONDS = 2;
const DEFAULT_MANUAL_SPEED_TEST_ADDRESS_INTERVAL_SECONDS = 2;
const DEFAULT_MANUAL_SPEED_TEST_TIMEOUT_SECONDS = 5;
const MIN_MANUAL_SPEED_TEST_INTERVAL_SECONDS = 0;
const MAX_MANUAL_SPEED_TEST_INTERVAL_SECONDS = 60;
const SCHEDULED_SPEED_TEST_BATCH_SIZE = 40;
const SCHEDULED_SPEED_TEST_CONCURRENCY = 1;
const DEFAULT_SCHEDULED_SPEED_TEST_TIMEOUT_SECONDS = 5;
const MIN_SPEED_TEST_TIMEOUT_SECONDS = 1;
const MAX_SPEED_TEST_TIMEOUT_SECONDS = 60;
const SCHEDULED_SPEED_TEST_SETTINGS_KEY =
  "cloudflare_scheduled_speedtest_settings";
const SCHEDULED_SPEED_TEST_JOB_PROPERTY = "_scheduledSpeedTestJob";
const MIN_SCHEDULED_SPEED_TEST_BATCH_SIZE = 1;
const MAX_SCHEDULED_SPEED_TEST_BATCH_SIZE = 40;
const DEFAULT_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS = 1;
const MIN_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS = 0;
const MAX_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS = 60;
const DEFAULT_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS = 1;
const MIN_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS = 0;
const MAX_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS = 60;
const DEFAULT_AUTO_UPDATE_COUNT = 763;
const HISTORY_INDEX_KEY = "cloudflare_ips_history_index";
const SPEED_TEST_COUNT_KEY = "cloudflare_speedtest_count";
const AUTO_UPDATE_COUNT_KEY = "cloudflare_auto_update_count";
const QUALITY_COUNTRIES_KEY = "cloudflare_quality_countries";
const QUALITY_COUNTRY_LIMITS_KEY = "cloudflare_quality_country_limits";
const COLLECTOR_SETTINGS_KEY = "cloudflare_collector_settings";
const MAX_SPEED_TEST_LATENCY_KEY = "cloudflare_speedtest_max_latency";
const MIN_SPEED_TEST_BANDWIDTH_KEY = "cloudflare_speedtest_min_bandwidth";
const SCHEDULE_ENABLED_KEY = "cloudflare_schedule_enabled";
const SCHEDULE_TIMES_KEY = "cloudflare_scheduled_times";
const SCHEDULE_TIMEZONE_KEY = "cloudflare_schedule_timezone";
const SCHEDULE_ACCOUNT_ID_KEY = "cloudflare_schedule_account_id";
const SCHEDULE_SCRIPT_NAME_KEY = "cloudflare_schedule_script_name";
const SCHEDULE_API_TOKEN_KEY = "cloudflare_schedule_api_token";
const DEFAULT_MAX_SPEED_TEST_LATENCY = 200;
const DEFAULT_MIN_SPEED_TEST_BANDWIDTH = 1;
const DEFAULT_SPEED_TEST_MODE = "scheduled";
const DEFAULT_SCHEDULE_FIELDS = {
  minute: "",
  hour: "",
  dayOfMonth: "",
  month: "",
  dayOfWeek: "",
};
const SUPPORTED_SCHEDULE_TIMEZONES = ["Asia/Shanghai", "UTC"];
const APPLIED_CRON_EXPRESSIONS_KEY = "cloudflare_applied_cron_expressions";
const SCHEDULED_ERROR_LOGS_KEY = "cloudflare_scheduled_error_logs";
const MAX_SCHEDULED_ERROR_LOGS = 30;
const SCHEDULED_RUN_STATS_KEY = "cloudflare_scheduled_run_stats";
const SCHEDULED_ACTIVITY_LOGS_KEY = "cloudflare_scheduled_activity_logs";
const SCHEDULED_ACTIVITY_EVENTS = new Set([
  "scheduled_invocation_started",
  "scheduled_invocation_completed",
  "scheduled_invocation_failed",
  "scheduled_invocation_yielded",
  "scheduled_address_collection_completed",
  "scheduled_speedtest_job_created",
  "scheduled_speedtest_job_resumed",
  "scheduled_speedtest_job_cancelled",
  "scheduled_speedtest_job_completed",
  "scheduled_speedtest_batch_start",
  "scheduled_speedtest_batch_complete",
  "scheduled_speedtest_progress_saved",
  "scheduled_speedtest_skipped",
]);
const DEFAULT_QUALITY_COUNTRIES = ["HK", "TW", "KR", "JP", "SG", "US"];
const DEFAULT_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE = 20;
const MAX_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE = 1000;
function parseCronField(value, min, max, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName}不能为空`);
  }
  const values = new Set();
  for (const part of value.trim().split(",")) {
    const match = part.match(/^(\*|\d+|\d+-\d+)(?:\/(\d+))?$/);
    if (!match) {
      throw new Error(`${fieldName}仅支持数字、*、逗号、范围和步长`);
    }
    const [, range, stepText] = match;
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isSafeInteger(step) || step < 1) {
      throw new Error(`${fieldName}步长必须是正整数`);
    }
    let start = min;
    let end = max;
    if (range !== "*") {
      const bounds = range.split("-").map(Number);
      start = bounds[0];
      end = bounds.length === 2 ? bounds[1] : bounds[0];
    }
    if (start < min || end > max || start > end) {
      throw new Error(`${fieldName}取值范围必须是 ${min}-${max}`);
    }
    for (let item = start; item <= end; item += step) {
      values.add(fieldName === "星期" && item === 7 ? 0 : item);
    }
  }
  return [...values].sort((a, b) => a - b);
}
function normalizeScheduleFields(value) {
  if (Array.isArray(value)) {
    if (
      value.length < 1 ||
      value.length > 24 ||
      value.some(
        (time) =>
          typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time),
      )
    ) {
      throw new Error("旧版运行时间必须是 24 小时制 HH:mm 格式");
    }
    return {
      minute: [
        ...new Set(value.map((time) => String(Number(time.slice(3))))),
      ].join(","),
      hour: [...new Set(value.map((time) => String(Number(time.slice(0, 2)))))]
        .sort((a, b) => Number(a) - Number(b))
        .join(","),
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: "*",
    };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("请填写完整的五个 Cron 时间字段");
  }
  const fields = {
    minute: String(value.minute ?? "").trim(),
    hour: String(value.hour ?? "").trim(),
    dayOfMonth: String(value.dayOfMonth ?? "").trim(),
    month: String(value.month ?? "").trim(),
    dayOfWeek: String(value.dayOfWeek ?? "").trim(),
  };
  parseCronField(fields.minute, 0, 59, "分钟");
  parseCronField(fields.hour, 0, 23, "小时");
  parseCronField(fields.dayOfMonth, 1, 31, "月中日期");
  parseCronField(fields.month, 1, 12, "月份");
  parseCronField(fields.dayOfWeek, 0, 7, "星期");
  return fields;
}
function getSimpleScheduleInterval(fields) {
  const minuteStep = fields.minute.match(/^\*\/(\d+)$/);
  if (
    minuteStep &&
    fields.hour === "*" &&
    fields.dayOfMonth === "*" &&
    fields.month === "*" &&
    fields.dayOfWeek === "*"
  ) {
    return { value: Number(minuteStep[1]), unit: "minute" };
  }
  const hourStep = fields.hour.match(/^\*\/(\d+)$/);
  if (
    fields.minute === "0" &&
    hourStep &&
    fields.dayOfMonth === "*" &&
    fields.month === "*" &&
    fields.dayOfWeek === "*"
  ) {
    return { value: Number(hourStep[1]), unit: "hour" };
  }
  const dayStep = fields.dayOfMonth.match(/^\*\/(\d+)$/);
  if (
    fields.minute === "0" &&
    fields.hour === "0" &&
    dayStep &&
    fields.month === "*" &&
    fields.dayOfWeek === "*"
  ) {
    return { value: Number(dayStep[1]), unit: "day" };
  }
  const monthStep = fields.month.match(/^\*\/(\d+)$/);
  if (
    fields.minute === "0" &&
    fields.hour === "0" &&
    fields.dayOfMonth === "1" &&
    monthStep &&
    fields.dayOfWeek === "*"
  ) {
    return { value: Number(monthStep[1]), unit: "month" };
  }
  return { value: "", unit: "minute" };
}
function formatCronValues(values, min, max) {
  if (values.length === max - min + 1) return "*";
  return values.join(",");
}
function getCronExpressionsForFields(inputFields, timezone) {
  const fields = normalizeScheduleFields(inputFields);
  if (!SUPPORTED_SCHEDULE_TIMEZONES.includes(timezone)) {
    throw new Error("不支持的定时任务时区");
  }
  if (
    timezone === "Asia/Shanghai" &&
    fields.hour === "*" &&
    fields.dayOfMonth === "*" &&
    fields.month === "*" &&
    fields.dayOfWeek === "*"
  ) {
    return [`${fields.minute} * * * *`];
  }
  if (timezone === "UTC") {
    return [
      `${fields.minute} ${fields.hour} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek}`,
    ];
  }
  const hours = parseCronField(fields.hour, 0, 23, "小时");
  const daytimeHours = hours
    .filter((hour) => hour >= 8)
    .map((hour) => hour - 8);
  const overnightHours = hours
    .filter((hour) => hour < 8)
    .map((hour) => hour + 16);
  const hasDateRestrictions = fields.dayOfMonth !== "*" || fields.month !== "*";
  if (overnightHours.length && hasDateRestrictions) {
    throw new Error(
      "Asia/Shanghai 下，小时 00-07 会跨到前一天；为避免月中日期或月份偏移错误，请改用 UTC，或将小时设为 08-23。",
    );
  }
  const expressions = [];
  if (daytimeHours.length) {
    expressions.push(
      `${fields.minute} ${formatCronValues(daytimeHours, 0, 23)} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek}`,
    );
  }
  if (overnightHours.length) {
    const weekdays =
      fields.dayOfWeek === "*"
        ? "*"
        : formatCronValues(
            parseCronField(fields.dayOfWeek, 0, 7, "星期").map(
              (day) => (day + 6) % 7,
            ),
            0,
            6,
          );
    expressions.push(
      `${fields.minute} ${formatCronValues(overnightHours, 0, 23)} * * ${weekdays}`,
    );
  }
  return expressions;
}
function getCloudflareScheduleApiConfig(env, credentials = {}) {
  const token = credentials.apiToken || env.CLOUDFLARE_API_TOKEN;
  const accountId = credentials.accountId || env.CLOUDFLARE_ACCOUNT_ID;
  const scriptName = credentials.scriptName || env.CLOUDFLARE_SCRIPT_NAME;
  const normalizedToken =
    typeof token === "string" ? token.trim().replace(/^Bearer\s+/i, "") : "";
  return {
    token: normalizedToken,
    accountId: typeof accountId === "string" ? accountId.trim() : "",
    scriptName: typeof scriptName === "string" ? scriptName.trim() : "",
  };
}
function getCloudflareScheduleApiError(result, status, action) {
  const messages = Array.isArray(result?.errors)
    ? result.errors
        .map((item) => {
          const message = typeof item?.message === "string" ? item.message : "";
          const code = item?.code;
          return message && code !== undefined
            ? `${message} (code ${code})`
            : message;
        })
        .filter(Boolean)
    : [];
  const message = messages.join("；");
  if (/this worker does not exist on your account/i.test(message)) {
    return "Cloudflare 找不到该 Worker。请确认 Account ID 是 Worker 所属账户的 32 位 ID，Worker 脚本名与 Cloudflare Workers 列表中的名称完全一致（不要填写 workers.dev 域名或 URL），且 API Token 属于同一账户。保存 API 设置只保存参数，不会验证 Worker 是否存在。";
  }
  if (
    /authentication failed|invalid (?:api )?token|authentication error/i.test(
      message,
    )
  ) {
    return `Cloudflare 拒绝了 API Token（HTTP ${status}）。请粘贴未带“Bearer ”前缀的原始 Token，并检查 Token 未过期/撤销、资源范围包含该 Account ID，且具有 Account.Workers Scripts:Read 权限。`;
  }
  return (
    message ||
    `Cloudflare API ${action}失败（HTTP ${status}），请检查 Token 权限、Account ID 和 Worker 脚本名`
  );
}
async function getStoredScheduleIdentifiers(env) {
  const config = getCloudflareScheduleApiConfig(env);
  const [storedAccountId, storedScriptName] = await Promise.all([
    env.IP_STORAGE.get(SCHEDULE_ACCOUNT_ID_KEY),
    env.IP_STORAGE.get(SCHEDULE_SCRIPT_NAME_KEY),
  ]);
  return {
    accountId: storedAccountId || config.accountId || "",
    scriptName: storedScriptName || config.scriptName || "",
  };
}
async function fetchCloudflareWorkerScripts(accountId, token) {
  const names = [];
  token = token.trim().replace(/^Bearer\s+/i, "");
  let totalPages = 1;
  for (let page = 1; page <= totalPages && page <= 20; page++) {
    const endpoint =
      "https://api.cloudflare.com/client/v4/accounts/" +
      encodeURIComponent(accountId) +
      "/workers/scripts?per_page=100&page=" +
      page;
    let response;
    try {
      response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw new Error(
        `无法连接 Cloudflare Worker 列表 API：${String(error?.message || "网络请求失败").slice(0, 250)}`,
      );
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        `Worker 列表 API 返回无效响应（HTTP ${response.status}）`,
      );
    }
    if (!response.ok || result?.success !== true) {
      throw new Error(
        getCloudflareScheduleApiError(
          result,
          response.status,
          "读取 Worker 列表",
        ),
      );
    }
    if (!Array.isArray(result.result)) break;
    names.push(
      ...result.result
        .map((worker) => worker?.id || worker?.script || worker?.name)
        .filter((name) => typeof name === "string" && name.length > 0),
    );
    const reportedPages = Number(result.result_info?.total_pages);
    totalPages =
      Number.isSafeInteger(reportedPages) && reportedPages > 0
        ? Math.min(reportedPages, 20)
        : page;
  }
  return [...new Set(names)];
}
async function updateCloudflareCronTriggers(env, cronExpressions, credentials) {
  const storedToken = await env.IP_STORAGE.get(SCHEDULE_API_TOKEN_KEY);
  const { token, accountId, scriptName } = getCloudflareScheduleApiConfig(env, {
    ...credentials,
    apiToken: credentials?.apiToken || storedToken || "",
  });
  if (!token || !accountId || !scriptName) {
    throw new Error(
      "Worker 未配置 CLOUDFLARE_API_TOKEN、CLOUDFLARE_ACCOUNT_ID、CLOUDFLARE_SCRIPT_NAME",
    );
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID 必须是 32 位十六进制 Account ID");
  }
  const endpoint =
    "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(accountId) +
    "/workers/scripts/" +
    encodeURIComponent(scriptName) +
    "/schedules";
  const schedulePayloads = [
    { schedules: cronExpressions.map((cron) => ({ cron })) },
    cronExpressions.map((cron) => ({ cron })),
  ];
  let response = null;
  let result = null;
  let invalidPayloadResponse = false;
  for (const payload of schedulePayloads) {
    response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    try {
      result = await response.json();
    } catch {
      throw new Error(
        `Cloudflare API 返回了无效响应（HTTP ${response.status}）`,
      );
    }
    if (response.ok && result?.success === true) break;
    invalidPayloadResponse =
      response.status === 400 ||
      /invalid.*request|request.*body|schedules|cron/i.test(
        getCloudflareScheduleApiError(
          result,
          response.status,
          "更新 Cron Trigger",
        ),
      );
    if (!invalidPayloadResponse) break;
  }
  if (!response.ok || result?.success !== true) {
    throw new Error(
      getCloudflareScheduleApiError(
        result,
        response.status,
        "更新 Cron Trigger",
      ),
    );
  }
  const schedules = Array.isArray(result.result?.schedules)
    ? result.result.schedules
    : Array.isArray(result.result)
      ? result.result
      : null;
  return schedules
    ? schedules
        .map((schedule) => schedule?.cron)
        .filter((cron) => typeof cron === "string")
    : cronExpressions;
}
async function getAppliedCronExpressions(env) {
  const raw = await env.IP_STORAGE.get(APPLIED_CRON_EXPRESSIONS_KEY);
  if (!raw) return [];
  try {
    const schedules = JSON.parse(raw);
    return Array.isArray(schedules)
      ? schedules.filter((cron) => typeof cron === "string")
      : [];
  } catch (error) {
    console.warn("Failed to parse applied Cloudflare Cron Triggers:", error);
    return [];
  }
}
async function recordScheduledError(env, event, stage, error) {
  const entry = {
    level: "ERROR",
    timestamp: new Date().toISOString(),
    cron: typeof event?.cron === "string" ? event.cron : null,
    stage: String(stage || "scheduled").slice(0, 100),
    message: String(error?.message || error || "Unknown scheduled task error")
      .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
      .slice(0, 1000),
  };
  if (!env?.IP_STORAGE) {
    console.error(
      "Scheduled task failed and IP_STORAGE is unavailable:",
      entry,
    );
    return false;
  }
  try {
    const raw = await env.IP_STORAGE.get(SCHEDULED_ERROR_LOGS_KEY);
    let logs = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) logs = parsed;
        else
          console.error(
            "Scheduled error log data is not an array; replacing it",
          );
      } catch (parseError) {
        console.error(
          "Failed to parse scheduled error logs; replacing them:",
          parseError,
        );
      }
    }
    logs.push(entry);
    await env.IP_STORAGE.put(
      SCHEDULED_ERROR_LOGS_KEY,
      JSON.stringify(logs.slice(-MAX_SCHEDULED_ERROR_LOGS)),
      { expirationTtl: 60 * 60 * 24 * 30 },
    );
    return true;
  } catch (logError) {
    console.error(
      "Scheduled task error could not be persisted; inspect Cloudflare Workers Logs:",
      { entry, persistenceError: String(logError?.message || logError) },
    );
    return false;
  }
}
function emitScheduledLog(logEvent, level, event, details = {}) {
  const entry = {
    level: String(level || "INFO").toUpperCase(),
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };
  const logMethod =
    entry.level === "ERROR"
      ? console.error
      : entry.level === "WARN"
        ? console.warn
        : console.log;
  logMethod("Scheduled event:", JSON.stringify(entry));
  if (Array.isArray(logEvent)) logEvent.push(entry);
  else if (typeof logEvent === "function") logEvent(entry);
  return entry;
}
function summarizeScheduledActivity(entry) {
  if (!entry || !SCHEDULED_ACTIVITY_EVENTS.has(entry.event)) return null;
  const summary = {
    timestamp:
      entry.timestamp ||
      entry.startedAt ||
      entry.completedAt ||
      entry.createdAt ||
      null,
    level: entry.level || "INFO",
    event: entry.event,
  };
  for (const key of [
    "cron",
    "stage",
    "reason",
    "error",
    "durationMs",
    "uniqueAddressCount",
    "locatedAddressCount",
    "sourceCount",
    "totalAddresses",
    "batchNumber",
    "batchSize",
    "completedAddresses",
    "remainingAddresses",
    "requestedCount",
    "successCount",
    "attemptedFailureCount",
    "quotaDeferredCount",
    "failedCount",
    "testedAddresses",
    "bandwidthTestedCount",
    "collectedAddresses",
  ]) {
    if (entry[key] !== undefined && entry[key] !== null) {
      summary[key] = entry[key];
    }
  }
  return summary;
}
async function persistScheduledActivityLogs(env, entries) {
  const activity = entries.map(summarizeScheduledActivity).filter(Boolean);
  if (!activity.length) return;
  try {
    const raw = await env.IP_STORAGE.get(SCHEDULED_ACTIVITY_LOGS_KEY);
    let logs = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) logs = parsed;
      else throw new Error("定时运行日志格式无效");
    }
    await env.IP_STORAGE.put(
      SCHEDULED_ACTIVITY_LOGS_KEY,
      JSON.stringify([...logs, ...activity].slice(-MAX_SCHEDULED_ERROR_LOGS)),
      { expirationTtl: 60 * 60 * 24 * 30 },
    );
  } catch (error) {
    console.error(
      "Scheduled activity logs could not be saved to KV:",
      String(error?.message || error),
    );
  }
}
async function updateScheduledTransferredBytes(env, transferredBytes) {
  if (!env?.IP_STORAGE) return;
  try {
    const raw = await env.IP_STORAGE.get(SCHEDULED_RUN_STATS_KEY);
    let stats = {};
    if (raw) {
      try {
        stats = JSON.parse(raw) || {};
      } catch (error) {
        console.error(
          "Failed to parse scheduled run stats while updating traffic:",
          error,
        );
      }
    }
    stats.transferredBytes = Math.max(0, Number(transferredBytes) || 0);
    await env.IP_STORAGE.put(SCHEDULED_RUN_STATS_KEY, JSON.stringify(stats), {
      expirationTtl: 60 * 60 * 24 * 30,
    });
  } catch (error) {
    console.error("Failed to persist scheduled transferred bytes:", error);
  }
}
async function persistScheduledRunSummary(env, entries) {
  if (!env?.IP_STORAGE || !entries.length) return;
  try {
    const raw = await env.IP_STORAGE.get(SCHEDULED_RUN_STATS_KEY);
    let stats = {
      runCount: 0,
      successfulRunCount: 0,
      errorRunCount: 0,
      lastRunAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      updatedAddressCount: 0,
      lastIpCount: 0,
      transferredBytes: 0,
      lastError: null,
    };
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          stats = { ...stats, ...parsed };
        }
      } catch (error) {
        console.error(
          "Failed to parse scheduled run stats; replacing them:",
          error,
        );
      }
    }

    const started = entries.find(
      (entry) => entry.event === "scheduled_invocation_started",
    );
    const completed = entries.find(
      (entry) => entry.event === "scheduled_invocation_completed",
    );
    const collected = entries.find(
      (entry) => entry.event === "scheduled_address_collection_completed",
    );
    const jobCreated = entries.find(
      (entry) => entry.event === "scheduled_speedtest_job_created",
    );
    const failed = entries.find(
      (entry) => entry.event === "scheduled_invocation_failed",
    );
    const lastRunAt =
      started?.startedAt || completed?.completedAt || new Date().toISOString();
    stats.runCount = Number(stats.runCount) + 1;
    stats.lastRunAt = lastRunAt;

    const ipCount =
      jobCreated?.totalAddresses ??
      completed?.collectedAddresses ??
      collected?.uniqueAddressCount ??
      0;
    if (Number.isFinite(Number(ipCount))) {
      stats.lastIpCount = Number(ipCount);
    }
    if (Number.isFinite(Number(completed?.collectedAddresses))) {
      stats.updatedAddressCount = Number(completed.collectedAddresses);
    } else if (Number.isFinite(Number(collected?.uniqueAddressCount))) {
      stats.updatedAddressCount = Number(collected.uniqueAddressCount);
    }

    if (failed) {
      stats.errorRunCount = Number(stats.errorRunCount) + 1;
      stats.lastErrorAt = failed.timestamp || lastRunAt;
      stats.lastError = {
        stage: failed.stage || null,
        message: String(failed.error || "").slice(0, 1000),
      };
    } else if (completed || jobCreated) {
      stats.successfulRunCount = Number(stats.successfulRunCount) + 1;
      stats.lastSuccessAt =
        completed?.completedAt || jobCreated?.createdAt || lastRunAt;
      stats.lastError = null;
    }

    await env.IP_STORAGE.put(SCHEDULED_RUN_STATS_KEY, JSON.stringify(stats), {
      expirationTtl: 60 * 60 * 24 * 30,
    });
    await persistScheduledActivityLogs(env, entries);
  } catch (error) {
    console.error(
      "Scheduled run logs could not be saved to KV; inspect Cloudflare Workers Logs:",
      String(error?.message || error),
    );
  }
}
function sortIPsBySpeed(
  ips,
  includeBandwidth = ips.some(
    (item) => Number.isFinite(item?.bandwidth) && item.bandwidth > 0,
  ),
) {
  return ips.sort((a, b) => {
    const latencyA = Number.isFinite(Number(a?.latency))
      ? Number(a.latency)
      : Number.POSITIVE_INFINITY;
    const latencyB = Number.isFinite(Number(b?.latency))
      ? Number(b.latency)
      : Number.POSITIVE_INFINITY;
    if (latencyA !== latencyB) return latencyA - latencyB;
    if (!includeBandwidth) return 0;
    const bandwidthA =
      Number.isFinite(Number(a?.bandwidth)) && Number(a.bandwidth) > 0
        ? Number(a.bandwidth)
        : Number.NEGATIVE_INFINITY;
    const bandwidthB =
      Number.isFinite(Number(b?.bandwidth)) && Number(b.bandwidth) > 0
        ? Number(b.bandwidth)
        : Number.NEGATIVE_INFINITY;
    return bandwidthB - bandwidthA;
  });
}
function getCountryCodeForIP(item) {
  const explicitCode = String(
    item?.countryCode ||
      item?.country_code ||
      item?.country ||
      item?.regionCode ||
      "",
  ).toUpperCase();
  if (Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, explicitCode)) {
    return explicitCode;
  }
  const location = String(
    item?.location || item?.region || item?.country || "",
  ).trim();
  const flagMatch = location.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
  if (flagMatch) {
    const flagCode = Array.from(flagMatch[0], (character) =>
      String.fromCharCode(character.codePointAt(0) - 0x1f1e6 + 65),
    ).join("");
    if (Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, flagCode)) {
      return flagCode;
    }
  }
  const normalizedLocation = location.toLowerCase();
  const nameMatch = Object.entries(SUPPORTED_COUNTRIES)
    .sort(([, nameA], [, nameB]) => nameB.length - nameA.length)
    .find(([code, name]) =>
      [
        name,
        ...(COUNTRY_KEYWORDS[code] || []).filter(
          (keyword) => keyword !== code.toLowerCase(),
        ),
      ].some((keyword) => normalizedLocation.includes(keyword.toLowerCase())),
    );
  if (nameMatch) return nameMatch[0];
  const codeMatch = location.match(
    /(?:^|[^A-Za-z])([A-Za-z]{2})(?=$|[^A-Za-z])/,
  );
  const countryCode = codeMatch?.[1].toUpperCase();
  return countryCode &&
    Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, countryCode)
    ? countryCode
    : null;
}
function isDomainAddress(item) {
  const address = String(item?.address || item?.ip || "").trim();
  return parseAddressWithPort(address).type === "domain";
}
function isSpeedTestedIP(item) {
  const latency = Number(item?.latency);
  const bandwidth = Number(item?.bandwidth);
  return (
    Number.isFinite(latency) &&
    latency > 0 &&
    Number.isFinite(bandwidth) &&
    bandwidth > 0
  );
}
function getBandwidthSpeedClass(value, minBandwidth) {
  const bandwidth = Number(value);
  if (!Number.isFinite(bandwidth) || bandwidth <= 0) return "";
  return bandwidth >= 10
    ? "bandwidth-fast"
    : bandwidth >= 5
      ? "bandwidth-medium"
      : "bandwidth-slow";
}
function getLatencySpeedClass(value, maxLatency) {
  const latency = Number(value);
  if (!Number.isFinite(latency) || latency <= 0) return "";
  return latency <= 100
    ? "speed-fast"
    : latency <= 200
      ? "speed-medium"
      : "speed-slow";
}
function rankIPsByLatencyAndBandwidth(ips) {
  if (ips.length < 2) return [...ips];
  const latencyRanks = new Map();
  const bandwidthRanks = new Map();
  const rankByMetric = (metric, direction, ranks) => {
    const sorted = [...ips].sort((a, b) => {
      const difference = Number(a[metric]) - Number(b[metric]);
      return direction === "ascending" ? difference : -difference;
    });
    for (let start = 0; start < sorted.length; ) {
      let end = start + 1;
      while (
        end < sorted.length &&
        Number(sorted[end][metric]) === Number(sorted[start][metric])
      ) {
        end++;
      }
      const averageRank = (start + 1 + end) / 2;
      for (let index = start; index < end; index++) {
        ranks.set(sorted[index], averageRank);
      }
      start = end;
    }
  };
  rankByMetric("latency", "ascending", latencyRanks);
  rankByMetric("bandwidth", "descending", bandwidthRanks);
  return [...ips].sort((a, b) => {
    const rankDifference =
      latencyRanks.get(a) +
      bandwidthRanks.get(a) -
      latencyRanks.get(b) -
      bandwidthRanks.get(b);
    if (rankDifference) return rankDifference;
    const latencyDifference = Number(a.latency) - Number(b.latency);
    return latencyDifference || Number(b.bandwidth) - Number(a.bandwidth);
  });
}
function meetsQualityThresholds(item, thresholds = {}) {
  const maxLatency = Number.isFinite(thresholds.maxLatency)
    ? thresholds.maxLatency
    : DEFAULT_MAX_SPEED_TEST_LATENCY;
  const minBandwidth = Number.isFinite(thresholds.minBandwidth)
    ? thresholds.minBandwidth
    : DEFAULT_MIN_SPEED_TEST_BANDWIDTH;
  return (
    Number(item?.latency) <= maxLatency &&
    (minBandwidth === 0 || Number(item?.bandwidth) >= minBandwidth)
  );
}
function classifyIPsByCountry(ips, selectedCountries, thresholds = {}) {
  const selectedCountrySet = new Set(selectedCountries);
  const categories = new Map();
  const rankByAddress = new Map();
  const qualityByCountry = new Map(
    selectedCountries.map((countryCode) => [countryCode, []]),
  );
  const qualityDomainsByCountry = new Map(
    selectedCountries.map((countryCode) => [countryCode, []]),
  );
  const selectedCountryGroups = new Map();
  const backupGroups = new Map();
  const measuredBackups = [];
  const untested = [];

  for (const item of ips) {
    const countryCode = getCountryCodeForIP(item);
    if (!isSpeedTestedIP(item)) {
      categories.set(item.address, "untested");
      untested.push(item);
    } else if (
      countryCode &&
      selectedCountrySet.has(countryCode) &&
      meetsQualityThresholds(item, thresholds)
    ) {
      const domain = isDomainAddress(item);
      const category = domain ? "premium-domain" : "premium";
      const groupKey = `${countryCode}:${category}`;
      if (!selectedCountryGroups.has(groupKey)) {
        selectedCountryGroups.set(groupKey, {
          countryCode,
          category,
          items: [],
        });
      }
      selectedCountryGroups.get(groupKey).items.push(item);
      categories.set(item.address, "backup");
    } else {
      categories.set(item.address, "backup");
      const groupKey = `${countryCode || ""}:${isDomainAddress(item) ? "domain" : "ip"}`;
      if (!backupGroups.has(groupKey)) {
        backupGroups.set(groupKey, []);
      }
      backupGroups.get(groupKey).push(item);
    }
  }

  const qualityIPs = [];
  const qualityDomains = [];
  for (const group of selectedCountryGroups.values()) {
    const ranked = rankIPsByLatencyAndBandwidth(group.items);
    ranked.forEach((item, index) => rankByAddress.set(item.address, index + 1));
    const countryLimits = thresholds.qualityCountryLimits?.[group.countryCode];
    const configuredLimit =
      typeof countryLimits === "number"
        ? countryLimits
        : group.category === "premium-domain"
          ? countryLimits?.domain
          : countryLimits?.ip;
    const limit =
      Number.isSafeInteger(configuredLimit) &&
      configuredLimit >= 0 &&
      configuredLimit <= MAX_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE
        ? configuredLimit
        : DEFAULT_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE;
    const premium = ranked.slice(0, limit);
    const overflow = ranked.slice(limit);
    for (const item of premium) categories.set(item.address, group.category);
    if (group.category === "premium-domain") {
      qualityDomains.push(...premium);
      qualityDomainsByCountry.get(group.countryCode).push(...premium);
    } else {
      qualityIPs.push(...premium);
      qualityByCountry.get(group.countryCode).push(...premium);
    }
    measuredBackups.push(...overflow);
  }
  for (const backupItems of backupGroups.values()) {
    const ranked = rankIPsByLatencyAndBandwidth(backupItems);
    ranked.forEach((item, index) => rankByAddress.set(item.address, index + 1));
    measuredBackups.push(...ranked);
  }

  return {
    categories,
    qualityByCountry,
    qualityDomainsByCountry,
    qualityIPs,
    qualityDomains,
    rankByAddress,
    measuredBackups: rankIPsByLatencyAndBandwidth(measuredBackups),
    untested,
  };
}
function prioritizeQualityTestCandidates(items, selectedCountries) {
  const groups = new Map();
  for (const countryCode of selectedCountries) {
    for (const addressType of ["ip", "domain"]) {
      groups.set(`${countryCode}:${addressType}`, []);
    }
  }
  const fallback = [];
  for (const item of items) {
    const countryCode = getCountryCodeForIP(item);
    const addressType = isDomainAddress(item) ? "domain" : "ip";
    const group = groups.get(`${countryCode}:${addressType}`);
    if (group) group.push(item);
    else fallback.push(item);
  }
  const prioritized = [];
  let hasCandidates = true;
  while (hasCandidates) {
    hasCandidates = false;
    for (const group of groups.values()) {
      if (group.length) {
        prioritized.push(group.shift());
        hasCandidates = true;
      }
    }
  }
  return [...prioritized, ...fallback];
}
function includeAllPremiumAddresses(
  displayIPs,
  candidates,
  classification,
  blacklist,
) {
  const result = new Map(
    (displayIPs || []).map((item) => [item.address, item]),
  );
  const normalizedBlacklist = preprocessBlacklist(blacklist || []);
  for (const item of candidates) {
    const category = classification.categories.get(item.address);
    if (
      (category === "premium" || category === "premium-domain") &&
      !isBlacklisted(item.address, normalizedBlacklist)
    ) {
      result.set(item.address, item);
    }
  }
  return [...result.values()];
}
async function enrichIPsWithQualityCountries(env, ips) {
  const raw = await env.IP_STORAGE.get("cloudflare_quality_ips");
  if (!raw || !Array.isArray(ips) || ips.length === 0) return ips || [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to parse stored quality-country data:", error);
    return ips;
  }
  const countryByAddress = new Map();
  for (const collectionName of ["countries", "domains"]) {
    const qualityCountries = data?.[collectionName];
    if (!qualityCountries || typeof qualityCountries !== "object") continue;
    for (const [countryCode, entries] of Object.entries(qualityCountries)) {
      if (
        !Object.prototype.hasOwnProperty.call(
          SUPPORTED_COUNTRIES,
          countryCode,
        ) ||
        !Array.isArray(entries)
      ) {
        continue;
      }
      for (const entry of entries) {
        if (typeof entry?.ip !== "string" || !entry.ip.trim()) continue;
        const addressKey = entry.ip
          .trim()
          .replace(/^\[|\]$/g, "")
          .toLowerCase();
        countryByAddress.set(addressKey, countryCode);
      }
    }
  }
  return ips.map((item) => {
    if (getCountryCodeForIP(item)) return item;
    const address = String(item?.address || "").trim();
    const addressKey = address.replace(/^\[|\]$/g, "").toLowerCase();
    const countryCode = countryByAddress.get(addressKey);
    return countryCode
      ? { ...item, countryCode, location: item.location || countryCode }
      : item;
  });
}
const SUPPORTED_COUNTRIES = {
  HK: "香港",
  TW: "台湾",
  KR: "韩国",
  JP: "日本",
  SG: "新加坡",
  US: "美国",
  CA: "加拿大",
  DE: "德国",
  NL: "荷兰",
  FR: "法国",
  CH: "瑞士",
  AT: "奥地利",
  GB: "英国",
  DK: "丹麦",
  FI: "芬兰",
  IE: "爱尔兰",
  ES: "西班牙",
  PT: "葡萄牙",
  IT: "意大利",
  GR: "希腊",
  NO: "挪威",
  IS: "冰岛",
  AU: "澳大利亚",
  ZA: "南非",
  MX: "墨西哥",
  BR: "巴西",
  PE: "秘鲁",
  CL: "智利",
  AR: "阿根廷",
  NZ: "新西兰",
  GH: "加纳",
  TZ: "坦桑尼亚",
  UG: "乌干达",
  LA: "老挝",
  KH: "柬埔寨",
  TH: "泰国",
  MY: "马来西亚",
  PH: "菲律宾",
  ID: "印度尼西亚",
  NP: "尼泊尔",
  IN: "印度",
};
const COUNTRY_KEYWORDS = Object.fromEntries(
  Object.keys(SUPPORTED_COUNTRIES).map((code) => [
    code,
    [code.toLowerCase(), ...(code === "JP" ? ["japan"] : [])],
  ]),
);
function getDefaultQualityCountryLimits() {
  return Object.fromEntries(
    Object.keys(SUPPORTED_COUNTRIES).map((code) => [
      code,
      {
        ip: DEFAULT_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE,
        domain: DEFAULT_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE,
      },
    ]),
  );
}
function normalizeQualityCountryLimits(value, fallback = {}) {
  const limits = {};
  for (const code of Object.keys(SUPPORTED_COUNTRIES)) {
    const candidate = value?.[code];
    const previous = fallback?.[code];
    const isValidLimit = (limit) =>
      Number.isSafeInteger(limit) &&
      limit >= 0 &&
      limit <= MAX_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE;
    const previousIP = typeof previous === "number" ? previous : previous?.ip;
    const previousDomain =
      typeof previous === "number" ? previous : previous?.domain;
    limits[code] = {
      ip: isValidLimit(candidate?.ip)
        ? candidate.ip
        : isValidLimit(candidate)
          ? candidate
          : isValidLimit(previousIP)
            ? previousIP
            : DEFAULT_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE,
      domain: isValidLimit(candidate?.domain)
        ? candidate.domain
        : isValidLimit(candidate)
          ? candidate
          : isValidLimit(previousDomain)
            ? previousDomain
            : DEFAULT_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE,
    };
  }
  return limits;
}
function validateQualityCountryLimits(value, fallback = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("qualityCountryLimits 必须是国家代码到数量的对象");
  }
  for (const [code, limits] of Object.entries(value)) {
    if (!Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, code)) {
      throw new Error(`不支持的国家代码：${code}`);
    }
    if (
      typeof limits !== "number" &&
      (!limits ||
        typeof limits !== "object" ||
        Array.isArray(limits) ||
        !Object.prototype.hasOwnProperty.call(limits, "ip") ||
        !Object.prototype.hasOwnProperty.call(limits, "domain"))
    ) {
      throw new Error(`国家 ${code} 必须分别提供优质 IP 和优质域名数量`);
    }
    const values =
      typeof limits === "number" ? [limits] : [limits.ip, limits.domain];
    if (
      values.some(
        (limit) =>
          limit !== undefined &&
          (!Number.isSafeInteger(limit) ||
            limit < 0 ||
            limit > MAX_QUALITY_ADDRESSES_PER_COUNTRY_AND_TYPE),
      )
    ) {
      throw new Error(
        "每个国家的优质 IP 和优质域名数量必须分别为 0 到 1000 之间的整数",
      );
    }
  }
  return normalizeQualityCountryLimits(value, fallback);
}

async function getCollectorSettings(env) {
  let settings = {};
  const rawSettings = await env.IP_STORAGE.get(COLLECTOR_SETTINGS_KEY);
  if (rawSettings) {
    try {
      settings = JSON.parse(rawSettings) || {};
    } catch (error) {
      console.warn("Failed to parse collector settings:", error);
    }
  }
  const storedCount = await env.IP_STORAGE.get(SPEED_TEST_COUNT_KEY);
  const countValue =
    storedCount === null || storedCount === undefined
      ? settings.speedTestCount
      : storedCount;
  const count =
    countValue === null || countValue === undefined || countValue === ""
      ? DEFAULT_SPEED_TEST_COUNT
      : Number(countValue);
  const storedUpdateCount = await env.IP_STORAGE.get(AUTO_UPDATE_COUNT_KEY);
  const updateCountValue =
    storedUpdateCount === null || storedUpdateCount === undefined
      ? settings.autoUpdateCount
      : storedUpdateCount;
  const updateCount =
    updateCountValue === null ||
    updateCountValue === undefined ||
    updateCountValue === ""
      ? DEFAULT_AUTO_UPDATE_COUNT
      : Number(updateCountValue);
  const storedMaxLatency = await env.IP_STORAGE.get(MAX_SPEED_TEST_LATENCY_KEY);
  const maxLatencyValue =
    storedMaxLatency === null || storedMaxLatency === undefined
      ? settings.maxLatency
      : storedMaxLatency;
  const maxLatency =
    maxLatencyValue === null ||
    maxLatencyValue === undefined ||
    maxLatencyValue === ""
      ? DEFAULT_MAX_SPEED_TEST_LATENCY
      : Number(maxLatencyValue);
  const storedMinBandwidth = await env.IP_STORAGE.get(
    MIN_SPEED_TEST_BANDWIDTH_KEY,
  );
  const minBandwidthValue =
    storedMinBandwidth === null || storedMinBandwidth === undefined
      ? settings.minBandwidth
      : storedMinBandwidth;
  const minBandwidth =
    minBandwidthValue === null ||
    minBandwidthValue === undefined ||
    minBandwidthValue === ""
      ? DEFAULT_MIN_SPEED_TEST_BANDWIDTH
      : Number(minBandwidthValue);
  const speedTestMode = "scheduled";
  const manualBatchSize =
    Number.isSafeInteger(settings.manualBatchSize) &&
    settings.manualBatchSize >= MIN_MANUAL_SPEED_TEST_BATCH_SIZE &&
    settings.manualBatchSize <= MAX_MANUAL_SPEED_TEST_BATCH_SIZE
      ? settings.manualBatchSize
      : DEFAULT_MANUAL_SPEED_TEST_BATCH_SIZE;
  const manualBatchIntervalSeconds = Number.isSafeInteger(
    settings.manualBatchIntervalSeconds,
  )
    ? Math.min(
        MAX_MANUAL_SPEED_TEST_INTERVAL_SECONDS,
        Math.max(
          MIN_MANUAL_SPEED_TEST_INTERVAL_SECONDS,
          settings.manualBatchIntervalSeconds,
        ),
      )
    : DEFAULT_MANUAL_SPEED_TEST_BATCH_INTERVAL_SECONDS;
  const manualAddressIntervalSeconds = Number.isSafeInteger(
    settings.manualAddressIntervalSeconds,
  )
    ? Math.min(
        MAX_MANUAL_SPEED_TEST_INTERVAL_SECONDS,
        Math.max(
          MIN_MANUAL_SPEED_TEST_INTERVAL_SECONDS,
          settings.manualAddressIntervalSeconds,
        ),
      )
    : DEFAULT_MANUAL_SPEED_TEST_ADDRESS_INTERVAL_SECONDS;
  const manualSpeedTestTimeoutSeconds =
    Number.isSafeInteger(settings.manualSpeedTestTimeoutSeconds) &&
    settings.manualSpeedTestTimeoutSeconds >= MIN_SPEED_TEST_TIMEOUT_SECONDS &&
    settings.manualSpeedTestTimeoutSeconds <= MAX_SPEED_TEST_TIMEOUT_SECONDS
      ? settings.manualSpeedTestTimeoutSeconds
      : DEFAULT_MANUAL_SPEED_TEST_TIMEOUT_SECONDS;
  let scheduledSpeedTestSettings = {
    batchSize: SCHEDULED_SPEED_TEST_BATCH_SIZE,
    batchIntervalSeconds: DEFAULT_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS,
    addressIntervalSeconds:
      DEFAULT_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS,
    timeoutSeconds: DEFAULT_SCHEDULED_SPEED_TEST_TIMEOUT_SECONDS,
  };
  const storedScheduledSpeedTestSettings = await env.IP_STORAGE.get(
    SCHEDULED_SPEED_TEST_SETTINGS_KEY,
  );
  if (storedScheduledSpeedTestSettings) {
    try {
      const parsed = JSON.parse(storedScheduledSpeedTestSettings);
      const addressIntervalSeconds =
        parsed.addressIntervalSeconds === undefined
          ? DEFAULT_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS
          : parsed.addressIntervalSeconds;
      const timeoutSeconds =
        parsed.timeoutSeconds === undefined
          ? DEFAULT_SCHEDULED_SPEED_TEST_TIMEOUT_SECONDS
          : parsed.timeoutSeconds;
      if (
        Number.isSafeInteger(parsed.batchSize) &&
        parsed.batchSize >= MIN_SCHEDULED_SPEED_TEST_BATCH_SIZE &&
        parsed.batchSize <= MAX_SCHEDULED_SPEED_TEST_BATCH_SIZE &&
        Number.isSafeInteger(parsed.batchIntervalSeconds) &&
        parsed.batchIntervalSeconds >=
          MIN_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS &&
        parsed.batchIntervalSeconds <=
          MAX_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS &&
        Number.isSafeInteger(addressIntervalSeconds) &&
        addressIntervalSeconds >=
          MIN_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS &&
        addressIntervalSeconds <=
          MAX_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS &&
        Number.isSafeInteger(timeoutSeconds) &&
        timeoutSeconds >= MIN_SPEED_TEST_TIMEOUT_SECONDS &&
        timeoutSeconds <= MAX_SPEED_TEST_TIMEOUT_SECONDS
      ) {
        scheduledSpeedTestSettings = {
          batchSize: parsed.batchSize,
          batchIntervalSeconds: parsed.batchIntervalSeconds,
          addressIntervalSeconds,
          timeoutSeconds,
        };
      } else {
        console.warn("Saved scheduled speed-test settings are invalid");
      }
    } catch (error) {
      console.warn("Failed to parse scheduled speed-test settings:", error);
    }
  }
  const storedScheduleTimes = await env.IP_STORAGE.get(SCHEDULE_TIMES_KEY);
  let scheduleFields = DEFAULT_SCHEDULE_FIELDS;
  let scheduleConfigured = false;
  if (storedScheduleTimes !== null && storedScheduleTimes !== undefined) {
    try {
      scheduleFields = normalizeScheduleFields(JSON.parse(storedScheduleTimes));
      scheduleConfigured = true;
    } catch (error) {
      console.warn("Failed to parse saved Cron fields:", error);
    }
  }
  if (
    scheduleFields.minute === "*/3" &&
    scheduleFields.hour === "*" &&
    scheduleFields.dayOfMonth === "*" &&
    scheduleFields.month === "*" &&
    scheduleFields.dayOfWeek === "*"
  ) {
    scheduleFields = DEFAULT_SCHEDULE_FIELDS;
    scheduleConfigured = false;
  }
  if (
    scheduleFields.minute === "0" &&
    scheduleFields.hour === "6,12,17,20" &&
    scheduleFields.dayOfMonth === "*" &&
    scheduleFields.month === "*" &&
    scheduleFields.dayOfWeek === "*"
  ) {
    scheduleFields = DEFAULT_SCHEDULE_FIELDS;
    scheduleConfigured = false;
  }
  const storedScheduleTimezone = await env.IP_STORAGE.get(
    SCHEDULE_TIMEZONE_KEY,
  );
  const scheduleTimezone = SUPPORTED_SCHEDULE_TIMEZONES.includes(
    storedScheduleTimezone,
  )
    ? storedScheduleTimezone
    : "UTC";
  let countries = null;
  const storedCountries = await env.IP_STORAGE.get(QUALITY_COUNTRIES_KEY);
  if (storedCountries !== null && storedCountries !== undefined) {
    try {
      countries = JSON.parse(storedCountries);
    } catch (error) {
      console.warn("Failed to parse saved quality countries:", error);
    }
  }
  if (!Array.isArray(countries)) countries = settings.qualityCountries;
  countries = Array.isArray(countries)
    ? countries.filter((code) =>
        Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, code),
      )
    : DEFAULT_QUALITY_COUNTRIES;
  let qualityCountryLimits = settings.qualityCountryLimits;
  const storedCountryLimits = await env.IP_STORAGE.get(
    QUALITY_COUNTRY_LIMITS_KEY,
  );
  if (storedCountryLimits !== null && storedCountryLimits !== undefined) {
    try {
      qualityCountryLimits = JSON.parse(storedCountryLimits);
    } catch (error) {
      console.warn("Failed to parse saved quality country limits:", error);
    }
  }
  qualityCountryLimits = normalizeQualityCountryLimits(
    qualityCountryLimits,
    getDefaultQualityCountryLimits(),
  );
  const storedLimit = await env.IP_STORAGE.get("ip_limit");
  const limitValue =
    storedLimit === null || storedLimit === undefined
      ? settings.displayLimit
      : storedLimit;
  const numericLimit =
    limitValue === null || limitValue === undefined || limitValue === ""
      ? null
      : Number(limitValue);
  let sources = null;
  const storedSources = await env.IP_STORAGE.get("sources_urls");
  if (storedSources !== null && storedSources !== undefined) {
    try {
      sources = JSON.parse(storedSources);
    } catch (error) {
      console.warn("Failed to parse saved data sources:", error);
    }
  }
  if (!Array.isArray(sources)) {
    sources = settings.sources;
  }
  return {
    speedTestCount:
      Number.isSafeInteger(count) && count >= 0
        ? count
        : DEFAULT_SPEED_TEST_COUNT,
    manualBatchIntervalSeconds,
    manualBatchSize,
    manualAddressIntervalSeconds,
    manualSpeedTestTimeoutSeconds,
    autoUpdateCount:
      Number.isSafeInteger(updateCount) && updateCount >= 0
        ? updateCount
        : DEFAULT_AUTO_UPDATE_COUNT,
    maxLatency:
      Number.isSafeInteger(maxLatency) && maxLatency > 0
        ? maxLatency
        : DEFAULT_MAX_SPEED_TEST_LATENCY,
    minBandwidth:
      Number.isFinite(minBandwidth) && minBandwidth >= 0
        ? minBandwidth
        : DEFAULT_MIN_SPEED_TEST_BANDWIDTH,
    speedTestMode,
    scheduledSpeedTestBatchSize: scheduledSpeedTestSettings.batchSize,
    scheduledSpeedTestBatchIntervalSeconds:
      scheduledSpeedTestSettings.batchIntervalSeconds,
    scheduledSpeedTestAddressIntervalSeconds:
      scheduledSpeedTestSettings.addressIntervalSeconds,
    scheduledSpeedTestTimeoutSeconds: scheduledSpeedTestSettings.timeoutSeconds,
    scheduleFields,
    scheduleTimezone,
    scheduleConfigured,
    desiredCronExpressions: scheduleConfigured
      ? getCronExpressionsForFields(scheduleFields, scheduleTimezone)
      : [],
    qualityCountries: countries.length
      ? [...new Set(countries)]
      : [...DEFAULT_QUALITY_COUNTRIES],
    qualityCountryLimits,
    displayLimit:
      Number.isSafeInteger(numericLimit) && numericLimit > 0
        ? numericLimit
        : null,
    sources:
      Array.isArray(sources) &&
      sources.every((source) => typeof source === "string")
        ? sources
        : [],
  };
}

async function saveCollectorSettings(env, updates) {
  const current = await getCollectorSettings(env);
  const settings = { ...current, ...updates };
  if (Object.prototype.hasOwnProperty.call(updates, "speedTestCount")) {
    const value = String(settings.speedTestCount);
    if ((await env.IP_STORAGE.get(SPEED_TEST_COUNT_KEY)) !== value) {
      await env.IP_STORAGE.put(SPEED_TEST_COUNT_KEY, value);
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, "autoUpdateCount")) {
    const value = String(settings.autoUpdateCount);
    if ((await env.IP_STORAGE.get(AUTO_UPDATE_COUNT_KEY)) !== value) {
      await env.IP_STORAGE.put(AUTO_UPDATE_COUNT_KEY, value);
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, "maxLatency")) {
    const value = String(settings.maxLatency);
    if ((await env.IP_STORAGE.get(MAX_SPEED_TEST_LATENCY_KEY)) !== value) {
      await env.IP_STORAGE.put(MAX_SPEED_TEST_LATENCY_KEY, value);
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, "minBandwidth")) {
    const value = String(settings.minBandwidth);
    if ((await env.IP_STORAGE.get(MIN_SPEED_TEST_BANDWIDTH_KEY)) !== value) {
      await env.IP_STORAGE.put(MIN_SPEED_TEST_BANDWIDTH_KEY, value);
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, "scheduleFields")) {
    const value = JSON.stringify(
      normalizeScheduleFields(settings.scheduleFields),
    );
    if ((await env.IP_STORAGE.get(SCHEDULE_TIMES_KEY)) !== value) {
      await env.IP_STORAGE.put(SCHEDULE_TIMES_KEY, value);
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, "scheduleTimezone")) {
    if (!SUPPORTED_SCHEDULE_TIMEZONES.includes(settings.scheduleTimezone)) {
      throw new Error("不支持的定时任务时区");
    }
    if (
      (await env.IP_STORAGE.get(SCHEDULE_TIMEZONE_KEY)) !==
      settings.scheduleTimezone
    ) {
      await env.IP_STORAGE.put(
        SCHEDULE_TIMEZONE_KEY,
        settings.scheduleTimezone,
      );
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, "qualityCountries")) {
    const value = JSON.stringify(settings.qualityCountries);
    if ((await env.IP_STORAGE.get(QUALITY_COUNTRIES_KEY)) !== value) {
      await env.IP_STORAGE.put(QUALITY_COUNTRIES_KEY, value);
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, "qualityCountryLimits")) {
    settings.qualityCountryLimits = validateQualityCountryLimits(
      updates.qualityCountryLimits,
      current.qualityCountryLimits,
    );
    const value = JSON.stringify(settings.qualityCountryLimits);
    if ((await env.IP_STORAGE.get(QUALITY_COUNTRY_LIMITS_KEY)) !== value) {
      await env.IP_STORAGE.put(QUALITY_COUNTRY_LIMITS_KEY, value);
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, "displayLimit")) {
    const value =
      settings.displayLimit === null ? "0" : String(settings.displayLimit);
    if ((await env.IP_STORAGE.get("ip_limit")) !== value) {
      await env.IP_STORAGE.put("ip_limit", value);
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, "sources")) {
    const value = JSON.stringify(settings.sources);
    if ((await env.IP_STORAGE.get("sources_urls")) !== value) {
      await env.IP_STORAGE.put("sources_urls", value);
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, "manualBatchSize") ||
    Object.prototype.hasOwnProperty.call(updates, "manualBatchIntervalSeconds") ||
    Object.prototype.hasOwnProperty.call(
      updates,
      "manualAddressIntervalSeconds",
    ) ||
    Object.prototype.hasOwnProperty.call(updates, "manualSpeedTestTimeoutSeconds")
  ) {
    const value = JSON.stringify({
      ...settings,
      manualBatchSize: settings.manualBatchSize,
      manualBatchIntervalSeconds:
        settings.manualBatchIntervalSeconds,
      manualAddressIntervalSeconds:
        settings.manualAddressIntervalSeconds,
      manualSpeedTestTimeoutSeconds:
        settings.manualSpeedTestTimeoutSeconds,
    });
    await env.IP_STORAGE.put(COLLECTOR_SETTINGS_KEY, value);
  }
  return settings;
}

async function getConfiguredSpeedTestCount(env) {
  return (await getCollectorSettings(env)).speedTestCount;
}

async function getConfiguredAutoUpdateCount(env) {
  return (await getCollectorSettings(env)).autoUpdateCount;
}

async function getConfiguredQualityCountries(env) {
  return (await getCollectorSettings(env)).qualityCountries;
}

async function testIPSpeed(address, timeoutMs = 8000) {
  const requestStartedAt = Date.now();
  let httpStatus = null;
  let contentLength = null;
  let retryAfter = null;
  const controller = new AbortController();
  let timeoutId;
  let didTimeout = false;
  try {
    const parsed = parseAddressWithPort(address);
    const resolveOverride =
      parsed.type === "ipv6" ? `[${parsed.address}]` : parsed.address;
    const testUrl = `https://speed.cloudflare.com/__down?bytes=${TEST_BYTES}`;
    const request = async () => {
      const response = await fetch(testUrl, {
        headers: {
          Host: "speed.cloudflare.com",
          "User-Agent":
            "Mozilla/5.0 (compatible; CF-Worker-Test/1.0; low-volume-manual)",
        },
        cf: { resolveOverride },
        signal: controller.signal,
      });
      httpStatus = response.status;
      contentLength = response.headers.get("content-length");
      retryAfter = response.headers.get("retry-after");
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          httpStatus,
          contentLength,
          retryAfter,
          bytesReceived: null,
          elapsedMs: Math.max(1, Date.now() - requestStartedAt),
          requestStartedAt: new Date(requestStartedAt).toISOString(),
        };
      }

      const body = await response.arrayBuffer();
      const elapsedMs = Math.max(1, Date.now() - requestStartedAt);
      const bytesReceived = body.byteLength;
      const bandwidth = bytesReceived / 1024 / 1024 / (elapsedMs / 1000);
      return {
        success: true,
        latency: elapsedMs,
        bandwidth,
        httpStatus,
        contentLength,
        retryAfter,
        bytesReceived,
        elapsedMs,
        requestStartedAt: new Date(requestStartedAt).toISOString(),
      };
    };
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
        const error = new Error(
          `Speed test timed out after ${timeoutMs} ms`,
        );
        error.name = "TimeoutError";
        reject(error);
      }, timeoutMs);
    });
    return await Promise.race([request(), timeout]);
  } catch (error) {
    const elapsedMs = Math.max(1, Date.now() - requestStartedAt);
    return {
      success: false,
      error: String(error?.message || error),
      httpStatus,
      contentLength,
      retryAfter,
      bytesReceived: null,
      elapsedMs,
      timedOut:
        didTimeout ||
        isSpeedTestTimeoutFailure(`${error?.name || ""} ${error?.message || error}`) ||
        elapsedMs >= timeoutMs - 250,
      requestStartedAt: new Date(requestStartedAt).toISOString(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function speedTestAndStore(
  env,
  ips,
  maxTest = 25,
  includeResults = false,
  onProgress = null,
  persistSummary = true,
  options = {},
) {
  if (!ips || ips.length === 0) return [];

  const speedResults = [];
  const BATCH_SIZE = Number.isSafeInteger(options.concurrency)
    ? Math.max(
        1,
        Math.min(options.concurrency, SCHEDULED_SPEED_TEST_CONCURRENCY),
      )
    : 2;
  const DELAY_BETWEEN_BATCH = Number.isSafeInteger(
    options.delayBetweenBatchesMs,
  )
    ? Math.max(0, options.delayBetweenBatchesMs)
    : 250;
  const timeoutMs = Number.isSafeInteger(options.timeoutMs)
    ? options.timeoutMs
    : 8000;

  const ipsToTest = ips.slice(0, maxTest);
  if (!options.silent) console.log(`Speed test: ${ipsToTest.length} IPs`);
  let completedCount = 0;
  const failedResults = [];
  const autoBlacklistedAddresses = [];
  let subrequestLimitError = null;
  let previousRequestStartedAt = null;

  for (let i = 0; i < ipsToTest.length; i += BATCH_SIZE) {
    const batch = ipsToTest.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (ip) => {
        let result;
        try {
          result = {
            status: "fulfilled",
            value: await testIPSpeed(ip, timeoutMs),
          };
        } catch (reason) {
          result = { status: "rejected", reason };
        }
        const succeeded = result.status === "fulfilled" && result.value.success;
        if (options.logScheduledRequests) {
          const measurement =
            result.status === "fulfilled" ? result.value : null;
          const requestStartedAt = measurement?.requestStartedAt
            ? Date.parse(measurement.requestStartedAt)
            : null;
          emitScheduledLog(
            options.logEvent,
            succeeded ? "INFO" : "WARN",
            "scheduled_speedtest_request",
            {
              cron: options.cron || null,
              batchNumber: options.batchNumber || null,
              address: ip,
              success: succeeded,
              httpStatus: measurement?.httpStatus ?? null,
              elapsedMs: measurement?.elapsedMs ?? null,
              timedOut: measurement?.timedOut === true,
              latencyMs: succeeded ? Math.round(measurement.latency) : null,
              bandwidthMBps: succeeded
                ? Number(measurement.bandwidth.toFixed(3))
                : null,
              bytesReceived: measurement?.bytesReceived ?? null,
              contentLength: measurement?.contentLength ?? null,
              retryAfter: measurement?.retryAfter ?? null,
              requestStartedAt: measurement?.requestStartedAt ?? null,
              actualStartIntervalMs:
                Number.isFinite(requestStartedAt) && previousRequestStartedAt
                  ? requestStartedAt - previousRequestStartedAt
                  : null,
              error:
                result.status === "rejected"
                  ? String(
                      result.reason?.message ||
                        result.reason ||
                        "Request failed",
                    )
                  : measurement?.error || null,
            },
          );
          if (Number.isFinite(requestStartedAt)) {
            previousRequestStartedAt = requestStartedAt;
          }
        }
        if (!succeeded) {
          const error =
            result.status === "rejected"
              ? String(
                  result.reason?.message || result.reason || "Request failed",
                )
              : String(result.value?.error || "Speed test failed");
          failedResults.push({
            ip,
            error,
            timedOut:
              (result.status === "fulfilled" && result.value?.timedOut === true) ||
              isSpeedTestTimeoutFailure(error),
          });
          if (isSubrequestLimitFailure(error)) {
            subrequestLimitError ||= error;
          }
        }
        completedCount++;
        if (typeof onProgress === "function") {
          onProgress({
            completed: completedCount,
            total: ipsToTest.length,
            address: ip,
            success: succeeded,
            measurement: succeeded
              ? {
                  latency: Math.round(result.value.latency),
                  bandwidth: result.value.bandwidth,
                }
              : null,
          });
        }
        return { ip, result };
      }),
    );

    for (const { ip, result } of batchResults) {
      if (result.status === "fulfilled" && result.value.success) {
        speedResults.push({
          ip,
          latency: Math.round(result.value.latency),
          bandwidth: result.value.bandwidth,
        });
      }
    }

    const timeoutAddresses = failedResults
      .filter(
        (failure) =>
          batch.includes(failure.ip) &&
          (failure.timedOut || isSpeedTestTimeoutFailure(failure.error)),
      )
      .map((failure) => failure.ip);
    const newlyBlacklistedAddresses = await addAddressesToBlacklist(
      env,
      timeoutAddresses,
    );
    autoBlacklistedAddresses.push(...newlyBlacklistedAddresses);
    if (newlyBlacklistedAddresses.length && options.logScheduledRequests) {
      emitScheduledLog(
        options.logEvent,
        "WARN",
        "scheduled_speedtest_timeout_blacklisted",
        {
          cron: options.cron || null,
          batchNumber: options.batchNumber || null,
          addresses: newlyBlacklistedAddresses,
          reason: "speed-test request timeout",
        },
      );
    }

    if (subrequestLimitError) {
      const deferredAddresses = ipsToTest.slice(i + batch.length);
      failedResults.push(
        ...deferredAddresses.map((ip) => ({
          ip,
          error: subrequestLimitError,
        })),
      );
      emitScheduledLog(
        options.logEvent,
        "ERROR",
        "scheduled_speedtest_quota_exhausted",
        {
          cron: options.cron || null,
          batchNumber: options.batchNumber || null,
          completedInInvocation: completedCount,
          deferredAddresses: deferredAddresses.length,
          error: subrequestLimitError,
        },
      );
      break;
    }

    if (i + BATCH_SIZE < ipsToTest.length && DELAY_BETWEEN_BATCH > 0) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCH));
    }
  }

  speedResults.sort(
    (a, b) => a.latency - b.latency || b.bandwidth - a.bandwidth,
  );
  const fastIPs = persistSummary
    ? await storeSpeedTestSummary(env, speedResults, ips.length)
    : [];

  if (!options.silent) {
    console.log(`Test done: ${speedResults.length} successful measurements`);
  }
  if (!includeResults) return fastIPs;
  return options.includeFailures
    ? {
        fastIPs,
        results: speedResults,
        failedResults,
        autoBlacklistedAddresses,
      }
    : { fastIPs, results: speedResults };
}

async function storeSpeedTestSummary(env, speedResults, totalIPs) {
  const speedSettings = await getCollectorSettings(env);
  const latest = await getStoredIPsLatest(env);
  const measurementsByAddress = new Map(
    speedResults.map((item) => [item.ip, item]),
  );
  const classifiedIPs = (latest.ips || []).map((item) => {
    const measurement = measurementsByAddress.get(item.address);
    return measurement
      ? {
          ...item,
          latency: measurement.latency,
          bandwidth: measurement.bandwidth,
        }
      : item;
  });
  const classification = classifyIPsByCountry(
    classifiedIPs,
    speedSettings.qualityCountries,
    speedSettings,
  );
  const fastIPs = classification.qualityIPs.map((item) => ({
    ip: item.address,
    latency: Number(item.latency),
    bandwidth: Number(item.bandwidth),
  }));
  await env.IP_STORAGE.put(
    "cloudflare_fast_ips",
    JSON.stringify({
      fastIPs,
      lastTested: new Date().toISOString(),
      count: fastIPs.length,
      testedCount: speedResults.length,
      totalIPs,
    }),
  );
  return fastIPs;
}

function isSubrequestLimitFailure(error) {
  return /too many subrequests|subrequest(?:s)? (?:limit|quota)|(?:limit|quota) of subrequests|1102/i.test(
    error,
  );
}

// Subrequest quotas reset per Worker invocation, so each Cron invocation handles one batch.
async function continueScheduledSpeedTestJob(
  env,
  event,
  speedSettings,
  setStage,
  logEvent,
) {
  const invocationStartedAt = Date.now();
  const rawData = await env.IP_STORAGE.get("cloudflare_ips");
  if (!rawData) return false;
  let storedData;
  try {
    storedData = JSON.parse(rawData);
  } catch (error) {
    throw new Error(
      `当前 IP 数据无法解析，不能安全续跑定时测速：${error.message}`,
    );
  }
  const job = storedData?.[SCHEDULED_SPEED_TEST_JOB_PROPERTY];
  if (!job) return false;
  delete storedData[SCHEDULED_SPEED_TEST_JOB_PROPERTY];
  job.data = storedData;
  if (
    !job ||
    !Array.isArray(job.pendingAddresses) ||
    !job.data ||
    !Array.isArray(job.data.ips) ||
    !Number.isSafeInteger(job.nextAddressIndex) ||
    !Number.isSafeInteger(job.batchSize) ||
    !parseTimestampKey(job.timestampKey)
  ) {
    throw new Error("定时测速进度数据无效，拒绝重新开始以避免重复测速");
  }
  const jobBatchIntervalSeconds =
    Number.isSafeInteger(job.batchIntervalSeconds) &&
    job.batchIntervalSeconds >= MIN_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS &&
    job.batchIntervalSeconds <= MAX_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS
      ? job.batchIntervalSeconds
      : speedSettings.scheduledSpeedTestBatchIntervalSeconds;
  const jobAddressIntervalSeconds =
    Number.isSafeInteger(job.addressIntervalSeconds) &&
    job.addressIntervalSeconds >=
      MIN_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS &&
    job.addressIntervalSeconds <=
      MAX_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS
      ? job.addressIntervalSeconds
      : speedSettings.scheduledSpeedTestAddressIntervalSeconds;
  job.batchIntervalSeconds = jobBatchIntervalSeconds;
  job.addressIntervalSeconds = jobAddressIntervalSeconds;
  emitScheduledLog(logEvent, "INFO", "scheduled_speedtest_job_resumed", {
    cron: job.cron || event?.cron || null,
    batchNumber: Number(job.batchNumber) || 0,
    totalAddresses: job.pendingAddresses.length,
    completedAddresses: job.nextAddressIndex,
    remainingAddresses: Math.max(
      0,
      job.pendingAddresses.length - job.nextAddressIndex,
    ),
    batchSize: job.batchSize,
    batchIntervalSeconds: jobBatchIntervalSeconds,
    addressIntervalSeconds: jobAddressIntervalSeconds,
    timeoutSeconds:
      Number.isSafeInteger(job.timeoutSeconds) &&
      job.timeoutSeconds >= MIN_SPEED_TEST_TIMEOUT_SECONDS &&
      job.timeoutSeconds <= MAX_SPEED_TEST_TIMEOUT_SECONDS
        ? job.timeoutSeconds
        : speedSettings.scheduledSpeedTestTimeoutSeconds,
    failedCount: Number(job.failedCount) || 0,
    resumedAt: new Date().toISOString(),
  });
  if (speedSettings.speedTestMode !== "scheduled") {
    await env.IP_STORAGE.put("cloudflare_ips", JSON.stringify(job.data));
    emitScheduledLog(logEvent, "WARN", "scheduled_speedtest_job_cancelled", {
      reason: "scheduled mode is disabled",
      batchNumber: Number(job.batchNumber) || 0,
    });
    return false;
  }
  if (Date.now() < Number(job.nextBatchAt || 0)) {
    emitScheduledLog(logEvent, "INFO", "scheduled_speedtest_waiting", {
      batchNumber: (Number(job.batchNumber) || 0) + 1,
      nextBatchAt: new Date(Number(job.nextBatchAt)).toISOString(),
    });
    emitScheduledLog(logEvent, "INFO", "scheduled_invocation_yielded", {
      cron: job.cron || event?.cron || null,
      reason: "batch interval has not elapsed",
      durationMs: Date.now() - invocationStartedAt,
    });
    return true;
  }

  const batch = job.pendingAddresses.slice(
    job.nextAddressIndex,
    job.nextAddressIndex + job.batchSize,
  );
  if (batch.length > 0) {
    job.batchNumber = (Number(job.batchNumber) || 0) + 1;
    const batchStartedAt = Date.now();
    const previousBatchStartedAt = Number(job.lastBatchStartedAt) || null;
    const configuredIntervalSeconds = jobBatchIntervalSeconds;
    const addressIntervalSeconds = jobAddressIntervalSeconds;
    const timeoutSeconds =
      Number.isSafeInteger(job.timeoutSeconds) &&
      job.timeoutSeconds >= MIN_SPEED_TEST_TIMEOUT_SECONDS &&
      job.timeoutSeconds <= MAX_SPEED_TEST_TIMEOUT_SECONDS
        ? job.timeoutSeconds
        : speedSettings.scheduledSpeedTestTimeoutSeconds;
    job.timeoutSeconds = timeoutSeconds;
    emitScheduledLog(logEvent, "INFO", "scheduled_speedtest_batch_start", {
      cron: job.cron || event?.cron || null,
      batchNumber: job.batchNumber,
      batchSize: batch.length,
      addressOffset: job.nextAddressIndex,
      totalAddresses: job.pendingAddresses.length,
      addresses: batch,
      requestConcurrency: 1,
      addressIntervalSeconds,
      timeoutSeconds,
      configuredIntervalSeconds,
      actualIntervalMs: previousBatchStartedAt
        ? batchStartedAt - previousBatchStartedAt
        : null,
      startedAt: new Date(batchStartedAt).toISOString(),
    });
    setStage(`测速批次 ${job.batchNumber}`);
    const result = await speedTestAndStore(
      env,
      batch,
      batch.length,
      true,
      null,
      false,
      {
        concurrency: 1,
        delayBetweenBatchesMs: addressIntervalSeconds * 1000,
        timeoutMs: timeoutSeconds * 1000,
        silent: true,
        includeFailures: true,
        logScheduledRequests: true,
        batchNumber: job.batchNumber,
        cron: job.cron || event?.cron || null,
        logEvent,
      },
    );
    job.transferredBytes =
      (Number(job.transferredBytes) || 0) + result.results.length * TEST_BYTES;
    await updateScheduledTransferredBytes(env, job.transferredBytes);
    const batchDurationMs = Date.now() - batchStartedAt;
    job.lastBatchStartedAt = batchStartedAt;
    const measurements = new Map(
      result.results.map((measurement) => [measurement.ip, measurement]),
    );
    const testedAt = new Date().toISOString();
    const itemsByAddress = new Map(
      job.data.ips.map((item) => [item.address, item]),
    );
    for (const address of batch) {
      const measurement = measurements.get(address);
      if (!measurement) continue;
      const item = itemsByAddress.get(address);
      if (!item) continue;
      item.latency = measurement.latency;
      item.bandwidth = measurement.bandwidth;
      item.bandwidthBytes = TEST_BYTES;
      item.bandwidthTestedAt = testedAt;
      const countryCode = getCountryCodeForIP(item);
      if (countryCode) item.countryCode = countryCode;
    }

    const quotaRetries = [];
    for (const failure of result.failedResults) {
      if (isSubrequestLimitFailure(failure.error)) {
        quotaRetries.push(failure.ip);
        continue;
      }
      job.failedCount = (Number(job.failedCount) || 0) + 1;
      job.failedSamples = Array.isArray(job.failedSamples)
        ? job.failedSamples
        : [];
      if (job.failedSamples.length < 10) {
        job.failedSamples.push(`${failure.ip}: ${failure.error.slice(0, 180)}`);
      }
    }
    const batchQualityResults = result.results.flatMap((measurement) => {
      const item = itemsByAddress.get(measurement.ip);
      const countryCode = item ? getCountryCodeForIP(item) : null;
      return countryCode &&
        Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, countryCode)
        ? [
            {
              ip: measurement.ip,
              countryCode,
              latency: measurement.latency,
              bandwidth: measurement.bandwidth,
              bytes: TEST_BYTES,
              testedAt,
            },
          ]
        : [];
    });
    await storeQualityIPs(env, batchQualityResults);
    emitScheduledLog(logEvent, "INFO", "scheduled_speedtest_batch_complete", {
      cron: job.cron || event?.cron || null,
      batchNumber: job.batchNumber,
      durationMs: batchDurationMs,
      requestedCount: batch.length,
      successCount: result.results.length,
      attemptedFailureCount: result.failedResults.filter(({ ip }) =>
        batch.includes(ip),
      ).length,
      unattemptedDeferredCount: result.failedResults.filter(
        ({ ip }) => !batch.includes(ip),
      ).length,
      successfulResults: result.results,
      failedResults: result.failedResults,
      quotaDeferredCount: quotaRetries.length,
      totalFailedCount: Number(job.failedCount) || 0,
    });
    job.pendingAddresses = Array.isArray(job.pendingAddresses)
      ? job.pendingAddresses
      : [];
    delete job.quotaRetryCounts;
    if (quotaRetries.length > 0) {
      const completedAddresses = job.pendingAddresses.slice(
        0,
        job.nextAddressIndex,
      );
      const remainingAddresses = job.pendingAddresses.slice(
        job.nextAddressIndex + batch.length,
      );
      job.pendingAddresses = [
        ...completedAddresses,
        ...quotaRetries,
        ...remainingAddresses.filter(
          (address) => !quotaRetries.includes(address),
        ),
      ];
      job.nextAddressIndex = completedAddresses.length;
      job.batchSize = Math.max(1, Math.floor(job.batchSize / 2));
      emitScheduledLog(logEvent, "WARN", "scheduled_speedtest_quota_deferred", {
        cron: job.cron || event?.cron || null,
        batchNumber: job.batchNumber,
        deferredAddresses: quotaRetries.length,
        nextBatchSize: job.batchSize,
        addressIntervalSeconds,
        nextBatchAt: new Date(
          Date.now() +
            Number(
              jobBatchIntervalSeconds,
            ) *
              1000,
        ).toISOString(),
      });
    } else {
      job.nextAddressIndex += batch.length;
    }
    job.data.ips = sortIPsBySpeed(job.data.ips);
    job.data.lastUpdated = testedAt;
    job.data.bandwidthTestedCount = job.data.ips.filter(isSpeedTestedIP).length;
    job.nextBatchAt =
      Date.now() +
      Number(
        jobBatchIntervalSeconds,
      ) *
        1000;
  }

  const hasPendingAddresses =
    job.nextAddressIndex < job.pendingAddresses.length;
  if (batch.length > 0 || hasPendingAddresses) {
    setStage(`保存测速批次 ${job.batchNumber}`);
    const { data, ...savedJob } = job;
    const checkpointData = {
      ...data,
      [SCHEDULED_SPEED_TEST_JOB_PROPERTY]: savedJob,
    };
    await env.IP_STORAGE.put("cloudflare_ips", JSON.stringify(checkpointData));
    emitScheduledLog(logEvent, "INFO", "scheduled_speedtest_progress_saved", {
      batchNumber: Number(job.batchNumber) || 0,
      completedAddresses: job.nextAddressIndex,
      totalAddresses: job.pendingAddresses.length,
      remainingAddresses: Math.max(
        0,
        job.pendingAddresses.length - job.nextAddressIndex,
      ),
      nextBatchAt: hasPendingAddresses
        ? new Date(Number(job.nextBatchAt)).toISOString()
        : null,
    });
    if (hasPendingAddresses) {
      emitScheduledLog(logEvent, "INFO", "scheduled_invocation_yielded", {
        cron: job.cron || event?.cron || null,
        reason: "pending speed-test addresses remain",
        remainingAddresses: Math.max(
          0,
          job.pendingAddresses.length - job.nextAddressIndex,
        ),
        durationMs: Date.now() - invocationStartedAt,
      });
      return true;
    }
  }

  setStage("保存最终测速结果和清理旧数据");
  job.data.ips = sortIPsBySpeed(job.data.ips);
  job.data.bandwidthTestedCount = job.data.ips.filter(isSpeedTestedIP).length;
  const serializedData = JSON.stringify(job.data);
  await env.IP_STORAGE.put("cloudflare_ips", serializedData);
  await env.IP_STORAGE.put(job.timestampKey, serializedData);
  const testedResults = job.data.ips.filter(isSpeedTestedIP).map((item) => ({
    ip: item.address,
    latency: Number(item.latency),
    bandwidth: Number(item.bandwidth),
  }));
  const qualityResults = job.data.ips
    .filter((item) => isSpeedTestedIP(item) && getCountryCodeForIP(item))
    .map((item) => ({
      ip: item.address,
      countryCode: getCountryCodeForIP(item),
      latency: Number(item.latency),
      bandwidth: Number(item.bandwidth),
      bytes: item.bandwidthBytes || TEST_BYTES,
      testedAt: item.bandwidthTestedAt || job.data.lastUpdated,
    }));
  await storeQualityIPs(env, qualityResults);
  await storeSpeedTestSummary(env, testedResults, job.data.count);
  await cleanupOldIPs(env);
  emitScheduledLog(logEvent, "INFO", "scheduled_speedtest_job_completed", {
    cron: job.cron || event?.cron || null,
    totalAddresses: job.pendingAddresses.length,
    testedAddresses: testedResults.length,
    bandwidthTestedCount: job.data.bandwidthTestedCount,
    failedCount: Number(job.failedCount) || 0,
    failedSamples: job.failedSamples || [],
    completedAt: new Date().toISOString(),
  });
  if (job.failedCount > 0) {
    await recordScheduledError(
      env,
      { cron: job.cron || event?.cron },
      "测速结果",
      new Error(
        `${job.failedCount} 个地址测速失败；错误示例：${(job.failedSamples || []).join(" | ")}`,
      ),
    );
  }
  emitScheduledLog(logEvent, "INFO", "scheduled_invocation_completed", {
    cron: job.cron || event?.cron || null,
    durationMs: Date.now() - invocationStartedAt,
    completedAt: new Date().toISOString(),
  });
  return true;
}

export default {
  async scheduled(event, env, ctx) {
    if (
      env?.IP_STORAGE &&
      (await env.IP_STORAGE.get(SCHEDULE_ENABLED_KEY)) !== "true"
    ) {
      console.log("Scheduled task skipped because schedule is disabled");
      return;
    }
    const invocationStartedAt = Date.now();
    const invocationLogs = [];
    const logEvent = (entry) => invocationLogs.push(entry);
    emitScheduledLog(logEvent, "INFO", "scheduled_invocation_started", {
      cron: event?.cron || null,
      startedAt: new Date(invocationStartedAt).toISOString(),
    });
    if (!env.IP_STORAGE) {
      console.error("KV namespace 'IP_STORAGE' is not bound");
      return;
    }
    let scheduledStage = "采集数据源";
    try {
      scheduledStage = "读取定时测速进度";
      const speedSettings = await getCollectorSettings(env);
      emitScheduledLog(logEvent, "INFO", "scheduled_speedtest_settings", {
        cron: event?.cron || null,
        mode: speedSettings.speedTestMode,
        batchSize: speedSettings.scheduledSpeedTestBatchSize,
        batchIntervalSeconds:
          speedSettings.scheduledSpeedTestBatchIntervalSeconds,
        addressIntervalSeconds:
          speedSettings.scheduledSpeedTestAddressIntervalSeconds,
        requestConcurrency: SCHEDULED_SPEED_TEST_CONCURRENCY,
        timeoutSeconds: speedSettings.scheduledSpeedTestTimeoutSeconds,
        timeoutMs: speedSettings.scheduledSpeedTestTimeoutSeconds * 1000,
        requestBytes: TEST_BYTES,
      });
      if (
        await continueScheduledSpeedTestJob(
          env,
          event,
          speedSettings,
          (stage) => {
            scheduledStage = stage;
          },
          logEvent,
        )
      ) {
        return;
      }
      scheduledStage = "采集数据源";
      const { uniqueAddresses, results, addressesWithLocation } =
        await updateAllAddresses(env);
      emitScheduledLog(
        logEvent,
        "INFO",
        "scheduled_address_collection_completed",
        {
          cron: event?.cron || null,
          uniqueAddressCount: uniqueAddresses.length,
          locatedAddressCount: addressesWithLocation.length,
          sourceCount: (results || []).length,
        },
      );
      scheduledStage = "读取历史数据和定时设置";
      const historicalData = await getRecentHistoryData(env, 3);
      const previousByAddress = new Map();
      for (const snapshot of historicalData) {
        for (const item of snapshot.ips || []) {
          if (item?.address && !previousByAddress.has(item.address)) {
            previousByAddress.set(item.address, item);
          }
        }
      }
      const addresses = await enrichIPsWithQualityCountries(
        env,
        addressesWithLocation.map((item) => {
          const previous = previousByAddress.get(item.address);
          const sourceLocation = String(item.location || "").trim();
          const hasSourceLocation =
            sourceLocation &&
            !["未知", "unknown", "n/a", "-", "null"].includes(
              sourceLocation.toLowerCase(),
            );
          return {
            ...previous,
            address: item.address,
            location: hasSourceLocation
              ? sourceLocation
              : previous?.location || null,
            latency: previous?.latency ?? null,
            bandwidth: previous?.bandwidth ?? null,
            bandwidthBytes: previous?.bandwidthBytes ?? null,
            bandwidthTestedAt: previous?.bandwidthTestedAt ?? null,
          };
        }),
      );
      const currentAddressSet = new Set(addresses.map((item) => item.address));
      for (const [address, previous] of previousByAddress) {
        if (!currentAddressSet.has(address)) addresses.push(previous);
      }
      const sources = (results || []).slice(0, 15);
      const data = {
        ips: addresses,
        lastUpdated: new Date().toISOString(),
        cronSchedule: event?.cron || null,
        count: addresses.length,
        sources,
        bandwidthTestedCount: addresses.filter(isSpeedTestedIP).length,
      };
      const timestampKey = formatTimestampKey(new Date(data.lastUpdated));
      let serialized = JSON.stringify(data);
      scheduledStage = "保存采集结果";
      if (
        speedSettings.speedTestMode === "scheduled" &&
        uniqueAddresses.length > 0
      ) {
        const prioritizedAddresses = prioritizeQualityTestCandidates(
          addresses,
          speedSettings.qualityCountries,
        ).map((item) => item.address);
        const pendingAddresses = [...new Set(prioritizedAddresses)];
        data[SCHEDULED_SPEED_TEST_JOB_PROPERTY] = {
          cron: event?.cron || null,
          timestampKey,
          pendingAddresses,
          nextAddressIndex: 0,
          transferredBytes: 0,
          batchNumber: 0,
          batchSize: speedSettings.scheduledSpeedTestBatchSize,
          batchIntervalSeconds:
            speedSettings.scheduledSpeedTestBatchIntervalSeconds,
          addressIntervalSeconds:
            speedSettings.scheduledSpeedTestAddressIntervalSeconds,
          timeoutSeconds: speedSettings.scheduledSpeedTestTimeoutSeconds,
          nextBatchAt: Date.now(),
          quotaRetryCounts: {},
          failedCount: 0,
          failedSamples: [],
        };
        scheduledStage = "保存定时测速进度";
        await updateScheduledTransferredBytes(env, 0);
        await env.IP_STORAGE.put("cloudflare_ips", JSON.stringify(data));
        await env.IP_STORAGE.put(timestampKey, serialized);
        await recordHistoryKey(env, timestampKey);
        emitScheduledLog(logEvent, "INFO", "scheduled_speedtest_job_created", {
          cron: event?.cron || null,
          totalAddresses: pendingAddresses.length,
          batchSize: speedSettings.scheduledSpeedTestBatchSize,
          batchIntervalSeconds:
            speedSettings.scheduledSpeedTestBatchIntervalSeconds,
          addressIntervalSeconds:
            speedSettings.scheduledSpeedTestAddressIntervalSeconds,
          timeoutSeconds: speedSettings.scheduledSpeedTestTimeoutSeconds,
          createdAt: new Date().toISOString(),
        });
        emitScheduledLog(logEvent, "INFO", "scheduled_invocation_yielded", {
          cron: event?.cron || null,
          reason:
            "speed-test job created; next batch will run on a later Cron invocation",
          pendingAddresses: pendingAddresses.length,
        });
        return;
      }
      emitScheduledLog(logEvent, "INFO", "scheduled_speedtest_skipped", {
        cron: event?.cron || null,
        reason:
          speedSettings.speedTestMode !== "scheduled"
            ? "scheduled mode is disabled"
            : "no addresses collected",
        mode: speedSettings.speedTestMode,
        addressCount: uniqueAddresses.length,
      });
      await env.IP_STORAGE.put("cloudflare_ips", serialized);
      await env.IP_STORAGE.put(timestampKey, serialized);
      await recordHistoryKey(env, timestampKey);
      const testedAt = new Date().toISOString();
      sortIPsBySpeed(addresses);
      data.ips = addresses;
      data.lastUpdated = testedAt;
      data.bandwidthTestedCount = addresses.filter(isSpeedTestedIP).length;
      serialized = JSON.stringify(data);
      scheduledStage = "保存最终测速结果和清理旧数据";
      await env.IP_STORAGE.put("cloudflare_ips", serialized);
      await env.IP_STORAGE.put(timestampKey, serialized);
      await cleanupOldIPs(env);
      emitScheduledLog(logEvent, "INFO", "scheduled_invocation_completed", {
        cron: event?.cron || null,
        durationMs: Date.now() - invocationStartedAt,
        collectedAddresses: uniqueAddresses.length,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage = String(error?.message || error);
      emitScheduledLog(logEvent, "ERROR", "scheduled_invocation_failed", {
        stage: scheduledStage,
        cron: event?.cron || null,
        durationMs: Date.now() - invocationStartedAt,
        error: errorMessage,
      });
      await recordScheduledError(env, event, scheduledStage, error);
    } finally {
      await persistScheduledRunSummary(env, invocationLogs);
    }
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!env.IP_STORAGE) {
      return new Response("Error: KV namespace 'IP_STORAGE' is not bound.", {
        status: 500,
      });
    }
    if (request.method === "OPTIONS") return handleCORS();
    try {
      const customPath = await getCustomPath(env);
      const ipsPath = customPath ? `/${customPath}/ips` : "/ips";
      const ipTxtPath = customPath ? `/${customPath}/ip.txt` : "/ip.txt";
      if (path === ipsPath) return await handleGetIPs(env, true);
      if (path === ipTxtPath) return await handleGetIPs(env, false);
      switch (path) {
        case "/":
          return await serveHTML(env, request);
        case "/update": {
          if (request.method !== "POST") return methodNotAllowed();
          const body = request.headers
            .get("Content-Type")
            ?.includes("application/json")
            ? await request.json()
            : {};
          if (
            body.sources !== undefined &&
            (!Array.isArray(body.sources) ||
              body.sources.some((source) => typeof source !== "string"))
          ) {
            return jsonResponse({ error: "sources 必须是字符串数组" }, 400);
          }
          return await handleUpdate(env, null, body.sources);
        }
        case "/raw":
          return await handleRawIPs(
            env,
            url.searchParams.has("limit")
              ? url.searchParams.get("limit")
              : undefined,
          );
        case "/speedtest":
          return await handleSpeedTest(request, env);
        case "/manual-speedtest":
          return request.method === "POST"
            ? await handleManualSpeedTest(request, env)
            : methodNotAllowed();
        case "/quality-ips":
          return await handleGetQualityIPs(
            env,
            url.searchParams.get("countries"),
          );
        case "/quality-ips.txt":
          return await handleGetQualityIPsText(
            env,
            url.searchParams.get("countries"),
            url.searchParams.get("type") || "ip",
          );
        case "/quality-ips/batch":
          return request.method === "POST"
            ? await handleStoreQualityIPs(request, env)
            : methodNotAllowed();
        case "/set-quality-countries":
          return request.method === "POST"
            ? await handleSetQualityCountries(request, env)
            : methodNotAllowed();
        case "/set-limit":
          return request.method === "POST"
            ? await handleSetIpLimit(request, env)
            : methodNotAllowed();
        case "/set-speedtest-count":
          return request.method === "POST"
            ? await handleSetSpeedTestCount(request, env)
            : methodNotAllowed();
        case "/set-scheduled-speedtest-settings":
          return request.method === "POST"
            ? await handleSetScheduledSpeedTestSettings(request, env)
            : methodNotAllowed();
        case "/clear-all-ips":
          return request.method === "POST"
            ? await handleClearAllIPs(request, env)
            : methodNotAllowed();
        case "/scheduled-error-logs":
          return request.method === "GET"
            ? await handleGetScheduledErrorLogs(request, env)
            : methodNotAllowed();
        case "/backup-settings":
          return request.method === "GET"
            ? await handleBackupSettings(request, env)
            : methodNotAllowed();
        case "/restore-settings":
          return request.method === "POST"
            ? await handleRestoreSettings(request, env)
            : methodNotAllowed();
        case "/reset-setting":
          return request.method === "POST"
            ? await handleResetSetting(request, env)
            : methodNotAllowed();
        case "/set-schedule-times":
          return request.method === "POST"
            ? await handleSetScheduleTimes(request, env)
            : methodNotAllowed();
        case "/set-schedule-enabled":
          return request.method === "POST"
            ? await handleSetScheduleEnabled(request, env)
            : methodNotAllowed();
        case "/set-schedule-api-config":
          return request.method === "POST"
            ? await handleSetScheduleApiConfig(request, env)
            : methodNotAllowed();
        case "/test-schedule-api":
          return request.method === "POST"
            ? await handleTestScheduleApi(request, env)
            : methodNotAllowed();
        case "/list-schedule-workers":
          return request.method === "POST"
            ? await handleListScheduleWorkers(request, env)
            : methodNotAllowed();
        case "/set-speedtest-thresholds":
          return request.method === "POST"
            ? await handleSetSpeedTestThresholds(request, env)
            : methodNotAllowed();
        case "/set-auto-update-count":
          return request.method === "POST"
            ? await handleSetAutoUpdateCount(request, env)
            : methodNotAllowed();
        case "/set-sources":
          return request.method === "POST"
            ? await handleSetSources(request, env)
            : methodNotAllowed();
        case "/set-blacklist":
          return request.method === "POST"
            ? await handleSetBlacklist(request, env)
            : methodNotAllowed();
        case "/set-path":
          return request.method === "POST"
            ? await handleSetPath(request, env)
            : methodNotAllowed();
        case "/admin-set-password":
          return request.method === "POST"
            ? await handleSetPassword(request, env)
            : methodNotAllowed();
        case "/admin-login":
          return request.method === "POST"
            ? await handleLogin(request, env)
            : methodNotAllowed();
        case "/admin-logout":
          return await handleLogout(request, env);
        case "/admin-status":
          return await handleAdminStatus(request, env);
        case "/favicon.png":
          return handleFavicon();
        default:
          return jsonResponse({ error: "Not found" }, 404);
      }
    } catch (e) {
      console.error("Unhandled error:", e);
      return jsonResponse({ error: e.message }, 500);
    }
  },
};
/* ====================== 关键词（中英文） ====================== */
const KEYWORDS = [
  "地址",
  "公共地址",
  "域名",
  "IP",
  "Host",
  "host",
  "域名地址",
  "线路",
  "线路名称",
  "Address",
  "Public Address",
  "Domain",
  "IP Address",
  "Hostname",
  "Line",
  "Line Name",
  "IPv6",
  "ipv6",
  "IPV6",
  "IPv4",
  "ipv4",
  "IPV4",
];
async function handleFavicon() {
  try {
    // 您的 base64 favicon 数据
    const faviconBase64 =
      "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";
    // 优化的base64转换
    const bytes = Uint8Array.from(atob(faviconBase64), (c) => c.charCodeAt(0));
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Length": bytes.length.toString(),
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": 'inline; filename="favicon.png"',
      },
    });
  } catch (error) {
    console.error("[Favicon] Error serving favicon:", error);
    // 回退到简单透明PNG
    const fallbackICO =
      "AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A";
    try {
      const bytes = Uint8Array.from(atob(fallbackICO), (c) => c.charCodeAt(0));
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (fallbackError) {
      return new Response("Favicon not available", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }
}
// 常量定义
const SUCCESS_STATS_KEY = "batch_success_stats";
const MAX_BATCH_SIZE = 29;
const MIN_BATCH_SIZE = 3;
const SUCCESS_HISTORY_LENGTH = 10;
const MAX_WAVES = 3; // 优化：每波次处理3个批次，平衡并发与稳定性
// ====================== P0: CPU让出机制 ======================
let cpuYieldCounter = 0;
const CPU_YIELD_INTERVAL = 500; // 每500次操作让出一次CPU
async function cpuYield() {
  cpuYieldCounter++;
  if (cpuYieldCounter >= CPU_YIELD_INTERVAL) {
    cpuYieldCounter = 0;
    await new Promise((r) => setTimeout(r, 0));
  }
}
// ====================== P0: 多API兜底 ======================
const LOCATION_API_FALLBACK = [
  {
    name: "ip-api.com",
    url: "http://ip-api.com/batch",
    timeout: 2000,
    fields: "countryCode",
  },
  {
    name: "ipapi.is",
    url: "https://api.ipapi.is/",
    timeout: 3000,
    fields: "location.country_code",
  },
  {
    name: "ip-api.com-pro",
    url: "http://ip-api.com/json/",
    timeout: 2500,
    fields: "countryCode",
  },
];
let currentApiIndex = 0;
// ====================== P1: 资源自适应 ======================
const DEFAULT_EXECUTION_TIME = 25000; // 预留5秒缓冲
function getRemainingTimeBudget(startTime) {
  return DEFAULT_EXECUTION_TIME - (Date.now() - startTime);
}
function shouldReduceConcurrency(remainingTime, remainingTasks) {
  if (remainingTime < 3000) return true; // 少于3秒
  const timePerTask = remainingTime / remainingTasks;
  return timePerTask < 50; // 每任务少于50ms
}
// ====================== P1: 动态批次调整 ======================
function calculateDynamicWaves(addressType, stats) {
  const typeStats = stats?.[addressType];
  const successRate =
    typeStats?.totalAddresses > 0
      ? typeStats.successfulAddresses / typeStats.totalAddresses
      : 0.85; // 默认成功率
  // 成功率越高，并发越高 (1-5)
  return Math.max(1, Math.min(5, Math.floor(successRate * 5)));
}
// 获取默认批次大小
function getDefaultBatchSize(addressType) {
  switch (addressType) {
    case "ipv4":
      return 22; // 从29降至22，减少并发压力
    case "ipv6":
      return 18; // IPv6 每批只处理18个地址
    case "domain":
      return 12; // 每批12个地址
    default:
      return 5; // 每批5个地址
  }
}
// 初始化成功率统计对象（添加地址级统计）
function initializeSuccessStats() {
  return {
    ipv4: {
      totalAddresses: 0, // 新增：总地址数
      successfulAddresses: 0, // 新增：成功地址数
      totalBatches: 0,
      successfulBatches: 0,
      avgBatchSize: 22,
      lastUpdated: new Date().toISOString(),
      recentSuccess: [],
    },
    ipv6: {
      totalAddresses: 0,
      successfulAddresses: 0,
      totalBatches: 0,
      successfulBatches: 0,
      avgBatchSize: 18,
      lastUpdated: new Date().toISOString(),
      recentSuccess: [],
    },
    domain: {
      totalAddresses: 0,
      successfulAddresses: 0,
      totalBatches: 0,
      successfulBatches: 0,
      avgBatchSize: 12,
      lastUpdated: new Date().toISOString(),
      recentSuccess: [],
    },
  };
}
// 动态批次大小计算函数（使用地址级成功率）
function calculateDynamicBatchSize(addressType, stats, baseSize) {
  const typeStats = stats[addressType];
  // 检查是否有足够的地址数据（优先使用地址级统计）
  if (
    !typeStats ||
    typeStats.totalAddresses === undefined ||
    typeStats.totalAddresses < 10
  ) {
    // 地址数据不足时的日志
    console.log(
      `[批处理优化] ${addressType}: 地址数据不足（${typeStats?.totalAddresses || 0} < 10），使用默认批次大小=${baseSize}`,
    );
    return baseSize;
  }
  // 计算地址成功率
  const recentSuccessRate =
    typeStats.recentSuccess.length > 0
      ? typeStats.recentSuccess.filter((s) => s).length /
        typeStats.recentSuccess.length
      : 0;
  const overallSuccessRate =
    typeStats.totalAddresses > 0
      ? typeStats.successfulAddresses / typeStats.totalAddresses
      : 0;
  // 综合成功率（最近成功率权重更高）
  const combinedSuccessRate =
    recentSuccessRate * 0.7 + overallSuccessRate * 0.3;
  // 动态调整策略
  let adjustmentFactor = 1.0;
  if (combinedSuccessRate > 0.9) {
    adjustmentFactor = 1.2 + (combinedSuccessRate - 0.9) * 2;
  } else if (combinedSuccessRate > 0.7) {
    adjustmentFactor = 1.0;
  } else if (combinedSuccessRate > 0.5) {
    adjustmentFactor = 0.8 - (0.7 - combinedSuccessRate);
  } else {
    adjustmentFactor = 0.5;
  }
  // 应用调整因子，并限制在合理范围内
  const adjustedSize = Math.round(baseSize * adjustmentFactor);
  // 修复：IPv4和IPv6现在都使用ip-api.com batch API，使用相同的限制
  const minSize = addressType === "domain" ? 2 : 5; // IPv4/IPv6最小5个，域名最小2个
  const maxSize = addressType === "domain" ? 10 : 40; // IPv4/IPv6最大40个，域名最大10个
  const dynamicChunkSize = Math.max(minSize, Math.min(maxSize, adjustedSize));
  console.log(
    `[批处理优化] ${addressType}: 基础大小=${baseSize}, 调整后=${dynamicChunkSize}, 成功率=${(combinedSuccessRate * 100).toFixed(2)}%, 调整因子=${adjustmentFactor.toFixed(2)}`,
  );
  return dynamicChunkSize;
}
// 增强的批处理函数，带成功率统计（添加地址级统计支持）
async function batchInWavesWithStats(items, batchFn, addressType, env) {
  if (!items || items.length === 0) return [];
  // 获取当前成功率统计
  const stats = await getSuccessStats(env);
  const baseSize = getDefaultBatchSize(addressType);
  const dynamicChunkSize = calculateDynamicBatchSize(
    addressType,
    stats,
    baseSize,
  );
  console.log(
    `[批处理优化] ${addressType}: 基础大小=${baseSize}, 调整后=${dynamicChunkSize}`,
  );
  // 分块处理
  const chunks = [];
  for (let i = 0; i < items.length; i += dynamicChunkSize) {
    chunks.push(items.slice(i, i + dynamicChunkSize));
  }
  // 逐波处理 - 集成动态并发+资源自适应
  const results = [];
  const batchResults = [];
  const dynamicWaves = calculateDynamicWaves(addressType, stats); // P1: 动态并发
  const actualWaves = Math.min(dynamicWaves, MAX_WAVES);
  const processStartTime = Date.now();
  for (let i = 0; i < chunks.length; i += actualWaves) {
    // P1: 资源自适应 - 检查剩余时间
    const remainingTime = getRemainingTimeBudget(processStartTime);
    const remainingTasks = chunks.length - i;
    const effectiveWaves = shouldReduceConcurrency(
      remainingTime,
      remainingTasks,
    )
      ? Math.max(1, Math.floor(actualWaves * 0.5))
      : actualWaves;

    const wave = chunks.slice(i, i + effectiveWaves);
    const promises = wave.map(async (chunk, waveIndex) => {
      try {
        const startTime = Date.now();
        const result = await batchFn(chunk);
        const duration = Date.now() - startTime;
        // P0: CPU让出
        await cpuYield();
        // 检查 result 是否是地址数组格式（包含 success 字段的对象数组）
        const isAddressArrayFormat =
          Array.isArray(result) &&
          result.length > 0 &&
          result[0] &&
          typeof result[0] === "object" &&
          "success" in result[0];
        if (isAddressArrayFormat) {
          // 地址数组格式：记录每个地址的结果
          const hasAnySuccess = result.some((r) => r && r.success);
          batchResults.push({
            addressType,
            success: hasAnySuccess,
            batchSize: chunk.length,
            addresses: result, // 每个地址的查询结果
            duration,
            timestamp: new Date().toISOString(),
          });
        } else {
          // 旧格式：记录批次级别的成功状态
          batchResults.push({
            addressType,
            success: true,
            batchSize: chunk.length,
            duration,
            timestamp: new Date().toISOString(),
          });
        }
        return result || [];
      } catch (error) {
        // 记录失败的批次
        batchResults.push({
          addressType,
          success: false,
          batchSize: chunk.length,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
        console.error(
          `[批次失败] ${addressType} 批次大小 ${chunk.length}:`,
          error,
        );
        return [];
      }
    });
    const waveResults = await Promise.all(promises);
    waveResults.forEach((wr) => results.push(...wr));
    // 波次间延迟（优化：从980-1031ms降至200-300ms）
    if (i + effectiveWaves < chunks.length) {
      await new Promise((r) =>
        setTimeout(r, Math.floor(Math.random() * 100) + 200),
      );
    }
  }
  // 更新成功率统计
  await updateSuccessStats(env, addressType, batchResults);
  return results;
}
// 获取成功率统计
async function getSuccessStats(env) {
  const raw = await env.IP_STORAGE.get(SUCCESS_STATS_KEY);
  if (!raw) {
    return initializeSuccessStats();
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("解析成功率统计失败，使用默认值:", e);
    return initializeSuccessStats();
  }
}
// 更新成功率统计（添加地址级统计）
async function updateSuccessStats(env, addressType, batchResults) {
  const stats = await getSuccessStats(env);
  const typeStats = stats[addressType];
  // 更新总体统计（批次级别）
  batchResults.forEach((result) => {
    typeStats.totalBatches++;
    if (result.success) {
      typeStats.successfulBatches++;
    }
  });
  // 更新地址级统计（如果有 addresses 数组）
  let totalAddresses = 0;
  let successfulAddresses = 0;
  batchResults.forEach((result) => {
    if (result.addresses && Array.isArray(result.addresses)) {
      result.addresses.forEach((addrResult) => {
        totalAddresses++;
        if (addrResult.success) {
          successfulAddresses++;
        }
        // 更新最近成功状态（保持最近 100 个地址）
        typeStats.recentSuccess.push(addrResult.success);
        if (typeStats.recentSuccess.length > 100) {
          typeStats.recentSuccess.shift();
        }
      });
    } else {
      // 兼容旧版本：没有 addresses 数组时，使用批次级别的成功状态
      typeStats.recentSuccess.push(result.success);
      if (typeStats.recentSuccess.length > 10) {
        typeStats.recentSuccess.shift();
      }
    }
  });
  // 更新地址总数统计
  typeStats.totalAddresses = (typeStats.totalAddresses || 0) + totalAddresses;
  typeStats.successfulAddresses =
    (typeStats.successfulAddresses || 0) + successfulAddresses;
  // 更新平均批次大小
  typeStats.avgBatchSize =
    batchResults.reduce((sum, r) => sum + r.batchSize, 0) / batchResults.length;
  typeStats.lastUpdated = new Date().toISOString();
  // Statistics are auxiliary; a KV quota failure must not abort address updates.
  try {
    await env.IP_STORAGE.put(SUCCESS_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.warn("Could not persist success statistics:", error);
  }
  const batchSuccessRate =
    typeStats.totalBatches > 0
      ? ((typeStats.successfulBatches / typeStats.totalBatches) * 100).toFixed(
          1,
        )
      : 0;
  const addressSuccessRate =
    typeStats.totalAddresses > 0
      ? (
          (typeStats.successfulAddresses / typeStats.totalAddresses) *
          100
        ).toFixed(1)
      : 0;
  console.log(
    `[统计更新] ${addressType}: 批次成功率 ${typeStats.successfulBatches}/${typeStats.totalBatches} (${batchSuccessRate}%) | 地址成功率 ${typeStats.successfulAddresses}/${typeStats.totalAddresses} (${addressSuccessRate}%)`,
  );
}
/* ====================== 公共工具升级 ====================== */
// HTML转义函数，防止XSS攻击
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// 清洗自定义路径 - 支持更灵活的格式
function sanitizePath(input) {
  if (typeof input !== "string") return "";
  let p = input.trim();
  // 空字符串返回空
  if (p === "") return "";
  // 防止路径遍历攻击
  if (
    p.includes("..") ||
    p.includes("../") ||
    p.includes("..\\") ||
    p.includes("%2e%2e") ||
    p.includes("%2E%2E") ||
    p.includes("\\")
  ) {
    return "";
  }
  // 移除前后的斜杠
  while (p.startsWith("/")) p = p.slice(1);
  while (p.endsWith("/")) p = p.slice(0, -1);
  // 合并连续斜杠
  p = p.replace(/\/{2,}/g, "/");
  // 限制长度（合理范围）
  if (p.length === 0 || p.length > 500) return "";
  // 允许更广泛的字符集合：字母、数字、短横、下划线、点、斜杠、星号
  // 这样可以支持: a/b/c, a.b.c, a-b-c, */*/* 等格式
  if (!/^[A-Za-z0-9._/*-]+$/.test(p)) return "";
  return p;
}
// 带重试的通用请求封装：返回原始 Response，需要再进行 .json()/.text() 等处理
async function fetchWithRetry(
  input,
  options = {},
  retries = 2,
  backoffMs = 200,
) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(input, options);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return resp;
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        const delay = backoffMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
async function getCustomPath(env) {
  const raw = await env.IP_STORAGE.get("custom_path");
  const cleaned = sanitizePath(raw ?? "");
  return cleaned; // 如为空，则后续逻辑会使用默认路径
}
/* ====================== 工具函数 ====================== */
function formatTimestampKey(date = new Date()) {
  const y = (date.getFullYear() % 100).toString().padStart(2, "0");
  const M = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `cloudflare_ips_${y}.${M}.${d}.${h}.${m}`;
}
function parseTimestampKey(key) {
  const match = key.match(
    /^cloudflare_ips_(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})$/,
  );
  if (!match) return null;
  const [_, y, M, d, h, m] = match;
  const year = 2000 + parseInt(y, 10);
  return new Date(
    year,
    parseInt(M, 10) - 1,
    parseInt(d, 10),
    parseInt(h, 10),
    parseInt(m, 10),
  );
}
/* ====================== 地址验证与处理函数 ====================== */
// IPv6 验证 - 增强版
function isValidIPv6(ip) {
  if (!ip || typeof ip !== "string") return false;
  // 使用更简单可靠的IPv6验证
  try {
    // 移除可能的方括号
    const cleanIP = ip.replace(/^\[|\]$/g, "");
    // 基本格式检查
    if (!/^[\da-fA-F:]+$/.test(cleanIP)) return false;

    // 过滤掉以 :: 开头的地址（通常是环回或不完整的地址）
    if (cleanIP.startsWith("::")) return false;

    // 使用URL API进行验证
    const testUrl = `http://[${cleanIP}]`;
    new URL(testUrl);
    return true;
  } catch {
    return false;
  }
}
// IPv4 验证
function isValidIPv4(ip) {
  if (!ip || typeof ip !== "string") return false;
  const octets = ip.split(".");
  if (octets.length !== 4) return false;
  return octets.every((oct) => {
    const num = parseInt(oct, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && String(num) === oct;
  });
}
/**
 * 统一的地址解析函数 (Server-side)
 * 处理 IPv4, IPv6 (含方括号), 域名及其端口
 */
function parseAddressWithPort(address) {
  if (!address || typeof address !== "string")
    return { address: "", port: 443, type: "unknown" };
  // 关键：先剥离可能存在的 # 备注或后缀，再进行解析
  let pure = address.split("#")[0].trim();

  // 处理带方括号的 IPv6
  if (pure.startsWith("[") && pure.includes("]")) {
    const bracketEnd = pure.lastIndexOf("]");
    const addr = pure.slice(1, bracketEnd);
    const afterBracket = pure.slice(bracketEnd + 1);
    const portMatch = afterBracket.match(/^:(\d+)$/);
    const port = portMatch ? parseInt(portMatch[1], 10) : 443;
    return { address: addr, port, type: "ipv6" };
  }

  // 检测不带方括号的 IPv6 (多于一个冒号且不含点)
  if ((pure.match(/:/g) || []).length > 1 && !pure.includes(".")) {
    return { address: pure, port: 443, type: "ipv6" };
  }

  // IPv4 或 域名 (可能带端口)
  if (pure.includes(":")) {
    const parts = pure.split(":");
    const portStr = parts.pop();
    const addr = parts.join(":");
    const port = parseInt(portStr, 10);
    const type = isValidIPv4(addr) ? "ipv4" : "domain";
    return { address: addr, port: isNaN(port) ? 443 : port, type };
  }

  // 纯地址
  const type = isValidIPv4(pure) ? "ipv4" : "domain";
  return { address: pure, port: 443, type };
}
// 域名验证
function isValidDomain(domain) {
  if (!domain || typeof domain !== "string") return false;
  // 支持以星号(*)开头的通配符域名，如 *.example.com
  if (domain.startsWith("*.")) {
    // 移除 *. 前缀后验证剩余部分
    const remainingDomain = domain.substring(2);
    if (!remainingDomain) return false;
    // 验证剩余域名部分
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(remainingDomain)) return false;
    // 禁止纯数字域名
    if (/^\d+\.\d+\.\d+\.\d+$/.test(remainingDomain)) return false;
    // 禁止以点开头或结尾
    if (remainingDomain.startsWith(".") || remainingDomain.endsWith("."))
      return false;
    // 不能只包含数字和点
    if (/^[0-9.]+$/.test(remainingDomain)) return false;
    return true;
  }
  // 常规域名格式检查
  if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) return false;
  // 禁止纯数字域名
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) return false;
  // 禁止以点开头或结尾
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  // 不能只包含数字和点
  if (/^[0-9.]+$/.test(domain)) return false;
  return true;
}
// 通用地址验证 (IPv4, IPv6, 域名)
function isValidAddress(address) {
  if (!address) return false;
  // 移除可能的方括号 (IPv6 格式)
  const cleanAddr = address.replace(/^\[|\]$/g, "");
  // 检查 IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanAddr)) {
    return isValidIPv4(cleanAddr);
  }
  // 检查 IPv6
  if (isValidIPv6(cleanAddr)) {
    return true;
  }
  // 检查域名
  if (isValidDomain(cleanAddr)) {
    return true;
  }
  return false;
}
// 端口验证
function isValidPort(port) {
  if (!port) return false;
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
}
// 增强验证，支持带端口的地址
function isValidAddressWithPort(address) {
  if (!address) return false;
  // 处理 IPv6 带端口的情况，如 [2001:db8::1]:443
  if (address.startsWith("[") && address.includes("]:")) {
    const ipv6End = address.indexOf("]");
    const ipv6 = address.substring(1, ipv6End);
    const portStr = address.substring(ipv6End + 2);
    return isValidIPv6(ipv6) && isValidPort(portStr);
  }
  // 处理常规地址
  const parts = address.split(":");
  // IPv6 地址没有端口 (没有方括号)
  if (parts.length > 2 && !address.includes("[")) {
    return isValidIPv6(address);
  }
  // 单纯域名或IPv4/IPv6无端口
  if (parts.length === 1) {
    return isValidAddress(address);
  }
  // 域名:port 或 IPv4:port
  if (parts.length === 2) {
    const addrPart = parts[0];
    const portPart = parts[1];
    return isValidAddress(addrPart) && isValidPort(portPart);
  }
  // 其他情况
  return false;
}

// 格式化地址输出
function formatAddressOutput(address, location, latency) {
  if (!address) return "";
  const parsed = parseAddressWithPort(address);
  const portPart = parsed.port && parsed.port !== 443 ? `:${parsed.port}` : "";
  const latencyPart = latency ? `_${Math.round(latency)}ms` : "";
  let displayLocation = location || "未知"; // 默认
  if (
    parsed.type !== "domain" &&
    (displayLocation === "未知" ||
      displayLocation.toLowerCase() === "ipv4" ||
      displayLocation.toLowerCase() === "ipv6")
  ) {
    displayLocation = parsed.type.toUpperCase(); // IPv4 或 IPv6
  }
  if (parsed.type === "ipv6") {
    // Check if address already has brackets
    const hasBrackets =
      parsed.address.startsWith("[") && parsed.address.endsWith("]");
    const ipv6Address = hasBrackets ? parsed.address : `[${parsed.address}]`;
    return `${ipv6Address}${portPart}#${displayLocation}${latencyPart}`;
  } else if (parsed.type === "domain") {
    const loc =
      displayLocation && displayLocation !== "未知"
        ? displayLocation
        : parsed.address; // 域名不变
    return `${parsed.address}${portPart}#${loc}${latencyPart}`;
  } else {
    // IPv4
    return `${parsed.address}${portPart}#${displayLocation}${latencyPart}`;
  }
}
// 解析已格式化的地址
function parseFormattedAddress(formatted) {
  if (!formatted) {
    return { address: "", location: "", latency: null, type: "unknown" };
  }
  const parts = formatted.split("#");
  const addressPart = parts[0];
  const locationPart = parts[1] || "";
  const [location, latency] = locationPart.split("_");
  // 处理 IPv6 带方括号的格式
  if (addressPart.startsWith("[") && addressPart.includes("]:")) {
    const ipv6End = addressPart.indexOf("]");
    const ipv6 = addressPart.substring(1, ipv6End);
    const port = addressPart.substring(ipv6End + 2) || "443";
    return {
      address: `[${ipv6}]${port !== "443" ? ":" + port : ""}`,
      location,
      latency: latency ? parseInt(latency, 10) : null,
      type: "ipv6",
    };
  }
  // 处理 IPv4 或域名
  const [baseAddr, port] = addressPart.split(":");
  const portValue = port || "443";
  let type = "unknown";
  if (isValidIPv4(baseAddr)) {
    type = "ipv4";
  } else if (isValidIPv6(baseAddr)) {
    type = "ipv6";
  } else {
    type = "domain";
  }
  return {
    address: `${baseAddr}${portValue !== "443" ? ":" + portValue : ""}`,
    location,
    latency: latency ? parseInt(latency, 10) : null,
    type,
  };
}
/* ====================== 白名单域名（严格后缀匹配） ====================== */
const WHITELIST_DOMAINS = [
  "xyz",
  "hk",
  "tw",
  "mo",
  "com",
  "ch",
  "br",
  "eu.org",
  "fun",
  "fan",
  "icu",
  "mn",
  "in",
  "sb",
  "is",
  "org",
  "ir",
  "app",
  "ltd",
  "buzz",
  "ws",
  "net",
  "pw",
  "one",
  "top",
  "lt",
  "cylex.hu",
  "vip",
  "shop",
  "cn",
  "us",
  "uk",
  "de",
  "fr",
  "jp",
  "kr",
  "sg",
  "au",
  "ca",
  "run",
  "it",
  "es",
  "ru",
  "se",
  "no",
  "fi",
  "dk",
  "pl",
  "cz",
  "gr",
  "be",
  "nl",
  "ie",
  "nz",
  "mx",
  "ar",
  "cl",
  "tr",
  "sa",
  "ae",
  "id",
  "my",
  "th",
  "vn",
  "ph",
  "bd",
  "pk",
  "lk",
  "np",
  "il",
  "za",
  "ng",
  "ke",
  "tz",
  "gh",
  "eg",
  "ma",
  "dz",
  "tn",
  "qa",
  "kw",
  "bh",
  "om",
  "by",
  "ua",
  "sk",
  "hu",
  "ro",
  "bg",
  "rs",
  "info",
  "biz",
  "mobi",
  "name",
  "pro",
  "aero",
  "coop",
  "museum",
  "int",
  "gov",
  "edu",
  "mil",
  "tv",
  "me",
  "io",
  "ai",
  "gg",
  "fm",
  "am",
  "sh",
  "cc",
  "la",
  "bz",
  "vc",
  "sc",
  "ag",
  "gd",
  "lc",
  "dm",
  "ht",
  "do",
  "cr",
  "hn",
  "ni",
  "pa",
  "py",
  "uy",
  "bo",
  "ec",
  "pe",
  "ve",
  "co",
  "sr",
  "gy",
  "jm",
  "tt",
  "bb",
  "bs",
  "bm",
  "mq",
  "gp",
  "re",
  "yt",
  "tf",
  "wf",
  "pf",
  "nc",
  "pn",
  "tk",
  "to",
  "vu",
  "ki",
  "nr",
  "mh",
  "pg",
  "fj",
  "ck",
  "nu",
  "ax",
  "gl",
  "fo",
  "je",
  "im",
  "gi",
  "mt",
  "cy",
  "lu",
  "li",
  "mc",
  "sm",
  "va",
  "ad",
  "al",
  "ba",
  "mk",
  "md",
  "ge",
  "az",
  "af",
  "ao",
  "bj",
  "bw",
  "cv",
  "et",
  "gm",
  "gn",
  "lr",
  "mz",
  "na",
  "rw",
  "sd",
  "sl",
  "sn",
  "so",
  "ss",
  "ug",
  "zm",
  "zw",
  "bt",
  "kh",
  "mm",
  "kp",
  "iq",
  "sy",
  "jo",
  "lb",
  "ps",
  "ye",
  "kg",
  "uz",
  "tj",
  "tm",
  "kz",
  "ee",
  "lv",
];
// 简化为仅使用小写后缀的集合，便于快速判断
const WHITELIST_SUFFIXES = WHITELIST_DOMAINS.map((d) => d.toLowerCase());
function isWhitelistedDomain(domain) {
  if (!domain || typeof domain !== "string") return false;
  const d = domain
    .toLowerCase()
    .trim()
    .replace(/^\.+|\.+$/g, "");
  if (!d) return false;
  // 处理通配符域名 (*.example.com)
  if (d.startsWith("*.")) {
    // 对于通配符域名，只验证其基础部分的后缀
    const baseDomain = d.substring(2); // 移除 *.
    for (const suffix of WHITELIST_SUFFIXES) {
      if (baseDomain === suffix || baseDomain.endsWith("." + suffix))
        return true;
    }
    return false;
  }
  // 常规域名后缀检查
  for (const suffix of WHITELIST_SUFFIXES) {
    // 直接命中后缀，或作为完整域名匹配
    if (d === suffix || d.endsWith("." + suffix)) return true;
  }
  return false;
}
/* ====================== 增强提取函数：支持 IPv6、白名单过滤、线路名称抓取 ====================== */
// 生成随机前缀函数：2-12位英文数字组合
function generateRandomPrefix() {
  const length = Math.floor(Math.random() * 11) + 2; //2-12位
  // 英文数字组合（小写字母+数字）
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 处理通配符域名：将 *.cloudflare.182682.xyz 替换为 随机前缀.182682.xyz
// cache: 用于存储通配符域名和处理结果的映射，确保同一域名只生成一个随机前缀
function processWildcardDomain(domain, cache) {
  if (domain && domain.startsWith("*.")) {
    // 检查缓存中是否已处理过此通配符域名
    if (cache && cache.has(domain)) {
      return cache.get(domain);
    }
    // 移除 *. 只保留后面的域名
    const suffix = domain.substring(2); // 例如：cloudflare.182682.xyz
    const randomPrefix = generateRandomPrefix();
    const processed = randomPrefix + "." + suffix; // abc123.cloudflare.182682.xyz
    // 存入缓存
    if (cache) {
      cache.set(domain, processed);
    }
    return processed;
  }
  return domain;
}

// 线路名称关键词映射（用于识别和提取线路信息）
const LINE_NAME_KEYWORDS = [
  // 运营商线路
  "电信",
  "联通",
  "移动",
  "多线",
  "CMCC",
  "CT",
  "CU",
  // 地区代码
  "HK",
  "JP",
  "SG",
  "US",
  "KR",
  "GB",
  "FR",
  "DE",
  "TW",
  "HK",
  "SG",
  "JP",
  "KR",
  "US",
  "TW",
  "MO",
  // 通用线路名称
  "优选",
  "线路",
  "高速",
  "稳定",
  "Line",
  "低延迟",
  // 数据中心
  "Colo",
  "数据中心",
  "机房",
  // IPv6标记
  "IPV6",
  "IPv6",
];
// 判断来源格式类型（所有来源都识别处理）
function detectSourceFormat(html, url) {
  if (!html || !url) return null;
  // 检测是否为表格格式（包含表格标签且有IP地址）
  const hasTableTag = /<table|<tr[^>]*>.*?<td/i.test(html);
  const hasIPInTable =
    hasTableTag && /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(html);
  if (hasTableTag && hasIPInTable) {
    return "table";
  }
  // 检测是否为文本格式（行格式 地址#后缀）
  const hasHashFormat = /[a-zA-Z0-9.:]+\s*#[^\n<]+/.test(html);
  const lineCount = html
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#")).length;
  if (hasHashFormat && lineCount > 0) {
    return "text";
  }
  // 对于纯IP列表的文本
  const ipLines = html
    .split("\n")
    .filter((l) => /^\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(l.trim()));
  if (ipLines.length > 3) {
    return "text";
  }
  return null;
}
// 从yx.txt格式提取（域名/IP#线路名称）
function extractFromIPDBFormat(html, cache) {
  const results = [];
  const lines = html.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    // 匹配格式：地址#后缀
    const hashIndex = trimmed.indexOf("#");
    if (hashIndex > 0) {
      const address = trimmed.substring(0, hashIndex).trim();
      const suffix = trimmed.substring(hashIndex + 1).trim();
      if (isValidAddressWithPort(address)) {
        // 处理通配符域名：将 *.example.com 替换为 随机前缀.example.com
        const processedAddress = processWildcardDomain(address, cache);
        // 完整保留后缀，不过滤
        let location = suffix || null;
        // 如果后缀是ipv4/ipv6等技术标识，使用域名作为后缀
        if (location && /^(ipv4|ipv6|ip|addr|address)$/i.test(location)) {
          location = processedAddress.split(":")[0]; // 使用处理后的域名/IP本身
        }
        results.push({ address: processedAddress, location });
      }
    } else if (isValidAddressWithPort(trimmed)) {
      // 处理通配符域名
      const processedAddress = processWildcardDomain(trimmed, cache);
      // 没有#标记的纯地址，location保持null
      // formatAddressOutput会自动处理：IP→IPv4/IPv6类型，域名→域名本身
      results.push({ address: processedAddress, location: null });
    }
  }
  return results;
}
// 从表格页面提取域名（表格中的 cname/域名列）
function extractFromWeTestCname(html, cache) {
  const results = [];
  const seen = new Set();
  // 匹配表格行中的域名（*.domain.com 或 domain.com），可能带 # 后缀
  const domainPattern =
    /<td[^>]*>\s*([*a-zA-Z0-9._-]+\.(?:xyz|top|com|org|net|cc|vip|eu\.org|icu|fun|fan|app|ltd|cloud)(?:#[^<]*))?\s*<\/td>/gi;
  let domainMatch;
  while ((domainMatch = domainPattern.exec(html)) !== null) {
    let fullText = domainMatch[1].trim();
    if (!fullText) continue;
    // 解析域名和可能的 # 后缀
    const hashIndex = fullText.indexOf("#");
    let address = fullText;
    let location = null;
    if (hashIndex > 0) {
      address = fullText.substring(0, hashIndex).trim();
      location = fullText.substring(hashIndex + 1).trim(); // 完整抓取 # 后的内容
    }
    const cleanDomain = address.replace("*.", "");
    if (isValidDomain(cleanDomain) && !seen.has(address)) {
      seen.add(address);
      // 处理通配符域名：将 *.example.com 替换为 随机前缀.example.com
      const processedAddress = processWildcardDomain(address, cache);
      // 兜底策略：如果没有后缀则使用域名本身
      const finalLocation = location || processedAddress;
      results.push({ address: processedAddress, location: finalLocation });
    }
  }
  return results;
}
// 从api.uouin.com cloudflare页面提取（表格格式：线路+IP）
function extractFromUouinCloudflare(html, cache) {
  const results = [];
  // 清洗HTML，移除多余的标签和换行
  const cleanHtml = html
    .replace(/<td[^>]*>\s*<\/td>/gi, "") // 移除空单元格
    .replace(/\s+/g, " "); // 合并空白
  // 匹配表格行，包含线路和IP
  // 模式：序号、线路名称、IP地址
  const rowPattern =
    /<tr[^>]*>.*?<td[^>]*>\s*\d+\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(cleanHtml)) !== null) {
    const lineName = rowMatch[1].trim();
    const ip = rowMatch[2].trim();
    // 验证线路名称（电信、联通、移动、多线、IPV6等）
    const validLines = ["电信", "联通", "移动", "多线", "IPV6", "IPv6", "ipv6"];
    const isValidLine =
      validLines.some((l) => lineName.includes(l)) ||
      /^(电信|联通|移动|多线|IPV6)$/i.test(lineName);
    // 验证IP地址
    const isValidIP =
      isValidIPv4(ip) ||
      isValidIPv6(ip) ||
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) ||
      /^(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip);
    if (isValidLine && isValidIP) {
      results.push({ address: ip, location: lineName });
    }
  }
  // 如果表格提取失败，尝试更宽松的模式
  if (results.length === 0) {
    // 直接匹配线路名称后跟IP的模式
    const loosePattern =
      /(电信|联通|移动|多线|IPV6)[^\d]*((?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F:]+(?::[0-9a-fA-F]{1,4}){2,7})/gi;
    let looseMatch;
    while ((looseMatch = loosePattern.exec(html)) !== null) {
      const lineName = looseMatch[1];
      const ip = looseMatch[2];
      if (isValidIPv4(ip) || isValidIPv6(ip)) {
        results.push({ address: ip, location: lineName });
      }
    }
  }
  return results;
}
// 增强的提取函数：支持特定网站线路名称抓取
function extractAddressesFromHTML(html, sourceUrl = null) {
  if (!html) return [];
  const map = new Map(); // Map<string, string | null> address => location
  const wildcardCache = new Map(); // 通配符域名缓存，确保同一域名只生成一个随机前缀
  // 检测来源格式类型（所有来源都识别处理）
  const sourceFormat = detectSourceFormat(html, sourceUrl);
  // 根据格式类型使用对应的专用提取器
  if (sourceFormat) {
    console.log(
      `[线路抓取] 检测到来源格式: ${sourceFormat}, URL: ${sourceUrl}`,
    );
    let specialResults = [];
    switch (sourceFormat) {
      case "text":
        specialResults = extractFromIPDBFormat(html, wildcardCache);
        break;
      case "table":
        // 表格格式：先尝试提取域名（cname页面），再尝试提取IP
        const cnameResults = extractFromWeTestCname(html, wildcardCache);
        if (cnameResults.length > 0) {
          specialResults = cnameResults;
        } else {
          specialResults = extractFromUouinCloudflare(html, wildcardCache);
        }
        break;
    }
    if (specialResults.length > 0) {
      console.log(
        `[线路抓取] 从 ${sourceFormat} 格式提取到 ${specialResults.length} 条记录`,
      );
      for (const item of specialResults) {
        if (item && item.address && !map.has(item.address)) {
          map.set(item.address, item.location);
        }
      }
    }
  }
  // 预编译正则 (updated to support Chinese in remarks with Unicode 'gu' flag)
  const patterns = {
    ipv6WithBrackets:
      /\[([0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){0,7}(?:::[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){0,7})?)\](?::\d{1,5})?(\s*#[\w\p{Script=Han}\p{Script=Latin}\d.\-_%]+)?/gu,
    plainIpv6: /([0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){2,7})(?::\d{1,5})?/g,
    domainWithHash:
      /(?:\*\.|[a-zA-Z0-9])(?:[a-zA-Z0-9*-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?::\d{1,5})?(?:\s*#[\w\p{Script=Han}\p{Script=Latin}\d.\-_%]+)?/gu,
    keyword: new RegExp(
      `(?:${KEYWORDS.join("|")})[\\s\\S]*?([\\w*.\\-\\[\\]:]+\\d*)`,
      "gi",
    ),
    attr: new RegExp(
      `(?:data-label|title|alt|placeholder)=["'][^"']*?(?:${KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})[^"']*?([a-zA-Z0-9*.\\[\\]:\\-]+)["']`,
      "gi",
    ),
    backup:
      /(?:\[(?:[0-9a-fA-F:]+)\](?::\d{1,5})?|\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b|\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{0,4}(?::\d{1,5})?\b|\b(?:\*\.|[a-zA-Z0-9])(?:[a-zA-Z0-9*-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+(?::\d{1,5})?\b)/g,
    combined:
      /(?:(?:\[[\w:]+(?::\d{1,5})?\])|(?:[\w.*-]+(?::\d{1,5})?)|(?:[0-9a-fA-F:]+(?::\d{1,5})?)|(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d{1,5})?))(\s*#[\w\p{Script=Han}\p{Script=Latin}\d.\-_%]+)?/gu,
    // 新增：专门匹配线路名称的正则
    lineName: /#\s*([^_\s]+(?:线路|优选|高速|稳定|低延迟|数据中心|Colo)?)/u,
  };
  // 单一pass合并提取所有候选
  let combinedMatch;
  while ((combinedMatch = patterns.combined.exec(html)) !== null) {
    let candidate = combinedMatch[0];
    let addr = candidate;
    let loc = null;
    const hashIndex =
      candidate.search(/\s*#/) !== -1 ? candidate.search(/\s*#/) : -1;
    if (hashIndex !== -1) {
      addr = candidate.substring(0, hashIndex).trim();
      const rest = candidate.substring(hashIndex + 1).trim();
      loc = rest.replace(/^#/, "").split("_")[0];
      if (
        loc &&
        (loc.toLowerCase() === "ipv4" || loc.toLowerCase() === "ipv6")
      ) {
        loc = null;
      }
    }
    // 修复：检查IPv6是否是从更长地址中部分匹配出来的
    if (addr.startsWith("[") && addr.includes("::")) {
      // 获取原始匹配位置
      const matchIndex = combinedMatch.index;
      // 向前检查，确保不是从更长的IPv6地址中间截取的
      const contextStart = Math.max(0, matchIndex - 30);
      const contextBefore = html.substring(contextStart, matchIndex);
      // 如果前面有方括号开头且后面跟着hex字符，说明当前匹配可能是部分匹配
      const fullIPv6Match = contextBefore.match(/\[([0-9a-fA-F:]{10,})$/);
      if (fullIPv6Match && addr.length < fullIPv6Match[1].length + 2) {
        // 这是一个部分匹配，跳过
        console.log(
          `[IPv6修复] 跳过部分匹配: ${addr}, 完整地址应为: [${fullIPv6Match[1]}]`,
        );
        continue;
      }
    }
    if (isValidAddressWithPort(addr)) {
      const parsed = parseAddressWithPort(addr);
      // 处理通配符域名
      const processedAddr = processWildcardDomain(addr, wildcardCache);
      if (parsed.type === "domain" && !isWhitelistedDomain(processedAddr))
        continue;
      // 特殊源已经有位置信息，保留原始信息
      if (!map.has(processedAddr)) {
        map.set(processedAddr, loc);
      }
    }
  }
  // ipv6WithBrackets（增强：防止部分匹配）
  let ipv6Match;
  while ((ipv6Match = patterns.ipv6WithBrackets.exec(html)) !== null) {
    const fullMatch = ipv6Match[0];
    const ipInside = ipv6Match[1];
    const remarkPart = ipv6Match[2] || "";
    const portMatch = fullMatch.match(/]:(\d{1,5})/);
    const portStr = portMatch ? ":" + portMatch[1] : "";
    let loc = null;
    if (remarkPart) {
      loc = remarkPart.trim().replace(/^#/, "").split("_")[0].trim();
      if (loc) loc += "_IPv6";
    }
    const standardAddr = `[${ipInside}]${portStr}`;
    // 修复：检查是否是完整IPv6地址的一部分（防止误抓）
    const matchIndex = ipv6Match.index;
    // 向后检查，确保后面没有更多的hex段
    const contextEnd = Math.min(
      html.length,
      matchIndex + fullMatch.length + 30,
    );
    const contextAfter = html.substring(matchIndex, contextEnd);
    // 如果当前匹配后面紧跟着hex字符和冒号，说明是部分匹配
    const extendedMatch = contextAfter.match(/^\[[0-9a-fA-F:]+\][0-9a-fA-F:]/);
    if (extendedMatch) {
      console.log(`[IPv6修复] ipv6WithBrackets跳过部分匹配: ${standardAddr}`);
      continue;
    }
    if (isValidIPv6(ipInside)) {
      if (!map.has(standardAddr)) {
        map.set(standardAddr, loc);
      }
    }
  }
  // plainIpv6
  let plainIpv6Match;
  while ((plainIpv6Match = patterns.plainIpv6.exec(html)) !== null) {
    let candidate = plainIpv6Match[0];
    let addr = candidate;
    let loc = null;
    const hashIdx = candidate.search(/\s*#|#/);
    if (hashIdx !== -1) {
      addr = candidate.substring(0, hashIdx).trim();
      const rest = candidate.substring(hashIdx).trim();
      loc = rest.replace(/^#/, "").split("_")[0].trim();
      if (loc) loc += "_IPv6";
    }
    const portMatch = addr.match(/:(\d{1,5})$/);
    const portStr = portMatch ? ":" + portMatch[1] : "";
    const cleanIp = addr.replace(/:\d+$/, "").replace(/[\[\]]/g, "");
    if (!isValidIPv6(cleanIp)) continue;
    const standardAddr = `[${cleanIp}]${portStr}`;
    const contextStart = Math.max(0, plainIpv6Match.index - 15);
    const contextEnd = plainIpv6Match.index + plainIpv6Match[0].length + 15;
    const context = html.substring(contextStart, contextEnd);
    if (context.includes("http://") || context.includes("https://")) {
      if (!map.has(standardAddr)) {
        map.set(standardAddr, loc);
      }
    }
    if (!map.has(standardAddr)) {
      map.set(standardAddr, loc);
    }
  }
  // 新增：处理纯域名#备注 的情况
  let domainHashMatch;
  while ((domainHashMatch = patterns.domainWithHash.exec(html)) !== null) {
    let candidate = domainHashMatch[0];
    let addr = candidate;
    let loc = null;
    const hashIndex =
      candidate.search(/\s*#/) !== -1
        ? candidate.search(/\s*#/)
        : candidate.search(/#/);
    if (hashIndex !== -1) {
      addr = candidate.substring(0, hashIndex).trim();
      const rest = candidate.substring(hashIndex + 1).trim();
      loc = rest.replace(/^#/, "").split("_")[0];
      if (
        loc &&
        (loc.toLowerCase() === "ipv4" || loc.toLowerCase() === "ipv6")
      ) {
        loc = null;
      }
    }
    if (isValidAddressWithPort(addr)) {
      const parsed = parseAddressWithPort(addr);
      // 处理通配符域名：将 *.example.com 替换为 随机前缀.example.com
      const processedAddr = processWildcardDomain(addr, wildcardCache);
      // 检查处理后的域名是否在白名单中
      if (parsed.type === "domain" && !isWhitelistedDomain(processedAddr))
        continue;
      if (!map.has(processedAddr)) {
        map.set(processedAddr, loc);
      }
    }
  }
  // keyword
  let match;
  while ((match = patterns.keyword.exec(html)) !== null) {
    let candidate = match[1].trim();
    const rest = html.slice(match.index + match[0].length);
    const fullMatch = candidate + rest.split(/[\s<"'`]/)[0];
    let toCheck = fullMatch;
    let addr = toCheck;
    let loc = null;
    const hashIndex =
      toCheck.search(/\s*#/) !== -1 ? toCheck.search(/\s*#/) : -1;
    if (hashIndex !== -1) {
      addr = toCheck.substring(0, hashIndex).trim();
      const restLoc = toCheck.substring(hashIndex + 1).trim();
      loc = restLoc.replace(/^#/, "").split("_")[0];
    }
    if (isValidIPv6(addr.replace(/[\[\]]/g, "")) && !addr.includes("[")) {
      addr = `[${addr}]`;
    }
    if (isValidAddressWithPort(addr)) {
      const parsed = parseAddressWithPort(addr);
      // 处理通配符域名
      const processedAddr = processWildcardDomain(addr, wildcardCache);
      if (parsed.type === "domain" && !isWhitelistedDomain(processedAddr))
        continue;
      if (!map.has(processedAddr)) {
        map.set(processedAddr, loc);
      }
    } else if (isValidAddressWithPort(candidate)) {
      let addrCan = candidate;
      let locCan = null;
      const hashIndexCan =
        candidate.search(/\s*#/) !== -1 ? candidate.search(/\s*#/) : -1;
      if (hashIndexCan !== -1) {
        addrCan = candidate.substring(0, hashIndexCan).trim();
        const restCan = candidate.substring(hashIndexCan + 1).trim();
        locCan = restCan.replace(/^#/, "").split("_")[0];
      }
      const parsed = parseAddressWithPort(addrCan);
      // 处理通配符域名
      const processedAddrCan = processWildcardDomain(addrCan, wildcardCache);
      if (parsed.type === "domain" && !isWhitelistedDomain(processedAddrCan))
        continue;
      if (!map.has(processedAddrCan)) {
        map.set(processedAddrCan, locCan);
      }
    }
  }
  // attr
  while ((match = patterns.attr.exec(html)) !== null) {
    let candidate = match[1].trim();
    let addr = candidate;
    let loc = null;
    const hashIndex =
      candidate.search(/\s*#/) !== -1 ? candidate.search(/\s*#/) : -1;
    if (hashIndex !== -1) {
      addr = candidate.substring(0, hashIndex).trim();
      const rest = candidate.substring(hashIndex + 1).trim();
      loc = rest.replace(/^#/, "").split("_")[0];
      if (
        loc &&
        (loc.toLowerCase() === "ipv4" || loc.toLowerCase() === "ipv6")
      ) {
        loc = null;
      }
    }
    if (isValidAddressWithPort(addr)) {
      const parsed = parseAddressWithPort(addr);
      // 处理通配符域名
      const processedAddr = processWildcardDomain(addr, wildcardCache);
      if (parsed.type === "domain" && !isWhitelistedDomain(processedAddr))
        continue;
      if (!map.has(processedAddr)) {
        map.set(processedAddr, loc);
      }
    }
  }
  const finalResults = Array.from(map).map(([address, location]) => ({
    address,
    location,
  }));
  // 注意：wildcardCache 是局部变量，会在函数结束时自动清理
  if (sourceFormat && finalResults.length > 0) {
    console.log(
      `[线路抓取] ${sourceFormat} 格式最终提取结果: ${finalResults.length} 条`,
    );
    const withLocation = finalResults.filter((r) => r.location).length;
    console.log(`[线路抓取] 其中包含线路信息的: ${withLocation} 条`);
  }
  return finalResults;
}
/* ====================== 优化黑名单过滤函数 ====================== */
// 预处理黑名单：精确匹配用Set（O(1)查找），域名模式用Set（endsWith检查）
function preprocessBlacklist(blacklist) {
  if (!blacklist || blacklist.length === 0)
    return { exactSet: new Set(), domainSet: new Set() };
  const exactSet = new Set();
  const domainSet = new Set();
  blacklist.forEach((item) => {
    if (item.startsWith('"') && item.endsWith('"')) {
      const domain = item.slice(1, -1).trim().toLowerCase(); // 不区分大小写
      if (domain) domainSet.add(domain);
    } else {
      exactSet.add(item);
    }
  });
  return { exactSet, domainSet };
}
// 优化后的黑名单检查：O(1)精确匹配 + O(n)域名检查（n=黑名单大小，通常小）
function isBlacklisted(address, blacklistPreprocessed) {
  if (!address) return false;
  const { exactSet, domainSet } = blacklistPreprocessed;
  if (exactSet.has(address)) return true;
  const parsedAddress = parseAddressWithPort(address);
  const addressBase = parsedAddress.address.toLowerCase(); // 基础地址（不带端口）不区分大小写
  // 只对域名类型检查子域名模式
  if (parsedAddress.type === "domain" && domainSet.size > 0) {
    for (const domain of domainSet) {
      if (addressBase === domain || addressBase.endsWith("." + domain)) {
        return true;
      }
    }
  }
  return false;
}
/* ====================== 核心：更新 + 自动测速 ====================== */
async function handleUpdate(env, cronSchedule = null, sourcesOverride = null) {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 28000; // 28秒限制，避免30秒超时
  // 资源监控配置
  const RESOURCE_LIMITS = {
    maxAddresses: 763, // 最大处理地址数量
    maxSources: 15, // 最大数据源数量
    memoryCheckInterval: 5000, // 内存检查间隔(ms)
  };
  // 指数退避配置 - 优化以减少资源消耗
  const RETRY_CONFIG = {
    initialDelay: [1100, 1200], // 增加到1.2-1.5秒
    maxDelay: [5000, 8000], // 减少到4-6秒
    backoffFactor: [1.5, 2.2], // 减少退避因子
    maxRetries: 1, // 从2降至1
    jitter: true,
  };
  // 计算指数退避延迟
  function calculateBackoffDelay(attempt, config) {
    let delay = Math.min(
      config.initialDelay * Math.pow(config.backoffFactor, attempt - 1),
      config.maxDelay,
    );
    if (config.jitter) {
      const jitterRange = delay * 0.25;
      delay = delay + Math.random() * jitterRange * 2 - jitterRange;
    }
    return Math.max(0, Math.floor(delay));
  }
  // 1) 初始数据获取并行化：更新地址与最近历史数据
  const [initial, historicalData] = await Promise.all([
    updateAllAddresses(env, sourcesOverride),
    getRecentHistoryData(env, 3),
  ]);
  const { uniqueAddresses, results, addressesWithLocation } = initial;
  // 资源监控：限制地址数量
  if (uniqueAddresses.length > RESOURCE_LIMITS.maxAddresses) {
    console.warn(
      `[资源限制] 地址数量过多 (${uniqueAddresses.length})，限制为 ${RESOURCE_LIMITS.maxAddresses}`,
    );
    uniqueAddresses.splice(RESOURCE_LIMITS.maxAddresses);
  }
  // 资源监控：限制数据源数量
  if (results.length > RESOURCE_LIMITS.maxSources) {
    console.warn(
      `[资源限制] 数据源过多 (${results.length})，限制为 ${RESOURCE_LIMITS.maxSources}`,
    );
    results.splice(RESOURCE_LIMITS.maxSources);
  }
  // 2) 从最近历史中构建位置/延迟的映射
  const historyMap = new Map();
  const previousByAddress = new Map();
  if (historicalData && Array.isArray(historicalData)) {
    historicalData.forEach((data) => {
      if (data && data.ips && Array.isArray(data.ips)) {
        data.ips.forEach((item) => {
          if (item && item.address && !historyMap.has(item.address)) {
            historyMap.set(item.address, {
              location: item.location,
              latency: item.latency,
            });
          }
          if (item?.address && !previousByAddress.has(item.address)) {
            previousByAddress.set(item.address, item);
          }
        });
      }
    });
  }
  // 3) 筛选出需要测试地理位置的地址与需要测试延迟的地址
  const needLocationTest = [];
  const knownLocations = new Map();
  // 资源监控：定期检查执行时间
  const checkExecutionTime = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_EXECUTION_TIME) {
      throw new Error(
        `执行时间超过限制 (${elapsed}ms > ${MAX_EXECUTION_TIME}ms)`,
      );
    }
  };
  if (addressesWithLocation && Array.isArray(addressesWithLocation)) {
    addressesWithLocation.forEach((item, index) => {
      // 每100个地址检查一次执行时间
      if (index % 100 === 0) checkExecutionTime();
      if (!item || !item.address) return;
      const srcLoc = item.location?.trim();
      const useless = new Set([
        "未知",
        "unknown",
        "n/a",
        "-",
        "",
        "null",
        "無",
        "?",
        "？",
        "ipv4",
        "ipv6",
        "ip v4",
        "ip v6",
      ]);
      if (
        srcLoc &&
        !useless.has(srcLoc.toLowerCase()) &&
        srcLoc.toLowerCase() !== "unknown"
      ) {
        knownLocations.set(item.address, srcLoc);
      } else {
        const h = historyMap.get(item.address);
        if (h?.location) {
          const loc = h.location.trim();
          if (loc && !useless.has(loc) && loc.toLowerCase() !== "unknown") {
            knownLocations.set(item.address, loc);
          } else {
            needLocationTest.push(item.address);
          }
        } else {
          needLocationTest.push(item.address);
        }
      }
    });
  }
  const uniqueAddressesList = uniqueAddresses || [];
  const knownLatencies = new Map();
  if (uniqueAddressesList && Array.isArray(uniqueAddressesList)) {
    uniqueAddressesList.forEach((addr) => {
      if (!addr) return;
      const historyInfo = historyMap.get(addr);
      if (historyInfo && historyInfo.latency) {
        knownLatencies.set(addr, historyInfo.latency);
      }
    });
  }
  console.log(`Total Addresses: ${uniqueAddressesList.length}`);
  console.log(`Need location test: ${needLocationTest.length}`);
  // 4) 验证函数：检查数据是否有效
  function isValidLocation(location) {
    if (!location || typeof location !== "string") return false;
    const loc = location.trim();
    const useless = new Set([
      "未知",
      "unknown",
      "n/a",
      "-",
      "",
      "null",
      "無",
      "?",
      "？",
      "ipv4",
      "ipv6",
      "ip v4",
      "ip v6",
    ]);
    return (
      !!loc &&
      !useless.has(loc.toLowerCase()) &&
      loc.toLowerCase() !== "unknown"
    );
  }
  function isValidLatency(latency) {
    return (
      latency !== null &&
      latency !== undefined &&
      typeof latency === "number" &&
      latency > 0
    );
  }
  // 5) 查找缺失的地区信息并复用已有延迟数据
  const CHUNK_SIZE = 6; // 单次处理量
  const MAX_WAVES = 2; // 并发数
  // 内部 helpers - 增加资源监控和错误处理
  async function batchInWaves(items, batchFn) {
    if (!items || items.length === 0) return [];
    // 资源监控：检查内存使用情况
    const startTime = Date.now();
    const maxProcessingTime = 25000; // 25秒限制，避免30秒超时
    const chunks = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CHUNK_SIZE));
      // 检查处理时间
      if (Date.now() - startTime > maxProcessingTime) {
        console.warn("[资源监控] 处理时间过长，提前终止");
        break;
      }
    }
    const results = [];
    for (let i = 0; i < chunks.length; i += MAX_WAVES) {
      // 再次检查时间限制
      if (Date.now() - startTime > maxProcessingTime) {
        console.warn("[资源监控] 波次处理时间过长，提前终止");
        break;
      }
      const wave = chunks.slice(i, i + MAX_WAVES);
      try {
        const promises = wave.map((chunk) =>
          batchFn(chunk)
            .then((r) => r || [])
            .catch((error) => {
              console.warn("[批处理错误] 单个批次失败:", error.message);
              return [];
            }),
        );
        const waveResults = await Promise.all(promises);
        waveResults.forEach((wr) => results.push(...wr));
        // 波次间延迟，减少API压力
        if (i + MAX_WAVES < chunks.length) {
          await new Promise((r) => setTimeout(r, 32)); // 增加到100ms
        }
      } catch (error) {
        console.error("[波次处理错误] 整个波次失败:", error);
        break;
      }
    }
    const processingTime = Date.now() - startTime;
    console.log(
      `[资源监控] 处理完成: ${items.length}项 -> ${results.length}结果, 耗时: ${processingTime}ms`,
    );
    return results;
  }
  // 6) 改进的重试测试函数 - 指数退避策略
  async function testWithRetry(addresses, testFn, isValidFn) {
    const stats = {
      totalTested: addresses ? addresses.length : 0,
      validResults: 0,
      retryCount: 0,
      failedCount: 0,
      totalDelayTime: 0,
    };
    if (!addresses || addresses.length === 0) {
      return {
        results: [],
        stats: stats,
      };
    }
    // 生成本次实际使用的随机配置
    const usedRetryConfig = {
      initialDelay:
        RETRY_CONFIG.initialDelay[0] +
        Math.random() *
          (RETRY_CONFIG.initialDelay[1] - RETRY_CONFIG.initialDelay[0]),
      maxDelay:
        RETRY_CONFIG.maxDelay[0] +
        Math.random() * (RETRY_CONFIG.maxDelay[1] - RETRY_CONFIG.maxDelay[0]),
      backoffFactor:
        RETRY_CONFIG.backoffFactor[0] +
        Math.random() *
          (RETRY_CONFIG.backoffFactor[1] - RETRY_CONFIG.backoffFactor[0]),
      maxRetries: RETRY_CONFIG.maxRetries,
      jitter: RETRY_CONFIG.jitter,
    };
    console.log(
      `Testing ${addresses.length} addresses with exponential backoff`,
    );
    console.log(
      `Retry config: initial=${Math.floor(usedRetryConfig.initialDelay)}ms, max=${Math.floor(usedRetryConfig.maxDelay)}ms, factor=${usedRetryConfig.backoffFactor.toFixed(2)}x`,
    );
    let currentAddresses = [...addresses];
    let finalResults = new Array(addresses.length).fill(null);
    let attempt = 0;
    while (
      currentAddresses.length > 0 &&
      attempt <= usedRetryConfig.maxRetries
    ) {
      attempt++;
      const currentDelay =
        attempt > 1 ? calculateBackoffDelay(attempt, usedRetryConfig) : 0;
      if (attempt > 1) {
        // 延迟与统计
        stats.retryCount++;
        stats.totalDelayTime += currentDelay;
        console.log(
          `Retry attempt ${attempt}: waiting ${currentDelay}ms before testing ${currentAddresses.length} addresses`,
        );
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
      }
      console.log(
        `Attempt ${attempt}: testing ${currentAddresses.length} addresses`,
      );
      // 直接使用 batchInWaves，testFn 作为回调，确保独立逻辑
      const batchResults = await batchInWaves(currentAddresses, testFn);
      const needRetry = [];
      for (let i = 0; i < currentAddresses.length; i++) {
        const address = currentAddresses[i];
        const result = batchResults[i];
        const originalIndex = addresses.indexOf(address);
        if (isValidFn(result)) {
          finalResults[originalIndex] = result;
          stats.validResults++;
          console.log(`✓ ${address}: Valid`);
        } else {
          if (attempt < usedRetryConfig.maxRetries + 1) {
            needRetry.push(address);
            const nextDelay = calculateBackoffDelay(
              attempt + 1,
              usedRetryConfig,
            );
            console.log(
              `✗ ${address}: Retry scheduled (next delay: ${nextDelay}ms)`,
            );
          } else {
            finalResults[originalIndex] = result;
            stats.failedCount++;
            console.log(`✗ ${address}: Failed after ${attempt} attempts`);
          }
        }
      }
      currentAddresses = needRetry;
    }
    console.log(
      `Test complete: Valid=${stats.validResults}, Failed=${stats.failedCount}, Retries=${stats.retryCount}, Total delay=${stats.totalDelayTime}ms`,
    );
    return {
      results: finalResults,
      stats: stats,
    };
  }
  // 7) 更新流程仅查询缺失的地区信息，不执行测速；测速由独立操作启动。
  let locationStats = {
    totalTested: 0,
    validResults: 0,
    retryCount: 0,
    failedCount: 0,
    totalDelayTime: 0,
  };
  let newLocations = [];
  // 构建并行测试任务
  const testPromises = [];
  if (needLocationTest && needLocationTest.length > 0) {
    console.log(
      `\n=== 启动地区测试（并行）: ${needLocationTest.length} 个地址 ===`,
    );
    testPromises.push(
      testWithRetry(
        needLocationTest,
        (batch) => getLocationsForAddresses(batch, env),
        isValidLocation,
      ).then((locationResult) => {
        newLocations = locationResult.results;
        locationStats = locationResult.stats;
        console.log(
          `✓ 地区测试完成: ${locationStats.validResults}/${locationStats.totalTested} 成功`,
        );
      }),
    );
  }
  // 并行执行所有测试（如果有的话）
  if (testPromises.length > 0) {
    console.log(`\n>>> 开始并行执行 ${testPromises.length} 个测试任务...`);
    const parallelStartTime = Date.now();
    await Promise.all(testPromises);
    console.log(`>>> 并行测试总耗时: ${Date.now() - parallelStartTime}ms`);
  }
  // 8) 合并信息，保持与原有逻辑一致的映射关系
  const finalAddresses = [];
  if (addressesWithLocation && Array.isArray(addressesWithLocation)) {
    addressesWithLocation.forEach((item) => {
      if (!item || !item.address) return;
      const address = item.address;
      let location = item.location; // 默认
      if (knownLocations.has(address)) {
        location = knownLocations.get(address);
      } else {
        const index = needLocationTest.indexOf(address);
        if (
          index !== -1 &&
          index < newLocations.length &&
          newLocations[index]
        ) {
          location = newLocations[index];
        }
      }
      let latency = null;
      if (knownLatencies.has(address)) {
        latency = knownLatencies.get(address);
      }
      finalAddresses.push({
        ...(previousByAddress.get(address) || {}),
        address: address,
        location: location,
        latency: latency,
      });
    });
  }
  const currentAddressSet = new Set(finalAddresses.map((item) => item.address));
  for (const [address, previous] of previousByAddress) {
    if (!currentAddressSet.has(address)) finalAddresses.push(previous);
  }
  const now = new Date();
  const finalData = {
    ips: finalAddresses,
    lastUpdated: now.toISOString(),
    cronSchedule: cronSchedule || historicalData[0]?.cronSchedule || null,
    count: finalAddresses.length,
    sources: results || [],
  };
  const timestampKey = formatTimestampKey(now);
  await env.IP_STORAGE.put(timestampKey, JSON.stringify(finalData));
  await recordHistoryKey(env, timestampKey);
  console.log(`Saved timestamped ${timestampKey}`);

  // 清理旧的历史记录，并触发全局计数刷新
  await cleanupOldIPs(env);
  // 兼容性存储
  await env.IP_STORAGE.put("cloudflare_ips", JSON.stringify(finalData));
  const duration = Date.now() - startTime;
  // 9) 构建返回数据 - 包含实际使用的随机配置
  const response = {
    success: true,
    message: "数据源更新完成，未执行测速",
    duration: `${duration}ms`,
    totalIPs: finalAddresses.length,
    newLocationTested: needLocationTest.length,
    locationReusedCount: knownLocations.size,
    latencyReusedCount: knownLatencies.size,
    validLocations: finalAddresses.filter((item) =>
      isValidLocation(item.location),
    ).length,
    validLatencies: finalAddresses.filter((item) =>
      isValidLatency(item.latency),
    ).length,
    newValidLocations: locationStats.validResults,
    // 重试统计
    locationRetryCount: locationStats.retryCount,
    locationFailedCount: locationStats.failedCount,
    // 退避策略统计
    locationTotalDelay: locationStats.totalDelayTime,
    timestamp: now.toISOString(),
    historyKey: timestampKey,
  };
  return jsonResponse(response);
}
/* ====================== 从最近历史记录获取数据 ====================== */
async function getRecentHistoryData(env, limit = 3) {
  const historyData = [];
  const keys = await getHistoryKeys(env);
  for (const name of keys) {
    if (historyData.length >= limit) break;
    const raw = await env.IP_STORAGE.get(name);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      if (data && data.ips && Array.isArray(data.ips)) {
        historyData.push(data);
      }
    } catch (e) {
      console.warn(`Failed to parse historical data ${name}:`, e);
    }
  }
  const legacyRaw = await env.IP_STORAGE.get("cloudflare_ips");
  if (legacyRaw) {
    try {
      const legacyData = JSON.parse(legacyRaw);
      if (legacyData && Array.isArray(legacyData.ips)) {
        delete legacyData[SCHEDULED_SPEED_TEST_JOB_PROPERTY];
        const legacyTime = Date.parse(legacyData.lastUpdated || "");
        const latestHistoryTime = Date.parse(historyData[0]?.lastUpdated || "");
        if (
          historyData.length === 0 ||
          (Number.isFinite(legacyTime) &&
            (!Number.isFinite(latestHistoryTime) ||
              legacyTime > latestHistoryTime))
        ) {
          historyData.unshift(legacyData);
          if (historyData.length > limit) historyData.length = limit;
        }
      }
    } catch (error) {
      console.warn("Failed to parse legacy IP data:", error);
    }
  }
  return historyData;
}
async function getHistoryKeys(env) {
  const raw = await env.IP_STORAGE.get(HISTORY_INDEX_KEY);
  if (!raw) return [];
  try {
    const keys = JSON.parse(raw);
    if (!Array.isArray(keys)) throw new Error("History index is not an array");
    return [
      ...new Set(
        keys.filter((key) => typeof key === "string" && parseTimestampKey(key)),
      ),
    ].sort((a, b) => parseTimestampKey(b) - parseTimestampKey(a));
  } catch (error) {
    console.warn("Failed to parse IP history index:", error);
    return [];
  }
}
async function saveHistoryKeys(env, keys) {
  const uniqueKeys = [
    ...new Set(
      keys.filter((key) => typeof key === "string" && parseTimestampKey(key)),
    ),
  ].sort((a, b) => parseTimestampKey(b) - parseTimestampKey(a));
  const serialized = JSON.stringify(uniqueKeys);
  if ((await env.IP_STORAGE.get(HISTORY_INDEX_KEY)) !== serialized) {
    await env.IP_STORAGE.put(HISTORY_INDEX_KEY, serialized);
  }
  return uniqueKeys;
}
async function recordHistoryKey(env, key) {
  const keys = await getHistoryKeys(env);
  keys.push(key);
  await saveHistoryKeys(env, keys);
}
/* ====================== 地址收集 —— 支持 IPv4、IPv6 和域名 ====================== */
async function updateAllAddresses(env, sourcesOverride = null) {
  const urls = Array.isArray(sourcesOverride)
    ? sourcesOverride
    : await getSources(env);
  const results = [];
  const blacklistRaw = await getBlacklist(env);
  const blacklistPreprocessed = preprocessBlacklist(blacklistRaw);

  // 优化：先收集所有地址到临时数组，最后统一去重（提高去重优先级）
  const tempAddresses = []; // 临时数组存储所有提取的地址
  for (let i = 0; i < urls.length; i += 3) {
    const batch = urls.slice(i, i + 3);
    const settled = await Promise.allSettled(
      batch.map((u) => fetchURLWithTimeout(u)),
    );
    settled.forEach((res, idx) => {
      const url = batch[idx];
      // 使用完整URL作为标识，避免同一域名不同路径被视为相同来源
      const name = url;
      if (res.status === "fulfilled") {
        // 传递 URL 以支持特定网站的线路名称抓取
        const extracted = extractAddressesFromHTML(res.value, url);
        console.log(
          `URL ${url} extracted ${extracted.length} addresses:`,
          extracted,
        );
        if (extracted && Array.isArray(extracted)) {
          // 收集所有有效地址（不进行去重，提高收集效率）
          extracted.forEach((item) => {
            if (
              item &&
              item.address &&
              !isBlacklisted(item.address, blacklistPreprocessed)
            ) {
              tempAddresses.push({
                address: item.address,
                location: item.location,
              });
            }
          });
        }
        results.push({
          name,
          status: "success",
          count: extracted ? extracted.length : 0,
        });
      } else {
        console.error(`Failed to fetch ${url}:`, res.reason);
        results.push({
          name,
          status: "error",
          count: 0,
          error: res.reason?.message || "Unknown",
        });
      }
    });
    if (i + 3 < urls.length)
      await new Promise((r) =>
        setTimeout(r, Math.floor(Math.random() * 51) + 120),
      ); // 动态延迟优化
  }

  // 在所有来源地址收集完毕后，第一时间进行去重（提高去重优先级）
  console.log(`[去重] 开始统一去重，收集到 ${tempAddresses.length} 个原始地址`);
  const uniqueAddressesMap = new Map(); // Map<string, string | null> address => location
  for (const item of tempAddresses) {
    const existing = uniqueAddressesMap.get(item.address);
    // 如果地址不存在，直接添加
    // 如果地址已存在，优先保留有位置信息的版本
    if (
      existing === undefined ||
      (existing === null && item.location !== null)
    ) {
      uniqueAddressesMap.set(item.address, item.location);
    }
  }
  console.log(`[去重] 去重完成，剩余 ${uniqueAddressesMap.size} 个唯一地址`);
  const sortedAddresses = Array.from(uniqueAddressesMap)
    .map(([address, location]) => ({ address, location }))
    .sort((a, b) => {
      const parsedA = parseAddressWithPort(a.address);
      const parsedB = parseAddressWithPort(b.address);
      // 排序优先级: 域名 -> IPv4 -> IPv6
      const priority = { domain: 0, ipv4: 1, ipv6: 2, unknown: 3 };
      const priA = priority[parsedA.type];
      const priB = priority[parsedB.type];
      if (priA !== priB) return priA - priB;
      // 同类型内排序
      if (parsedA.type === "ipv4" && parsedB.type === "ipv4") {
        const pa = parsedA.address.split(".").map(Number);
        const pb = parsedB.address.split(".").map(Number);
        for (let i = 0; i < 4; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
        return parseInt(parsedA.port) - parseInt(parsedB.port);
      }
      if (parsedA.type === "ipv6" && parsedB.type === "ipv6") {
        if (parsedA.address !== parsedB.address)
          return parsedA.address.localeCompare(parsedB.address);
        return parseInt(parsedA.port) - parseInt(parsedB.port);
      }
      if (parsedA.type === "domain" && parsedB.type === "domain") {
        if (parsedA.address !== parsedB.address)
          return parsedA.address.localeCompare(parsedB.address);
        return parseInt(parsedA.port) - parseInt(parsedB.port);
      }
      // 通用排序
      return a.address.localeCompare(b.address);
    });
  const uniqueAddresses = sortedAddresses.map((item) => item.address); // string[] 用于 count 和 latency
  // 初始化所有地址的位置为"未知"
  const addressesWithLocation = sortedAddresses.map((item) => ({
    address: item.address,
    location: item.location ? item.location.trim() : null, // 推荐改成 null
  }));
  return { uniqueAddresses, results, addressesWithLocation };
}
// 增强地理位置获取，处理 IPv4、IPv6 和域名
async function getLocationsForAddresses(addresses, env) {
  if (!addresses || addresses.length === 0) return [];
  // 获取默认批次大小
  function getDefaultBatchSize(addressType) {
    switch (addressType) {
      case "ipv4":
        return 22;
      case "ipv6":
        return 18; // 修复：改为18，因为现在使用ip-api.com batch API
      case "domain":
        return 12;
      default:
        return 5;
    }
  }
  // 增强的批处理函数，带地址级别的成功率统计（修改版）
  async function batchInWavesWithStats(items, batchFn, addressType) {
    if (!items || items.length === 0) return [];
    // 获取当前成功率统计
    const stats = await getSuccessStats(env);
    const baseSize = getDefaultBatchSize(addressType);
    const dynamicChunkSize = calculateDynamicBatchSize(
      addressType,
      stats,
      baseSize,
    );
    console.log(
      `[动态调整] ${addressType} 批次大小: ${baseSize} -> ${dynamicChunkSize}`,
    );
    // 分块处理
    const chunks = [];
    for (let i = 0; i < items.length; i += dynamicChunkSize) {
      chunks.push(items.slice(i, i + dynamicChunkSize));
    }
    // 逐波处理 - 集成动态并发+资源自适应
    const results = [];
    const batchResults = [];
    const dynamicWaves = calculateDynamicWaves(addressType, stats); // P1: 动态并发
    const actualWaves = Math.min(dynamicWaves, MAX_WAVES);
    const processStartTime = Date.now();
    for (let i = 0; i < chunks.length; i += actualWaves) {
      // P1: 资源自适应 - 检查剩余时间
      const remainingTime = getRemainingTimeBudget(processStartTime);
      const remainingTasks = chunks.length - i;
      const effectiveWaves = shouldReduceConcurrency(
        remainingTime,
        remainingTasks,
      )
        ? Math.max(1, Math.floor(actualWaves * 0.5))
        : actualWaves;

      const wave = chunks.slice(i, i + effectiveWaves);
      const promises = wave.map(async (chunk, waveIndex) => {
        try {
          const startTime = Date.now();
          // 修改：batchFn 现在应该返回每个地址的结果数组
          const addressResults = await batchFn(chunk);
          const duration = Date.now() - startTime;
          // P0: CPU让出
          await cpuYield();
          // 修改：记录批次成功，以及每个地址的详细结果
          const hasAnySuccess =
            addressResults && addressResults.some((r) => r && r.success);
          batchResults.push({
            addressType,
            success: hasAnySuccess, // 批次成功 = 至少有一个地址成功
            batchSize: chunk.length,
            addresses: addressResults, // 新增：每个地址的查询结果
            duration,
            timestamp: new Date().toISOString(),
          });
          return addressResults || [];
        } catch (error) {
          // 批次整体失败，记录每个地址都失败
          const failedAddresses = chunk.map((addr) => ({
            address: addr,
            success: false,
            error: error.message,
          }));
          batchResults.push({
            addressType,
            success: false,
            batchSize: chunk.length,
            addresses: failedAddresses, // 新增：每个地址的失败结果
            error: error.message,
            timestamp: new Date().toISOString(),
          });
          console.error(
            `[批次失败] ${addressType} 批次大小 ${chunk.length}:`,
            error,
          );
          return failedAddresses;
        }
      });
      const waveResults = await Promise.all(promises);
      waveResults.forEach((wr) => results.push(...wr));
      // 波次间延迟
      if (i + effectiveWaves < chunks.length) {
        await new Promise((r) =>
          setTimeout(r, Math.floor(Math.random() * 51) + 960),
        );
      }
    }
    return results;
  }
  // 地址解析函数
  // NOTE: This function is now defined globally at the top of the file.
  // function parseAddressWithPort(address) { ... }

  // 带重试的 fetch 函数
  async function fetchWithRetry(
    url,
    options = {},
    maxRetries = 2,
    timeout = 2000,
  ) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.warn(
          `Fetch retry ${i + 1}/${maxRetries} for ${url}:`,
          error.message,
        );
        // 优化：减少重试延迟，使用指数退避但基数更小
        const delay = Math.min(500 * Math.pow(1.5, i), 1200);
        await new Promise((r) =>
          setTimeout(r, delay + Math.floor(Math.random() * 100)),
        );
      }
    }
  }
  // 初始化位置数组
  const locs = new Array(addresses.length).fill("未知");
  // 初始：域名默认回退到域名本身
  addresses.forEach((addr, idx) => {
    if (addr) {
      const parsed = parseAddressWithPort(addr);
      if (parsed.type === "domain") locs[idx] = parsed.address;
    }
  });
  // 分类收集
  const ipv4Addresses = [],
    ipv4Indices = [];
  const ipv6Addresses = [],
    ipv6Indices = [];
  const domainAddresses = [],
    domainIndices = [];
  addresses.forEach((addr, idx) => {
    if (!addr) return;
    const parsed = parseAddressWithPort(addr);
    if (parsed.type === "ipv4") {
      ipv4Addresses.push(parsed.address);
      ipv4Indices.push(idx);
    } else if (parsed.type === "ipv6") {
      ipv6Addresses.push(parsed.address);
      ipv6Indices.push(idx);
    } else if (parsed.type === "domain") {
      domainAddresses.push(parsed.address);
      domainIndices.push(idx);
    }
  });
  // ====================== P0: 多API兜底调用 ======================
  async function fetchLocationWithFallback(batchBody) {
    let lastError = null;
    for (let attempt = 0; attempt < LOCATION_API_FALLBACK.length; attempt++) {
      const api = LOCATION_API_FALLBACK[attempt];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), api.timeout);
        const resp = await fetch(api.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batchBody),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const data = await resp.json();
          currentApiIndex = attempt; // 记录成功的API
          return { success: true, data, api: api.name };
        }
        lastError = new Error(`HTTP ${resp.status}`);
      } catch (e) {
        lastError = e;
        console.warn(`[API兜底] ${api.name} 失败，尝试下一个...`);
      }
    }
    return { success: false, error: lastError };
  }

  // IPv4 - 使用动态批次大小（修改版：返回每个地址的结果）
  if (ipv4Addresses.length > 0) {
    console.log(`开始处理 ${ipv4Addresses.length} 个 IPv4 地址`);
    const ipv4BatchFn = async (batchIps) => {
      const batchIndices = ipv4Indices.slice(
        ipv4Addresses.indexOf(batchIps[0]),
        ipv4Addresses.indexOf(batchIps[0]) + batchIps.length,
      );
      const batchBody = batchIps.map((ip) => ({
        query: ip,
        fields: "countryCode",
      }));
      try {
        // P0: 使用多API兜底
        const result = await fetchLocationWithFallback(batchBody);
        if (result.success && result.data && Array.isArray(result.data)) {
          console.log(`[API] 使用 ${result.api} 获取地理位置`);
          return result.data.map((o, j) => {
            const idx = batchIndices[j];
            const success = !!o?.countryCode;
            if (success && idx < locs.length) {
              locs[idx] = o.countryCode;
            }
            return {
              address: batchIps[j],
              success: success,
              countryCode: o?.countryCode || null,
            };
          });
        }
        // API 请求失败，返回所有地址失败
        console.error(`[API兜底] 所有API失败: ${result.error}`);
        return batchIps.map((ip) => ({
          address: ip,
          success: false,
          error: result.error?.message || "All APIs failed",
        }));
      } catch (e) {
        console.error("Location IPv4 batch failed:", e);
        // 异常也返回所有地址失败
        return batchIps.map((ip) => ({
          address: ip,
          success: false,
          error: e.message,
        }));
      }
    };
    await batchInWavesWithStats(ipv4Addresses, ipv4BatchFn, "ipv4");
    // 批次间延迟（优化：从3.86-5.37秒降至0.5-1秒）
    if (ipv4Addresses.length > 0) {
      await new Promise((r) =>
        setTimeout(r, Math.floor(Math.random() * 500) + 500),
      );
    }
  }
  // IPv6 - 使用 ip-api.com batch API（与IPv4统一）
  if (ipv6Addresses.length > 0) {
    console.log(`开始处理 ${ipv6Addresses.length} 个 IPv6 地址`);
    const ipv6BatchFn = async (batchIps) => {
      const batchIndices = ipv6Indices.slice(
        ipv6Addresses.indexOf(batchIps[0]),
        ipv6Addresses.indexOf(batchIps[0]) + batchIps.length,
      );
      const batchBody = batchIps.map((ip) => ({
        query: ip,
        fields: "countryCode",
      }));
      try {
        // P0: 使用多API兜底
        const result = await fetchLocationWithFallback(batchBody);
        if (result.success && result.data && Array.isArray(result.data)) {
          console.log(`[API] 使用 ${result.api} 获取IPv6地理位置`);
          return result.data.map((o, j) => {
            const idx = batchIndices[j];
            const success = !!o?.countryCode;
            if (success && idx < locs.length) {
              locs[idx] = o.countryCode + "_IPv6";
            }
            return {
              address: batchIps[j],
              success: success,
              countryCode: o?.countryCode || null,
            };
          });
        }
        return batchIps.map((ip) => ({
          address: ip,
          success: false,
          error: result.error?.message || "All APIs failed",
        }));
      } catch (e) {
        console.error("Location IPv6 batch failed:", e);
        return batchIps.map((ip) => ({
          address: ip,
          success: false,
          error: e.message,
        }));
      }
    };
    await batchInWavesWithStats(ipv6Addresses, ipv6BatchFn, "ipv6");
    // 批次间延迟
    if (ipv6Addresses.length > 0) {
      await new Promise((r) =>
        setTimeout(r, Math.floor(Math.random() * 500) + 500),
      );
    }
  }
  // 域名 DoH + 国家代码 - 使用动态批次大小（修改版：返回每个地址的结果）
  if (domainAddresses.length > 0) {
    console.log(`开始处理 ${domainAddresses.length} 个域名地址`);
    const domainBatchFn = async (batchDomains) => {
      const batchIndices = domainIndices.slice(
        domainAddresses.indexOf(batchDomains[0]),
        domainAddresses.indexOf(batchDomains[0]) + batchDomains.length,
      );
      // 并行处理域名（每批12个，使用Promise.all）
      const CONCURRENCY = 12; // 同时处理12个域名
      const processDomain = async (domain, idx, index) => {
        let success = false;
        let location = null;
        try {
          const dohResp = await fetchWithRetry(
            `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`,
            {
              headers: { Accept: "application/dns-json" },
            },
            2,
            600,
          );
          if (!dohResp.ok) throw new Error("DoH request failed");
          const dohData = await dohResp.json();
          if (dohData.Status !== 0 || !dohData.Answer) {
            throw new Error("DNS query failed");
          }
          const ipRecord = dohData.Answer.find((a) => a.type === 1);
          if (!ipRecord || !ipRecord.data) {
            throw new Error("No A record found");
          }
          const ip = ipRecord.data;
          const apiResp = await fetchWithRetry(
            `https://api.ipapi.is/?q=${encodeURIComponent(ip)}`,
            {},
            2,
            562,
          );
          if (apiResp.ok) {
            const locationData = await apiResp.json();
            const countryCode = locationData?.location?.country_code;
            if (countryCode && idx < locs.length) {
              location = domain + "_" + countryCode;
              locs[idx] = location;
              success = true;
            } else {
              success = false;
            }
          } else {
            success = false;
          }
        } catch (e) {
          console.error("Domain location failed for", domain, e);
          success = false;
        }
        return {
          address: domain,
          success: success,
          location: location,
          index: index,
        };
      };
      // 分批并行处理
      const results = new Array(batchDomains.length);
      for (let i = 0; i < batchDomains.length; i += CONCURRENCY) {
        const chunk = batchDomains.slice(i, i + CONCURRENCY);
        const chunkIndices = batchIndices.slice(i, i + CONCURRENCY);
        const promises = chunk.map((domain, j) =>
          processDomain(domain, chunkIndices[j], i + j),
        );
        const chunkResults = await Promise.all(promises);
        chunkResults.forEach((result) => {
          results[result.index] = {
            address: result.address,
            success: result.success,
            location: result.location,
          };
        });
        // 批次间短暂延迟（优化：从380-440ms降至100-200ms）
        if (i + CONCURRENCY < batchDomains.length) {
          await new Promise((r) =>
            setTimeout(r, Math.floor(Math.random() * 100) + 100),
          );
        }
      }
      return results;
    };
    await batchInWavesWithStats(domainAddresses, domainBatchFn, "domain");
  }
  console.log(`地理位置处理完成: 总计 ${addresses.length} 个地址`);
  return locs;
}
async function fetchURLWithTimeout(url, timeout = 2000) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CF-IP-Collector/3.0 IPv6-Enhanced" }, // 版本升级
    });
    clearTimeout(tid);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } catch (error) {
    clearTimeout(tid);
    throw error;
  }
}
/* ====================== 测速函数 —— 支持 IPv4、IPv6 和域名 ====================== */
async function testIPLatency(addressWithPort, timeout = 2000) {
  if (!addressWithPort) {
    return { success: false, latency: null };
  }
  let attempts = 0;
  const maxAttempts = 2; // 增加重试次数，第二次使用备用地址
  let formattedAddress = addressWithPort;
  const parsed = parseAddressWithPort(addressWithPort);
  if (parsed.type === "ipv6" && !addressWithPort.startsWith("[")) {
    formattedAddress = `[${parsed.address}]:${parsed.port}`;
  }
  // 定义主备测速地址
  const primaryUrl = "https://speed.cloudflare.com/__down?bytes=50000";
  const backupUrl = "https://speed.cloudflare.com/__down?bytes=50000";
  const primaryHost = "speed.cloudflare.com";
  const backupHost = "speed.cloudflare.com";
  while (attempts < maxAttempts) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeout);
    // 第一次使用主地址，重试使用备用地址
    const isRetry = attempts > 0;
    const testUrl = isRetry ? backupUrl : primaryUrl;
    const testHost = isRetry ? backupHost : primaryHost;
    try {
      const start = performance.now();
      const resp = await fetchWithRetry(
        testUrl,
        {
          signal: controller.signal,
          headers: { Host: testHost },
          cf: { resolveOverride: formattedAddress }, // Cloudflare 的解析覆盖
        },
        2,
        600,
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      await resp.arrayBuffer();
      const latency = performance.now() - start;
      return { success: true, latency: Math.round(latency) };
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        return { success: false, latency: null };
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * 61) + 690),
      );
    } finally {
      clearTimeout(tid);
    }
  }
  return { success: false, latency: null };
}
async function batchTestLatency(addresses, concurrency = 6) {
  if (!addresses || addresses.length === 0) return [];
  const results = new Array(addresses.length);

  // 主测试（不含重试，重试由后台独立执行）
  for (let i = 0; i < addresses.length; i += concurrency) {
    const batch = addresses.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (addr, idx) => {
        if (!addr) {
          results[i + idx] = { success: false, latency: null };
          return;
        }
        const res = await testIPLatency(addr);
        results[i + idx] = res;
        await new Promise((r) =>
          setTimeout(r, Math.floor(Math.random() * 51) + 322),
        );
      }),
    );
  }

  return results;
}

/* ====================== 清理旧历史数据 ====================== */
async function cleanupOldIPs(env) {
  const now = Date.now();
  // 配置区 —— 建议这样最安全
  const MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000; // 最多保留 2 天
  const MIN_KEEP_COUNT = 12; // 强制保留最新 12 条
  const MAX_TOTAL_SIZE = 1 * 1024 * 1024; // 总大小不超过 1MB（留足余量）
  const items = (await getHistoryKeys(env)).map((name) => ({ name }));
  if (items.length <= MIN_KEEP_COUNT) {
    console.log("[清理] 记录太少，无需清理");
    return;
  }
  // 第二步：真正读取每个 value 的字节长度（这是唯一可靠的方法）
  const details = [];
  const MAX_CLEANUP_CHECK = 50; // 优化：限制检查数量以防止 CPU 超时
  let checkedCount = 0;
  for (const key of items) {
    if (checkedCount >= MAX_CLEANUP_CHECK) break;
    try {
      const value = await env.IP_STORAGE.get(key.name, { type: "text" });
      if (value === null) continue;
      const size = new TextEncoder().encode(value).length; // 精确字节数
      const date = parseTimestampKey(key.name);
      if (date) {
        details.push({ name: key.name, date, size });
        checkedCount++;
      }
    } catch (e) {
      console.warn(`读取 ${key.name} 失败，跳过:`, e);
    }
  }
  // 按时间倒序（新→旧）
  details.sort((a, b) => b.date - a.date);
  const toDelete = new Set();
  let totalSize = details.reduce((sum, i) => sum + i.size, 0);
  // 阶段1：删除超龄的（但保留最新 MIN_KEEP_COUNT 条）
  for (let i = MIN_KEEP_COUNT; i < details.length; i++) {
    if (details[i].date.getTime() < now - MAX_AGE_MS) {
      toDelete.add(details[i].name);
      totalSize -= details[i].size;
    }
  }
  // 阶段2：如果还超总大小，只保留 MIN_KEEP_COUNT 条最新的，其余全部删除
  if (totalSize > MAX_TOTAL_SIZE) {
    console.log(
      `[清理] 总大小 ${Math.round(totalSize / 1024)} KB 超过限制 ${MAX_TOTAL_SIZE / 1024} KB，将只保留最新 ${MIN_KEEP_COUNT} 条`,
    );
    for (let i = MIN_KEEP_COUNT; i < details.length; i++) {
      if (!toDelete.has(details[i].name)) {
        toDelete.add(details[i].name);
        totalSize -= details[i].size;
      }
    }
  }
  if (toDelete.size > 0) {
    console.log(
      `[清理] 即将删除 ${toDelete.size} 条历史记录，释放约 ${Math.round((details.reduce((s, i) => s + i.size, 0) - totalSize) / 1024)} KB`,
    );
    // 批量删除（KV 支持一次性最多 10,000 个，够用了）
    await Promise.all(
      Array.from(toDelete).map((name) => env.IP_STORAGE.delete(name)),
    );
    console.log("[清理] 完成");
  } else {
    console.log("[清理] 当前正常，无需删除");
  }
  await saveHistoryKeys(
    env,
    items.map((item) => item.name).filter((name) => !toDelete.has(name)),
  );
  // 无论是否删除了记录，都刷新一次全局唯一 IP 计数（确保与存储完全同步）
  await refreshGlobalIPCount(env);
}

/**
 * 刷新全局唯一 IP 计数
 * 根据维护的历史索引构建当前存量的唯一地址总数
 * @param {object} env 环境变量
 */
async function refreshGlobalIPCount(env) {
  try {
    const keys = await getHistoryKeys(env);
    const historicalResults = keys.length
      ? await Promise.all(
          keys.map(async (name) => ({
            key: { name },
            value: await env.IP_STORAGE.get(name),
          })),
        )
      : [
          {
            key: { name: "cloudflare_ips" },
            value: await env.IP_STORAGE.get("cloudflare_ips"),
          },
        ];
    const addressSet = new Set();

    for (const item of historicalResults) {
      if (!item.value) continue;
      try {
        const data = JSON.parse(item.value);
        if (data && data.ips && Array.isArray(data.ips)) {
          data.ips.forEach((i) => {
            if (i && i.address) addressSet.add(i.address);
          });
        }
      } catch (e) {
        console.warn(`Refresh count: Failed to parse ${item.key.name}`);
      }
    }

    // 保存最终计数值
    const count = addressSet.size.toString();
    if ((await env.IP_STORAGE.get("global_unique_ips_count")) !== count) {
      await env.IP_STORAGE.put("global_unique_ips_count", count);
    }
    // 移除旧的增量记录键（如果存在），节省空间
    if ((await env.IP_STORAGE.get("global_unique_ips_set")) !== null) {
      await env.IP_STORAGE.delete("global_unique_ips_set");
    }
    console.log(`Global unique IP count refreshed: ${addressSet.size}`);
  } catch (e) {
    console.error("Refresh global IP count error:", e);
  }
}
/* ====================== 来源管理 ====================== */
// 增强线路名称抓取的特定源：
// - IPDB yx.txt: 域名/IP#线路名称 格式
// - wetest.vip cname: 域名列表+备注
// - api.uouin.com: 表格格式（线路+IP）
async function getSources(env) {
  return (await getCollectorSettings(env)).sources;
}
async function handleSetSources(req, env) {
  const { sources } = await req.json();
  if (!Array.isArray(sources) || sources.some((s) => typeof s !== "string")) {
    return jsonResponse(
      { error: "Invalid sources: must be an array of strings" },
      400,
    );
  }
  await saveCollectorSettings(env, { sources });
  return jsonResponse({ success: true });
}
/* ====================== 黑名单管理 ====================== */
async function getBlacklist(env) {
  const raw = await env.IP_STORAGE.get("blacklist_addresses");
  return raw ? JSON.parse(raw) : [];
}
function isSpeedTestTimeoutFailure(error) {
  return /timeout|timed?\s*out|abort(?:ed|error)?/i.test(String(error || ""));
}
async function addAddressesToBlacklist(
  env,
  addresses,
  reason = "测速请求超时",
) {
  const candidates = [
    ...new Set(
      (addresses || [])
        .filter((address) => typeof address === "string")
        .map((address) => address.trim())
        .filter(Boolean),
    ),
  ];
  if (!candidates.length) return [];
  const blacklist = await getBlacklist(env);
  if (!Array.isArray(blacklist)) {
    throw new Error("黑名单存储格式无效，无法自动加入超时地址");
  }
  const existing = new Set(blacklist);
  const addedAddresses = candidates.filter((address) => !existing.has(address));
  if (!addedAddresses.length) return [];
  await env.IP_STORAGE.put(
    "blacklist_addresses",
    JSON.stringify([...blacklist, ...addedAddresses]),
  );
  console.warn(
    "Speed-test timeout addresses added to blacklist:",
    JSON.stringify({
      event: "speedtest_timeout_blacklisted",
      reason,
      addresses: addedAddresses,
    }),
  );
  return addedAddresses;
}
async function handleSetBlacklist(req, env) {
  const { blacklist } = await req.json();
  if (!Array.isArray(blacklist)) {
    return jsonResponse(
      { error: "Invalid blacklist: must be an array of strings" },
      400,
    );
  }
  await env.IP_STORAGE.put("blacklist_addresses", JSON.stringify(blacklist));
  return jsonResponse({ success: true });
}
/* ====================== 路径管理 ====================== */
async function handleSetPath(req, env) {
  const { path } = await req.json();
  // 如果 path 不是字符串类型，直接返回错误
  if (typeof path !== "string") {
    return jsonResponse({ error: "Invalid path: must be string" }, 400);
  }
  // 清洗路径
  const cleanedPath = sanitizePath(path.trim());
  // 获取当前存储的路径（用于验证和返回）
  const currentStoredPath = await env.IP_STORAGE.get("custom_path");
  // 如果原输入为空字符串 → 删除路径（恢复默认）
  if (path.trim() === "") {
    await env.IP_STORAGE.delete("custom_path");
    return jsonResponse({
      success: true,
      message: "路径已清除，使用默认路径",
      path: "",
    });
  }
  // 如果清洗后为空 → 说明格式无效，保持原路径不变
  if (cleanedPath === "") {
    return jsonResponse(
      {
        success: false,
        error: "路径格式无效，未被保存。保持原路径不变。",
        path: currentStoredPath || "", // 返回当前存储的路径
      },
      400,
    );
  }
  // 如果清洗后有效 → 保存清洗后的路径
  await env.IP_STORAGE.put("custom_path", cleanedPath);
  return jsonResponse({
    success: true,
    message: "路径设置成功",
    path: cleanedPath,
  });
}
/* ====================== 数据读取核心逻辑 ====================== */
async function getStoredIPsLatest(env) {
  const [latest] = await getRecentHistoryData(env, 1);
  return latest || { ips: [], count: 0, lastUpdated: null, sources: [] };
}
async function getIPsWithFallback(env, limit = null) {
  const blacklistRaw = await getBlacklist(env);
  const blacklistPreprocessed = preprocessBlacklist(blacklistRaw);
  // 获取最近10条历史记录（足够补足）
  const historicalData = await getRecentHistoryData(env, 90);
  if (!historicalData || historicalData.length === 0) {
    return {
      ips: [],
      count: 0,
      lastUpdated: new Date().toISOString(),
      sources: [],
      originalCount: 0,
      sortByBandwidth: false,
      blacklist: blacklistRaw,
    };
  }
  const latest = historicalData[0]; // 最新一批
  const result = [];
  const addressSet = new Set();
  const hasBandwidthMeasurements = Number.isFinite(latest.bandwidthTestedCount)
    ? latest.bandwidthTestedCount > 0
    : (latest.ips || []).some(
        (item) => Number.isFinite(item?.bandwidth) && item.bandwidth > 0,
      );
  // Step 1: 处理最新批次
  let latestIPs = (latest.ips || []).filter(
    (item) =>
      item &&
      item.address &&
      !isBlacklisted(item.address, blacklistPreprocessed),
  );
  // 按延迟升序排序（无延迟排后面）
  sortIPsBySpeed(latestIPs, hasBandwidthMeasurements);
  const latestCount = latestIPs.length;
  // 如果 limit 为 null 或 <= 0，视为"显示最新全部"
  if (!limit || limit <= 0) {
    latestIPs.forEach((item) => {
      if (item && item.address) {
        addressSet.add(item.address);
        result.push(item);
      }
    });
  } else if (limit <= latestCount) {
    // 只需要最新批次的前 limit 条
    latestIPs.slice(0, limit).forEach((item) => {
      if (item && item.address) {
        addressSet.add(item.address);
        result.push(item);
      }
    });
  } else {
    // 需要补足：先加全部最新批次
    latestIPs.forEach((item) => {
      if (item && item.address) {
        addressSet.add(item.address);
        result.push(item);
      }
    });
  }
  // Step 2: 如果还需要补足（limit > latestCount 且 limit > 0）
  if (limit > 0 && result.length < limit) {
    const need = limit - result.length;
    for (let i = 1; i < historicalData.length && result.length < limit; i++) {
      const batch = historicalData[i];
      if (!batch || !batch.ips || !Array.isArray(batch.ips)) continue;
      let candidates = batch.ips
        .filter(
          (item) =>
            item &&
            item.address &&
            !addressSet.has(item.address) &&
            !isBlacklisted(item.address, blacklistPreprocessed),
        )
        .sort((a, b) => {
          if (a.latency && b.latency) return a.latency - b.latency;
          if (a.latency) return -1;
          if (b.latency) return 1;
          return 0;
        });
      for (const item of candidates) {
        if (result.length >= limit) break;
        if (item && item.address) {
          addressSet.add(item.address);
          result.push(item);
        }
      }
    }
  }
  return {
    ips: result,
    count: result.length,
    lastUpdated: latest.lastUpdated || new Date().toISOString(),
    sources: latest.sources || [],
    originalCount: latestCount, // 最新批次原始数量（用于前台显示）
    totalUniqueIPs: addressSet.size, // 全局唯一地址总数
    sortByBandwidth: hasBandwidthMeasurements,
    blacklist: blacklistRaw,
  };
}
/* ====================== 管理员功能 ====================== */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}
async function getAdminPasswordHash(env) {
  const storedHash = await env.IP_STORAGE.get("admin_password_hash");
  if (storedHash) return storedHash;
  return env.ADMIN_PASSWORD ? hashPassword(env.ADMIN_PASSWORD) : null;
}
async function signAdminSessionTimestamp(env, timestamp) {
  const passwordHash = await getAdminPasswordHash(env);
  if (!passwordHash) throw new Error("管理员密码尚未设置");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passwordHash),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(String(timestamp)),
    ),
  );
  return btoa(String.fromCharCode(...signature))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
async function getAdminStatus(env, request) {
  const cookie = request.headers.get("Cookie") || "";
  let isLoggedIn = false;
  if (cookie) {
    const match = cookie.match(/admin_session=([^;]+)/);
    if (match) {
      try {
        const [timestamp, signature] = match[1].split(".");
        const tokenTime = Number(atob(timestamp));
        const now = Date.now();
        const passwordHash = await getAdminPasswordHash(env);
        const key = passwordHash
          ? await crypto.subtle.importKey(
              "raw",
              new TextEncoder().encode(passwordHash),
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["verify"],
            )
          : null;
        const normalizedSignature = (signature || "")
          .replace(/-/g, "+")
          .replace(/_/g, "/");
        const signatureBytes = Uint8Array.from(
          atob(
            normalizedSignature +
              "=".repeat((4 - (normalizedSignature.length % 4)) % 4),
          ),
          (character) => character.charCodeAt(0),
        );
        if (
          key &&
          Number.isSafeInteger(tokenTime) &&
          tokenTime <= now + 60_000 &&
          now - tokenTime < 60 * 60 * 1000 &&
          now >= tokenTime &&
          (await crypto.subtle.verify(
            "HMAC",
            key,
            signatureBytes,
            new TextEncoder().encode(String(tokenTime)),
          ))
        ) {
          isLoggedIn = true;
        }
      } catch {
        // 忽略解码失败的情况
      }
    }
  }
  const hasPassword = !!(await getAdminPasswordHash(env));
  return { isLoggedIn, hasPassword };
}
async function handleSetPassword(req, env) {
  const { password } = await req.json();
  if (!password || typeof password !== "string" || password.length < 4) {
    return jsonResponse({ error: "密码无效，至少4位" }, 400);
  }
  const hashed = await hashPassword(password);
  await env.IP_STORAGE.put("admin_password_hash", hashed);
  return jsonResponse({ success: true });
}
async function handleLogin(req, env) {
  const { password } = await req.json();
  if (!password || typeof password !== "string") {
    return jsonResponse({ error: "缺少密码" }, 400);
  }
  const storedHash = await getAdminPasswordHash(env);
  if (!storedHash) return jsonResponse({ error: "未设置密码，请先设置" }, 401);
  const inputHash = await hashPassword(password);
  if (inputHash !== storedHash) return jsonResponse({ error: "密码错误" }, 401);
  const tokenTime = Date.now();
  const token =
    btoa(String(tokenTime)) +
    "." +
    (await signAdminSessionTimestamp(env, tokenTime));
  const expires = new Date(tokenTime + 60 * 60 * 1000).toUTCString();
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `admin_session=${token}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Strict`,
  );
  headers.append("Content-Type", "application/json");
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
}
async function handleLogout(req, env) {
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict`,
  );
  headers.append("Content-Type", "application/json");
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers,
  });
}
async function handleAdminStatus(req, env) {
  const status = await getAdminStatus(env, req);
  return jsonResponse(status);
}
function simpleHash(str) {
  if (!str) return "";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
function formatLocationLabel(location, countryNames = SUPPORTED_COUNTRIES) {
  const raw = String(location || "").trim();
  if (!raw || raw.toLowerCase() === "未知" || raw.toLowerCase() === "unknown")
    return "未知";
  const parts = raw
    .split(/[_·,，|]+/)
    .map((part) => part.trim())
    .filter((part) => part && !/^\d+\s*ms$/i.test(part));
  if (parts.length && /^[A-Z]{2}$/.test(parts[0]) && countryNames[parts[0]]) {
    parts[0] = countryNames[parts[0]];
  }
  return parts.join(" · ") || "未知";
}
/* ====================== 页面与接口 ====================== */
function getCronFrequencyLabel(schedule, speedTestMode = "scheduled") {
  const action = "自动获取并测速";
  if (!schedule) {
    return "等待获取 Cron 频率";
  }
  const fields = String(schedule).trim().split(/\s+/);
  if (fields.length !== 5) return `按 Cron 计划${action}`;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  const calendarIsWildcard =
    dayOfMonth === "*" && month === "*" && dayOfWeek === "*";
  const minuteStep = minute.match(/^\*\/(\d+)$/);
  const hourStep = hour.match(/^\*\/(\d+)$/);
  if (
    calendarIsWildcard &&
    hour === "*" &&
    minuteStep &&
    Number(minuteStep[1]) > 0
  ) {
    const interval = Number(minuteStep[1]);
    return interval === 1
      ? `每 1 分钟${action}`
      : `每 ${interval} 分钟${action}`;
  }
  if (
    calendarIsWildcard &&
    /^\d+$/.test(minute) &&
    hourStep &&
    Number(hourStep[1]) > 0
  ) {
    const interval = Number(hourStep[1]);
    return interval === 1
      ? `每 1 小时${action}`
      : `每 ${interval} 小时${action}`;
  }
  if (calendarIsWildcard && /^\d+$/.test(minute) && hour === "*") {
    return `每 1 小时${action}`;
  }
  if (calendarIsWildcard && /^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    return `每天 ${String(Number(hour)).padStart(2, "0")}:${String(Number(minute)).padStart(2, "0")} ${action}`;
  }
  return `按 Cron 计划${action}`;
}

function getDeviceType(request) {
  const userAgent = String(
    request?.headers?.get("User-Agent") || "",
  ).toLowerCase();
  const mobileHeader = String(
    request?.headers?.get("Sec-CH-UA-Mobile") || "",
  ).toLowerCase();
  const mobileUserAgent =
    /android|avantgo|blackberry|bada|binge|iphone|ipad|ipod|iemobile|mobile|opera mini|windows phone|webos/.test(
      userAgent,
    );
  return mobileHeader === "?1" || mobileUserAgent ? "mobile" : "desktop";
}

async function serveHTML(env, request) {
  const adminStatus = await getAdminStatus(env, request);
  const latest = await getStoredIPsLatest(env);
  const collectorSettings = await getCollectorSettings(env);
  const limit = collectorSettings.displayLimit;
  const customPath = await getCustomPath(env);
  const speedTestCount = collectorSettings.speedTestCount;
  const maxLatency = collectorSettings.maxLatency;
  const minBandwidth = collectorSettings.minBandwidth;
  const speedTestMode = collectorSettings.speedTestMode;
  const speedTestLatencies = (latest.ips || [])
    .filter(isSpeedTestedIP)
    .map((item) => Number(item.latency));
  const scheduledSpeedTestAverageRequestMs = speedTestLatencies.length
    ? Math.round(
        speedTestLatencies.reduce((total, latency) => total + latency, 0) /
          speedTestLatencies.length,
      )
    : collectorSettings.scheduledSpeedTestTimeoutSeconds * 1000;
  const scheduleIdentifiers = await getStoredScheduleIdentifiers(env);
  const scheduleApiConfigured = Boolean(
    scheduleIdentifiers.accountId && scheduleIdentifiers.scriptName,
  );
  const scheduleApiTokenSaved = Boolean(
    await env.IP_STORAGE.get(SCHEDULE_API_TOKEN_KEY),
  );
  const scheduleApiTokenConfigured = Boolean(
    scheduleApiTokenSaved || env.CLOUDFLARE_API_TOKEN,
  );
  const appliedCronExpressions = await getAppliedCronExpressions(env);
  const scheduleEnabledValue = await env.IP_STORAGE.get(SCHEDULE_ENABLED_KEY);
  const scheduleEnabled =
    collectorSettings.scheduleConfigured && scheduleEnabledValue === "true";
  const speedTestCountLabel =
    speedTestCount === 0 ? "全部" : `${speedTestCount} 个`;
  const autoUpdateCount = collectorSettings.autoUpdateCount;
  const autoUpdateCountLabel = "全部";
  const scheduledSpeedTestCountLabel =
    speedTestMode === "scheduled" ? "全部" : "未启用";
  const selectedQualityCountries = collectorSettings.qualityCountries;

  // 获取全局唯一 IP 计数 (优先从专门的计数键读取)
  let totalUnique = await env.IP_STORAGE.get("global_unique_ips_count");
  if (!totalUnique) {
    // 如果没有全局计数，尝试从当前显示数据中获取兜底
    const displayData = await getIPsWithFallback(env, limit);
    totalUnique = displayData.totalUniqueIPs;
  }

  const displayData = await getIPsWithFallback(env, limit);
  const classificationCandidates = new Map(
    (latest.ips || []).map((item) => [item.address, item]),
  );
  for (const item of displayData.ips || []) {
    if (!classificationCandidates.has(item.address)) {
      classificationCandidates.set(item.address, item);
    }
  }
  const enrichedCandidates = await enrichIPsWithQualityCountries(
    env,
    Array.from(classificationCandidates.values()),
  );
  const candidateByAddress = new Map(
    enrichedCandidates.map((item) => [item.address, item]),
  );
  const speedClassification = classifyIPsByCountry(
    enrichedCandidates,
    selectedQualityCountries,
    collectorSettings,
  );
  const speedCategoryCounts = {
    premium: 0,
    "premium-domain": 0,
    backup: 0,
    untested: 0,
  };
  const displayIPs = includeAllPremiumAddresses(
    (displayData.ips || []).map(
      (item) => candidateByAddress.get(item.address) || item,
    ),
    enrichedCandidates,
    speedClassification,
    displayData.blacklist,
  );
  for (const item of displayIPs) {
    const category =
      speedClassification.categories.get(item.address) || "untested";
    speedCategoryCounts[category]++;
  }
  // 确保显示数据中的每个IP都有位置信息
  if (displayIPs.length) {
    displayIPs.forEach((ip) => {
      if (ip && !ip.location) ip.location = "未知";
    });
  }
  const data = {
    ...latest,
    limit,
    customPath,
    speedTestCount,
    speedTestCountLabel,
    scheduledSpeedTestCountLabel,
    maxLatency,
    minBandwidth,
    speedTestMode,
    manualBatchSize: Number.isSafeInteger(collectorSettings.manualBatchSize)
      ? collectorSettings.manualBatchSize
      : DEFAULT_MANUAL_SPEED_TEST_BATCH_SIZE,
    manualBatchIntervalSeconds: Number.isSafeInteger(collectorSettings.manualBatchIntervalSeconds)
      ? collectorSettings.manualBatchIntervalSeconds
      : DEFAULT_MANUAL_SPEED_TEST_BATCH_INTERVAL_SECONDS,
    manualAddressIntervalSeconds: Number.isSafeInteger(collectorSettings.manualAddressIntervalSeconds)
      ? collectorSettings.manualAddressIntervalSeconds
      : DEFAULT_MANUAL_SPEED_TEST_ADDRESS_INTERVAL_SECONDS,
    manualSpeedTestTimeoutSeconds: collectorSettings.manualSpeedTestTimeoutSeconds,
    scheduledSpeedTestBatchSize: Number.isSafeInteger(collectorSettings.scheduledSpeedTestBatchSize)
      ? collectorSettings.scheduledSpeedTestBatchSize
      : SCHEDULED_SPEED_TEST_BATCH_SIZE,
    scheduledSpeedTestBatchIntervalSeconds: Number.isSafeInteger(collectorSettings.scheduledSpeedTestBatchIntervalSeconds)
      ? collectorSettings.scheduledSpeedTestBatchIntervalSeconds
      : DEFAULT_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS,
    scheduledSpeedTestAddressIntervalSeconds: Number.isSafeInteger(collectorSettings.scheduledSpeedTestAddressIntervalSeconds)
      ? collectorSettings.scheduledSpeedTestAddressIntervalSeconds
      : DEFAULT_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS,
    scheduledSpeedTestTimeoutSeconds: collectorSettings.scheduledSpeedTestTimeoutSeconds,
    scheduledSpeedTestEstimateAddressCount: (latest.ips || []).filter(
      (item) => typeof item?.address === "string" && item.address,
    ).length,
    scheduledSpeedTestAverageRequestMs,
    scheduledSpeedTestAverageRequestFallback: speedTestLatencies.length === 0,
    scheduleFields: collectorSettings.scheduleFields,
    scheduleInterval: getSimpleScheduleInterval(
      collectorSettings.scheduleFields,
    ),
    scheduleTimezone: collectorSettings.scheduleTimezone,
    scheduleConfigured: collectorSettings.scheduleConfigured,
    desiredCronExpressions: collectorSettings.desiredCronExpressions,
    scheduleApiConfigured,
    scheduleApiTokenSaved,
    scheduleApiTokenConfigured,
    scheduleAccountId: scheduleIdentifiers.accountId,
    scheduleScriptName: scheduleIdentifiers.scriptName,
    scheduleEnabled,
    appliedCronExpressions,
    autoUpdateCount,
    autoUpdateCountLabel,
    selectedQualityCountries,
    qualityCountryLimits: collectorSettings.qualityCountryLimits,
    sources_urls: await getSources(env),
    blacklist: displayData.blacklist,
    totalUniqueIPs: totalUnique, // 使用全局唯一地址总数
    ips: displayIPs
      .map((item) => ({
        ...item,
        countryCode: getCountryCodeForIP(item),
        speedCategory:
          speedClassification.categories.get(item.address) || "untested",
        speedRank: speedClassification.rankByAddress.get(item.address) || null,
      }))
      .sort((a, b) => (a.speedRank || Infinity) - (b.speedRank || Infinity)),
    qualityCountryCounts: Object.fromEntries(
      selectedQualityCountries.map((countryCode) => [
        countryCode,
        displayIPs.filter((item) => {
          const category = speedClassification.categories.get(item.address);
          return (
            category === "premium" && getCountryCodeForIP(item) === countryCode
          );
        }).length,
      ]),
    ),
    count: displayData.count,
    speedCategoryCounts,
    originalCount: displayData.originalCount || 0,
    adminStatus,
  };
  const ipsHref = data.customPath ? "/" + data.customPath + "/ips" : "/ips";
  const ipTxtHref = data.customPath
    ? "/" + data.customPath + "/ip.txt"
    : "/ip.txt";
  const showSetPassword = !data.adminStatus.hasPassword;
  const showLogin =
    data.adminStatus.hasPassword && !data.adminStatus.isLoggedIn;
  const showAdminButton = data.adminStatus.isLoggedIn;
  const deviceType = getDeviceType(request);
  const htmlDeviceClass = `device-${deviceType}`;
  const html = `<!DOCTYPE html>
<html lang="zh-CN" class="${htmlDeviceClass}" data-device="${deviceType}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>多数据源采集优选管理面板</title>
    <script>
        (function () {
            const ua = navigator.userAgent || '';
            const mobileUa = /Android|webOS|BlackBerry|Bada|iPhone|iPad|iPod|IEMobile|Mobile|Opera Mini|Windows Phone/i.test(ua);
            const smallScreen = window.matchMedia('(max-width: 768px)');
            const coarsePointer = window.matchMedia('(pointer: coarse)');
            function applyDeviceType() {
                const touchDevice = navigator.maxTouchPoints > 0 || coarsePointer.matches;
                const type = mobileUa || (touchDevice && smallScreen.matches) ? 'mobile' : 'desktop';
                [document.documentElement, document.body].filter(Boolean).forEach(function (element) {
                    element.classList.remove('device-mobile', 'device-desktop');
                    element.classList.add('device-' + type);
                    element.dataset.device = type;
                });
            }
            applyDeviceType();
            window.addEventListener('resize', applyDeviceType);
            document.addEventListener('DOMContentLoaded', applyDeviceType);
        })();
    </script>
	<link rel="icon" href="/favicon.png">
	<link rel="apple-touch-icon" href="/favicon.png">
	<link rel="shortcut icon" href="/favicon.png">
    <!-- iOS和移动设备 -->
    <link rel="apple-touch-icon-precomposed" href="/favicon.png">
    <!-- PWA manifest -->
    <link rel="manifest" href="data:application/manifest+json,{
      %22name%22:%22多数据源采集优选管理面板%22,
      %22short_name%22:%22优选采集%22,
      %22icons%22:[{
        %22src%22:%22/favicon.png%22,
        %22sizes%22:%22192x192%22,
        %22type%22:%22image/png%22
      }],
      %22start_url%22:%22.%22,
      %22display%22:%22standalone%22,
      %22theme_color%22:%22#3b82f6%22
    }">
    <!-- Windows磁贴 -->
    <meta name="msapplication-TileImage" content="/favicon.png">
    <meta name="msapplication-TileColor" content="#3b82f6">
    <!-- 主题色 -->
    <meta name="theme-color" content="#3b82f6" id="meta-theme-light" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#0f172a" id="meta-theme-dark" media="(prefers-color-scheme: dark)">
    <script>
        (function() {
            try {
                const savedTheme = localStorage.getItem('cf-ip-collector-theme');
                if (savedTheme === 'light' || savedTheme === 'dark') {
                    document.documentElement.setAttribute('data-theme', savedTheme);
                }
            } catch (error) {
                console.warn('无法读取主题偏好，将使用默认主题。', error);
            }
        })();
    </script>
    <style>
        :root {
            /* 浅色模式变量 (默认) */
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-card: #ffffff;
            --bg-hover: #f1f5f9;
            --bg-stat: #f8fafc;
            --bg-ip-list: #f8fafc;
            --bg-source: #f8fafc;
            --bg-modal: #ffffff;
            --bg-admin-modal: #ffffff;
            --bg-admin-dropdown: #ffffff;
            --bg-overlay: rgba(0,0,0,0.5);
            --bg-content-overlay: rgba(0,0,0,0.1);
            --text-primary: #334155;
            --text-secondary: #64748b;
            --text-heading: #1e40af;
            --text-heading-h2: #1e40af;
            --border-primary: #e2e8f0;
            --border-secondary: #cbd5e1;
            --border-input: #cbd5e1;
            --input-bg: #ffffff;
            --input-text: #334155;
            --shadow-sm: 0 2px 4px rgba(0,0,0,0.05);
            --shadow-md: 0 4px 6px rgba(0,0,0,0.05);
            --shadow-lg: 0 8px 16px rgba(0,0,0,0.15);
            --shadow-button: 0 4px 8px rgba(0,0,0,0.1);
            --btn-secondary-bg: #ffffff;
            --btn-secondary-text: #475569;
            --btn-secondary-border: #cbd5e1;
            --btn-secondary-hover: #f8fafc;
            --spinner-bg: #e2e8f0;
            --success-bg: rgba(16, 185, 129, 0.07);
            --success-text: #065f46;
            --success-border: #10b981;
            --error-bg: rgba(239, 68, 68, 0.07);
            --error-text: #991b1b;
            --error-border: #ef4444;
            --speed-fast-bg: #d1fae5;
            --speed-fast-text: #065f46;
            --speed-medium-bg: #fef3c7;
            --speed-medium-text: #92400e;
            --speed-slow-bg: #fee2e2;
            --speed-slow-text: #991b1b;
            --bandwidth-fast-bg: #cffafe;
            --bandwidth-fast-text: #0e7490;
            --theme-toggle-bg: #ffffff;
            --progress-bg: #e2e8f0;
            --admin-btn-bg: #3b82f6;
            --admin-btn-text: #ffffff;
            --admin-dropdown-btn-bg: #ef4444;
            /* 元素特定变量 */
            --header-gradient: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
            --result-info-bg: #3b82f6;
            --result-success-bg: #10b981;
            --result-warning-bg: #f59e0b;
            --result-error-bg: #ef4444;
            --result-primary-bg: #3b82f6;
            --result-secondary-bg: #8b5cf6;
        }
        [data-theme="dark"] {
            /* 深色模式变量 (手动锁定) */
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-card: #1e293b;
            --bg-hover: #334155;
            --bg-stat: #0f172a;
            --bg-ip-list: #0f172a;
            --bg-source: #0f172a;
            --bg-modal: #1e293b;
            --bg-admin-modal: #1e293b;
            --bg-admin-dropdown: #1e293b;
            --bg-overlay: rgba(0,0,0,0.7);
            --bg-content-overlay: rgba(0,0,0,0.3);
            --text-primary: #e2e8f0;
            --text-secondary: #94a3b8;
            --text-heading: #60a5fa;
            --text-heading-h2: #60a5fa;
            --border-primary: #334155;
            --border-secondary: #475569;
            --border-input: #475569;
            --input-bg: #334155;
            --input-text: #ffffff;
            --shadow-sm: 0 2px 4px rgba(0,0,0,0.3);
            --shadow-md: 0 4px 6px rgba(0,0,0,0.3);
            --shadow-lg: 0 8px 16px rgba(0,0,0,0.4);
            --shadow-button: 0 4px 8px rgba(0,0,0,0.3);
            --btn-secondary-bg: #334155;
            --btn-secondary-text: #e2e8f0;
            --btn-secondary-border: #475569;
            --btn-secondary-hover: #475569;
            --spinner-bg: #334155;
            --success-bg: rgba(16, 185, 129, 0.07);
            --success-text: #17f2b4;
            --success-border: #10b981;
            --error-bg: rgba(239, 68, 68, 0.07);
            --error-text: #fca5a5;
            --error-border: #ef4444;
            --speed-fast-bg: #064e3b;
            --speed-fast-text: #6ee7b7;
            --speed-medium-bg: #b16336;
            --speed-medium-text: #fcd34d;
            --speed-slow-bg: #991b1b;
            --speed-slow-text: #ffcece;
            --bandwidth-fast-bg: #164e63;
            --bandwidth-fast-text: #67e8f9;
            --theme-toggle-bg: #1e293b;
            --progress-bg: #334155;
            --admin-btn-bg: #2563eb;
            --admin-btn-text: #ffffff;
            --admin-dropdown-btn-bg: #dc2626;
            /* 元素特定变量 */
            --header-gradient: linear-gradient(135deg, #60a5fa 0%, #22d3ee 100%);
            --result-info-bg: #3253ad;
            --result-success-bg: #064e3b;
            --result-warning-bg: #a16207;
            --result-error-bg: #7f1d1d;
            --result-primary-bg: #12608d;
            --result-secondary-bg: #581c87;
        }
        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
                /* 深色模式变量 (跟随系统) */
                --bg-primary: #0f172a;
                --bg-secondary: #1e293b;
                --bg-card: #1e293b;
                --bg-hover: #334155;
                --bg-stat: #0f172a;
                --bg-ip-list: #0f172a;
                --bg-source: #0f172a;
                --bg-modal: #1e293b;
                --bg-admin-modal: #1e293b;
                --bg-admin-dropdown: #1e293b;
                --bg-overlay: rgba(0,0,0,0.7);
                --bg-content-overlay: rgba(0,0,0,0.3);
                --text-primary: #e2e8f0;
                --text-secondary: #94a3b8;
                --text-heading: #60a5fa;
                --text-heading-h2: #60a5fa;
                --border-primary: #334155;
                --border-secondary: #475569;
                --border-input: #475569;
                --input-bg: #334155;
                --input-text: #ffffff;
                --shadow-sm: 0 2px 4px rgba(0,0,0,0.3);
                --shadow-md: 0 4px 6px rgba(0,0,0,0.3);
                --shadow-lg: 0 8px 16px rgba(0,0,0,0.4);
                --shadow-button: 0 4px 8px rgba(0,0,0,0.3);
                --btn-secondary-bg: #334155;
                --btn-secondary-text: #e2e8f0;
                --btn-secondary-border: #475569;
                --btn-secondary-hover: #475569;
                --spinner-bg: #334155;
                --success-bg: rgba(16, 185, 129, 0.07);
                --success-text: #17f2b4;
                --success-border: #10b981;
                --error-bg: rgba(239, 68, 68, 0.07);
                --error-text: #fca5a5;
                --error-border: #ef4444;
                --speed-fast-bg: #064e3b;
                --speed-fast-text: #6ee7b7;
                --speed-medium-bg: #b16336;
                --speed-medium-text: #fcd34d;
                --speed-slow-bg: #991b1b;
                --speed-slow-text: #ffcece;
                --theme-toggle-bg: #1e293b;
                --progress-bg: #334155;
                --admin-btn-bg: #2563eb;
                --admin-btn-text: #ffffff;
                --admin-dropdown-btn-bg: #dc2626;
                /* 元素特定变量 */
                --header-gradient: linear-gradient(135deg, #60a5fa 0%, #22d3ee 100%);
                --result-info-bg: #3253ad;
                --result-success-bg: #064e3b;
                --result-warning-bg: #a16207;
                --result-error-bg: #7f1d1d;
                --result-primary-bg: #12608d;
                --result-secondary-bg: #581c87;
            }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            background: var(--bg-primary); 
            color: var(--text-primary); 
            min-height: 100vh; 
            padding: 20px;
            transition: background 0.3s ease, color 0.3s ease;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid var(--border-primary); position: relative; }
        .header-content h1 { font-size: 2.5rem; background: var(--header-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; font-weight: 700; }
        .header-content p { color: var(--text-secondary); font-size: 1.1rem; }
        .admin-button { background: var(--admin-btn-bg); color: var(--admin-btn-text); border: none; padding: 11px 20px; border-radius: 10px 10px 10px 10px; cursor: pointer; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; position: absolute; right: 0; top: 30%; transform: translateY(-50%); min-width: 122px; max-width: 128px; box-shadow: var(--shadow-sm); transition: all 0.3s ease; z-index: 101; }
        .admin-button:hover { background: #2563eb; }
        .admin-dropdown { display: none; position: absolute; right: 0; top: 100%; margin-top: -72px; background: var(--bg-admin-dropdown); border: 1px solid var(--border-primary); border-top: none; border-radius: 0 0 10px 10px; box-shadow: var(--shadow-lg); z-index: 100; min-width: 121px; max-width: 129px; overflow: hidden; }
        .admin-dropdown button { width: 100%; padding: 11px 20px; border: none; background: var(--admin-dropdown-btn-bg); min-width: 121px; max-width: 129px; color: white; text-align: center; cursor: pointer; font-weight: 600; font-size: 0.95rem; }
        .admin-dropdown button:hover { background: #dc2626;}
        .card { background: var(--bg-card); border-radius: 16px; padding: 30px; margin-bottom: 24px; border: 1px solid var(--border-primary); box-shadow: var(--shadow-md); transition: background 0.3s ease, border-color 0.3s ease; }
        .card h2 { font-size: 1.5rem; color: var(--text-heading-h2); margin-bottom: 20px; font-weight: 600; transition: color 0.3s ease; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat { background: var(--bg-stat); padding: 20px; border-radius: 12px; text-align: center; border: 1px solid var(--border-primary); transition: background 0.3s ease, border-color 0.3s ease; }
        .stat-value { font-size: 2rem; font-weight: 700; margin-bottom: 8px; }
        .stat-value.recent { color: #3b82f6; }
        .stat-value.total { color: #10b981; }
        .stat-value.time { color: #6b7280; }
        .button-group { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
        .button { padding: 12px 20px; border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background: #3b82f6; color: white; border: 1px solid #3b82f6; }
        .button:hover { background: #2563eb; border-color: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(59,130,246,0.3); }
        .button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
        .button-success { background: #10b981; border-color: #10b981; }
        .button-success:hover { background: #059669; border-color: #059669; box-shadow: 0 4px 8px rgba(16,185,129,0.3); }
        .button-warning { background: #f59e0b; border-color: #f59e0b; }
        .button-warning:hover { background: #d97706; border-color: #d97706; box-shadow: 0 4px 8px rgba(245,158,11,0.3); }
        .button-secondary { background: var(--btn-secondary-bg); color: var(--btn-secondary-text); border-color: var(--btn-secondary-border); }
        .button-secondary:hover { background: var(--btn-secondary-hover); border-color: var(--border-secondary); box-shadow: var(--shadow-button); }
        .ip-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
        .sources-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
        .ip-list { background: var(--bg-ip-list); border-radius: 12px; padding: 20px; max-height: 500px; overflow-y: auto; border: 1px solid var(--border-primary); transition: background 0.3s ease, border-color 0.3s ease; }
        /* 自定义滚动条样式 */
        /* ip-limit-input 样式 - 覆盖浏览器默认样式 */
        #ip-limit-input {
            background-color: var(--input-bg) !important;
            color: var(--input-text) !important;
            caret-color: var(--input-text);
        }
        /* 确保所有textarea在深色模式下使用正确的颜色 */
        textarea[id$="-textarea"] {
            background-color: var(--input-bg) !important;
            color: var(--input-text) !important;
            caret-color: var(--input-text);
        }
        /* placeholder文字颜色 */
        #ip-limit-input::placeholder,
        textarea[id$="-textarea"]::placeholder,
        input[type="text"]::placeholder {
            color: var(--text-secondary);
            opacity: 0.7;
        }
        /* 确保所有内联样式的input都使用正确的颜色 */
        input[type="text"][id$="-input"] {
            background-color: var(--input-bg) !important;
            color: var(--input-text) !important;
            caret-color: var(--input-text);
        }
        .ip-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-primary); transition: background 0.3s ease; }
        .ip-item[hidden] { display: none !important; }
        .ip-item:hover { background: var(--bg-hover); }
        .ip-item:last-child { border-bottom: none; }
        .ip-info { display: flex; align-items: center; gap: 16px; }
        .ip-address { font-family: 'SF Mono', 'Courier New', monospace; font-weight: 600; min-width: 140px; color: var(--text-primary); word-break: break-all; transition: color 0.3s ease; }
        .speed-result { font-size: 0.85rem; padding: 4px 12px; border-radius: 8px; background: var(--spinner-bg); min-width: 70px; text-align: center; font-weight: 600; transition: background 0.3s ease; }
        .speed-fast { background: var(--speed-fast-bg); color: var(--speed-fast-text); }
        .speed-medium { background: var(--speed-medium-bg); color: var(--speed-medium-text); }
        .speed-slow { background: var(--speed-slow-bg); color: var(--speed-slow-text); }
        .bandwidth-fast { background: var(--bandwidth-fast-bg); color: var(--bandwidth-fast-text); }
        .bandwidth-medium { background: var(--speed-medium-bg); color: var(--speed-medium-text); }
        .bandwidth-slow { background: var(--speed-slow-bg); color: var(--speed-slow-text); }
        .action-buttons { display: flex; gap: 8px; }
        .small-btn { padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; border: 1px solid var(--border-secondary); background: var(--btn-secondary-bg); color: var(--btn-secondary-text); cursor: pointer; transition: all 0.3s ease; }
        .small-btn:hover { background: var(--btn-secondary-hover); border-color: var(--border-secondary); }
        .small-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .loading { display: none; text-align: center; padding: 30px; }
        .spinner { border: 3px solid var(--spinner-bg); border-top: 3px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px; transition: border-color 0.3s ease; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .result { margin: 20px 0; padding: 16px 20px; border-radius: 12px; display: none; border-left: 4px solid; }
        .success { background: var(--success-bg); color: var(--success-text); border-left-color: var(--success-border); transition: background 0.3s ease, color 0.3s ease; }
        .error { background: var(--error-bg); color: var(--error-text); border-left-color: var(--error-border); transition: background 0.3s ease, color 0.3s ease; }
        .speed-test-progress { margin: 16px 0; background: var(--progress-bg); border-radius: 8px; height: 8px; overflow: hidden; display: none; transition: background 0.3s ease; }
        .speed-test-progress-bar { background: linear-gradient(90deg, #3b82f6, #06b6d4); height: 100%; width: 0%; transition: width 0.3s ease; }
        .sources { display: grid; gap: 12px; }
        .source { padding: 12px 16px; background: var(--bg-source); border-radius: 10px; border: 1px solid var(--border-primary); border-left: 4px solid #10b981; transition: background 0.3s ease, transform 0.2s ease; }
        .source:hover { transform: translateY(-1px); }
        .source.error { border-left-color: #ef4444; }
        /* 更新结果展示样式 */
        .status-card .result.update-summary {
            padding: clamp(14px, 2vw, 20px);
            color: var(--ui-text);
            background: var(--ui-surface);
            border: 1px solid var(--ui-border);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }
        .update-summary-heading {
            display: flex;
            align-items: center;
            gap: 11px;
            padding-bottom: 13px;
            border-bottom: 1px solid var(--ui-border);
        }
        .update-summary-indicator {
            width: 9px;
            height: 9px;
            flex: 0 0 auto;
            background: #34d399;
            border-radius: 50%;
            box-shadow: 0 0 12px rgba(52, 211, 153, 0.35);
        }
        .update-summary-heading h3 { margin: 0; color: var(--ui-text); font-size: 0.96rem; font-weight: 650; }
        .update-summary-heading p { margin: 2px 0 0; color: var(--ui-muted); font-size: 0.74rem; }
        .update-summary-duration { margin-left: auto; color: var(--ui-subtle); font-family: ui-monospace, monospace; font-size: 0.72rem; white-space: nowrap; }
        .update-summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));
            gap: 8px;
            margin: 13px 0;
        }
        .update-summary-metric {
            min-width: 0;
            padding: 10px 11px;
            background: var(--ui-surface-muted);
            border: 1px solid var(--ui-border);
            border-radius: 8px;
        }
        .update-summary-metric span { display: block; color: var(--ui-muted); font-size: 0.7rem; }
        .update-summary-metric strong { display: block; margin-top: 3px; color: var(--ui-text); font-size: 1rem; font-variant-numeric: tabular-nums; }
        .update-summary-metric.is-success strong { color: #6ee7b7; }
        .update-summary-metric.is-warning strong { color: #fbbf24; }
        .update-summary-metric.is-error strong { color: #fca5a5; }
        :root[data-theme="light"] .update-summary-metric.is-success strong { color: #087451; }
        :root[data-theme="light"] .update-summary-metric.is-warning strong { color: #92400e; }
        :root[data-theme="light"] .update-summary-metric.is-error strong { color: #b91c1c; }
        @media (prefers-color-scheme: light) {
            :root:not([data-theme]) .update-summary-metric.is-success strong { color: #087451; }
            :root:not([data-theme]) .update-summary-metric.is-warning strong { color: #92400e; }
            :root:not([data-theme]) .update-summary-metric.is-error strong { color: #b91c1c; }
        }
        .update-summary-section { margin-top: 13px; padding-top: 12px; border-top: 1px solid var(--ui-border); }
        .update-summary-section h4 { margin: 0 0 8px; color: var(--ui-muted); font-size: 0.72rem; font-weight: 600; }
        .update-summary-note { margin: 12px 0 0; color: var(--ui-muted); font-size: 0.74rem; line-height: 1.55; }
        .update-summary-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 12px; padding-top: 10px; color: var(--ui-subtle); border-top: 1px solid var(--ui-border); font-size: 0.68rem; }
        .update-summary-meta code { color: var(--ui-muted); font-family: ui-monospace, monospace; }
        @media (max-width: 480px) {
            .update-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
            .update-summary-metric { padding: 9px; }
            .update-summary-duration { font-size: 0.64rem; }
        }
        .footer { text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid var(--border-primary); color: var(--text-secondary); transition: border-color 0.3s ease, color 0.3s ease; }
        .footer-logo { width: 16px; height: 16px; vertical-align: middle; margin-right: 2px; transform: translateY(-2px); }
        .admin-overlay { ${showSetPassword || showLogin ? "display: flex;" : "display: none;"} position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg-overlay); backdrop-filter: blur(5px); z-index: 9999; justify-content: center; align-items: center; transition: background 0.3s ease; }
        .content-overlay { ${!showAdminButton && (showSetPassword || showLogin) ? "display: block;" : "display: none;"} position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg-content-overlay); backdrop-filter: blur(12px); z-index: 1; pointer-events: none; transition: background 0.3s ease; }
        .container { ${!showAdminButton && (showSetPassword || showLogin) ? "filter: blur(8px); pointer-events: none; user-select: none;" : ""} transition: filter 0.3s ease; }
        .admin-modal { background: var(--bg-admin-modal); padding: 40px; border-radius: 16px; max-width: 400px; width: 90%; text-align: center; border: 1px solid var(--border-primary); box-shadow: var(--shadow-md); transition: background 0.3s ease, border-color 0.3s ease; }
        .admin-modal h3 { margin-bottom: 20px; color: var(--text-heading); transition: color 0.3s ease; }
        .admin-modal input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-input); background: var(--bg-secondary); color: var(--text-primary); margin-bottom: 16px; font-size: 1rem; transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease; }
        .admin-modal button { padding: 12px 24px; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin: 0 8px; }
        .admin-modal .btn-primary { background: #3b82f6; color: white; }
        .admin-modal .btn-secondary { background: var(--btn-secondary-bg); color: var(--btn-secondary-text); border: 1px solid var(--btn-secondary-border); transition: background 0.3s ease, color 0.3s ease; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg-overlay); backdrop-filter: blur(5px); z-index: 1000; justify-content: center; align-items: center; transition: background 0.3s ease; }
        .modal-content { max-height: 90vh; overflow-y: auto; background: var(--bg-modal); padding: 30px; border-radius: 16px; max-width: 500px; width: 90%; border: 1px solid var(--border-primary); box-shadow: var(--shadow-md); transition: background 0.3s ease, border-color 0.3s ease; }
        .modal h3 { margin-bottom: 16px; color: var(--text-heading); transition: color 0.3s ease; }
        .modal-buttons { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
        /* 主题切换按钮样式 */
        .theme-toggle { cursor: pointer; background: var(--theme-toggle-bg); }
        .theme-toggle:hover { background: var(--bg-hover); }
        .theme-toggle #theme-icon { font-size: 1.2rem; display: inline; }
        /* 主题下拉菜单样式 */
        .theme-dropdown { display: none; position: absolute; right: 60px; top: 60px; background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: 10px; box-shadow: var(--shadow-lg); z-index: 100; min-width: 140px; overflow: hidden; }
        .theme-dropdown.show { display: block; }
        .theme-dropdown button { width: 100%; padding: 10px 16px; border: none; background: transparent; color: var(--text-primary); text-align: left; cursor: pointer; font-size: 0.9rem; transition: background 0.2s ease; }
        .theme-dropdown button:hover { background: var(--bg-hover); }
        .theme-dropdown button.active { background: var(--bg-hover); font-weight: 600; }
        @media (max-width: 768px) {
            .header { flex-direction: column; gap: 20px; text-align: center; }
            .header-content h1 { font-size: 2rem; }
            .button-group { flex-direction: column; }
            .button { width: 100%; justify-content: center; }
            .ip-item { flex-direction: column; align-items: flex-start; gap: 12px; }
            .ip-info { width: 100%; justify-content: space-between; }
            .action-buttons { width: 100%; justify-content: flex-end; }
            .modal-buttons { flex-direction: column; }
            .admin-dropdown { min-width: 121px; }
            .admin-modal { padding: 20px; }
            #ip-limit-input { width: min(100%, 220px) !important; min-width: 0 !important; max-width: 100% !important; flex: 1; }
            .footer-logo { width: 16px; height: 16px; }
        }
        /* Frost dashboard visual system */
        :root:not([data-theme="light"]) {
            color-scheme: dark;
            --bg-primary: #0c0d0f;
            --bg-secondary: #141518;
            --bg-card: #141518;
            --bg-hover: #1c1e22;
            --bg-stat: #141518;
            --bg-ip-list: #101114;
            --bg-source: #141518;
            --bg-modal: #141518;
            --bg-admin-modal: #141518;
            --bg-admin-dropdown: #141518;
            --bg-overlay: rgba(0,0,0,0.82);
            --bg-content-overlay: rgba(0,0,0,0.35);
            --text-primary: #f3f4f6;
            --text-secondary: #9aa0a8;
            --text-heading: #d7dde6;
            --text-heading-h2: #f3f4f6;
            --border-primary: #2a2d33;
            --border-secondary: #3a3d43;
            --border-input: #3a3d43;
            --input-bg: #101114;
            --input-text: #f3f4f6;
            --shadow-sm: 0 1px 2px rgba(0,0,0,0.18);
            --shadow-md: 0 8px 24px rgba(0,0,0,0.12);
            --shadow-lg: 0 16px 40px rgba(0,0,0,0.28);
            --shadow-button: 0 4px 12px rgba(0,0,0,0.2);
            --btn-secondary-bg: transparent;
            --btn-secondary-text: #f3f4f6;
            --btn-secondary-border: #2a2d33;
            --btn-secondary-hover: #1c1e22;
            --spinner-bg: #2a2d33;
            --success-bg: rgba(143,191,168,0.1);
            --success-text: #a7cfb9;
            --success-border: #557a66;
            --error-bg: rgba(211,154,150,0.1);
            --error-text: #e2aaa5;
            --error-border: #8d5c59;
            --speed-fast-bg: rgba(143,191,168,0.14);
            --speed-fast-text: #a7cfb9;
            --speed-medium-bg: rgba(212,180,131,0.14);
            --speed-medium-text: #dfc395;
            --speed-slow-bg: rgba(211,154,150,0.14);
            --speed-slow-text: #e2aaa5;
            --bandwidth-fast-bg: rgba(34,211,238,0.14);
            --bandwidth-fast-text: #67e8f9;
            --theme-toggle-bg: #141518;
            --progress-bg: #25272c;
            --admin-btn-bg: #d7dde6;
            --admin-btn-text: #121316;
            --admin-dropdown-btn-bg: #6b4442;
            --header-gradient: none;
            --result-info-bg: #202329;
            --result-success-bg: #1b2922;
            --result-warning-bg: #30291e;
            --result-error-bg: #30201f;
            --result-primary-bg: #1d2931;
            --result-secondary-bg: #29232f;
        }
        :root[data-theme="light"] {
            color-scheme: light;
            --bg-primary: #f3f4f5;
            --bg-secondary: #ffffff;
            --bg-card: #ffffff;
            --bg-hover: #f1f2f4;
            --bg-stat: #f7f8f9;
            --bg-ip-list: #f7f8f9;
            --bg-source: #f7f8f9;
            --bg-modal: #ffffff;
            --bg-admin-modal: #ffffff;
            --bg-admin-dropdown: #ffffff;
            --bg-overlay: rgba(18,19,22,0.55);
            --bg-content-overlay: rgba(18,19,22,0.12);
            --text-primary: #24262a;
            --text-secondary: #626871;
            --text-heading: #24262a;
            --text-heading-h2: #24262a;
            --border-primary: #e1e3e6;
            --border-secondary: #c9cdd2;
            --border-input: #c9cdd2;
            --input-bg: #ffffff;
            --input-text: #24262a;
            --shadow-sm: 0 1px 2px rgba(20,21,24,0.04);
            --shadow-md: 0 8px 24px rgba(20,21,24,0.05);
            --shadow-lg: 0 16px 40px rgba(20,21,24,0.14);
            --shadow-button: 0 4px 12px rgba(20,21,24,0.08);
            --btn-secondary-bg: transparent;
            --btn-secondary-text: #24262a;
            --btn-secondary-border: #d7d9dd;
            --btn-secondary-hover: #f1f2f4;
            --spinner-bg: #e1e3e6;
            --success-bg: #eef5f0;
            --success-text: #44634f;
            --success-border: #8fbfa8;
            --error-bg: #f8efee;
            --error-text: #754d4a;
            --error-border: #d39a96;
            --speed-fast-bg: #eaf3ed;
            --speed-fast-text: #44634f;
            --speed-medium-bg: #f5f0e7;
            --speed-medium-text: #755f39;
            --speed-slow-bg: #f8efee;
            --speed-slow-text: #754d4a;
            --bandwidth-fast-bg: #cffafe;
            --bandwidth-fast-text: #0e7490;
            --theme-toggle-bg: #ffffff;
            --progress-bg: #e1e3e6;
            --admin-btn-bg: #24262a;
            --admin-btn-text: #ffffff;
            --admin-dropdown-btn-bg: #754d4a;
            --header-gradient: none;
            --result-info-bg: #eef1f4;
            --result-success-bg: #eef5f0;
            --result-warning-bg: #f5f0e7;
            --result-error-bg: #f8efee;
            --result-primary-bg: #edf2f5;
            --result-secondary-bg: #f1eef4;
        }
        body {
            font-family: "IBM Plex Sans", "WenQuanYi Zen Hei", "Noto Sans CJK SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            line-height: 1.5;
            padding: 28px 20px;
        }
        .container { max-width: 1120px; }
        .header {
            align-items: flex-end;
            margin-bottom: 24px;
            padding-bottom: 24px;
            border-bottom-color: var(--border-primary);
        }
        .header-content { max-width: 720px; }
        .brand-kicker { color: var(--text-secondary); font-size: 0.5rem; letter-spacing: 0.18em; }
        .header-content h1 {
            font-size: clamp(1.8rem, 3.2vw, 2.45rem);
            color: var(--text-primary);
            background: none;
            -webkit-text-fill-color: currentColor;
            letter-spacing: -0.035em;
            animation: none !important;
        }
        .header-content h1 span { animation: none !important; }
        .header-content p { max-width: 68ch; font-size: 0.95rem; line-height: 1.7; }
        .card {
            padding: 22px;
            margin-bottom: 16px;
            border-radius: 16px;
            border-color: var(--border-primary);
            box-shadow: none;
        }
        .card h2 { font-size: 1.05rem; letter-spacing: -0.01em; margin-bottom: 16px; }
        .stats { gap: 10px; margin-bottom: 20px; }
        .stat { padding: 16px; border-radius: 12px; text-align: left; }
        .stat-value { font-size: 1.65rem; letter-spacing: -0.035em; font-variant-numeric: tabular-nums; }
        .stat-value.recent, .stat-value.total, .stat-value.time { color: var(--text-primary); }
        .button-group { gap: 8px; }
        .button, .small-btn, .admin-button, .admin-modal button {
            min-height: 40px;
            border-radius: 8px;
            font-weight: 500;
            box-shadow: none;
        }
        .button {
            padding: 9px 14px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-primary);
            font-size: 0.875rem;
        }
        .button:hover { background: var(--bg-hover); border-color: var(--border-secondary); box-shadow: none; transform: none; }
        .button-success, .button-warning { background: var(--bg-secondary); color: var(--text-primary); border-color: var(--border-primary); }
        .button-success:hover, .button-warning:hover { background: var(--bg-hover); border-color: var(--border-secondary); }
        .speedtest-presets { display: flex; flex-wrap: wrap; gap: 4px; }
        .speedtest-count-indicator { display: inline-flex; align-items: center; min-height: 28px; padding: 4px 9px; border: 1px solid var(--border-primary); border-radius: 999px; color: var(--text-secondary); background: var(--bg-card); font-size: 0.65rem; white-space: nowrap; }
        .speedtest-preset-btn {
            background: #d7dde6;
            color: #121316;
            border-color: #d7dde6;
            font-weight: 600;
        }
        .speedtest-preset-btn:hover { background: #eef1f5; border-color: #eef1f5; }
        :root[data-theme="light"] .speedtest-preset-btn { background: #24262a; color: #ffffff; border-color: #24262a; }
        :root[data-theme="light"] .speedtest-preset-btn:hover { background: #3a3d43; border-color: #3a3d43; }
        .button-secondary { background: transparent; }
        .ip-list-header, .sources-header { gap: 10px; margin-bottom: 14px; }
        .ip-list {
            padding: 8px 14px;
            border-radius: 12px;
            background: var(--bg-ip-list);
            max-height: 560px;
        }
        .ip-item { gap: 14px; padding: 13px 10px; border-bottom-color: var(--border-primary); }
        .ip-info { gap: 10px; min-width: 0; }
        .ip-address { min-width: 0; font-size: 0.875rem; }
        .speed-result { border-radius: 7px; padding: 5px 9px; font-size: 0.78rem; min-width: 68px; font-variant-numeric: tabular-nums; }
        .action-buttons { gap: 6px; flex-shrink: 0; }
        .small-btn { padding: 7px 11px; background: transparent; color: var(--text-primary); border-color: var(--border-primary); }
        .small-btn:hover { background: var(--bg-hover); border-color: var(--border-secondary); }
        #speedtest-count, #ip-limit-input, input[type="number"], input[type="text"], textarea {
            border-radius: 8px !important;
            border-color: var(--border-input) !important;
            background: var(--input-bg) !important;
            color: var(--input-text) !important;
        }
        #speedtest-estimate { color: var(--text-secondary) !important; }
        .source {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 8px 12px;
            min-width: 0;
            border: 1px solid var(--border-primary);
            border-left: 2px solid #8fbfa8;
            border-radius: 9px;
        }
        .source.error { border-left-color: #d39a96; }
        .source-name { min-width: 0; overflow-wrap: anywhere; }
        .source-status { display: inline-flex; align-items: center; justify-content: center; justify-self: start; max-width: 100%; width: fit-content; padding: 3px 8px; border-radius: 999px; font-size: 0.68rem; font-weight: 600; white-space: nowrap; }
        .source-status.success { color: #166534; background: #dcfce7; }
        .source-status.error { color: #991b1b; background: #fee2e2; }
        .source-status.pending { color: var(--text-secondary); background: var(--bg-hover); }
        .admin-button { padding: 9px 14px; }
        .admin-dropdown { border-radius: 8px; margin-top: 0; }
        .admin-dropdown button { min-height: 40px; border-radius: 0; }
        .modal-content, .admin-modal { border-radius: 14px; box-shadow: var(--shadow-lg); }
        .footer { margin-top: 28px; padding-top: 20px; font-size: 0.85rem; }
        :focus-visible { outline: 2px solid var(--text-secondary); outline-offset: 3px; }
        @media (max-width: 768px) {
            body { padding: 16px 12px; }
            .header { align-items: center; margin-bottom: 16px; padding-bottom: 18px; }
            .header-content p { font-size: 0.875rem; }
            .card { padding: 16px; border-radius: 13px; }
            .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .stat { padding: 13px; }
            .stat-value { font-size: 1.4rem; }
            .button-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .button { width: 100%; justify-content: center; padding: 9px 10px; }
            #speedtest-count, #ip-limit-input { width: 100% !important; min-width: 0 !important; max-width: none !important; }
            #speedtest-estimate { grid-column: 1 / -1; text-align: center; }
            .ip-list { padding: 6px 10px; }
            .ip-item { align-items: flex-start; }
            .ip-info { flex-wrap: wrap; justify-content: flex-start; }
            .ip-address { width: 100%; }
            .action-buttons { width: 100%; justify-content: flex-end; }
            .ip-list-header { align-items: flex-start; }
        }
        @media (max-width: 420px) {
            .button-group { grid-template-columns: 1fr; }
            .ip-list-header { flex-direction: column; }
            .ip-list-header > div { display: flex; flex-wrap: wrap; gap: 6px; }
            .ip-list-header .small-btn { text-decoration: none; }
        }
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        /* Compact six-region dashboard layout */
        .container { max-width: 840px; }
        .header {
            align-items: flex-start;
            margin-bottom: 14px;
            padding-bottom: 16px;
        }
        .header-content h1 { font-size: 1.65rem; }
        .header-content p { font-size: 0.72rem; line-height: 1.5; color: var(--text-secondary); }
        .admin-button { min-width: 0; max-width: none; top: 0; transform: none; font-size: 0.72rem; padding: 6px 9px; }
        .admin-dropdown { top: 34px; min-width: 100px; max-width: none; }
        .status-card { padding: 12px; margin-bottom: 8px; }
        .status-card > h2 { display: none; }
        .stats { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 0; }
        .stat { min-width: 0; padding: 9px 10px; border-radius: 10px; }
        .stat-value { font-size: 0.95rem; line-height: 1.35; margin-bottom: 2px; }
        .stat > div:last-child, .stat small { font-size: 0.62rem; color: var(--text-secondary); }
        .stat-value.recent, .stat-value.total, .stat-value.quality, .stat-value.time { color: var(--text-primary); }
        .status-card .button-group { gap: 5px; margin: 10px 0 0; }
        .status-card .button { min-height: 30px; padding: 5px 8px; font-size: 0.68rem; }
        .status-card #speedtest-count { width: 88px !important; min-width: 0; padding: 5px 7px !important; font-size: 0.7rem !important; }
        .status-card #speedtest-estimate { align-self: center; font-size: 0.62rem !important; }
        .status-card #ip-limit-input { width: 86px !important; min-width: 0 !important; padding: 5px 7px !important; font-size: 0.7rem !important; }
        .status-card .loading { padding: 10px; font-size: 0.75rem; }
        .status-card .result { margin: 8px 0 0; padding: 9px 12px; font-size: 0.75rem; }
        .dashboard-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 8px; }
        .info-card { min-width: 0; padding: 13px; margin: 0; border-radius: 12px; }
        .info-card h2 { font-size: 0.72rem; margin-bottom: 5px; }
        .info-value { display: block; margin: 3px 0; font-size: 1.15rem; line-height: 1.35; font-weight: 500; letter-spacing: -0.02em; }
        .info-card > p, .info-card > small { display: block; color: var(--text-secondary); font-size: 0.62rem; line-height: 1.5; }
        .cron-card code { display: block; margin: 2px 0 5px; font-size: 0.65rem; color: var(--text-secondary); }
        .info-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 10px; margin-top: 8px; font-size: 0.6rem; color: var(--text-secondary); }
        .info-details span { display: flex; justify-content: space-between; gap: 4px; }
        .info-details b { color: var(--text-primary); font-weight: 500; text-align: right; }
        .traffic-presets { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
        .traffic-presets .small-btn { min-height: 23px; padding: 3px 7px; border-radius: 999px; font-size: 0.58rem; }
        .country-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; margin: 0 0 8px; }
        .country-card.active {
            border-color: var(--text-primary);
            box-shadow: inset 0 0 0 1px var(--text-primary);
        }
        .country-card {
            display: flex;
            min-width: 0;
            flex-direction: column;
            align-items: flex-start;
            gap: 3px;
            padding: 8px;
            color: var(--text-primary);
            text-align: left;
            background: var(--bg-card);
            border: 1px solid var(--border-primary);
            border-radius: 10px;
            cursor: pointer;
        }
        .country-card:hover { background: var(--bg-hover); border-color: var(--border-secondary); }
        .country-card > span { color: var(--text-secondary); font-size: 0.55rem; }
        .country-card > strong { font-size: 0.72rem; font-weight: 500; }
        .country-card > small { color: var(--text-secondary); font-size: 0.55rem; white-space: nowrap; }
        .country-card b { color: var(--text-primary); font-weight: 500; }
        .list-tabs { display: flex; gap: 4px; margin: 0 0 6px; }
        .list-tab {
            min-height: 26px;
            padding: 4px 10px;
            color: var(--text-secondary);
            background: transparent;
            border: 1px solid transparent;
            border-radius: 999px;
            font-size: 0.62rem;
            cursor: pointer;
        }
        .list-tab.active { color: var(--bg-primary); background: var(--text-primary); font-weight: 600; }
        .list-tab span { margin-left: 3px; font-family: ui-monospace, monospace; opacity: 0.75; }
        .list-view-card { padding: 12px; margin-bottom: 8px; border-radius: 12px; }
        .list-view-card[hidden] { display: none !important; }
        .list-view-card .card h2, .list-view-card h2 { font-size: 0.78rem; margin-bottom: 0; }
        .list-view-card .ip-list-header { margin-bottom: 6px; }
        .list-view-card .small-btn { min-height: 26px; padding: 4px 7px; font-size: 0.58rem; }
        .list-view-card .ip-list-header a.small-btn,
        .list-view-card .ip-list-header a.small-btn:hover,
        .list-view-card .ip-list-header a.small-btn:focus-visible { text-decoration: none; }
        .list-view-card .ip-list { max-height: 510px; padding: 2px 8px; border-radius: 9px; }
        .list-view-card .ip-item { min-height: 66px; gap: 12px; padding: 9px 5px; }
        .list-view-card .ip-info { display: grid; grid-template-columns: minmax(0, 1fr) 84px 100px; flex: 1; min-width: 0; gap: 4px 10px; }
        .list-view-card .ip-main-info { display: flex; min-width: 0; flex-direction: column; justify-content: center; gap: 4px; }
        .list-view-card .ip-address { display: flex; min-width: 0; align-items: center; flex-wrap: wrap; gap: 7px; font-size: 0.78rem; line-height: 1.35; cursor: pointer; }
        .list-view-card button.ip-address { padding: 0; color: var(--text-primary); text-align: left; background: transparent; border: 0; font-family: inherit; font-weight: 600; }
        .list-view-card .ip-address:hover { color: var(--text-secondary); }
        .list-view-card .ip-location { overflow: hidden; color: var(--text-secondary); font-size: 0.7rem; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
        .list-view-card .ip-type-badge { padding: 2px 7px; color: var(--text-secondary); border: 1px solid var(--border-primary); border-radius: 999px; font-family: inherit; font-size: 0.68rem; font-weight: 400; }
        .list-view-card .ip-country-badge { color: var(--text-secondary); font-family: inherit; font-size: 0.72rem; font-weight: 400; }
        .list-view-card .speed-result { display: flex; min-width: 0; flex-direction: column; align-items: center; justify-content: center; gap: 3px; align-self: center; min-height: 52px; padding: 7px 10px; background: var(--ui-surface-raised, var(--bg-secondary)); color: var(--text-primary); border: 1px solid var(--ui-border, var(--border-primary)); border-radius: 10px; font-family: ui-monospace, monospace; font-size: 0.72rem; font-weight: 600; line-height: 1.2; box-shadow: none; }
        .list-view-card .speed-result.speed-fast { background: var(--ui-surface-raised, var(--bg-secondary)); color: var(--speed-fast-text); }
        .list-view-card .speed-result.speed-medium { background: var(--ui-surface-raised, var(--bg-secondary)); color: var(--speed-medium-text); }
        .list-view-card .speed-result.speed-slow { background: var(--ui-surface-raised, var(--bg-secondary)); color: var(--speed-slow-text); }
        .list-view-card .speed-result.bandwidth-fast { background: var(--ui-surface-raised, var(--bg-secondary)); color: var(--bandwidth-fast-text); }
        .list-view-card .speed-result.bandwidth-medium { background: var(--ui-surface-raised, var(--bg-secondary)); color: var(--speed-medium-text); }
        .list-view-card .speed-result.bandwidth-slow { background: var(--ui-surface-raised, var(--bg-secondary)); color: var(--speed-slow-text); }
        .list-view-card .ip-info > .speed-result:not(.bandwidth-result)::before,
        .list-view-card .ip-info > .bandwidth-result::before { color: var(--ui-muted); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif; font-size: 0.58rem; font-weight: 500; line-height: 1; }
        .list-view-card .ip-info > .speed-result:not(.bandwidth-result)::before { content: "延迟"; }
        .list-view-card .ip-info > .bandwidth-result::before { content: "带宽"; }
        .list-view-card .action-buttons { gap: 6px; }
        .list-view-card .action-buttons .small-btn { min-height: 36px; padding: 5px 10px; font-size: 0.68rem; border-radius: 10px; font-weight: 600; white-space: nowrap; }
        .list-view-card .row-select-btn[aria-pressed="true"] { color: var(--speed-fast-text); background: var(--speed-fast-bg); border-color: transparent; }
        .list-view-card .ip-item.is-selected { background: var(--bg-hover); }
        #speed-test-status { font-size: 0.62rem !important; margin: 5px 0 !important; }
        .list-view-card > div[style*="text-align: center"] { font-size: 0.6rem !important; line-height: 1.4; }
        .sources-header { justify-content: flex-start; }
        .sources-header h2 { margin-right: auto; }
        .source { padding: 7px 9px; font-size: 0.63rem; }
        .sources { gap: 4px; }
        .footer { margin-top: 10px; padding-top: 10px; font-size: 0.58rem; }
        @media (max-width: 600px) {
            body { padding: 12px 10px; }
            .container { max-width: 100%; }
            .header { flex-direction: row; align-items: flex-start; gap: 8px; text-align: left; }
            .source { grid-template-columns: minmax(0, 1fr); gap: 5px; }
            .source-status { white-space: normal; }
            .header-content { flex: 1; min-width: 0; }
            .header-content h1 { font-size: 1.2rem; }
            .header-content p { font-size: 0.62rem; }
            .admin-button { position: static; transform: none; min-height: 27px; }
            .admin-panel { position: absolute; top: 36px; right: 0; }
            .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .dashboard-info-grid { grid-template-columns: 1fr; }
            .country-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .status-card .button-group { display: flex; }
            .status-card .button { width: auto; }
            .status-card #speedtest-estimate { width: 100%; text-align: left !important; }
            .list-view-card .ip-item { align-items: center; flex-direction: row; }
            .list-view-card .ip-info { flex: 1; min-width: 0; grid-template-columns: minmax(0, 1fr) 54px 72px; gap: 4px 6px; }
            .list-view-card .ip-main-info { grid-column: 1; }
            .list-view-card .ip-address { width: auto; gap: 4px; font-size: 0.68rem; }
            .list-view-card .ip-location { font-size: 0.62rem; }
            .list-view-card .ip-country-badge { font-size: 0.64rem; }
            .list-view-card .speed-result { padding: 6px 3px; font-size: 0.62rem; }
            .list-view-card .ip-info > .speed-result:not(.bandwidth-result)::before,
            .list-view-card .ip-info > .bandwidth-result::before { font-size: 0.52rem; }
            .list-view-card .action-buttons { width: auto; gap: 5px; }
            .list-view-card .action-buttons .small-btn { min-height: 32px; padding: 4px 8px; font-size: 0.62rem; }
        }
        @media (max-width: 360px) {
            .header-content h1 { font-size: 1rem; }
            .country-card { padding: 6px; }
            .list-view-card .ip-info { grid-template-columns: minmax(0, 1fr) 48px 64px; }
            .list-view-card .action-buttons .small-btn { min-height: 29px; padding: 4px 6px; font-size: 0.58rem; }
        }
        .header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: start;
            gap: 18px;
        }
        .header-toolbar { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; }
        .header-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
        .header-actions .button { min-height: 32px; padding: 5px 9px; font-size: 0.68rem; white-space: nowrap; }
        .header-tools { display: flex; align-items: center; gap: 6px; }
        .settings-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
        .settings-option-btn {
            display: flex;
            min-width: 0;
            min-height: 48px;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            gap: 3px;
            padding: 7px 9px;
            color: var(--text-primary);
            text-align: left;
            background: var(--bg-card);
            border: 1px solid var(--border-primary);
            border-radius: 8px;
            cursor: pointer;
        }
        .settings-option-btn:hover { background: var(--bg-hover); border-color: var(--border-secondary); }
        .settings-option-btn strong { font-size: 0.68rem; font-weight: 600; }
        .settings-option-btn small { color: var(--text-secondary); font-size: 0.58rem; line-height: 1.3; }
        .settings-option-btn[role="switch"][aria-checked="true"] small {
            color: #16a34a;
        }
        .settings-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .settings-row label { color: var(--text-secondary); font-size: 0.68rem; }
        .settings-row input { width: 90px; min-height: 30px; padding: 4px 7px; border: 1px solid var(--border-input); border-radius: 7px; background: var(--input-bg); color: var(--input-text); }
        .cron-field-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
        .settings-row #scheduled-timezone { min-height: 30px; padding: 4px 7px; border: 1px solid var(--border-input); border-radius: 7px; background: var(--input-bg); color: var(--input-text); }
        .settings-row #ip-limit-input, .settings-row #speedtest-count { width: 90px !important; min-width: 0 !important; max-width: 90px !important; }
        .settings-row .small-btn { min-height: 29px; padding: 4px 8px; }
        .country-settings-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 5px; max-height: 220px; overflow-x: hidden; overflow-y: auto; margin: 8px 0; }
        .country-option { display: grid; grid-template-columns: minmax(0, 1fr) 58px 58px; align-items: center; gap: 4px; min-width: 0; color: var(--text-secondary); font-size: 0.65rem; }
        .country-option label { display: flex; align-items: center; gap: 5px; min-width: 0; cursor: pointer; }
        .country-option-keywords { color: var(--text-secondary); font-size: 0.58rem; }
        .country-option input[type="checkbox"] { width: 14px; min-height: 14px; margin: 0; accent-color: var(--text-primary); }
        .country-option .quality-country-limit { width: 58px; min-height: 26px; padding: 3px 4px; font-size: 0.62rem; }
        .quality-country-limit-label { display: block; overflow: hidden; color: var(--text-secondary); font-size: 0.52rem; text-align: center; text-overflow: ellipsis; }
        #speedtest-estimate, #speedtest-count-status { color: var(--text-secondary); font-size: 0.62rem; }
        .selected-ip-label { max-width: 180px; overflow: hidden; color: var(--text-secondary); font-size: 0.62rem; text-overflow: ellipsis; white-space: nowrap; }
        .selected-ip-label[hidden] { display: none; }
        .theme-toggle { cursor: pointer; }
        .admin-panel { position: relative; }
        .admin-button { position: static; min-height: 32px; padding: 5px 9px; transform: none; font-size: 0.68rem; }
        .admin-dropdown { top: 100%; right: 0; margin-top: 4px; }
        .status-card { padding: 12px; }
        .status-heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
        .status-heading h2 { margin: 0; font-size: 0.9rem; }
        .status-card .button-group { gap: 5px; margin: 8px 0 0; }
        .status-card .button { min-height: 30px; padding: 5px 8px; font-size: 0.68rem; }
        .ip-item.is-selected { background: var(--bg-hover); outline: 1px solid var(--border-secondary); outline-offset: -1px; }
        .ip-item .ip-address.is-selected { color: var(--text-secondary); text-decoration: underline; text-decoration-color: var(--border-secondary); text-underline-offset: 3px; }
        @media (max-width: 768px) {
            .header { grid-template-columns: minmax(0, 1fr) minmax(0, auto); align-items: center; gap: 12px; text-align: left; }
            .header-content { min-width: 0; text-align: left; }
            .header-toolbar { width: 100%; max-width: 430px; min-width: 0; align-items: flex-end; }
            .header-actions { justify-content: flex-end; }
            .header-actions .button { width: auto; flex: 0 1 auto; }
            .speedtest-presets { width: 100%; justify-content: flex-end; }
            .speedtest-presets .speedtest-preset-btn { width: auto; flex: 0 1 auto; }
            .header-tools { justify-content: flex-end; }
            .list-view-card .ip-item { align-items: center; flex-direction: row; }
            .list-view-card .action-buttons { width: auto; }
        }
        @media (max-width: 600px) {
            .header { grid-template-columns: minmax(0, 1fr); gap: 10px; }
            .header-toolbar { align-items: stretch; }
            .header-actions { justify-content: flex-start; }
            .header-actions .button { width: auto; flex: 1 1 calc(50% - 5px); }
            .header-actions .button { flex: 1 1 0; min-width: 0; justify-content: center; padding-right: 5px; padding-left: 5px; }
            .speedtest-presets { flex: 1 1 100%; }
            .speedtest-presets .speedtest-preset-btn { flex: 1 1 calc(33% - 4px); }
            .header-tools { justify-content: flex-end; }
            .dashboard-info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .admin-panel { position: relative; top: auto; right: auto; }
            .status-heading { align-items: flex-start; }
            .status-card .button-group { display: flex; }
            .status-card .button { width: auto; }
        }
        @media (max-width: 480px) {
            .dashboard-info-grid { grid-template-columns: minmax(0, 1fr); }
            .list-view-card .ip-item { align-items: stretch; flex-direction: column; gap: 7px; }
            .list-view-card .ip-info { width: 100%; }
            .list-view-card .action-buttons { width: 100%; justify-content: flex-end; }
        }
        @media (max-width: 480px) {
            .header-actions .button { font-size: 0.62rem; padding: 5px 6px; }
            .country-settings-grid { grid-template-columns: minmax(0, 1fr); }
        }
        /* Consistent dashboard layer; keeps the existing markup and handlers intact. */
        :root {
            color-scheme: dark;
            --ui-bg: #0a0e17;
            --ui-surface: rgba(15, 23, 42, 0.88);
            --ui-surface-raised: #111c2f;
            --ui-surface-muted: #0d1626;
            --ui-border: rgba(148, 163, 184, 0.16);
            --ui-border-strong: rgba(148, 163, 184, 0.28);
            --ui-scrollbar-thumb: rgba(148, 163, 184, 0.3);
            --ui-scrollbar-thumb-hover: rgba(148, 163, 184, 0.52);
            --ui-selection-glow: rgba(34, 211, 238, 0.16);
            --ui-text: #e6edf7;
            --ui-muted: #9aa9bd;
            --ui-subtle: #718198;
            --ui-blue: #60a5fa;
            --ui-cyan: #22d3ee;
            --ui-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
            --ui-space-1: 6px;
            --ui-space-2: 10px;
            --ui-space-3: 16px;
            --ui-space-4: 24px;
            --ui-space-5: 32px;
            --ui-radius-sm: 6px;
            --ui-radius-md: 8px;
            --ui-radius-lg: 10px;
            --ui-button-bg: linear-gradient(180deg, #122b43 0%, #0e1c2e 100%);
            --ui-button-border: #356989;
            --ui-button-text: #c4e7fb;
            --ui-button-hover: #153651;
            --ui-button-hover-border: #49b3d9;
            --ui-button-primary-top: #168bc5;
            --ui-button-primary-bottom: #087f9f;
            --ui-button-primary-hover: #1398c4;
            --ui-button-primary-text: #f4fbff;
            --ui-button-success-bg: rgba(16, 185, 129, 0.13);
            --ui-button-success-border: rgba(52, 211, 153, 0.38);
            --ui-button-success-text: #6ee7b7;
            --ui-button-selected-bg: rgba(34, 211, 238, 0.14);
            --ui-button-selected-border: rgba(34, 211, 238, 0.5);
            --ui-button-selected-text: #a5f3fc;
        }
        :root[data-theme="light"] {
            --ui-button-bg: linear-gradient(180deg, #ffffff 0%, #f5faff 100%);
            --ui-button-border: #94bad3;
            --ui-button-text: #155e85;
            --ui-button-hover: #edf7fd;
            --ui-button-hover-border: #368eb8;
            --ui-button-primary-top: #1687c1;
            --ui-button-primary-bottom: #087c9d;
            --ui-button-primary-hover: #087ca8;
            --ui-button-primary-text: #ffffff;
            --ui-button-success-bg: #e8f8f2;
            --ui-button-success-border: #9cddc3;
            --ui-button-success-text: #087451;
            --ui-button-selected-bg: #e4f7fb;
            --ui-button-selected-border: #76c9d8;
            --ui-button-selected-text: #12677a;
        }
        :root[data-theme="light"] {
            color-scheme: light;
            --ui-bg: #f4f7fb;
            --ui-surface: rgba(255, 255, 255, 0.94);
            --ui-surface-raised: #ffffff;
            --ui-surface-muted: #f7f9fc;
            --ui-border: rgba(30, 41, 59, 0.12);
            --ui-border-strong: rgba(30, 41, 59, 0.2);
            --ui-scrollbar-thumb: rgba(71, 85, 105, 0.26);
            --ui-scrollbar-thumb-hover: rgba(71, 85, 105, 0.44);
            --ui-selection-glow: rgba(8, 145, 178, 0.12);
            --ui-text: #172033;
            --ui-muted: #526176;
            --ui-subtle: #6b7a90;
            --ui-blue: #2563eb;
            --ui-cyan: #0891b2;
            --ui-shadow: 0 16px 38px rgba(30, 41, 59, 0.08);
        }
        @media (prefers-color-scheme: light) {
            :root:not([data-theme]) {
                color-scheme: light;
                --ui-bg: #f4f7fb;
                --ui-surface: rgba(255, 255, 255, 0.94);
                --ui-surface-raised: #ffffff;
                --ui-surface-muted: #f7f9fc;
                --ui-border: rgba(30, 41, 59, 0.12);
                --ui-border-strong: rgba(30, 41, 59, 0.2);
                --ui-scrollbar-thumb: rgba(71, 85, 105, 0.26);
                --ui-scrollbar-thumb-hover: rgba(71, 85, 105, 0.44);
                --ui-selection-glow: rgba(8, 145, 178, 0.12);
                --ui-text: #172033;
                --ui-muted: #526176;
                --ui-subtle: #6b7a90;
                --ui-blue: #2563eb;
                --ui-cyan: #0891b2;
                --ui-shadow: 0 16px 38px rgba(30, 41, 59, 0.08);
                --ui-button-bg: linear-gradient(180deg, #ffffff 0%, #f5faff 100%);
                --ui-button-border: #a8c8df;
                --ui-button-text: #155e85;
                --ui-button-hover: #edf7fd;
                --ui-button-hover-border: #4a9bc4;
                --ui-button-primary-top: #1687c1;
                --ui-button-primary-bottom: #087c9d;
                --ui-button-primary-hover: #087ca8;
                --ui-button-primary-text: #ffffff;
                --ui-button-success-bg: #e8f8f2;
                --ui-button-success-border: #9cddc3;
                --ui-button-success-text: #087451;
                --ui-button-selected-bg: #e4f7fb;
                --ui-button-selected-border: #76c9d8;
                --ui-button-selected-text: #12677a;
            }
        }
        :root, :root[data-theme="light"], :root:not([data-theme]) {
            --bg-primary: var(--ui-bg);
            --bg-secondary: var(--ui-surface-raised);
            --bg-card: var(--ui-surface);
            --bg-hover: var(--ui-surface-muted);
            --bg-stat: var(--ui-surface-muted);
            --bg-ip-list: var(--ui-surface-muted);
            --bg-source: var(--ui-surface-muted);
            --bg-modal: var(--ui-surface-raised);
            --bg-admin-modal: var(--ui-surface-raised);
            --bg-admin-dropdown: var(--ui-surface-raised);
            --bg-overlay: rgba(2, 6, 23, 0.76);
            --bg-content-overlay: rgba(2, 6, 23, 0.35);
            --text-primary: var(--ui-text);
            --text-secondary: var(--ui-muted);
            --text-heading: var(--ui-blue);
            --text-heading-h2: var(--ui-text);
            --border-primary: var(--ui-border);
            --border-secondary: var(--ui-border-strong);
            --border-input: var(--ui-border-strong);
            --input-bg: var(--ui-surface-muted);
            --input-text: var(--ui-text);
            --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.12);
            --shadow-md: 0 12px 30px rgba(0, 0, 0, 0.16);
            --shadow-lg: var(--ui-shadow);
            --shadow-button: 0 5px 14px rgba(37, 99, 235, 0.18);
            --btn-secondary-bg: var(--ui-surface-raised);
            --btn-secondary-text: var(--ui-text);
            --btn-secondary-border: var(--ui-border-strong);
            --btn-secondary-hover: var(--ui-surface-muted);
            --spinner-bg: var(--ui-border-strong);
            --theme-toggle-bg: var(--ui-surface-raised);
            --progress-bg: var(--ui-border);
        }
        html { background: var(--ui-bg); }
        * {
            scrollbar-color: var(--ui-scrollbar-thumb) transparent;
            scrollbar-width: thin;
        }
        *::-webkit-scrollbar { width: 8px; height: 8px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb {
            background: var(--ui-scrollbar-thumb);
            background-clip: padding-box;
            border: 2px solid transparent;
            border-radius: 999px;
        }
        *::-webkit-scrollbar-thumb:hover { background: var(--ui-scrollbar-thumb-hover); background-clip: padding-box; }
        body {
            min-width: 320px;
            padding: clamp(12px, 2vw, 28px);
            color: var(--ui-text);
            background: var(--ui-bg);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
            line-height: 1.55;
        }
        .dashboard-shell {
            display: grid;
            grid-template-columns: 208px minmax(0, 1fr);
            align-items: start;
            gap: var(--ui-space-5);
            width: min(100%, 1480px);
            margin: 0 auto;
        }
        .dashboard-sidebar {
            position: sticky;
            top: 16px;
            display: flex;
            min-width: 0;
            height: calc(100vh - 32px);
            flex-direction: column;
            padding: 8px 12px 12px 0;
            border-right: 1px solid var(--ui-border);
        }
        .dashboard-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            min-height: 52px;
            margin-bottom: 24px;
            padding: 4px 10px;
            color: var(--ui-text);
            font-size: 0.9rem;
            font-weight: 650;
            letter-spacing: -0.02em;
            text-decoration: none;
        }
        .dashboard-brand-mark {
            display: grid;
            width: 30px;
            height: 30px;
            flex: 0 0 auto;
            place-items: center;
            color: var(--ui-cyan);
            background: var(--ui-surface-raised);
            border: 1px solid var(--ui-border-strong);
            border-radius: var(--ui-radius-md);
            font-size: 0.72rem;
            font-weight: 750;
            letter-spacing: -0.06em;
        }
        .dashboard-brand small {
            display: block;
            margin-top: 2px;
            color: var(--ui-subtle);
            font-size: 0.68rem;
            font-weight: 450;
            letter-spacing: 0;
        }
        .dashboard-nav { display: grid; gap: 4px; }
        .dashboard-nav a,
        .dashboard-nav button {
            display: flex;
            width: 100%;
            min-height: 40px;
            align-items: center;
            gap: 11px;
            padding: 8px 10px;
            color: var(--ui-muted);
            background: transparent;
            border: 1px solid transparent;
            border-radius: var(--ui-radius-md);
            cursor: pointer;
            font: inherit;
            font-size: 0.82rem;
            text-align: left;
            text-decoration: none;
            transition: color 180ms ease, background 180ms ease, border-color 180ms ease;
        }
        .dashboard-nav a:hover,
        .dashboard-nav button:hover {
            color: var(--ui-text);
            background: var(--ui-surface-muted);
            border-color: var(--ui-border);
        }
        .dashboard-nav a.active {
            color: var(--ui-text);
            background: rgba(96, 165, 250, 0.09);
            border-color: rgba(96, 165, 250, 0.2);
        }
        .dashboard-nav button.active {
            color: var(--ui-text);
            background: rgba(96, 165, 250, 0.09);
            border-color: rgba(96, 165, 250, 0.2);
        }
        .dashboard-nav svg {
            width: 17px;
            height: 17px;
            flex: 0 0 auto;
            fill: none;
            stroke: currentColor;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-width: 1.6;
        }
        .sidebar-footer {
            display: grid;
            gap: 4px;
            margin-top: auto;
            padding: 14px 10px 4px;
            color: var(--ui-subtle);
            border-top: 1px solid var(--ui-border);
            font-size: 0.7rem;
        }
        .sidebar-footer .admin-panel { position: relative; z-index: 3; margin-top: 12px; }
        .sidebar-footer .admin-button {
            display: flex;
            width: 100%;
            min-height: 48px;
            align-items: center;
            gap: 10px;
            padding: 6px 9px;
            color: var(--ui-muted);
            text-align: left;
            background: transparent;
            border: 1px solid transparent;
            border-radius: var(--ui-radius-md);
            box-shadow: none;
            font-size: 0.76rem;
            transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
        }
        .sidebar-footer .admin-button:hover,
        .sidebar-footer .admin-button[aria-expanded="true"] { color: var(--ui-text); background: var(--ui-surface-muted); border-color: var(--ui-border); }
        .admin-avatar {
            display: grid;
            width: 30px;
            height: 30px;
            flex: 0 0 auto;
            place-items: center;
            color: var(--ui-cyan);
            background: var(--ui-surface-raised);
            border: 1px solid var(--ui-border-strong);
            border-radius: 8px;
            font-size: 0.68rem;
            font-weight: 700;
        }
        .admin-identity { display: grid; min-width: 0; gap: 1px; }
        .admin-identity strong { color: var(--ui-text); font-size: 0.74rem; font-weight: 600; }
        .admin-identity small { color: var(--ui-subtle); font-size: 0.64rem; }
        .admin-chevron { width: 15px; height: 15px; margin-left: auto; color: var(--ui-subtle); transition: transform 160ms ease; }
        .admin-button[aria-expanded="true"] .admin-chevron { transform: rotate(180deg); }
        .sidebar-footer .admin-dropdown {
            top: auto;
            right: auto;
            bottom: calc(100% + 6px);
            left: 0;
            width: 100%;
            min-width: 0;
            max-width: none;
            margin: 0;
            padding: 5px;
            background: var(--ui-surface-raised);
            border: 1px solid var(--ui-border-strong);
            border-radius: 10px;
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
        }
        .admin-dropdown-heading { display: grid; gap: 2px; padding: 7px 9px 9px; border-bottom: 1px solid var(--ui-border); }
        .admin-dropdown-heading small { color: var(--ui-subtle); font-size: 0.62rem; }
        .admin-dropdown-heading strong { color: var(--ui-text); font-size: 0.72rem; font-weight: 600; }
        .sidebar-footer .admin-dropdown button {
            display: flex;
            min-width: 0;
            max-width: none;
            align-items: center;
            gap: 9px;
            margin-top: 4px;
            padding: 8px 9px;
            color: var(--ui-muted);
            text-align: left;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 6px;
            font-size: 0.72rem;
            font-weight: 550;
            transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
        }
        .sidebar-footer .admin-dropdown button:hover {
            color: #fda4af;
            background: rgba(244, 63, 94, 0.09);
            border-color: rgba(244, 63, 94, 0.16);
        }
        .admin-logout-icon { width: 15px; height: 15px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
        .sidebar-status { display: flex; align-items: center; gap: 8px; color: var(--ui-muted); }
        .sidebar-status::before {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #34d399;
            content: "";
        }
        .container {
            display: flex;
            width: 100%;
            min-width: 0;
            max-width: none;
            flex-direction: column;
            gap: var(--ui-space-4);
            margin: 0;
        }
        .container > .card { margin: 0; }
        .unauthenticated .dashboard-shell { grid-template-columns: minmax(0, 1fr); }
        .header {
            align-items: center;
            gap: var(--ui-space-4);
            margin: 0;
            padding: 0 0 var(--ui-space-4);
            border-bottom: 1px solid var(--ui-border);
        }
        .brand-kicker { color: var(--ui-cyan); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.16em; }
        .header-content h1 {
            margin: 7px 0 6px;
            color: var(--ui-text);
            background: none;
            -webkit-text-fill-color: currentColor;
            font-size: clamp(1.7rem, 3vw, 2.45rem);
            line-height: 1.2;
            letter-spacing: -0.045em;
        }
        .header-content p { color: var(--ui-muted); font-size: 0.94rem; }
        .header-toolbar { gap: 9px; }
        .header-actions { gap: 8px; }
        .card {
            padding: clamp(16px, 2.2vw, 24px);
            margin: 0;
            color: var(--ui-text);
            background: var(--ui-surface);
            border: 1px solid var(--ui-border);
            border-radius: var(--ui-radius-lg);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(6px);
        }
        .card h2, .modal h3, .admin-modal h3 { color: var(--ui-text); }
        .status-card { padding: clamp(16px, 2.2vw, 24px); backdrop-filter: none; }
        .sidebar-footer .admin-panel.overlay-open { z-index: 2; }
        .settings-page {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .settings-page[hidden] { display: none; }
        .container.settings-page-active > :not(#settings-page) { display: none; }
        .settings-page-header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 18px;
            padding: 4px 0 18px;
            border-bottom: 1px solid var(--ui-border);
        }
        .settings-page-header h1 {
            margin: 7px 0 5px;
            color: var(--ui-text);
            font-size: clamp(1.7rem, 3vw, 2.2rem);
            letter-spacing: -0.04em;
        }
        .settings-page-header p { margin: 0; color: var(--ui-muted); font-size: 0.88rem; }
        .settings-page-actions { display: flex; flex: 0 0 auto; gap: 8px; }
        .settings-page-actions .theme-toggle { display: inline-flex; flex-direction: row; align-items: center; gap: 5px; white-space: nowrap; }
        .settings-page-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            column-gap: 28px;
        }
        .settings-section {
            min-width: 0;
            padding: 18px 0;
            border-top: 1px solid var(--ui-border);
        }
        .settings-section[data-settings-group="data"] { grid-column: 1 / -1; }
        .settings-section[data-settings-group="backup"] { grid-column: 1 / -1; }
        .settings-section[data-settings-group="speed"],
        .settings-section[data-settings-group="schedule"] {
            grid-column: auto;
        }
        .settings-section[data-settings-group="automation"] { grid-column: 1 / -1; }
        .automation-settings-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 10px;
        }
        .automation-settings-column {
            display: flex;
            min-width: 0;
            flex-direction: column;
            gap: 8px;
            padding: 0;
            background: transparent;
            border: 0;
            border-radius: 0;
        }
        .automation-settings-column-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 28px;
        }
        .automation-settings-column-header strong {
            color: var(--ui-text);
            font-size: 0.82rem;
        }
        .automation-settings-status {
            padding: 3px 7px;
            color: var(--ui-cyan);
            background: var(--ui-selection);
            border: 1px solid var(--ui-border-strong);
            border-radius: 999px;
            font-size: 0.68rem;
            white-space: nowrap;
        }
        .automation-settings-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
        }
        .automation-settings-actions .settings-option-btn {
            min-height: 58px;
            width: 100%;
            padding: 9px 11px;
            background: var(--ui-surface-muted);
            border-color: var(--ui-border);
            border-radius: 10px;
        }
        .settings-section h3 {
            margin: 0 0 12px;
            color: var(--ui-text);
            font-size: 0.92rem;
            font-weight: 650;
        }
        .settings-options { gap: 8px; }
        .settings-section[data-settings-group="speed"] .settings-options,
        .settings-section[data-settings-group="schedule"] .settings-options {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .settings-section[data-settings-group="schedule"] .settings-options {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .settings-option-btn {
            min-height: 62px;
            padding: 11px 13px;
            background: var(--ui-surface);
            border-radius: var(--ui-radius-md);
        }
        .settings-option-btn:hover { background: var(--ui-surface-muted); }
        .settings-section[data-settings-group="data"] .settings-options { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .settings-option-btn strong { font-size: 0.82rem; font-weight: 600; }
        .settings-option-btn small { font-size: 0.72rem; }
        .settings-log-list {
            max-height: 420px;
            overflow-y: auto;
            display: grid;
            gap: 8px;
            margin: 14px 0;
            padding-right: 2px;
        }
        .settings-log-item {
            padding: 10px 12px;
            border: 1px solid var(--ui-border);
            border-radius: var(--ui-radius-md);
            background: var(--ui-surface-muted);
        }
        .settings-log-item strong {
            display: block;
            margin-bottom: 5px;
            color: var(--ui-error, #ff6b7a);
            font-size: 0.78rem;
        }
        .settings-log-item small {
            display: block;
            margin-top: 4px;
            color: var(--ui-muted);
            word-break: break-word;
        }
        .rule-form-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin: 14px 0 12px;
        }
        .rule-field {
            min-width: 0;
        }
        .rule-field label {
            display: block;
            margin-bottom: 6px;
            color: var(--ui-muted);
            font-size: 0.76rem;
            font-weight: 600;
        }
        .rule-field input {
            width: 100%;
        }
        .rule-preview {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin-top: 12px;
        }
        .rule-preview-item {
            min-width: 0;
            padding: 10px;
            background: var(--ui-surface-muted);
            border: 1px solid var(--ui-border);
            border-radius: 8px;
        }
        .rule-preview-item strong,
        .rule-preview-item span {
            display: block;
        }
        .rule-preview-item strong {
            margin-bottom: 2px;
            color: var(--ui-text);
            font-size: 0.78rem;
        }
        .rule-preview-item span {
            overflow-wrap: anywhere;
            color: var(--ui-muted);
            font-size: 0.72rem;
        }
        .schedule-interval-form {
            display: grid;
            grid-template-columns: 70px 110px 1fr;
            align-items: end;
            gap: 8px;
            margin: 14px 0 8px;
        }
        .schedule-interval-form .rule-field {
            min-width: 0;
        }
        .settings-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding-top: 12px;
            border-top: 1px solid var(--ui-border);
        }
        .settings-footer > small { color: var(--ui-subtle); font-size: 0.64rem; }
        .status-heading h2 { font-size: 1rem; }
        .stats { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .stat {
            min-width: 0;
            padding: 16px;
            background: var(--ui-surface-muted);
            border: 1px solid var(--ui-border);
            border-radius: var(--ui-radius-lg);
            text-align: left;
        }
        .stat > div:last-of-type { color: var(--ui-muted); font-size: 0.82rem; }
        .stat small { display: block; margin-top: 5px; color: var(--ui-subtle); }
        .stat-value { color: var(--ui-text); font-size: clamp(1.3rem, 2.4vw, 1.8rem); font-variant-numeric: tabular-nums; }
        .dashboard-info-grid { gap: var(--ui-space-3); margin: 0; }
        .info-card p, .info-card small, .modal-content p { color: var(--ui-muted); }
        .info-value { color: var(--ui-cyan); }
        .info-details { gap: 9px; }
        .info-details > span {
            padding: 9px 11px;
            color: var(--ui-muted);
            background: var(--ui-surface-muted);
            border: 1px solid var(--ui-border);
            border-radius: 10px;
        }
        .country-grid { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 9px; margin-bottom: 14px; }
        .country-card {
            min-height: 96px;
            padding: 13px;
            color: var(--ui-text);
            background: var(--ui-surface);
            border: 1px solid var(--ui-border);
            border-radius: var(--ui-radius-md);
            transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
        }
        .country-card:hover { transform: translateY(-1px); border-color: var(--ui-border-strong); }
        .country-card.active { border-color: var(--ui-blue); background: var(--ui-surface-muted); }
        .address-list-section { min-width: 0; scroll-margin-top: 24px; }
        .list-tabs { margin: 0 0 var(--ui-space-2); }
        .list-view-card { padding: clamp(16px, 2.2vw, 24px); }
        .ip-list {
            max-height: min(68vh, 760px);
            padding: 6px 14px;
            background: var(--ui-surface-muted);
            border: 1px solid var(--ui-border);
            border-radius: var(--ui-radius-md);
        }
        .list-view-card .ip-item { min-height: 68px; padding: 11px 8px; border-bottom-color: var(--ui-border); }
        .list-view-card .ip-address { color: var(--ui-text); font-size: 0.86rem; }
        .list-view-card .ip-location { color: var(--ui-muted); }
        .list-view-card .speed-result { background: var(--ui-surface-raised); border-color: var(--ui-border); }
        #dashboard-overview,
        #speed-test-panel,
        #quality-country-grid,
        #ip-list-section,
        #data-sources { scroll-margin-top: 24px; }
        .sources { gap: 8px; }
        .sources-header { display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-bottom: 14px; }
        .sources-header h2 { margin: 0; }
        .source {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, auto);
            align-items: center;
            gap: 8px 12px;
            min-width: 0;
            padding: 11px 13px;
            background: var(--ui-surface-muted);
            border-color: var(--ui-border);
            border-left-color: #34d399;
            border-radius: 10px;
        }
        .source.error { border-left-color: #fb7185; }
        .source-name { min-width: 0; color: var(--ui-text); overflow-wrap: anywhere; }
        .source-status { justify-self: end; max-width: 100%; white-space: normal; text-align: right; }
        .source-status.success { color: #6ee7b7; background: rgba(16, 185, 129, 0.12); }
        .source-status.error { color: #fda4af; background: rgba(244, 63, 94, 0.12); }
        @media (max-width: 600px) {
            .source { grid-template-columns: minmax(0, 1fr); gap: 6px; }
            .source-status { justify-self: start; text-align: left; }
        }
        .button, .small-btn, .admin-button, .admin-modal button {
            min-height: 38px;
            padding: 8px 13px;
            color: var(--ui-button-text);
            background: var(--ui-button-bg);
            border: 1px solid var(--ui-button-border);
            border-radius: var(--ui-radius-md);
            box-shadow: inset 0 1px rgba(255, 255, 255, 0.06);
            font-size: 0.83rem;
            font-weight: 600;
            transition: color 180ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease, opacity 180ms ease;
        }
        .button:hover, .small-btn:hover {
            color: var(--ui-button-primary-text);
            background: var(--ui-button-hover);
            border-color: var(--ui-button-hover-border);
            box-shadow: 0 3px 12px rgba(14, 116, 144, 0.14);
            transform: translateY(-1px);
        }
        .button:disabled, .small-btn:disabled { opacity: 0.55; transform: none; }
        .button-warning, .admin-button, .admin-modal .btn-primary {
            color: var(--ui-button-primary-text);
            background: linear-gradient(180deg, var(--ui-button-primary-top), var(--ui-button-primary-bottom));
            border-color: rgba(91, 207, 238, 0.76);
            box-shadow: inset 0 1px rgba(255, 255, 255, 0.18), 0 3px 10px rgba(8, 124, 157, 0.2);
        }
        .button-warning:hover, .admin-button:hover, .admin-modal .btn-primary:hover {
            color: var(--ui-button-primary-text);
            background: var(--ui-button-primary-hover);
            border-color: #75d7f0;
            box-shadow: inset 0 1px rgba(255, 255, 255, 0.2), 0 4px 14px rgba(8, 124, 157, 0.26);
        }
        .button-success {
            color: var(--ui-button-success-text);
            background: var(--ui-button-success-bg);
            border-color: var(--ui-button-success-border);
        }
        .button-success:hover {
            color: var(--ui-button-success-text);
            background: var(--ui-button-success-bg);
            border-color: var(--ui-button-success-border);
            filter: brightness(1.08);
        }
        .button-secondary { color: var(--ui-button-text); }
        .speedtest-preset-btn {
            color: var(--ui-button-text);
            background: var(--ui-button-bg);
            border-color: var(--ui-button-border);
        }
        .speedtest-preset-btn:hover {
            color: var(--ui-button-selected-text);
            background: var(--ui-button-selected-bg);
            border-color: var(--ui-button-selected-border);
            box-shadow: none;
        }
        .list-tab.active {
            color: var(--ui-button-primary-text);
            background: linear-gradient(180deg, var(--ui-button-primary-top), var(--ui-button-primary-bottom));
            border-color: rgba(91, 207, 238, 0.76);
            box-shadow: inset 0 1px rgba(255, 255, 255, 0.12),
                0 0 10px var(--ui-selection-glow),
                0 0 24px var(--ui-selection-glow);
        }
        .list-tab.active:hover { color: var(--ui-button-primary-text); background: var(--ui-button-primary-hover); }
        .list-view-card .action-buttons .small-btn {
            color: var(--ui-button-text);
            background: linear-gradient(180deg, rgba(16, 36, 58, 0.9), rgba(14, 27, 45, 0.96));
            border-color: var(--ui-button-border);
        }
        :root[data-theme="light"] .list-view-card .action-buttons .small-btn {
            background: linear-gradient(180deg, #ffffff, #f5faff);
        }
        .list-view-card .action-buttons .small-btn:hover {
            color: var(--ui-button-primary-text);
            background: var(--ui-button-hover);
            border-color: var(--ui-button-hover-border);
            box-shadow: 0 3px 12px rgba(14, 116, 144, 0.14);
        }
        .list-view-card .row-select-btn[aria-pressed="true"] {
            color: var(--ui-button-selected-text);
            background: var(--ui-button-selected-bg);
            border-color: var(--ui-button-selected-border);
            box-shadow: 0 0 8px var(--ui-selection-glow),
                0 0 18px var(--ui-selection-glow);
        }
        .country-card.active {
            border-color: var(--ui-button-selected-border);
            box-shadow: inset 0 0 0 1px var(--ui-button-selected-border),
                0 0 10px var(--ui-selection-glow),
                0 0 24px var(--ui-selection-glow);
        }
        .ip-item.is-selected {
            outline: 0;
            box-shadow: inset 0 0 0 1px var(--ui-button-selected-border),
                0 0 12px var(--ui-selection-glow),
                0 0 26px var(--ui-selection-glow);
        }
        .list-view-card .bandwidth-result {
            font-weight: 650;
            white-space: nowrap;
        }
        .admin-dropdown, .modal-content, .admin-modal {
            color: var(--ui-text);
            background: var(--ui-surface-raised);
            border: 1px solid var(--ui-border-strong);
            border-radius: 10px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
        }
        .admin-modal {
            width: min(100%, 420px);
            padding: clamp(24px, 5vw, 36px);
            text-align: left;
            border-color: var(--ui-border-strong);
            border-radius: 14px;
            box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
        }
        .admin-modal-header { display: flex; align-items: center; gap: 13px; margin-bottom: 24px; }
        .admin-modal-mark {
            display: grid;
            width: 44px;
            height: 44px;
            flex: 0 0 auto;
            place-items: center;
            color: var(--ui-cyan);
            background: rgba(34, 211, 238, 0.08);
            border: 1px solid rgba(34, 211, 238, 0.2);
            border-radius: 11px;
        }
        .admin-modal-mark svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
        .admin-modal-eyebrow { color: var(--ui-cyan); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; }
        .admin-modal h3 { margin: 3px 0 0; color: var(--ui-text); font-size: 1.2rem; font-weight: 650; letter-spacing: -0.02em; }
        .admin-modal > p { margin: 0 0 20px; color: var(--ui-muted); font-size: 0.84rem; line-height: 1.6; }
        .admin-modal > label { display: block; margin: 0 0 7px; color: var(--ui-text); font-size: 0.76rem; font-weight: 550; }
        .admin-modal input {
            min-height: 46px;
            margin: 0 0 18px;
            padding: 11px 13px;
            color: var(--ui-text);
            background: var(--ui-surface-muted);
            border: 1px solid var(--ui-border-strong);
            border-radius: 8px;
            font-size: 0.9rem;
        }
        .admin-modal input:focus { border-color: var(--ui-cyan); outline: 0; box-shadow: 0 0 0 3px var(--ui-selection-glow); }
        .admin-modal-actions { display: flex; gap: 9px; }
        .admin-modal-actions button { min-height: 42px; flex: 1; margin: 0; border-radius: 8px; font-size: 0.84rem; }
        .admin-modal-actions .btn-primary { color: var(--ui-button-primary-text); background: linear-gradient(180deg, var(--ui-button-primary-top), var(--ui-button-primary-bottom)); border: 1px solid var(--ui-button-border); }
        .admin-modal-actions .btn-secondary { color: var(--ui-button-text); background: var(--ui-surface-muted); border: 1px solid var(--ui-border-strong); }
        .admin-modal-actions button:hover { filter: brightness(1.08); }
        @media (max-width: 480px) {
            .admin-overlay { padding: 16px; }
            .admin-modal { width: 100%; padding: 24px 20px; }
            .admin-modal-actions button { min-height: 44px; }
        }
        .settings-row { gap: 9px; margin: 8px 0; }
        .settings-row label { color: var(--ui-muted); font-size: 0.8rem; }
        input:not([type="checkbox"]):not([type="radio"]), select, textarea {
            min-height: 38px;
            padding: 8px 10px;
            color: var(--ui-text) !important;
            background: var(--ui-surface-muted) !important;
            border: 1px solid var(--ui-border-strong) !important;
            border-radius: 9px !important;
        }
        input::placeholder, textarea::placeholder { color: var(--ui-subtle); }
        .modal { padding: 16px; }
        .modal-content { width: min(100%, 620px); max-height: min(88vh, 900px); padding: clamp(18px, 3vw, 28px); }
        .modal-content h3, .admin-modal h3 { font-size: 1.15rem; }
        .modal-content small { display: block; margin: 8px 0; color: var(--ui-muted); line-height: 1.55; }
        .modal-buttons { gap: 8px; }
        .footer { color: var(--ui-subtle); border-color: var(--ui-border); }
        .result { border-radius: 12px; }
        :focus-visible { outline: 2px solid var(--ui-cyan); outline-offset: 3px; }
        @media (max-width: 980px) {
            .dashboard-shell { grid-template-columns: 176px minmax(0, 1fr); gap: var(--ui-space-3); }
            .dashboard-sidebar { padding-right: 9px; }
            .dashboard-info-grid { grid-template-columns: minmax(0, 1fr); }
            .rule-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px) {
            body { padding: 10px 12px 24px; }
            .dashboard-shell { grid-template-columns: minmax(0, 1fr); gap: 12px; }
            .dashboard-sidebar {
                position: sticky;
                z-index: 40;
                top: 0;
                height: auto;
                width: 100%;
                margin: 0 auto 14px;
                padding: 7px 12px 8px;
                background: color-mix(in srgb, var(--ui-bg) 92%, transparent);
                border-right: 0;
                border-bottom: 1px solid var(--ui-border);
                border-radius: 12px;
                backdrop-filter: blur(14px);
            }
            .dashboard-brand { min-height: 38px; margin: 0 0 5px; padding: 2px 4px; }
            .dashboard-brand-mark { width: 27px; height: 27px; }
            .dashboard-nav {
                display: flex;
                gap: 4px;
                overflow-x: auto;
                padding-bottom: 2px;
                scrollbar-width: none;
            }
            .dashboard-nav::-webkit-scrollbar { display: none; }
            .dashboard-nav a,
            .dashboard-nav button {
                width: auto;
                min-height: 34px;
                flex: 0 0 auto;
                gap: 7px;
                padding: 6px 9px;
                white-space: nowrap;
            }
            .dashboard-nav svg { width: 15px; height: 15px; }
            .sidebar-footer {
                display: flex;
                align-items: center;
                margin-top: 6px;
                padding: 6px 4px 0;
                border-top: 0;
            }
            .sidebar-footer > span { display: none; }
            .sidebar-footer .admin-panel { width: auto; margin: 0; }
            .sidebar-footer .admin-button { width: auto; min-height: 38px; padding: 4px 8px; }
            .admin-identity small,
            .admin-chevron { display: none; }
            .sidebar-footer .admin-dropdown {
                top: calc(100% + 6px);
                right: auto;
                bottom: auto;
                left: 0;
                width: min(220px, calc(100vw - 32px));
            }
            .container { gap: var(--ui-space-3); }
            .header { grid-template-columns: minmax(0, 1fr); gap: 12px; padding-bottom: 14px; }
            .header-toolbar { align-items: stretch; }
            .header-actions { justify-content: flex-start; }
            .header-actions .button { flex: 1 1 auto; }
            .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .country-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .ip-list { max-height: 62vh; }
            .list-view-card .ip-item { align-items: flex-start; flex-wrap: wrap; gap: 10px; }
            .list-view-card .ip-info { grid-template-columns: minmax(0, 1fr) 74px 88px; width: 100%; }
            .list-view-card .action-buttons { width: 100%; justify-content: flex-end; }
            .automation-settings-grid { grid-template-columns: minmax(0, 1fr); }
            .rule-form-grid,
            .rule-preview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .settings-page-grid { grid-template-columns: minmax(0, 1fr); }
            .settings-section[data-settings-group="data"] { grid-column: auto; }
            .settings-section[data-settings-group="data"] .settings-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .settings-page-header { align-items: flex-start; flex-direction: column; }
            .settings-page-actions { width: 100%; }
            .settings-page-actions button { white-space: nowrap; }
            .settings-page-actions .theme-toggle { min-width: 100px; }
        }
        @media (max-width: 420px) {
            .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .stat { padding: 12px; }
            .country-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .country-card { min-width: 0; padding: 10px; }
            .header-actions .button { min-width: 0; font-size: 0.75rem; }
            .list-view-card .ip-info { grid-template-columns: minmax(0, 1fr) 60px 72px; gap: 5px; }
            .list-view-card .ip-address { font-size: 0.72rem; }
            .list-view-card .action-buttons .small-btn { min-height: 34px; }
            .automation-settings-actions,
            .rule-form-grid,
            .rule-preview { grid-template-columns: minmax(0, 1fr); }
            .settings-section[data-settings-group="speed"] .settings-options,
            .settings-section[data-settings-group="schedule"] .settings-options,
            .settings-section[data-settings-group="data"] .settings-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .schedule-interval-form { grid-template-columns: 64px minmax(0, 1fr); }
            .schedule-interval-form .small-btn { grid-column: 1 / -1; }
        }
        .settings-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .settings-option-btn { color: var(--ui-text); border-color: var(--ui-border); }
        .modal-content > p { margin: 0 0 14px; font-size: 0.82rem; line-height: 1.55; }
        .modal-content > h3 { margin-bottom: 12px; }
        .modal-content .settings-row {
            display: grid;
            grid-template-columns: minmax(110px, 0.7fr) minmax(0, 1fr) auto;
            align-items: center;
            gap: 8px;
            margin: 10px 0;
        }
        .modal-content .settings-row label { min-width: 0; }
        .modal-content .settings-row input:not([type="checkbox"]),
        .modal-content .settings-row select { width: 100% !important; min-width: 0; max-width: none !important; }
        .settings-help { margin: 8px 0; color: var(--ui-muted); font-size: 0.78rem; }
        .settings-help summary { color: var(--ui-text); cursor: pointer; }
        .settings-help p { margin: 8px 0; }
        @media (max-width: 480px) {
            .settings-page-header h1 { font-size: 1.6rem; }
            .settings-page-actions { flex-wrap: wrap; }
            .settings-section[data-settings-group="data"] .settings-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .modal-content .settings-row {
                grid-template-columns: minmax(0, 1fr);
                gap: 5px;
            }
            .modal-content .settings-row label,
            .modal-content .settings-row button,
            .modal-content .settings-row small,
            .modal-content .settings-row span { grid-column: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        /* Stage 1: a compact glass header anchors the existing dashboard navigation. */
        body {
            background:
                radial-gradient(900px 520px at 12% -18%, rgba(59, 130, 246, 0.11), transparent 68%),
                radial-gradient(720px 440px at 92% -20%, rgba(6, 182, 212, 0.08), transparent 70%),
                var(--ui-bg);
            background-attachment: fixed;
        }
        .dashboard-shell { display: block; width: min(100%, 1480px); }
        .dashboard-sidebar {
            position: sticky;
            top: 10px;
            z-index: 100;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: center;
            gap: 16px;
            width: 100%;
            height: auto;
            margin: 0 0 24px;
            padding: 7px 10px;
            background: rgba(15, 23, 42, 0.78);
            border: 1px solid var(--ui-border);
            border-radius: 12px;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
            backdrop-filter: blur(14px);
        }
        .dashboard-brand { min-height: 40px; margin: 0; padding: 3px 7px; white-space: nowrap; }
        .dashboard-nav {
            display: flex;
            min-width: 0;
            justify-content: center;
            gap: 3px;
            overflow-x: auto;
            scrollbar-width: none;
        }
        .dashboard-nav::-webkit-scrollbar { display: none; }
        .dashboard-nav a,
        .dashboard-nav button {
            width: auto;
            min-height: 38px;
            flex: 0 0 auto;
            gap: 8px;
            padding: 7px 10px;
            white-space: nowrap;
        }
        .sidebar-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            margin: 0;
            padding: 0;
            border: 0;
        }
        .sidebar-footer > span { display: none; }
        .sidebar-footer .admin-panel { margin: 0; }
        .sidebar-footer .admin-button { min-height: 38px; padding: 4px 8px; }
        .sidebar-footer .admin-dropdown {
            top: calc(100% + 6px);
            right: 0;
            bottom: auto;
            left: auto;
            width: 220px;
        }
        .container { max-width: none; }
        @media (max-width: 768px) {
            .dashboard-sidebar {
                position: static;
                top: auto;
                z-index: auto;
                grid-template-columns: minmax(0, 1fr) auto;
                grid-template-areas: "brand account" "nav nav";
                gap: 5px 8px;
                width: 100%;
                margin: 0 auto 14px;
                padding: 7px 12px 8px;
                border: 0;
                border-bottom: 1px solid var(--ui-border);
                border-radius: 12px;
                background: rgba(10, 14, 23, 0.9);
                box-shadow: none;
                backdrop-filter: none;
            }
            .dashboard-brand { grid-area: brand; margin: 0; }
            .dashboard-nav {
                grid-area: nav;
                width: 100%;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                justify-content: center;
                padding-bottom: 1px;
            }
            .dashboard-nav a,
            .dashboard-nav button {
                width: 100%;
                justify-content: center;
                text-align: center;
            }
            .sidebar-footer {
                grid-area: account;
                justify-content: flex-end;
                margin: 0;
                padding: 0;
            }
            .sidebar-footer .admin-dropdown { width: min(220px, calc(100vw - 32px)); }
        }
        /* Device-class layout: UA/server detection is the initial state; JS refines it for resize and touch devices. */
        .device-mobile .dashboard-shell {
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
        }
        .device-mobile .dashboard-sidebar {
            position: sticky;
            z-index: 40;
            top: 0;
            height: auto;
            width: 100%;
            margin: 0 auto 14px;
            padding: 7px 12px 8px;
            border-right: 0;
            border-bottom: 1px solid var(--ui-border);
            border-radius: 12px;
            background: rgba(10, 14, 23, 0.94);
            backdrop-filter: blur(14px);
        }
        .device-mobile .dashboard-nav {
            display: grid;
            width: 100%;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 4px;
            margin: 0 auto;
            overflow-x: visible;
            justify-content: center;
            scrollbar-width: none;
        }
        .device-mobile .dashboard-nav::-webkit-scrollbar { display: none; }
        .device-mobile .dashboard-nav a,
        .device-mobile .dashboard-nav button {
            width: 100%;
            flex: 0 0 auto;
            justify-content: center;
            text-align: center;
        }
        .device-mobile .settings-page-grid,
        .device-mobile .automation-settings-grid,
        .device-mobile .rule-form-grid,
        .device-mobile .rule-preview {
            grid-template-columns: minmax(0, 1fr);
        }
        .device-mobile .settings-section[data-settings-group="automation"] {
            grid-column: auto;
        }
        .device-mobile .automation-settings-actions,
        .device-mobile .schedule-interval-form {
            grid-template-columns: minmax(0, 1fr);
        }
        .device-mobile .dashboard-info-grid,
        .device-mobile .stats,
        .device-mobile .country-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        /* PC layout: fixed-width information column and aligned three-button rows */
        @media (min-width: 769px) {
            html.device-desktop .settings-page-grid {
                grid-template-columns: minmax(0, 1fr);
            }
            html.device-desktop .automation-settings-grid {
                grid-template-columns: minmax(0, 1fr);
            }
            html.device-desktop .automation-settings-actions {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                align-items: stretch;
            }
            html.device-desktop .automation-settings-actions .settings-option-btn {
                min-height: 68px;
                text-align: left;
            }
        }
        html.device-desktop .automation-settings-actions .settings-option-btn,
        html.device-mobile .automation-settings-actions .settings-option-btn {
            min-height: 68px;
            padding: 9px 11px;
            background: var(--ui-surface-muted);
            border: 1px solid var(--ui-border);
            box-shadow: none;
            border-radius: 10px;
        }
        html.device-desktop .automation-settings-actions .settings-option-btn:hover,
        html.device-mobile .automation-settings-actions .settings-option-btn:hover {
            background: var(--ui-surface-hover);
            border-color: var(--ui-border-strong);
            box-shadow: none;
            color: var(--ui-cyan);
        }
        /* Mobile layout: independent stacked rules; never share desktop column widths. */
        @media (max-width: 768px) {
            html.device-mobile .settings-page-grid,
            html.device-mobile .automation-settings-grid,
            html.device-mobile .automation-settings-actions {
                grid-template-columns: minmax(0, 1fr);
            }
            html.device-mobile .settings-page {
                gap: 12px;
            }
            html.device-mobile .settings-page-header {
                align-items: flex-start;
                flex-direction: column;
                gap: 10px;
            }
            html.device-mobile .settings-page-actions {
                width: 100%;
            }
            html.device-mobile .settings-page-actions .small-btn {
                min-height: 42px;
            }
            html.device-mobile .automation-settings-column {
                gap: 10px;
                padding: 0;
            }
            html.device-mobile .automation-settings-actions .settings-option-btn {
                min-height: 64px;
                width: 100%;
                text-align: left;
            }
            html.device-mobile .settings-section[data-settings-group="data"] .settings-options {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        /* Phase 1 - Vercel/Linear inspired dark glass foundation */
        :root:not([data-theme="light"]) {
            --bg-primary: #0a0e17;
            --bg-secondary: rgba(15, 23, 42, 0.72);
            --bg-card: rgba(15, 23, 42, 0.72);
            --bg-hover: rgba(30, 41, 59, 0.82);
            --bg-stat: rgba(15, 23, 42, 0.62);
            --bg-ip-list: rgba(10, 14, 23, 0.62);
            --bg-modal: rgba(15, 23, 42, 0.92);
            --text-primary: #e2e8f0;
            --text-secondary: #94a3b8;
            --text-heading: #e2e8f0;
            --text-heading-h2: #e2e8f0;
            --border-primary: rgba(255, 255, 255, 0.08);
            --border-secondary: rgba(148, 163, 184, 0.18);
            --border-input: rgba(148, 163, 184, 0.22);
            --input-bg: rgba(15, 23, 42, 0.82);
            --input-text: #e2e8f0;
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2);
            --shadow-md: 0 12px 32px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.025);
            --shadow-lg: 0 24px 64px rgba(0, 0, 0, 0.38);
            --shadow-button: 0 10px 24px rgba(59, 130, 246, 0.18);
            --header-gradient: linear-gradient(135deg, #60a5fa, #22d3ee);
            --speed-fast-bg: rgba(16, 185, 129, 0.15);
            --speed-fast-text: #10b981;
            --speed-medium-bg: rgba(245, 158, 11, 0.15);
            --speed-medium-text: #f59e0b;
            --speed-slow-bg: rgba(239, 68, 68, 0.15);
            --speed-slow-text: #ef4444;
            --ui-surface: rgba(15, 23, 42, 0.72);
            --ui-surface-raised: rgba(30, 41, 59, 0.7);
            --ui-surface-muted: rgba(10, 14, 23, 0.58);
            --ui-border: rgba(255, 255, 255, 0.08);
            --ui-border-strong: rgba(34, 211, 238, 0.24);
            --ui-text: #e2e8f0;
            --ui-muted: #94a3b8;
            --ui-subtle: #64748b;
            --ui-blue: #3b82f6;
            --ui-cyan: #22d3ee;
        }
        :root:not([data-theme="light"]) body {
            min-height: 100vh;
            color: var(--text-primary);
            background:
                radial-gradient(circle at 82% -10%, rgba(59, 130, 246, 0.14), transparent 32rem),
                radial-gradient(circle at 10% 105%, rgba(34, 211, 238, 0.08), transparent 30rem),
                linear-gradient(145deg, #0a0e17, #0f172a);
            background-attachment: fixed;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        :root:not([data-theme="light"]) .dashboard-shell {
            min-height: 100vh;
            background: transparent;
        }
        :root:not([data-theme="light"]) .dashboard-sidebar {
            background: rgba(10, 14, 23, 0.72);
            border-right-color: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }
        :root:not([data-theme="light"]) .dashboard-sidebar::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: linear-gradient(180deg, rgba(59, 130, 246, 0.04), transparent 180px);
        }
        :root:not([data-theme="light"]) .dashboard-brand-mark {
            background: linear-gradient(135deg, #3b82f6, #06b6d4);
            color: #fff;
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.24);
        }
        :root:not([data-theme="light"]) .dashboard-nav a,
        :root:not([data-theme="light"]) .dashboard-nav button {
            transition: all 0.2s ease;
        }
        :root:not([data-theme="light"]) .dashboard-nav a:hover,
        :root:not([data-theme="light"]) .dashboard-nav button:hover {
            transform: translateY(-1px);
            border-color: rgba(34, 211, 238, 0.16);
        }
        :root:not([data-theme="light"]) .header {
            min-height: 112px;
            margin-bottom: 16px;
            padding: 22px 24px;
            background:
                linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(34, 211, 238, 0.025)),
                rgba(15, 23, 42, 0.72);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.035);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
        }
        :root:not([data-theme="light"]) .header-content h1 {
            font-size: clamp(24px, 3vw, 28px);
            letter-spacing: -0.035em;
            background: linear-gradient(135deg, #e2e8f0 10%, #22d3ee 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        :root:not([data-theme="light"]) .header-content p {
            color: #94a3b8;
            font-size: 13px;
        }
        :root:not([data-theme="light"]) .brand-kicker,
        :root:not([data-theme="light"]) .sidebar-status {
            color: #64748b;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.14em;
        }

        /* Premium latency and bandwidth metric tiles */
        .list-view-card .speed-result::after {
            display: none !important;
            content: none !important;
        }
        .list-view-card .speed-result {
            position: relative;
            isolation: isolate;
            overflow: hidden;
            min-height: 56px;
            border-radius: 12px;
            border-color: var(--ui-border, var(--border-primary));
            background: linear-gradient(145deg, var(--ui-surface-raised, var(--bg-secondary)), var(--bg-card));
            box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.06),
                0 7px 18px rgba(0, 0, 0, 0.08);
            letter-spacing: 0;
            text-shadow: none;
        }
        .list-view-card .speed-result::before {
            letter-spacing: 0.08em;
        }
        .list-view-card .speed-result.speed-fast {
            border-color: var(--speed-fast-text);
            background: linear-gradient(145deg, var(--ui-surface-raised, var(--bg-secondary)), var(--speed-fast-bg));
        }
        .list-view-card .speed-result.speed-medium {
            border-color: var(--speed-medium-text);
            background: linear-gradient(145deg, var(--ui-surface-raised, var(--bg-secondary)), var(--speed-medium-bg));
        }
        .list-view-card .speed-result.speed-slow {
            border-color: var(--speed-slow-text);
            background: linear-gradient(145deg, var(--ui-surface-raised, var(--bg-secondary)), var(--speed-slow-bg));
        }
        .list-view-card .speed-result.bandwidth-fast {
            border-color: var(--bandwidth-fast-text);
            background: linear-gradient(145deg, var(--ui-surface-raised, var(--bg-secondary)), var(--bandwidth-fast-bg));
        }
        .list-view-card .speed-result.bandwidth-medium {
            border-color: var(--speed-medium-text);
            background: linear-gradient(145deg, var(--ui-surface-raised, var(--bg-secondary)), var(--speed-medium-bg));
        }
        .list-view-card .speed-result.bandwidth-slow {
            border-color: var(--speed-slow-text);
            background: linear-gradient(145deg, var(--ui-surface-raised, var(--bg-secondary)), var(--speed-slow-bg));
        }

    </style>
</head>
<body class="${htmlDeviceClass} ${showAdminButton ? "authenticated" : "unauthenticated"}" data-device="${deviceType}">
    ${!showAdminButton && (showSetPassword || showLogin) ? '<div class="content-overlay"></div>' : ""}
    <div class="dashboard-shell">
        ${
          showAdminButton
            ? `
        <aside class="dashboard-sidebar" aria-label="主导航">
            <a class="dashboard-brand" href="#dashboard-overview" onclick="setActiveDashboardNav(document.querySelector('.dashboard-nav a'))">
                <span class="dashboard-brand-mark" aria-hidden="true">CF</span>
                <span>Cloudflare Optimal IP Harvester<small>Cloudflare 管理面板</small></span>
            </a>
            <nav class="dashboard-nav" aria-label="Dashboard">
                <a class="active" href="#dashboard-overview" aria-current="page" onclick="setActiveDashboardNav(this)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1"></rect><rect x="13.5" y="3.5" width="7" height="7" rx="1"></rect><rect x="3.5" y="13.5" width="7" height="7" rx="1"></rect><rect x="13.5" y="13.5" width="7" height="7" rx="1"></rect></svg>
                    <span>概览</span>
                </a>
                <a href="#speed-test-panel" onclick="setActiveDashboardNav(this)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17.5a8 8 0 1 1 16 0"></path><path d="m12 13 4-4"></path><path d="M7 17.5h10"></path></svg>
                    <span>测速任务</span>
                </a>
                <a href="#quality-country-grid" onclick="setActiveDashboardNav(this)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17v13h-17z"></path><path d="M3.5 10.5h17M8 6.5v13"></path></svg>
                    <span>优选地区</span>
                </a>
                <a href="#ip-list-section" onclick="setActiveDashboardNav(this)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"></path><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"></path></svg>
                    <span>地址列表</span>
                </a>
                <a href="#data-sources" onclick="setActiveDashboardNav(this)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2"></circle><circle cx="18" cy="18" r="2"></circle><path d="M8 6h5a5 5 0 0 1 5 5v5"></path><path d="M6 8v9"></path></svg>
                    <span>数据来源</span>
                </a>
                <button type="button" aria-controls="settings-page" onclick="openDashboardSettings(this)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6"></path><circle cx="12" cy="12" r="4"></circle></svg>
                    <span>设置</span>
                </button>
            </nav>
            <div class="sidebar-footer">
                <span class="sidebar-status">Worker 管理控制台</span>
                <span>采集 · 测速 · 优选</span>
                ${
                  showAdminButton
                    ? `
                <div class="admin-panel">
                    <button class="admin-button" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="admin-dropdown" onclick="toggleAdminDropdown()">
                        <span class="admin-avatar" aria-hidden="true">A</span>
                        <span class="admin-identity"><strong>管理员</strong><small>已登录</small></span>
                        <svg class="admin-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>
                    </button>
                    <div class="admin-dropdown" id="admin-dropdown" role="menu" aria-label="管理员账户">
                        <div class="admin-dropdown-heading"><small>当前账户</small><strong>管理员</strong></div>
                        <button type="button" role="menuitem" onclick="handleLogout()"><svg class="admin-logout-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"></path></svg><span>退出登录</span></button>
                    </div>
                </div>
                `
                    : ""
                }
            </div>
        </aside>
        `
            : ""
        }
    <main class="container">
        <section class="settings-page" id="settings-page" aria-labelledby="settings-page-title" hidden>
            <header class="settings-page-header">
                <div>
                    <div class="brand-kicker">SETTINGS</div>
                    <h1 id="settings-page-title">设置</h1>
                    <p>管理测速、定时任务和数据规则。</p>
                </div>
                <div class="settings-page-actions">
                    <button class="small-btn" type="button" onclick="refreshData()">刷新</button>
                    <button class="small-btn theme-toggle" type="button" onclick="toggleTheme()" title="切换主题" aria-label="切换主题">主题 <span id="theme-icon"></span></button>
                </div>
            </header>
            <div class="settings-page-grid">
                <section class="settings-section" data-settings-group="speed" aria-labelledby="settings-speed-title">
                    <h3 id="settings-speed-title">测速管理</h3>
                    <div class="settings-options">
                        <button class="settings-option-btn" id="manual-speedtest-settings-summary" type="button" onclick="openSettingsModal('speedtest-count-modal')"><strong>手动测速设置</strong><small>${data.speedTestCount === 0 ? "全部节点" : data.speedTestCount + " 个节点"} · 每批 ${data.manualBatchSize} 个 · 超时 ${data.manualSpeedTestTimeoutSeconds} 秒自动拉黑</small></button>
                        <button class="settings-option-btn" type="button" onclick="openSettingsModal('speedtest-threshold-modal')"><strong>测速阈值</strong><small>延迟与带宽</small></button>
                        <button class="settings-option-btn" id="scheduled-speedtest-settings-summary" type="button" onclick="openSettingsModal('scheduled-speedtest-settings-modal')"><strong>定时测速规则</strong><small>每批 ${data.scheduledSpeedTestBatchSize} 个 · 超时 ${data.scheduledSpeedTestTimeoutSeconds} 秒自动拉黑</small></button>
                    </div>
                </section>
                <section class="settings-section" data-settings-group="schedule" aria-labelledby="settings-schedule-title">
                    <h3 id="settings-schedule-title">定时任务</h3>
                    <div class="settings-options">
                        <button class="settings-option-btn" id="settings-schedule-enabled" type="button" role="switch" aria-checked="${data.scheduleEnabled}" data-schedule-enabled="${data.scheduleEnabled}" aria-label="切换定时任务"><strong>定时任务</strong><small>${data.scheduleEnabled ? "已开启" : "已关闭"}</small></button>
                        <button class="settings-option-btn" type="button" onclick="openSettingsModal('schedule-api-modal')"><strong>Cloudflare API</strong><small>${data.scheduleApiConfigured ? "账户、脚本与 Token 已配置" : "账户、脚本与 Token 待配置"}</small></button>
                        <button class="settings-option-btn" type="button" onclick="openSettingsModal('schedule-time-modal')"><strong>定时设置</strong><small>${escapeHtml(getCronFrequencyLabel(data.scheduleConfigured ? data.cronSchedule : null, data.speedTestMode))}</small></button>
                        <button class="settings-option-btn" type="button" onclick="openSettingsModal('scheduled-log-modal')"><strong>定时任务日志</strong><small>查看最近执行错误</small></button>
                    </div>
                </section>
                <section class="settings-section" data-settings-group="data" aria-labelledby="settings-data-title">
                    <h3 id="settings-data-title">数据管理</h3>
                    <div class="settings-options">
                        <button class="settings-option-btn" type="button" onclick="openSettingsModal('quality-countries-modal')"><strong>优选地区</strong><small>国家与数量</small></button>
                        <button class="settings-option-btn" type="button" onclick="openSettingsModal('display-limit-modal')"><strong>列表显示</strong><small>地址数量</small></button>
                        <button class="settings-option-btn" type="button" onclick="openPathModal()"><strong>访问路径</strong><small>自定义 URL</small></button>
                        <button class="settings-option-btn" type="button" onclick="openSourcesModal()"><strong>数据来源</strong><small>采集地址</small></button>
                        <button class="settings-option-btn" type="button" onclick="openBlacklistModal()"><strong>黑名单</strong><small>排除地址</small></button>
                        ${
                          showAdminButton
                            ? `<button class="settings-option-btn" type="button" onclick="openSettingsModal('clear-ips-modal')"><strong>清理数据</strong><small>按类别删除</small></button>`
                            : ""
                        }
                    </div>
                </section>
                <section class="settings-section" data-settings-group="backup" aria-labelledby="settings-backup-title">
                    <h3 id="settings-backup-title">备份和恢复</h3>
                    <div class="settings-options">
                        <button class="settings-option-btn" type="button" onclick="downloadSettingsBackup()"><strong>导出备份</strong><small>下载当前设置 JSON</small></button>
                        <button class="settings-option-btn" type="button" onclick="document.getElementById('settings-backup-file').click()"><strong>导入备份</strong><small>从 JSON 文件恢复设置</small></button>
                        <input type="file" id="settings-backup-file" accept=".json,application/json" hidden onchange="restoreSettingsBackup(this)">
                    </div>
                </section>
            </div>
            <div class="settings-footer">
                <small id="sources-settings-status" role="status">数据来源用于手动和定时更新</small>
            </div>
        </section>
        <div class="header" id="dashboard-overview">
            <div class="header-content">
                <div class="brand-kicker">CLOUDFLARE</div>
                <h1>多数据源采集优选管理面板</h1>
                <p>多数据源采集 IP/域名，以 300 KB 小样本测速并估算带宽；可自定义优选国家/地区。</p>
            </div>
            <div class="header-toolbar">
                <div class="header-actions">
                    <button class="button" onclick="updateIPs()" id="update-btn">更新数据源</button>
                    <button class="button button-warning" id="speedtest-header-btn" type="button" onclick="startSpeedTest(0)">全部测速</button>
                    <button class="button button-secondary" id="itdog-btn" type="button" onclick="openQualityIPsInITDogBatch()">ITDog 批量测试</button>
                </div>
            </div>
        </div>
        <div class="card status-card">
            <div class="status-heading">
                <h2>系统状态</h2>
                <div class="header-tools">
                    <span class="selected-ip-label" id="itdog-selected-label" hidden></span>
                </div>
            </div>
            <div class="stats">
                <div class="stat"><div class="stat-value recent" id="recent-count">${data.originalCount || 0}</div><div>最近更新数量</div></div>
                <div class="stat"><div class="stat-value total" id="total-count">${(data.totalUniqueIPs || 0).toLocaleString()}</div><div>全部数量</div></div>
                <div class="stat"><div class="stat-value quality" id="premium-stat-count">${data.speedCategoryCounts.premium}</div><div>优质 IP</div>                <small>每国数量可在优选国家设置中调整</small></div>
                <div class="stat"><div class="stat-value quality" id="premium-domain-stat-count">${data.speedCategoryCounts["premium-domain"]}</div><div>优质域名</div>                <small>每国数量可在优选国家设置中调整</small></div>
                <div class="stat"><div class="stat-value time" id="last-time">${data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : "从未更新"}</div><div>上次更新</div></div>
            </div>
            <div class="loading" id="loading"><div class="spinner"></div><p>正在从多个来源收集 IP/域名 地址，请稍候...</p></div>
            <div class="result" id="result"></div>
        </div>
        <div class="dashboard-info-grid">
            <section class="card info-card" id="speed-test-panel">
                <h2>手动测速</h2>
                <div class="info-details">
                    <span>优质 IP 规则 <b id="speedtest-threshold-label">按每国设置数量筛选</b></span>
                    <span>预计本轮流量 <b id="speedtest-estimate-detail">等待节点列表</b></span>
                    <span>本轮已传输 <b id="speedtest-transferred">0 KB</b></span>
                    <span>每批 IP 数 <b id="manual-speedtest-batch-size">${data.manualBatchSize}</b></span>
                    <span>批次间隔 <b id="manual-speedtest-batch-interval">${data.manualBatchIntervalSeconds} 秒</b></span>
                    <span>IP 请求间隔 <b id="manual-speedtest-address-interval">${data.manualAddressIntervalSeconds} 秒</b></span>
                    <span>超时阈值（自动拉黑） <b id="manual-speedtest-timeout">${data.manualSpeedTestTimeoutSeconds} 秒</b></span>
                </div>
                <div class="traffic-presets speedtest-presets" aria-label="单次测速数量">
                    <button class="small-btn speedtest-preset-btn" type="button" onclick="startSpeedTest(20)">测速 20</button>
                    <button class="small-btn speedtest-preset-btn" type="button" onclick="startSpeedTest(50)">测速 50</button>
                    <button class="small-btn speedtest-preset-btn" type="button" onclick="startSpeedTest(0)">测速全部</button>
                    <button class="small-btn speedtest-preset-btn" type="button" onclick="startSpeedTest()">默认</button>
                    <span class="speedtest-count-indicator" id="speedtest-selected-count">默认 ${speedTestCount === 0 ? "全部" : speedTestCount} 节点</span>
                </div>
                <div class="traffic-presets speedtest-presets" aria-label="按分类手动测速">
                    <button class="small-btn speedtest-preset-btn" type="button" onclick="startSpeedTest(undefined, 'premium')">测优质 IP</button>
                    <button class="small-btn speedtest-preset-btn" type="button" onclick="startSpeedTest(undefined, 'backup')">测备用 IP</button>
                    <button class="small-btn speedtest-preset-btn" type="button" onclick="startSpeedTest(undefined, 'untested')">测未测速 IP</button>
                </div>
            </section>
            <section class="card info-card cron-card">
                <h2>Cron 运行计划</h2>
                <strong class="info-value" id="cron-frequency">${getCronFrequencyLabel(data.scheduleConfigured ? data.cronSchedule : null, data.speedTestMode)}</strong>
                <code id="cron-expression">${data.scheduleConfigured && data.cronSchedule ? escapeHtml(data.cronSchedule) : "尚未配置 Cron 触发器"}</code>
                <div class="settings-row">
                    <span>定时任务</span>
                    <button class="small-btn" id="schedule-enabled-toggle" type="button" role="switch" aria-checked="${data.scheduleEnabled}" aria-label="切换定时任务">
                        ${data.scheduleEnabled ? "已开启" : "已关闭"}
                    </button>
                </div>
                <div class="cron-run-overview info-details">
                    <span>优质 IP 规则 <b id="cron-quality-rule-label">按每国设置数量筛选</b></span>
                    <span>预计本轮流量 <b id="cron-estimate-detail">${data.scheduledSpeedTestEstimateAddressCount || 0} 个 · ${(((data.scheduledSpeedTestEstimateAddressCount || 0) * 300000) / 1024 / 1024).toFixed(1)} MiB</b></span>
                    <span>本轮已传输 <b id="cron-transferred">0 KB</b></span>
                    <span>定时测速地址数 <b id="speedtest-default-count">${data.scheduleEnabled ? data.scheduledSpeedTestCountLabel : "未启用"}</b></span>
                    <span>每批 IP 数 <b id="cron-speedtest-batch-size">${data.scheduledSpeedTestBatchSize}</b></span>
                    <span>批次间隔 <b id="cron-speedtest-batch-interval">${data.scheduledSpeedTestBatchIntervalSeconds} 秒</b></span>
                    <span>IP 请求间隔 <b id="cron-speedtest-address-interval">${data.scheduledSpeedTestAddressIntervalSeconds} 秒</b></span>
                    <span>超时阈值（自动拉黑） <b id="cron-speedtest-timeout">${data.scheduledSpeedTestTimeoutSeconds} 秒</b></span>
                </div>
                <small>计划字段（<span id="scheduled-timezone-label">${escapeHtml(data.scheduleTimezone)}</span>）：<code id="scheduled-time-summary">${data.scheduleConfigured ? escapeHtml(Object.values(data.scheduleFields).join(" ")) : "尚未配置"}</code></small>
                <small>Cloudflare UTC Cron 表达式</small>
                <code id="desired-cron-expressions">${data.scheduleConfigured && data.desiredCronExpressions.length ? data.desiredCronExpressions.map(escapeHtml).join("<br>") : "尚未设置"}</code>
                <small>已通过 API 应用的 UTC Cron：<span id="applied-cron-expressions">${data.scheduleConfigured && data.appliedCronExpressions.length ? data.appliedCronExpressions.map(escapeHtml).join("；") : "尚未同步"}</span></small>
            </section>
        </div>
        <section class="country-grid" id="quality-country-grid" aria-label="所选国家 / 地区优质 IP">
            <button class="country-card active" type="button" data-quality-country="" aria-pressed="true" onclick="switchAddressList('premium')">
                <span>全部</span>
                <strong>优质 IP</strong>
                <small>共 <b id="country-count-all">${data.speedCategoryCounts.premium}</b> 个</small>
            </button>
            ${selectedQualityCountries
              .map(
                (code) => `
                <button class="country-card" type="button" data-quality-country="${escapeHtml(code)}" aria-pressed="false" onclick="switchAddressList('premium', '${escapeHtml(code)}')">
                    <span>${escapeHtml(code)}</span>
                    <strong>${escapeHtml(SUPPORTED_COUNTRIES[code])}</strong>
                    <small>IP ${data.qualityCountryLimits[code].ip} / 域名 ${data.qualityCountryLimits[code].domain} · <b id="country-count-${escapeHtml(code)}">${data.qualityCountryCounts[code] || 0}</b> IP</small>
                </button>
            `,
              )
              .join("")}
        </section>
        <section class="address-list-section" id="ip-list-section" aria-label="地址列表">
        <div class="list-tabs" role="tablist" aria-label="地址列表">
            <button type="button" class="list-tab active" id="list-tab-premium" role="tab" aria-selected="true" onclick="switchAddressList('premium')">优质 IP <span id="premium-tab-count">${data.speedCategoryCounts.premium}</span></button>
            <button type="button" class="list-tab" id="list-tab-premium-domain" role="tab" aria-selected="false" onclick="switchAddressList('premium-domain')">优质域名 <span id="premium-domain-tab-count">${data.speedCategoryCounts["premium-domain"]}</span></button>
            <button type="button" class="list-tab" id="list-tab-backup" role="tab" aria-selected="false" onclick="switchAddressList('backup')">备用 IP <span id="backup-tab-count">${data.speedCategoryCounts.backup}</span></button>
            <button type="button" class="list-tab" id="list-tab-untested" role="tab" aria-selected="false" onclick="switchAddressList('untested')">未测速 IP <span id="untested-tab-count">${data.speedCategoryCounts.untested}</span></button>
        </div>
        <div class="card list-view-card" id="ip-list-card">
            <div class="ip-list-header">
                <h2>地址列表</h2>
                <div>
                    <a class="small-btn quality-ip-text-link" href="/quality-ips.txt?type=ip&amp;countries=${encodeURIComponent(selectedQualityCountries.join(","))}" target="_blank" rel="noopener">优质 IP 文本</a>
                    <a class="small-btn quality-domain-text-link" href="/quality-ips.txt?type=domain&amp;countries=${encodeURIComponent(selectedQualityCountries.join(","))}" target="_blank" rel="noopener">优质域名文本</a>
                    <a class="small-btn all-ips-text-link" href="${ipTxtHref}" target="_blank" rel="noopener">全部 IP 文本</a>
                    <a class="small-btn all-ips-download-link" href="${ipsHref}" download="cloudflare_ips.txt">下载全部 IP</a>
                </div>
            </div>
            <div class="speed-test-progress" id="speed-test-progress">
                <div class="speed-test-progress-bar" id="speed-test-progress-bar"></div>
            </div>
            <div style="text-align: center; margin: 8px 0; font-size: 0.9rem; color: #64748b;" id="speed-test-status">准备测速...</div>
            <div style="text-align: center; margin: 8px 0; font-size: 0.85rem; color: #64748b;">
                测速方式：下载 300 KB 样本并按实际耗时估算带宽；手动可按优质、备用或未测速分类，定时任务按 Cron 与默认数量执行。
                最近一次定时任务 Cron：${data.cronSchedule ? escapeHtml(data.cronSchedule) : "尚未从 Cloudflare 定时触发器读取"}；Worker 首次运行后显示实际计划。
            </div>
            <div class="ip-list" id="ip-list">
                ${
                  data.ips && data.ips.length > 0
                    ? data.ips
                        .map((item) => {
                          // 确保 address 存在，使用安全默认值
                          const address = item?.address || "unknown";
                          // 优化：用 btoa 作为 safeId，避免特殊字符
                          const safeId = simpleHash(address);
                          const parsed = parseAddressWithPort(address);
                          const typeLabel =
                            parsed.type === "ipv4"
                              ? "IPv4"
                              : parsed.type === "ipv6"
                                ? "IPv6"
                                : parsed.type === "domain"
                                  ? "域名"
                                  : "";
                          let displayAddress =
                            parsed.type === "ipv6"
                              ? "[" + parsed.address + "]"
                              : parsed.address;
                          if (parsed.port !== 443)
                            displayAddress += ":" + parsed.port;
                          const location = String(item?.location || "未知");
                          const countryCode =
                            item?.countryCode || getCountryCodeForIP(item);
                          const countryName = countryCode
                            ? SUPPORTED_COUNTRIES[countryCode]
                            : "";
                          const safeDisplayAddress = escapeHtml(displayAddress);
                          const safeLocation = escapeHtml(
                            formatLocationLabel(location),
                          );
                          const safeCountryName = countryName
                            ? escapeHtml(countryName)
                            : "";
                          return `
                    <div class="ip-item" data-ip="${escapeHtml(address)}" data-country="${escapeHtml(countryCode || "")}" data-speed-rank="${item.speedRank || ""}" data-speed-category="${item.speedCategory || "untested"}" data-speed-tested="${item.speedCategory !== "untested" ? "true" : "false"}">
                        <div class="ip-info">
                            <div class="ip-main-info">
                                <button class="ip-address" type="button" data-select-ip="${escapeHtml(address)}" aria-pressed="false" title="选中此地址">${safeDisplayAddress}${typeLabel ? `<span class="ip-type-badge">${typeLabel}</span>` : ""}${safeCountryName ? `<span class="ip-country-badge">${safeCountryName}</span>` : ""}</button>
                                <span class="ip-location">线路 · ${safeLocation}</span>
                            </div>
                            <span class="speed-result ${isSpeedTestedIP(item) ? getLatencySpeedClass(item?.latency, data.maxLatency) : ""}" id="speed-${safeId}">${item?.latency ? Math.round(item.latency) + "ms" : "-"}</span>
                            <span class="speed-result bandwidth-result ${isSpeedTestedIP(item) ? getBandwidthSpeedClass(item?.bandwidth, data.minBandwidth) : ""}" id="bandwidth-${safeId}">${Number.isFinite(Number(item?.bandwidth)) && Number(item.bandwidth) > 0 ? Number(item.bandwidth).toFixed(2) + " MB/s" : "-- MB/s"}</span>
                        </div>
                        <div class="action-buttons">
                            <button class="small-btn" onclick="testSingleIP('${escapeHtml(address).replace(/'/g, "\\'")}')" id="test-${safeId}">测速</button>
                            <button class="small-btn" onclick="copyIP('${escapeHtml(displayAddress).replace(/'/g, "\\'")}', '${escapeHtml(item?.location || "未知").replace(/'/g, "\\'")}', ${item?.latency || "null"})">复制</button>
                        </div>
                    </div>
                  `;
                        })
                        .join("")
                    : '<p style="text-align: center; color: #64748b; padding: 40px;">暂无 IP/域名 地址数据，请点击更新按钮获取</p>'
                }
            </div>
            <p id="speed-category-empty" hidden style="text-align: center; color: #64748b; padding: 24px;"></p>
        </div>
        </section>
          <div class="card" id="data-sources">
              <div class="sources-header">
                  <h2>数据来源</h2>
              </div>
              <div class="sources" id="sources">
                  ${
                    data.sources
                      ? data.sources
                          .map((source) => {
                            let displayName = source.name;
                            try {
                              displayName = new URL(source.name).hostname;
                            } catch (_) {}
                            const sourceStatus =
                              source.status === "success"
                                ? `<span class="source-status success">✓ 获取 ${Number(source.count) || 0} 个地址</span>`
                                : source.status === "pending"
                                  ? `<span class="source-status pending">尚未采集</span>`
                                  : `<span class="source-status error">失败：${escapeHtml(source.error || "未知")}</span>`;
                            return `
      <div class="source ${source.status === "success" ? "" : "error"}">
          <strong class="source-name">${escapeHtml(displayName)}</strong>
          ${sourceStatus}
      </div>
    `;
                          })
                          .join("")
                      : '<p style="color: #64748b;">暂无数据来源信息</p>'
                  }
              </div>
          </div>
		<div class="footer">
			<p>
				<img src="/favicon.png" class="footer-logo" title="logo" />
				多数据源采集优选管理面板 © ${new Date().getFullYear()} | 增强版
			</p>
		</div>
    </main>
    </div>
    ${
      showSetPassword
        ? `
    <div class="admin-overlay" id="admin-overlay">
        <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-auth-title">
            <div class="admin-modal-header">
                <span class="admin-modal-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z"></path><path d="m9 12 2 2 4-4"></path></svg></span>
                <div><div class="admin-modal-eyebrow">ACCOUNT SECURITY</div><h3 id="admin-auth-title">设置管理员密码</h3></div>
            </div>
            <p>首次使用，请设置管理员密码以保护管理面板。</p>
            <label for="set-password-input">管理员密码</label>
            <input type="password" id="set-password-input" autocomplete="new-password" minlength="4" placeholder="至少 4 位字符">
            <div class="admin-modal-actions">
                <button class="btn-secondary" type="button" onclick="closeAdminOverlay()">取消</button>
                <button class="btn-primary" type="button" onclick="setAdminPassword()">设置密码</button>
            </div>
        </div>
    </div>
    `
        : ""
    }
    ${
      showLogin
        ? `
    <div class="admin-overlay" id="admin-overlay">
        <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-auth-title">
            <div class="admin-modal-header">
                <span class="admin-modal-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z"></path><path d="m9 12 2 2 4-4"></path></svg></span>
                <div><div class="admin-modal-eyebrow">ACCOUNT SECURITY</div><h3 id="admin-auth-title">管理员登录</h3></div>
            </div>
            <p>登录以继续管理采集任务、测速和数据设置。</p>
            <label for="login-password-input">管理员密码</label>
            <input type="password" id="login-password-input" autocomplete="current-password" placeholder="请输入密码">
            <div class="admin-modal-actions">
                <button class="btn-primary" type="button" onclick="loginAdmin()">登录管理面板</button>
            </div>
        </div>
    </div>
    `
        : ""
    }
    <div class="modal" id="speedtest-count-modal">
        <div class="modal-content">
            <h3>手动测速设置</h3>
            <p>仅影响手动测速；输入 0 测速全部。单个 IP 请求超过设定秒数未响应会加入黑名单，需在黑名单管理中手动移除。定时测速阈值独立设置。</p>
            <div class="rule-form-grid">
                <div class="rule-field">
                    <label for="speedtest-count">手动测速数量</label>
                    <input type="number" id="speedtest-count" min="0" step="1" value="${data.speedTestCount}" aria-label="手动测速数量；输入 0 测速全部节点">
                </div>
                <div class="rule-field">
                    <label for="manual-speedtest-batch-size-input">每批 IP 数</label>
                    <input type="number" id="manual-speedtest-batch-size-input" min="1" max="50" step="1" value="${data.manualBatchSize}" aria-label="手动测速每批 IP 数，1 到 50">
                </div>
                <div class="rule-field">
                    <label for="manual-batch-interval-input">批次间隔（秒）</label>
                    <input type="number" id="manual-batch-interval-input" min="0" max="60" step="1" value="${data.manualBatchIntervalSeconds}">
                </div>
                <div class="rule-field">
                    <label for="manual-address-interval-input">IP 请求间隔（秒）</label>
                    <input type="number" id="manual-address-interval-input" min="0" max="60" step="1" value="${data.manualAddressIntervalSeconds}">
                </div>
                <div class="rule-field">
                    <label for="manual-speedtest-timeout-input">单个 IP 超时自动拉黑（秒）</label>
                    <input type="number" id="manual-speedtest-timeout-input" min="1" max="60" step="1" value="${data.manualSpeedTestTimeoutSeconds}">
                </div>
            </div>
            <div class="settings-row">
                <button class="small-btn" id="save-speedtest-count" type="button" onclick="saveSpeedTestCount(true)">保存</button>
            </div>
            <div class="settings-row">
                <span id="speedtest-estimate">预计流量约 14.3 MiB</span>
                <span id="speedtest-count-status" role="status">已保存为默认测速数量</span>
            </div>
            <div class="modal-buttons">
                <button class="button button-secondary" type="button" onclick="closeSettingsModal('speedtest-count-modal')">关闭</button>
            </div>
        </div>
    </div>
    <div class="modal" id="scheduled-speedtest-settings-modal">
        <div class="modal-content">
            <h3>定时测速规则</h3>
            <p>仅影响 Cron。每批按顺序测速并保存结果；超时未响应的 IP 会加入黑名单，需手动移除。当前正在执行的任务继续使用创建时的规则。</p>
            <div class="rule-form-grid">
                <div class="rule-field">
                    <label for="scheduled-speedtest-batch-size">每批 IP 数</label>
                    <input type="number" id="scheduled-speedtest-batch-size" min="1" max="40" step="1" value="${data.scheduledSpeedTestBatchSize}" oninput="updateScheduledSpeedTestEstimate()">
                </div>
                <div class="rule-field">
                    <label for="scheduled-speedtest-batch-interval">批次间隔</label>
                    <input type="number" id="scheduled-speedtest-batch-interval" min="0" max="60" step="1" value="${data.scheduledSpeedTestBatchIntervalSeconds}" oninput="updateScheduledSpeedTestEstimate()" aria-label="批次间隔，单位秒">
                </div>
                <div class="rule-field">
                    <label for="scheduled-speedtest-address-interval">IP 请求间隔</label>
                    <input type="number" id="scheduled-speedtest-address-interval" min="0" max="60" step="1" value="${data.scheduledSpeedTestAddressIntervalSeconds}" oninput="updateScheduledSpeedTestEstimate()" aria-label="每个 IP 请求间隔，单位秒">
                </div>
                <div class="rule-field">
                    <label for="scheduled-speedtest-timeout">单个 IP 超时自动拉黑（秒）</label>
                    <input type="number" id="scheduled-speedtest-timeout" min="1" max="60" step="1" value="${data.scheduledSpeedTestTimeoutSeconds}" aria-label="单个 IP 测速超时秒数，超时后自动加入黑名单">
                </div>
            </div>
            <div class="rule-preview" aria-label="定时测速规则预览">
                <div class="rule-preview-item"><strong>批量范围</strong><span>1 至 40 个 IP / 批</span></div>
                <div class="rule-preview-item"><strong>恢复方式</strong><span>未完成任务由下一次 Cron 继续</span></div>
                <div class="rule-preview-item"><strong>预计流量</strong><span id="scheduled-speedtest-estimate" data-address-count="${data.scheduledSpeedTestEstimateAddressCount}" data-average-request-ms="${data.scheduledSpeedTestAverageRequestMs}" data-estimate-fallback="${data.scheduledSpeedTestAverageRequestFallback}"></span></div>
            </div>
            <small id="scheduled-speedtest-settings-status" role="status">当前规则应用于下一次定时测速。</small>
            <div class="modal-buttons">
                <button class="button button-secondary" type="button" onclick="closeSettingsModal('scheduled-speedtest-settings-modal')">关闭</button>
                <button class="button button-success" id="save-scheduled-speedtest-settings" type="button" onclick="saveScheduledSpeedTestSettings()">保存规则</button>
            </div>
        </div>
    </div>
    <div class="modal" id="schedule-api-modal">
        <div class="modal-content">
            <h3>Cloudflare API 设置</h3>
            <div class="settings-row">
                <label for="schedule-api-token">Cloudflare API Token</label>
                <input type="password" id="schedule-api-token" autocomplete="new-password" placeholder="${data.scheduleApiTokenSaved ? "Token 已保存在 KV；留空保持不变，输入新 Token 可替换" : "保存后写入 IP_STORAGE KV"}" oninput="invalidateScheduleApiVerification()">
            </div>
            <small id="schedule-token-status" role="status">${data.scheduleApiTokenSaved ? "Token 已保存在 IP_STORAGE KV。输入框保持空白以避免回显；留空表示保留当前 Token。" : data.scheduleApiTokenConfigured ? "Token 由 CLOUDFLARE_API_TOKEN Worker Secret 提供；输入框保持空白以避免回显。" : "连通性测试不会保存 Token；保存 API 设置时会尝试写入 KV，若额度耗尽则仅在当前页面临时使用。"}</small>
            <div class="settings-row">
                <label for="schedule-account-id">Account ID</label>
                <input type="text" id="schedule-account-id" value="${escapeHtml(data.scheduleAccountId)}" placeholder="32 位 Account ID" autocomplete="off" oninput="invalidateScheduleApiVerification()">
            </div>
            <div class="settings-row">
                <label for="schedule-script-name">Worker 脚本名</label>
                <input type="text" id="schedule-script-name" value="${escapeHtml(data.scheduleScriptName)}" placeholder="Cloudflare Worker Script Name" autocomplete="off" oninput="invalidateScheduleApiVerification()">
                <button class="small-btn" id="find-schedule-workers" type="button" onclick="findScheduleWorkers()">读取账户 Worker 列表</button>
            </div>
            <div class="settings-row" id="schedule-workers-picker-row" hidden>
                <label for="schedule-workers-picker">账户中的 Worker</label>
                <select id="schedule-workers-picker" aria-label="选择账户中的 Worker"></select>
                <button class="small-btn" type="button" onclick="useSelectedScheduleWorker()">使用所选脚本名</button>
            </div>
            <small>Token 不会回显或写入浏览器存储。请使用最小权限；详细权限与 Secret 配置见下方。</small>
            <details class="settings-help">
                <summary>权限与 Secret 配置</summary>
                <p>读取和测试需要 Account.Workers Scripts:Read；保存 Cron 还需要 Workers Scripts:Edit。KV 写入受限时，可在 Worker Variables and Secrets 中设置 CLOUDFLARE_ACCOUNT_ID、CLOUDFLARE_SCRIPT_NAME 和 CLOUDFLARE_API_TOKEN。</p>
            </details>
            <div class="settings-row">
                <button class="small-btn" id="test-schedule-api" type="button" onclick="testScheduleApi()">测试 API 连通性</button>
                <small id="schedule-api-test-status" role="status">连通测试只读 Worker Cron，不会保存 API 参数或修改 Cloudflare 定时配置。</small>
            </div>
            <div class="settings-row">
                <button class="small-btn" id="save-schedule-api-config" type="button"
                    data-saved-account-id="${escapeHtml(data.scheduleAccountId)}"
                    data-saved-script-name="${escapeHtml(data.scheduleScriptName)}"
                    data-config-persisted="${data.scheduleApiConfigured}"
                    data-token-saved="${data.scheduleApiTokenSaved}"
                    onclick="saveScheduleApiConfig()">保存 API 设置</button>
                <small id="schedule-api-config-status" role="status">${data.scheduleApiConfigured ? `Account ID 与 Worker 脚本名已配置；Token ${data.scheduleApiTokenSaved ? "已保存于 KV" : data.scheduleApiTokenConfigured ? "由 Worker Secret 提供" : "尚未配置"}。` : "先保存 API 参数，再单独保存定时时间。"}</small>
            </div>
            <div class="modal-buttons">
                <button class="button button-secondary" type="button" onclick="closeSettingsModal('schedule-api-modal')">关闭</button>
            </div>
        </div>
    </div>
    <div class="modal" id="schedule-time-modal">
        <div class="modal-content">
            <h3>定时运行 Cron 字段</h3>
            <p>先配置 Cloudflare API，再保存 Cron。Trigger 由 Cloudflare 调度执行。</p>
            <div class="schedule-interval-form">
                <div class="rule-field">
                    <label for="schedule-interval-value">间隔数值</label>
                    <input type="number" id="schedule-interval-value" min="1" max="59" step="1" value="${data.scheduleInterval.value}" placeholder="4" aria-label="定时运行间隔数值">
                </div>
                <div class="rule-field">
                    <label for="schedule-interval-unit">时间单位</label>
                    <select id="schedule-interval-unit" aria-label="定时运行间隔单位" onchange="updateScheduleIntervalLimit()">
                        <option value="minute" ${data.scheduleInterval.unit === "minute" ? "selected" : ""}>分钟</option>
                        <option value="hour" ${data.scheduleInterval.unit === "hour" ? "selected" : ""}>小时</option>
                        <option value="day" ${data.scheduleInterval.unit === "day" ? "selected" : ""}>天</option>
                        <option value="month" ${data.scheduleInterval.unit === "month" ? "selected" : ""}>月</option>
                    </select>
                </div>
                <button class="small-btn" type="button" onclick="applyScheduleInterval()">应用间隔</button>
            </div>
            <small>间隔模式会生成一条 UTC Cron Trigger，避免时区换算拆成多条。天按每月日期步长（从 1 日起），月按月份步长（从 1 月起）；它们是日历周期，不是从保存时刻开始累计的精确时长。</small>
            <details class="advanced-cron-settings">
                <summary>高级：自定义五字段 Cron</summary>
                <small>高级字段中，数字 4 表示字段值为 4；例如分钟填 4 是每小时第 4 分钟。要每 4 分钟运行，请使用上方间隔模式或填 */4。</small>
                <div class="cron-field-grid">
                <div class="settings-row">
                    <label for="schedule-cron-minute">分钟</label>
                    <input type="text" id="schedule-cron-minute" value="${escapeHtml(data.scheduleFields.minute)}" placeholder="0-59 或 *">
                </div>
                <div class="settings-row">
                    <label for="schedule-cron-hour">小时</label>
                    <input type="text" id="schedule-cron-hour" value="${escapeHtml(data.scheduleFields.hour)}" placeholder="0-23 或 *">
                </div>
                <div class="settings-row">
                    <label for="schedule-cron-day-of-month">月中的某一天</label>
                    <input type="text" id="schedule-cron-day-of-month" value="${escapeHtml(data.scheduleFields.dayOfMonth)}" placeholder="1-31 或 *">
                </div>
                <div class="settings-row">
                    <label for="schedule-cron-month">月份</label>
                    <input type="text" id="schedule-cron-month" value="${escapeHtml(data.scheduleFields.month)}" placeholder="1-12 或 *">
                </div>
                <div class="settings-row">
                    <label for="schedule-cron-day-of-week">周中的某一天</label>
                    <input type="text" id="schedule-cron-day-of-week" value="${escapeHtml(data.scheduleFields.dayOfWeek)}" placeholder="0-6，0 为周日">
                </div>
                </div>
            </details>
            <div class="settings-row">
                <label for="scheduled-timezone">时区</label>
                <select id="scheduled-timezone" aria-label="定时运行时区">
                    <option value="Asia/Shanghai" ${data.scheduleTimezone === "Asia/Shanghai" ? "selected" : ""}>Asia/Shanghai（本地时间）</option>
                    <option value="UTC" ${data.scheduleTimezone === "UTC" ? "selected" : ""}>UTC</option>
                </select>
                <button class="small-btn" id="save-scheduled-times" type="button" onclick="saveScheduledTimes()">保存</button>
            </div>
            <small id="scheduled-time-format">保存将替换该 Worker 的全部 Cron。字段顺序：分、时、日、月、周；支持列表、范围和步长。</small>
            <small id="scheduled-times-status" role="status">${data.scheduleApiConfigured ? "保存定时时间会通过 Cloudflare API 替换此 Worker 脚本的全部 Cron Trigger。" : "请先保存 API 设置，再保存定时时间；确认后会更新 Cron Trigger。"}</small>
            <div class="modal-buttons">
                <button class="button button-secondary" type="button" onclick="closeSettingsModal('schedule-time-modal')">关闭</button>
            </div>
        </div>
    </div>
    <div class="modal" id="scheduled-log-modal">
        <div class="modal-content">
            <h3>定时任务日志</h3>
            <p>仅显示定时运行情况、功能报错和 IP 池情况。</p>
            <div id="scheduled-log-list" class="settings-log-list" role="status" aria-live="polite">
                <small>正在加载日志...</small>
            </div>
            <div class="modal-buttons">
                <button class="button button-secondary" type="button" onclick="closeSettingsModal('scheduled-log-modal')">关闭</button>
                <button class="button button-success" type="button" onclick="loadScheduledErrorLogs()">刷新日志</button>
            </div>
        </div>
    </div>
    <div class="modal" id="speedtest-threshold-modal">
        <div class="modal-content">
            <h3>测速阈值</h3>
            <p>按地区、数量和阈值筛选优质地址；未达标的测速结果归入备用 IP。</p>
            <div class="settings-row">
                <label for="max-speedtest-latency">测速最高延迟（ms）</label>
                <input type="number" id="max-speedtest-latency" min="1" step="1" value="${data.maxLatency}" aria-label="优质 IP 允许的最高延迟，单位毫秒">
                <button class="small-btn" id="save-max-speedtest-latency" type="button" onclick="saveSpeedTestThreshold('maxLatency')">保存</button>
            </div>
            <div class="settings-row">
                <label for="min-speedtest-bandwidth">测速最低带宽（MB/s）</label>
                <input type="number" id="min-speedtest-bandwidth" min="0" step="0.1" value="${data.minBandwidth}" aria-label="优质 IP 要求的最低带宽，单位 MB/s；0 表示不限制">
                <button class="small-btn" id="save-min-speedtest-bandwidth" type="button" onclick="saveSpeedTestThreshold('minBandwidth')">保存</button>
            </div>
            <div class="settings-row" style="margin-top: 10px;">
                <span id="max-speedtest-latency-status" role="status">已保存参考值：最高延迟</span>
                <span id="min-speedtest-bandwidth-status" role="status">已保存参考值：最低带宽</span>
            </div>
            <div class="modal-buttons">
                <button class="button button-secondary" type="button" onclick="closeSettingsModal('speedtest-threshold-modal')">关闭</button>
            </div>
        </div>
    </div>
    <div class="modal" id="quality-countries-modal">
        <div class="modal-content">
            <h3>优选国家 / 地区</h3>
            <p>选择地区并设置每地 IP、域名上限（0 表示不收录，最大 1000）。</p>
            <div class="country-settings-grid" id="country-settings-grid">
                <div class="country-option" aria-hidden="true">
                    <span></span><span class="quality-country-limit-label">优质 IP</span><span class="quality-country-limit-label">优质域名</span>
                </div>
                ${Object.entries(SUPPORTED_COUNTRIES)
                  .map(
                    ([code, name]) => `
                    <div class="country-option">
                        <label for="quality-country-${code}">
                            <input type="checkbox" id="quality-country-${code}" name="quality-country" value="${code}" ${selectedQualityCountries.includes(code) ? "checked" : ""}>
                            <span>${name} <span class="country-option-keywords">(${code.toLowerCase()}${code === "JP" ? ", japan" : ""})</span></span>
                        </label>
                        <input type="number" id="quality-country-ip-limit-${code}" class="quality-country-limit" name="quality-country-limit" data-country="${code}" data-type="ip" min="0" max="1000" step="1" value="${data.qualityCountryLimits[code].ip}" aria-label="${name}优质 IP 数量">
                        <input type="number" id="quality-country-domain-limit-${code}" class="quality-country-limit" name="quality-country-limit" data-country="${code}" data-type="domain" min="0" max="1000" step="1" value="${data.qualityCountryLimits[code].domain}" aria-label="${name}优质域名数量">
                    </div>
                `,
                  )
                  .join("")}
            </div>
            <div class="settings-row">
                <span id="quality-countries-status" role="status">默认选择香港、台湾、韩国、日本、新加坡、美国</span>
                <button class="small-btn" id="save-quality-countries" type="button" onclick="saveQualityCountries(true)">保存地区和数量</button>
            </div>
            <div class="modal-buttons">
                <button class="button button-secondary" type="button" onclick="closeSettingsModal('quality-countries-modal')">关闭</button>
            </div>
        </div>
    </div>
    <div class="modal" id="display-limit-modal">
        <div class="modal-content">
            <h3>地址列表显示数量</h3>
            <p>留空或输入 0 表示不限制。</p>
            <div class="settings-row">
                <label for="ip-limit-input">显示数量</label>
                <input type="number" id="ip-limit-input" min="0" placeholder="不限制" value="${data.limit || ""}">
                <button class="small-btn" onclick="setIpLimit()" id="set-limit-btn">保存</button>
            </div>
            <small id="ip-limit-status" role="status">应用于当前地址列表</small>
            <div class="modal-buttons">
                <button class="button button-secondary" type="button" onclick="closeSettingsModal('display-limit-modal')">关闭</button>
            </div>
        </div>
    </div>
    <div class="modal" id="path-modal">
        <div class="modal-content">
            <h3>访问路径</h3>
            <p>保存后，查看和下载链接使用此路径。</p>
            <input type="text" id="path-input" placeholder="e.g. */*/*" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-input); background: var(--input-bg); color: var(--input-text); margin-bottom: 16px;">
            <div class="modal-buttons">
                <button class="button button-secondary" onclick="closePathModal()">取消</button>
                <button class="button button-success" onclick="savePath()">保存</button>
            </div>
        </div>
    </div>
    <div class="modal" id="sources-modal">
        <div class="modal-content">
            <h3>数据来源</h3>
            <p>每行填写一个来源 URL。清空后将停止采集。</p>
            <textarea id="sources-textarea" rows="10" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-input); background: var(--input-bg); color: var(--input-text);">${escapeHtml((data.sources_urls || []).join("\\n"))}</textarea>
            <div class="modal-buttons">
                <button class="button button-secondary" onclick="closeSourcesModal()">取消</button>
                <button class="button button-success" onclick="saveSources()">保存</button>
            </div>
        </div>
    </div>
    <div class="modal" id="blacklist-modal">
        <div class="modal-content">
            <h3>黑名单</h3>
            <p>每行一个地址。用双引号包裹域名可同时排除其子域名。</p>
            <textarea id="blacklist-textarea" rows="10" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-input); background: var(--input-bg); color: var(--input-text);">${escapeHtml(data.blacklist.join("\\n"))}</textarea>
            <div class="modal-buttons">
                <button class="button button-secondary" onclick="closeBlacklistModal()">取消</button>
                <button class="button button-success" onclick="saveBlacklist()">保存</button>
            </div>
        </div>
    </div>
        ${
          showAdminButton
            ? `<div class="modal" id="clear-ips-modal">
            <div class="modal-content">
                <h3>清理 IP 数据</h3>
                <p>清理会删除所选类别的当前数据、历史快照和测速缓存，且无法撤销。</p>
                <div class="settings-row">
                    <label for="clear-ips-category">清理范围</label>
                    <select id="clear-ips-category">
                        <option value="premium">优质 IP</option>
                        <option value="premium-domain">优质域名</option>
                        <option value="backup">备用 IP</option>
                        <option value="untested">未测速 IP</option>
                        <option value="all">所有 IP</option>
                    </select>
                    <button class="small-btn" id="clear-ips-button" type="button" onclick="clearIPData()">清理</button>
                </div>
                <small id="clear-ips-status" role="status">数据源、黑名单、管理员密码及其他设置会保留。</small>
                <div class="modal-buttons">
                    <button class="button button-secondary" type="button" onclick="closeSettingsModal('clear-ips-modal')">取消</button>
                </div>
            </div>
        </div>`
            : ""
        }
    <script>
        // ==================== 主题管理 ====================
        const ThemeManager = {
            STORAGE_KEY: 'cf-ip-collector-theme',
            currentTheme: 'dark',
            init() {
                try {
                    const savedTheme = localStorage.getItem(this.STORAGE_KEY);
                    this.currentTheme = ['light', 'dark'].includes(savedTheme)
                        ? savedTheme
                        : 'dark';
                } catch (error) {
                    console.warn('无法读取主题偏好，将使用默认主题。', error);
                    this.currentTheme = 'dark';
                }
                this.apply(this.currentTheme);
            },
            apply(mode) {
                const html = document.documentElement;
                const metaLight = document.getElementById('meta-theme-light');
                const metaDark = document.getElementById('meta-theme-dark');

                if (mode === 'system') {
                    html.removeAttribute('data-theme');
                    if (metaLight) metaLight.setAttribute('content', '#3b82f6');
                    if (metaDark) metaDark.setAttribute('content', '#0f172a');
                } else {
                    html.setAttribute('data-theme', mode);
                    const color = mode === 'dark' ? '#0f172a' : '#3b82f6';
                    if (metaLight) metaLight.setAttribute('content', color);
                    if (metaDark) metaDark.setAttribute('content', color);
                }
                
                this.updateThemeIcon(mode);
            },
            toggle() {
                const modes = ['light', 'dark', 'system'];
                const currentIndex = modes.indexOf(this.currentTheme);
                const nextIndex = (currentIndex + 1) % modes.length;
                const nextMode = modes[nextIndex];
                
                try {
                    if (nextMode === 'system') {
                        localStorage.removeItem(this.STORAGE_KEY);
                    } else {
                        localStorage.setItem(this.STORAGE_KEY, nextMode);
                    }
                } catch (error) {
                    console.warn('主题偏好无法保存，将仅在当前页面生效。', error);
                }
                
                this.currentTheme = nextMode;
                this.apply(nextMode);
                this.showThemeNotification(nextMode);
            },
            updateThemeIcon(mode) {
                const iconContainer = document.getElementById('theme-icon');
                if (!iconContainer) return;
                
                const labels = {
                    'light': '浅色',
                    'dark': '深色',
                    'system': '系统'
                };
                iconContainer.textContent = labels[mode];
            },
            showThemeNotification(mode) {
                const messages = {
                    'light': '已切换到浅色模式',
                    'dark': '已切换到深色模式',
                    'system': '已切换到系统模式'
                };
                const notification = document.createElement('div');
                notification.style.cssText = [
                    'position: fixed',
                    'top: 20px',
                    'right: 20px',
                    'background: var(--bg-card)',
                    'color: var(--text-primary)',
                    'padding: 12px 20px',
                    'border-radius: 8px',
                    'box-shadow: var(--shadow-lg)',
                    'border: 1px solid var(--border-primary)',
                    'z-index: 10000',
                    'font-size: 0.9rem'
                ].join(';') + ';';
                notification.textContent = messages[mode];
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 2000);
            }
        };
        // 页面加载时初始化主题
        document.addEventListener('DOMContentLoaded', () => {
            ThemeManager.init();
        });
        // 主题切换函数（供按钮调用）
        function toggleTheme() {
            ThemeManager.toggle();
        }
        // HTML转义函数（客户端版本）
        function escapeHtml(text) {
          if (text === null || text === undefined) return '';
          return text.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }
        function simpleHash(str) {
          if (!str) return '';
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) | 0;
          }
          return (hash >>> 0).toString(36);
        }
        // 管理员相关
        function toggleAdminDropdown() {
            const dropdown = document.getElementById('admin-dropdown');
            const button = document.querySelector('.sidebar-footer .admin-button');
            if (!dropdown || !button) return;
            const isOpen = dropdown.style.display !== 'block';
            dropdown.style.display = isOpen ? 'block' : 'none';
            button.setAttribute('aria-expanded', String(isOpen));
            updateStatusCardOverlayLayer();
        }
        function updateStatusCardOverlayLayer() {
            const adminDropdown = document.getElementById('admin-dropdown');
            const adminPanel = adminDropdown && adminDropdown.closest('.admin-panel');
            if (adminPanel) adminPanel.classList.toggle('overlay-open', adminDropdown.style.display === 'block');
        }
        function setActiveDashboardNav(link) {
            if (!link || !link.matches('a')) return;
            const main = document.querySelector('main.container');
            const settingsPage = document.getElementById('settings-page');
            const settingsButton = document.querySelector('.dashboard-nav button[aria-controls="settings-page"]');
            if (main) main.classList.remove('settings-page-active');
            if (settingsPage) settingsPage.hidden = true;
            if (settingsButton) {
                settingsButton.classList.remove('active');
                settingsButton.removeAttribute('aria-current');
            }
            document.querySelectorAll('.dashboard-nav a').forEach(function(item) {
                const active = item === link;
                item.classList.toggle('active', active);
                if (active) item.setAttribute('aria-current', 'page');
                else item.removeAttribute('aria-current');
            });
            document.querySelectorAll('.dashboard-nav button').forEach(function(item) {
                item.classList.remove('active');
            });
        }
        function setActiveDashboardNavButton(button) {
            document.querySelectorAll('.dashboard-nav a').forEach(function(item) {
                item.classList.remove('active');
                item.removeAttribute('aria-current');
            });
            document.querySelectorAll('.dashboard-nav button').forEach(function(item) {
                const active = item === button;
                item.classList.toggle('active', active);
                if (active) item.setAttribute('aria-current', 'page');
                else item.removeAttribute('aria-current');
            });
        }
        function openDashboardSettings(button) {
            setActiveDashboardNavButton(button);
            const main = document.querySelector('main.container');
            const settingsPage = document.getElementById('settings-page');
            if (!main || !settingsPage) return;
            main.classList.add('settings-page-active');
            settingsPage.hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        function openSettingsModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
                const resetMap = {
                    'speedtest-count-modal': ['manual-speedtest', 'speedtest-count-status'],
                    'scheduled-speedtest-settings-modal': ['scheduled-speedtest', 'scheduled-speedtest-settings-status'],
                    'speedtest-threshold-modal': ['speedtest-threshold', 'speedtest-threshold-status'],
                    'quality-countries-modal': ['quality-countries', 'quality-countries-status'],
                    'display-limit-modal': ['display-limit', 'display-limit-status'],
                    'sources-modal': ['sources', 'sources-status'],
                    'blacklist-modal': ['blacklist', 'blacklist-status'],
                    'schedule-api-modal': ['schedule-api', 'schedule-token-status'],
                    'schedule-time-modal': ['schedule-times', 'schedule-time-status'],
                    'custom-path-modal': ['custom-path', 'custom-path-status']
                };
                const mapping = resetMap[modalId];
                if (mapping) {
                    const buttons = modal.querySelector('.modal-buttons');
                    if (buttons && !buttons.querySelector('[data-reset-setting]')) {
                        const reset = document.createElement('button');
                        reset.type = 'button';
                        reset.className = 'button button-secondary';
                        reset.dataset.resetSetting = mapping[0];
                        reset.textContent = '恢复默认值';
                        reset.onclick = () => resetSettingToDefault(mapping[0], modalId, mapping[1]);
                        buttons.insertBefore(reset, buttons.firstChild);
                    }
                }
            }
            if (modalId === 'scheduled-log-modal') {
                loadScheduledErrorLogs();
            }
            if (modalId === 'scheduled-speedtest-settings-modal') {
                updateScheduledSpeedTestEstimate();
            }
            if (modalId === 'schedule-time-modal' && !scheduleCronLoadedFromCloudflare) {
                loadScheduleFromCloudflare();
            }
        }
        function closeSettingsModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        }
        async function resetSettingToDefault(setting, modalId, statusId) {
            if (!confirm('确定恢复此功能的默认值吗？')) return;
            try {
                const response = await fetch('/reset-setting', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ setting })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || '恢复失败');
                const status = statusId ? document.getElementById(statusId) : null;
                if (status) status.textContent = '已恢复默认值，保存后立即生效。';
                window.setTimeout(() => location.reload(), 450);
            } catch (error) {
                alert(error.message || '恢复默认值失败');
            }
        }
        async function downloadSettingsBackup() {
            try {
                const response = await fetch('/backup-settings', { credentials: 'same-origin', cache: 'no-store' });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || '备份失败');
                const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'cf-ip-harvester-settings-' + new Date().toISOString().slice(0, 10) + '.json';
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            } catch (error) {
                alert(error.message || '导出备份失败');
            }
        }
        async function restoreSettingsBackup(input) {
            const file = input.files && input.files[0];
            if (!file) return;
            try {
                const backup = JSON.parse(await file.text());
                if (backup.version !== 1 || !backup.settings || typeof backup.settings !== 'object') {
                    throw new Error('备份文件格式无效');
                }
                if (!confirm('恢复备份将覆盖当前设置，是否继续？')) return;
                const response = await fetch('/restore-settings', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings: backup.settings })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || '恢复失败');
                alert('已恢复 ' + (result.restoredKeys || 0) + ' 项设置');
                location.reload();
            } catch (error) {
                alert(error.message || '恢复备份失败');
            } finally {
                input.value = '';
            }
        }
        async function loadScheduledErrorLogs() {
            const list = document.getElementById('scheduled-log-list');
            if (!list) return;
            list.innerHTML = '<small>正在加载日志...</small>';
            try {
                const response = await fetch('/scheduled-error-logs', {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store'
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.error || '无法读取定时任务日志');
                }
                const eventLabels = {
                    scheduled_history_summary: '历史运行摘要',
                    scheduled_invocation_started: '定时任务开始',
                    scheduled_invocation_completed: '定时任务完成',
                    scheduled_invocation_failed: '定时任务失败',
                    scheduled_invocation_yielded: '定时任务等待后续批次',
                    scheduled_address_collection_completed: '地址采集完成',
                    scheduled_speedtest_job_created: '测速任务已创建',
                    scheduled_speedtest_job_resumed: '测速任务已继续',
                    scheduled_speedtest_job_cancelled: '测速任务已取消',
                    scheduled_speedtest_job_completed: '测速任务完成',
                    scheduled_speedtest_batch_start: '测速批次开始',
                    scheduled_speedtest_batch_complete: '测速批次完成',
                    scheduled_speedtest_progress_saved: '测速进度已保存',
                    scheduled_speedtest_skipped: '本轮未启动测速'
                };
                const formatTime = function(value) {
                    return value ? new Date(value).toLocaleString() : '时间未知';
                };
                const detail = function(label, value) {
                    return value === undefined || value === null
                        ? ''
                        : '<small>' + label + '：' + escapeHtml(String(value)) + '</small>';
                };
                const activityLogs = Array.isArray(result.activityLogs)
                    ? result.activityLogs
                    : [];
                const activityHtml = activityLogs.length
                    ? activityLogs.map((entry) => {
                        const label = eventLabels[entry.event];
                        if (!label) return '';
                        const metrics = [
                            detail('阶段', entry.stage),
                            detail('运行次数', entry.runCount),
                            detail('成功次数', entry.successfulRunCount),
                            detail('错误次数', entry.errorRunCount),
                            detail('地址数', entry.uniqueAddressCount ?? entry.totalAddresses ?? entry.collectedAddresses ?? entry.addressCount),
                            detail('批次', entry.batchNumber),
                            detail('批次成功', entry.successCount),
                            detail('批次失败', entry.attemptedFailureCount),
                            detail('未完成', entry.remainingAddresses),
                            detail('耗时', Number.isFinite(entry.durationMs) ? entry.durationMs + ' ms' : null),
                            detail('说明', entry.reason),
                            detail('错误', entry.error),
                            entry.historicalSummary
                                ? '<small>历史摘要；完整运行明细从日志更新后开始记录。</small>'
                                : ''
                        ].join('');
                        return '<div class="settings-log-item"><strong>' +
                            escapeHtml(formatTime(entry.timestamp)) + ' · ' +
                            escapeHtml(label) + '</strong>' + metrics + '</div>';
                    }).join('')
                    : '<small>暂无定时运行记录。</small>';
                const runStats = result.runStats || {};
                const runSummaryHtml = '<div class="settings-log-item"><strong>运行汇总</strong>' +
                    detail('累计运行', runStats.runCount) +
                    detail('成功次数', runStats.successfulRunCount) +
                    detail('错误次数', runStats.errorRunCount) +
                    detail('最近运行', formatTime(runStats.lastRunAt)) +
                    '</div>';
                const errors = Array.isArray(result.logs) ? result.logs : [];
                const errorsHtml = errors.length
                    ? errors.map((entry) => {
                    const time = entry.timestamp
                        ? new Date(entry.timestamp).toLocaleString()
                        : '时间未知';
                    const event = escapeHtml(String(entry.event || '功能错误'));
                    const stage = entry.stage ? detail('阶段', entry.stage) : '';
                    const message = entry.message ? detail('错误', entry.message) : '';
                    return '<div class="settings-log-item"><strong>' +
                        escapeHtml(time) + ' · ' + event + '</strong>' +
                        stage + message + '</div>';
                    }).join('')
                    : '<small>暂无功能报错。</small>';
                const pool = result.ipPool || {};
                const poolHtml = '<div class="settings-log-item"><strong>当前 IP 池</strong>' +
                    detail('地址总数', pool.totalCount) +
                    detail('已测速', pool.testedCount) +
                    detail('未测速', pool.untestedCount) +
                    detail('黑名单', pool.blacklistedCount) +
                    detail('可用地址', pool.availableCount) +
                    detail('数据更新时间', formatTime(pool.updatedAt)) +
                    '</div>';
                list.innerHTML =
                    '<section><strong>定时运行情况</strong>' + runSummaryHtml + activityHtml + '</section>' +
                    '<section><strong>功能报错</strong>' + errorsHtml + '</section>' +
                    '<section><strong>IP 池情况</strong>' + poolHtml + '</section>';
            } catch (error) {
                list.innerHTML = '<small>' + escapeHtml(error.message || '无法读取定时任务日志') + '</small>';
            }
        }
        async function loadScheduleFromCloudflare() {
            const tokenInput = document.getElementById('schedule-api-token');
            const accountIdInput = document.getElementById('schedule-account-id');
            const scriptNameInput = document.getElementById('schedule-script-name');
            const status = document.getElementById('scheduled-times-status');
            if (!tokenInput || !accountIdInput || !scriptNameInput || !status) return false;
            status.textContent = '正在读取 Cloudflare 当前已应用的 Cron...';
            try {
                const response = await fetch('/test-schedule-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        apiToken: tokenInput.value.trim(),
                        accountId: accountIdInput.value.trim(),
                        scriptName: scriptNameInput.value.trim()
                    })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '读取 Cloudflare Cron 失败');
                }
                if (data.schedules.length === 1) {
                    const cronFields = data.schedules[0].trim().split(/\s+/);
                    if (cronFields.length === 5) {
                        const fields = {
                            minute: cronFields[0],
                            hour: cronFields[1],
                            dayOfMonth: cronFields[2],
                            month: cronFields[3],
                            dayOfWeek: cronFields[4]
                        };
                        applyScheduleSettings(fields, 'UTC', [data.schedules[0]], data.schedules);
                        scheduleCronLoadedFromCloudflare = true;
                        status.textContent = '已从 Cloudflare 读取当前 Cron；字段按 UTC 显示，编辑后保存即可更新。';
                        return true;
                    }
                }
                if (data.schedules.length > 1) {
                    status.textContent = 'Cloudflare 当前有 ' + data.schedules.length +
                        ' 条 Cron；为避免改变规则，未自动改写输入字段。已应用规则：' +
                        data.schedules.join('；');
                } else {
                    status.textContent = 'Cloudflare 当前没有 Cron Trigger，请填写计划后保存。';
                }
                scheduleCronLoadedFromCloudflare = true;
                return true;
            } catch (error) {
                console.error('读取 Cloudflare Cron 失败:', error);
                status.textContent = '无法读取 Cloudflare 当前 Cron：' + error.message +
                    '；请检查 API 设置和读取权限。';
                return false;
            }
        }
        function selectIPForITDog(address) {
            selectedIPForITDog = address;
            const button = document.getElementById('itdog-btn');
            const label = document.getElementById('itdog-selected-label');
            const row = Array.from(document.querySelectorAll('#ip-list .ip-item'))
                .find(function(item) { return item.dataset.ip === address; });
            document.querySelectorAll('#ip-list .ip-item.is-selected').forEach(function(item) {
                item.classList.remove('is-selected');
                const selectTarget = item.querySelector('[data-select-ip]');
                if (selectTarget) {
                    selectTarget.classList.remove('is-selected');
                    selectTarget.setAttribute('aria-pressed', 'false');
                }
                const selectButton = item.querySelector('.row-select-btn');
                if (selectButton) {
                    selectButton.textContent = '选中';
                    selectButton.setAttribute('aria-pressed', 'false');
                }
            });
            if (row) {
                row.classList.add('is-selected');
                const selectTarget = row.querySelector('[data-select-ip]');
                if (selectTarget) {
                    selectTarget.classList.add('is-selected');
                    selectTarget.setAttribute('aria-pressed', 'true');
                }
                const selectButton = row.querySelector('.row-select-btn');
                if (selectButton) {
                    selectButton.textContent = '已选中';
                    selectButton.setAttribute('aria-pressed', 'true');
                }
            }
            if (button) button.disabled = false;
            if (label) {
                label.textContent = address || '';
                label.hidden = !address;
            }
        }
        function openSelectedIPInITDog() {
            if (!selectedIPForITDog) {
                const firstAddress = document.querySelector('#ip-list .ip-item[data-ip]');
                if (firstAddress) selectIPForITDog(firstAddress.dataset.ip);
            }
            if (!selectedIPForITDog) {
                showMessage('当前没有可供 ITDog 测试的地址，请先更新地址列表', 'error');
                return;
            }
            const parsed = parseAddressWithPort(selectedIPForITDog);
            if (parsed.type !== 'ipv4' && parsed.type !== 'ipv6' && parsed.type !== 'domain') {
                showMessage('当前选择不是有效的 IP 或域名', 'error');
                return;
            }
            const url = new URL('https://www.itdog.cn/ping/');
            url.searchParams.set('host', parsed.address);
            window.open(url.toString(), '_blank', 'noopener,noreferrer');
        }
        async function openQualityIPsInITDogBatch() {
            const seen = new Set();
            const targets = [];
            let textLength = 0;
            qualityCountriesSelected.forEach(function(code) {
                (qualityIPsByCountry[code] || []).forEach(function(entry) {
                    const raw = typeof entry.ip === 'string' ? entry.ip.trim() : '';
                    if (!raw || /[\\r\\n]/.test(raw)) return;
                    const parsed = parseAddressWithPort(raw);
                    if (!['ipv4', 'ipv6', 'domain'].includes(parsed.type) || parsed.port !== 443) return;
                    const target = parsed.address;
                    const nextLength = textLength + (targets.length ? 1 : 0) + target.length;
                    if (!seen.has(target) && targets.length < 256 && nextLength <= 10000) {
                        seen.add(target);
                        targets.push(target);
                        textLength = nextLength;
                    }
                });
            });
            if (!targets.length) {
                showMessage('当前所选地区没有可用于 ITDog 的优质 IP，请先完成测速', 'error');
                return;
            }
            const batchWindow = window.open('https://www.itdog.cn/batch_ping/', '_blank');
            const text = targets.join('\\n');
            let copied = false;
            try {
                await navigator.clipboard.writeText(text);
                copied = true;
            } catch (error) {
                try {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.setAttribute('readonly', '');
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    copied = document.execCommand('copy');
                    textarea.remove();
                } catch (fallbackError) {
                    console.warn('剪贴板回退操作失败:', fallbackError);
                }
            }
            if (!copied) {
                if (batchWindow) batchWindow.close();
                showMessage('无法访问剪贴板，请检查浏览器权限后重试', 'error');
                return;
            }
            if (!batchWindow) {
                showMessage('已复制 ' + targets.length + ' 个优质 IP；浏览器阻止了新窗口，请打开 ITDog 批量 Ping 页面并粘贴', 'error');
                return;
            }
            showMessage('已复制 ' + targets.length + ' 个优质 IP 到剪贴板；请在 ITDog 页面粘贴后手动开始测试');
        }
        async function setAdminPassword() {
            const input = document.getElementById('set-password-input');
            if (input) {
                input.disabled = false;
                input.readOnly = false;
            }
            if (!input || input.value.length < 4) return alert('密码至少4位');
            try {
                const response = await fetch('/admin-set-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: input.value })
                });
                const data = await response.json();
                if (data.success) {
                    location.reload();
                } else {
                    alert('设置失败: ' + (data.error || '未知错误'));
                }
            } catch (error) {
                alert('设置失败: ' + error.message);
            }
        }
        async function loginAdmin() {
            const input = document.getElementById('login-password-input');
            if (!input || !input.value) {
                alert('请输入密码');
                return;
            }
            try {
                const response = await fetch('/admin-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: input.value })
                });
                const data = await response.json();
                if (data.success) {
                    location.reload();
                } else {
                    alert('登录失败: ' + (data.error || '未知错误'));
                    // 清空密码输入框
                    if (input) input.value = '';
                    // 确保模糊效果保持
                    ensureBlurEffect();
                }
            } catch (error) {
                alert('登录失败: ' + error.message);
                // 清空密码输入框
                if (input) input.value = '';
                // 确保模糊效果保持
                ensureBlurEffect();
            }
        }
        function ensureBlurEffect() {
            const container = document.querySelector('.container');
            const contentOverlay = document.querySelector('.content-overlay');
            if (container && !document.body.classList.contains('authenticated')) {
                container.style.filter = 'blur(8px)';
                container.style.pointerEvents = 'none';
                container.style.userSelect = 'none';
            }
            if (contentOverlay && !document.body.classList.contains('authenticated')) {
                contentOverlay.style.display = 'block';
            }
        }
        // 页面加载时确保安全状态
        document.addEventListener('DOMContentLoaded', function() {
            const normalizedIntervals = [
                ['manual-speedtest-batch-interval', 2],
                ['manual-speedtest-address-interval', 2]
            ];
            normalizedIntervals.forEach(function(entry) {
                const label = document.getElementById(entry[0]);
                if (label && String(label.textContent || '').includes('undefined')) {
                    label.textContent = entry[1] + ' 秒';
                }
            });
        });
        document.addEventListener('DOMContentLoaded', function() {
            if (!document.body.classList.contains('authenticated')) {
                // 禁用所有交互元素
                const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
                interactiveElements.forEach(el => {
                    const isAdminAuthControl =
                        ['login-password-input', 'set-password-input'].includes(el.id) ||
                        ['loginAdmin', 'setAdminPassword', 'closeAdminOverlay'].some(function(handler) {
                            return el.onclick?.toString().includes(handler);
                        });
                    if (!isAdminAuthControl) {
                        el.style.pointerEvents = 'none';
                        el.style.opacity = '0.5';
                    }
                });
                ensureBlurEffect();
            }
        });
        // 防止通过开发者工具移除模糊效果
        (function() {
            let blurCheckInterval;
            function checkBlurStatus() {
                if (!document.body.classList.contains('authenticated')) {
                    const container = document.querySelector('.container');
                    const contentOverlay = document.querySelector('.content-overlay');
                    if (container && (!container.style.filter || container.style.filter === 'none')) {
                        container.style.filter = 'blur(8px)';
                        container.style.pointerEvents = 'none';
                        container.style.userSelect = 'none';
                    }
                    if (contentOverlay && contentOverlay.style.display === 'none') {
                        contentOverlay.style.display = 'block';
                    }
                }
            }
            if (!document.body.classList.contains('authenticated')) {
                blurCheckInterval = setInterval(checkBlurStatus, 1000);
            }
        })();
        function closeAdminOverlay() {
            const overlay = document.getElementById('admin-overlay');
            if (overlay) overlay.style.display = 'none';
        }
        async function handleLogout() {
            try {
                await fetch('/admin-logout', { method: 'POST' });
                location.reload();
            } catch (error) {
                alert('登出失败: ' + error.message);
            }
        }
        // 解析地址类型
        function isValidIPv4(ip) {
            if (!ip || typeof ip !== 'string') return false;
            const octets = ip.split('.');
            if (octets.length !== 4) return false;
            return octets.every(oct => {
                const num = parseInt(oct, 10);
                return !isNaN(num) && num >= 0 && num <= 255 && String(num) === oct;
            });
        }
        // 解析地址类型
        function parseAddressWithPort(address) {
            if (!address || typeof address !== 'string') return { address: '', port: 443, type: 'unknown' };
            // 关键：先剥离可能存在的 # 备注或后缀，再进行解析
            let pure = address.split('#')[0].trim();
            if (pure.startsWith('[') && pure.includes(']')) {
                const bracketEnd = pure.lastIndexOf(']');
                const addr = pure.slice(1, bracketEnd);
                const afterBracket = pure.slice(bracketEnd + 1);
                const portMatch = afterBracket.match(/^:(\d+)$/);
                const port = portMatch ? parseInt(portMatch[1], 10) : 443;
                return { address: addr, port, type: 'ipv6' };
            }
            if ((pure.match(/:/g) || []).length > 1 && !pure.includes('.')) {
                return { address: pure, port: 443, type: 'ipv6' };
            }
            if (pure.includes(':')) {
                const parts = pure.split(':');
                const portStr = parts.pop();
                const addr = parts.join(':');
                const port = parseInt(portStr, 10);
                const type = isValidIPv4(addr) ? 'ipv4' : 'domain';
                return { address: addr, port: isNaN(port) ? 443 : port, type };
            }
            const type = isValidIPv4(pure) ? 'ipv4' : 'domain';
            return { address: pure, port: 443, type };
        }
        // 格式化地址输出
        function formatAddressOutput(address, location, latency) {
          if (!address) return '';
          const parsed = parseAddressWithPort(address);
          const portPart = parsed.port !== 443 ? ':' + parsed.port : "";
          const latencyPart = latency ? Math.round(latency) + 'ms' : "";
          let displayLocation = location || "未知";
          if (parsed.type !== 'domain' && (displayLocation === "未知" || displayLocation.toLowerCase() === 'ipv4' || displayLocation.toLowerCase() === 'ipv6')) {
            displayLocation = parsed.type.toUpperCase();
          }
          if (parsed.type === 'ipv6') {
            return '[' + parsed.address + ']' + portPart + '#' + displayLocation + (latencyPart ? '_' + latencyPart : '');
          } else if (parsed.type === 'domain') {
            return parsed.address + portPart + '#' + (displayLocation && displayLocation !== "未知" ? displayLocation : parsed.address) + (latencyPart ? '_' + latencyPart : '');
          } else {
            // IPv4
            return parsed.address + portPart + '#' + displayLocation + (latencyPart ? '_' + latencyPart : '');
          }
        }
        const CLIENT_COUNTRY_NAMES = ${JSON.stringify(SUPPORTED_COUNTRIES).replace(/</g, "\\u003c")};
        const CLIENT_COUNTRY_KEYWORDS = ${JSON.stringify(COUNTRY_KEYWORDS).replace(/</g, "\\u003c")};
        let speedTestThresholds = {
            maxLatency: ${data.maxLatency},
            minBandwidth: ${data.minBandwidth}
        };
        function getClientBandwidthSpeedClass(value, latency) {
            const bandwidth = Number(value);
            if (!Number.isFinite(bandwidth) || bandwidth <= 0) return '';
            return bandwidth >= 10
                ? 'bandwidth-fast'
                : bandwidth >= 5
                    ? 'bandwidth-medium'
                    : 'bandwidth-slow';
        }
        function getClientLatencySpeedClass(value) {
            const latency = Number(value);
            if (!Number.isFinite(latency) || latency <= 0) return '';
            return latency <= 100
                ? 'speed-fast'
                : latency <= 200
                    ? 'speed-medium'
                    : 'speed-slow';
        }
        function getClientCountryCode(item) {
            const explicitCode = String(item?.countryCode || '').toUpperCase();
            if (CLIENT_COUNTRY_NAMES[explicitCode]) return explicitCode;
            const location = String(item?.location || item?.region || item?.country || '');
            const flagMatch = location.match(/[\\u{1F1E6}-\\u{1F1FF}]{2}/u);
            if (flagMatch) {
                const flagCode = Array.from(flagMatch[0], function(character) {
                    return String.fromCharCode(character.codePointAt(0) - 0x1f1e6 + 65);
                }).join('');
                if (CLIENT_COUNTRY_NAMES[flagCode]) return flagCode;
            }
            const normalizedLocation = location.toLowerCase();
            const countryNames = Object.entries(CLIENT_COUNTRY_NAMES)
                .sort(function(a, b) { return b[1].length - a[1].length; });
            for (const [countryCode, countryName] of countryNames) {
                const keywords = [countryName].concat((CLIENT_COUNTRY_KEYWORDS[countryCode] || [])
                    .filter(function(keyword) { return keyword !== countryCode.toLowerCase(); }));
                if (keywords.some(function(keyword) { return normalizedLocation.includes(keyword.toLowerCase()); })) {
                    return countryCode;
                }
            }
            const codeMatch = location.match(/(?:^|[^A-Za-z])([A-Za-z]{2})(?=$|[^A-Za-z])/);
            const countryCode = codeMatch ? codeMatch[1].toUpperCase() : '';
            return CLIENT_COUNTRY_NAMES[countryCode] ? countryCode : '';
        }
        function formatClientLocationLabel(location) {
            const raw = String(location || '').trim().replace(/[\\u{1F1E6}-\\u{1F1FF}]{2}/gu, function(flag, offset, text) {
                const countryCode = Array.from(flag, function(character) {
                    return String.fromCharCode(character.codePointAt(0) - 0x1f1e6 + 65);
                }).join('');
                const countryName = CLIENT_COUNTRY_NAMES[countryCode];
                if (!countryName) return flag;
                const nextCharacter = text[offset + flag.length] || '';
                return countryName + (nextCharacter && !/[\\s·,，|]/.test(nextCharacter) ? ' ' : '');
            });
            if (!raw || raw.toLowerCase() === '未知' || raw.toLowerCase() === 'unknown') return '未知';
            const parts = raw.split(/[_·,，|]+/).map(function(part) { return part.trim(); })
                .filter(function(part) { return part && !/^\\d+\\s*ms$/i.test(part); });
            if (parts.length && /^[A-Z]{2}$/.test(parts[0]) && CLIENT_COUNTRY_NAMES[parts[0]]) {
                parts[0] = CLIENT_COUNTRY_NAMES[parts[0]];
            }
            return parts.join(' · ') || '未知';
        }
        let speedResults = {};
        let currentAddressListView = 'premium';
        let currentQualityCountry = '';
        let isTesting = false;
        let currentTestIndex = 0;
        let selectedIPForITDog = '';
        let verifiedScheduleApi = null;
        let volatileScheduleApiConfig = null;
        let scheduleCronLoadedFromCloudflare = false;
        let qualityCountriesSelected = ${JSON.stringify(data.selectedQualityCountries).replace(/</g, "\\u003c")};
        let qualityIPsByCountry = {};
        let currentSourcesUrls = ${JSON.stringify(data.sources_urls || [])
          .replace(/</g, "\\u003c")
          .replace(/>/g, "\\u003e")};
        let currentBlacklist = ${JSON.stringify(data.blacklist || [])
          .replace(/</g, "\\u003c")
          .replace(/>/g, "\\u003e")};
        let currentPath = '${data.customPath}';
        function showMessage(message, type) {
            if (type === undefined) type = 'success';
            const result = document.getElementById('result');
            if (!result) return;
            result.className = 'result ' + type;
            result.innerHTML = '<p>' + escapeHtml(message) + '</p>';
            result.style.display = 'block';
            setTimeout(function() {
                result.style.display = 'none';
            }, 3000);
        }
        function updateLinks() {
            const pathPart = currentPath ? '/' + currentPath : '';
            document.querySelectorAll('.all-ips-download-link').forEach(function(link) {
                link.href = pathPart + '/ips';
            });
            document.querySelectorAll('.all-ips-text-link').forEach(function(link) {
                link.href = pathPart + '/ip.txt';
            });
        }
        function openPathModal() {
            const modal = document.getElementById('path-modal');
            const input = document.getElementById('path-input');
            if (!modal || !input) return;
            input.value = currentPath;
            modal.style.display = 'flex';
        }
        function closePathModal() {
            const modal = document.getElementById('path-modal');
            if (modal) modal.style.display = 'none';
        }
        async function savePath() {
            const input = document.getElementById('path-input');
            if (!input) return;
            const path = input.value.trim();
            try {
                const response = await fetch('/set-path', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path })
                });
                const data = await response.json();
                if (data.success) {
                    currentPath = data.path;  // 使用返回的路径（可能已清洗）
                    showMessage(data.message || '路径设置成功');
                    closePathModal();
                    updateLinks();
                    await refreshData();
                } else {
                    // 显示错误信息，提示用户路径未被修改
                    showMessage(data.error || '设置失败', 'error');
                }
            } catch (error) {
                console.error('保存路径失败:', error);
                showMessage('设置失败: ' + error.message, 'error');
            }
        }
        function copyIP(address, location, latency) {
            let text = formatAddressOutput(address, location, latency);
            navigator.clipboard.writeText(text).then(function() {
                showMessage('已复制 地址: ' + text);
            }).catch(function(err) {
                console.error('复制失败:', err);
                showMessage('复制失败', 'error');
            });
        }
        async function testSingleIP(address) {
            const item = document.querySelector('[data-ip="' + CSS.escape(address) + '"]');
            if (!item) return showMessage('未找到地址元素', 'error');
            const testBtn = item.querySelector('.small-btn[id^="test-"]');
            const speedElement = item.querySelector('.speed-result');
            const addressElement = item.querySelector('.ip-address');
            if (!addressElement) return;
            if (!testBtn || !speedElement || !addressElement) return showMessage('元素缺失，无法测速', 'error');
            testBtn.disabled = true;
            testBtn.textContent = '测试中...';
            speedElement.textContent = '测试中...';
            speedElement.className = 'speed-result';
            try {
                const response = await fetch('/speedtest?ip=' + encodeURIComponent(address));
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const data = await response.json();
                const latency = data.latency;
                const bandwidth = data.bandwidth;
                speedResults[address] = {
                    latency: latency,
                    bandwidth: bandwidth,
                    countryCode: data.countryCode,
                    success: data.success
                };
                if (data.success) {
                    item.dataset.speedTested = 'true';
                    item.dataset.speedCategory =
                        ['premium', 'premium-domain', 'backup', 'untested'].includes(data.category)
                            ? data.category
                            : 'backup';
                    item.dataset.country = data.countryCode ||
                        getClientCountryCode({ location: data.location });
                    const rounded = Math.round(latency);
                    const speedClass = getClientLatencySpeedClass(rounded);
                    speedElement.textContent = rounded + 'ms';
                    speedElement.className = 'speed-result ' + speedClass;
                    const bandwidthElement = item.querySelector('.bandwidth-result');
                    if (bandwidthElement) {
                        bandwidthElement.textContent = Number.isFinite(Number(data.bandwidth))
                            ? Number(data.bandwidth).toFixed(2) + ' MB/s'
                            : '不可用';
                        bandwidthElement.className = 'speed-result bandwidth-result ' +
                            getClientBandwidthSpeedClass(data.bandwidth, latency);
                    }
                    // 安全地更新地址元素文本
                    const parsed = parseAddressWithPort(address);
                    let displayLocation = data.location || '未知';
                    if (parsed.type !== 'domain' && (displayLocation === "未知" || displayLocation.toLowerCase() === 'ipv4' || displayLocation.toLowerCase() === 'ipv6')) {
                      displayLocation = parsed.type.toUpperCase();
                    }
                    // 对于域名类型：如果 displayLocation 是域名本身（无国家代码），则使用域名作为兜底
                    if (parsed.type === 'domain') {
                      // 检查 location 是否包含国家代码（格式：domain_CN）
                      const hasCountryCode = displayLocation && displayLocation !== "未知" && displayLocation.startsWith(parsed.address + '_');
                      if (hasCountryCode) {
                        displayLocation = displayLocation; // 保留完整的 domain_CN
                      } else {
                        // 查询失败或无有效位置，使用域名本身作为兜底
                        displayLocation = parsed.address;
                      }
                    }
                    let displayAddress = parsed.address;
                    if (parsed.type === 'ipv6') displayAddress = '[' + displayAddress + ']';
                    if (parsed.port !== 443) displayAddress += ':' + parsed.port;
                    const typeLabel = parsed.type === 'ipv4' ? 'IPv4'
                        : parsed.type === 'ipv6' ? 'IPv6'
                        : parsed.type === 'domain' ? '域名' : '';
                    const countryCode = getClientCountryCode({ countryCode: data.countryCode, location: displayLocation });
                    const countryName = countryCode ? CLIENT_COUNTRY_NAMES[countryCode] : '';
                    addressElement.innerHTML = escapeHtml(displayAddress) +
                        (typeLabel ? '<span class="ip-type-badge">' + typeLabel + '</span>' : '') +
                        (countryName ? '<span class="ip-country-badge">' + escapeHtml(countryName) + '</span>' : '');
                    const locationElement = item.querySelector('.ip-location');
                    if (locationElement) locationElement.textContent = '线路 · ' + formatClientLocationLabel(displayLocation);
                    switchAddressList(currentAddressListView);
                    await refreshQualityIPs();
                    showMessage('地址 ' + address + ' 测速完成: ' + rounded + 'ms');
                } else {
                    speedElement.textContent = '失败';
                    speedElement.className = 'speed-result speed-slow';
                }
            } catch (error) {
                console.error('测速错误:', error);
                speedElement.textContent = '错误';
                speedElement.className = 'speed-result speed-slow';
                showMessage('地址 ' + address + ' 测速错误: ' + error.message, 'error');
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = '测速';
                // 强制重绘
                void speedElement.offsetHeight;
            }
        }
        function updateSpeedTestEstimate() {
            const countInput = document.getElementById('speedtest-count');
            const estimate = document.getElementById('speedtest-estimate');
            if (!countInput || !estimate) return;
            const allCount = document.querySelectorAll('#ip-list .ip-item').length;
            const value = countInput.value.trim();
            const requestedCount = value === '' ? NaN : Number(value);
            if (!Number.isInteger(requestedCount) || requestedCount < 0) {
                estimate.textContent = '请输入有效的测速数量（0=全部）';
                return;
            }
            const count = requestedCount === 0 ? allCount : Math.min(requestedCount, allCount);
            const mib = (count * 300000 / 1024 / 1024).toFixed(1);
            const label = '预计流量约 ' + mib + ' MiB（' + count + ' 个节点）';
            estimate.textContent = label;
            const detail = document.getElementById('speedtest-estimate-detail');
            if (detail) detail.textContent = count + ' 个 · ' + mib + ' MiB';
        }
        const LOCAL_SETTINGS_KEY = 'cloudflare-collector-settings-v1';
        function readLocalSettingsFallback() {
            try {
                const settings = JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) || '{}');
                return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
            } catch (error) {
                console.warn('读取本地设置失败:', error);
                return {};
            }
        }
        function writeLocalSettingsFallback(updates) {
            try {
                const settings = { ...readLocalSettingsFallback(), ...updates };
                localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
                return true;
            } catch (error) {
                console.error('写入本地设置失败:', error);
                return false;
            }
        }
        function clearLocalSettingsFallback(key) {
            const settings = readLocalSettingsFallback();
            delete settings[key];
            try {
                if (Object.keys(settings).length) localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
                else localStorage.removeItem(LOCAL_SETTINGS_KEY);
            } catch (error) {
                console.warn('清理本地设置失败:', error);
            }
        }
        function applyLocalSettingsFallback() {
            const settings = readLocalSettingsFallback();
            if (Number.isSafeInteger(settings.displayLimit) && settings.displayLimit >= 0) {
                const input = document.getElementById('ip-limit-input');
                if (input) input.value = settings.displayLimit === 0 ? '' : String(settings.displayLimit);
                const status = document.getElementById('ip-limit-status');
                if (status) status.textContent = '本浏览器本地设置；Cron 使用服务端上次保存值';
            }
            if (Array.isArray(settings.sources) && settings.sources.every(function(source) {
                return typeof source === 'string';
            })) {
                currentSourcesUrls = settings.sources;
                const status = document.getElementById('sources-settings-status');
                if (status) status.textContent = '本浏览器本地设置；手动更新使用此列表，Cron 使用服务端上次保存值';
            }
            if (Number.isSafeInteger(settings.speedTestCount) && settings.speedTestCount >= 0) {
                const input = document.getElementById('speedtest-count');
                if (input) input.value = String(settings.speedTestCount);
                const indicator = document.getElementById('speedtest-selected-count');
                if (indicator) indicator.textContent = '默认 ' +
                    (settings.speedTestCount === 0 ? '全部' : settings.speedTestCount) + ' 节点';
                const status = document.getElementById('speedtest-count-status');
                if (status) status.textContent = '本浏览器本地设置；Cron 使用服务端上次保存值';
            }
            if (Number.isSafeInteger(settings.manualBatchIntervalSeconds)) {
                const input = document.getElementById('manual-batch-interval-input');
                if (input) input.value = String(settings.manualBatchIntervalSeconds);
                const label = document.getElementById('manual-speedtest-batch-interval');
                if (label) label.textContent = settings.manualBatchIntervalSeconds + ' 秒';
            } else {
                const input = document.getElementById('manual-batch-interval-input');
                if (input && !Number.isSafeInteger(Number(input.value))) input.value = '2';
                const label = document.getElementById('manual-speedtest-batch-interval');
                if (label && String(label.textContent).includes('undefined')) label.textContent = '2 秒';
            }
            if (Number.isSafeInteger(settings.manualAddressIntervalSeconds)) {
                const input = document.getElementById('manual-address-interval-input');
                if (input) input.value = String(settings.manualAddressIntervalSeconds);
                const label = document.getElementById('manual-speedtest-address-interval');
                if (label) label.textContent = settings.manualAddressIntervalSeconds + ' 秒';
            } else {
                const input = document.getElementById('manual-address-interval-input');
                if (input && !Number.isSafeInteger(Number(input.value))) input.value = '2';
                const label = document.getElementById('manual-speedtest-address-interval');
                if (label && String(label.textContent).includes('undefined')) label.textContent = '2 秒';
            }
            if (Number.isSafeInteger(settings.autoUpdateCount) && settings.autoUpdateCount >= 0) {
                const input = document.getElementById('auto-update-count');
                if (input) input.value = String(settings.autoUpdateCount);
                const label = document.getElementById('auto-update-default-count');
                if (label) label.textContent = '全部';
                const status = document.getElementById('auto-update-count-status');
                if (status) status.textContent = '本浏览器本地设置；Cron 使用服务端上次保存值';
            }
            if (Array.isArray(settings.qualityCountries)) {
                const allowedCountries = new Set(Array.from(document.querySelectorAll('input[name="quality-country"]'))
                    .map(function(input) { return input.value; }));
                qualityCountriesSelected = settings.qualityCountries.filter(function(code) {
                    return allowedCountries.has(code);
                });
            }
            if (qualityCountriesSelected.length && Array.isArray(settings.qualityCountries)) {
                document.querySelectorAll('input[name="quality-country"]').forEach(function(input) {
                    input.checked = qualityCountriesSelected.includes(input.value);
                });
                const status = document.getElementById('quality-countries-status');
                if (status) status.textContent = '本浏览器本地设置；定时任务使用服务端上次保存值';
            }
            updateSpeedTestEstimate();
            updateQualityTextLinks();
        }
        function updateQualityTextLinks() {
            const ipLink = document.querySelector('.quality-ip-text-link');
            const domainLink = document.querySelector('.quality-domain-text-link');
            if (ipLink) ipLink.href = '/quality-ips.txt?type=ip&countries=' +
                encodeURIComponent(qualityCountriesSelected.join(','));
            if (domainLink) domainLink.href = '/quality-ips.txt?type=domain&countries=' +
                encodeURIComponent(qualityCountriesSelected.join(','));
        }
        async function saveAutoUpdateCount(showSuccess) {
            const input = document.getElementById('auto-update-count');
            const status = document.getElementById('auto-update-count-status');
            const button = document.getElementById('save-auto-update-count');
            if (!input) return false;
            const rawCount = input.value.trim();
            const count = rawCount === '' ? NaN : Number(rawCount);
            if (!Number.isSafeInteger(count) || count < 0) {
                if (status) status.textContent = '请输入大于等于 0 的整数';
                showMessage('定时更新数量必须是大于等于 0 的整数，0 表示全部', 'error');
                return false;
            }
            if (button) {
                button.disabled = true;
                button.textContent = '保存中...';
            }
            try {
                const response = await fetch('/set-auto-update-count', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '保存定时更新数量失败');
                }
                clearLocalSettingsFallback('autoUpdateCount');
                if (status) status.textContent = '已保存：定时任务将更新 ' +
                    '全部地址（此设置不再限制定时任务）';
                const label = document.getElementById('auto-update-default-count');
                if (label) label.textContent = '全部';
                if (showSuccess) showMessage('定时更新数量已保存');
                return true;
            } catch (error) {
                console.error('保存定时更新数量失败:', error);
                const savedLocally = writeLocalSettingsFallback({ autoUpdateCount: count });
                if (savedLocally) {
                    const label = document.getElementById('auto-update-default-count');
                    if (label) label.textContent = '全部';
                }
                if (status) status.textContent = savedLocally
                    ? '已保存到本浏览器；Cron 仍使用服务端上次保存值'
                    : '保存失败，请重试';
                showMessage(
                    savedLocally
                        ? 'KV 写入失败，已保存到本浏览器；Cron 仍使用服务端上次保存值。错误：' + error.message
                        : '定时更新数量保存失败：' + error.message,
                    'error'
                );
                return savedLocally;
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = '保存';
                }
            }
        }
        async function saveSpeedTestCount(showSuccess) {
            const input = document.getElementById('speedtest-count');
            const batchSizeInput = document.getElementById('manual-speedtest-batch-size-input');
            const batchIntervalInput = document.getElementById('manual-batch-interval-input');
            const addressIntervalInput = document.getElementById('manual-address-interval-input');
            const timeoutInput = document.getElementById('manual-speedtest-timeout-input');
            const status = document.getElementById('speedtest-count-status');
            const button = document.getElementById('save-speedtest-count');
            if (!input) return false;
            const rawCount = input.value.trim();
            const count = rawCount === '' ? NaN : Number(rawCount);
            const manualBatchSize = batchSizeInput ? Number(batchSizeInput.value.trim()) : 50;
            const batchInterval = batchIntervalInput ? Number(batchIntervalInput.value.trim()) : 2;
            const addressInterval = addressIntervalInput ? Number(addressIntervalInput.value.trim()) : 2;
            const timeoutSeconds = timeoutInput ? Number(timeoutInput.value.trim()) : 5;
            if (!Number.isSafeInteger(count) || count < 0) {
                if (status) status.textContent = '请输入大于等于 0 的整数';
                showMessage('测速数量必须是大于等于 0 的整数，0 表示全部', 'error');
                return false;
            }
            if (!Number.isSafeInteger(manualBatchSize) || manualBatchSize < 1 || manualBatchSize > 50) {
                if (status) status.textContent = '每批 IP 数必须是 1-50 的整数';
                showMessage('每批 IP 数必须是 1-50 的整数', 'error');
                return false;
            }
            if (!Number.isSafeInteger(batchInterval) || batchInterval < 0 || batchInterval > 60 ||
                !Number.isSafeInteger(addressInterval) || addressInterval < 0 || addressInterval > 60) {
                if (status) status.textContent = '批次间隔和 IP 请求间隔必须为 0-60 秒的整数';
                showMessage('测速间隔必须为 0-60 秒的整数', 'error');
                return false;
            }
            if (!Number.isSafeInteger(timeoutSeconds) ||
                timeoutSeconds < 1 || timeoutSeconds > 60) {
                if (status) status.textContent = '超时自动拉黑阈值必须为 1-60 秒的整数';
                showMessage('超时自动拉黑阈值必须为 1-60 秒的整数', 'error');
                return false;
            }
            if (button) {
                button.disabled = true;
                button.textContent = '保存中...';
            }
            try {
                const response = await fetch('/set-speedtest-count', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        count,
                        manualBatchSize,
                        batchIntervalSeconds: batchInterval,
                        addressIntervalSeconds: addressInterval,
                        timeoutSeconds
                    })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '保存测速数量失败');
                }
                clearLocalSettingsFallback('speedTestCount');
                clearLocalSettingsFallback('manualBatchSize');
                clearLocalSettingsFallback('manualBatchIntervalSeconds');
                clearLocalSettingsFallback('manualAddressIntervalSeconds');
                clearLocalSettingsFallback('manualSpeedTestTimeoutSeconds');
                if (status) {
                    status.textContent = '已保存：默认每次测速 ' +
                        (count === 0 ? '全部节点' : count + ' 个节点') +
                        '；每批 ' + manualBatchSize + ' 个 IP' +
                        '；超时 ' + timeoutSeconds + ' 秒自动加入黑名单';
                }
                const indicator = document.getElementById('speedtest-selected-count');
                if (indicator) indicator.textContent = '默认 ' + (count === 0 ? '全部' : count) + ' 节点';
                const batchSize = document.getElementById('manual-speedtest-batch-size');
                if (batchSize) batchSize.textContent = String(manualBatchSize);
                const batchIntervalLabel = document.getElementById('manual-speedtest-batch-interval');
                if (batchIntervalLabel) batchIntervalLabel.textContent = batchInterval + ' 秒';
                const addressIntervalLabel = document.getElementById('manual-speedtest-address-interval');
                if (addressIntervalLabel) addressIntervalLabel.textContent = addressInterval + ' 秒';
                const timeoutLabel = document.getElementById('manual-speedtest-timeout');
                if (timeoutLabel) timeoutLabel.textContent = timeoutSeconds + ' 秒';
                const settingsSummary = document.querySelector('#manual-speedtest-settings-summary small');
                if (settingsSummary) {
                    settingsSummary.textContent =
                        (count === 0 ? '全部节点' : count + ' 个节点') +
                        ' · 每批 ' + manualBatchSize + ' 个' +
                        ' · 超时 ' + timeoutSeconds + ' 秒自动拉黑';
                }
                if (showSuccess) showMessage('默认测速数量已保存');
                return true;
            } catch (error) {
                console.error('保存测速数量失败:', error);
                const savedLocally = writeLocalSettingsFallback({
                    speedTestCount: count,
                    manualBatchIntervalSeconds: batchInterval,
                    manualAddressIntervalSeconds: addressInterval
                });
                if (savedLocally) {
                    const indicator = document.getElementById('speedtest-selected-count');
                    if (indicator) indicator.textContent = '默认 ' + (count === 0 ? '全部' : count) + ' 节点';
                    const batchSize = document.getElementById('manual-speedtest-batch-size');
                    const batchIntervalLabel = document.getElementById('manual-speedtest-batch-interval');
                    if (batchIntervalLabel) batchIntervalLabel.textContent = batchInterval + ' 秒';
                    const addressIntervalLabel = document.getElementById('manual-speedtest-address-interval');
                    if (addressIntervalLabel) addressIntervalLabel.textContent = addressInterval + ' 秒';
                }
                if (status) status.textContent = savedLocally
                    ? '数量与间隔已保存到本浏览器；每批 IP 数和超时阈值未保存、未生效'
                    : '保存失败，请重试';
                showMessage(
                    savedLocally
                        ? 'KV 写入失败，每批 IP 数和超时自动拉黑阈值未生效。数量与间隔已保存到本浏览器。错误：' + error.message
                        : '测速数量保存失败：' + error.message,
                    'error'
                );
                return savedLocally;
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = '保存';
                }
            }
        }
        function formatScheduledSpeedTestDuration(totalSeconds) {
            const seconds = Math.max(0, Math.ceil(totalSeconds));
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = seconds % 60;
            if (hours) return hours + ' 小时 ' + minutes + ' 分钟';
            if (minutes) return minutes + ' 分钟 ' + remainingSeconds + ' 秒';
            return remainingSeconds + ' 秒';
        }
        function updateScheduledSpeedTestEstimate() {
            const output = document.getElementById('scheduled-speedtest-estimate');
            const batchSize = Number(document.getElementById('scheduled-speedtest-batch-size')?.value);
            const batchInterval = Number(document.getElementById('scheduled-speedtest-batch-interval')?.value);
            const addressInterval = Number(document.getElementById('scheduled-speedtest-address-interval')?.value);
            if (!output) return;
            const addressCount = Number(output.dataset.addressCount);
            const averageRequestMs = Number(output.dataset.averageRequestMs);
            if (!Number.isSafeInteger(addressCount) || addressCount < 1 ||
                !Number.isSafeInteger(batchSize) || batchSize < 1 ||
                !Number.isFinite(batchInterval) || batchInterval < 0 ||
                !Number.isFinite(addressInterval) || addressInterval < 0 ||
                !Number.isFinite(averageRequestMs) || averageRequestMs < 0) {
                output.textContent = '预计测速时间暂不可用：请确认当前地址数量和测速规则。';
                return;
            }
            const batchCount = Math.ceil(addressCount / batchSize);
            const requestSeconds = averageRequestMs / 1000;
            const activeSeconds = addressCount * requestSeconds +
                Math.max(0, addressCount - batchCount) * addressInterval;
            const minimumElapsedSeconds = activeSeconds +
                Math.max(0, batchCount - 1) * batchInterval;
            output.textContent = '当前 ' + addressCount + ' 个地址，约 ' + batchCount +
                ' 批；按平均单次请求 ' + (averageRequestMs / 1000).toFixed(1) +
                ' 秒估算，测速执行时间约 ' +
                formatScheduledSpeedTestDuration(activeSeconds) +
                '；含配置批次间隔约至少 ' +
                formatScheduledSpeedTestDuration(minimumElapsedSeconds) +
                '。未计入 Cron 实际触发等待' +
                (output.dataset.estimateFallback === 'true'
                    ? '（暂无历史样本，暂按 4 秒/请求估算）'
                    : '。');
        }
        async function saveScheduledSpeedTestSettings() {
            const batchSizeInput = document.getElementById('scheduled-speedtest-batch-size');
            const intervalInput = document.getElementById('scheduled-speedtest-batch-interval');
            const addressIntervalInput = document.getElementById('scheduled-speedtest-address-interval');
            const timeoutInput = document.getElementById('scheduled-speedtest-timeout');
            const status = document.getElementById('scheduled-speedtest-settings-status');
            const button = document.getElementById('save-scheduled-speedtest-settings');
            if (!batchSizeInput || !intervalInput || !addressIntervalInput || !timeoutInput || !button) return false;
            const batchSize = Number(batchSizeInput.value);
            const batchIntervalSeconds = Number(intervalInput.value);
            const addressIntervalSeconds = Number(addressIntervalInput.value);
            const timeoutSeconds = Number(timeoutInput.value);
            if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 40) {
                if (status) status.textContent = '每批 IP 数必须是 1 到 40 的整数';
                showMessage('每批 IP 数必须是 1 到 40 的整数', 'error');
                return false;
            }
            if (!Number.isSafeInteger(batchIntervalSeconds) ||
                batchIntervalSeconds < 0 || batchIntervalSeconds > 60) {
                if (status) status.textContent = '批次间隔必须是 0 到 60 秒的整数';
                showMessage('批次间隔必须是 0 到 60 秒的整数', 'error');
                return false;
            }
            if (!Number.isSafeInteger(addressIntervalSeconds) ||
                addressIntervalSeconds < 0 || addressIntervalSeconds > 60) {
                if (status) status.textContent = '每个 IP 请求间隔必须是 0 到 60 秒的整数';
                showMessage('每个 IP 请求间隔必须是 0 到 60 秒的整数', 'error');
                return false;
            }
            if (!Number.isSafeInteger(timeoutSeconds) ||
                timeoutSeconds < 1 || timeoutSeconds > 60) {
                if (status) status.textContent = '超时自动拉黑阈值必须是 1 到 60 秒的整数';
                showMessage('超时自动拉黑阈值必须是 1 到 60 秒的整数', 'error');
                return false;
            }
            button.disabled = true;
            try {
                const response = await fetch('/set-scheduled-speedtest-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ batchSize, batchIntervalSeconds, addressIntervalSeconds, timeoutSeconds })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '保存定时测速规则失败');
                }
                if (status) {
                    status.textContent = '已保存：每批 ' + data.batchSize +
                        ' 个 IP；每个 IP 间隔 ' + addressIntervalSeconds +
                        ' 秒；批次间隔 ' + batchIntervalSeconds + ' 秒；超时 ' +
                        timeoutSeconds + ' 秒自动加入黑名单';
                }
                const cronBatchSize = document.getElementById('cron-speedtest-batch-size');
                const cronBatchInterval = document.getElementById('cron-speedtest-batch-interval');
                const cronAddressInterval = document.getElementById('cron-speedtest-address-interval');
                if (cronBatchSize) cronBatchSize.textContent = String(data.batchSize);
                if (cronBatchInterval) cronBatchInterval.textContent = batchIntervalSeconds + ' 秒';
                if (cronAddressInterval) cronAddressInterval.textContent = addressIntervalSeconds + ' 秒';
                const cronTimeout = document.getElementById('cron-speedtest-timeout');
                if (cronTimeout) cronTimeout.textContent = timeoutSeconds + ' 秒';
                const settingsSummary = document.querySelector('#scheduled-speedtest-settings-summary small');
                if (settingsSummary) {
                    settingsSummary.textContent =
                        '每批 ' + data.batchSize + ' 个 · 超时 ' +
                        timeoutSeconds + ' 秒自动拉黑';
                }
                updateScheduledSpeedTestEstimate();
                showMessage('定时测速规则已保存');
                return true;
            } catch (error) {
                console.error('保存定时测速规则失败:', error);
                if (status) status.textContent = '保存失败，请重试';
                showMessage('定时测速规则保存失败：' + error.message, 'error');
                return false;
            } finally {
                button.disabled = false;
            }
        }
        async function toggleScheduleEnabledFromSettings() {
            const settingsButton = document.getElementById('settings-schedule-enabled');
            const status = settingsButton ? settingsButton.querySelector('small') : null;
            const enabled = settingsButton
                ? settingsButton.getAttribute('aria-checked') !== 'true'
                : status
                    ? status.textContent !== '已开启'
                    : true;
            if (settingsButton) settingsButton.disabled = true;
            try {
                const response = await fetch('/set-schedule-enabled', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ enabled })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '切换定时任务失败');
                }
                if (status) status.textContent = data.enabled ? '已开启' : '已关闭';
                if (settingsButton) {
                    settingsButton.setAttribute('aria-checked', String(data.enabled));
                    settingsButton.dataset.scheduleEnabled = String(data.enabled);
                }
                const cronButton = document.getElementById('schedule-enabled-toggle');
                if (cronButton) {
                    cronButton.setAttribute('aria-checked', String(data.enabled));
                    cronButton.textContent = data.enabled ? '已开启' : '已关闭';
                }
                const countLabel = document.getElementById('speedtest-default-count');
                if (countLabel) countLabel.textContent = data.enabled ? '全部' : '未启用';
                showMessage(
                    data.warning || (data.enabled ? '定时任务已开启' : '定时任务已关闭'),
                    data.warning ? 'error' : 'success'
                );
                return true;
            } catch (error) {
                console.error('切换定时任务失败:', error);
                if (status) status.textContent = '切换失败：' + error.message;
                showMessage('切换定时任务失败：' + error.message, 'error');
                return false;
            } finally {
                if (settingsButton) settingsButton.disabled = false;
            }
        }
        async function toggleScheduleEnabled(button) {
            if (!button) return false;
            const enabled = button.getAttribute('aria-checked') !== 'true';
            button.disabled = true;
            try {
                const response = await fetch('/set-schedule-enabled', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '切换定时任务失败');
                }
                button.setAttribute('aria-checked', String(data.enabled));
                button.textContent = data.enabled ? '已开启' : '已关闭';
                const settingsButton = document.getElementById('settings-schedule-enabled');
                const settingsStatus = settingsButton ? settingsButton.querySelector('small') : null;
                if (settingsButton) {
                    settingsButton.setAttribute('aria-checked', String(data.enabled));
                    settingsButton.dataset.scheduleEnabled = String(data.enabled);
                }
                if (settingsStatus) settingsStatus.textContent = data.enabled ? '已开启' : '已关闭';
                const countLabel = document.getElementById('speedtest-default-count');
                if (countLabel) countLabel.textContent = data.enabled ? '全部' : '未启用';
                const applied = document.getElementById('applied-cron-expressions');
                if (applied) {
                    applied.textContent = data.appliedCronExpressions?.length
                        ? data.appliedCronExpressions.join('；')
                        : '尚未同步';
                }
                showMessage(
                    data.warning || (data.enabled ? '定时任务已开启' : '定时任务已关闭'),
                    data.warning ? 'error' : 'success'
                );
                return true;
            } catch (error) {
                console.error('切换定时任务失败:', error);
                showMessage('切换定时任务失败：' + error.message, 'error');
                return false;
            } finally {
                button.disabled = false;
            }
        }
        async function clearIPData() {
            const categoryInput = document.getElementById('clear-ips-category');
            const status = document.getElementById('clear-ips-status');
            const button = document.getElementById('clear-ips-button');
            if (!categoryInput || !button) return false;
            const category = categoryInput.value;
            const labels = {
                premium: '优质 IP',
                'premium-domain': '优质域名',
                backup: '备用 IP',
                untested: '未测速 IP',
                all: '所有 IP'
            };
            const label = labels[category];
            if (!label) {
                showMessage('请选择有效的清理类别', 'error');
                return false;
            }
            const confirmed = window.confirm(
                '确定清理“' + label + '”吗？清理会作用于当前数据、历史快照及优质测速缓存，且无法恢复。'
            );
            if (!confirmed) return false;
            button.disabled = true;
            button.textContent = '清理中...';
            if (status) status.textContent = '正在清理所选类别，请勿关闭页面...';
            try {
                const response = await fetch('/clear-all-ips', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '清理 IP 数据失败');
                }
                closeSettingsModal('clear-ips-modal');
                showMessage('已清理' + label + '：移除 ' + data.removedAddresses + ' 个地址');
                await refreshData();
                return true;
            } catch (error) {
                console.error('清理 IP 数据失败:', error);
                if (status) status.textContent = '清理失败：' + error.message;
                showMessage('清理 IP 数据失败：' + error.message, 'error');
                return false;
            } finally {
                button.disabled = false;
                button.textContent = '清理';
            }
        }
        function applyScheduleSettings(fields, timezone, cronExpressions, appliedCronExpressions) {
            const fieldInputs = {
                minute: document.getElementById('schedule-cron-minute'),
                hour: document.getElementById('schedule-cron-hour'),
                dayOfMonth: document.getElementById('schedule-cron-day-of-month'),
                month: document.getElementById('schedule-cron-month'),
                dayOfWeek: document.getElementById('schedule-cron-day-of-week')
            };
            const timezoneInput = document.getElementById('scheduled-timezone');
            const timezoneLabel = document.getElementById('scheduled-timezone-label');
            const summary = document.getElementById('scheduled-time-summary');
            const expression = document.getElementById('desired-cron-expressions');
            const applied = document.getElementById('applied-cron-expressions');
            const intervalValue = document.getElementById('schedule-interval-value');
            const intervalUnit = document.getElementById('schedule-interval-unit');
            Object.keys(fieldInputs).forEach(function(key) {
                if (fieldInputs[key] && fields && typeof fields[key] === 'string') {
                    fieldInputs[key].value = fields[key];
                }
            });
            if (timezoneInput) timezoneInput.value = timezone;
            if (timezoneLabel) timezoneLabel.textContent = timezone;
            if (summary) summary.textContent = Object.values(fields || {}).join(' ');
            if (expression) expression.textContent = cronExpressions.join('；');
            if (applied) applied.textContent =
                (appliedCronExpressions || cronExpressions).join('；') || '尚未同步';
            if (intervalValue && intervalUnit && fields) {
                const minuteStep = fields.minute.match(/^\\*\\/(\\d+)$/);
                const hourStep = fields.hour.match(/^\\*\\/(\\d+)$/);
                const dayStep = fields.dayOfMonth.match(/^\\*\\/(\\d+)$/);
                const monthStep = fields.month.match(/^\\*\\/(\\d+)$/);
                let interval = null;
                if (minuteStep && fields.hour === '*' && fields.dayOfMonth === '*' &&
                    fields.month === '*' && fields.dayOfWeek === '*') {
                    interval = { value: minuteStep[1], unit: 'minute' };
                } else if (fields.minute === '0' && hourStep && fields.dayOfMonth === '*' &&
                    fields.month === '*' && fields.dayOfWeek === '*') {
                    interval = { value: hourStep[1], unit: 'hour' };
                } else if (fields.minute === '0' && fields.hour === '0' && dayStep &&
                    fields.month === '*' && fields.dayOfWeek === '*') {
                    interval = { value: dayStep[1], unit: 'day' };
                } else if (fields.minute === '0' && fields.hour === '0' &&
                    fields.dayOfMonth === '1' && monthStep && fields.dayOfWeek === '*') {
                    interval = { value: monthStep[1], unit: 'month' };
                }
                intervalValue.value = interval ? interval.value : '';
                if (interval) intervalUnit.value = interval.unit;
            }
        }
        function invalidateScheduleApiVerification() {
            verifiedScheduleApi = null;
            const testStatus = document.getElementById('schedule-api-test-status');
            const configStatus = document.getElementById('schedule-api-config-status');
            const tokenStatus = document.getElementById('schedule-token-status');
            const tokenInput = document.getElementById('schedule-api-token');
            const accountIdInput = document.getElementById('schedule-account-id');
            const scriptNameInput = document.getElementById('schedule-script-name');
            const saveButton = document.getElementById('save-schedule-api-config');
            if (testStatus) testStatus.textContent = 'API 参数或 Token 已更改，请重新测试连通性。';
            if (tokenStatus && tokenInput && saveButton) {
                if (tokenInput.value.trim()) {
                    tokenStatus.textContent = '已输入新 Token；点击“保存 API 设置”会尝试写入 KV，若额度耗尽则仅在当前页面临时使用。';
                } else {
                    tokenStatus.textContent = saveButton.dataset.tokenSaved === 'true'
                        ? 'Token 已保存在 IP_STORAGE KV。输入框保持空白以避免回显；留空表示保留当前 Token。'
                        : 'Token 未持久化；请填写 Token 后保存 API 设置，KV 不可写时可在当前页面临时使用。';
                }
            }
            if (configStatus && accountIdInput && scriptNameInput && saveButton) {
                const isSaved =
                    accountIdInput.value.trim() === saveButton.dataset.savedAccountId &&
                    scriptNameInput.value.trim() === saveButton.dataset.savedScriptName;
                configStatus.textContent = isSaved
                    ? (saveButton.dataset.configPersisted === 'true'
                        ? 'API 参数已持久化到 KV；Token '
                        : 'API 参数仅在当前页面临时可用；Token ') +
                        (saveButton.dataset.tokenSaved === 'true' ? '已保存于 KV' : '未保存') +
                        '。参数或 Token 已更改，请重新测试连通性。'
                    : 'API 参数尚未保存；点击“保存 API 设置”会尝试持久化，KV 额度耗尽时仅在当前页面可用。';
            }
        }
        async function findScheduleWorkers() {
            const tokenInput = document.getElementById('schedule-api-token');
            const accountIdInput = document.getElementById('schedule-account-id');
            const button = document.getElementById('find-schedule-workers');
            const status = document.getElementById('schedule-api-test-status');
            const pickerRow = document.getElementById('schedule-workers-picker-row');
            const picker = document.getElementById('schedule-workers-picker');
            if (!tokenInput || !accountIdInput || !button || !pickerRow || !picker) return false;
            const apiToken = tokenInput.value.trim();
            const accountId = accountIdInput.value.trim();
            if (!/^[a-fA-F0-9]{32}$/.test(accountId)) {
                if (status) status.textContent = '请填写有效的 32 位 Account ID';
                showMessage('请填写有效的 Account ID 后再读取 Worker 列表', 'error');
                return false;
            }
            button.disabled = true;
            button.textContent = '读取中...';
            try {
                const response = await fetch('/list-schedule-workers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiToken, accountId })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '读取 Worker 列表失败');
                }
                picker.replaceChildren();
                (data.workers || []).forEach(function(name) {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    picker.appendChild(option);
                });
                pickerRow.hidden = false;
                if (!data.workers || !data.workers.length) {
                    if (status) status.textContent = 'Token 可读取该账户，但账户 Worker 列表为空。请确认部署目标账户。';
                    return false;
                }
                if (status) status.textContent = '读取到 ' + data.workers.length + ' 个 Worker；请选择目标脚本名后点击“使用所选脚本名”。';
                return true;
            } catch (error) {
                console.error('读取 Cloudflare Worker 列表失败:', error);
                if (status) status.textContent = '读取 Worker 列表失败：' + error.message;
                showMessage('读取 Worker 列表失败：' + error.message, 'error');
                return false;
            } finally {
                button.disabled = false;
                button.textContent = '读取账户 Worker 列表';
            }
        }
        function useSelectedScheduleWorker() {
            const picker = document.getElementById('schedule-workers-picker');
            const scriptNameInput = document.getElementById('schedule-script-name');
            const status = document.getElementById('schedule-api-test-status');
            const configStatus = document.getElementById('schedule-api-config-status');
            const saveButton = document.getElementById('save-schedule-api-config');
            if (!picker || !scriptNameInput || !picker.value) return false;
            scriptNameInput.value = picker.value;
            invalidateScheduleApiVerification();
            if (saveButton) {
                saveButton.dataset.savedScriptName = '';
            }
            if (status) status.textContent = '已填入 Worker 脚本名 ' + picker.value + '；请点击“测试 API 连通性”验证。';
            if (configStatus) configStatus.textContent = '脚本名已变更，请测试并单独保存 API 设置。';
            return true;
        }
        async function testScheduleApi() {
            const tokenInput = document.getElementById('schedule-api-token');
            const accountIdInput = document.getElementById('schedule-account-id');
            const scriptNameInput = document.getElementById('schedule-script-name');
            const button = document.getElementById('test-schedule-api');
            const status = document.getElementById('schedule-api-test-status');
            if (!tokenInput || !accountIdInput || !scriptNameInput || !button) return false;
            const apiToken = tokenInput.value.trim();
            const accountId = accountIdInput.value.trim();
            const scriptName = scriptNameInput.value.trim();
            if (!/^[a-fA-F0-9]{32}$/.test(accountId)) {
                if (status) status.textContent = 'Account ID 必须是 32 位十六进制字符串';
                showMessage('Account ID 格式无效', 'error');
                return false;
            }
            if (!scriptName || scriptName.length > 255) {
                if (status) status.textContent = '请输入有效的 Worker 脚本名（最多 255 个字符）';
                showMessage('Worker 脚本名无效', 'error');
                return false;
            }
            button.disabled = true;
            button.textContent = '测试中...';
            verifiedScheduleApi = null;
            if (status) status.textContent = '正在验证 Token 及 Worker Cron 读取权限；本测试不会保存参数或修改 Cron...';
            try {
                const response = await fetch('/test-schedule-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiToken, accountId, scriptName })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Cloudflare API 连通性测试失败');
                }
                if (
                    tokenInput.value.trim() !== apiToken ||
                    accountIdInput.value.trim() !== accountId ||
                    scriptNameInput.value.trim() !== scriptName
                ) {
                    throw new Error('测试期间 API 参数或 Token 已更改，请使用当前参数重新测试');
                }
                verifiedScheduleApi = { accountId, scriptName };
                if (status) {
                    status.textContent = '连通成功：可读取该 Worker 的 Cron 配置（' +
                        data.scheduleCount + ' 项）；本次只读测试未保存参数，也未修改 Cron';
                }
                const configStatus = document.getElementById('schedule-api-config-status');
                const saveButton = document.getElementById('save-schedule-api-config');
                if (configStatus && saveButton) {
                    const isSaved =
                        accountId === saveButton.dataset.savedAccountId &&
                        scriptName === saveButton.dataset.savedScriptName;
                    const tokenStatus = saveButton.dataset.tokenSaved === 'true'
                        ? 'Token 已保存于 KV'
                        : 'Token 未保存';
                    configStatus.textContent = isSaved
                        ? 'API 参数已保存且连通性验证成功；' + tokenStatus + '。定时时间需使用下方独立按钮保存。'
                            : '连通性验证成功；API 参数尚未保存，' + tokenStatus + '。请点击“保存 API 设置”持久化参数/Token，再单独保存定时时间。';
                }
                showMessage('Cloudflare API 连通测试成功');
                return true;
            } catch (error) {
                console.error('Cloudflare API 连通性测试失败:', error);
                verifiedScheduleApi = null;
                if (status) status.textContent = '测试失败：' + error.message;
                showMessage('Cloudflare API 连通性测试失败：' + error.message, 'error');
                return false;
            } finally {
                button.disabled = false;
                button.textContent = '测试 API 连通性';
            }
        }
        async function saveScheduleApiConfig() {
            const accountIdInput = document.getElementById('schedule-account-id');
            const scriptNameInput = document.getElementById('schedule-script-name');
            const button = document.getElementById('save-schedule-api-config');
            const status = document.getElementById('schedule-api-config-status');
            if (!accountIdInput || !scriptNameInput || !button) return false;
            const accountId = accountIdInput.value.trim();
            const scriptName = scriptNameInput.value.trim();
            const apiToken = document.getElementById('schedule-api-token')?.value.trim() || '';
            if (!/^[a-fA-F0-9]{32}$/.test(accountId)) {
                if (status) status.textContent = 'Account ID 必须是 32 位十六进制字符串';
                showMessage('Account ID 格式无效', 'error');
                return false;
            }
            if (!scriptName || scriptName.length > 255) {
                if (status) status.textContent = '请输入有效的 Worker 脚本名（最多 255 个字符）';
                showMessage('Worker 脚本名无效', 'error');
                return false;
            }
            button.disabled = true;
            button.textContent = '保存中...';
            try {
                const response = await fetch('/set-schedule-api-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountId, scriptName, apiToken })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '保存定时 API 设置失败');
                }
                button.dataset.savedAccountId = data.accountId;
                button.dataset.savedScriptName = data.scriptName;
                button.dataset.configPersisted = String(Boolean(data.configurationDurable));
                button.dataset.tokenSaved = String(Boolean(data.tokenPersisted));
                const tokenInput = document.getElementById('schedule-api-token');
                volatileScheduleApiConfig = {
                    accountId: data.accountId,
                    scriptName: data.scriptName,
                    apiToken: data.tokenConfigured ? '' : apiToken
                };
                if (tokenInput && (data.tokenPersisted || (!apiToken && data.tokenConfigured))) {
                    tokenInput.value = '';
                }
                const tokenStatusElement = document.getElementById('schedule-token-status');
                if (tokenStatusElement) {
                    tokenStatusElement.textContent = data.tokenPersisted
                        ? 'Token 已保存在 IP_STORAGE KV。输入框保持空白以避免回显；留空表示保留当前 Token。'
                        : data.tokenConfigured
                            ? 'Token 由 CLOUDFLARE_API_TOKEN Worker Secret 提供；输入框保持空白以避免回显。'
                            : 'KV 暂不可写；Token 仅保留在当前页面内存中，刷新后需重新输入。';
                }
                const isVerified =
                    verifiedScheduleApi &&
                    verifiedScheduleApi.accountId === data.accountId &&
                    verifiedScheduleApi.scriptName === data.scriptName;
                const tokenStatus = data.tokenPersisted
                    ? 'Token 已持久化到 IP_STORAGE KV'
                    : data.tokenConfigured
                        ? 'Token 由 Worker Secret 持久提供'
                        : 'Token 暂存在当前页面内存中';
                const persistenceStatus = data.configurationDurable
                    ? (data.persistenceWarning
                        ? '参数已由 KV 或 Worker 环境配置持久提供。'
                        : data.accountIdPersisted && data.scriptNamePersisted
                            ? 'Account ID 和 Worker 脚本名已持久化到 KV。'
                            : '配置由 Worker 环境变量 / Secret 持久提供。')
                    : '部分参数仅在当前页面临时可用；刷新后需重新输入。原因：' +
                        (data.persistenceWarning || '缺少持久配置');
                if (status) status.textContent = persistenceStatus + ' ' + tokenStatus +
                    (isVerified
                        ? '；连通性已验证。现在可保存定时时间。'
                        : '；请测试连通性后，再保存定时时间。');
                showMessage(data.persistenceWarning
                    ? 'KV 写入额度已耗尽；参数暂存于当前页面，可继续保存 Cron'
                    : isVerified
                        ? '定时 API 参数已保存，连通性已验证'
                        : '定时 API 参数已保存；请测试连通性');
                return true;
            } catch (error) {
                console.error('保存定时 API 设置失败:', error);
                if (status) status.textContent = '保存失败：' + error.message;
                showMessage('保存定时 API 设置失败：' + error.message, 'error');
                return false;
            } finally {
                button.disabled = false;
                button.textContent = '保存 API 设置';
            }
        }
        async function saveScheduledTimes() {
            const fieldIds = {
                minute: 'schedule-cron-minute',
                hour: 'schedule-cron-hour',
                dayOfMonth: 'schedule-cron-day-of-month',
                month: 'schedule-cron-month',
                dayOfWeek: 'schedule-cron-day-of-week'
            };
            const cronToggle = document.getElementById('schedule-enabled-toggle');
            const settingsToggle = document.getElementById('settings-schedule-enabled');
            const settingsToggleStatus = settingsToggle ? settingsToggle.querySelector('small') : null;
            const enabled = cronToggle
                ? cronToggle.getAttribute('aria-checked') === 'true'
                : settingsToggleStatus
                    ? settingsToggleStatus.textContent === '已开启'
                    : false;
            const timezoneInput = document.getElementById('scheduled-timezone');
            const apiTokenInput = document.getElementById('schedule-api-token');
            const accountIdInput = document.getElementById('schedule-account-id');
            const scriptNameInput = document.getElementById('schedule-script-name');
            const button = document.getElementById('save-scheduled-times');
            const status = document.getElementById('scheduled-times-status');
            const fields = {};
            Object.keys(fieldIds).forEach(function(key) {
                const fieldInput = document.getElementById(fieldIds[key]);
                fields[key] = fieldInput ? fieldInput.value.trim() : '';
            });
            if (Object.values(fields).some(function(value) { return !value; })) {
                if (status) status.textContent = '请填写五个 Cron 字段；不限制的字段填写 *';
                showMessage('请填写五个 Cron 字段；不限制的字段填写 *', 'error');
                return false;
            }
            if (!timezoneInput || !apiTokenInput || !accountIdInput ||
                !scriptNameInput || !button) {
                showMessage('定时设置页面未完整加载，请刷新后重试', 'error');
                return false;
            }
            const accountId = accountIdInput.value.trim();
            const scriptName = scriptNameInput.value.trim();
            const apiConfigButton = document.getElementById('save-schedule-api-config');
            if (enabled) {
                if (!apiConfigButton ||
                    apiConfigButton.dataset.savedAccountId !== accountId ||
                    apiConfigButton.dataset.savedScriptName !== scriptName) {
                    if (status) status.textContent = 'Account ID 或脚本名已修改，请先点击“保存 API 设置”';
                    showMessage('请先单独保存已修改的 API 设置', 'error');
                    return false;
                }
                if (!/^[a-fA-F0-9]{32}$/.test(accountId)) {
                    if (status) status.textContent = 'Account ID 必须是 32 位十六进制字符串';
                    showMessage('Account ID 格式无效', 'error');
                    return false;
                }
                if (!scriptName || scriptName.length > 255) {
                    if (status) status.textContent = '请输入有效的 Worker 脚本名（最多 255 个字符）';
                    showMessage('Worker 脚本名无效', 'error');
                    return false;
                }
                if (!window.confirm('这会替换当前 Worker 脚本的全部 Cron Trigger，并立即调用 Cloudflare API 更新。确定继续吗？')) {
                    return false;
                }
            }
            button.disabled = true;
            button.textContent = '保存中...';
            try {
                const response = await fetch('/set-schedule-times', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fields,
                        timezone: timezoneInput.value,
                        replaceExisting: true,
                        enabled,
                        apiToken: apiTokenInput.value.trim() ||
                            volatileScheduleApiConfig?.apiToken || '',
                        accountId,
                        scriptName
                    })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '保存定时任务时间失败');
                }
                applyScheduleSettings(
                    data.fields,
                    data.timezone,
                    data.cronExpressions,
                    data.appliedCronExpressions,
                );
                apiTokenInput.value = '';
                if (status) {
                    status.textContent = data.enabled
                        ? 'Cloudflare 已应用 Cron：' +
                            data.appliedCronExpressions.join('；') +
                            (data.persistenceWarning
                                ? '；KV 每日写入额度已用完，页面下次打开时会从 Cloudflare 回读当前规则。'
                                : '')
                        : '运行时间已保存；定时任务当前已关闭，暂不应用 Cron。';
                }
                scheduleCronLoadedFromCloudflare = true;
                showMessage(data.enabled
                    ? '定时任务时间已通过 Cloudflare API 更新'
                    : '定时任务时间已保存，当前未启用');
                return true;
            } catch (error) {
                console.error('保存定时任务时间失败:', error);
                if (status) status.textContent = '保存失败，请重试：' + error.message;
                showMessage('定时任务时间保存失败：' + error.message, 'error');
                return false;
            } finally {
                button.disabled = false;
                button.textContent = '保存';
            }
        }
        function updateScheduleIntervalLimit() {
            const valueInput = document.getElementById('schedule-interval-value');
            const unitInput = document.getElementById('schedule-interval-unit');
            if (!valueInput || !unitInput) return false;
            const maximums = { minute: 59, hour: 23, day: 31, month: 12 };
            const maximum = maximums[unitInput.value];
            if (!maximum) return false;
            valueInput.max = String(maximum);
            valueInput.setAttribute('aria-label', '定时运行间隔，1 至 ' + maximum);
            return true;
        }
        function applyScheduleInterval() {
            const valueInput = document.getElementById('schedule-interval-value');
            const unitInput = document.getElementById('schedule-interval-unit');
            const timezoneInput = document.getElementById('scheduled-timezone');
            const minuteInput = document.getElementById('schedule-cron-minute');
            const hourInput = document.getElementById('schedule-cron-hour');
            const dayInput = document.getElementById('schedule-cron-day-of-month');
            const monthInput = document.getElementById('schedule-cron-month');
            const weekdayInput = document.getElementById('schedule-cron-day-of-week');
            const status = document.getElementById('scheduled-times-status');
            if (!valueInput || !unitInput || !timezoneInput || !minuteInput ||
                !hourInput || !dayInput || !monthInput || !weekdayInput) {
                showMessage('定时设置页面未完整加载，请刷新后重试', 'error');
                return false;
            }
            const unit = unitInput.value;
            const maximums = { minute: 59, hour: 23, day: 31, month: 12 };
            const maximum = maximums[unit];
            const interval = Number(valueInput.value);
            if (!maximum || !Number.isSafeInteger(interval) || interval < 1 || interval > maximum) {
                if (status) status.textContent = '间隔必须是 1 至 ' + (maximum || 0) + ' 的整数';
                showMessage('请输入有效的运行间隔', 'error');
                return false;
            }
            const fields = {
                minute: unit === 'minute' ? '*/' + interval : '0',
                hour: unit === 'minute' ? '*' : unit === 'hour' ? '*/' + interval : '0',
                dayOfMonth: unit === 'day' ? '*/' + interval : unit === 'month' ? '1' : '*',
                month: unit === 'month' ? '*/' + interval : '*',
                dayOfWeek: '*'
            };
            const cron = Object.values(fields).join(' ');
            minuteInput.value = fields.minute;
            hourInput.value = fields.hour;
            dayInput.value = fields.dayOfMonth;
            monthInput.value = fields.month;
            weekdayInput.value = fields.dayOfWeek;
            timezoneInput.value = 'UTC';
            applyScheduleSettings(fields, 'UTC', [cron], [cron]);
            const unitLabels = { minute: '分钟', hour: '小时', day: '天', month: '个月' };
            if (status) {
                status.textContent = '已生成单条 UTC Cron：' + cron +
                    '（每 ' + interval + ' ' + unitLabels[unit] + '）；点击“保存”应用到 Cloudflare。';
            }
            return true;
        }
        async function saveSpeedTestThreshold(field) {
            const isLatency = field === 'maxLatency';
            const input = document.getElementById(
                isLatency ? 'max-speedtest-latency' : 'min-speedtest-bandwidth'
            );
            const status = document.getElementById(
                isLatency ? 'max-speedtest-latency-status' : 'min-speedtest-bandwidth-status'
            );
            const button = document.getElementById(
                isLatency ? 'save-max-speedtest-latency' : 'save-min-speedtest-bandwidth'
            );
            if (!input || !button || (field !== 'maxLatency' && field !== 'minBandwidth')) {
                return false;
            }
            const value = Number(input.value);
            if (isLatency && (!Number.isSafeInteger(value) || value < 1)) {
                if (status) status.textContent = '最高延迟必须是大于 0 的整数';
                showMessage('最高延迟必须是大于 0 的整数（ms）', 'error');
                return false;
            }
            if (!isLatency && (!Number.isFinite(value) || value < 0)) {
                if (status) status.textContent = '最低带宽必须是大于等于 0 的数字';
                showMessage('最低带宽必须是大于等于 0 的数字（MB/s）', 'error');
                return false;
            }
            button.disabled = true;
            button.textContent = '保存中...';
            try {
                const response = await fetch('/set-speedtest-thresholds', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [field]: value })
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || '保存测速阈值失败');
                }
                speedTestThresholds = {
                    maxLatency: data.maxLatency,
                    minBandwidth: data.minBandwidth
                };
                if (status) {
                    status.textContent = isLatency
                        ? '已保存：最高延迟 ≤ ' + data.maxLatency + ' ms'
                        : '已保存：最低带宽 ≥ ' + data.minBandwidth + ' MB/s';
                }
                const thresholdLabel = document.getElementById('speedtest-threshold-label');
                if (thresholdLabel) {
                    thresholdLabel.textContent = '按每国设置数量筛选';
                }
                showMessage(isLatency ? '最高延迟已单独保存' : '最低带宽已单独保存');
                await refreshData();
                return true;
            } catch (error) {
                console.error(isLatency ? '保存最高延迟失败:' : '保存最低带宽失败:', error);
                if (status) status.textContent = '保存失败，请重试';
                showMessage((isLatency ? '最高延迟' : '最低带宽') + '保存失败：' + error.message, 'error');
                return false;
            } finally {
                button.disabled = false;
                button.textContent = '保存';
            }
        }
        async function saveQualityCountries(showSuccess) {
            const selected = Array.from(document.querySelectorAll('input[name="quality-country"]:checked'))
                .map(function(input) { return input.value; });
            const qualityCountryLimits = {};
            let invalidLimit = false;
            document.querySelectorAll('input[name="quality-country-limit"]').forEach(function(input) {
                const value = input.value.trim() === '' ? NaN : Number(input.value);
                if (!Number.isSafeInteger(value) || value < 0 || value > 1000) {
                    invalidLimit = true;
                } else {
                    if (!qualityCountryLimits[input.dataset.country]) {
                        qualityCountryLimits[input.dataset.country] = {};
                    }
                    qualityCountryLimits[input.dataset.country][input.dataset.type] = value;
                }
            });
            const status = document.getElementById('quality-countries-status');
            const button = document.getElementById('save-quality-countries');
            if (!selected.length) {
                if (status) status.textContent = '至少选择一个国家 / 地区';
                showMessage('至少选择一个国家 / 地区', 'error');
                return false;
            }
            if (invalidLimit || Object.keys(qualityCountryLimits).length !== Object.keys(CLIENT_COUNTRY_NAMES).length ||
                Object.values(qualityCountryLimits).some(function(limits) {
                    return !Number.isSafeInteger(limits.ip) || !Number.isSafeInteger(limits.domain);
                })) {
                if (status) status.textContent = '每个国家的优质 IP 和优质域名数量都必须是 0 到 1000 之间的整数';
                showMessage('请检查每个国家的优质 IP、优质域名数量', 'error');
                return false;
            }
            if (button) {
                button.disabled = true;
                button.textContent = '保存中...';
            }
            qualityCountriesSelected = selected;
            try {
                const response = await fetch('/set-quality-countries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ countries: selected, qualityCountryLimits: qualityCountryLimits })
                });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.error || '保存国家 / 地区失败');
                clearLocalSettingsFallback('qualityCountries');
                clearLocalSettingsFallback('qualityCountryLimits');
                if (status) status.textContent = '地区选择及每国优质 IP、优质域名数量已分别保存';
                if (showSuccess) showMessage('优选国家、地区数量设置已保存');
            } catch (error) {
                console.error('保存优选国家 / 地区失败:', error);
                const savedLocally = writeLocalSettingsFallback({ qualityCountries: selected });
                if (status) status.textContent = savedLocally
                    ? '国家选择已暂存到本浏览器；每国数量未保存，服务端仍使用上次配置'
                    : '保存失败，请重试';
                showMessage(
                    savedLocally
                        ? '服务端保存失败，国家选择仅暂存于本浏览器；优质地址数量仍使用服务端上次配置。错误：' + error.message
                        : '国家 / 地区保存失败：' + error.message,
                    'error'
                );
                return false;
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = '保存地区和数量';
                }
            }
            updateQualityTextLinks();
            await refreshQualityIPs();
            return true;
        }
        function switchAddressList(view, countryCode) {
            const tabViews = ['premium', 'premium-domain', 'backup', 'untested'];
            const tabs = {};
            tabViews.forEach(function(tabView) {
                tabs[tabView] = document.getElementById('list-tab-' + tabView);
            });
            if (!tabViews.includes(view) || tabViews.some(function(tabView) {
                return !tabs[tabView];
            })) return;
            currentAddressListView = view;
            if (arguments.length > 1) currentQualityCountry = countryCode || '';
            else if (view === 'premium') currentQualityCountry = '';
            if (view !== 'premium') currentQualityCountry = '';
            tabViews.forEach(function(tabView) {
                const active = tabView === view;
                tabs[tabView].classList.toggle('active', active);
                tabs[tabView].setAttribute('aria-selected', String(active));
            });
            const ipItems = Array.from(document.querySelectorAll('#ip-list .ip-item'));
            ipItems.forEach(function(item) {
                item.hidden = item.dataset.speedCategory !== view ||
                    (view === 'premium' && currentQualityCountry &&
                        item.dataset.country !== currentQualityCountry);
            });
            document.querySelectorAll('#quality-country-grid [data-quality-country]').forEach(function(button) {
                const active = (button.dataset.qualityCountry || '') === currentQualityCountry;
                button.classList.toggle('active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            const counts = {
                premium: 0,
                'premium-domain': 0,
                backup: 0,
                untested: 0
            };
            ipItems.forEach(function(item) {
                if (Object.prototype.hasOwnProperty.call(counts, item.dataset.speedCategory)) {
                    counts[item.dataset.speedCategory]++;
                }
            });
            ['premium', 'premium-domain', 'backup', 'untested'].forEach(function(category) {
                const countId = category === 'premium-domain'
                    ? 'premium-domain-tab-count'
                    : category + '-tab-count';
                const countElement = document.getElementById(countId);
                if (countElement) countElement.textContent = String(counts[category]);
            });
            const premiumStatCount = document.getElementById('premium-stat-count');
            if (premiumStatCount) {
                premiumStatCount.textContent = String(counts.premium);
            }
            const premiumDomainStatCount = document.getElementById('premium-domain-stat-count');
            if (premiumDomainStatCount) {
                premiumDomainStatCount.textContent = String(counts['premium-domain']);
            }
            const emptyMessage = document.getElementById('speed-category-empty');
            if (emptyMessage) {
                const visibleCount = ipItems.filter(function(item) {
                    return item.dataset.speedCategory === view &&
                        (view !== 'premium' || !currentQualityCountry ||
                            item.dataset.country === currentQualityCountry);
                }).length;
                emptyMessage.hidden = visibleCount > 0;
                emptyMessage.textContent = view === 'premium'
                    ? '所选地区暂无已测速的优质 IP。'
                    : view === 'premium-domain'
                        ? '所选地区暂无已测速的优质域名。'
                    : view === 'backup'
                        ? '暂无备用 IP。'
                        : '暂无未测速 IP。';
            }
            updateSpeedTestEstimate();
        }
        async function startSpeedTest(countOverride, category) {
            if (isTesting) return showMessage('测速正在进行中，请稍候...', 'error');
            category = category || 'all';
            const categoryLabels = {
                all: '全部 IP',
                premium: '优质 IP',
                'premium-domain': '优质域名',
                backup: '备用 IP',
                untested: '未测速 IP'
            };
            if (!['all', 'premium', 'premium-domain', 'backup', 'untested'].includes(category)) {
                return showMessage('无效的测速分类', 'error');
            }
            const allIPItems = Array.from(document.querySelectorAll('#ip-list .ip-item'));
            const ipItems = category === 'all'
                ? allIPItems
                : allIPItems.filter(function(item) {
                    return item.dataset.speedCategory === category;
                });
            const countInput = document.getElementById('speedtest-count');
            const rawCount = countOverride === undefined
                ? (countInput ? countInput.value.trim() : '')
                : countOverride;
            const requestedCount = rawCount === '' ? NaN : Number(rawCount);
            if (!Number.isSafeInteger(requestedCount) || requestedCount < 0) {
                return showMessage('测速数量必须是大于等于 0 的整数，0 表示全部', 'error');
            }
            isTesting = true;
            switchAddressList(category === 'all' ? 'premium' : category);
            const speedtestButtons = Array.from(document.querySelectorAll('.speedtest-preset-btn'));
            const progressBar = document.getElementById('speed-test-progress');
            const progressBarInner = document.getElementById('speed-test-progress-bar');
            const statusElement = document.getElementById('speed-test-status');
            speedtestButtons.forEach(function(button) { button.disabled = true; });
            progressBar.style.display = 'block';
            progressBarInner.style.width = '0%';
            let testItems = [];
            let totalIPs = 0;
            const countIndicator = document.getElementById('speedtest-selected-count');
            if (countIndicator) {
                countIndicator.textContent = '本次 ' + categoryLabels[category] + ' · ' +
                    (requestedCount === 0 ? '全部' : requestedCount) + ' 节点';
            }
            currentTestIndex = 0;
            let transferredBytes = 0;
            const qualityResults = [];
            const autoBlacklistedAddresses = [];
            let qualityPersistenceWarning = '';
            const transferredElement = document.getElementById('speedtest-transferred');
            const updateManualTransferred = function(text) {
                if (transferredElement) transferredElement.textContent = text;
            };
            updateManualTransferred('0 KB');
            // 禁用所有测速按钮
            document.querySelectorAll('.small-btn[id^="test-"]').forEach(function(btn) {
                if (btn) btn.disabled = true;
            });
            const batchResultsByAddress = new Map();
            const testItemByAddress = new Map(
                allIPItems.map(function(item) { return [item.dataset.ip, item]; })
            );
            try {
                statusElement.textContent = '正在由 Worker 统一测速 ' +
                    categoryLabels[category] + '，正在读取完整地址列表...';
                const planResponse = await fetch('/manual-speedtest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        maxTests: requestedCount,
                        category: category,
                        plan: true
                    })
                });
                const plan = await planResponse.json();
                if (!planResponse.ok || !plan.success || !Array.isArray(plan.addresses)) {
                    throw new Error(plan.error || '读取测速地址列表失败');
                }
                totalIPs = plan.addresses.length;
                const manualBatchSizeElement = document.getElementById('manual-speedtest-batch-size');
                const manualBatchIntervalElement = document.getElementById('manual-speedtest-batch-interval');
                const manualAddressIntervalElement = document.getElementById('manual-speedtest-address-interval');
                if (manualBatchSizeElement && Number.isSafeInteger(plan.batchSize)) {
                    manualBatchSizeElement.textContent = String(plan.batchSize);
                }
                if (manualBatchIntervalElement) {
                    manualBatchIntervalElement.textContent = ((Number(plan.batchDelayMs) || 0) / 1000) + ' 秒';
                }
                if (manualAddressIntervalElement) {
                    manualAddressIntervalElement.textContent = ((Number(plan.addressIntervalMs) || 0) / 1000) + ' 秒';
                }
                const manualEstimateElement = document.getElementById('speedtest-estimate-detail');
                if (manualEstimateElement) {
                    const manualMib = (totalIPs * 300000 / 1024 / 1024).toFixed(1);
                    manualEstimateElement.textContent = totalIPs + ' 个 · ' + manualMib + ' MiB';
                }
                testItems = plan.addresses
                    .map(function(address) { return testItemByAddress.get(address); })
                    .filter(Boolean);
                testItems.forEach(function(item) {
                    const speedElement = item.querySelector('.speed-result');
                    const bandwidthElement = item.querySelector('.bandwidth-result');
                    if (speedElement) {
                        speedElement.textContent = '排队中...';
                        speedElement.className = 'speed-result';
                    }
                    if (bandwidthElement) {
                        bandwidthElement.textContent = '排队中...';
                        bandwidthElement.className = 'speed-result bandwidth-result';
                    }
                });
                if (countIndicator) {
                    countIndicator.textContent = '本次 ' + categoryLabels[category] +
                        ' · ' + totalIPs + ' 节点';
                }
                if (!totalIPs) {
                    throw new Error('服务端没有返回可测速地址，请检查所选分类');
                }
                const batchSize = Number.isSafeInteger(plan.batchSize) && plan.batchSize > 0
                    ? plan.batchSize
                    : 50;
                const batchDelayMs = Number.isSafeInteger(plan.batchDelayMs) && plan.batchDelayMs >= 0
                    ? plan.batchDelayMs
                    : 1000;
                const data = { results: [], transferredBytes: 0 };
                const batchCount = Math.ceil(totalIPs / batchSize);
                for (let offset = 0; offset < totalIPs; offset += batchSize) {
                    if (offset > 0) {
                        statusElement.textContent = '第 ' + (offset / batchSize + 1) +
                            '/' + batchCount + ' 批即将开始，间隔 ' +
                            (batchDelayMs / 1000) + ' 秒...';
                        await new Promise(function(resolve) {
                            setTimeout(resolve, batchDelayMs);
                        });
                    }
                    const addresses = plan.addresses.slice(offset, offset + batchSize);
                    addresses.forEach(function(address) {
                        const item = testItemByAddress.get(address);
                        if (!item) return;
                        const speedElement = item.querySelector('.speed-result');
                        const bandwidthElement = item.querySelector('.bandwidth-result');
                        if (speedElement) {
                            speedElement.textContent = '测试中...';
                            speedElement.className = 'speed-result';
                        }
                        if (bandwidthElement) bandwidthElement.textContent = '测试中...';
                    });
                    statusElement.textContent = '正在测速第 ' +
                        (Math.floor(offset / batchSize) + 1) + '/' + batchCount +
                        ' 批（' + addresses.length + ' 个）...';
                    const controller = new AbortController();
                    let timeoutId = setTimeout(function() {
                        controller.abort();
                    }, 30000);
                    try {
                        const response = await fetch('/manual-speedtest', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                addresses: addresses,
                                category: 'all',
                                progress: true
                            }),
                            signal: controller.signal
                        });
                        if (!response.ok) {
                            const errorData = await response.json().catch(function() { return {}; });
                            throw new Error(errorData.error || '第 ' +
                                (Math.floor(offset / batchSize) + 1) + ' 批测速失败');
                        }
                        if (!response.body || typeof response.body.getReader !== 'function') {
                            throw new Error('浏览器不支持测速进度流');
                        }
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let buffer = '';
                        let batchData = null;
                        const processBatchEvent = function(event) {
                            if (event.type === 'start') {
                                statusElement.textContent = '正在测速第 ' +
                                    (Math.floor(offset / batchSize) + 1) + '/' + batchCount +
                                    ' 批：0/' + addresses.length;
                            } else if (event.type === 'progress') {
                                const completed = Number(event.completed) || 0;
                                currentTestIndex = Math.min(offset + completed, totalIPs);
                                progressBarInner.style.width =
                                    Math.min(100, currentTestIndex / totalIPs * 100) + '%';
                                statusElement.textContent = '测速进度：' + currentTestIndex +
                                    '/' + totalIPs + '，正在测试 ' + (event.address || '');
                                const item = testItemByAddress.get(event.address);
                                if (item) {
                                    const speedElement = item.querySelector('.speed-result');
                                    const bandwidthElement = item.querySelector('.bandwidth-result');
                                    if (event.success && event.measurement) {
                                        const latency = Number(event.measurement.latency);
                                        const bandwidth = Number(event.measurement.bandwidth);
                                        const qualifiesByThreshold =
                                            Number.isFinite(latency) &&
                                            Number.isFinite(bandwidth) &&
                                            latency <= speedTestThresholds.maxLatency &&
                                            (speedTestThresholds.minBandwidth === 0 ||
                                                bandwidth >= speedTestThresholds.minBandwidth);
                                        item.dataset.speedTested = 'true';
                                        item.dataset.speedCategory = qualifiesByThreshold
                                            ? (item.dataset.speedCategory === 'premium-domain'
                                                || (item.dataset.ip && /[a-zA-Z]/.test(item.dataset.ip) &&
                                                    !/^([0-9A-Fa-f]*:){2,}[0-9A-Fa-f]*$/.test(item.dataset.ip))
                                                ? 'premium-domain'
                                                : 'premium')
                                            : 'backup';
                                        if (speedElement && Number.isFinite(latency)) {
                                            speedElement.textContent = Math.round(latency) + 'ms';
                                            speedElement.className = 'speed-result ' +
                                                getClientLatencySpeedClass(latency);
                                        }
                                        if (bandwidthElement && Number.isFinite(bandwidth)) {
                                            bandwidthElement.textContent = bandwidth.toFixed(2) + ' MB/s';
                                            bandwidthElement.className = 'speed-result bandwidth-result ' +
                                                getClientBandwidthSpeedClass(bandwidth, latency);
                                        }
                                    } else {
                                        if (speedElement) {
                                            speedElement.textContent = '失败';
                                            speedElement.className = 'speed-result speed-slow';
                                        }
                                        if (bandwidthElement) {
                                            bandwidthElement.textContent = '失败';
                                            bandwidthElement.className = 'speed-result bandwidth-result';
                                        }
                                    }
                                }
                            } else if (event.type === 'complete') {
                                batchData = event.result;
                            } else if (event.type === 'error') {
                                throw new Error(event.error || '服务端测速失败');
                            }
                        };
                        while (true) {
                            const chunk = await reader.read();
                            clearTimeout(timeoutId);
                            if (!chunk.done) {
                                timeoutId = setTimeout(function() {
                                    controller.abort();
                                }, 30000);
                            }
                            buffer += decoder.decode(chunk.value || new Uint8Array(), {
                                stream: !chunk.done
                            });
                            const lines = buffer.split('\\n');
                            buffer = lines.pop() || '';
                            for (const line of lines) {
                                if (line.trim()) processBatchEvent(JSON.parse(line));
                            }
                            if (chunk.done) break;
                        }
                        if (buffer.trim()) processBatchEvent(JSON.parse(buffer));
                        if (!batchData || !batchData.success ||
                            !Array.isArray(batchData.results)) {
                            throw new Error('第 ' + (Math.floor(offset / batchSize) + 1) +
                                ' 批未返回有效测速结果');
                        }
                        data.results.push.apply(data.results, batchData.results);
                        data.transferredBytes += Number(batchData.transferredBytes) || 0;
                        if (Array.isArray(batchData.autoBlacklistedAddresses)) {
                            autoBlacklistedAddresses.push.apply(
                                autoBlacklistedAddresses,
                                batchData.autoBlacklistedAddresses
                            );
                        }
                    } finally {
                        clearTimeout(timeoutId);
                    }
                    currentTestIndex = Math.min(offset + addresses.length, totalIPs);
                    progressBarInner.style.width =
                        Math.min(100, currentTestIndex / totalIPs * 100) + '%';
                    updateManualTransferred(
                        data.transferredBytes >= 1024 * 1024
                            ? (data.transferredBytes / 1024 / 1024).toFixed(2) + ' MiB'
                            : Math.ceil(data.transferredBytes / 1024) + ' KB'
                    );
                    statusElement.textContent = '测速进度：' + currentTestIndex +
                        '/' + totalIPs + ' 个，已完成第 ' +
                        (Math.floor(offset / batchSize) + 1) + '/' + batchCount + ' 批';
                }
                if (!totalIPs) {
                    throw new Error('服务端没有返回可测速地址，请检查所选分类');
                }
                if (!data || !Array.isArray(data.results)) {
                    throw new Error('服务端返回的测速结果格式无效');
                }
                data.results.forEach(function(result) {
                    if (result && typeof result.ip === 'string') {
                        batchResultsByAddress.set(result.ip, result);
                    }
                });
                transferredBytes = Number(data.transferredBytes) || 0;
                updateManualTransferred(
                    transferredBytes >= 1024 * 1024
                        ? (transferredBytes / 1024 / 1024).toFixed(2) + ' MiB'
                        : Math.ceil(transferredBytes / 1024) + ' KB'
                );
            } catch (error) {
                console.error('服务端批量测速失败:', error);
                isTesting = false;
                speedtestButtons.forEach(function(button) { button.disabled = false; });
                progressBar.style.display = 'none';
                document.querySelectorAll('.small-btn[id^="test-"]').forEach(function(btn) {
                    if (btn) btn.disabled = false;
                });
                testItems.forEach(function(item) {
                    const speedElement = item.querySelector('.speed-result');
                    const bandwidthElement = item.querySelector('.bandwidth-result');
                    if (speedElement &&
                        (speedElement.textContent === '测试中...' ||
                            speedElement.textContent === '排队中...')) {
                        speedElement.textContent = '服务端错误';
                        speedElement.className = 'speed-result speed-slow';
                    }
                    if (bandwidthElement &&
                        (bandwidthElement.textContent === '测试中...' ||
                            bandwidthElement.textContent === '排队中...')) {
                        bandwidthElement.textContent = '未返回结果';
                    }
                });
                statusElement.textContent = '服务端测速失败';
                showMessage('服务端统一测速失败：' + error.message, 'error');
                return;
            }
            for (let i = 0; i < testItems.length; i++) {
                const ipItem = testItems[i];
                const address = ipItem.dataset.ip;
                const speedElement = ipItem.querySelector('.speed-result');
                const bandwidthElement = ipItem.querySelector('.bandwidth-result');
                if (!address) {
                    if (speedElement) speedElement.textContent = '无地址';
                    if (bandwidthElement) bandwidthElement.textContent = '-- MB/s';
                    continue;
                }
                try {
                    const data = batchResultsByAddress.get(address);
                    if (!data) {
                        if (speedElement) {
                            speedElement.textContent = '失败';
                            speedElement.className = 'speed-result speed-slow';
                        }
                        if (bandwidthElement) {
                            bandwidthElement.textContent = '失败';
                            bandwidthElement.className = 'speed-result bandwidth-result';
                        }
                        continue;
                    }
                    const latency = data.latency;
                    if (data.qualityPersistenceError) {
                        qualityPersistenceWarning = data.qualityPersistenceError;
                    }
                    const addressElement = ipItem.querySelector('.ip-address');
                    if (!addressElement) {
                        if (speedElement) speedElement.textContent = '显示错误';
                        if (bandwidthElement) bandwidthElement.textContent = '-- MB/s';
                        continue;
                    }
                    if (data.success) {
                        ipItem.dataset.speedTested = 'true';
                        ipItem.dataset.speedCategory =
                            ['premium', 'premium-domain', 'backup', 'untested'].includes(data.category)
                                ? data.category
                                : 'backup';
                        if (data.qualityResult?.signature) qualityResults.push(data.qualityResult);
                        const rounded = Math.round(latency);
                        const speedClass = getClientLatencySpeedClass(rounded);
                        if (speedElement) {
                            speedElement.textContent = rounded + 'ms';
                            speedElement.className = 'speed-result ' + speedClass;
                        }
                        if (bandwidthElement) {
                            bandwidthElement.textContent = Number.isFinite(data.bandwidth)
                                ? data.bandwidth.toFixed(2) + ' MB/s'
                                : '不可用';
                            bandwidthElement.className = 'speed-result bandwidth-result ' +
                                getClientBandwidthSpeedClass(data.bandwidth, latency);
                        }
                        if (addressElement) {
                            const parsed = parseAddressWithPort(address);
                            let displayLocation = data.location || '未知';
                            if (parsed.type !== 'domain' && (displayLocation === "未知" || displayLocation.toLowerCase() === 'ipv4' || displayLocation.toLowerCase() === 'ipv6')) {
                              displayLocation = parsed.type.toUpperCase();
                            }
                            // 对于域名类型：如果 displayLocation 是域名本身（无国家代码），则使用域名作为兜底
                            if (parsed.type === 'domain') {
                              // 检查 location 是否包含国家代码（格式：domain_CN）
                              const hasCountryCode = displayLocation && displayLocation !== "未知" && displayLocation.startsWith(parsed.address + '_');
                              if (hasCountryCode) {
                                displayLocation = displayLocation; // 保留完整的 domain_CN
                              } else {
                                // 查询失败或无有效位置，使用域名本身作为兜底
                                displayLocation = parsed.address;
                              }
                            }
                            let displayAddress = parsed.address;
                            if (parsed.type === 'ipv6') displayAddress = '[' + displayAddress + ']';
                            if (parsed.port !== 443) displayAddress += ':' + parsed.port;
                            const typeLabel = parsed.type === 'ipv4' ? 'IPv4'
                                : parsed.type === 'ipv6' ? 'IPv6'
                                : parsed.type === 'domain' ? '域名' : '';
                            const countryCode = getClientCountryCode({ countryCode: data.countryCode, location: displayLocation });
                            const countryName = countryCode ? CLIENT_COUNTRY_NAMES[countryCode] : '';
                            addressElement.innerHTML = escapeHtml(displayAddress) +
                                (typeLabel ? '<span class="ip-type-badge">' + typeLabel + '</span>' : '') +
                                (countryName ? '<span class="ip-country-badge">' + escapeHtml(countryName) + '</span>' : '');
                            const locationElement = ipItem.querySelector('.ip-location');
                            if (locationElement) locationElement.textContent = '线路 · ' + formatClientLocationLabel(displayLocation);
                        }
                        speedResults[address] = {
                            latency: rounded,
                            bandwidth: data.bandwidth,
                            countryCode: data.countryCode,
                            success: true
                        };
                    } else {
                        if (speedElement) {
                            speedElement.textContent = '失败';
                            speedElement.className = 'speed-result speed-slow';
                        }
                        if (bandwidthElement) {
                            bandwidthElement.textContent = '失败';
                            bandwidthElement.className = 'speed-result bandwidth-result';
                        }
                    }
                    // 强制重绘
                    if (speedElement) void speedElement.offsetHeight;
                } catch (error) {
                    console.error('批量测速错误:', error);
                    const speedElement = ipItem.querySelector('.speed-result');
                    if (speedElement) {
                        speedElement.textContent = '错误';
                        speedElement.className = 'speed-result speed-slow';
                    }
                    if (bandwidthElement) {
                        bandwidthElement.textContent =
                            error.name === 'AbortError' ? '超时' : '失败';
                        bandwidthElement.className = 'speed-result bandwidth-result';
                    }
                }
                // 添加延迟，避免对服务器造成过大压力
                await new Promise(function(r) { setTimeout(r, 700 / Math.max(totalIPs, 4)); });
            }
            isTesting = false;
            speedtestButtons.forEach(function(button) { button.disabled = false; });
            progressBar.style.display = 'none';
            switchAddressList(currentAddressListView);
            statusElement.textContent = '测速完成：' + currentTestIndex + '/' + totalIPs +
                ' 个' + categoryLabels[category] + '，单次约 300 KB';
            // 重新启用所有测速按钮
            document.querySelectorAll('.small-btn[id^="test-"]').forEach(function(btn) {
                if (btn) btn.disabled = false;
            });
            let qualitySaveError = null;
            let qualitySavedLocally = false;
            const pendingQualityResults = mergePendingQualityResults([
                ...readPendingQualityResults(),
                ...qualityResults
            ]);
            if (pendingQualityResults.length) {
                try {
                    const response = await fetch('/quality-ips/batch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ results: pendingQualityResults })
                    });
                    const data = await response.json();
                    if (!response.ok || !data.success) throw new Error(data.error || '保存优选测速结果失败');
                    if (Number(data.stored) !== pendingQualityResults.length) {
                        throw new Error('服务端仅保存 ' + (Number(data.stored) || 0) + '/' + pendingQualityResults.length + ' 个测速结果');
                    }
                    clearPendingQualityResults();
                } catch (error) {
                    console.error('批量保存优选测速结果失败:', error);
                    qualitySaveError = error;
                    qualitySavedLocally = writePendingQualityResults(pendingQualityResults);
                }
            }
            sortBySpeed();
            await refreshQualityIPs();
            const uniqueAutoBlacklistedAddresses = Array.from(
                new Set(autoBlacklistedAddresses)
            );
            const timeoutBlacklistMessage = uniqueAutoBlacklistedAddresses.length
                ? '；' + uniqueAutoBlacklistedAddresses.length + ' 个测速超时地址已自动加入黑名单'
                : '';
            showMessage(
                qualitySaveError
                    ? qualitySavedLocally
                        ? '测速完成' + timeoutBlacklistMessage + '；服务端 KV 写入失败，结果暂存于本浏览器，Cron 和其他设备暂不可见。后续测速时会重试。错误：' + qualitySaveError.message
                        : '测速完成' + timeoutBlacklistMessage + '，但服务端和本地均无法保存优选结果：' + qualitySaveError.message
                    : qualityPersistenceWarning
                        ? '测速完成' + timeoutBlacklistMessage + '，但优选结果未保存：' + qualityPersistenceWarning
                    : '测速完成，已测试 ' + currentTestIndex + ' 个地址，单次约 300 KB，已按延迟排序' + timeoutBlacklistMessage,
                qualitySaveError || qualityPersistenceWarning ? 'error' : 'success'
            );
        }
        function sortBySpeed() {
            const ipList = document.getElementById('ip-list');
            if (!ipList) return;
            const ipItems = Array.from(ipList.querySelectorAll('.ip-item'));
            ipItems.sort(function(a, b) {
              if (a.dataset.speedCategory === b.dataset.speedCategory) {
                if (a.dataset.country !== b.dataset.country) {
                    return a.dataset.country.localeCompare(b.dataset.country);
                }
                const rankA = Number.parseFloat(a.dataset.speedRank);
                const rankB = Number.parseFloat(b.dataset.speedRank);
                if (Number.isFinite(rankA) && Number.isFinite(rankB) && rankA !== rankB) {
                    return rankA - rankB;
                }
              }
              const ra = speedResults[a.dataset.ip];
              const rb = speedResults[b.dataset.ip];
              // 修复排序逻辑：基于实际速度值而不是数据存在性
              if (ra && rb && ra.success && rb.success) {
                return ra.latency - rb.latency;
              }
              if (ra && ra.success) {
                return rb && rb.success ? 1 : -1;
              }
              if (rb && rb.success) {
                return ra && ra.success ? -1 : 1;
              }
              return 0;
            });
            // 重新添加排序后的元素
            ipItems.forEach(function(item) {
              if (item && ipList) ipList.appendChild(item);
            });
        }
        // 替换原有的 updateIPs 函数（修复版本）
        async function updateIPs() {
            const btn = document.getElementById('update-btn');
            const loading = document.getElementById('loading');
            const result = document.getElementById('result');
            if (!btn || !loading || !result) return;
            btn.disabled = true;
            loading.style.display = 'block';
            result.style.display = 'none';
            try {
                const localSettings = readLocalSettingsFallback();
                const updateOptions = { method: 'POST' };
                if (Array.isArray(localSettings.sources)) {
                    updateOptions.headers = { 'Content-Type': 'application/json' };
                    updateOptions.body = JSON.stringify({ sources: localSettings.sources });
                }
                const response = await fetch('/update', updateOptions);
                const data = await response.json();
                if (data.success) {
                    let resultHtml = '<div class="update-summary-heading">' +
                        '<span class="update-summary-indicator" aria-hidden="true"></span>' +
                        '<div><h3>数据源更新完成</h3><p>采集及地区信息已更新 · 本次未执行测速</p></div>' +
                        '<span class="update-summary-duration">' + escapeHtml(data.duration) + '</span>' +
                        '</div><div class="update-summary-grid">' +
                        '<div class="update-summary-metric"><span>地址总数</span><strong>' +
                        escapeHtml(data.totalIPs) + '</strong></div>' +
                        '<div class="update-summary-metric"><span>新位置查询</span><strong>' +
                        escapeHtml(data.newLocationTested) + '</strong></div>';
                    if (data.validLocations !== undefined) {
                        resultHtml += '<div class="update-summary-metric is-success"><span>有效位置（含复用）</span><strong>' +
                            escapeHtml(data.validLocations) + ' / ' + escapeHtml(data.totalIPs) +
                            '</strong></div>';
                    }
                    if (data.validLatencies !== undefined) {
                        resultHtml += '<div class="update-summary-metric is-success"><span>保留测速结果</span><strong>' +
                            escapeHtml(data.validLatencies) + ' / ' + escapeHtml(data.totalIPs) +
                            '</strong></div>';
                    }
                    resultHtml += '</div>';
                    if (data.locationFailedCount !== undefined ||
                        data.locationRetryCount !== undefined ||
                        data.locationTotalDelay !== undefined) {
                        resultHtml += '<div class="update-summary-section"><h4>查询详情</h4><div class="update-summary-grid">';
                        if (data.locationFailedCount !== undefined) {
                            resultHtml += '<div class="update-summary-metric ' +
                                (Number(data.locationFailedCount) > 0 ? 'is-error' : 'is-success') +
                                '"><span>位置查询失败</span><strong>' +
                                escapeHtml(data.locationFailedCount) + '</strong></div>';
                        }
                        if (data.locationRetryCount !== undefined) {
                            resultHtml += '<div class="update-summary-metric"><span>重试次数</span><strong>' +
                                escapeHtml(data.locationRetryCount) + '</strong></div>';
                        }
                        if (data.locationTotalDelay !== undefined) {
                            resultHtml += '<div class="update-summary-metric"><span>查询等待</span><strong>' +
                                escapeHtml(data.locationTotalDelay) + ' ms</strong></div>';
                        }
                        resultHtml += '</div></div>';
                    }
                    resultHtml += '<p class="update-summary-note">本次仅更新数据源及地区信息。需要延迟和带宽数据时，请单独启动测速。</p>' +
                        '<div class="update-summary-meta">';
                    if (data.newValidLocations !== undefined) {
                        resultHtml += '<span>本次新增有效位置：' + escapeHtml(data.newValidLocations) + '</span>';
                    }
                    if (data.latencyReusedCount !== undefined) {
                        resultHtml += '<span>复用历史测速结果：' + escapeHtml(data.latencyReusedCount) + ' 个</span>';
                    }
                    resultHtml += '<span>历史记录：<code>' + escapeHtml(data.historyKey || '—') + '</code></span>' +
                        '<span>更新时间：' + escapeHtml(new Date(data.timestamp).toLocaleString()) + '</span></div>';
                    result.className = 'result success update-summary';
                    result.innerHTML = resultHtml;
                } else {
                    result.className = 'result error';
                    result.innerHTML = '<h3>更新失败</h3><p>' + escapeHtml(data.error || '未知错误') + '</p>';
                }
                result.style.display = 'block';
                setTimeout(refreshData, 1500);
            } catch (error) {
                console.error('更新失败:', error);
                result.className = 'result error';
                result.innerHTML = '<h3>请求失败</h3><p>' + escapeHtml(error.message) + '</p>';
                result.style.display = 'block';
            } finally {
                btn.disabled = false;
                loading.style.display = 'none';
            }
        }
        async function setIpLimit() {
            const input = document.getElementById('ip-limit-input');
            const btn = document.getElementById('set-limit-btn');
            const status = document.getElementById('ip-limit-status');
            if (!input || !btn) return;
            const value = input.value.trim();
            const limit = value === '' ? 0 : Number(value);
            if (!Number.isSafeInteger(limit) || limit < 0) {
                showMessage('显示数量必须是大于等于 0 的整数，空或 0 表示不限制', 'error');
                return;
            }
            btn.disabled = true;
            try {
                const response = await fetch('/set-limit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ limit: limit || null })
                });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.error || '保存显示数量失败');
                clearLocalSettingsFallback('displayLimit');
                if (status) status.textContent = '已保存到服务端';
                showMessage(data.message || '显示数量设置成功');
                await refreshData();
            } catch (error) {
                console.error('保存显示数量失败:', error);
                const savedLocally = writeLocalSettingsFallback({ displayLimit: limit });
                if (status) status.textContent = savedLocally
                    ? '本浏览器本地设置；Cron 使用服务端上次保存值'
                    : '保存失败，请重试';
                showMessage(savedLocally
                    ? '服务端保存失败，显示数量已保存到本浏览器；Cron 仍使用服务端上次保存值。错误：' + error.message
                    : '显示数量保存失败：' + error.message, 'error');
                if (savedLocally) await refreshData();
            } finally {
                btn.disabled = false;
            }
        }
        function openSourcesModal() {
            const modal = document.getElementById('sources-modal');
            const textarea = document.getElementById('sources-textarea');
            if (!modal || !textarea) return;
            textarea.value = currentSourcesUrls.join('\\n');
            modal.style.display = 'flex';
        }
        function closeSourcesModal() {
            const modal = document.getElementById('sources-modal');
            if (modal) modal.style.display = 'none';
        }
        async function saveSources() {
            const textarea = document.getElementById('sources-textarea');
            if (!textarea) return;
            const sources = textarea.value.split('\\n').map(s => s.trim()).filter(s => s);
            try {
                const response = await fetch('/set-sources', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sources })
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    clearLocalSettingsFallback('sources');
                    currentSourcesUrls = sources;
                    showMessage('来源设置成功');
                    closeSourcesModal();
                    await refreshData();
                } else {
                    throw new Error(data.error || '未知错误');
                }
            } catch (error) {
                console.error('保存来源失败:', error);
                const savedLocally = writeLocalSettingsFallback({ sources: sources });
                if (savedLocally) {
                    currentSourcesUrls = sources;
                    const status = document.getElementById('sources-settings-status');
                    if (status) status.textContent = '本浏览器本地设置；手动更新使用此列表，Cron 使用服务端上次保存值';
                    closeSourcesModal();
                    await refreshData();
                    showMessage('服务端保存失败，来源已保存到本浏览器；手动更新使用此列表，Cron 仍使用服务端上次保存值。错误：' + error.message, 'error');
                } else {
                    showMessage('来源保存失败：' + error.message, 'error');
                }
            }
        }
        function openBlacklistModal() {
            const modal = document.getElementById('blacklist-modal');
            const textarea = document.getElementById('blacklist-textarea');
            if (!modal || !textarea) return;
            textarea.value = currentBlacklist.join('\\n');
            modal.style.display = 'flex';
        }
        function closeBlacklistModal() {
            const modal = document.getElementById('blacklist-modal');
            if (modal) modal.style.display = 'none';
        }
        async function saveBlacklist() {
            const textarea = document.getElementById('blacklist-textarea');
            if (!textarea) return;
            const blacklist = textarea.value.split('\\n').map(s => s.trim()).filter(s => s);
            try {
                const response = await fetch('/set-blacklist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ blacklist })
                });
                const data = await response.json();
                if (data.success) {
                    showMessage('黑名单设置成功');
                    closeBlacklistModal();
                    await refreshData();
                } else {
                    showMessage('设置失败: ' + (data.error || '未知错误'), 'error');
                }
            } catch (error) {
                console.error('保存黑名单失败:', error);
                showMessage('设置失败: ' + error.message, 'error');
            }
        }
        const PENDING_QUALITY_RESULTS_KEY = 'cloudflare-quality-results-pending-v1';
        function readPendingQualityResults() {
            try {
                const results = JSON.parse(localStorage.getItem(PENDING_QUALITY_RESULTS_KEY) || '[]');
                if (!Array.isArray(results)) return [];
                const availableCountries = new Set(Array.from(document.querySelectorAll('input[name="quality-country"]'))
                    .map(function(input) { return input.value; }));
                return results.filter(function(result) {
                    return result &&
                        typeof result.ip === 'string' &&
                        availableCountries.has(result.countryCode) &&
                        Number.isFinite(result.latency) && result.latency > 0 &&
                        Number.isFinite(result.bandwidth) && result.bandwidth > 0 &&
                        Number.isSafeInteger(result.bytes) && result.bytes > 0 &&
                        typeof result.testedAt === 'string' &&
                        typeof result.signature === 'string';
                });
            } catch (error) {
                console.warn('读取本地暂存的优选 IP 失败:', error);
                return [];
            }
        }
        function mergePendingQualityResults(results) {
            const byCountryAndIP = new Map();
            results.forEach(function(result) {
                if (!result || typeof result.ip !== 'string' || typeof result.countryCode !== 'string') return;
                byCountryAndIP.set(result.countryCode + '\\n' + result.ip, result);
            });
            return Array.from(byCountryAndIP.values()).slice(-1000);
        }
        function writePendingQualityResults(results) {
            try {
                localStorage.setItem(PENDING_QUALITY_RESULTS_KEY, JSON.stringify(results));
                return true;
            } catch (error) {
                console.error('暂存优选测速结果失败:', error);
                return false;
            }
        }
        function clearPendingQualityResults() {
            try {
                localStorage.removeItem(PENDING_QUALITY_RESULTS_KEY);
            } catch (error) {
                console.warn('清理已同步的优选测速结果失败:', error);
            }
        }
        async function refreshQualityIPs() {
            await refreshData();
        }
        async function refreshData() {
            try {
                const localSettings = readLocalSettingsFallback();
                const hasLocalLimit = Number.isSafeInteger(localSettings.displayLimit) && localSettings.displayLimit >= 0;
                const response = await fetch(hasLocalLimit ? '/raw?limit=' + localSettings.displayLimit : '/raw');
                const data = await response.json();
                if (data.scheduleFields &&
                    typeof data.scheduleFields === 'object' &&
                    typeof data.scheduleTimezone === 'string' &&
                    Array.isArray(data.desiredCronExpressions)) {
                    applyScheduleSettings(
                        data.scheduleFields,
                        data.scheduleTimezone,
                        data.desiredCronExpressions,
                        data.appliedCronExpressions,
                    );
                }
                if (Number.isSafeInteger(data.maxLatency) &&
                    Number.isFinite(data.minBandwidth)) {
                    speedTestThresholds = {
                        maxLatency: data.maxLatency,
                        minBandwidth: data.minBandwidth
                    };
                    const thresholdLabel = document.getElementById('speedtest-threshold-label');
                    if (thresholdLabel) {
                        thresholdLabel.textContent = '按每国设置数量筛选';
                    }
                }
                if (Number.isSafeInteger(data.scheduledSpeedTestBatchSize)) {
                    const batchSizeInput = document.getElementById('scheduled-speedtest-batch-size');
                    if (batchSizeInput) {
                        batchSizeInput.value = String(data.scheduledSpeedTestBatchSize);
                    }
                }
                if (Number.isSafeInteger(data.scheduledSpeedTestBatchIntervalSeconds)) {
                    const intervalInput = document.getElementById('scheduled-speedtest-batch-interval');
                    if (intervalInput) {
                        intervalInput.value = String(data.scheduledSpeedTestBatchIntervalSeconds);
                    }
                }
                if (Number.isSafeInteger(data.scheduledSpeedTestAddressIntervalSeconds)) {
                    const addressIntervalInput = document.getElementById('scheduled-speedtest-address-interval');
                    if (addressIntervalInput) {
                        addressIntervalInput.value = String(data.scheduledSpeedTestAddressIntervalSeconds);
                    }
                }
                if (Number.isSafeInteger(data.scheduledSpeedTestTimeoutSeconds)) {
                    const timeoutInput = document.getElementById('scheduled-speedtest-timeout');
                    if (timeoutInput) {
                        timeoutInput.value = String(data.scheduledSpeedTestTimeoutSeconds);
                    }
                    const cronTimeout = document.getElementById('cron-speedtest-timeout');
                    if (cronTimeout) {
                        cronTimeout.textContent = data.scheduledSpeedTestTimeoutSeconds + ' 秒';
                    }
                    const settingsSummary = document.querySelector('#scheduled-speedtest-settings-summary small');
                    if (settingsSummary && Number.isSafeInteger(data.scheduledSpeedTestBatchSize)) {
                        settingsSummary.textContent =
                            '每批 ' + data.scheduledSpeedTestBatchSize + ' 个 · 超时 ' +
                            data.scheduledSpeedTestTimeoutSeconds + ' 秒自动拉黑';
                    }
                }
                if (Number.isSafeInteger(data.manualSpeedTestTimeoutSeconds)) {
                    const timeoutInput = document.getElementById('manual-speedtest-timeout-input');
                    if (timeoutInput) {
                        timeoutInput.value = String(data.manualSpeedTestTimeoutSeconds);
                    }
                    const manualTimeout = document.getElementById('manual-speedtest-timeout');
                    if (manualTimeout) {
                        manualTimeout.textContent = data.manualSpeedTestTimeoutSeconds + ' 秒';
                    }
                    const settingsSummary = document.querySelector('#manual-speedtest-settings-summary small');
                    if (settingsSummary && Number.isSafeInteger(data.speedTestCount)) {
                        settingsSummary.textContent =
                            (data.speedTestCount === 0 ? '全部节点' : data.speedTestCount + ' 个节点') +
                            ' · 每批 ' + (Number.isSafeInteger(data.manualBatchSize) ? data.manualBatchSize : 50) + ' 个' +
                            ' · 超时 ' + data.manualSpeedTestTimeoutSeconds + ' 秒自动拉黑';
                    }
                }
                if (Number.isSafeInteger(data.manualBatchSize)) {
                    const batchSizeInput = document.getElementById('manual-speedtest-batch-size-input');
                    if (batchSizeInput) batchSizeInput.value = String(data.manualBatchSize);
                    const batchSizeLabel = document.getElementById('manual-speedtest-batch-size');
                    if (batchSizeLabel) batchSizeLabel.textContent = String(data.manualBatchSize);
                }
                if (Number.isSafeInteger(data.scheduledSpeedTestBatchSize)) {
                    const cronBatchSize = document.getElementById('cron-speedtest-batch-size');
                    if (cronBatchSize) cronBatchSize.textContent = String(data.scheduledSpeedTestBatchSize);
                }
                if (Number.isSafeInteger(data.scheduledSpeedTestBatchIntervalSeconds)) {
                    const cronBatchInterval = document.getElementById('cron-speedtest-batch-interval');
                    if (cronBatchInterval) cronBatchInterval.textContent = data.scheduledSpeedTestBatchIntervalSeconds + ' 秒';
                }
                if (Number.isSafeInteger(data.scheduledSpeedTestAddressIntervalSeconds)) {
                    const cronAddressInterval = document.getElementById('cron-speedtest-address-interval');
                    if (cronAddressInterval) cronAddressInterval.textContent = data.scheduledSpeedTestAddressIntervalSeconds + ' 秒';
                }
                if (Number.isFinite(Number(data.scheduledTransferredBytes))) {
                    const cronTransferred = document.getElementById('cron-transferred');
                    if (cronTransferred) {
                        const bytes = Math.max(0, Number(data.scheduledTransferredBytes) || 0);
                        cronTransferred.textContent = bytes >= 1024 * 1024
                            ? (bytes / 1024 / 1024).toFixed(2) + ' MiB'
                            : Math.ceil(bytes / 1024) + ' KB';
                    }
                }
                const estimateOutput = document.getElementById('scheduled-speedtest-estimate');
                if (estimateOutput) {
                    if (Number.isSafeInteger(data.scheduledSpeedTestEstimateAddressCount)) {
                        estimateOutput.dataset.addressCount = String(data.scheduledSpeedTestEstimateAddressCount);
                    }
                    if (Number.isFinite(data.scheduledSpeedTestAverageRequestMs)) {
                        estimateOutput.dataset.averageRequestMs = String(data.scheduledSpeedTestAverageRequestMs);
                        estimateOutput.dataset.estimateFallback = String(data.scheduledSpeedTestAverageRequestFallback === true);
                    }
                    updateScheduledSpeedTestEstimate();
                }
                // 更新状态面板
                const recentCountEl = document.getElementById('recent-count');
                const totalCountEl = document.getElementById('total-count');
                const lastTimeEl = document.getElementById('last-time');
                if (recentCountEl) recentCountEl.textContent = data.originalCount || 0;
                if (totalCountEl) totalCountEl.textContent = (data.totalUniqueIPs || 0).toLocaleString();
                if (lastTimeEl) lastTimeEl.textContent = data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : '从未更新';
                // 更新IP列表
                const ipList = document.getElementById('ip-list');
                const displayIPs = data.ips || [];
                qualityIPsByCountry = {};
                displayIPs.forEach(function(item) {
                    if (item.speedCategory !== 'premium') return;
                    const countryCode = getClientCountryCode(item);
                    if (!countryCode) return;
                    if (!qualityIPsByCountry[countryCode]) {
                        qualityIPsByCountry[countryCode] = [];
                    }
                    qualityIPsByCountry[countryCode].push({
                        ip: item.address,
                        latency: Number(item.latency),
                        bandwidth: Number(item.bandwidth)
                    });
                });
                if (ipList) {
                    if (displayIPs.length > 0) {
                        ipList.innerHTML = displayIPs.map(function(item) {
                            // 确保 address 存在
                            const address = item?.address || 'unknown';
                            const safeId = simpleHash(address);
                            const location = String(item?.location || '未知');
                            let displayLocation = location;
                            const parsed = parseAddressWithPort(item?.address || 'unknown');
                            if (parsed.type !== 'domain' && (displayLocation === "未知" || displayLocation.toLowerCase() === 'ipv4' || displayLocation.toLowerCase() === 'ipv6')) {
                              displayLocation = parsed.type.toUpperCase();
                            }
                            const latency = item?.latency;
                            const speedCategory = ['premium', 'premium-domain', 'backup', 'untested'].includes(item?.speedCategory)
                                ? item.speedCategory
                                : 'untested';
                            const typeLabel = parsed.type === 'ipv4' ? 'IPv4'
                                : parsed.type === 'ipv6' ? 'IPv6'
                                : parsed.type === 'domain' ? '域名' : '';
                            let displayAddress = parsed.type === 'ipv6' ? '[' + parsed.address + ']' : parsed.address;
                            if (parsed.port !== 443) displayAddress += ':' + parsed.port;
                            const countryCode = getClientCountryCode(item);
                            const countryName = countryCode ? CLIENT_COUNTRY_NAMES[countryCode] : '';
                            const safeDisplayAddress = escapeHtml(displayAddress);
                            const safeDisplayLocation = escapeHtml(formatClientLocationLabel(displayLocation));
                            return '<div class="ip-item" data-ip="' + escapeHtml(address) + '" data-country="' + escapeHtml(countryCode) + '" data-speed-rank="' + (item?.speedRank || '') + '" data-speed-category="' + speedCategory + '" data-speed-tested="' + (speedCategory !== 'untested' ? 'true' : 'false') + '">\\
                                <div class="ip-info">\\
                                    <div class="ip-main-info">\\
                                        <button class="ip-address" type="button" data-select-ip="' + escapeHtml(address) + '" aria-pressed="false" title="选中此地址">' + safeDisplayAddress + (typeLabel ? '<span class="ip-type-badge">' + typeLabel + '</span>' : '') + (countryName ? '<span class="ip-country-badge">' + escapeHtml(countryName) + '</span>' : '') + '</button>\\
                                        <span class="ip-location">线路 · ' + safeDisplayLocation + '</span>\\
                                    </div>\\
                                    <span class="speed-result ' + getClientLatencySpeedClass(latency) + '" id="speed-' + safeId + '">' + (latency ? Math.round(latency) + 'ms' : '-') + '</span>\\
                                    <span class="speed-result bandwidth-result ' + getClientBandwidthSpeedClass(item?.bandwidth, item?.latency) + '" id="bandwidth-' + safeId + '">' + (Number.isFinite(Number(item?.bandwidth)) && Number(item.bandwidth) > 0 ? Number(item.bandwidth).toFixed(2) + ' MB/s' : '-- MB/s') + '</span>\\
                                </div>\\
                                <div class="action-buttons">\\
                                    <button class="small-btn" onclick="testSingleIP(\\\'' + escapeHtml(address).replace(/'/g, "\\\\'") + '\\\')" id="test-' + safeId + '">测速</button>\\
                                    <button class="small-btn" onclick="copyIP(\\\'' + escapeHtml(displayAddress).replace(/'/g, "\\\\'") + '\\\', \\\'' + escapeHtml(location).replace(/'/g, "\\\\'") + '\\\', ' + (latency || 'null') + ')">复制</button>\\
                                </div>\\
                            </div>';
					}).join('');
                        // 更新速度结果缓存 + 自动按延迟排序（修复核心）
                        speedResults = {}; // 重置
                        displayIPs.forEach(function(item) {
                            const address = item?.address;
                            const latency = item?.latency;
                            if (address) {
                                if (latency) {
                                    speedResults[address] = { latency: latency, success: true };
                                    const safeId = simpleHash(address);
                                    const el = document.getElementById('speed-' + safeId);
                                    if (el) {
                                        const cls = getClientLatencySpeedClass(latency);
                                        el.className = 'speed-result ' + cls;
                                        el.textContent = Math.round(latency) + 'ms';
                                    }
                                } else {
                                    speedResults[address] = { latency: Infinity, success: false };
                                }
                            }
                        });
                        // 关键：刷新页面或更新后自动按延迟从小到大排序
                        sortBySpeed();
                        if (selectedIPForITDog) selectIPForITDog(selectedIPForITDog);
                    } else {
                        ipList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">暂无 IP/域名 地址数据，请点击更新按钮获取</p>';
                    }
                }
                if (Array.isArray(data.selectedQualityCountries)) {
                    qualityCountriesSelected = data.selectedQualityCountries;
                }
                if (data.qualityCountryLimits && typeof data.qualityCountryLimits === 'object') {
                    document.querySelectorAll('input[name="quality-country-limit"]').forEach(function(input) {
                        const countryLimits = data.qualityCountryLimits[input.dataset.country];
                        const limit = typeof countryLimits === 'number'
                            ? countryLimits
                            : countryLimits && countryLimits[input.dataset.type];
                        if (Number.isSafeInteger(limit)) input.value = String(limit);
                    });
                }
                if (!qualityCountriesSelected.includes(currentQualityCountry)) {
                    currentQualityCountry = '';
                }
                const countryGrid = document.getElementById('quality-country-grid');
                if (countryGrid) {
                    const countryCounts = data.qualityCountryCounts || {};
                    countryGrid.innerHTML =
                        '<button class="country-card" type="button" data-quality-country="" aria-pressed="false">' +
                            '<span>全部</span><strong>优质 IP</strong><small>共 <b id="country-count-all">' +
                            Number(data.speedCategoryCounts?.premium || 0) + '</b> 个</small></button>' +
                        qualityCountriesSelected.map(function(code) {
                            const name = CLIENT_COUNTRY_NAMES[code] || code;
                            const countryLimits = data.qualityCountryLimits?.[code];
                            return '<button class="country-card" type="button" data-quality-country="' +
                                escapeHtml(code) + '" aria-pressed="false"><span>' + escapeHtml(code) +
                                '</span><strong>' + escapeHtml(name) + '</strong><small>IP ' +
                                Number((typeof countryLimits === 'number' ? countryLimits : countryLimits?.ip) ?? 20) +
                                ' / 域名 ' + Number((typeof countryLimits === 'number' ? countryLimits : countryLimits?.domain) ?? 20) +
                                ' · <b id="country-count-' +
                                escapeHtml(code) + '">' + Number(countryCounts[code] || 0) +
                                '</b> IP</small></button>';
                        }).join('');
                    countryGrid.querySelectorAll('[data-quality-country]').forEach(function(button) {
                        button.addEventListener('click', function() {
                            switchAddressList('premium', button.dataset.qualityCountry || '');
                        });
                    });
                }
                const categoryCounts = data.speedCategoryCounts || {};
                ['premium', 'premium-domain', 'backup', 'untested'].forEach(function(category) {
                    const countId = category === 'premium-domain'
                        ? 'premium-domain-tab-count'
                        : category + '-tab-count';
                    const countElement = document.getElementById(countId);
                    if (countElement) countElement.textContent = String(Number(categoryCounts[category] || 0));
                });
                const premiumStatCount = document.getElementById('premium-stat-count');
                if (premiumStatCount) {
                    premiumStatCount.textContent = String(Number(categoryCounts.premium || 0));
                }
                const premiumDomainStatCount = document.getElementById('premium-domain-stat-count');
                if (premiumDomainStatCount) {
                    premiumDomainStatCount.textContent = String(Number(categoryCounts['premium-domain'] || 0));
                }
                switchAddressList(currentAddressListView);
                updateSpeedTestEstimate();
                // 更新来源
                currentSourcesUrls = Array.isArray(localSettings.sources)
                    ? localSettings.sources
                    : (data.sources_urls || []);
                const sources = document.getElementById('sources');
                if (sources) {
                    const sourcesDisplay = [];
                    const sourceMap = new Map();
                    if (data.sources && data.sources.length > 0) {
                        data.sources.forEach(s => sourceMap.set(s.name, s));
                    }
                    currentSourcesUrls.forEach(url => {
                        let hostname = url;
                        try {
                            hostname = new URL(url).hostname;
                        } catch (e) {}
                        const existing = sourceMap.get(url);
                        if (existing) {
                            sourcesDisplay.push({ ...existing, name: hostname });
                        } else {
                            sourcesDisplay.push({ name: hostname, status: "pending", count: 0, message: "新增站点" });
                        }
                    });
                    if (sourcesDisplay.length > 0) {
                        sources.innerHTML = sourcesDisplay.map(function(s) {
                            const cls = s.status === 'error' ? ' error' : '';
                            const status = s.status === 'success'
                                ? '<span class="source-status success">✓ 获取 ' + (Number(s.count) || 0) + ' 个地址</span>'
                                : s.status === 'pending'
                                    ? '<span class="source-status pending">' + escapeHtml(s.message || '尚未采集') + '</span>'
                                    : '<span class="source-status error">失败：' + escapeHtml(s.error || '未知') + '</span>';
                            return '<div class="source' + cls + '">\\
                                <strong class="source-name">' + escapeHtml(s.name) + '</strong>' + status + '\\
                            </div>';
                        }).join('');
                    } else {
                        sources.innerHTML = '<p style="color: #64748b;">暂无数据来源信息</p>';
                    }
                }
                // 更新黑名单
                currentBlacklist = data.blacklist || [];
                // 更新路径
                currentPath = data.customPath || '';
                updateLinks();
                // 更新IP数量限制输入
                const input = document.getElementById('ip-limit-input');
                if (input) {
                    input.value = hasLocalLimit
                        ? (localSettings.displayLimit === 0 ? '' : String(localSettings.displayLimit))
                        : (data.limit || '');
                    input.disabled = false;
                    input.placeholder = '无限制（显示最新全部）';
                }
                const limitStatus = document.getElementById('ip-limit-status');
                if (limitStatus && !hasLocalLimit) limitStatus.textContent = '已应用服务端显示数量设置';
                if (!Number.isSafeInteger(localSettings.autoUpdateCount)) {
                    const countInput = document.getElementById('auto-update-count');
                    if (countInput && Number.isSafeInteger(data.autoUpdateCount)) {
                        countInput.value = String(data.autoUpdateCount);
                    }
                    const countLabel = document.getElementById('auto-update-default-count');
                    if (countLabel) countLabel.textContent = '全部';
                    const countStatus = document.getElementById('auto-update-count-status');
                    if (countStatus) countStatus.textContent = '已应用服务端定时更新数量设置';
                }
                if (!Number.isSafeInteger(localSettings.speedTestCount)) {
                    const countInput = document.getElementById('speedtest-count');
                    if (countInput && Number.isSafeInteger(data.speedTestCount)) {
                        countInput.value = String(data.speedTestCount);
                    }
                    const countLabel = document.getElementById('speedtest-default-count');
                    if (countLabel) {
                        countLabel.textContent = data.scheduleEnabled === false ? '未启用' : '全部';
                    }
                    const countIndicator = document.getElementById('speedtest-selected-count');
                    if (countIndicator && Number.isSafeInteger(data.speedTestCount)) {
                        countIndicator.textContent = '默认 ' +
                            (data.speedTestCount === 0 ? '全部' : data.speedTestCount) + ' 节点';
                    }
                    const countStatus = document.getElementById('speedtest-count-status');
                    if (countStatus) countStatus.textContent = '已应用服务端手动测速默认数量';
                }
                const sourcesStatus = document.getElementById('sources-settings-status');
                if (sourcesStatus && !Array.isArray(localSettings.sources)) {
                    sourcesStatus.textContent = '数据来源应用于手动和定时更新';
                }
            } catch (e) {
                console.error('刷新数据失败:', e);
                showMessage('刷新数据失败: ' + e.message, 'error');
            }
        }
        document.addEventListener('DOMContentLoaded', function() {
            // 添加全局错误处理
            window.onerror = function(message, source, lineno, colno, error) {
                console.error('全局错误:', message, error);
                return true; // 阻止默认处理
            };
            // 防止未捕获的Promise拒绝
            window.onunhandledrejection = function(event) {
                console.error('未捕获的Promise拒绝:', event.reason);
                event.preventDefault();
            };
            applyLocalSettingsFallback();
            updateLinks();
            ['schedule-account-id', 'schedule-script-name'].forEach(function(id) {
                const input = document.getElementById(id);
                if (!input) return;
                input.addEventListener('input', function() {
                    const button = document.getElementById('save-schedule-api-config');
                    const status = document.getElementById('schedule-api-config-status');
                    if (button && (
                        button.dataset.savedAccountId !==
                            document.getElementById('schedule-account-id').value.trim() ||
                        button.dataset.savedScriptName !==
                            document.getElementById('schedule-script-name').value.trim()
                    ) && status) {
                        status.textContent = 'API 设置已更改，点击“保存 API 设置”后才会生效。';
                    }
                });
            });
            const speedtestCountInput = document.getElementById('speedtest-count');
            if (speedtestCountInput) {
                speedtestCountInput.addEventListener('input', function() {
                    updateSpeedTestEstimate();
                    const status = document.getElementById('speedtest-count-status');
                    if (status) status.textContent = '数量已更改，保存后应用于定时任务';
                });
                updateSpeedTestEstimate();
            }
            const autoUpdateCountInput = document.getElementById('auto-update-count');
            if (autoUpdateCountInput) {
                autoUpdateCountInput.addEventListener('input', function() {
                    const status = document.getElementById('auto-update-count-status');
                    if (status) status.textContent = '数量已更改，点击本项保存按钮后应用';
                });
            }
            document.querySelectorAll('input[name="quality-country"]').forEach(function(input) {
                input.addEventListener('change', function() {
                    const status = document.getElementById('quality-countries-status');
                    if (status) status.textContent = '国家 / 地区已更改，请保存后应用';
                });
            });
            const settingsScheduleSwitch = document.getElementById('settings-schedule-enabled');
            if (settingsScheduleSwitch) {
                settingsScheduleSwitch.addEventListener('click', function(event) {
                    event.preventDefault();
                    void toggleScheduleEnabledFromSettings();
                });
            }
            const cronScheduleSwitch = document.getElementById('schedule-enabled-toggle');
            if (cronScheduleSwitch) {
                cronScheduleSwitch.addEventListener('click', function(event) {
                    event.preventDefault();
                    void toggleScheduleEnabled(cronScheduleSwitch);
                });
            }
            switchAddressList('premium');
            refreshData();
            document.addEventListener('click', function(e) {
                const target = e.target;
                const selectButton = target.closest('[data-select-ip]');
                if (selectButton) {
                    selectIPForITDog(selectButton.getAttribute('data-select-ip'));
                }
                if (!e.target.closest('.admin-panel')) {
                    const dropdown = document.getElementById('admin-dropdown');
                    if (dropdown) {
                        dropdown.style.display = 'none';
                        const button = document.querySelector('.sidebar-footer .admin-button');
                        if (button) button.setAttribute('aria-expanded', 'false');
                    }
                    updateStatusCardOverlayLayer();
                }
            });
        });
    </script>
</body>
</html>`;
  const headers = {
    "Content-Type": "text/html;charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
  };
  return new Response(html, { headers });
}
/* ====================== IPv6 地址规范化 ====================== */
// IPv6 地址规范化函数 - 只移除方括号，保持原始格式
function normalizeIPv6Address(ip) {
  if (!ip || typeof ip !== "string") return ip;
  // 只移除方括号，保持地址原始格式（压缩或完整格式）
  return ip.replace(/[\[\]]/g, "");
}
/* ====================== /ip.txt 和 /ips ====================== */
async function handleGetIPs(env, attachment = false) {
  const limit = (await getCollectorSettings(env)).displayLimit;
  const data = await getIPsWithFallback(env, limit);

  // 获取全局计数
  let totalUnique = await env.IP_STORAGE.get("global_unique_ips_count");
  if (!totalUnique) totalUnique = data.totalUniqueIPs;

  console.log(
    `handleGetIPs: totalUnique=${totalUnique}, currentBatch=${data.ips?.length}`,
  );
  if (!data.ips || data.ips.length === 0) {
    return new Response("", {
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  const txt = sortIPsBySpeed(data.ips, data.sortByBandwidth)
    .map((i) => formatAddressOutput(i.address, i.location, i.latency))
    .join("\n");
  const headers = {
    "Content-Type": "text/plain;charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };
  if (attachment) {
    headers["Content-Disposition"] = "attachment; filename=cloudflare_ips.txt";
  }
  return new Response(txt + "\n", { headers });
}
/* ====================== 其余接口适配 ====================== */
async function handleRawIPs(env, limitParameter = undefined) {
  const latest = await getStoredIPsLatest(env);
  let limit = (await getCollectorSettings(env)).displayLimit;
  if (limitParameter !== undefined) {
    const requestedLimit = Number(limitParameter);
    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 0) {
      return jsonResponse({ error: "limit 必须是大于等于 0 的安全整数" }, 400);
    }
    limit = requestedLimit || null;
  }
  const customPath = await getCustomPath(env);
  const display = await getIPsWithFallback(env, limit);

  // 获取全局唯一 IP 计数 (具有独立键)
  let totalUnique = await env.IP_STORAGE.get("global_unique_ips_count");
  if (!totalUnique) {
    totalUnique = display.totalUniqueIPs;
  }

  const collectorSettings = await getCollectorSettings(env);
  const scheduleIdentifiers = await getStoredScheduleIdentifiers(env);
  const classificationCandidates = new Map(
    (latest.ips || []).map((item) => [item.address, item]),
  );
  for (const item of display.ips || []) {
    if (!classificationCandidates.has(item.address)) {
      classificationCandidates.set(item.address, item);
    }
  }
  const enrichedCandidates = await enrichIPsWithQualityCountries(
    env,
    Array.from(classificationCandidates.values()),
  );
  const candidateByAddress = new Map(
    enrichedCandidates.map((item) => [item.address, item]),
  );
  const speedClassification = classifyIPsByCountry(
    enrichedCandidates,
    collectorSettings.qualityCountries,
    collectorSettings,
  );
  const displayIPs = includeAllPremiumAddresses(
    (display.ips || []).map(
      (item) => candidateByAddress.get(item.address) || item,
    ),
    enrichedCandidates,
    speedClassification,
    display.blacklist,
  );
  const speedCategoryCounts = {
    premium: 0,
    "premium-domain": 0,
    backup: 0,
    untested: 0,
  };
  for (const item of displayIPs) {
    const category =
      speedClassification.categories.get(item.address) || "untested";
    speedCategoryCounts[category]++;
  }
  const speedTestLatencies = (latest.ips || [])
    .filter(isSpeedTestedIP)
    .map((item) => Number(item.latency));
  const scheduledSpeedTestAverageRequestMs = speedTestLatencies.length
    ? Math.round(
        speedTestLatencies.reduce((total, latency) => total + latency, 0) /
          speedTestLatencies.length,
      )
    : collectorSettings.scheduledSpeedTestTimeoutSeconds * 1000;
  let scheduledRunStats = {};
  try {
    scheduledRunStats =
      JSON.parse((await env.IP_STORAGE.get(SCHEDULED_RUN_STATS_KEY)) || "{}") ||
      {};
  } catch (error) {
    console.error("Failed to read scheduled run stats for dashboard:", error);
  }
  const result = {
    ...latest,
    limit,
    customPath,
    speedTestCount: collectorSettings.speedTestCount,
    autoUpdateCount: collectorSettings.autoUpdateCount,
    maxLatency: collectorSettings.maxLatency,
    minBandwidth: collectorSettings.minBandwidth,
    speedTestMode: collectorSettings.speedTestMode,
    manualBatchSize: collectorSettings.manualBatchSize,
    manualSpeedTestTimeoutSeconds:
      collectorSettings.manualSpeedTestTimeoutSeconds,
    scheduledSpeedTestBatchSize: collectorSettings.scheduledSpeedTestBatchSize,
    scheduledSpeedTestBatchIntervalSeconds:
      collectorSettings.scheduledSpeedTestBatchIntervalSeconds,
    scheduledSpeedTestAddressIntervalSeconds:
      collectorSettings.scheduledSpeedTestAddressIntervalSeconds,
    scheduledSpeedTestTimeoutSeconds:
      collectorSettings.scheduledSpeedTestTimeoutSeconds,
    scheduledSpeedTestEstimateAddressCount: (latest.ips || []).filter(
      (item) => typeof item?.address === "string" && item.address,
    ).length,
    scheduledSpeedTestAverageRequestMs,
    scheduledSpeedTestAverageRequestFallback: speedTestLatencies.length === 0,
    scheduleFields: collectorSettings.scheduleFields,
    scheduleTimezone: collectorSettings.scheduleTimezone,
    scheduledTransferredBytes: Number(scheduledRunStats.transferredBytes) || 0,
    desiredCronExpressions: collectorSettings.desiredCronExpressions,
    scheduleConfigured: collectorSettings.scheduleConfigured,
    scheduleEnabled:
      collectorSettings.scheduleConfigured &&
      (await env.IP_STORAGE.get(SCHEDULE_ENABLED_KEY)) === "true",
    scheduleApiConfigured: Boolean(
      scheduleIdentifiers.accountId && scheduleIdentifiers.scriptName,
    ),
    appliedCronExpressions: await getAppliedCronExpressions(env),
    selectedQualityCountries: collectorSettings.qualityCountries,
    qualityCountryLimits: collectorSettings.qualityCountryLimits,
    speedCategoryCounts,
    qualityCountryCounts: Object.fromEntries(
      collectorSettings.qualityCountries.map((countryCode) => [
        countryCode,
        displayIPs.filter((item) => {
          const category = speedClassification.categories.get(item.address);
          return (
            category === "premium" && getCountryCodeForIP(item) === countryCode
          );
        }).length,
      ]),
    ),
    sources_urls: await getSources(env),
    blacklist: display.blacklist,
    totalUniqueIPs: totalUnique, // 使用全局唯一地址总数
    ips: sortIPsBySpeed(displayIPs, display.sortByBandwidth)
      .map((item) => ({
        ...item,
        countryCode: getCountryCodeForIP(item),
        speedCategory:
          speedClassification.categories.get(item.address) || "untested",
        speedRank: speedClassification.rankByAddress.get(item.address) || null,
      }))
      .sort((a, b) => (a.speedRank || Infinity) - (b.speedRank || Infinity)),
    count: display.count,
    originalCount: display.originalCount || 0,
  };
  return jsonResponse(result);
}
async function handleManualSpeedTest(req, env) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "请求内容必须是 JSON 对象" }, 400);
  }

  const displayData = await getIPsWithFallback(env);
  const availableIPList = Array.isArray(displayData.ips) ? displayData.ips : [];
  const availableIPs = await enrichIPsWithQualityCountries(
    env,
    availableIPList,
  );
  const availableByAddress = new Map(
    availableIPs.map((item) => [item.address, item]),
  );
  if (!availableIPs.length) {
    return jsonResponse({ error: "没有可测速的地址" }, 400);
  }
  const speedSettings = await getCollectorSettings(env);
  const speedClassification = classifyIPsByCountry(
    availableIPs,
    speedSettings.qualityCountries,
    speedSettings,
  );
  const category = body.category === undefined ? "all" : body.category;
  if (
    !["all", "premium", "premium-domain", "backup", "untested"].includes(
      category,
    )
  ) {
    return jsonResponse({ error: "category 必须是有效的测速分类" }, 400);
  }
  const eligibleIPs = prioritizeQualityTestCandidates(
    category === "all"
      ? [...availableIPs]
      : availableIPs.filter(
          (item) =>
            speedClassification.categories.get(item.address) === category,
        ),
    speedSettings.qualityCountries,
  );
  if (!eligibleIPs.length) {
    return jsonResponse({ error: "所选分类没有可测速的地址" }, 400);
  }

  let ipsToTest;
  if (body.addresses !== undefined) {
    if (
      !Array.isArray(body.addresses) ||
      body.addresses.length === 0 ||
      body.addresses.some(
        (address) => typeof address !== "string" || address.length > 256,
      )
    ) {
      return jsonResponse(
        {
          error: "addresses 必须是非空的有效地址数组",
        },
        400,
      );
    }
    const availableSet = new Set(eligibleIPs.map((item) => item.address));
    ipsToTest = [...new Set(body.addresses)];
    if (ipsToTest.length > eligibleIPs.length) {
      return jsonResponse(
        { error: "测速地址数量不能超过当前分类的可用地址数量" },
        400,
      );
    }
    if (ipsToTest.some((address) => !availableSet.has(address))) {
      return jsonResponse({ error: "测速地址必须属于当前选择的分类" }, 400);
    }
  } else {
    const requestedCount =
      body.maxTests === undefined
        ? speedSettings.speedTestCount
        : body.maxTests;
    if (!Number.isSafeInteger(requestedCount) || requestedCount < 0) {
      return jsonResponse(
        { error: "maxTests 必须是大于等于 0 的安全整数" },
        400,
      );
    }
    const count =
      requestedCount === 0
        ? eligibleIPs.length
        : Math.min(requestedCount, eligibleIPs.length);
    ipsToTest = eligibleIPs.slice(0, count).map((item) => item.address);
  }

  if (body.plan === true) {
    return jsonResponse({
      success: true,
      total: ipsToTest.length,
      addresses: ipsToTest,
      batchSize: speedSettings.manualBatchSize,
      batchDelayMs: speedSettings.manualBatchIntervalSeconds * 1000,
      addressIntervalMs: speedSettings.manualAddressIntervalSeconds * 1000,
    });
  }

  const runSpeedTest = (onProgress) =>
    runManualSpeedTest(
      env,
      availableIPs,
      availableByAddress,
      speedSettings,
      category,
      ipsToTest,
      onProgress,
    );
  if (body.progress === true) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (event) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };
        send({ type: "start", total: ipsToTest.length, addresses: ipsToTest });
        void runSpeedTest((progress) => send({ type: "progress", ...progress }))
          .then((result) => send({ type: "complete", result }))
          .catch((error) =>
            send({
              type: "error",
              error: String(error?.message || "服务端测速失败"),
            }),
          )
          .finally(() => controller.close());
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  return jsonResponse(await runSpeedTest());
}
async function runManualSpeedTest(
  env,
  availableIPs,
  availableByAddress,
  speedSettings,
  category,
  ipsToTest,
  onProgress = null,
) {
  const startTime = Date.now();
  const { fastIPs, results, autoBlacklistedAddresses } =
    await speedTestAndStore(
      env,
      ipsToTest,
      ipsToTest.length,
      true,
      onProgress,
      true,
      {
        includeFailures: true,
        concurrency: 1,
        delayBetweenBatchesMs: speedSettings.manualAddressIntervalSeconds * 1000,
        timeoutMs: speedSettings.manualSpeedTestTimeoutSeconds * 1000,
      },
    );
  const testedAt = new Date().toISOString();
  const locationByIP = new Map(
    availableIPs.map((item) => [item.address, item.location]),
  );
  const qualityResults = results.flatMap((result) => {
    const sourceIP = availableByAddress.get(result.ip);
    const countryCode = sourceIP ? getCountryCodeForIP(sourceIP) : null;
    return countryCode &&
      Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, countryCode)
      ? [
          {
            ip: result.ip,
            countryCode,
            latency: result.latency,
            bandwidth: result.bandwidth,
            bytes: TEST_BYTES,
            testedAt,
          },
        ]
      : [];
  });
  await storeQualityIPs(env, qualityResults);
  const resultByIP = new Map(results.map((result) => [result.ip, result]));
  const latest = await getStoredIPsLatest(env);
  const updatedIPs = (latest.ips || []).map((item) => {
    const measurement = resultByIP.get(item.address);
    return measurement
      ? {
          ...item,
          latency: measurement.latency,
          bandwidth: measurement.bandwidth,
          countryCode:
            getCountryCodeForIP(availableByAddress.get(item.address)) ||
            getCountryCodeForIP(item),
          location:
            item.location && item.location !== "未知"
              ? item.location
              : locationByIP.get(item.address) || item.location,
          bandwidthBytes: TEST_BYTES,
          bandwidthTestedAt: testedAt,
        }
      : item;
  });
  const updatedClassification = classifyIPsByCountry(
    availableIPs.map((item) => {
      const measurement = resultByIP.get(item.address);
      return measurement
        ? {
            ...item,
            latency: measurement.latency,
            bandwidth: measurement.bandwidth,
          }
        : item;
    }),
    speedSettings.qualityCountries,
    speedSettings,
  );
  sortIPsBySpeed(updatedIPs, results.length > 0);
  const updatedData = {
    ...latest,
    ips: updatedIPs,
    lastUpdated: testedAt,
    bandwidthTestedCount: results.length,
  };
  const serialized = JSON.stringify(updatedData);
  const timestampKey = formatTimestampKey(new Date(testedAt));
  await env.IP_STORAGE.put("cloudflare_ips", serialized);
  await env.IP_STORAGE.put(timestampKey, serialized);
  await recordHistoryKey(env, timestampKey);
  await cleanupOldIPs(env);
  console.log(
    "Manual speed-test completed:",
    JSON.stringify({
      event: "manual_speedtest_completed",
      durationMs: Date.now() - startTime,
      testedAddresses: ipsToTest.length,
      completedAt: new Date().toISOString(),
    }),
  );

  return {
    success: true,
    message: "服务端统一测速完成",
    duration: `${Date.now() - startTime}ms`,
    requested: ipsToTest.length,
    tested: ipsToTest.length,
    succeeded: results.length,
    failed: ipsToTest.length - results.length,
    autoBlacklistedAddresses,
    transferredBytes: results.length * TEST_BYTES,
    fastIPs,
    results: results.map((result) => ({
      ...result,
      success: true,
      bytes: TEST_BYTES,
      countryCode: getCountryCodeForIP(availableByAddress.get(result.ip)),
      location: locationByIP.get(result.ip) || "未知",
      category: updatedClassification.categories.get(result.ip) || "backup",
    })),
    category,
  };
}
async function handleSpeedTest(req, env) {
  const url = new URL(req.url);
  const address = url.searchParams.get("ip");
  if (!address) return jsonResponse({ error: "missing ip" }, 400);
  let decodedAddress;
  try {
    decodedAddress = decodeURIComponent(address);
  } catch (e) {
    return jsonResponse({ error: "invalid ip encoding" }, 400);
  }
  const parsed = parseAddressWithPort(decodedAddress);
  const normalizedAddress =
    parsed.type === "ipv6" ? `[${parsed.address}]` : parsed.address;
  const addressWithPort =
    parsed.port === 443
      ? normalizedAddress
      : `${normalizedAddress}:${parsed.port}`;
  const speedSettings = await getCollectorSettings(env);
  let bytes = 0;
  let latency = null;
  let latencySuccess = false;
  let bandwidth = null;
  let autoBlacklisted = false;
  try {
    const measurement = await testIPSpeed(
      decodedAddress,
      speedSettings.manualSpeedTestTimeoutSeconds * 1000,
    );
    if (!measurement.success) {
      if (measurement.timedOut) {
        autoBlacklisted =
          (
            await addAddressesToBlacklist(
              env,
              [addressWithPort],
              "manual speed-test request timeout",
            )
          ).length > 0;
      }
      throw new Error(measurement.error || "Speed test failed");
    }
    bytes = TEST_BYTES;
    latency = measurement.latency;
    bandwidth = measurement.bandwidth;
    latencySuccess = true;
  } catch (error) {
    console.warn(`Speed test failed for ${decodedAddress}:`, error.message);
    if (!autoBlacklisted && isSpeedTestTimeoutFailure(error.message)) {
      autoBlacklisted =
        (
          await addAddressesToBlacklist(
            env,
            [addressWithPort],
            "manual speed-test request timeout",
          )
        ).length > 0;
    }
  }

  let location = "未知";
  let countryCode = null;
  try {
    if (parsed.type === "ipv4") {
      const r = await fetchSpeedTestLocation(
        `http://ip-api.com/json/${parsed.address}?fields=countryCode`,
      );
      const data = await r.json();
      if (data?.countryCode) {
        countryCode = data.countryCode;
        location = countryCode;
      }
    } else if (parsed.type === "ipv6") {
      const normalizedIp = parsed.address.replace(/^\[|\]$/g, "");
      const r = await fetchSpeedTestLocation(
        `http://ip-api.com/json/${normalizedIp}?fields=countryCode`,
      );
      const data = await r.json();
      if (data?.countryCode) {
        countryCode = data.countryCode;
        location = countryCode + "_IPv6";
      }
    } else if (parsed.type === "domain") {
      try {
        const doh = await fetchSpeedTestLocation(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(parsed.address)}&type=A`,
          { headers: { Accept: "application/dns-json" } },
        );
        const dohData = await doh.json();
        const ipRecord = dohData?.Answer?.find((a) => a.type === 1);
        if (ipRecord?.data) {
          const apiResp = await fetchSpeedTestLocation(
            `https://api.ipapi.is/?q=${encodeURIComponent(ipRecord.data)}`,
          );
          const locationData = await apiResp.json();
          countryCode = locationData?.location?.country_code || null;
          if (countryCode) location = parsed.address + "_" + countryCode;
        }
      } catch (error) {
        console.warn(
          `Location lookup failed for ${decodedAddress}:`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.warn(
      `Location lookup failed for ${decodedAddress}:`,
      error.message,
    );
  }

  const isSupportedCountry = Object.prototype.hasOwnProperty.call(
    SUPPORTED_COUNTRIES,
    countryCode,
  );
  const testedAt = new Date().toISOString();
  const qualityResult = {
    ip: addressWithPort,
    countryCode,
    latency,
    bandwidth,
    bytes,
    testedAt,
  };
  const shouldPersist = new URL(req.url).searchParams.get("persist") !== "0";
  if (shouldPersist) {
    await storeQualityIP(env, latencySuccess ? qualityResult : null, [
      addressWithPort,
    ]);
  }

  const responseData = {
    success: latencySuccess,
    latency: latency,
    bandwidth,
    category: latencySuccess ? "backup" : "untested",
    bytes,
    ip: decodedAddress,
    autoBlacklisted,
    countryCode,
    location:
      parsed.type === "domain" && location === "未知"
        ? parsed.address
        : location || parsed.address,
  };
  if (latencySuccess) {
    const latest = await getStoredIPsLatest(env);
    const currentIPs = Array.isArray(latest.ips) ? latest.ips : [];
    let updated = false;
    const updatedIPs = currentIPs.map((item) => {
      if (item.address !== decodedAddress && item.address !== addressWithPort) {
        return item;
      }
      updated = true;
      return {
        ...item,
        latency,
        bandwidth,
        countryCode: countryCode || getCountryCodeForIP(item),
        location:
          item.location && item.location !== "未知" ? item.location : location,
        bandwidthBytes: TEST_BYTES,
        bandwidthTestedAt: testedAt,
      };
    });
    if (updated) {
      sortIPsBySpeed(updatedIPs);
      const classification = classifyIPsByCountry(
        updatedIPs,
        speedSettings.qualityCountries,
        speedSettings,
      );
      responseData.category =
        classification.categories.get(decodedAddress) ||
        classification.categories.get(addressWithPort) ||
        "backup";
      const updatedData = {
        ...latest,
        ips: updatedIPs,
        lastUpdated: testedAt,
        bandwidthTestedCount: updatedIPs.filter(
          (item) =>
            Number.isFinite(item.latency) &&
            item.latency > 0 &&
            Number.isFinite(item.bandwidth) &&
            item.bandwidth > 0,
        ).length,
      };
      const serialized = JSON.stringify(updatedData);
      const timestampKey = formatTimestampKey(new Date(testedAt));
      await env.IP_STORAGE.put("cloudflare_ips", serialized);
      await env.IP_STORAGE.put(timestampKey, serialized);
      await recordHistoryKey(env, timestampKey);
      await cleanupOldIPs(env);
    }
  }
  if (latencySuccess && isSupportedCountry && !shouldPersist) {
    qualityResult.signature = await signQualityResult(env, qualityResult);
    if (qualityResult.signature) responseData.qualityResult = qualityResult;
    else
      responseData.qualityPersistenceError =
        "未配置签名密钥，优质测速结果未保存；请先设置管理员密码或绑定 ADMIN_PASSWORD";
  }
  return jsonResponse(responseData);
}
async function fetchSpeedTestLocation(input, options = {}, timeout = 2000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(input, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`Location lookup returned HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
async function storeQualityIP(env, result) {
  return storeQualityIPs(env, result ? [result] : []);
}
async function getQualitySigningKey(env, usages) {
  const storedPasswordHash = await env.IP_STORAGE.get("admin_password_hash");
  const secret =
    storedPasswordHash ||
    (env.ADMIN_PASSWORD ? await hashPassword(env.ADMIN_PASSWORD) : null);
  if (!secret) return null;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}
function qualityResultPayload(result) {
  return JSON.stringify([
    result.ip,
    result.countryCode,
    result.latency,
    result.bandwidth,
    result.bytes,
    result.testedAt,
  ]);
}
async function signQualityResult(env, result) {
  const key = await getQualitySigningKey(env, ["sign"]);
  if (!key) return null;
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(qualityResultPayload(result)),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
async function verifyQualityResult(result, key) {
  if (
    typeof result.signature !== "string" ||
    typeof result.testedAt !== "string" ||
    Date.now() - Date.parse(result.testedAt) > 10 * 60 * 1000 ||
    Date.parse(result.testedAt) > Date.now() + 60 * 1000
  )
    return false;
  try {
    if (!key) return false;
    const signature = Uint8Array.from(atob(result.signature), (character) =>
      character.charCodeAt(0),
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(qualityResultPayload(result)),
    );
  } catch (error) {
    console.warn("Quality result signature validation failed:", error);
    return false;
  }
}
async function storeQualityIPs(env, results) {
  const qualityResults = Array.isArray(results) ? results : [];
  if (!qualityResults.length) return;
  const settings = await getCollectorSettings(env);
  const key = "cloudflare_quality_ips";
  const stored = await env.IP_STORAGE.get(key);
  const data = stored ? JSON.parse(stored) : {};
  const existingCountries =
    data.countries && typeof data.countries === "object" ? data.countries : {};
  const existingDomains =
    data.domains && typeof data.domains === "object" ? data.domains : {};
  const entriesByAddress = new Map();
  data.countries = {};
  data.domains = {};
  data.lastTested = data.lastTested || null;

  for (const [countryCode, entries] of Object.entries(existingCountries)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (typeof entry?.ip !== "string" || !entry.ip) continue;
      entriesByAddress.set(entry.ip, {
        ...entry,
        countryCode: entry.countryCode || countryCode,
      });
    }
  }
  for (const [countryCode, entries] of Object.entries(existingDomains)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (typeof entry?.ip !== "string" || !entry.ip) continue;
      entriesByAddress.set(entry.ip, {
        ...entry,
        countryCode: entry.countryCode || countryCode,
      });
    }
  }
  const selectedCountries = new Set(settings.qualityCountries);
  for (const result of qualityResults) {
    if (
      !result?.ip ||
      !Object.prototype.hasOwnProperty.call(
        SUPPORTED_COUNTRIES,
        result.countryCode,
      ) ||
      !selectedCountries.has(result.countryCode) ||
      !Number.isFinite(result.latency) ||
      !Number.isFinite(result.bandwidth) ||
      !meetsQualityThresholds(result, settings)
    )
      continue;
    entriesByAddress.set(result.ip, {
      ip: result.ip,
      countryCode: result.countryCode,
      latency: result.latency,
      bandwidth: result.bandwidth,
      bytes: result.bytes,
      testedAt: result.testedAt || new Date().toISOString(),
    });
    data.lastTested = result.testedAt || new Date().toISOString();
  }

  for (const entry of entriesByAddress.values()) {
    const destination = isDomainAddress({ address: entry.ip })
      ? data.domains
      : data.countries;
    if (!destination[entry.countryCode]) destination[entry.countryCode] = [];
    destination[entry.countryCode].push(entry);
  }
  for (const destination of [data.countries, data.domains]) {
    for (const [countryCode, entries] of Object.entries(destination)) {
      destination[countryCode] = rankIPsByLatencyAndBandwidth(entries);
    }
  }

  await env.IP_STORAGE.put(key, JSON.stringify(data));
}
async function handleStoreQualityIPs(req, env) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  if (!Array.isArray(body?.results) || body.results.length > 1000) {
    return jsonResponse({ error: "results 必须是最多 1000 项的数组" }, 400);
  }
  const results = body.results
    .filter(
      (item) =>
        item &&
        typeof item.ip === "string" &&
        item.ip.length <= 256 &&
        Object.prototype.hasOwnProperty.call(
          SUPPORTED_COUNTRIES,
          item.countryCode,
        ) &&
        Number.isFinite(item.latency) &&
        item.latency > 0 &&
        Number.isFinite(item.bandwidth) &&
        item.bandwidth > 0 &&
        Number.isSafeInteger(item.bytes) &&
        item.bytes > 0 &&
        typeof item.testedAt === "string" &&
        typeof item.signature === "string",
    )
    .map((item) => ({
      ip: item.ip.replace(/[\r\n]/g, ""),
      countryCode: item.countryCode,
      latency: item.latency,
      bandwidth: item.bandwidth,
      bytes: item.bytes,
      testedAt: item.testedAt,
      signature: item.signature,
    }));
  const verificationKey = await getQualitySigningKey(env, ["verify"]);
  const verifiedResults = [];
  for (const result of results) {
    if (await verifyQualityResult(result, verificationKey))
      verifiedResults.push(result);
  }
  if (results.length && !verifiedResults.length) {
    return jsonResponse(
      { error: "没有通过验证的测速结果，请重新测速后重试" },
      400,
    );
  }
  await storeQualityIPs(env, verifiedResults);
  return jsonResponse({ success: true, stored: verifiedResults.length });
}
async function handleGetQualityIPs(env, countriesParameter = null) {
  const stored = await env.IP_STORAGE.get("cloudflare_quality_ips");
  const data = stored
    ? JSON.parse(stored)
    : { countries: {}, lastTested: null };
  const settings = await getCollectorSettings(env);
  const configuredCountries = countriesParameter
    ? [
        ...new Set(
          countriesParameter
            .split(",")
            .filter((code) =>
              Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, code),
            ),
        ),
      ]
    : await getConfiguredQualityCountries(env);
  const countryNames = Object.fromEntries(
    configuredCountries.map((code) => [code, SUPPORTED_COUNTRIES[code]]),
  );
  const countries = {};
  const domains = {};
  configuredCountries.forEach((code) => {
    const getRankedResults = (entries, isDomain) =>
      rankIPsByLatencyAndBandwidth(
        (Array.isArray(entries) ? entries : []).filter(
          (result) =>
            isDomainAddress({ address: result.ip }) === isDomain &&
            Number.isFinite(result.latency) &&
            result.latency > 0 &&
            Number.isFinite(result.bandwidth) &&
            result.bandwidth > 0 &&
            meetsQualityThresholds(result, settings),
        ),
      ).slice(
        0,
        isDomain
          ? settings.qualityCountryLimits[code].domain
          : settings.qualityCountryLimits[code].ip,
      );
    countries[code] = getRankedResults(data.countries?.[code], false);
    domains[code] = getRankedResults(data.domains?.[code], true);
  });

  return jsonResponse({
    countries,
    domains,
    countryNames,
    lastTested: data.lastTested || null,
    testBytes: SPEED_TEST_BYTES,
  });
}
async function handleGetQualityIPsText(
  env,
  countriesParameter = null,
  addressType = "ip",
) {
  if (addressType !== "ip" && addressType !== "domain") {
    return new Response("type 必须是 ip 或 domain\n", {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  const settings = await getCollectorSettings(env);
  const requestedCountries = countriesParameter
    ? countriesParameter.split(",")
    : settings.qualityCountries;
  const selectedCountries = [
    ...new Set(
      requestedCountries.filter((code) =>
        Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, code),
      ),
    ),
  ];
  const latest = await getStoredIPsLatest(env);
  const displayData = await getIPsWithFallback(env, settings.displayLimit);
  const candidates = new Map(
    (latest.ips || []).map((item) => [item.address, item]),
  );
  for (const item of displayData.ips || []) {
    if (!candidates.has(item.address)) candidates.set(item.address, item);
  }
  const enrichedCandidates = await enrichIPsWithQualityCountries(
    env,
    Array.from(candidates.values()),
  );
  const classification = classifyIPsByCountry(
    enrichedCandidates,
    selectedCountries,
    settings,
  );
  const normalizedBlacklist = preprocessBlacklist(displayData.blacklist || []);
  const selectedCountrySet = new Set(selectedCountries);
  const category = addressType === "domain" ? "premium-domain" : "premium";
  const qualityResults = enrichedCandidates.filter(
    (item) =>
      classification.categories.get(item.address) === category &&
      selectedCountrySet.has(getCountryCodeForIP(item)) &&
      !isBlacklisted(item.address, normalizedBlacklist),
  );
  const lines = [];
  for (const item of qualityResults) {
    const address = String(item.address || "").replace(/[\r\n]/g, "");
    const countryCode = getCountryCodeForIP(item);
    if (!address || !countryCode) continue;
    lines.push(
      `${address}#${SUPPORTED_COUNTRIES[countryCode]}#${Math.round(item.latency)}ms#${Number(item.bandwidth).toFixed(2)}MB/s`,
    );
  }
  return new Response(lines.join("\n") + (lines.length ? "\n" : ""), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `inline; filename="cloudflare_quality_${addressType === "domain" ? "domains" : "ips"}.txt"`,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
async function handleSaveLatency(req, env) {
  return jsonResponse({ success: true });
}
async function handleSetSpeedTestCount(req, env) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  const {
    count,
    manualBatchSize: requestedManualBatchSize,
    batchIntervalSeconds,
    addressIntervalSeconds,
    timeoutSeconds: requestedTimeoutSeconds,
  } = body || {};
  if (!Number.isSafeInteger(count) || count < 0) {
    return jsonResponse({ error: "count 必须是大于等于 0 的安全整数" }, 400);
  }
  const current = await getCollectorSettings(env);
  const manualBatchSize =
    requestedManualBatchSize === undefined
      ? current.manualBatchSize
      : requestedManualBatchSize;
  const timeoutSeconds =
    requestedTimeoutSeconds === undefined
      ? current.manualSpeedTestTimeoutSeconds
      : requestedTimeoutSeconds;
  const nextBatchInterval =
    batchIntervalSeconds === undefined
      ? current.manualBatchIntervalSeconds
      : batchIntervalSeconds;
  const nextAddressInterval =
    addressIntervalSeconds === undefined
      ? current.manualAddressIntervalSeconds
      : addressIntervalSeconds;
  if (
    !Number.isSafeInteger(manualBatchSize) ||
    manualBatchSize < MIN_MANUAL_SPEED_TEST_BATCH_SIZE ||
    manualBatchSize > MAX_MANUAL_SPEED_TEST_BATCH_SIZE
  ) {
    return jsonResponse(
      { error: `每批 IP 数必须是 ${MIN_MANUAL_SPEED_TEST_BATCH_SIZE}-${MAX_MANUAL_SPEED_TEST_BATCH_SIZE} 的整数` },
      400,
    );
  }
  if (
    !Number.isSafeInteger(nextBatchInterval) ||
    nextBatchInterval < MIN_MANUAL_SPEED_TEST_INTERVAL_SECONDS ||
    nextBatchInterval > MAX_MANUAL_SPEED_TEST_INTERVAL_SECONDS ||
    !Number.isSafeInteger(nextAddressInterval) ||
    nextAddressInterval < MIN_MANUAL_SPEED_TEST_INTERVAL_SECONDS ||
    nextAddressInterval > MAX_MANUAL_SPEED_TEST_INTERVAL_SECONDS
  ) {
    return jsonResponse(
      { error: `测速间隔必须是 0-60 秒的整数` },
      400,
    );
  }
  if (
    !Number.isSafeInteger(timeoutSeconds) ||
    timeoutSeconds < MIN_SPEED_TEST_TIMEOUT_SECONDS ||
    timeoutSeconds > MAX_SPEED_TEST_TIMEOUT_SECONDS
  ) {
    return jsonResponse(
      { error: "超时自动拉黑阈值必须是 1-60 秒的整数" },
      400,
    );
  }
  await saveCollectorSettings(env, {
    speedTestCount: count,
    manualBatchSize,
    manualBatchIntervalSeconds: nextBatchInterval,
    manualAddressIntervalSeconds: nextAddressInterval,
    manualSpeedTestTimeoutSeconds: timeoutSeconds,
  });
  return jsonResponse({
    success: true,
    count,
    manualBatchSize,
    batchIntervalSeconds: nextBatchInterval,
    addressIntervalSeconds: nextAddressInterval,
    timeoutSeconds,
  });
}
async function handleSetScheduledSpeedTestSettings(req, env) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  const { batchSize, batchIntervalSeconds } = body || {};
  const current = await getCollectorSettings(env);
  const addressIntervalSeconds =
    body?.addressIntervalSeconds === undefined
      ? DEFAULT_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS
      : body.addressIntervalSeconds;
  const timeoutSeconds =
    body?.timeoutSeconds === undefined
      ? current.scheduledSpeedTestTimeoutSeconds
      : body.timeoutSeconds;
  if (
    !Number.isSafeInteger(batchSize) ||
    batchSize < MIN_SCHEDULED_SPEED_TEST_BATCH_SIZE ||
    batchSize > MAX_SCHEDULED_SPEED_TEST_BATCH_SIZE
  ) {
    return jsonResponse(
      {
        error: `每批 IP 数必须是 ${MIN_SCHEDULED_SPEED_TEST_BATCH_SIZE}-${MAX_SCHEDULED_SPEED_TEST_BATCH_SIZE} 的整数`,
      },
      400,
    );
  }
  if (
    !Number.isSafeInteger(batchIntervalSeconds) ||
    batchIntervalSeconds < MIN_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS ||
    batchIntervalSeconds > MAX_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS
  ) {
    return jsonResponse(
      {
        error: `批次间隔必须是 ${MIN_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS}-${MAX_SCHEDULED_SPEED_TEST_BATCH_INTERVAL_SECONDS} 秒的整数`,
      },
      400,
    );
  }
  if (
    !Number.isSafeInteger(addressIntervalSeconds) ||
    addressIntervalSeconds <
      MIN_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS ||
    addressIntervalSeconds > MAX_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS
  ) {
    return jsonResponse(
      {
        error: `每个 IP 请求间隔必须是 ${MIN_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS}-${MAX_SCHEDULED_SPEED_TEST_ADDRESS_INTERVAL_SECONDS} 秒的整数`,
      },
      400,
    );
  }
  if (
    !Number.isSafeInteger(timeoutSeconds) ||
    timeoutSeconds < MIN_SPEED_TEST_TIMEOUT_SECONDS ||
    timeoutSeconds > MAX_SPEED_TEST_TIMEOUT_SECONDS
  ) {
    return jsonResponse(
      {
        error: "超时自动拉黑阈值必须是 1-60 秒的整数",
      },
      400,
    );
  }
  const value = JSON.stringify({
    batchSize,
    batchIntervalSeconds,
    addressIntervalSeconds,
    timeoutSeconds,
  });
  try {
    if (
      (await env.IP_STORAGE.get(SCHEDULED_SPEED_TEST_SETTINGS_KEY)) !== value
    ) {
      await env.IP_STORAGE.put(SCHEDULED_SPEED_TEST_SETTINGS_KEY, value);
    }
  } catch (error) {
    if (String(error?.message || "").includes("KV put() limit exceeded")) {
      return jsonResponse(
        {
          error:
            "Cloudflare KV 已达到当日写入上限，定时测速规则未更改。请等待额度重置后重试，或在 Cloudflare 控制台升级 KV 计划。",
        },
        429,
      );
    }
    throw error;
  }
  return jsonResponse({
    success: true,
    batchSize,
    batchIntervalSeconds,
    addressIntervalSeconds,
    timeoutSeconds,
  });
}
async function listIPHistorySnapshotKeys(env) {
  const keys = new Set(
    (await getHistoryKeys(env)).filter((key) => parseTimestampKey(key)),
  );
  if (typeof env.IP_STORAGE.list === "function") {
    let cursor;
    do {
      const page = await env.IP_STORAGE.list({
        prefix: "cloudflare_ips_",
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });
      for (const item of page.keys || []) {
        if (parseTimestampKey(item.name)) keys.add(item.name);
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
  return [...keys].sort((a, b) => parseTimestampKey(b) - parseTimestampKey(a));
}
async function handleClearAllIPs(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.hasPassword || !adminStatus.isLoggedIn) {
    return jsonResponse({ error: "请先登录管理员账号再清理 IP 数据" }, 401);
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  const category = body?.category;
  const validCategories = [
    "premium",
    "premium-domain",
    "backup",
    "untested",
    "all",
  ];
  if (!validCategories.includes(category)) {
    return jsonResponse({ error: "请选择有效的 IP 清理类别" }, 400);
  }

  const historyKeys = await listIPHistorySnapshotKeys(env);
  if (category === "all") {
    const addresses = new Set();
    for (const key of [...historyKeys, "cloudflare_ips"]) {
      const raw = await env.IP_STORAGE.get(key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        for (const item of data?.ips || []) {
          if (item?.address) addresses.add(item.address);
        }
      } catch (error) {
        throw new Error(
          `无法解析历史数据 ${key}，已停止清理：${error.message}`,
        );
      }
    }
    const keysToDelete = new Set([
      ...historyKeys,
      "cloudflare_ips",
      HISTORY_INDEX_KEY,
      "cloudflare_quality_ips",
      "cloudflare_fast_ips",
      "global_unique_ips_count",
      "global_unique_ips_set",
    ]);
    let deletedKeys = 0;
    const keys = [...keysToDelete];
    for (let index = 0; index < keys.length; index += 50) {
      const batch = keys.slice(index, index + 50);
      const results = await Promise.all(
        batch.map(async (key) => {
          await env.IP_STORAGE.delete(key);
          return 1;
        }),
      );
      deletedKeys += results.length;
    }
    return jsonResponse({
      success: true,
      category,
      removedAddresses: addresses.size,
      deletedKeys,
    });
  }

  const snapshotKeys = [...new Set([...historyKeys, "cloudflare_ips"])];
  const snapshots = [];
  const candidatesByAddress = new Map();
  for (const key of snapshotKeys) {
    const raw = await env.IP_STORAGE.get(key);
    if (!raw) continue;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error(`无法解析历史数据 ${key}，已停止清理：${error.message}`);
    }
    if (!Array.isArray(data?.ips)) continue;
    snapshots.push({ key, data });
    for (const item of data.ips) {
      if (item?.address && !candidatesByAddress.has(item.address)) {
        candidatesByAddress.set(item.address, item);
      }
    }
  }

  const qualityRaw = await env.IP_STORAGE.get("cloudflare_quality_ips");
  let qualityData = null;
  if (qualityRaw) {
    try {
      qualityData = JSON.parse(qualityRaw);
    } catch (error) {
      throw new Error(`无法解析优质测速数据，已停止清理：${error.message}`);
    }
    for (const collectionName of ["countries", "domains"]) {
      for (const [countryCode, entries] of Object.entries(
        qualityData?.[collectionName] || {},
      )) {
        if (!Array.isArray(entries)) continue;
        for (const item of entries) {
          if (!item?.ip || candidatesByAddress.has(item.ip)) continue;
          candidatesByAddress.set(item.ip, {
            address: item.ip,
            countryCode: item.countryCode || countryCode,
            latency: item.latency,
            bandwidth: item.bandwidth,
          });
        }
      }
    }
  }

  const settings = await getCollectorSettings(env);
  const classification = classifyIPsByCountry(
    [...candidatesByAddress.values()],
    settings.qualityCountries,
    settings,
  );
  const addressesToRemove = new Set(
    [...candidatesByAddress.keys()].filter(
      (address) => classification.categories.get(address) === category,
    ),
  );
  let updatedSnapshots = 0;
  for (const { key, data } of snapshots) {
    const filteredIPs = data.ips.filter(
      (item) => !addressesToRemove.has(item?.address),
    );
    if (filteredIPs.length === data.ips.length) continue;
    data.ips = filteredIPs;
    data.count = filteredIPs.length;
    data.bandwidthTestedCount = filteredIPs.filter(isSpeedTestedIP).length;
    await env.IP_STORAGE.put(key, JSON.stringify(data));
    updatedSnapshots++;
  }

  if (
    (qualityData?.countries || qualityData?.domains) &&
    addressesToRemove.size
  ) {
    let qualityChanged = false;
    for (const collectionName of ["countries", "domains"]) {
      const collection = qualityData[collectionName];
      if (!collection || typeof collection !== "object") continue;
      for (const [countryCode, entries] of Object.entries(collection)) {
        if (!Array.isArray(entries)) continue;
        const filtered = entries.filter(
          (item) => !addressesToRemove.has(item?.ip),
        );
        if (filtered.length !== entries.length) {
          collection[countryCode] = filtered;
          qualityChanged = true;
        }
      }
    }
    if (qualityChanged) {
      const hasQualityEntries = ["countries", "domains"].some(
        (collectionName) =>
          Object.values(qualityData[collectionName] || {}).some(
            (entries) => Array.isArray(entries) && entries.length > 0,
          ),
      );
      if (hasQualityEntries) {
        await env.IP_STORAGE.put(
          "cloudflare_quality_ips",
          JSON.stringify(qualityData),
        );
      } else {
        await env.IP_STORAGE.delete("cloudflare_quality_ips");
      }
    }
  }

  await Promise.all([
    env.IP_STORAGE.delete("cloudflare_fast_ips"),
    env.IP_STORAGE.delete("global_unique_ips_count"),
    env.IP_STORAGE.delete("global_unique_ips_set"),
  ]);
  return jsonResponse({
    success: true,
    category,
    removedAddresses: addressesToRemove.size,
    updatedSnapshots,
  });
}
async function handleSetScheduleApiConfig(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.hasPassword || !adminStatus.isLoggedIn) {
    return jsonResponse(
      { error: "请先登录管理员账号再保存定时 API 设置" },
      401,
    );
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "请求内容必须是 JSON 对象" }, 400);
  }
  const accountId =
    typeof body.accountId === "string" ? body.accountId.trim() : "";
  const scriptName =
    typeof body.scriptName === "string" ? body.scriptName.trim() : "";
  const apiToken =
    typeof body.apiToken === "string"
      ? body.apiToken.trim().replace(/^Bearer\s+/i, "")
      : "";
  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    return jsonResponse(
      { error: "Account ID 必须是 32 位十六进制字符串" },
      400,
    );
  }
  if (!scriptName || scriptName.length > 255) {
    return jsonResponse(
      { error: "Worker 脚本名不能为空且最多 255 个字符" },
      400,
    );
  }
  if (apiToken.length > 512) {
    return jsonResponse({ error: "Cloudflare API Token 长度无效" }, 400);
  }
  const [storedAccountId, storedScriptName, storedApiToken] = await Promise.all(
    [
      env.IP_STORAGE.get(SCHEDULE_ACCOUNT_ID_KEY),
      env.IP_STORAGE.get(SCHEDULE_SCRIPT_NAME_KEY),
      env.IP_STORAGE.get(SCHEDULE_API_TOKEN_KEY),
    ],
  );
  const persistenceWarnings = [];
  const configuredAccountId = env.CLOUDFLARE_ACCOUNT_ID || "";
  const configuredScriptName = env.CLOUDFLARE_SCRIPT_NAME || "";
  const configuredApiToken = env.CLOUDFLARE_API_TOKEN || "";
  for (const [key, value, storedValue, label] of [
    [SCHEDULE_ACCOUNT_ID_KEY, accountId, storedAccountId, "Account ID"],
    [SCHEDULE_SCRIPT_NAME_KEY, scriptName, storedScriptName, "Worker 脚本名"],
    ...(apiToken
      ? [[SCHEDULE_API_TOKEN_KEY, apiToken, storedApiToken, "API Token"]]
      : []),
  ]) {
    if (storedValue === value) continue;
    if (
      (key === SCHEDULE_ACCOUNT_ID_KEY && configuredAccountId === value) ||
      (key === SCHEDULE_SCRIPT_NAME_KEY && configuredScriptName === value) ||
      (key === SCHEDULE_API_TOKEN_KEY && configuredApiToken === value)
    ) {
      continue;
    }
    try {
      await env.IP_STORAGE.put(key, value);
    } catch (error) {
      persistenceWarnings.push(
        `${label}未能写入 KV：${String(error?.message || "写入失败").slice(0, 180)}`,
      );
    }
  }
  let persistedAccountId = null;
  let persistedScriptName = null;
  let persistedApiToken = null;
  try {
    [persistedAccountId, persistedScriptName, persistedApiToken] =
      await Promise.all([
        env.IP_STORAGE.get(SCHEDULE_ACCOUNT_ID_KEY),
        env.IP_STORAGE.get(SCHEDULE_SCRIPT_NAME_KEY),
        env.IP_STORAGE.get(SCHEDULE_API_TOKEN_KEY),
      ]);
  } catch (error) {
    persistenceWarnings.push(
      `无法校验 KV 保存结果：${String(error?.message || "读取失败").slice(0, 180)}`,
    );
  }
  const accountIdPersisted = persistedAccountId === accountId;
  const scriptNamePersisted = persistedScriptName === scriptName;
  const tokenPersisted =
    Boolean(persistedApiToken) &&
    (apiToken ? persistedApiToken === apiToken : true);
  const accountIdConfigured =
    accountIdPersisted || configuredAccountId === accountId;
  const scriptNameConfigured =
    scriptNamePersisted || configuredScriptName === scriptName;
  const tokenConfigured = apiToken
    ? tokenPersisted || configuredApiToken === apiToken
    : Boolean(persistedApiToken || configuredApiToken);
  if (!accountIdConfigured) persistenceWarnings.push("Account ID 尚未持久化");
  if (!scriptNameConfigured)
    persistenceWarnings.push("Worker 脚本名尚未持久化");
  if (!tokenConfigured) persistenceWarnings.push("API Token 尚未持久化");
  return jsonResponse({
    success: true,
    accountId,
    scriptName,
    accountIdPersisted,
    scriptNamePersisted,
    tokenPersisted,
    accountIdConfigured,
    scriptNameConfigured,
    tokenConfigured,
    configurationDurable:
      accountIdConfigured && scriptNameConfigured && tokenConfigured,
    persistenceWarning: persistenceWarnings.length
      ? [...new Set(persistenceWarnings)].join("；")
      : null,
  });
}
const BACKUP_SETTING_KEYS = [
  COLLECTOR_SETTINGS_KEY,
  SPEED_TEST_COUNT_KEY,
  AUTO_UPDATE_COUNT_KEY,
  QUALITY_COUNTRIES_KEY,
  QUALITY_COUNTRY_LIMITS_KEY,
  MAX_SPEED_TEST_LATENCY_KEY,
  MIN_SPEED_TEST_BANDWIDTH_KEY,
  SCHEDULE_ENABLED_KEY,
  SCHEDULE_TIMES_KEY,
  SCHEDULE_TIMEZONE_KEY,
  SCHEDULE_ACCOUNT_ID_KEY,
  SCHEDULE_SCRIPT_NAME_KEY,
  SCHEDULE_API_TOKEN_KEY,
  APPLIED_CRON_EXPRESSIONS_KEY,
  SCHEDULED_SPEED_TEST_SETTINGS_KEY,
  "custom_path",
  "blacklist_addresses",
  "sources_urls",
];

async function handleBackupSettings(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.isLoggedIn) {
    return jsonResponse({ error: "请先登录管理员账号再备份设置" }, 401);
  }
  const settings = {};
  for (const key of BACKUP_SETTING_KEYS) {
    const value = await env.IP_STORAGE.get(key);
    if (value !== null) settings[key] = value;
  }
  return jsonResponse({
    success: true,
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
  });
}

async function handleRestoreSettings(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.isLoggedIn) {
    return jsonResponse({ error: "请先登录管理员账号再恢复设置" }, 401);
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "备份内容必须是有效 JSON" }, 400);
  }
  const settings = body?.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return jsonResponse({ error: "备份文件缺少有效的 settings 数据" }, 400);
  }
  for (const key of Object.keys(settings)) {
    if (!BACKUP_SETTING_KEYS.includes(key)) {
      return jsonResponse({ error: `备份包含不支持的设置项：${key}` }, 400);
    }
    if (typeof settings[key] !== "string") {
      return jsonResponse({ error: `设置项 ${key} 格式无效` }, 400);
    }
  }
  for (const key of BACKUP_SETTING_KEYS) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      await env.IP_STORAGE.put(key, settings[key]);
    } else {
      await env.IP_STORAGE.delete(key);
    }
  }
  return jsonResponse({ success: true, restoredKeys: Object.keys(settings).length });
}

async function handleResetSetting(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.isLoggedIn) {
    return jsonResponse({ error: "请先登录管理员账号再恢复默认值" }, 401);
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  const setting = String(body?.setting || "");
  const allowed = new Set([
    "manual-speedtest", "scheduled-speedtest", "speedtest-threshold",
    "quality-countries", "display-limit", "custom-path", "sources",
    "blacklist", "schedule", "schedule-api", "schedule-times",
  ]);
  if (!allowed.has(setting)) return jsonResponse({ error: "不支持的设置项" }, 400);

  if (setting === "manual-speedtest") {
    await env.IP_STORAGE.delete(SPEED_TEST_COUNT_KEY);
    const raw = await env.IP_STORAGE.get(COLLECTOR_SETTINGS_KEY);
    let collector = {};
    try { collector = raw ? JSON.parse(raw) || {} : {}; } catch {}
    collector.manualBatchIntervalSeconds = DEFAULT_MANUAL_SPEED_TEST_BATCH_INTERVAL_SECONDS;
    collector.manualBatchSize = DEFAULT_MANUAL_SPEED_TEST_BATCH_SIZE;
    collector.manualAddressIntervalSeconds = DEFAULT_MANUAL_SPEED_TEST_ADDRESS_INTERVAL_SECONDS;
    collector.manualSpeedTestTimeoutSeconds = DEFAULT_MANUAL_SPEED_TEST_TIMEOUT_SECONDS;
    await env.IP_STORAGE.put(COLLECTOR_SETTINGS_KEY, JSON.stringify(collector));
  } else if (setting === "scheduled-speedtest") {
    await env.IP_STORAGE.delete(SCHEDULED_SPEED_TEST_SETTINGS_KEY);
  } else if (setting === "speedtest-threshold") {
    await env.IP_STORAGE.delete(MAX_SPEED_TEST_LATENCY_KEY);
    await env.IP_STORAGE.delete(MIN_SPEED_TEST_BANDWIDTH_KEY);
  } else if (setting === "quality-countries") {
    await env.IP_STORAGE.delete(QUALITY_COUNTRIES_KEY);
    await env.IP_STORAGE.delete(QUALITY_COUNTRY_LIMITS_KEY);
  } else if (setting === "display-limit") {
    await env.IP_STORAGE.delete(AUTO_UPDATE_COUNT_KEY);
  } else if (setting === "custom-path") {
    await env.IP_STORAGE.delete("custom_path");
  } else if (setting === "sources") {
    await env.IP_STORAGE.delete("sources_urls");
  } else if (setting === "blacklist") {
    await env.IP_STORAGE.delete("blacklist_addresses");
  } else if (setting === "schedule") {
    await env.IP_STORAGE.delete(SCHEDULE_ENABLED_KEY);
  } else if (setting === "schedule-api") {
    await env.IP_STORAGE.delete(SCHEDULE_ACCOUNT_ID_KEY);
    await env.IP_STORAGE.delete(SCHEDULE_SCRIPT_NAME_KEY);
    await env.IP_STORAGE.delete(SCHEDULE_API_TOKEN_KEY);
    await env.IP_STORAGE.delete(APPLIED_CRON_EXPRESSIONS_KEY);
  } else if (setting === "schedule-times") {
    await env.IP_STORAGE.delete(SCHEDULE_TIMES_KEY);
    await env.IP_STORAGE.delete(SCHEDULE_TIMEZONE_KEY);
  }
  return jsonResponse({ success: true, setting });
}

async function handleGetScheduledErrorLogs(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.hasPassword || !adminStatus.isLoggedIn) {
    return jsonResponse({ error: "请先登录管理员账号再查看定时任务日志" }, 401);
  }
  if (!env.IP_STORAGE) {
    return jsonResponse(
      { error: "IP_STORAGE KV 未绑定，无法读取定时任务日志" },
      503,
    );
  }
  try {
    const [rawErrors, rawActivity, rawStats, latest, blacklist] =
      await Promise.all([
        env.IP_STORAGE.get(SCHEDULED_ERROR_LOGS_KEY),
        env.IP_STORAGE.get(SCHEDULED_ACTIVITY_LOGS_KEY),
        env.IP_STORAGE.get(SCHEDULED_RUN_STATS_KEY),
        getStoredIPsLatest(env),
        getBlacklist(env),
      ]);
    const errors = rawErrors ? JSON.parse(rawErrors) : [];
    const activity = rawActivity ? JSON.parse(rawActivity) : [];
    const runStats = rawStats ? JSON.parse(rawStats) : {};
    if (
      !Array.isArray(errors) ||
      !Array.isArray(activity) ||
      !runStats ||
      typeof runStats !== "object" ||
      Array.isArray(runStats)
    ) {
      return jsonResponse({ error: "定时任务错误日志格式无效" }, 500);
    }
    const ips = Array.isArray(latest?.ips) ? latest.ips : [];
    const uniqueAddresses = new Set(
      ips
        .map((item) => item?.address)
        .filter((address) => typeof address === "string" && address),
    );
    const normalizedBlacklist = preprocessBlacklist(
      Array.isArray(blacklist) ? blacklist : [],
    );
    const testedCount = ips.filter(isSpeedTestedIP).length;
    const blacklistedCount = [...uniqueAddresses].filter((address) =>
      isBlacklisted(address, normalizedBlacklist),
    ).length;
    const activityLogs = activity
      .filter(
        (entry) =>
          entry &&
          SCHEDULED_ACTIVITY_EVENTS.has(entry.event),
      )
      .slice(-MAX_SCHEDULED_ERROR_LOGS)
      .reverse()
      .map(summarizeScheduledActivity)
      .filter(Boolean);
    if (!activityLogs.length && Number(runStats.runCount) > 0) {
      const hasRecentError =
        runStats.lastError &&
        runStats.lastErrorAt &&
        (!runStats.lastRunAt ||
          Date.parse(runStats.lastErrorAt) >=
            Date.parse(runStats.lastRunAt));
      activityLogs.push({
        timestamp:
          (hasRecentError ? runStats.lastErrorAt : runStats.lastSuccessAt) ||
          runStats.lastRunAt,
        level: hasRecentError ? "ERROR" : "INFO",
        event: "scheduled_history_summary",
        historicalSummary: true,
        runCount: Number(runStats.runCount) || 0,
        successfulRunCount: Number(runStats.successfulRunCount) || 0,
        errorRunCount: Number(runStats.errorRunCount) || 0,
        addressCount: Number(runStats.lastIpCount) || 0,
        updatedAddressCount: Number(runStats.updatedAddressCount) || 0,
        stage: hasRecentError ? runStats.lastError.stage : null,
        error: hasRecentError ? runStats.lastError.message : null,
      });
    }
    return jsonResponse({
      success: true,
      logs: errors
        .filter((entry) => entry && entry.level === "ERROR")
        .slice(-MAX_SCHEDULED_ERROR_LOGS)
        .reverse(),
      activityLogs,
      runStats,
      ipPool: {
        totalCount: uniqueAddresses.size,
        testedCount,
        untestedCount: Math.max(0, uniqueAddresses.size - testedCount),
        blacklistedCount,
        availableCount: Math.max(
          0,
          uniqueAddresses.size - blacklistedCount,
        ),
        updatedAt: latest?.lastUpdated || null,
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        error: `读取定时任务错误日志失败：${String(error?.message || "KV 读取失败").slice(0, 300)}`,
      },
      500,
    );
  }
}
async function handleSetScheduleEnabled(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.hasPassword) {
    return jsonResponse({ error: "请先设置管理员密码再修改定时任务" }, 401);
  }
  if (!adminStatus.isLoggedIn) {
    return jsonResponse({ error: "请先登录管理员账号再修改定时任务" }, 401);
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  if (typeof body?.enabled !== "boolean") {
    return jsonResponse({ error: "enabled 必须是布尔值" }, 400);
  }
  if (!env.IP_STORAGE) {
    return jsonResponse(
      { error: "IP_STORAGE KV 未绑定，无法保存定时任务开关" },
      503,
    );
  }
  const settings = await getCollectorSettings(env);
  if (body.enabled && !settings.scheduleConfigured) {
    return jsonResponse(
      { error: "请先在“运行时间”中保存 Cron 计划，再开启定时任务" },
      400,
    );
  }
  const credentials = await getStoredScheduleIdentifiers(env);
  credentials.apiToken =
    (await env.IP_STORAGE.get(SCHEDULE_API_TOKEN_KEY)) ||
    env.CLOUDFLARE_API_TOKEN ||
    "";
  if (!body.enabled) {
    await env.IP_STORAGE.put(SCHEDULE_ENABLED_KEY, "false");
  }
  if (!/^[a-f0-9]{32}$/i.test(credentials.accountId)) {
    if (!body.enabled) {
      await env.IP_STORAGE.put(APPLIED_CRON_EXPRESSIONS_KEY, "[]");
      return jsonResponse({
        success: true,
        enabled: false,
        cronExpressions: [],
        appliedCronExpressions: [],
        warning:
          "本地定时任务已关闭；请补充 Cloudflare API 设置以移除已应用的 Cron。",
      });
    }
    return jsonResponse({ error: "请先配置有效的 32 位 Account ID" }, 400);
  }
  if (!credentials.scriptName) {
    if (!body.enabled) {
      await env.IP_STORAGE.put(APPLIED_CRON_EXPRESSIONS_KEY, "[]");
      return jsonResponse({
        success: true,
        enabled: false,
        cronExpressions: [],
        appliedCronExpressions: [],
        warning:
          "本地定时任务已关闭；请补充 Cloudflare API 设置以移除已应用的 Cron。",
      });
    }
    return jsonResponse({ error: "请先配置 Worker 脚本名" }, 400);
  }
  let cronExpressions = [];
  if (body.enabled) {
    cronExpressions = getCronExpressionsForFields(
      settings.scheduleFields,
      settings.scheduleTimezone,
    );
  }
  let appliedCronExpressions;
  try {
    appliedCronExpressions = await updateCloudflareCronTriggers(
      env,
      cronExpressions,
      credentials,
    );
  } catch (error) {
    if (!body.enabled) {
      await env.IP_STORAGE.put(APPLIED_CRON_EXPRESSIONS_KEY, "[]");
      return jsonResponse({
        success: true,
        enabled: false,
        cronExpressions: [],
        appliedCronExpressions: [],
        warning: `本地定时任务已关闭；Cloudflare Cron 移除失败：${String(error?.message || "API 更新失败").slice(0, 300)}`,
      });
    }
    return jsonResponse(
      {
        error: String(error?.message || "Cloudflare API 更新失败").slice(
          0,
          400,
        ),
      },
      502,
    );
  }
  await env.IP_STORAGE.put(SCHEDULE_ENABLED_KEY, String(body.enabled));
  await env.IP_STORAGE.put(
    APPLIED_CRON_EXPRESSIONS_KEY,
    JSON.stringify(appliedCronExpressions),
  );
  return jsonResponse({
    success: true,
    enabled: body.enabled,
    cronExpressions,
    appliedCronExpressions,
  });
}
async function handleSetScheduleTimes(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.hasPassword) {
    return jsonResponse(
      { error: "请先设置管理员密码再修改 Cron Trigger" },
      401,
    );
  }
  if (!adminStatus.isLoggedIn) {
    return jsonResponse(
      { error: "请先登录管理员账号再修改 Cron Trigger" },
      401,
    );
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "请求内容必须是 JSON 对象" }, 400);
  }
  let scheduleFields;
  try {
    scheduleFields = normalizeScheduleFields(body.fields);
  } catch (error) {
    return jsonResponse({ error: error.message }, 400);
  }
  const timezone = body.timezone;
  if (!SUPPORTED_SCHEDULE_TIMEZONES.includes(timezone)) {
    return jsonResponse({ error: "timezone 必须是 Asia/Shanghai 或 UTC" }, 400);
  }
  if (body.replaceExisting !== true) {
    return jsonResponse(
      { error: "请确认替换此 Worker 脚本的全部现有 Cron Trigger" },
      400,
    );
  }
  let enabled = body.enabled;
  if (typeof enabled !== "boolean") {
    enabled = (await env.IP_STORAGE.get(SCHEDULE_ENABLED_KEY)) === "true";
  }

  const credentials = {
    apiToken: typeof body.apiToken === "string" ? body.apiToken.trim() : "",
    accountId: typeof body.accountId === "string" ? body.accountId.trim() : "",
    scriptName:
      typeof body.scriptName === "string" ? body.scriptName.trim() : "",
  };
  let cronExpressions;
  try {
    cronExpressions = getCronExpressionsForFields(scheduleFields, timezone);
  } catch (error) {
    return jsonResponse({ error: error.message }, 400);
  }
  let appliedCronExpressions = [];
  if (enabled) {
    if (!credentials.apiToken) {
      credentials.apiToken =
        (await env.IP_STORAGE.get(SCHEDULE_API_TOKEN_KEY)) || "";
    }
    if (!credentials.accountId) {
      credentials.accountId =
        (await env.IP_STORAGE.get(SCHEDULE_ACCOUNT_ID_KEY)) || "";
    }
    if (!credentials.scriptName) {
      credentials.scriptName =
        (await env.IP_STORAGE.get(SCHEDULE_SCRIPT_NAME_KEY)) || "";
    }
    if (!/^[a-f0-9]{32}$/i.test(credentials.accountId)) {
      return jsonResponse(
        { error: "Account ID 必须是 32 位十六进制字符串" },
        400,
      );
    }
    if (!credentials.scriptName || credentials.scriptName.length > 255) {
      return jsonResponse(
        { error: "Worker 脚本名不能为空且最多 255 个字符" },
        400,
      );
    }
    if (credentials.apiToken.length > 512) {
      return jsonResponse({ error: "Cloudflare API Token 长度无效" }, 400);
    }
    if (!credentials.apiToken && !env.CLOUDFLARE_API_TOKEN) {
      return jsonResponse(
        {
          error:
            "请在 Cloudflare API 设置中保存 API Token，或配置 CLOUDFLARE_API_TOKEN Worker Secret",
        },
        400,
      );
    }
    try {
      appliedCronExpressions = await updateCloudflareCronTriggers(
        env,
        cronExpressions,
        credentials,
      );
    } catch (error) {
      const message = String(error?.message || "Cloudflare API 更新失败").slice(
        0,
        400,
      );
      const status = message.startsWith("Worker 未配置") ? 503 : 502;
      return jsonResponse({ error: message }, status);
    }
  }
  let persistenceWarning = null;
  try {
    await saveCollectorSettings(env, {
      scheduleFields,
      scheduleTimezone: timezone,
    });
    await env.IP_STORAGE.put(
      APPLIED_CRON_EXPRESSIONS_KEY,
      JSON.stringify(appliedCronExpressions),
    );
  } catch (error) {
    persistenceWarning = String(
      error?.message || "无法将定时设置同步到 KV",
    ).slice(0, 300);
    console.error(
      "Cloudflare Cron 已应用，但定时设置未能同步到 KV:",
      persistenceWarning,
    );
  }
  return jsonResponse({
    success: true,
    fields: scheduleFields,
    timezone,
    cronExpressions,
    appliedCronExpressions,
    accountId: credentials.accountId,
    scriptName: credentials.scriptName,
    enabled,
    activation: enabled ? "applied" : "saved-disabled",
    persistenceWarning,
  });
}
async function handleListScheduleWorkers(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.hasPassword || !adminStatus.isLoggedIn) {
    return jsonResponse({ error: "请先登录管理员账号再读取 Worker 列表" }, 401);
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "请求内容必须是 JSON 对象" }, 400);
  }
  const accountId =
    typeof body.accountId === "string" ? body.accountId.trim() : "";
  let apiToken = typeof body.apiToken === "string" ? body.apiToken.trim() : "";
  if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    return jsonResponse(
      { error: "Account ID 必须是 32 位十六进制字符串" },
      400,
    );
  }
  if (!apiToken) {
    apiToken = (await env.IP_STORAGE.get(SCHEDULE_API_TOKEN_KEY)) || "";
  }
  if (apiToken.length > 512) {
    return jsonResponse({ error: "Cloudflare API Token 长度无效" }, 400);
  }
  if (!apiToken && !env.CLOUDFLARE_API_TOKEN) {
    return jsonResponse(
      {
        error:
          "请在 Cloudflare API 设置中保存 API Token，或配置 CLOUDFLARE_API_TOKEN Worker Secret",
      },
      400,
    );
  }
  try {
    const workers = await fetchCloudflareWorkerScripts(
      accountId,
      apiToken || env.CLOUDFLARE_API_TOKEN,
    );
    return jsonResponse({ success: true, workers });
  } catch (error) {
    return jsonResponse(
      { error: String(error?.message || "读取 Worker 列表失败").slice(0, 600) },
      502,
    );
  }
}
async function handleTestScheduleApi(req, env) {
  const adminStatus = await getAdminStatus(env, req);
  if (!adminStatus.hasPassword || !adminStatus.isLoggedIn) {
    return jsonResponse(
      { error: "请先登录管理员账号再测试 Cloudflare API" },
      401,
    );
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "请求内容必须是 JSON 对象" }, 400);
  }
  const credentials = {
    apiToken: typeof body.apiToken === "string" ? body.apiToken.trim() : "",
    accountId: typeof body.accountId === "string" ? body.accountId.trim() : "",
    scriptName:
      typeof body.scriptName === "string" ? body.scriptName.trim() : "",
  };
  if (!credentials.apiToken) {
    credentials.apiToken =
      (await env.IP_STORAGE.get(SCHEDULE_API_TOKEN_KEY)) || "";
  }
  if (!credentials.accountId) {
    credentials.accountId =
      (await env.IP_STORAGE.get(SCHEDULE_ACCOUNT_ID_KEY)) || "";
  }
  if (!credentials.scriptName) {
    credentials.scriptName =
      (await env.IP_STORAGE.get(SCHEDULE_SCRIPT_NAME_KEY)) || "";
  }
  if (!/^[a-f0-9]{32}$/i.test(credentials.accountId)) {
    return jsonResponse(
      { error: "Account ID 必须是 32 位十六进制字符串" },
      400,
    );
  }
  if (!credentials.scriptName || credentials.scriptName.length > 255) {
    return jsonResponse(
      { error: "Worker 脚本名不能为空且最多 255 个字符" },
      400,
    );
  }
  if (credentials.apiToken.length > 512) {
    return jsonResponse({ error: "Cloudflare API Token 长度无效" }, 400);
  }
  const { token, accountId, scriptName } = getCloudflareScheduleApiConfig(
    env,
    credentials,
  );
  if (!token) {
    return jsonResponse(
      {
        error:
          "请在 Cloudflare API 设置中保存 API Token，或配置 CLOUDFLARE_API_TOKEN Worker Secret",
      },
      400,
    );
  }
  let workerNames;
  try {
    workerNames = await fetchCloudflareWorkerScripts(accountId, token);
  } catch (error) {
    return jsonResponse(
      {
        error: `无法验证目标 Worker 名称：${String(error?.message || "读取 Worker 列表失败").slice(0, 450)}。请确认 Token 具有 Account.Workers Scripts:Read 权限。`,
      },
      502,
    );
  }
  if (!workerNames.includes(scriptName)) {
    const availableWorkers = workerNames.length
      ? `账户中可访问的脚本名：${workerNames.slice(0, 30).join("、")}${workerNames.length > 30 ? "……" : ""}。`
      : "该账户当前没有可访问的 Worker 脚本。";
    return jsonResponse(
      {
        error: `Account ID 与 Token 可读取，但 Worker 脚本名“${scriptName}”不在该账户的脚本列表中。请点击“读取账户 Worker 列表”并选择实际部署的脚本名。${availableWorkers}`,
      },
      400,
    );
  }
  const endpoint =
    "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(accountId) +
    "/workers/scripts/" +
    encodeURIComponent(scriptName) +
    "/schedules";
  let response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    return jsonResponse(
      {
        error: `无法连接 Cloudflare API：${String(error?.message || "网络请求失败").slice(0, 300)}`,
      },
      502,
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    return jsonResponse(
      { error: `Cloudflare API 返回了无效响应（HTTP ${response.status}）` },
      502,
    );
  }
  if (!response.ok || result?.success !== true) {
    return jsonResponse(
      {
        error: getCloudflareScheduleApiError(
          result,
          response.status,
          "连通性测试",
        ).slice(0, 600),
      },
      502,
    );
  }
  const schedules = Array.isArray(result.result?.schedules)
    ? result.result.schedules
    : Array.isArray(result.result)
      ? result.result
      : [];
  return jsonResponse({
    success: true,
    scheduleCount: schedules.length,
    schedules: schedules
      .map((schedule) => schedule?.cron)
      .filter((cron) => typeof cron === "string"),
  });
}
async function handleSetSpeedTestThresholds(req, env) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "请求内容必须是 JSON 对象" }, 400);
  }
  const updates = {};
  if (Object.prototype.hasOwnProperty.call(body, "maxLatency")) {
    if (!Number.isSafeInteger(body.maxLatency) || body.maxLatency < 1) {
      return jsonResponse({ error: "maxLatency 必须是大于 0 的整数" }, 400);
    }
    updates.maxLatency = body.maxLatency;
  }
  if (Object.prototype.hasOwnProperty.call(body, "minBandwidth")) {
    if (!Number.isFinite(body.minBandwidth) || body.minBandwidth < 0) {
      return jsonResponse(
        { error: "minBandwidth 必须是大于等于 0 的数字" },
        400,
      );
    }
    updates.minBandwidth = body.minBandwidth;
  }
  if (!Object.keys(updates).length) {
    return jsonResponse({ error: "maxLatency 必须是大于 0 的整数" }, 400);
  }
  await saveCollectorSettings(env, updates);
  const settings = await getCollectorSettings(env);
  return jsonResponse({
    success: true,
    maxLatency: settings.maxLatency,
    minBandwidth: settings.minBandwidth,
  });
}
async function handleSetAutoUpdateCount(req, env) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  const { count } = body || {};
  if (!Number.isSafeInteger(count) || count < 0) {
    return jsonResponse({ error: "count 必须是大于等于 0 的安全整数" }, 400);
  }
  await saveCollectorSettings(env, { autoUpdateCount: count });
  return jsonResponse({ success: true, count });
}
async function handleSetQualityCountries(req, env) {
  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "请求内容必须是有效 JSON" }, 400);
  }
  if (!Array.isArray(body?.countries)) {
    return jsonResponse({ error: "countries 必须是国家代码数组" }, 400);
  }
  const countries = [
    ...new Set(
      body.countries.filter((code) =>
        Object.prototype.hasOwnProperty.call(SUPPORTED_COUNTRIES, code),
      ),
    ),
  ];
  if (!countries.length || countries.length !== body.countries.length) {
    return jsonResponse({ error: "至少选择一个有效国家/地区" }, 400);
  }
  const updates = { qualityCountries: countries };
  if (Object.prototype.hasOwnProperty.call(body, "qualityCountryLimits")) {
    try {
      const current = await getCollectorSettings(env);
      updates.qualityCountryLimits = validateQualityCountryLimits(
        body.qualityCountryLimits,
        current.qualityCountryLimits,
      );
    } catch (error) {
      return jsonResponse({ error: error.message }, 400);
    }
  }
  const settings = await saveCollectorSettings(env, updates);
  return jsonResponse({
    success: true,
    countries,
    qualityCountryLimits: settings.qualityCountryLimits,
  });
}
async function handleSetIpLimit(req, env) {
  const { limit } = await req.json();
  if (limit === null || limit === undefined || limit === 0 || limit === "") {
    await saveCollectorSettings(env, { displayLimit: null });
    return jsonResponse({
      success: true,
      limit: null,
      message: "已取消数量限制，将显示最新全部 IP",
    });
  }
  if (typeof limit !== "number" || limit < 1 || !Number.isSafeInteger(limit)) {
    return jsonResponse({ error: "limit 必须为正整数" }, 400);
  }
  await saveCollectorSettings(env, { displayLimit: limit });
  return jsonResponse({
    success: true,
    limit,
    message: `已限制显示 ${limit} 条`,
  });
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
function methodNotAllowed() {
  return jsonResponse({ error: "Method not allowed" }, 405);
}
function handleCORS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
