import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clashingRules,
  datesInRange,
  describeRules,
  extraDuration,
  groupClosures,
  validateRule,
} from "../../lib/agenda/schedule";

describe("weekly rules", () => {
  it("accepts the launch rule and rejects bad shapes", () => {
    assert.equal(validateRule({ weekday: 1, time: "18:00", durationMinutes: 135 }), null);
    assert.equal(validateRule({ weekday: 7, time: "18:00", durationMinutes: 135 }), "bad_weekday");
    assert.equal(validateRule({ weekday: 1, time: "25:00", durationMinutes: 135 }), "bad_time");
    assert.equal(validateRule({ weekday: 1, time: "18:00", durationMinutes: 10 }), "bad_duration");
    // 23:00 + 135 min would end after midnight.
    assert.equal(validateRule({ weekday: 1, time: "23:00", durationMinutes: 135 }), "bad_duration");
  });

  it("finds active rules that overlap on the same weekday only", () => {
    const rules = [
      { id: 1, weekday: 1, time: "18:00", durationMinutes: 135, active: true },
      { id: 2, weekday: 1, time: "09:00", durationMinutes: 135, active: false },
      { id: 3, weekday: 2, time: "18:00", durationMinutes: 135, active: true },
    ];
    assert.deepEqual(clashingRules({ weekday: 1, time: "19:00", durationMinutes: 60 }, rules).map((r) => r.id), [1]);
    assert.deepEqual(clashingRules({ weekday: 1, time: "20:15", durationMinutes: 60 }, rules), []);
    assert.deepEqual(clashingRules({ weekday: 1, time: "09:30", durationMinutes: 60 }, rules), []);
    // Re-activating rule 1 must ignore itself.
    assert.deepEqual(clashingRules(rules[0], rules), []);
  });

  it("gives extra hours the most common active duration", () => {
    assert.equal(extraDuration([]), 135);
    assert.equal(
      extraDuration([
        { durationMinutes: 90, active: true },
        { durationMinutes: 120, active: true },
        { durationMinutes: 120, active: true },
        { durationMinutes: 60, active: false },
      ]),
      120,
    );
  });

  it("describes the active rules in Spanish, Monday first", () => {
    const rules = [0, 1, 2, 3, 4].map((weekday) => ({ weekday, time: "18:00", active: weekday !== 0 }));
    assert.equal(describeRules(rules), "lunes, martes, miércoles y jueves a las 18:00");
    assert.equal(describeRules([]), "sin horarios activos");
  });
});

describe("vacation ranges", () => {
  it("lists every date, both ends included, across a month", () => {
    assert.deepEqual(datesInRange("2026-12-30", "2027-01-02"), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    assert.deepEqual(datesInRange("2026-12-24", "2026-12-24"), ["2026-12-24"]);
  });

  it("rejects fake dates, reversed and oversized ranges", () => {
    assert.equal(datesInRange("2026-02-31", "2026-03-02"), "bad_date");
    assert.equal(datesInRange("2026-12-10", "2026-12-01"), "bad_range");
    assert.equal(datesInRange("2026-01-01", "2026-12-31"), "range_too_long");
  });

  it("groups consecutive closed days with the same note", () => {
    const day = (id: number, date: string, note: string | null = "Vacaciones") =>
      ({ id, date, kind: "closed" as const, time: null, note });
    const closures = groupClosures([
      day(3, "2026-12-22"),
      day(1, "2026-12-20"),
      day(2, "2026-12-21"),
      day(4, "2026-12-24"),
      day(5, "2026-12-25", "Navidad"),
      { id: 6, date: "2026-12-21", kind: "closed", time: "18:00", note: "Vacaciones" },
      { id: 7, date: "2026-12-23", kind: "extra", time: "09:00", note: null },
    ]);
    assert.deepEqual(
      closures.map((c) => [c.from, c.to, c.days, c.ids]),
      [
        ["2026-12-20", "2026-12-22", 3, [1, 2, 3]],
        ["2026-12-24", "2026-12-24", 1, [4]],
        ["2026-12-25", "2026-12-25", 1, [5]],
      ],
    );
  });
});
