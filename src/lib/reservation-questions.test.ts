import { describe, expect, it } from "vitest";
import { parseCategoryAnswers } from "@/lib/reservation-questions";

describe("parseCategoryAnswers", () => {
  it("returns null for a category with no questions", () => {
    expect(parseCategoryAnswers("etc", { anything: "x" })).toBeNull();
  });

  it("keeps only known, non-blank answers, trimmed", () => {
    expect(
      parseCategoryAnswers("move-in", { area: " 24 ", rooms: "", unknown: "drop me" })
    ).toEqual({ area: "24" });
  });

  it("requires required questions", () => {
    expect(() => parseCategoryAnswers("move-in", {})).toThrow("평수 항목을 입력해주세요.");
  });

  it("rejects non-numeric numbers with the right 은/는 particle", () => {
    expect(() => parseCategoryAnswers("move-in", { area: "넓음" })).toThrow(
      "평수는 숫자로 입력해주세요."
    );
    expect(() => parseCategoryAnswers("aircon", { type: "벽걸이형", count: "두 대" })).toThrow(
      "대수는 숫자로 입력해주세요."
    );
  });

  it("accepts several options for a multi-select question", () => {
    expect(parseCategoryAnswers("aircon", { type: "벽걸이형,스탠드형", count: "2" })).toEqual({
      type: "벽걸이형,스탠드형",
      count: "2",
    });
  });

  it("rejects an option that isn't in the list", () => {
    expect(() => parseCategoryAnswers("aircon", { type: "벽걸이형,천장형", count: "2" })).toThrow(
      "형태 값이 올바르지 않습니다."
    );
  });
});
